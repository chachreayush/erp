import os
import sys
import uuid
from datetime import datetime

sys.path.insert(0, os.path.dirname(__file__))

from database import engine, SessionLocal, Base
from models import StockShiftVoucher, StockShiftItem, Batch, Product, Organization

def init_tables():
    print("Creating stock_shift_vouchers and stock_shift_items tables...")
    Base.metadata.create_all(bind=engine, tables=[StockShiftVoucher.__table__, StockShiftItem.__table__])
    print("Tables created successfully!")

    db = SessionLocal()
    try:
        # Check if we have sample batches nearing expiry
        org = db.query(Organization).first()
        if not org:
            print("No organization found.")
            return

        print(f"Verified tables for org: {org.name} ({org.id})")
    finally:
        db.close()

if __name__ == "__main__":
    init_tables()
