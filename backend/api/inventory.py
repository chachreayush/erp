from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from database import get_db
import schemas
import models
import uuid

router = APIRouter(
    prefix="/api/inventory",
    tags=["Inventory"]
)

@router.get("/positions", response_model=List[schemas.StockPositionResponse])
def get_stock_positions(
    db: Session = Depends(get_db),
    status: str = None,
    product_id: str = None
):
    query = db.query(models.StockPosition)
    if status:
        query = query.filter(models.StockPosition.status == status)
    if product_id:
        query = query.filter(models.StockPosition.product_id == product_id)
        
    return query.all()

@router.post("/movements")
def create_stock_movement(
    movement: dict, # Simplified for now
    db: Session = Depends(get_db)
):
    # This would execute a stock movement and update the position
    return {"message": "Stock movement recorded successfully"}
