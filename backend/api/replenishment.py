from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from database import get_db
import schemas
import models
import uuid

router = APIRouter(
    prefix="/api/replenishment",
    tags=["Replenishment"]
)

@router.get("/rules", response_model=List[schemas.ReorderRuleResponse])
def get_reorder_rules(
    db: Session = Depends(get_db)
):
    return db.query(models.ReorderRule).all()

@router.post("/rules", response_model=schemas.ReorderRuleResponse)
def create_reorder_rule(
    rule: schemas.ReorderRuleCreate,
    db: Session = Depends(get_db)
):
    # Dummy implementation 
    db_rule = models.ReorderRule(**rule.dict(), organization_id=uuid.uuid4())
    db.add(db_rule)
    db.commit()
    db.refresh(db_rule)
    return db_rule

@router.post("/proposals/generate")
def generate_proposals(
    db: Session = Depends(get_db)
):
    # Simulate proposal generation
    return {
        "message": "Generated proposals based on Reorder-Eligible stock",
        "proposals": [
            {"product": "Product A", "suggested_qty": 50, "explanation": "MAX(0, 100 - 50)"}
        ]
    }
