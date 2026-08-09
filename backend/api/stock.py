from fastapi import APIRouter, Depends
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

@router.get("/", response_model=List[StockResponse])
def get_current_stock(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """
    Calculate and return the current stock for all products based on active Batches.
    """
    # Get all products for the org with relationships
    products = db.query(models.Product).options(
        joinedload(models.Product.company),
        joinedload(models.Product.salt_relation)
    ).filter(models.Product.organization_id == current_user.organization_id).all()

    # Calculate stock from Batch table
    stock_data = db.query(
        models.Batch.product_id,
        func.sum(models.Batch.current_stock).label('total_qty')
    ).filter(
        models.Batch.organization_id == current_user.organization_id
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
