from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from decimal import Decimal
from datetime import datetime
from collections import defaultdict

import models
import schemas
from database import get_db
from auth.router import get_current_user

def get_org_id(user: models.User) -> UUID:
    if not user.organization_id:
        raise HTTPException(status_code=400, detail="User is not assigned to an organization")
    return user.organization_id

from api.finance_v2 import get_active_fiscal_year, _get_next_voucher_number

router = APIRouter(prefix="/api/assets", tags=["Assets"])


def ensure_statutory_asset_setup(db: Session, org_id: UUID):
    """
    Ensures essential Fixed Asset General Ledgers and statutory Asset Categories exist
    under Companies Act 2013 / Income Tax block rates:
    - Computers & IT Hardware (WDV 40%)
    - Plant & Machinery (WDV 15%)
    - Furniture & Fixtures (WDV 10%)
    - Office Equipment (WDV 15%)
    - Motor Vehicles (WDV 15%)
    """
    # 1. Ensure Ledgers
    asset_gl = db.query(models.Ledger).filter(
        models.Ledger.organization_id == org_id,
        models.Ledger.name == "Fixed Assets (Gross Block) A/c"
    ).first()
    if not asset_gl:
        asset_gl = models.Ledger(
            organization_id=org_id,
            name="Fixed Assets (Gross Block) A/c",
            group_name="Fixed Assets",
            op_type="Dr",
            opening_balance=Decimal("0.00"),
            closing_balance=Decimal("0.00")
        )
        db.add(asset_gl)
        db.flush()

    acc_dep_gl = db.query(models.Ledger).filter(
        models.Ledger.organization_id == org_id,
        models.Ledger.name == "Accumulated Depreciation A/c"
    ).first()
    if not acc_dep_gl:
        acc_dep_gl = models.Ledger(
            organization_id=org_id,
            name="Accumulated Depreciation A/c",
            group_name="Fixed Assets",
            op_type="Cr",
            opening_balance=Decimal("0.00"),
            closing_balance=Decimal("0.00")
        )
        db.add(acc_dep_gl)
        db.flush()

    dep_exp_gl = db.query(models.Ledger).filter(
        models.Ledger.organization_id == org_id,
        models.Ledger.name == "Depreciation Expense A/c"
    ).first()
    if not dep_exp_gl:
        dep_exp_gl = models.Ledger(
            organization_id=org_id,
            name="Depreciation Expense A/c",
            group_name="Indirect Expenses",
            op_type="Dr",
            opening_balance=Decimal("0.00"),
            closing_balance=Decimal("0.00")
        )
        db.add(dep_exp_gl)
        db.flush()

    pnl_sale_gl = db.query(models.Ledger).filter(
        models.Ledger.organization_id == org_id,
        models.Ledger.name == "Loss / (Gain) on Sale of Assets A/c"
    ).first()
    if not pnl_sale_gl:
        pnl_sale_gl = models.Ledger(
            organization_id=org_id,
            name="Loss / (Gain) on Sale of Assets A/c",
            group_name="Indirect Expenses",
            op_type="Dr",
            opening_balance=Decimal("0.00"),
            closing_balance=Decimal("0.00")
        )
        db.add(pnl_sale_gl)
        db.flush()

    # 2. Ensure Categories
    standard_categories = [
        {"name": "Computers & IT Hardware", "depreciation_method": "WDV", "depreciation_rate": Decimal("40.0")},
        {"name": "Plant & Machinery", "depreciation_method": "WDV", "depreciation_rate": Decimal("15.0")},
        {"name": "Furniture & Fixtures", "depreciation_method": "WDV", "depreciation_rate": Decimal("10.0")},
        {"name": "Office Equipment", "depreciation_method": "WDV", "depreciation_rate": Decimal("15.0")},
        {"name": "Motor Vehicles", "depreciation_method": "WDV", "depreciation_rate": Decimal("15.0")},
    ]

    for cat_spec in standard_categories:
        existing = db.query(models.AssetCategory).filter(
            models.AssetCategory.organization_id == org_id,
            models.AssetCategory.name == cat_spec["name"]
        ).first()
        if not existing:
            new_cat = models.AssetCategory(
                organization_id=org_id,
                name=cat_spec["name"],
                depreciation_method=cat_spec["depreciation_method"],
                depreciation_rate=cat_spec["depreciation_rate"],
                asset_ledger_id=asset_gl.id,
                acc_depreciation_ledger_id=acc_dep_gl.id,
                depreciation_expense_ledger_id=dep_exp_gl.id
            )
            db.add(new_cat)
    db.commit()


