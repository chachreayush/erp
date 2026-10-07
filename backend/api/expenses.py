from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from uuid import UUID

import models
import schemas
from database import get_db
from auth.router import get_current_user

router = APIRouter(prefix="/expenses", tags=["Expense Management"])

def get_org_id(user: models.User) -> UUID:
    if not user.organization_id:
        raise HTTPException(status_code=400, detail="User is not assigned to an organization")
    return user.organization_id

# -- EXPENSE CATEGORIES ---------------------------------
@router.get("/categories", response_model=List[schemas.ExpenseCategoryResponse])
def get_categories(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    org_id = get_org_id(current_user)
    return db.query(models.ExpenseCategory).filter(
        models.ExpenseCategory.organization_id == org_id,
        models.ExpenseCategory.is_active == True
    ).all()

@router.post("/categories", response_model=schemas.ExpenseCategoryResponse)
def create_category(cat: schemas.ExpenseCategoryCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    org_id = get_org_id(current_user)
    db_cat = models.ExpenseCategory(**cat.dict(), organization_id=org_id)
    db.add(db_cat)
    db.commit()
    db.refresh(db_cat)
    return db_cat

@router.delete("/categories/{id}")
def delete_category(id: UUID, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    org_id = get_org_id(current_user)
    db_cat = db.query(models.ExpenseCategory).filter(models.ExpenseCategory.id == id, models.ExpenseCategory.organization_id == org_id).first()
    if not db_cat:
        raise HTTPException(status_code=404, detail="Category not found")
    db_cat.is_active = False
    db.commit()
    return {"message": "Deleted successfully"}

# -- EMPLOYEE ADVANCES ---------------------------------
@router.get("/advances", response_model=List[schemas.EmployeeAdvanceResponse])
def get_advances(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    org_id = get_org_id(current_user)
    return db.query(models.EmployeeAdvance).filter(
        models.EmployeeAdvance.organization_id == org_id
    ).order_by(models.EmployeeAdvance.date.desc()).all()

@router.post("/advances", response_model=schemas.EmployeeAdvanceResponse)
def create_advance(adv: schemas.EmployeeAdvanceCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    org_id = get_org_id(current_user)
    db_adv = models.EmployeeAdvance(**adv.dict(), organization_id=org_id)
    db.add(db_adv)
    db.commit()
    db.refresh(db_adv)
    return db_adv

@router.put("/advances/{id}/settle")
def settle_advance(id: UUID, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    org_id = get_org_id(current_user)
    db_adv = db.query(models.EmployeeAdvance).filter(models.EmployeeAdvance.id == id, models.EmployeeAdvance.organization_id == org_id).first()
    if not db_adv:
        raise HTTPException(status_code=404, detail="Advance not found")
    db_adv.status = "Settled"
    db.commit()
    return {"message": "Settled"}

# -- EXPENSE CLAIMS ---------------------------------
@router.get("/claims", response_model=List[schemas.ExpenseClaimResponse])
def get_claims(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    org_id = get_org_id(current_user)
    return db.query(models.ExpenseClaim).filter(
        models.ExpenseClaim.organization_id == org_id
    ).order_by(models.ExpenseClaim.date.desc()).all()

@router.post("/claims", response_model=schemas.ExpenseClaimResponse)
def create_claim(claim: schemas.ExpenseClaimCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    org_id = get_org_id(current_user)
    
    # Auto-generate claim number
    import re
    last_claim = db.query(models.ExpenseClaim).filter(models.ExpenseClaim.organization_id == org_id).order_by(models.ExpenseClaim.claim_number.desc()).first()
    next_num = 1
    if last_claim and last_claim.claim_number:
        m = re.search(r'\d+$', last_claim.claim_number)
        if m: next_num = int(m.group()) + 1
    claim_num = f"EXP-{next_num:04d}"

    db_claim = models.ExpenseClaim(
        organization_id=org_id,
        claim_number=claim.claim_number or claim_num,
        employee_ledger_id=claim.employee_ledger_id,
        date=claim.date,
        total_amount=claim.total_amount,
        remarks=claim.remarks
    )
    db.add(db_claim)
    db.flush()

    for line in claim.lines:
        db_line = models.ExpenseLine(
            claim_id=db_claim.id,
            category_id=line.category_id,
            amount=line.amount,
            bill_number=line.bill_number,
            bill_date=line.bill_date,
            note=line.note
        )
        db.add(db_line)
    
    db.commit()
    db.refresh(db_claim)
    return db_claim

@router.post("/claims/{id}/approve")
def approve_claim(id: UUID, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    # Approves an expense claim and generates a Journal Voucher debiting expense ledgers and crediting the employee ledger.
    org_id = get_org_id(current_user)
    db_claim = db.query(models.ExpenseClaim).filter(models.ExpenseClaim.id == id, models.ExpenseClaim.organization_id == org_id).first()
    if not db_claim:
        raise HTTPException(status_code=404, detail="Claim not found")
    if db_claim.status != "Draft":
        raise HTTPException(status_code=400, detail="Only Draft claims can be approved")

    from api.finance_v2 import create_voucher

    # Prepare voucher entries
    # 1. Credit the employee
    entries = [
        schemas.VoucherEntryCreate(
            ledger_id=db_claim.employee_ledger_id,
            cr_dr="Cr",
            amount=db_claim.total_amount
        )
    ]

    # 2. Debit the expense categories
    for line in db_claim.lines:
        entries.append(
            schemas.VoucherEntryCreate(
                ledger_id=line.category.ledger_id,
                cr_dr="Dr",
                amount=line.amount
            )
        )

    # 3. Create the journal voucher
    v_data = schemas.VoucherCreate(
        voucher_type="Journal",
        date=db_claim.date,
        narration=f"Expense Claim Approval: {db_claim.claim_number}",
        total_amount=db_claim.total_amount,
        entries=entries
    )

    try:
        v_res = create_voucher(v_data, db, current_user)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to generate voucher: {str(e)}")

    db_claim.status = "Approved"
    db_claim.approved_by = current_user.id
    db_claim.payment_voucher_id = v_res.id
    db.commit()

    return {"message": "Approved", "voucher_id": v_res.id}
