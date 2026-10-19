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

## 26. Master Screen-by-Screen UI Element & Semantic DOM Catalog

This master catalog documents every semantic DOM ID, control element, keyboard hotkey, and business validation rule implemented across the ERP application. Developers and QA engineers must ensure all DOM selectors remain stable.

| Screen Context & Route | UI Element Selector / ID | Control Type & Hotkey | Operational Functionality, Business Logic & Validation Rules |
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
| **Application Header** | `#btn-workflow-dropdown` | Dropdown `[F4]` | Expands workflows menu with Inbox, Designer, Monitor, Audit Trail, and Governance. |
| **Application Header** | `parent-menu-btn-cf` | Dropdown | Expands C&F & Logistics menu with Principal, Commission, Radar, Cargo, Freight, Recon. |
| **Counter Sales (`/sales`)** | `#input-bill-series` | Input | Alphanumeric sales invoice sequence input (`SLS-YYYY-XXXX`). Edits auto-saved to localStorage. |
| **Counter Sales (`/sales`)** | `#btn-search-party` | Button `[F7]` | Opens Debtor Party search modal with real-time balance, drug license numbers, and GSTIN. |
| **Counter Sales (`/sales`)** | `#grid-bill-items` | Grid Table | 8-Row Marg billing grid (Item, Pack, Batch, Exp, Qty, Free, Rate, Dis%, GST%). `Enter` walks fields. |
| **Counter Sales (`/sales`)** | `#btn-batch-modal` | Button `[F3]` | Opens Batch Selection modal showing stock, expiry dates, and MRP for the active product. |
| **Counter Sales (`/sales`)** | `#btn-settlement-modal` | Button `[End]` | Opens Settlement & Payment Mode modal (Cash, Bank, Credit, Cheque) with round-off preview. |
| **Counter Sales (`/sales`)** | `#btn-save-bill` | Button `[Ctrl+S]` | Validates items, decrements batch stock, posts double-entry GL voucher, advances bill sequence. |
| **Purchase Inward (`/purchase`)** | `#input-purchase-series` | Input | Inward purchase sequence series input (`PUR-YYYY-XXXX`). |
| **Purchase Inward (`/purchase`)** | `#input-vendor-inv-no` | Input | Supplier's external invoice reference number (`party_inv_no`). |
| **Purchase Inward (`/purchase`)** | `#btn-search-vendor` | Button `[F7]` | Creditor vendor search popup with live ledger balance and payment terms. |
| **Purchase Inward (`/purchase`)** | `#btn-save-purchase` | Button `[Ctrl+S]` | Commits purchase, creates batches, updates physical stock, and posts accounts payable. |
| **Purchase Register (`/purchase/list`)** | `#grid-purchase-bills` | Ag-Grid | Inward purchase bills register with search, filter, and bilateral dual-post tags. |
| **Supplier Debit Note (`/purchase-return`)** | `#btn-mode-against-bill` | Button `[F2]` | Activates Against Inward Bill mode to load original purchase line items. |
| **Supplier Debit Note (`/purchase-return`)** | `#btn-mode-loose` | Button `[F3]` | Activates Loose Return mode for ad-hoc debit note issuance. |
| **Supplier Debit Note (`/purchase-return`)** | `#select-stock-disposition` | Dropdown | Directs returned goods to `Saleable`, `Breakage Godown`, or `Expired Godown`. |
| **Supplier Debit Note (`/purchase-return`)** | `#btn-save-debit-note` | Button `[Ctrl+S]` | Posts debit note, adjusts inventory, generates reverse GL and ITC reversal entries. |
| **Customer Credit Note (`/sales-return`)** | `#btn-mode-against-bill` | Button `[F2]` | Activates Against Sales Bill mode to retrieve customer invoice lines. |
| **Customer Credit Note (`/sales-return`)** | `#btn-mode-counter` | Button `[F3]` | Activates Counter Return mode with returnable quantity caps. |
| **Customer Credit Note (`/sales-return`)** | `#btn-save-credit-note` | Button `[Ctrl+S]` | Saves credit note, increments stock, auto-posts sales return GL entries. |
| **Breakage Receive (`/brk-receive`)** | `#input-bkr-series` | Input | Alphanumeric Breakage Receive series continuation (`BKR-YYYY-XXXX`). |
| **Breakage Receive (`/brk-receive`)** | `#btn-save-bkr` | Button `[Ctrl+S]` | Posts breakage receive, routing stock strictly into quarantined `brk_exp_stock`. |
| **Breakage Issue (`/brk-issue`)** | `#input-bki-series` | Input | Alphanumeric Breakage Issue series continuation (`BKI-YYYY-XXXX`). |
| **Breakage Issue (`/brk-issue`)** | `#btn-save-bki` | Button `[Ctrl+S]` | Posts breakage issue to manufacturer, decrementing `brk_exp_stock`. |
| **Customer Receipt (`/receipt`)** | `#voucher-series-input` | Input | Alphanumeric receipt series continuation (`REC-YYYY-XXXX`). |
| **Customer Receipt (`/receipt`)** | `#party-search-input` | Input `[F7]` | Triggers Debtor Party Search modal with live running balance and drug licenses. |
| **Customer Receipt (`/receipt`)** | `#voucher-amount-input` | Input | Payout amount; automatically recalculates unallocated floating credit dynamically. |
| **Customer Receipt (`/receipt`)** | `#btn-auto-allocate-fifo` | Button `[Alt+A]` | Executes FIFO auto-allocation across pending customer invoices. |
| **Customer Receipt (`/receipt`)** | `#btn-post-voucher` | Button `[Ctrl+S]` | Posts receipt voucher to GL, updates ledger balances, increments sequence series. |
| **Supplier Payment (`/payment`)** | `#voucher-series-input` | Input | Alphanumeric payment series continuation (`PAY-YYYY-XXXX`). |
| **Supplier Payment (`/payment`)** | `#party-search-input` | Input `[F7]` | Triggers Creditor Vendor Search modal with live running balance and bank details. |
| **Supplier Payment (`/payment`)** | `#btn-auto-allocate-fifo` | Button `[Alt+A]` | Executes FIFO auto-allocation across pending vendor purchase bills. |
| **Journal Voucher (`/journal`)** | `#input-journal-series` | Input | Alphanumeric Journal series continuation (`JRN-YYYY-XXXX`). |
| **Journal Voucher (`/journal`)** | `#btn-auto-balance-gl` | Button `[Ctrl+B]` | Automatically calculates and inserts balancing Dr/Cr line. |
| **Journal Voucher (`/journal`)** | `#btn-add-journal-leg` | Button `[Alt+A]` | Adds new ledger line item row to journal entry grid. |
| **Journal Voucher (`/journal`)** | `#check-schedule-accrual` | Checkbox | Configures scheduled automatic GL reversal on 1st of subsequent month. |
| **Journal Voucher (`/journal`)** | `#btn-post-journal` | Button `[Ctrl+S]` | Validates sum(Dr) == sum(Cr) and commits journal voucher to GL. |
| **Journal Register (`/finance/journal-register`)** | `#btn-reverse-journal` | Button | 1-Click atomic GL reversal with linked audit trail. |
| **Direct Expense Desk (`/finance/expenses`)** | `#input-expense-amount` | Input | Expense payout amount with live P&L impact preview. |
| **Direct Expense Desk (`/finance/expenses`)** | `#select-expense-account` | Select | Dropdown listing 10 statutory P&L expense heads. |
| **Direct Expense Desk (`/finance/expenses`)** | `#btn-post-expense` | Button | Posts direct cash/bank expense voucher debiting P&L immediately. |
| **Fixed Assets (`/finance/assets`)** | `#btn-register-asset` | Button `[F2]` | Opens modal to register capital asset with Schedule II statutory category. |
| **Fixed Assets (`/finance/assets`)** | `#btn-run-depreciation` | Button `[F5]` | Executes periodic WDV/SLM depreciation run across active assets. |
| **Bank Recon (`/finance/bank-reconciliation`)** | `#btn-auto-match-brs` | Button | Runs auto-matching algorithm against imported bank statement CSV. |
| **Bank Recon (`/finance/bank-reconciliation`)** | `#btn-cash-drawer-tally` | Button `[F8]` | Opens RBI physical currency denomination counter and cash discrepancy report. |
| **Audit Explorer (`/audit`)** | `#input-audit-search` | Input `[Ctrl+F]` | Fuzzy search across audit trail by document number, actor, or reason. |
| **Audit Explorer (`/audit`)** | `#btn-verify-chain` | Button | Traverses cryptographic SHA-256 hash chain and certifies 100% integrity. |
| **Audit Explorer (`/audit`)** | `#drawer-audit-diff` | Drawer `[Enter]` | Slides over before/after field diff with sensitive data masking. |
| **Audit Explorer (`/audit`)** | `#btn-export-evidence-pack` | Button `[E]` | Generates auditor-compliant sealed JSON evidence pack. |
| **Governance (`/audit/governance`)** | `#tab-retention-policies` | Tab | Displays statutory retention schedules and 2,920-day MCA/GST policies. |
| **Governance (`/audit/governance`)** | `#btn-apply-legal-hold` | Button | Opens modal to establish statutory litigation preservation legal hold. |
| **Governance (`/audit/governance`)** | `#grid-forensic-anomalies` | Grid | Displays real-time anomaly detection radar for velocity and after-hours edits. |
| **Cargo Board (`/cargo`)** | `#btn-register-consignment` | Button `[F6]` | Opens consignment registration modal with volumetric CBM calculator. |
| **Cargo Board (`/cargo`)** | `#drawer-consignment-detail` | Drawer | Slide-over drawer showing package barcodes, weights, and status advance. |
| **Cargo Costs (`/cargo/costs`)** | `#toggle-combined-reporting` | Toggle | Switches between single-tenant and aggregated multi-client MIS view. |
| **POD Desk (`/cargo/pod-exceptions`)** | `#btn-record-delivery-pod` | Button | Submits delivery POD with accepted vs short/damaged quantity validation. |
| **Freight Master (`/freight/contracts`)** | `#btn-new-contract` | Button `[F2]` | Opens modal to create new carrier contract with lane slabs. |
| **Freight Master (`/freight/contracts`)** | `#tab-btn-rate-cards` | Tab `[F2]` | Carrier rate card directory. |
| **Freight Master (`/freight/contracts`)** | `#tab-btn-sandbox` | Tab `[F4]` | Freight calculation rating sandbox evaluating fuel surcharges and minimums. |
| **Freight Recon (`/freight/reconciliation`)** | `#tab-btn-unreconciled` | Tab `[F2]` | Unmatched freight vouchers workbench for 3-way variance auditing. |
| **Principal (`/principal`)** | `#btn-open-claim-modal` | Button `[F7]` | Opens Principal breakage/damage claim modal with [Esc] dismissal. |
| **Principal (`/principal`)** | `#tab-btn-custody` | Tab `[F2]` | Principal custody inventory stock matrix showing SKU segregation. |
| **Principal (`/principal`)** | `#tab-btn-claims` | Tab `[F3]` | Principal claims & returns register. |
| **Principal (`/principal`)** | `#tab-btn-reconciliation` | Tab `[F4]` | 3-Way physical vs ledger reconciliation workspace. |
| **Principal (`/principal`)** | `#tab-btn-statement` | Tab `[F5]` | Periodic business reconciliation statement with cryptographic hash. |
| **Commission (`/commission`)** | `#tab-btn-agreements` | Tab `[F2]` | 4-Pillar C&F deal terms and rate cards (Storage, Staff, Freight, Comm %). |
| **Commission (`/commission`)** | `#tab-btn-sandbox` | Tab `[F3]` | Deterministic calculation sandbox & formula trace. |
| **Commission (`/commission`)** | `#tab-btn-claims` | Tab `[F4]` | Recovery claims desk & dual-post action. |
| **Commission (`/commission`)** | `#tab-btn-client-billing` | Tab `[F5]` | Client C&F Commission & Expense Billing Desk. |
| **Commission (`/commission`)** | `#client-billing-org-select` | Select | Client organization dropdown selector (e.g. Krishna Medical Agencies). |
| **Commission (`/commission`)** | `#btn-autofetch-client-telemetry` | Button | 1-Click Auto-Fetch turnover and depot operating expenses. |
| **Commission (`/commission`)** | `#input-billing-turnover` | Input | Client sales turnover input base for commission calculation. |
| **Commission (`/commission`)** | `#input-billing-comm-rate` | Input | Commission percentage input (e.g. 5.0%). |
| **Commission (`/commission`)** | `#input-billing-rent` | Input | Godown storage rent reimbursement input. |
| **Commission (`/commission`)** | `#input-billing-salary` | Input | Depot staff salaries reimbursement input. |
| **Commission (`/commission`)** | `#input-billing-freight` | Input | Freight & transport recharge input. |
| **Commission (`/commission`)** | `#check-dual-post-purchase` | Checkbox | Toggles automated dual-posting into the client company's inward purchase register. |
| **Commission (`/commission`)** | `#btn-generate-client-bill` | Button | Atomically creates outward bill (`CF-BILL-`) and inward purchase bill (`PUR-CF-`). |
| **Commission (`/commission`)** | `#generated-bill-success-card` | Banner | Success feedback card with outward/inward invoice numbers. |
| **Commission (`/commission`)** | `#btn-goto-outward-billing` | Button `[F7]` | Jump to Outward Bill in Billing Desk. |
| **Commission (`/commission`)** | `#btn-goto-inward-purchase` | Button `[F9]` | Jump to Inward Bill in Purchase Register. |
| **Radar (`/admin/tracking`)** | `#select-tracking-scope` | Select | Consolidated vs single client scope selector. |
| **Radar (`/admin/tracking`)** | `#card-tracking-sales` | Metric Card | Gross sales turnover KPI scorecard. |
| **Radar (`/admin/tracking`)** | `#card-tracking-expenses` | Metric Card | Operating expenses & C&F KPI scorecard. |
| **Radar (`/admin/tracking`)** | `#card-tracking-cargo` | Metric Card | Cargo consignments pipeline KPI card. |
| **Radar (`/admin/tracking`)** | `#tab-btn-scorecards` | Tab `[F2]` | Client operational scorecards matrix tab with 1-click drilldown. |
| **Radar (`/admin/tracking`)** | `#tab-btn-sales` | Tab `[F3]` | Cross-client sales ledger tab. |
| **Radar (`/admin/tracking`)** | `#tab-btn-expenses` | Tab `[F4]` | Multi-client expense claims tab. |
| **Radar (`/admin/tracking`)** | `#tab-btn-cargo` | Tab `[F6]` | Logistics pipeline tracking tab. |
| **Expiry Cockpit (`/inventory-dashboard`)** | `#card-main-stock` | Metric Card | Main Saleable Stock Value & Healthy Units KPI scorecard. |
| **Expiry Cockpit (`/inventory-dashboard`)** | `#card-quarantine-stock` | Metric Card | Quarantined / Brk-Exp Stock Value KPI scorecard. |
| **Expiry Cockpit (`/inventory-dashboard`)** | `#card-near-expiry-risk` | Metric Card | 90-Day Near-Expiry Risk Batches KPI scorecard. |
| **Expiry Cockpit (`/inventory-dashboard`)** | `#card-claim-exposure` | Metric Card | Principal Claims & Debit Note Exposure KPI scorecard. |
| **Expiry Cockpit (`/inventory-dashboard`)** | `#tab-btn-radar` | Tab `[F2]` | Expiry Radar table and alert filters tab. |
| **Expiry Cockpit (`/inventory-dashboard`)** | `#filter-bucket-ALL` | Filter Pill | All Critical near-expiry filter pill. |
| **Expiry Cockpit (`/inventory-dashboard`)** | `#filter-bucket-EXPIRED` | Filter Pill | Expired stock (<0d) filter pill. |
| **Expiry Cockpit (`/inventory-dashboard`)** | `#filter-bucket-30_DAYS` | Filter Pill | Critical <30 days near-expiry filter pill. |
| **Expiry Cockpit (`/inventory-dashboard`)** | `#filter-bucket-60_DAYS` | Filter Pill | Warning <60 days near-expiry filter pill. |
| **Expiry Cockpit (`/inventory-dashboard`)** | `#filter-bucket-90_DAYS` | Filter Pill | Attention <90 days near-expiry filter pill. |
| **Expiry Cockpit (`/inventory-dashboard`)** | `#filter-company-select` | Select | Manufacturer / Principal dropdown filter. |
| **Expiry Cockpit (`/inventory-dashboard`)** | `#search-batches-input` | Text Input | Batch / SKU search text input. |
| **Expiry Cockpit (`/inventory-dashboard`)** | `#tbl-expiry-radar` | Grid Table | Real-time batch surveillance table. |
| **Expiry Cockpit (`/inventory-dashboard`)** | `#btn-select-all-batches` | Checkbox | Multi-batch select all checkbox toggle. |
| **Expiry Cockpit (`/inventory-dashboard`)** | `#btn-shift-selected-action` | Button `[F7]` | Shift selected batches to quarantine action button. |
| **Expiry Cockpit (`/inventory-dashboard`)** | `#tab-btn-quarantine` | Tab `[F3]` | Quarantined & Breakage Stock Ledger tab. |
| **Expiry Cockpit (`/inventory-dashboard`)** | `#tab-btn-history` | Tab `[F4]` | Stock Shift Audit Register historical vouchers tab. |
| **Stock Shift Desk (`/stock-shift`)** | `#select-from-godown` | Select | Source Godown selector (Main Saleable Godown). |
| **Stock Shift Desk (`/stock-shift`)** | `#select-to-godown` | Select | Destination Godown selector (Quarantine / Expiry Godown). |
| **Stock Shift Desk (`/stock-shift`)** | `#check-auto-claim` | Checkbox | Auto-generate Principal claim & debit note checkbox. |
| **Stock Shift Desk (`/stock-shift`)** | `#select-principal-claim-target` | Select | Target Principal dropdown (Sun Pharma, Cipla, Krishna). |
| **Stock Shift Desk (`/stock-shift`)** | `#tbl-shift-items` | Grid Table | Shift line items grid with product, batch, exp, qty, rate, value. |
| **Stock Shift Desk (`/stock-shift`)** | `#btn-save-shift-voucher` | Button `[F7]` | Save Shift Voucher & execute atomic stock reallocation. |
| **Stock Shift Desk (`/stock-shift`)** | `#stock-shift-success-card` | Banner | Shift success card with voucher and claim references. |
| **Stock Shift Desk (`/stock-shift`)** | `#lbl-success-voucher-no` | Label | Generated Stock Shift Voucher number (`SHF-2026-XXXX`). |
| **Stock Shift Desk (`/stock-shift`)** | `#lbl-success-claim-no` | Label | Generated Principal Claim reference (`CLM-PRN-XXXX`). |
| **Stock Shift Desk (`/stock-shift`)** | `#btn-view-in-audit` | Button `[F2]` | View voucher in Stock Shift Audit Register. |
| **Stock Shift Desk (`/stock-shift`)** | `#btn-view-claim-desk` | Button `[F8]` | Jump to Principal Claims Desk. |
| **Compliance Desk (`/compliance`)** | `#card-qualifying-invoices` | Metric Card | Telemetry scorecard for qualifying outbound consignments (>= Rs. 50,000). |
| **Compliance Desk (`/compliance`)** | `#card-pending-eway` | Metric Card | Consignments pending E-Way Bill Part A & B transport slips. |
| **Compliance Desk (`/compliance`)** | `#card-generated-irn` | Metric Card | Invoices with verified cryptographic IRN and digital QR codes. |
| **Compliance Desk (`/compliance`)** | `#card-compliance-rate` | Metric Card | Live statutory compliance rating and color-coded progress bar. |
| **Compliance Desk (`/compliance`)** | `#btn-open-transport-modal` | Button `[F7]` | Opens Transporter & Vehicle Assignment modal (`#modal-transport-assignment`). |
| **Compliance Desk (`/compliance`)** | `#btn-export-nic-json` | Button `[F8]` | Exports official Government NIC Schema 1.1 Bulk Upload JSON. |
| **Compliance Desk (`/compliance`)** | `#btn-confirm-generate-compliance` | Button `[Enter]` | 1-Click generation of 64-char IRN, 15-digit Ack No, 12-digit E-Way Bill. |
| **Compliance Desk (`/compliance`)** | `#btn-print-slip-dialog` | Button | Print trigger for official Government of India CBIC two-part delivery slip. |
| **Transport Modal (`/compliance`)** | `#modal-transport-assignment` | Modal Dialog | Modal for configuring carrier, vehicle registration, and distance. |
| **Transport Modal (`/compliance`)** | `#select-transporter-id` | Select | Dropdown listing registered transporter logistics partners. |
| **Transport Modal (`/compliance`)** | `#input-vehicle-number` | Text Input | Transporter conveyance vehicle registration number (e.g. DL-01-AB-1234). |
| **Transport Modal (`/compliance`)** | `#input-transit-distance` | Number Input | Transit distance in KM; auto-computes validity (1 day per 200 KM). |
| **Transport Modal (`/compliance`)** | `#btn-assign-transport-submit` | Button | Saves vehicle details to consignment record. |
| **CBIC Slip Modal (`/compliance`)** | `#modal-eway-slip-preview` | Modal Dialog | Full-screen official Government of India CBIC delivery slip preview. |
| **GST Workbench (`/gst`)** | `#tab-gstr2b` | Tab `[F5]` | Activates GSTR-2B ITC Matching Engine workbench. |
| **GST Workbench (`/gst`)** | `#metric-2b-total-itc` | Metric Card | Total auto-drafted ITC available in GSTR-2B statements. |
| **GST Workbench (`/gst`)** | `#metric-2b-safe-itc` | Metric Card | Safe & Claimable ITC meeting Section 16(2)(aa) statutory rules. |
| **GST Workbench (`/gst`)** | `#metric-2b-at-risk-itc` | Metric Card | At-risk blocked ITC missing in 2B or with tax mismatches. |
| **GST Workbench (`/gst`)** | `#metric-2b-unclaimed-itc` | Metric Card | Unclaimed credit in 2B unbooked in internal ERP ledgers. |
| **GST Workbench (`/gst`)** | `#btn-tolerance-1`, `5`, `10` | Button Group | Switches differential matching tolerance (+-Rs.1, +-Rs.5, +-Rs.10). |
| **GST Workbench (`/gst`)** | `#btn-bulk-approve-itc` | Button | 1-Click bulk approval of matched records for GSTR-3B Table 4(A)(5). |
| **GST Workbench (`/gst`)** | `#modal-supplier-dunning` | Modal Dialog | Section 16(2)(aa) notice generator with direct WhatsApp sharing. |
| **GST Workbench (`/gst`)** | `#textarea-dunning-message` | Textarea | Pre-filled legal dunning notice body with invoice and tax numbers. |
| **GST Workbench (`/gst`)** | `#btn-copy-dunning` | Button | Copies Section 16(2)(aa) notice text to clipboard. |
| **GST Workbench (`/gst`)** | `#btn-send-whatsapp` | Link Button | Dispatches notice directly to supplier WhatsApp Web/Mobile. |
| **GST Workbench (`/gst`)** | `#modal-ingest-portal-2b` | Modal Dialog | Official Government GST Portal GSTR-2B JSON statement ingestion dialog. |
| **GST Workbench (`/gst`)** | `#textarea-json-2b` | Textarea | Ingests official b2b/cdnr payload from gst.gov.in. |
| **Login Screen (`/login`)** | `#btn-quick-fill-admin` | Button / Chip | 1-Click preset button filling AM-0001 / admin / Admin@123. |
| **Login Screen (`/login`)** | `#btn-quick-fill-client` | Button / Chip | 1-Click preset button filling KMA / SAN / Admin@123. |
| **Login Screen (`/login`)** | `#btn-demo-login` | Button | 1-Click full cloud access button authenticating with live backend. |
| **Client Management (`/clients`)** | `#btn-register-new-client` | Button | Opens Register Client Modal. |
| **Client Management (`/clients`)** | `#btn-open-enterprise-radar` | Button | Direct launcher to Enterprise Multi-Client Operations Radar (`/admin/tracking`). |
| **Register Client Modal** | `#input-client-org-name` | Text Input | Client organization legal entity name (min 3 chars). |
| **Register Client Modal** | `#input-client-org-code` | Text Input | Alphanumeric tenant code (e.g. AMC-F5BA; auto-capitalized). |
| **Register Client Modal** | `#input-client-admin-name` | Text Input | Initial Client Admin display name. |
| **Register Client Modal** | `#input-client-admin-username` | Text Input | Initial Client Admin login username. |
| **Register Client Modal** | `#input-client-admin-password` | Password Input | Initial Client Admin password (min 6 chars). |
| **Register Client Modal** | `#btn-cancel-register-client` | Button `[Esc]` | Dismisses modal dialog. |
| **Register Client Modal** | `#btn-submit-register-client` | Button | Submits client registration form to cloud backend with JWT header. |
| **Procurement Desk (`/po`)** | `#card-critical-stock` | Metric Card | Displays count of emergency zero-stock SKUs requiring replenishment. |
| **Procurement Desk (`/po`)** | `#card-reorder-stock` | Metric Card | Displays count of SKUs below safety stock reorder thresholds. |
| **Procurement Desk (`/po`)** | `#card-replenishment-budget` | Metric Card | Total estimated capital outlay required to restore target inventory. |
| **Procurement Desk (`/po`)** | `#card-pending-pos` | Metric Card | Total count and valuation of open/in-transit purchase orders. |
| **Procurement Desk (`/po`)** | `#tab-po-directory` | Button `[F1]` | Switches to Master Purchase Order Directory grid. |
| **Procurement Desk (`/po`)** | `#tab-replenishment-radar` | Button `[F2]` | Switches to Autonomous Stock Replenishment Radar. |
| **Procurement Desk (`/po`)** | `#tab-create-po` | Button `[F3]` | Switches to Keyboard-Operated PO Authoring Workbench. |
| **Procurement Desk (`/po`)** | `#tab-vendor-rates` | Button `[F4]` | Switches to Multi-Vendor Quotation Rate Intelligence Matrix. |
| **Procurement Desk (`/po`)** | `#input-search-po` | Text Input | Search filter for PO number, vendor legal name, or line items. |
| **Procurement Desk (`/po`)** | `#btn-filter-status-all` | Button | Shows all purchase orders in directory. |
| **Procurement Desk (`/po`)** | `#btn-filter-status-approved` | Button | Filters directory for approved, open purchase orders. |
| **Procurement Desk (`/po`)** | `#btn-filter-status-completed`| Button | Filters directory for orders converted to inward purchase bills. |
| **Procurement Desk (`/po`)** | `#btn-filter-status-cancelled`| Button | Filters directory for cancelled purchase orders. |
| **Procurement Desk (`/po`)** | `#btn-filter-status-draft` | Button | Filters directory for draft purchase orders. |
| **Procurement Desk (`/po`)** | `#btn-dispatch-po-{id}` | Button | Opens Supplier WhatsApp & Print Slip Modal for targeted PO. |
| **Procurement Desk (`/po`)** | `#btn-convert-po-purchase-{id}`| Button | Opens Inward Purchase Bill Conversion Confirmation Dialog. |
| **Procurement Desk (`/po`)** | `#checkbox-select-all` | Checkbox | Selects/deselects all deficit items in Replenishment Radar. |
| **Procurement Desk (`/po`)** | `#checkbox-item-{id}` | Checkbox | Toggles target deficit line item for bulk PO creation. |
| **Procurement Desk (`/po`)** | `#btn-bulk-generate-pos` | Button `[F7]` | Dispatches 1-Click Bulk PO Generation grouped by preferred vendor. |
| **Procurement Desk (`/po`)** | `#btn-view-vendor-rates-{id}`| Button | Jumps to Vendor Rate Comparison tab pre-filtering target product. |
| **Procurement Desk (`/po`)** | `#input-po-number` | Text Input | Alphanumeric PO sequence continuation input (`PO-YYYYMM-XXXX`). |
| **Procurement Desk (`/po`)** | `#input-po-date` | Date Input | Order placement date (defaults to system date). |
| **Procurement Desk (`/po`)** | `#select-po-vendor` | Select | Dropdown listing active verified pharmaceutical suppliers. |
| **Procurement Desk (`/po`)** | `#input-po-delivery` | Date Input | Expected consignment delivery date (defaults to +3 days). |
| **Procurement Desk (`/po`)** | `#input-po-supply-type` | Text Input | Classification notes (Standard, Cold-Chain, Emergency Replenishment). |
| **Procurement Desk (`/po`)** | `#select-po-product-{idx}` | Select | Product dropdown in line item builder row. |
| **Procurement Desk (`/po`)** | `#input-po-qty-{idx}` | Number Input | Line quantity with automatic line total computation. |
| **Procurement Desk (`/po`)** | `#input-po-rate-{idx}` | Number Input | Purchase rate per unit (auto-populated from master catalog). |
| **Procurement Desk (`/po`)** | `#btn-remove-po-row-{idx}` | Button | Deletes line item row from PO builder. |
| **Procurement Desk (`/po`)** | `#btn-add-po-row` | Button | Appends new line item row to the purchase order grid. |
| **Procurement Desk (`/po`)** | `#btn-save-purchase-order` | Button `[Enter]` | Validates lines, calculates 18% GST, and dispatches PO. |
| **Procurement Desk (`/po`)** | `#modal-po-dispatch` | Modal Dialog | Supplier WhatsApp & Print Slip container modal. |
| **Procurement Desk (`/po`)** | `#textarea-po-dispatch-text` | Textarea | Formatted plain-text WhatsApp order slip with line items and totals. |
| **Procurement Desk (`/po`)** | `#btn-copy-po-whatsapp` | Button | Copies formatted slip to system clipboard with alert confirmation. |
| **Procurement Desk (`/po`)** | `#btn-open-whatsapp-web` | Link Button | Launches WhatsApp Web with pre-populated message via direct deep link. |
| **Procurement Desk (`/po`)** | `#btn-close-dispatch-modal` | Button `[Esc]` | Dismisses dispatch modal. |
| **Procurement Desk (`/po`)** | `#modal-convert-po-purchase` | Modal Dialog | Confirmation dialog for converting approved PO to Inward Purchase Bill. |
| **Procurement Desk (`/po`)** | `#btn-confirm-convert-po` | Button | Generates inward purchase bill `PUR-PO-XXXX` and redirects to `/purchase`. |
| **Procurement Desk (`/po`)** | `#btn-close-convert-modal` | Button `[Esc]` | Dismisses conversion modal. |
| **Procurement Desk (`/po`)** | `#select-rate-comparison-product` | Select | Product selector in Vendor Rate Intelligence matrix. |
| **Goods Receipt Desk (`/grn`)** | `#card-total-inward` | Metric Card | Displays total inward delivery manifests and gross inward value. |
| **Goods Receipt Desk (`/grn`)** | `#card-pending-inspection` | Metric Card | Displays count of consignments awaiting QC signoff. |
| **Goods Receipt Desk (`/grn`)** | `#card-accepted-value` | Metric Card | Displays cumulative valuation of approved goods stocked. |
| **Goods Receipt Desk (`/grn`)** | `#card-damaged-quarantine` | Metric Card | Displays count of transit damaged/broken units segregated in quarantine. |
| **Goods Receipt Desk (`/grn`)** | `#tab-grn-register` | Button `[F1]` | Switches to Master Inward GRN Register directory. |
| **Goods Receipt Desk (`/grn`)** | `#tab-gate-inward` | Button `[F2]` | Switches to Gate Inward & PO Matching Workbench. |
| **Goods Receipt Desk (`/grn`)** | `#tab-barcode-scanner` | Button `[F3]` | Switches to Barcode Rapid Scanner Desk with synthesized audio chime. |
| **Goods Receipt Desk (`/grn`)** | `#tab-quality-inspection` | Button `[F4]` | Switches to Physical Quality & Cold-Chain Desk. |
| **Goods Receipt Desk (`/grn`)** | `#select-po` | Select | Dropdown listing approved, open Purchase Orders for auto-matching. |
| **Goods Receipt Desk (`/grn`)** | `#input-gate-pass` | Text Input | Physical security gate pass tracking number. |
| **Goods Receipt Desk (`/grn`)** | `#input-vehicle-no` | Text Input | Conveyance vehicle registration number (e.g. DL-01-AB-1234). |
| **Goods Receipt Desk (`/grn`)** | `#btn-confirm-gate-inward` | Button `[Enter]` | Validates items, calculates shortages, and saves gate inward GRN. |
| **Goods Receipt Desk (`/grn`)** | `#input-barcode-scanner` | Text Input | High-speed auto-focused barcode input with audio synthesis chirp. |
| **Goods Receipt Desk (`/grn`)** | `#btn-register-scan` | Button | Registers scanned barcode, matching catalog and incrementing counter. |
| **Goods Receipt Desk (`/grn`)** | `#select-qc-grn` | Select | Target Goods Receipt Note selector for quality inspection. |
| **Goods Receipt Desk (`/grn`)** | `#btn-submit-qc-verdict` | Button | Confirms cold-chain temperature, tamper seal, and damage quarantine. |
| **Goods Receipt Desk (`/grn`)** | `#modal-grn-inspection` | Modal Dialog `[F8]`| Decision modal for passing, rejecting, or quarantining line items. |
| **Goods Receipt Desk (`/grn`)** | `#modal-convert-grn-purchase`| Modal Dialog | One-click conversion modal generating `PUR-GRN-XXXX` in the General Ledger. |
| **Goods Receipt Desk (`/grn`)** | `#modal-grn-print-slip` | Modal Dialog `[Ctrl+P]`| Printable warehouse tag and dock inward receipt with complete barcode and inspector stamp. |
| **Stock Transfer (`/stock-transfer`)** | `#stat-card-active-sto` | Metric Card | Displays total count and valuation of active inter-branch transfer orders. |
| **Stock Transfer (`/stock-transfer`)** | `#stat-card-in-transit` | Metric Card | Displays count of freight vehicles currently in transit on road. |
| **Stock Transfer (`/stock-transfer`)** | `#stat-card-transit-val` | Metric Card | Total monetary valuation of goods currently aboard transport carriers (₹). |
| **Stock Transfer (`/stock-transfer`)** | `#stat-card-transit-loss`| Metric Card | Total monetary value of transit breakage, leakage, and shortages (₹). |
| **Stock Transfer (`/stock-transfer`)** | `#tab-sto-register` | Button `[F1]` | Switches to Master Stock Transfer Register audit directory. |
| **Stock Transfer (`/stock-transfer`)** | `#tab-sto-requisition` | Button `[F2]` | Switches to Create Stock Requisition Desk. |
| **Stock Transfer (`/stock-transfer`)** | `#tab-sto-dispatch` | Button `[F3]` | Switches to Outward Dispatch & Delivery Challan Desk. |
| **Stock Transfer (`/stock-transfer`)** | `#tab-sto-transit-radar`| Button `[F4]` | Switches to In-Transit Pipeline Radar view with live cold-chain badges. |
| **Stock Transfer (`/stock-transfer`)** | `#select-source-godown` | Select | Origin supplying depot / mother warehouse dropdown. |
| **Stock Transfer (`/stock-transfer`)** | `#select-dest-godown` | Select | Destination receiving hub / branch godown dropdown. |
| **Stock Transfer (`/stock-transfer`)** | `#btn-create-sto-submit`| Button `[Enter]`| Submits and approves STO transfer requisition. |
| **Stock Transfer (`/stock-transfer`)** | `#input-dispatch-vehicle`| Text Input | Transport vehicle registration number (e.g. DL-01-EF-9988). |
| **Stock Transfer (`/stock-transfer`)** | `#input-dispatch-carrier`| Text Input | Logistics carrier / fleet company name. |
| **Stock Transfer (`/stock-transfer`)** | `#input-dispatch-docket` | Text Input | Transporter consignment note / Lorry Receipt (LR) #. |
| **Stock Transfer (`/stock-transfer`)** | `#input-dispatch-ewb` | Text Input | Statutory 12-digit CBIC E-Way bill number. |
| **Stock Transfer (`/stock-transfer`)** | `#btn-confirm-dispatch` | Button `[Enter]`| Deducts source inventory and generates Outward Delivery Challan. |
| **Stock Transfer (`/stock-transfer`)** | `#modal-acknowledge-inward`| Modal Dialog | Destination receiving dock verification, damage quarantine, and tally modal. |
| **Stock Transfer (`/stock-transfer`)** | `#btn-submit-inward-ack`| Button `[Enter]`| Confirms inward receipt, increments saleable stock, and isolates breakage. |
| **Stock Transfer (`/stock-transfer`)** | `#modal-print-sto-challan`| Modal Dialog `[Ctrl+P]`| High-contrast printable Rule 55 Inter-Branch Delivery Challan slip. |

