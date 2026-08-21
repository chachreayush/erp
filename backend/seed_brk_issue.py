import random
import uuid
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from database import SessionLocal
import models

def seed_brk_issue():
    db = SessionLocal()
    try:
        org = db.query(models.Organization).first()
        if not org:
            print("No organization found.")
            return

        # Get existing batches that have breakage/expiry stock > 0
        batches = db.query(models.Batch).filter(
            models.Batch.organization_id == org.id,
            models.Batch.brk_exp_stock > 0
        ).limit(100).all()

        if not batches:
            print("No batches with brk_exp_stock > 0 found. Please receive some breakage stock first.")
            return

        creditors = ["Sun Pharma", "Cipla Ltd", "Lupin Limited", "Dr Reddy's Laboratories", "Zydus Lifesciences", "Torrent Pharma"]

        total_issued = 0
        for i in range(1, 21):
            invoice_num = f"BRK-ISS-{1000 + i}"
            creditor = random.choice(creditors)
            
            new_inv = models.Invoice(
                organization_id=org.id,
                invoice_type="brk-issue-bill",
                invoice_number=invoice_num,
                customer_name=creditor,
                date=datetime.utcnow() - timedelta(days=random.randint(0, 30)),
                subtotal=0,
                tax_total=0,
                grand_total=0
            )
            db.add(new_inv)
            db.flush()

            num_items = random.randint(1, min(3, len(batches)))
            subtotal = 0
            
            selected_batches = random.sample(batches, num_items)
            for batch in selected_batches:
                # Deduct only a safe amount (1 or 2 max) so we don't go negative during the loop
                qty = random.randint(1, max(1, min(2, batch.brk_exp_stock)))
                rate = float(batch.rate) if batch.rate else 100.0
                line_total = qty * rate
                subtotal += line_total
                
                # Fetch product name
                prod = db.query(models.Product).filter(models.Product.id == batch.product_id).first()
                prod_name = prod.name if prod else "Unknown Product"

                new_item = models.InvoiceItem(
                    invoice_id=new_inv.id,
                    product_id=batch.product_id,
                    product_name=prod_name,
                    quantity=qty,
                    rate=rate,
                    batch=batch.batch_number,
                    expiry=batch.expiry,
                    mrp=batch.mrp,
                    discount_percent=0,
                    igst_percent=0,
                    line_total=line_total
                )
                db.add(new_item)
                
                # Update stock safely
                batch.brk_exp_stock -= qty
                total_issued += 1
            
            new_inv.subtotal = subtotal
            new_inv.grand_total = subtotal
            
        db.commit()
        print(f"Successfully created 20 Brk/Exp Issue entries across {total_issued} items!")
    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_brk_issue()
