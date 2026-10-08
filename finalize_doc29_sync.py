import os
import shutil
import subprocess

docs_to_append = [
    "Developer_and_User_Manual.md",
    "DEVELOPER_MANUAL.md",
    "User_Manual_and_Workflow.md",
    "USER_WORKFLOW_MANUAL.md"
]

append_content = """

### Addendum: DOC-29 Automatic TDS/TCS Ledger Posting
- **Cumulative Engine**: The backend automatically tracks a party's cumulative transaction total via the `TdsTcsTransaction` log.
- **Automatic Accounting**: When the ₹50 Lakh threshold is crossed, and the Party's `tds_tcs_mode` is set to "AUTOMATIC", the ERP's `_auto_post_accounting` engine takes over.
- **Journal Vouchers**: It automatically calculates the 0.1% TDS (or higher if non-filer) and instantly passes a Journal Voucher to debit/credit the "TDS Payable" / "TCS Receivable" ledgers against the Party's ledger, ensuring compliance without manual intervention.
"""

# 1. Update Manuals
for doc in docs_to_append:
    path = os.path.join(os.getcwd(), doc)
    if os.path.exists(path):
        with open(path, 'a', encoding='utf-8') as f:
            f.write(append_content)
        print(f"Updated {doc}")

# 2. Update PROJECT_MEMORY.md
pm_path = "PROJECT_MEMORY.md"
pm_content = """
### [2026-10-08] DOC-29 Extension: Auto-Posting Engine
- **Implementation**: Injected logic into `backend/api/sales.py` (`_auto_post_accounting`) to autonomously check `TdsTcsTransaction` for ₹50L limits.
- **Ledger Generation**: Automatically adjusts Party Debits/Credits and generates "TDS Payable" / "TCS Receivable" entries within the core finance engine.
- **Frontend Intercept**: Finalized the `TdsTcsAlertModal` into `SalesBill` and `PurchaseBill` React components.
"""
if os.path.exists(pm_path):
    with open(pm_path, 'a', encoding='utf-8') as f:
        f.write(pm_content)
    print("Updated PROJECT_MEMORY.md")

# 3. Sync to erp
print("Syncing erp2 to erp...")
# Copying ignoring node_modules, .venv, .git, .next, etc.
def sync_folders():
    src = os.getcwd()
    dst = os.path.abspath(os.path.join(src, "..", "erp"))
    
    if not os.path.exists(dst):
        print(f"Destination {dst} does not exist. Cannot sync.")
        return
        
    print(f"Syncing from {src} to {dst}")
    
    # Simple robocopy
    cmd = f'robocopy "{src}" "{dst}" /MIR /XD node_modules .venv .git dist build .system_generated .user_uploaded'
    subprocess.run(cmd, shell=True)

sync_folders()
print("Sync complete.")
