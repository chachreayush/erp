from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import uuid

import models
import schemas
from database import get_db
from auth.router import get_current_user

router = APIRouter(tags=["Procurement"])

@router.get("/rules", response_model=List[schemas.VendorSupplyRuleResponse])
def get_vendor_supply_rules(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.VendorSupplyRule).filter(
        models.VendorSupplyRule.organization_id == current_user.organization_id
    ).all()

@router.post("/rules", response_model=schemas.VendorSupplyRuleResponse)
def create_vendor_supply_rule(rule: schemas.VendorSupplyRuleCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    db_rule = models.VendorSupplyRule(
        **rule.model_dump(),
        organization_id=current_user.organization_id
    )
    db.add(db_rule)
    db.commit()
    db.refresh(db_rule)
    return db_rule

@router.get("/orders", response_model=List[schemas.PurchaseOrderResponse])
def get_purchase_orders(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.PurchaseOrder).filter(
        models.PurchaseOrder.organization_id == current_user.organization_id
    ).order_by(models.PurchaseOrder.created_at.desc()).all()

@router.post("/orders", response_model=schemas.PurchaseOrderResponse)
def create_purchase_order(po: schemas.PurchaseOrderCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    db_po = models.PurchaseOrder(
        organization_id=current_user.organization_id,
        po_number=po.po_number,
        date=po.date,
        vendor_id=po.vendor_id,
        status=po.status,
        expected_delivery=po.expected_delivery,
        supply_classification=po.supply_classification,
        total_amount=po.total_amount
    )
    db.add(db_po)
    db.commit()
    db.refresh(db_po)
    
    for item in po.items:
        db_item = models.PurchaseOrderItem(
            po_id=db_po.id,
            **item.model_dump()
        )
        db.add(db_item)
    
    db.commit()
    db.refresh(db_po)
    return db_po

@router.get("/complaints", response_model=List[schemas.VendorComplaintResponse])
def get_vendor_complaints(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.VendorComplaint).filter(
        models.VendorComplaint.organization_id == current_user.organization_id
    ).order_by(models.VendorComplaint.created_at.desc()).all()

@router.post("/complaints", response_model=schemas.VendorComplaintResponse)
def create_vendor_complaint(complaint: schemas.VendorComplaintCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    db_comp = models.VendorComplaint(
        **complaint.model_dump(),
        organization_id=current_user.organization_id
    )
    db.add(db_comp)
    db.commit()
    db.refresh(db_comp)
    return db_comp
