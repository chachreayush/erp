import os

path = 'backend/api/finance_v2.py'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

imports_to_add = """from fastapi import UploadFile, File, Form
import csv
import io
from dateutil import parser as date_parser
"""

if "import csv" not in content:
    content = content.replace("from fastapi import APIRouter", imports_to_add + "from fastapi import APIRouter")

routes_to_add = """
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
"""

if "5. Bank Reconciliation (DOC-28)" not in content:
    content += "\n" + routes_to_add
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Added Bank Reconcilation routes to finance_v2.py")
else:
    print("Routes already exist in finance_v2.py")
