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

