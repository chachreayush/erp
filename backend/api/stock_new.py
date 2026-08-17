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

    # Calculate stock from Batch table
    stock_data = db.query(
        models.Batch.product_id,
        func.sum(models.Batch.current_stock).label('total_qty')
    ).filter(
        models.Batch.organization_id == org_id
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

@router.post("/in", response_model=schemas.BatchResponse, status_code=status.HTTP_201_CREATED)
def stock_in(
    payload: StockInCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Stock In - Receive goods into a batch. Creates or updates batch stock.
    """
    org_id = current_user.organization_id
    
    # Find existing batch or create new
    batch = db.query(models.Batch).filter(
        models.Batch.organization_id == org_id,
        models.Batch.product_id == payload.product_id,
        models.Batch.batch_number == payload.batch_number
    ).first()
    
    if batch:
        batch.current_stock += payload.quantity
        # Update rates if provided
        if payload.mrp:
            batch.mrp = payload.mrp
        if payload.rate:
            batch.rate = payload.rate
        if payload.rate_a:
            batch.rate_a = payload.rate_a
        if payload.rate_b:
            batch.rate_b = payload.rate_b
        if payload.rate_c:
            batch.rate_c = payload.rate_c
        if payload.cost:
            batch.cost = payload.cost
        if payload.expiry:
            batch.expiry = payload.expiry
    else:
        batch = models.Batch(
            organization_id=org_id,
            product_id=payload.product_id,
            batch_number=payload.batch_number,
            expiry=payload.expiry,
            mrp=payload.mrp,
            rate=payload.rate,
            rate_a=payload.rate_a,
            rate_b=payload.rate_b,
            rate_c=payload.rate_c,
            cost=payload.cost,
            current_stock=payload.quantity
        )
        db.add(batch)
    
    db.commit()
    db.refresh(batch)
    return batch

@router.post("/out", response_model=schemas.BatchResponse)
def stock_out(
    payload: StockOutCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Stock Out - Issue goods from a batch. Decreases batch stock.
    """
    org_id = current_user.organization_id
    
    batch = db.query(models.Batch).filter(
        models.Batch.organization_id == org_id,
        models.Batch.product_id == payload.product_id,
        models.Batch.batch_number == payload.batch_number
    ).first()
    
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    
    if batch.current_stock < payload.quantity:
        raise HTTPException(
            status_code=400, 
            detail=f"Insufficient stock. Available: {batch.current_stock}, Requested: {payload.quantity}"
        )
    
    batch.current_stock -= payload.quantity
    db.commit()
    db.refresh(batch)
    return batch

@router.post("/transfer", response_model=dict)
def stock_transfer(
    payload: StockTransferCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Stock Transfer - Transfer stock between stations/locations.
    For simplicity, this just records the transfer; actual multi-location 
    stock tracking would require a separate StockLocation table.
    """
    org_id = current_user.organization_id
    
    batch = db.query(models.Batch).filter(
        models.Batch.organization_id == org_id,
        models.Batch.product_id == payload.product_id,
        models.Batch.batch_number == payload.batch_number
    ).first()
    
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    
    if batch.current_stock < payload.quantity:
        raise HTTPException(
            status_code=400, 
            detail=f"Insufficient stock for transfer. Available: {batch.current_stock}"
        )
    
    batch.current_stock -= payload.quantity
    db.commit()
    
    # In a full implementation, you'd create a StockTransfer record
    # and add stock to the destination location
    return {
        "message": f"Transferred {payload.quantity} units from {payload.from_station} to {payload.to_station}",
        "batch_id": str(batch.id),
        "remaining_stock": batch.current_stock
    }

@router.post("/adjust", response_model=schemas.BatchResponse)
def stock_adjustment(
    payload: StockAdjustmentCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Stock Adjustment - Manual adjustment of stock (positive or negative).
    """
    org_id = current_user.organization_id
    
    batch = db.query(models.Batch).filter(
        models.Batch.organization_id == org_id,
        models.Batch.product_id == payload.product_id,
        models.Batch.batch_number == payload.batch_number
    ).first()
    
    if not batch:
        # If batch doesn't exist and adjustment is positive, create it
        if payload.quantity > 0:
            batch = models.Batch(
                organization_id=org_id,
                product_id=payload.product_id,
                batch_number=payload.batch_number or "ADJ-" + str(payload.product_id)[:8],
                expiry=None,
                mrp=0,
                rate=0,
                rate_a=0,
                rate_b=0,
                rate_c=0,
                cost=0,
                current_stock=payload.quantity
            )
            db.add(batch)
            db.commit()
            db.refresh(batch)
            return batch
        else:
            raise HTTPException(status_code=404, detail="Batch not found for negative adjustment")
    
    new_stock = batch.current_stock + payload.quantity
    if new_stock < 0:
        raise HTTPException(
            status_code=400, 
            detail=f"Adjustment would result in negative stock ({new_stock}). Current: {batch.current_stock}"
        )
    
    batch.current_stock = new_stock
    db.commit()
    db.refresh(batch)
    return batch

@router.get("/batches/{product_id}", response_model=List[schemas.BatchResponse])
def get_batches_for_product(
    product_id: UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Get all batches for a specific product with current stock levels.
    """
    org_id = current_user.organization_id
    
    batches = db.query(models.Batch).filter(
        models.Batch.organization_id == org_id,
        models.Batch.product_id == product_id
    ).order_by(models.Batch.created_at.desc()).all()
    
    return batches