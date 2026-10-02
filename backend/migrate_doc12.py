"""
DOC-12: Create principals, principal_agreements, principal_warehouse_mappings tables
and add principal_owner_id to batches table.
"""
import psycopg
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "")
# Convert SQLAlchemy URL to psycopg format
conn_str = DATABASE_URL.replace("postgresql://", "postgresql://").replace("+psycopg2", "")

migrations = [
    # Principal table
    """
    CREATE TABLE IF NOT EXISTS principals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        code VARCHAR(50) NOT NULL,
        legal_name VARCHAR(255) NOT NULL,
        brand VARCHAR(100),
        gstin VARCHAR(15),
        status VARCHAR(20) NOT NULL DEFAULT 'active'
    )
    """,
    "CREATE INDEX IF NOT EXISTS ix_principals_organization_id ON principals(organization_id)",
    "CREATE INDEX IF NOT EXISTS ix_principals_code ON principals(code)",

    # Principal Agreements table
    """
    CREATE TABLE IF NOT EXISTS principal_agreements (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        principal_id UUID NOT NULL REFERENCES principals(id) ON DELETE CASCADE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        version_name VARCHAR(100) NOT NULL,
        valid_from TIMESTAMP NOT NULL,
        valid_to TIMESTAMP,
        commission_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
        handling_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT TRUE
    )
    """,
    "CREATE INDEX IF NOT EXISTS ix_principal_agreements_organization_id ON principal_agreements(organization_id)",
    "CREATE INDEX IF NOT EXISTS ix_principal_agreements_principal_id ON principal_agreements(principal_id)",

    # Principal Warehouse Mappings table
    """
    CREATE TABLE IF NOT EXISTS principal_warehouse_mappings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        principal_id UUID NOT NULL REFERENCES principals(id) ON DELETE CASCADE,
        warehouse_id UUID NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
    """,
    "CREATE INDEX IF NOT EXISTS ix_principal_warehouse_mappings_organization_id ON principal_warehouse_mappings(organization_id)",
    "CREATE INDEX IF NOT EXISTS ix_principal_warehouse_mappings_principal_id ON principal_warehouse_mappings(principal_id)",
    "CREATE INDEX IF NOT EXISTS ix_principal_warehouse_mappings_warehouse_id ON principal_warehouse_mappings(warehouse_id)",
]

# Add principal_owner_id to batches if not exists
alter_batch = """
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'batches' AND column_name = 'principal_owner_id'
    ) THEN
        ALTER TABLE batches ADD COLUMN principal_owner_id UUID REFERENCES principals(id) ON DELETE SET NULL;
        CREATE INDEX ix_batches_principal_owner_id ON batches(principal_owner_id);
    END IF;
END $$;
"""

print("Connecting to database...")
with psycopg.connect(conn_str) as conn:
    with conn.cursor() as cur:
        for sql in migrations:
            print(f"Running: {sql.strip()[:60]}...")
            cur.execute(sql)
        
        print(f"Running: ALTER TABLE batches ADD principal_owner_id...")
        cur.execute(alter_batch)
    
    conn.commit()
    print("\n✅ DOC-12 database migration completed successfully!")
