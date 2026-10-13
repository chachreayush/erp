# Enterprise ERP System — Unified Developer & User Master Manual
*Unified Technical Architecture and Operational Guide*

This document unifies the technical architecture specifications for software engineers with the operational workflows for cashiers, accountants, and store managers.

---

## Part 1: Technical Developer Architecture

### 1.1 Architecture & Tech Stack
* **Frontend**: React 19 + TypeScript + Vite (`port 50005`), Zustand state management, Axios client.
* **Backend**: FastAPI + Uvicorn (`port 8000`), Python 3.11/3.13, SQLAlchemy ORM.
* **Database**: PostgreSQL with strict multi-tenant isolation by `organization_id`.
* **Desktop Wrapper**: Tauri v2 (native Rust client).

### 1.2 Core Data Models
* **Invoices (`models.Invoice`, `models.InvoiceItem`)**: Covers all 6 voucher types (`sales-bill`, `purchase-bill`, `sales-return`, `purchase-return`, `brk-receive`, `brk-issue`).
* **General Ledger (`models.Voucher`, `models.VoucherEntry`)**: Append-only double-entry ledger with automatic journal generation.
* **Stock Godowns**: Active inventory in `current_stock` partitioned from quarantined damaged goods in `brk_exp_stock`.

### 1.3 Alphanumeric Series Continuation Engine
The system uses the `incrementSeries` algorithm to parse and advance alphanumeric series prefixes while preserving leading zeros and sequence width (e.g., `RJ-DN-0020` &rarr; `RJ-DN-0021`). Custom user sequences are persisted to `localStorage` and never overridden by default values.

---

## Part 2: User Operational Guide

### 2.1 Keyboard-First Counter Billing
The ERP is 100% keyboard-navigable. Key shortcuts:
* `Enter`: Advance through fields and create rows.
* `Esc`: Exit to Dashboard.
* `F2`: Against Bill Mode.
* `F3`: Batch selection modal / Loose mode.
* `F5`: Register view.
* `F7`: Ledger / Party search modal.
* `End`: Jump to Discount & Settlement modal.
* `Ctrl + S`: Save & Post voucher.

### 2.2 The 6 Transaction Modules
1. **Sales Bill (`/sales`)**: Fast counter billing with batch selection (`[F3]`), settlement modal (`[End]`), and auto-incrementing bill series.
2. **Purchase Bill (`/purchase`)**: Direct inward and PO-matching with vendor invoice reference and batch accrual.
3. **Supplier Debit Note (`/purchase-return`)**: Dual mode (`[F2] Against Bill` vs `[F3] Loose Return`), stock disposition routing (`Saleable`, `Breakage Godown`, `Expired Godown`), and automatic series advance (`RJ-DN-0020` &rarr; `RJ-DN-0021`).
4. **Customer Credit Note (`/sales-return`)**: Dual mode (`[F2] Against Bill` vs `[F3] Counter Return`), returnable quantity caps, table keyboard navigation, and series continuation (`RJ-CN-8281` &rarr; `RJ-CN-8282`).
5. **Breakage Receive (`/brk-receive`)**: Records damaged returns into non-saleable quarantine godown (`brk_exp_stock`).
6. **Breakage Issue (`/brk-issue`)**: Records damaged goods returned to manufacturers for credit claims.

### 2.3 Financials & Management Reports
* **Day Book (`/finance/daybook`)**: Chronological daily audit trail.
* **Ledger Statement (`/finance/ledger-statement`)**: Running balance statement per party.
* **Trial Balance, P&L, Balance Sheet**: Statutory double-entry statements.
* **Company-Wise Sales & Drill-Downs (`/reports`)**: Manufacturer sales aggregation across 25+ companies with multi-company filter modal and inline product drill-downs.

### 2.4 Statutory GST Compliance Workbench (`/gst`)
* **Executive Metrics**: Outward Taxable (₹1,52,519.34), Tax (₹17,318.00), Inward (₹1,81,76,245.90), Eligible ITC (₹29,03,956.42), Net Cash (₹0.00), ITC Balance (₹28,86,638.42).
* **GSTR-1 Outward Registers**: Table 4 (B2B), Table 7 (B2CS), Table 9B (CDNR), Table 12 (HSN), Table 13 (Documents Issued).
* **GSTR-2 Inward & ITC Register**: Inward purchase bills matching with Debit Note ITC reversals (-₹95.20).
* **GSTR-3B Monthly Return**: Consolidated tables (3.1 Outward supplies, 4 Eligible ITC, 5.1 Tax payment calculation).
* **GSTN Portal Offline JSON**: Direct export compliant with `GSTR1_Offline_Utility_v1.5` schema for upload to `gst.gov.in`.
### 2.5 Fixed Assets & Depreciation Engine (`/finance/assets`)
* **Asset Lifecycle**: Code `AST-2026-xxxx`, Statutory Categories (Schedule II Companies Act 2013), Capitalization Date, Gross Block, Salvage Value (5%).
* **Depreciation Methods**: SLM and WDV calculation models with proration.
* **Automated Accounting**: Single and bulk period runs post `Dr Depreciation Expense A/c (P&L)` and `Cr Accumulated Depreciation A/c (Balance Sheet Contra)`.
* **Verified 100% PASS**: Automated Selenium suite `test_fixed_assets_selenium.py`.

### 2.6 Bank Reconciliation & Physical Cash Control (`/finance/bank-reconciliation`)
* **BRS Metrics**: Statement Closing Balance, ERP Book Balance, Unreconciled Variance, Pending Clearance Count.
* **Dual Workbench**: ERP Bank Vouchers vs External Statement feed (CSV import supported).
* **Auto-Match Engine**: Tolerance matching by Reference/Cheque Number, Exact Amount, and Date Proximity ($\pm 3$ days).
* **Physical Cash Denomination Counter**: RBI denomination grid (₹2000 to ₹1 coin), Physical Total vs Book Balance comparison, Cash Shortage/Excess reporting.
* **Verified 100% PASS**: Automated Selenium suite `test_bank_recon_cash_selenium.py`.

### 2.7 Operational Expense & Reimbursement Engine (`/finance/expenses`)
* **Quick Daily Expense Entry**: Instant petty cash/bank disbursements to 10 statutory P&L heads with live Dr/Cr/Net Profit impact preview.
* **Employee Imprest & Advances**: Tour advance tracking, multi-line itemized claims, and automatic advance offset.
* **Verified 100% PASS**: Automated Selenium suite `test_expense_petty_cash_selenium.py`.

### 2.8 Journal Voucher Multi-Leg Adjustment & Accrual Engine (`/journal`)
* **Keyboard Cockpit**: Hotkeys `[Ctrl+B]` Auto-Balance, `[Ctrl+D]` Duplicate row, `[Alt+A]` Add row.
* **Accrual Scheduler**: Automatic future reversal scheduling (1st of next month).
* **Traceable Reversals**: One-click GL inversion (`[Reverse ↩]`) on Journal Register.
* **Verified 100% PASS**: Automated Selenium suite `test_journal_accrual_engine_selenium.py`.

---
*End of Unified Master Manual.*

