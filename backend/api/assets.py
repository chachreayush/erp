from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from decimal import Decimal
from datetime import datetime

import models
import schemas
from database import get_db
from auth.router import get_current_user
def get_org_id(user: models.User) -> UUID:
    if not user.organization_id:
        raise HTTPException(status_code=400, detail="User is not assigned to an organization")
    return user.organization_id

from api.finance_v2 import get_active_fiscal_year

router = APIRouter(prefix="/api/assets", tags=["Assets"])

@router.get("/categories", response_model=List[schemas.AssetCategoryResponse])
def get_asset_categories(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    org_id = get_org_id(current_user)
    return db.query(models.AssetCategory).filter(models.AssetCategory.organization_id == org_id).all()

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
    return db.query(models.FixedAsset).filter(models.FixedAsset.organization_id == org_id).order_by(models.FixedAsset.created_at.desc()).all()

@router.post("/", response_model=schemas.FixedAssetResponse)
def register_asset(asset: schemas.FixedAssetCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    org_id = get_org_id(current_user)
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
    
    # Simple Depreciation calculation (monthly fraction)
    # Assumes rate is annual percentage. E.g. 10.0 = 10%
    annual_depreciation = Decimal(asset.current_net_block) * (Decimal(category.depreciation_rate) / Decimal(100))
    monthly_depreciation = annual_depreciation / Decimal(12)
    
    # Cap it at salvage value
    max_depreciation = Decimal(asset.current_net_block) - Decimal(asset.salvage_value)
    actual_depreciation = min(monthly_depreciation, max_depreciation)
    
    if actual_depreciation <= 0:
        raise HTTPException(status_code=400, detail="Asset has reached salvage value or depreciation rate is zero")
        
    # Generate Journal Voucher
    fy = get_active_fiscal_year(db, org_id)
    if not fy:
        raise HTTPException(status_code=400, detail="No active fiscal year found")
        
    # Build next voucher number for Journal
    from api.finance_v2 import _get_next_voucher_number
    v_num = _get_next_voucher_number(db, org_id, 'Journal', fy.id)
    
    new_voucher = models.Voucher(
        organization_id=org_id,
        fiscal_year_id=fy.id,
        voucher_type='Journal',
        voucher_number=v_num,
        date=req.run_date,
        narration=req.notes or f"Depreciation for Asset: {asset.name}",
        total_amount=actual_depreciation,
        status='Active'
    )
    db.add(new_voucher)
    db.flush()
    
    # Debit Depreciation Expense Account
    db.add(models.VoucherEntry(
        voucher_id=new_voucher.id,
        ledger_id=category.depreciation_expense_ledger_id,
        cr_dr='Dr',
        amount=actual_depreciation,
        ledger_name=db.query(models.Ledger.name).filter(models.Ledger.id == category.depreciation_expense_ledger_id).scalar()
    ))
    
    # Credit Accumulated Depreciation Account
    db.add(models.VoucherEntry(
        voucher_id=new_voucher.id,
        ledger_id=category.acc_depreciation_ledger_id,
        cr_dr='Cr',
        amount=actual_depreciation,
        ledger_name=db.query(models.Ledger.name).filter(models.Ledger.id == category.acc_depreciation_ledger_id).scalar()
    ))
    
    # Update Asset Net Block
    asset.current_net_block = Decimal(asset.current_net_block) - actual_depreciation
    
    # Create Log
    new_log = models.DepreciationLog(
        asset_id=asset.id,
        voucher_id=new_voucher.id,
        run_date=req.run_date,
        depreciation_amount=actual_depreciation,
        closing_net_block=asset.current_net_block,
        notes=req.notes
    )
    db.add(new_log)
    
    db.commit()
    db.refresh(new_log)
    return new_log
