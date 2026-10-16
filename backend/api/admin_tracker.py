import uuid
from datetime import datetime
from decimal import Decimal
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, selectinload
from sqlalchemy import desc, asc, func, or_, distinct
from pydantic import BaseModel, Field

from database import get_db
import models
from auth.router import get_current_user

router = APIRouter(prefix="/api/admin/tracking", tags=["Enterprise Admin Multi-Client Tracking Engine"])

# ─────────────────────────────────────────────────────────────
# Pydantic Response Models
# ─────────────────────────────────────────────────────────────

class AdminTrackingSummary(BaseModel):
    total_clients_count: int
    total_sales_turnover: float
    total_sales_invoices_count: int
    total_expenses_amount: float
    total_cargo_consignments: int
    active_in_transit_cargo: int
    delivered_cargo_count: int
    exceptions_cargo_count: int
    total_cargo_freight_cost: float
    total_product_companies_count: int

class ClientScorecardItem(BaseModel):
    organization_id: uuid.UUID
    organization_name: str
    org_code: str
    is_am: bool
    total_sales_turnover: float
    sales_invoices_count: int
    total_expenses: float
    active_consignments_count: int
    total_consignments_count: int
    mapped_product_companies_count: int
    mapped_companies: List[Dict[str, Any]] = []

class AdminSalesInvoiceItem(BaseModel):
    id: uuid.UUID
    invoice_number: str
    date: datetime
    client_org_id: uuid.UUID
    client_name: str
    client_code: str
    customer_name: Optional[str] = None
    grand_total: float
    invoice_type: str
    items_count: int

class AdminSalesTrackingResponse(BaseModel):
    total_gross_turnover: float
    total_invoices_count: int
    client_breakdown: List[Dict[str, Any]]
    invoices: List[AdminSalesInvoiceItem]

class AdminExpenseItem(BaseModel):
    id: uuid.UUID
    claim_number: str
    date: datetime
    client_org_id: uuid.UUID
    client_name: str
    client_code: str
    total_amount: float
    status: str
    remarks: Optional[str] = None

class AdminExpenseTrackingResponse(BaseModel):
    total_expenses_amount: float
    category_breakdown: List[Dict[str, Any]]
    client_breakdown: List[Dict[str, Any]]
    items: List[AdminExpenseItem]

class AdminCargoItem(BaseModel):
    id: uuid.UUID
    consignment_number: str
    document_number: Optional[str] = None
    client_org_id: uuid.UUID
    client_name: str
    client_code: str
    transporter_name: str
    vehicle_no: Optional[str] = None
    driver_name: Optional[str] = None
    driver_phone: Optional[str] = None
    origin_hub: str
    destination_hub: str
    lr_no: Optional[str] = None
    status: str
    is_admin_funded: bool
    gross_cost: float
    created_at: datetime

class AdminCargoTrackingResponse(BaseModel):
    total_consignments: int
    in_transit_count: int
    delivered_count: int
    exceptions_count: int
    total_freight_cost: float
    client_breakdown: List[Dict[str, Any]]
    consignments: List[AdminCargoItem]


# ─────────────────────────────────────────────────────────────
# Helper: Client Organizations Map
# ─────────────────────────────────────────────────────────────

def get_organizations_lookup(db: Session) -> Dict[uuid.UUID, models.Organization]:
    orgs = db.query(models.Organization).all()
    return {o.id: o for o in orgs}


# ─────────────────────────────────────────────────────────────
# 1. Executive Summary Telemetry
# ─────────────────────────────────────────────────────────────

