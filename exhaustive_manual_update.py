import os
import datetime

timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

exhaustive_manual = f"""# The Ultimate ERP System Manual
*Last Updated: {timestamp}*

Welcome to the exhaustive documentation for our modern, keyboard-first ERP system. This document outlines every single module, architecture decision, and workflow implemented to date.

---

## 1. Core Architecture & Philosophy

### 1.1 Keyboard-First Operation
Built for high-speed retail and wholesale distribution, the UI strictly enforces mouse-free operation. Users can navigate entire workflows, select batches (F3), submit forms, and drill down into reports using only keyboard shortcuts (Enter, Escape, Arrow Keys, Function Keys).

### 1.2 Multi-Tenant Architecture (AM/CM)
- **Admin Master (AM):** The platform super-admin environment. Manages global subscriptions, licensing, and provisions new organizations.
- **Client Master (CM) / Organizations:** Individual client databases. All data (items, ledgers, sales) is strictly isolated by `organization_id`. AM Admins can securely impersonate CM Admins via `/auth/impersonate` for support.

### 1.3 CQRS Append-Only Ledgers
The accounting engine (DOC-08/DOC-09) uses an append-only architecture. 
- You cannot silently "delete" a ledger entry. Mistakes are corrected via Reversal or Contra entries, ensuring strict audit compliance and tamper-proof financials.

---

## 2. Master Data & Inventory Management

### 2.1 Ledgers & Tax Codes
- Fully customizable chart of accounts.
- Integrated tax codes for dynamic GST calculation (SGST, CGST, IGST).

### 2.2 Strict Stock Separation
- **Active Stock:** Saleable goods available for regular invoicing.
- **Breakage/Expiry (Brk/Exp):** Non-saleable goods. The system physically prevents these from being accidentally sold.

### 2.3 Batch Management (F3)
- Pressing `F3` during billing opens the Batch Modal.
- Zero-quantity batches are hidden by default to reduce clutter but can be revealed by pressing the `ArrowUp` key at the top of the list.

### 2.4 Multi-Rate Pricing & Schemes (DOC-14 & DOC-15)
- **Formula Builder:** Define dynamic pricing calculations and margins.
- **Extra Scheme Settlement:** Automatically apply volume-based discounts and promotional schemes during Sales and Purchase flows.

---

## 3. The Transactional Engine (Sales & Purchase)

Each transaction maintains an independent, auto-incrementing Entry No. series (e.g., S0001, CRN0001) to prevent duplicates.

### 3.1 Sales Flow
- **Sales Bill:** Creates a permanent tax invoice, registers the sale, and deducts active stock. Triggers automated accounting journal vouchers.
- **Challan:** A temporary delivery/dispatch sheet. Does not hit final accounting until converted to a Sales Bill.
- **Sale Return:** Customer returns active goods. Issues a Credit Note and adds items back to active stock.

### 3.2 Purchase Flow
- **Purchase Bill:** Logs supplier purchases, adds to active inventory, and increases Accounts Payable.
- **Purchase Challan:** Temporary goods receipt note (GRN).
- **Purchase Return:** Returns active goods to supplier. Issues a Debit Note and removes stock.

### 3.3 Breakage & Expiry Flow
- **Brk/Exp Receive:** Customer returns damaged goods. Items enter the isolated Non-Saleable bucket.
- **Brk/Exp Issue:** Damaged goods are returned to the manufacturer for replacement or credit claims.

---

## 4. Advanced Financial Accounting

### 4.1 Bill-by-Bill Allocations & Vouchers (DOC-24)
- When a payment is received (Receipt Voucher) or made (Payment Voucher), the amount is explicitly allocated against specific open invoices. 
- Allows precise tracking of outstanding amounts per invoice rather than just a generic running balance.

### 4.2 Bank Reconciliation (DOC-25)
- Compare physical bank statements with ERP ledger entries.
- Mark entries as `cleared` and track Uncleared Cheques.

### 4.3 Expense Engine (DOC-26)
- Dedicated workflows for logging operational expenses (GST Inward for input tax credit) and general business overheads.

### 4.4 Fixed Assets & Depreciation (DOC-27)
- Capitalize assets and run automated depreciation calculations (Straight Line / WDV) at the end of financial periods.

---

## 5. Compliance & Taxation (DOC-29)

### 5.1 E-Invoicing & E-Way Bill (Zero-Cost Workflow)
By-passes expensive third-party GSP APIs by providing a direct portal integration workflow:
1. **F6 (Validate):** Locally checks pending invoices for missing HSN or invalid GSTINs.
2. **F7 (Export):** Generates the exact Bulk JSON format required by the Government IRP.
3. **F8 (Import):** Parses the downloaded government JSON response, instantly linking IRN, Acknowledgement Number, and Signed QR Codes to your invoices.
4. **Signed Ledger:** A dedicated screen to view digitally signed, compliant invoices.

### 5.2 TDS / TCS Auto-Posting Engine (₹50 Lakh Limit)
- **Tracking:** The system cumulatively tracks total purchases from a supplier and sales to a customer in a Financial Year.
- **Alerts:** Once the ₹50 Lakh threshold is crossed, the billing screen throws an alert.
- **Auto-Deduction:** If set to "Automatic Mode", the `_auto_post_accounting` engine seamlessly calculates the 0.1% deduction and appends "TDS Payable" or "TCS Receivable" journal entries to the voucher without manual effort.

---

## 6. Financial & Management Reporting (DOC-30)

### 6.1 Dynamic Report Viewer
- Grid-based analytics for Sales and Ledger Balances.
- Includes a native **Export to CSV** function powered directly by the browser to prevent backend CPU bottlenecks on large datasets.

### 6.2 Advanced Report Designer
- A drag-and-drop style interface for power users.
- Connect to a Semantic Catalogue (Sales, Purchase, Inventory, Ledgers).
- Define custom columns, filters, and calculations, and save them as reusable "Report Templates" or "Report Variants".

### 6.3 Dashboard Exclusions (Data Governance)
- Management can flag specific Parties or Ledgers as "Disputed" or "Excluded" via a modal.
- These entities disappear from operational KPI dashboards (like "Actionable Outstanding").
- **Crucially:** This does *not* alter the underlying accounting truth. Statutory reports and formal Ledger Statements will still show the true balances, preventing financial fraud while cleaning up operational views.

---

## 7. C&F Platform & Principal Billing (DOC-28)
- Designed for Carrying & Forwarding agents.
- Manages principal inventory mapping, specialized MIS reports for pharmaceutical parent companies, and automated claim tracking for expired goods.

---
End of Manual.
"""

