"""
Migration script: Rename company_id -> organization_id on old tables
and re-point the FK to the 'organizations' table.
This is a safe one-time migration.
"""
from database import engine
from sqlalchemy import text

# Tables that need company_id renamed to organization_id
# and FK updated from companies.id -> organizations.id
TABLES_TO_MIGRATE = [
    "bulletins",
    "products",
    "invoices",
    "ledgers",
]

# Also migrate users table
USER_TABLE = "users"

with engine.begin() as conn:
    print("Starting migration...")

    for table in TABLES_TO_MIGRATE:
        # Check if company_id still exists
        result = conn.execute(text(f"""
            SELECT column_name FROM information_schema.columns
            WHERE table_name = '{table}' AND column_name = 'company_id'
        """))
        if result.fetchone():
            print(f"\n  Migrating [{table}]...")
            # 1. Drop old FK constraint
            fks = conn.execute(text(f"""
                SELECT constraint_name FROM information_schema.table_constraints
                WHERE table_name = '{table}' AND constraint_type = 'FOREIGN KEY'
            """)).fetchall()
            for fk in fks:
                fk_name = fk[0]
                # check if this constraint involves company_id
                cols = conn.execute(text(f"""
                    SELECT column_name FROM information_schema.key_column_usage
                    WHERE constraint_name = '{fk_name}' AND table_name = '{table}'
                """)).fetchall()
                col_names = [c[0] for c in cols]
                if 'company_id' in col_names:
                    print(f"    Dropping FK: {fk_name}")
                    conn.execute(text(f'ALTER TABLE "{table}" DROP CONSTRAINT "{fk_name}"'))

            # 2. Rename column
            print(f"    Renaming company_id -> organization_id")
            conn.execute(text(f'ALTER TABLE "{table}" RENAME COLUMN company_id TO organization_id'))

            # 3. Add new FK constraint pointing to organizations
            print(f"    Adding FK to organizations.id")
            conn.execute(text(f"""
                ALTER TABLE "{table}"
                ADD CONSTRAINT "{table}_organization_id_fkey"
                FOREIGN KEY (organization_id)
                REFERENCES organizations(id)
                ON DELETE CASCADE
            """))
            print(f"    [{table}] DONE")
        else:
            print(f"  [{table}] already has organization_id, skipping.")

    # Migrate users table
    result = conn.execute(text("""
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'company_id'
    """))
    if result.fetchone():
        print(f"\n  Migrating [users]...")
        fks = conn.execute(text("""
            SELECT constraint_name FROM information_schema.table_constraints
            WHERE table_name = 'users' AND constraint_type = 'FOREIGN KEY'
        """)).fetchall()
        for fk in fks:
            fk_name = fk[0]
            cols = conn.execute(text(f"""
                SELECT column_name FROM information_schema.key_column_usage
                WHERE constraint_name = '{fk_name}' AND table_name = 'users'
            """)).fetchall()
            col_names = [c[0] for c in cols]
            if 'company_id' in col_names:
                print(f"    Dropping FK: {fk_name}")
                conn.execute(text(f'ALTER TABLE "users" DROP CONSTRAINT "{fk_name}"'))

        conn.execute(text('ALTER TABLE "users" RENAME COLUMN company_id TO organization_id'))
        conn.execute(text("""
            ALTER TABLE "users"
            ADD CONSTRAINT "users_organization_id_fkey"
            FOREIGN KEY (organization_id)
            REFERENCES organizations(id)
            ON DELETE CASCADE
        """))
        print("    [users] DONE")
    else:
        print("  [users] already has organization_id, skipping.")

    print("\nMigration complete!")
