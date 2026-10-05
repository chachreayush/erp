import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Load env variables
load_dotenv('backend/.env')
DATABASE_URL = os.getenv('DATABASE_URL')

if not DATABASE_URL:
    print("DATABASE_URL not found!")
    exit(1)

# Connect to database
engine = create_engine(DATABASE_URL)

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
