from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text, func, and_
from typing import List, Dict, Any, Optional
import uuid
from datetime import datetime

from database import get_db
import models
import schemas
from auth.router import get_current_user

router = APIRouter(prefix="/reports_v2", tags=["Reports V2 (DOC-30)"])

@router.post("/templates", response_model=schemas.ReportTemplateResponse)
def create_template(template: schemas.ReportTemplateCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    new_template = models.ReportTemplate(
        organization_id=current_user.organization_id,
        name=template.name,
        subject=template.subject,
        config=template.config,
        is_published=template.is_published
    )
    db.add(new_template)
    db.commit()
    db.refresh(new_template)
    return new_template

@router.get("/templates", response_model=List[schemas.ReportTemplateResponse])
def get_templates(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.ReportTemplate).filter(
        models.ReportTemplate.organization_id == current_user.organization_id
    ).all()

@router.post("/variants", response_model=schemas.ReportVariantResponse)
def create_variant(variant: schemas.ReportVariantCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    new_variant = models.ReportVariant(
        user_id=current_user.id,
        template_id=variant.template_id,
        name=variant.name,
        saved_state=variant.saved_state
    )
    db.add(new_variant)
    db.commit()
    db.refresh(new_variant)
    return new_variant

@router.get("/variants", response_model=List[schemas.ReportVariantResponse])
def get_variants(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.ReportVariant).filter(
        models.ReportVariant.user_id == current_user.id
    ).all()

@router.post("/exclusions", response_model=schemas.DashboardExclusionResponse)
def create_exclusion(exclusion: schemas.DashboardExclusionCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    new_ex = models.DashboardExclusion(
        organization_id=current_user.organization_id,
        entity_type=exclusion.entity_type,
        entity_id=exclusion.entity_id,
        reason=exclusion.reason,
        user_id=current_user.id,
        expiry_date=exclusion.expiry_date,
        is_active=exclusion.is_active
    )
    db.add(new_ex)
    db.commit()
    db.refresh(new_ex)
    return new_ex

@router.get("/exclusions", response_model=List[schemas.DashboardExclusionResponse])
def get_exclusions(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.DashboardExclusion).filter(
        models.DashboardExclusion.organization_id == current_user.organization_id,
        models.DashboardExclusion.is_active == True
    ).all()

@router.delete("/exclusions/{exclusion_id}")
def delete_exclusion(exclusion_id: uuid.UUID, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    ex = db.query(models.DashboardExclusion).filter(
        models.DashboardExclusion.id == exclusion_id,
        models.DashboardExclusion.organization_id == current_user.organization_id
    ).first()
    if not ex:
        raise HTTPException(status_code=404, detail="Exclusion not found")
    
    ex.is_active = False
    db.commit()
    return {"status": "success"}

@router.post("/execute/{subject}")
def execute_report(subject: str, payload: dict, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """
    Dynamic reporting engine (MVP). 
    In a real massive ERP, this would map `subject` to a Semantic Model or SQL View, 
    parse `payload` for `dimensions` and `measures` and `filters`, and return aggregated results.
    For this MVP, we will mock standard aggregates based on the subject.
    """
    org_id = current_user.organization_id
    
    if subject == "Sales":
        # Example dynamic execution for Sales
        # In reality: SELECT dimensions, SUM(measures) FROM invoices GROUP BY dimensions
        query = db.query(models.Invoice).filter(
            models.Invoice.organization_id == org_id,
            models.Invoice.invoice_type.in_(["sales-bill", "sales-challan"])
        )
        # Apply Dashboard exclusions if requested in payload (e.g. payload.get('use_exclusions'))
        if payload.get("use_exclusions"):
            exclusions = db.query(models.DashboardExclusion.entity_id).filter(
                models.DashboardExclusion.organization_id == org_id,
                models.DashboardExclusion.entity_type == 'Party',
                models.DashboardExclusion.is_active == True
            ).all()
            excluded_party_ids = [ex[0] for ex in exclusions]
            if excluded_party_ids:
                query = query.filter(models.Invoice.party_id.not_in(excluded_party_ids))
        
        invoices = query.all()
        
        # We manually aggregate based on payload dimensions for MVP
        results = []
        for inv in invoices:
            results.append({
                "id": str(inv.id),
                "invoice_number": inv.invoice_number,
                "date": inv.date.isoformat(),
                "customer_name": inv.customer_name,
                "grand_total": float(inv.grand_total)
            })
        return {"data": results}
        
    elif subject == "Ledger":
        query = db.query(models.Ledger).filter(models.Ledger.organization_id == org_id)
        if payload.get("use_exclusions"):
            exclusions = db.query(models.DashboardExclusion.entity_id).filter(
                models.DashboardExclusion.organization_id == org_id,
                models.DashboardExclusion.entity_type == 'Ledger',
                models.DashboardExclusion.is_active == True
            ).all()
            excluded_ledger_ids = [ex[0] for ex in exclusions]
            if excluded_ledger_ids:
                query = query.filter(models.Ledger.id.not_in(excluded_ledger_ids))
                
        ledgers = query.all()
        return {"data": [{"id": str(l.id), "name": l.name, "closing_balance": float(l.closing_balance)} for l in ledgers]}

    elif subject == "Inventory":
        query = db.query(models.Item).filter(models.Item.organization_id == org_id)
        items = query.all()
        return {"data": [{"id": str(i.id), "name": i.name, "category": i.category, "current_stock": float(i.current_stock)} for i in items]}

    return {"data": []}
