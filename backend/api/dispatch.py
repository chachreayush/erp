from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

import models
import schemas
from database import get_db
from auth.router import get_current_user

router = APIRouter(tags=["Dispatch & Delivery"])

@router.get("/challans", response_model=List[schemas.InvoiceResponse])
def get_delivery_challans(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """Fetch all Sales Challans for dispatch management"""
    return db.query(models.Invoice).filter(
        models.Invoice.organization_id == current_user.organization_id,
        models.Invoice.invoice_type == "sales_challan",
        models.Invoice.is_active == True
    ).order_by(models.Invoice.created_at.desc()).all()

@router.get("/", response_model=List[schemas.DispatchRecordResponse])
def get_all_dispatches(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.DispatchRecord).filter(
        models.DispatchRecord.organization_id == current_user.organization_id
    ).order_by(models.DispatchRecord.created_at.desc()).all()

@router.post("/", response_model=schemas.DispatchRecordResponse)
def create_dispatch(record: schemas.DispatchRecordCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    db_record = models.DispatchRecord(
        organization_id=current_user.organization_id,
        **record.model_dump()
    )
    db.add(db_record)
    db.commit()
    db.refresh(db_record)
    return db_record

@router.post("/{dispatch_id}/status")
def update_dispatch_status(dispatch_id: str, status: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    db_record = db.query(models.DispatchRecord).filter(
        models.DispatchRecord.id == dispatch_id,
        models.DispatchRecord.organization_id == current_user.organization_id
    ).first()
    if not db_record:
        raise HTTPException(status_code=404, detail="Dispatch record not found")
    
    db_record.status = status
    db.commit()
    return {"message": f"Status updated to {status}"}

@router.post("/{dispatch_id}/pod")
def record_pod(dispatch_id: str, remarks: str = "", db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    db_record = db.query(models.DispatchRecord).filter(
        models.DispatchRecord.id == dispatch_id,
        models.DispatchRecord.organization_id == current_user.organization_id
    ).first()
    if not db_record:
        raise HTTPException(status_code=404, detail="Dispatch record not found")
    
    db_record.status = "DELIVERED"
    db_record.pod_captured = True
    db_record.pod_date = datetime.utcnow()
    db_record.pod_remarks = remarks
    db.commit()
    return {"message": "POD recorded successfully"}
