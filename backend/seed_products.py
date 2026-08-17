import sys
import os
import uuid
import random
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from database import SessionLocal
import models

PREFIXES = ["Dolo", "Crosin", "Azithral", "Monocef", "Augmentin", "Pantocid", "Omee", "Ecosprin", 
            "Amlokind", "Telmikind", "Rosuvas", "Lipitor", "Glycomet", "Zoryl", "Levocet", 
            "Allegra", "Volini", "Voveran", "Taxim", "Moxikind"]

SUFFIXES = ["500", "650", "250", "O", "CV", "D", "SR", "ER", "Plus", "Forte", "Kid", "Drop", "Gel", "10", "20", "40", "80"]

PACKINGS = ["10X10 TABS", "15X10 TABS", "100 ML", "60 ML", "50 GM", "30 GM", "1X10 CAPS", "5X5 TABS"]
UNITS = ["BOX", "STRIP", "BOTTLE", "TUBE"]

def run():
    db = SessionLocal()
    try:
        org = db.query(models.Organization).first()
        if not org:
            print("No organizations found.")
            return

        print(f"Seeding products for organization: {org.name}")
        
        # Fetch some companies and salts to pick from
        companies = [c.id for c in db.query(models.Manufacturer).filter_by(organization_id=org.id).all()]
        if not companies:
            companies = [None]
            
        salts = [s.id for s in db.query(models.Salt).filter_by(organization_id=org.id).all()]
        if not salts:
            salts = [None]
            
        hsn_codes = [h.id for h in db.query(models.HSNCode).filter_by(organization_id=org.id).limit(20).all()]
        if not hsn_codes:
            hsn_codes = [None]

        new_products = []
        for i in range(1, 101): # 100 products
            name = f"{random.choice(PREFIXES)} {random.choice(SUFFIXES)}"
            mrp = round(random.uniform(20.0, 500.0), 2)
            p_rate = round(mrp * random.uniform(0.5, 0.7), 2)
            ptr_rate = round(mrp * 0.72, 2)
            pts_rate = round(mrp * 0.65, 2)
            rate_a = round(mrp * 0.85, 2)
            
            gst = random.choice([12, 18])
            cgst = gst / 2.0
            sgst = gst / 2.0
            
            new_products.append(models.Product(
                id=uuid.uuid4(),
                organization_id=org.id,
                status="continue",
                hide="no",
                code=f"ITM{i:04d}",
                name=name,
                packing=random.choice(PACKINGS),
                unit=random.choice(UNITS),
                colour_type="normal",
                item_type="normal",
                company_id=random.choice(companies),
                salt_id=random.choice(salts),
                hsn_applicable="yes",
                hsn_id=random.choice(hsn_codes),
                local_tax="taxable",
                central_tax="taxable",
                sgst_percent=cgst,
                cgst_percent=sgst,
                igst_percent=gst,
                mrp=mrp,
                p_rate=p_rate,
                pts_rate=pts_rate,
                rate_a=rate_a,
                ptr_rate=ptr_rate,
                item_discount_percent=0.0,
                discount_type="applicable",
                category="na",
                created_at=datetime.utcnow()
            ))
            
        db.bulk_save_objects(new_products)
        db.commit()
        
        print(f"Successfully seeded {len(new_products)} products.")
        
    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    run()
