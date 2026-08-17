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

        print(f"Seeding purchases for organization: {org.name}")
        
        suppliers = db.query(models.Ledger).filter(
            models.Ledger.organization_id == org.id,
            models.Ledger.group_name == "Sundry Creditors"
        ).all()
        
        if not suppliers:
            print("No Sundry Creditors found. Create them first.")
            return
            
        products = db.query(models.Product).filter_by(organization_id=org.id).all()
        if not products:
            print("No products found.")
            return

        new_invoices = []
        new_items = []
        new_batches = []
        
        for i in range(1, 51):
            supplier = random.choice(suppliers)
            invoice_id = uuid.uuid4()
            
            # Select 2 to 6 random products
            num_items = random.randint(2, 6)
            selected_products = random.sample(products, num_items)
            
            subtotal = 0.0
            tax_total = 0.0
            
            for p in selected_products:
                qty = random.randint(10, 500)
                batch_number = f"B{random.randint(1000, 9999)}"
                expiry_date = (datetime.utcnow() + timedelta(days=random.randint(180, 1000))).strftime("%m/%y")
                
                # Create a batch
                batch = models.Batch(
                    id=uuid.uuid4(),
                    organization_id=org.id,
                    product_id=p.id,
                    batch_number=batch_number,
                    expiry=expiry_date,
                    mrp=p.mrp,
                    rate=p.p_rate,
                    rate_a=p.rate_a,
                    rate_b=p.rate_a,
                    rate_c=p.rate_a,
                    cost=p.p_rate,
                    current_stock=qty,
                    created_at=datetime.utcnow()
                )
                new_batches.append(batch)
                
                # Calculate item taxes
                item_total = float(p.p_rate) * qty
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
                    rate=p.p_rate,
                    batch=batch_number,
                    expiry=expiry_date,
                    mrp=p.mrp,
                    discount_percent=0.0,
                    margin_percent="0",
                    igst_percent=p.igst_percent,
                    line_total=item_total
                )
                new_items.append(inv_item)
            
            # Create Invoice
            inv = models.Invoice(
                id=invoice_id,
                organization_id=org.id,
                invoice_type="purchase",
                invoice_number=f"PUR-{(datetime.utcnow().year)}-{i:04d}",
                date=datetime.utcnow() - timedelta(days=random.randint(0, 30)),
                customer_name=supplier.name,
                party_inv_no=f"SUP-{random.randint(10000, 99999)}",
                party_inv_date=(datetime.utcnow() - timedelta(days=random.randint(1, 35))).strftime("%Y-%m-%d"),
                due_date=(datetime.utcnow() + timedelta(days=random.randint(0, 30))).strftime("%Y-%m-%d"),
                subtotal=subtotal,
                tax_total=tax_total,
                grand_total=subtotal + tax_total,
                created_at=datetime.utcnow()
            )
            new_invoices.append(inv)

        db.bulk_save_objects(new_invoices)
        db.bulk_save_objects(new_items)
        db.bulk_save_objects(new_batches)
        
        db.commit()
        
        print(f"Successfully seeded 50 purchase invoices, {len(new_items)} items, and {len(new_batches)} batches.")
        
    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    run()
