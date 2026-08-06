import asyncio
import os
import sys

# Ensure backend is in python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import engine
from models import Base
from sqlalchemy import text

def migrate():
    print("Starting Ledger migration...")
    
    # Create new tables (like stations) if they don't exist
    Base.metadata.create_all(bind=engine)
    print("Ensured all new tables exist (stations).")

    with engine.begin() as conn:
        print("Altering ledgers table to add new columns...")
        try:
            # We add columns with IF NOT EXISTS to make this script idempotent, 
            # but Postgres 'ADD COLUMN IF NOT EXISTS' syntax is supported since Postgres 9.6.
            # (Assuming Postgres database).
            columns_to_add = [
                "station VARCHAR(255)",
                "plot_no VARCHAR(255)",
                "locality VARCHAR(255)",
                "road_street VARCHAR(255)",
                "city VARCHAR(100)",
                "district VARCHAR(100)",
                "pincode VARCHAR(20)",
                "email VARCHAR(255)",
                "website VARCHAR(255)",
                "contact_person VARCHAR(255)",
                "phone_number VARCHAR(50)",
                "freeze_upto NUMERIC(15, 2) DEFAULT 0 NOT NULL",
                "dl_no VARCHAR(100)",
                "restrict_item VARCHAR(500)",
                "ledger_type VARCHAR(50) DEFAULT 'Unregistered'",
                "gstin VARCHAR(50)",
                "tax_type VARCHAR(50)",
                "pan_no VARCHAR(50)",
                "ledger_date TIMESTAMP",
                "colour VARCHAR(50)"
            ]
            
            for col in columns_to_add:
                col_name = col.split()[0]
                try:
                    conn.execute(text(f"ALTER TABLE ledgers ADD COLUMN {col}"))
                    print(f"Added column {col_name}")
                except Exception as e:
                    # Ignore errors if column already exists
                    if "already exists" in str(e).lower() or "duplicate column name" in str(e).lower():
                        print(f"Column {col_name} already exists. Skipping.")
                    else:
                        print(f"Failed to add {col_name}: {e}")
                        
        except Exception as e:
            print(f"Migration error: {e}")

    print("Migration complete.")

if __name__ == "__main__":
    migrate()
