from database import engine
from sqlalchemy import text

with engine.connect() as conn:
    comp = conn.execute(text("SELECT id, name, is_am FROM companies LIMIT 10")).fetchall()
    orgs = conn.execute(text("SELECT id, name, is_am FROM organizations LIMIT 10")).fetchall()
    print("Companies table:")
    for r in comp:
        print(f"  {r[1]} | is_am={r[2]} | {r[0]}")
    print("\nOrganizations table:")
    for r in orgs:
        print(f"  {r[1]} | is_am={r[2]} | {r[0]}")
