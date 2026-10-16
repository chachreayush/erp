import uuid
from datetime import datetime, date
from decimal import Decimal
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc, func, or_, distinct
from pydantic import BaseModel, Field

from database import get_db
import models
import schemas
from auth.router import get_current_user

router = APIRouter(prefix="/api/companies", tags=["Product Company Analytics & Multi-Client Engine"])

# ─────────────────────────────────────────────────────────────
# Pydantic Request & Response Models
# ─────────────────────────────────────────────────────────────

class CompanySummaryKPI(BaseModel):
    total_companies: int
    active_companies: int
    total_products: int
    mapped_clients_count: int

class ProductTurnoverItem(BaseModel):
    product_id: uuid.UUID
    product_name: str
    code: str
    quantity_sold: int
    turnover_amount: float

class CustomerTurnoverItem(BaseModel):
    party_id: Optional[uuid.UUID] = None
    customer_name: str
    invoices_count: int
    total_purchased: float

class CompanyTurnoverBreakdown(BaseModel):
    company_id: uuid.UUID
    company_name: str
    short_code: Optional[str] = None
    gross_turnover: float
    net_turnover: float
    total_quantity_sold: int
    invoices_count: int
    unique_products_sold: int
    top_products: List[ProductTurnoverItem] = []
    top_customers: List[CustomerTurnoverItem] = []

class CompanyTurnoverResponse(BaseModel):
    period_from: Optional[str] = None
    period_to: Optional[str] = None
    total_gross_turnover: float
    total_quantity_sold: int
    total_invoices_count: int
    companies_count: int
    companies: List[CompanyTurnoverBreakdown]

class MappingItemInput(BaseModel):
    manufacturer_id: uuid.UUID
    is_primary: Optional[bool] = False
    commission_rate_override: Optional[float] = None
    notes: Optional[str] = None

class OrgCompanyMappingUpdate(BaseModel):
    manufacturer_ids: Optional[List[uuid.UUID]] = None
    items: Optional[List[MappingItemInput]] = None
    commission_rate_override: Optional[float] = None
    notes: Optional[str] = None

class OrgCompanyMappingItem(BaseModel):
    id: uuid.UUID
    organization_id: uuid.UUID
    manufacturer_id: uuid.UUID
    manufacturer_name: str
    short_code: Optional[str] = None
    is_primary: bool
    commission_rate_override: Optional[float] = None
    created_at: datetime


# ─────────────────────────────────────────────────────────────
# Endpoints
# ─────────────────────────────────────────────────────────────

