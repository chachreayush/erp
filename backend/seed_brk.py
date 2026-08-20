import random
import uuid
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from database import SessionLocal
import models

def seed_brk_receive():
    db = SessionLocal()
    try:
        org = db.query(models.Organization).first()
        if not org:
            print("No organization found.")
            return

        # Get existing products
        products = db.query(models.Product).filter(models.Product.organization_id == org.id).limit(50).all()
        if not products:
            print("No products found.")
            return

        debtors = ["Apollo Pharmacy", "MedPlus", "Wellness Forever", "Frank Ross", "Netmeds Store", "Local Chemist"]
        
        # Create some expired batches for these products if needed, or just create them on the fly
        expired_dates = ["10/23", "12/23", "01/24", "05/24", "08/24"]

        for i in range(1, 21):
            invoice_num = f"BRK-REC-{1000 + i}"
            debtor = random.choice(debtors)
            
            new_inv = models.Invoice(
                organization_id=org.id,
                invoice_type="brk-receive-bill",
                invoice_number=invoice_num,
                customer_name=debtor,
                date=datetime.utcnow() - timedelta(days=random.randint(0, 30)),
                subtotal=0,
                tax_total=0,
                grand_total=0
            )
            db.add(new_inv)
            db.flush()

            num_items = random.randint(1, 3)
            subtotal = 0
            
            selected_products = random.sample(products, num_items)
            for prod in selected_products:
                qty = random.randint(1, 10)
                rate = float(prod.mrp) * 0.8 if prod.mrp else 100.0
                batch_no = f"EXP-{random.randint(100,999)}"
                expiry = random.choice(expired_dates)
                line_total = qty * rate
                subtotal += line_total
                
                new_item = models.InvoiceItem(
                    invoice_id=new_inv.id,
                    product_id=prod.id,
                    product_name=prod.name,
                    quantity=qty,
                    rate=rate,
                    batch=batch_no,
                    expiry=expiry,
                    mrp=prod.mrp or rate * 1.2,
                    discount_percent=0,
                    igst_percent=0,
                    line_total=line_total
                )
                db.add(new_item)
                
                # Update stock
                batch = db.query(models.Batch).filter(
                    models.Batch.organization_id == org.id,
                    models.Batch.product_id == prod.id,
                    models.Batch.batch_number == batch_no
                ).first()
                
                if batch:
                    batch.brk_exp_stock += qty
                else:
                    new_batch = models.Batch(
                        organization_id=org.id,
                        product_id=prod.id,
                        batch_number=batch_no,
                        expiry=expiry,
                        mrp=prod.mrp or rate * 1.2,
                        rate=rate,
                        rate_a=rate,
                        rate_b=0,
                        rate_c=0,
                        cost=0,
                        current_stock=0,
                        brk_exp_stock=qty
                    )
                    db.add(new_batch)
            
            new_inv.subtotal = subtotal
            new_inv.grand_total = subtotal
            
        db.commit()
        print("Successfully created 20 Brk/Exp Receive entries!")
    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_brk_receive()
