import os
import json
from sqlalchemy.orm import Session
from database import SessionLocal
from models import HSNCode, Organization

def seed_hsn():
    print("============================================================")
    print("  ERP HSN & SAC Database Seed Script")
    print("============================================================")

    session = SessionLocal()
    try:
        # Get the first organization to attach the codes to (default behavior)
        org = session.query(Organization).first()
        if not org:
            print("No organization found in the database. Please run seed.py first.")
            return

        print(f"Found Organization: {org.name} ({org.id})")

        # Clear existing HSN codes to prevent duplicates
        deleted = session.query(HSNCode).filter(HSNCode.organization_id == org.id).delete()
        print(f"Cleared {deleted} existing HSN codes for this organization.")

        combined_records = []

        # 1. Load Goods (HSN)
        if os.path.exists("hsn_dump.json"):
            with open("hsn_dump.json", "r", encoding="utf-8") as f:
                hsn_data = json.load(f)
                print(f"Loaded {len(hsn_data)} Goods (HSN) codes from JSON.")
                for item in hsn_data:
                    combined_records.append({
                        "organization_id": org.id,
                        "code": item.get("code", ""),
                        "description": item.get("description", ""),
                        "igst": item.get("igstRate", 0),
                        "cgst": item.get("cgstRate", 0),
                        "sgst": item.get("sgstRate", 0),
                        "type": "Goods"
                    })
        else:
            print("hsn_dump.json not found!")

        # 2. Load Services (SAC)
        if os.path.exists("sac_dump.json"):
            with open("sac_dump.json", "r", encoding="utf-8") as f:
                sac_data = json.load(f)
                print(f"Loaded {len(sac_data)} Services (SAC) codes from JSON.")
                for item in sac_data:
                    combined_records.append({
                        "organization_id": org.id,
                        "code": item.get("code", ""),
                        "description": item.get("description", ""),
                        "igst": item.get("igstRate", 0),
                        "cgst": item.get("cgstRate", 0),
                        "sgst": item.get("sgstRate", 0),
                        "type": "Service"
                    })
        else:
            print("sac_dump.json not found!")

        if not combined_records:
            print("No codes to insert.")
            return

        print(f"Batch inserting {len(combined_records)} total records... This may take a moment.")
        
        # Batch insert for performance
        session.bulk_insert_mappings(HSNCode, combined_records)
        session.commit()

        print(f"Successfully inserted {len(combined_records)} HSN & SAC codes!")

    except Exception as e:
        session.rollback()
        print(f"Error during seeding: {e}")
    finally:
        session.close()

    print("============================================================")

if __name__ == "__main__":
    seed_hsn()

