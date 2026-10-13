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

from fastapi import UploadFile, File, Form
import csv
import io
from dateutil import parser as date_parser
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
    
    group_data = group.model_dump()
    if group.parent_id:
        parent = db.query(models.LedgerGroup).filter(models.LedgerGroup.id == group.parent_id).first()
        if not parent:
            raise HTTPException(status_code=400, detail="Parent group not found")
        group_data["class_type"] = parent.class_type

    db_group = models.LedgerGroup(**group_data, organization_id=org_id)
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
        
    if db_group.is_system and group.name != db_group.name:
        raise HTTPException(status_code=400, detail="Cannot rename a system group")

    group_data = group.model_dump()
    if group.parent_id:
        parent = db.query(models.LedgerGroup).filter(models.LedgerGroup.id == group.parent_id).first()
        if not parent:
            raise HTTPException(status_code=400, detail="Parent group not found")
        group_data["class_type"] = parent.class_type

    for key, val in group_data.items():
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
    if db_group.is_system:
        raise HTTPException(status_code=400, detail="Cannot delete a system group")
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
        
        # DOC-24: Update Document Series if provided
        if voucher.series_id:
            series = db.query(models.DocumentSeries).filter(
                models.DocumentSeries.id == voucher.series_id
            ).with_for_update().first()
            if series:
                # If the provided v_number is greater than or equal to the next_number in series, bump the series
                import re
                match = re.search(r'\d+$', v_number) if v_number else None
                if match:
                    parsed_num = int(match.group())
                    if parsed_num >= series.next_number:
                        series.next_number = parsed_num + 1
                        db.add(series)

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
        "fiscal_year": fy.name if fy else None,
        "rows": rows,
        "entries": [
            {
                "ledger_id": r["ledger_id"],
                "ledger_name": r["ledger_name"],
                "group_name": r["group_name"],
                "debit": float(r["dr_total"]),
                "credit": float(r["cr_total"]),
                "balance": float(r["closing_balance"]) if r["balance_type"] == 'Dr' else -float(r["closing_balance"])
            }
            for r in rows
        ],
        "grand_dr_total": str(grand_dr),
        "grand_cr_total": str(grand_cr),
        "total_debit": float(grand_dr),
        "total_credit": float(grand_cr)
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
    
    expenses_grouped: dict = {}
    for exp in expense_items:
        g = exp["group_name"]
        if g not in expenses_grouped:
            expenses_grouped[g] = {"group_name": g, "items": [], "total": Decimal("0")}
        expenses_grouped[g]["items"].append({"name": exp["ledger_name"], "amount": float(exp["amount"])})
        expenses_grouped[g]["total"] += Decimal(exp["amount"])

    expenses_list = [
        {"group_name": g["group_name"], "items": g["items"], "total": float(g["total"])}
        for g in expenses_grouped.values()
    ]

    incomes_grouped: dict = {}
    for inc in income_items:
        g = inc["group_name"]
        if g not in incomes_grouped:
            incomes_grouped[g] = {"group_name": g, "items": [], "total": Decimal("0")}
        incomes_grouped[g]["items"].append({"name": inc["ledger_name"], "amount": float(inc["amount"])})
        incomes_grouped[g]["total"] += Decimal(inc["amount"])

    incomes_list = [
        {"group_name": g["group_name"], "items": g["items"], "total": float(g["total"])}
        for g in incomes_grouped.values()
    ]

    return {
        "from_date": from_date,
        "to_date": to_date,
        "income_items": income_items,
        "expense_items": expense_items,
        "incomes": incomes_list,
        "expenses": expenses_list,
        "total_income": str(total_income),
        "total_expense": str(total_expense),
        "net_profit_or_loss": str(abs(net_result)),
        "net_profit": float(net_result),
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
    
    liabilities_grouped: dict = {}
    for liab in liabilities:
        g = liab["group_name"]
        if g not in liabilities_grouped:
            liabilities_grouped[g] = {"group_name": g, "items": [], "total": Decimal("0")}
        liabilities_grouped[g]["items"].append({"name": liab["ledger_name"], "amount": float(liab["amount"])})
        liabilities_grouped[g]["total"] += Decimal(liab["amount"])

    liabilities_list = [
        {"group_name": g["group_name"], "items": g["items"], "total": float(g["total"])}
        for g in liabilities_grouped.values()
    ]

    assets_grouped: dict = {}
    for ast in assets:
        g = ast["group_name"]
        if g not in assets_grouped:
            assets_grouped[g] = {"group_name": g, "items": [], "total": Decimal("0")}
        assets_grouped[g]["items"].append({"name": ast["ledger_name"], "amount": float(ast["amount"])})
        assets_grouped[g]["total"] += Decimal(ast["amount"])

    assets_list = [
        {"group_name": g["group_name"], "items": g["items"], "total": float(g["total"])}
        for g in assets_grouped.values()
    ]

    return {
        "as_of_date": as_of_date,
        "liabilities": liabilities_list,
        "assets": assets_list,
        "liability_items": liabilities,
        "asset_items": assets,
        "total_liabilities": str(total_liabilities),
        "total_assets": str(total_assets)
    }

# =============================================
# BILL-BY-BILL ALLOCATION & SETTLEMENT ENGINE (DOC-24 & DOC-07)
# =============================================

def _resolve_or_create_party_ledger(db: Session, org_id: UUID, party: models.Party, fy_id: UUID) -> models.Ledger:
    """Finds or automatically provisions the Party's ledger in Sundry Debtors/Creditors."""
    ledger = db.query(models.Ledger).filter(
        models.Ledger.organization_id == org_id,
        or_(
            func.lower(models.Ledger.name) == func.lower(party.legal_name),
            func.lower(models.Ledger.name) == func.lower(party.trade_name) if party.trade_name else False
        )
    ).first()
    if ledger:
        return ledger
    
    is_customer = bool(party.customer_profile)
    group_name = "Sundry Debtors" if is_customer else "Sundry Creditors"
    group = db.query(models.LedgerGroup).filter(
        models.LedgerGroup.organization_id == org_id,
        func.lower(models.LedgerGroup.name) == func.lower(group_name)
    ).first()
    group_id = group.id if group else None
    
    new_ledger = models.Ledger(
        organization_id=org_id,
        name=party.legal_name,
        group_name=group_name,
        group_id=group_id,
        gstin=party.gst,
        opening_balance=Decimal("0"),
        closing_balance=Decimal("0"),
        op_type="Dr" if is_customer else "Cr",
        cl_type="Dr" if is_customer else "Cr"
    )
    db.add(new_ledger)
    db.flush()
    return new_ledger


@router.get("/allocations/pending", response_model=List[schemas.AllocationSummary])
def get_pending_allocations(
    party_id: Optional[UUID] = Query(None, description="Filter by customer or supplier party UUID"),
    party_type: Optional[str] = Query(None, description="'customer' or 'vendor'"),
    direction: Optional[str] = Query(None, description="'receivable' or 'payable'"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Fetches all unallocated/partially allocated vouchers and unpaid invoices.
    Supports party-specific scoping for high-speed counter settlement.
    """
    org_id = get_org_id(current_user)
    
    # 1. Build Invoices Query
    inv_query = db.query(models.Invoice).filter(
        models.Invoice.organization_id == org_id,
        models.Invoice.is_active == True
    )

    if party_id:
        inv_query = inv_query.filter(models.Invoice.party_id == party_id)
        
    if party_type == 'customer' or direction == 'receivable':
        inv_query = inv_query.filter(
            models.Invoice.invoice_type.in_(["sales-bill", "bill", "sales-invoice", "sales-order"])
        )
    elif party_type == 'vendor' or direction == 'payable':
        inv_query = inv_query.filter(
            models.Invoice.invoice_type.in_(["purchase-bill", "purchase", "purchase-invoice"])
        )

    invoices = inv_query.order_by(models.Invoice.date.asc()).all()

    # Pre-fetch party names for fast display if party_id was not filtered
    party_map = {}
    if not party_id:
        all_parties = db.query(models.Party.id, models.Party.legal_name).filter(
            models.Party.organization_id == org_id
        ).all()
        party_map = {p[0]: p[1] for p in all_parties}

    # Pre-fetch all invoice allocations in bulk
    inv_ids = [inv.id for inv in invoices]
    allocs_map = {}
    if inv_ids:
        alloc_records = db.query(
            models.InvoiceAllocation.target_invoice_id,
            func.sum(models.InvoiceAllocation.allocated_amount)
        ).filter(
            models.InvoiceAllocation.target_invoice_id.in_(inv_ids)
        ).group_by(models.InvoiceAllocation.target_invoice_id).all()
        allocs_map = {r[0]: r[1] or Decimal("0") for r in alloc_records}

    summaries = []
    today = date.today()

    for inv in invoices:
        allocs = allocs_map.get(inv.id, Decimal("0"))
        outstanding = Decimal(inv.grand_total) - allocs
        if outstanding > 0:
            inv_date = inv.date.date() if isinstance(inv.date, datetime) else inv.date
            days_overdue = max(0, (today - inv_date).days)
            p_name = inv.customer_name or party_map.get(inv.party_id, "Customer")
            summaries.append({
                "id": inv.id,
                "invoice_number": inv.invoice_number,
                "date": inv.date,
                "total_amount": inv.grand_total,
                "allocated_total": allocs,
                "outstanding": outstanding,
                "document_type": inv.invoice_type or "Invoice",
                "party_id": inv.party_id,
                "party_name": p_name,
                "days_overdue": days_overdue
            })

    # 2. Vouchers (Credit Notes / Debit Notes with unallocated amounts)
    vch_query = db.query(models.Voucher).filter(
        models.Voucher.organization_id == org_id,
        models.Voucher.is_active == True,
        models.Voucher.status != "Cancelled"
    )

    if party_type == 'customer' or direction == 'receivable':
        vch_query = vch_query.filter(models.Voucher.voucher_type == "Credit Note")
    elif party_type == 'vendor' or direction == 'payable':
        vch_query = vch_query.filter(models.Voucher.voucher_type == "Debit Note")
    else:
        vch_query = vch_query.filter(
            models.Voucher.voucher_type.in_(["Receipt", "Payment", "Credit Note", "Debit Note"])
        )

    vouchers = vch_query.order_by(models.Voucher.date.asc()).all()
    vch_ids = [v.id for v in vouchers]
    vch_allocs_map = {}
    if vch_ids:
        vch_alloc_records = db.query(
            models.InvoiceAllocation.target_cn_dn_id,
            func.sum(models.InvoiceAllocation.allocated_amount)
        ).filter(
            models.InvoiceAllocation.target_cn_dn_id.in_(vch_ids)
        ).group_by(models.InvoiceAllocation.target_cn_dn_id).all()
        vch_allocs_map = {r[0]: r[1] or Decimal("0") for r in vch_alloc_records}

    for vch in vouchers:
        vch_allocs = vch_allocs_map.get(vch.id, Decimal("0"))
        outstanding = Decimal(vch.total_amount) - vch_allocs
        if outstanding > 0:
            vch_date = vch.date.date() if isinstance(vch.date, datetime) else vch.date
            days_overdue = max(0, (today - vch_date).days)
            summaries.append({
                "id": vch.id,
                "voucher_number": vch.voucher_number,
                "date": vch.date,
                "total_amount": vch.total_amount,
                "allocated_total": vch_allocs,
                "outstanding": outstanding,
                "document_type": vch.voucher_type,
                "party_id": party_id,
                "party_name": "Open Credit/Debit",
                "days_overdue": days_overdue
            })

    return summaries


@router.get("/outstanding", response_model=schemas.OutstandingReportResponse)
def get_outstanding_report(
    type: str = Query("receivables", description="'receivables' for customers or 'payables' for vendors"),
    as_of: Optional[date] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Computes real-time debtor/creditor outstanding balances with standard ageing buckets:
    0-30 days, 31-60 days, 61-90 days, 90+ days overdue (DOC-07 Section 20).
    """
    org_id = get_org_id(current_user)
    as_of_date = as_of or date.today()
    is_receivables = (type.lower() == "receivables")

    # 1. Fetch relevant parties
    party_query = db.query(models.Party).filter(
        models.Party.organization_id == org_id,
        models.Party.status == "active"
    )
    if is_receivables:
        party_query = party_query.join(models.CustomerProfile)
    else:
        cust_sub = db.query(models.CustomerProfile.party_id)
        party_query = party_query.filter(~models.Party.id.in_(cust_sub))

    if search:
        party_query = party_query.filter(
            or_(
                models.Party.legal_name.ilike(f"%{search}%"),
                models.Party.trade_name.ilike(f"%{search}%"),
                models.Party.gst.ilike(f"%{search}%")
            )
        )
    parties = party_query.order_by(models.Party.legal_name).all()

    # 2. Fetch invoices in bulk
    inv_types = ["sales-bill", "bill", "sales-invoice"] if is_receivables else ["purchase-bill", "purchase", "purchase-invoice"]
    invoices = db.query(models.Invoice).filter(
        models.Invoice.organization_id == org_id,
        models.Invoice.is_active == True,
        models.Invoice.invoice_type.in_(inv_types)
    ).all()

    # 3. Fetch allocations in bulk
    inv_ids = [inv.id for inv in invoices]
    allocs_map = {}
    if inv_ids:
        alloc_records = db.query(
            models.InvoiceAllocation.target_invoice_id,
            func.sum(models.InvoiceAllocation.allocated_amount)
        ).filter(
            models.InvoiceAllocation.target_invoice_id.in_(inv_ids)
        ).group_by(models.InvoiceAllocation.target_invoice_id).all()
        allocs_map = {r[0]: r[1] or Decimal("0") for r in alloc_records}

    # Group invoices by party_id (or fallback by customer_name)
    invoices_by_party = {}
    invoices_by_name = {}
    for inv in invoices:
        if inv.party_id:
            invoices_by_party.setdefault(inv.party_id, []).append(inv)
        if inv.customer_name:
            invoices_by_name.setdefault(inv.customer_name.strip().lower(), []).append(inv)

    party_summaries = []
    tot_out = Decimal("0")
    b0_30 = Decimal("0")
    b31_60 = Decimal("0")
    b61_90 = Decimal("0")
    b90_p = Decimal("0")

    for party in parties:
        # Match invoices
        p_invoices = invoices_by_party.get(party.id, [])
        if not p_invoices and party.legal_name:
            p_invoices = invoices_by_name.get(party.legal_name.strip().lower(), [])

        p_total_invoiced = Decimal("0")
        p_total_settled = Decimal("0")
        p_total_outstanding = Decimal("0")
        p_b0_30 = Decimal("0")
        p_b31_60 = Decimal("0")
        p_b61_90 = Decimal("0")
        p_b90_p = Decimal("0")
        p_bills = []

        for inv in p_invoices:
            inv_total = Decimal(inv.grand_total)
            alloc = allocs_map.get(inv.id, Decimal("0"))
            out_amt = inv_total - alloc
            p_total_invoiced += inv_total
            p_total_settled += alloc

            if out_amt > 0:
                p_total_outstanding += out_amt
                inv_dt = inv.date.date() if isinstance(inv.date, datetime) else inv.date
                days = max(0, (as_of_date - inv_dt).days)

                if days <= 30:
                    bucket = "0-30"
                    p_b0_30 += out_amt
                elif days <= 60:
                    bucket = "31-60"
                    p_b31_60 += out_amt
                elif days <= 90:
                    bucket = "61-90"
                    p_b61_90 += out_amt
                else:
                    bucket = "90+"
                    p_b90_p += out_amt

                p_bills.append(schemas.OutstandingBillItem(
                    invoice_id=inv.id,
                    invoice_number=inv.invoice_number,
                    date=inv_dt,
                    total_amount=inv_total,
                    allocated_amount=alloc,
                    outstanding_amount=out_amt,
                    days_overdue=days,
                    ageing_bucket=bucket,
                    document_type=inv.invoice_type or "Invoice"
                ))

        if p_total_invoiced > 0 or p_total_outstanding > 0:
            tot_out += p_total_outstanding
            b0_30 += p_b0_30
            b31_60 += p_b31_60
            b61_90 += p_b61_90
            b90_p += p_b90_p

            c_limit = None
            if party.customer_profile and party.customer_profile.credit_limit:
                c_limit = Decimal(party.customer_profile.credit_limit)

            party_summaries.append(schemas.OutstandingPartySummary(
                party_id=party.id,
                party_name=party.legal_name,
                party_type="customer" if is_receivables else "vendor",
                gstin=party.gst,
                credit_limit=c_limit,
                total_invoiced=p_total_invoiced,
                total_settled=p_total_settled,
                total_outstanding=p_total_outstanding,
                bucket_0_30=p_b0_30,
                bucket_31_60=p_b31_60,
                bucket_61_90=p_b61_90,
                bucket_90_plus=p_b90_p,
                bills=sorted(p_bills, key=lambda b: b.days_overdue, reverse=True)
            ))

    return schemas.OutstandingReportResponse(
        report_type="receivables" if is_receivables else "payables",
        as_of_date=as_of_date,
        total_parties=len(party_summaries),
        total_outstanding=tot_out,
        total_bucket_0_30=b0_30,
        total_bucket_31_60=b31_60,
        total_bucket_61_90=b61_90,
        total_bucket_90_plus=b90_p,
        parties=sorted(party_summaries, key=lambda p: p.total_outstanding, reverse=True)
    )


@router.post("/receipt-payment", response_model=schemas.ReceiptPaymentResponse)
def create_receipt_or_payment(
    request: schemas.ReceiptPaymentCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Unified high-speed entry for Customer Receipts and Supplier Payments (DOC-24).
    Atomically posts:
    1. Balanced double-entry Voucher in General Ledger (Dr Cash/Bank, Cr Debtor or vice versa).
    2. Document Series sequence locking.
    3. Bill-by-Bill allocations against open target invoices.
    4. Floating on-account advance recording for any unallocated remainder.
    """
    org_id = get_org_id(current_user)
    fy = get_active_fiscal_year(db, org_id)
    if not fy:
        raise HTTPException(status_code=400, detail="No active fiscal year found.")

    party = db.query(models.Party).filter(
        models.Party.id == request.party_id,
        models.Party.organization_id == org_id
    ).first()
    if not party:
        raise HTTPException(status_code=404, detail="Party not found.")

    cash_bank_ledger = db.query(models.Ledger).filter(
        models.Ledger.id == request.cash_bank_ledger_id,
        models.Ledger.organization_id == org_id
    ).first()
    if not cash_bank_ledger:
        raise HTTPException(status_code=404, detail="Cash/Bank ledger not found.")

    party_ledger = _resolve_or_create_party_ledger(db, org_id, party, fy.id)

    # Determine Voucher Number
    v_type = request.voucher_type.capitalize()
    if v_type not in ["Receipt", "Payment"]:
        v_type = "Receipt"

    v_number = request.voucher_number
    if request.series_id:
        series = db.query(models.DocumentSeries).filter(
            models.DocumentSeries.id == request.series_id,
            models.DocumentSeries.organization_id == org_id
        ).with_for_update().first()
        if series:
            if not v_number:
                v_number = f"{series.prefix or ''}{series.next_number}{series.suffix or ''}"
            series.next_number += 1
            db.add(series)

    if not v_number:
        v_number = _get_next_voucher_number(db, org_id, v_type, fy.id)

    narration = request.narration or f"{v_type} for {party.legal_name} via {request.payment_mode}"
    if request.reference_number:
        narration += f" (Ref: {request.reference_number})"

    # Create Voucher
    db_voucher = models.Voucher(
        organization_id=org_id,
        voucher_type=v_type,
        voucher_number=v_number,
        date=datetime.combine(request.date, datetime.min.time()),
        narration=narration,
        total_amount=request.amount,
        is_active=True,
        status='Active',
        fiscal_year_id=fy.id
    )
    db.add(db_voucher)
    db.flush()

    # Create Double-Entry Postings
    if v_type == "Receipt":
        # Dr Cash/Bank, Cr Debtor
        db.add(models.VoucherEntry(
            voucher_id=db_voucher.id,
            ledger_id=cash_bank_ledger.id,
            cr_dr="Dr",
            amount=request.amount,
            ledger_name=cash_bank_ledger.name
        ))
        db.add(models.VoucherEntry(
            voucher_id=db_voucher.id,
            ledger_id=party_ledger.id,
            cr_dr="Cr",
            amount=request.amount,
            ledger_name=party_ledger.name
        ))
        _update_ledger_balance(db, org_id, cash_bank_ledger.id, fy.id, "Dr", request.amount)
        _update_ledger_balance(db, org_id, party_ledger.id, fy.id, "Cr", request.amount)
    else:
        # Dr Creditor, Cr Cash/Bank
        db.add(models.VoucherEntry(
            voucher_id=db_voucher.id,
            ledger_id=party_ledger.id,
            cr_dr="Dr",
            amount=request.amount,
            ledger_name=party_ledger.name
        ))
        db.add(models.VoucherEntry(
            voucher_id=db_voucher.id,
            ledger_id=cash_bank_ledger.id,
            cr_dr="Cr",
            amount=request.amount,
            ledger_name=cash_bank_ledger.name
        ))
        _update_ledger_balance(db, org_id, party_ledger.id, fy.id, "Dr", request.amount)
        _update_ledger_balance(db, org_id, cash_bank_ledger.id, fy.id, "Cr", request.amount)

    # Allocations Engine (DOC-07)
    allocated_total = Decimal("0")
    alloc_count = 0

    if request.auto_allocate_fifo:
        inv_types = ["sales-bill", "bill", "sales-invoice"] if v_type == "Receipt" else ["purchase-bill", "purchase", "purchase-invoice"]
        open_invoices = db.query(models.Invoice).filter(
            models.Invoice.organization_id == org_id,
            models.Invoice.is_active == True,
            models.Invoice.party_id == party.id,
            models.Invoice.invoice_type.in_(inv_types)
        ).order_by(models.Invoice.date.asc()).all()

        rem_to_alloc = Decimal(request.amount)
        for inv in open_invoices:
            if rem_to_alloc <= 0:
                break
            prev_alloc = db.query(func.sum(models.InvoiceAllocation.allocated_amount)).filter(
                models.InvoiceAllocation.target_invoice_id == inv.id
            ).scalar() or Decimal("0")
            due = Decimal(inv.grand_total) - prev_alloc
            if due > 0:
                chunk = min(rem_to_alloc, due)
                db.add(models.InvoiceAllocation(
                    organization_id=org_id,
                    source_voucher_id=db_voucher.id,
                    target_invoice_id=inv.id,
                    allocated_amount=chunk,
                    is_floating=False,
                    narration=f"FIFO settlement against {inv.invoice_number}"
                ))
                rem_to_alloc -= chunk
                allocated_total += chunk
                alloc_count += 1
    elif request.allocations:
        for item in request.allocations:
            if item.allocated_amount and item.allocated_amount > 0:
                db.add(models.InvoiceAllocation(
                    organization_id=org_id,
                    source_voucher_id=db_voucher.id,
                    target_invoice_id=item.target_invoice_id,
                    target_cn_dn_id=item.target_cn_dn_id,
                    allocated_amount=item.allocated_amount,
                    is_floating=False,
                    narration=item.narration or f"Allocated from {v_number}"
                ))
                allocated_total += item.allocated_amount
                alloc_count += 1

    floating_balance = max(Decimal("0"), request.amount - allocated_total)
    if floating_balance > 0:
        db.add(models.InvoiceAllocation(
            organization_id=org_id,
            source_voucher_id=db_voucher.id,
            target_invoice_id=None,
            target_cn_dn_id=None,
            allocated_amount=floating_balance,
            is_floating=True,
            narration=f"Floating advance balance on {v_number}"
        ))

    db.commit()

    return schemas.ReceiptPaymentResponse(
        voucher_id=db_voucher.id,
        voucher_number=v_number,
        voucher_type=v_type,
        date=request.date,
        party_id=party.id,
        party_name=party.legal_name,
        total_amount=request.amount,
        allocated_total=allocated_total,
        floating_balance=floating_balance,
        allocations_count=alloc_count,
        narration=narration
    )


@router.post("/allocations", response_model=List[schemas.AllocationRead])
def create_allocations(request: schemas.AllocationCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """
    Creates one or more allocations from a source Receipt/Payment voucher.
    """
    org_id = get_org_id(current_user)
    
    source_voucher = db.query(models.Voucher).filter(
        models.Voucher.id == request.source_voucher_id,
        models.Voucher.organization_id == org_id
    ).first()
    
    if not source_voucher:
        raise HTTPException(status_code=404, detail="Source voucher not found")
        
    source_allocs = db.query(func.sum(models.InvoiceAllocation.allocated_amount)).filter(
        models.InvoiceAllocation.source_voucher_id == source_voucher.id
    ).scalar() or Decimal("0")
    
    source_outstanding = Decimal(source_voucher.total_amount) - source_allocs
    requested_total = sum((alloc.allocated_amount for alloc in request.allocations))
    
    if requested_total > source_outstanding:
        raise HTTPException(status_code=400, detail=f"Cannot allocate {requested_total}. Only {source_outstanding} outstanding on source voucher.")

    created_allocations = []
    
    for item in request.allocations:
        is_floating = False
        if not item.target_invoice_id and not item.target_cn_dn_id:
            is_floating = True
            
        new_alloc = models.InvoiceAllocation(
            organization_id=org_id,
            source_voucher_id=request.source_voucher_id,
            target_invoice_id=item.target_invoice_id,
            target_cn_dn_id=item.target_cn_dn_id,
            allocated_amount=item.allocated_amount,
            is_floating=is_floating,
            narration=item.narration
        )
        db.add(new_alloc)
        created_allocations.append(new_alloc)
        
    db.commit()
    for alloc in created_allocations:
        db.refresh(alloc)
        
    return created_allocations


# ============================================================
# 5. Bank Reconciliation (DOC-28)
# ============================================================

@router.get("/bank-profiles", response_model=List[schemas.BankStatementProfileResponse])
def get_bank_profiles(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    org_id = get_org_id(current_user)
    return db.query(models.BankStatementProfile).filter(models.BankStatementProfile.organization_id == org_id).all()

@router.post("/bank-profiles", response_model=schemas.BankStatementProfileResponse)
def create_bank_profile(profile: schemas.BankStatementProfileCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    org_id = get_org_id(current_user)
    new_profile = models.BankStatementProfile(**profile.dict(), organization_id=org_id)
    db.add(new_profile)
    db.commit()
    db.refresh(new_profile)
    return new_profile

@router.post("/bank-statements/upload")
async def upload_bank_statement(
    ledger_id: UUID = Form(...),
    profile_id: Optional[UUID] = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    org_id = get_org_id(current_user)
    
    # 1. Get column mapping
    mapping = {}
    if profile_id:
        profile = db.query(models.BankStatementProfile).filter(models.BankStatementProfile.id == profile_id).first()
        if profile:
            mapping = profile.column_mapping

    # 2. Parse CSV
    contents = await file.read()
    decoded = contents.decode('utf-8', errors='replace')
    csv_reader = csv.DictReader(io.StringIO(decoded))
    
    # Create import record
    new_import = models.BankStatementImport(
        organization_id=org_id,
        ledger_id=ledger_id,
        profile_id=profile_id,
        filename=file.filename,
        imported_by=current_user.id
    )
    db.add(new_import)
    db.commit()
    db.refresh(new_import)
    
    rows_added = 0
    for row in csv_reader:
        # Resolve mapped columns or fallback to common names
        date_str = row.get(mapping.get('date', 'Date')) or row.get('Value Date') or row.get('Transaction Date')
        desc = row.get(mapping.get('description', 'Description')) or row.get('Narration') or row.get('Particulars')
        ref = row.get(mapping.get('reference', 'Reference')) or row.get('Cheque No.') or row.get('Ref No.')
        with_str = row.get(mapping.get('withdrawal', 'Withdrawal')) or row.get('Debit') or '0'
        dep_str = row.get(mapping.get('deposit', 'Deposit')) or row.get('Credit') or '0'
        bal_str = row.get(mapping.get('balance', 'Balance')) or '0'
        
        if not date_str or not desc:
            continue
            
        try:
            t_date = date_parser.parse(date_str).date()
        except:
            continue
            
        try:
            with_val = float(with_str.replace(',', '').replace(' ', '')) if with_str else 0.0
            dep_val = float(dep_str.replace(',', '').replace(' ', '')) if dep_str else 0.0
            bal_val = float(bal_str.replace(',', '').replace(' ', '')) if bal_str else 0.0
        except ValueError:
            with_val = 0.0
            dep_val = 0.0
            bal_val = 0.0
            
        if with_val == 0 and dep_val == 0:
            continue
            
        stmt_row = models.BankStatementRow(
            import_id=new_import.id,
            transaction_date=t_date,
            description=desc[:500],
            reference_no=ref[:100] if ref else None,
            withdrawal=with_val,
            deposit=dep_val,
            balance=bal_val,
            raw_data=row
        )
        db.add(stmt_row)
        rows_added += 1
        
    db.commit()
    return {"message": f"Successfully imported {rows_added} rows.", "import_id": new_import.id}

@router.get("/bank-statements/unreconciled/{ledger_id}", response_model=List[schemas.BankStatementRowResponse])
def get_unreconciled_statement_rows(ledger_id: UUID, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    org_id = get_org_id(current_user)
    
    # Get all imports for this ledger
    imports = db.query(models.BankStatementImport.id).filter(
        models.BankStatementImport.organization_id == org_id,
        models.BankStatementImport.ledger_id == ledger_id
    ).subquery()
    
    rows = db.query(models.BankStatementRow).filter(
        models.BankStatementRow.import_id.in_(imports),
        models.BankStatementRow.is_reconciled == False
    ).order_by(models.BankStatementRow.transaction_date.desc()).limit(200).all()
    
    return rows

@router.get("/vouchers/unreconciled/{ledger_id}")
def get_unreconciled_vouchers(ledger_id: UUID, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    org_id = get_org_id(current_user)
    
    # We want VoucherEntries for this ledger that are NOT in BankReconciliationMatch
    matches_subq = db.query(models.BankReconciliationMatch.voucher_id).subquery()
    
    entries = db.query(models.VoucherEntry, models.Voucher).join(
        models.Voucher, models.VoucherEntry.voucher_id == models.Voucher.id
    ).filter(
        models.Voucher.organization_id == org_id,
        models.VoucherEntry.ledger_id == ledger_id,
        models.Voucher.id.notin_(matches_subq)
    ).order_by(models.Voucher.date.desc()).limit(200).all()
    
    result = []
    for ve, v in entries:
        result.append({
            "id": v.id,
            "voucher_number": v.voucher_number,
            "date": v.date,
            "narration": v.narration,
            "type": ve.cr_dr, # Dr = Deposit into bank, Cr = Withdrawal
            "amount": ve.amount
        })
    return result

@router.post("/bank-reconciliation/match")
def match_bank_reconciliation(req: schemas.BankReconciliationMatchRequest, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    # 1. Lock the row
    row = db.query(models.BankStatementRow).filter(models.BankStatementRow.id == req.statement_row_id).with_for_update().first()
    if not row or row.is_reconciled:
        raise HTTPException(status_code=400, detail="Row not found or already reconciled")
        
    voucher = db.query(models.Voucher).filter(models.Voucher.id == req.voucher_id).first()
    if not voucher:
        raise HTTPException(status_code=404, detail="Voucher not found")
        
    match = models.BankReconciliationMatch(
        statement_row_id=row.id,
        voucher_id=voucher.id,
        matched_by=current_user.id,
        match_type='MANUAL'
    )
    db.add(match)
    
    row.is_reconciled = True
    row.matched_voucher_id = voucher.id
    db.add(row)
    db.commit()
    
    return {"message": "Matched successfully"}

@router.get("/bank-reconciliation/summary/{ledger_id}", response_model=schemas.BankReconciliationSummaryResponse)
def get_bank_reconciliation_summary(ledger_id: UUID, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    org_id = get_org_id(current_user)
    
    ledger = db.query(models.Ledger).filter(
        models.Ledger.id == ledger_id,
        models.Ledger.organization_id == org_id
    ).first()
    if not ledger:
        raise HTTPException(status_code=404, detail="Bank ledger not found")
        
    book_balance = Decimal(str(ledger.closing_balance or 0.0))
    
    # Unreconciled Statement items
    imports = db.query(models.BankStatementImport.id).filter(
        models.BankStatementImport.organization_id == org_id,
        models.BankStatementImport.ledger_id == ledger_id
    ).subquery()
    
    stmt_rows = db.query(models.BankStatementRow).filter(
        models.BankStatementRow.import_id.in_(imports),
        models.BankStatementRow.is_reconciled == False
    ).all()
    
    stmt_withdrawal = Decimal('0.00')
    stmt_deposit = Decimal('0.00')
    for r in stmt_rows:
        stmt_withdrawal += Decimal(str(r.withdrawal or 0))
        stmt_deposit += Decimal(str(r.deposit or 0))
        
    # Unreconciled Vouchers
    matches_subq = db.query(models.BankReconciliationMatch.voucher_id).subquery()
    entries = db.query(models.VoucherEntry, models.Voucher).join(
        models.Voucher, models.VoucherEntry.voucher_id == models.Voucher.id
    ).filter(
        models.Voucher.organization_id == org_id,
        models.VoucherEntry.ledger_id == ledger_id,
        models.Voucher.id.notin_(matches_subq)
    ).all()
    
    voucher_cr = Decimal('0.00') # Payments from bank (unpresented cheques)
    voucher_dr = Decimal('0.00') # Receipts deposited into bank (uncredited items)
    for ve, v in entries:
        amt = Decimal(str(ve.amount or 0))
        if ve.cr_dr == 'Cr':
            voucher_cr += amt
        else:
            voucher_dr += amt
            
    # BRS Formula:
    # Reconciled Bank Balance = Book Balance + Unpresented Cheques (Cr) - Uncredited Deposits (Dr)
    reconciled_bank_balance = book_balance + voucher_cr - voucher_dr
    difference = (stmt_deposit - stmt_withdrawal) - (voucher_dr - voucher_cr)
    
    return {
        "ledger_id": ledger.id,
        "ledger_name": ledger.name,
        "book_balance": book_balance,
        "unreconciled_statement_count": len(stmt_rows),
        "unreconciled_statement_withdrawal": stmt_withdrawal,
        "unreconciled_statement_deposit": stmt_deposit,
        "unreconciled_voucher_count": len(entries),
        "unreconciled_voucher_cr": voucher_cr,
        "unreconciled_voucher_dr": voucher_dr,
        "reconciled_bank_balance": reconciled_bank_balance,
        "difference": difference
    }

@router.post("/bank-reconciliation/auto-match/{ledger_id}", response_model=schemas.BankAutoMatchResponse)
def auto_match_bank_reconciliation(ledger_id: UUID, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    org_id = get_org_id(current_user)
    
    # 1. Fetch unreconciled statement rows
    imports = db.query(models.BankStatementImport.id).filter(
        models.BankStatementImport.organization_id == org_id,
        models.BankStatementImport.ledger_id == ledger_id
    ).subquery()
    
    stmt_rows = db.query(models.BankStatementRow).filter(
        models.BankStatementRow.import_id.in_(imports),
        models.BankStatementRow.is_reconciled == False
    ).order_by(models.BankStatementRow.transaction_date.asc()).all()
    
    # 2. Fetch unreconciled voucher entries
    matches_subq = db.query(models.BankReconciliationMatch.voucher_id).subquery()
    entries = db.query(models.VoucherEntry, models.Voucher).join(
        models.Voucher, models.VoucherEntry.voucher_id == models.Voucher.id
    ).filter(
        models.Voucher.organization_id == org_id,
        models.VoucherEntry.ledger_id == ledger_id,
        models.Voucher.id.notin_(matches_subq)
    ).order_by(models.Voucher.date.asc()).all()
    
    matched_count = 0
    matched_amount = Decimal('0.00')
    already_matched_vouchers = set()
    
    # Phase 1: Reference Match (Cheque / UTR match + amount match)
    for s_row in stmt_rows:
        if s_row.is_reconciled:
            continue
        ref = (s_row.reference_no or '').strip().lower()
        s_with = Decimal(str(s_row.withdrawal or 0))
        s_dep = Decimal(str(s_row.deposit or 0))
        
        for ve, v in entries:
            if v.id in already_matched_vouchers:
                continue
            v_amt = Decimal(str(ve.amount or 0))
            v_num = (v.voucher_number or '').lower()
            v_narr = (v.narration or '').lower()
            
            ref_match = False
            if ref and len(ref) >= 3 and (ref in v_num or ref in v_narr):
                ref_match = True
                
            amount_match = False
            if s_with > 0 and ve.cr_dr == 'Cr' and s_with == v_amt:
                amount_match = True
            elif s_dep > 0 and ve.cr_dr == 'Dr' and s_dep == v_amt:
                amount_match = True
                
            if ref_match and amount_match:
                s_row.is_reconciled = True
                s_row.matched_voucher_id = v.id
                match_rec = models.BankReconciliationMatch(
                    statement_row_id=s_row.id,
                    voucher_id=v.id,
                    matched_by=current_user.id,
                    match_type='AUTO'
                )
                db.add(match_rec)
                already_matched_vouchers.add(v.id)
                matched_count += 1
                matched_amount += v_amt
                break
                
    # Phase 2: Exact Amount Match within +/- 3 days window
    for s_row in stmt_rows:
        if s_row.is_reconciled:
            continue
        s_with = Decimal(str(s_row.withdrawal or 0))
        s_dep = Decimal(str(s_row.deposit or 0))
        
        for ve, v in entries:
            if v.id in already_matched_vouchers:
                continue
            v_amt = Decimal(str(ve.amount or 0))
            
            amount_match = False
            if s_with > 0 and ve.cr_dr == 'Cr' and s_with == v_amt:
                amount_match = True
            elif s_dep > 0 and ve.cr_dr == 'Dr' and s_dep == v_amt:
                amount_match = True
                
            if amount_match:
                date_diff = abs((s_row.transaction_date - v.date).days)
                if date_diff <= 3:
                    s_row.is_reconciled = True
                    s_row.matched_voucher_id = v.id
                    match_rec = models.BankReconciliationMatch(
                        statement_row_id=s_row.id,
                        voucher_id=v.id,
                        matched_by=current_user.id,
                        match_type='AUTO'
                    )
                    db.add(match_rec)
                    already_matched_vouchers.add(v.id)
                    matched_count += 1
                    matched_amount += v_amt
                    break
                    
    db.commit()
    
    unmatched_stmt = sum(1 for r in stmt_rows if not r.is_reconciled)
    unmatched_vouch = len(entries) - len(already_matched_vouchers)
    
    return {
        "matches_count": matched_count,
        "matched_amount": matched_amount,
        "unmatched_statements_count": unmatched_stmt,
        "unmatched_vouchers_count": unmatched_vouch,
        "message": f"Auto-match completed: {matched_count} transaction(s) reconciled."
    }

@router.post("/cash-verifications", response_model=schemas.CashVerificationResponse)
def create_cash_verification(payload: schemas.CashVerificationCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    org_id = get_org_id(current_user)
    
    ledger = db.query(models.Ledger).filter(
        models.Ledger.id == payload.ledger_id,
        models.Ledger.organization_id == org_id
    ).first()
    if not ledger:
        raise HTTPException(status_code=404, detail="Cash ledger not found")
        
    system_balance = Decimal(str(ledger.closing_balance or 0.0))
    counted_balance = payload.counted_balance
    variance = counted_balance - system_balance
    
    if variance == Decimal('0.00'):
        status = "BALANCED"
    elif variance > Decimal('0.00'):
        status = "SURPLUS"
    else:
        status = "SHORTAGE"
        
    v_date = payload.verification_date or date.today()
    
    verification = models.CashVerification(
        organization_id=org_id,
        ledger_id=payload.ledger_id,
        verification_date=v_date,
        denominations=payload.denominations,
        system_balance=system_balance,
        counted_balance=counted_balance,
        variance=variance,
        status=status,
        remarks=payload.remarks,
        verified_by=current_user.id
    )
    db.add(verification)
    db.commit()
    db.refresh(verification)
    
    return {
        "id": verification.id,
        "organization_id": verification.organization_id,
        "ledger_id": verification.ledger_id,
        "ledger_name": ledger.name,
        "verification_date": verification.verification_date,
        "denominations": verification.denominations,
        "system_balance": verification.system_balance,
        "counted_balance": verification.counted_balance,
        "variance": verification.variance,
        "status": verification.status,
        "remarks": verification.remarks,
        "created_at": verification.created_at
    }

@router.get("/cash-verifications", response_model=List[schemas.CashVerificationResponse])
def list_cash_verifications(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    org_id = get_org_id(current_user)
    
    records = db.query(models.CashVerification, models.Ledger.name).join(
        models.Ledger, models.CashVerification.ledger_id == models.Ledger.id
    ).filter(
        models.CashVerification.organization_id == org_id
    ).order_by(models.CashVerification.created_at.desc()).limit(100).all()
    
    res = []
    for cv, ledger_name in records:
        res.append({
            "id": cv.id,
            "organization_id": cv.organization_id,
            "ledger_id": cv.ledger_id,
            "ledger_name": ledger_name,
            "verification_date": cv.verification_date,
            "denominations": cv.denominations,
            "system_balance": cv.system_balance,
            "counted_balance": cv.counted_balance,
            "variance": cv.variance,
            "status": cv.status,
            "remarks": cv.remarks,
            "created_at": cv.created_at
        })
    return res

@router.put("/vouchers/{voucher_id}", response_model=schemas.VoucherResponse)
def update_voucher(
    voucher_id: UUID,
    voucher: schemas.VoucherCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    org_id = get_org_id(current_user)
    
    db_voucher = db.query(models.Voucher).filter(
        models.Voucher.id == voucher_id,
        models.Voucher.organization_id == org_id
    ).first()
    
    if not db_voucher:
        raise HTTPException(status_code=404, detail="Voucher not found")
        
    if db_voucher.status != 'Active':
        raise HTTPException(status_code=400, detail="Cannot modify a cancelled or reversed voucher")

    fy = get_active_fiscal_year(db, org_id, voucher.fiscal_year_id)
    if not fy:
        raise HTTPException(status_code=400, detail="No active fiscal year.")
    if fy.is_locked:
        raise HTTPException(status_code=400, detail=f"Fiscal year {fy.name} is locked.")

    db_voucher.date = voucher.date
    db_voucher.narration = voucher.narration
    db_voucher.total_amount = voucher.total_amount
    
    # Delete old entries and replace with new ones
    db.query(models.VoucherEntry).filter(models.VoucherEntry.voucher_id == voucher_id).delete()
    
    for entry in voucher.entries:
        db_entry = models.VoucherEntry(
            voucher_id=voucher_id,
            ledger_id=entry.ledger_id,
            cr_dr=entry.cr_dr,
            amount=entry.amount,
            ledger_name=db.query(models.Ledger.name).filter(models.Ledger.id == entry.ledger_id).scalar()
        )
        db.add(db_entry)
        
    db.commit()
    db.refresh(db_voucher)
    return db_voucher


# =====================================================================
# DOC-25: JOURNAL VOUCHER, ADJUSTMENT & ACCRUAL MANAGEMENT ENGINE
# =====================================================================

def _parse_journal_meta(narration: Optional[str]):
    import re
    if not narration:
        return "Standard Manual Journal", None, None, ""
    
    j_type = "Standard Manual Journal"
    for known in [
        "Standard Manual Journal", "Accrual Journal", "Provision", 
        "Prepaid / Deferred Adjustment", "Reclassification / Transfer", 
        "Opening Balance Adjustment"
    ]:
        if f"[{known}]" in narration:
            j_type = known
            break
            
    ref_match = re.search(r'\[Ref:\s*([^\]]+)\]', narration)
    ref_num = ref_match.group(1).strip() if ref_match else None
    
    rev_match = re.search(r'\[Reversal:\s*([0-9]{4}-[0-9]{2}-[0-9]{2})\]', narration)
    rev_date = None
    if rev_match:
        try:
            rev_date = date.fromisoformat(rev_match.group(1).strip())
        except Exception:
            pass
            
    # Clean user narration for display
    clean_narration = re.sub(r'\[(Standard Manual Journal|Accrual Journal|Provision|Prepaid / Deferred Adjustment|Reclassification / Transfer|Opening Balance Adjustment)\]', '', narration)
    clean_narration = re.sub(r'\[Ref:\s*[^\]]+\]', '', clean_narration)
    clean_narration = re.sub(r'\[Reversal:\s*[^\]]+\]', '', clean_narration).strip()

    return j_type, ref_num, rev_date, clean_narration


@router.post("/journal", response_model=schemas.JournalVoucherResponse)
def create_journal_voucher(
    voucher: schemas.JournalVoucherCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    DOC-25: Creates a strictly balanced multi-leg Journal Voucher.
    Enforces sum(Debits) == sum(Credits) > 0, updates per-FY Ledger balances,
    and supports accrual scheduling.
    """
    org_id = get_org_id(current_user)
    
    # 1. Active Fiscal Year validation
    fy = get_active_fiscal_year(db, org_id, voucher.fiscal_year_id)
    if not fy:
        raise HTTPException(status_code=400, detail="No active fiscal year found. Please configure an active fiscal year.")
    if fy.is_locked:
        raise HTTPException(status_code=400, detail=f"Fiscal year {fy.name} is locked. Cannot post journal vouchers.")

    # 2. Multi-leg debit/credit balance verification
    if not voucher.entries or len(voucher.entries) < 2:
        raise HTTPException(status_code=400, detail="A journal voucher must contain at least two entry legs.")
        
    for idx, e in enumerate(voucher.entries, start=1):
        if e.amount <= 0:
            raise HTTPException(status_code=400, detail=f"Entry line {idx} amount must be greater than zero.")
        if e.cr_dr not in ('Dr', 'Cr'):
            raise HTTPException(status_code=400, detail=f"Entry line {idx} must specify either 'Dr' or 'Cr'.")

    total_dr = sum(e.amount for e in voucher.entries if e.cr_dr == 'Dr')
    total_cr = sum(e.amount for e in voucher.entries if e.cr_dr == 'Cr')

    if total_dr != total_cr:
        raise HTTPException(
            status_code=400,
            detail=f"Journal voucher is out of balance. Total Debits (₹{total_dr:,.2f}) != Total Credits (₹{total_cr:,.2f}). Difference: ₹{abs(total_dr - total_cr):,.2f}."
        )

    # 3. Voucher number generation
    v_number = voucher.voucher_number
    if voucher.series_id:
        series = db.query(models.DocumentSeries).filter(
            models.DocumentSeries.id == voucher.series_id
        ).with_for_update().first()
        if series:
            import re
            match = re.search(r'\d+$', v_number) if v_number else None
            if match:
                parsed_num = int(match.group())
                if parsed_num >= series.next_number:
                    series.next_number = parsed_num + 1
                    db.add(series)

    if not v_number:
        v_number = _get_next_voucher_number(db, org_id, "Journal", fy.id)

    # 4. Construct narration with embedded metadata
    meta_tags = []
    if voucher.journal_type:
        meta_tags.append(f"[{voucher.journal_type}]")
    if voucher.reference_number:
        meta_tags.append(f"[Ref: {voucher.reference_number}]")
    if voucher.scheduled_reversal_date:
        meta_tags.append(f"[Reversal: {voucher.scheduled_reversal_date.isoformat()}]")
    
    full_narration = " ".join(meta_tags)
    if voucher.narration:
        full_narration = f"{full_narration} {voucher.narration.strip()}".strip()

    # 5. Insert Voucher master
    db_voucher = models.Voucher(
        organization_id=org_id,
        voucher_type="Journal",
        voucher_number=v_number,
        date=voucher.date,
        narration=full_narration,
        total_amount=total_dr,
        is_active=True,
        status="Active",
        fiscal_year_id=fy.id
    )
    db.add(db_voucher)
    db.flush()

    # 6. Insert lines and update per-FY ledger balances
    entry_responses = []
    for entry in voucher.entries:
        ledger = db.query(models.Ledger).filter(
            models.Ledger.id == entry.ledger_id,
            models.Ledger.organization_id == org_id
        ).first()
        if not ledger:
            raise HTTPException(status_code=400, detail=f"Ledger ID {entry.ledger_id} not found in this organization.")

        db_entry = models.VoucherEntry(
            voucher_id=db_voucher.id,
            ledger_id=entry.ledger_id,
            cr_dr=entry.cr_dr,
            amount=entry.amount,
            ledger_name=ledger.name
        )
        db.add(db_entry)
        db.flush()

        # Update balance
        _update_ledger_balance(db, org_id, entry.ledger_id, fy.id, entry.cr_dr, entry.amount)

        entry_responses.append(schemas.JournalEntryLineResponse(
            id=db_entry.id,
            voucher_id=db_voucher.id,
            ledger_id=db_entry.ledger_id,
            ledger_name=ledger.name,
            cr_dr=db_entry.cr_dr,
            amount=db_entry.amount
        ))

    db.commit()
    db.refresh(db_voucher)

    j_type, ref_no, rev_date, _ = _parse_journal_meta(db_voucher.narration)

    return schemas.JournalVoucherResponse(
        id=db_voucher.id,
        organization_id=db_voucher.organization_id,
        created_at=db_voucher.created_at,
        voucher_type=db_voucher.voucher_type,
        voucher_number=db_voucher.voucher_number,
        date=db_voucher.date,
        narration=db_voucher.narration,
        total_amount=db_voucher.total_amount,
        journal_type=j_type,
        reference_number=ref_no,
        scheduled_reversal_date=rev_date,
        status=db_voucher.status,
        fiscal_year_id=db_voucher.fiscal_year_id,
        reversal_voucher_id=db_voucher.reversal_voucher_id,
        reversal_voucher_number=None,
        entries=entry_responses
    )


@router.get("/journals", response_model=List[schemas.JournalVoucherResponse])
def get_journal_vouchers(
    journal_type: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    DOC-25: Query journal vouchers with classification filter, date range, and audit links.
    """
    org_id = get_org_id(current_user)

    query = db.query(models.Voucher).filter(
        models.Voucher.organization_id == org_id,
        models.Voucher.voucher_type == "Journal",
        models.Voucher.is_active == True
    )

    if status:
        query = query.filter(models.Voucher.status == status)

    if start_date:
        query = query.filter(models.Voucher.date >= datetime.fromisoformat(start_date))
    if end_date:
        query = query.filter(models.Voucher.date <= datetime.fromisoformat(end_date))

    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            or_(
                models.Voucher.voucher_number.ilike(search_filter),
                models.Voucher.narration.ilike(search_filter)
            )
        )

    vouchers = query.order_by(models.Voucher.date.desc(), models.Voucher.created_at.desc()).offset(skip).limit(limit).all()

    # Preload reversal numbers if any
    rev_ids = [v.reversal_voucher_id for v in vouchers if v.reversal_voucher_id]
    rev_map = {}
    if rev_ids:
        rev_records = db.query(models.Voucher.id, models.Voucher.voucher_number).filter(models.Voucher.id.in_(rev_ids)).all()
        rev_map = {r[0]: r[1] for r in rev_records}

    results = []
    for v in vouchers:
        j_type, ref_no, rev_date, _ = _parse_journal_meta(v.narration)
        
        # Filter by journal_type if specified
        if journal_type and journal_type != "All" and j_type != journal_type:
            continue

        entries_list = [
            schemas.JournalEntryLineResponse(
                id=e.id,
                voucher_id=e.voucher_id,
                ledger_id=e.ledger_id,
                ledger_name=e.ledger_name,
                cr_dr=e.cr_dr,
                amount=e.amount
            ) for e in v.entries
        ]

        results.append(schemas.JournalVoucherResponse(
            id=v.id,
            organization_id=v.organization_id,
            created_at=v.created_at,
            voucher_type=v.voucher_type,
            voucher_number=v.voucher_number,
            date=v.date,
            narration=v.narration,
            total_amount=v.total_amount,
            journal_type=j_type,
            reference_number=ref_no,
            scheduled_reversal_date=rev_date,
            status=v.status,
            fiscal_year_id=v.fiscal_year_id,
            reversal_voucher_id=v.reversal_voucher_id,
            reversal_voucher_number=rev_map.get(v.reversal_voucher_id),
            entries=entries_list
        ))

    return results


@router.post("/journal/{voucher_id}/reverse", response_model=schemas.JournalVoucherResponse)
def reverse_journal_voucher(
    voucher_id: UUID,
    payload: schemas.JournalReverseRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    DOC-25: Traceable One-Click Journal Reversal.
    Creates an inverted double-entry Journal Voucher (Dr -> Cr, Cr -> Dr),
    updates per-FY ledger balances, and cross-references original & reversal vouchers.
    """
    org_id = get_org_id(current_user)

    original = db.query(models.Voucher).filter(
        models.Voucher.id == voucher_id,
        models.Voucher.organization_id == org_id,
        models.Voucher.voucher_type == "Journal"
    ).first()

    if not original:
        raise HTTPException(status_code=404, detail="Original journal voucher not found.")

    if original.status != "Active":
        raise HTTPException(status_code=400, detail=f"Cannot reverse voucher with status '{original.status}'.")

    fy = get_active_fiscal_year(db, org_id, original.fiscal_year_id)
    if not fy:
        raise HTTPException(status_code=400, detail="No active fiscal year found.")
    if fy.is_locked:
        raise HTTPException(status_code=400, detail=f"Fiscal year {fy.name} is locked. Cannot post reversal.")

    # Generate sequential voucher number for reversal
    rev_number = _get_next_voucher_number(db, org_id, "Journal", fy.id)
    reversal_date = payload.reversal_date or datetime.utcnow()
    reason_note = payload.reason or "Period-end adjustment reversal"

    rev_narration = f"[Reversal of {original.voucher_number}] {reason_note}"

    # Create reversal voucher
    reversal_voucher = models.Voucher(
        organization_id=org_id,
        voucher_type="Journal",
        voucher_number=rev_number,
        date=reversal_date,
        narration=rev_narration,
        total_amount=original.total_amount,
        is_active=True,
        status="Active",
        fiscal_year_id=fy.id,
        reversal_voucher_id=original.id
    )
    db.add(reversal_voucher)
    db.flush()

    # Invert each entry and update ledger balances
    rev_entries = []
    for orig_entry in original.entries:
        inverted_cr_dr = "Cr" if orig_entry.cr_dr == "Dr" else "Dr"
        
        db_rev_entry = models.VoucherEntry(
            voucher_id=reversal_voucher.id,
            ledger_id=orig_entry.ledger_id,
            cr_dr=inverted_cr_dr,
            amount=orig_entry.amount,
            ledger_name=orig_entry.ledger_name
        )
        db.add(db_rev_entry)
        db.flush()

        # Update balance with inverted Cr/Dr
        _update_ledger_balance(db, org_id, orig_entry.ledger_id, fy.id, inverted_cr_dr, orig_entry.amount)

        rev_entries.append(schemas.JournalEntryLineResponse(
            id=db_rev_entry.id,
            voucher_id=reversal_voucher.id,
            ledger_id=db_rev_entry.ledger_id,
            ledger_name=db_rev_entry.ledger_name,
            cr_dr=db_rev_entry.cr_dr,
            amount=db_rev_entry.amount
        ))

    # Mark original voucher as Reversed and link to reversal voucher
    original.status = "Reversed"
    original.reversal_voucher_id = reversal_voucher.id
    original.cancelled_at = datetime.utcnow()
    original.cancelled_by = current_user.id
    db.add(original)

    db.commit()
    db.refresh(reversal_voucher)

    return schemas.JournalVoucherResponse(
        id=reversal_voucher.id,
        organization_id=reversal_voucher.organization_id,
        created_at=reversal_voucher.created_at,
        voucher_type=reversal_voucher.voucher_type,
        voucher_number=reversal_voucher.voucher_number,
        date=reversal_voucher.date,
        narration=reversal_voucher.narration,
        total_amount=reversal_voucher.total_amount,
        journal_type="Reversal",
        reference_number=original.voucher_number,
        scheduled_reversal_date=None,
        status=reversal_voucher.status,
        fiscal_year_id=reversal_voucher.fiscal_year_id,
        reversal_voucher_id=original.id,
        reversal_voucher_number=original.voucher_number,
        entries=rev_entries
    )

