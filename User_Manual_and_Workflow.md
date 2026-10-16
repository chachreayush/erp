# Enterprise ERP System — User Manual and Operational Workflows
*Reference Guide for Cashiers, Billing Operators, Store Managers, and Accountants*

This document provides complete, exhaustive workflow documentation for operating the Enterprise Multi-Tenant Pharmaceutical ERP.

---

## 1. System Navigation & Keyboard-First Architecture

The software is engineered for **100% keyboard-only counter operation**, allowing cashiers and operators to complete transactions in less than 2 to 3 seconds per customer bill without touching a mouse.

### Master Keyboard Hotkey Map

| Key | Purpose | Active Screens |
| :--- | :--- | :--- |
| `Enter` | **Forward Field Navigation** | Advances through Date &rarr; Bill No &rarr; Party &rarr; Product &rarr; Batch &rarr; Qty &rarr; Free &rarr; Rate &rarr; Next Row |
| `Esc` | **Exit / Return to Home** | Safely exits the active screen and navigates back to Home Dashboard (`HomeScreen`) |
| `F2` | **Against Original Bill Mode** | Toggles "Against Original Inward / Outward Bill" in Debit Notes and Credit Notes |
| `F3` | **Batch Modal / Loose Mode** | Opens the live batch selection popup during billing (shows stock, MRP, expiry, trade rate) |
| `F5` | **Register View** | Switches between the Transaction Entry form and the Historical Document Register |
| `F7` | **Ledger / Party Search** | Opens the party lookup modal with real-time search across customers and vendors |
| `F8` | **Load Inward Invoice** | Prompts for original invoice number during return processing |
| `F9` | **Sales Order Picker** | Imports line items directly from an approved customer Sales Order |
| `End` | **Instant Settlement Modal** | Directly opens the Bill Discount & Payment Settlement modal |
| `Ctrl + S`| **Save & Post Document** | Commits and posts Debit Notes, Credit Notes, and Accounting Vouchers |
| `ArrowUp`/`Down`| **Vertical Cell Navigation** | Navigates vertically across table rows or batch popup lists |
| `ArrowLeft`/`Right`| **Horizontal Cell Navigation** | Navigates between Rate, Discount, and Quantity cells in billing grids |

---

## 2. The 6 Core Transaction Voucher Workflows

```
+-----------------------------------------------------------------------------------+
|                            THE 6 TRANSACTION WORKFLOWS                            |
+-------------------+---------------------+-----------------------------------------+
| Voucher Type      | Route               | Operational Purpose                     |
+-------------------+---------------------+-----------------------------------------+
| 1. Sales Bill     | /sales              | Fast retail/wholesale customer billing  |
| 2. Purchase Bill  | /purchase           | Inward goods entry & batch creation     |
| 3. Debit Note     | /purchase-return    | Returning stock to suppliers/C&F        |
| 4. Credit Note    | /sales-return       | Customer returns & credit issuance      |
| 5. Breakage Issue | /brk-issue          | Returning damaged stock to manufacturer |
| 6. Breakage Recv  | /brk-receive        | Receiving damaged stock from customers  |
+-------------------+---------------------+-----------------------------------------+
```

### 2.1 Counter Sales Billing (`/sales`)
1. **Header Entry**: Date defaults to today &rarr; Press `Enter`. Bill No displays current active series &rarr; Press `Enter` (or type custom series and press `Enter`). Party Name: Press `[F7]` or type customer name &rarr; Press `Enter`.
2. **Product Lines**: Type drug name &rarr; Press `Enter`. Press `[F3]` to open the Batch Modal. Use `ArrowDown` to select batch with available stock &rarr; Press `Enter`. Enter Quantity &rarr; Free Quantity &rarr; Rate &rarr; Discount %. The line total calculates and automatically advances to the next product row.
3. **Settlement**: Press `[End]` to open the Discount & Settlement modal. Review Taxable Amount, GST splits, Round-off, and Net Total. Press `Enter` to confirm and save.
4. **Series Continuation**: The bill number auto-increments with your custom series (e.g. `RJ-INV-1001` &rarr; `RJ-INV-1002`).

### 2.2 Purchase Inward Entry (`/purchase`)
1. **Inward Mode**: Choose `DIRECT` or `AGAINST_PO`.
2. **Header Entry**: Enter Bill No, select Supplier (`[F7]`), enter Supplier Invoice Number (`party_inv_no`), and Supplier Invoice Date.
3. **Batch Accrual**: Enter Product Name, Batch Number, Expiry (`MM/YY`), Purchase Rate (Cost), Sale Rate (Trade Price), and MRP.
4. **Discrepancy Logging**: Tick `Discrepancy` on any damaged item row to automatically log vendor complaints.
5. **Post Inward**: Press `[End]` and confirm. Stock is accrued to active inventory (`current_stock`).

### 2.3 Supplier Debit Note / Purchase Return (`/purchase-return`)
1. **Dual Modes**: Press `[F2]` for **Against Inward Bill** or `[F3]` for **Direct Loose Return**.
2. **Load Past Inward Bill**: Select Supplier &rarr; Click `🔍 Select Inward Purchase Bill` &rarr; Pick past inward bill &rarr; Click `Load Items →`. Original items, inward batches, and purchase rates populate the grid.
3. **Stock Disposition**: For each row, select inventory deduction routing:
   * `🟢 Return from Saleable Stock`
   * `🔴 Return from Breakage Godown`
   * `🟡 Return from Expired Godown`
4. **Series Continuation**: Edit Debit Note number (e.g., `RJ-DN-0020`).
5. **Issue**: Press `Ctrl + S` or click **Issue Debit Note**. Next series auto-advances to **`RJ-DN-0021`**. GL voucher posts: `Dr Supplier`, `Cr Purchase Return`.

