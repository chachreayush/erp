import sys
import os

# Add backend to path so we can import database
sys.path.append(os.path.abspath('backend'))

from database import engine
from sqlalchemy import text
import uuid
from datetime import datetime

seed_queries = [
    # Get an org_id
    "SELECT id FROM organizations LIMIT 1;"
]

with engine.connect() as conn:
    org_res = conn.execute(text(seed_queries[0])).fetchone()
    if not org_res:
        print("No organization found to seed.")
        sys.exit(1)
        
    org_id = str(org_res[0])
    
    # Check if series exist
    count = conn.execute(text("SELECT COUNT(*) FROM document_series")).scalar()
    if count == 0:
        queries = [
            f"""
            INSERT INTO document_series (id, organization_id, created_at, series_code, invoice_type, prefix, suffix, next_number, is_active)
            VALUES 
            ('{uuid.uuid4()}', '{org_id}', '{datetime.utcnow()}', 'MUM-SALE', 'sales_invoice', 'MUM-', '', 1001, true),
            ('{uuid.uuid4()}', '{org_id}', '{datetime.utcnow()}', 'DEL-SALE', 'sales_invoice', 'DEL-', '', 1001, true),
            ('{uuid.uuid4()}', '{org_id}', '{datetime.utcnow()}', 'CHALLAN', 'sales_challan', 'CH-', '', 5001, true)
            """
        ]
        for q in queries:
            conn.execute(text(q))
        conn.commit()
        print("Seeded Document Series.")
    else:
        print("Series already exist.")
