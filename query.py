
import sqlite3
conn = sqlite3.connect('backend/erp.db')
c = conn.cursor()
c.execute('SELECT id, invoice_number, invoice_type, created_at FROM invoices WHERE invoice_number=\'S0003\'')
for row in c.fetchall():
    print(row)