---

## 28. Module 28 — DOC-41: Pharma Expiry Radar, Stock Shift Quarantine Engine & Principal Debit Note Settlement Desk

### 28.1 Operational Overview & Problem Context
In pharmaceutical wholesale and retail operations, expired medicines represent both a regulatory hazard and a direct financial loss. Drug authorities strictly prohibit saleable storage of medicines past their expiry date, while pharmaceutical distribution agreements allow distributors to claim 100% credit or replacement from manufacturers (Principals) provided batches are segregated in a timely manner.

DOC-41 introduces a closed-loop Expiry Surveillance and Physical Quarantine engine:
1. **Continuous Shelf-Life Surveillance**: Categorizes warehouse stock into 4 time horizons: Expired (<0 days), Critical (<30 days), Warning (<60 days), and Attention (<90 days).
2. **Physical Godown Segregation**: Atomically moves inventory from `MAIN_SALEABLE_GODOWN` to `QUARANTINE_EXPIRY_GODOWN`, adjusting `Batch.current_stock` and `Batch.brk_exp_stock`.
3. **Automated Principal Debit Note Bridging**: Generates formal `PrincipalClaim` (`CLM-PRN-YYYY-XXXX`) records linked to the specific manufacturer for debit note recovery.

### 28.2 Step-by-Step Operator Workflow

