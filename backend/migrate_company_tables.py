import os
import sys
from sqlalchemy import text
from database import engine, Base
import models

def migrate():
    print("Migrating company & client mapping tables...")
    # 1. Create any missing tables defined in models (including organization_manufacturer_mappings)
    Base.metadata.create_all(bind=engine)
    print("Base.metadata.create_all completed.")

    # 2. Add columns if not exist
    with engine.connect() as conn:
        # Check and add columns on manufacturers
        conn.execute(text("""
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='manufacturers' AND column_name='sales_ledger_id') THEN
                    ALTER TABLE manufacturers ADD COLUMN sales_ledger_id UUID REFERENCES ledgers(id) ON DELETE SET NULL;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='manufacturers' AND column_name='division') THEN
                    ALTER TABLE manufacturers ADD COLUMN division VARCHAR(100);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='manufacturers' AND column_name='gstin') THEN
                    ALTER TABLE manufacturers ADD COLUMN gstin VARCHAR(50);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='manufacturers' AND column_name='state_code') THEN
                    ALTER TABLE manufacturers ADD COLUMN state_code VARCHAR(10);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='principals' AND column_name='manufacturer_id') THEN
                    ALTER TABLE principals ADD COLUMN manufacturer_id UUID REFERENCES manufacturers(id) ON DELETE SET NULL;
                END IF;
            END $$;
        """))
        conn.commit()
    print("Database columns and foreign keys verified successfully!")

if __name__ == "__main__":
    migrate()
