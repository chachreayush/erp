with open("PROJECT_MEMORY.md", "r", encoding="utf-8") as f:
    code = f.read()

target = "linking employee payables to expense accounts."
replacement = target + "\n  - Added 'Modify Mode' to Ledger Statements: Clicking any entry drills down to edit the original voucher.\n  - Expense Dashboard includes auto-resolved Employee names and expandable rows for line-item visibility."
code = code.replace(target, replacement)

with open("PROJECT_MEMORY.md", "w", encoding="utf-8") as f:
    f.write(code)
