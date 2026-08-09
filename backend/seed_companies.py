import sys
import os
import random
import uuid

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal
import models
from datetime import datetime

def run():
    db = SessionLocal()
    try:
        org = db.query(models.Organization).first()
        if not org:
            print("No organization found. Please run seed.py first.")
            return

        company_names = [
            "Acme Pharmaceuticals",
            "Global Health Corp",
            "MediLife Solutions",
            "BioCure Innovations",
            "Apex Medical",
            "Zenith Pharma",
            "Prime Therapeutics",
            "Nova Biologics",
            "Stellar Health",
            "Horizon Pharmaceuticals"
        ]

        for i, name in enumerate(company_names):
            # Check if exists
            existing = db.query(models.Manufacturer).filter(models.Manufacturer.name == name).first()
            if not existing:
                new_mfg = models.Manufacturer(
                    id=uuid.uuid4(),
                    organization_id=org.id,
                    name=name,
                    short_code=f"COMP-{i+1:03d}",
                    status="continue",
                    prohibited=False,
                    default_discount=0.0,
                    created_at=datetime.utcnow()
                )
                db.add(new_mfg)
                print(f"Created company: {name}")
            else:
                print(f"Company already exists: {name}")

        db.commit()
        print("Successfully created 10 companies.")
    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    run()
