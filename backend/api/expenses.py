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

# -- STATUTORY EXPENSE LEDGERS SEEDER -------------------
def ensure_statutory_expense_ledgers(db: Session, org_id: UUID):
    STANDARD_EXPENSES = [
        ("Tea, Coffee & Refreshments Exp A/c", "Indirect Expenses"),
        ("Travelling & Conveyance Exp A/c", "Indirect Expenses"),
        ("Freight & Cartage Inward Exp A/c", "Direct Expenses"),
        ("Printing & Stationery Exp A/c", "Indirect Expenses"),
        ("Courier & Postage Exp A/c", "Indirect Expenses"),
        ("Staff Welfare & Entertainment Exp A/c", "Indirect Expenses"),
        ("Vehicle Fuel & Maintenance Exp A/c", "Indirect Expenses"),
        ("Telephone & Internet Exp A/c", "Indirect Expenses"),
        ("Office Cleaning & Sanitation Exp A/c", "Indirect Expenses"),
        ("Miscellaneous Operational Exp A/c", "Indirect Expenses"),
    ]
    
    created_or_found = {}
    for name, grp in STANDARD_EXPENSES:
        ledg = db.query(models.Ledger).filter(
            models.Ledger.organization_id == org_id,
            models.Ledger.name == name
        ).first()
        if not ledg:
            ledg = models.Ledger(
                organization_id=org_id,
                name=name,
                group_name=grp,
                opening_balance=0.0,
                op_type="Dr",
                closing_balance=0.0,
                cl_type="Dr",
                is_active=True
            )
            db.add(ledg)
            db.flush()
        created_or_found[name] = ledg

    # Ensure Cash in Hand exists
    cash_ledg = db.query(models.Ledger).filter(
        models.Ledger.organization_id == org_id,
        models.Ledger.name.ilike("%cash%")
    ).first()
    if not cash_ledg:
        cash_ledg = models.Ledger(
            organization_id=org_id,
            name="Cash in Hand",
            group_name="Current Assets",
            opening_balance=10000.0,
            op_type="Dr",
            closing_balance=10000.0,
            cl_type="Dr",
            is_active=True
        )
        db.add(cash_ledg)
        db.flush()

    # Map categories to real matching P&L Expense Ledgers
    CAT_MAPPINGS = [
        ("Office Tea & Refreshments", "Tea, Coffee & Refreshments Exp A/c"),
        ("Meals & Entertainment", "Tea, Coffee & Refreshments Exp A/c"),
        ("Local Conveyance & Travel", "Travelling & Conveyance Exp A/c"),
        ("Travel & Commute", "Travelling & Conveyance Exp A/c"),
        ("Freight & Delivery Charges", "Freight & Cartage Inward Exp A/c"),
        ("Loading & Unloading (Coolie)", "Freight & Cartage Inward Exp A/c"),
        ("Stationery & Printing", "Printing & Stationery Exp A/c"),
        ("Office Supplies", "Printing & Stationery Exp A/c"),
        ("Courier & Postage", "Courier & Postage Exp A/c"),
        ("Vehicle Fuel & Maintenance", "Vehicle Fuel & Maintenance Exp A/c"),
        ("Telephone & Internet", "Telephone & Internet Exp A/c"),
        ("Miscellaneous Operational Expenses", "Miscellaneous Operational Exp A/c"),
        ("Miscellaneous", "Miscellaneous Operational Exp A/c"),
    ]
    
    for cat_name, ledg_name in CAT_MAPPINGS:
        target_ledg = created_or_found.get(ledg_name)
        if target_ledg:
            existing_cat = db.query(models.ExpenseCategory).filter(
                models.ExpenseCategory.organization_id == org_id,
                models.ExpenseCategory.name == cat_name
            ).first()
            if existing_cat:
                existing_cat.ledger_id = target_ledg.id
            else:
                new_cat = models.ExpenseCategory(
                    organization_id=org_id,
                    name=cat_name,
                    description=f"Standard operational expense mapped to {ledg_name}",
                    ledger_id=target_ledg.id,
                    is_active=True
                )
                db.add(new_cat)
                
    db.commit()

