with open("backend/api/finance_v2.py", "r", encoding="utf-8") as f:
    code = f.read()

code = code.replace("inv.net_amount", "inv.grand_total")
code = code.replace("inv.invoice_date", "inv.date")

with open("backend/api/finance_v2.py", "w", encoding="utf-8") as f:
    f.write(code)
