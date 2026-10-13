from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from datetime import datetime

from database import get_db
import models
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
    is_near_expiry: bool = False
    is_expired: bool = False

    class Config:
        from_attributes = True


def parse_expiry_for_fefo(exp_str: Optional[str]):
    """
    Parses MM/YY, MM/YYYY, or YYYY-MM into (year, month) tuple for strict FEFO ordering.
    """
    if not exp_str or not isinstance(exp_str, str):
        return (9999, 99)
    cleaned = exp_str.strip()
    if "/" in cleaned:
        parts = cleaned.split("/")
        if len(parts) == 2:
            try:
                m = int(parts[0])
                y = int(parts[1])
                if y < 100:
                    y += 2000
                return (y, m)
            except ValueError:
                pass
    elif "-" in cleaned:
        parts = cleaned.split("-")
        if len(parts) == 2:
            try:
                y = int(parts[0])
                m = int(parts[1])
                if y < 100:
                    y += 2000
                return (y, m)
            except ValueError:
                pass
    return (9999, 99)


@router.get("/", response_model=List[BatchResponse])
def get_batches(
    product_id: Optional[UUID] = None,
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    """
    Fetch all batches for the organization ordered strictly by FEFO (First Expiry, First Out).
    Flags near-expiry (<90 days) and expired batches for compliant pharma billing.
    """
    query = db.query(models.Batch).filter(models.Batch.organization_id == current_user.organization_id)
    
    if product_id:
        query = query.filter(models.Batch.product_id == product_id)
        
    db_batches = query.all()
    
    now = datetime.utcnow()
    current_year = now.year
    current_month = now.month
    
    results = []
    for b in db_batches:
        y, m = parse_expiry_for_fefo(b.expiry)
        
        is_expired = False
        is_near_expiry = False
        
        if y < 9999:
            # Approximate months to expiry
            months_diff = (y - current_year) * 12 + (m - current_month)
            if months_diff < 0:
                is_expired = True
            elif months_diff <= 3: # Expiring within 3 months (~90 days)
                is_near_expiry = True

        batch_dict = {
            "id": b.id,
            "product_id": b.product_id,
            "batch_number": b.batch_number,
            "expiry": b.expiry,
            "mrp": float(b.mrp or 0),
            "rate": float(b.rate or 0),
            "rate_a": float(b.rate_a or 0),
            "rate_b": float(b.rate_b or 0),
            "rate_c": float(b.rate_c or 0),
            "cost": float(b.cost or 0),
            "current_stock": int(b.current_stock or 0),
            "brk_exp_stock": int(b.brk_exp_stock or 0),
            "is_near_expiry": is_near_expiry,
            "is_expired": is_expired,
            "_sort_key": (y, m, -int(b.current_stock or 0))
        }
        results.append(batch_dict)
    
    # Sort by FEFO: earliest expiry first
    results.sort(key=lambda item: item["_sort_key"])
    
    return results