```
+-----------------------------------------------------------------------------------+
|                        EXPIRY SURVEILLANCE & SHIFT PIPELINE                       |
|                                                                                   |
|  [F2] Expiry Radar  -->  Multi-Batch Select  -->  [F7] Shift to Quarantine        |
|          |                                                  |                     |
|          v                                                  v                     |
|  4 Risk Buckets                                   Stock Shift Desk (/stock-shift) |
|  - Red: Expired                                             |                     |
|  - Orange: <30d                                   Toggle Auto-Claim (#check)      |
|  - Yellow: <60d                                             |                     |
|  - Blue: <90d                                               v                     |
|                                                   [F7] Save Shift Voucher         |
|                                                             |                     |
|                                                   Generates SHF-2026-XXXX         |
|                                                   & CLM-PRN-YYYY-XXXX in GL       |
+-----------------------------------------------------------------------------------+
```

#### Step 1: Accessing the Cockpit
- Navigate to `/inventory-dashboard` or `/inventory/dashboard`, or click **`Inventory ▾` &rarr; `Expiry & Breakage Cockpit`**.
- Review the 4 Header Scorecards:
  - `#card-main-stock`: Total valuation and units in healthy saleable storage.
  - `#card-quarantine-stock`: Valuation and units currently locked in breakage/expiry godowns.
  - `#card-near-expiry-risk`: Valuation of batches expiring within the next 90 days.
  - `#card-claim-exposure`: Active unsettled claims submitted to principals.

