from database import engine
from sqlalchemy import text

with engine.begin() as conn:
    conn.execute(text("ALTER TABLE ledgers ALTER COLUMN group_id TYPE VARCHAR(64);"))
    print("[SUCCESS] Altered ledgers.group_id to VARCHAR(64)!")
