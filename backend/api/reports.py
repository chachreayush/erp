# ============================================================
# reports.py — Reports API Router
# ============================================================
# Provides reporting endpoints:
#   - Party Ledger (delegates to existing ledger-statement logic)
#   - Trial Balance (delegates to existing finance_v2 logic)
#   - Outstanding Ageing (new — calculates unpaid invoice age buckets)
# ============================================================

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, and_, case
from typing import Optional
from uuid import UUID
from datetime import datetime, date, timedelta
from decimal import Decimal

import models
import schemas
from database import get_db
from auth.router import get_current_user

router = APIRouter()


def get_org_id(current_user):
    return current_user.organization_id


# =============================================
# PARTY LEDGER REPORT
# =============================================
@router.get("/party-ledger/{ledger_id}")
def get_party_ledger(
    ledger_id: UUID,
    from_date: str = Query(..., description="Start date YYYY-MM-DD"),
    to_date: str = Query(..., description="End date YYYY-MM-DD"),
    fiscal_year_id: Optional[UUID] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Returns all voucher entries for a specific ledger,
    ordered by date, with a running balance.
    This is effectively a party-specific ledger statement.
    """
    org_id = get_org_id(current_user)

    # Verify ledger belongs to this org
    ledger = db.query(models.Ledger).filter(
        models.Ledger.id == ledger_id,
        models.Ledger.organization_id == org_id
    ).first()
    if not ledger:
        raise HTTPException(status_code=404, detail="Ledger not found")

    start = datetime.strptime(from_date, "%Y-%m-%d")
    end = datetime.strptime(to_date, "%Y-%m-%d").replace(hour=23, minute=59, second=59)

    # Build base query
    query = db.query(models.VoucherEntry).join(
        models.Voucher, models.VoucherEntry.voucher_id == models.Voucher.id
    ).filter(
        models.VoucherEntry.ledger_id == ledger_id,
        models.Voucher.organization_id == org_id,
        models.Voucher.date >= start,
        models.Voucher.date <= end,
        models.Voucher.status == 'Active'
    )

    if fiscal_year_id:
        query = query.filter(models.Voucher.fiscal_year_id == fiscal_year_id)

    query = query.order_by(models.Voucher.date, models.Voucher.created_at)

    entries = query.all()

    # Calculate running balance
    # Start with opening balance
    opening_balance = float(ledger.opening_balance or 0)
    opening_type = ledger.op_type or 'Dr'

    # Convert opening to signed value (Dr = positive, Cr = negative)
    running = opening_balance if opening_type == 'Dr' else -opening_balance

    result_entries = []
    total_dr = Decimal('0')
    total_cr = Decimal('0')

    for entry in entries:
        voucher = entry.voucher

        # Get contra-ledger names (all other ledgers in this voucher)
        contra_entries = [e for e in voucher.entries if str(e.ledger_id) != str(ledger_id)]
        particulars = ', '.join([e.ledger_name or 'Unknown' for e in contra_entries]) or 'Self'

        dr_amount = None
        cr_amount = None

        if entry.cr_dr == 'Dr':
            dr_amount = float(entry.amount)
            running += float(entry.amount)
            total_dr += entry.amount
        else:
            cr_amount = float(entry.amount)
            running -= float(entry.amount)
            total_cr += entry.amount

        result_entries.append({
            "date": voucher.date.isoformat(),
            "voucher_id": str(voucher.id),
            "voucher_number": voucher.voucher_number,
            "voucher_type": voucher.voucher_type,
            "particulars": particulars,
            "dr_amount": dr_amount,
            "cr_amount": cr_amount,
            "running_balance": abs(running),
            "balance_type": "Dr" if running >= 0 else "Cr"
        })

    closing_balance = abs(running)
    closing_type = "Dr" if running >= 0 else "Cr"

    return {
        "ledger_id": str(ledger_id),
        "ledger_name": ledger.name,
        "from_date": from_date,
        "to_date": to_date,
        "opening_balance": opening_balance,
        "opening_type": opening_type,
        "entries": result_entries,
        "closing_balance": closing_balance,
        "closing_type": closing_type,
        "total_dr": float(total_dr),
        "total_cr": float(total_cr)
    }


# =============================================
# TRIAL BALANCE
# =============================================
@router.get("/trial-balance")
def get_trial_balance(
    as_of_date: Optional[str] = None,
    fiscal_year_id: Optional[UUID] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Calculates the closing balance of all active ledgers,
    grouped by their Ledger Group.
    """
    org_id = get_org_id(current_user)

    # Get active fiscal year if not specified
    fy = None
    if fiscal_year_id:
        fy = db.query(models.FiscalYear).filter(
            models.FiscalYear.id == fiscal_year_id,
            models.FiscalYear.organization_id == org_id
        ).first()
    else:
        fy = db.query(models.FiscalYear).filter(
            models.FiscalYear.organization_id == org_id,
            models.FiscalYear.is_active == True
        ).first()

    # Get all active ledgers for this org
    ledgers = db.query(models.Ledger).outerjoin(
        models.LedgerGroup, models.Ledger.group_id == models.LedgerGroup.id
    ).filter(
        models.Ledger.organization_id == org_id,
        models.Ledger.is_active == True
    ).all()

    # Build date filter
    end_date = None
    if as_of_date:
        end_date = datetime.strptime(as_of_date, "%Y-%m-%d").replace(hour=23, minute=59, second=59)

    rows = []
    grand_dr = Decimal('0')
    grand_cr = Decimal('0')

    for ledger in ledgers:
        # Get sum of debits and credits for this ledger
        query = db.query(
            func.coalesce(
                func.sum(case(
                    (models.VoucherEntry.cr_dr == 'Dr', models.VoucherEntry.amount),
                    else_=Decimal('0')
                )), Decimal('0')
            ).label('total_dr'),
            func.coalesce(
                func.sum(case(
                    (models.VoucherEntry.cr_dr == 'Cr', models.VoucherEntry.amount),
                    else_=Decimal('0')
                )), Decimal('0')
            ).label('total_cr')
        ).join(
            models.Voucher, models.VoucherEntry.voucher_id == models.Voucher.id
        ).filter(
            models.VoucherEntry.ledger_id == ledger.id,
            models.Voucher.status == 'Active'
        )

        if end_date:
            query = query.filter(models.Voucher.date <= end_date)
        if fy:
            query = query.filter(models.Voucher.fiscal_year_id == fy.id)

        result = query.first()
        txn_dr = result.total_dr if result else Decimal('0')
        txn_cr = result.total_cr if result else Decimal('0')

        # Add opening balance
        opening = Decimal(str(ledger.opening_balance or 0))
        if ledger.op_type == 'Dr':
            txn_dr += opening
        else:
            txn_cr += opening

        # Calculate closing
        if txn_dr >= txn_cr:
            closing = txn_dr - txn_cr
            balance_type = 'Dr'
        else:
            closing = txn_cr - txn_dr
            balance_type = 'Cr'

        # Skip zero-balance ledgers
        if closing == 0 and txn_dr == 0 and txn_cr == 0:
            continue

        grand_dr += txn_dr
        grand_cr += txn_cr

        group_name = None
        if ledger.ledger_group:
            group_name = ledger.ledger_group.name
        elif ledger.group_name:
            group_name = ledger.group_name

        rows.append({
            "ledger_id": str(ledger.id),
            "ledger_name": ledger.name,
            "group_name": group_name,
            "dr_total": float(txn_dr),
            "cr_total": float(txn_cr),
            "closing_balance": float(closing),
            "balance_type": balance_type
        })

    # Sort by group then name
    rows.sort(key=lambda r: (r["group_name"] or "", r["ledger_name"]))

    return {
        "as_of_date": as_of_date or datetime.utcnow().strftime("%Y-%m-%d"),
        "fiscal_year_name": fy.name if fy else None,
        "rows": rows,
        "grand_dr_total": float(grand_dr),
        "grand_cr_total": float(grand_cr)
    }


# =============================================
# OUTSTANDING AGEING REPORT
# =============================================
@router.get("/outstanding-ageing")
def get_outstanding_ageing(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Calculates unpaid invoices grouped by age:
    0-30 days, 31-60 days, 61-90 days, 90+ days.
    Based on invoice grand_total vs received payments.
    """
    org_id = get_org_id(current_user)
    today = date.today()

    # Get all active invoices
    invoices = db.query(models.Invoice).filter(
        models.Invoice.organization_id == org_id,
        models.Invoice.is_active == True
    ).all()

    ageing_data = []

    for inv in invoices:
        grand_total = float(inv.grand_total or 0)
        if grand_total <= 0:
            continue

        # Check if there's a linked voucher that settles this invoice
        linked_receipts = db.query(
            func.coalesce(func.sum(models.Voucher.total_amount), Decimal('0'))
        ).filter(
            models.Voucher.ref_invoice_id == inv.id,
            models.Voucher.status == 'Active',
            models.Voucher.voucher_type.in_(['Receipt', 'Payment'])
        ).scalar()

        paid = float(linked_receipts or 0)
        outstanding = grand_total - paid

        if outstanding <= 0:
            continue

        # Calculate age
        inv_date = inv.date.date() if isinstance(inv.date, datetime) else inv.date
        age_days = (today - inv_date).days

        if age_days <= 30:
            bucket = '0-30'
        elif age_days <= 60:
            bucket = '31-60'
        elif age_days <= 90:
            bucket = '61-90'
        else:
            bucket = '90+'

        ageing_data.append({
            "invoice_id": str(inv.id),
            "invoice_number": inv.invoice_number,
            "invoice_type": inv.invoice_type,
            "customer_name": inv.customer_name,
            "date": inv_date.isoformat(),
            "grand_total": grand_total,
            "paid": paid,
            "outstanding": outstanding,
            "age_days": age_days,
            "bucket": bucket
        })

    # Sort by age (oldest first)
    ageing_data.sort(key=lambda x: -x["age_days"])

    # Summary by bucket
    summary = {}
    for bucket_name in ['0-30', '31-60', '61-90', '90+']:
        items = [d for d in ageing_data if d["bucket"] == bucket_name]
        summary[bucket_name] = {
            "count": len(items),
            "total_outstanding": sum(d["outstanding"] for d in items)
        }

    return {
        "as_of_date": today.isoformat(),
        "total_outstanding": sum(d["outstanding"] for d in ageing_data),
        "total_invoices": len(ageing_data),
        "summary": summary,
        "details": ageing_data
    }
