import sys
import os
import uuid
import random
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from database import SessionLocal
import models

def run():
    db = SessionLocal()
    try:
        org = db.query(models.Organization).first()
        if not org:
            print("No organizations found.")
            return

        print(f"Seeding sales for organization: {org.name}")
        
        # Sundry Debtors (Customers)
        customers = db.query(models.Ledger).filter(
            models.Ledger.organization_id == org.id,
            models.Ledger.group_name == "Sundry Debtors"
        ).all()
        
        if not customers:
            print("No Sundry Debtors found. Create them first.")
            return
            
        # Get all batches with stock > 0
        available_batches = db.query(models.Batch).filter(
            models.Batch.organization_id == org.id,
            models.Batch.current_stock > 0
        ).all()
        
        if not available_batches:
            print("No batches with stock available.")
            return

        new_invoices = []
        new_items = []
        
        for i in range(1, 26):
            customer = random.choice(customers)
            invoice_id = uuid.uuid4()
            
            # Select 1 to 4 random batches
            num_items = random.randint(1, min(4, len(available_batches)))
            selected_batches = random.sample(available_batches, num_items)
            
            subtotal = 0.0
            tax_total = 0.0
            
            for b in selected_batches:
                # get product for this batch
                p = db.query(models.Product).filter(models.Product.id == b.product_id).first()
                if not p:
                    continue
                
                # Sell between 1 and 5 items, not exceeding current stock
                qty = random.randint(1, min(5, b.current_stock))
                if qty <= 0:
                    continue
                
                # Calculate item taxes based on sale rate (rate_a)
                sale_rate = float(b.rate_a) if b.rate_a else float(p.rate_a) if p.rate_a else float(p.mrp)
                item_total = sale_rate * qty
                item_tax = item_total * (float(p.igst_percent) / 100.0)
                
                subtotal += item_total
                tax_total += item_tax
                
                # Create invoice item
                item_id = uuid.uuid4()
                inv_item = models.InvoiceItem(
                    id=item_id,
                    invoice_id=invoice_id,
                    product_id=p.id,
                    product_name=p.name,
                    quantity=qty,
                    rate=sale_rate,
                    batch=b.batch_number,
                    expiry=b.expiry,
                    mrp=b.mrp,
                    discount_percent=0.0,
                    margin_percent="0",
                    igst_percent=p.igst_percent,
                    line_total=item_total
                )
                new_items.append(inv_item)
                
                # Deduct stock
                b.current_stock -= qty
            
            # Create Invoice
            inv = models.Invoice(
                id=invoice_id,
                organization_id=org.id,
                invoice_type="sales-bill",
                invoice_number=f"INV-{(datetime.utcnow().year)}-{i:04d}",
                date=datetime.utcnow() - timedelta(days=random.randint(0, 30)),
                customer_name=customer.name,
                party_inv_no="",
                party_inv_date=None,
                due_date=(datetime.utcnow() + timedelta(days=random.randint(0, 30))).strftime("%Y-%m-%d"),
                subtotal=subtotal,
                tax_total=tax_total,
                grand_total=subtotal + tax_total,
                created_at=datetime.utcnow(),
                is_active=True
            )
            new_invoices.append(inv)

        db.bulk_save_objects(new_invoices)
        db.bulk_save_objects(new_items)
        # Batches are already in session, so just commit
        
        db.commit()
        
        print(f"Successfully seeded 25 sales invoices and {len(new_items)} items.")
        
    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    run()