#### Step 2: Filtering and Selecting Batches on the Radar
- Press `[F2]` to activate the **Expiry Radar** table (`#tbl-expiry-radar`).
- Click filter pills to focus on immediate risks:
  - `#filter-bucket-EXPIRED`: Batches already past expiry date (immediate compliance action).
  - `#filter-bucket-30_DAYS`: Batches expiring within 30 days.
  - `#filter-company-select`: Filter by manufacturer (e.g. *Sun Pharma*, *Cipla*).
- Check the boxes for batches to quarantine (`#btn-select-all-batches` for all, or individual row checkboxes).

#### Step 3: Executing the Stock Shift
- Click **`[F7] Shift Selected to Quarantine`** (`#btn-shift-selected-action`).
- The system opens the **Stock Shift Voucher Desk** (`/stock-shift`) pre-loaded with the selected batches.
- Confirm source godown (`#select-from-godown`) is set to `Main Saleable Godown` and destination (`#select-to-godown`) is set to `Quarantine / Expiry Godown`.
- Ensure `#check-auto-claim` is checked to automatically file a debit note claim.
- Select the target Principal entity (`#select-principal-claim-target`).
- Press **`[F7] Save Shift Voucher`** (`#btn-save-shift-voucher`).

#### Step 4: Verification & Audit
- The system generates voucher `SHF-2026-XXXX` and claim `CLM-PRN-YYYY-XXXX`, displaying the success banner.
- Press `[F2]` (`#btn-view-in-audit`) to view the voucher in the Stock Shift Audit Register.
- Press `[F8]` (`#btn-view-claim-desk`) to open the Principal Claims Desk (`/principal`) to track supplier reimbursement.

