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

    stock_data = db.query(
        models.Batch.product_id,
        func.sum(models.Batch.brk_exp_stock).label("total_qty")
    ).filter(
        models.Batch.organization_id == org_id
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