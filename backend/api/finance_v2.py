# ============================================================
# finance_v2.py — Complete Finance & Accounting API Router
# ============================================================
# Rebuilt from scratch. Replaces the old finance.py.
# Features:
#   - Multi-leg voucher CRUD with ACID compliance
#   - Fiscal year management & isolation
#   - Auto voucher numbering (PAY/25-26/001)
#   - Voucher cancellation with ledger reversal
#   - Carry-forward between fiscal years
#   - Default Indian Chart of Accounts seeding
#   - Reporting: Day Book, Ledger Statement, Trial Balance, P&L, Balance Sheet
# ============================================================

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, and_, or_, case, desc
from typing import List, Optional
from uuid import UUID
from datetime import datetime, date
from decimal import Decimal

import models
import schemas
from database import get_db
from auth.router import get_current_user

router = APIRouter()


def get_org_id(current_user):
    return current_user.organization_id


def get_active_fiscal_year(db: Session, org_id: UUID, fiscal_year_id: UUID = None):
    """Get the specified or active fiscal year for the organization."""
    if fiscal_year_id:
        fy = db.query(models.FiscalYear).filter(
            models.FiscalYear.id == fiscal_year_id,
            models.FiscalYear.organization_id == org_id
        ).first()
        if not fy:
            raise HTTPException(status_code=404, detail="Fiscal year not found")
        return fy
    
    fy = db.query(models.FiscalYear).filter(
        models.FiscalYear.organization_id == org_id,
        models.FiscalYear.is_active == True
    ).first()
    return fy


# =============================================
# FISCAL YEAR MANAGEMENT
# =============================================

