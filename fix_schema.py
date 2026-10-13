import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv("backend/.env")
DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg://", 1)

engine = create_engine(DATABASE_URL)
with engine.connect() as conn:
    try:
        conn.execute(text("ALTER TABLE invoices ADD COLUMN party_id UUID;"))
        conn.commit()
        print("Added party_id to invoices")
    except Exception as e:
        print("party_id error:", e)
        conn.rollback()
        
    try:
        conn.execute(text("ALTER TABLE invoices ADD COLUMN irn VARCHAR;"))
        conn.execute(text("ALTER TABLE invoices ADD COLUMN ack_no VARCHAR;"))
        conn.execute(text("ALTER TABLE invoices ADD COLUMN signed_qr_code TEXT;"))
        conn.execute(text("ALTER TABLE invoices ADD COLUMN eway_bill_no VARCHAR;"))
        conn.commit()
        print("Added E-invoice cols to invoices")
    except Exception as e:
        print("E-invoice cols error:", e)
        conn.rollback()