---

## 29. Module 29 — DOC-42: Statutory GST E-Way Bill & E-Invoice (IRN) Generation Desk with NIC Offline JSON & Transport Part A/B Slips

### 29.1 Operational Overview & Statutory Rules
Under Rule 138 of the CGST Rules, 2017, registered businesses transporting consignments valued at ₹50,000 or above must carry an electronic E-Way Bill. Furthermore, under Rule 48(4), notified taxpayers must generate an electronic invoice with a 64-character Invoice Reference Number (IRN) and signed digital QR code before goods leave the warehouse.

DOC-42 provides a centralized Compliance Desk (`/compliance`) that automates compliance:
1. **Automatic Consignment Qualification**: Identifies all outbound B2B sales bills with grand total $\ge ₹50,000$.
2. **Interactive Transport Assignment**: Records carrier fleet name, vehicle registration number (e.g. `DL-01-AB-1234`), and transit distance, automatically calculating statutory validity (1 day per 200 KM).
3. **1-Click Cryptographic IRN & EWB Engine**: Generates 64-char SHA-256 IRN hash, 15-digit Ack No, 12-digit E-Way Bill number (prefixed with `24`), and digital QR code representation.
4. **CBIC Official Two-Part Slips**: Generates printable official delivery slips with Part A (invoice/goods details) and Part B (vehicle conveyance).
5. **Government NIC Schema 1.1 Bulk JSON Export**: Produces standardized bulk upload JSON payloads for direct upload to `einvoice1.gst.gov.in`.

### 29.2 Step-by-Step Operator Workflow

```
+-----------------------------------------------------------------------------------+
|                        GST COMPLIANCE & TRANSIT DISPATCH                          |
|                                                                                   |
|  Outbound Invoices (>= Rs. 50k)  -->  [F7] Assign Transporter & Vehicle (Part B)  |
|                                                  |                                |
|                                                  v                                |
|                                       [Enter] Generate Compliance                 |
|                                                  |                                |
|                                                  v                                |
|                                       - 64-char SHA-256 IRN                       |
|                                       - 15-digit Ack Number                       |
|                                       - 12-digit E-Way Bill (24xxxxxxxxxx)        |
|                                       - High-Contrast Digital QR Code             |
|                                                  |                                |
|                         +------------------------+------------------------+       |
|                         |                                                 |       |
|                         v                                                 v       |
|             Print CBIC Delivery Slip                           Export NIC 1.1 JSON|
|             (Driver Handover with QR)                          (Government Portal)|
+-----------------------------------------------------------------------------------+
```

#### Step 1: Navigating to Compliance Desk
- Click **`GST & Compliance ▾` &rarr; `Compliance Workbench`** or navigate to `/compliance`.
- Review the 4 Top Telemetry Scorecards:
  - `#card-qualifying-invoices`: Total count of outbound invoices $\ge ₹50,000$.
  - `#card-pending-eway`: Consignments awaiting vehicle assignment and Part B slips.
  - `#card-generated-irn`: Invoices certified with cryptographic IRN hashes.
  - `#card-compliance-rate`: Live percentage compliance rating progress bar.

#### Step 2: Assigning Transporter & Vehicle Details
- In the consignments table, select an invoice pending transport assignment.
- Press `[F7]` or click **`Assign Transport`** (`#btn-open-transport-modal`).
- In `#modal-transport-assignment`:
  - Select the registered logistics carrier (`#select-transporter-id`) (e.g. *Delhi-NCR Express Cargo*).
  - Type the vehicle registration number (`#input-vehicle-number`) (e.g. `DL-01-AB-1234`).
  - Enter the transit distance in KM (`#input-transit-distance`) (e.g. `180`). The system displays calculated validity (e.g. 1 day).
  - Click `#btn-assign-transport-submit` to save.

#### Step 3: 1-Click IRN & E-Way Bill Generation
- Click **`[Enter] Confirm & Generate`** (`#btn-confirm-generate-compliance`).
- The system atomically computes the SHA-256 hash, Ack No, EWB number, and signed QR string, marking the invoice as `SUCCESS`.

#### Step 4: Printing CBIC Slips & Exporting NIC JSON
- Click **`Print Slip`** (`#btn-print-slip-dialog`) to open `#modal-eway-slip-preview`. Print the official two-part delivery slip with QR code for the delivery driver.
- Press `[F8]` or click **`Export NIC JSON`** (`#btn-export-nic-json`) to download the official Schema 1.1 JSON payload for offline portal archival.

---

## 30. Module 30 — DOC-43: Statutory Multi-State GSTR-1, GSTR-2B & GSTR-3B Reconciliation Cockpit with Section 16(2)(aa) 2B ITC Matching Engine

### 30.1 Operational Overview & Statutory Rules
Under Section 16(2)(aa) of the CGST Act, 2017 (effective 1 January 2022), registered businesses cannot claim Input Tax Credit (ITC) in GSTR-3B unless the supplier has furnished the invoice in Form GSTR-1 and it is reflected in the recipient's auto-drafted Form GSTR-2B. Claiming unreflected ITC triggers mandatory DRC-01B notices, 18% annual interest, and credit reversals under Rule 37A.

DOC-43 provides an end-to-end 2B ITC Reconciliation Cockpit:
1. **Side-by-Side Dual-Ledger Matching**: Correlates ERP purchase vouchers against portal GSTR-2B records across 4 categories:
   - `MATCHED`: Invoice present in both ledgers within configured tolerance ($\pm ₹1$, $\pm ₹5$, $\pm ₹10$). Legally safe ITC.
   - `TAX_MISMATCH`: Invoice present in both ledgers but tax variance exceeds tolerance.
   - `MISSING_IN_2B`: Purchase voucher recorded in ERP but missing from GSTR-2B. At-risk blocked credit.
   - `MISSING_IN_BOOKS`: Auto-drafted invoice on GSTR-2B but unbooked in ERP books. Unclaimed credit.
2. **Tolerance Switcher**: Toggle differential thresholds ($\pm ₹1$, $\pm ₹5$, $\pm ₹10$) to absorb statutory rounding discrepancies.
3. **Multi-State GSTIN Filtering**: Filter records by 2-digit GST state codes (`07` Delhi, `27` Maharashtra).
4. **Supplier WhatsApp Dunning**: Generates official Section 16(2)(aa) dunning notices with direct WhatsApp Web dispatch to delinquent vendors.
5. **1-Click Bulk Approval**: Unlocks safe matched credits for monthly GSTR-3B Table 4(A)(5) availing.
6. **Portal JSON Ingestion**: Ingests official GSTR-2B JSON returns (`b2b`, `cdnr`) directly from `gst.gov.in`.

### 30.2 Step-by-Step Operator Workflow

