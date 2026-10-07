with open("DEVELOPER_MANUAL.md", "r", encoding="utf-8") as f:
    code = f.read()

marker = "## 3. Core Modules"
replacement = marker + """

### 3.4 Expense & Reimbursement Engine (DOC-26)
- **Path:** `backend/api/expenses.py` & `src/pages/finance/ExpenseManagement.tsx`
- **Architecture:** 
  - `ExpenseCategory` maps to exact GL ledgers.
  - `ExpenseClaim` (Header) and `ExpenseLine` (Items) store employee drafts.
  - **Auto-Accounting:** Approving a claim generates a standard `Journal Voucher` programmatically (Debiting Expense Accounts, Crediting the Employee).
  - **Drill-Down:** Ledger statements support drill-down navigation directly into `VoucherEntry` Modify Mode (`PUT /api/finance/vouchers/{id}`).
"""
code = code.replace(marker, replacement)

with open("DEVELOPER_MANUAL.md", "w", encoding="utf-8") as f:
    f.write(code)
