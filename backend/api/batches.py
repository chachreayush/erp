from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional
from uuid import UUID

from database import get_db
import models
import schemas
from pydantic import BaseModel
from auth.router import get_current_user

router = APIRouter(
    prefix="/batches",
    tags=["Batches"],
    dependencies=[Depends(get_current_user)]
)

class BatchResponse(BaseModel):
    id: UUID
    product_id: UUID
    batch_number: str
    expiry: Optional[str] = None
    mrp: float
    rate: float
    rate_a: float
    rate_b: float
    rate_c: float
    cost: float
    current_stock: int
    brk_exp_stock: int

    class Config:
        from_attributes = True

@router.get("/", response_model=List[BatchResponse])
def get_batches(
    product_id: Optional[UUID] = None,
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    """
    Fetch all batches for the organization. Optionally filter by product_id.
    """
    query = db.query(models.Batch).filter(models.Batch.organization_id == current_user.organization_id)
    
    if product_id:
        query = query.filter(models.Batch.product_id == product_id)
        
    batches = query.order_by(desc(models.Batch.created_at)).all()
    return batches
