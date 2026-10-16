from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, desc, or_
from typing import List, Optional
from uuid import UUID
import uuid
from datetime import datetime, timedelta
from decimal import Decimal

from database import get_db
import models
import schemas
from pydantic import BaseModel
from auth.router import get_current_user

router = APIRouter(
    prefix="/stock",
    tags=["Stock"],
    dependencies=[Depends(get_current_user)]
)

class StockResponse(BaseModel):
    product_id: UUID
    product_code: str
    product_name: str
    company_name: str
    salt_name: str
    current_stock: int

    class Config:
        from_attributes = True

class StockInCreate(BaseModel):
    product_id: UUID
    batch_number: str
    expiry: Optional[str] = None
    mrp: float
    rate: float
    rate_a: float = 0
    rate_b: float = 0
    rate_c: float = 0
    cost: float
    quantity: int

class StockOutCreate(BaseModel):
    product_id: UUID
    batch_number: str
    quantity: int

class StockTransferCreate(BaseModel):
    product_id: UUID
    batch_number: str
    quantity: int
    from_station: str
    to_station: str

class StockAdjustmentCreate(BaseModel):
    product_id: UUID
    batch_number: Optional[str] = None
    quantity: int  # positive = increase, negative = decrease
    reason: str

@router.get("/", response_model=List[StockResponse])
def get_current_stock(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    """
    Calculate and return the current stock for all products based on active Batches.
    Supports pagination.
    """
    org_id = current_user.organization_id
    
    # Get all products for the org with relationships
    products = db.query(models.Product).options(
        joinedload(models.Product.company),
        joinedload(models.Product.salt_relation)
    ).filter(
        models.Product.organization_id == org_id,
        models.Product.is_active == True
    ).offset(skip).limit(limit).all()

    # Calculate stock from Batch table only for the current page
    product_ids = [p.id for p in products]
    if not product_ids:
        stock_data = []
    else:
        stock_data = db.query(
            models.Batch.product_id,
            func.sum(models.Batch.current_stock).label('total_qty')
        ).filter(
            models.Batch.organization_id == org_id,
            models.Batch.product_id.in_(product_ids)
        ).group_by(
            models.Batch.product_id
        ).all()

    # Build a lookup map: product_id -> total_qty
    stock_map = {product_id: int(total_qty or 0) for product_id, total_qty in stock_data}

    # Prepare response
    result = []
    for p in products:
        current_stock = stock_map.get(p.id, 0)
        
        result.append({
            "product_id": p.id,
            "product_code": p.code,
            "product_name": p.name,
            "company_name": p.company.name if p.company else "",
            "salt_name": p.salt_relation.formula if p.salt_relation else "",
            "current_stock": current_stock
        })
        
    return result

@router.get("/brk-exp", response_model=List[StockResponse])
def get_brk_exp_stock(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    """
    Calculate and return the breakage/expiry stock for all products based on active Batches.
    """
    org_id = current_user.organization_id
    
    products = db.query(models.Product).options(
        joinedload(models.Product.company),
        joinedload(models.Product.salt_relation)
    ).filter(
        models.Product.organization_id == org_id,
        models.Product.is_active == True
    ).offset(skip).limit(limit).all()

    product_ids = [p.id for p in products]
    if not product_ids:
        stock_data = []
    else:
        stock_data = db.query(
            models.Batch.product_id,
            func.sum(models.Batch.brk_exp_stock).label("total_qty")
        ).filter(
            models.Batch.organization_id == org_id,
            models.Batch.product_id.in_(product_ids)
        ).group_by(
            models.Batch.product_id
        ).all()

    stock_map = {product_id: int(total_qty or 0) for product_id, total_qty in stock_data}

    result = []
    for p in products:
        current_stock = stock_map.get(p.id, 0)
        
        result.append({
            "product_id": p.id,
            "product_code": p.code,
            "product_name": p.name,
            "company_name": p.company.name if p.company else "",
            "salt_name": p.salt_relation.formula if p.salt_relation else "",
            "current_stock": current_stock
        })
        
    return result
from datetime import datetime

class RegisterEntry(BaseModel):
    date: str
    invoice_number: str
    party_name: str
    invoice_type: str
    inward: int
    outward: int
    running_balance: int

class RegisterResponse(BaseModel):
    product_name: str
    total_inward: int
    total_outward: int
    total_value: float
    entries: List[RegisterEntry]

@router.get("/{product_id}/register", response_model=RegisterResponse)
def get_product_register(
    product_id: UUID,
    stock_type: str = Query("main"),  # "main" or "brk-exp"
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    org_id = current_user.organization_id
    
    product = db.query(models.Product).filter(
        models.Product.id == product_id,
        models.Product.organization_id == org_id
    ).first()
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Fetch all active invoice items for this product
    items = db.query(models.InvoiceItem).join(
        models.Invoice, models.InvoiceItem.invoice_id == models.Invoice.id
    ).filter(
        models.InvoiceItem.product_id == product_id,
        models.Invoice.organization_id == org_id,
        models.Invoice.is_active == True
    ).order_by(
        models.Invoice.date.asc(),
        models.Invoice.created_at.asc()
    ).all()


    entries = []
    running_balance = 0
    total_inward = 0
    total_outward = 0

    main_inward_types = ["grn", "purchase-bill", "purchase-challan", "sales-return-credit", "sales-return-challan", "sales-return-bill", "stock-receive-entry"]
    main_outward_types = ["sales-bill", "sales-challan", "purchase-return-debit", "purchase-return-challan", "purchase-return-bill", "stock-issue-entry", "stock-shift"]

    brk_inward_types = ["brk-receive-bill", "brk-receive-challan", "stock-shift"]
    brk_outward_types = ["brk-issue-bill", "brk-issue-challan"]

    inward_types = main_inward_types if stock_type == "main" else brk_inward_types
    outward_types = main_outward_types if stock_type == "main" else brk_outward_types

    for item in items:
        inv_type = item.invoice.invoice_type
        
        is_inward = any(inv_type == t for t in inward_types)
        is_outward = any(inv_type == t for t in outward_types)

        if not is_inward and not is_outward:
            continue
            
        inward_qty = item.quantity if is_inward else 0
        outward_qty = item.quantity if is_outward else 0
        
        running_balance += inward_qty
        running_balance -= outward_qty
        
        total_inward += inward_qty
        total_outward += outward_qty
        
        entries.append(RegisterEntry(
            date=item.invoice.date.strftime("%d/%m/%Y"),
            invoice_number=item.invoice.invoice_number,
            party_name=item.invoice.customer_name,
            invoice_type=inv_type,
            inward=inward_qty,
            outward=outward_qty,
            running_balance=running_balance
        ))
        
    # Calculate Total Value from batches
    batches = db.query(models.Batch).filter(
        models.Batch.product_id == product_id,
        models.Batch.organization_id == org_id
    ).all()
    
    total_value = 0.0
    for b in batches:
        stock = b.current_stock if stock_type == "main" else b.brk_exp_stock
        rate = float(b.rate or 0.0)
        total_value += (stock * rate)

    return RegisterResponse(
        product_name=product.name,
        total_inward=total_inward,
        total_outward=total_outward,
        total_value=total_value,
        entries=entries
    )



@router.get("/alerts/low-stock")
def get_low_stock_alerts(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    MRP Feature: Low Stock Alerts
    Returns products whose total current_stock across all batches is <= min_stock_level.
    """
    org_id = current_user.organization_id
    
    # We query products where min_stock_level > 0 first to optimize
    products = db.query(models.Product).filter(
        models.Product.organization_id == org_id,
        models.Product.is_active == True,
        models.Product.min_stock_level > 0
    ).all()
    
    alerts = []
    
    for product in products:
        # Sum up current_stock across all active batches
        batches = db.query(models.Batch).filter(
            models.Batch.organization_id == org_id,
            models.Batch.product_id == product.id
        ).all()
        
        total_stock = sum(b.current_stock for b in batches)
        
        if total_stock <= product.min_stock_level:
            alerts.append({
                "product_id": str(product.id),
                "code": product.code,
                "name": product.name,
                "current_stock": float(total_stock),
                "min_stock_level": product.min_stock_level,
                "reorder_quantity": product.reorder_quantity,
                "suggested_order": max(product.reorder_quantity, product.min_stock_level - total_stock)
            })
            
    return {"alerts": alerts}



from datetime import datetime, timedelta
from sqlalchemy import func
from pydantic import BaseModel
from typing import List, Optional

class MRPSuggestion(BaseModel):
    product_id: str
    code: str
    name: str
    thirty_day_sales: int
    avg_daily_sales: float
    current_min_stock: int
    suggested_min_stock: int
    current_reorder_qty: int
    suggested_reorder_qty: int

class MRPApplyRequest(BaseModel):
    product_ids: List[str]

@router.get("/mrp/suggestions")
def get_mrp_suggestions(
    days: int = 30,
    lead_time_days: int = 7,
    safety_stock_days: int = 7,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Smart MRP: Dynamically calculates required stock levels based on historical sales velocity.
    Suggested Min Stock = (Avg Daily Sales * Lead Time) + Safety Stock
    Suggested Reorder Qty = Avg Daily Sales * 30 (1 month supply)
    """
    org_id = current_user.organization_id
    cutoff_date = datetime.utcnow() - timedelta(days=days)
    
    # Aggregate sales over the last X days
    sales_data = db.query(
        models.InvoiceItem.product_id,
        func.sum(models.InvoiceItem.quantity).label("total_sold")
    ).join(models.Invoice).filter(
        models.Invoice.organization_id == org_id,
        models.Invoice.is_active == True,
        models.Invoice.invoice_type.in_(["sales-bill", "sales-challan", "brk-issue", "stock-issue"]),
        models.Invoice.date >= cutoff_date,
        models.InvoiceItem.product_id.isnot(None)
    ).group_by(models.InvoiceItem.product_id).all()
    
    sales_map = {str(r.product_id): int(r.total_sold) for r in sales_data}
    
    products = db.query(models.Product).filter(
        models.Product.organization_id == org_id,
        models.Product.is_active == True
    ).all()
    
    suggestions = []
    
    for p in products:
        total_sold = sales_map.get(str(p.id), 0)
        if total_sold > 0:
            avg_daily = total_sold / days
            sug_min = int((avg_daily * lead_time_days) + (avg_daily * safety_stock_days))
            sug_reorder = int(avg_daily * 30)
            
            # Only suggest if there is a meaningful difference (> 10%)
            if abs(sug_min - p.min_stock_level) > (p.min_stock_level * 0.1) or \
               abs(sug_reorder - p.reorder_quantity) > (p.reorder_quantity * 0.1):
                
                suggestions.append({
                    "product_id": str(p.id),
                    "code": p.code,
                    "name": p.name,
                    "thirty_day_sales": total_sold,
                    "avg_daily_sales": round(avg_daily, 2),
                    "current_min_stock": p.min_stock_level,
                    "suggested_min_stock": max(sug_min, 1),
                    "current_reorder_qty": p.reorder_quantity,
                    "suggested_reorder_qty": max(sug_reorder, 1)
                })
                
    # Sort by highest velocity (most sold)
    suggestions.sort(key=lambda x: x["thirty_day_sales"], reverse=True)
    return {"suggestions": suggestions}


@router.post("/mrp/apply")
def apply_mrp_suggestions(
    req: MRPApplyRequest,
    days: int = 30,
    lead_time_days: int = 7,
    safety_stock_days: int = 7,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Applies the auto-calculated MRP suggestions to the database.
    """
    org_id = current_user.organization_id
    cutoff_date = datetime.utcnow() - timedelta(days=days)
    
    # Re-calculate to ensure data integrity
    sales_data = db.query(
        models.InvoiceItem.product_id,
        func.sum(models.InvoiceItem.quantity).label("total_sold")
    ).join(models.Invoice).filter(
        models.Invoice.organization_id == org_id,
        models.Invoice.is_active == True,
        models.Invoice.invoice_type.in_(["sales-bill", "sales-challan", "brk-issue", "stock-issue"]),
        models.Invoice.date >= cutoff_date,
        models.InvoiceItem.product_id.is_in(req.product_ids)
    ).group_by(models.InvoiceItem.product_id).all()
    
    sales_map = {str(r.product_id): int(r.total_sold) for r in sales_data}
    
    updated_count = 0
    products = db.query(models.Product).filter(
        models.Product.organization_id == org_id,
        models.Product.id.in_(req.product_ids)
    ).all()
    
    for p in products:
        total_sold = sales_map.get(str(p.id), 0)
        if total_sold > 0:
            avg_daily = total_sold / days
            sug_min = max(int((avg_daily * lead_time_days) + (avg_daily * safety_stock_days)), 1)
            sug_reorder = max(int(avg_daily * 30), 1)
            
            p.min_stock_level = sug_min
            p.reorder_quantity = sug_reorder
            updated_count += 1
            
    db.commit()
    return {"message": f"Successfully updated MRP planning for {updated_count} products."}


@router.get("/auto-shift-candidates")
def get_auto_shift_candidates(
    expiry_before: Optional[str] = None,
    company_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    org_id = current_user.organization_id
    
    query = db.query(models.Batch, models.Product).join(
        models.Product, models.Batch.product_id == models.Product.id
    ).filter(
        models.Batch.organization_id == org_id,
        models.Batch.current_stock > 0
    )
    
    if company_id:
        query = query.filter(models.Product.company_id == company_id)
        
    results = query.all()
    
    def parse_mmyy(val):
        if not val or "/" not in val:
            return 999999
        try:
            m, y = val.split('/')
            m = int(m.strip())
            y = int(y.strip())
            if y < 100:
                y += 2000
            return y * 100 + m
        except:
            return 999999
            
    target_date_num = parse_mmyy(expiry_before) if expiry_before else None
    
    candidates = []
    for batch, product in results:
        if target_date_num:
            batch_date_num = parse_mmyy(batch.expiry)
            if batch_date_num > target_date_num:
                continue
                
        candidates.append({
            "product_id": str(product.id),
            "product_name": product.name,
            "batch_id": str(batch.id),
            "batch_number": batch.batch_number,
            "expiry": batch.expiry,
            "qty": batch.current_stock,
            "rate": float(batch.mrp or 0.0),
            "value": float(batch.current_stock * (batch.mrp or 0))
        })
        
    return {"candidates": candidates}


# ============================================================
# DOC-41: PHARMA EXPIRY RADAR & STOCK SHIFT QUARANTINE ENGINE
# ============================================================

def parse_expiry_to_days(exp_str: Optional[str]) -> int:
    """
    Returns days until expiry relative to today.
    Negative means already expired.
    If unparseable, returns 9999.
    """
    if not exp_str or not isinstance(exp_str, str):
        return 9999
    cleaned = exp_str.strip()
    now = datetime.utcnow()
    try:
        if "/" in cleaned:
            parts = cleaned.split("/")
            if len(parts) == 2:
                m = int(parts[0])
                y = int(parts[1])
                if y < 100:
                    y += 2000
                if m == 12:
                    exp_date = datetime(y, 12, 31)
                else:
                    next_month = datetime(y, m + 1, 1)
                    exp_date = next_month - timedelta(days=1)
                return (exp_date - now).days
        elif "-" in cleaned:
            parts = cleaned.split("-")
            if len(parts) == 2:
                y = int(parts[0])
                m = int(parts[1])
                if m == 12:
                    exp_date = datetime(y, 12, 31)
                else:
                    next_month = datetime(y, m + 1, 1)
                    exp_date = next_month - timedelta(days=1)
                return (exp_date - now).days
    except Exception:
        pass
    return 9999


def generate_stock_shift_voucher_number(db: Session, org_id: UUID) -> str:
    year = datetime.utcnow().year
    prefix = f"SHF-{year}-"
    shifts = db.query(models.StockShiftVoucher.voucher_no).filter(
        models.StockShiftVoucher.organization_id == org_id,
        models.StockShiftVoucher.voucher_no.like(f"{prefix}%")
    ).all()
    max_num = 0
    for (v_no,) in shifts:
        try:
            num = int(v_no.split("-")[-1])
            if num > max_num:
                max_num = num
        except Exception:
            pass
    return f"{prefix}{str(max_num + 1).zfill(4)}"


class StockShiftItemRequest(BaseModel):
    batch_id: UUID
    product_id: UUID
    qty: int
    rate: Optional[float] = None


class StockShiftCreateRequest(BaseModel):
    voucher_no: Optional[str] = None
    shift_date: Optional[str] = None
    from_godown: str = "MAIN_SALEABLE_GODOWN"
    to_godown: str = "QUARANTINE_EXPIRY_GODOWN"
    reason: Optional[str] = "Pharma Expiry & Damaged Stock Quarantine"
    company_id: Optional[UUID] = None
    principal_id: Optional[UUID] = None
    auto_create_principal_claim: bool = False
    items: List[StockShiftItemRequest]


@router.get("/expiry-cockpit-telemetry")
def get_expiry_cockpit_telemetry(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Real-time inventory telemetry for Pharma Expiry & Breakage Cockpit.
    """
    org_id = current_user.organization_id

    batches = db.query(models.Batch, models.Product).join(
        models.Product, models.Batch.product_id == models.Product.id
    ).filter(
        models.Batch.organization_id == org_id
    ).all()

    main_stock_val = 0.0
    main_stock_units = 0
    brk_exp_stock_val = 0.0
    brk_exp_stock_units = 0

    expired_count = 0
    expired_val = 0.0

    near_30_count = 0
    near_30_val = 0.0

    near_60_count = 0
    near_60_val = 0.0

    near_90_count = 0
    near_90_val = 0.0

    for batch, product in batches:
        cur_qty = int(batch.current_stock or 0)
        brk_qty = int(batch.brk_exp_stock or 0)
        rate = float(batch.rate or batch.cost or batch.mrp or 0.0)

        main_stock_units += cur_qty
        main_stock_val += cur_qty * rate

        brk_exp_stock_units += brk_qty
        brk_exp_stock_val += brk_qty * rate

        if cur_qty > 0:
            days = parse_expiry_to_days(batch.expiry)
            if days <= 0:
                expired_count += 1
                expired_val += cur_qty * rate
            elif days <= 30:
                near_30_count += 1
                near_30_val += cur_qty * rate
            elif days <= 60:
                near_60_count += 1
                near_60_val += cur_qty * rate
            elif days <= 90:
                near_90_count += 1
                near_90_val += cur_qty * rate

    claims = db.query(models.PrincipalClaim).filter(
        models.PrincipalClaim.status.in_(["PENDING", "UNDER_REVIEW"])
    ).all()
    pending_claims_count = len(claims)
    pending_claims_val = sum(float(c.claimed_amount or 0.0) for c in claims)

    shifts = db.query(models.StockShiftVoucher).filter(
        models.StockShiftVoucher.organization_id == org_id
    ).order_by(desc(models.StockShiftVoucher.created_at)).limit(5).all()

    recent_shifts_data = []
    for s in shifts:
        recent_shifts_data.append({
            "id": str(s.id),
            "voucher_no": s.voucher_no,
            "shift_date": s.shift_date.isoformat() if s.shift_date else "",
            "from_godown": s.from_godown,
            "to_godown": s.to_godown,
            "reason": s.reason,
            "total_items": s.total_items,
            "total_qty": float(s.total_qty or 0.0),
            "total_value": float(s.total_value or 0.0),
            "status": s.status,
            "auto_claim_generated": s.auto_claim_generated,
            "principal_claim_id": str(s.principal_claim_id) if s.principal_claim_id else None
        })

    return {
        "main_stock_val": round(main_stock_val, 2),
        "main_stock_units": main_stock_units,
        "brk_exp_stock_val": round(brk_exp_stock_val, 2),
        "brk_exp_stock_units": brk_exp_stock_units,
        "expired_count": expired_count,
        "expired_val": round(expired_val, 2),
        "near_30_count": near_30_count,
        "near_30_val": round(near_30_val, 2),
        "near_60_count": near_60_count,
        "near_60_val": round(near_60_val, 2),
        "near_90_count": near_90_count,
        "near_90_val": round(near_90_val, 2),
        "total_near_expiry_count": expired_count + near_30_count + near_60_count + near_90_count,
        "total_near_expiry_val": round(expired_val + near_30_val + near_60_val + near_90_val, 2),
        "pending_claims_count": pending_claims_count,
        "pending_claims_val": round(pending_claims_val, 2),
        "recent_shifts": recent_shifts_data
    }


@router.get("/expiry-radar-batches")
def get_expiry_radar_batches(
    bucket: Optional[str] = Query("ALL"),
    company_id: Optional[UUID] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Returns batches classified by near-expiry alert buckets.
    """
    org_id = current_user.organization_id
    query = db.query(models.Batch, models.Product).join(
        models.Product, models.Batch.product_id == models.Product.id
    ).filter(
        models.Batch.organization_id == org_id,
        models.Batch.current_stock > 0
    )
    if company_id:
        query = query.filter(models.Product.company_id == company_id)
    if search:
        s = f"%{search}%"
        query = query.filter(or_(
            models.Product.name.ilike(s),
            models.Product.code.ilike(s),
            models.Batch.batch_number.ilike(s)
        ))

    results = query.all()
    batches_out = []

    for batch, product in results:
        days = parse_expiry_to_days(batch.expiry)

        if days <= 0:
            status_tag = "EXPIRED"
            severity = "CRITICAL"
        elif days <= 30:
            status_tag = "30_DAYS"
            severity = "HIGH"
        elif days <= 60:
            status_tag = "60_DAYS"
            severity = "MEDIUM"
        elif days <= 90:
            status_tag = "90_DAYS"
            severity = "LOW"
        else:
            status_tag = "HEALTHY"
            severity = "NORMAL"

        if bucket == "EXPIRED" and status_tag != "EXPIRED":
            continue
        elif bucket == "30_DAYS" and status_tag not in ["EXPIRED", "30_DAYS"]:
            continue
        elif bucket == "60_DAYS" and status_tag not in ["EXPIRED", "30_DAYS", "60_DAYS"]:
            continue
        elif bucket == "90_DAYS" and status_tag not in ["EXPIRED", "30_DAYS", "60_DAYS", "90_DAYS"]:
            continue
        elif bucket == "ALL" and status_tag == "HEALTHY":
            continue

        rate = float(batch.rate or batch.cost or batch.mrp or 0.0)
        batches_out.append({
            "batch_id": str(batch.id),
            "product_id": str(product.id),
            "product_name": product.name,
            "product_code": product.code,
            "company_name": product.company.name if product.company else "Standard Pharma",
            "company_id": str(product.company_id) if product.company_id else None,
            "batch_number": batch.batch_number,
            "expiry": batch.expiry,
            "days_to_expiry": days,
            "status_tag": status_tag,
            "severity": severity,
            "current_stock": int(batch.current_stock),
            "brk_exp_stock": int(batch.brk_exp_stock or 0),
            "rate": rate,
            "value": round(int(batch.current_stock) * rate, 2),
            "mrp": float(batch.mrp or 0.0)
        })

    batches_out.sort(key=lambda x: x["days_to_expiry"])
    return {"batches": batches_out, "total": len(batches_out)}


@router.post("/shifts")
def create_stock_shift(
    req: StockShiftCreateRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Executes an atomic Stock Shift Voucher from Saleable Godown to Quarantine Godown.
    Optionally dual-generates an official Principal Expiry Claim.
    """
    org_id = current_user.organization_id
    if not req.items:
        raise HTTPException(status_code=400, detail="Cannot create stock shift with no items.")

    voucher_no = req.voucher_no or generate_stock_shift_voucher_number(db, org_id)

    shift_dt = datetime.utcnow()
    if req.shift_date:
        try:
            shift_dt = datetime.fromisoformat(req.shift_date)
        except Exception:
            pass

    shift_voucher = models.StockShiftVoucher(
        id=uuid.uuid4(),
        organization_id=org_id,
        voucher_no=voucher_no,
        shift_date=shift_dt,
        from_godown=req.from_godown,
        to_godown=req.to_godown,
        reason=req.reason,
        company_id=req.company_id,
        principal_id=req.principal_id,
        status="COMPLETED"
    )

    total_qty = 0
    total_value = Decimal("0.00")
    created_items = []

    for item_req in req.items:
        batch = db.query(models.Batch).filter(
            models.Batch.id == item_req.batch_id,
            models.Batch.organization_id == org_id
        ).first()
        if not batch:
            raise HTTPException(status_code=404, detail=f"Batch {item_req.batch_id} not found.")

        product = db.query(models.Product).filter(
            models.Product.id == item_req.product_id
        ).first()
        product_name = product.name if product else "Pharma Product"

        shift_qty = item_req.qty
        if shift_qty <= 0:
            continue
        if shift_qty > int(batch.current_stock or 0):
            raise HTTPException(
                status_code=400,
                detail=f"Requested shift qty {shift_qty} exceeds available stock {batch.current_stock} for batch {batch.batch_number}"
            )

        rate_val = Decimal(str(item_req.rate or batch.rate or batch.cost or batch.mrp or 0.0))
        item_val = Decimal(str(shift_qty)) * rate_val

        # Decrement saleable current_stock, increment brk_exp_stock
        batch.current_stock -= shift_qty
        batch.brk_exp_stock = (batch.brk_exp_stock or 0) + shift_qty

        shift_item = models.StockShiftItem(
            id=uuid.uuid4(),
            voucher_id=shift_voucher.id,
            product_id=batch.product_id,
            product_name=product_name,
            batch_id=batch.id,
            batch_number=batch.batch_number,
            expiry=batch.expiry,
            qty=shift_qty,
            rate=rate_val,
            value=item_val,
            mrp=batch.mrp or 0.0
        )
        created_items.append(shift_item)
        total_qty += shift_qty
        total_value += item_val

    shift_voucher.total_items = len(created_items)
    shift_voucher.total_qty = Decimal(str(total_qty))
    shift_voucher.total_value = total_value

    db.add(shift_voucher)
    db.add_all(created_items)
    db.flush()

    # ── Auto-generate Principal Claim & Debit Note if requested ──
    created_claim = None
    if req.auto_create_principal_claim and total_qty > 0:
        principal = None
        if req.principal_id:
            principal = db.query(models.PrincipalOperatingContext).filter(
                models.PrincipalOperatingContext.principal_id == req.principal_id
            ).first()

        principal_id = req.principal_id or (principal.principal_id if principal else uuid.uuid4())
        principal_name = principal.principal_name if principal else "Sun Pharma Healthcare Ltd."

        year = datetime.utcnow().year
        prefix = f"CLM-PRN-{year}-"
        all_claims = db.query(models.PrincipalClaim.claim_number).filter(
            models.PrincipalClaim.claim_number.like(f"{prefix}%")
        ).all()
        max_num = 0
        for (c_num,) in all_claims:
            try:
                num = int(c_num.split("-")[-1])
                if num > max_num:
                    max_num = num
            except Exception:
                pass
        claim_number = f"{prefix}{str(max_num + 1).zfill(4)}"

        first_item = created_items[0] if created_items else None

        claim = models.PrincipalClaim(
            id=uuid.uuid4(),
            claim_number=claim_number,
            principal_id=principal_id,
            principal_name=principal_name,
            claim_type="EXPIRY",
            source_doc_type="STOCK_SHIFT",
            source_doc_id=shift_voucher.voucher_no,
            product_id=first_item.product_id if first_item else None,
            product_name=first_item.product_name if first_item else "Pharmaceutical Products",
            batch_no=first_item.batch_number if first_item else "BATCH-QUARANTINE",
            claimed_qty=Decimal(str(total_qty)),
            claimed_amount=total_value,
            approved_amount=Decimal("0.00"),
            reason=f"Quarantine Stock Shift ({shift_voucher.voucher_no}) - Expiry Debit Note Claim",
            status="PENDING"
        )
        db.add(claim)
        db.flush()

        for item in created_items:
            claim_line = models.PrincipalClaimLine(
                id=uuid.uuid4(),
                claim_id=claim.id,
                source_movement_id=shift_voucher.voucher_no,
                product_id=item.product_id,
                batch_no=item.batch_number,
                qty=Decimal(str(item.qty)),
                eligible_qty=Decimal(str(item.qty)),
                rate=item.rate,
                amount=item.value,
                approved_amount=Decimal("0.00"),
                status="PENDING"
            )
            db.add(claim_line)

        shift_voucher.auto_claim_generated = True
        shift_voucher.principal_claim_id = claim.id
        created_claim = {
            "claim_id": str(claim.id),
            "claim_number": claim.claim_number,
            "principal_name": claim.principal_name,
            "claimed_amount": float(claim.claimed_amount),
            "status": claim.status
        }

    db.commit()

    return {
        "success": True,
        "voucher_id": str(shift_voucher.id),
        "voucher_no": shift_voucher.voucher_no,
        "shift_date": shift_voucher.shift_date.isoformat(),
        "total_items": shift_voucher.total_items,
        "total_qty": float(shift_voucher.total_qty),
        "total_value": float(shift_voucher.total_value),
        "from_godown": shift_voucher.from_godown,
        "to_godown": shift_voucher.to_godown,
        "auto_claim_generated": shift_voucher.auto_claim_generated,
        "principal_claim": created_claim
    }


@router.get("/shifts")
def list_stock_shifts(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Returns historical stock shift vouchers for the organization.
    """
    org_id = current_user.organization_id
    query = db.query(models.StockShiftVoucher).filter(
        models.StockShiftVoucher.organization_id == org_id
    ).order_by(desc(models.StockShiftVoucher.created_at))

    total = query.count()
    shifts = query.offset(skip).limit(limit).all()

    res = []
    for s in shifts:
        claim_info = None
        if s.principal_claim:
            claim_info = {
                "claim_id": str(s.principal_claim.id),
                "claim_number": s.principal_claim.claim_number,
                "status": s.principal_claim.status
            }
        res.append({
            "id": str(s.id),
            "voucher_no": s.voucher_no,
            "shift_date": s.shift_date.isoformat() if s.shift_date else "",
            "from_godown": s.from_godown,
            "to_godown": s.to_godown,
            "reason": s.reason,
            "total_items": s.total_items,
            "total_qty": float(s.total_qty or 0.0),
            "total_value": float(s.total_value or 0.0),
            "status": s.status,
            "auto_claim_generated": s.auto_claim_generated,
            "principal_claim": claim_info
        })
    return {"shifts": res, "total": total}


@router.get("/shifts/{shift_id}")
def get_stock_shift_detail(
    shift_id: UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Returns detailed voucher items and linked claim for a given Stock Shift.
    """
    org_id = current_user.organization_id
    shift = db.query(models.StockShiftVoucher).filter(
        models.StockShiftVoucher.id == shift_id,
        models.StockShiftVoucher.organization_id == org_id
    ).first()
    if not shift:
        raise HTTPException(status_code=404, detail="Stock shift voucher not found.")

    items_data = []
    for it in shift.items:
        items_data.append({
            "id": str(it.id),
            "product_id": str(it.product_id),
            "product_name": it.product_name,
            "batch_id": str(it.batch_id),
            "batch_number": it.batch_number,
            "expiry": it.expiry,
            "qty": it.qty,
            "rate": float(it.rate),
            "value": float(it.value)
        })

    claim_info = None
    if shift.principal_claim:
        claim_info = {
            "claim_id": str(shift.principal_claim.id),
            "claim_number": shift.principal_claim.claim_number,
            "principal_name": shift.principal_claim.principal_name,
            "claimed_amount": float(shift.principal_claim.claimed_amount),
            "status": shift.principal_claim.status
        }

    return {
        "id": str(shift.id),
        "voucher_no": shift.voucher_no,
        "shift_date": shift.shift_date.isoformat() if shift.shift_date else "",
        "from_godown": shift.from_godown,
        "to_godown": shift.to_godown,
        "reason": shift.reason,
        "total_items": shift.total_items,
        "total_qty": float(shift.total_qty or 0.0),
        "total_value": float(shift.total_value or 0.0),
        "status": shift.status,
        "auto_claim_generated": shift.auto_claim_generated,
        "principal_claim": claim_info,
        "items": items_data
    }

