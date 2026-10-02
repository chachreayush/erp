"""
DOC-15: Pricing, Rate, MRP & Formula Engine Migration
"""
import psycopg
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "")
conn_str = DATABASE_URL.replace("postgresql://", "postgresql://").replace("+psycopg2", "")

migrations = [
    """
    CREATE TABLE IF NOT EXISTS price_lists (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        code VARCHAR(50) NOT NULL,
        name VARCHAR(255) NOT NULL,
        description VARCHAR(500),
        status VARCHAR(20) NOT NULL DEFAULT 'active'
    )
    """,
    "CREATE INDEX IF NOT EXISTS ix_price_lists_code ON price_lists(code)",

    """
    CREATE TABLE IF NOT EXISTS price_list_rules (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        price_list_id UUID NOT NULL REFERENCES price_lists(id) ON DELETE CASCADE,
        product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        valid_from DATE NOT NULL,
        valid_to DATE NOT NULL,
        fixed_price NUMERIC(12,4) NOT NULL
    )
    """,

    """
    CREATE TABLE IF NOT EXISTS price_formulas (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        target_rate_type VARCHAR(50) NOT NULL,
        source_rate_type VARCHAR(50) NOT NULL,
        operator VARCHAR(20) NOT NULL,
        operand NUMERIC(10,4) NOT NULL,
        floor_price NUMERIC(12,4),
        status VARCHAR(20) NOT NULL DEFAULT 'active'
    )
    """,

    """
    CREATE TABLE IF NOT EXISTS customer_price_configs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        party_id UUID NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        default_rate_type VARCHAR(50),
        price_list_id UUID REFERENCES price_lists(id) ON DELETE SET NULL,
        UNIQUE(organization_id, party_id)
    )
    """
]

print("Connecting to database...")
with psycopg.connect(conn_str) as conn:
    with conn.cursor() as cur:
        for sql in migrations:
            cur.execute(sql)
    conn.commit()
    print("DOC-15 database migration completed successfully!")
