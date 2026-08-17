import sys
import os
import uuid
import random
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from database import SessionLocal
import models

DEBTOR_NAMES = [
    "Rajesh Traders", "Mahalaxmi Pharmacy", "Gupta Medicos", "Om Sai Medical",
    "Shiva Pharma", "Apollo Chemists", "Balaji Enterprises", "Ganesh Medical Store",
    "Bharat Pharmacy", "Krishna Medicos", "Sanjeevani Care", "City Medicals",
    "National Pharmacy", "Global Health Store", "Pioneer Chemists", "Life Care Pharmacy",
    "Wellness Medicals", "Star Pharma", "Sunshine Chemists", "Royal Medicals",
    "Venkateshwara Pharma", "Swastik Medical Store", "Unique Chemists", "Reliable Pharmacy",
    "Modern Medicos"
]

CREDITOR_NAMES = [
    "Cipla Distributors", "Sun Pharma Suppliers", "Lupin Wholesalers", "Dr Reddy's Stockist",
    "Zydus Cadila Agency", "Torrent Pharma Distributors", "Alkem Labs Suppliers",
    "Intas Pharmaceuticals Depot", "Mankind Pharma Agency", "Biocon Wholesalers",
    "Glenmark Distributors", "Aurobindo Stockist", "Divis Labs Suppliers",
    "Micro Labs Agency", "Wockhardt Distributors", "Strides Pharma Suppliers",
    "Ipca Labs Wholesalers", "Alembic Pharma Stockist", "Abbott India Distributors",
    "GSK Pharma Suppliers", "Pfizer Wholesalers", "Sanofi India Agency",
    "Novartis Stockist", "AstraZeneca Distributors", "Bayer Pharma Suppliers"
]

STATES = ["07-Delhi", "27-Maharashtra", "24-Gujarat", "09-Uttar Pradesh", "29-Karnataka"]

def run():
    db = SessionLocal()
    try:
        org = db.query(models.Organization).first()
        if not org:
            print("No organizations found.")
            return

        print(f"Seeding ledgers for organization: {org.name}")
        
        new_ledgers = []
        
        # Debtors
        for name in DEBTOR_NAMES:
            new_ledgers.append(models.Ledger(
                id=uuid.uuid4(),
                organization_id=org.id,
                name=name,
                group_name="Sundry Debtors",
                mobile=f"98{random.randint(10000000, 99999999)}",
                state=random.choice(STATES),
                opening_balance=round(random.uniform(1000.0, 50000.0), 2),
                op_type="Dr",
                closing_balance=round(random.uniform(1000.0, 50000.0), 2),
                cl_type="Dr",
                ledger_type="Unregistered",
                created_at=datetime.utcnow()
            ))

        # Creditors
        for name in CREDITOR_NAMES:
            new_ledgers.append(models.Ledger(
                id=uuid.uuid4(),
                organization_id=org.id,
                name=name,
                group_name="Sundry Creditors",
                mobile=f"99{random.randint(10000000, 99999999)}",
                state=random.choice(STATES),
                opening_balance=round(random.uniform(5000.0, 200000.0), 2),
                op_type="Cr",
                closing_balance=round(random.uniform(5000.0, 200000.0), 2),
                cl_type="Cr",
                ledger_type="Registered",
                gstin=f"27AAACM{random.randint(1000, 9999)}P1Z{random.choice('ABCDEFGHIJKLMNOPQRSTUVWXYZ')}",
                created_at=datetime.utcnow()
            ))
            
        db.bulk_save_objects(new_ledgers)
        db.commit()
        
        print(f"Successfully seeded {len(new_ledgers)} ledgers.")
        
    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    run()