# -- EXPENSE CATEGORIES ---------------------------------
@router.get("/categories", response_model=List[schemas.ExpenseCategoryResponse])
def get_categories(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    org_id = get_org_id(current_user)
    # Always guarantee statutory P&L expense ledgers and proper category mappings exist
    ensure_statutory_expense_ledgers(db, org_id)
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

# -- EXPENSES SUMMARY & STATS ---------------------------------
@router.get("/summary", response_model=schemas.ExpenseSummaryResponse)
def get_expenses_summary(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    org_id = get_org_id(current_user)
    from sqlalchemy import func
    from decimal import Decimal
    
    total_exp = db.query(func.coalesce(func.sum(models.ExpenseClaim.total_amount), 0)).filter(
        models.ExpenseClaim.organization_id == org_id,
        models.ExpenseClaim.status.in_(["Approved", "Paid"])
    ).scalar()
    
    pending_count = db.query(models.ExpenseClaim).filter(
        models.ExpenseClaim.organization_id == org_id,
        models.ExpenseClaim.status == "Draft"
    ).count()
    
    active_adv = db.query(func.coalesce(func.sum(models.EmployeeAdvance.amount), 0)).filter(
        models.EmployeeAdvance.organization_id == org_id,
        models.EmployeeAdvance.status == "Active"
    ).scalar()
    
    settled_adv_count = db.query(models.EmployeeAdvance).filter(
        models.EmployeeAdvance.organization_id == org_id,
        models.EmployeeAdvance.status == "Settled"
    ).count()
    
    cat_count = db.query(models.ExpenseCategory).filter(
        models.ExpenseCategory.organization_id == org_id,
        models.ExpenseCategory.is_active == True
    ).count()
    
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    today_cash_exp = db.query(func.coalesce(func.sum(models.ExpenseClaim.total_amount), 0)).filter(
        models.ExpenseClaim.organization_id == org_id,
        models.ExpenseClaim.status.in_(["Approved", "Paid"]),
        models.ExpenseClaim.date >= today_start
    ).scalar()

    cash_ledg = db.query(models.Ledger).filter(
        models.Ledger.organization_id == org_id,
        models.Ledger.name.ilike("%cash%")
    ).first()
    cash_bal = Decimal(str(cash_ledg.closing_balance or 0.0)) if cash_ledg else Decimal("0.00")
    
    return {
        "total_expenses": total_exp,
        "pending_claims_count": pending_count,
        "active_advances_amount": active_adv,
        "settled_advances_count": settled_adv_count,
        "categories_count": cat_count,
        "today_cash_expenses": today_cash_exp,
        "cash_in_hand_balance": cash_bal
    }

# -- DIRECT EXPENSE CREATION (CASH / BANK / PETTY CASH) -------
@router.post("/direct", response_model=schemas.DirectExpenseResponse)
def create_direct_expense(
    payload: schemas.DirectExpenseCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    org_id = get_org_id(current_user)
    
    # 1. Fetch Expense Ledger (Dr) and Paid From Ledger (Cr)
    exp_ledg = db.query(models.Ledger).filter(
        models.Ledger.id == payload.expense_ledger_id,
        models.Ledger.organization_id == org_id
    ).first()
    if not exp_ledg:
        raise HTTPException(status_code=404, detail="Expense Ledger not found")

    paid_from_ledg = db.query(models.Ledger).filter(
        models.Ledger.id == payload.paid_from_ledger_id,
        models.Ledger.organization_id == org_id
    ).first()
    if not paid_from_ledg:
        raise HTTPException(status_code=404, detail="Paid From (Cash/Bank) Ledger not found")

    from api.finance_v2 import create_voucher
    import re

    # 2. Build full statutory narration
    vendor_part = f" Paid To: {payload.paid_to}" if payload.paid_to else ""
    ref_part = f" [Ref: {payload.reference_no}]" if payload.reference_no else ""
    user_narr = f" - {payload.narration}" if payload.narration else ""
    full_narration = f"Direct Expense ({payload.payment_mode}): {exp_ledg.name}{vendor_part}{ref_part}{user_narr}".strip()

    # 3. Create atomic double-entry Voucher: Dr Expense Ledger (P&L), Cr Cash/Bank Ledger
    entries = [
        schemas.VoucherEntryCreate(
            ledger_id=exp_ledg.id,
            cr_dr="Dr",
            amount=payload.amount
        ),
        schemas.VoucherEntryCreate(
            ledger_id=paid_from_ledg.id,
            cr_dr="Cr",
            amount=payload.amount
        )
    ]

    v_type = "Payment" if ("cash" in paid_from_ledg.name.lower() or "bank" in paid_from_ledg.name.lower()) else "Journal"
    v_data = schemas.VoucherCreate(
        voucher_type=v_type,
        date=payload.date,
        narration=full_narration,
        total_amount=payload.amount,
        entries=entries
    )

    try:
        v_res = create_voucher(v_data, db, current_user)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to post expense voucher: {str(e)}")

    # 4. Generate sequential claim number
    last_claim = db.query(models.ExpenseClaim).filter(
        models.ExpenseClaim.organization_id == org_id
    ).order_by(models.ExpenseClaim.claim_number.desc()).first()
    next_num = 1
    if last_claim and last_claim.claim_number:
        m = re.search(r'\d+$', last_claim.claim_number)
        if m: next_num = int(m.group()) + 1
    claim_num = f"DIR-{next_num:04d}"

    # Find or link matching expense category
    cat = db.query(models.ExpenseCategory).filter(
        models.ExpenseCategory.organization_id == org_id,
        models.ExpenseCategory.ledger_id == exp_ledg.id
    ).first()

    db_claim = models.ExpenseClaim(
        organization_id=org_id,
        claim_number=claim_num,
        employee_ledger_id=paid_from_ledg.id,
        date=payload.date,
        total_amount=payload.amount,
        status="Approved",
        approved_by=current_user.id,
        payment_voucher_id=v_res.id,
        remarks=f"{full_narration} [PaidFrom: {paid_from_ledg.name}]"
    )
    db.add(db_claim)
    db.flush()

    if cat:
        db_line = models.ExpenseLine(
            claim_id=db_claim.id,
            category_id=cat.id,
            amount=payload.amount,
            bill_number=payload.reference_no,
            bill_date=payload.date,
            note=payload.narration or payload.paid_to
        )
        db.add(db_line)

    db.commit()

    return schemas.DirectExpenseResponse(
        message="Operational Expense recorded and posted to General Ledger & Profit & Loss",
        voucher_id=v_res.id,
        voucher_number=v_res.voucher_number,
        amount=payload.amount,
        expense_ledger_name=exp_ledg.name,
        paid_from_ledger_name=paid_from_ledg.name,
        claim_id=db_claim.id
    )

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

    # 4. If claim was linked to an active advance, mark advance as Settled
    import re
    if db_claim.remarks:
        adv_match = re.search(r'\[Advance:\s*([a-f0-9\-]+)\]', db_claim.remarks, re.IGNORECASE)
        if adv_match:
            try:
                adv_id = UUID(adv_match.group(1))
                db_adv = db.query(models.EmployeeAdvance).filter(
                    models.EmployeeAdvance.id == adv_id,
                    models.EmployeeAdvance.organization_id == org_id
                ).first()
                if db_adv:
                    db_adv.status = "Settled"
                    db_adv.voucher_id = v_res.id
                    db.add(db_adv)
            except Exception:
                pass

    db.commit()

    return {"message": "Approved", "voucher_id": v_res.id}

