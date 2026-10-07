with open("User_Manual_and_Workflow.md", "r", encoding="utf-8") as f:
    code = f.read()

marker = "### 1. Daily Operations"
replacement = marker + """
#### Managing Employee Expenses
1. Go to **Expense Management**.
2. Click **New Claim**, select the employee, and add items like "Taxi" or "Lunch".
3. Click **Save Draft**.
4. A manager clicks **Approve**. The system will automatically update the core accounting ledgers.
5. **Tip:** In the **Ledger Statement**, you can click on any voucher entry to immediately open and edit it.
"""
code = code.replace(marker, replacement)

with open("User_Manual_and_Workflow.md", "w", encoding="utf-8") as f:
    f.write(code)
