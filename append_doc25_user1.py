with open("User_Manual_and_Workflow.md", "r", encoding="utf-8") as f:
    code = f.read()

target = "#### Managing Employee Expenses"
replacement = """#### Bank Reconciliation
1. Go to **Bank Reconciliation**.
2. Click **Import Bank Statement**.
3. Upload your bank's CSV. If it's a new bank, create a "Mapping Profile" to teach the system which columns correspond to Date, Deposit, Withdrawal, etc.
4. Once uploaded, select an Unreconciled Bank Row from the left pane, and the matching ERP Voucher from the right pane.
5. Click **Match** to reconcile them.

""" + target
code = code.replace(target, replacement)

with open("User_Manual_and_Workflow.md", "w", encoding="utf-8") as f:
    f.write(code)
