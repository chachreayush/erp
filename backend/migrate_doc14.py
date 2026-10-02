"""
DOC-14: Scheme & Free Goods Engine Migration
"""
import psycopg
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "")
conn_str = DATABASE_URL.replace("postgresql://", "postgresql://").replace("+psycopg2", "")

migrations = [
    """
    CREATE TABLE IF NOT EXISTS schemes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        principal_id UUID NOT NULL REFERENCES principals(id) ON DELETE CASCADE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        code VARCHAR(50) NOT NULL,
        name VARCHAR(255) NOT NULL,
        scheme_type VARCHAR(50) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'active'
    )
    """,
    "CREATE INDEX IF NOT EXISTS ix_schemes_code ON schemes(code)",

    """
    CREATE TABLE IF NOT EXISTS scheme_versions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        scheme_id UUID NOT NULL REFERENCES schemes(id) ON DELETE CASCADE,
        product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        version_number INTEGER NOT NULL DEFAULT 1,
        valid_from DATE NOT NULL,
        valid_to DATE NOT NULL,
        buy_qty NUMERIC(10,2) NOT NULL DEFAULT 0,
        free_qty NUMERIC(10,2) NOT NULL DEFAULT 0,
        status VARCHAR(20) NOT NULL DEFAULT 'active'
    )
    """,

    """
    CREATE TABLE IF NOT EXISTS entitlements (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        scheme_version_id UUID NOT NULL REFERENCES scheme_versions(id) ON DELETE CASCADE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        granted_qty NUMERIC(10,2) NOT NULL DEFAULT 0,
        consumed_qty NUMERIC(10,2) NOT NULL DEFAULT 0,
        claimable_qty NUMERIC(10,2) NOT NULL DEFAULT 0,
        status VARCHAR(20) NOT NULL DEFAULT 'active'
    )
    """,

    """
    CREATE TABLE IF NOT EXISTS scheme_movements (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        entitlement_id UUID NOT NULL REFERENCES entitlements(id) ON DELETE CASCADE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        document_type VARCHAR(50) NOT NULL,
        document_id UUID NOT NULL,
        qty NUMERIC(10,2) NOT NULL,
        movement_type VARCHAR(20) NOT NULL
    )
    """,
    "CREATE INDEX IF NOT EXISTS ix_scheme_movements_document_id ON scheme_movements(document_id)",

    """
    CREATE TABLE IF NOT EXISTS scheme_claims (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        principal_id UUID NOT NULL REFERENCES principals(id) ON DELETE CASCADE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        claim_number VARCHAR(50) NOT NULL,
        claim_date DATE NOT NULL,
        total_claim_qty NUMERIC(10,2) NOT NULL DEFAULT 0,
        settled_qty NUMERIC(10,2) NOT NULL DEFAULT 0,
        status VARCHAR(20) NOT NULL DEFAULT 'pending'
    )
    """,
    "CREATE INDEX IF NOT EXISTS ix_scheme_claims_claim_number ON scheme_claims(claim_number)"
]

print("Connecting to database...")
with psycopg.connect(conn_str) as conn:
    with conn.cursor() as cur:
        for sql in migrations:
            cur.execute(sql)
    conn.commit()
    print("DOC-14 database migration completed successfully!")
