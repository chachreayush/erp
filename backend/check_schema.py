"""
Check for critical discrepancies between models and DB tables:
1. organizations table uses org_code, but old ledgers/invoices still reference company_id
2. new master tables (salts, manufacturers, hsn_codes, state_codes) use organization_id
3. old tables (products, invoices, ledgers) still use company_id -> they point to the OLD 'companies' table
"""
from database import engine
from sqlalchemy import text, inspect

inspector = inspect(engine)

print("=== TABLE / FOREIGN KEY SUMMARY ===\n")

tables = sorted(inspector.get_table_names(schema='public'))
for t in tables:
    fks = inspector.get_foreign_keys(t, schema='public')
    if fks:
        print(f"[{t}]")
        for fk in fks:
            print(f"  FK: {fk['constrained_columns']} -> {fk['referred_table']}.{fk['referred_columns']}")
        print()

print("\n=== POTENTIAL ISSUES ===\n")

# Check if 'companies' table still exists alongside 'organizations'
if 'companies' in tables and 'organizations' in tables:
    print("WARNING: Both 'companies' AND 'organizations' tables exist in the DB.")
    print("  - 'companies' = OLD table (legacy data from before refactoring)")
    print("  - 'organizations' = NEW table (multi-tenant architecture)")
    print("  Action: Products, invoices, ledgers still point to 'companies'. They need migration.")
    print()

# Check columns that matter
for t in ['products', 'invoices', 'ledgers', 'bulletins', 'invoice_items']:
    if t in tables:
        cols = [c['name'] for c in inspector.get_columns(t, schema='public')]
        if 'company_id' in cols:
            print(f"  {t}: uses 'company_id' (links to 'companies' table - OLD)")
        if 'organization_id' in cols:
            print(f"  {t}: uses 'organization_id' (links to 'organizations' table - NEW)")

print()
for t in ['salts', 'manufacturers', 'hsn_codes', 'state_codes']:
    if t in tables:
        cols = [c['name'] for c in inspector.get_columns(t, schema='public')]
        if 'organization_id' in cols:
            print(f"  {t}: uses 'organization_id' (NEW - CORRECT)")
        if 'company_id' in cols:
            print(f"  {t}: uses 'company_id' (OLD - needs updating)")
