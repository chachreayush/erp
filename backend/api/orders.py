from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import uuid

import models
import schemas
from database import get_db
from auth.router import get_current_user

router = APIRouter(tags=["Sales Orders"])

@router.get("/", response_model=List[schemas.SalesOrderResponse])
def get_sales_orders(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.SalesOrder).filter(
        models.SalesOrder.organization_id == current_user.organization_id
    ).order_by(models.SalesOrder.created_at.desc()).all()

@router.post("/", response_model=schemas.SalesOrderResponse)
def create_sales_order(order: schemas.SalesOrderCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    # Create the base order
    db_order = models.SalesOrder(
        organization_id=current_user.organization_id,
        created_by_user_id=current_user.id,
        order_number=order.order_number,
        date=order.date,
        party_id=order.party_id,
        status=order.status,
        total_amount=order.total_amount
    )
    db.add(db_order)
    db.commit()
    db.refresh(db_order)
    
    # Add items
    for item in order.items:
        db_item = models.SalesOrderItem(
            order_id=db_order.id,
            **item.model_dump()
        )
        db.add(db_item)
    
    db.commit()
    
    # Validation logic (Hold Engine)
    # Check if we need to put it on HOLD
    party = db.query(models.Party).filter(models.Party.id == order.party_id).first()
    if party and party.credit_limit:
        # Simplistic check: If order total > credit_limit, put on hold
        if order.total_amount > party.credit_limit:
            db_order.status = "HOLD"
            hold = models.SalesOrderHold(
                order_id=db_order.id,
                organization_id=current_user.organization_id,
                hold_reason=f"Credit Limit Exceeded (Limit: {party.credit_limit}, Order: {order.total_amount})",
                status="ACTIVE"
            )
            db.add(hold)
            db.commit()
            
    db.refresh(db_order)
    return db_order

@router.get("/{order_id}/holds", response_model=List[schemas.SalesOrderHoldResponse])
def get_order_holds(order_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.SalesOrderHold).filter(
        models.SalesOrderHold.order_id == order_id,
        models.SalesOrderHold.organization_id == current_user.organization_id
    ).all()

@router.post("/{order_id}/approve")
def approve_order(order_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    # Only Admin or Manager can approve
    if current_user.role not in [models.UserRole.AM_ADMIN, models.UserRole.CM_ADMIN, models.UserRole.MANAGER]:
        raise HTTPException(status_code=403, detail="Permission denied to approve orders")
        
    order = db.query(models.SalesOrder).filter(
        models.SalesOrder.id == order_id,
        models.SalesOrder.organization_id == current_user.organization_id
    ).first()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    # Clear active holds
    holds = db.query(models.SalesOrderHold).filter(
        models.SalesOrderHold.order_id == order_id,
        models.SalesOrderHold.status == "ACTIVE"
    ).all()
    
    import datetime
    for hold in holds:
        hold.status = "CLEARED"
        hold.cleared_by_user_id = current_user.id
        hold.cleared_at = datetime.datetime.utcnow()
        
    order.status = "APPROVED"
    db.commit()
    return {"message": "Order approved and holds cleared"}

@router.get("/holds/active", response_model=List[schemas.SalesOrderHoldResponse])
def get_all_active_holds(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.SalesOrderHold).filter(
        models.SalesOrderHold.organization_id == current_user.organization_id,
        models.SalesOrderHold.status == "ACTIVE"
    ).all()
