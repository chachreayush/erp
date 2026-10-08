with open("Developer_and_User_Manual.md", "r", encoding="utf-8") as f:
    code = f.read()

target = "#### 1.4 Expense Management (DOC-26)"
replacement = """#### 1.5 Bank Reconciliation (DOC-25)
- **Upload:** Navigate to `Finance -> Bank Reconciliation`.
- **Profiles:** Users can define column mappings for their specific bank's CSV layout once, and reuse it for future uploads.
- **Reconciliation:** The dashboard splits into two panes: Unreconciled Bank Rows and Unreconciled ERP Vouchers. Users manually select one of each to snap them together and lock the accounting record.

""" + target
code = code.replace(target, replacement)

with open("Developer_and_User_Manual.md", "w", encoding="utf-8") as f:
    f.write(code)
