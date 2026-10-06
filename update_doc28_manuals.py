import os
from datetime import datetime

date_str = datetime.now().strftime("%Y-%m-%d")

memory_update = f"""
### [{date_str}] DOC-28: Bank Reconciliation & Cash Control Engine
- **Models**: Added `BankStatementProfile`, `BankStatementImport`, `BankStatementRow`, and `BankReconciliationMatch` to securely store raw statement records and immutable matching links.
- **API**: Implemented `/api/finance/bank-statements/upload` to parse CSVs dynamically using saved column mapping profiles. Added matching endpoints with row-level locks.
- **Frontend**: Created dual-pane `BankReconciliation.tsx` to view un-matched statement rows alongside un-matched ERP vouchers (Payments/Receipts). Added a profile creation wizard for standardizing bank CSV formats (HDFC, SBI, etc.).
- **Fixes**: Cleaned up incorrect relationships in the `Product` model that were causing a 500 Internal Server Error during authentication. Added `[ESC]` key hook for quick navigation across new modules.
"""

dev_update = f"""
## DOC-28: Bank Reconciliation Engine ({date_str})
**Architecture Notes**:
- Reconciliations are managed outside standard Vouchers. A new set of tables (`BankStatementRow` & `BankReconciliationMatch`) act as a bridge between imported CSV rows and `VoucherEntry`.
- **Dynamic CSV Parsing**: Instead of hardcoding formats, `BankStatementProfile` stores JSON mappings (e.g., `{{"date": "Value Date", "withdrawal": "Debit"}}`). The `upload` endpoint dynamically uses these mappings to interpret bank-specific CSVs.
- **Concurrency**: `with_for_update()` is used on `BankStatementRow` during matching to prevent duplicate reconciliations in a multi-user environment.
"""

workflow_update = f"""
## DOC-28: Bank Reconciliation Workflow ({date_str})

### How to Reconcile Bank Statements
1. Go to **Finance & Accounts > Bank Reconciliation**.
2. Select your Bank Ledger from the dropdown at the top.
3. Click **Import Statement**. 
   - *First time?* Select "+ Create New Mapping Profile" and enter the column names exactly as they appear in your Bank's Excel/CSV file (e.g., Profile Name: "HDFC Format", Date Column: "Transaction Date", Withdrawal Column: "Debit").
   - *Next time?* Just select your saved "HDFC Format" from the dropdown.
4. Upload your CSV. The statement rows will populate on the **Left Pane** (Unreconciled Bank Statement).
5. The **Right Pane** automatically shows all un-matched Payments and Receipts logged in the ERP for this ledger.
6. Click one row on the left and one row on the right. The **Match Selected** button will turn blue. Click it to permanently reconcile the two records.
"""

def append_to_file(filepath, content):
    if os.path.exists(filepath):
        with open(filepath, 'a', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {filepath}")
    else:
        print(f"File not found: {filepath}")

append_to_file('PROJECT_MEMORY.md', memory_update)
append_to_file('DEVELOPER_MANUAL.md', dev_update)
append_to_file('USER_WORKFLOW_MANUAL.md', workflow_update)
