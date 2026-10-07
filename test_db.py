import sqlite3
conn = sqlite3.connect('backend/erp.db')
c = conn.cursor()
c.execute("SELECT name FROM sqlite_master WHERE type='table';")
print("TABLES:")
for row in c.fetchall(): print(row[0])
try:
    c.execute("SELECT * FROM fiscal_years")
    print("\nFISCAL YEARS:")
    print(c.fetchall())
except Exception as e:
    print(e)
