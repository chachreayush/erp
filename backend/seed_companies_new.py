import sys
import os
import uuid
import random
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from database import SessionLocal
import models

COMPANIES = [
    "Sun Pharmaceuticals", "Cipla Limited", "Dr. Reddy's Laboratories", "Lupin Limited",
    "Aurobindo Pharma", "Zydus Lifesciences", "Torrent Pharmaceuticals", "Alkem Laboratories",
    "Divis Laboratories", "Intas Pharmaceuticals", "Mankind Pharma", "Biocon Limited",
    "Glenmark Pharmaceuticals", "Macleods Pharmaceuticals", "Micro Labs", "Wockhardt Ltd",
    "Abbott India", "GlaxoSmithKline Pharma", "Pfizer India", "Sanofi India",
    "Novartis India", "AstraZeneca Pharma", "Bayer CropScience", "Strides Pharma Science",
    "Ipca Laboratories"
]

def run():
    db = SessionLocal()
    try:
        org = db.query(models.Organization).first()
        if not org:
            print("No organizations found.")
            return

        print(f"Seeding companies for organization: {org.name}")
        
        new_companies = []
        for i, name in enumerate(COMPANIES):
            short_code = "".join([word[0] for word in name.replace('.', '').replace("'", '').split()]).upper() + f"{i+1:02d}"
            
            # Optionally link to a random supplier ledger if available
            suppliers = db.query(models.Ledger).filter(
                models.Ledger.organization_id == org.id,
                models.Ledger.group_name == "Sundry Creditors"
            ).all()
            
            is_supplier = random.choice([True, False])
            supplier_id = None
            if is_supplier and suppliers:
                supplier_id = random.choice(suppliers).id
                
            new_companies.append(models.Manufacturer(
                id=uuid.uuid4(),
                organization_id=org.id,
                name=name,
                short_code=short_code,
                status="continue",
                prohibited=False,
                default_discount=float(random.choice([0, 5, 10, 15, 20])),
                is_supplier=is_supplier,
                supplier_ledger_id=supplier_id,
                created_at=datetime.utcnow()
            ))
            
        db.bulk_save_objects(new_companies)
        db.commit()
        
        print(f"Successfully seeded {len(new_companies)} companies.")
        
    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    run()
