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
*End of User Manual and Workflows.*