```
+-----------------------------------------------------------------------------------+
|                        GSTR-2B ITC RECONCILIATION WORKFLOW                        |
|                                                                                   |
|  [F5] GSTR-2B Tab (/gst)  -->  Review 4 Scorecards (Safe vs At-Risk ITC)          |
|                                                  |                                |
|                                                  v                                |
|                        Set Tolerance (+-Rs.1, +-Rs.5, +-Rs.10)                    |
|                        & State Filter (07-Delhi, 27-Maharashtra)                  |
|                                                  |                                |
|           +--------------------------------------+---------------------+          |
|           |                                                            |          |
|           v                                                            v          |
|  MATCHED RECORDS (Safe ITC)                               MISSING IN 2B (At-Risk) |
|  - Check row / Select All                                 - Click Dunning Icon    |
|  - Click [1-Click Bulk Approve]                           - Open Dunning Modal    |
|  - Unlocks ITC for GSTR-3B Table 4(A)(5)                  - [Send via WhatsApp]   |
+-----------------------------------------------------------------------------------+
```

#### Step 1: Navigating to the Reconciliation Workbench
- Navigate to `/gst` and click Tab **`[F5] GSTR-2B ITC Matching Engine`** (`#tab-gstr2b`).
- Inspect the 4 Telemetry Scorecards:
  - `#metric-2b-total-itc`: Total ITC available in GSTR-2B statement.
  - `#metric-2b-safe-itc`: Safe & Claimable ITC meeting Section 16(2)(aa) compliance.
  - `#metric-2b-at-risk-itc`: Blocked credit missing from 2B or having tax mismatches.
  - `#metric-2b-unclaimed-itc`: Legitimate credit auto-drafted on portal but missing in ERP books.

#### Step 2: Configuring Matching Tolerance & State Scope
- Click tolerance buttons (`#btn-tolerance-1`, `#btn-tolerance-5`, `#btn-tolerance-10`) to adjust variance thresholds.
- Select target operating state code (`#select-recon-state`) to filter multi-state branches.

#### Step 3: Approving Matched Records for GSTR-3B
- Click the `#filter-recon-matched` category pill.
- Select all matched records via master checkbox (`#chk-select-all-recon`).
- Click **`1-Click Bulk Approve Matched ITC`** (`#btn-bulk-approve-itc`). The system flags records as `CLAIM_ITC` for auto-populating GSTR-3B Table 4(A)(5).

#### Step 4: Dunning Delinquent Suppliers via WhatsApp
- Click the `#filter-recon-missing_in_2b` category pill to view at-risk invoices.
- On any vendor row (e.g. *Torrent Pharma*), click the WhatsApp dunning icon (`#btn-dunning-row-{idx}`).
- The **Supplier Dunning Modal** (`#modal-supplier-dunning`) opens with pre-populated Section 16(2)(aa) legal notice citing invoice number, date, and blocked tax amount.
- Click **`Copy Notice Text`** (`#btn-copy-dunning`) or click **`Send via WhatsApp Web`** (`#btn-send-whatsapp`) to immediately notify the supplier.

#### Step 5: Ingesting Government Portal JSON Statements
- When a new monthly GSTR-2B return is downloaded from `gst.gov.in`, click **`Ingest Portal 2B JSON`** (`#btn-open-ingest-2b`).
- Paste the official JSON payload into `#textarea-json-2b` and click `#btn-submit-ingest-2b`. The database reconciles all records instantly.

---

## 31. Module 31 — DOC-44: Enterprise Cloud Authentication, Multi-Tenant Session Recovery & Production Client Onboarding Desk

### 31.1 Operational Overview & Problem Context
In enterprise cloud deployments on the Vercel Edge Network (`https://erp-rho-three.vercel.app`) communicating with Render FastAPI and Neon PostgreSQL, tenant organizations require cryptographically signed JWT bearer tokens with active database sessions.

DOC-44 resolves authentication and client onboarding:
1. **Asynchronous Production Cloud Handshake**: Upgraded 1-click demo button (`#btn-demo-login`) to authenticate with live cloud backend (`AM-0001` / `admin` / `Admin@123`), acquiring an authentic 8-hour JWT access token with full `am_admin` God-mode authority.
2. **1-Click Autofill Credential Presets**: Preset chips on the login card (`#btn-quick-fill-admin` for `AM-0001` and `#btn-quick-fill-client` for `KMA`) allow immediate testing.
3. **Transparent Session Self-Healing**: Transparently detects mock tokens (`demo-preview-jwt-token`) and acquires authentic cloud credentials in the background before submitting onboarding forms, eliminating 401 Unauthorized errors.
4. **Multi-Tenant Client Provisioning**: Complete onboarding form (`#btn-register-new-client`) that creates client company records, tenant administrator credentials, and automatically seeds 40+ statutory General Ledger accounts.

### 31.2 Step-by-Step Operator Workflow

```
+-----------------------------------------------------------------------------------+
|                        CLOUD ONBOARDING & AUTHENTICATION                          |
|                                                                                   |
|  Login Screen (/login)                                                            |
|  - Click [#btn-demo-login] or [#btn-quick-fill-admin]                             |
|  - Authenticates with Render FastAPI -> Acquires 8-hour JWT Bearer Token           |
|                                                  |                                |
|                                                  v                                |
|  Client Management (/clients)                                                     |
|  - Click [#btn-register-new-client]                                               |
|  - Modal checks session -> Self-heals mock tokens transparently                   |
|  - Fill Organization Name & Code (AMC-F5BA)                                       |
|  - Fill Admin Name, Username & Password                                           |
|                                                  |                                |
|                                                  v                                |
|  Click [#btn-submit-register-client]                                              |
|  - POST /api/organizations/register                                               |
|  - Seeds 40+ Chart of Accounts                                                    |
|  - Renders new client card in Neon DB grid                                        |
|  - 1-Click [Switch to ERP ->] impersonation                                       |
+-----------------------------------------------------------------------------------+
```

#### Step 1: Logging in to Production Cloud
- Open `https://erp-rho-three.vercel.app/login`.
- Click **`⚡ Explore Live Demo as Admin (Full Cloud Access)`** (`#btn-demo-login`) or click `#btn-quick-fill-admin`.
- The system authenticates against the live cloud backend, receives an authentic JWT token, and redirects to the Counter Workbench (`/`).

#### Step 2: Navigating to Client Management
- Navigate to `/clients` or click **`CRM & Admin ▾` &rarr; `Client Management`**.
- Review existing registered tenant organizations.
- Click **`+ Register New Client`** (`#btn-register-new-client`).

#### Step 3: Completing Client Organization Registration
- The modal opens and automatically runs `ensureLiveCloudAuthSession` to guarantee active database authorization.
- Fill the required fields:
  - Organization Name (`#input-client-org-name`): Legal corporate or pharmacy name (e.g. `Apex MedCorp F5BA`).
  - Organization Code (`#input-client-org-code`): Unique tenant prefix (e.g. `AMC-F5BA`; auto-capitalized).
  - Admin Full Name (`#input-client-admin-name`): Primary tenant administrator name.
  - Admin Username (`#input-client-admin-username`): Login username for tenant admin.
  - Admin Password (`#input-client-admin-password`): Initial login password (min 6 characters).
- Click **`Register Organization & Deploy ERP`** (`#btn-submit-register-client`).

#### Step 4: Verification & Tenant Impersonation
- The modal closes, and the newly created tenant card appears immediately in the live multi-tenant grid.
- Click **`Switch to ERP →`** on the tenant card to impersonate the client company and configure their local operational masters.

---

## 32. Module 32 — DOC-45: Enterprise Purchase Order, Intelligent Stock Replenishment Radar & Vendor Procurement Desk

### 32.1 Operational Overview & P2P Architecture
In pharmaceutical supply chains, maintaining optimal inventory while avoiding capital lockup requires real-time coordination between physical batch stock, reorder thresholds, vendor pricing, and accounts payable.

DOC-45 introduces an end-to-end Procure-to-Pay (P2P) automation engine:
1. **Autonomous Stock Replenishment Radar**: Reconciles unexpired batch stock across all physical godowns against safety stock thresholds (`min_stock_level` and `reorder_quantity`).
2. **Deficit Calculation Formula**:
   $$\text{Effective Stock} = \text{Current Stock} + \text{Pending Incoming PO Qty}$$
   $$\text{Deficit Qty} = \max(0, \text{min\_stock\_level} - \text{Effective Stock})$$
   $$\text{Suggested Order Qty} = \max(\text{Deficit Qty}, \text{reorder\_quantity})$$
3. **Multi-Vendor Best-Rate Optimizer**: Compares multiple suppliers by historical purchase rates, discounts, net effective costs, and payment credit terms (e.g. 21 vs 60 days).
4. **1-Click Bulk PO Generation**: Partitions selected deficit medicines by preferred supplier and auto-generates formal sequential Purchase Orders (`PO-YYYYMM-XXXX`).
5. **Keyboard-Operated PO Authoring Desk (`/po`)**: Fast keyboard entry (`Enter`, `Tab`, `Arrow` keys) for custom purchase orders with dynamic 18% GST calculation.
6. **Supplier WhatsApp & Print Slip Dispatch**: Generates formatted plain-text order slips ready for 1-click copying or direct WhatsApp Web launching (`https://wa.me/?text=...`).
7. **1-Click Convert PO to Inward Purchase Bill**: Converts approved POs directly into Inward Purchase Bills (`PUR-PO-XXXX`), marking line items as received, updating inventory stock, and posting liabilities to the General Ledger.

### 32.2 Step-by-Step Operator Workflow

