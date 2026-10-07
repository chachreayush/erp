with open("backend/api/finance_v2.py", "a", encoding="utf-8") as f:
    f.write("""
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
""")
