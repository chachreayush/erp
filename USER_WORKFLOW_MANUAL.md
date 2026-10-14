# Enterprise ERP System — Comprehensive User Workflow Manual
*For Cashiers, Billing Operators, Store Managers, and Chief Accountants*

Welcome to the complete operational manual for the Enterprise Pharmaceutical & Distribution ERP. This step-by-step guide walks you through every screen, keyboard shortcut, billing workflow, returns engine, financial statement, and report across the entire software suite.

> **Master Editable Walkthrough Reference**: An exhaustive, publication-grade Microsoft Word document covering the complete software architecture, keyboard operations, data models, APIs, and screens is available in `ERP_ENTERPRISE_SYSTEM_COMPLETE_SOFTWARE_MASTER_WALKTHROUGH.docx`.

---

## 1. Getting Started & System Navigation

### 1.1 Logging In
1. Launch the application in your web browser (`http://localhost:50005` or your Vercel URL) or open the native desktop application.
2. Enter your credentials:
   * **Company / Organization Code**: e.g., `AM-0001` or your provisioned tenant code.
   * **Username**: e.g., `admin` or your assigned operator username.
   * **Password**: `Admin@123`
3. Click **Sign In** or press `Enter`. The application securely stores your authentication session in local storage.

### 1.2 The Two-Screen Operational & Executive Architecture
The ERP implements strict role-based separation between high-speed counter billing and executive business intelligence across two primary screens:

1. **Screen 1: Operational Counter Workbench (Route: /)**:
   Designed for cashiers, billing operators, and store managers.
   * **Live Counter Metrics Strip**: Today's Cash Collected (real-time drawer cash), Today's Credit Billed (credit turnover and invoice count), Active SKU Catalog (master catalog count), and Stockout / Expiry Risk warnings.
   * **Rapid Transaction Command Hub**: 1-click & keyboard hotkey command buttons ([Sales Bill F2], [Purchase Bill F9], [Sales Return], [Purchase Return], [Receipt Voucher F6], [Payment Voucher F5], [Day Book], [Stock Register]).
   * **Urgent Counter Exception Center**: Prioritized operational exception warnings (critical stockouts, credit limit breaches, pending voucher approvals) with 1-click action triggers ([Raise PO ↗], [Review Ledger ↗], [Approve ↗]).
   * **Live Counter Voucher Ticker**: Real-time streaming audit trail showing the latest counter bills, receipts, and returns with timestamps and payment status badges.
   * **Apex Switcher**: Click [Executive BI Dashboard (Route: /dashboard) ↗] to switch directly to the executive intelligence center.

