with open("backend/api/assets.py", "r", encoding="utf-8") as f:
    code = f.read()

target = """    new_voucher = models.Voucher(
        organization_id=org_id,
        fiscal_year_id=fy.id,
        voucher_type='Journal',
        voucher_number=v_num,
        date=req.run_date,
        narration=req.notes or f"Depreciation for Asset: {asset.name}",
        total_amount=actual_depreciation,
        status='Active',
        created_by=current_user.id
    )"""

replacement = """    new_voucher = models.Voucher(
        organization_id=org_id,
        fiscal_year_id=fy.id,
        voucher_type='Journal',
        voucher_number=v_num,
        date=req.run_date,
        narration=req.notes or f"Depreciation for Asset: {asset.name}",
        total_amount=actual_depreciation,
        status='Active'
    )"""

code = code.replace(target, replacement)

with open("backend/api/assets.py", "w", encoding="utf-8") as f:
    f.write(code)
