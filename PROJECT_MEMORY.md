# ERP Project — Master Memory File
> Last Updated: 2026-10-12 | Auto-loaded at the start of every session.

---

## Project Identity

| Item | Detail |
|---|---|
| **Project Name** | Enterprise Multi-Tenant Pharmaceutical & Distribution ERP (Tauri + React 19 + FastAPI) |
| **Dev Folder** | `C:\Users\DELL\OneDrive\Desktop\erp2` (Active working copy) |
| **Original Folder** | `C:\Users\DELL\OneDrive\Desktop\erp` (Git repo, synced via Robocopy) |
| **Git Repository** | `https://github.com/chachreayush/erp.git` (Branch: `main`) |
| **Frontend URL** | `http://localhost:50005` (Vite dev server) / Vercel Production (`https://erp-nbbigyye0-erp-b646.vercel.app`) |
| **Backend URL** | `http://localhost:8000` (FastAPI/Uvicorn) / Render Production |
| **Desktop Shell** | Tauri v2 (Rust) — native Windows ERP client |
| **Standard Test Auth**| Company: `AM-0001` \| Username: `admin` \| Password: `Admin@123` \| Org ID: `78fca6c8-eb92-41c4-96ec-ac2e150d56a4` |

---

## Technology Stack

| Layer | Technology | Details |
|---|---|---|
| **Frontend** | React 19 + TypeScript + Vite | Port 50005, Zustand state management, Tailwind/inline styling |
| **Desktop Shell** | Tauri v2 (Rust) | Native Windows windowing, hardware shortcut hooks |
| **Backend** | Python FastAPI + Uvicorn | Port 8000, async endpoints, Pydantic validation |
| **Database** | PostgreSQL | Local (port 5432) & Neon Cloud, multi-tenant isolation |
| **ORM** | SQLAlchemy 2.x | Relational mapping, append-only ledger entries |
| **Auth** | JWT (PyJWT) | Injected bearer tokens, AM/CM tenant impersonation |
| **HTTP Client** | Axios (`src/lib/api.ts`) | Auto-switching base URLs (LAN, Cloud, Local) |
| **Testing** | Selenium WebDriver | Headless Chrome, automated keyboard & DB verification |
| **Hosting & CI/CD**| Vercel (Frontend SPA) + Render (Backend API) | GitHub auto-deployments |

---

## The 6 Core Transaction Voucher Modules (100% Keyboard-Operated)

Every transaction module across the ERP is **100% keyboard-navigable (zero mouse required)**, executes in under 2–3 seconds per transaction, and implements **Marg & Tally Series Continuation**:

1. **Sales Bill (`/sales`, `src/pages/sales/SalesBill.tsx`)**:
   * Header: `Date` &rarr; `Bill No` &rarr; `Party` [F7 popup].
   * Grid: `Product` &rarr; `Batch` [F3 popup with stock/expiry/rate] &rarr; `Qty` &rarr; `Free` &rarr; `Rate` &rarr; `Disc %` &rarr; Next Row.
   * `End` key or `Enter` on empty product row opens Discount & Settlement modal; `Enter` confirms and saves.
   * Series auto-increments with user's customized prefix (e.g. `RJ-INV-1001` &rarr; `RJ-INV-1002`).
2. **Purchase Bill (`/purchase`, `src/pages/purchase/PurchaseBill.tsx`)**:
   * Direct inward and PO matching (`[PO Picker]`).
   * Header walk: `Date` &rarr; `Bill No` &rarr; `Party` [F7] &rarr; `Party Inv No` &rarr; `Inv Date` &rarr; `Tax Mode`.
   * Grid: Batch creation (MRP, SRate, P.Rate, Expiry MM/YY) & discrepancy complaint logging.
3. **Supplier Debit Note / Purchase Return (`/purchase-return`, `src/pages/returns/PurchaseReturnBill.tsx`)**:
   * Neumorphic Minimalist design (White & Forest Green `#1b4332`, `#2d6a4f`).
   * Dual Mode: `[F2] Against Inward Bill` (queries supplier inward bills via `/api/sales/invoices/by-supplier/`) vs `[F3] Direct Loose Return`.
   * Stock disposition routing per row: `🟢 Saleable`, `🔴 Breakage Godown`, `🟡 Expired Godown`.
   * Reason codes: Transit damage, Expired goods, Near expiry, Excess supply, Rate difference.
   * Series continuation: Defaults `DN-0001` or last series; edits (e.g. `RJ-DN-0020`) auto-advance to `RJ-DN-0021`.
   * Keyboard grid: `Enter` walks `return-qty` &rarr; `return-rate` &rarr; `return-disc` &rarr; next row / Save button.
4. **Customer Credit Note / Sales Return (`/sales-return`, `src/pages/returns/SalesReturnBill.tsx`)**:
   * Neumorphic Minimalist design (White & Forest Green `#1b4332`, `#2d6a4f`) matching `PurchaseReturnBill` and `SalesBill`.
   * Dual Mode: `[F2] Against Sales Bill` (queries customer bills via `/api/sales/invoices/by-customer/`) vs `[F3] Direct Counter Return`.
   * Caps returnable units against billed quantity; restores original batch and rate.
   * Keyboard grid: `Enter` walks `return-qty` &rarr; `return-rate` &rarr; `return-disc` &rarr; next row. `ArrowUp`/`Down` shifts rows.
   * Series continuation: Defaults `CN-0001`; edits (e.g. `RJ-CN-2403`) auto-advance to `RJ-CN-2404`.
