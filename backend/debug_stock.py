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
        
    all_products = db.query(models.Product).filter(models.Product.organization_id == org.id).all()
    print(f"Total products in DB for org: {len(all_products)}")
    
    products_with_joins = db.query(models.Product).options(
        joinedload(models.Product.company),
        joinedload(models.Product.salt_relation)
    ).filter(models.Product.organization_id == org.id).all()
    
    print(f"Total products from stock query: {len(products_with_joins)}")
    
    # Check if there's any discrepancy
    ids_all = {p.id for p in all_products}
    ids_joins = {p.id for p in products_with_joins}
    
    missing = ids_all - ids_joins
    print(f"Missing products: {len(missing)}")

if __name__ == "__main__":
    run()
