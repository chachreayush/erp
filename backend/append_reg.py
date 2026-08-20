from datetime import datetime
text = '''
from datetime import datetime

class RegisterEntry(BaseModel):
    date: str
    invoice_number: str
    party_name: str
    invoice_type: str
    inward: int
    outward: int
    running_balance: int

class RegisterResponse(BaseModel):
    product_name: str
    total_inward: int
    total_outward: int
    total_value: float
    entries: List[RegisterEntry]

@router.get("/{product_id}/register", response_model=RegisterResponse)
def get_product_register(
    product_id: UUID,
    stock_type: str = Query("main"),  # "main" or "brk-exp"
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    org_id = current_user.organization_id
    
    product = db.query(models.Product).filter(
        models.Product.id == product_id,
        models.Product.organization_id == org_id
    ).first()
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Fetch all active invoice items for this product
    items = db.query(models.InvoiceItem).join(
        models.Invoice, models.InvoiceItem.invoice_id == models.Invoice.id
    ).filter(
        models.InvoiceItem.product_id == product_id,
        models.Invoice.organization_id == org_id,
        models.Invoice.is_active == True
    ).order_by(
        models.Invoice.date.asc(),
        models.Invoice.created_at.asc()
    ).all()

    entries = []
    running_balance = 0
    total_inward = 0
    total_outward = 0

    main_inward_types = ["purchase-bill", "purchase-challan", "sales-return-credit", "sales-return-challan", "stock-receive-entry"]
    main_outward_types = ["sales-bill", "sales-challan", "purchase-return-debit", "purchase-return-challan", "stock-issue-entry"]

    brk_inward_types = ["brk-receive-bill", "brk-receive-challan"]
    brk_outward_types = ["brk-issue-bill", "brk-issue-challan"]

    inward_types = main_inward_types if stock_type == "main" else brk_inward_types
    outward_types = main_outward_types if stock_type == "main" else brk_outward_types

    for item in items:
        inv_type = item.invoice.invoice_type
        
        is_inward = any(inv_type == t for t in inward_types)
        is_outward = any(inv_type == t for t in outward_types)

        if not is_inward and not is_outward:
            continue
            
        inward_qty = item.quantity if is_inward else 0
        outward_qty = item.quantity if is_outward else 0
        
        running_balance += inward_qty
        running_balance -= outward_qty
        
        total_inward += inward_qty
        total_outward += outward_qty
        
        entries.append(RegisterEntry(
            date=item.invoice.date.strftime("%d/%m/%Y"),
            invoice_number=item.invoice.invoice_number,
            party_name=item.invoice.customer_name,
            invoice_type=inv_type,
            inward=inward_qty,
            outward=outward_qty,
            running_balance=running_balance
        ))
        
    # Calculate Total Value from batches
    batches = db.query(models.Batch).filter(
        models.Batch.product_id == product_id,
        models.Batch.organization_id == org_id
    ).all()
    
    total_value = 0.0
    for b in batches:
        stock = b.current_stock if stock_type == "main" else b.brk_exp_stock
        rate = float(b.rate or 0.0)
        total_value += (stock * rate)

    return RegisterResponse(
        product_name=product.name,
        total_inward=total_inward,
        total_outward=total_outward,
        total_value=total_value,
        entries=entries
    )
'''
with open(r'C:\Users\DELL\OneDrive\Desktop\erp\backend\api\stock.py', 'a', encoding='utf-8') as f:
    f.write(text)