```
+-----------------------------------------------------------------------------------+
|                        PROCURE-TO-PAY (P2P) WORKFLOW                              |
|                                                                                   |
|  [F2] Replenishment Radar (/po)                                                   |
|  - Live Deficit Calculations across all SKUs                                      |
|  - Checkboxes for Deficit Items                                                   |
|  - [F7] Generate Bulk POs (Grouped by Vendor)                                     |
|                                                  |                                |
|                         +------------------------+------------------------+       |
|                         |                                                 |       |
|                         v                                                 v       |
|             [F1] Master PO Directory                          [F3] Create New PO  |
|             - Review Issued POs                               - Keyboard Builder  |
|             - Filter by Status                                - Dynamic 18% GST   |
|                         |                                                 |       |
|                         +------------------------+------------------------+       |
|                                                  |                                |
|                                                  v                                |
|                                       Click [Dispatch] Button                     |
|                                       - Supplier WhatsApp Slip Modal              |
|                                       - 1-Click Copy or Open WhatsApp Web         |
|                                                  |                                |
|                                                  v                                |
|                                       Consignment Arrives at Gate                 |
|                                       - Click [Book Inward] Button                |
|                                       - Generates PUR-PO-XXXX in GL               |
|                                       - Stock Accrued & PO Marked COMPLETED       |
+-----------------------------------------------------------------------------------+
```

#### Step 1: Reviewing Telemetry 4 Scorecards
- Navigate to `/po` or click **`Purchases ▾` &rarr; `Purchase Orders & Replenishment Radar`**.
- Inspect the 4 Telemetry Scorecards:
  - `#card-critical-stock`: Emergency zero-stock items requiring immediate reorder.
  - `#card-reorder-stock`: Items that have dipped below configured safety stock levels.
  - `#card-replenishment-budget`: Total projected capital outlay in ₹ INR to restore target inventory.
  - `#card-pending-pos`: Active open purchase orders currently in transit.

#### Step 2: Autonomous Deficit Radar & 1-Click Bulk PO Generation
- Press `[F2]` or click Tab **`[F2] Stock Replenishment Radar`** (`#tab-replenishment-radar`).
- Review the deficit grid: Current Physical Stock, Minimum Safety Stock, Deficit Quantity, Suggested Order Quantity, Master Purchase Rate, and Estimated Budget.
- Filter by urgency using `#btn-radar-filter-all`, `#btn-radar-filter-critical`, or `#btn-radar-filter-reorder`.
- Select deficit items using `#checkbox-select-all` or individual row checkboxes (`#checkbox-item-{id}`).
- Click **`[F7] Generate Bulk POs`** (`#btn-bulk-generate-pos`).
- The system automatically partitions selected items by their preferred vendor, generates sequential Purchase Orders (`PO-YYYYMM-XXXX`), and redirects to the Master PO Directory.

#### Step 3: Authoring a Custom Purchase Order (`[F3]`)
- For ad-hoc purchasing, press `[F3]` or click Tab **`[F3] Create New PO`** (`#tab-create-po`).
- Verify the auto-generated sequential PO Number (`#input-po-number`).
- Select the supplier from `#select-po-vendor`.
- Set expected delivery date (`#input-po-delivery`) and enter supply classification notes (`#input-po-supply-type`).
- In the line items grid:
  - Select medicine from `#select-po-product-{idx}`.
  - Type the desired quantity (`#input-po-qty-{idx}`).
  - Purchase rate (`#input-po-rate-{idx}`) auto-fills from master data; adjust if negotiated.
  - Click `#btn-add-po-row` to add more products.
- The summary panel automatically computes Subtotal, Estimated 18% Pharma GST, and Grand Total.
- Press **`Submit & Approve Purchase Order [Enter]`** (`#btn-save-purchase-order`).

#### Step 4: Multi-Vendor Rate Intelligence Matrix (`[F4]`)
- Press `[F4]` or click Tab **`[F4] Vendor Rate Intelligence`** (`#tab-vendor-rates`).
- Select any product from `#select-rate-comparison-product`.
- The matrix displays historical supplier quotes, discounts, net effective landed rates, payment terms (e.g. 21 vs 60 days), delivery lead times, and optimization badges (`BEST_PRICE`, `FASTEST_DELIVERY`, `LONGEST_CREDIT`, `BULK_DISCOUNT`).

#### Step 5: Supplier WhatsApp & Print Slip Dispatch
- In the **Master PO Directory** (`[F1]`), find the target Purchase Order.
- Click the green **`Dispatch`** button (`#btn-dispatch-po-{id}`).
- The **Supplier Dispatch Slip Modal** (`#modal-po-dispatch`) opens with a pre-formatted plain-text order slip.
- Click **`Copy WhatsApp Text`** (`#btn-copy-po-whatsapp`) to copy the order text, or click **`Open in WhatsApp`** (`#btn-open-whatsapp-web`) to launch WhatsApp Web directly.
- Press `[Esc]` (`#btn-close-dispatch-modal`) to dismiss.

#### Step 6: 1-Click Conversion to Inward Purchase Bill
- When goods arrive at the depot, locate the PO in the Master PO Directory (`[F1]`).
- Click the dark green **`Book Inward`** button (`#btn-convert-po-purchase-{id}`).
- The confirmation dialog (`#modal-convert-po-purchase`) appears summarizing the PO number, vendor, and target invoice reference (`PUR-PO-XXXX`).
- Click **`Confirm & Generate Purchase Bill`** (`#btn-confirm-convert-po`).
- The system atomically creates an Inward Purchase Bill in `models.Invoice`, generates `models.InvoiceItem` lines, marks PO items received, sets status to `COMPLETED`, accrues batch stock, books accounts payable in GL, and redirects to `/purchase`.

---

## 33. Module 33: Goods Receipt Note (GRN), Physical Quality Inspection & Barcode Inward Verification Desk (`/grn`)

### 33.1 Purpose & Industrial Scope
Receiving physical inventory at the warehouse dock requires strict verification before posting to accounts payable. Vendor deliveries regularly arrive with transit shortages against delivery challans, cold-chain temperature excursions, and damaged units. 

The **Goods Receipt Note (GRN) & Physical Inward Inspection Desk** (`/grn`) bridges Purchase Orders (`PO-YYYYMM-XXXX`) to General Ledger Inward Purchase Bills (`PUR-GRN-XXXX`) via a 3-tier validation workflow:
1. **Gate Inward Matching**: Compares physical carton counts with vendor delivery challans, computing shortage discrepancies (`short_qty = challan_qty - received_qty`).
2. **Barcode Rapid Scanner**: Handheld dock scanning with real-time audio chirp and counter increments.
3. **Physical QC & Cold-Chain Desk**: 2.0°C – 8.0°C range verification, tamper seal certification, and automatic damage quarantine to `brk_exp_stock`.

### 33.2 Step-by-Step Operator Instructions

```
[Arrival of Delivery Vehicle at Godown Bay]
                   │
                   ▼
       [Tab [F2] Gate Inward Desk]
   - Select Approved Purchase Order
   - Enter Gate Pass, Vehicle No, Challan No
   - Count Physical Cartons & Record Shortages
                   │
                   ▼
     [Tab [F3] Barcode Scanner Desk]
   - Scan GS1-128 / 2D DataMatrix Cartons
   - Audio Chirp & Live Counter Increment
                   │
                   ▼
    [Tab [F4] Physical QC & Cold-Chain]
   - Verify Cold-Chain Logger (2°C - 8°C)
   - Verify Tamper-Evident Seals
   - Isolate Damaged Units to Quarantine
                   │
                   ▼
    [Tab [F1] Master Inward Register]
   - Click "Convert" -> Generates GL Bill
   - Increments Saleable & Breakage Batches
   - Click "Print" -> Signs Official GRN Slip
```

#### Step 1: Gate Inward Registration & Shortage Calculation (`[F2]`)
- Navigate to `/grn` and press `[F2]` or click Tab **`[F2] Gate Inward & PO Matcher`** (`#tab-grn-gate`).
- Select the approved PO from `#select-po`. Line items, ordered quantities, and agreed rates auto-fill.
- Enter Security Gate Entry Number (`#input-gate-pass`), Vehicle Registration (`#input-vehicle-no`), Delivery Challan Number, and Inward Temperature.
- In the line items table, adjust `Challan Qty` and `Received Qty`. If 100 units were billed on challan but only 96 physically arrived, entering 96 automatically computes `Short Qty = 4 units`.
- Click **`Confirm & Save Gate Inward`** (`#btn-confirm-gate-inward`). Sequential voucher `GRN-YYYYMM-XXXX` is generated.

#### Step 2: High-Speed Barcode Scanning at the Bay (`[F3]`)
- Press `[F3]` or click Tab **`[F3] Barcode Rapid Scanner Desk`** (`#tab-grn-barcode`).
- The input `#input-barcode-scanner` auto-focuses. Scan cartons or blister strips with your barcode reader.
- An audible 880 Hz confirmation chirp sounds. The matching medicine is identified and logged into the real-time scanning feed with a timestamp.

#### Step 3: Physical QC & Cold-Chain Logging (`[F4]`)
- Press `[F4]` or click Tab **`[F4] Physical Quality & Cold-Chain Desk`** (`#tab-grn-qc`).
- Select the GRN to inspect from `#select-qc-grn`.
- Adjust the Cold-Chain Thermometer slider to the exact temperature reading (e.g. `4.2°C`). If within 2.0°C – 8.0°C, the compliance badge shows green `VALID`.
- Verify the manufacturer's tamper seal and toggle the `Tamper Seal Verified` checkbox.
- In the Item Disposition table, inspect for cracked vials or punctured blisters. Enter damaged quantity under `Damaged / Leak`. The accepted quantity automatically recalculates.
- Select the QC Verdict (`ACCEPTED` or `PARTIAL_ACCEPT`) and click **`Submit Physical QC & Cold-Chain Verdict`** (`#btn-submit-qc-verdict`). The GRN status updates to `VERIFIED`.

