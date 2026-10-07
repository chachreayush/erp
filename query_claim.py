import psycopg2

conn = psycopg2.connect("postgresql://neondb_owner:npg_Uc8aqKlud7wH@ep-solitary-king-azv4zx0l.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require")
cur = conn.cursor()

# Get the employee ledger
cur.execute("""
    SELECT l.name 
    FROM expense_claims ec
    JOIN ledgers l ON ec.employee_ledger_id = l.id
    WHERE ec.claim_number = 'EXP-0001'
""")
employee = cur.fetchone()

# Get the expense ledgers
cur.execute("""
    SELECT ecat.name, l.name, el.amount
    FROM expense_claims ec
    JOIN expense_lines el ON el.claim_id = ec.id
    JOIN expense_categories ecat ON el.category_id = ecat.id
    JOIN ledgers l ON ecat.ledger_id = l.id
    WHERE ec.claim_number = 'EXP-0001'
""")
lines = cur.fetchall()

print(f"Employee Ledger: {employee[0] if employee else 'Not Found'}")
for i, line in enumerate(lines):
    print(f"Line {i+1}: Category '{line[0]}' mapped to Ledger '{line[1]}' for Amount {line[2]}")

