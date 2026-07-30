"""
Full migration:
1. Copy all data from 'companies' to 'organizations' (preserving IDs)
2. For each table with company_id, drop old FK, rename to organization_id, add new FK
3. Done - companies table kept for backup but is no longer in use by models
"""
from database import engine
from sqlalchemy import text

with engine.begin() as conn:
    # Step 1: Copy companies -> organizations
    print("Step 1: Copying companies -> organizations (preserving IDs)...")
    count = conn.execute(text("SELECT COUNT(*) FROM organizations")).scalar()
    if count == 0:
        conn.execute(text("""
            INSERT INTO organizations (id, name, org_code, is_am, address, phone, email, is_active, created_at)
            SELECT id, name, company_code, is_am, address, phone, email, is_active, created_at
            FROM companies
        """))
        inserted = conn.execute(text("SELECT COUNT(*) FROM organizations")).scalar()
        print(f"  Copied {inserted} rows into organizations.")
    else:
        print(f"  organizations already has {count} rows, skipping copy.")

    # Step 2: Revert bulletins column rename (was already renamed in previous attempt)
    # Check if bulletins already has organization_id (from previous partial migration)
    cols = [r[0] for r in conn.execute(text(
        "SELECT column_name FROM information_schema.columns WHERE table_name='bulletins'"
    )).fetchall()]
    
    if 'organization_id' in cols:
        print("\nStep 2: bulletins already has organization_id, need to re-add FK constraint...")
        # Just add FK constraint if missing
        existing_fks = [r[0] for r in conn.execute(text(
            "SELECT constraint_name FROM information_schema.table_constraints WHERE table_name='bulletins' AND constraint_type='FOREIGN KEY'"
        )).fetchall()]
        if 'bulletins_organization_id_fkey' not in existing_fks:
            conn.execute(text("""
                ALTER TABLE bulletins
                ADD CONSTRAINT bulletins_organization_id_fkey
                FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
            """))
            print("  Added FK constraint for bulletins.")
        else:
            print("  FK already exists.")
    else:
        print("\nStep 2: Renaming bulletins.company_id -> organization_id...")
        conn.execute(text("ALTER TABLE bulletins DROP CONSTRAINT IF EXISTS bulletins_company_id_fkey"))
        conn.execute(text("ALTER TABLE bulletins RENAME COLUMN company_id TO organization_id"))
        conn.execute(text("""
            ALTER TABLE bulletins
            ADD CONSTRAINT bulletins_organization_id_fkey
            FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
        """))
        print("  Done.")

    # Step 3: products
    cols = [r[0] for r in conn.execute(text(
        "SELECT column_name FROM information_schema.columns WHERE table_name='products'"
    )).fetchall()]
    if 'company_id' in cols:
        print("\nStep 3: Migrating products...")
        conn.execute(text("ALTER TABLE products DROP CONSTRAINT IF EXISTS products_company_id_fkey"))
        conn.execute(text("ALTER TABLE products RENAME COLUMN company_id TO organization_id"))
        conn.execute(text("""
            ALTER TABLE products
            ADD CONSTRAINT products_organization_id_fkey
            FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
        """))
        print("  Done.")
    else:
        print("\nStep 3: products already migrated.")

    # Step 4: invoices
    cols = [r[0] for r in conn.execute(text(
        "SELECT column_name FROM information_schema.columns WHERE table_name='invoices'"
    )).fetchall()]
    if 'company_id' in cols:
        print("\nStep 4: Migrating invoices...")
        conn.execute(text("ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_company_id_fkey"))
        conn.execute(text("ALTER TABLE invoices RENAME COLUMN company_id TO organization_id"))
        conn.execute(text("""
            ALTER TABLE invoices
            ADD CONSTRAINT invoices_organization_id_fkey
            FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
        """))
        print("  Done.")
    else:
        print("\nStep 4: invoices already migrated.")

    # Step 5: ledgers
    cols = [r[0] for r in conn.execute(text(
        "SELECT column_name FROM information_schema.columns WHERE table_name='ledgers'"
    )).fetchall()]
    if 'company_id' in cols:
        print("\nStep 5: Migrating ledgers...")
        conn.execute(text("ALTER TABLE ledgers DROP CONSTRAINT IF EXISTS ledgers_company_id_fkey"))
        conn.execute(text("ALTER TABLE ledgers RENAME COLUMN company_id TO organization_id"))
        conn.execute(text("""
            ALTER TABLE ledgers
            ADD CONSTRAINT ledgers_organization_id_fkey
            FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
        """))
        print("  Done.")
    else:
        print("\nStep 5: ledgers already migrated.")

    # Step 6: users
    cols = [r[0] for r in conn.execute(text(
        "SELECT column_name FROM information_schema.columns WHERE table_name='users'"
    )).fetchall()]
    if 'company_id' in cols:
        print("\nStep 6: Migrating users...")
        conn.execute(text("ALTER TABLE users DROP CONSTRAINT IF EXISTS users_company_id_fkey"))
        conn.execute(text("ALTER TABLE users RENAME COLUMN company_id TO organization_id"))
        conn.execute(text("""
            ALTER TABLE users
            ADD CONSTRAINT users_organization_id_fkey
            FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
        """))
        print("  Done.")
    else:
        print("\nStep 6: users already migrated.")

    # Step 7: sessions (user_id FK is fine, no company_id)
    print("\nStep 7: sessions - no company_id to migrate.")

    print("\n=== MIGRATION COMPLETE ===")
    print("Summary:")
    for t in ['organizations', 'bulletins', 'products', 'invoices', 'ledgers', 'users']:
        cols = [r[0] for r in conn.execute(text(
            f"SELECT column_name FROM information_schema.columns WHERE table_name='{t}'"
        )).fetchall()]
        has_org = 'organization_id' in cols
        has_comp = 'company_id' in cols
        print(f"  {t}: organization_id={has_org}, company_id={has_comp}")
