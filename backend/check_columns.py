"""Check column structure for every table in PostgreSQL"""
from database import engine
from sqlalchemy import text, inspect

inspector = inspect(engine)

tables = sorted(inspector.get_table_names(schema='public'))
print(f"Total tables in DB: {len(tables)}")
print("=" * 60)
for t in tables:
    cols = inspector.get_columns(t, schema='public')
    col_names = [c['name'] for c in cols]
    print(f"\n[{t}]")
    print(f"  Columns ({len(cols)}): {', '.join(col_names)}")
