import sqlalchemy as sa
from database import SessionLocal
session = SessionLocal()
try:
    session.execute(sa.text("ALTER TABLE batches ADD COLUMN brk_exp_stock INTEGER NOT NULL DEFAULT 0;"))
    session.commit()
    print("Migration successful")
except Exception as e:
    if "already exists" in str(e):
        print("Column already exists. Skipping.")
    else:
        print(f"Error: {e}")