@router.get("/summary", response_model=AdminTrackingSummary)
def get_admin_tracking_summary(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Returns high-level consolidated metrics across all client companies for the Main Admin.
    """
    # 1. Total Clients Count (all non-AM or all orgs)
    clients_count = db.query(models.Organization).count()

    # 2. Total Sales Turnover across all organizations
    sales_q = db.query(
        func.coalesce(func.sum(models.Invoice.grand_total), 0).label("turnover"),
        func.count(models.Invoice.id).label("cnt")
    ).filter(
        models.Invoice.is_active == True,
        models.Invoice.invoice_type.in_(["bill", "sales", "tax-invoice"])
    ).first()

    total_sales = float(sales_q.turnover) if sales_q else 0.0
    total_invoices = int(sales_q.cnt) if sales_q else 0

    # 3. Total Expenses across all organizations
    exp_claims_total = db.query(
        func.coalesce(func.sum(models.ExpenseClaim.total_amount), 0)
    ).filter(
        models.ExpenseClaim.status.in_(["Approved", "Paid", "Settled"])
    ).scalar() or 0.0

    exp_vouchers_total = db.query(
        func.coalesce(func.sum(models.Voucher.total_amount), 0)
    ).filter(
        models.Voucher.voucher_type.in_(["Payment", "Journal"]),
        models.Voucher.narration.ilike("%expense%")
    ).scalar() or 0.0

    total_expenses = float(exp_claims_total) if exp_claims_total > 0 else float(exp_vouchers_total)

    # 4. Cargo Metrics
    cargo_total = db.query(models.Consignment).count()
    in_transit_cargo = db.query(models.Consignment).filter(
        models.Consignment.status.in_(["DISPATCHED", "IN_TRANSIT", "LOADING"])
    ).count()
    delivered_cargo = db.query(models.Consignment).filter(
        models.Consignment.status == "DELIVERED"
    ).count()
    exceptions_cargo = db.query(models.Consignment).filter(
        models.Consignment.status == "EXCEPTION"
    ).count()

    freight_total = db.query(
        func.coalesce(func.sum(models.CargoCost.gross_cost), 0)
    ).scalar() or 0.0

    # 5. Total Product Companies
    mfg_count = db.query(models.Manufacturer).count()

    return AdminTrackingSummary(
        total_clients_count=clients_count,
        total_sales_turnover=total_sales,
        total_sales_invoices_count=total_invoices,
        total_expenses_amount=total_expenses,
        total_cargo_consignments=cargo_total,
        active_in_transit_cargo=in_transit_cargo,
        delivered_cargo_count=delivered_cargo,
        exceptions_cargo_count=exceptions_cargo,
        total_cargo_freight_cost=float(freight_total),
        total_product_companies_count=mfg_count
    )


# ─────────────────────────────────────────────────────────────
# 2. Client-Wise Scorecards & Matrix
# ─────────────────────────────────────────────────────────────

@router.get("/clients", response_model=List[ClientScorecardItem])
def get_client_wise_scorecards(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Returns client-by-client operational scorecard with sales, expenses, cargo, and product mappings.
    """
    orgs = db.query(models.Organization).order_by(models.Organization.name).all()
    scorecards: List[ClientScorecardItem] = []

    for org in orgs:
        # Sales turnover for this client
        sales_data = db.query(
            func.coalesce(func.sum(models.Invoice.grand_total), 0).label("turnover"),
            func.count(models.Invoice.id).label("cnt")
        ).filter(
            models.Invoice.organization_id == org.id,
            models.Invoice.is_active == True,
            models.Invoice.invoice_type.in_(["bill", "sales", "tax-invoice"])
        ).first()

        client_turnover = float(sales_data.turnover) if sales_data else 0.0
        client_invoices = int(sales_data.cnt) if sales_data else 0

        # Expenses for this client
        client_exp = db.query(
            func.coalesce(func.sum(models.ExpenseClaim.total_amount), 0)
        ).filter(
            models.ExpenseClaim.organization_id == org.id,
            models.ExpenseClaim.status.in_(["Approved", "Paid", "Settled"])
        ).scalar() or 0.0

        if client_exp == 0.0:
            client_exp = db.query(
                func.coalesce(func.sum(models.Voucher.total_amount), 0)
            ).filter(
                models.Voucher.organization_id == org.id,
                models.Voucher.narration.ilike("%expense%")
            ).scalar() or 0.0

        # Cargo consignments for this client
        consignments_q = db.query(models.Consignment).filter(models.Consignment.company_id == org.id)
        total_consignments = consignments_q.count()
        active_consignments = consignments_q.filter(
            models.Consignment.status.in_(["DISPATCHED", "IN_TRANSIT", "LOADING"])
        ).count()

        # Authorized product companies mapped to this client
        mappings = db.query(
            models.OrganizationManufacturerMapping,
            models.Manufacturer.name.label("mfg_name"),
            models.Manufacturer.short_code.label("mfg_code")
        ).join(
            models.Manufacturer, models.Manufacturer.id == models.OrganizationManufacturerMapping.manufacturer_id
        ).filter(
            models.OrganizationManufacturerMapping.organization_id == org.id
        ).all()

        mapped_comps = [
            {
                "manufacturer_id": str(m.manufacturer_id),
                "name": mfg_name,
                "short_code": mfg_code,
                "is_primary": m.is_primary,
                "commission_rate_override": float(m.commission_rate_override) if m.commission_rate_override else None
            }
            for m, mfg_name, mfg_code in mappings
        ]

        scorecards.append(
            ClientScorecardItem(
                organization_id=org.id,
                organization_name=org.name,
                org_code=org.org_code,
                is_am=bool(org.is_am),
                total_sales_turnover=client_turnover,
                sales_invoices_count=client_invoices,
                total_expenses=float(client_exp),
                active_consignments_count=active_consignments,
                total_consignments_count=total_consignments,
                mapped_product_companies_count=len(mapped_comps),
                mapped_companies=mapped_comps
            )
        )

    return scorecards


# ─────────────────────────────────────────────────────────────
# 3. Global Sales Tracking
# ─────────────────────────────────────────────────────────────

@router.get("/sales", response_model=AdminSalesTrackingResponse)
def get_admin_sales_tracking(
    client_org_id: Optional[uuid.UUID] = Query(None),
    company_id: Optional[uuid.UUID] = Query(None), # Product Brand
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Returns multi-client sales tracking data with client attribution and filtering.
    """
    orgs_lookup = get_organizations_lookup(db)

    query = db.query(models.Invoice).options(
        selectinload(models.Invoice.items)
    ).filter(
        models.Invoice.is_active == True,
        models.Invoice.invoice_type.in_(["bill", "sales", "tax-invoice"])
    )

    if client_org_id:
        query = query.filter(models.Invoice.organization_id == client_org_id)

    if from_date:
        try:
            fd = datetime.strptime(from_date, "%Y-%m-%d")
            query = query.filter(models.Invoice.date >= fd)
        except Exception:
            pass

    if to_date:
        try:
            td = datetime.strptime(to_date, "%Y-%m-%d").replace(hour=23, minute=59, second=59)
            query = query.filter(models.Invoice.date <= td)
        except Exception:
            pass

    if search:
        s = f"%{search}%"
        query = query.filter(
            or_(
                models.Invoice.invoice_number.ilike(s),
                models.Invoice.customer_name.ilike(s)
            )
        )

    # If filtered by product company, join with items & product
    if company_id:
        query = query.join(
            models.InvoiceItem, models.InvoiceItem.invoice_id == models.Invoice.id
        ).join(
            models.Product, models.Product.id == models.InvoiceItem.product_id
        ).filter(
            models.Product.company_id == company_id
        ).distinct()

    total_invoices = query.count()
    gross_turnover = query.with_entities(
        func.coalesce(func.sum(models.Invoice.grand_total), 0)
    ).scalar() or 0.0

    # Client-wise breakdown for active filter
    client_bd_q = query.with_entities(
        models.Invoice.organization_id,
        func.coalesce(func.sum(models.Invoice.grand_total), 0).label("turnover"),
        func.count(models.Invoice.id).label("cnt")
    ).group_by(models.Invoice.organization_id).all()

    client_breakdown = [
        {
            "client_org_id": str(r[0]),
            "client_name": orgs_lookup.get(r[0]).name if r[0] in orgs_lookup else "Unknown Client",
            "client_code": orgs_lookup.get(r[0]).org_code if r[0] in orgs_lookup else "N/A",
            "turnover": float(r[1]),
            "invoices_count": int(r[2])
        }
        for r in client_bd_q
    ]

    records = query.order_by(desc(models.Invoice.date)).offset(offset).limit(limit).all()

    invoices = []
    for inv in records:
        org_obj = orgs_lookup.get(inv.organization_id)
        invoices.append(
            AdminSalesInvoiceItem(
                id=inv.id,
                invoice_number=inv.invoice_number,
                date=inv.date,
                client_org_id=inv.organization_id,
                client_name=org_obj.name if org_obj else "Client Org",
                client_code=org_obj.org_code if org_obj else "CM",
                customer_name=inv.customer_name,
                grand_total=float(inv.grand_total or inv.total_amount or 0.0),
                invoice_type=inv.invoice_type,
                items_count=len(inv.items) if inv.items else 0
            )
        )

    return AdminSalesTrackingResponse(
        total_gross_turnover=float(gross_turnover),
        total_invoices_count=total_invoices,
        client_breakdown=client_breakdown,
        invoices=invoices
    )


# ─────────────────────────────────────────────────────────────
# 4. Global Expense Tracking
# ─────────────────────────────────────────────────────────────

@router.get("/expenses", response_model=AdminExpenseTrackingResponse)
def get_admin_expense_tracking(
    client_org_id: Optional[uuid.UUID] = Query(None),
    status: Optional[str] = Query(None),
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Returns multi-client operational & C&F service expense tracking.
    """
    orgs_lookup = get_organizations_lookup(db)

    query = db.query(models.ExpenseClaim)

    if client_org_id:
        query = query.filter(models.ExpenseClaim.organization_id == client_org_id)

    if status and status != "ALL":
        query = query.filter(models.ExpenseClaim.status == status)

    if from_date:
        try:
            fd = datetime.strptime(from_date, "%Y-%m-%d")
            query = query.filter(models.ExpenseClaim.date >= fd)
        except Exception:
            pass

    if to_date:
        try:
            td = datetime.strptime(to_date, "%Y-%m-%d").replace(hour=23, minute=59, second=59)
            query = query.filter(models.ExpenseClaim.date <= td)
        except Exception:
            pass

    total_amount = query.with_entities(
        func.coalesce(func.sum(models.ExpenseClaim.total_amount), 0)
    ).scalar() or 0.0

    # Client-wise breakdown
    client_bd_q = query.with_entities(
        models.ExpenseClaim.organization_id,
        func.coalesce(func.sum(models.ExpenseClaim.total_amount), 0).label("amt"),
        func.count(models.ExpenseClaim.id).label("cnt")
    ).group_by(models.ExpenseClaim.organization_id).all()

    client_breakdown = [
        {
            "client_org_id": str(r[0]),
            "client_name": orgs_lookup.get(r[0]).name if r[0] in orgs_lookup else "Unknown Client",
            "client_code": orgs_lookup.get(r[0]).org_code if r[0] in orgs_lookup else "N/A",
            "total_amount": float(r[1]),
            "claims_count": int(r[2])
        }
        for r in client_bd_q
    ]

    # Category breakdown
    cat_bd_q = db.query(
        models.ExpenseCategory.name.label("cat_name"),
        func.coalesce(func.sum(models.ExpenseLine.amount), 0).label("tot_amt")
    ).join(
        models.ExpenseLine, models.ExpenseLine.category_id == models.ExpenseCategory.id
    ).join(
        models.ExpenseClaim, models.ExpenseClaim.id == models.ExpenseLine.claim_id
    ).group_by(models.ExpenseCategory.name).all()

    category_breakdown = [
        {
            "category_name": r[0],
            "total_amount": float(r[1])
        }
        for r in cat_bd_q
    ]

    records = query.order_by(desc(models.ExpenseClaim.date)).offset(offset).limit(limit).all()

    items = []
    for cl in records:
        org_obj = orgs_lookup.get(cl.organization_id)
        items.append(
            AdminExpenseItem(
                id=cl.id,
                claim_number=cl.claim_number or f"EXP-{str(cl.id)[:8]}",
                date=cl.date,
                client_org_id=cl.organization_id,
                client_name=org_obj.name if org_obj else "Client Org",
                client_code=org_obj.org_code if org_obj else "CM",
                total_amount=float(cl.total_amount or 0.0),
                status=cl.status or "Approved",
                remarks=cl.remarks
            )
        )

    return AdminExpenseTrackingResponse(
        total_expenses_amount=float(total_amount),
        category_breakdown=category_breakdown,
        client_breakdown=client_breakdown,
        items=items
    )


# ─────────────────────────────────────────────────────────────
# 5. Global Cargo & Consignment Tracking
# ─────────────────────────────────────────────────────────────

@router.get("/cargo", response_model=AdminCargoTrackingResponse)
def get_admin_cargo_tracking(
    client_org_id: Optional[uuid.UUID] = Query(None),
    status: Optional[str] = Query(None),
    transporter: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Returns multi-client logistics & cargo consignment tracking.
    """
    orgs_lookup = get_organizations_lookup(db)

    query = db.query(models.Consignment)

    if client_org_id:
        query = query.filter(models.Consignment.company_id == client_org_id)

    if status and status != "ALL":
        query = query.filter(models.Consignment.status == status)

    if transporter and transporter != "ALL":
        query = query.filter(models.Consignment.transporter_name.ilike(f"%{transporter}%"))

    if search:
        s = f"%{search}%"
        query = query.filter(
            or_(
                models.Consignment.consignment_number.ilike(s),
                models.Consignment.lr_no.ilike(s),
                models.Consignment.document_number.ilike(s),
                models.Consignment.vehicle_no.ilike(s),
                models.Consignment.driver_name.ilike(s),
                models.Consignment.destination_hub.ilike(s)
            )
        )

    total_consignments = query.count()
    in_transit_count = query.filter(models.Consignment.status.in_(["DISPATCHED", "IN_TRANSIT", "LOADING"])).count()
    delivered_count = query.filter(models.Consignment.status == "DELIVERED").count()
    exceptions_count = query.filter(models.Consignment.status == "EXCEPTION").count()

    # Total Freight Cost
    consignment_ids = [c[0] for c in query.with_entities(models.Consignment.id).all()]
    if consignment_ids:
        freight_total = db.query(
            func.coalesce(func.sum(models.CargoCost.gross_cost), 0)
        ).filter(models.CargoCost.consignment_id.in_(consignment_ids)).scalar() or 0.0
    else:
        freight_total = 0.0

    # Client-wise breakdown
    client_bd_q = query.with_entities(
        models.Consignment.company_id,
        func.count(models.Consignment.id).label("cnt")
    ).group_by(models.Consignment.company_id).all()

    client_breakdown = [
        {
            "client_org_id": str(r[0]),
            "client_name": orgs_lookup.get(r[0]).name if r[0] in orgs_lookup else "Unknown Client",
            "client_code": orgs_lookup.get(r[0]).org_code if r[0] in orgs_lookup else "N/A",
            "consignments_count": int(r[1])
        }
        for r in client_bd_q
    ]

    records = query.order_by(desc(models.Consignment.created_at)).offset(offset).limit(limit).all()

    consignments = []
    for r in records:
        org_obj = orgs_lookup.get(r.company_id)
        cost_sum = sum([float(c.gross_cost or 0) for c in r.costs]) if r.costs else 0.0

        consignments.append(
            AdminCargoItem(
                id=r.id,
                consignment_number=r.consignment_number,
                document_number=r.document_number,
                client_org_id=r.company_id,
                client_name=org_obj.name if org_obj else "Client Org",
                client_code=org_obj.org_code if org_obj else "CM",
                transporter_name=r.transporter_name,
                vehicle_no=r.vehicle_no,
                driver_name=r.driver_name,
                driver_phone=r.driver_phone,
                origin_hub=r.origin_hub,
                destination_hub=r.destination_hub,
                lr_no=r.lr_no,
                status=r.status,
                is_admin_funded=bool(r.is_admin_funded),
                gross_cost=cost_sum,
                created_at=r.created_at
            )
        )

    return AdminCargoTrackingResponse(
        total_consignments=total_consignments,
        in_transit_count=in_transit_count,
        delivered_count=delivered_count,
        exceptions_count=exceptions_count,
        total_freight_cost=float(freight_total),
        client_breakdown=client_breakdown,
        consignments=consignments
    )