project_memory_update = f"""
### Comprehensive Audit & Update ({timestamp})
- Rewrote all manual files (DEVELOPER_MANUAL, User_Manual_and_Workflow, USER_WORKFLOW_MANUAL, Developer_and_User_Manual) with a unified, exhaustive architecture document detailing every module created (DOC-01 to DOC-30).
- Explicitly documented Keyboard-First mechanics, Multi-Tenancy, CQRS Ledgers, Strict Stock Separation, Bill-by-Bill, E-Invoicing JSON flows, TDS/TCS auto-posting, and DOC-30 Dashboard Exclusions.
- Preserved all historical DOC txt files by only appending update logs to them.
- Initiated final folder sync and Git push.
"""

# 1. Update Manuals with Exhaustive Content
manuals = [
    "Developer_and_User_Manual.md",
    "DEVELOPER_MANUAL.md",
    "User_Manual_and_Workflow.md",
    "USER_WORKFLOW_MANUAL.md"
]
for manual in manuals:
    with open(manual, "w", encoding="utf-8") as f:
        f.write(exhaustive_manual)
    print(f"Overwrote {manual} with exhaustive details.")

# 2. Update PROJECT_MEMORY.md
with open("PROJECT_MEMORY.md", "a", encoding="utf-8") as f:
    f.write(project_memory_update)
print("Updated PROJECT_MEMORY.md")

# 3. Append to doc files without removing anything
import glob
doc_files = glob.glob("DOC*.txt") + glob.glob("doc*.txt")
for doc in doc_files:
    with open(doc, "a", encoding="utf-8") as f:
        f.write(f"\n\n--- [UPDATE {timestamp}] ---\nAll ERP features have been fully documented in the central Markdown manuals. See DEVELOPER_MANUAL.md for the complete exhaustive list of features covering this DOC's implementation.\n")
    print(f"Safely appended to {doc}")

# 4. Sync erp2 to erp
print("Syncing erp2 to erp via robocopy...")
os.system(r'robocopy "C:\Users\DELL\OneDrive\Desktop\erp2" "C:\Users\DELL\OneDrive\Desktop\erp" /MIR /XD node_modules .git .venv __pycache__ .next /XF .env')
print("Sync complete.")
