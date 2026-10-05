import sys
import os

# Add backend to path so we can import database
sys.path.append(os.path.abspath('backend'))

from database import engine
from sqlalchemy import text

alter_queries = [
    # Create DocumentSeries table
    """
    CREATE TABLE IF NOT EXISTS document_series (
        id UUID PRIMARY KEY,
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
        series_code VARCHAR(50) NOT NULL,
        invoice_type VARCHAR(50) NOT NULL,
        prefix VARCHAR(20),
        suffix VARCHAR(20),
        next_number INTEGER NOT NULL DEFAULT 1,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        CONSTRAINT uix_org_series_code UNIQUE (organization_id, series_code)
    );
    """,
    # Add series_id to invoices
    "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS series_id UUID REFERENCES document_series(id) ON DELETE SET NULL;",
    # Add new columns to invoice_items
    "ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS source_challan_item_id UUID REFERENCES invoice_items(id) ON DELETE SET NULL;",
    "ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS billed_qty INTEGER NOT NULL DEFAULT 0;"
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
