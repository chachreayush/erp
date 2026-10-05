import sys
import os

sys.path.append(os.path.abspath('backend'))
from database import engine
from sqlalchemy import text

alter_queries = [
    "ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS source_invoice_item_id UUID REFERENCES invoice_items(id) ON DELETE SET NULL;",
    "ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS returned_qty INTEGER NOT NULL DEFAULT 0;"
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

print("Database schema updated for DOC-21 successfully!")
