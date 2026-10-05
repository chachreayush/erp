from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime
import uuid

import models
import schemas
from database import get_db
from auth.router import get_current_user

router = APIRouter(tags=["Billing & Document Series"])

@router.get("/series", response_model=List[schemas.DocumentSeriesResponse])
def get_all_series(invoice_type: Optional[str] = None, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    query = db.query(models.DocumentSeries).filter(
        models.DocumentSeries.organization_id == current_user.organization_id,
        models.DocumentSeries.is_active == True
    )
    if invoice_type:
        query = query.filter(models.DocumentSeries.invoice_type == invoice_type)
    return query.all()

@router.post("/series", response_model=schemas.DocumentSeriesResponse)
def create_series(series: schemas.DocumentSeriesCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    existing = db.query(models.DocumentSeries).filter(
        models.DocumentSeries.organization_id == current_user.organization_id,
        models.DocumentSeries.series_code == series.series_code
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Series code already exists for this organization")
    
    db_series = models.DocumentSeries(
        organization_id=current_user.organization_id,
        **series.model_dump()
    )
    db.add(db_series)
    db.commit()
    db.refresh(db_series)
    return db_series

@router.get("/unbilled-challans", response_model=List[schemas.InvoiceResponse])
def get_unbilled_challans(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """Fetch all Delivery Challans that still have an unbilled quantity balance."""
    challans = db.query(models.Invoice).filter(
        models.Invoice.organization_id == current_user.organization_id,
        models.Invoice.invoice_type == "sales_challan",
        models.Invoice.is_active == True
    ).order_by(models.Invoice.date.desc()).all()
    
    unbilled = []
    for challan in challans:
        # Check if any item has unbilled balance
        has_balance = False
        for item in challan.items:
            if item.quantity > item.billed_qty:
                has_balance = True
                break
        if has_balance:
            unbilled.append(challan)
            
    return unbilled
