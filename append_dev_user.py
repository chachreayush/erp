with open("Developer_and_User_Manual.md", "r", encoding="utf-8") as f:
    code = f.read()

marker = "### 1. Finance & Accounting"
replacement = marker + """
#### 1.4 Expense Management (DOC-26)
- **Dashboard:** Navigate to `Finance -> Expense Management`.
- **Drafting:** Employees or Admins create claims with multiple categories (e.g., Taxi, Meals).
- **Approval:** Approving a claim instantly translates the entry into a strict accounting Journal Voucher (Cr Employee, Dr Expenses).
- **Ledger Drill-Down:** When viewing Ledger Statements, users can click any row to seamlessly open the original voucher in Modify Mode.
"""
code = code.replace(marker, replacement)

with open("Developer_and_User_Manual.md", "w", encoding="utf-8") as f:
    f.write(code)
