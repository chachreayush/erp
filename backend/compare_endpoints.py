import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from database import SessionLocal
import models
from sqlalchemy.orm import joinedload

def run():
    db = SessionLocal()
    org = db.query(models.Organization).first()
    if not org:
        print("No org")
        return
        
    prods_master = db.query(models.Product).filter(models.Product.organization_id == org.id).all()
    prods_stock = db.query(models.Product).options(
        joinedload(models.Product.company),
        joinedload(models.Product.salt_relation)
    ).filter(models.Product.organization_id == org.id).all()
    
    print(f"Master length: {len(prods_master)}")
    print(f"Stock length: {len(prods_stock)}")
    
    # Are there any duplicates in Stock query due to joinedload?
    ids_stock = [p.id for p in prods_stock]
    print(f"Unique stock IDs: {len(set(ids_stock))}")

if __name__ == "__main__":
    run()