@router.get("/summary", response_model=schemas.AssetSummaryResponse)
def get_asset_summary(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    org_id = get_org_id(current_user)
    ensure_statutory_asset_setup(db, org_id)

    assets = db.query(models.FixedAsset).filter(models.FixedAsset.organization_id == org_id).all()
    active_assets = [a for a in assets if a.status == "Active"]
    disposed_assets = [a for a in assets if a.status == "Disposed"]

    total_gross = sum(Decimal(a.purchase_value) for a in active_assets)
    total_net = sum(Decimal(a.current_net_block) for a in active_assets)
    total_accum_dep = total_gross - total_net

    categories_count = db.query(models.AssetCategory).filter(models.AssetCategory.organization_id == org_id).count()

    return schemas.AssetSummaryResponse(
        total_gross_block=float(total_gross),
        total_accumulated_depreciation=float(total_accum_dep),
        total_net_block=float(total_net),
        active_assets_count=len(active_assets),
        disposed_assets_count=len(disposed_assets),
        categories_count=categories_count
    )


@router.get("/categories", response_model=List[schemas.AssetCategoryResponse])
def get_asset_categories(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    org_id = get_org_id(current_user)
    ensure_statutory_asset_setup(db, org_id)
    return db.query(models.AssetCategory).filter(models.AssetCategory.organization_id == org_id).order_by(models.AssetCategory.name.asc()).all()


@router.post("/categories", response_model=schemas.AssetCategoryResponse)
def create_asset_category(cat: schemas.AssetCategoryCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    org_id = get_org_id(current_user)
    db_cat = models.AssetCategory(**cat.dict(), organization_id=org_id)
    db.add(db_cat)
    db.commit()
    db.refresh(db_cat)
    return db_cat


@router.get("/", response_model=List[schemas.FixedAssetResponse])
def get_assets(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    org_id = get_org_id(current_user)
    ensure_statutory_asset_setup(db, org_id)
    return db.query(models.FixedAsset).filter(models.FixedAsset.organization_id == org_id).order_by(models.FixedAsset.created_at.desc()).all()


@router.post("/", response_model=schemas.FixedAssetResponse)
def register_asset(asset: schemas.FixedAssetCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    org_id = get_org_id(current_user)
    ensure_statutory_asset_setup(db, org_id)
    db_asset = models.FixedAsset(**asset.dict(), organization_id=org_id, current_net_block=asset.purchase_value)
    db.add(db_asset)
    db.commit()
    db.refresh(db_asset)
    return db_asset


@router.get("/{asset_id}/depreciation-logs", response_model=List[schemas.DepreciationLogResponse])
def get_depreciation_logs(asset_id: UUID, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    org_id = get_org_id(current_user)
    return db.query(models.DepreciationLog).join(models.FixedAsset).filter(
        models.FixedAsset.id == asset_id,
        models.FixedAsset.organization_id == org_id
    ).order_by(models.DepreciationLog.run_date.desc()).all()


@router.post("/{asset_id}/depreciate", response_model=schemas.DepreciationLogResponse)
def run_depreciation(asset_id: UUID, req: schemas.DepreciationRunRequest, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    org_id = get_org_id(current_user)
    
    asset = db.query(models.FixedAsset).filter(models.FixedAsset.id == asset_id, models.FixedAsset.organization_id == org_id).with_for_update().first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
        
    if asset.status != "Active":
        raise HTTPException(status_code=400, detail="Cannot depreciate a disposed asset")
        
    category = asset.category
    if not category or not category.depreciation_rate or Decimal(category.depreciation_rate) <= 0:
        raise HTTPException(status_code=400, detail="Asset category has zero or invalid depreciation rate")
    
    annual_depreciation = Decimal(asset.current_net_block) * (Decimal(category.depreciation_rate) / Decimal(100))
    monthly_depreciation = annual_depreciation / Decimal(12)
    
    max_depreciation = Decimal(asset.current_net_block) - Decimal(asset.salvage_value)
    actual_depreciation = min(monthly_depreciation, max_depreciation)
    
    if actual_depreciation <= Decimal("0.01"):
        raise HTTPException(status_code=400, detail="Asset has reached salvage value or depreciation rate is zero")
        
    fy = get_active_fiscal_year(db, org_id)
    if not fy:
        raise HTTPException(status_code=400, detail="No active fiscal year found")
        
    v_num = _get_next_voucher_number(db, org_id, 'Journal', fy.id)
    run_date_val = req.run_date or datetime.utcnow()
    
    new_voucher = models.Voucher(
        organization_id=org_id,
        fiscal_year_id=fy.id,
        voucher_type='Journal',
        voucher_number=v_num,
        date=run_date_val,
        narration=req.notes or f"Depreciation for Fixed Asset: {asset.name} ({category.name})",
        total_amount=actual_depreciation,
        status='Active'
    )
    db.add(new_voucher)
    db.flush()
    
    # Debit Depreciation Expense Account (P&L Indirect Expenses)
    exp_ledger_name = db.query(models.Ledger.name).filter(models.Ledger.id == category.depreciation_expense_ledger_id).scalar() or "Depreciation Expense"
    db.add(models.VoucherEntry(
        voucher_id=new_voucher.id,
        ledger_id=category.depreciation_expense_ledger_id,
        cr_dr='Dr',
        amount=actual_depreciation,
        ledger_name=exp_ledger_name
    ))
    
    # Credit Accumulated Depreciation Account (Balance Sheet Contra-Asset)
    acc_ledger_name = db.query(models.Ledger.name).filter(models.Ledger.id == category.acc_depreciation_ledger_id).scalar() or "Accumulated Depreciation"
    db.add(models.VoucherEntry(
        voucher_id=new_voucher.id,
        ledger_id=category.acc_depreciation_ledger_id,
        cr_dr='Cr',
        amount=actual_depreciation,
        ledger_name=acc_ledger_name
    ))
    
    # Update Asset Net Block
    asset.current_net_block = Decimal(asset.current_net_block) - actual_depreciation
    
    # Create Log
    new_log = models.DepreciationLog(
        asset_id=asset.id,
        voucher_id=new_voucher.id,
        run_date=run_date_val,
        depreciation_amount=actual_depreciation,
        closing_net_block=asset.current_net_block,
        notes=req.notes or f"Depreciation voucher #{v_num}"
    )
    db.add(new_log)
    
    db.commit()
    db.refresh(new_log)
    return new_log


@router.post("/bulk-depreciate", response_model=schemas.BulkDepreciationResponse)
def bulk_run_depreciation(req: schemas.BulkDepreciationRequest, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    org_id = get_org_id(current_user)
    ensure_statutory_asset_setup(db, org_id)

    active_assets = db.query(models.FixedAsset).filter(
        models.FixedAsset.organization_id == org_id,
        models.FixedAsset.status == "Active"
    ).with_for_update().all()

    if not active_assets:
        return schemas.BulkDepreciationResponse(
            message="No active assets found for depreciation",
            total_depreciation=0.0,
            assets_processed=0
        )

    fy = get_active_fiscal_year(db, org_id)
    if not fy:
        raise HTTPException(status_code=400, detail="No active fiscal year found")

    total_dep_batch = Decimal("0.00")
    eligible_asset_logs = []

    for asset in active_assets:
        if Decimal(asset.current_net_block) <= Decimal(asset.salvage_value):
            continue

        cat = asset.category
        if not cat or not cat.depreciation_rate or Decimal(cat.depreciation_rate) <= 0:
            continue

        annual_dep = Decimal(asset.current_net_block) * (Decimal(cat.depreciation_rate) / Decimal(100))
        monthly_dep = annual_dep / Decimal(12)
        max_dep = Decimal(asset.current_net_block) - Decimal(asset.salvage_value)
        actual_dep = min(monthly_dep, max_dep)

        if actual_dep > Decimal("0.01"):
            total_dep_batch += actual_dep
            eligible_asset_logs.append((asset, actual_dep, cat))

    if not eligible_asset_logs or total_dep_batch <= Decimal("0.01"):
        return schemas.BulkDepreciationResponse(
            message="All assets are already depreciated to salvage value or have zero depreciation rate",
            total_depreciation=0.0,
            assets_processed=0
        )

    v_num = _get_next_voucher_number(db, org_id, 'Journal', fy.id)
    run_date_val = req.run_date or datetime.utcnow()

    new_voucher = models.Voucher(
        organization_id=org_id,
        fiscal_year_id=fy.id,
        voucher_type='Journal',
        voucher_number=v_num,
        date=run_date_val,
        narration=req.notes or f"Consolidated Bulk Depreciation for {len(eligible_asset_logs)} Fixed Assets",
        total_amount=total_dep_batch,
        status='Active'
    )
    db.add(new_voucher)
    db.flush()

    exp_sums = defaultdict(Decimal)
    acc_sums = defaultdict(Decimal)

    for asset, dep_amt, cat in eligible_asset_logs:
        exp_sums[cat.depreciation_expense_ledger_id] += dep_amt
        acc_sums[cat.acc_depreciation_ledger_id] += dep_amt

        asset.current_net_block = Decimal(asset.current_net_block) - dep_amt

        new_log = models.DepreciationLog(
            asset_id=asset.id,
            voucher_id=new_voucher.id,
            run_date=run_date_val,
            depreciation_amount=dep_amt,
            closing_net_block=asset.current_net_block,
            notes=f"Bulk run: {asset.name} ({cat.name})"
        )
        db.add(new_log)

    for led_id, amt in exp_sums.items():
        led_name = db.query(models.Ledger.name).filter(models.Ledger.id == led_id).scalar() or "Depreciation Expense"
        db.add(models.VoucherEntry(
            voucher_id=new_voucher.id,
            ledger_id=led_id,
            cr_dr='Dr',
            amount=amt,
            ledger_name=led_name
        ))

    for led_id, amt in acc_sums.items():
        led_name = db.query(models.Ledger.name).filter(models.Ledger.id == led_id).scalar() or "Accumulated Depreciation"
        db.add(models.VoucherEntry(
            voucher_id=new_voucher.id,
            ledger_id=led_id,
            cr_dr='Cr',
            amount=amt,
            ledger_name=led_name
        ))

    db.commit()

    return schemas.BulkDepreciationResponse(
        message=f"Successfully depreciated {len(eligible_asset_logs)} assets for ₹{total_dep_batch:.2f}",
        total_depreciation=float(total_dep_batch),
        assets_processed=len(eligible_asset_logs),
        voucher_number=v_num,
        voucher_id=new_voucher.id
    )


@router.post("/{asset_id}/dispose", response_model=schemas.AssetDisposalResponse)
def dispose_asset(asset_id: UUID, req: schemas.AssetDisposalRequest, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    org_id = get_org_id(current_user)
    asset = db.query(models.FixedAsset).filter(
        models.FixedAsset.id == asset_id,
        models.FixedAsset.organization_id == org_id
    ).with_for_update().first()

    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    if asset.status == "Disposed":
        raise HTTPException(status_code=400, detail="Asset is already disposed")

    cat = asset.category
    nbv = Decimal(asset.current_net_block)
    proceeds = Decimal(str(req.sale_proceeds or 0.0))
    gain_loss = proceeds - nbv

    fy = get_active_fiscal_year(db, org_id)
    if not fy:
        raise HTTPException(status_code=400, detail="No active fiscal year found")

    v_num = _get_next_voucher_number(db, org_id, 'Journal', fy.id)
    disp_date = req.disposal_date or datetime.utcnow()
    accum_dep = Decimal(asset.purchase_value) - nbv

    voucher = models.Voucher(
        organization_id=org_id,
        fiscal_year_id=fy.id,
        voucher_type='Journal',
        voucher_number=v_num,
        date=disp_date,
        narration=req.notes or f"Disposal of Asset: {asset.name} (NBV: ₹{nbv:.2f}, Proceeds: ₹{proceeds:.2f})",
        total_amount=Decimal(asset.purchase_value) if proceeds <= nbv else (Decimal(asset.purchase_value) + gain_loss),
        status='Active'
    )
    db.add(voucher)
    db.flush()

    if proceeds > Decimal("0.00") and req.settlement_ledger_id:
        settle_name = db.query(models.Ledger.name).filter(models.Ledger.id == req.settlement_ledger_id).scalar() or "Cash/Bank"
        db.add(models.VoucherEntry(
            voucher_id=voucher.id,
            ledger_id=req.settlement_ledger_id,
            cr_dr='Dr',
            amount=proceeds,
            ledger_name=settle_name
        ))

    if accum_dep > Decimal("0.00"):
        acc_name = db.query(models.Ledger.name).filter(models.Ledger.id == cat.acc_depreciation_ledger_id).scalar() or "Accumulated Depreciation"
        db.add(models.VoucherEntry(
            voucher_id=voucher.id,
            ledger_id=cat.acc_depreciation_ledger_id,
            cr_dr='Dr',
            amount=accum_dep,
            ledger_name=acc_name
        ))

    if gain_loss < Decimal("0.00"):
        loss_amt = abs(gain_loss)
        loss_ledger = db.query(models.Ledger).filter(models.Ledger.organization_id == org_id, models.Ledger.name == "Loss / (Gain) on Sale of Assets A/c").first()
        loss_id = loss_ledger.id if loss_ledger else cat.depreciation_expense_ledger_id
        db.add(models.VoucherEntry(
            voucher_id=voucher.id,
            ledger_id=loss_id,
            cr_dr='Dr',
            amount=loss_amt,
            ledger_name="Loss on Sale of Fixed Assets"
        ))
    elif gain_loss > Decimal("0.00"):
        gain_ledger = db.query(models.Ledger).filter(models.Ledger.organization_id == org_id, models.Ledger.name == "Loss / (Gain) on Sale of Assets A/c").first()
        gain_id = gain_ledger.id if gain_ledger else cat.depreciation_expense_ledger_id
        db.add(models.VoucherEntry(
            voucher_id=voucher.id,
            ledger_id=gain_id,
            cr_dr='Cr',
            amount=gain_loss,
            ledger_name="Gain on Sale of Fixed Assets"
        ))

    orig_cost = Decimal(asset.purchase_value)
    asset_gl_name = db.query(models.Ledger.name).filter(models.Ledger.id == cat.asset_ledger_id).scalar() or "Fixed Assets"
    db.add(models.VoucherEntry(
        voucher_id=voucher.id,
        ledger_id=cat.asset_ledger_id,
        cr_dr='Cr',
        amount=orig_cost,
        ledger_name=asset_gl_name
    ))

    asset.status = "Disposed"
    asset.current_net_block = Decimal("0.00")
    db.commit()

    return schemas.AssetDisposalResponse(
        asset_id=asset.id,
        sale_proceeds=float(proceeds),
        net_block_at_disposal=float(nbv),
        gain_or_loss=float(gain_loss),
        voucher_number=v_num,
        voucher_id=voucher.id,
        message=f"Asset '{asset.name}' disposed successfully. Voucher #{v_num} posted to General Ledger."
    )
