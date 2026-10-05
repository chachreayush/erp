import sys
import os

# Add backend to path so we can import database
sys.path.append(os.path.abspath('backend'))

from database import engine
from sqlalchemy import text

alter_queries = [
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS allow_direct_billing BOOLEAN DEFAULT TRUE NOT NULL;",
    "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS source_order_id UUID;",
    "ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS source_order_item_id UUID;"
]

with engine.connect() as conn:
    for query in alter_queries:
        try:
            conn.execute(text(query))
            conn.commit()
            print(f"Executed: {query}")
        except Exception as e:
            print(f"Failed: {query}\nError: {e}")
            conn.rollback()

print("Database schema updated successfully!")
