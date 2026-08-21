import sys
sys.path.append(r'C:\Users\DELL\OneDrive\Desktop\erp\backend')

from database import SessionLocal
import models
from sqlalchemy import asc

db = SessionLocal()

print("Starting full database stock repair...")

# 1. Zero out all batch stock
batches = db.query(models.Batch).all()
print(f"Zeroing out {len(batches)} batches...")
for b in batches:
    b.current_stock = 0
    b.brk_exp_stock = 0
db.commit()

# 2. Get all active invoices, ordered chronologically
# We sort by date, then created_at to ensure true insertion order
invoices = db.query(models.Invoice).filter(
    models.Invoice.is_active == True
).order_by(
    asc(models.Invoice.date),
    asc(models.Invoice.created_at)
).all()

print(f"Found {len(invoices)} active invoices. Replaying transactions...")

for invoice in invoices:
    invoice_type = invoice.invoice_type
    
    is_brk = invoice_type.startswith("brk-")
    is_addition = True
    if invoice_type.startswith("sales-bill") or invoice_type.startswith("sales-challan") or invoice_type.startswith("purchase-return") or invoice_type.startswith("stock-issue") or invoice_type.startswith("brk-issue"):
        is_addition = False
        
    stock_attr = "brk_exp_stock" if is_brk else "current_stock"
    
    # Process each item in the invoice
    items = db.query(models.InvoiceItem).filter(models.InvoiceItem.invoice_id == invoice.id).all()
    
    for item in items:
        if not item.product_id or not item.batch:
            continue
            
        batch = db.query(models.Batch).filter(
            models.Batch.organization_id == invoice.organization_id,
            models.Batch.product_id == item.product_id,
            models.Batch.batch_number == item.batch
        ).first()
        
        if batch:
            batch_stock = getattr(batch, stock_attr)
            if is_addition:
                setattr(batch, stock_attr, batch_stock + item.quantity)
            else:
                setattr(batch, stock_attr, batch_stock - item.quantity)
        else:
            print(f"WARNING: Batch {item.batch} for product {item.product_id} not found during replay.")

db.commit()
print("Stock repair completed successfully!")
