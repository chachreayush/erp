# Enterprise ERP — Git Workflow & Repository Management Manual
*Complete Multi-Folder Synchronization, Version Control, and Release Guide*

This document outlines the version control architecture, synchronization commands, and release procedures connecting the development workspace (`erp2`), the local Git repository (`erp`), and the GitHub remote origin.

---

## 1. Repository Architecture & Topography

```
+-----------------------------------------------------------------------------------+
|                        DEV WORKSPACE: C:\...\Desktop\erp2                         |
|  - Active coding directory                                                        |
|  - Running Vite dev server (Port 50005) & FastAPI (Port 8000)                     |
+-----------------------------------------------------------------------------------+
                                        |
                 +----------------------+----------------------+
                 | Robocopy Synchronization Commands
                 v
+-----------------------------------------------------------------------------------+
|                     LOCAL GIT REPOSITORY: C:\...\Desktop\erp                      |
|  - Houses the .git metadata directory                                             |
|  - Tracks commits on branch: main                                                 |
+-----------------------------------------------------------------------------------+
                                        |
                 +----------------------+----------------------+
                 | git push origin main
                 v
+-----------------------------------------------------------------------------------+
|                     GITHUB REMOTE ORIGIN (PRODUCTION SOURCE)                      |
|  - URL: https://github.com/chachreayush/erp.git                                   |
|  - Triggers automated CI/CD deployments to Vercel (Frontend) & Render (Backend)  |
+-----------------------------------------------------------------------------------+
```

---

## 2. The Two-Folder Synchronization Engine

Because the primary development occurs in `erp2` while the `.git` repository folder is `erp`, an automated synchronization process mirrors tested, verified code to `erp` before committing.

### 2.1 Automated Synchronization Script (`sync_to_erp.py`)

A dedicated script `sync_to_erp.py` in the workspace root automates the entire mirroring process using Windows `robocopy` and properly handles exit codes:

```python
# sync_to_erp.py
import subprocess
import sys

def run_sync():
    commands = [
        ['robocopy', r'C:\Users\DELL\OneDrive\Desktop\erp2\src', r'C:\Users\DELL\OneDrive\Desktop\erp\src', '/MIR', '/XD', 'node_modules'],
        ['robocopy', r'C:\Users\DELL\OneDrive\Desktop\erp2\backend', r'C:\Users\DELL\OneDrive\Desktop\erp\backend', '/MIR', '/XD', '__pycache__', '.venv', '.pytest_cache'],
        ['robocopy', r'C:\Users\DELL\OneDrive\Desktop\erp2', r'C:\Users\DELL\OneDrive\Desktop\erp', '*.md', '*.json', '*.txt', '*.html', '*.py', '*.docx', '/XF', 'package-lock.json', '/XD', 'node_modules', 'backend', 'src', '.git']
    ]
    for cmd in commands:
        res = subprocess.run(cmd, capture_output=True, text=True)
        # Note: Robocopy returns 0 (no changes) or 1 (files copied successfully)
        if res.returncode > 1:
            print(f"Error executing {cmd[1]}: Return code {res.returncode}")
            sys.exit(res.returncode)
    print("Synchronization to original erp folder completed successfully!")
```

Run simply with:
```powershell
C:\Python313\python.exe sync_to_erp.py
```

### 2.2 Manual Robocopy Commands Reference

Execute these commands in Windows PowerShell if manual execution is preferred:

```powershell
# 1. Synchronize Frontend Source (/src)
robocopy "C:\Users\DELL\OneDrive\Desktop\erp2\src" "C:\Users\DELL\OneDrive\Desktop\erp\src" /MIR /XD node_modules

# 2. Synchronize Backend Source (/backend)
robocopy "C:\Users\DELL\OneDrive\Desktop\erp2\backend" "C:\Users\DELL\OneDrive\Desktop\erp\backend" /MIR /XD __pycache__ .venv .pytest_cache

# 3. Synchronize Documentation, Word Master Walkthroughs, Scripts & Configs
robocopy "C:\Users\DELL\OneDrive\Desktop\erp2" "C:\Users\DELL\OneDrive\Desktop\erp" *.md *.json *.txt *.html *.py *.docx /XF package-lock.json /XD node_modules backend src .git
```

> [!CAUTION]
> The `/XD node_modules .git` and `/XF package-lock.json` flags are mandatory. Never copy or mirror the `.git` folder from destination or delete it. In Robocopy, exit codes `0` (no files copied) and `1` (files successfully copied) are both success states. Any exit code $\ge 8$ signifies an error.

---

## 3. Git Release & Push Workflow

Once the folders are mirrored, execute the Git release sequence in `C:\Users\DELL\OneDrive\Desktop\erp`:

