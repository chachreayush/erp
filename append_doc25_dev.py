with open("DEVELOPER_MANUAL.md", "r", encoding="utf-8") as f:
    code = f.read()

target = "### 3.4 Expense & Reimbursement Engine (DOC-26)"
replacement = """### 3.5 Bank Statement Import Engine (DOC-25)
- **Path:** `backend/api/finance_v2.py` (Bank Endpoints) & `src/pages/finance/BankReconciliation.tsx`
- **Architecture:** 
  - `BankStatementProfile`: Dynamically maps CSV columns to DB fields (supports HDFC, SBI, ICICI, etc.).
  - `BankStatementRow`: Stores raw unreconciled lines.
  - `BankReconciliationMatch`: Junction table locking a Statement Row to a specific `Voucher`.
  - **UI:** A dual-pane interface allowing manual 1-to-1 visual matching of CSV rows against pending ERP vouchers.

""" + target
code = code.replace(target, replacement)

with open("DEVELOPER_MANUAL.md", "w", encoding="utf-8") as f:
    f.write(code)