2. **Screen 2: Executive Business Intelligence & Control Centre (Route: /dashboard)**:
   Designed for proprietors, executives, CFOs, and business controllers.
   * **Executive KPI Strip**: Gross Revenue (Sales), Procurement Volume, Gross Operating Margin (%), and Consolidated Liquidity (Quick Ratio).
   * **Visual Comparative Curves**: 7-Month comparative volume analysis graph displaying Monthly Sales Turnover vs Inward Purchases.
   * **Operating Expense (Opex) Donut**: Comprehensive breakdown of freight, storage, travel, asset depreciation, and office overheads.
   * **Compact Regional Sales Map Widget**: Sized symmetrically in Row 2 (~340px height) showing state turnover (Delhi NCR, Punjab & Haryana, UP, Rajasthan).
   * **Click-to-Expand Territory Intelligence Modal (#mapModal)**: Click the compact map to expand into a high-resolution interactive territory modal with deep state drill-downs, chemist network coverage, quota attainment %, and full DOC-30 register links. Strictly 100% focused on sales turnover (zero vehicle/dispatch clutter).
   * **Product & Ageing Distributions**: Top 5 revenue-generating pharmaceutical products progress bars, and statutory receivables outstanding ageing distribution (0-30, 31-60, 61-90, 90+ days).


### 1.3 Personalizing Your Theme
Open **Settings** (`/settings`) from the top navigation bar to select your preferred interface theme:
1. **Neumorphic Minimalist (Default / Recommended)**: Soft off-white surfaces with deep forest green accents (`#1b4332`, `#2d6a4f`). High clarity for full 8-hour retail shifts.
2. **Modern Dark Slate**: Deep blue-black palette (`#0f172a`, `#1e293b`) with neon status badges for night counter shifts.
3. **Marg ERP Classic**: High-density legacy layout styled after classic DOS/Windows wholesale pharma billing software.

---

## 2. Universal Keyboard Master Hotkey Legend

The ERP is **100% keyboard-navigable**. You never need to touch the mouse during daily counter billing:

| Hotkey | Global Function | Module Context |
| :--- | :--- | :--- |
| `Enter` | **Advance / Next Field** | Advances from Date &rarr; Bill No &rarr; Party &rarr; Product &rarr; Batch &rarr; Qty &rarr; Free &rarr; Rate &rarr; Next Row |
| `Esc` | **Exit / Return to Home** | Safely exits the current billing screen and returns to the Home Dashboard (`HomeScreen`) |
| `F2` | **Against Bill Mode** | Toggles "Against Original Invoice" mode in Sales Return and Purchase Return screens |
| `F3` | **Batch Selector / Loose Mode** | Opens the live Batch Selection modal during billing (shows stock, MRP, expiry, rate) |
| `F4` | **Unified Approval Inbox** | Launches the cross-module Approval Inbox (`/workflow/inbox`) for 1-click task actions |
| `F5` | **View Register** | Switches between the Entry screen and the Historical Register list |
| `F7` | **Party / Ledger Search** | Opens the Debtor/Creditor ledger lookup modal with instant search |
| `F8` | **Load Return Bill** | Prompts for original invoice number during counter sales returns |
| `F9` | **Sales Order Picker** | Imports items directly from an approved customer Sales Order |
| `End` | **Instant Save / Settlement** | Jumps directly to the Bill Discount & Final Settlement modal |
| `Ctrl + S` | **Save & Post Voucher** | Instantly commits and saves Debit Notes, Credit Notes, or Vouchers |
| `ArrowUp` / `Down` | **Vertical Grid Navigation** | Navigates vertically across table rows or batch selection lists |
| `ArrowLeft` / `Right`| **Horizontal Cell Navigation**| Navigates between Rate, Discount, and Quantity cells in billing grids |

---

## 3. Module 1: High-Speed Counter Sales Billing (`/sales`)

Counter billing is engineered for ultra-high throughput (< 2–3 seconds per customer bill):

```
[Date] -> [Bill No] -> [Party F7] -> [Product F2] -> [Batch F3] -> [Qty] -> [Rate] -> [End] -> [Enter to Save]
```

### 3.1 Step-by-Step Counter Billing Flow
1. **Header Entry**:
   * **Date**: Defaults to today's date. Press `Enter` to confirm.
   * **Entry No (Bill No)**: Displays your current series (e.g. `INV-0001` or `RJ-INV-1001`). Press `Enter` to keep or type a custom bill number and press `Enter`.
   * **Party Name**: Press `[F7]` or start typing the customer/chemist name. The ledger dropdown filters in real time. Press `Enter` to select. The party's outstanding balance, credit limit, and drug license number display in the top info bar.
2. **Product Line Entry**:
   * The cursor lands automatically on the first product row (`PRODUCT`).
   * Type the drug name (e.g., `Crocin`, `Augmentin`) or product code. Press `Enter`.
   * **Batch Selection (`[F3]`)**: The Batch modal opens displaying active batches with Expiry, Stock, and MRP. Batches with zero quantity are hidden by default. Use `ArrowDown` to highlight the desired batch and press `Enter`.
   * **Quantity**: Type the units to sell (e.g., `10`) and press `Enter`.
   * **Free Quantity**: Enter bonus/scheme units (or press `Enter` to leave as `0`).
   * **Rate**: Auto-fills the default trade rate. Press `Enter` to keep or edit and press `Enter`.
   * **Discount %**: Enter item discount (e.g., `5%`). Press `Enter`.
   * The line total calculates automatically, and the cursor immediately creates and focuses row 2!
3. **Saving & Settlement (`[End]`)**:
   * When finished adding items, press `[End]` (or press `Enter` on an empty product row).
   * The **Discount & Settlement Modal** appears on screen:
     * Enter overall cash discount or percentage.
     * Select Payment Mode: **Cash**, **Credit**, or **UPI/Bank**.
     * View summary: Taxable Amount, CGST, SGST, IGST, Round-off, and Net Payable.
   * Press `Enter` to confirm and save.
   * The bill saves to PostgreSQL, active inventory deducts, double-entry journal vouchers post, and the Bill Number automatically advances to the next sequential number (e.g. `RJ-INV-1002`).

---

## 4. Module 2: Purchase Inward & Vendor Bill Entry (`/purchase`)

The purchase inward module records incoming inventory from pharmaceutical manufacturers and C&F distributors:

### 4.1 Step-by-Step Purchase Inward Flow
1. **Choose Inward Mode**:
   * `DIRECT`: Counter purchase entry for loose or spot invoices.
   * `AGAINST_PO`: Matches against an existing approved Purchase Order (`[PO Picker]`).
2. **Header Details**:
   * **Date**: Date of entry.
   * **Bill No**: Your internal purchase voucher number (defaults to `PB-0001` or your custom series).
   * **Party Name**: Press `[F7]` to select the supplier (e.g., `Sun Pharma Ltd.`, `Cipla`).
   * **Party Inv No**: Type the supplier's actual bill number printed on their paper slip (e.g., `SP/2026/9821`).
   * **Party Inv Date**: Select the date printed on the supplier's bill.
3. **Product & Batch Accrual**:
   * Enter Product Name.
   * **Batch No**: Enter the manufacturer's batch number printed on the carton.
   * **Expiry Date**: Enter in `MM/YY` format (e.g. `12/28`).
   * **Purchase Rate (P.Rate)**: Cost price per unit.
   * **Sale Rate (S.Rate)**: Retail trade price you will charge to chemists.
   * **MRP**: Maximum Retail Price printed on the medicine packaging.
4. **Discrepancy Complaints (DOC-17)**:
   * If any items arrived broken, leaked, or short, tick the `Discrepancy` box on that row. The ERP automatically generates a formal Vendor Complaint entry upon saving.
5. **Finalize**: Press `[End]` to review purchase tax, freight, and net total. Press `Enter` to post. Inventory is added immediately to `current_stock`.

---

## 5. Module 3: Supplier Debit Note / Purchase Return (`/purchase-return`)

When returning medicines to a supplier due to expiry, transit breakage, or excess shipment, issue a Supplier Debit Note:

```
[F2 Against Bill] -> [Pick Inward Bill] -> [Edit Return Units] -> [Route to Godown] -> [Ctrl+S Issue]
```

### 5.1 Dual Workflow Modes
* **Mode 1: `[F2] Against Inward Bill (Recommended)`**:
  1. Select the Supplier name from the dropdown.
  2. Click **`🔍 Select Inward Purchase Bill`**.
  3. A modal displays all past bills from this supplier with dates and grand totals (e.g. `#PB-0001: ₹863.98`).
  4. Click **`Load Items →`**. The exact inward items, batches, and purchase rates populate the return grid.
  5. The system restricts maximum return units so you can never return more than you purchased.
* **Mode 2: `[F3] Direct Loose Return`**:
  * For older batches or unlinked supplier stock, select products directly from the master list.

### 5.2 Stock Disposition Godown Routing
For each returned item, select where the stock is physically being deducted from:
* `🟢 Return from Saleable Stock`: Deducts active retail inventory (`current_stock`).
* `🔴 Return from Breakage Godown`: Deducts from non-saleable breakage stock (`brk_exp_stock`).
* `🟡 Return from Expired Godown`: Deducts from expired quarantine stock (`brk_exp_stock`).

### 5.3 Series Continuation & Saving
1. **Series Customization**: The Debit Note series defaults to `DN-0001`. You can edit this field to your company sequence (e.g., `RJ-DN-0020`).
2. **Keyboard Navigation**: Press `Enter` on `Return Units` &rarr; `Rate` &rarr; `Discount` &rarr; Next Row. Pressing `Enter` on the last row automatically focuses the **Issue Debit Note** button.
3. **Issue Debit Note**: Click **Issue Debit Note** or press `Ctrl + S`.
4. **Results**:
   * Green success confirmation banner displays.
   * Debit Note number auto-increments to **`RJ-DN-0021`**.
   * Supplier ledger is debited (reducing what you owe them), and Purchase Return account is credited.

---

## 6. Module 4: Customer Credit Note / Sales Return (`/sales-return`)

When a customer or chemist returns medicine to your store:

### 6.1 Step-by-Step Credit Note Flow
1. **Select Mode**:
   * Press `[F2]` for **Against Original Invoice** (Recommended).
   * Press `[F3]` for **Direct Counter Return**.
2. **Customer Selection**:
   * Select the Chemist / Debtor customer from the dropdown.
3. **Load Original Bill (`[F2]`)**:
   * Click **`🔍 Select Original Sales Bill`**.
   * Pick the customer's previous sales invoice (e.g. `#INV-2026-0001`).
   * The grid loads billed items with their original sold price and discount.
4. **Adjust Return Quantities**:
   * Type the returned units in the **Return Qty** column.
   * Press `Enter` to navigate across rows. Use `ArrowUp`/`ArrowDown` to shift between items.
   * Choose **Stock Disposition**:
     * `🟢 Saleable`: Medicine is intact; restores item to active counter stock.
     * `🔴 Breakage Godown`: Medicine is damaged; moves item to quarantined breakage inventory.
     * `🟡 Expired Godown`: Medicine expired; moves item to expired quarantine.
5. **Series Continuation**:
   * Edit the Credit Note number if desired (e.g. `RJ-CN-8281`).
6. **Save Credit Note (`Ctrl + S`)**:
   * Press `Ctrl + S` or click **Save Credit Note**.
   * Success banner confirms posting.
   * Next Credit Note auto-advances to **`RJ-CN-8282`**.
   * The customer's balance is credited (reducing their debt to you), and Sales Return account is debited.

---

## 7. Module 5: Breakage & Expiry Godowns (`/brk-receive`, `/brk-issue`)

Pharmaceutical regulations strictly prohibit keeping damaged or expired medicines in active saleable bins:

### 7.1 Breakage Receive (`/brk-receive`)
* **When to Use**: When a retail chemist returns damaged, leaked, or expired strips to your store.
* **Effect**: Accrues inventory directly into the quarantined `brk_exp_stock` table. Items in this table are completely invisible to regular sales billing and cannot be accidentally re-sold.

### 7.2 Breakage Issue (`/brk-issue`)
* **When to Use**: When you pack up accumulated damaged goods from your quarantine godown and return them to the pharmaceutical manufacturer for credit notes or replacements.
* **Effect**: Deducts inventory from `brk_exp_stock` and issues a formal Breakage Issue voucher (`BI-0001`).

---

## 8. Module 6: Financial Accounting & Audit Statements (`/finance`)

The finance module provides complete statutory and management accounting:

```
+-----------------------------------------------------------------------------------+
|                            FINANCIAL ACCOUNTING SUITE                             |
+------------------------------------+----------------------------------------------+
| 1. Daily Vouchers & Registers      | Payment, Receipt, Journal, Contra, Day Book  |
| 2. Period Close & Financials       | Trial Balance, Profit & Loss, Balance Sheet  |
| 3. Ledger & Reconciliation         | Ledger Statements, Bank Statement Matching   |
+------------------------------------+----------------------------------------------+
```

### 8.1 Chronological Day Book (`/finance/daybook`)
* Displays all financial transactions recorded on a given date in chronological order.
* Filters by voucher type: Sales, Purchase, Receipts, Payments, Journals.
* Shows debit/credit totals and running daily balance.

### 8.2 Ledger Statement (`/finance/ledger-statement`)
* Search any customer, vendor, bank, or expense ledger.
* Displays opening balance, individual transaction lines with invoice references, Dr/Cr columns, and closing balance.
* Includes **Print** and **Export to CSV** actions.

### 8.3 Trial Balance (`/finance/trial-balance`)
* Real-time verification that total debits equal total credits across all asset, liability, income, and expense heads.

### 8.4 Profit & Loss Statement (`/finance/profit-loss`)
* Calculates Trading Account: Sales, Cost of Goods Sold (COGS), Opening Stock, Purchases, Closing Stock & Gross Profit.
* Calculates Indirect Expenses, Depreciation, and Net Operating Profit.

### 8.5 Balance Sheet (`/finance/balance-sheet`)
* Categorizes Capital Account, Current Liabilities, Sundry Creditors against Fixed Assets, Current Assets, Sundry Debtors, and Bank Balances.

### 8.6 Bank Reconciliation (`/finance/bank-reconciliation`)
1. Upload your physical bank statement CSV (HDFC, SBI, ICICI).
2. The dual-pane matching screen displays un-cleared ERP vouchers on the left and un-reconciled bank statement lines on the right.
3. Match matching rows to mark them as `Cleared` and verify uncleared cheques.

---

## 9. Module 7: Management Reporting & Analytics (`/reports`)

### 9.1 Company-Wise Sales Register
* Aggregates billing records across all 25+ pharmaceutical companies (e.g. *Cipla*, *Sun Pharma*, *Lupin Limited*, *Mankind*, *Alkem Laboratories*).
* Displays: Manufacturer Code, Manufacturer Name, Invoices Count, Total Units Sold, and Turnover in `₹`.
* **Multi-Company Filter Modal**: Click `[Filter Companies]` to open a popup with instant search, `Select All`, `Clear All`, and individual checkboxes to filter report views.
* **Inline Product Drill-Down**: Click `[▶ View Products]` on any company row to expand an inline drawer showing individual drug sales, batch details, and rates.

### 9.2 Custom Report Designer (`/reports/designer`)
* Design custom management reports without writing code:
  1. Select **Subject**: Sales Invoices, Purchase Inward, General Ledger, or Inventory.
  2. Select **Grouping Dimension**: Group by Company, by Party, by Product, or Bill-by-Bill.
  3. Apply Filters: Minimum amount threshold, date presets (Today, This Week, This Month, FY 2026-27).
  4. Click **Run Report**: Queries live database records and renders in a clean analytical grid.
  5. Save as a reusable template for one-click future execution.

---

## 10. Frequently Asked Questions & Troubleshooting

### Q: Why did my bill series not reset to 1 when I opened a new bill?
> **A**: The ERP uses Marg/Tally series continuation. If your last bill was `RJ-INV-1025`, the system automatically defaults to `RJ-INV-1026`. If you wish to begin a new series, simply type your new series into the Entry No field (e.g. `2027-INV-0001`), and the ERP will continue from that number onwards.

### Q: Can I sell medicine if physical stock is temporarily negative?
> **A**: Yes. The ERP features backorder tolerance so counter billing is never blocked during busy retail hours. You can complete the sale immediately and enter the purchase invoice when the supplier delivery arrives.

### Q: What is the difference between Sales Return and Breakage Receive?
> **A**: Use **Sales Return (`/sales-return`)** for customer returns where you are issuing an official Credit Note against a financial account. Use **Breakage Receive (`/brk-receive`)** when you are physically receiving damaged goods directly into your non-saleable quarantine godown.

### Q: How do I exit any screen in an emergency?
> **A**: Simply press the `[Esc]` key on your keyboard. The system checks for unsaved changes and safely navigates you back to the Home Dashboard.

---

## 11. Master 6-Module Keyboard Operation Quick Reference & Shortcuts Matrix

For maximum speed, operators can execute all primary billing and voucher workflows exclusively from the keyboard without touching the mouse:

| Module Name | Shortcut Route | Header & Series Hotkeys | Party / Ledger Selection | Product Search & Grid | Save Confirmation |
|---|---|---|---|---|---|
| **Sales Bill** | `/sales?type=bill` | Type entry no &rarr; `Enter` | `F7` or click party &rarr; Enter | `F7` / `Enter` on product &rarr; Enter batch & qty | `Ctrl+S` &rarr; Enter on `Yes, Save Bill` |
| **Purchase Bill** | `/purchase?type=bill` | Type entry no &rarr; `Enter` | `F7` or `Enter` &rarr; picks vendor | `F7` / `Enter` &rarr; picks product &rarr; batch, qty, prate | `SAVE (End / Ctrl+S)` &rarr; Enter on `Yes, Save` |
| **Supplier Debit Note** | `/purchase-return` | Type DN number | Type supplier &rarr; `Enter` | `[F2]` pick inward bill or `[F3]` loose return &rarr; qty | `Issue Debit Note` button |
| **Customer Credit Note** | `/sales-return` | Type CN number | Select debtor &rarr; `Enter` | `[F2]` pick sales bill or `[F3]` loose return &rarr; qty | `Issue Credit Note` button |
| **Breakage Issue** | `/brk-issue?type=bill` | Type entry no &rarr; `Enter` | `Enter` opens vendor modal | `Enter` on product &rarr; enters damaged batch/qty | `SAVE (End / Ctrl+S)` &rarr; Enter on `Yes, Save` |
| **Breakage Receive** | `/brk-receive?type=bill` | Type entry no &rarr; `Enter` | `Enter` opens debtor modal | `Enter` on product &rarr; enters damaged batch/qty | `SAVE (End / Ctrl+S)` &rarr; Enter on `Yes, Save` |

### Series Continuation Behavior:
* In any module, operators may override the default numbering by typing any alphanumeric code (e.g., `RJ-INV-1001` or `KA-PB-500`).
* When saving, the ERP detects the numerical tail and automatically projects the next bill to `RJ-INV-1002` or `KA-PB-501`.
* The state is stored in `localStorage` and synchronized with the backend database so multiple consecutive bills continue seamlessly.

---

## 12. Executive Reports & Financial Statements Operations Guide

Operators and accountants can access and verify company financial performance through the following dedicated modules:

### 12.1 Company-Wise Sales Intelligence (`/reports`)
* **Overview**: Aggregates sales figures across all 25+ manufacturers/principals (Cipla, Sun Pharma, Abbott, Mankind, etc.) with real-time turnover in Rupees (`₹`), total units sold, and bill counts.
* **Batch Filtering**: Click `Filter Companies` to trigger the multi-company modal. Use `Select All`, `Clear All`, or instant type search to isolate individual pharmaceutical brands.
* **Inline Product Drill-Down**: Click `[▶ View Products]` on any manufacturer row to expand individual drug transactions, batches, expiry dates, and net billing values without leaving the register.
* **Exports**: One-click export to CSV, Microsoft Excel, and PDF for executive meetings.

### 12.2 Practical Report Designer (`/reports/designer`)
* **Dynamic Semantic Builder**: Choose data subjects (`Sales`, `General Ledger`, `Inventory`) and grouping dimensions (`Company`, `Customer / Party`, `Product SKU`, or `Bill-by-Bill`).
* **Thresholds & Presets**: Filter by minimum bill amounts (e.g. `> ₹50,000`), party search keywords, or financial date presets (`TODAY`, `MTD`, `YTD`, `FY 2026-27`).
* **Reusable Templates**: Save custom analytical views with custom names (e.g. `"Executive Monthly Sales Template"`) to execute recurring reports with a single click.

### 12.3 Complete Double-Entry Financial Suite (`/finance`)
* **Day Book (`/finance/daybook`)**: Chronological audit trail of all transactions occurring within selected dates. Displays multi-leg postings with debited and credited account names and running daily totals.
* **Ledger Statement (`/finance/ledger-statement`)**: Select any of the 69 active business partner or expense accounts from the dropdown. Renders opening balance, voucher debit/credit legs, particulars, and real-time running closing balance.
* **Trial Balance (`/finance/trial-balance`)**: Authoritative double-entry trial balance across 62 active ledgers. Calculates total debits and credits, balances the ledger books, and highlights any zero-delta discrepancies.
* **Profit & Loss Statement (`/finance/profit-loss`)**: Displays Income vs Expense accounts categorized into Direct/Indirect accounts with subtotals and highlighted Net Profit/Loss banners.
* **Balance Sheet (`/finance/balance-sheet`)**: Authoritative financial health statement balancing Capital & Liabilities against Assets.
* **Bank Reconciliation (`/finance/bank-reconciliation`)**: Reconciles uploaded bank statements against ERP journal entries with split-screen unallocated transaction matching.

---

## 13. Statutory GST Compliance & Tax Filing Workbench (`/gst`)

The Statutory GST Compliance module provides an automated, portal-ready filing dashboard for monthly and quarterly GST returns in compliance with Indian GST regulations.

### 13.1 Navigating & Setting Return Periods
1. Access the workbench via `/gst` or click **GST Compliance** from the main navigation sidebar.
2. The header ribbon automatically displays your organization GSTIN (e.g. `07AAAAA0000A1Z5`) and active fiscal year.
3. Use the quick period filter presets:
   * `FY 2026-27`: Full financial year consolidation.
   * `MTD`: Month-to-date current tax period.
   * `Q1` / `Q2`: Quarterly return periods.
   * Custom date inputs for specific audit or return periods.
4. Click **Fetch Returns** to instantly query all outward and inward transactions across the organization.

### 13.2 Reading Executive Statutory Metrics
The top KPI ribbon provides an immediate executive summary:
* **Card 1 (Outward Supplies)**: Displays gross taxable sales turnover (`₹1,52,519.34`), total tax liability (`₹17,318.00`), and CGST/SGST/IGST breakdown.
* **Card 2 (Inward Supplies & ITC)**: Displays total inward purchase turnover (`₹1,81,76,245.90`), gross input credit (`₹29,04,051.62`), debit note reversals (`-₹95.20`), and net eligible ITC (`₹29,03,956.42`).
* **Card 3 (Net Cash Payable)**: Computes statutory liability after automatic ITC set-off (`₹0.00` cash payable), and displays accumulated ITC carried forward to next tax period (`₹28,86,638.42`).
* **Card 4 (Document Statistics)**: Tracks total outward invoices/notes (`49`) and inward purchase receipts (`105`).

### 13.3 Filing GSTR-1: Outward Supplies Register
Click the **GSTR-1** tab to access the multi-table outward supplies registers:
* **Table 4 (B2B Invoices)**: Displays invoices issued to GST-registered chemists and distributors with customer GSTIN, POS state code, reverse charge flag, invoice value, and tax rates.
* **Table 7 (B2CS Retail Sales)**: Summarizes retail counter sales to unregistered customers aggregated state-wise and rate-wise.
* **Table 9B (CDNR Credit Notes)**: Lists credit notes issued for customer sales returns, showing differential amounts and tax reductions.
* **Table 12 (HSN Summary)**: Aggregates outward supplies by 4/6/8-digit pharmaceutical HSN codes with total unit quantities, UQC codes, and tax splits.
* **Table 13 (Documents Issued)**: Audits voucher numbering sequences, tracking series start number, end number, total issued, and cancelled counts.

### 13.4 Reconciling GSTR-2: Inward Supplies & Input Tax Credit
Click the **GSTR-2** tab to audit inward purchases:
* Review all inward bills received from pharmaceutical manufacturers and suppliers with vendor GSTINs, supplier bill numbers, and eligible ITC.
* Inspect the emerald **ITC Reconciliation Banner** confirming automatic deduction of Debit Note ITC reversals from gross purchase credit.

### 13.5 Reviewing GSTR-3B: Monthly Consolidated Return
Click the **GSTR-3B** tab to review consolidated return tables:
* **Table 3.1**: Outward taxable supplies and inward supplies liable to reverse charge.
* **Table 4**: Eligible Input Tax Credit categorized by supply type.
* **Table 5.1 & Payment of Tax**: Net tax payable breakdown, automatic ITC set-off, and net cash liability.

### 13.6 Generating Official GSTN Portal Offline JSON
1. Click the green **Download GST Portal JSON** button in the top action header.
2. The system generates an official Government GSTN Offline Utility JSON export (`GSTR1_MMYYYY.json`) conforming to schema `GSTR1_Offline_Utility_v1.5`.
3. An emerald confirmation banner confirms: `"GSTN Official JSON export ready for upload to gst.gov.in"`.
4. Upload this downloaded JSON directly into the official GST Portal offline utility tool or upload section on `https://www.gst.gov.in`.

### 13.7 Exporting for Internal Audit
* Use the **Export CSV**, **Export Excel**, or **Print PDF** buttons on any tab to produce compliance reports for external chartered accountants and tax auditors.
---

## 14. Counter Payment, Receipt & Bill-by-Bill Settlement Engine (DOC-24 & DOC-07)

### 14.1 Recording Customer Counter Receipts (`[F6]` / `/receipt`)
1. Navigate to `/receipt` or press `[F6]` anywhere within the financial cockpit.
2. The Voucher Number automatically populates with the next sequential code (e.g. `RCP-0001` -> `RCP-0002`). You can also manually adjust the series if needed.
3. Select the Chemist Debtor by pressing `[F7]` or clicking **Select Customer...**. Search by customer legal name, trade name, or GSTIN, and press `[Enter]` to confirm.
4. Select the receiving account from the **Deposit / Payment Ledger Account** dropdown (e.g., `Cash in Hand` or `HDFC Bank Current A/c`).
5. Choose payment instrument mode: `Cash`, `Cheque`, `NEFT/RTGS`, or `UPI`. For non-cash modes, enter the Cheque/UTR reference number and bank name.
6. Enter the **Transaction Amount (₹)**.
7. **Bill Allocation**:
   - Click **Auto-Allocate FIFO [Alt+A]** to chronologically apply the received funds against the oldest outstanding bills.
   - Alternatively, type exact settlement amounts directly in the **Allocate (₹)** column for specific bills or click **[Full]** to settle an entire invoice.
   - Any remainder not allocated to specific bills is automatically calculated and preserved as a **Floating On-Account Advance**.
8. Click **Post & Save Receipt (Ctrl+S)**.
9. A confirmation modal displays the voucher summary and allocations. Press `[Enter]` or click **Yes, Confirm Post** to write the balanced double entries to the General Ledger.

### 14.2 Recording Supplier Outward Payments (`[F5]` / `/payment`)
1. Navigate to `/payment` or press `[F5]` from the header.
2. Select the Payee Supplier / Creditor (`[F7]`). The system immediately loads open purchase bills and vendor debit notes.
3. Select the disbursement bank or cash account and payment mode.
4. Enter the disbursement amount and click **Auto-Allocate FIFO [Alt+A]** or allocate manually.
5. Click **Post & Save Payment (Ctrl+S)** and confirm. The system debits the Supplier ledger and credits Cash/Bank.

### 14.3 Using the Outstanding & Ageing Workbench (`/finance/outstanding`)
1. Navigate to `/finance/outstanding` from the sidebar or by clicking **Outstanding Ageing** on the receipt voucher.
2. **Debtor Receivables vs. Creditor Payables**:
   - Toggle between **Debtor Receivables (Chemists)** and **Creditor Payables (Suppliers)** via the top tab buttons.
3. **Statutory Ageing Buckets**:
   - Review top KPI cards showing total outstanding, `0–30 Days (Current)`, `31–60 Days`, `61–90 Days`, and `90+ Days Overdue`.
4. **Expandable Bill Drawers**:
   - Click anywhere on a party's row to slide open the underlying open invoices table.
   - Inspect individual Bill Numbers, Invoicing Dates, Gross Values, Settled Amounts, Net Due, Overdue Days, and Ageing Brackets.
5. **One-Click Counter Settlement**:
   - Click **[Receive ↗]** or **[Pay ↗]** on any party row to open the counter voucher cockpit pre-filled for that account.
6. **Export Ageing Statements**:
   - Click **Export CSV** to download a spreadsheet of the entire ageing ledger.

---

## 15. Journal Voucher, Accounting Adjustment & Accrual Engine (DOC-25)

### 15.1 Keyboard-First Multi-Leg Journal Entry (/journal and /finance/journal)
1. Navigate to /journal or /finance/journal from the navigation sidebar.
2. The Voucher Number automatically populates with the next sequential code (e.g. JV-0001 -> JV-0002).
3. Select the posting date (defaults to today) and choose a **Classification**:
   - Standard Manual Journal: General debit/credit adjustments across accounts.
   - Accrual Journal: Unbilled revenue/expense recognition with scheduled reversal date.
   - Provision: Bad debt estimates, tax provisions, statutory audit fees.
   - Prepaid / Deferred Adjustment: Monthly amortization of prepaid expenses (insurance, software licenses).
   - Reclassification / Transfer: Moving balances between ledgers without impacting net profit.
   - Opening Balance Adjustment: Auditor opening balance corrections.
4. If applicable, enter a **Ref / Source Doc #** (e.g. INV-2026-881 or AGREEMENT-2026) and an overall audit note.
5. **Accrual Reversal Scheduler**:
   - When Accrual Journal is selected, the **Auto-Reversal** checkbox is automatically enabled.
   - The system automatically suggests the 1st of the next month as the reversal date. You can also manually toggle this on for any journal.
6. **Multi-Leg Allocation Grid**:
   - For Leg 1: Toggle Dr, select the ledger account from the dropdown, and enter the debit amount (e.g. Rent Expense: ₹10,000.00).
   - Click **Add Dr Line** or press [Alt+A] to add additional debit legs (e.g. Electricity Expense: ₹2,500.00).
   - Use [Ctrl+D] on any row to duplicate it.
7. **Instant Auto-Balance [Ctrl+B]**:
   - To balance the transaction without mental arithmetic, press [Ctrl+B] or click **Auto-Balance [Ctrl+B]**.
   - The engine computes the difference between total debits and credits and instantly sets or spawns the balancing leg (e.g. Cash in Hand: Cr ₹12,500.00).
   - The status badge transitions from red OUT OF BALANCE to glowing emerald BALANCED.
8. Click **Post Journal Voucher** or press [Alt+S]/[Ctrl+S].
9. The Pre-Posting Confirmation Modal summarizes the complete debit/credit breakdown. Click **Confirm & Post Voucher** to write the ACID transaction to PostgreSQL.
10. The voucher sequence automatically advances (JV-0001 -> JV-0002) and the form resets cleanly for the next entry.

### 15.2 Journal Register & Traceable One-Click Reversals (/finance/journal-register)
1. Navigate to /finance/journal-register from the sidebar or click **Journal Register** on the cockpit.
2. **Audit Metrics**: Review top KPI cards showing Total Journals, Total Volume (₹), Active Accruals, and Reversals Posted.
3. **Filtering & Search**: Filter by Classification, Status (Active vs. Reversed), date ranges, or search keywords.
4. **Inspecting Entry Legs**: Click anywhere on a voucher row to expand the drawer showing all underlying debit and credit legs.
5. **Traceable One-Click Reversal**:
   - Click the **[Reverse ↩]** button next to any active journal voucher.
   - A modal appears showing the original voucher volume and explains that an inverted double-entry voucher will be posted.
   - Enter the reversal posting date and reason note.
   - Click **Confirm Reversal & Post**.
   - The engine automatically posts an inverted voucher to the General Ledger (Dr becomes Cr, Cr becomes Dr), updates running account balances, transitions the original voucher to Reversed, and links the two vouchers for permanent audit traceability.

---

## 16. Expense, Petty Cash & Employee Reimbursement Engine (DOC-26)

### 16.1 Operating the Expense Cockpit (`/finance/expenses`)
1. Navigate to `/finance/expenses` from the Finance hub or navigation sidebar.
2. Review the 4 analytical KPI cards:
   - **Approved Expenses**: Cumulative total of verified claims committed to the GL.
   - **Pending Approvals**: Tally of employee claims awaiting managerial approval.
   - **Active Advances**: Total un-settled cash/tour advances in circulation.
   - **Settled Advances**: Total count of fully reconciled advances.
3. Toggle between the three functional tabs:
   - **Expense Claims & Approvals**: View, search, and approve itemized reimbursement claims.
   - **Employee Advances & Imprest**: Issue and track employee tour and petty cash imprest funds.
   - **Expense Categories**: View operational expense classifications and mapped GL ledgers.

### 16.2 Issuing an Employee Advance / Tour Imprest
1. In the header or on the Advances tab, click **[+ Issue Advance]**.
2. Select the **Employee Account** from master ledgers.
3. Enter the **Advance Amount (₹)** (e.g. ₹5,000.00). Ensure cash disbursements comply with statutory limits (under ₹10,000 as per Income Tax Act Sec 40A(3)).
4. Specify the **Issue Date** and audit **Reason / Purpose** (e.g. *Client Field Tour & Incidentals Advance*).
5. Click **Issue Advance**. The advance record immediately appears in the advances registry with status `Active`.

### 16.3 Recording a Multi-Line Expense Claim
1. Click **[+ New Expense Claim]** to open the entry modal.
2. Select the **Claimant / Employee Ledger**.
3. **Advance Settlement Linkage**: If the employee has active advances, select the relevant advance from the *Link Active Advance (Settlement)* dropdown. The claim will be used to reconcile that advance.
4. Enter the **Claim Date**, **Claim No #**, and overall **Audit Notes**.
5. Fill in the itemized line items:
   - Select **Expense Category** (e.g. *Travel & Commute*, *Freight & Cartage*, *Meals & Entertainment*).
   - Enter **Bill / Receipt #** and **Bill Date**.
   - Enter the line **Amount (₹)**.
   - Enter line details/purpose in the **Line Note** field.
6. Click **[+ Add Line]** to add subsequent expenditure lines. Use the trash icon to remove unnecessary lines.
7. Observe the **Total Claim Amount (₹)** recalculating dynamically in real-time.
8. Click **Submit Claim**. The claim is created in `Draft` status.

### 16.4 One-Click Claim Approval & General Ledger Commitment
1. On the *Expense Claims & Approvals* tab, locate the draft claim.
2. Click anywhere on the row to expand the drawer and inspect all underlying receipt line items.
3. Click the **[Approve]** button on the claim row.
4. The system executes the atomic posting transaction:
   - Posts a balanced Journal Voucher to the General Ledger:
     - **Credit**: Employee Account (Total Claim Amount)
     - **Debit**: Each expense category ledger (Itemized bill amounts)
   - If an advance was linked, the advance status automatically transitions from `Active` to `Settled` with voucher ID linkage.
   - Claim status transitions to `Approved`, and the action displays `GL Committed`.
   - Top KPI cards update immediately to reflect the approved expenditure and settled advance.

### 16.5 Single-Click Direct Operational Expense Entry & Live P&L Reflection
For high-frequency petty cash expenditures (such as daily tea & coffee, snacks for visitors, courier receipts, auto fares, office stationery, and cleaning supplies), you do not need to create multi-step tour claims. You can record direct cash/bank outflows immediately from the main screen:

1. **Open the Quick Entry Tab**: On `/finance/expenses`, click the first tab **⚡ Quick Daily Expense Entry (Cash/Bank)**.
2. **Select Settlement Account (`Paid From`)**: Choose either **Cash in Hand** or your corporate bank account (e.g. HDFC/SBI). This ledger will be credited.
3. **Select Expense Head (`P&L Ledger Account`)**: Choose the appropriate statutory indirect expense account:
   - *Tea, Coffee & Refreshments Exp A/c*
   - *Travelling & Conveyance Exp A/c*
   - *Freight & Cartage Inward Exp A/c*
   - *Printing & Stationery Exp A/c*
   - *Courier & Postage Exp A/c*
   - *Staff Welfare & Entertainment Exp A/c*
   - *Office Cleaning & Sanitation Exp A/c*
4. **Enter Amount & Payee**: Input the disbursement amount (₹), payee name (e.g. *Ramesh Chaiwala* or *DTDC Courier*), and audit narration.
5. **Inspect Live Accounting Impact Box**: Before posting, observe the dynamic preview box showing:
   - `Dr: [Selected Head] (Indirect Expenses - P&L)`
   - `Cr: [Settlement A/c] (Asset Account - Cash/Bank)`
   - `📉 Decreases Net Profit by: ₹[Amount]`
6. **Submit**: Click **⚡ Record Expense & Post to GL & P&L**.
7. **Immediate Verification**:
   - The expense appears instantly in the *Recent Operational Expenditures Register* below.
   - Click **[P&L ↗]** to open the Profit & Loss Statement where the expense appears under **INDIRECT EXPENSES**, reducing Net Profit.
   - Click **[DayBook ↗]** to open the Day Book where the Payment Voucher (`PAY/2026-27/xxxx`) is permanently recorded.

---

## 17. Fixed Assets & Depreciation Engine (DOC-27)

### 17.1 Navigating the Fixed Assets Cockpit (`/finance/assets`)
1. Access the Fixed Assets Cockpit by navigating to `/finance/assets` from the Finance hub or top navigation.
2. Review the 4 high-level executive KPI cards:
   - **Total Gross Block (₹)**: Total historical purchase/capitalization cost of all recorded enterprise fixed assets.
   - **Accumulated Depreciation (₹)**: Total cumulative depreciation written off against asset values across all historical periods.
   - **Net Book Value (₹)**: Current net carrying value on the company's Balance Sheet ($\text{Gross Block} - \text{Accumulated Depreciation}$).
   - **Active Asset Count**: Total quantity of operational, non-disposed fixed assets.
3. Review the **Master Fixed Assets Register** table displaying Asset Code, Asset Name, Statutory Category, Purchase Date, Purchase Cost, Current Book Value, Depreciation Method, and Action buttons.

### 17.2 Registering a New Fixed Asset
1. On `/finance/assets`, click the **[+ Register Fixed Asset]** button.
2. Fill out the asset registration form:
   - **Asset Code**: Auto-generated sequence (e.g., `AST-2026-0001`) or customized alphanumeric tag.
   - **Asset Name**: Comprehensive asset description (e.g., *Air Conditioned Cold Storage Chiller Unit 5HP* or *Billing Terminal PC Workstation 01*).
   - **Asset Category**: Select statutory class (e.g., *Plant & Machinery*, *Computer Equipment*, *Furniture & Fixtures*, *Office Equipment*, *Vehicles*).
   - **Capitalization / Purchase Date**: Date the asset was placed into commercial service.
   - **Purchase Cost / Gross Block (₹)**: Invoice cost inclusive of non-refundable taxes, freight, and installation charges (e.g. ₹2,00,000.00).
   - **Residual / Salvage Value (₹)**: Expected scrap value at the end of useful life (defaults to statutory 5% under Companies Act 2013, e.g. ₹10,000.00).
   - **Depreciation Method**: Choose **Straight Line Method (SLM)** or **Written Down Value (WDV)**.
   - **Useful Life (Years)**: Enter statutory operational lifespan (e.g. 3 years for computers, 10 years for furniture, 15 years for plant & machinery).
   - **Asset Location / Godown**: Physical location (e.g. *Main Wholesale Godown*, *Retail Counter 1*, *Admin Office*).
3. Click **Save Asset**. The asset is immediately registered, active, and available for depreciation scheduling.

### 17.3 Managing Statutory Asset Categories (`/finance/asset-categories`)
1. Navigate to `/finance/asset-categories` to review or add statutory category blocks.
2. Configure default parameters per category:
   - Statutory Group Name (Companies Act 2013 Schedule II / Income Tax Act 1961).
   - Default Depreciation Method (SLM vs WDV).
   - Default Useful Life (Years) and Depreciation Rate (%).
   - Linked GL Fixed Asset Account (`Fixed Assets` Balance Sheet group).
   - Linked GL Depreciation Expense Account (`Indirect Expenses` P&L group).
   - Linked GL Accumulated Depreciation Account (`Fixed Assets Contra` group).

### 17.4 Running Single Asset & Bulk Period Depreciation Runs
1. **Single Asset Depreciation**:
   - Locate the target asset on `/finance/assets`.
   - Click the **[Run Depreciation]** button on the asset row.
   - The system calculates the period depreciation based on capitalization date, useful life, and selected method:
     $$\text{SLM Annual} = \frac{\text{Purchase Cost} - \text{Salvage Value}}{\text{Useful Life}}$$
     $$\text{WDV Periodic} = \text{Current Net Book Value} \times \text{Depreciation Rate}$$
   - Confirm the calculation dialog.
2. **Bulk Financial Period Depreciation Run**:
   - In the apex action bar, click **[⚡ Bulk Depreciation Run]**.
   - Select the target fiscal period (e.g. *Current Month-End* or *FY 2026-27 Year-End*).
   - The engine iterates through all active fixed assets, prorates depreciation based on days in service, and posts individual double-entry journal vouchers atomically.

### 17.5 Verifying GL Impact & Financial Statement Reflection
1. **Journal Voucher Posting**:
   - Each depreciation run generates an atomic double-entry Journal Voucher (`JRN/2026-27/xxxx`):
     - **Debit**: *Depreciation Expense A/c* (P&L &rarr; Indirect Expenses)
     - **Credit**: *Accumulated Depreciation A/c* (Balance Sheet &rarr; Fixed Asset Contra)
2. **Profit & Loss Statement Reflection**:
   - Open `/finance/profit-loss`.
   - Under **INDIRECT EXPENSES**, observe the *Depreciation Expense* head reflecting the exact debited amount, reducing Net Profit.
3. **Balance Sheet Reflection**:
   - Open `/finance/balance-sheet`.
   - Under **FIXED ASSETS**, inspect the Gross Block less Accumulated Depreciation, yielding the updated Net Carrying Value.

---

## 18. Bank Reconciliation & Physical Cash Control Engine (DOC-28)

### 18.1 Navigating the Bank Reconciliation Workbench (`/finance/bank-reconciliation`)
1. Navigate to `/finance/bank-reconciliation` from the Finance hub or navigation menu.
2. The cockpit is divided into an executive BRS summary header, a dual-pane reconciliation workbench, and a cash drawer physical verification counter.

### 18.2 Reading Real-Time BRS Metrics
The top KPI strip provides real-time financial reconciliation metrics:
- **Statement Closing Balance (₹)**: The ending balance reported on your bank statement as of the reconciliation date.
- **Book Balance (ERP) (₹)**: Current live closing balance in the General Ledger for the selected bank account.
- **Unreconciled Variance (₹)**: Calculated difference ($\text{Statement Balance} - \text{Book Balance} \pm \text{Unpresented/Uncleared Items}$). When fully reconciled, this value reaches **₹0.00**.
- **Pending Clearance Count**: Total number of issued cheques not yet presented, and deposits in transit.

### 18.3 Step-by-Step Bank Reconciliation Workflow
1. **Select Bank Account**: In the top toolbar, select the relevant corporate bank ledger (e.g. *HDFC Bank Current A/c* or *State Bank of India A/c*).
2. **Input Statement Balance & Date**: Enter the Statement Closing Date and Statement Closing Balance from your official bank statement.
3. **Left Pane (ERP Transactions)**:
   - Displays all Payment and Receipt vouchers posted in the ERP against the selected bank account that have not been marked cleared.
   - Shows Voucher Number, Posting Date, Party / Narration, Cheque / Ref Number, Debit (Deposit) or Credit (Withdrawal) amount, and Reconciliation Checkbox.
4. **Right Pane (Bank Statement Feed / Upload)**:
   - Click **[Upload Statement CSV]** to import your bank's downloaded statement file (columns: Date, Description, Reference No, Debit, Credit, Balance).
   - The imported lines render in the right pane alongside ERP transactions.
5. **Manual Matching**:
   - Click the checkbox next to any ERP voucher that matches a corresponding bank statement entry.
   - The clearance date populates with the statement date, and the Unreconciled Variance adjusts immediately.

### 18.4 Automated Multi-Rule Auto-Matching Engine
1. Click the **[⚡ Auto-Match Rules]** button in the workbench toolbar.
2. The Auto-Match Modal opens with configurable tolerance criteria:
   - **Reference / Cheque Number Matching**: Matches transactions with identical cheque/UTR/reference strings.
   - **Exact Amount Matching**: Matches debits to credits with identical currency amounts.
   - **Date Proximity Tolerance**: Configurable window (defaults to $\pm 3$ days) to account for bank clearing delays.
3. Click **Execute Auto-Match**:
   - The system automatically pairs and clears matching records across both panes.
   - Displays a confirmation summary: *e.g., "Successfully auto-matched and cleared 24 bank transactions"*.
   - Unmatched transactions remain highlighted for manual auditor review.

### 18.5 Physical Cash Denomination Tally (Daily Drawer Count)
Cash handling requires strict physical control to prevent shrinkage and leakage. The embedded Cash Verification module provides an end-of-day cash drawer tally:

1. Scroll to the **Physical Cash Denomination Counter** section or click the **Cash Tally** tab.
2. Select the cash ledger (defaults to *Cash in Hand*).
3. The currency denomination counting grid renders all standard Reserve Bank of India denominations:
   - **Notes**: ₹2000, ₹500, ₹200, ₹100, ₹50, ₹20, ₹10
   - **Coins**: ₹5, ₹2, ₹1
4. Count the physical cash in the cash drawer and enter the quantity of pieces for each denomination.
5. As you type numbers into each denomination field, the system calculates line totals and the grand **Physical Cash Total (₹)** dynamically.
6. **Variance Detection**:
   - The system compares the **Physical Cash Total** against the **Book Cash Balance** from the General Ledger.
   - If $\text{Physical} = \text{Book}$: Green banner displays **"Cash Drawer Exactly Reconciled (₹0.00 Variance)"**.
   - If $\text{Physical} < \text{Book}$: Amber/Red banner flags **"Physical Cash Shortage: -₹[Delta]"**. Enter explanation (e.g. *Cashier drawer shortage under investigation*).
   - If $\text{Physical} > \text{Book}$: Blue/Amber banner flags **"Physical Cash Excess: +₹[Delta]"**.
7. Enter the Cashier Name, Verification Date, and Auditor Remarks.
8. Click **Save Physical Cash Verification**. The verification record is permanently archived in `cash_verifications` with timestamp and user audit trail.

---

## 19. Statutory GST Filing, E-Invoicing & E-Way Bill Compliance Workbench (DOC-29)

### 19.1 Navigating the GST Compliance Cockpit (`/gst`)
1. Access the GST hub by navigating to `/gst` from the navigation sidebar.
2. Review the **Executive Statutory KPI Strip**:
   - **Outward Taxable Value (₹)**: Total taxable turnover of goods and services supplied.
   - **Outward Tax Liability (₹)**: Total GST liability (CGST + SGST + IGST) payable on outward sales.
   - **Inward Taxable Value (₹)**: Total purchase turnover from GST-registered suppliers.
   - **Eligible ITC (₹)**: Net Input Tax Credit available for set-off after Debit Note adjustments.
   - **Net Cash Tax Payable (₹)**: Calculated net cash outflow required after utilizing eligible ITC.
   - **Accumulated ITC Balance (₹)**: Credit balance carried forward to the next tax period.

### 19.2 GSTR-1 Outward Supplies Multi-Table Register
Click on the **GSTR-1 Outward Supplies** tab. The interface renders the official table-based structure:

1. **Table 4 (B2B Taxable Invoices)**:
   - Lists all supplies made to registered business partners (chemists, hospitals, institutions).
   - Columns: Invoice Number, Invoice Date, Customer Name, Recipient GSTIN, Place of Supply (POS), Reverse Charge (Y/N), Invoice Type, Taxable Value, CGST, SGST, IGST, and Total Invoice Value.
2. **Table 7 (B2CS Others / Retail)**:
   - Consolidated summary of supplies made to unregistered retail consumers.
   - Grouped by Place of Supply state code and GST tax rate (e.g. 5%, 12%, 18%).
3. **Table 9B (Credit / Debit Notes Registered - CDNR)**:
   - Lists Credit Notes issued to registered parties (from Sales Returns `/sales-return`).
   - Automatically reduces outward taxable turnover and GST liability.
4. **Table 12 (HSN Summary of Outward Supplies)**:
   - Summarizes outward sales by pharmaceutical HSN code (e.g., HSN `3004` for medicaments).
   - Displays HSN Code, Description, Unit Quantity Code (UQC: e.g., `BOX`, `TAB`, `BTL`), Total Quantity, Total Value, Taxable Value, and Integrated/Central/State tax breakdown.
5. **Table 13 (Documents Issued During the Tax Period)**:
   - Details serial numbering sequences for Sales Invoices, Debit Notes, Credit Notes, and Delivery Challans.
   - Displays From Serial No, To Serial No, Total Number Issued, and Cancelled Document Count.

### 19.3 GSTR-2 Inward Supplies & ITC Register
Click on the **GSTR-2 Inward Register** tab:
1. Lists all inward purchase invoices accrued from pharmaceutical manufacturers and C&F distributors.
2. Displays Supplier Name, Supplier GSTIN, Supplier Invoice Number, Invoice Date, Taxable Value, and Eligible ITC breakdown (CGST, SGST, IGST).
3. **Automatic Debit Note ITC Reversal**:
   - Supplier Debit Notes recorded in `/purchase-return` are highlighted in amber with negative values.
   - The engine automatically reverses ITC on purchase returns, preventing statutory notice penalties for claiming excess ITC under Section 16(2) of the CGST Act.

### 19.4 GSTR-3B Monthly Consolidated Return & Set-off Calculator
Click on the **GSTR-3B Return** tab:
1. **Table 3.1: Details of Outward Supplies and inward supplies liable to reverse charge**:
   - 3.1(a) Outward taxable supplies (other than zero rated, nil rated and exempted).
   - Displays consolidated Taxable Value, IGST, CGST, and SGST liabilities.
2. **Table 4: Eligible Input Tax Credit (ITC)**:
   - 4(A) ITC Available (whether in full or part) from Import of goods, inward supplies from registered persons.
   - 4(B) ITC Reversed (as per rules 42 & 43 and purchase returns).
   - 4(C) Net ITC Available ($4(A) - 4(B)$).
3. **Table 5.1: Payment of Tax**:
   - Calculates the automatic set-off of IGST, CGST, and SGST outward liabilities against available ITC.
   - Displays Net Tax Payable in Cash and Cash Ledger utilization.

### 19.5 Generating the Official Government GSTN Offline Utility JSON
To upload your returns directly to the official government GST portal (`gst.gov.in`):
1. In the top action bar of `/gst`, click the **[Download GSTN JSON]** button.
2. The system formats and validates the entire return against the **Official GSTR1_Offline_Utility_v1.5** JSON schema.
3. The browser automatically downloads the file (e.g., `GSTR1_2026_09_AM0001.json`).
4. Log in to the GST Portal (`services.gst.gov.in`), navigate to **Returns Dashboard &rarr; GSTR-1 &rarr; Prepare Offline**, and upload this file directly.

### 19.6 E-Invoicing (IRN) & E-Way Bill Compliance Workbench (`/gst/compliance`)
Navigate to `/gst/compliance` for high-volume statutory logistics and invoicing:
1. **E-Invoicing Tab (B2B IRN)**:
   - Displays registered B2B invoices requiring government clearance.
   - Click **[Generate IRN]** on any eligible invoice.
   - Generates the 64-character hash Invoice Reference Number (IRN), Signed Digital Signature, and Signed QR Code in compliance with the National Informatics Centre (NIC) Invoice Registration Portal (IRP).
2. **E-Way Bill Generation Tab**:
   - Filters outward sales invoices and delivery challans where total invoice value exceeds the statutory ₹50,000 threshold.
   - Click **[Create E-Way Bill]**. Enter Transporter ID, Transporter Name, Approximate Distance (km), Transport Mode (Road/Rail/Air/Ship), and Vehicle Number.
   - Click **Submit to NIC**. The system registers the E-Way Bill and populates the 12-digit E-Way Bill Number and Validity Expiry Date.
3. **Cryptographic Signed Ledger Verification (`/gst/signed-ledger`)**:
   - Opens the Signed Ledger verification utility.
   - Upload any exported customer ledger statement or scan its verification QR code.
   - The engine validates the SHA-256 cryptographic signature against organizational public keys, verifying that the financial ledger has not been tampered with since issuance.

---
## 20. Dashboard, KPI, Business Intelligence & Management Control Centre Engine (DOC-31)

### 20.1 Operational Counter Workbench (Route: /)
The front-counter workbench (/) serves cashier and billing desk operations:
1. **Live Operational KPI Strip**:
   - **Today's Cash Collected (₹)**: Real-time sum of cash settled at the counter drawer.
   - **Today's Credit Billed (₹)**: Credit sales to pharmacy accounts with invoice count.
   - **Active SKU Catalog**: Verified active master pharmaceutical items.
   - **Stockout / Expiry Risk**: Real-time count of critical low-stock items and near-expiry batches.
2. **Rapid Transaction Command Hub (Hotkeys)**:
   - [Sales Bill F2]: Instantly opens new sales invoice entry.
   - [Purchase Bill F9]: Opens inward supplier purchase entry.
   - [Sales Return]: Launches credit note / sales return screen.
   - [Purchase Return]: Launches debit note / supplier return screen.
   - [Receipt Voucher F6]: Opens customer payment receipt screen.
   - [Payment Voucher F5]: Opens supplier payment voucher screen.
   - [Day Book]: Launches daily accounting journal.
   - [Stock Register]: Opens real-time inventory lookup.
3. **Urgent Counter Exception Centre**:
   - Displays prioritized operational warnings (critical stockouts, credit limit violations, pending expense approvals) with 1-click execution buttons.
4. **Live Counter Voucher Ticker**:
   - Streaming audit feed of the latest counter bills, receipts, and returns with timestamps and settlement status.
5. **Apex Launcher**:
   - Click [Executive BI Dashboard (Route: /dashboard) ↗] to transition to executive business intelligence.

---

### 20.2 Executive Business Intelligence & Control Centre (Route: /dashboard)
Designed for business owners, executives, and financial controllers:
1. **Executive KPI Strip**:
   - **Gross Revenue (Sales)**: MTD turnover vs target, attainment %, and YoY growth rate.
   - **Procurement Volume**: Purchase expenditure, COGS ratio, and inward supplier count.
   - **Gross Operating Margin**: Trading gross profit (₹) and margin percentage (%).
   - **Consolidated Liquidity**: Liquid capital (Cash + Bank balances) and Quick Ratio health.
2. **Sales Turnover vs Purchase Trend**:
   - 7-Month comparative volume analysis graph displaying monthly sales turnover curves against inward procurement curves.
3. **Operating Expenses (Opex) Distribution**:
   - Donut chart breaking down administrative, freight, storage/godown, conveyance, and asset depreciation overheads.
4. **Compact Regional Sales Map Widget & Territory Intelligence Modal**:
   - **Compact View**: Sits in Row 2 alongside the Opex card (~340px height). Displays state-wise sales turnover (Delhi NCR, Punjab & Haryana, Uttar Pradesh, Rajasthan) and territory rankings. Strictly 100% focused on sales revenue and chemist coverage (no fleet/dispatching clutter).
   - **Click-to-Expand Interaction**: Click the map card or Expand ↗ to open the full-screen interactive modal (#mapModal).
   - **Enlarged Territory Map**: Interactive vector polygons with click-to-drill-down capabilities.
   - **Territory KPI Card**: Displays selected state billed turnover, retail chemist network coverage, and monthly sales quota attainment %.
   - **State Performance Table**: Detailed comparative performance matrix with direct drill-down to the DOC-30 sales register.
5. **Top 5 Revenue-Generating Pharmaceutical Products**:
   - Ranked list of top-selling pharmaceutical molecules with billed turnover, pack counts, and market share progress bars.
6. **Statutory Receivables Outstanding Ageing Distribution**:
   - Multi-bucket ageing analysis (0-30, 31-60, 61-90, 90+ days) with risk color indicators and direct link to the Ageing Workbench.

---

## 21. Workflow, Approval, Alert & Business Automation Engine (DOC-32)

### 21.1 Unified Approval & Task Inbox (Route: `/workflow/inbox`, Hotkey: `[F4]`)
The Approval Inbox aggregates actionable approval requests across Sales, Procurement, Finance, and Inventory into a single, high-velocity workbench:
1. **Direct Access**: Press `[F4]` from anywhere on the Counter Workbench (`/`), or click **Workflows & Approvals [F4]** in the main navigation bar.
2. **Actionable Queue & Filter**:
   - Filter by **Pending Queue**, **Completed History**, or **All Items**.
   - Instant search across document numbers, chemist/supplier party names, or approval categories.
   - Urgency priority indicators (**URGENT**, **HIGH**, **NORMAL**, **LOW**) and real-time SLA countdown badges (e.g. `11.8h rem`).
3. **Inspection Slide-Over Drawer**:
   - Click any task row (or use keyboard selection) to open the detailed drawer on the right.
   - Shows transaction value in INR, requestor name, assigned approver role, and full visual stage timeline with timestamps.
4. **Maker-Checker Compliance Enforcement**:
   - The engine guarantees strict separation of duties.
   - If the logged-in user created the document, an orange banner appears: `Maker-Checker Policy Enforcement: You are recorded as the creator of this document. Approval must be executed by an independent reviewer.`
   - The **Approve [A]** action is strictly disabled to prevent self-approval fraud.
5. **Fast Keyboard Actions**:
   - **Approve [A]**: Instantly signs off the task and moves the transaction to the next stage or completes the approval chain.
   - **Reject [R]**: Launches a mandatory explanation modal (`#reject-remarks-input`). Enter the reason (e.g., *Rate variance exceeds authorized threshold*) and click **Confirm Rejection** to terminate the workflow and notify the initiator.
   - **Delegate [D]**: Reassigns the task to another authorized supervisor or peer during leaves/audits.

---

### 21.2 Visual No-Code Workflow Designer (Route: `/workflow/designer`)
Enables store managers, CFOs, and system administrators to configure approval hierarchies without writing code:
1. **Rule Template Configuration**:
   - Pick the source module (**Purchase**, **Sales**, **Finance**, **Inventory**).
   - Select the trigger event (**Amount Threshold**, **Credit Limit Breach**, **Expense Claim Signoff**).
   - Set the unique rule code, rule name, and toggle **Maker-Checker Enforcement**.
2. **Multi-Tier Hierarchy Builder**:
   - **Stage 1 (Floor Review)**: Configure minimum and maximum transaction bounds, assigned role (e.g. *Branch Floor Manager*), and SLA window (e.g. *12 Hours*).
   - **Stage 2 (Executive Signoff)**: Set bounds for elevated amounts (e.g. *₹50,001 - ₹2,00,000*), assigned role (*CM Admin*), and SLA window (*24 Hours*).
   - **Stage 3 (Director Authorization)**: For highest-value transactions exceeding ₹2,00,000 assigned to *Account Master Director* (*48 Hours*).
   - Add or remove stages with 1-click controls.
3. **Automated Downstream Actions**:
   - Configure idempotent actions executed upon approval (e.g. `RELEASE_FOR_INWARD`, `ALLOW_BILLING_DISPATCH`, `DISBURSE_PAYMENT`).
   - Configure rejection handling (e.g. `CANCEL_PO`, `HOLD_DISPATCH`).
4. **Interactive Sandbox Simulator**:
   - Test transaction values before publishing.
   - Enter a test amount (e.g. `₹75,000`) in `#input-sim-amount` to immediately view the simulated routing path, active tier, and target reviewer role.

---

### 21.3 Real-Time Execution & SLA Monitor (Route: `/workflow/monitor`)
Provides real-time visibility and health tracking for all automated enterprise workflows:
1. **SLA Health & Performance Cards**:
   - **Active Pending Tasks**: Live count of unresolved tasks across all departments.
   - **Average Turnaround Time (TAT)**: Enterprise benchmark (currently **1.8 Hours** vs 4h optimal limit).
   - **SLA Compliance Rate**: Percentage of tasks approved within SLA deadlines (currently **94.2%**).
   - **Idempotency Engine**: Real-time status of SHA-256 deduplication locks (**100% Locked**).
2. **Department Approval Volume Distribution**:
   - Graphical breakdown across Procurement, Counter Sales, Finance & Expenses, and Inventory Quality.
3. **Bottleneck Approver Ranking**:
   - Identifies roles with delayed queues, average delay hours, and escalation risk indicators.
4. **Live Execution Stream & Idempotency Audit**:
   - Real-time audit log of all active workflow instances.
   - Displays deterministic cryptographic hashes: `SHA-256: [hash]` ensuring zero double-approvals or duplicate downstream commands.
   - **Safe Retry [↻]**: 1-click idempotent retry for interrupted external actions.

---

## 22. Audit Trail, Data Governance & Compliance Control Engine (DOC-33)

DOC-33 delivers an immutable, cryptographically chained audit logging and compliance governance layer that satisfies the Ministry of Corporate Affairs (MCA) Audit Trail Rules, US FDA 21 CFR Part 11, and statutory GST requirements.

---

### 22.1 Using the Audit Explorer (`/audit` or `/audit/explorer`)

1. **Accessing the Explorer**:
   - Click the **Audit Trail** launcher tile on the Counter Workbench (`/`).
   - Or click **Audit Trail ↗** in the Urgent Counter Exceptions card.
   - Or select **Audit Trail** from the top navigation bar.
2. **Top Metric Cards**:
   - **Total Audited Events**: Live tally of append-only records committed to `audit_events`.
   - **Hash Chain Integrity**: Real-time cryptographic validation status (**100% Cryptographically Verified**).
   - **Active Legal Holds**: Number of active litigation or tax inquiry preservation holds.
   - **Terminal Event Hash**: Displays the latest 64-character SHA-256 root hash.
3. **Deep Search & Filters**:
   - Global Search (`#input-audit-search`): Press `[Ctrl+F]` to focus search bar. Search by Document Number, User name, Reason, or Module.
   - Module Filter: Filter by `INVOICE`, `VOUCHER`, `PARTY`, `PRODUCT`, `WORKFLOW_TASK`, `LEGAL_HOLD`, `RETENTION_POLICY`, or `EVIDENCE_PACK`.
   - Action Filter: Filter by `CREATE`, `UPDATE`, `POST`, `APPROVE`, `REJECT`, `CANCEL`, `LEGAL_HOLD_APPLIED`, `AUDIT_EXPORT`.
4. **Keyboard Hotkeys in Audit Explorer**:
   - `[Ctrl+F]`: Jump to global search input.
   - `[ArrowUp]` / `[ArrowDown]`: Navigate through audit rows.
   - `[Enter]`: Open slide-over Change Detail Drawer for highlighted event.
   - `[E]`: Open the Auditor Evidence Pack export modal.
   - `[Esc]`: Dismiss drawer or active modal.

---

### 22.2 Change Detail Slide-Over Drawer & Cryptographic Seal Verification

Clicking **Inspect 👁** or pressing `[Enter]` on any row slides open the **Change Evidence Detail Drawer**:
1. **Cryptographic Hash Chaining Verification**:
   - Displays the **Previous Event Hash (`prev_hash`)** and **Current Event Hash (`event_hash`)**.
   - Displays green **`✓ SEAL VALID (SHA-256)`** badge certifying the mathematical link has not been tampered with.
2. **Event Metadata Banner**:
   - Authenticated Actor identity, Action Type, Canonical UTC timestamp, and Operational Reason.
3. **Field-Level Before/After Comparison Grid**:
   - Itemizes every modified field with Old State (highlighted in red) vs New State (highlighted in green).
   - Diff status badges: `ADDED`, `MODIFIED`, `REMOVED`.
   - Sensitive credentials (passwords, tokens, secret keys) are automatically masked as `[REDACTED_SENSITIVE]`.

---

### 22.3 Operating the Data Governance Console (`/audit/governance`)

Access the console via the top header or route `/audit/governance`:
1. **Retention Policies Tab**:
   - Lists data classifications (`INVOICE`, `VOUCHER`, `AUDIT_EVENT`, `PARTY`).
   - Default statutory retention period is **2,920 Days (8 Years)** meeting statutory Indian Companies Act 2013 and CGST Act rules.
   - Click **Adjust Days** to customize retention schedules. Every policy modification generates an immutable audit record.
2. **Statutory Legal Holds Tab**:
   - Manages records protected against automated disposal or archival during tax inquiry or litigation.
   - To establish a hold, click **+ Establish Statutory Legal Hold**:
     - Choose Scope (`MODULE`, `RECORD`, `PARTY`, `ALL`).
     - Enter Scope Description (e.g. *Sales Invoices Series 2025-26 under Tax Notice*).
     - Enter statutory justification notice citation.
     - Click **Commit Legal Hold**. An immutable `LEGAL_HOLD_APPLIED` audit event is recorded.
   - To release a hold, click **Release Hold**, provide mandatory closure remarks, and confirm. An immutable `LEGAL_HOLD_RELEASED` audit event is recorded.
3. **Forensic Anomaly Signals Tab**:
   - Real-time heuristic evaluation cards:
     - **High-Volume Activity Velocity (`MASS_EDITS`)**: Flags rapid mass updates.
     - **Transaction Reversals & Cancellations (`REPEATED_REVERSALS`)**: Audits cancellation frequency.
     - **Off-Hours Critical Modifications (`AFTER_HOURS`)**: Flags transactions posted between 22:00 and 06:00.
     - **Statutory Preservation Holds (`ACTIVE_LEGAL_HOLDS`)**: Highlights active held records.
     - **Cryptographic Hash Chain Seal (`CHAIN_INTEGRITY`)**: Confirms 100% sequential validity.
4. **Auditor Evidence Pack Generator Tab**:
   - Enter statutory audit mandate and click **Generate & Digitally Seal Evidence Pack**.
   - Produces a verifiable JSON package with embedded cryptographic manifest, pack ID, and terminal hash.
---

## 23. Cargo & Consignment Management Engine (DOC-34)

### 23.1 Overview & Non-Negotiable Architecture
The Cargo & Consignment Management Engine decouples physical freight movements from document generation and dispatch staging. A consignment represents a distinct, real-world transport commitment possessing its own life cycle, multi-package volumetric hierarchy, and financial allocation rules.

Key architectural tenets:
1. **Independent Consignment Identity**: Consignments possess an alphanumeric continuation series (`CN-YYYY-XXXX`) completely independent of invoice, challan, or order numbering. Multiple sales invoices or stock transfers can be bundled into a single consignment, or a single large dispatch can be split across multiple consignments.
2. **Admin-Funded Client Cargo Architecture**:
   - In centralized distribution setups, Platform Admin bears freight costs on behalf of Client Companies.
   - **Zero Client GL Auto-Debit**: When `is_admin_funded` is active, the Client Company General Ledger (DOC-08) is **never** debited. The expense is posted solely in the Platform Admin Company General Ledger under Account 5200 (Freight & Logistics Expense).
   - The Client Company portal displays allocated cargo costs strictly for operational pricing, unit-level profitability, and margin analysis.
   - **Combined Multi-Client Reporting Toggle**: Platform Admin executives can aggregate cargo movements and total freight spend across multiple client companies without breaching underlying multi-tenant isolation.
3. **Volumetric CBM Formula**:
   $$\text{CBM} = \frac{\text{Length (cm)} \times \text{Width (cm)} \times \text{Height (cm)}}{1,000,000}$$
   Package barcodes (`PKG-YYYY-XXXX-NN`) track tare weight, gross weight, fragility, and volumetric cubic meters.
4. **Lifecycle State Machine**:
   $$\text{PLANNED} \longrightarrow \text{READY\_FOR\_LOADING} \longrightarrow \text{LOADING} \longrightarrow \text{DISPATCHED} \longrightarrow \text{IN\_TRANSIT} \longrightarrow \text{DELIVERED} \longrightarrow \text{CLOSED}$$
   Branching to `EXCEPTION` occurs whenever shortages, damage, or delivery discrepancies are registered.

---

### 23.2 Operating the Cargo Management Board (`/cargo` or `Ctrl+1`)

1. **Accessing the Board**:
   - Press **`Ctrl+1`** from any screen or click the **Cargo & Consignment** tile on the Counter Workbench (`#hub-btn-cargo-management`).
2. **Top Operational KPI Strip**:
   - **Total Consignments**: Lifetime active registry count.
   - **Active in Transit**: Consignments currently on the road under carrier custody.
   - **Total Volumetric CBM**: Sum of cubic meters across active shipments.
   - **Admin-Borne Freight (₹)**: Logistics expenditure funded by Platform Admin.
   - **Pending POD Deliveries**: Shipments delivered requiring receiver sign-off.
3. **Registering a New Consignment (`[F6]` or New Consignment Button)**:
   - Click **+ Register Consignment (`[F6]`)**:
     - Carrier selection (transporter name, vehicle number, driver name, driver phone).
     - Route configuration (Origin Hub and Destination Hub).
     - Document linkage (optional reference to Sales Bill, Dispatch Challan, or Transfer Note).
     - Volumetric package dimensions (Type: Carton/Box/Pallet, Length, Width, Height in cm, Gross Weight in kg). The system calculates CBM automatically.
     - Cost Bearer Policy: Check *Admin Company Bears Cargo Cost* to apply central platform funding.
     - Click **Save & Generate Consignment**. An immutable audit record is committed to DOC-33.
4. **Inspecting Consignments via Slide-Over Drawer**:
   - Click any consignment row to open the change and inspection drawer (`#drawer-consignment-detail`).
   - Displays package barcodes, volumetric dimensions, freight breakdown, and current state.
   - Click **Confirm Dispatch** or **Mark In-Transit** to advance movement states.

---

### 23.3 Operating the Cargo Cost Center (`/cargo/costs`)

1. **Navigating to Cost Allocation**:
   - Click **Cargo Costs Allocation** (`[F4]`) from the Cargo Board toolbar or navigate to `/cargo/costs`.
2. **Combined Multi-Client Reporting Toggle**:
   - Click **Toggle Combined Admin MIS (`#toggle-combined-reporting`)**:
     - **Cross-Tenant Admin View**: Aggregates freight liabilities across Jaipur, Delhi, and regional distribution centers.
     - **Single-Tenant View**: Scopes reporting exclusively to the active operating company.
3. **Financial Bifurcation Summary**:
   - Gross Freight Incurred vs Client Recovered (via DOC-35) vs Net Admin-Borne Cost.
4. **Exporting CSV Manifest**:
   - Click **Export CSV Manifest (`#btn-export-cost-report`)** to generate auditor-compliant spreadsheets itemizing consignments, LR dockets, carriers, volumetric CBMs, and ledger cost allocations.

---

### 23.4 Operating the POD & Exception Claims Desk (`/cargo/pod-exceptions`)

1. **Accessing the Desk**:
   - Click **POD & Exception Desk** from the Cargo Board or navigate to `/cargo/pod-exceptions`.
2. **Tab 1: Pending Deliveries Awaiting POD**:
   - Lists shipments arrived at destination requiring physical confirmation.
   - Click **Record Delivery POD ➔**:
     - Enter Receiver Name.
     - Verify Accepted Quantity vs Short Quantity vs Damaged Quantity.
     - Enter Digital Signature Token or Receiver Remarks.
     - Click **Commit Delivery POD**.
     - If accepted quantity matches total packages, consignment state automatically transitions to `DELIVERED`.
     - If damage or shortage is reported, consignment state immediately transitions to `EXCEPTION`.
3. **Tab 2: Active Transit Exceptions & Claims**:
   - Lists consignments with recorded shortages or transit carrier damages.
   - Click **Resolve & Claim ➔**:
     - Select corrective resolution: Carrier Liability Claim, Demurrage Waiver, or Inventory Write-off.
     - Enter resolution justification and claim reference number.
     - Click **Commit Resolution**. Consignment state transitions to `CLOSED` and emits an immutable audit event.

---

*End of User Workflow Manual.*