### 2.4 Customer Credit Note / Sales Return (`/sales-return`)
1. **Dual Modes**: Press `[F2]` for **Against Original Invoice** or `[F3]` for **Direct Counter Return**.
2. **Load Sales Bill**: Select Customer &rarr; Click `🔍 Select Original Sales Bill` &rarr; Pick sales bill. Original billed items populate with sold price and discount.
3. **Adjust Return Quantity**: Type returned units. Press `Enter` to walk across rows. Select stock disposition (`🟢 Saleable`, `🔴 Breakage Godown`, `🟡 Expired Godown`).
4. **Series Continuation**: Edit Credit Note number (e.g. `RJ-CN-8281`).
5. **Save**: Press `Ctrl + S`. Next series auto-advances to **`RJ-CN-8282`**. GL voucher posts: `Dr Sales Return`, `Cr Customer`.

### 2.5 Breakage Receive & Issue (`/brk-receive`, `/brk-issue`)
* **Breakage Receive (`/brk-receive`)**: Records damaged medicines returned by retail chemists directly into the isolated `brk_exp_stock` table.
* **Breakage Issue (`/brk-issue`)**: Records shipments of damaged medicine returned to pharmaceutical companies for credit or replacement, deducting stock from `brk_exp_stock`.

---

## 3. Financial Accounting & Audit Statements (`/finance`)

* **Day Book (`/finance/daybook`)**: Chronological audit trail of all transactions recorded in a business day.
* **Ledger Statement (`/finance/ledger-statement`)**: Running balance statement for any customer, supplier, bank, or expense ledger.
* **Trial Balance (`/finance/trial-balance`)**: Statutory trial balance verifying that debits equal credits across all accounts.
* **Profit & Loss (`/finance/profit-loss`)**: Calculates Gross Profit, COGS, indirect expenses, and Net Operating Profit.
* **Balance Sheet (`/finance/balance-sheet`)**: Balance sheet tracking Capital, Liabilities, Fixed Assets, Current Assets, and Bank Accounts.
* **Bank Reconciliation (`/finance/bank-reconciliation`)**: Reconciles uploaded bank statement CSVs against ERP bank vouchers.

---

## 4. Management Reports & Analytics (`/reports`)

* **Company-Wise Sales Register**: Aggregates sales by manufacturer across 25+ pharmaceutical companies. Includes multi-company filter modal with batch selection and search.
* **Inline Product Drill-Down**: Click `[▶ View Products]` on any manufacturer row to expand product sales drawer.
* **Custom Report Designer (`/reports/designer`)**: Build, filter, execute, and save custom multi-dimensional management reports.

---

## 5. Master 6-Module Keyboard Operation Quick Reference & Shortcuts Matrix

| Module Name | Shortcut Route | Header & Series Hotkeys | Party / Ledger Selection | Product Search & Grid | Save Confirmation |
|---|---|---|---|---|---|
| **Sales Bill** | `/sales?type=bill` | Type entry no &rarr; `Enter` | `F7` or click party &rarr; Enter | `F7` / `Enter` on product &rarr; Enter batch & qty | `Ctrl+S` &rarr; Enter on `Yes, Save Bill` |
| **Purchase Bill** | `/purchase?type=bill` | Type entry no &rarr; `Enter` | `F7` or `Enter` &rarr; picks vendor | `F7` / `Enter` &rarr; picks product &rarr; batch, qty, prate | `SAVE (End / Ctrl+S)` &rarr; Enter on `Yes, Save` |
| **Supplier Debit Note** | `/purchase-return` | Type DN number | Type supplier &rarr; `Enter` | `[F2]` pick inward bill or `[F3]` loose return &rarr; qty | `Issue Debit Note` button |
| **Customer Credit Note** | `/sales-return` | Type CN number | Select debtor &rarr; `Enter` | `[F2]` pick sales bill or `[F3]` loose return &rarr; qty | `Issue Credit Note` button |
| **Breakage Issue** | `/brk-issue?type=bill` | Type entry no &rarr; `Enter` | `Enter` opens vendor modal | `Enter` on product &rarr; enters damaged batch/qty | `SAVE (End / Ctrl+S)` &rarr; Enter on `Yes, Save` |
| **Breakage Receive** | `/brk-receive?type=bill` | Type entry no &rarr; `Enter` | `Enter` opens debtor modal | `Enter` on product &rarr; enters damaged batch/qty | `SAVE (End / Ctrl+S)` &rarr; Enter on `Yes, Save` |

---

## 6. Automated Selenium Verification Results for Reports & Finance

