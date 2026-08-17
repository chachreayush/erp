import sys
import os
import json
import uuid
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from database import SessionLocal
import models

def run():
    db = SessionLocal()
    try:
        orgs = db.query(models.Organization).all()
        if not orgs:
            print("No organizations found.")
            return

        print("Loading JSON files...")
        hsn_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'hsn_dump.json')
        sac_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'sac_dump.json')
        
        all_codes = []
        if os.path.exists(hsn_path):
            with open(hsn_path, 'r', encoding='utf-8') as f:
                all_codes.extend(json.load(f))
        
        if os.path.exists(sac_path):
            with open(sac_path, 'r', encoding='utf-8') as f:
                all_codes.extend(json.load(f))
                
        print(f"Total HSN/SAC codes loaded: {len(all_codes)}")
        
        for org in orgs:
            print(f"Processing organization: {org.name}")
            
            existing_codes = set([c[0] for c in db.query(models.HSNCode.code).filter(models.HSNCode.organization_id == org.id).all()])
            
            new_hsn_records = []
            for item in all_codes:
                code = item.get("code")
                if not code or code in existing_codes:
                    continue
                
                new_hsn_records.append({
                    "id": uuid.uuid4(),
                    "organization_id": org.id,
                    "code": code,
                    "description": item.get("description", "")[:200],
                    "igst": float(item.get("igstRate", 0) or 0),
                    "cgst": float(item.get("cgstRate", 0) or 0),
                    "sgst": float(item.get("sgstRate", 0) or 0),
                    "created_at": datetime.utcnow()
                })
                existing_codes.add(code)
            
            if new_hsn_records:
                print(f"Inserting {len(new_hsn_records)} new HSN/SAC codes for {org.name}...")
                chunk_size = 5000
                for i in range(0, len(new_hsn_records), chunk_size):
                    db.bulk_insert_mappings(models.HSNCode, new_hsn_records[i:i+chunk_size])
                db.commit()
            else:
                print("No new HSN/SAC codes to insert.")
                
        print("Done!")
    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    run()
