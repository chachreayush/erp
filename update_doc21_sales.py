import os

path = 'backend/api/sales.py'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update create_invoice stock deduction to HANDLE CREDIT_NOTE
target_stock = """        # Deduct stock
        product = db.query(models.Product).filter(models.Product.id == item.product_id).first()
        if product:
            if not product.stock:
                product.stock = 0
            product.stock -= item.quantity
            db.add(product)"""

replacement_stock = """        # Handle Stock Impact
        product = db.query(models.Product).filter(models.Product.id == item.product_id).first()
        if product:
            if not product.stock:
                product.stock = 0
            
            # DOC-21: Sales Return adds stock BACK to inventory
            if invoice_data.invoice_type == "credit_note":
                product.stock += item.quantity
            else:
                product.stock -= item.quantity
                
            db.add(product)"""

if "DOC-21: Sales Return adds stock BACK to inventory" not in content:
    content = content.replace(target_stock, replacement_stock)

# 2. Add DOC-21 returned_qty tracking
target_return_tracking = """        # --- DOC-19 Sales Order Allocation Update ---
        if item.source_order_item_id:"""

replacement_return_tracking = """        # --- DOC-21 Sales Return Update ---
        if item.source_invoice_item_id:
            source_item = db.query(models.InvoiceItem).filter(models.InvoiceItem.id == item.source_invoice_item_id).first()
            if source_item:
                source_item.returned_qty += item.quantity
                db.add(source_item)

        # --- DOC-19 Sales Order Allocation Update ---
        if item.source_order_item_id:"""

if "DOC-21 Sales Return Update" not in content:
    content = content.replace(target_return_tracking, replacement_return_tracking)

# 3. Create GET endpoint to fetch a single invoice by number
target_endpoints = """@router.get("/invoice", response_model=List[schemas.InvoiceResponse])"""

replacement_endpoints = """@router.get("/invoice/by-number/{invoice_number}", response_model=schemas.InvoiceResponse)
def get_invoice_by_number(invoice_number: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    invoice = db.query(models.Invoice).filter(
        models.Invoice.organization_id == current_user.organization_id,
        models.Invoice.invoice_number == invoice_number,
        models.Invoice.is_active == True
    ).first()
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
        
    return invoice

@router.get("/invoice", response_model=List[schemas.InvoiceResponse])"""

if "by-number/{invoice_number}" not in content:
    content = content.replace(target_endpoints, replacement_endpoints)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated sales.py for DOC-21 successfully")