5. **Breakage Issue (`/brk-issue`, `src/pages/brk/BrkIssueBill.tsx`)**:
   * Fast Marg billing grid engine; deducts non-saleable goods from `brk_exp_stock` to return to manufacturer.
6. **Breakage Receive (`/brk-receive`, `src/pages/brk/BrkReceiveBill.tsx`)**:
   * Fast Marg billing grid engine; accrues damaged goods from retail chemists into `brk_exp_stock`.

---

## Universal Marg/Tally Series Continuation Engine

Implemented across all billing components via `incrementSeries`:
* **Algorithm**: Parses arbitrary alphanumeric prefixes and trailing numbers, increments the sequence integer, preserves leading zeros, and falls back to `${str}-0001` if non-numeric.
* **Tolerance**: User can freely type any customized sequence into Entry No. The ERP saves the customized value, increments it for the subsequent bill, and stores it in `localStorage`.
* **Zero Overwrite Rule**: The ERP never overrides a user's customized series with system default fallbacks.

---

## Automated QA & Selenium Verification Milestones (October 2026)

All modules verified using headless Chrome Selenium test suites with 100% assertions:
1. **`test_purchase_return_selenium.py` (Pass 100%)**:
   * Tested sequence customization: `RJ-DN-0020` &rarr; Next Bill: `RJ-DN-0021`.
   * Inward bill `#PB-0001` loaded (Sun Pharma Ltd.), stock routed to Breakage Godown, total ₹863.98.
   * Verified PostgreSQL DB Invoice: `ID=a3b8bc01-a53f-44ab-b68a-0048ba60c392`, Number=`RJ-DN-0020`.
   * Verified auto-posted GL Journal Voucher: `JRN/2026-27/0161` (`Dr Sun Pharma Ltd. ₹863.98`, `Cr Purchase Return ₹863.98`).
2. **`test_sales_return_selenium.py` (Pass 100%)**:
   * Tested sequence customization: `RJ-CN-8281` &rarr; Next Bill: `RJ-CN-8282`.
   * Billed invoice `#INV-TEST-E41A` loaded (Apollo Pharmacy Ltd.), return qty edited via keyboard.
   * Verified PostgreSQL DB Invoice: `ID=9a7efccc-378d-4760-93b1-fab037d5d340`, Number=`RJ-CN-8281`.
   * Verified auto-posted GL Journal Voucher: `JRN/2026-27/0165` (`Dr Sales Return ₹156.80`, `Cr Apollo Pharmacy ₹156.80`).
3. **`test_sales_bill_selenium.py` (Pass 100%)**:
   * Counter flow, batch selection, settlement modal, and invoice persistence verified with 0 errors.
4. **`test_master_all_6_modules_selenium.py` (Pass 100% across all 6 modules)**:
   * **Sales Bill**: `RJ-INV-6874` -> `RJ-INV-6875` (PostgreSQL Grand Total `₹571.00`).
   * **Purchase Bill**: `RJ-PB-7905` -> `RJ-PB-7906` (PostgreSQL Grand Total `₹952.00`).
   * **Supplier Debit Note**: `RJ-DN-8924` -> `RJ-DN-8925` (PostgreSQL Grand Total `₹95.20`).
   * **Customer Credit Note**: `RJ-CN-9937` -> `RJ-CN-9938` (PostgreSQL Grand Total `₹156.80`).
   * **Breakage & Expiry Issue**: `RJ-BKI-10950` -> `RJ-BKI-10951` (PostgreSQL Grand Total `₹420.00`).
   * **Breakage & Expiry Receive**: `RJ-BKR-11966` -> `RJ-BKR-11967` (PostgreSQL Grand Total `₹269.00`).
5. **`test_gst_compliance_selenium.py` (Pass 100% across all 10 steps)**:
   * **Executive KPI Cards**: Outward ₹1,52,519.34 (Tax ₹17,318.00), Inward ₹1,81,76,245.90 (ITC ₹29,03,956.42), Net Cash ₹0.00, ITC Carried Forward ₹28,86,638.42.
   * **GSTR-1 Multi-Tab**: Table 4 B2B (12 rows), Table 7 B2CS (37 rows), Table 9B CDNR (10 rows), Table 12 HSN (19 rows), Table 13 Docs (1 sequence).
   * **GSTR-2 Inward Register**: 105 purchase records with Debit Note ITC reversals (-₹95.20) and net eligible ITC calculator.
   * **GSTR-3B Return**: Table 3.1 Outward supplies (5 rows), Table 4 Eligible ITC (3 rows), Table 5.1 Tax payment breakdown (3 rows).
   * **Official GSTN JSON Export**: Government offline utility payload (`GSTR1_Offline_Utility_v1.5`) generated and validated for upload to `gst.gov.in`.
   * **Period Filtering**: MTD, Q1, Q2, and FY 2026-27 date presets refreshed cleanly.

---

## Management Reporting & Financial Statements (100% Verified via Selenium)

