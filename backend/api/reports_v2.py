from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text, func, and_, or_
from typing import List, Dict, Any, Optional
import uuid
from datetime import datetime

from database import get_db
import models
import schemas
from auth.router import get_current_user

router = APIRouter(prefix="/reports_v2", tags=["Reports V2 (DOC-30)"])

# ── TEMPLATES & VARIANTS ──────────────────────────────────────────

@router.post("/templates", response_model=schemas.ReportTemplateResponse)
def create_template(template: schemas.ReportTemplateCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    new_template = models.ReportTemplate(
        organization_id=current_user.organization_id,
        name=template.name,
        subject=template.subject,
        config=template.config,
        is_published=template.is_published
    )
    db.add(new_template)
    db.commit()
    db.refresh(new_template)
    return new_template

@router.get("/templates", response_model=List[schemas.ReportTemplateResponse])
def get_templates(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.ReportTemplate).filter(
        models.ReportTemplate.organization_id == current_user.organization_id
    ).order_by(models.ReportTemplate.created_at.desc()).all()

@router.delete("/templates/{template_id}")
def delete_template(template_id: uuid.UUID, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    tpl = db.query(models.ReportTemplate).filter(
        models.ReportTemplate.id == template_id,
        models.ReportTemplate.organization_id == current_user.organization_id
    ).first()
    if not tpl:
        raise HTTPException(status_code=404, detail="Template not found")
    db.delete(tpl)
    db.commit()
    return {"status": "success"}

# ── EXCLUSIONS ────────────────────────────────────────────────────

@router.post("/exclusions", response_model=schemas.DashboardExclusionResponse)
def create_exclusion(exclusion: schemas.DashboardExclusionCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    new_ex = models.DashboardExclusion(
        organization_id=current_user.organization_id,
        entity_type=exclusion.entity_type,
        entity_id=exclusion.entity_id,
        reason=exclusion.reason,
        user_id=current_user.id,
        expiry_date=exclusion.expiry_date,
        is_active=exclusion.is_active
    )
    db.add(new_ex)
    db.commit()
    db.refresh(new_ex)
    return new_ex

@router.get("/exclusions", response_model=List[schemas.DashboardExclusionResponse])
def get_exclusions(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.DashboardExclusion).filter(
        models.DashboardExclusion.organization_id == current_user.organization_id,
        models.DashboardExclusion.is_active == True
    ).all()

@router.delete("/exclusions/{exclusion_id}")
def delete_exclusion(exclusion_id: uuid.UUID, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    ex = db.query(models.DashboardExclusion).filter(
        models.DashboardExclusion.id == exclusion_id,
        models.DashboardExclusion.organization_id == current_user.organization_id
    ).first()
    if not ex:
        raise HTTPException(status_code=404, detail="Exclusion not found")
    ex.is_active = False
    db.commit()
    return {"status": "success"}

# ── PREDEFINED SALES REPORTS (DOC-30 Library) ────────────────────

def get_excluded_party_ids(org_id: uuid.UUID, db: Session) -> List[uuid.UUID]:
    exclusions = db.query(models.DashboardExclusion.entity_id).filter(
        models.DashboardExclusion.organization_id == org_id,
        models.DashboardExclusion.entity_type == 'Party',
        models.DashboardExclusion.is_active == True
    ).all()
    return [ex[0] for ex in exclusions]

@router.get("/sales/party-wise")
def get_party_wise_sales(
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    use_exclusions: bool = False,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """DOC-30: Party-wise (Customer) Sales Aggregation"""
    org_id = current_user.organization_id
    query = db.query(
        models.Invoice.customer_name.label("party_name"),
        func.count(models.Invoice.id).label("total_invoices"),
        func.coalesce(func.sum(models.Invoice.subtotal), 0).label("taxable_amount"),
        func.coalesce(func.sum(models.Invoice.tax_total), 0).label("tax_amount"),
        func.coalesce(func.sum(models.Invoice.grand_total), 0).label("grand_total")
    ).filter(
        models.Invoice.organization_id == org_id,
        models.Invoice.invoice_type.in_(["sales-bill", "sales-challan", "bill"])
    )

    if from_date:
        query = query.filter(models.Invoice.date >= from_date)
    if to_date:
        query = query.filter(models.Invoice.date <= to_date)
    if use_exclusions:
        excluded = get_excluded_party_ids(org_id, db)
        if excluded:
            query = query.filter(models.Invoice.party_id.not_in(excluded))

    rows = query.group_by(models.Invoice.customer_name).order_by(func.sum(models.Invoice.grand_total).desc()).all()
    
    return {
        "report": "Party-wise Sales Summary",
        "data": [
            {
                "party_name": r.party_name or "Unknown Party",
                "total_invoices": int(r.total_invoices),
                "taxable_amount": float(r.taxable_amount),
                "tax_amount": float(r.tax_amount),
                "grand_total": float(r.grand_total),
            } for r in rows
        ]
    }

@router.get("/sales/company-wise")
def get_company_wise_sales(
    company_ids: Optional[str] = None,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    use_exclusions: bool = False,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """DOC-30: Company-wise / Principal-wise Sales Aggregation with multi-company filter"""
    org_id = current_user.organization_id
    
    query = db.query(
        models.Manufacturer.id.label("company_id"),
        func.coalesce(models.Manufacturer.name, "Unassigned Company").label("company_name"),
        func.coalesce(models.Manufacturer.short_code, "-").label("company_code"),
        func.count(func.distinct(models.Invoice.id)).label("total_invoices"),
        func.coalesce(func.sum(models.InvoiceItem.quantity), 0).label("total_quantity"),
        func.coalesce(func.sum(models.InvoiceItem.line_total), 0).label("total_sales")
    ).select_from(models.InvoiceItem)\
     .join(models.Invoice, models.InvoiceItem.invoice_id == models.Invoice.id)\
     .outerjoin(models.Product, models.InvoiceItem.product_id == models.Product.id)\
     .outerjoin(models.Manufacturer, models.Product.company_id == models.Manufacturer.id)\
     .filter(
        models.Invoice.organization_id == org_id,
        models.Invoice.invoice_type.in_(["sales-bill", "sales-challan", "bill"])
     )

    if company_ids:
        c_list = [c.strip() for c in company_ids.split(",") if c.strip()]
        if c_list:
            query = query.filter(models.Product.company_id.in_(c_list))

    if from_date:
        query = query.filter(models.Invoice.date >= from_date)
    if to_date:
        query = query.filter(models.Invoice.date <= to_date)
    if use_exclusions:
        excluded = get_excluded_party_ids(org_id, db)
        if excluded:
            query = query.filter(models.Invoice.party_id.not_in(excluded))

    rows = query.group_by(models.Manufacturer.id, models.Manufacturer.name, models.Manufacturer.short_code).order_by(func.sum(models.InvoiceItem.line_total).desc()).all()

    return {
        "report": "Company-wise / Principal-wise Sales",
        "data": [
            {
                "company_id": str(r.company_id) if r.company_id else "",
                "company_code": r.company_code or "-",
                "company_name": r.company_name or "Unassigned Company",
                "total_invoices": int(r.total_invoices),
                "total_quantity": int(r.total_quantity),
                "total_sales": float(r.total_sales)
            } for r in rows
        ]
    }

@router.get("/sales/company-wise/products")
def get_company_products_sales(
    company_id: str,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """DOC-30 / Marg Style: Product-level drill-down for a selected Company"""
    org_id = current_user.organization_id
    query = db.query(
        models.InvoiceItem.product_name,
        func.coalesce(models.Product.code, "-").label("item_code"),
        func.coalesce(models.Product.packing, "-").label("packing"),
        func.coalesce(func.sum(models.InvoiceItem.quantity), 0).label("qty_sold"),
        func.coalesce(func.avg(models.InvoiceItem.rate), 0).label("avg_rate"),
        func.coalesce(func.sum(models.InvoiceItem.line_total), 0).label("turnover")
    ).select_from(models.InvoiceItem)\
     .join(models.Invoice, models.InvoiceItem.invoice_id == models.Invoice.id)\
     .join(models.Product, models.InvoiceItem.product_id == models.Product.id)\
     .filter(
        models.Invoice.organization_id == org_id,
        models.Product.company_id == company_id,
        models.Invoice.invoice_type.in_(["sales-bill", "sales-challan", "bill"])
     )

    if from_date:
        query = query.filter(models.Invoice.date >= from_date)
    if to_date:
        query = query.filter(models.Invoice.date <= to_date)

    rows = query.group_by(models.InvoiceItem.product_name, models.Product.code, models.Product.packing).order_by(func.sum(models.InvoiceItem.line_total).desc()).all()

    return {
        "data": [
            {
                "product_name": r.product_name,
                "item_code": r.item_code,
                "packing": r.packing,
                "qty_sold": int(r.qty_sold),
                "avg_rate": round(float(r.avg_rate), 2),
                "turnover": float(r.turnover)
            } for r in rows
        ]
    }

@router.get("/sales/product-wise")
def get_product_wise_sales(
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    use_exclusions: bool = False,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """DOC-30: Product-wise Sales Aggregation"""
    org_id = current_user.organization_id
    query = db.query(
        models.InvoiceItem.product_name,
        func.coalesce(func.sum(models.InvoiceItem.quantity), 0).label("total_qty"),
        func.coalesce(func.avg(models.InvoiceItem.rate), 0).label("avg_rate"),
        func.coalesce(func.sum(models.InvoiceItem.line_total), 0).label("total_revenue")
    ).join(models.Invoice, models.InvoiceItem.invoice_id == models.Invoice.id)\
     .filter(
        models.Invoice.organization_id == org_id,
        models.Invoice.invoice_type.in_(["sales-bill", "sales-challan", "bill"])
     )

    if from_date:
        query = query.filter(models.Invoice.date >= from_date)
    if to_date:
        query = query.filter(models.Invoice.date <= to_date)
    if use_exclusions:
        excluded = get_excluded_party_ids(org_id, db)
        if excluded:
            query = query.filter(models.Invoice.party_id.not_in(excluded))

    rows = query.group_by(models.InvoiceItem.product_name).order_by(func.sum(models.InvoiceItem.line_total).desc()).all()

    return {
        "report": "Product-wise Sales Analysis",
        "data": [
            {
                "product_name": r.product_name,
                "total_qty": int(r.total_qty),
                "avg_rate": round(float(r.avg_rate), 2),
                "total_revenue": float(r.total_revenue)
            } for r in rows
        ]
    }

@router.get("/sales/bill-wise")
def get_bill_wise_sales(
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    use_exclusions: bool = False,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """DOC-30: Sales Register / Bill-wise Detailed Listing"""
    org_id = current_user.organization_id
    query = db.query(models.Invoice).filter(
        models.Invoice.organization_id == org_id,
        models.Invoice.invoice_type.in_(["sales-bill", "sales-challan", "bill"])
    )

    if from_date:
        query = query.filter(models.Invoice.date >= from_date)
    if to_date:
        query = query.filter(models.Invoice.date <= to_date)
    if use_exclusions:
        excluded = get_excluded_party_ids(org_id, db)
        if excluded:
            query = query.filter(models.Invoice.party_id.not_in(excluded))

    invoices = query.order_by(models.Invoice.date.desc()).all()

    return {
        "report": "Sales Register (Bill-wise)",
        "data": [
            {
                "invoice_number": inv.invoice_number,
                "date": inv.date.strftime("%Y-%m-%d") if inv.date else "",
                "party_name": inv.customer_name,
                "subtotal": float(inv.subtotal),
                "tax_total": float(inv.tax_total),
                "grand_total": float(inv.grand_total),
                "status": "Active" if inv.is_active else "Cancelled"
            } for inv in invoices
        ]
    }

# ── DYNAMIC QUERY ENGINE (Advanced Report Designer API) ───────────

@router.post("/query")
def execute_dynamic_report_query(
    payload: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    DOC-30 Section 5: Real Dynamic Report Designer Engine
    Accepts:
      - subject: 'Sales', 'Purchase', 'Ledger', 'Inventory'
      - group_by: 'party', 'company', 'product', 'date', 'none'
      - from_date, to_date, min_amount, party_name
      - use_exclusions: bool
    """
    org_id = current_user.organization_id
    subject = payload.get("subject", "Sales")
    group_by = payload.get("group_by", "party")
    from_date = payload.get("from_date")
    to_date = payload.get("to_date")
    min_amount = payload.get("min_amount")
    party_name = payload.get("party_name")
    use_exclusions = payload.get("use_exclusions", False)

    if subject == "Sales":
        if group_by == "party":
            q = db.query(
                models.Invoice.customer_name.label("group_key"),
                func.count(models.Invoice.id).label("count"),
                func.coalesce(func.sum(models.Invoice.subtotal), 0).label("taxable"),
                func.coalesce(func.sum(models.Invoice.tax_total), 0).label("tax"),
                func.coalesce(func.sum(models.Invoice.grand_total), 0).label("total")
            ).filter(
                models.Invoice.organization_id == org_id,
                models.Invoice.invoice_type.in_(["sales-bill", "sales-challan", "bill"])
            )
            if from_date: q = q.filter(models.Invoice.date >= from_date)
            if to_date: q = q.filter(models.Invoice.date <= to_date)
            if party_name: q = q.filter(models.Invoice.customer_name.ilike(f"%{party_name}%"))
            if use_exclusions:
                excluded = get_excluded_party_ids(org_id, db)
                if excluded: q = q.filter(models.Invoice.party_id.not_in(excluded))
            if min_amount:
                q = q.having(func.sum(models.Invoice.grand_total) >= float(min_amount))

            rows = q.group_by(models.Invoice.customer_name).order_by(func.sum(models.Invoice.grand_total).desc()).all()
            return {
                "columns": ["Party / Customer", "Invoices Count", "Taxable Value (₹)", "Tax Amount (₹)", "Total Sales (₹)"],
                "data": [
                    {
                        "Party / Customer": r.group_key or "General Customer",
                        "Invoices Count": int(r.count),
                        "Taxable Value (₹)": float(r.taxable),
                        "Tax Amount (₹)": float(r.tax),
                        "Total Sales (₹)": float(r.total)
                    } for r in rows
                ]
            }

        elif group_by == "company":
            q = db.query(
                func.coalesce(models.Manufacturer.name, "Unassigned Company").label("group_key"),
                func.count(func.distinct(models.Invoice.id)).label("invoices_count"),
                func.coalesce(func.sum(models.InvoiceItem.quantity), 0).label("qty"),
                func.coalesce(func.sum(models.InvoiceItem.line_total), 0).label("total")
            ).select_from(models.InvoiceItem)\
             .join(models.Invoice, models.InvoiceItem.invoice_id == models.Invoice.id)\
             .outerjoin(models.Product, models.InvoiceItem.product_id == models.Product.id)\
             .outerjoin(models.Manufacturer, models.Product.company_id == models.Manufacturer.id)\
             .filter(
                models.Invoice.organization_id == org_id,
                models.Invoice.invoice_type.in_(["sales-bill", "sales-challan", "bill"])
             )
            if from_date: q = q.filter(models.Invoice.date >= from_date)
            if to_date: q = q.filter(models.Invoice.date <= to_date)
            if use_exclusions:
                excluded = get_excluded_party_ids(org_id, db)
                if excluded: q = q.filter(models.Invoice.party_id.not_in(excluded))

            rows = q.group_by(models.Manufacturer.name).order_by(func.sum(models.InvoiceItem.line_total).desc()).all()
            return {
                "columns": ["Company / Principal", "Invoices Count", "Units Sold (Qty)", "Total Value (₹)"],
                "data": [
                    {
                        "Company / Principal": r.group_key,
                        "Invoices Count": int(r.invoices_count),
                        "Units Sold (Qty)": int(r.qty),
                        "Total Value (₹)": float(r.total)
                    } for r in rows
                ]
            }

        elif group_by == "product":
            q = db.query(
                models.InvoiceItem.product_name.label("group_key"),
                func.coalesce(func.sum(models.InvoiceItem.quantity), 0).label("qty"),
                func.coalesce(func.avg(models.InvoiceItem.rate), 0).label("avg_rate"),
                func.coalesce(func.sum(models.InvoiceItem.line_total), 0).label("total")
            ).join(models.Invoice, models.InvoiceItem.invoice_id == models.Invoice.id)\
             .filter(
                models.Invoice.organization_id == org_id,
                models.Invoice.invoice_type.in_(["sales-bill", "sales-challan", "bill"])
             )
            if from_date: q = q.filter(models.Invoice.date >= from_date)
            if to_date: q = q.filter(models.Invoice.date <= to_date)

            rows = q.group_by(models.InvoiceItem.product_name).order_by(func.sum(models.InvoiceItem.line_total).desc()).all()
            return {
                "columns": ["Product Name", "Total Quantity Sold", "Avg Unit Rate (₹)", "Total Turnover (₹)"],
                "data": [
                    {
                        "Product Name": r.group_key,
                        "Total Quantity Sold": int(r.qty),
                        "Avg Unit Rate (₹)": round(float(r.avg_rate), 2),
                        "Total Turnover (₹)": float(r.total)
                    } for r in rows
                ]
            }

        else: # Detailed bill-wise
            q = db.query(models.Invoice).filter(
                models.Invoice.organization_id == org_id,
                models.Invoice.invoice_type.in_(["sales-bill", "sales-challan", "bill"])
            )
            if from_date: q = q.filter(models.Invoice.date >= from_date)
            if to_date: q = q.filter(models.Invoice.date <= to_date)
            if party_name: q = q.filter(models.Invoice.customer_name.ilike(f"%{party_name}%"))
            invoices = q.order_by(models.Invoice.date.desc()).all()
            return {
                "columns": ["Invoice No", "Date", "Party Name", "Taxable Amount (₹)", "Tax (₹)", "Grand Total (₹)"],
                "data": [
                    {
                        "Invoice No": inv.invoice_number,
                        "Date": inv.date.strftime("%Y-%m-%d") if inv.date else "",
                        "Party Name": inv.customer_name,
                        "Taxable Amount (₹)": float(inv.subtotal),
                        "Tax (₹)": float(inv.tax_total),
                        "Grand Total (₹)": float(inv.grand_total)
                    } for inv in invoices
                ]
            }

    elif subject == "Ledger":
        q = db.query(models.Ledger).filter(models.Ledger.organization_id == org_id)
        if use_exclusions:
            exclusions = db.query(models.DashboardExclusion.entity_id).filter(
                models.DashboardExclusion.organization_id == org_id,
                models.DashboardExclusion.entity_type == 'Ledger',
                models.DashboardExclusion.is_active == True
            ).all()
            ex_ids = [ex[0] for ex in exclusions]
            if ex_ids: q = q.filter(models.Ledger.id.not_in(ex_ids))
        ledgers = q.all()
        return {
            "columns": ["Ledger Account", "Closing Balance (₹)"],
            "data": [
                {
                    "Ledger Account": l.name,
                    "Closing Balance (₹)": float(l.closing_balance)
                } for l in ledgers
            ]
        }

    elif subject == "Inventory":
        q = db.query(models.Product).filter(models.Product.organization_id == org_id)
        products = q.all()
        return {
            "columns": ["Item Code", "Product Name", "MRP (₹)", "Purchase Rate (₹)", "Base UOM"],
            "data": [
                {
                    "Item Code": p.code or "-",
                    "Product Name": p.name,
                    "MRP (₹)": float(p.mrp),
                    "Purchase Rate (₹)": float(p.p_rate),
                    "Base UOM": p.base_uom or "EACH"
                } for p in products
            ]
        }

    return {"columns": [], "data": []}

@router.post("/execute/{subject}")
def execute_report(subject: str, payload: dict, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """Legacy route compatibility, redirects to dynamic query"""
    payload["subject"] = subject
    res = execute_dynamic_report_query(payload, db, current_user)
    return {"data": res["data"]}
