import sys
import os
import uuid

# Add backend to path
sys.path.insert(0, os.path.abspath('backend'))

from database import SessionLocal
import models
from auth.utils import hash_password

def seed_clients():
    db = SessionLocal()
    
    clients = [
        {
            "name": "Alpha Traders",
            "company_code": "ALPHA",
            "admin_username": "alpha_admin",
            "admin_password": "Password123!"
        },
        {
            "name": "Omega Logistics",
            "company_code": "OMEGA",
            "admin_username": "omega_admin",
            "admin_password": "Password123!"
        }
    ]
    
    for client_data in clients:
        # Check if company exists
        existing_company = db.query(models.Company).filter(
            models.Company.company_code == client_data["company_code"]
        ).first()
        
        if existing_company:
            print(f"Company {client_data['company_code']} already exists.")
            company = existing_company
        else:
            company = models.Company(
                name=client_data["name"],
                company_code=client_data["company_code"],
                is_am=False,
                is_active=True
            )
            db.add(company)
            db.flush()
            print(f"Created Company: {client_data['name']} ({client_data['company_code']})")
            
        # Check if user exists
        existing_user = db.query(models.User).filter(
            models.User.username == client_data["admin_username"],
            models.User.company_id == company.id
        ).first()
        
        if existing_user:
            print(f"User {client_data['admin_username']} already exists.")
        else:
            hashed_pw = hash_password(client_data["admin_password"])
            admin_user = models.User(
                company_id=company.id,
                name=f"{client_data['name']} Admin",
                username=client_data["admin_username"],
                hashed_password=hashed_pw,
                role="cm_admin"
            )
            db.add(admin_user)
            print(f"Created Admin User: {client_data['admin_username']} for {client_data['company_code']}")
            
    db.commit()
    db.close()
    print("Seed complete!")

if __name__ == "__main__":
    seed_clients()
