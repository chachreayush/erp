from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import User, Party, TdsTcsTransaction
from auth.router import get_current_user
from typing import Dict, Any
from pydantic import BaseModel

router = APIRouter()

class ModeUpdateRequest(BaseModel):
    mode: str # 'AUTOMATIC', 'MANUAL', 'DEFER'

@router.get("/threshold/{party_id}")
def get_party_threshold(
    party_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    party = db.query(Party).filter(
        Party.id == party_id,
        Party.organization_id == current_user.organization_id
    ).first()
    if not party:
        raise HTTPException(status_code=404, detail="Party not found")
        
    # Find latest transaction to get cumulative amount for current FY
    # For a robust implementation, this would aggregate or check the latest TdsTcsTransaction
    latest_tx = db.query(TdsTcsTransaction).filter(
        TdsTcsTransaction.party_id == party.id,
        TdsTcsTransaction.organization_id == current_user.organization_id
    ).order_by(TdsTcsTransaction.created_at.desc()).first()
    
    cumulative_amount = float(latest_tx.cumulative_amount) if latest_tx else 0.0
    
    return {
        "party_id": party_id,
        "party_name": party.legal_name,
        "pan": party.pan,
        "cumulative_amount": cumulative_amount,
        "threshold_limit": 5000000.0, # 50 Lakhs
        "tds_tcs_mode": party.tds_tcs_mode,
        "is_non_filer": party.is_non_filer_206ab_cca
    }

@router.post("/mode/{party_id}")
def update_tds_tcs_mode(
    party_id: str,
    payload: ModeUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    party = db.query(Party).filter(
        Party.id == party_id,
        Party.organization_id == current_user.organization_id
    ).first()
    if not party:
        raise HTTPException(status_code=404, detail="Party not found")
        
    valid_modes = ["AUTOMATIC", "MANUAL", "DEFER", "PROMPT"]
    if payload.mode not in valid_modes:
        raise HTTPException(status_code=400, detail="Invalid mode")
        
    party.tds_tcs_mode = payload.mode
    db.commit()
    
    return {"status": "success", "party_id": party_id, "new_mode": party.tds_tcs_mode}
