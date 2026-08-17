import sys
import os
import json
import uuid

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal
import models
from datetime import datetime

INDIAN_STATES = [
    ("01", "Jammu and Kashmir", "Srinagar"),
    ("02", "Himachal Pradesh", "Shimla"),
    ("03", "Punjab", "Chandigarh"),
    ("04", "Chandigarh", "Chandigarh"),
    ("05", "Uttarakhand", "Dehradun"),
    ("06", "Haryana", "Chandigarh"),
    ("07", "Delhi", "New Delhi"),
    ("08", "Rajasthan", "Jaipur"),
    ("09", "Uttar Pradesh", "Lucknow"),
    ("10", "Bihar", "Patna"),
    ("11", "Sikkim", "Gangtok"),
    ("12", "Arunachal Pradesh", "Itanagar"),
    ("13", "Nagaland", "Kohima"),
    ("14", "Manipur", "Imphal"),
    ("15", "Mizoram", "Aizawl"),
    ("16", "Tripura", "Agartala"),
    ("17", "Meghalaya", "Shillong"),
    ("18", "Assam", "Dispur"),
    ("19", "West Bengal", "Kolkata"),
    ("20", "Jharkhand", "Ranchi"),
    ("21", "Odisha", "Bhubaneswar"),
    ("22", "Chhattisgarh", "Raipur"),
    ("23", "Madhya Pradesh", "Bhopal"),
    ("24", "Gujarat", "Gandhinagar"),
    ("25", "Daman and Diu", "Daman"),
    ("26", "Dadra and Nagar Haveli", "Silvassa"),
    ("27", "Maharashtra", "Mumbai"),
    ("28", "Andhra Pradesh (Old)", "Hyderabad"),
    ("29", "Karnataka", "Bengaluru"),
    ("30", "Goa", "Panaji"),
    ("31", "Lakshadweep", "Kavaratti"),
    ("32", "Kerala", "Thiruvananthapuram"),
    ("33", "Tamil Nadu", "Chennai"),
    ("34", "Puducherry", "Puducherry"),
    ("35", "Andaman and Nicobar Islands", "Port Blair"),
    ("36", "Telangana", "Hyderabad"),
    ("37", "Andhra Pradesh (New)", "Amaravati"),
    ("38", "Ladakh", "Leh")
]

def run():
    db = SessionLocal()
    try:
        org = db.query(models.Organization).first()
        if not org:
            print("No organization found. Cannot seed masters.")
            return
            
        print(f"Seeding for organization: {org.name}")
        
        # Seed States
        for code, name, capital in INDIAN_STATES:
            existing = db.query(models.StateCode).filter(models.StateCode.gst_code == code, models.StateCode.organization_id == org.id).first()
            if not existing:
                new_state = models.StateCode(
                    id=uuid.uuid4(),
                    organization_id=org.id,
                    name=name,
                    gst_code=code,
                    capital=capital,
                    created_at=datetime.utcnow()
                )
                db.add(new_state)
        
        # Seed HSN Codes
        json_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'sac_dump.json')
        if os.path.exists(json_path):
            with open(json_path, 'r', encoding='utf-8') as f:
                hsn_data = json.load(f)
                
            for item in hsn_data[:200]:
                code = item.get("code")
                existing = db.query(models.HSNCode).filter(models.HSNCode.code == code, models.HSNCode.organization_id == org.id).first()
                if not existing:
                    new_hsn = models.HSNCode(
                        id=uuid.uuid4(),
                        organization_id=org.id,
                        code=code,
                        description=item.get("description", "")[:200], # limit length
                        igst=float(item.get("igstRate", 0) or 0),
                        cgst=float(item.get("cgstRate", 0) or 0),
                        sgst=float(item.get("sgstRate", 0) or 0),
                        created_at=datetime.utcnow()
                    )
                    db.add(new_hsn)
        else:
            print(f"sac_dump.json not found at {json_path}")
            
        db.commit()
        print("Successfully seeded states and HSN codes.")
    except Exception as e:
        db.rollback()
        print(f"Error during seeding: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    run()
