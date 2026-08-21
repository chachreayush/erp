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
