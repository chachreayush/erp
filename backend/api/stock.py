from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import List, Optional
from uuid import UUID

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

    main_inward_types = ["purchase-bill", "purchase-challan", "sales-return-credit", "sales-return-challan", "sales-return-bill", "stock-receive-entry"]
    main_outward_types = ["sales-bill", "sales-challan", "purchase-return-debit", "purchase-return-challan", "purchase-return-bill", "stock-issue-entry"]

    brk_inward_types = ["brk-receive-bill", "brk-receive-challan"]
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
