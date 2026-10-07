import requests
import psycopg2

# 1. Connect to DB to get Organization ID and an Expense Ledger ID
conn = psycopg2.connect("postgresql://neondb_owner:npg_Uc8aqKlud7wH@ep-solitary-king-azv4zx0l.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require")
cur = conn.cursor()

cur.execute("SELECT id FROM organizations LIMIT 1")
org_id = cur.fetchone()[0]

# Find a ledger that looks like an expense
cur.execute("SELECT id FROM ledgers WHERE organization_id = %s LIMIT 1", (org_id,))
ledger_id = cur.fetchone()[0]

categories = [
    ("Travel & Commute", "Taxi, Train, Flights"),
    ("Meals & Entertainment", "Team lunches, client dinners"),
    ("Office Supplies", "Stationery, small hardware"),
    ("Miscellaneous", "Other expenses")
]

for name, desc in categories:
    cur.execute("""
        INSERT INTO expense_categories (id, organization_id, name, description, ledger_id, is_active)
        VALUES (gen_random_uuid(), %s, %s, %s, %s, true)
    """, (org_id, name, desc, ledger_id))

conn.commit()
print("Seeded expense categories!")
