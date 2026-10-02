"""
DOC-13: Create warehouses, warehouse_zones, warehouse_bins, transporters, vehicles
and restore PrincipalWarehouseMapping.warehouse_id FK
"""
import psycopg
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "")
conn_str = DATABASE_URL.replace("postgresql://", "postgresql://").replace("+psycopg2", "")

migrations = [
    # WAREHOUSES
    """
    CREATE TABLE IF NOT EXISTS warehouses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        code VARCHAR(50) NOT NULL,
        name VARCHAR(255) NOT NULL,
        address TEXT,
        manager_name VARCHAR(100),
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        default_receiving_bin_id UUID,
        default_dispatch_bin_id UUID,
        default_returns_bin_id UUID
    )
    """,
    "CREATE INDEX IF NOT EXISTS ix_warehouses_organization_id ON warehouses(organization_id)",
    "CREATE INDEX IF NOT EXISTS ix_warehouses_code ON warehouses(code)",

    # ZONES
    """
    CREATE TABLE IF NOT EXISTS warehouse_zones (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        code VARCHAR(50) NOT NULL,
        name VARCHAR(100) NOT NULL,
        storage_type VARCHAR(50),
        status VARCHAR(20) NOT NULL DEFAULT 'active'
    )
    """,
    "CREATE INDEX IF NOT EXISTS ix_warehouse_zones_warehouse_id ON warehouse_zones(warehouse_id)",

    # BINS
    """
    CREATE TABLE IF NOT EXISTS warehouse_bins (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
        zone_id UUID NOT NULL REFERENCES warehouse_zones(id) ON DELETE CASCADE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        code VARCHAR(50) NOT NULL,
        aisle VARCHAR(20),
        rack VARCHAR(20),
        shelf VARCHAR(20),
        bin_number VARCHAR(20),
        status VARCHAR(20) NOT NULL DEFAULT 'available'
    )
    """,
    "CREATE INDEX IF NOT EXISTS ix_warehouse_bins_zone_id ON warehouse_bins(zone_id)",

    # TRANSPORTERS
    """
    CREATE TABLE IF NOT EXISTS transporters (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        code VARCHAR(50) NOT NULL,
        name VARCHAR(255) NOT NULL,
        gstin VARCHAR(15),
        contact_person VARCHAR(100),
        phone VARCHAR(20),
        status VARCHAR(20) NOT NULL DEFAULT 'active'
    )
    """,
    "CREATE INDEX IF NOT EXISTS ix_transporters_code ON transporters(code)",

    # VEHICLES
    """
    CREATE TABLE IF NOT EXISTS vehicles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        transporter_id UUID NOT NULL REFERENCES transporters(id) ON DELETE CASCADE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        registration_number VARCHAR(50) NOT NULL,
        vehicle_type VARCHAR(50),
        capacity_kg NUMERIC(10,2),
        driver_name VARCHAR(100),
        status VARCHAR(20) NOT NULL DEFAULT 'active'
    )
    """,
    "CREATE INDEX IF NOT EXISTS ix_vehicles_registration_number ON vehicles(registration_number)",
]

# Add FK constraint back to principal_warehouse_mappings
restore_fk = """
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'principal_warehouse_mappings_warehouse_id_fkey'
        AND table_name = 'principal_warehouse_mappings'
    ) THEN
        ALTER TABLE principal_warehouse_mappings
        ADD CONSTRAINT principal_warehouse_mappings_warehouse_id_fkey
        FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE;
    END IF;
END $$;
"""

print("Connecting to database...")
with psycopg.connect(conn_str) as conn:
    with conn.cursor() as cur:
        for sql in migrations:
            cur.execute(sql)
        
        cur.execute(restore_fk)
    
    conn.commit()
    print("DOC-13 database migration completed successfully!")
