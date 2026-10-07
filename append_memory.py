with open("PROJECT_MEMORY.md", "r", encoding="utf-8") as f:
    code = f.read()

marker = "### Completed Modules"
replacement = marker + "\n- **DOC-26: Expense, Petty Cash & Employee Reimbursement Engine**\n  - Dedicated `expense_claims`, `expense_lines`, and `expense_categories` tables.\n  - `ExpenseManagement.tsx` dashboard and interactive multi-line entry modal.\n  - Approval workflow automatically converts drafted claims into Journal Vouchers linking employee payables to expense accounts."

code = code.replace(marker, replacement)

with open("PROJECT_MEMORY.md", "w", encoding="utf-8") as f:
    f.write(code)
