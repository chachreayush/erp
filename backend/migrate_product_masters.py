import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal, engine
from sqlalchemy import text

def run_migration():
    with engine.connect() as conn:
        try:
            print("Adding company_id, salt_id, and hsn_id to products table...")
            
            # Check if columns already exist
            result = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='products'"))
            columns = [row[0] for row in result.fetchall()]
            
            if 'company_id' not in columns:
                conn.execute(text("ALTER TABLE products ADD COLUMN company_id UUID REFERENCES manufacturers(id) ON DELETE SET NULL"))
                print("Added company_id")
            if 'salt_id' not in columns:
                conn.execute(text("ALTER TABLE products ADD COLUMN salt_id UUID REFERENCES salts(id) ON DELETE SET NULL"))
                print("Added salt_id")
            if 'hsn_id' not in columns:
                conn.execute(text("ALTER TABLE products ADD COLUMN hsn_id UUID REFERENCES hsn_codes(id) ON DELETE SET NULL"))
                print("Added hsn_id")
            
            conn.commit()
            print("Migration successful.")
        except Exception as e:
            conn.rollback()
            print(f"Error during migration: {e}")

if __name__ == "__main__":
    run_migration()