@router.get("/fiscal-years", response_model=List[schemas.FiscalYearResponse])
def list_fiscal_years(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    org_id = get_org_id(current_user)
    return db.query(models.FiscalYear).filter(
        models.FiscalYear.organization_id == org_id
    ).order_by(desc(models.FiscalYear.start_date)).all()


@router.post("/fiscal-years", response_model=schemas.FiscalYearResponse)
def create_fiscal_year(payload: schemas.FiscalYearCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    org_id = get_org_id(current_user)
    
    start = datetime.strptime(payload.start_date, "%Y-%m-%d").date()
    end = datetime.strptime(payload.end_date, "%Y-%m-%d").date()
    
    if end <= start:
        raise HTTPException(status_code=400, detail="End date must be after start date")
    
    # If this is set as active, deactivate others
    if payload.is_active:
        db.query(models.FiscalYear).filter(
            models.FiscalYear.organization_id == org_id,
            models.FiscalYear.is_active == True
        ).update({"is_active": False})
    
    fy = models.FiscalYear(
        organization_id=org_id,
        name=payload.name,
        start_date=start,
        end_date=end,
        is_active=payload.is_active
    )
    db.add(fy)
    db.commit()
    db.refresh(fy)
    
    # Initialize voucher sequences for this FY
    fy_short = payload.name  # e.g. "25-26"
    for vtype, prefix in [
        ("Payment", f"PAY/{fy_short}/"),
        ("Receipt", f"REC/{fy_short}/"),
        ("Journal", f"JRN/{fy_short}/"),
        ("Contra", f"CON/{fy_short}/"),
        ("Sales", f"SLS/{fy_short}/"),
        ("Purchase", f"PUR/{fy_short}/"),
    ]:
        seq = models.VoucherSequence(
            organization_id=org_id,
            fiscal_year_id=fy.id,
            voucher_type=vtype,
            prefix=prefix,
            last_number=0
        )
        db.add(seq)
    db.commit()
    
    return fy


@router.put("/fiscal-years/{fy_id}/activate")
def activate_fiscal_year(fy_id: UUID, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    org_id = get_org_id(current_user)
    
    fy = db.query(models.FiscalYear).filter(
        models.FiscalYear.id == fy_id,
        models.FiscalYear.organization_id == org_id
    ).first()
    if not fy:
        raise HTTPException(status_code=404, detail="Fiscal year not found")
    
    # Deactivate all others
    db.query(models.FiscalYear).filter(
        models.FiscalYear.organization_id == org_id,
        models.FiscalYear.is_active == True
    ).update({"is_active": False})
    
    fy.is_active = True
    db.commit()
    return {"message": f"Fiscal year {fy.name} is now active"}


@router.put("/fiscal-years/{fy_id}/lock")
def lock_fiscal_year(fy_id: UUID, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    org_id = get_org_id(current_user)
    fy = db.query(models.FiscalYear).filter(
        models.FiscalYear.id == fy_id,
        models.FiscalYear.organization_id == org_id
    ).first()
    if not fy:
        raise HTTPException(status_code=404, detail="Fiscal year not found")
    fy.is_locked = True
    db.commit()
    return {"message": f"Fiscal year {fy.name} is now locked"}


# =============================================
# CHART OF ACCOUNTS SEEDING
# =============================================

DEFAULT_CHART_OF_ACCOUNTS = [
    # (name, parent_name_or_None)
    # -- Primary Groups --
    ("Capital Account", None),
    ("Current Assets", None),
    ("Current Liabilities", None),
    ("Direct Expenses", None),
    ("Direct Incomes", None),
    ("Fixed Assets", None),
    ("Indirect Expenses", None),
    ("Indirect Incomes", None),
    ("Investments", None),
    ("Loans (Liability)", None),
    ("Loans & Advances (Asset)", None),
    ("Misc. Expenses (Asset)", None),
    ("Purchase Accounts", None),
    ("Sales Accounts", None),
    ("Suspense Account", None),
    ("Branch / Divisions", None),
    
    # -- Sub-Groups under Current Assets --
    ("Bank Accounts", "Current Assets"),
    ("Cash-in-Hand", "Current Assets"),
    ("Deposits (Asset)", "Current Assets"),
    ("Stock-in-Hand", "Current Assets"),
    ("Sundry Debtors", "Current Assets"),
    
    # -- Sub-Groups under Current Liabilities --
    ("Sundry Creditors", "Current Liabilities"),
    ("Duties & Taxes", "Current Liabilities"),
    ("Provisions", "Current Liabilities"),
    
    # -- Tax Sub-Groups --
    ("GST Payable", "Duties & Taxes"),
    ("GST Receivable", "Loans & Advances (Asset)"),
    
    # -- Sub-Groups under Indirect Expenses --
    ("Administrative Expenses", "Indirect Expenses"),
    ("Selling Expenses", "Indirect Expenses"),
    
    # -- Sub-Groups under Capital Account --
    ("Reserves & Surplus", "Capital Account"),
    ("Partners Capital", "Capital Account"),
]


@router.post("/seed-chart-of-accounts", response_model=schemas.SeedChartOfAccountsResponse)
def seed_chart_of_accounts(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    org_id = get_org_id(current_user)
    
    # Check if already seeded
    existing = db.query(models.LedgerGroup).filter(
        models.LedgerGroup.organization_id == org_id
    ).count()
    if existing > 0:
        raise HTTPException(status_code=400, detail="Chart of Accounts already seeded. Delete existing groups first.")
    
    created_groups = {}
    count = 0
    
    for name, parent_name in DEFAULT_CHART_OF_ACCOUNTS:
        parent_id = created_groups.get(parent_name) if parent_name else None
        group = models.LedgerGroup(
            organization_id=org_id,
            name=name,
            parent_id=parent_id,
            is_active=True
        )
        db.add(group)
        db.flush()
        created_groups[name] = group.id
        count += 1
    
    db.commit()
    return {"groups_created": count, "message": f"Successfully seeded {count} account groups"}


# =============================================
# LEDGER GROUPS
# =============================================

@router.get("/groups", response_model=List[schemas.LedgerGroupResponse])
def get_ledger_groups(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    org_id = get_org_id(current_user)
    return db.query(models.LedgerGroup).filter(
        models.LedgerGroup.organization_id == org_id,
        models.LedgerGroup.is_active == True
    ).all()


@router.post("/groups", response_model=schemas.LedgerGroupResponse)
def create_ledger_group(group: schemas.LedgerGroupCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    org_id = get_org_id(current_user)
    db_group = models.LedgerGroup(**group.model_dump(), organization_id=org_id)
    db.add(db_group)
    db.commit()
    db.refresh(db_group)
    return db_group


@router.put("/groups/{group_id}", response_model=schemas.LedgerGroupResponse)
def update_ledger_group(group_id: UUID, group: schemas.LedgerGroupCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    org_id = get_org_id(current_user)
    db_group = db.query(models.LedgerGroup).filter(
        models.LedgerGroup.id == group_id,
        models.LedgerGroup.organization_id == org_id
    ).first()
    if not db_group:
        raise HTTPException(status_code=404, detail="Ledger group not found")
    for key, val in group.model_dump().items():
        setattr(db_group, key, val)
    db.commit()
    db.refresh(db_group)
    return db_group


@router.delete("/groups/{group_id}")
def delete_ledger_group(group_id: UUID, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    org_id = get_org_id(current_user)
    db_group = db.query(models.LedgerGroup).filter(
        models.LedgerGroup.id == group_id,
        models.LedgerGroup.organization_id == org_id
    ).first()
    if not db_group:
        raise HTTPException(status_code=404, detail="Ledger group not found")
    db_group.is_active = False
    db.commit()
    return {"message": "Ledger group deactivated"}


# =============================================
# VOUCHER AUTO-NUMBERING
# =============================================

def _get_next_voucher_number(db: Session, org_id: UUID, voucher_type: str, fiscal_year_id: UUID) -> str:
    """Generate next sequential voucher number with row-level locking."""
    seq = db.query(models.VoucherSequence).filter(
        models.VoucherSequence.organization_id == org_id,
        models.VoucherSequence.fiscal_year_id == fiscal_year_id,
        models.VoucherSequence.voucher_type == voucher_type
    ).with_for_update().first()
    
    if not seq:
        # Auto-create sequence if missing
        fy = db.query(models.FiscalYear).filter(models.FiscalYear.id == fiscal_year_id).first()
        fy_name = fy.name if fy else "00-00"
        prefix_map = {
            "Payment": f"PAY/{fy_name}/",
            "Receipt": f"REC/{fy_name}/",
            "Journal": f"JRN/{fy_name}/",
            "Contra": f"CON/{fy_name}/",
            "Sales": f"SLS/{fy_name}/",
            "Purchase": f"PUR/{fy_name}/",
        }
        prefix = prefix_map.get(voucher_type, f"{voucher_type[:3].upper()}/{fy_name}/")
        seq = models.VoucherSequence(
            organization_id=org_id,
            fiscal_year_id=fiscal_year_id,
            voucher_type=voucher_type,
            prefix=prefix,
            last_number=0
        )
        db.add(seq)
        db.flush()
    
    seq.last_number += 1
    number = f"{seq.prefix}{seq.last_number:04d}"
    return number


@router.get("/next-voucher-number/{voucher_type}", response_model=schemas.NextVoucherNumberResponse)
def get_next_voucher_number(voucher_type: str, fiscal_year_id: UUID = None, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    org_id = get_org_id(current_user)
    fy = get_active_fiscal_year(db, org_id, fiscal_year_id)
    if not fy:
        raise HTTPException(status_code=400, detail="No active fiscal year. Please create one first.")
    
    seq = db.query(models.VoucherSequence).filter(
        models.VoucherSequence.organization_id == org_id,
        models.VoucherSequence.fiscal_year_id == fy.id,
        models.VoucherSequence.voucher_type == voucher_type
    ).first()
    
    next_num = (seq.last_number + 1) if seq else 1
    prefix = seq.prefix if seq else f"{voucher_type[:3].upper()}/{fy.name}/"
    
    return {
        "voucher_type": voucher_type,
        "next_number": f"{prefix}{next_num:04d}",
        "prefix": prefix
    }


# =============================================
# VOUCHER CRUD (ACID COMPLIANT)
# =============================================

def _update_ledger_balance(db: Session, org_id: UUID, ledger_id: UUID, fiscal_year_id: UUID, cr_dr: str, amount: Decimal):
    """
    Update ledger balance for a specific fiscal year.
    Uses LedgerBalance table for per-FY isolation.
    Also updates the legacy Ledger.closing_balance for backward compatibility.
    """
    # 1. Update per-FY balance (LedgerBalance)
    if fiscal_year_id:
        lb = db.query(models.LedgerBalance).filter(
            models.LedgerBalance.ledger_id == ledger_id,
            models.LedgerBalance.fiscal_year_id == fiscal_year_id,
            models.LedgerBalance.organization_id == org_id
        ).with_for_update().first()
        
        if not lb:
            # Auto-create ledger balance record for this FY
            ledger = db.query(models.Ledger).filter(models.Ledger.id == ledger_id).first()
            lb = models.LedgerBalance(
                organization_id=org_id,
                ledger_id=ledger_id,
                fiscal_year_id=fiscal_year_id,
                opening_balance=ledger.opening_balance if ledger else 0,
                op_type=ledger.op_type if ledger else 'Dr',
                closing_balance=ledger.opening_balance if ledger else 0,
                cl_type=ledger.op_type if ledger else 'Dr'
            )
            db.add(lb)
            db.flush()
        
        current_bal = lb.closing_balance if lb.cl_type == 'Dr' else -lb.closing_balance
        change = amount if cr_dr == 'Dr' else -amount
        new_bal = current_bal + change
        
        if new_bal >= 0:
            lb.closing_balance = new_bal
            lb.cl_type = 'Dr'
        else:
            lb.closing_balance = abs(new_bal)
            lb.cl_type = 'Cr'
    
    # 2. Also update legacy Ledger.closing_balance
    db_ledger = db.query(models.Ledger).filter(
        models.Ledger.id == ledger_id,
        models.Ledger.organization_id == org_id
    ).with_for_update().first()
    
    if not db_ledger:
        raise ValueError(f"Ledger {ledger_id} not found")
    
    current_bal = db_ledger.closing_balance if db_ledger.cl_type == 'Dr' else -db_ledger.closing_balance
    change = amount if cr_dr == 'Dr' else -amount
    new_bal = current_bal + change
    
    if new_bal >= 0:
        db_ledger.closing_balance = new_bal
        db_ledger.cl_type = 'Dr'
    else:
        db_ledger.closing_balance = abs(new_bal)
        db_ledger.cl_type = 'Cr'


@router.post("/vouchers", response_model=schemas.VoucherResponse)
def create_voucher(voucher: schemas.VoucherCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    org_id = get_org_id(current_user)
    
    # 1. Get fiscal year
    fy = get_active_fiscal_year(db, org_id, voucher.fiscal_year_id)
    if not fy:
        raise HTTPException(status_code=400, detail="No active fiscal year. Please create one first.")
    if fy.is_locked:
        raise HTTPException(status_code=400, detail=f"Fiscal year {fy.name} is locked. Cannot post vouchers.")
    
    # 2. Validate Debits == Credits
    total_dr = sum(e.amount for e in voucher.entries if e.cr_dr == 'Dr')
    total_cr = sum(e.amount for e in voucher.entries if e.cr_dr == 'Cr')
    
    if total_dr != total_cr:
        raise HTTPException(status_code=400, detail=f"Voucher entries do not balance. Dr={total_dr}, Cr={total_cr}")
    
    if total_dr != voucher.total_amount:
        raise HTTPException(status_code=400, detail=f"Entries total ({total_dr}) does not match voucher total_amount ({voucher.total_amount})")
    
    try:
        # 3. Auto-generate voucher number if not provided
        v_number = voucher.voucher_number
        if not v_number:
            v_number = _get_next_voucher_number(db, org_id, voucher.voucher_type, fy.id)
        
        # 4. Create Voucher
        db_voucher = models.Voucher(
            organization_id=org_id,
            voucher_type=voucher.voucher_type,
            voucher_number=v_number,
            date=voucher.date,
            narration=voucher.narration,
            total_amount=voucher.total_amount,
            is_active=True,
            status='Active',
            fiscal_year_id=fy.id,
            ref_invoice_id=voucher.ref_invoice_id
        )
        db.add(db_voucher)
        db.flush()
        
        # 5. Create Entries and Update Ledger Balances
        for entry in voucher.entries:
            # Resolve ledger name
            ledger = db.query(models.Ledger).filter(
                models.Ledger.id == entry.ledger_id,
                models.Ledger.organization_id == org_id
            ).first()
            if not ledger:
                raise ValueError(f"Ledger {entry.ledger_id} not found")
            
            db_entry = models.VoucherEntry(
                voucher_id=db_voucher.id,
                ledger_id=entry.ledger_id,
                cr_dr=entry.cr_dr,
                amount=entry.amount,
                ledger_name=ledger.name
            )
            db.add(db_entry)
            
            # Update balances
            _update_ledger_balance(db, org_id, entry.ledger_id, fy.id, entry.cr_dr, entry.amount)
        
        db.commit()
        db.refresh(db_voucher)
        return db_voucher
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Voucher creation failed: {str(e)}")


@router.get("/vouchers", response_model=List[schemas.VoucherResponse])
def list_vouchers(
    voucher_type: Optional[str] = None,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    fiscal_year_id: Optional[UUID] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    org_id = get_org_id(current_user)
    
    query = db.query(models.Voucher).options(
        joinedload(models.Voucher.entries)
    ).filter(models.Voucher.organization_id == org_id)
    
    # Filter by fiscal year
    if fiscal_year_id:
        query = query.filter(models.Voucher.fiscal_year_id == fiscal_year_id)
    else:
        fy = get_active_fiscal_year(db, org_id)
        if fy:
            query = query.filter(models.Voucher.fiscal_year_id == fy.id)
    
    if voucher_type:
        query = query.filter(models.Voucher.voucher_type == voucher_type)
    if status:
        query = query.filter(models.Voucher.status == status)
    else:
        query = query.filter(models.Voucher.status == 'Active')
    if from_date:
        query = query.filter(models.Voucher.date >= datetime.strptime(from_date, "%Y-%m-%d"))
    if to_date:
        query = query.filter(models.Voucher.date <= datetime.strptime(to_date, "%Y-%m-%d").replace(hour=23, minute=59, second=59))
    if search:
        query = query.filter(
            or_(
                models.Voucher.voucher_number.ilike(f"%{search}%"),
                models.Voucher.narration.ilike(f"%{search}%")
            )
        )
    
    return query.order_by(desc(models.Voucher.date), desc(models.Voucher.created_at)).offset(skip).limit(limit).all()


@router.get("/vouchers/{voucher_id}", response_model=schemas.VoucherResponse)
def get_voucher(voucher_id: UUID, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    org_id = get_org_id(current_user)
    
    voucher = db.query(models.Voucher).options(
        joinedload(models.Voucher.entries)
    ).filter(
        models.Voucher.id == voucher_id,
        models.Voucher.organization_id == org_id
    ).first()
    
    if not voucher:
        raise HTTPException(status_code=404, detail="Voucher not found")
    return voucher


@router.post("/vouchers/{voucher_id}/cancel")
def cancel_voucher(voucher_id: UUID, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    org_id = get_org_id(current_user)
    
    voucher = db.query(models.Voucher).options(
        joinedload(models.Voucher.entries)
    ).filter(
        models.Voucher.id == voucher_id,
        models.Voucher.organization_id == org_id,
        models.Voucher.status == 'Active'
    ).first()
    
    if not voucher:
        raise HTTPException(status_code=404, detail="Active voucher not found")
    
    try:
        # Reverse all ledger balance impacts
        for entry in voucher.entries:
            reverse_cr_dr = 'Cr' if entry.cr_dr == 'Dr' else 'Dr'
            _update_ledger_balance(db, org_id, entry.ledger_id, voucher.fiscal_year_id, reverse_cr_dr, entry.amount)
        
        voucher.status = 'Cancelled'
        voucher.cancelled_at = datetime.utcnow()
        voucher.cancelled_by = current_user.id
        
        db.commit()
        return {"message": f"Voucher {voucher.voucher_number} cancelled successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Cancellation failed: {str(e)}")


# =============================================
# CARRY FORWARD
# =============================================

@router.post("/carry-forward", response_model=schemas.CarryForwardResponse)
def carry_forward(payload: schemas.CarryForwardRequest, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """
    Carry forward closing balances from source FY to target FY as opening balances.
    This is an explicit user action - balances do not auto-propagate.
    """
    org_id = get_org_id(current_user)
    
    source_fy = db.query(models.FiscalYear).filter(
        models.FiscalYear.id == payload.source_fiscal_year_id,
        models.FiscalYear.organization_id == org_id
    ).first()
    target_fy = db.query(models.FiscalYear).filter(
        models.FiscalYear.id == payload.target_fiscal_year_id,
        models.FiscalYear.organization_id == org_id
    ).first()
    
    if not source_fy or not target_fy:
        raise HTTPException(status_code=404, detail="Source or target fiscal year not found")
    
    # Get all ledger balances from source FY
    source_balances = db.query(models.LedgerBalance).filter(
        models.LedgerBalance.fiscal_year_id == payload.source_fiscal_year_id,
        models.LedgerBalance.organization_id == org_id
    ).all()
    
    # Also include ledgers that may not have LedgerBalance records yet
    all_ledgers = db.query(models.Ledger).filter(
        models.Ledger.organization_id == org_id,
        models.Ledger.is_active == True
    ).all()
    
    source_bal_map = {str(lb.ledger_id): lb for lb in source_balances}
    count = 0
    
    for ledger in all_ledgers:
        lid = str(ledger.id)
        
        # Determine closing balance from source
        if lid in source_bal_map:
            src = source_bal_map[lid]
            closing = src.closing_balance
            cl_type = src.cl_type
        else:
            closing = ledger.closing_balance
            cl_type = ledger.cl_type
        
        # Check if target LedgerBalance already exists
        existing = db.query(models.LedgerBalance).filter(
            models.LedgerBalance.ledger_id == ledger.id,
            models.LedgerBalance.fiscal_year_id == payload.target_fiscal_year_id,
            models.LedgerBalance.organization_id == org_id
        ).first()
        
        if existing:
            existing.opening_balance = closing
            existing.op_type = cl_type
            existing.closing_balance = closing
            existing.cl_type = cl_type
        else:
            lb = models.LedgerBalance(
                organization_id=org_id,
                ledger_id=ledger.id,
                fiscal_year_id=payload.target_fiscal_year_id,
                opening_balance=closing,
                op_type=cl_type,
                closing_balance=closing,
                cl_type=cl_type
            )
            db.add(lb)
        count += 1
    
    db.commit()
    return {"ledgers_carried": count, "message": f"Carried forward {count} ledger balances from {source_fy.name} to {target_fy.name}"}


# =============================================
# REPORTING - DAY BOOK
# =============================================

@router.get("/daybook")
def get_daybook(
    from_date: str = Query(..., description="Start date YYYY-MM-DD"),
    to_date: str = Query(..., description="End date YYYY-MM-DD"),
    fiscal_year_id: Optional[UUID] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    org_id = get_org_id(current_user)
    
    start = datetime.strptime(from_date, "%Y-%m-%d")
    end = datetime.strptime(to_date, "%Y-%m-%d").replace(hour=23, minute=59, second=59)
    
    query = db.query(models.Voucher).options(
        joinedload(models.Voucher.entries)
    ).filter(
        models.Voucher.organization_id == org_id,
        models.Voucher.date >= start,
        models.Voucher.date <= end,
        models.Voucher.status == 'Active'
    )
    
    if fiscal_year_id:
        query = query.filter(models.Voucher.fiscal_year_id == fiscal_year_id)
    else:
        fy = get_active_fiscal_year(db, org_id)
        if fy:
            query = query.filter(models.Voucher.fiscal_year_id == fy.id)
    
    vouchers = query.order_by(models.Voucher.date, models.Voucher.created_at).all()
    
    total_dr = Decimal('0')
    total_cr = Decimal('0')
    result = []
    
    for v in vouchers:
        entries_list = []
        for e in v.entries:
            entries_list.append({
                "id": str(e.id),
                "ledger_id": str(e.ledger_id),
                "cr_dr": e.cr_dr,
                "amount": str(e.amount),
                "ledger_name": e.ledger_name or ""
            })
            if e.cr_dr == 'Dr':
                total_dr += e.amount
            else:
                total_cr += e.amount
        
        result.append({
            "voucher_id": str(v.id),
            "voucher_number": v.voucher_number,
            "voucher_type": v.voucher_type,
            "date": v.date.isoformat(),
            "narration": v.narration,
            "total_amount": str(v.total_amount),
            "status": v.status,
            "entries": entries_list
        })
    
    return {
        "from_date": from_date,
        "to_date": to_date,
        "vouchers": result,
        "total_dr": str(total_dr),
        "total_cr": str(total_cr)
    }


# =============================================
# REPORTING - LEDGER STATEMENT
# =============================================

@router.get("/ledger-statement/{ledger_id}")
def get_ledger_statement(
    ledger_id: UUID,
    from_date: str = Query(..., description="Start date YYYY-MM-DD"),
    to_date: str = Query(..., description="End date YYYY-MM-DD"),
    fiscal_year_id: Optional[UUID] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    org_id = get_org_id(current_user)
    
    ledger = db.query(models.Ledger).filter(
        models.Ledger.id == ledger_id,
        models.Ledger.organization_id == org_id
    ).first()
    if not ledger:
        raise HTTPException(status_code=404, detail="Ledger not found")
    
    start = datetime.strptime(from_date, "%Y-%m-%d")
    end = datetime.strptime(to_date, "%Y-%m-%d").replace(hour=23, minute=59, second=59)
    
    # Get opening balance
    fy = get_active_fiscal_year(db, org_id, fiscal_year_id)
    if fy:
        lb = db.query(models.LedgerBalance).filter(
            models.LedgerBalance.ledger_id == ledger_id,
            models.LedgerBalance.fiscal_year_id == fy.id,
            models.LedgerBalance.organization_id == org_id
        ).first()
        if lb:
            opening_bal = lb.opening_balance
            opening_type = lb.op_type
        else:
            opening_bal = ledger.opening_balance
            opening_type = ledger.op_type
    else:
        opening_bal = ledger.opening_balance
        opening_type = ledger.op_type
    
    # Get all voucher entries for this ledger in date range
    entries_query = db.query(models.VoucherEntry).join(models.Voucher).filter(
        models.VoucherEntry.ledger_id == ledger_id,
        models.Voucher.organization_id == org_id,
        models.Voucher.status == 'Active',
        models.Voucher.date >= start,
        models.Voucher.date <= end
    )
    if fy:
        entries_query = entries_query.filter(models.Voucher.fiscal_year_id == fy.id)
    
    entries = entries_query.order_by(models.Voucher.date, models.Voucher.created_at).all()
    
    # Build statement with running balance
    running_bal = opening_bal if opening_type == 'Dr' else -opening_bal
    total_dr = Decimal('0')
    total_cr = Decimal('0')
    statement_entries = []
    
    for entry in entries:
        voucher = entry.voucher
        
        # Get contra ledger names (other entries in same voucher)
        contra_entries = [e for e in voucher.entries if e.id != entry.id]
        particulars = ", ".join([e.ledger_name or "Unknown" for e in contra_entries]) or "---"
        
        if entry.cr_dr == 'Dr':
            running_bal += entry.amount
            total_dr += entry.amount
        else:
            running_bal -= entry.amount
            total_cr += entry.amount
        
        bal_display = abs(running_bal)
        bal_type = 'Dr' if running_bal >= 0 else 'Cr'
        
        statement_entries.append({
            "date": voucher.date.isoformat(),
            "voucher_id": str(voucher.id),
            "voucher_number": voucher.voucher_number,
            "voucher_type": voucher.voucher_type,
            "particulars": particulars,
            "dr_amount": str(entry.amount) if entry.cr_dr == 'Dr' else None,
            "cr_amount": str(entry.amount) if entry.cr_dr == 'Cr' else None,
            "running_balance": str(bal_display),
            "balance_type": bal_type
        })
    
    closing_bal = abs(running_bal)
    closing_type = 'Dr' if running_bal >= 0 else 'Cr'
    
    return {
        "ledger_id": str(ledger_id),
        "ledger_name": ledger.name,
        "from_date": from_date,
        "to_date": to_date,
        "opening_balance": str(opening_bal),
        "opening_type": opening_type,
        "entries": statement_entries,
        "closing_balance": str(closing_bal),
        "closing_type": closing_type,
        "total_dr": str(total_dr),
        "total_cr": str(total_cr)
    }


# =============================================
# REPORTING - TRIAL BALANCE
# =============================================

@router.get("/trial-balance")
def get_trial_balance(
    as_of_date: Optional[str] = None,
    fiscal_year_id: Optional[UUID] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    org_id = get_org_id(current_user)
    fy = get_active_fiscal_year(db, org_id, fiscal_year_id)
    
    if not as_of_date:
        as_of_date = datetime.utcnow().strftime("%Y-%m-%d")
    
    end = datetime.strptime(as_of_date, "%Y-%m-%d").replace(hour=23, minute=59, second=59)
    
    # Get all active ledgers
    ledgers = db.query(models.Ledger).filter(
        models.Ledger.organization_id == org_id,
        models.Ledger.is_active == True
    ).all()
    
    rows = []
    grand_dr = Decimal('0')
    grand_cr = Decimal('0')
    
    for ledger in ledgers:
        # Get opening balance for this FY
        if fy:
            lb = db.query(models.LedgerBalance).filter(
                models.LedgerBalance.ledger_id == ledger.id,
                models.LedgerBalance.fiscal_year_id == fy.id
            ).first()
            op_bal = (lb.opening_balance if lb else ledger.opening_balance)
            op_type = (lb.op_type if lb else ledger.op_type)
        else:
            op_bal = ledger.opening_balance
            op_type = ledger.op_type
        
        # Sum all Dr entries for this ledger
        dr_sum_query = db.query(func.coalesce(func.sum(models.VoucherEntry.amount), 0)).join(models.Voucher).filter(
            models.VoucherEntry.ledger_id == ledger.id,
            models.VoucherEntry.cr_dr == 'Dr',
            models.Voucher.organization_id == org_id,
            models.Voucher.status == 'Active',
            models.Voucher.date <= end
        )
        if fy:
            dr_sum_query = dr_sum_query.filter(models.Voucher.fiscal_year_id == fy.id)
        dr_total = dr_sum_query.scalar()
        
        # Sum all Cr entries
        cr_sum_query = db.query(func.coalesce(func.sum(models.VoucherEntry.amount), 0)).join(models.Voucher).filter(
            models.VoucherEntry.ledger_id == ledger.id,
            models.VoucherEntry.cr_dr == 'Cr',
            models.Voucher.organization_id == org_id,
            models.Voucher.status == 'Active',
            models.Voucher.date <= end
        )
        if fy:
            cr_sum_query = cr_sum_query.filter(models.Voucher.fiscal_year_id == fy.id)
        cr_total = cr_sum_query.scalar()
        
        # Include opening balance in totals
        if op_type == 'Dr':
            dr_total += op_bal
        else:
            cr_total += op_bal
        
        # Skip ledgers with zero activity
        if dr_total == 0 and cr_total == 0:
            continue
        
        # Compute closing
        net = dr_total - cr_total
        closing = abs(net)
        bal_type = 'Dr' if net >= 0 else 'Cr'
        
        grand_dr += dr_total
        grand_cr += cr_total
        
        rows.append({
            "ledger_id": str(ledger.id),
            "ledger_name": ledger.name,
            "group_name": ledger.group_name,
            "dr_total": str(dr_total),
            "cr_total": str(cr_total),
            "closing_balance": str(closing),
            "balance_type": bal_type
        })
    
    rows.sort(key=lambda r: r["group_name"] or "")
    
    return {
        "as_of_date": as_of_date,
        "fiscal_year_name": fy.name if fy else None,
        "rows": rows,
        "grand_dr_total": str(grand_dr),
        "grand_cr_total": str(grand_cr)
    }


# =============================================
# REPORTING - PROFIT & LOSS
# =============================================

INCOME_GROUPS = {"Sales Accounts", "Direct Incomes", "Indirect Incomes"}
EXPENSE_GROUPS = {"Purchase Accounts", "Direct Expenses", "Indirect Expenses", "Administrative Expenses", "Selling Expenses"}

@router.get("/profit-loss")
def get_profit_loss(
    from_date: str = Query(...),
    to_date: str = Query(...),
    fiscal_year_id: Optional[UUID] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    org_id = get_org_id(current_user)
    fy = get_active_fiscal_year(db, org_id, fiscal_year_id)
    
    start = datetime.strptime(from_date, "%Y-%m-%d")
    end = datetime.strptime(to_date, "%Y-%m-%d").replace(hour=23, minute=59, second=59)
    
    # Get all ledgers with their groups
    ledgers = db.query(models.Ledger).filter(
        models.Ledger.organization_id == org_id,
        models.Ledger.is_active == True
    ).all()
    
    income_items = []
    expense_items = []
    total_income = Decimal('0')
    total_expense = Decimal('0')
    
    for ledger in ledgers:
        group = ledger.group_name or ""
        
        if group not in INCOME_GROUPS and group not in EXPENSE_GROUPS:
            continue
        
        # Get net movement for this ledger in the period
        dr_sum = db.query(func.coalesce(func.sum(models.VoucherEntry.amount), 0)).join(models.Voucher).filter(
            models.VoucherEntry.ledger_id == ledger.id,
            models.VoucherEntry.cr_dr == 'Dr',
            models.Voucher.organization_id == org_id,
            models.Voucher.status == 'Active',
            models.Voucher.date >= start,
            models.Voucher.date <= end
        )
        if fy:
            dr_sum = dr_sum.filter(models.Voucher.fiscal_year_id == fy.id)
        dr = dr_sum.scalar()
        
        cr_sum = db.query(func.coalesce(func.sum(models.VoucherEntry.amount), 0)).join(models.Voucher).filter(
            models.VoucherEntry.ledger_id == ledger.id,
            models.VoucherEntry.cr_dr == 'Cr',
            models.Voucher.organization_id == org_id,
            models.Voucher.status == 'Active',
            models.Voucher.date >= start,
            models.Voucher.date <= end
        )
        if fy:
            cr_sum = cr_sum.filter(models.Voucher.fiscal_year_id == fy.id)
        cr = cr_sum.scalar()
        
        net = abs(cr - dr) if group in INCOME_GROUPS else abs(dr - cr)
        
        if net == 0:
            continue
        
        item = {"group_name": group, "ledger_name": ledger.name, "amount": str(net), "is_group_total": False}
        
        if group in INCOME_GROUPS:
            income_items.append(item)
            total_income += net
        else:
            expense_items.append(item)
            total_expense += net
    
    net_result = total_income - total_expense
    
    return {
        "from_date": from_date,
        "to_date": to_date,
        "income_items": income_items,
        "expense_items": expense_items,
        "total_income": str(total_income),
        "total_expense": str(total_expense),
        "net_profit_or_loss": str(abs(net_result)),
        "result_type": "Profit" if net_result >= 0 else "Loss"
    }


# =============================================
# REPORTING - BALANCE SHEET
# =============================================

LIABILITY_GROUPS = {"Capital Account", "Current Liabilities", "Sundry Creditors", "Duties & Taxes", "Provisions", "Loans (Liability)", "Reserves & Surplus", "Partners Capital", "GST Payable"}
ASSET_GROUPS = {"Current Assets", "Fixed Assets", "Investments", "Loans & Advances (Asset)", "Bank Accounts", "Cash-in-Hand", "Deposits (Asset)", "Stock-in-Hand", "Sundry Debtors", "Misc. Expenses (Asset)", "GST Receivable"}

@router.get("/balance-sheet")
def get_balance_sheet(
    as_of_date: Optional[str] = None,
    fiscal_year_id: Optional[UUID] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    org_id = get_org_id(current_user)
    fy = get_active_fiscal_year(db, org_id, fiscal_year_id)
    
    if not as_of_date:
        as_of_date = datetime.utcnow().strftime("%Y-%m-%d")
    
    end = datetime.strptime(as_of_date, "%Y-%m-%d").replace(hour=23, minute=59, second=59)
    
    ledgers = db.query(models.Ledger).filter(
        models.Ledger.organization_id == org_id,
        models.Ledger.is_active == True
    ).all()
    
    liabilities = []
    assets = []
    total_liabilities = Decimal('0')
    total_assets = Decimal('0')
    
    for ledger in ledgers:
        group = ledger.group_name or ""
        
        if group not in LIABILITY_GROUPS and group not in ASSET_GROUPS:
            continue
        
        # Get opening balance
        if fy:
            lb = db.query(models.LedgerBalance).filter(
                models.LedgerBalance.ledger_id == ledger.id,
                models.LedgerBalance.fiscal_year_id == fy.id
            ).first()
            op_bal = lb.opening_balance if lb else ledger.opening_balance
            op_type = lb.op_type if lb else ledger.op_type
        else:
            op_bal = ledger.opening_balance
            op_type = ledger.op_type
        
        # Sum movements
        dr_q = db.query(func.coalesce(func.sum(models.VoucherEntry.amount), 0)).join(models.Voucher).filter(
            models.VoucherEntry.ledger_id == ledger.id,
            models.VoucherEntry.cr_dr == 'Dr',
            models.Voucher.organization_id == org_id,
            models.Voucher.status == 'Active',
            models.Voucher.date <= end
        )
        if fy:
            dr_q = dr_q.filter(models.Voucher.fiscal_year_id == fy.id)
        dr = dr_q.scalar()
        
        cr_q = db.query(func.coalesce(func.sum(models.VoucherEntry.amount), 0)).join(models.Voucher).filter(
            models.VoucherEntry.ledger_id == ledger.id,
            models.VoucherEntry.cr_dr == 'Cr',
            models.Voucher.organization_id == org_id,
            models.Voucher.status == 'Active',
            models.Voucher.date <= end
        )
        if fy:
            cr_q = cr_q.filter(models.Voucher.fiscal_year_id == fy.id)
        cr = cr_q.scalar()
        
        # Calculate net balance
        signed_op = op_bal if op_type == 'Dr' else -op_bal
        net = signed_op + dr - cr
        amount = abs(net)
        
        if amount == 0:
            continue
        
        item = {"group_name": group, "ledger_name": ledger.name, "amount": str(amount), "is_group_total": False}
        
        if group in ASSET_GROUPS:
            assets.append(item)
            total_assets += amount
        else:
            liabilities.append(item)
            total_liabilities += amount
    
    return {
        "as_of_date": as_of_date,
        "liabilities": liabilities,
        "assets": assets,
        "total_liabilities": str(total_liabilities),
        "total_assets": str(total_assets)
    }