### Step 1: Check Working Tree Status
```powershell
cd C:\Users\DELL\OneDrive\Desktop\erp
git status
```
Verify that modified files correspond to the modules, Word master walkthrough (`ERP_ENTERPRISE_SYSTEM_COMPLETE_SOFTWARE_MASTER_WALKTHROUGH.docx`), and manuals recently updated.

### Step 2: Stage, Commit & Push
> [!NOTE]
> In Windows PowerShell, chain shell commands using the semicolon (`;`), not `&&`:

```powershell
git add . ; git commit -m "docs: exhaustive update of master walkthrough docx, user workflows, and developer manuals" ; git push origin main
```

This triggers the continuous deployment webhook on Vercel, deploying the application live to `https://erp-rho-three.vercel.app`.

### Step 3: Automated Verification Runbook (20 Test Suites)
Before staging releases, run the comprehensive local and cloud verification suites:
```powershell
# 1. Type check
npx tsc --noEmit

# 2. Automated Selenium Test Suites
C:\Python313\python.exe test_master_all_6_modules_selenium.py
C:\Python313\python.exe test_reports_and_finance_selenium.py
C:\Python313\python.exe test_gst_compliance_selenium.py
C:\Python313\python.exe test_receipt_payment_settlement_selenium.py
C:\Python313\python.exe test_journal_accrual_engine_selenium.py
C:\Python313\python.exe test_direct_expense_ui_selenium.py
C:\Python313\python.exe test_fixed_assets_selenium.py
C:\Python313\python.exe test_bank_recon_cash_selenium.py
C:\Python313\python.exe test_dashboard_bi_control_center_selenium.py
C:\Python313\python.exe test_workflow_approval_automation_selenium.py
C:\Python313\python.exe test_audit_governance_selenium.py
C:\Python313\python.exe test_cargo_consignment_selenium.py
C:\Python313\python.exe test_freight_logistics_selenium.py
C:\Python313\python.exe test_principal_operations_selenium.py
C:\Python313\python.exe test_client_commission_billing_selenium.py
C:\Python313\python.exe test_pharma_expiry_quarantine_selenium.py
C:\Python313\python.exe test_gst_einvoice_eway_selenium.py
C:\Python313\python.exe test_gstr2b_reconciliation_selenium.py
C:\Python313\python.exe test_client_management_modal_selenium.py
C:\Python313\python.exe test_procurement_po_replenishment_selenium.py
```

### Step 4: Live Cloud Verification
Run the automated Selenium suites against the live Vercel deployment:
```powershell
C:\Python313\python.exe verify_live_vercel_receipt_payment_audit.py
C:\Python313\python.exe verify_live_vercel_freight_audit.py
C:\Python313\python.exe verify_live_vercel_principal_audit.py
C:\Python313\python.exe verify_live_vercel_commission_audit.py
C:\Python313\python.exe verify_live_vercel_client_creation.py
```
This guarantees 100% production uptime, validates cloud multi-tenant client creation, and records visual proof artifacts.

---

## 4. Git Best Practices & Safety Rules

1. **Verify Before Syncing**: Never run the Robocopy mirror command while compilation or tests are failing in `erp2`. Always run `npx tsc --noEmit` and `npm run build` first.
2. **Never Commit Secrets**: Ensure `.env` in `backend` and `src` is listed in `.gitignore` so database passwords and secret keys are never exposed on GitHub.
3. **Branch Protection**: The `main` branch represents production code deployed to live pharmacies and cashiers. Ensure all changes are verified via Selenium before pushing to `main`.
4. **Recent Production Releases**:
   - `HEAD`: "feat(doc-45): enterprise purchase order, stock replenishment radar & vendor procurement desk"
   - `c4f529a`: "docs: exhaustive synchronization of all enterprise developer, user and master walkthrough manuals"
   - `2e2a264`: "chore: update live vercel client registration test with synthetic react setter"
   - `e112a7c`: "fix(client-reg): add semantic DOM IDs for client registration modal and trigger elements"
   - `55b0a44`: "fix(auth): authenticate demo access with live cloud credentials and auto-upgrade session for client registration on vercel"
   - `faf8114`: "feat(doc-43): statutory multi-state gstr-1, gstr-2b & gstr-3b reconciliation cockpit with 2b itc matching engine"
   - `ea6c341`: "fix(client-registration): resolve timeout, pydantic attribute error, and normalize org_code"
   - `06e6bf4`: "feat(doc-42): statutory gst e-way bill & e-invoice desk with nic json & transport slips"
   - `35475e0`: "docs: exhaustive update across all developer and user manuals and master walkthrough docx"
   - `f84a34c`: "feat(doc-41): pharma expiry radar, stock shift quarantine & principal claim settlement desk"

---
*End of Git Workflow Manual.*