@router.get("/summary", response_model=CompanySummaryKPI)
def get_company_master_summary(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Returns executive KPI strip for the Company Master Desk.
    """
    org_id = current_user.organization_id

    total_companies = db.query(func.count(models.Manufacturer.id)).filter(
        models.Manufacturer.organization_id == org_id,
        models.Manufacturer.is_active == True
    ).scalar() or 0

    active_companies = db.query(func.count(models.Manufacturer.id)).filter(
        models.Manufacturer.organization_id == org_id,
        models.Manufacturer.is_active == True,
        models.Manufacturer.status == "continue"
    ).scalar() or 0

    total_products = db.query(func.count(models.Product.id)).filter(
        models.Product.organization_id == org_id,
        models.Product.is_active == True,
        models.Product.company_id.isnot(None)
    ).scalar() or 0

    mapped_clients = db.query(func.count(distinct(models.OrganizationManufacturerMapping.organization_id))).scalar() or 0

    return CompanySummaryKPI(
        total_companies=total_companies,
        active_companies=active_companies,
        total_products=total_products,
        mapped_clients_count=mapped_clients
    )


@router.get("/turnover", response_model=CompanyTurnoverResponse)
def get_company_wise_turnover(
    company_id: Optional[uuid.UUID] = None,
    period_from: Optional[str] = None,
    period_to: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Computes company-wise sales turnover from live Invoice lines (InvoiceItem -> Product -> Manufacturer).
    Used directly by:
    1. Company Analytics & Sales Tracking reports
    2. C&F Commission Engine to auto-pull exact sales turnover
    """
    org_id = current_user.organization_id

    # Base query joining InvoiceItem -> Invoice and Product -> Manufacturer
    query = db.query(
        models.Manufacturer.id.label("mfg_id"),
        models.Manufacturer.name.label("mfg_name"),
        models.Manufacturer.short_code.label("mfg_code"),
        func.sum(models.InvoiceItem.quantity * models.InvoiceItem.rate).label("total_turnover"),
        func.sum(models.InvoiceItem.quantity).label("total_qty"),
        func.count(distinct(models.Invoice.id)).label("inv_count"),
        func.count(distinct(models.Product.id)).label("prod_count")
    ).join(
        models.Product, models.Product.company_id == models.Manufacturer.id
    ).join(
        models.InvoiceItem, models.InvoiceItem.product_id == models.Product.id
    ).join(
        models.Invoice, models.Invoice.id == models.InvoiceItem.invoice_id
    ).filter(
        models.Invoice.is_active == True,
        models.Invoice.invoice_type.in_(["bill", "sales", "tax-invoice"])
    )

    if org_id and not getattr(current_user, "is_am_user", False):
        query = query.filter(models.Invoice.organization_id == org_id)

    if company_id:
        query = query.filter(models.Manufacturer.id == company_id)

    if period_from:
        try:
            dt_from = datetime.fromisoformat(period_from.replace('Z', '+00:00'))
            query = query.filter(models.Invoice.date >= dt_from)
        except Exception:
            pass

    if period_to:
        try:
            dt_to = datetime.fromisoformat(period_to.replace('Z', '+00:00'))
            query = query.filter(models.Invoice.date <= dt_to)
        except Exception:
            pass

    results = query.group_by(
        models.Manufacturer.id, models.Manufacturer.name, models.Manufacturer.short_code
    ).order_by(desc("total_turnover")).all()

    companies_breakdown: List[CompanyTurnoverBreakdown] = []
    grand_turnover = 0.0
    grand_qty = 0
    grand_inv_count = 0

    for r in results:
        mfg_id = r.mfg_id
        t_amt = float(r.total_turnover or 0.0)
        t_qty = int(r.total_qty or 0)
        i_cnt = int(r.inv_count or 0)
        p_cnt = int(r.prod_count or 0)

        grand_turnover += t_amt
        grand_qty += t_qty
        grand_inv_count += i_cnt

        # Top 3 products for this company
        top_prods_q = db.query(
            models.Product.id,
            models.Product.name,
            models.Product.code,
            func.sum(models.InvoiceItem.quantity).label("sold_qty"),
            func.sum(models.InvoiceItem.quantity * models.InvoiceItem.rate).label("sold_amt")
        ).join(
            models.InvoiceItem, models.InvoiceItem.product_id == models.Product.id
        ).join(
            models.Invoice, models.Invoice.id == models.InvoiceItem.invoice_id
        ).filter(
            models.Product.company_id == mfg_id,
            models.Invoice.is_active == True,
            models.Invoice.invoice_type.in_(["bill", "sales", "tax-invoice"])
        ).group_by(models.Product.id, models.Product.name, models.Product.code).order_by(desc("sold_amt")).limit(3).all()

        top_products = [
            ProductTurnoverItem(
                product_id=p.id,
                product_name=p.name,
                code=p.code or "",
                quantity_sold=int(p.sold_qty or 0),
                turnover_amount=float(p.sold_amt or 0.0)
            ) for p in top_prods_q
        ]

        # Top 3 customers purchasing this company
        top_cust_q = db.query(
            models.Invoice.customer_name,
            func.count(distinct(models.Invoice.id)).label("inv_count"),
            func.sum(models.InvoiceItem.quantity * models.InvoiceItem.rate).label("cust_amt")
        ).join(
            models.InvoiceItem, models.InvoiceItem.invoice_id == models.Invoice.id
        ).join(
            models.Product, models.Product.id == models.InvoiceItem.product_id
        ).filter(
            models.Product.company_id == mfg_id,
            models.Invoice.is_active == True,
            models.Invoice.invoice_type.in_(["bill", "sales", "tax-invoice"])
        ).group_by(models.Invoice.customer_name).order_by(desc("cust_amt")).limit(3).all()

        top_customers = [
            CustomerTurnoverItem(
                customer_name=c.customer_name,
                invoices_count=int(c.inv_count or 0),
                total_purchased=float(c.cust_amt or 0.0)
            ) for c in top_cust_q
        ]

        companies_breakdown.append(
            CompanyTurnoverBreakdown(
                company_id=mfg_id,
                company_name=r.mfg_name,
                short_code=r.mfg_code,
                gross_turnover=t_amt,
                net_turnover=t_amt,
                total_quantity_sold=t_qty,
                invoices_count=i_cnt,
                unique_products_sold=p_cnt,
                top_products=top_products,
                top_customers=top_customers
            )
        )

    return CompanyTurnoverResponse(
        period_from=period_from,
        period_to=period_to,
        total_gross_turnover=grand_turnover,
        total_quantity_sold=grand_qty,
        total_invoices_count=grand_inv_count,
        companies_count=len(companies_breakdown),
        companies=companies_breakdown
    )


@router.get("/organizations/{org_id}/mappings", response_model=List[OrgCompanyMappingItem])
def get_organization_company_mappings(
    org_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Returns the list of Product Companies mapped to a specific Client Organization.
    """
    mappings = db.query(
        models.OrganizationManufacturerMapping,
        models.Manufacturer.name.label("mfg_name"),
        models.Manufacturer.short_code.label("mfg_code")
    ).join(
        models.Manufacturer, models.Manufacturer.id == models.OrganizationManufacturerMapping.manufacturer_id
    ).filter(
        models.OrganizationManufacturerMapping.organization_id == org_id
    ).all()

    res = []
    for m, mfg_name, mfg_code in mappings:
        res.append(
            OrgCompanyMappingItem(
                id=m.id,
                organization_id=m.organization_id,
                manufacturer_id=m.manufacturer_id,
                manufacturer_name=mfg_name,
                short_code=mfg_code,
                is_primary=m.is_primary,
                commission_rate_override=float(m.commission_rate_override) if m.commission_rate_override else None,
                created_at=m.created_at
            )
        )
    return res


@router.post("/organizations/{org_id}/mappings")
def set_organization_company_mappings(
    org_id: uuid.UUID,
    payload: OrgCompanyMappingUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Replaces/updates the set of Product Companies mapped to a client organization.
    """
    # Delete existing mappings for this org
    db.query(models.OrganizationManufacturerMapping).filter(
        models.OrganizationManufacturerMapping.organization_id == org_id
    ).delete(synchronize_session=False)

    # Insert new mappings
    created_items = []
    if payload.items is not None:
        for idx, it in enumerate(payload.items):
            mapping = models.OrganizationManufacturerMapping(
                id=uuid.uuid4(),
                organization_id=org_id,
                manufacturer_id=it.manufacturer_id,
                is_primary=bool(it.is_primary if it.is_primary is not None else (idx == 0)),
                commission_rate_override=Decimal(str(it.commission_rate_override)) if it.commission_rate_override is not None else None,
                notes=it.notes or payload.notes,
                created_at=datetime.utcnow()
            )
            db.add(mapping)
            created_items.append(mapping)
    elif payload.manufacturer_ids is not None:
        for idx, m_id in enumerate(payload.manufacturer_ids):
            mapping = models.OrganizationManufacturerMapping(
                id=uuid.uuid4(),
                organization_id=org_id,
                manufacturer_id=m_id,
                is_primary=(idx == 0),
                commission_rate_override=Decimal(str(payload.commission_rate_override)) if payload.commission_rate_override else None,
                notes=payload.notes,
                created_at=datetime.utcnow()
            )
            db.add(mapping)
            created_items.append(mapping)

    db.commit()
    return {
        "success": True,
        "message": f"Successfully mapped {len(created_items)} product companies to client organization.",
        "mapped_count": len(created_items)
    }
