
with open('backend/api/sales.py', 'r', encoding='utf-8') as f:
    content = f.read()

target = '    org_id = current_user.organization_id\n    \n    # 1. Create the parent Invoice record with ALL fields'
replacement = '''    org_id = current_user.organization_id
    
    # Check if invoice already exists to perform UPSERT (modify-bill logic)
    existing_invoice = db.query(models.Invoice).filter(
        models.Invoice.organization_id == org_id,
        models.Invoice.invoice_type == invoice_data.invoice_type,
        models.Invoice.invoice_number == invoice_data.invoice_number,
        models.Invoice.is_active == True
    ).first()
    
    if existing_invoice:
        return update_invoice(existing_invoice.id, invoice_data, db, current_user)
    
    # 1. Create the parent Invoice record with ALL fields'''

if target in content:
    content = content.replace(target, replacement)
    with open('backend/api/sales.py', 'w', encoding='utf-8') as f:
        f.write(content)
    print('Successfully modified create_invoice!')
else:
    print('Target string not found!')