#### Step 4: Converting Verified GRN to GL Purchase Bill
- Return to **`[F1] Master Inward Register`** (`#tab-grn-register`).
- On the verified GRN row, click the green **`Convert`** button.
- The conversion modal opens displaying target GRN number, supplier name, and gross inward value.
- Enter the Purchase Invoice Number, Credit Terms (e.g. 30 days), and applicable GST rate (18%).
- Click **`Generate Purchase Bill`**:
  - Automatically posts the purchase bill to the General Ledger (`invoices` table).
  - Automatically increments warehouse stock in `models.Batch` (`current_stock += accepted_qty`).
  - Automatically posts damaged stock to the Quarantined Breakage ledger (`brk_exp_stock += damaged_qty`).
  - Marks GRN status as `CONVERTED_TO_PURCHASE`.

#### Step 5: Printing Warehouse Inward Slips
- Click the **`Print`** button on any GRN row.
- A clean, professional inward certificate opens with complete gate entry metadata, vehicle numbers, cold-chain temperature readings, line items disposition, and physical signature blocks for Security Gate Officer, QC Inspector, and Warehouse General Manager.

---

## 34. Module 34: Multi-Branch & Inter-Depot Stock Transfer Order (STO), In-Transit Telemetry & Hub Receiving Desk (`/stock-transfer`)

### 34.1 Purpose & Logistics Scope
In multi-location supply chains, moving pharmaceutical inventory across central warehouses, regional distribution centers (RDCs), and retail hospital branches requires rigorous custody controls. Stock transfers cannot simply decrement origin stock and inflate destination stock in a single step; inventory is physically in transit on highways, exposed to temperature variations, transit breakages, and carrier delays.

The **Stock Transfer Order (STO) & In-Transit Radar Desk** (`/stock-transfer`) orchestrates the complete inter-depot lifecycle across 4 integrated functional stages:
1. **Inter-Depot Requisitioning (`[F2]`)**: Branches raise transfer requests based on localized stock-outs or seasonal rebalancing.
2. **Outward Dispatch Gate & Delivery Challan Generation (`[F3]`)**: Origin warehouse picks and packs goods, records vehicle registration, carrier name, tracking docket, and statutory E-Way Bill numbers, and deducts source warehouse stock (`batch.current_stock -= dispatched_qty`).
3. **In-Transit Telemetry Radar (`[F4]`)**: Live monitoring of on-road freight consignments, including temperature status badges, transit duration, and route telemetry.
4. **Hub Receiving & Damage Quarantine (`#modal-acknowledge-inward`)**: Destination receiving bay verifies delivered quantities; intact units enter saleable inventory (`dest_batch.current_stock += received_qty`), while broken units are automatically quarantined (`dest_batch.brk_exp_stock += damaged_qty`) with carrier loss claims generated.

### 34.2 Step-by-Step Operator Instructions

```
[Branch Depletion / Transfer Requisition]
                   │
                   ▼
    [Tab [F2] Create STO Requisition]
   - Select Origin & Destination Hubs
   - Pick Products & Transfer Quantities
   - Auto-allocates Sequential STO-YYYYMM-XXXX
                   │
                   ▼
    [Tab [F3] Outward Dispatch & Challan]
   - Enter Vehicle No, Carrier, Docket, EWB No
   - Deducts Source Warehouse Batch Stock
   - Status updates to IN_TRANSIT
                   │
                   ▼
    [Tab [F4] In-Transit Telemetry Radar]
   - Real-Time On-Road Fleet Telemetry
   - Cold-Chain Temperature Badges (4.2°C OK)
   - Click "Receive at Hub" upon Arrival
                   │
                   ▼
   [Receiving Modal: Damage Quarantine]
   - Tally Physical Received vs Dispatched
   - Intact Units -> Saleable Batch Stock
   - Broken Units -> Quarantined Stock (brk_exp)
   - Status updates to COMPLETED / PARTIAL
                   │
                   ▼
     [Rule 55 Delivery Challan Printing]
   - Formal GST Inter-Branch Transfer Challan
   - Carrier Disclosures & Security Seals
   - 4-Tier Signatures (Dispatch, Driver, Hub, QC)
```

#### Step 1: Raising an Inter-Branch Requisition (`[F2]`)
- Navigate to `/stock-transfer` and press `[F2]` or click Tab **`[F2] Create Requisition Desk`** (`#tab-sto-requisition`).
- Choose **Origin Warehouse** (`#select-source-godown`) and **Destination Warehouse** (`#select-dest-godown`).
- Specify delivery deadline and transfer purpose (e.g. `Emergency Depletion Replenishment`).
- In the item table, choose the product, specify transfer quantity, and click **`+ Add Item`**.
- Click **`Submit Transfer Requisition Order`** (`#btn-create-sto-submit`). The system commits the STO in `DRAFT` status.

#### Step 2: Outward Dispatch & Transit Challan Generation (`[F3]`)
- Switch to Tab **`[F3] Outward Dispatch & Challan`** (`#tab-sto-dispatch`).
- Select the pending STO and click **`Dispatch Order`** (`#btn-start-dispatch-{id}`).
- Enter transport details: Vehicle No (`#input-dispatch-vehicle`), Carrier Name (`#input-dispatch-carrier`), Docket No (`#input-dispatch-docket`), and E-Way Bill No (`#input-dispatch-ewb`).
- Confirm dispatched quantities and click **`Confirm Outward Dispatch & Generate Challan`** (`#btn-confirm-dispatch`).
- Source batch stock is decremented in real-time, and the order transitions to `IN_TRANSIT`.

#### Step 3: Monitoring Active Consignments on In-Transit Radar (`[F4]`)
- Click Tab **`[F4] In-Transit Radar`** (`#tab-sto-transit-radar`).
- View all active on-road shipments with live cold-chain telemetry badges and carrier dockets.
- When the truck arrives at the receiving bay, click **`Receive at Hub`** (`#btn-in-transit-receive-{id}`).

#### Step 4: Hub Inward Verification & Automatic Damage Quarantine
- In the Receiving Modal (`#modal-acknowledge-inward`), enter physical counts:
  - Input `Received Quantity` for intact units.
  - Input `Damaged / Broken Quantity` for broken units.
  - Shortages are automatically computed as `max(0, dispatched_qty - (received_qty + damaged_qty))`.
- Click **`Complete Inward & Update Stock`** (`#btn-submit-inward-ack`).
- Intact inventory increments destination `current_stock`.
- Damaged inventory automatically routes to quarantined `brk_exp_stock`.
- The order status updates to `COMPLETED`.

#### Step 5: Printing Rule 55 Delivery Challan
- Click the **`Print`** button on any STO to open the Delivery Challan modal (`#modal-print-sto-challan`).
- Renders statutory Rule 55 inter-branch challan with sender/consignee GSTINs, transport details, itemized HSN codes, and 4-party authorization signatures.

---

## 35. Comprehensive Automated QA Test Suite Registry (22 Suites)

| # | Test Suite Filename | Module Coverage | Assertions Target & Status |
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
| 17 | `test_gst_einvoice_eway_selenium.py` | Compliance Desk `[F2]`, Transporter Modal `[F7]`, CBIC Part A/B Slips, NIC JSON `[F8]` | 100% PASS: Real-time telemetry, 1-click IRN/E-Way Bill generation, vehicle `DL-01-AB-1234`, CBIC Part A/B delivery slips, and signed digital QR code. |
| 18 | `test_gstr2b_reconciliation_selenium.py` | GST Cockpit `[F5]`, Scorecards, Tolerance $\pm ₹1/5/10$, Dunning Modal, Ingest 2B Modal | 100% PASS: Dual-ledger matching, Telemetry 4 Scorecards (₹25.06L 2B ITC, ₹17.56L Safe ITC, 61.1% match), WhatsApp Dunning, and JSON ingestion. |
| 19 | `verify_live_vercel_client_creation.py` | Live Vercel Auth, Presets, Client Management, Modal Form, Neon DB Write | 100% PASS: Live production cloud authentication, genuine JWT acquisition, client registration (`AMC-F5BA`), and dynamic grid rendering. |
| 20 | `test_procurement_po_replenishment_selenium.py` | Procurement Desk `/po`, Scorecards, Radar `[F2]`, Bulk PO `[F7]`, Builder `[F3]`, WhatsApp Slip, Convert to Inward Bill | 100% PASS: 10/10 Stages PASSED. Telemetry 4 Scorecards, autonomous deficit calculation, line item builder, supplier WhatsApp dispatch modal, and database purchase conversion. |
| 21 | `test_grn_quality_inspection_selenium.py` | GRN Desk `/grn`, Scorecards, Gate Inward `[F2]`, Barcode Desk `[F3]`, Cold-Chain QC `[F4]`, GL Bill Conversion | 100% PASS: 12/12 Stages PASSED. Telemetry 4 Scorecards, shortage calculation, barcode scan stream with audio chirp, cold-chain logger (2°C-8°C), damage quarantine, and GL conversion. |
| 22 | `test_stock_transfer_in_transit_selenium.py` | Stock Transfer Desk `/stock-transfer`, Scorecards, Requisition `[F2]`, Outward Dispatch `[F3]`, In-Transit Radar `[F4]`, Damage Quarantine Inward | 100% PASS: 12/12 Stages PASSED. Telemetry 4 Scorecards, origin-destination requisition, outward transport dispatch with vehicle/carrier/docket/EWB, source stock deduction, in-transit telemetry tracking, hub receiving with intact vs damaged stock quarantine, and Rule 55 printable challan. |

---

*End of User Manual and Workflows.*