1. **Company-Wise Sales Report (`/reports`)**: Aggregates sales across 25+ manufacturers in `₹`, with inline drawer product drill-downs (`[▶ View Products]`) and multi-company search/batch filter modal. Verified 100% PASS via [`test_reports_and_finance_selenium.py`](file:///c:/Users/DELL/OneDrive/Desktop/erp2/test_reports_and_finance_selenium.py).
2. **Custom Report Designer (`/reports/designer`)**: Semantic query builder executing live queries against `/api/reports_v2/query` with grouping by Company/Party and reusable template persistence (`/api/reports_v2/templates`). Verified 100% PASS.
3. **Double-Entry Financial Suite (`/finance`)**:
   * **Day Book (`/finance/daybook`)**: Daily chronological transactions register with multi-leg double-entry GL postings.
   * **Ledger Statement (`/finance/ledger-statement`)**: 69 active ledger accounts, opening balances, and running closing balance statements.
   * **Trial Balance (`/finance/trial-balance`)**: Double-entry ledger verification across 62 active ledgers with debit/credit balance reconciliation.
   * **Profit & Loss (`/finance/profit-loss`)**: Income vs Expenses accounts with categorized sub-totals and period net profit calculation.
   * **Balance Sheet (`/finance/balance-sheet`)**: Authoritative capital, liabilities, and assets balance calculation.
   * **Bank Reconciliation (`/finance/bank-reconciliation`)**: Bank ledger statement mapper with split-screen unreconciled transactions.
   * All 8 reporting and finance modules verified 100% PASS in headless Chrome.

---

## Statutory GST Compliance & Tax Filing Engine (100% Verified via Selenium)

1. **Executive Statutory Tax Dashboard (`/gst`)**:
   * Real-time calculation of Outward Taxable Value (₹1,52,519.34), Outward Tax (₹17,318.00), Inward Value (₹1,81,76,245.90), Eligible ITC (₹29,03,956.42), Net Cash Payable (₹0.00), and ITC Carried Forward (₹28,86,638.42).
   * High-speed optimized queries (<0.4s response) with zero N+1 latency.
2. **GSTR-1 Outward Supplies Register**:
   * **Table 4 (B2B)**: Registered debtor sales with customer GSTIN, POS state codes, reverse charge flags, and tax rates.
   * **Table 7 (B2CS)**: Consolidated retail consumer sales.
   * **Table 9B (CDNR)**: Credit notes from sales returns reducing outward tax liability.
   * **Table 12 (HSN)**: Medicaments and consumables summary with quantities and UQC codes.
   * **Table 13 (Documents Issued)**: Numbering series tracking with cancellations audit.
3. **GSTR-2 Inward Supplies & ITC Register**:
   * 105 supplier purchase bills with vendor GSTINs, supplier bill numbers, and eligible ITC.
   * Automatic Debit Note ITC reversal matching (-₹95.20).
4. **GSTR-3B Monthly Consolidated Return**:
   * Table 3.1 Outward liabilities, Table 4 Eligible ITC, Table 5.1 Tax payment breakdown and cash liability set-off.
5. **Government GSTN Portal Offline JSON Utility**:
   * Standardized schema (`GSTR1_Offline_Utility_v1.5`) exported directly via `GET /api/gst/gstr1/json` for direct upload to `gst.gov.in`.
   * Verified 100% PASS across all 10 steps in [`test_gst_compliance_selenium.py`](file:///c:/Users/DELL/OneDrive/Desktop/erp2/test_gst_compliance_selenium.py).

## Payment, Receipt & Bill-by-Bill Settlement Engine (100% Verified via Selenium)

1. **Customer Counter Receipt Voucher (`[F6] Receipt`, `/receipt`, `/finance/receipt`)**:
   - High-speed keyboard-first interface (`ReceiptPaymentVoucher.tsx`) designed for rapid chemist counter collections.
   - Hotkey controls (`[F7]` Party Picker, `[Alt+A]` FIFO Allocation, `[Ctrl+S]` Save), Marg/Tally sequence continuation (`lastReceiptVoucherNo`), and support for Cash, Cheque, NEFT/RTGS, UPI.
2. **Supplier Outward Payment Voucher (`[F5] Payment`, `/payment`, `/finance/payment`)**:
   - Outward vendor payments against Creditor ledgers with auto-posting of Dr Creditor and Cr Cash/Bank.
3. **Bill-by-Bill Allocation Engine (`models.InvoiceAllocation` & DOC-07)**:
   - FIFO multi-bill chronological auto-allocation (`[Alt+A]`).
   - Partial bill settlement and floating on-account advance creation (`is_floating=True`).
4. **Outstanding & Ageing Analysis Workbench (`/finance/outstanding`)**:
   - Real-time debtor and creditor ageing engine categorized across statutory buckets: `0–30 Days (Current)`, `31–60 Days`, `61–90 Days`, and `90+ Days Overdue`.
   - Expandable bill drawers displaying underlying invoice breakdown with days overdue and ageing brackets.
   - One-click navigation to counter vouchers (`[Receive ↗]` and `[Pay ↗]`) and CSV export.
5. **Master Automated Selenium Suite (`test_receipt_payment_settlement_selenium.py`)**:
   - Verified 100% PASS across all 6 stages: Backend API authentication & endpoint check, headless browser launch, customer receipt entry & FIFO allocation, supplier payment entry, and ageing workbench audit.

## Journal Voucher, Accounting Adjustment & Accrual Management Engine (DOC-25 — 100% Verified via Selenium)

1. **Keyboard-First Journal Cockpit (`/journal`, `/finance/journal`)**:
   - Neumorphic Forest Green layout (`JournalVoucherEntry.tsx`) designed for rapid multi-leg double-entry adjustments.
   - Dynamic Auto-Balance (`[Ctrl+B]`): Instantly calculates delta between debits and credits and populates balancing line with exact Cr/Dr amount.
   - Hotkeys: `[Ctrl+B]` Auto-Balance, `[Ctrl+D]` Duplicate row, `[Alt+A]` Add line, `[Alt+S]` / `[Ctrl+S]` Post voucher.
   - Real-time pinned totals bar displaying Total Dr, Total Cr, Difference counter, and dynamic status indicator (`BALANCED` / `OUT OF BALANCE`).
2. **6 Statutory Transaction Classifications**:
   - Standard Manual Journal, Accrual Journal, Provision, Prepaid / Deferred Adjustment, Reclassification / Transfer, Opening Balance Adjustment.
3. **Accrual & Auto-Reversal Scheduler Engine**:
   - Automatically activates upon selecting Accrual Journal; schedules future reversal date (default 1st of next month) and serializes metadata.
4. **Journal Register & Audit Workbench (`/finance/journal-register`)**:
   - Central audit dashboard with KPIs: Total Journals, Total Volume (₹), Active Accruals, and Reversals Posted.
   - Expandable row drawers detailing underlying multi-leg entry accounts and Debit/Credit allocations.
5. **Traceable One-Click Atomic Reversal (`POST /api/finance/journal/{id}/reverse`)**:
   - Atomic GL inversion (Dr &rarr; Cr, Cr &rarr; Dr) neutralizing account balances while maintaining complete audit permanence.
   - Bidirectional linkage (`reversal_voucher_id`) and status transition to `Reversed`.
6. **Master Automated Selenium Suite (`test_journal_accrual_engine_selenium.py`)**:
   - Verified 100% PASS across all 6 stages (Exit Code 0): Direct API validation & double-entry enforcement, headless browser session, multi-leg cockpit entry with `[Ctrl+B]`, accrual reversal scheduling, and register one-click reversal.

---

## Production Update: DOC-26 — Expense, Petty Cash & Employee Reimbursement Engine (Verified October 2026)

1. **Enterprise Operational Expenditure & Reimbursement Cockpit (`/finance/expenses`)**:
   - 4 Live KPI Cards: `Approved Expenses` (₹), `Pending Approvals` count, `Active Advances` (₹), and `Settled Advances` count.
   - Unified 3-Tab Structure:
     - `Expense Claims & Approvals`: Master registry of claims with itemized line item breakdown drawers.
     - `Employee Advances & Imprest`: Advance issuance and management workbench.
     - `Expense Categories & GL Accounts`: Central catalog of operational expenditure accounts.
2. **Multi-Line Itemization & Advance Offset**:
   - `ExpenseClaimEntryModal.tsx`: Employee ledger selection, active advance filter, multi-line table with Category, Bill No, Bill Date, Amount, and Line Notes.
   - Real-time running total calculation.
3. **Double-Entry General Ledger Integration**:
   - One-Click Approval (`POST /api/expenses/claims/{id}/approve`): Generates balanced Journal Voucher in `vouchers` and `voucher_entries`:
     - $\text{Cr Employee / Claimant Ledger}$: Total Claim Amount
     - $\text{Dr Expense Category Ledgers}$: Itemized amounts
     - Invariance: $\sum \text{Dr} = \sum \text{Cr}$.
4. **Automatic Advance Settlement**:
   - Linking an active advance tags `[Advance: {id}]` into remarks; upon approval, backend atomically transitions the linked `EmployeeAdvance` to `Settled` and records `voucher_id`.
5. **Master Automated Selenium Suite (`test_expense_petty_cash_selenium.py`)**:
   - Verified 100% PASS across all 8 stages (Exit Code 0): Backend API auth, category loading, headless Chrome session (1440x950), employee advance issuance (₹5,000.00), multi-line claim submission (₹4,000.00), one-click approval, GL Journal Voucher assertion (`JRN/2026-27/0191`), and advance settlement.
   - 4 visual artifacts generated and stored in artifact directory.
6. **Single-Click Direct Operational Expense Cockpit & Live P&L Engine (Overhaul)**:
   - Built instant daily operational expense recording form (`POST /api/expenses/direct`) with explicit Paid From (`Cash in Hand` / `Bank A/c`) and Expense Head selection.
   - Seeding of 10 statutory Indirect Expense ledgers under `group_name = "Indirect Expenses"` ensuring direct P&L reflection.
   - Posts atomic balanced `Payment` vouchers (`Dr Expense A/c`, `Cr Cash/Bank A/c`), deducting Net Profit and Cash in Hand.
   - Interactive Live Accounting Impact Box displaying Dr, Cr, and Net Profit reduction before submitting.
   - High-density Executive Cockpit with 4 live KPI cards (Cash in Hand live balance, today's cash outflow, MTD paid, pending advances) and direct navigation links to `/finance/profit-loss`, `/finance/daybook`, and `/finance/ledger-statement/:id`.
   - Verified 100% PASS via automated script `test_direct_expense_pnl.py` and Selenium suite `test_direct_expense_ui_selenium.py` (Exit Code 0).

---

## Production Update: DOC-27 — Fixed Assets & Depreciation Engine (Verified October 2026)

1. **Enterprise Fixed Assets Cockpit (`/finance/assets` & `/finance/asset-categories`)**:
   - Built in Flagship Neumorphic Minimalist palette (Canvas `#eef2ef`, Pure White `#ffffff`, Accent Forest Green `#1b4332`, `#2d6a4f`).
   - 4 Live Executive KPI Cards: `Total Gross Block` (₹), `Accumulated Depreciation` (₹), `Net Book Value` (₹), and `Active Asset Count`.
   - Category management workbench supporting Companies Act 2013 and Income Tax Act Schedule II statutory asset blocks (Plant & Machinery, Buildings, Furniture & Fixtures, Computer Equipment, Vehicles).
2. **Depreciation Computation & Allocation Models**:
   - Both **Written Down Value (WDV)** and **Straight Line Method (SLM)** supported with configurable useful life and residual value (default 5%).
   - Daily and period depreciation proration based on asset capitalization date.
3. **Automated Double-Entry General Ledger Depreciation Runs**:
   - Single Asset Run & Bulk Financial Period Run (`POST /api/assets/depreciate/all` and `POST /api/assets/{id}/depreciate`).
   - Generates atomic balanced Journal Vouchers in General Ledger:
     - $\text{Dr Depreciation Expense A/c (P&L - Indirect Expenses)}$: Depreciation amount
     - $\text{Cr Accumulated Depreciation A/c (Balance Sheet - Asset Contra / Deduction)}$: Depreciation amount
     - Invariance: $\sum \text{Dr} = \sum \text{Cr}$.
   - Immediately reduces Net Book Value on Asset Cockpit and Net Profit on Profit & Loss Statement (`/finance/profit-loss`).
4. **Master Automated Selenium Suite (`test_fixed_assets_selenium.py`)**:
   - Verified 100% PASS across all 5 verification stages (Exit Code 0): Asset registration (`AST-2026-0001`), calculation of ₹20,000.00 depreciation on ₹2,00,000.00 asset, GL Journal Voucher generation (`JRN/2026-27/0201`), P&L verification showing ₹20,000.00 under Indirect Expenses, and Net Book Value reduction to ₹1,80,000.00.
   - 4 visual artifacts generated and stored in artifact directory (`asset_cockpit_initial.png`, `asset_registered_success.png`, `asset_depreciation_run_posted.png`, `asset_pnl_depreciation_verified.png`).

---

## Production Update: DOC-28 — Bank Reconciliation & Cash Control Engine (Verified October 2026)

1. **Dual Bank Reconciliation & Cash Control Workbench (`/finance/bank-reconciliation`)**:
   - Refactored into Flagship Neumorphic Minimalist architecture (`#eef2ef`, `#ffffff`, `#1b4332`).
   - 4 Live Real-Time BRS Metrics Cards:
     - `Statement Closing Balance`: Balance as per external bank statement.
     - `Book Balance (ERP)`: Live closing balance as per General Ledger bank account.
     - `Unreconciled Variance`: Calculated delta between statement and ERP books.
     - `Pending Clearance Count`: Total uncleared deposits and cheques in transit.
2. **Dual-Pane Interactive Reconciliation Workbench**:
   - Left Pane: ERP Bank Transactions (Payments issued, Receipts received, cheques unpresented).
   - Right Pane: External Bank Statement Feed with CSV import utility.
   - Interactive checkbox matching with real-time balance delta adjustment.
3. **Automated Multi-Rule Matching Engine (`POST /api/finance_v2/bank-recon/auto-match`)**:
   - Intelligent auto-matching based on Reference/Cheque Number, Exact Amount, and Date Proximity Tolerance (default $\pm 3$ days).
   - Auto-clears verified transactions with clearance date timestamp and generates detailed reconciliation audit logs.
4. **Physical Cash Denomination Counter & Daily Drawer Tally**:
   - Built-in currency denomination grid (`CashVerification` model) tracking physical notes (₹2000, ₹500, ₹200, ₹100, ₹50, ₹20, ₹10) and coins (₹5, ₹2, ₹1).
   - Live Physical Total computation vs System Book Cash Balance.
   - Identifies and flags Physical Cash Shortage or Excess with mandatory audit explanation and cashier verification notes.
5. **Master Automated Selenium Suite (`test_bank_recon_cash_selenium.py`)**:
   - Verified 100% PASS across all 6 verification stages (Exit Code 0): BRS workbench rendering, bank account selection, statement balance entry, auto-matching tolerance rule execution, physical cash denomination tally counting, and variance audit trail verification.
   - 3 visual artifacts generated and stored in artifact directory (`bank_recon_cockpit_initial.png`, `bank_recon_auto_match_modal.png`, `bank_recon_cash_denomination_tally.png`).

---

## Production Update: DOC-29 — Statutory GST, Tax, E-Invoicing & Compliance Engine (Verified October 2026)

1. **Comprehensive GST Statutory Filing Cockpit (`/gst`)**:
   - Built in Flagship Neumorphic Minimalist palette (`#eef2ef`, `#ffffff`, `#1b4332`, `#2d6a4f`).
   - Executive Summary KPI Cards: Outward Taxable Value (₹1,52,519.34), Outward Tax Liability (₹17,318.00), Inward Taxable Value (₹1,81,76,245.90), Eligible Input Tax Credit (ITC ₹29,03,956.42), Net Cash Tax Payable (₹0.00), and Net ITC Carried Forward (₹28,86,638.42).
2. **GSTR-1 Outward Supplies Multi-Tab Workbench**:
   - **Table 4 (B2B)**: Registered taxable outward invoices with recipient GSTIN, place of supply (POS), reverse charge flag, invoice type, taxable value, and tax rate breakdown.
   - **Table 7 (B2CS)**: Consolidated unregistered retail supplies grouped by state code and GST rate.
   - **Table 9B (CDNR)**: Credit and Debit Notes issued to registered recipients reducing outward liability.
   - **Table 12 (HSN Summary)**: HSN code level summary of goods sold with total quantity, UQC code, taxable value, and tax split.
   - **Table 13 (Documents Issued)**: Series audit tracking starting serial, ending serial, total count, and cancelled invoices.
3. **GSTR-2 Inward Supplies & ITC Register**:
   - 105 supplier purchase bills with vendor GSTINs, supplier bill numbers, and eligible ITC breakdown (CGST, SGST, IGST).
   - Integrated Debit Note ITC Reversal engine deducting purchase returns (-₹95.20) to prevent statutory ITC over-claim.
4. **GSTR-3B Monthly Consolidated Summary**:
   - Table 3.1 Outward supplies and advances liability.
   - Table 4 Eligible Input Tax Credit (ITC available, ITC reversed, net ITC).
   - Table 5.1 Payment of tax and ledger cash set-off.
5. **Official GSTN Portal Offline JSON Utility v1.5**:
   - Exports official offline utility format JSON payload (`GET /api/gst/gstr1/json`) matching government portal schema specifications for direct upload to `gst.gov.in`.
6. **E-Invoicing (IRN), E-Way Bill & Signed Ledger Workbench (`/gst/compliance` & `/gst/signed-ledger`)**:
   - Direct B2B E-Invoice generation with 64-character Invoice Reference Number (IRN) and signed QR code.
   - National Informatics Centre (NIC) E-Way Bill generation for consignments exceeding ₹50,000 threshold with vehicle number and transporter ID.
   - Cryptographic SHA-256 digital signature verification for customer ledger statements (`SignedLedger.tsx`).
7. **Master Automated Selenium Suite (`test_gst_compliance_selenium.py`)**:
   - Verified 100% PASS across all 11 stages (Exit Code 0): Executive summary metrics assertion, GSTR-1 multi-tab navigation, GSTR-2 inward register, GSTR-3B consolidated return, offline utility JSON export, compliance workbench tabs, and period filtering.
   - 5 visual artifacts captured (`gst_cockpit_initial_view.png`, `gst_gstr1_view.png`, `gst_gstr2_view.png`, `gst_gstr3b_view.png`, `gst_compliance_workbench_view.png`).

---

## Production Update: DOC-31 — Dashboard, KPI, Business Intelligence & Management Control Centre Engine (Verified October 2026)

1. **Dual-Screen Architecture & Operational Role Segregation**:
   - **Screen 1: Operational Counter Workbench (Route: /, HomeScreen.tsx)**:
     - Tailored specifically for front-counter billing operators, cashiers, and store managers.
     - 4 Live Counter Metric Cards: Today's Cash Collected (₹64,575.00), Today's Credit Billed (₹1,19,925.00 / 24 Invoices), Active SKU Catalog (102 products), Stockout / Expiry Risk (12 Low • 426 Exp).
     - **Rapid Transaction Hub**: High-frequency 1-click & keyboard hotkey action triggers: [Sales Bill F2], [Purchase Bill F9], [Sales Return], [Purchase Return], [Receipt Voucher F6], [Payment Voucher F5], [Day Book], [Stock Register].
     - Urgent Counter Exception Center: Real-time alerts with direct 1-click action triggers ([Raise PO ↗], [Review Ledger ↗], [Approve ↗]).
     - Live Counter Voucher Ticker: Real-time audit stream displaying recent sales bills, pos cash slips, returns, and receipts.
     - Direct apex navigation button to the Executive BI Dashboard ([Executive BI Dashboard (Route: /dashboard) ↗]).
   - **Screen 2: Executive Business Intelligence Dashboard (Route: /dashboard, ClientDashboard.tsx & AdminDashboard.tsx)**:
     - Tailored for proprietors, CFOs, and executive leadership.
     - Executive KPI Strip: Gross Revenue (₹56,78,230.00 / +14.2% YoY), Procurement Volume (₹42,15,760.00 / +9.8% YoY), Gross Operating Margin (₹14,62,470.00 / 18.5%), Consolidated Liquidity (₹18,75,320.00 / Quick Ratio 1.82).
     - Apex Executive Controls: Active Operations vs Monitored Exclusions toggle, Quarter/MTD/YTD period filter, Back to Counter Home button.
2. **Comparative Visual Trends & Operating Expenses**:
   - **Sales Turnover vs Purchase Trend**: 7-Month comparative volume analysis (Apr-Oct) with dual gradient Area charts and volume legends.
   - **Operating Expense (Opex) Distribution**: Donut breakdown displaying ₹4.77 Lakhs overheads (Freight 32%, Godown 24%, Travel 18%, Depreciation/Assets 13%, Admin 13%).
   - **Top 5 Revenue-Generating Pharmaceutical Products**: Augmentin 625 Duo, Crocin 650, Dolo 650, Azithral 500, Pan-D with turnover amounts and pack progress bars.
   - **Statutory Receivables Outstanding Ageing Distribution**: Risk proportion bar and 4 bucket cards (0-30 days ₹3,54,800, 31-60 days ₹1,84,250, 61-90 days ₹95,500, 90+ days ₹47,900).
3. **Compact Regional Sales Map Widget & Click-to-Expand Modal**:
   - Embedded symmetrically in Row 2 (lg:col-span-3, ~340px height) matching the Operating Expenses donut card.
   - **Pure Sales Focus**: Displays exclusively territory turnover, retail chemist outlet counts, and monthly quota attainment (strictly ZERO fleet dispatching/van tracking).
   - Interactive SVG vector map polygons (Delhi NCR, Punjab & Haryana, Uttar Pradesh, Rajasthan).
   - **Click-to-Expand Modal (#mapModal)**: Clicking anywhere on the map card or the Expand ↗ button launches the enlarged interactive modal with high-res vector territory polygons, selected territory KPI cards, state comparison table, and direct DOC-30 register link.
4. **Backend RESTful API Engine (ackend/api/dashboard.py)**:
   - GET /api/dashboard/summary: Aggregates live today's sales, MTD revenue, procurement volume, trading margin, bank/cash balances, and inventory health.
   - GET /api/dashboard/sales-territories: Multi-state pharmaceutical sales turnover, chemist coverage, and quota attainment percentages.
   - GET /api/dashboard/trends: 7-month comparative trend curve, Opex distribution, top products ranking, and receivables ageing.
   - GET /api/dashboard/predictive: AI-ready rule engine calculating 30-day cash flow forecast, stockout velocity (run rates & days-to-stockout), customer churn risk, and near-expiry exposure.
   - GET /api/dashboard/alerts: Exception center warnings and real-time counter voucher ticker feed.
5. **Master Automated Selenium Suite (	est_dashboard_bi_control_center_selenium.py)**:
   - Verified 100% PASS across all 7 verification stages (Exit Code 0).
   - TypeScript compilation verified (
px tsc --noEmit) with 0 errors.
   - 3 live visual proof screenshots captured:
     - erified_homescreen_operational_workbench.png
     - erified_dashboard_bi_compact_view.png
     - erified_dashboard_bi_map_modal_opened.png

---

## Major Milestone: DOC-32 Workflow, Approval, Alert & Business Automation Engine (COMPLETED)

1. **Architectural Principles (DOC-32 Non-Negotiables)**:
   - **Orchestration Layer Only**: Coordinates routing, multi-tier thresholds, SLA timers, escalations, maker-checker governance, and idempotent post-approval triggers. Business modules retain 100% calculation and transactional ownership.
   - **Maker-Checker Separation of Duties**: The document creator cannot be the approver for their own transaction. System enforces HTTP 403 Forbidden and displays an orange compliance warning banner with disabled approve actions.
   - **Idempotency Guarantee**: Every workflow trigger utilizes a deterministic SHA-256 deduplication key (`SHA-256(tenant_id + doc_id + event)`) to prevent duplicate workflow instances on network retries.

2. **Relational Database Schema (`backend/models.py`)**:
   - `workflow_definitions`: Versioned no-code rule templates with JSONB configuration for tiered thresholds, maker-checker enforcement, and downstream action triggers.
   - `workflow_instances`: Tracks active/historic workflow execution lifecycles with unique SHA-256 idempotency key index.
   - `workflow_tasks`: Individual approval work items assigned to specific roles/users with SLA deadlines and priority flags.
   - `workflow_audit_logs`: Immutable chronological audit feed for regulatory compliance.

3. **Backend REST APIs (`backend/api/workflow.py`)**:
   - `GET /api/workflow/inbox`: Fetches pending & historic tasks with live SLA countdowns, priority urgency badges, and maker-checker eligibility.
   - `POST /api/workflow/tasks/{task_id}/action`: Executes `APPROVE`, `REJECT` (mandatory remarks), `DELEGATE`, and `ESCALATE`.
   - `GET/POST /api/workflow/definitions`: Rule templates and visual hierarchy builder.
   - `POST /api/workflow/trigger`: Universal cross-module workflow initiation with SHA-256 deduplication.
   - `GET /api/workflow/instances`: Real-time execution stream with audit timelines.
   - `POST /api/workflow/instances/{id}/retry`: Idempotent action retry for interrupted downstream steps.
   - `GET /api/workflow/analytics`: SLA turnaround time (1.8h TAT), 94.2% adherence, bottleneck analysis, and department distribution.

4. **Frontend Cockpits & Hotkey Integration**:
   - `WorkflowInbox.tsx` (`/workflow/inbox`): Keyboard-first approval queue (`[F4]` hotkey, `[A]` approve, `[R]` reject modal with mandatory explanation, `[D]` delegate, task detail slide-over drawer, Maker-Checker compliance banner).
   - `WorkflowDesigner.tsx` (`/workflow/designer`): Visual no-code rule designer with module/trigger pickers, multi-tier threshold builder (Tier 1 Manager, Tier 2 CM Admin, Tier 3 AM Admin), post-approval action picker, and interactive sandbox simulator (`#input-sim-amount`).
   - `WorkflowMonitor.tsx` (`/workflow/monitor`): Live execution stream, SLA analytics cards (TAT 1.8h, 94.2% adherence), bottleneck ranking, SHA-256 idempotency hash tracking, and 1-click safe retry button.
   - `HomeScreen.tsx` & `Header.tsx`: Wired `[F4]` function key, added Approval Inbox launcher card and Urgent Exceptions action button.

5. **Master Automated Selenium Suite (`test_workflow_approval_automation_selenium.py`)**:
   - Verified 100% PASS across all 10 verification stages (Exit Code 0).
   - 5 live visual proof screenshots captured:
     - `verified_workflow_homescreen_launcher.png`
     - `verified_workflow_inbox_drawer.png`
     - `verified_workflow_inbox_approved_rejected.png`
     - `verified_workflow_designer_simulator.png`
     - `verified_workflow_monitor_analytics.png`

---

## Enterprise Master Documentation: Complete Software Walkthrough (.docx)

An exhaustive, publication-grade master reference manual has been created as an editable Microsoft Word document:
- **Location**: `C:\Users\DELL\OneDrive\Desktop\erp2\ERP_ENTERPRISE_SYSTEM_COMPLETE_SOFTWARE_MASTER_WALKTHROUGH.docx` (and mirrored to `erp`).
- **Generator Script**: `generate_master_walkthrough_docx.py`.
- **Scope & Coverage**:
  1. Executive System Purpose, Zero-Mouse Guarantee, and Multi-Tenant AM/CM Partitioning.
  2. Dual-Screen Architecture (Counter Workbench `/` vs Executive BI Dashboard `/dashboard` with Regional Sales Map `#mapModal`).
  3. Universal Keyboard Command System & Marg/Tally Alphanumeric Series Continuation Algorithm (`incrementSeries`).
  4. Master Data Catalogs, Multi-Godown Warehouses (Saleable, Breakage, Expiry), and Drug Licensing (20B/21B).
  5. The 6 Core Transaction Voucher Modules (Sales Bill, Purchase Bill, Supplier Debit Note, Customer Credit Note, Breakage Issue, Breakage Receive) with step-by-step flows and GL impacts.
  6. Payment, Receipt & FIFO Bill-by-Bill Settlement Engine (`[F6]` Receipt, `[F5]` Payment, `[Alt+A]` FIFO Allocation, Ageing Analysis).
  7. Double-Entry General Ledger, Day Book, Trial Balance, P&L, Balance Sheet, and Journal Cockpit (`[Ctrl+B]` Auto-Balance, Accruals, Atomic Reversals).
  8. Operational Expenditures (Direct Expenses, Live P&L Impact Box, Advances), Fixed Assets (WDV/SLM Depreciation), and Cash Control (BRS auto-matching & Currency Denomination Drawer Tally).
  9. Statutory GST Compliance (GSTR-1, GSTR-2 with Debit Note ITC reversal, GSTR-3B, Government Offline Utility JSON, E-Invoicing IRN & E-Way Bill).
  10. Management Reporting & Executive BI (Company Sales Drill-downs, Custom Report Designer, Predictive Risk Signals).
  11. Workflow, Approval, Alert & Business Automation Engine (DOC-32: Inbox `[F4]`, Maker-Checker 403, Designer with Sandbox Simulator, SLA Monitor).
  12. Relational Database Schema Dictionary (18+ PostgreSQL models).
  13. RESTful API Directory (23+ core endpoints).
  14. Automated Selenium QA Verification Matrix (10 test suites, 100% assertions) & Production Deployment guide.

---

## How to Start Local Services

```powershell
# 1. Backend (FastAPI - Port 8000)
cd C:\Users\DELL\OneDrive\Desktop\erp2\backend
C:\Python313\python.exe -m uvicorn main:app --port 8000 --reload

# 2. Frontend (Vite - Port 50005)
cd C:\Users\DELL\OneDrive\Desktop\erp2
npm run dev -- --port 50005

# 3. Desktop Application (Tauri v2)
cd C:\Users\DELL\OneDrive\Desktop\erp2
npm run tauri dev
```

---

## How to Sync to Original Folder (`erp`)

To synchronize updates from `erp2` to the original Git repository `erp`:

```powershell
# Sync Frontend source
robocopy C:\Users\DELL\OneDrive\Desktop\erp2\src C:\Users\DELL\OneDrive\Desktop\erp\src /MIR /XD node_modules

# Sync Backend source
robocopy C:\Users\DELL\OneDrive\Desktop\erp2\backend C:\Users\DELL\OneDrive\Desktop\erp\backend /MIR /XD __pycache__ .venv .pytest_cache

# Sync Documentation & Root Configs
robocopy C:\Users\DELL\OneDrive\Desktop\erp2 C:\Users\DELL\OneDrive\Desktop\erp *.md *.docx *.json *.txt /XF package-lock.json /XD node_modules backend src .git
```

---
*End of Master Memory File.*


