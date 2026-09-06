from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

import models
import schemas
from database import get_db
from auth.router import get_current_user

def get_org_id(current_user):
    return current_user.organization_id


router = APIRouter()

@router.get("/drafts", response_model=List[schemas.ErrorEntryResponse])
def get_drafts(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    org_id = get_org_id(current_user)
    return db.query(models.ErrorEntry).filter(
        models.ErrorEntry.organization_id == org_id
    ).all()

@router.post("/drafts", response_model=schemas.ErrorEntryResponse)
def save_draft(draft: schemas.ErrorEntryCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    org_id = get_org_id(current_user)
    
    # Get current restart count
    state = db.query(models.SystemState).first()
    current_count = state.restart_count if state else 1

    # Check if a draft for this module already exists for this user/org (for now just org)
    existing = db.query(models.ErrorEntry).filter(
        models.ErrorEntry.organization_id == org_id,
        models.ErrorEntry.module_name == draft.module_name
    ).first()

    if existing:
        existing.json_payload = draft.json_payload
        existing.restart_count_at_creation = current_count
        db.commit()
        db.refresh(existing)
        return existing
    else:
        new_draft = models.ErrorEntry(
            organization_id=org_id,
            module_name=draft.module_name,
            json_payload=draft.json_payload,
            restart_count_at_creation=current_count
        )
        db.add(new_draft)
        db.commit()
        db.refresh(new_draft)
        return new_draft

@router.delete("/drafts/{draft_id}")
def delete_draft(draft_id: UUID, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    org_id = get_org_id(current_user)
    draft = db.query(models.ErrorEntry).filter(
        models.ErrorEntry.id == draft_id,
        models.ErrorEntry.organization_id == org_id
    ).first()
    
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found")
        
    db.delete(draft)
    db.commit()
    return {"message": "Draft deleted successfully"}
