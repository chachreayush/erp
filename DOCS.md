# ERP Software — Master Documentation

**Version:** 1.0 (Living Document — Updated Every Sprint)
**Owner:** chachreayush
**Repository:** https://github.com/chachreayush/erp

---

## Table of Contents
1. [Project Overview](#1-project-overview)
2. [Architecture](#2-architecture)
3. [Tech Stack](#3-tech-stack)
4. [Database Schema](#4-database-schema)
5. [API Reference](#5-api-reference)
6. [Modules](#6-modules)
7. [Security & Permissions](#7-security--permissions)
8. [Deployment](#8-deployment)
9. [Sprint History](#9-sprint-history)

---

## 1. Project Overview

This is a multi-tenant, offline-first ERP system built on the **AM / CM model**:

- **AM (Account Master):** The main company / owner of the software. Has full, unrestricted access to all CMs and their data.
- **CM (Client Module):** Client companies created and managed by the AM. Each CM is completely isolated from other CMs.

**Core Principles:**
- Data is stored **locally first** on the main server for zero-lag performance.
- Data syncs to **Supabase cloud** in the background for remote access.
- Remote users connect via **Company ID + Username + Password**.
- LAN users connect by **copying a single ERP.exe** — no installation required (Marg ERP style).
- The **local database is the authoritative source of truth** — cloud changes require admin approval before entering the main database.

---

## 2. Architecture

```
OFFICE (LAN)
├── Main Server PC
│   ├── PostgreSQL        ← Primary database (all company data)
│   ├── FastAPI           ← Backend API (all business logic)
│   ├── ERP.exe (Server)  ← Admin uses this
│   └── UDP Beacon        ← Broadcasts server presence on LAN

├── Client PC 1 (ERP.exe copied)  ← Auto-discovers server
├── Client PC 2 (ERP.exe copied)  ← Auto-discovers server
└── Client PC N (ERP.exe copied)  ← Auto-discovers server

INTERNET
├── Supabase Cloud        ← Sync bridge (isolated per company)
├── Remote Windows User   ← ERP.exe (Remote mode + SQLite cache)
├── Android App           ← React Native (Future)
└── iOS App               ← React Native (Future)
```

---

## 3. Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Desktop UI | Tauri 2.0 | Lightweight native desktop app shell |
| Frontend | React 19 + TypeScript | All screens and UI components |
| UI Components | shadcn/ui (Radix UI) | Keyboard-navigable, accessible components |
| Data Grid | AG Grid React | ERP-grade tables with 100k+ row support |
| State Management | Zustand | User session, permissions, app mode (LAN/Remote) |
| Data Fetching | TanStack Query | Server data caching and background sync |
| Backend | Python 3.13 + FastAPI | All business logic and API endpoints |
| Server DB | PostgreSQL | Primary authoritative database |
| Remote Cache | SQLite | Offline cache for remote clients |
| Cloud Bridge | Supabase | Cloud sync + remote auth |
| Packaging | PyInstaller + Inno Setup | Bundles backend into .exe installers |
| LAN Discovery | UDP Broadcast | Zero-config server auto-discovery |
| Charts | Recharts | Dashboards and reports |

---

## 4. Database Schema

> ⏳ This section will be populated as each module is built.

### Tables (Planned)

| Table | Module | Description |
|---|---|---|
| `companies` | Core | AM + all CM companies |
| `users` | Auth | All user accounts |
| `roles` | Auth | Role definitions per company |
| `permissions` | Auth | Module-level permissions per user |
| `sessions` | Auth | Active login sessions |
| `invoices` | Finance | All billing and invoice records |
| `ledger_entries` | Finance | General ledger transactions |
| `products` | Inventory | Stock items / products |
| `stock_movements` | Inventory | Inventory in/out records |
| `sales_orders` | Sales | Customer sales orders |
| `purchase_orders` | Sales | Supplier purchase orders |
| `customers` | CRM | Customer records |
| `crm_visits` | CRM | Field staff visit records |
| `employees` | HR | Employee master records |
| `attendance` | HR | Daily attendance records |
| `payroll` | HR | Salary and payroll records |
| `audit_logs` | Core | All user actions (full traceability) |
| `sync_queue` | Sync | Pending cloud-to-local change approvals |

---

## 5. API Reference

> ⏳ This section will be populated as each endpoint is built.

### Authentication
| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/login` | Login (LAN or Remote via Company ID) |
| POST | `/auth/logout` | Logout and invalidate session |
| POST | `/auth/2fa/verify` | Verify 2FA OTP code |
| GET | `/auth/me` | Get current logged-in user profile |

---

## 6. Modules

> ⏳ Each module section will be populated as it is built.

### Module Status

| Module | Status | Sprint |
|---|---|---|
| Auth & User Management | ⏳ Planned | Epic 2 |
| Finance & Accounting | ⏳ Planned | Epic 3 |
| Inventory & Warehouse | ⏳ Planned | Epic 4 |
| Sales & Purchase | ⏳ Planned | Epic 5 |
| CRM | ⏳ Planned | Epic 6 |
| HR Management | ⏳ Planned | Epic 7 |
| Reporting & Analytics | ⏳ Planned | Epic 8 |
| Cloud Sync | ⏳ Planned | Epic 9 |

---

## 7. Security & Permissions

### Permission Layers (3-Layer Enforcement)

1. **Frontend (UI Layer):** Buttons and menu items are hidden if the user does not have permission. The user never even sees actions they cannot perform.
2. **Backend (API Layer):** FastAPI middleware checks the user's JWT token and role on every request. Even if someone bypasses the UI, the server rejects unauthorized calls.
3. **Database (Supabase RLS):** Row Level Security policies at the database level ensure remote users can only read/write data belonging to their own company.

### Role Hierarchy
```
AM Admin
  └── CM Admin (per company)
        └── Manager
              └── Area Manager / Sales Manager
                    └── Staff / Field Staff
                          └── Viewer (Read Only)
```

### Remote Login Flow
1. User opens ERP.exe
2. App scans LAN for server (UDP broadcast) — 2 second timeout
3. If server found → LAN Login (Username + Password only)
4. If server NOT found → Remote Login (Company ID + Username + Password)
5. Company ID routes user to correct isolated company database
6. Role and permissions loaded from database
7. App renders only the modules and actions the user is permitted to see

---

## 8. Deployment

### Installer 1: `ServerSetup.exe`
- Installs: PostgreSQL, Python FastAPI backend, ERP application
- Target: Main office server PC only
- Creates: A copy of `ERP.exe` in `C:\ERP\Client\` for distribution to LAN clients

### Installer 2: `RemoteSetup.exe`
- Installs: ERP application only (with embedded SQLite)
- Target: Remote users working outside the office
- Connects: To Supabase cloud using Company ID + credentials

### LAN Client Distribution
- No installer needed
- Admin copies `ERP.exe` from `C:\ERP\Client\` to any LAN PC
- Double-click → auto-discovers server → login screen → works

---

## 9. Sprint History

| Sprint | Epic | Description | Status | Date |
|---|---|---|---|---|
| 1 | Epic 1 | Project scaffold + folder structure + GitHub setup | ✅ Done | 2026-07-19 |

---

*This document is updated at the end of every sprint. Last updated: 2026-07-19*

---

## 10. Enterprise Upgrades: 6 Core Transaction Modules, Marg Keyboard Engine & Series Continuation (October 2026)

### 10.1 The 6 Core Transaction Voucher Modules (100% Keyboard-Operated)
All 6 primary transaction screens in the ERP are 100% keyboard-navigable and designed for high-speed counter billing (< 2–3 seconds per transaction, zero mouse required):

1. **Sales Bill (`/sales`, `SalesBill.tsx`)**:
   - High-throughput counter billing.
   - Header: `Date` &rarr; `Bill No` &rarr; `Party` [F7 popup search].
   - Table Grid: `Product` &rarr; `Batch` [F3 popup with stock, MRP, rate, expiry] &rarr; `Qty` &rarr; `Free` &rarr; `Rate` &rarr; `Disc %` &rarr; Next Row.
   - Settlement: `[End]` key opens Bill Discount & Payment Settlement modal; `Enter` saves and prints.
   - Series Continuation: Auto-advances custom series (e.g. `RJ-INV-1001` &rarr; `RJ-INV-1002`).
2. **Purchase Bill (`/purchase`, `PurchaseBill.tsx`)**:
   - Inward modes: `DIRECT` counter inward and `AGAINST_PO` purchase order matching.
   - Header walk: `Date` &rarr; `Bill No` &rarr; `Party` [F7] &rarr; `Party Inv No` &rarr; `Inv Date` &rarr; `Tax Mode`.
   - Grid: Batch creation (MRP, SRate, P.Rate, Expiry MM/YY) and automated vendor discrepancy complaint logging.
3. **Supplier Debit Note / Purchase Return (`/purchase-return`, `PurchaseReturnBill.tsx`)**:
   - Neumorphic Minimalist design (White & Forest Green `#1b4332`, `#2d6a4f`).
   - Dual modes: `[F2] Against Inward Bill` (queries supplier inward bills via `/api/sales/invoices/by-supplier/`) and `[F3] Direct Loose Return`.
   - Stock Disposition routing per row: `🟢 Saleable` (`current_stock`), `🔴 Breakage Godown` (`brk_exp_stock`), `🟡 Expired Godown` (`brk_exp_stock`).
   - Reason codes: Transit damage, Expired goods, Near expiry, Excess supply, Rate difference.
   - Series Continuation: Defaults `DN-0001`; user customization (e.g. `RJ-DN-0020`) automatically advances to `RJ-DN-0021`.
   - Row keyboard navigation: `Enter` walks `return-qty` &rarr; `return-rate` &rarr; `return-disc` &rarr; next row (or focuses Save button on last item). `ArrowUp`/`Down` shifts rows.
4. **Customer Credit Note / Sales Return (`/sales-return`, `SalesReturnBill.tsx`)**:
   - Dual modes: `[F2] Against Sales Bill` (queries customer invoices via `/api/sales/invoices/by-customer/`) and `[F3] Direct Counter Return`.
   - Billed quantity caps prevent returning more than originally purchased.
   - Stock disposition routing per row (`Saleable`, `Breakage Godown`, `Expired Godown`).
   - Row keyboard navigation: `Enter` walks `return-qty` &rarr; `return-rate` &rarr; `return-disc` &rarr; next row.
   - Series Continuation: Defaults `CN-0001`; user customization (e.g. `RJ-CN-8281`) automatically advances to `RJ-CN-8282`.
5. **Breakage Issue (`/brk-issue`, `BrkIssueBill.tsx`)**:
   - Deducts damaged or broken stock from `brk_exp_stock` to return to manufacturer for replacement or credit claims.
6. **Breakage Receive (`/brk-receive`, `BrkReceiveBill.tsx`)**:
   - Accrues damaged stock returned by retail chemists directly into `brk_exp_stock`, strictly isolated from active retail inventory.

---

### 10.2 Marg/Tally Alphanumeric Series Continuation Engine
Across all billing and voucher entry modules, invoice numbering implements universal sequence continuation:
- **Universal Pattern Matching**: Formula `[Prefix][Number] -> [Prefix][Number + 1]`.
- **Preserved Leading Zeros**: `DN-0001` &rarr; `DN-0002`; `RJ-CN-8281` &rarr; `RJ-CN-8282`.
- **Zero Overwrite Rule**: User edits are never overwritten by system defaults. The custom sequence is persisted in `localStorage` and maintained across sessions.

---

### 10.3 Double-Entry General Ledger Auto-Posting Hook (`_auto_post_accounting`)
Saving any invoice automatically posts a balanced double-entry Journal Voucher (`models.Voucher`) to PostgreSQL:
- **Sales Bill**: Dr Customer (Debtor), Cr Sales Account + Output GST
- **Purchase Bill**: Dr Purchase Account + Input GST, Cr Supplier (Creditor)
- **Debit Note (Purchase Return)**: Dr Supplier (Creditor), Cr Purchase Return + Input Tax Reversal
- **Credit Note (Sales Return)**: Dr Sales Return + Output Tax Reversal, Cr Customer (Debtor)

---

### 10.4 Management Reporting & Practical Analytics (DOC-30)
- **Company-Wise Sales Register (`/reports`)**: Aggregates sales by manufacturer across 25+ pharmaceutical companies with total units sold, invoice count, and turnover in Indian Rupees (`₹`).
- **Multi-Company Filter Modal**: Popup with real-time company search, `Select All`, `Clear All`, and multi-select filtering.
- **Inline Product Drill-Down Drawer**: Click `[▶ View Products]` on any company row to expand an inline drawer showing individual drug sales and batches.
- **Custom Report Designer (`/reports/designer`)**: Interactive query designer allowing semantic grouping by Company, Party, Product, or Bill-by-Bill with live execution against `/api/reports_v2/query` and reusable template saving.

---

### 10.5 Automated QA Verification Results (Selenium + Headless Chrome)
All features verified with 100% assertion pass in automated test suites:
- `test_purchase_return_selenium.py`: Passed 100% (`RJ-DN-0020` &rarr; `RJ-DN-0021`, inward bill `#PB-0001` loaded, GL journal `JRN/2026-27/0161` posted).
- `test_sales_return_selenium.py`: Passed 100% (`RJ-CN-8281` &rarr; `RJ-CN-8282`, billed invoice `#INV-TEST-E41A` loaded, GL journal `JRN/2026-27/0165` posted).
- `test_sales_bill_selenium.py`: Passed 100% (counter flow, batch selection, and settlement modal verified).
- `test_master_all_6_modules_selenium.py`: Passed 100% across all 6 transaction voucher modules (Sales Bill `RJ-INV-6874` -> `RJ-INV-6875`, Purchase Bill `RJ-PB-7905` -> `RJ-PB-7906`, Supplier Debit Note `RJ-DN-8924` -> `RJ-DN-8925`, Customer Credit Note `RJ-CN-9937` -> `RJ-CN-9938`, Breakage Issue `RJ-BKI-10950` -> `RJ-BKI-10951`, Breakage Receive `RJ-BKR-11966` -> `RJ-BKR-11967`).

---

### 10.6 Master 6-Module Transaction Voucher Execution & GL Posting Matrix

The ERP supports 6 distinct primary transaction voucher types designed for pharmaceutical wholesale, distribution, and retail operations:

1. **Sales Bill (Outward Invoicing)**: Fast Marg counter billing, barcode/name search, multi-batch selection with live rate calculation, trade discount deduction, SGST/CGST/IGST breakdown, and cash/credit tender recording. Auto-posts `Dr Customer Ledger`, `Cr Sales Ledger`, `Cr Output Tax Ledger`.
2. **Purchase Bill (Inward Invoicing)**: Supplier invoice registration with PO matching (`[F2] Against PO`), counter direct inward (`[F3] Direct Inward`), party invoice number validation against duplicates, batch master accrual, and landed cost recalculation. Auto-posts `Dr Purchase Ledger`, `Dr Input Tax Ledger`, `Cr Supplier Ledger`.
3. **Supplier Debit Note (Purchase Return)**: Inward bill line item return or loose return, return stock deduction from godowns, debit note voucher creation with GST tax reversal. Auto-posts `Dr Supplier Ledger`, `Cr Purchase Return Ledger`, `Cr Input Tax Reversal Ledger`.
4. **Customer Credit Note (Sales Return)**: Multi-mode sales return (Return to Saleable Stock, Move to Breakage Godown, Move to Expiry Godown), credit adjustment voucher creation with tax reversal. Auto-posts `Dr Sales Return Ledger`, `Dr Output Tax Reversal Ledger`, `Cr Customer Ledger`.
5. **Breakage & Expiry Issue (To Supplier/Mfg)**: Inward/damaged drug return from quarantine or breakage godowns back to principal manufacturer/supplier with credit accrual. Auto-posts `Dr Supplier Ledger`, `Cr Damaged Stock / Loss Ledger`.
6. **Breakage & Expiry Receive (From Chemist/Debtor)**: Chemist expired or broken medicine return receipt into quarantine godowns with customer ledger credit note issuance. Auto-posts `Dr Damaged Goods Quarantine`, `Cr Customer Ledger`.

---

### 10.7 Master Selenium Suite: Management Reporting & Financial Accounting Verification

The automated test suite `test_reports_and_finance_selenium.py` provides complete regression verification across 8 core analytics and ledger modules:
- **Module 1 - Report Viewer (`/reports`)**: Verified company-wise sales register with 25+ manufacturers, batch filter modal, company search, and inline product drill-downs (`[▶ View Products]`).
- **Module 2 - Custom Report Designer (`/reports/designer`)**: Verified semantic dimension builder, dynamic aggregation query execution (`/api/reports_v2/query`), and template persistence (`/api/reports_v2/templates`).
- **Module 3 - Day Book (`/finance/daybook`)**: Verified daily chronological register and multi-voucher GL double-entry postings.
- **Module 4 - Ledger Statement (`/finance/ledger-statement`)**: Verified 69 active ledger accounts dropdown, debtor statement generation (`Om Sai Medical`), opening balance, and running closing balance calculation.
- **Module 5 - Trial Balance (`/finance/trial-balance`)**: Verified double-entry closing balances across 62 active ledger accounts, Debit and Credit column balancing, and Grand Total reconciliation.
- **Module 6 - Profit & Loss Statement (`/finance/profit-loss`)**: Verified categorized Expenses and Incomes accounts, multi-group sub-totals, and period Net Profit calculation.
- **Module 7 - Authoritative Balance Sheet (`/finance/balance-sheet`)**: Verified capital, liabilities, and assets ledger balances, and balance check equation.
- **Module 8 - Bank Reconciliation (`/finance/bank-reconciliation`)**: Verified bank accounts selector and unreconciled split-screen ledger transaction mapper.
- **Suite Result**: 100% PASS across all 8 modules (Exit Code 0).

---

### 10.8 Statutory GST Compliance & Tax Filing Engine (DOC-30 Section 8 & DOC-42)

The ERP includes an integrated statutory taxation and GST filing workbench accessible at `/gst` (`src/pages/gst/GstReports.tsx`) backed by optimized high-throughput endpoints (`backend/api/gst.py`):

1. **Executive Statutory Tax Dashboard**:
   - Outward Taxable Turnover: `₹1,52,519.34` | Outward Tax: `₹17,318.00` (CGST: ₹8,659.00, SGST: ₹8,659.00, IGST: ₹0.00).
   - Inward Taxable Value: `₹1,81,76,245.90` | Gross Inward ITC: `₹29,04,051.62` | Debit Note ITC Reversals: `-₹95.20` | Net Eligible ITC: `₹29,03,956.42`.
   - Net Cash Payable: `₹0.00` | Accumulated ITC Balance Carried Forward: `₹28,86,638.42`.
   - Document Audit: 49 Outward Invoices/Notes, 105 Inward Purchase Receipts.
2. **GSTR-1 Outward Supplies Register**:
   - **Table 4 (B2B Taxable Supplies)**: 12 invoices to registered pharma distributors with Customer GSTIN, Place of Supply (POS), Reverse Charge flag, Invoice Type (`Regular`), Taxable Base, and CGST/SGST/IGST breakdown.
   - **Table 7 (B2CS Retail Supplies)**: 37 consumer sales rows aggregated state-wise and tax-rate-wise for unregistered chemist counter sales.
   - **Table 9B (CDNR Credit/Debit Notes)**: 10 customer sales return credit notes adjusting outward tax liability.
   - **Table 12 (HSN Summary of Outward Supplies)**: 19 distinct pharmaceutical HSN codes (e.g. 3004 medicaments) with total quantities, UQC codes, taxable base, and tax splits.
   - **Table 13 (Documents Issued Register)**: Audit trail of serial numbering sequences, tracking start number, end number, total issued, and cancelled counts.
3. **GSTR-2 Inward Supplies & ITC Register**:
   - 105 purchase records detailing Supplier Name, Supplier GSTIN, Supplier Invoice Number, Invoice Date, Invoice Total, Taxable Value, and Eligible ITC.
   - Automatic ITC Reversal matching for Supplier Debit Notes (Purchase Returns) with emerald reconciliation banner.
4. **GSTR-3B Monthly Consolidated Statutory Return**:
   - **Table 3.1**: Details of Outward supplies and inward supplies liable to reverse charge.
   - **Table 4**: Eligible Input Tax Credit broken down across statutory categories.
   - **Table 5.1 & Payment of Tax**: Calculation of tax payable, automatic computation of ITC utilization against outward liabilities, and net cash balance.
5. **Government GSTN Portal Offline JSON Utility (`GSTR1_MMYYYY.json`)**:
   - Official Government GSTN Offline Utility schema v1.5 (`version: "GSTR1_Offline_Utility_v1.5"`).
   - Direct download mechanism exporting verified payloads with `gstin`, `fp`, `gt`, `cur_gt`, `b2b`, `b2cs`, `hsn`, and `doc_issue` blocks ready for instant upload to `gst.gov.in`.
6. **Automated Selenium Test Suite (`test_gst_compliance_selenium.py`)**:
### 10.9 Payment, Receipt & Bill-by-Bill Settlement Engine (DOC-24 & DOC-07 Section 20)

The ERP includes an integrated double-entry Counter Payment & Receipt collection system with an automated FIFO Bill-by-Bill Settlement Engine and real-time Ageing Workbench:

1. **Customer Counter Receipt Voucher Cockpit (`[F6] Receipt`, `/receipt`, `/finance/receipt`)**:
   - High-speed keyboard-first interface (`ReceiptPaymentVoucher.tsx`) designed for rapid chemist counter collections.
   - Neumorphic Forest Green enterprise design, hotkey navigation (`[F7]` Party Picker, `[F6]/[F5]` Voucher Switch, `[Alt+A]` FIFO Allocation, `[Ctrl+S]` Save).
   - Document Series continuation (`incrementSeries`) persisting sequence across browser sessions (`localStorage` tracking `lastReceiptVoucherNo`).
   - Payment instrument modes: Cash, Cheque, NEFT/RTGS, UPI with instrument metadata capture (cheque number, UTR reference, issuing bank).

2. **Supplier Outward Payment Voucher Cockpit (`[F5] Payment`, `/payment`, `/finance/payment`)**:
   - Outward creditor disbursements matching supplier purchase bills.
   - Automated debit to Creditor ledger and credit to Cash/Bank ledger with instant balance reconciliation.

3. **Bill-by-Bill Allocation Engine (`invoice_allocations` table & DOC-07)**:
   - **Chronological FIFO Auto-Allocation (`[Alt+A]`)**: Automatically assigns receipt/payment funds across oldest open invoices first until the amount is fully exhausted.
   - **Partial Bill Settlement**: Automatically tracks partial settlements, remaining net due, and days overdue per bill.
   - **Floating On-Account Advances (`is_floating=True`)**: Unallocated surplus is preserved as floating credit available for automated deduction on future billings.
   - **Credit/Debit Note Offsetting**: Target settlement against credit notes (`target_cn_dn_id`) and invoices (`target_invoice_id`).

4. **Debtor & Creditor Outstanding Ageing Workbench (`/finance/outstanding`)**:
   - Real-time ageing engine categorizing open ledger balances across statutory buckets: `0–30 Days (Current)`, `31–60 Days`, `61–90 Days`, and `90+ Days Overdue`.
   - Dual-perspective analysis: Chemist Debtor Receivables vs. Supplier Creditor Payables.
   - Expandable Bill Drawers: Click any party row to expand full invoice-level audit detailing Bill Number, Date, Invoice Value, Settled Amount, Net Due, Overdue Days, and Ageing Bracket.
   - One-Click Cross-Navigation: `[Receive ↗]` and `[Pay ↗]` buttons immediately navigate to counter vouchers pre-filtered for the party.
   - Export CSV capability generating instant spreadsheets of ageing statements.

5. **Master Automated Selenium Suite (`test_receipt_payment_settlement_selenium.py`)**:
   - Automated headless Chrome verification suite validating all 6 core stages:
     - Stage 1: Admin authentication & session token issuance.
     - Stage 2: Direct backend API validation of pending allocations (`GET /api/finance/allocations/pending`, 237 open items) and ageing endpoints (`GET /api/finance/outstanding`).
     - Stage 3: Headless browser session launch with local storage hydration.
     - Stage 4: Customer Receipt Voucher creation (Apollo Pharmacy, ₹750.00), FIFO auto-allocation across 2 open invoices, modal confirmation, GL posting, and sequence advancement to `RCP-0002`.
     - Stage 5: Supplier Payment Voucher creation (Sun Pharma Ltd., ₹600.00), FIFO allocation against purchase bill `PB-TEST-49EF`, double-entry GL posting, and sequence advancement to `PMT-0002`.
     - Stage 6: Ageing Workbench verification, KPI card metric validation, Payables tab switching, and expandable supplier bill drawer audit.
   - **Result**: 100% Pass (Exit Code 0).


### 10.10 Journal Voucher, Accounting Adjustment & Accrual Engine (DOC-25)

The ERP incorporates an enterprise Journal Voucher, Accounting Adjustment & Accrual Management Engine (DOC-25):

1. **Keyboard-First Multi-Leg Entry Cockpit (/journal, /finance/journal)**:
   - Neumorphic Forest Green cockpit (JournalVoucherEntry.tsx) designed for multi-leg accounting entries with series rollover (JV-0001 -> JV-0002).
   - Dynamic Auto-Balance ([Ctrl+B]): Computes the debit-credit delta and automatically creates or updates the balancing row with the required Cr/Dr amount.
   - Hotkeys: [Ctrl+B] Auto-Balance, [Ctrl+D] Duplicate row, [Alt+A] Add line, [Alt+S] / [Ctrl+S] Save voucher.
   - Pinned running totals bar: Real-time Total Dr, Total Cr, Difference counter, and status pill (BALANCED in green vs. OUT OF BALANCE in red).
   - Strict double-entry invariant: Rejects any unbalanced entry with HTTP 400 Bad Request.

2. **6 Statutory Transaction Classifications**:
   - Standard Manual Journal, Accrual Journal, Provision, Prepaid / Deferred Adjustment, Reclassification / Transfer, Opening Balance Adjustment.

3. **Accrual & Auto-Reversal Scheduler Engine**:
   - Selecting Accrual Journal activates the Auto-Reversal Scheduler, pre-populating a scheduled reversal date (default 1st of next month) and serializing metadata into the voucher.

4. **Journal Register & Audit Workbench (/finance/journal-register)**:
   - Central audit register with KPIs: Total Journals, Total Volume (Rs.), Active Accruals, and Reversals Posted.
   - Classification filter, status filter, date range pickers, and live search.
   - Expandable row drawers displaying full multi-leg entry accounts and Debit/Credit allocations.

5. **Traceable One-Click Atomic Reversal (POST /api/finance/journal/{id}/reverse)**:
   - Atomic GL inversion (Dr -> Cr, Cr -> Dr) neutralizing account balances while preserving immutable audit trails.
   - Bidirectional linkage (`reversal_voucher_id`) and status transition to `Reversed`.

6. **Master Automated Selenium Suite (`test_journal_accrual_engine_selenium.py`)**:
   - Automated 6-stage headless Chrome verification suite validating API endpoints, double-entry enforcement, multi-leg cockpit entry with auto-balance, accrual scheduling, and register one-click reversal.
   - **Result**: 100% Pass (Exit Code 0).

---

### 10.11 Expense, Petty Cash & Employee Reimbursement Engine (DOC-26)

The ERP incorporates a dedicated operational expense and employee reimbursement system (DOC-26):

1. **Enterprise Expense & Petty Cash Cockpit (`/finance/expenses`)**:
   - 4 Live KPI Cards: `Approved Expenses` (₹), `Pending Approvals` count, `Active Advances` (₹), and `Settled Advances` count.
   - 3-Tab Structure:
     - `Expense Claims & Approvals`: Master registry of expense claims with status badges (Draft, Approved, Paid), line count badges, and expandable row drawers.
     - `Employee Advances & Imprest`: Advance issuance and management workbench.
     - `Expense Categories & GL Accounts`: Central catalog of operational expenditure accounts.

2. **Multi-Line Itemization & Advance Settlement**:
   - `ExpenseClaimEntryModal.tsx`: Employee ledger selection, active advance filter, multi-line table with Category, Bill No, Bill Date, Amount, and Line Notes.
   - Dynamic running total recalculation on single keystrokes.

3. **Double-Entry General Ledger Auto-Posting**:
   - One-Click Approval (`POST /api/expenses/claims/{id}/approve`): Automatically posts balanced Journal Voucher to General Ledger:
     - $\text{Cr Employee / Claimant Ledger}$: Total Claim Amount
     - $\text{Dr Expense Category Ledgers}$: Itemized amounts
     - Invariance: $\sum \text{Dr} = \sum \text{Cr}$.

4. **Atomic Advance Settlement**:
   - Linking an active advance serializes `[Advance: {id}]` into remarks; on approval, the backend automatically transitions `EmployeeAdvance.status` to `Settled` and records `voucher_id`.

5. **Auto-Seeded Standard Categories**:
   - Auto-seeded operational expense categories: Travel & Commute, Freight & Cartage, Meals & Entertainment, Office Supplies, Courier, Fuel & Maintenance, Telephone/Internet, Miscellaneous.

6. **Master Automated Selenium Suite (`test_expense_petty_cash_selenium.py`)**:
   - Headless Chrome test suite (1440x950) verifying all 8 stages: API authentication, category discovery, cockpit KPIs, advance issuance (₹5,000.00), multi-line claim submission (₹4,000.00), one-click approval, GL Journal Voucher assertion (`JRN/2026-27/0191`), and advance settlement.
   - **Result**: 100% Pass (Exit Code 0).

7. **Single-Click Direct Operational Expense Cockpit & Live P&L Engine (Overhaul)**:
   - Direct single-screen daily expense entry (`POST /api/expenses/direct`) with explicit Paid From (`Cash in Hand` / `Bank A/c`) and Expense Head selection.
   - Auto-seeding of 10 statutory Indirect Expense ledgers under `group_name = "Indirect Expenses"` ensuring immediate P&L impact.
   - Atomically generates balanced Payment vouchers (`Dr Expense Head`, `Cr Cash/Bank`) committed to the Day Book and General Ledger.
   - Dynamic Live Accounting Impact Box displaying Dr, Cr, and Net Profit reduction before submitting.
   - Operational Expense Register with fast action links: `[P&L ↗]`, `[DayBook ↗]`, and `[View Ledger ↗]`.
   - Verified 100% Pass via backend suite (`test_direct_expense_pnl.py`) and Selenium suite (`test_direct_expense_ui_selenium.py`).

---

### 10.12 Universal Escape Key Navigation & Application Exit Modal (DOC-27)

1. **Hierarchical Modal and Drawer Dismissal**:
   - Pressing `Esc` first closes any open dialogs, modal forms, popovers, or Ag-Grid slide-over drawers (e.g. `PartySearchModal`, `DiffDrawer`, `NewClaimModal`, `NewContractModal`).
   - If no modals are open, pressing `Esc` on any secondary or sub-screen navigates backward to the Counter Workbench (`/`).
   - Pressing `Esc` on the Counter Workbench (`/`) triggers the high-contrast Application Exit Confirmation Modal (`#modal-exit-app`).

2. **Application Exit Confirmation Modal (`#modal-exit-app`)**:
   - Dialog prompt: "Are you sure you want to exit the application?"
   - Zero-Mouse Controls: Pressing `Enter` commits the exit/logout; pressing `Esc` dismisses the prompt and stays on Counter Workbench.
   - Verified 100% Pass via `test_esc_navigation_and_cargo_flow_selenium.py`.

---

### 10.13 Visual Workflow Designer & Multi-Tier Approval Automation Engine (DOC-28)

1. **Universal Business Workflow Architecture (`/workflow`)**:
   - Multi-tier Maker-Checker authorization engine for sales bills, purchase orders, credit overrides, price adjustments, and expense disbursements exceeding user threshold limits.
   - Fast access via global keyboard shortcut `[F4]` and top navigation `Workflows [F4] ▾`.

2. **3 Integrated Operational Workspaces**:
   - `Approval Inbox [F4]` (`/workflow/inbox`): Master queue of pending authorization requests with 1-click Approve, mandatory remarks Rejection modal, and SLA countdown timers.
   - `Visual Workflow Designer` (`/workflow/designer`): Node-based visual graph builder configuring approval chains, condition filters (e.g. `Bill Amount > ₹75,000`), and escalation policies.
   - `Execution & SLA Monitor` (`/workflow/monitor`): Real-time monitor tracking active workflow instances, approval throughput, and SLA violations.

3. **Master Verification Suite**:
   - Verified 100% Pass via `test_workflow_approval_automation_selenium.py`.

---

### 10.14 Executive BI Control Center & Regional Sales Intelligence Map (DOC-29)

1. **Dual BI Dashboard Architecture (`/dashboard`, `/`)**:
   - `Executive BI Dashboard` (`/dashboard`): 7-month comparative revenue and collection trends, gross margin curves, and operating expense donut charts.
   - `Counter Workbench` (`/`): High-speed cashier and billing station with 9 quick launcher tiles (`[F2]` Sales, `[F5]` Payment, `[F6]` Receipt, `[Ctrl+1]` Cargo, `[Ctrl+2]` Freight, `[Ctrl+3]` Principal, `[Ctrl+4]` Commission, `[Ctrl+6]` Radar).

2. **Interactive Regional Sales Intelligence Map**:
   - SVG vector map modal displaying territory sales density, state-wise revenue concentration, and branch collection velocity.

3. **Master Verification Suite**:
   - Verified 100% Pass via `test_dashboard_bi_control_center_selenium.py`.

---

### 10.15 Cryptographic Audit Trail & MCA Data Governance Engine (DOC-30)

1. **Immutable Cryptographic Hash Chaining (`/audit`)**:
   - SHA-256 hash chaining connecting each system transaction to its predecessor: $	ext{Hash}_n = 	ext{SHA256}(	ext{Hash}_{n-1} + 	ext{Payload}_n)$.
   - Real-time tamper detection traversal algorithm verifying 100% chain integrity.

2. **Slide-Over Forensic Diff Drawer (`[Enter]`, `#drawer-audit-diff`)**:
   - Visual before/after JSON diff highlighting modified, added, and deleted fields with sensitive PII masking.
   - Digitally sealed auditor evidence pack export (`[E]`, `#btn-export-evidence-pack`).

3. **MCA Data Governance Console (`/audit/governance`)**:
   - Statutory 2,920-day (8-year) MCA and GST retention rule enforcement.
   - Litigation preservation legal holds (`#btn-apply-legal-hold`) and after-hours anomaly velocity radar.

4. **Master Verification Suite**:
   - Verified 100% Pass via `test_audit_governance_selenium.py`.

---

### 10.16 Multi-Enterprise Logistics & Cargo Consignment Board (DOC-31)

1. **Kanban Logistics Consignment Board (`/cargo`, `[Ctrl+1]`)**:
   - Real-time shipment status transitions: `PLANNED` &rarr; `LOADED` &rarr; `IN_TRANSIT` &rarr; `OUT_FOR_DELIVERY` &rarr; `DELIVERED` &rarr; `EXCEPTION`.
   - Consignment Registration modal (`[F6]`, `#btn-register-consignment`) with IATA volumetric CBM auto-calculator ($	ext{CBM} = (L 	imes W 	imes H) / 5000$).
   - Slide-over consignment detail drawer with barcode tracking and package manifests.

2. **Cargo Cost Allocation Center (`/cargo/costs`)**:
   - Multi-client freight MIS toggle (`#toggle-combined-reporting`) isolating single-tenant vs consolidated enterprise freight expenditure.

3. **POD & Transit Exception Desk (`/cargo/pod-exceptions`)**:
   - Proof of Delivery filing with itemized accepted vs short/damaged quantities and damage claim creation.

4. **Master Verification Suite**:
   - Verified 100% Pass via `test_cargo_consignment_selenium.py`.

---

### 10.17 Multi-Enterprise Freight Contracts & Transporter Reconciliation Desk (DOC-35)

1. **Freight Rate Master & Carrier Contracts (`/freight/contracts`, `[Ctrl+2]`)**:
   - Multi-transporter contractual rate cards with vehicle categories (Tata 407, 14ft Canter, 32ft MXL), distance slabs, per-kg/per-km rates, and minimum floor charges.
   - Interactive Calculation Sandbox (`[F4]`, `#tab-btn-sandbox`) evaluating deterministic lane freight with fuel surcharges, loading/unloading hamali, and toll charges.

2. **Transporter Billing & Reconciliation Desk (`/freight/reconciliation`)**:
   - 3-way variance audit matching actual carrier invoices against system LR freight estimates.
   - Tolerances: Green (<2% acceptable variance), Amber (2-5% review required), Red (>5% dispute hold).
   - Generates approved freight liability payment vouchers posted directly to GL Account 5200.

3. **Master Verification Suite**:
   - Verified 100% Pass via `test_freight_logistics_selenium.py`.

---

### 10.18 Principal & C&F Operations Management Control Center (DOC-36)

1. **Principal Control Center (`/principal`, `[Ctrl+3]`)**:
   - Neumorphic Forest Green cockpit with 5 KPI telemetry cards: Custody Stock Value, Open Claims, Settlements, 3-Way Reconciliations, and Admin Freight Subsidy.
   - Quick Principal selector dropdown with instant agreement version synchronization.

2. **4 Operational Workspaces**:
   - `[F2] Custody Inventory Matrix`: Complete physical batch segregation of pharmaceutical formulations under C&F custody, tracking batch numbers, expiry dates, and MRP.
   - `[F3] Claims & Returns Desk` & `[F7] New Claim Modal`: Formal breakage, transit damage, and expiry claims filing with photo proof attachments and mandatory credit note linking.
   - `[F4] 3-Way Reconciliation Workspace`: Reconciles Physical Warehouse Count vs System Inventory vs Principal Consignment Advices.
   - `[F5] Reconstructable Statements Desk`: Full-screen periodic stock and financial reconciliation statement sealed with a SHA-256 cryptographic hash.

3. **Master Verification Suite**:
   - Verified 100% Pass via `test_principal_operations_selenium.py`.

---

### 10.19 Principal & C&F Commission & Recovery Engine (DOC-37)

1. **Commission Control Center (`/commission`, `[Ctrl+4]`)**:
   - 6 KPI metric cards: Earned Commission, Recoverable Ancillaries, Net Commercial Total, Open Claims Desk, Settled Remittances, and Active Agreements.
   - 4-Pillar Deal Terms Matrix: Contractual deal terms for Godown Rent, Staff Salary, Freight Reimbursement, and Sales Commission %.

2. **Deterministic Calculation Sandbox & Trace (`[F3]`)**:
   - Evaluates active commission rules deterministically, generating an immutable SHA-256 hash for every calculation record.
   - Dynamic month-to-month overrides for actual payroll and warehouse lease fluctuations.

3. **Recovery Claims Desk & Inward Purchase Dual-Posting (`[F4]`)**:
   - 4-eyes claim approval batching (`CLM-REC-YYYY-XXXX`).
   - Atomic Dual-Posting Engine: Generates Outward Service Invoices (`SINV-2026-XXXX`) and automatically creates and posts Inward Service Purchase Bills (`PUR-SRV-2026-XXXX`) directly into the Purchase Register (`/purchase/list`).

4. **Master Verification Suite**:
   - Verified 100% Pass via `test_commission_recovery_selenium.py`.

---

### 10.20 Enterprise Multi-Client Operations Tracking & Radar Engine (DOC-38)

1. **Enterprise Operations Radar (`/admin/tracking`, `/tracking`, `[Ctrl+6]`)**:
   - Multi-tenant supervisory console designed for holding corporations and C&F agencies managing multiple client companies (e.g. *KRISHNA MEDICAL AGENCIES*, *Test Org*).
   - Apex Scope Selector: Instantly toggles between **Consolidated Multi-Client Radar** (`ALL`) and individual client isolation without data leakage.

2. **4 Neumorphic KPI Cards & Workspaces**:
   - Total Sales Turnover, Total Expenses & C&F, Cargo & Consignments (with in-transit pulse), and Clients & Product Brands.
   - `[F2] Client Scorecards`: Comparative matrix table ranking clients with 1-click **Drilldown** action.
   - `[F3] Sales Tracking`: Cross-client sales invoice ledger with client name badges.
   - `[F4] Expenses Tracking`: Multi-client operational claims ledger (godown rent, salaries, freight).
   - `[F6] Cargo Tracking`: Logistics pipeline tracking vehicle numbers, transporter, route hubs, and status.
   - `[Esc]`: Universal return to Counter Workbench (`/`).

3. **Master Verification Suite**:
   - Verified 100% Pass via `test_admin_enterprise_tracking_selenium.py`.

---

### 10.21 Top Navigation Bar High-Density Screen Ergonomics & Ergonomic Menu Layout (DOC-39)

1. **10-Category Non-Overflow Architecture (`Header.tsx`)**:
   - Refactored top green bar from 13+ raw items into **10 streamlined parent categories**:
     `Dashboard`, `Master ▾`, `Finance & Accounting ▾`, `Inventory ▾`, `Sales & Purchase ▾`, `C&F & Logistics ▾`, `Workflows [F4] ▾`, `GST & Compliance ▾`, `CRM & Admin ▾`, `Reports ▾`.
   - Occupies exactly 1422px in standard viewports (1366px, 1440px) with **zero horizontal overflow** or text clipping.

2. **C&F & Logistics Dropdown Submenu**:
   - Consolidated 8 operational modules: Principal Operations, C&F Commission Engine, Admin Multi-Client Radar, Cargo Board, Freight Contracts, Transporter Recon, Cargo Cost Center, and POD Exception Desk.

3. **Zero-Mouse Keyboard Accessibility**:
   - Traps arrow key navigation (`ArrowDown`, `ArrowUp`, `ArrowRight`, `ArrowLeft`), `Enter` navigation, and universal `Esc` dismissal with focus return.

---

### 10.22 Client Management C&F Commission & Expense Reimbursement Billing Engine with Bilateral Inward/Outward Dual-Posting (DOC-40)

1. **Real-World C&F Client Billing Context**:
   - Enables the Main Admin Company (acting as C&F Agent) to bill client companies registered in Client Management (*KRISHNA MEDICAL AGENCIES*) for sales commission and reimbursable depot operating expenses.
   - Accessible via **`C&F & Logistics ▾`** &rarr; **`C&F Commission & Recovery Engine`** &rarr; **`[F5] Client C&F Billing Desk`** (`#tab-btn-client-billing`).

2. **1-Click Auto-Fetch Telemetry (`#btn-autofetch-client-telemetry`)**:
   - Inspects client turnover, calculates percentage commission (e.g., 5.0%), and aggregates depot operating expenses (godown rent, staff salaries, transport recharges).
   - Dual workspaces allow flexible manual adjustments before invoicing.

3. **Live Itemized Invoice Line Items Table & Financial Summary**:
   - Real-time line item preview: Sales Commission, Godown Storage Rent, Depot Staff Salaries, Transport/Freight Reimbursement, and Handling Charges.
   - Classified under GST Service Accounting Code **SAC 998599 (C&F Support Services)** with configurable GST rate (default 18%).

4. **Bilateral Inward/Outward Dual-Posting Engine (`#btn-generate-client-bill`)**:
   - **Outward Bill in Main Admin**: Generates commercial bill in Billing (`models.Invoice` with `invoice_type="bill"`, e.g. `CF-BILL-2026-0002`).
   - **Inward Purchase Bill in Client Organization**: When `#check-dual-post-purchase` is active, automatically creates inward purchase bill (`models.Invoice` with `invoice_type="purchase-bill"`, e.g. `PUR-CF-2026-0002`) inside the client company's account partition so both entities' books balance simultaneously without double entry.
   - **Commission Engine Audit Ledger**: Generates `models.CommissionCalculation` records linked to `models.CommissionEvent`, and an approved `models.RecoveryClaim`.

5. **Success Card & History Register**:
   - Glowing feedback card (`#generated-bill-success-card`) with direct buttons to **View in Billing Desk [F7]** and **View in Purchase Register [F9]**.
   - Historical audit log table recording all past client bills and dual purchase references.

6. **Master Automated Selenium Suite (`test_client_commission_billing_selenium.py`)**:
   - Verified 100% Pass across all 13 stages with Exit Code 0.

---

### 10.23 Pharma Expiry Radar, Stock Shift Quarantine Engine & Principal Debit Note Settlement Desk (DOC-41)

1. **Pharma Expiry Surveillance & Breakage Cockpit (`/inventory-dashboard`, `/inventory/dashboard`)**:
   - Replaces static mock counters with real-time aggregate inventory telemetry:
     - Main Saleable Stock Value (`Batch.current_stock`) and physical unit count.
     - Quarantined / Brk-Exp Stock Value (`Batch.brk_exp_stock`) and physical unit count.
     - 90-Day Near-Expiry Surveillance Value across active risk batches.
     - Principal Claims Exposure & Pending Debit Note claims count.
   - Accessible via **`Inventory ▾`** &rarr; **`Expiry & Breakage Cockpit`** or direct route `/inventory-dashboard`.

2. **Real-Time Expiry Radar Engine (`[F2]`, `#tab-btn-radar`)**:
   - Classifies active inventory batches into 4 critical surveillance horizons:
     - 🔴 **Expired** ($\le 0$ days)
     - 🟠 **< 30 Days** (Critical)
     - 🟡 **< 60 Days** (Warning)
     - 🔵 **< 90 Days** (Attention)
   - Filterable by Manufacturer / Principal (`#filter-company-select`) and SKU/Batch search (`#search-batches-input`).
   - Interactive batch selection checkboxes with live selection valuation banner.
   - 1-Click **⚡ Shift to Quarantine [F7]** action button (`#btn-shift-selected-action`).

3. **Atomic Stock Shift Desk (`/stock-shift`, `StockShiftVoucher.tsx`)**:
   - Pre-populates selected radar batches into line items grid (`#tbl-shift-items`).
   - Source Godown (`#select-from-godown`, default `MAIN_SALEABLE_GODOWN`) and Destination Godown (`#select-to-godown`, default `QUARANTINE_EXPIRY_GODOWN`).
   - Enforces real-time stock availability validation (prevents over-shifting beyond physical stock).
   - Atomic database transaction (`POST /api/stock/shifts`): decrements `current_stock` and increments `brk_exp_stock` in `models.Batch`.
   - Records immutable `models.StockShiftVoucher` (`SHF-2026-XXXX`) and `models.StockShiftItem`s.

4. **Automated Principal Claim & Debit Note Bridging (`#check-auto-claim`)**:
   - When checked, automatically generates a formal `models.PrincipalClaim` (`CLM-PRN-YYYY-XXXX`) of type `EXPIRY` and itemized `models.PrincipalClaimLine`s under the selected Principal (*Sun Pharma*, *Cipla*, *Krishna Medical Agencies*).
   - Generates debit note reference and links `voucher.principal_claim_id = claim.id` for end-to-end auditability.
   - Success feedback card (`#stock-shift-success-card`) displaying generated Voucher No (`#lbl-success-voucher-no`) and Claim No (`#lbl-success-claim-no`) with direct navigation to **View in Audit Register [F2]** and **Open Claim Desk [F8]** (`/principal`).

5. **Quarantine Godown Ledger (`[F3]`) & Stock Shift Audit Register (`[F4]`)**:
   - `[F3] Quarantine Godown Stock`: Real-time view of segregated damaged and expired stock blocked from billing, with direct `#btn-file-principal-claim-quarantine`.
   - `[F4] Stock Shift Audit Register`: Historical audit table (`#tbl-shift-audit`) tracking all `SHF-2026-XXXX` vouchers with status badges and linked `CLM-PRN-XXXX` claim references.

6. **Master Automated Selenium Suite (`test_pharma_expiry_quarantine_selenium.py`)**:
   - Verified 100% Pass across all 13 stages with Exit Code 0:
     - Stage 1-2: Auth & telemetry verification (105,228 units, ₹1,80,39,497.67).
     - Stage 3-6: Cockpit launch, title, DOC-41 badge, and 4 scorecards.
     - Stage 7-9: Radar table, bucket filters, batch selection, and shift transition.
     - Stage 10-12: Stock shift configuration, save execution, and success card verification (`SHF-2026-0001` & `CLM-PRN-2026-0006`).
     - Stage 13: Audit table assertion, quarantine stock update (+148 units = 303 units, ₹41,799), and Principal claims desk integration.

---

### 10.24 Master Software Comprehensive System Audit & Exhaustive Screen-by-Screen Element Directory

1. **System Navigation Standard & 10 Top-Level Navigation Menus**:
   - `Dashboard` (`/`): Counter Workbench, quick operational launcher tiles, and Esc exit modal (`#modal-exit-app`).
   - `Master ▾`:
     - Ledger: New (`/master?tab=ledger&action=new`), Modify (`/master?tab=ledger&action=modify`), Delete (`/master?tab=ledger&action=delete`).
     - Masters: Business Partners (`/master/parties`), Salt (`/master?tab=salt`), Company (`/master?tab=company`), HSN (`/master?tab=hsn`), State (`/master?tab=state`), O/C Balances (`/master?tab=balances`), Account Heads (`/master/ledger-groups`), Principal Master (`/master/principals`), Warehouse Master (`/master/warehouses`), Transport Master (`/master/transport`), Document Series (`/series-master`), Scheme Master (`/master/schemes`), Pricing Master (`/master/pricing`), Crash Recovery (`/master/error-entries`).
   - `Finance & Accounting ▾`: Payment Voucher (`/payment`, `[F5]`), Receipt Voucher (`/receipt`, `[F6]`), Journal Voucher (`/journal`, `[Ctrl+B]`), Contra Voucher (`/finance/voucher/contra`), Voucher Register (`/finance/vouchers`), Day Book (`/finance/daybook`), Bank Reconciliation (`/finance/bank-reconciliation`), Fixed Assets (`/finance/fixed-assets`), Expense Management (`/finance/expenses`), Ledger Statement (`/finance/ledger-statement`), Trial Balance (`/finance/trial-balance`), Profit & Loss (`/finance/profit-loss`), Balance Sheet (`/finance/balance-sheet`), Scheme Claims (`/finance/claims`), Ledger Groups (`/master/ledger-groups`), Accounts & Ledgers (`/finance`).
   - `Inventory ▾`: Product Create/Modify (`/inventory`), View Stock (`/stock`), Brk/Exp Stock (`/brk-exp-stock`), Expiry & Breakage Cockpit (`/inventory-dashboard`, `[F2]`), Internal Expiry Shift (`/stock-shift`, `[F7]`), Reorder Engine (`/inventory/replenishment`).
   - `Sales & Purchase ▾`: Sales Order (`/sales-order-master`), Order Approvals (`/order-approvals`), Dispatch & POD (`/dispatch-manager`), Billing Consolidation (`/billing-consolidation`), Sales Bill (`/sales?type=bill`, `[F2]`), Challan, Sales Return (`/sales-return`), Purchase Order (`/po`), GRN (`/grn`), Vendor Complaints (`/vendor-complaints`), Purchase Bill (`/purchase?type=bill`), Purchase Challan, Debit Note (`/purchase-return`), Breakage Receive (`/brk-receive`), Breakage Issue (`/brk-issue`), Stock Issue, Stock Receive.
   - `C&F & Logistics ▾`: Principal & C&F Operations (`/principal`, `[Ctrl+3]`), C&F Commission & Recovery Engine (`/commission`, `[Ctrl+4]`), Admin Multi-Client Radar (`/admin/tracking`, `[Ctrl+6]`), Cargo & Consignment Board (`/cargo`, `[Ctrl+1]`), Freight Contracts & Rates (`/freight/contracts`, `[Ctrl+2]`), Transporter Reconciliation (`/freight/reconciliation`), Cargo Cost Center (`/cargo/costs`), POD & Transit Exception Desk (`/cargo/pod-exceptions`).
   - `Workflows [F4] ▾`: Approval Inbox (`/workflow/inbox`, `[F4]`), Rule Designer (`/workflow/designer`), Execution & SLA Monitor (`/workflow/monitor`), Audit Trail Explorer (`/audit`), Data Governance Console (`/audit/governance`).
   - `GST & Compliance ▾`: GSTR-1 (`/gst?tab=gstr1`), GSTR-2 (`/gst?tab=gstr2`), GSTR-3B (`/gst?tab=gstr3b`), Finance Reports (`/finance-reports`), Compliance Workbench (`/compliance`), Signed Ledger (`/compliance/signed`).
   - `CRM & Admin ▾`: CRM Dashboard (`/crm`), Client Management (`/clients`), Admin Multi-Client Radar (`/admin/tracking`), Product Companies Master (`/master/companies`), Bulletin Board (`/bulletin`), Settings (`/settings`).
   - `Reports ▾`: Report Viewer (`/reports`), Custom Report Designer (`/reports/designer`).

2. **Counter Workbench Launcher Hotkeys (`/`)**:
   - `[F2]`: Sales Counter Billing
   - `[F5]`: Supplier Payment Voucher
   - `[F6]`: Customer Receipt Voucher
   - `[Ctrl+1]`: Cargo & Consignment Management Board
   - `[Ctrl+2]`: Freight Contracts & Carrier Rate Master
   - `[Ctrl+3]`: Principal Operations & Custody Control Center
   - `[Ctrl+4]`: C&F Commission & Recovery Engine
   - `[Ctrl+5]`: Product Company Master & Manufacturer Desk
   - `[Ctrl+6]`: Enterprise Multi-Client Operations Radar
   - `[Esc]`: Application Exit Confirmation Modal (`#modal-exit-app`)

3. **Master Screen-by-Screen UI Element & Selector Catalog**:
   - **Receipt Voucher (`/receipt`)**: `#voucher-series-input`, `#party-search-input` `[F7]`, `#btn-auto-allocate-fifo` `[Alt+A]`, `#btn-post-voucher` `[Ctrl+S]`.
   - **Payment Voucher (`/payment`)**: `#voucher-series-input`, `#party-search-input` `[F7]`, `#btn-auto-allocate-fifo` `[Alt+A]`, `#btn-post-voucher` `[Ctrl+S]`.
   - **Sales Bill (`/sales`)**: `#input-bill-series`, `#btn-search-party` `[F7]`, `#grid-bill-items`, `#btn-batch-modal` `[F3]`, `#btn-settlement-modal` `[End]`, `#btn-save-bill` `[Ctrl+S]`.
   - **Purchase Bill (`/purchase`)**: `#input-purchase-series`, `#input-vendor-inv-no`, `#btn-search-vendor` `[F7]`, `#btn-save-purchase` `[Ctrl+S]`.
   - **Debit Note (`/purchase-return`)**: `#btn-mode-against-bill` `[F2]`, `#btn-mode-loose` `[F3]`, `#select-stock-disposition`, `#btn-save-debit-note` `[Ctrl+S]`.
   - **Credit Note (`/sales-return`)**: `#btn-mode-against-bill` `[F2]`, `#btn-mode-counter` `[F3]`, `#btn-save-credit-note` `[Ctrl+S]`.
   - **Breakage Receive (`/brk-receive`)**: `#input-bkr-series`, `#btn-save-bkr` `[Ctrl+S]`.
   - **Breakage Issue (`/brk-issue`)**: `#input-bki-series`, `#btn-save-bki` `[Ctrl+S]`.
   - **Journal Voucher (`/journal`)**: `#input-journal-series`, `#btn-auto-balance-gl` `[Ctrl+B]`, `#btn-add-journal-leg` `[Alt+A]`, `#check-schedule-accrual`, `#btn-post-journal` `[Ctrl+S]`.
   - **Expenses Desk (`/finance/expenses`)**: `#input-expense-amount`, `#select-expense-account`, `#btn-post-expense`.
   - **Bank Reconciliation (`/finance/bank-reconciliation`)**: `#btn-auto-match-brs`, `#btn-cash-drawer-tally` `[F8]`.
   - **GST Desk (`/gst`)**: `#tab-btn-gstr1`, `#tab-btn-gstr2`, `#tab-btn-gstr3b`, `#btn-export-gstn-json`.
   - **Cargo Board (`/cargo`)**: `#btn-register-consignment` `[F6]`, `#drawer-consignment-detail`, `#toggle-combined-reporting`.
   - **Freight Master (`/freight/contracts`)**: `#btn-new-contract` `[F2]`, `#tab-btn-sandbox` `[F4]`, `#btn-enter-transporter-bill`.
   - **Principal Desk (`/principal`)**: `#kpi-active-principals`, `#tab-btn-stock` `[F2]`, `#tab-btn-claims` `[F3]`, `#btn-open-claim-modal` `[F7]`, `#tab-btn-statement` `[F5]`.
   - **Commission Desk (`/commission`)**: `#tab-btn-agreements` `[F2]`, `#tab-btn-sandbox` `[F3]`, `#tab-btn-claims` `[F4]`, `#tab-btn-client-billing` `[F5]`, `#client-billing-org-select`, `#btn-autofetch-client-telemetry`, `#check-dual-post-purchase`, `#btn-generate-client-bill`, `#generated-bill-success-card`.
   - **Admin Multi-Client Radar (`/admin/tracking`)**: `#select-tracking-scope`, `#card-tracking-sales`, `#card-tracking-expenses`, `#card-tracking-cargo`, `#card-tracking-clients`, `#tab-btn-scorecards` `[F2]`, `#tab-btn-sales` `[F3]`, `#tab-btn-expenses` `[F4]`, `#tab-btn-cargo` `[F6]`.
   - **Pharma Expiry Cockpit (`/inventory-dashboard`)**: `#card-main-stock`, `#card-quarantine-stock`, `#card-near-expiry-risk`, `#card-claim-exposure`, `#tab-btn-radar` `[F2]`, `#filter-bucket-ALL`, `#filter-bucket-EXPIRED`, `#filter-bucket-30_DAYS`, `#filter-bucket-60_DAYS`, `#filter-bucket-90_DAYS`, `#btn-shift-selected-action` `[F7]`, `#tab-btn-quarantine` `[F3]`, `#tab-btn-history` `[F4]`.
   - **Stock Shift Desk (`/stock-shift`)**: `#select-from-godown`, `#select-to-godown`, `#check-auto-claim`, `#select-principal-claim-target`, `#tbl-shift-items`, `#btn-save-shift-voucher` `[F7]`, `#stock-shift-success-card`, `#lbl-success-voucher-no`, `#lbl-success-claim-no`, `#btn-view-in-audit` `[F2]`, `#btn-view-claim-desk` `[F8]`.

4. **Complete 16-Suite Automated QA Test Matrix (100% Pass Rate)**:
   - All 16 automated Selenium test suites (`test_master_all_6_modules_selenium.py`, `test_reports_and_finance_selenium.py`, `test_gst_compliance_selenium.py`, `test_receipt_payment_settlement_selenium.py`, `test_journal_accrual_engine_selenium.py`, `test_direct_expense_ui_selenium.py`, `test_fixed_assets_selenium.py`, `test_bank_recon_cash_selenium.py`, `test_dashboard_bi_control_center_selenium.py`, `test_workflow_approval_automation_selenium.py`, `test_audit_governance_selenium.py`, `test_cargo_consignment_selenium.py`, `test_freight_logistics_selenium.py`, `test_principal_operations_selenium.py`, `test_client_commission_billing_selenium.py`, `test_pharma_expiry_quarantine_selenium.py`) verified passing with Exit Code 0 against live PostgreSQL database.

---

### 10.25 Statutory GST E-Way Bill & E-Invoice (IRN) Generation Desk (DOC-42)

#### 1. Statutory Mandate & Legal Framework
Under Rule 138 of the Central Goods and Services Tax (CGST) Rules, 2017 and Rule 48(4) E-Invoicing mandates, all registered pharmaceutical wholesale and distribution enterprises dispatching consignments with invoice valuations $\ge ₹50,000$ (as well as mandatory inter-state supply movements) must generate statutory transit clearances:
- **Invoice Reference Number (IRN)**: 64-character cryptographic SHA-256 hash certified by the Government Invoice Registration Portal (IRP).
- **Signed Digital QR Code**: Machine-readable cryptographic token for transit inspection officers verifying supplier GSTIN, recipient GSTIN, document number, date, HSN, and gross valuation.
- **Electronic Way Bill (E-Way Bill)**: 12-digit transit certificate consisting of **Part A** (Consignment and invoice metadata) and **Part B** (Conveyance vehicle registration, transport mode, and transporter identification).

#### 2. Enhanced Database Schema (`backend/models.py`)
Model `EinvoiceEwayLog` enhanced with:
- `transporter_id` (String(100), nullable): Transporter operator identifier (e.g. `TR-DEL-01`).
- `transporter_name` (String(255), nullable): Commercial transporter legal name (e.g. *Delhi-NCR Express Cargo*).
- `transporter_gstin` (String(50), nullable): 15-character statutory GSTIN of the logistics provider.
- `vehicle_no` (String(50), nullable): Motor vehicle registration number (e.g. `DL-01-AB-1234`).
- `vehicle_type` (String(30), default `'REGULAR'`): Cargo type classification (`REGULAR` or `ODC` - Over Dimensional Cargo).
- `distance_km` (Numeric(10, 2), default `100.0`): One-way dispatch distance in kilometers.
- `transport_mode` (String(30), default `'ROAD'`): Statutory transit mode (`ROAD`, `RAIL`, `AIR`, `SHIP`).
- `doc_type` (String(20), default `'INV'`): Statutory document classification (`INV`, `CRN`, `DBN`).
- `supply_type` (String(20), default `'B2B'`): Statutory tax supply category (`B2B`, `B2G`, `EXP`).
- `qr_code_svg` (Text, nullable): Cryptographically generated vector QR code payload.

#### 3. Backend API Directory (`backend/api/compliance.py`)
- `GET /api/compliance/summary`: Computes real-time statutory metrics including total qualifying consignments count and gross valuation, pending E-Way bills count and valuation, generated IRNs count and valuation, live compliance percentage rating, and registered transporter fleet profiles.
- `GET /api/compliance/invoices`: Returns filterable qualifying consignments register with query parameters `status` (`ALL`, `PENDING_EWAY`, `PENDING_IRN`, `COMPLETED`), `search`, and `limit`.
- `POST /api/compliance/generate-eway-irn`: Atomically generates 64-character cryptographic SHA-256 IRN hash, 15-digit Ack No, 12-digit E-Way Bill Number (starting with `24`), validity period based on journey distance (1 day per 200 KM as per Rule 138), and signed digital QR code payload. Creates or updates `EinvoiceEwayLog` with status `SUCCESS`.
- `GET /api/compliance/eway-slip/{invoice_id}`: Returns complete structured CBIC official two-part delivery slip format including Part A (Supplier/Recipient GSTINs, addresses, document details, valuation, HSN `3004 - Medicaments`, reason for transport) and Part B (Vehicle `DL-01-AB-1234`, Road mode, entered date, transporter details).
- `POST /api/compliance/export-nic-json`: Generates official National Informatics Centre (NIC) Schema 1.1 bulk upload JSON payload including `TranDtls`, `DocDtls`, `SellerDtls`, `BuyerDtls`, `ItemList`, `ValDtls`, and `EwbDtls`.

#### 4. Master UI Elements in `ComplianceWorkbench.tsx` (`/compliance`)
Built with the Flagship Neumorphic Forest Green design system (`#1b4332`, `#2d6a4f`, `#eef2ef`):
- **Apex Operational Banner**:
  - Title: `Statutory GST E-Way Bill & E-Invoice Desk (DOC-42)` with `NIC & CBIC COMPLIANT` badge.
  - Buttons: `#btn-back-gst` (`[Esc]`), `#btn-refresh-compliance` (`[F5]`), `#btn-open-transport-modal` (`[F7]`), `#btn-export-nic-json` (`[F8]`).
- **4 Live Telemetry Scorecards**:
  - `#card-qualifying-invoices`: Total Qualifying Consignments ($\ge ₹50,000$ & B2B) and gross consignment value.
  - `#card-pending-eway`: Consignments pending Part B vehicle transport slips and pending value.
  - `#card-generated-irn`: Invoices with certified IRN cryptographic hashes and verified valuation.
  - `#card-compliance-rate`: Live statutory compliance rating and color-coded progress bar.
- **3 Operational Tabs**:
  - `[F2] Qualifying Invoices Desk` (`#tab-qualifying-invoices`): Active queue with filter pills (`#btn-filter-all`, `#btn-filter-pending-eway`, `#btn-filter-pending-irn`, `#btn-filter-compliant`), instant search (`#search-compliance-input`), master checkbox (`#btn-select-all-compliance`), and consignment table (`#tbl-qualifying-invoices`).
  - `[F3] E-Way & IRN Register` (`#tab-eway-register`): Audit registry table (`#tbl-compliance-history`) displaying Doc No, Party, IRN, Ack No, EWB No, Validity, Vehicle, and 1-Click Print Slip trigger (`#btn-print-eway-slip-{id}`).
  - `[F4] NIC JSON Export Center` (`#tab-nic-center`): Syntax-highlighted bulk upload JSON viewer and 1-click download button (`#btn-download-nic-json`).
- **Transporter & Vehicle Assignment Modal (`#modal-transport-assignment`)**:
  - `#select-transporter`: Pre-configured fleet operators with GSTINs and default distance.
  - `#input-vehicle-no`: Vehicle registration input (e.g. `DL-01-AB-1234`).
  - `#input-transport-distance`: Journey distance in KM with live CBIC validity calculation preview.
  - `#select-transport-mode`: Road (1), Rail (2), Air (3), Ship (4).
  - `#select-vehicle-type`: Regular Cargo Carrier or Over Dimensional Cargo (ODC).
  - `#toggle-gen-eway` & `#toggle-gen-irn`: Statutory document output toggles.
  - `#btn-confirm-generate-compliance`: 1-Click generation execution button.
- **Printable CBIC E-Way Bill Slip Modal (`#modal-eway-slip-preview`)**:
  - Official Government of India CBIC header, Part A consignment table, Part B vehicle conveyance table, high-contrast signed digital QR code representation, and `#btn-print-slip-dialog` print action.

#### 5. Automated Selenium Suite & 17-Suite QA Test Matrix
- **Script**: `test_gst_einvoice_eway_selenium.py` (13 stages, Exit Code 0, 100% Passed).
- **Verified Visual Proof Artifacts**:
  - `verified_transport_assignment_modal.png`: Transporter selection, vehicle `DL-01-AB-1234`, distance 180 KM, and calculated validity.
  - `verified_compliance_cockpit.png`: 101 qualifying consignments, ₹2,13,32,859 valuation, feedback banner, and register log with EWB `244051149018`.
  - `verified_eway_slip_preview.png`: Official CBIC header, Part A, Part B, signed digital QR representation, and print trigger.
- **Master QA Test Matrix**: 17 Automated Selenium test suites completely verified passing with Exit Code 0.

### 10.26 Statutory Multi-State GSTR-1, GSTR-2B & GSTR-3B Reconciliation Cockpit with Section 16(2)(aa) 2B ITC Matching Engine (DOC-43)

#### 1. Statutory Legislative Framework & Rule Mandates
Under the Goods and Services Tax (GST) framework in India, **Section 16(2)(aa) of the Central Goods and Services Tax (CGST) Act, 2017** prohibits registered persons from availing Input Tax Credit (ITC) unless:
1. The invoice or debit note has been furnished by the supplier in their outward statement (**Form GSTR-1** or Invoice Furnishing Facility - **IFF**); and
2. The details of such invoice have been communicated to the recipient in auto-drafted **Form GSTR-2B**.

Availing credit on supplier invoices missing from GSTR-2B triggers automated scrutiny notices under Form GST DRC-01B, interest liability @ 18% p.a., and mandatory credit reversal under Rule 37A. The GSTR-2B Auto-Drafted ITC Matching Engine provides an enterprise reconciliation workbench correlating inward purchase vouchers against Government GSTR-2B portal statements.

#### 2. Relational Database Schema (`backend/models.py`)
Created table `gstr2b_entries` and model `Gstr2bEntry`:
- `id` (String UUID, Primary Key).
- `organization_id` (String, Foreign Key -> `organizations.id`).
- `supplier_name` (String, Supplier legal entity name).
- `supplier_gstin` (String(15), 15-character statutory GST identification number).
- `invoice_number` (String, Supplier invoice number).
- `invoice_date` (Date, Invoice issuance date).
- `invoice_type` (String, default `'R'` for Regular B2B).
- `place_of_supply` (String(2), 2-digit state code).
- `taxable_value` (Numeric(15,2), Assessable value of supply).
- `cgst` (Numeric(15,2), Central GST).
- `sgst` (Numeric(15,2), State/UT GST).
- `igst` (Numeric(15,2), Integrated GST).
- `cess` (Numeric(15,2), Statutory cess).
- `total_tax` (Numeric(15,2), Sum of CGST, SGST, IGST, and Cess).
- `invoice_value` (Numeric(15,2), Gross invoice total).
- `return_period` (String(6), Month and year e.g. `'102026'`).
- `filing_date` (Date, Date supplier filed GSTR-1).
- `itc_available` (String(1), `'Y'` or `'N'`).
- `reconciliation_status` (String(20), `'PENDING'`, `'CLAIM_ITC'`, `'DISPUTE'`, `'FORCE_MATCH'`, `'REVERSE'`).
- `reconciliation_remarks` (Text, Audit remarks).
- `reconciled_with_voucher_id` (String, Linked ERP purchase voucher ID).
- Indexed on `(organization_id, return_period)`, `supplier_gstin`, and `invoice_number`.

#### 3. Backend Matching Engine & REST APIs (`backend/api/gst.py`)
- `normalize_inv_num(inv: str) -> str`: Normalizes invoice numbers by uppercase conversion, removing special characters (`/`, `-`, `_`, `.`, spaces), and trimming leading zeros (e.g. `INV/2026/0042` -> `INV202642`), preventing mismatches from differing software numbering conventions.
- `GET /api/gst/reconciliation-summary`: Aggregates Safe ITC, At-Risk ITC, Unclaimed ITC, match ratio percentage, and list of available 2-digit GSTIN states with query params `tolerance` and `state_code`.
- `GET /api/gst/reconcile-2b`: Returns dual-ledger paired records categorized into:
  - `MATCHED`: Invoice present in both Books and 2B with tax difference <= tolerance (+-Rs.1, +-Rs.5, +-Rs.10).
  - `TAX_MISMATCH`: Invoice present in both Books and 2B, but tax difference > tolerance.
  - `MISSING_IN_2B`: Inward purchase voucher exists in ERP books, but supplier has not uploaded in GSTR-1/2B (At-risk blocked ITC u/s 16(2)(aa)).
  - `MISSING_IN_BOOKS`: Auto-drafted invoice exists in portal GSTR-2B, but unrecorded in internal accounting ledger (Unclaimed ITC credit).
- `POST /api/gst/reconciliation-action`: Updates status (`CLAIM_ITC`, `DISPUTE`, `FORCE_MATCH`, `REVERSE`) on single or bulk entries with audit remarks.
- `POST /api/gst/import-2b`: Parses and ingests official Government GST Portal JSON return downloads (`docdata.b2b`, `docdata.cdnr`).

#### 4. Master UI Elements in `GstReports.tsx` (`/gst`)
Built in the Flagship Neumorphic Forest Green design system (`#1b4332`, `#2d6a4f`, `#eef2ef`):
- **Tab Header**: `#tab-gstr2b` (`GSTR-2B ITC Matching Engine [F5] Sec 16(2)(aa)`).
- **4 Live Telemetry Scorecards**:
  - `#metric-2b-total-itc`: Total Inward ITC present in GSTR-2B portal statements.
  - `#metric-2b-safe-itc`: Safe & Claimable ITC meeting Section 16(2)(aa) statutory rules.
  - `#metric-2b-match-ratio`: Percentage match ratio badge (e.g., `61.1% Matched`).
  - `#metric-2b-at-risk-itc`: At-Risk Blocked ITC (missing in 2B or tax mismatched).
  - `#metric-2b-unclaimed-itc`: Unclaimed Credit in 2B omitted in internal accounting ledgers.
- **5 Category Filter Pills**:
  - `#filter-recon-all`: All paired records with total count badge.
  - `#filter-recon-matched`: Safe matched records (`#2d6a4f`).
  - `#filter-recon-tax_mismatch`: Records with tax discrepancy exceeding tolerance (`#b45309`).
  - `#filter-recon-missing_in_2b`: Invoices missing from GSTN portal (`#b91c1c`).
  - `#filter-recon-missing_in_books`: Invoices missing from ERP purchase ledgers (`#6d28d9`).
- **Control Bar**:
  - `#btn-open-ingest-2b`: Launches Portal GSTR-2B JSON ingestion modal.
  - `#btn-bulk-approve-itc`: Bulk approves selected rows for GSTR-3B Table 4(A)(5) credit claiming.
  - `#input-recon-search`: Real-time search across Supplier Name, GSTIN, and Invoice Number.
  - `#select-recon-state`: Multi-state filter dropdown based on 2-digit GSTIN state code prefix.
  - `#btn-tolerance-1`, `#btn-tolerance-5`, `#btn-tolerance-10`: 3-tier differential tolerance switcher (+-Rs.1, +-Rs.5, +-Rs.10).
  - `#btn-export-2b-reconciliation`: Exports dual-ledger matching data to Excel format.
- **Dual-Ledger Side-by-Side Reconciliation Table (`#tbl-gstr2b-reconciliation`)**:
  - `#chk-select-all-recon`: Master header checkbox to select/deselect all rows.
  - `#chk-recon-row-{idx}`: Row-level checkbox for batch operations.
  - Status Badge: Displays `MATCHED`, `MISMATCH`, `NOT IN 2B`, or `NOT IN BOOKS`.
  - Supplier & State: Supplier name, 15-char GSTIN, and 2-digit state code.
  - Internal Books (Purchase Ledger): Internal voucher number, supplier invoice number, date, taxable value, and tax breakdown.
  - Government Portal (GSTR-2B): Portal invoice number, date, filing date, taxable value, and tax breakdown.
  - Variance: Real-time difference in tax and taxable value with color-coded alert highlights.
  - Audit Action: `#btn-approve-row-{idx}` (Claim ITC), `#btn-dunning-row-{idx}` (Remind Supplier), `#btn-force-row-{idx}` (Book Inward).
- **Supplier Dunning Notice Dialog (`#modal-supplier-dunning`)**:
  - Displays supplier GSTIN, invoice number, taxable value, and blocked/disputed tax credit.
  - Pre-filled statutory notice body in `#textarea-dunning-message` citing Section 16(2)(aa) CGST Act.
  - Action buttons: `#btn-copy-dunning` (copies notice to clipboard), `#btn-send-whatsapp` (direct WhatsApp Web/Mobile dispatch via `https://wa.me/?text=...`), `#btn-mark-disputed` (flags invoice as disputed), and `#btn-close-dunning-modal` (`[Esc]`).
- **Portal GSTR-2B JSON Ingestion Modal (`#modal-ingest-portal-2b`)**:
  - Accepts official Government GST Portal JSON returns in `#textarea-json-2b`.
  - Action buttons: `#btn-cancel-ingest-modal` (`[Esc]`) and `#btn-submit-ingest-2b` (parses and syncs inward supplies).

#### 5. Automated Selenium Suite & 18-Suite QA Test Matrix
- **Script**: `test_gstr2b_reconciliation_selenium.py` (13 stages, Exit Code 0, 100% Passed).
- **Verified Visual Proof Artifacts**:
  - `verified_gstr2b_telemetry_scorecards.png`: 4 live scorecards (Rs.25.06 Lakhs 2B ITC, Rs.17.56 Lakhs Safe ITC, 61.1% match ratio, Rs.5.35 Lakhs At-Risk, Rs.37.78k Unclaimed).
  - `verified_supplier_dunning_modal.png`: Section 16(2)(aa) statutory notice generator for Torrent Pharma Distributors (`SUP-28071`, Rs.22,449.98 blocked tax) with WhatsApp dispatch and clipboard copying.
  - `verified_gstr2b_ingest_modal.png`: Official GST Portal JSON return ingestion modal with official `docdata` schema.
  - `verified_gstr2b_reconciliation_workbench.png`: Complete dual-ledger side-by-side matching grid with status badges, internal books columns, portal columns, variance, and audit action buttons.
- **Master QA Test Matrix**: 18 Automated Selenium test suites completely verified passing with Exit Code 0.




### 10.27 Enterprise Cloud Authentication, Multi-Tenant Session Recovery & Production Client Onboarding Desk (DOC-44)

#### 1. Statutory & Operational Background
In a multi-tenant enterprise ERP operating across distributed cloud environments (Vercel CDN Edge Network, Render Cloud Services, Neon PostgreSQL AWS Singapore), client administrators and account managers require frictionless, secure access to provision tenant organizations. Under Section 10 (Company & Organization Architecture), the Account Master Admin (`role: "am_admin"`, `org_code: "AM-0001"`) possesses god-mode authority across all business data, whereas Client Module Admins (`role: "cm_admin"`) are strictly bounded to their assigned tenant organization (`organization_id`).

In live web environments where users transition from local demo exploration to live cloud database creation, session recovery and genuine cryptographic JWT token management are vital to prevent unauthorized write rejections (HTTP 401 Unauthorized) when invoking `POST /api/organizations/register`.

#### 2. Relational Database Schema & Authentication Architecture
- **`organizations` Table**:
  - `id` (UUID Primary Key, default `uuid.uuid4`).
  - `name` (String(255), Client trading legal entity name).
  - `org_code` (String(20), Unique remote login code e.g. `KSK-HDA`, `KMA`, `AM-0001`).
  - `is_am` (Boolean, `True` for Account Master organization, `False` for Client Modules).
  - `role_permissions` (JSONB, Granular module-level access rules).
  - `is_active` (Boolean, Soft-deletion flag, default `True`).
- **`users` Table**:
  - `id` (UUID Primary Key).
  - `organization_id` (UUID Foreign Key -> `organizations.id`, `ondelete="CASCADE"`).
  - `name` (String(255), User display name).
  - `username` (String(100), Unique within organization).
  - `hashed_password` (String(255), Bcrypt hashed password with salt).
  - `role` (SAEnum `UserRole`: `AM_ADMIN`, `CM_ADMIN`, `MANAGER`, `AREA_MANAGER`, `STAFF`, `FIELD_STAFF`, `VIEWER`).
- **`sessions` Table**:
  - `id` (UUID Primary Key).
  - `user_id` (UUID Foreign Key -> `users.id`).
  - `token_hash` (String(64), SHA-256 hash of active JWT token).
  - `is_active` (Boolean, Instant server-side revocation capability).
  - `expires_at` (DateTime, Expiration timestamp based on 8-hour TTL).
- **Chart of Accounts Auto-Seeding (`seed_chart_of_accounts`)**:
  - Executed atomically upon every client registration. Seeds 40+ statutory ledgers (Cash in Hand, Bank Accounts, Sundry Debtors, Sundry Creditors, Sales, Purchases, Direct Expenses, Indirect Expenses, GST Output/Input Accounts) scoped to the newly generated `organization_id`.

#### 3. Backend REST APIs & Session Validation (`backend/api/organizations.py` & `backend/auth/router.py`)
- `POST /auth/login`: Authenticates user credentials (`org_code`, `username`, `password`), verifies Bcrypt hash, creates active session record in `sessions`, and issues a cryptographically signed HMAC-SHA256 JWT bearer token containing `sub` (User ID), `organization_id`, and `role` with an 8-hour expiration (`expires_in: 28800`).
- `GET /api/organizations/`: Returns list of all active Client Module organizations for AM Admin traversal; raises HTTP 403 Forbidden for non-AM users.
- `POST /api/organizations/register`:
  - Enforces `current_user.role == UserRole.AM_ADMIN.value`.
  - Cleans and uppercases `org_code`, rejecting blank or duplicate codes (HTTP 400).
  - Creates new `Organization` record and flushes ID.
  - Provisions initial Client Admin `User` account with hashed password.
  - Triggers automated Chart of Accounts seeding (`seed_chart_of_accounts(new_organization.id, db)`).
  - Atomically commits all records and returns new organization details.

#### 4. Frontend Master UI Elements in `Login.tsx`, `ClientManagement.tsx`, and `RegisterClientModal.tsx`
Built in the Flagship Luxury Forest Green design system (`#1b4332`, `#2d6a4f`, `#eef2ef`):
- **Login Screen (`/login`)**:
  - `#btn-quick-fill-admin`: 1-click preset chip that auto-populates System Admin credentials (`AM-0001` / `admin` / `Admin@123`).
  - `#btn-quick-fill-client`: 1-click preset chip that auto-populates Client Admin credentials (`KMA` / `SAN` / `Admin@123`).
  - `#btn-demo-login`: Asynchronous 1-click cloud access button that authenticates directly against the live FastAPI cloud backend (`https://erp-backend-liaw.onrender.com`), acquires an authentic 8-hour JWT token with full cloud privileges, and navigates to the dashboard with live interactive loading feedback ("Connecting Cloud Database...").
- **Client Management Screen (`/clients`)**:
  - `#btn-register-new-client`: Launches the Client Registration Dialog modal.
  - `#btn-open-enterprise-radar`: Quick launcher button linking to the Enterprise Multi-Client Operations Radar (`/admin/tracking`).
  - Organization Card Grid: Multi-tenant client matrix displaying legal entity name, organization code, active status, users count, and action buttons:
    - `#btn-switch-to-erp-{org_id}` (`Switch to ERP ->`): Impersonates client organization and jumps into isolated ERP session.
    - `[Companies]`: Opens Authorized Product Companies Mapping Modal (`ClientCompanyMappingModal.tsx`).
    - `[Permissions]`: Opens Granular Permissions Matrix Modal (`PermissionsMatrixModal.tsx`).
- **Register Client Modal (`RegisterClientModal.tsx`)**:
  - `#input-client-org-name`: Organization legal name input (e.g., "Apex MedCorp F5BA").
  - `#input-client-org-code`: Auto-capitalized organization unique code (e.g., "AMC-F5BA").
  - `#input-client-admin-name`: Administrator display name (e.g., "Dr. Ramesh Mehta").
  - `#input-client-admin-username`: Admin login username (e.g., "admin_amc-f5ba").
  - `#input-client-admin-password`: Admin password (minimum 6 characters).
  - `#btn-cancel-register-client`: Dismisses modal dialog (`[Esc]`).
  - `#btn-submit-register-client`: Submits registration form with loading spinner (`isLoading`).
  - **Self-Healing Session Recovery**: If the operator's current session contains a mock or expired token, the modal automatically authenticates with the live cloud backend, acquires a genuine AM Admin JWT token, and executes registration without disruption.

#### 5. Master Automated Selenium Suite & 19-Suite QA Test Matrix
- **Script**: `verify_live_vercel_client_creation.py` (6 live stages, Exit Code 0, 100% Passed against production `https://erp-rho-three.vercel.app`).
- **Verified Visual Proof Artifacts**:
  - `verified_live_vercel_login_chips.png`: Live production login card displaying 1-click credential chips (`#btn-quick-fill-admin`, `#btn-quick-fill-client`) and full cloud demo access button (`#btn-demo-login`).
  - `verified_live_vercel_client_registered.png`: Client registration modal during live cloud submission with field values for `Apex MedCorp F5BA` (`AMC-F5BA`).
  - `verified_live_vercel_clients_grid.png`: Client Management page grid displaying newly registered client card `Apex MedCorp F5BA` (`AMC-F5BA`) alongside existing tenant organizations (`KMA`, `KSK-HDA`, `SAM-INDR`, `Test Org`, `Test Client Corp`).
- **Master QA Test Matrix**: 19 Automated Selenium test suites completely verified passing with Exit Code 0.


### 10.28 Enterprise Purchase Order, Intelligent Stock Replenishment Radar & Vendor Procurement Desk (DOC-45)

#### 1. Business & Operational Background
In pharmaceutical and C&F distribution supply chains, manual inventory reviews often cause devastating stock-outs on fast-moving medicines or overstocking on slow-moving inventory. DOC-45 bridges inventory safety thresholds (min_stock_level and 
eorder_quantity) with autonomous deficit detection, multi-vendor rate intelligence, 1-click bulk Purchase Order generation, keyboard-operated PO authoring (/po), and direct 1-click conversion into inward purchase bills (/purchase).

#### 2. System Architecture & Autonomous Replenishment Formula
1. **Current Physical Stock Calculation**: Real-time aggregation of unexpired batch quantities:
   \\text{Current Stock} = \\sum_{\\text{batch} \\in \\text{Batches}} \\text{batch.current\\_stock} \\quad (\\text{where } \\text{expiry} > \\text{today})
2. **Effective Stock & Deficit Formula**:
   \\text{Pending PO Qty} = \\sum_{\\text{po} \\in \\text{ActivePOs}} (\\text{item.quantity} - \\text{item.received\\_qty})
   \\text{Effective Stock} = \\text{Current Stock} + \\text{Pending PO Qty}
   \\text{Deficit Qty} = \\max(0, \\text{min\\_stock\\_level} - \\text{Effective Stock})
   \\text{Suggested Order Qty} = \\max(\\text{Deficit Qty}, \\text{reorder\\_quantity})
3. **Classification & Categorization**:
   - CRITICAL_OUT_OF_STOCK: Current Stock == 0
   - BELOW_REORDER_LEVEL: Effective Stock <= min_stock_level
   - OPTIMAL_STOCK: Effective Stock > min_stock_level

#### 3. Backend Endpoints in pi/procurement.py
- GET /api/procurement/replenishment-radar: Returns telemetry scorecards (Critical 0-stock, Below Reorder, Projected Deficit Outlay, Active PO Pipeline) and deficit items requiring procurement.
- GET /api/procurement/vendor-rate-comparison/{product_id}: Compares suppliers based on historical purchase vouchers, offered rates, discounts, net effective rate, payment credit days (e.g. 30 vs 60 days), and optimization badges (BEST_PRICE, LONGEST_CREDIT, FASTEST_DELIVERY, BULK_DISCOUNT).
- POST /api/procurement/generate-from-replenishment: Takes selected deficit items, groups them by target vendor, and auto-generates formal sequential POs (PO-YYYYMM-XXXX) with line items.
- GET /api/procurement/orders: Retrieves master list of purchase orders with vendor name resolution.
- POST /api/procurement/orders: Creates customized purchase order with line items, tax estimation, and delivery schedules.
- PATCH /api/procurement/orders/{po_id}/status: Transitions order lifecycle (DRAFT, APPROVED, COMPLETED, CANCELLED).
- POST /api/procurement/orders/{po_id}/convert-to-purchase: Converts approved PO into an inward purchase bill (PUR-PO-XXXX), links lines to InvoiceItem, marks items received, and transitions status to COMPLETED.

#### 4. Frontend Master UI Elements in PurchaseOrderMaster.tsx (/po)
Built in the Flagship Luxury Forest Green design system (#1b4332, #2d6a4f, #eef2ef):
- **4 Telemetry Scorecards**:
  - #card-critical-stock: Critical 0-Stock Items indicator.
  - #card-reorder-stock: Below Safety Stock threshold count.
  - #card-replenishment-budget: Total Projected Replenishment Capital Outlay.
  - #card-pending-pos: Active PO Orders Pipeline count & value.
- **Tabbed Interface with Function Keys**:
  - [F1] Master PO Directory (#tab-po-directory): Search bar (#input-search-po), status filters (#btn-filter-status-all, #btn-filter-status-approved, etc.), and order action buttons:
    - #btn-dispatch-po-{id}: Launches Supplier WhatsApp / Print Slip Modal.
    - #btn-convert-po-purchase-{id}: Launches Inward Purchase Bill Conversion Modal.
  - [F2] Stock Replenishment Radar (#tab-replenishment-radar):
    - Multi-select checkbox (#checkbox-select-all, #checkbox-item-{id}).
    - Deficit analytics table with current stock, min safety, deficit qty, and suggested order qty.
    - #btn-bulk-generate-pos: 1-Click Bulk PO Generator button.
  - [F3] Create New Purchase Order (#tab-create-po):
    - Header inputs: #input-po-number, #input-po-date, #select-po-vendor, #input-po-delivery, #input-po-supply-type.
    - Line item builder: #select-po-product-{idx}, #input-po-qty-{idx}, #input-po-rate-{idx}, #btn-remove-po-row-{idx}, #btn-add-po-row.
    - Save action: #btn-save-purchase-order ([Enter]).
  - [F4] Vendor Rate Intelligence (#tab-vendor-rates):
    - Product selector: #select-rate-comparison-product.
    - Comparative table with net effective rates, discounts, credit terms, and badges.
- **Modals**:
  - #modal-po-dispatch: Formatted PO slip with #textarea-po-dispatch-text, #btn-copy-po-whatsapp, #btn-open-whatsapp-web, #btn-close-dispatch-modal.
  - #modal-convert-po-purchase: #btn-confirm-convert-po, #btn-close-convert-modal, automated redirection to /purchase.

#### 5. Master Automated Selenium Suite & 20-Suite QA Test Matrix
- **Script**: 	est_procurement_po_replenishment_selenium.py (10 stages, Exit Code 0, 100% Pass).
- **Verified Visual Proof Artifacts**:
  - erified_po_replenishment_scorecards.png: 4 Telemetry scorecards with real-time deficit counts and budget outlay.
  - erified_po_replenishment_radar.png: Interactive Stock Replenishment Radar with deficit items and bulk PO generator.
  - erified_po_creation_workbench.png: Keyboard-accelerated PO authoring workbench with line items and GST calculation.
  - erified_po_supplier_dispatch_modal.png: Supplier WhatsApp and print dispatch slip modal.
- **Master QA Test Matrix**: Expanded to **20 Automated Selenium test suites** completely passing with 100% Exit Code 0.


### 10.29 Master Enterprise Screen Element, Keybinding & Telemetry Matrix (DOC-1 to DOC-45 Exhaustive Reference)

#### 1. Exhaustive Screen-by-Screen DOM & Options Directory
Every functional screen, option, toggle, and element created across the ERP system is itemized below for developers and system operators:

| Screen Name & Route | DOM ID / Selector | Type & Hotkey | Functional Purpose & Validation Engine |
| :--- | :--- | :--- | :--- |
| **Counter Workbench (`/`)** | `#hub-btn-sales-bill` | Button `[F2]` | Direct launcher for Counter Sales Billing with series continuation. |
| **Counter Workbench (`/`)** | `#hub-btn-receipt-voucher` | Button `[F6]` | Direct launcher for Customer Receipts & Settlement Allocation. |
| **Counter Workbench (`/`)** | `#hub-btn-payment-voucher` | Button `[F5]` | Direct launcher for Supplier Payments & Ledger Clearing. |
| **Counter Workbench (`/`)** | `#hub-btn-cargo-management` | Button `[Ctrl+1]` | Direct launcher for Cargo & Consignment Management Board. |
| **Counter Workbench (`/`)** | `#hub-btn-freight-management` | Button `[Ctrl+2]` | Direct launcher for Freight Contracts & Carrier Rate Master. |
| **Counter Workbench (`/`)** | `#hub-btn-principal-management`| Button `[Ctrl+3]` | Direct launcher for Principal Operations & Consignment Custody. |
| **Counter Workbench (`/`)** | `#hub-btn-commission-management`| Button `[Ctrl+4]` | Direct launcher for C&F Commission & Expense Recovery Engine. |
| **Counter Workbench (`/`)** | `#hub-btn-admin-tracking` | Button `[Ctrl+6]` | Direct launcher for Admin Enterprise Multi-Client Operations Radar. |
| **Counter Workbench (`/`)** | `#hub-btn-audit-trail` | Button | Direct launcher for Cryptographic SHA-256 Audit Trail Explorer. |
| **Counter Workbench (`/`)** | `#modal-exit-app` | Modal `[Esc]` | High-contrast application exit modal with `Enter` (Exit) and `Esc` (Cancel). |
| **Header Navigation** | `#btn-workflow-dropdown` | Dropdown `[F4]` | Expands workflow operations (Inbox, Designer, Monitor, Audit, Governance). |
| **Header Navigation** | `parent-menu-btn-cf` | Dropdown | Expands C&F & Logistics operations (Principal, Commission, Radar, Cargo, Freight). |
| **Sales Bill (`/sales`)** | `#input-bill-series` | Input | Alphanumeric invoice sequence input (`SLS-YYYY-XXXX`). Edits saved to localStorage. |
| **Sales Bill (`/sales`)** | `#btn-search-party` | Button `[F7]` | Debtor party lookup modal with live ledger balance and drug licenses. |
| **Sales Bill (`/sales`)** | `#grid-bill-items` | Grid Table | 8-Row Marg billing grid (Item, Pack, Batch, Exp, Qty, Free, Rate, Dis%, GST%). |
| **Sales Bill (`/sales`)** | `#btn-batch-modal` | Button `[F3]` | Batch modal with stock, expiry MM/YY, and MRP for active product. |
| **Sales Bill (`/sales`)** | `#btn-settlement-modal` | Button `[End]` | Settlement discount & payment modal (Cash, Bank, Credit) with round-off preview. |
| **Sales Bill (`/sales`)** | `#btn-save-bill` | Button `[Ctrl+S]` | Commits bill, decrements batch stock, posts GL entries, advances series. |
| **Purchase Inward (`/purchase`)** | `#input-purchase-series` | Input | Alphanumeric inward purchase series input (`PUR-YYYY-XXXX`). |
| **Purchase Inward (`/purchase`)** | `#input-vendor-inv-no` | Input | Supplier's external invoice reference number (`party_inv_no`). |
| **Purchase Inward (`/purchase`)** | `#btn-search-vendor` | Button `[F7]` | Creditor vendor search modal with live ledger balance. |
| **Purchase Inward (`/purchase`)** | `#btn-save-purchase` | Button `[Ctrl+S]` | Accrues batches, increments stock, posts Accounts Payable in GL. |
| **Purchase Register (`/purchase/list`)** | `#grid-purchase-bills` | Ag-Grid | Inward purchase bills register with search, filter, and dual-post tags. |
| **Supplier Debit Note (`/purchase-return`)** | `#btn-mode-against-bill` | Button `[F2]` | Activates Against Inward Bill mode to load original purchase line items. |
| **Supplier Debit Note (`/purchase-return`)** | `#btn-mode-loose` | Button `[F3]` | Activates Loose Return mode for ad-hoc debit note issuance. |
| **Supplier Debit Note (`/purchase-return`)** | `#select-stock-disposition` | Select | Directs returned goods to `Saleable`, `Breakage Godown`, or `Expired Godown`. |
| **Supplier Debit Note (`/purchase-return`)** | `#btn-save-debit-note` | Button `[Ctrl+S]` | Posts debit note, adjusts stock, generates reverse GL and ITC reversal entries. |
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
| **Expiry Cockpit (`/inventory-dashboard`)** | `#search-batches-input` | Input | Batch / SKU search text input. |
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

#### 2. Master Verification Matrix (20 Automated Suites)
The entire software stack across all 45 documents is 100% verified via 20 comprehensive automated Selenium suites:
1. `test_master_all_6_modules_selenium.py` (Sales, Purchase, DN, CN, BKI, BKR)
2. `test_reports_and_finance_selenium.py` (Financial Reports & Statements)
3. `test_gst_compliance_selenium.py` (Statutory GSTR-1, 2, 3B Returns)
4. `test_receipt_payment_settlement_selenium.py` (Customer Receipt & Supplier Payment)
5. `test_journal_accrual_engine_selenium.py` (Multi-Leg Journal Accruals)
6. `test_direct_expense_ui_selenium.py` (Direct Expenses & Petty Cash)
7. `test_fixed_assets_selenium.py` (Fixed Assets & Depreciation)
8. `test_bank_recon_cash_selenium.py` (BRS & Cash Denomination Counter)
9. `test_dashboard_bi_control_center_selenium.py` (Executive BI Control Center)
10. `test_workflow_approval_automation_selenium.py` (Multi-Tier Workflows)
11. `test_audit_governance_selenium.py` (Cryptographic Audit Trail)
12. `test_cargo_consignment_selenium.py` (Cargo & Logistics Movement)
13. `test_freight_logistics_selenium.py` (Freight Rate Master & Recon)
14. `test_principal_operations_selenium.py` (Principal Custody & Claims)
15. `test_client_commission_billing_selenium.py` (C&F Billing & Dual-Posting)
16. `test_pharma_expiry_quarantine_selenium.py` (Expiry Radar & Stock Shifts)
17. `test_gst_einvoice_eway_selenium.py` (E-Way Bill & IRN Desk)
18. `test_gstr2b_reconciliation_selenium.py` (GSTR-2B ITC Matching Engine)
19. `verify_live_vercel_client_creation.py` (Production Cloud Client Onboarding)
20. `test_procurement_po_replenishment_selenium.py` (Purchase Orders & Replenishment Radar)
21. `test_grn_quality_inspection_selenium.py` (Goods Receipt Note, QC Inspection & Barcode Inward Desk)

### 10.30 DOC-46: Goods Receipt Note (GRN), Physical Quality Inspection & Barcode Inward Verification Desk (`/grn`)

#### 1. Operational Overview & Industrial Problem Solved
In pharmaceutical wholesale distribution and multi-depot C&F supply chain management, receiving inventory at the godown dock cannot simply jump from a Purchase Order (`PO-YYYYMM-XXXX`) directly into general ledger accounts payable without physical receipt and quality verification. Vendor delivery consignments regularly encounter:
1. **Discrepant Quantities & Shortages**: The delivery challan states 100 units, but only 92 physically arrive from the carrier, requiring automated shortage detection (`short_qty = challan_qty - received_qty`).
2. **Cold-Chain Temperature Excursions**: Temperature-sensitive biologics, vaccines, and insulin must be stored strictly within 2.0°C – 8.0°C. Breaches during road transit require immediate quarantine and recording of the exact ingress temperature before accepting custody.
3. **Transit Breakage & Tampered Seals**: Secondary cartons arriving with broken manufacturer tamper seals, punctured blisters, or shattered ampoules must be isolated directly into a segregated Quarantined Breakage ledger (`brk_exp_stock`), preventing accidental sale.
4. **Barcode Dock Verification**: Manual manual typing of batch codes and product names is prone to human error; the receiving desk requires rapid barcode scanning (GS1-128, EAN-13, and 2D DataMatrix) with audio-visual feedback and rapid unit counting.

DOC-46 introduces the enterprise **Goods Receipt Note (GRN) & Physical Inward Inspection Desk** at route `/grn`, providing a full receiving dock workflow bridging Purchase Orders (DOC-45) to General Ledger Inward Purchase Bills (`PUR-GRN-XXXX`).

#### 2. Architecture & Database Schema
1. **`goods_receipt_notes` Table**:
   - `id`: UUID Primary Key.
   - `organization_id`: Tenant organization reference (UUID, indexed).
   - `grn_number`: Unique sequential identifier (`GRN-YYYYMM-XXXX`).
   - `date`: Inward receipt timestamp.
   - `po_id`: Foreign key link to source `purchase_orders.id` (nullable for direct inwards).
   - `vendor_id`: Foreign key link to `parties.id` (supplier).
   - `challan_number`: Vendor delivery challan or invoice reference.
   - `challan_date`: Challan issuance date.
   - `gate_entry_number`: Security gate physical pass tracking number.
   - `vehicle_number`: Transport conveyance registration number (e.g. `DL-01-AB-1234`).
   - `received_by`: Warehouse receiving officer display name.
   - `temperature_celsius`: Measured ingress cold-chain temperature (Decimal, e.g. `4.2°C`).
   - `seal_intact`: Tamper-evident seal verification flag (Boolean).
   - `inspection_status`: `PENDING_INSPECTION`, `ACCEPTED`, `REJECTED`, or `PARTIAL_ACCEPT`.
   - `status`: `DRAFT`, `VERIFIED`, `CONVERTED_TO_PURCHASE`, or `CANCELLED`.
   - `total_received_amount`: Sum of accepted line items valuation.
   - `remarks`: Inspection findings and transit condition notes.
2. **`goods_receipt_note_items` Table**:
   - `id`: UUID Primary Key.
   - `grn_id`: Cascading foreign key to `goods_receipt_notes.id`.
   - `po_item_id`: Foreign key to `purchase_order_items.id`.
   - `product_id`: Master product reference.
   - `product_name`: Snapshot product description.
   - `ordered_qty`: Quantity on source Purchase Order.
   - `challan_qty`: Quantity declared on vendor's delivery challan.
   - `received_qty`: Physically counted quantity at the gate.
   - `accepted_qty`: Quantity passing physical QC inspection.
   - `damaged_qty`: Quarantined breakage / leakage quantity.
   - `short_qty`: Discrepancy quantity (`challan_qty - received_qty`).
   - `batch_number`: Manufacturer batch code.
   - `expiry_date`: Month/Year expiry date stamp (`MM/YY`).
   - `mrp`: Maximum Retail Price.
   - `purchase_rate`: Agreed contract unit purchase rate.
   - `line_total`: Computed valuation (`accepted_qty * purchase_rate`).
   - `quality_remarks`: Specific defect classification (e.g. "punctured blister").

#### 3. REST API Endpoints (`/api/grn`)
- `GET /api/grn/telemetry`: Computes real-time scorecard metrics (Total Inward GRNs, Pending QC Count, QC Inspected Count, Quarantined Damaged Units, Gross Inward Valuation).
- `GET /api/grn/pending-orders`: Queries all approved, open purchase orders (`status in ['APPROVED', 'PARTIAL']`) with pending line items for gate inward selection.
- `GET /api/grn/`: Queries master inward register with search, status (`DRAFT`, `VERIFIED`, `CONVERTED_TO_PURCHASE`), and QC status filters.
- `GET /api/grn/{grn_id}`: Retrieves complete single GRN record with vendor legal names and line item details.
- `POST /api/grn/`: Creates a new Goods Receipt Note, computes shortage discrepancies, sets initial status, and updates linked Purchase Order status (`PARTIAL` or `COMPLETED`).
- `PATCH /api/grn/{grn_id}/inspection`: Physical QC & Cold-Chain Certification endpoint; updates ingress temperature, seal integrity, item-level accepted/damaged counts, recalculates valuation, and advances status to `VERIFIED`.
- `POST /api/grn/{grn_id}/convert-to-purchase`: Converts verified GRN into official General Ledger Purchase Bill (`PUR-YYYYMM-XXXX`) in `invoices` table and increments batch inventory (`current_stock += accepted_qty`, `brk_exp_stock += damaged_qty`).

#### 4. Frontend Workbench Features (`/grn`)
- **4 Telemetry Scorecards**:
  - `Total Inward GRNs`: Receipt count and total inward value (Rs.).
  - `Gate Inward / QC Pending`: GRNs awaiting cold-chain & tamper certification.
  - `Inspected & Accepted`: Verified stock approved for commercial conversion.
  - `Quarantined & Damaged Units`: Isolated transit breakages routed to breakage ledger.
- **4 Operational Tabs**:
  - `[F1] Master Inward Register`: Comprehensive directory with live text search, status filters, QC verdict badges, cold-chain temperature badges, and quick action buttons (`QC`, `Convert`, `Print`).
  - `[F2] Gate Inward & PO Matcher`: Inward authoring workbench with approved PO auto-populate, vendor details, gate entry pass, delivery challan reference, receiving temperature, and line item shortage calculator.
  - `[F3] Barcode Rapid Scanner Desk`: High-speed dock scanner interface with synthesized audio chirp, real-time scanning feed, and counter increments.
  - `[F4] Physical Quality & Cold-Chain Desk`: Thermometer cold-chain slider (2.0°C – 8.0°C standard), tamper seal toggle, item-level damage isolation table, and overall verdict buttons (`ACCEPTED`, `PARTIAL_ACCEPT`, `REJECTED`).
- **Modals**:
  - Quality Inspection Modal: Complete item disposition dialog with defect logging.
  - Convert to Purchase Bill Modal: Purchase bill generator with custom invoice number, credit terms (days), and GST tax rates.
  - Printable GRN Slip Preview: Official warehouse inward voucher with Security Gate, QC Officer, and Warehouse Manager signature blocks.

#### 5. DOM Element & Automation ID Catalog
| Module / Context | Element Selector / ID | Tag / Role | Description / Purpose |
| :--- | :--- | :--- | :--- |
| **GRN Workbench (`/grn`)** | `#card-grn-total` | Metric Card | Displays total inward receipts count and gross inward valuation. |
| **GRN Workbench (`/grn`)** | `#card-grn-pending` | Metric Card | Count of gate receipts awaiting physical QC and cold-chain logging. |
| **GRN Workbench (`/grn`)** | `#card-grn-accepted` | Metric Card | Count of verified, QC-passed receipts ready for purchase conversion. |
| **GRN Workbench (`/grn`)** | `#card-grn-damaged` | Metric Card | Sum of quarantined damaged units isolated from saleable inventory. |
| **GRN Workbench (`/grn`)** | `#tab-grn-register` | Button `[F1]` | Switches to Master Inward Register directory. |
| **GRN Workbench (`/grn`)** | `#tab-grn-gate` | Button `[F2]` | Switches to Gate Inward & Purchase Order Matcher authoring tab. |
| **GRN Workbench (`/grn`)** | `#tab-grn-barcode` | Button `[F3]` | Switches to Barcode Rapid Scanner Desk with audio-visual feed. |
| **GRN Workbench (`/grn`)** | `#tab-grn-qc` | Button `[F4]` | Switches to Physical Quality & Cold-Chain Inspection Desk. |
| **GRN Workbench (`/grn`)** | `#btn-new-gate-inward` | Button | Direct action button launching Gate Inward authoring tab. |
| **Gate Inward (`/grn`)** | `#select-po` | Select | Dropdown listing approved, open Purchase Orders for auto-matching. |
| **Gate Inward (`/grn`)** | `#select-vendor` | Select | Supplier / Vendor dropdown for direct inward receipts. |
| **Gate Inward (`/grn`)** | `#input-gate-pass` | Text Input | Physical security gate pass tracking number. |
| **Gate Inward (`/grn`)** | `#input-vehicle-no` | Text Input | Transport conveyance vehicle registration number. |
| **Gate Inward (`/grn`)** | `#btn-confirm-gate-inward` | Button `[Enter]` | Validates items, calculates shortages, and saves gate inward GRN. |
| **Barcode Desk (`/grn`)** | `#input-barcode-scanner` | Text Input | High-speed auto-focused barcode input with audio synthesis chirp. |
| **Barcode Desk (`/grn`)** | `#btn-register-scan` | Button | Registers scanned barcode, matching catalog and incrementing counter. |
| **QC Desk (`/grn`)** | `#select-qc-grn` | Select | Target Goods Receipt Note selector for quality inspection. |
| **QC Desk (`/grn`)** | `#btn-submit-qc-verdict` | Button | Confirms cold-chain temperature, tamper seal, and damage quarantine. |