The ERP reporting and double-entry accounting engine has been verified with **100% automated pass** across all 8 modules via [`test_reports_and_finance_selenium.py`](file:///c:/Users/DELL/OneDrive/Desktop/erp2/test_reports_and_finance_selenium.py):
1. **Company-Wise Sales (`/reports`)**: 25+ manufacturers loaded, multi-company search/batch modal verified, inline product drill-downs `[▶ View Products]` responsive.
2. **Report Designer (`/reports/designer`)**: Dynamic semantic query execution against `/api/reports_v2/query` and template persistence verified.
3. **Day Book (`/finance/daybook`)**: Daily chronological transaction vouchers with double-entry debit/credit legs.
4. **Ledger Statement (`/finance/ledger-statement`)**: 69 ledgers dropdown, debtor opening balance, and running balance calculation verified.
5. **Trial Balance (`/finance/trial-balance`)**: 62 active ledgers verified, Debits equal Credits balanced check confirmed.
6. **Profit & Loss (`/finance/profit-loss`)**: Income vs Expenses accounts, multi-group sub-totals, and Net Profit/Loss banner verified.
7. **Balance Sheet (`/finance/balance-sheet`)**: Capital, Liabilities, and Asset accounts verified with balanced equation check.
8. **Bank Reconciliation (`/finance/bank-reconciliation`)**: Bank account selection and unreconciled split-screen ledger transaction mapper verified.

---

## 7. Statutory GST Compliance & Tax Filing Workbench (`/gst`)

1. **Executive Statutory Metrics**: Real-time calculation of Outward Supplies (₹1,52,519.34), Tax Liability (₹17,318.00), Inward Purchases (₹1,81,76,245.90), Eligible ITC (₹29,03,956.42), Net Cash Liability (₹0.00), and Accumulated ITC Balance (₹28,86,638.42).
2. **GSTR-1 Outward Supplies Multi-Tab**:
   - Table 4 (B2B): Invoices with customer GSTIN, POS state code, and tax breakdown.
   - Table 7 (B2CS): Consolidated retail counter turnover.
   - Table 9B (CDNR): Customer credit notes reducing outward tax liability.
   - Table 12 (HSN): Pharmaceutical HSN summary with quantities and UQC codes.
   - Table 13 (Documents Issued): Series numbering audit with cancellations count.
3. **GSTR-2 Inward Register**: Full purchase audit with vendor GSTINs and automatic Debit Note ITC Reversals (-₹95.20).
4. **GSTR-3B Monthly Return**: Consolidated tables (3.1 Outward supplies, 4 Eligible ITC, 5.1 Tax payment breakdown and auto set-off).
5. **Government GSTN Portal Offline JSON Export**: Download official `GSTR1_Offline_Utility_v1.5` JSON directly for instant upload to `gst.gov.in`.
6. **Automated Verification**: Verified 100% PASS across 10 steps via `test_gst_compliance_selenium.py`.

---

## 8. Fixed Assets & Depreciation Engine (DOC-27)

* **Route**: `/finance/assets` & `/finance/asset-categories`
* **Executive Metrics**: Total Gross Block, Accumulated Depreciation, Net Book Value, and Active Asset Count.
* **Statutory Asset Blocks**: Plant & Machinery, Buildings, Furniture & Fixtures, Computer Equipment, Vehicles.
* **Depreciation Methods**: Straight Line Method (SLM) and Written Down Value (WDV) with configurable useful life and 5% residual scrap value.
* **Automated Accounting Posting**: Single-click and bulk period runs post double-entry Journal Vouchers (`Dr Depreciation Expense`, `Cr Accumulated Depreciation`), automatically reducing P&L Net Profit and Balance Sheet Net Block.
* **Automated Verification**: 100% PASS via `test_fixed_assets_selenium.py`.

---

## 9. Bank Reconciliation & Physical Cash Control Engine (DOC-28)

* **Route**: `/finance/bank-reconciliation`
* **Real-Time BRS Metrics**: Bank Statement Closing Balance, ERP General Ledger Book Balance, Unreconciled Variance (reaches ₹0.00 when balanced), and Pending Clearance Count.
* **Dual-Pane Interactive Workbench**: Split-screen view of ERP Ledger bank vouchers vs External Bank Statement feed (with CSV import).
* **Automated Auto-Match Wizard**: Matches transactions by Cheque / Reference No, Exact Amount, and Date Proximity Tolerance ($\pm 3$ days).
* **Physical Cash Denomination Counter**: RBI denomination counter grid (₹2000 to ₹1 coin), calculating Physical Drawer Total vs Book Cash Balance, flagging Shortage or Excess with cashier audit trail.
* **Automated Verification**: 100% PASS via `test_bank_recon_cash_selenium.py`.

---

## 10. Operational Expense Manager & Petty Cash Engine (DOC-26)

* **Route**: `/finance/expenses`
* **Executive Metrics**: Approved Expenses, Pending Approvals, Active Advances, and Settled Advances.
* **Dual-Track Workflow**:
  1. *⚡ Quick Daily Expense Entry*: Instant direct cash/bank disbursements to 10 statutory P&L heads (Tea/Refreshments, Conveyance, Freight, Printing, Courier, Sanitation) with live Dr/Cr/Net Profit impact preview.
  2. *Employee Imprest & Advances*: Tour advance issuance, multi-line itemized reimbursement claims, and automatic advance offset.
* **Automated Verification**: 100% PASS via `test_expense_petty_cash_selenium.py` and `test_direct_expense_ui_selenium.py`.

---

## 11. Journal Voucher Multi-Leg Adjustment & Accrual Scheduler (DOC-25)

* **Route**: `/journal` & `/finance/journal-register`
* **Keyboard-First Cockpit**: Hotkeys `[Ctrl+B]` Auto-Balance, `[Ctrl+D]` Duplicate row, `[Alt+A]` Add row, `[Ctrl+S]` Save.
* **Statutory Classifications**: Standard Journal, Accrual Journal, Provision, Prepaid Amortization, Reclassification, Opening Balance Adjustment.
* **Traceable Reversals**: One-click atomic inversion (`[Reverse ↩]`) creating Dr &rarr; Cr, Cr &rarr; Dr vouchers linked permanently to original journal.
* **Automated Verification**: 100% PASS via `test_journal_accrual_engine_selenium.py`.

---
---

## 12. Customer Receipt & Supplier Payment Luxury Architecture

* **Routes**: Customer Receipts (`/receipt` / `[F6]`), Supplier Payments (`/payment` / `[F5]`)
* **Financial Telemetry Strip**:
  - **Active Ledger Balance (`#kpi-active-balance`)**: Live running balance of selected customer (Debtor) or vendor (Creditor) from GL.
  - **Total Settlement Allocation (`#kpi-total-allocated`)**: Running sum of bill-by-bill allocated amounts across pending invoices.
  - **Unallocated Floating Credit (`#kpi-unallocated-credit`)**: Calculated variance ($\text{Voucher Amount} - \text{Allocated}$); surplus records as on-account advance credit.
* **Party Lookup Modal (`[F7]`)**: Searchable dialog with real-time debtor/creditor query, balance, drug licenses, and GSTIN.
* **FIFO Bill-by-Bill Allocation Engine (`[Alt+A]`)**: Auto-allocates payment against oldest unpaid invoices chronologically; allows per-row manual override.
* **Alphanumeric Series Continuation**: Sequential continuation (`REC-YYYY-XXXX`, `PAY-YYYY-XXXX`) preserving custom user prefixes.
* **Automated Verification**: 100% PASS via `test_receipt_payment_settlement_selenium.py`.

---

## 13. Executive Business Intelligence & Control Center (`/dashboard`)

* **Executive KPI Strip**: Gross Turnover (Sales), Procurement Volume, Gross Operating Margin (%), and Quick Liquidity Ratio.
* **Comparative Volume Curves**: 7-month rolling sales vs purchases turnover curves.
* **Operating Expense (Opex) Donut**: Comprehensive category distribution across freight, storage, travel, depreciation, and office overheads.
* **Interactive Regional Territory Map Modal (`#mapModal`)**: Clickable state-level drilldowns (Delhi NCR, Punjab, Haryana, UP, Rajasthan) tracking chemist network density, quota attainment %, and revenue metrics.
* **Receivables Ageing Distribution**: 0-30, 31-60, 61-90, 90+ days statutory receivables breakdown.
* **Automated Verification**: 100% PASS via `test_dashboard_bi_control_center_selenium.py`.

---

## 14. Workflow Approval, Alert & Business Automation Engine (DOC-31)

* **Routes**: Inbox (`/workflow/inbox` / `[F4]`), Designer (`/workflow/designer`), Monitor (`/workflow/monitor`)
* **Unified Approval Inbox (`[F4]`)**: Multi-tier approval queue with SLA countdowns, 1-click Approve/Reject, and Maker-Checker 403 enforcement.
* **Visual No-Code Designer**: Multi-tier hierarchy builder (Floor Review, Executive Signoff, Director Authorization) with interactive sandbox amount simulator (`#input-sim-amount`).
* **Real-Time SLA Monitor**: Enterprise TAT benchmarks (1.8h avg), SLA adherence rate (94.2%), bottleneck identification, and SHA-256 idempotency deduplication locks.
* **Automated Verification**: 100% PASS via `test_workflow_approval_automation_selenium.py`.

---

## 15. Audit Trail, Data Governance & Compliance Control Engine (DOC-33)

* **Routes**: Audit Explorer (`/audit`), Data Governance Console (`/audit/governance`)
* **Audit Explorer (`/audit`)**:
  - **4 Top KPI Cards**: Total Audited Events, Cryptographic Chain Integrity, Active Legal Holds, Terminal Chain SHA-256 Hash.
  - **Cryptographic Chain Banner (`#banner-chain-integrity`)**: High-visibility seal badge validating sequential SHA-256 hash links.
  - **Slide-Over Diff Drawer (`#drawer-audit-diff`)**: Side-by-side comparison of before/after states with sensitive credential masking (`[REDACTED_SENSITIVE]`).
  - **Evidence Pack Exporter (`#btn-export-evidence-pack` / `[E]`)**: Produces cryptographically signed JSON compliance evidence packs for MCA/GST audits.
* **Data Governance Console (`/audit/governance`)**:
  - **Retention Policies**: MCA & CGST 8-year standard retention (2,920 days) across INVOICE, VOUCHER, AUDIT_EVENT, PARTY tables.
  - **Litigation Legal Holds (`#modal-apply-hold`)**: Freezes targeted records against disposal during tax audits with audit-logged justifications.
  - **Forensic Anomaly Radar**: Evaluates 5 automated signals (`MASS_EDITS`, `REPEATED_REVERSALS`, `AFTER_HOURS`, `ACTIVE_LEGAL_HOLDS`, `CHAIN_INTEGRITY`).
* **Automated Verification**: 100% PASS via `test_audit_governance_selenium.py`.

---

## 16. Cargo & Consignment Management Engine (DOC-34)

* **Routes**: Consignment Board (`/cargo` / `Ctrl+1`), Costs Allocation Center (`/cargo/costs`), POD & Exceptions Desk (`/cargo/pod-exceptions`)
* **Independent Consignment Identity**: First-class series continuation (`CN-YYYY-XXXX`) decoupled from sales invoices and dispatches.
* **Admin-Funded Client Cargo Architecture**:
  - Freight costs borne centrally by Platform Admin are posted solely in Platform Admin GL under Account 5200 (Freight & Logistics Expense).
  - Client Company General Ledger is never auto-debited (`Zero-Debit Rule`).
  - **Combined Multi-Client Reporting Toggle (`#toggle-combined-reporting`)**: Aggregates freight liabilities across Jaipur, Delhi, and regional distribution centers.
* **Volumetric CBM Formula**: $\text{CBM} = (\text{Length} \times \text{Width} \times \text{Height}) / 1,000,000$ with package barcodes (`PKG-YYYY-XXXX-NN`).
* **4-Eyes POD & Discrepancy Claims Desk**: Accepted vs short/damaged delivery verification with exception claim branch (Carrier Claim, Demurrage Waiver, Inventory Write-off).
* **Automated Verification**: 100% PASS via `test_cargo_consignment_selenium.py`.

---

## 17. Universal Escape Key Navigation & Application Lifecycle Architecture

* **Multi-Level Escape Lifecycle**:
  - **Level 1 (Topmost Modal / Drawer)**: Pressing `[Esc]` dismisses active slide-over inspection drawers (Consignment Drawer, Audit Diff Drawer), batch/party modals (`[F3]`/`[F7]`), or settlement popups (`[End]`) without page route changes.
  - **Level 2 (Sub-Page Navigation)**: On dedicated transaction/finance screens (`/sales`, `/purchase`, `/cargo`, `/audit`, `/receipt`, `/payment`), pressing `[Esc]` smoothly returns to Counter Workbench (`HomeScreen` at `/`).
  - **Level 3 (Counter Workbench Exit Confirmation)**: On the Counter Workbench (`/`), pressing `[Esc]` opens the high-contrast Application Exit Modal (`#modal-exit-app`). Pressing `Enter` confirms exit, while pressing `[Esc]` or clicking `Cancel` immediately resumes counter operations.
* **Header Workflows Dropdown (`[F4]`)**: Consolidated navigation dropdown in header linking Approvals Inbox, Designer, SLA Monitor, Cargo Board, Cost Center, and POD Desk.
* **Automated Verification**: 100% PASS via `test_esc_navigation_and_cargo_flow_selenium.py`.

---

## 18. Master Screen-by-Screen UI Element & Selector Catalog

| Screen / Route | Element Selector / ID | Type & Hotkey | Functional Description & Expected Behavior |
| :--- | :--- | :--- | :--- |
| **Counter Workbench (`/`)** | `#hub-btn-sales-bill` | Button `[F2]` | Opens Counter Sales Billing screen with sequential invoice continuation. |
| **Counter Workbench (`/`)** | `#hub-btn-receipt-voucher` | Button `[F6]` | Opens Customer Collection & Receipt Voucher screen. |
| **Counter Workbench (`/`)** | `#hub-btn-payment-voucher` | Button `[F5]` | Opens Supplier Outward Payment Voucher screen. |
| **Counter Workbench (`/`)** | `#hub-btn-cargo-management` | Button `[Ctrl+1]` | Launches Cargo & Consignment Management Board. |
| **Counter Workbench (`/`)** | `#hub-btn-audit-trail` | Button | Opens Cryptographic SHA-256 Audit Trail Explorer. |
| **Counter Workbench (`/`)** | `#modal-exit-app` | Modal `[Esc]` | Application exit confirmation dialog with Exit `[Enter]` and Cancel `[Esc]`. |
| **Header** | `#btn-workflow-dropdown` | Dropdown `[F4]` | Expands workflows menu with Inbox, Designer, Monitor, Cargo, Costs, POD Desk. |
| **Receipt Voucher (`/receipt`)** | `#voucher-series-input` | Input | Displays and allows editing of current receipt continuation series (`REC-YYYY-XXXX`). |
| **Receipt Voucher (`/receipt`)** | `#party-search-input` | Input `[F7]` | Triggers Party Search modal with live debtor balance and drug license. |
| **Receipt Voucher (`/receipt`)** | `#voucher-amount-input` | Input | Enters receipt amount; recalculates unallocated floating credit dynamically. |
| **Receipt Voucher (`/receipt`)** | `#btn-auto-allocate-fifo` | Button `[Alt+A]` | Executes FIFO auto-allocation across pending customer invoices. |
| **Receipt Voucher (`/receipt`)** | `#btn-post-voucher` | Button `[Ctrl+S]` | Posts receipt voucher to GL, updates ledger balances, increments series. |
| **Payment Voucher (`/payment`)** | `#voucher-series-input` | Input | Displays and allows editing of current payment continuation series (`PAY-YYYY-XXXX`). |
| **Payment Voucher (`/payment`)** | `#party-search-input` | Input `[F7]` | Triggers Party Search modal with live creditor balance and bank account. |
| **Payment Voucher (`/payment`)** | `#btn-auto-allocate-fifo` | Button `[Alt+A]` | Executes FIFO auto-allocation across pending vendor purchase bills. |
| **Audit Explorer (`/audit`)** | `#input-audit-search` | Input `[Ctrl+F]` | Fuzzy search across audit trail by document number, actor, or reason. |
| **Audit Explorer (`/audit`)** | `#btn-verify-chain` | Button | Traverses cryptographic SHA-256 hash chain and certifies 100% integrity. |
| **Audit Explorer (`/audit`)** | `#drawer-audit-diff` | Drawer `[Enter]` | Slides over before/after field diff with sensitive data masking. |
| **Audit Explorer (`/audit`)** | `#btn-export-evidence-pack` | Button `[E]` | Generates auditor-compliant sealed JSON evidence pack. |
| **Governance (`/audit/governance`)** | `#tab-retention-policies` | Tab | Displays statutory retention schedules and 2,920-day MCA/GST policies. |
| **Governance (`/audit/governance`)** | `#btn-apply-legal-hold` | Button | Opens modal to establish statutory preservation legal hold (`#modal-apply-hold`). |
| **Governance (`/audit/governance`)** | `#grid-forensic-anomalies` | Grid | Displays real-time anomaly detection radar for velocity and after-hours edits. |
| **Cargo Board (`/cargo`)** | `#btn-register-consignment` | Button `[F6]` | Opens consignment registration modal with volumetric CBM calculator. |
| **Cargo Board (`/cargo`)** | `#drawer-consignment-detail` | Drawer | Slide-over drawer showing package barcodes, weights, and status advance. |
| **Cargo Costs (`/cargo/costs`)** | `#toggle-combined-reporting` | Toggle | Switches between single-tenant and aggregated multi-client MIS view. |
| **POD Desk (`/cargo/pod-exceptions`)** | `#btn-record-delivery-pod` | Button | Submits delivery POD with accepted vs short/damaged quantity validation. |

---

## 20. Freight Logistics & Carrier Rate Master (/freight/contracts, /freight/reconciliation)
* **Access Point**: Counter Workbench tile `[Ctrl+2]` or `C&F & Logistics ▾` &rarr; `Freight Contracts & Rates`.
* **Rate Master**: Manages vehicle types, per-km/per-kg rate slabs, minimum charge floors, and transit times.
* **Rating Sandbox (`[F4]`)**: Live freight cost computation with formula trace.
* **Transporter Reconciliation**: Matches actual transporter bills against system consignment estimates and posts settled liabilities to GL Account 5200.

---

## 21. Principal Operations & Consignment Custody Control Center (/principal)
* **Access Point**: Counter Workbench tile `[Ctrl+3]` or `C&F & Logistics ▾` &rarr; `Principal & C&F Operations`.
* **Custody Inventory Matrix (`[F2]`)**: Complete physical inventory segregation of pharmaceutical formulations under C&F custody.
* **Claims Desk (`[F3]`) & New Claim Modal (`[F7]`)**: Fast filing of breakage, damage, and expiry claims with mandatory return proof and instant `[Esc]` dismissal.
* **Reconciliation & Statements (`[F4]`, `[F5]`)**: 3-way physical vs ledger stock matching and reconstructable periodic business statements with SHA-256 seal.

---

## 22. C&F Commission & Recovery Engine (/commission)
* **Access Point**: Counter Workbench tile `[Ctrl+4]` or `C&F & Logistics ▾` &rarr; `C&F Commission & Recovery Engine`.
* **4-Pillar Deal Terms (`[F2]`)**: Master contractual terms for Godown Storage Rent, Dedicated Staff Salaries, Cargo/Freight Recharges, and Sales Commission %.
* **Deterministic Sandbox (`[F3]`)**: Dynamic month-to-month overrides for actual payroll and warehouse lease fluctuations.
* **Recovery Claims & Dual-Posting (`[F4]`)**: 4-eyes claim approval batching; 1-click generation of Outward Service Invoices and Inward Purchase Bills (`PUR-SRV-2026-XXXX`) posted into `/purchase/list`.

---

## 23. Admin Enterprise Multi-Client Radar (/admin/tracking, /tracking)
* **Access Point**: Counter Workbench tile `[Ctrl+6]`, `C&F & Logistics ▾` &rarr; `Admin Multi-Client Radar`, or `/clients`.
* **Apex Scope Switcher**: Seamlessly toggles between consolidated multi-client metrics and single-client isolation.
* **4 Workspaces**: `[F2] Client Scorecards` (ranking matrix with 1-click drilldown), `[F3] Sales Tracking` (cross-client invoice register), `[F4] Expenses Tracking` (operational claims), and `[F6] Cargo Tracking` (logistics pipeline).

---

## 24. Responsive 10-Item Top Navigation Menu
* **Screen Fit Ergonomics**: 10 clean top categories that eliminate horizontal scrollbars and screen overflow.
* **C&F & Logistics Dropdown**: Centralizes Principal Ops, Commission Engine, Multi-Client Radar, Cargo Board, Freight Contracts, Transporter Recon, and Cost Center.
* **Keyboard Hotkeys**: Arrow key navigation with focus trapping, `Enter` selection, and universal `Esc` dismissal.

---

## 25. Client Management C&F Commission & Expense Reimbursement Billing Desk ([F5] on /commission)
* **Real-World Client Billing**: Specifically designed for billing client companies (e.g. *KRISHNA MEDICAL AGENCIES*) when acting as their C&F Agent.
* **1-Click Auto-Fetch Telemetry**: Instantly pulls actual client sales turnover, computes commission % (e.g. 5%), and aggregates godown rent, staff payroll, and freight recharges.
* **Manual Customization**: Flexible inputs for sales turnover base, commission %, godown storage rent, dedicated staff salaries, freight, handling, and GST SAC 998599 (18%).
* **Bilateral Dual-Posting Engine**:
  - Atomically creates Outward Service Bill (`CF-BILL-2026-XXXX`) in Main Admin Billing Desk (`/billing`, `[F7]`).
  - Automatically dual-posts Inward Purchase Bill (`PUR-CF-2026-XXXX`) in the client company's inward purchase register (`/purchase/list`, `[F9]`).
  - Creates linked Commission Calculations parented to Commission Events, and an approved Recovery Claim (`CLM-REC-YYYY-XXXX`).
* **Instant Success Card & Register**: Provides one-click navigation to outward and inward registers, alongside an audit history table of past bills.

---

## 26. Master Screen-by-Screen UI Element & Hotkey Catalog (Updated)

| Screen Context | UI Element Selector / ID | Control Type & Hotkey | Operational Functionality & Business Rule |
| :--- | :--- | :--- | :--- |
| **Counter Workbench (`/`)** | `#hub-btn-sales-bill` | Button `[F2]` | Opens Counter Sales Billing screen with sequential invoice continuation. |
| **Counter Workbench (`/`)** | `#hub-btn-receipt-voucher` | Button `[F6]` | Opens Customer Collection & Receipt Voucher screen. |
| **Counter Workbench (`/`)** | `#hub-btn-payment-voucher` | Button `[F5]` | Opens Supplier Outward Payment Voucher screen. |
| **Counter Workbench (`/`)** | `#hub-btn-cargo-management` | Button `[Ctrl+1]` | Launches Cargo & Consignment Management Board. |
| **Counter Workbench (`/`)** | `#hub-btn-freight-management` | Button `[Ctrl+2]` | Launches Freight Contracts & Carrier Rate Master. |
| **Counter Workbench (`/`)** | `#hub-btn-principal-management`| Button `[Ctrl+3]` | Launches Principal Operations & Consignment Custody Center. |
| **Counter Workbench (`/`)** | `#hub-btn-commission-management`| Button `[Ctrl+4]` | Launches C&F Commission & Recovery Engine. |
| **Counter Workbench (`/`)** | `#hub-btn-admin-tracking` | Button `[Ctrl+6]` | Launches Enterprise Multi-Client Operations Radar. |
| **Counter Workbench (`/`)** | `#hub-btn-audit-trail` | Button | Opens Cryptographic SHA-256 Audit Trail Explorer. |
| **Counter Workbench (`/`)** | `#modal-exit-app` | Modal `[Esc]` | Application exit confirmation dialog with Exit `[Enter]` and Cancel `[Esc]`. |
| **Header** | `#btn-workflow-dropdown` | Dropdown `[F4]` | Expands workflows menu with Inbox, Designer, Monitor, Audit Trail, and Governance. |
| **Header** | `parent-menu-btn-cf` | Dropdown | Expands C&F & Logistics menu with Principal, Commission, Radar, Cargo, Freight, Recon. |
| **Receipt Voucher (`/receipt`)** | `#btn-auto-allocate-fifo` | Button `[Alt+A]` | Executes FIFO auto-allocation across pending customer invoices. |
| **Payment Voucher (`/payment`)** | `#btn-auto-allocate-fifo` | Button `[Alt+A]` | Executes FIFO auto-allocation across pending vendor purchase bills. |
| **Audit Explorer (`/audit`)** | `#btn-verify-chain` | Button | Traverses cryptographic SHA-256 hash chain and certifies 100% integrity. |
| **Cargo Board (`/cargo`)** | `#btn-register-consignment` | Button `[F6]` | Opens consignment registration modal with volumetric CBM calculator. |
| **Freight Master (`/freight/contracts`)** | `#tab-btn-sandbox` | Tab `[F4]` | Evaluates live freight calculations with formula trace. |
| **Principal (`/principal`)** | `#btn-open-claim-modal` | Button `[F7]` | Opens Principal breakage/damage claim modal with [Esc] dismissal. |
| **Commission (`/commission`)** | `#tab-btn-client-billing` | Tab `[F5]` | Opens Client Management C&F Commission & Expense Billing Desk. |
| **Commission (`/commission`)** | `#btn-autofetch-client-telemetry` | Button | 1-Click Auto-Fetch client sales turnover and depot operating expenses. |
| **Commission (`/commission`)** | `#check-dual-post-purchase` | Checkbox | Toggles automated dual-posting into the client company's inward purchase register. |
| **Commission (`/commission`)** | `#btn-generate-client-bill` | Button | Atomically creates outward bill (`CF-BILL-`) and inward purchase bill (`PUR-CF-`). |
| **Commission (`/commission`)** | `#btn-goto-outward-billing` | Button `[F7]` | Quick jump to Outward Bill in Billing Desk. |
| **Commission (`/commission`)** | `#btn-goto-inward-purchase` | Button `[F9]` | Quick jump to Inward Bill in Purchase Register. |
| **Radar (`/admin/tracking`)** | `#select-tracking-scope` | Dropdown | Toggles between Consolidated multi-client view and single-client isolation. |
| **Radar (`/admin/tracking`)** | `#tab-btn-scorecards` | Tab `[F2]` | Displays comparative client scorecards matrix with 1-click drilldown. |
| **Radar (`/admin/tracking`)** | `#tab-btn-sales` | Tab `[F3]` | Displays multi-client sales invoice register with client attribution. |
| **Radar (`/admin/tracking`)** | `#tab-btn-expenses` | Tab `[F4]` | Displays multi-client operational expense claims. |
| **Radar (`/admin/tracking`)** | `#tab-btn-cargo` | Tab `[F6]` | Displays active cargo logistics pipeline with in-transit pulse. |
| **Expiry Cockpit (`/inventory-dashboard`)** | `#card-main-stock` | Scorecard | Displays real-time Main Saleable Stock Value and Healthy Units count. |
| **Expiry Cockpit (`/inventory-dashboard`)** | `#card-quarantine-stock` | Scorecard | Displays Quarantined Stock Value and Segregated Units count in `brk_exp_stock`. |
| **Expiry Cockpit (`/inventory-dashboard`)** | `#card-near-expiry-risk` | Scorecard | Displays 90-Day Near-Expiry Risk Valuation and Batches count. |
| **Expiry Cockpit (`/inventory-dashboard`)** | `#card-claim-exposure` | Scorecard | Displays active Principal Claims & Debit Note exposure. |
| **Expiry Cockpit (`/inventory-dashboard`)** | `#tab-btn-radar` | Tab `[F2]` | Opens Expiry Radar table with alert pills and search filters. |
| **Expiry Cockpit (`/inventory-dashboard`)** | `#btn-select-all-batches` | Button | Toggles multi-batch selection across all active radar candidates. |
| **Expiry Cockpit (`/inventory-dashboard`)** | `#btn-shift-selected-action` | Button `[F7]` | Shifts chosen batches to quarantine and opens Stock Shift Voucher desk. |
| **Expiry Cockpit (`/inventory-dashboard`)** | `#tab-btn-quarantine` | Tab `[F3]` | Displays Quarantined Stock Ledger with direct claim filing action. |
| **Expiry Cockpit (`/inventory-dashboard`)** | `#tab-btn-history` | Tab `[F4]` | Displays Stock Shift Audit Register with linked claim badges. |
| **Stock Shift (`/stock-shift`)** | `#select-from-godown` | Dropdown | Selects source godown (Main Saleable Godown). |
| **Stock Shift (`/stock-shift`)** | `#select-to-godown` | Dropdown | Selects destination godown (Quarantine / Expiry Godown). |
| **Stock Shift (`/stock-shift`)** | `#check-auto-claim` | Checkbox | Toggles automated generation of official Principal Expiry Claim (`CLM-PRN-`). |
| **Stock Shift (`/stock-shift`)** | `#btn-save-shift-voucher` | Button `[F7]` | Executes atomic stock shift reallocation and files debit note claim. |
| **Stock Shift (`/stock-shift`)** | `#stock-shift-success-card` | Banner | Displays generated voucher (`SHF-2026-XXXX`) and claim reference. |

---

## 28. Module 28 — DOC-41: Pharma Expiry Radar, Stock Shift Quarantine Engine & Principal Debit Note Settlement Desk

### 28.1 Workflow Summary & Core Objectives
1. **Real-Time Expiry Radar**: Operators monitor active inventory across 4 risk horizons: 🔴 Expired ($\le 0$ days), 🟠 Critical ($\le 30$ days), 🟡 Warning ($\le 60$ days), and 🔵 Attention ($\le 90$ days).
2. **Atomic Stock Reallocation**: 1-click shift from `MAIN_SALEABLE_GODOWN` to `QUARANTINE_EXPIRY_GODOWN` atomically decreases `Batch.current_stock` and increases `Batch.brk_exp_stock`.
3. **Automated Principal Claim & Debit Note Bridging**: Toggling `#check-auto-claim` automatically generates a formal `PrincipalClaim` (`CLM-PRN-YYYY-XXXX`) and itemized `PrincipalClaimLine`s under the selected Principal (*Sun Pharma*, *Cipla*, *Krishna Medical Agencies*), creating an instant audit trail in the Principal Claims Desk (`/principal`).

---

## 29. Comprehensive Automated QA Test Suite Registry (16 Suites)

| # | Test Suite File | Module Coverage | Assertions Target & Status |
| :--- | :--- | :--- | :--- |
| 1 | `test_master_all_6_modules_selenium.py` | Sales, Purchase, DN, CN, BKI, BKR | 100% PASS: All 6 transaction modules with series continuation. |
| 2 | `test_reports_and_finance_selenium.py` | Day Book, Ledger, Trial Balance, P&L, BS, BRS, Designer | 100% PASS: Full double-entry financial reporting suite. |
| 3 | `test_gst_compliance_selenium.py` | GSTR-1, GSTR-2, GSTR-3B, Offline JSON, E-Invoice | 100% PASS: Statutory GST returns and offline utility JSON payload. |
| 4 | `test_receipt_payment_settlement_selenium.py` | Receipt `[F6]`, Payment `[F5]`, FIFO allocation `[Alt+A]` | 100% PASS: Settlement cockpit, 3-card telemetry strip, FIFO engine. |
| 5 | `test_journal_accrual_engine_selenium.py` | Multi-leg journal cockpit, accrual scheduler | 100% PASS: Dynamic double-entry balancing and atomic reversals. |
| 6 | `test_direct_expense_ui_selenium.py` | Direct expense form, live P&L impact box, advances | 100% PASS: Real-time P&L net profit deduction and claim approvals. |
| 7 | `test_fixed_assets_selenium.py` | Asset registration, WDV/SLM depreciation run | 100% PASS: Automatic depreciation posting and asset register. |
| 8 | `test_bank_recon_cash_selenium.py` | BRS auto-matching, cash denomination drawer tally | 100% PASS: Multi-rule reconciliation and physical cash counting audit. |
| 9 | `test_dashboard_bi_control_center_selenium.py` | Executive BI, 7-month curves, Opex donut, territory map | 100% PASS: Role-based separation and territory modal drilldowns. |
| 10 | `test_workflow_approval_automation_selenium.py` | Universal trigger, `[F4]` Inbox, Maker-Checker, Designer | 100% PASS: Automated business workflows and SLA tracking. |
| 11 | `test_audit_governance_selenium.py` | SHA-256 hash chain, diff drawer, legal holds, anomalies | 100% PASS: Cryptographic audit trail and data governance console. |
| 12 | `test_cargo_consignment_selenium.py` | Consignment board, CBM calc, Admin cost center, POD desk | 100% PASS: Decoupled freight movement and combined reporting. |
| 13 | `test_freight_logistics_selenium.py` | Rate Master, Calculation Sandbox `[F4]`, Transporter Recon | 100% PASS: Carrier contracts and GL Account 5200 posting. |
| 14 | `test_principal_operations_selenium.py` | Control Center, Custody Stock Matrix, Claims Desk `[F7]`, Recon | 100% PASS: Principal agreement governance and reconciliation statements. |
| 15 | `test_client_commission_billing_selenium.py` | Top Nav 10-Item layout, C&F Billing Desk `[F5]`, Dual-Posting | 100% PASS: Auto-fetch telemetry, outward bill `CF-BILL-`, and inward purchase `PUR-CF-`. |
| 16 | `test_pharma_expiry_quarantine_selenium.py` | Expiry Radar `[F2]`, Stock Shift Desk `[F7]`, Auto-Claims `CLM-PRN-` | 100% PASS: Atomic batch stock reallocation, quarantine ledger, and Principal claims bridging. |

---

*End of User Manual and Workflows.*

