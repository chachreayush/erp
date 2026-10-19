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
| **Frontend URL** | `http://localhost:50005` (Vite dev server) / Vercel Production (`https://erp-rho-three.vercel.app`) |
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

## Major Milestone: DOC-33 Audit Trail, Data Governance & Compliance Control Engine (COMPLETED)

1. **Architectural Principles (DOC-33 Non-Negotiables)**:
   - **Append-Only & Tamper-Evident**: Audit events cannot be updated or deleted through normal business UI or APIs. Storage is strictly immutable.
   - **Cryptographic Hash Chaining**: Every audit entry computes a deterministic SHA-256 digest linking back to the immediate predecessor (`prev_hash`):
     $$\text{event\_hash} = \text{SHA256}(\text{prev\_hash} + \text{tenant\_id} + \text{actor} + \text{event\_type} + \text{object\_type} + \text{object\_id} + \text{timestamp} + \text{before\_payload} + \text{after\_payload})$$
     Mathematical verification (`POST /api/audit/verify-chain`) certifies that no records were deleted, inserted out of order, or altered.
   - **Sensitive Data Redaction**: Passwords, tokens, secret keys, bank secrets, and credentials are automatically intercepted and redacted as `[REDACTED_SENSITIVE]` in before/after payload diff viewers.
   - **Audit of Audit**: Any export, legal hold creation/release, or policy adjustment automatically generates its own immutable audit event.
   - **Statutory Retention**: Preconfigured with statutory MCA/GST 8-year rules (2,920 days) across financial ledgers, vouchers, and audit logs.
   - **Legal Litigation Holds**: Freezes records subject to regulatory inquiry, overriding retention purges with mandatory release reason tracking.

2. **Relational Database Schema (`backend/models.py`)**:
   - `audit_events`: Stores `id`, `company_id`, `actor_id`, `actor_name`, `event_type`, `object_type`, `object_id`, `document_number`, `event_time`, `before_payload` (JSONB), `after_payload` (JSONB), `reason`, `correlation_id`, `prev_hash` (VARCHAR 64), `event_hash` (VARCHAR 64), and `is_verified` (BOOLEAN).
   - `retention_policies`: Stores `id`, `company_id`, `object_type`, `retention_days` (default 2,920 days / 8 years), `legal_hold_allowed`, `effective_from`, and `created_at`.
   - `legal_holds`: Stores `id`, `company_id`, `scope_type` (RECORD, MODULE, PARTY, ALL), `scope_id`, `scope_description`, `reason`, `created_by_id`, `released_at`, `release_reason`, and `created_at`.

3. **Backend REST APIs (`backend/api/audit.py`)**:
   - `GET /api/audit/events`: Multidimensional search and filter with pagination, total count, and latest hash seal.
   - `GET /api/audit/diff/{event_id}`: Field-by-field before/after diff with sensitive data masking and individual SHA-256 hash seal validation.
   - `POST /api/audit/verify-chain`: Complete sequential mathematical traversal and validation of the SHA-256 hash chain.
   - `GET/POST /api/audit/retention/policies`: Retention policy management (generates audit event).
   - `GET/POST /api/audit/legal-holds`: Statutory litigation and inquiry hold management (generates audit event).
   - `POST /api/audit/legal-holds/{id}/release`: Unfreezes records with mandatory release reason (generates audit event).
   - `GET /api/audit/anomalies`: Anomaly detection engine (mass edit velocity, repeated cancellations, after-hours modifications, active holds, chain seal).
   - `POST /api/audit/evidence-pack`: Produces cryptographically sealed audit evidence packs for statutory auditors (generates `AUDIT_EXPORT` event).
   - `POST /api/audit/log`: Generic module audit event logger.

4. **Frontend Cockpits & Launchers**:
   - `AuditExplorer.tsx` (`/audit`): Unified Audit Explorer with fuzzy search (`[Ctrl+F]`), module filter, event type filter, interactive timeline table, slide-over Change Detail Drawer with before/after field diffs, sensitive masking, SHA-256 seal verification badge (`✓ SEAL VALID (SHA-256)`), hash chain verification button (`#btn-verify-chain`), and evidence pack export modal.
   - `GovernanceConsole.tsx` (`/audit/governance`): 4-tab console for Retention Policies (MCA/GST 8-year standard), Statutory Legal Holds (`#modal-apply-hold`, release modal), Forensic Anomaly Signals (`MASS_EDITS`, `REPEATED_REVERSALS`, `AFTER_HOURS`, `ACTIVE_LEGAL_HOLDS`, `CHAIN_INTEGRITY`), and Auditor Evidence Pack Generator (`#btn-console-generate-evidence`).
   - `HomeScreen.tsx`: Added `Audit Trail` launcher tile (`#hub-btn-audit-trail`) and `Audit Trail ↗` action button in Urgent Exceptions.
   - `Header.tsx` & `MargAppShell.tsx`: Added navigation links and icons for Audit Trail and Governance Console.

5. **Master Automated Selenium Suite (`test_audit_governance_selenium.py`)**:
   - Verified 100% PASS across all 10 verification stages (Exit Code 0).
   - 5 live visual proof screenshots captured:
     - `verified_audit_homescreen_launcher.png`
     - `verified_audit_explorer_table.png`
     - `verified_audit_diff_drawer_seal.png`
     - `verified_audit_governance_console_holds.png`
     - `verified_audit_anomalies_and_evidence.png`

---

## Cargo & Consignment Management Engine (DOC-34)

Implemented and verified complete Cargo & Consignment Management Engine:
1. **Decoupled Freight Entity**: First-class consignment series continuation (`CN-YYYY-XXXX`) independent of invoice or dispatch numbering. Links 1-to-many and many-to-1 with sales bills, transfers, and dispatches.
2. **Admin-Funded Client Cargo Architecture**:
   - Zero-Debit Rule: Client Company General Ledger (DOC-08) is never automatically debited.
   - Cost Bearer Recognition: Freight cost recognized strictly in Platform Admin GL under Account 5200 (Central Freight & Logistics Expense).
   - Combined Reporting: Admin MIS aggregates cross-client freight expenditure (`GET /api/cargo/costs?combined=true`) without compromising multi-tenant isolation.
3. **Volumetric CBM & Package Barcodes**:
   - Barcoding standard: `PKG-YYYY-XXXX-NN`.
   - Volumetric dimensions: $(L \times W \times H) / 1,000,000$ in cubic meters ($m^3$).
4. **State Machine & Controlled POD**:
   - States: `PLANNED` -> `READY_FOR_LOADING` -> `LOADING` -> `DISPATCHED` -> `IN_TRANSIT` -> `DELIVERED` -> `CLOSED` (with `EXCEPTION` branching).
   - Four-eyes delivery sign-off with accepted vs short/damaged quantities and claim resolution desk.
5. **UI Cockpits & Launchers**:
   - `CargoBoard.tsx` (`/cargo` or `Ctrl+1`): KPI strip, Kanban status matrix, consignment registration modal (`[F6]`), slide-over detail drawer with volumetric calculation and status advance.
   - `CargoCostCenter.tsx` (`/cargo/costs` or `[F4]`): Admin-borne vs Client-borne bifurcation, combined multi-client reporting toggle, CSV manifest export.
   - `PodExceptionDesk.tsx` (`/cargo/pod-exceptions`): Pending POD queue, 4-eyes physical delivery sign-off, and active transit exception claims desk.
   - `HomeScreen.tsx`: Launcher tile (`#hub-btn-cargo-management`) and Urgent Exceptions shortcut button (`#btn-home-cargo-management`).
   - `MargAppShell.tsx` & `Header.tsx`: Navigation links and global `Ctrl+1` hotkey.
6. **Selenium Verification (`test_cargo_consignment_selenium.py`)**:
   - 10/10 Stages PASSED (Exit Code 0).
   - 5 screenshots captured:
     - `verified_cargo_homescreen_launcher.png`
     - `verified_cargo_board_kanban.png`
     - `verified_cargo_consignment_drawer.png`
     - `verified_cargo_cost_allocation_center.png`
     - `verified_cargo_pod_exception_desk.png`

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
  12. Audit Trail, Data Governance & Compliance Control Engine (DOC-33: Cryptographic SHA-256 Hash Chain, Tamper Detection, Before/After Diff Drawer, Legal Holds, Retention Policies, Auditor Evidence Packs).
  13. Cargo & Consignment Management Engine (DOC-34: Independent Series `CN-YYYY-XXXX`, Admin-Funded Client Cargo Architecture, Zero Client GL Auto-Debit, Volumetric CBM, 4-Eyes POD & Discrepancy Desk).
  14. Relational Database Schema Dictionary (25+ PostgreSQL models).
  15. RESTful API Directory (40+ core endpoints).
  16. Freight & Logistics Cost Recovery Engine (DOC-35: Carrier Contracts, Multi-Tier Slabs, Explainability Engine, GL Account 5200 Posting, 3-Way Reconciliation Desk).
  17. Automated Selenium QA Verification Matrix (15 test suites, 100% assertions) & Production Deployment guide.

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

## Customer Receipt & Supplier Payment Luxury Architecture (October 2026)

* **Component**: `src/pages/finance/ReceiptPaymentVoucher.tsx` (Serving `/receipt` and `/payment`).
* **Luxury Marg Theme**: High-contrast, dense financial styling matching Marg ERP with forest green palette (`#1b4332`, `#2d6a4f`, `#0f5132`, `#f8faf9`).
* **3-Card Telemetry Strip**:
  - `Active Ledger Balance (#kpi-active-balance)`: Real-time balance of selected party from General Ledger (Dr/Cr).
  - `Total Settlement Allocation (#kpi-total-allocated)`: Dynamic sum of allocated amounts across invoices in settlement grid.
  - `Unallocated Floating Credit (#kpi-unallocated-credit)`: Variance ($\text{Voucher Amount} - \text{Allocated}$); recorded as on-account advance.
* **Party Lookup Modal (`[F7]`, `#modal-party-picker`)**: Debtor/Creditor search with live balance, GSTIN, phone, and drug license.
* **FIFO Bill-by-Bill Allocation Engine (`[Alt+A]`, `#btn-auto-allocate-fifo`)**: Automatically cascades amount chronologically from oldest overdue bill.
* **Alphanumeric Series Continuation**: Sequential continuation (`REC-YYYY-XXXX`, `PAY-YYYY-XXXX`) preserving customized user prefixes.
* **Payment Modes**: Cash, Cheque, Bank Transfer (NEFT/RTGS), UPI with reference validation.
* **Automated Verification**: `test_receipt_payment_settlement_selenium.py` (100% PASS).

---

## Cryptographic SHA-256 Audit Trail & Data Governance Overhaul (October 2026)

* **Components**: `src/pages/audit/AuditExplorer.tsx` (`/audit`), `src/pages/audit/GovernanceConsole.tsx` (`/audit/governance`).
* **Audit Explorer (`/audit`)**:
  - 4 Top KPI Cards (`#kpi-total-audited`, `#kpi-chain-integrity`, `#kpi-active-holds`, `#kpi-terminal-hash`).
  - Cryptographic Chain Banner (`#banner-chain-integrity`): Green seal badge confirming sequential SHA-256 links (`prev_hash` &rarr; `event_hash`).
  - Slide-Over Diff Drawer (`#drawer-audit-diff`): Visual side-by-side comparison of before/after field values with `ADDED`, `MODIFIED`, `REMOVED` tags and sensitive credential redaction (`[REDACTED_SENSITIVE]`).
  - Evidence Pack Exporter (`#btn-export-evidence-pack` / `[E]`): Produces cryptographically signed JSON compliance evidence packs for MCA/FDA audits.
* **Data Governance Console (`/audit/governance`)**:
  - Retention Policies Tab: MCA & CGST 8-year standard retention (2,920 days) across INVOICE, VOUCHER, AUDIT_EVENT, PARTY tables.
  - Statutory Legal Holds Tab: Apply litigation holds (`#modal-apply-hold`) freezing records against disposal with mandatory release justifications.
  - Forensic Anomaly Radar: 5 heuristic signals (`MASS_EDITS`, `REPEATED_REVERSALS`, `AFTER_HOURS`, `ACTIVE_LEGAL_HOLDS`, `CHAIN_INTEGRITY`).
* **Automated Verification**: `test_audit_governance_selenium.py` (100% PASS).

---

## Universal Escape Key Navigation & Application Lifecycle Architecture

* **Hierarchical Esc Lifecycle**:
  - **Level 1 (Topmost Modal / Drawer)**: Pressing `[Esc]` dismisses active slide-over inspection drawers (Consignment Drawer, Audit Diff Drawer), batch/party modals (`[F3]`/`[F7]`), or settlement popups (`[End]`) without page route changes.
  - **Level 2 (Sub-Page Navigation)**: On dedicated transaction/finance screens (`/sales`, `/purchase`, `/cargo`, `/audit`, `/receipt`, `/payment`), pressing `[Esc]` smoothly returns to Counter Workbench (`HomeScreen` at `/`).
  - **Level 3 (Counter Workbench Exit Confirmation)**: On the Counter Workbench (`/`), pressing `[Esc]` opens the high-contrast Application Exit Modal (`#modal-exit-app`). Pressing `Enter` confirms exit, while pressing `[Esc]` or clicking `Cancel` immediately resumes counter operations.
* **Workflows Dropdown (`[F4]`)**: Consolidated navigation dropdown in header (`#btn-workflow-dropdown`) linking Approvals Inbox, Designer, SLA Monitor, Cargo Board, Cost Center, and POD Desk.
* **Automated Verification**: `test_esc_navigation_and_cargo_flow_selenium.py` (100% PASS).

---

## Freight & Logistics Cost Recovery Engine (DOC-35)

Implemented and verified the production-grade Freight & Logistics Cost Recovery Engine:
1. **First-Class Relational Models (11 PostgreSQL Models in `backend/models.py`)**:
   - `FreightContract`, `FreightLane`, `FreightRateRule`, `FreightAncillaryRule`, `FreightCostEvent`, `FreightCalculationSnapshot`, `FreightAllocation`, `FreightRecovery`, `FreightReconciliation`, `FreightCostBearerPolicy`, `FreightException`.
2. **First-Class Cost Bearer Policy Invariant**:
   - Zero Client General Ledger Auto-Debit: Client Company GL accounts are protected and never automatically debited for carrier freight charges.
   - Platform Admin Central Freight Ledger: Freight expenses strictly recognized in Platform Admin General Ledger under Account 5200 (`Central Freight & Logistics Expense`).
3. **Deterministic Multi-Tier Slab Calculation Engine (`backend/api/freight.py`)**:
   - Multi-tier weight slabs (`MIN_CHARGE`, `PER_KG`, `FLAT`, `VOLUMETRIC_RATIO`).
   - Dynamic ancillary charges (`DOCKET_FEE`, `ROV_SURCHARGE`, `FOD_CHARGE`, `FUEL_SURCHARGE`, `ODA_SURCHARGE`, `HANDLING_FEE`).
   - Volumetric CBM conversion ($(L \times W \times H) / 1,000,000$) with volumetric weight factor comparison.
   - Step-by-step explainability breakdown formula returned with all calculation snapshots.
4. **Interactive UI Cockpits**:
   - `FreightRateMaster.tsx` (`/freight/contracts` or `Ctrl+2`): Contract catalog, active lanes grid, live deterministic calculation sandbox with origin/destination pincode routing, weight/declared value inputs, step-by-step cost breakdown, and New Contract modal `[F6]`.
   - `FreightReconciliationDesk.tsx` (`/freight/reconciliation`): 3-way transporter bill audit matching ERP Estimated vs Consignment Actual vs Transporter Billed with automated tolerance checking (`MATCHED`, `TOLERABLE`, `UNAPPROVED_EXCESS`, `DISPUTED`) and 1-click Approve, Dispute, and Post GL actions.
   - Cross-linking from `CargoBoard.tsx` consignment drawer to live freight calculation engine.
5. **Backend REST API Endpoints**:
   - `GET /api/freight/summary`: Global KPIs, contract counts, active lanes, audited expenditure.
   - `GET /api/freight/contracts`: Multi-transporter rate cards and lane pricing matrices.
   - `POST /api/freight/calculate`: Deterministic live rating sandbox with ancillary breakdown and explainability formula.
   - `GET /api/freight/events`: Real-time cost recovery ledger events.
   - `POST /api/freight/allocate`: Consignment & invoice freight cost allocations.
   - `GET /api/freight/reconciliation`: Transporter bill audits and tolerance verification queues.
   - `POST /api/freight/reconciliation/{id}/action`: 1-click Approve, Dispute, and Post GL (Account 5200) actions.
   - `GET /api/freight/policies`: Organization cost bearer rules and GL account bindings.
6. **Automated Selenium Verification (`test_freight_logistics_selenium.py`)**:
   - 10/10 Stages PASSED (100% Exit Code 0).
   - 4 verified screenshots captured:
     - `verified_freight_homescreen_launcher.png`
     - `verified_freight_rate_cards_catalog.png`
     - `verified_freight_calculation_sandbox.png`
     - `verified_freight_reconciliation_desk.png`

---

## Master Screen-by-Screen UI Element & Hotkey Catalog

| Screen / Route | Element Selector / ID | Type & Hotkey | Functional Description & Expected Behavior |
| :--- | :--- | :--- | :--- |
| **Counter Workbench (`/`)** | `#hub-btn-sales-bill` | Button `[F2]` | Opens Counter Sales Billing screen with sequential invoice continuation. |
| **Counter Workbench (`/`)** | `#hub-btn-receipt-voucher` | Button `[F6]` | Opens Customer Collection & Receipt Voucher screen. |
| **Counter Workbench (`/`)** | `#hub-btn-payment-voucher` | Button `[F5]` | Opens Supplier Outward Payment Voucher screen. |
| **Counter Workbench (`/`)** | `#hub-btn-cargo-management` | Button `[Ctrl+1]` | Launches Cargo & Consignment Management Board. |
| **Counter Workbench (`/`)** | `#hub-btn-freight-management` | Button `[Ctrl+2]` | Launches Freight & Logistics Cost Recovery Engine. |
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
| **Freight Contracts (`/freight/contracts`)** | `#kpi-active-contracts` | Metric Card | Displays total active carrier contracts. |
| **Freight Contracts (`/freight/contracts`)** | `#kpi-configured-lanes` | Metric Card | Displays total active pricing lanes. |
| **Freight Contracts (`/freight/contracts`)** | `#btn-new-contract` | Button `[F6]` | Opens modal to configure new transporter contract. |
| **Freight Contracts (`/freight/contracts`)** | `#sandbox-origin-pincode` | Input | Origin pincode for deterministic lane lookup. |
| **Freight Contracts (`/freight/contracts`)** | `#sandbox-dest-pincode` | Input | Destination pincode for deterministic lane lookup. |
| **Freight Contracts (`/freight/contracts`)** | `#sandbox-weight-input` | Input | Chargeable consignment weight in kilograms. |
| **Freight Contracts (`/freight/contracts`)** | `#sandbox-declared-value` | Input | Declared consignment invoice value for ROV/FOD surcharges. |
| **Freight Contracts (`/freight/contracts`)** | `#btn-calculate-freight` | Button `[Enter]` | Executes deterministic multi-tier slab calculation. |
| **Freight Contracts (`/freight/contracts`)** | `#sandbox-total-freight` | Output | Displays calculated total freight cost. |
| **Freight Contracts (`/freight/contracts`)** | `#sandbox-gl-account` | Badge | Shows bound General Ledger account (Account 5200). |
| **Freight Reconciliation (`/freight/reconciliation`)** | `#kpi-total-audited-freight` | Metric Card | Total freight bills audited. |
| **Freight Reconciliation (`/freight/reconciliation`)** | `#kpi-approved-amount` | Metric Card | Net approved freight value. |
| **Freight Reconciliation (`/freight/reconciliation`)** | `#kpi-pending-variance` | Metric Card | Pending audit variance amount. |
| **Freight Reconciliation (`/freight/reconciliation`)** | `#reconciliation-table` | Data Grid | 3-way transporter matching table with variance badges. |
| **Freight Reconciliation (`/freight/reconciliation`)** | `#btn-approve-bill` | Button | Approves carrier bill within allowable tolerance. |
| **Freight Reconciliation (`/freight/reconciliation`)** | `#btn-dispute-bill` | Button | Marks unapproved excess bill into DISPUTED state. |
| **Freight Reconciliation (`/freight/reconciliation`)** | `#btn-post-gl` | Button | Posts approved freight cost to GL Account 5200. |
| **Counter Workbench (`/`)** | `#hub-btn-principal-management` | Button `[Ctrl+3]` | Launches Principal & C&F Operations Management Control Center. |
| **Principal Control Center (`/principal`)** | `#kpi-active-principals` | Metric Card | Active validated principal pharmaceutical companies. |
| **Principal Control Center (`/principal`)** | `#kpi-total-stock-val` | Metric Card | Total valuation of principal-owned stock held in consignment custody. |
| **Principal Control Center (`/principal`)** | `#kpi-pending-claims` | Metric Card | Pending breakage, expiry, and shortage claims awaiting principal approval. |
| **Principal Control Center (`/principal`)** | `#kpi-reconciled-health` | Metric Card | Count of 3-way reconciliation statements matched with 0 variance. |
| **Principal Control Center (`/principal`)** | `#kpi-freight-attribution` | Metric Card | Platform Admin freight subsidy recognized under GL Account 5200. |
| **Principal Control Center (`/principal`)** | `#tab-btn-stock` | Tab `[F2]` | Opens Principal Stock Ownership & Custody matrix with batch provenance. |
| **Principal Control Center (`/principal`)** | `#tab-btn-claims` | Tab `[F3]` | Opens Claims & Returns Desk for expiry, breakage, and shortage claims. |
| **Principal Control Center (`/principal`)** | `#tab-btn-recon` | Tab `[F4]` | Opens 3-Way Reconciliation Workspace with external statement matching. |
| **Principal Control Center (`/principal`)** | `#tab-btn-statement` | Tab `[F5]` | Opens Reconstructable Principal Statement with non-editable movements. |
| **Principal Control Center (`/principal`)** | `#tab-btn-mis` | Tab `[F6]` | Opens Commercial MIS & Operational Profitability console. |
| **Principal Control Center (`/principal`)** | `#btn-open-claim-modal` | Button `[F7]` | Opens modal to raise new operational claim (`#modal-new-claim`). |
| **Principal Control Center (`/principal`)** | `#btn-run-reconciliation` | Button | Executes automated 3-way matching engine against external statements. |
| **Principal Statement Desk (`/principal/statement`)** | `#select-statement-principal` | Dropdown | Selects active principal for detailed period statement reconstruction. |

---

## Principal & C&F Operations Management Engine (DOC-36)

Implemented and verified the production-grade Principal & C&F Operations Management Engine:
1. **First-Class Relational Models (16 PostgreSQL Models in `backend/models.py`)**:
   - `PrincipalOperatingContext`, `PrincipalAgreementVersion`, `PrincipalProductRule`, `PrincipalCustomerRule`, `PrincipalOwnershipRule`, `PrincipalEvent`, `PrincipalStockSnapshot`, `PrincipalClaim`, `PrincipalClaimLine`, `PrincipalReconciliation`, `PrincipalReconciliationLine`, `PrincipalStatementRun`, `PrincipalStatementLine`, `PrincipalCostAttribution`, `PrincipalCommissionRef`, `PrincipalSyncCheckpoint`.
2. **Inviolable Architectural Invariants**:
   - **Zero Duplicate Engines**: DOC-36 orchestrates Principal context across DOC-12 (Master), DOC-14 (Schemes), DOC-16 (Stock Movement), DOC-08 (GL Postings), DOC-07 (Settlements), and DOC-35 (Freight). It never creates redundant ledgers.
   - **Owner Separation at SKU/Batch Level**: Principal ownership is an explicit dimension. Two Principals can stock identical SKUs in the same warehouse without cross-owner stock pollution or commingling.
   - **Non-Editable Reconstructable Statements**: Principal stock statements and commercial balances are mathematically reconstructed from source movements and immutable events. Manual balance overrides are strictly prohibited.
   - **Reconciliation Variance Immutability**: Reconciliation cannot alter historical transaction ledgers; variances generate audit trails and follow-up adjustment or claim documents with four-eyes approval.
3. **Backend REST API Endpoints (`backend/api/principal.py`)**:
   - `GET /api/principal/summary`: Aggregated executive KPIs (Active Principals, Custody Stock Value, Pending Claims, Matched Reconciliations, Admin Freight Subsidy).
   - `GET /api/principal/list`: Multi-tenant Principal catalog with active agreements, commission rates, and stock totals.
   - `GET /api/principal/{id}/position`: Complete operational position (stock by SKU/batch, sales/outward, open claims, cost attribution, reconciliation status).
   - `GET /api/principal/{id}/statement`: Structured business statement for period with opening, receipts, sales, adjustments, claims, freight, and closing.
   - `POST /api/principal/claims`: Register new Principal claim with document evidence and batch provenance.
   - `POST /api/principal/claims/{id}/action`: 1-click Approve, Dispute, or Pass Intent to Settlement.
   - `GET /api/principal/reconciliations`: External statement reconciliation workspace.
   - `POST /api/principal/reconciliation/run`: Execute automated matching algorithm across system vs external statement lines.
4. **Interactive UI Cockpits**:
   - `PrincipalControlCenter.tsx` (`/principal` or `Ctrl+3`): 5 top KPI cards, 5 functional tabs (`[F2]`-`[F6]`), New Claim modal (`[F7]`), and live 1-click claim actions.
   - `PrincipalStatementDesk.tsx` (`/principal/statement`): Full-screen drill-down statement screen showing source transactions, batches, and settlement links with zero-balance editing guarantee and print format.
   - `HomeScreen.tsx`: Added `#hub-btn-principal-management` (`Ctrl+3`) tile to Counter Workbench grid.
5. **Automated Selenium Verification (`test_principal_operations_selenium.py`)**:
   - 10/10 Stages PASSED (100% Exit Code 0).
   - 4 verified screenshots captured:
     - `verified_principal_homescreen_launcher.png`
     - `verified_principal_control_center.png`
     - `verified_principal_claims_desk.png`
     - `verified_principal_reconciliation_statement.png`

---

## Complete 16-Suite Automated Selenium Verification Matrix & Live Production Audit

| Test Suite File | Coverage Scope | Verified Status |
| :--- | :--- | :--- |
| `test_master_all_6_modules_selenium.py` | Sales, Purchase, DN, CN, BKI, BKR | 100% PASS |
| `test_reports_and_finance_selenium.py` | Day Book, Ledger, Trial Balance, P&L, BS, BRS, Designer | 100% PASS |
| `test_gst_compliance_selenium.py` | GSTR-1, GSTR-2, GSTR-3B, Offline JSON, E-Invoice | 100% PASS |
| `test_receipt_payment_settlement_selenium.py` | Customer Receipt `[F6]`, Payment `[F5]`, FIFO `[Alt+A]` | 100% PASS |
| `test_journal_accrual_engine_selenium.py` | Multi-leg journal cockpit, `[Ctrl+B]`, 1-click reversals | 100% PASS |
| `test_direct_expense_ui_selenium.py` | Direct expense form, live P&L impact box, advances | 100% PASS |
| `test_fixed_assets_selenium.py` | Asset registration, WDV/SLM depreciation run | 100% PASS |
| `test_bank_recon_cash_selenium.py` | BRS auto-matching, cash denomination drawer tally | 100% PASS |
| `test_dashboard_bi_control_center_selenium.py` | Executive BI, 7-month curves, Opex donut, territory map | 100% PASS |
| `test_workflow_approval_automation_selenium.py` | Universal trigger, `[F4]` Inbox, Maker-Checker, Designer | 100% PASS |
| `test_audit_governance_selenium.py` | SHA-256 hash chain, diff drawer, legal holds, anomalies | 100% PASS |
| `test_cargo_consignment_selenium.py` | Consignment board, CBM calc, Admin cost center, POD desk | 100% PASS |
| `test_freight_logistics_selenium.py` | Freight rate cards, live slab calculation sandbox, 3-way reconciliation audit, GL Account 5200 posting | 100% PASS |
| `test_principal_operations_selenium.py` | Agreement catalog, stock custody segregation, breakage claims workflow, 3-way reconciliation match, reconstructable statement desk, [Esc] lifecycle | 100% PASS |
| `test_commission_recovery_selenium.py` | DOC-37 Commission summary, active agreements, on-the-fly calculation sandbox, SHA-256 hash validation, 4-eyes claim workflow, Service Invoice linking, periodic statement generation, modal [Esc] dismissal | 100% PASS |
| `test_esc_navigation_and_cargo_flow_selenium.py` | Universal Esc key handling, Exit modal, Workflows dropdown | 100% PASS |
| `verify_live_vercel_escape_and_workflows.py` | Live production audit: Workflows dropdown, Cargo navigation, Esc modal | 100% PASS |
| `verify_live_vercel_receipt_payment_audit.py` | Live production audit: Receipts, Payments, Audit Explorer, Governance Console | 100% PASS |
| `verify_live_vercel_freight_audit.py` | Live production audit: Rate Master, Sandbox [F4], Transporter Reconciliation Desk | 100% PASS |
| `verify_live_vercel_principal_audit.py` | Live production audit: Control Center, Claims Desk [F3], Modal [F7], Statement Desk | 100% PASS |
| `verify_live_vercel_commission_audit.py` | Live production audit: Commission launcher [Ctrl+4], Control Center telemetry, Sandbox [F3], Statements Desk [F5], New Claim Modal [F7] | 100% PASS |

---

## Production Verification Artifacts & Visual Proof Registry

### Local Selenium Verification Proof (12 Visual Screenshots)
1. `verified_freight_homescreen_launcher.png`: Counter Workbench (`/`) Freight launcher tile (`#hub-btn-freight-management`) `[Ctrl+2]`.
2. `verified_freight_rate_cards_catalog.png`: Freight Rate Master (`/freight/contracts`) telemetry KPI cards and carrier rate cards.
3. `verified_freight_calculation_sandbox.png`: Calculation Sandbox `[F4]` live rating simulation and formula breakdown.
4. `verified_freight_reconciliation_desk.png`: Transporter Billing & Reconciliation Desk (`/freight/reconciliation`) with variance badges.
5. `verified_principal_homescreen_launcher.png`: Counter Workbench (`/`) Principal launcher tile (`#hub-btn-principal-management`) `[Ctrl+3]`.
6. `verified_principal_control_center.png`: Principal Control Center (`/principal`) with 5 KPI cards and custody matrix.
7. `verified_principal_claims_desk.png`: Claims & Returns Desk (`/principal`) with claims register and New Claim Modal `[F7]`.
8. `verified_principal_reconciliation_statement.png`: 3-Way Reconciliation Workspace and Reconstructable Business Statement.
9. `verified_commission_homescreen_launcher.png`: Counter Workbench (`/`) Commission launcher tile (`#hub-btn-commission-management`) `[Ctrl+4]`.
10. `verified_commission_control_center.png`: Commission Control Center (`/commission`) with 6 KPI cards and rate cards matrix.
11. `verified_commission_sandbox_ledger.png`: Calculation Sandbox & Ledger with formula trace and SHA-256 integrity hash.
12. `verified_commission_statement_desk.png`: Principal Recovery Statements Desk with periodic run reconciliation balances.

### Live Vercel Production Cloud Verification (12 Visual Screenshots)
1. `live_vercel_freight_homescreen_launcher.png`: Live Counter Workbench with Freight launcher tile on Vercel CDN.
2. `live_vercel_freight_rate_master.png`: Live Freight Rate Master with carrier rate matrices on Vercel CDN.
3. `live_vercel_freight_calculation_sandbox.png`: Live Calculation Sandbox with live formula resolution on Vercel CDN.
4. `live_vercel_freight_reconciliation.png`: Live Transporter Reconciliation Desk on Vercel CDN.
5. `live_vercel_principal_homescreen_launcher.png`: Live Counter Workbench with Principal launcher tile on Vercel CDN.
6. `live_vercel_principal_control_center.png`: Live Principal Control Center with 5 telemetry KPI cards on Vercel CDN.
7. `live_vercel_principal_claims_desk.png`: Live Claims Desk with New Claim Modal and instant `[Esc]` dismissal on Vercel CDN.
8. `live_vercel_principal_statement_desk.png`: Live Full-Screen Authoritative Statement Desk on Vercel CDN.
9. `live_vercel_commission_homescreen_launcher.png`: Live Counter Workbench with Commission Engine launcher tile on Vercel CDN.
10. `live_vercel_commission_control_center.png`: Live Commission Control Center with 6 telemetry KPI cards on Vercel CDN.
11. `live_vercel_commission_sandbox_ledger.png`: Live Calculation Sandbox verifying turnover computation on Vercel CDN.
12. `live_vercel_commission_statement_desk.png`: Live Statements Desk verifying periodic recovery consolidation and [Esc] dismissal on Vercel CDN.

---

## Publication-Grade Master Walkthrough & Specification Documents
- **`ERP_ENTERPRISE_SYSTEM_COMPLETE_SOFTWARE_MASTER_WALKTHROUGH.docx`**:
  - Fully compiled to 2.53 MB (`2,534,877 bytes`) in both `erp2` and `erp`.
  - Section 21: Exhaustive DOC-35 Freight Engine chapter (11 PostgreSQL models, full API directory, UI catalog, 10-stage local test matrix, 4-stage live cloud matrix, and 8 embedded screenshots).
  - Section 22: Exhaustive DOC-36 Principal Engine chapter (16 PostgreSQL models, full API directory, UI catalog, 10-stage local test matrix, 4-stage live cloud matrix, and 8 embedded screenshots).
  - Section 23: Exhaustive DOC-37 Commission & Recovery Engine chapter (14 PostgreSQL models, 13 REST API endpoints, UI catalog, 10-stage local test matrix, 4-stage live cloud matrix, and 8 embedded screenshots).
- **`DOC-35_Freight_Logistics_Cost_Recovery_Engine_v2_0_FINAL.docx`**:
  - Appended Section 39: Live Vercel Production Cloud Verification & Visual Photographic Proof (4-stage matrix and 8 embedded figures).
- **`DOC-36_Principal_CandF_Operations_Management_Engine_v2_0_DETAILED_FINAL.docx`**:
  - Appended Section 39: Live Vercel Production Cloud Verification & Visual Photographic Proof (4-stage matrix and 8 embedded figures).
- **`DOC-37_Principal_CandF_Commission_Recovery_Engine_v2_0_DETAILED_FINAL.docx`**:
  - Appended Sections 36–39: System Verification, 14 Relational Models, Complete RESTful API Specifications, Marg ERP Terminal Cockpit & Zero-Mouse UI Catalog, and 14-Stage Verification Runbook with 8 Visual Evidence Figures.

---

## Production Update: C&F Consigning Agent Operational Model, 4-Pillar Commercial Deal Terms & Dual-Posting to Purchase Section (October 2026)

1. **C&F Consigning Agent Operational Context**:
   - Super-distributors and Carrying & Forwarding (C&F) / Consigning agents provide dedicated distribution infrastructure: Godown storage space, Dedicated warehouse/administrative staff, and Local cargo/transportation.
   - Distinct Separation of Concepts:
     - **Product Company**: Brand manufacturer / pharmaceutical entity associated with product SKUs (e.g., Sun Pharma, Cipla).
     - **Accounting Ledger**: Financial debtor/creditor ledger maintained in General Ledger (DOC-08).
     - **Customer Profile Product Mapping**: In Customer Profile (`PartyMaster.tsx`), each client can be mapped to one or more Product Companies (`CustomerProfile.company_ids` JSON column) or `ALL`.
2. **4-Pillar Commercial Reimbursement Matrix**:
   - Master Deal Terms stored in `PrincipalCommissionAgreement.terms_json.deal_terms`:
     - **Godown Rent**: Bearer (`PRINCIPAL` vs `DISTRIBUTOR`), default agreed monthly amount (e.g. ₹42,000.00).
     - **Staff Salary**: Bearer (`PRINCIPAL` vs `DISTRIBUTOR`), default agreed monthly payroll (e.g. ₹28,500.00).
     - **Cargo Freight**: Bearer (`PRINCIPAL` vs `DISTRIBUTOR`), logistics charge model.
     - **Sales Commission %**: Agreed percentage on client sales turnover (e.g. 6.50% on client sales).
3. **Dynamic Month-to-Month Sandbox Overrides**:
   - Calculation Sandbox allows dynamic monthly overrides:
     - Staff Salary custom input amount (e.g. ₹28,500.00).
     - Godown Storage custom input amount (e.g. ₹42,000.00).
     - Client Dealership Selection: Filters clients mapped to the selected Product Company (`GET /api/parties/clients-by-company/{company_id}`) and computes turnover percentage commission.
   - Calculates and tags entries with `client_id`, `client_name`, and `event_type` (`STAFF_SALARY`, `GODOWN_RENT`, `SALES_BILL`).
4. **Automated Dual-Posting Engine**:
   - When a Claim batch is approved and `CREATE_DOCUMENT` is triggered (`POST /api/commission/claims/{id}/action`):
     - **Outward Service Invoice**: Created with unique series `SINV-2026-XXXX`.
     - **Inward Service Purchase Bill**: Automatically generated as `models.Invoice` (`invoice_type="purchase-bill"`, entry number `PUR-SRV-2026-XXXX`, party as the Principal/Company), posting directly into the **Purchase Section** (`/purchase/list`).
     - **Bilateral Linkage**: Two `RecoveryDocumentLink` records generated (`SERVICE_INVOICE` and `PURCHASE_BILL`) for complete bilateral audit traceability.
5. **Selenium Automated Verification**:
   - `test_commission_recovery_selenium.py`: 12/12 stages PASSED (100% Exit Code 0).
   - Verified inward purchase bill `PUR-SRV-2026-XXXX` visible in Ag-Grid table on `/purchase/list`.
   - Captured and stored `verified_commission_purchase_dual_post.png`.

---

---

## Production Update: Enterprise Multi-Client Operations Tracking & Radar Engine (DOC-38, October 2026)

1. **Enterprise Context & Multi-Tenant Aggregation**:
   - Holding entities and C&F management hubs require an overarching supervisory console across multiple client companies (e.g. *KRISHNA MEDICAL AGENCIES*, *Test Org*).
   - Developed `AdminEnterpriseTracker.tsx` (accessible via route `/admin/tracking`, `/tracking`, Workbench tile `[Ctrl+6]`, or `/clients`).
   - Apex Scope Selector dynamically toggles between **Consolidated Multi-Client Radar** (`ALL`) and individual client isolation.

2. **Backend Telemetry Architecture (`/api/admin/tracking/*`)**:
   - `GET /api/admin/tracking/summary`: High-level aggregated KPIs (Gross Sales Turnover, Total Operating Expenses, In-Transit vs. Delivered Cargo, Client count, Authorized Product Brands count).
   - `GET /api/admin/tracking/clients`: Client-by-client operational scorecard matrix computing turnover, invoices count, operational expense claims, active cargo consignments, and mapped product brands per organization.
   - `GET /api/admin/tracking/sales`: Multi-client sales invoices ledger with client attribution, customer names, date filtering, item counts, and grand totals.
   - `GET /api/admin/tracking/expenses`: Multi-client operational claims and C&F service costs (storage rent, dedicated staff salaries, freight charges, petty cash).
   - `GET /api/admin/tracking/cargo`: Cross-client logistics consignment pipeline displaying origin/destination hubs, transporter names, vehicle/driver telemetry, and live status.

3. **Frontend Cockpit & Zero-Mouse Workspaces**:
   - 4 Neumorphic KPI Cards: Total Sales Turnover, Total Expenses & C&F, Cargo & Consignments (with In-Transit pulse), and Clients & Product Brands.
   - `[F2] Client Scorecards`: Matrix table with 1-click **Drilldown** action scoping all telemetry to that client.
   - `[F3] Sales Tracking`: Cross-client invoice register with client attribution badge.
   - `[F4] Expenses Tracking`: Multi-client operational claims ledger.
   - `[F6] Cargo Tracking`: Logistics board with vehicle numbers, transporter, route hubs, and live shipment status.
   - `[Esc]`: Universal return to Counter Workbench (`/`).

4. **Automated Selenium Verification**:
   - `test_admin_enterprise_tracking_selenium.py`: 12/12 stages PASSED (100% Exit Code 0).
   - Captured visual proof: `verified_admin_tracker_scorecards.png`, `verified_admin_tracker_sales.png`, `verified_admin_tracker_expenses.png`, `verified_admin_tracker_cargo.png`.

---

## Production Update: Responsive Top Navigation Architecture & Screen Fit (DOC-39, October 2026)

1. **Ergonomic Refactoring (`Header.tsx`)**:
   - Reorganized top green navigation bar from 13+ raw options down to **10 prioritized parent categories**:
     `Dashboard`, `Master ▾`, `Finance & Accounting ▾`, `Inventory ▾`, `Sales & Purchase ▾`, `C&F & Logistics ▾`, `Workflows [F4] ▾`, `GST & Compliance ▾`, `CRM & Admin ▾`, `Reports ▾`.
   - **`C&F & Logistics ▾` Dropdown**: Grouped Principal Operations, C&F Commission Engine, Admin Multi-Client Radar, Cargo Board, Freight Contracts, Transporter Recon, Cargo Cost Center, and POD Exception Desk.
   - **`Workflows [F4] ▾`**: Grouped Approval Inbox (`[F4]`), Rule Designer, SLA Monitor, Audit Trail Explorer (`/audit`), and Data Governance Console (`/audit/governance`).
   - **`CRM & Admin ▾`**: Grouped CRM Dashboard, Client Management (`/clients`), Admin Multi-Client Radar (`/admin/tracking`), Product Companies Master (`/master/companies`), Bulletin Board, and Settings.
2. **Keyboard Navigation & Viewport Certification**:
   - Arrow key trapping (`ArrowDown`, `ArrowUp`, `ArrowRight`, `ArrowLeft`), `Enter` navigation, and `Esc` dismissal.
   - Selenium verified: Header width 1422px in 1422px window with **zero horizontal overflow**.
   - Captured visual proof: `verified_top_menu_layout.png`, `verified_cf_dropdown_menu.png`.

---

## Production Update: Client Management C&F Commission & Expense Reimbursement Billing Engine with Bilateral Inward/Outward Dual-Posting (DOC-40, October 2026)

1. **Business Domain & Dual-Posting Architecture**:
   - Allows the Main Admin Agency to calculate, automate or manually adjust, and generate formal **Commission and Expense Reimbursement Bills** for client companies registered in Client Management (*KRISHNA MEDICAL AGENCIES*).
   - **Outward Bill in Main Admin**: Generates commercial bill in Billing (`models.Invoice` with `invoice_type="bill"`, e.g. `CF-BILL-2026-0002`). Classified under GST SAC **998599 (C&F Support Services)**.
   - **Inward Purchase Bill in Client Organization**: Automatically dual-posts an inward purchase bill (`models.Invoice` with `invoice_type="purchase-bill"`, e.g. `PUR-CF-2026-0002`) directly inside the client organization's database partition so both corporate entities' financial accounts balance simultaneously without reconciliation discrepancies.
   - **Audit Ledger**: Creates `models.CommissionCalculation` records parented to `models.CommissionEvent`, and an approved `models.RecoveryClaim` linked to documents via `models.RecoveryDocumentLink`.

2. **Backend RESTful Endpoints (`/api/commission/*`)**:
   - `GET /api/commission/clients/{client_org_id}/telemetry`: Pulls actual sales turnover, suggested commission % (5.0%), and depot operating expenses (storage rent, staff salaries, freight recharges).
   - `POST /api/commission/generate-client-bill`: Generates outward service bill, dual-posts inward client purchase bill, creates calculations and claims.
   - `GET /api/commission/client-bills`: Lists all generated client commission bills with dual purchase references.

3. **Frontend Cockpit (`CommissionControlCenter.tsx`)**:
   - New tab: **`[F5] Client C&F Billing Desk`** (`#tab-btn-client-billing`).
   - Client Organization Selector: `#client-billing-org-select`.
   - 1-Click **⚡ Auto-Fetch Client Turnover & Expenses**: `#btn-autofetch-client-telemetry`.
   - Dual configuration workspaces for Turnover/Commission and Reimbursable Depot Expenses (Storage Rent, Staff Salaries, Freight, Handling, GST).
   - Real-time Itemized Line Items Preview Table and Financial Summary.
   - Dual-Posting Checkbox (`#check-dual-post-purchase`) and Generate Button (`#btn-generate-client-bill`).
   - Success Card (`#generated-bill-success-card`) with direct navigation links to **Billing Desk [F7]** and **Purchase Register [F9]**.
   - Historical Client C&F Bills register table.

4. **Automated Selenium Verification**:
   - `test_client_commission_billing_selenium.py`: 13/13 stages PASSED (100% Exit Code 0).
   - Captured visual proof: `verified_client_commission_billing_desk.png`, `verified_client_bill_generated_dual_post.png`.

---

## Production Update: Pharma Expiry Radar, Stock Shift Quarantine Engine & Principal Debit Note Settlement Desk (DOC-41, October 2026)

1. **Business Domain & Architectural Innovation**:
   - Upgrades `InventoryDashboard.tsx` from static mock cards to a live **Pharma Expiry Radar & Breakage Cockpit**.
   - **4 Live Telemetry Metrics**: Main Stock Value (`Batch.current_stock`), Quarantined Godown Value (`Batch.brk_exp_stock`), 90-Day Near-Expiry Risk Valuation, and Principal Claims & Debit Note Exposure.
   - **Expiry Radar Engine (`[F2]`)**: Scans batch expiry dates and partitions into 4 critical horizons: 🔴 Expired ($\le 0$ days), 🟠 Critical ($\le 30$ days), 🟡 Warning ($\le 60$ days), and 🔵 Attention ($\le 90$ days) with manufacturer filters and search.
   - **Atomic Stock Shift Desk (`StockShiftVoucher.tsx`, `[F7]`)**: Pre-populates selected radar batches, validates stock availability, and executes atomic stock movement from `MAIN_SALEABLE_GODOWN` to `QUARANTINE_EXPIRY_GODOWN` decrementing saleable stock and incrementing quarantine stock in PostgreSQL.
   - **Automated Principal Claim & Debit Note Bridging**: Toggling `#check-auto-claim` automatically generates a formal `models.PrincipalClaim` (`CLM-PRN-YYYY-XXXX`) and itemized `models.PrincipalClaimLine`s under the selected Principal (*Sun Pharma*, *Cipla*, *Krishna Medical Agencies*), establishing an instant recovery audit trail in the Principal Claims Desk (`/principal`).

2. **Database Models & Schema**:
   - `models.StockShiftVoucher` (`stock_shift_vouchers`): `id`, `organization_id`, `voucher_no` (`SHF-2026-XXXX`), `shift_date`, `from_godown`, `to_godown`, `reason`, `total_items`, `total_qty`, `total_value`, `auto_claim_generated`, `principal_claim_id`, `status`.
   - `models.StockShiftItem` (`stock_shift_items`): `id`, `voucher_id`, `product_id`, `product_name`, `batch_id`, `batch_number`, `expiry`, `qty`, `rate`, `value`, `mrp`.

3. **Backend RESTful APIs (`backend/api/stock.py`)**:
   - `GET /api/stock/expiry-cockpit-telemetry`: Aggregate live KPIs across Main Stock, Quarantine, near-expiry risk buckets, and pending claims.
   - `GET /api/stock/expiry-radar-batches`: Classified batches with days to expiry, status tags, stock, and valuations.
   - `POST /api/stock/shifts`: Atomic reallocation transaction with optional dual-filing of `PrincipalClaim` and itemized `PrincipalClaimLine`s.
   - `GET /api/stock/shifts` & `GET /api/stock/shifts/{id}`: Historical audit register of `SHF-2026-XXXX` vouchers.

4. **Automated Selenium Verification**:
   - `test_pharma_expiry_quarantine_selenium.py`: 13/13 stages PASSED (100% Exit Code 0).
   - Captured visual proof: `verified_pharma_expiry_cockpit.png`, `verified_expiry_radar_batches.png`, `verified_stock_shift_voucher.png`, `verified_stock_shift_claim_success.png`, `verified_quarantine_stock_ledger.png`, `verified_principal_claim_from_shift.png`.

---

## Master Automated Test Matrix Registry (16 Suites — 100% PASS)

| # | Test Suite Script | Module Coverage | Assertions Target & Status |
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

## Complete System Architecture & Exhaustive Component Inventory

1. **Topology & Infrastructure**:
   - **Development Workspace**: `c:\Users\DELL\OneDrive\Desktop\erp2` (Active Vite Port 50005, FastAPI Port 8000).
   - **Local Git Repository**: `c:\Users\DELL\OneDrive\Desktop\erp` (Branch `main`, remote `origin https://github.com/chachreayush/erp.git`).
   - **Cloud Production Frontend**: `https://erp-rho-three.vercel.app` (Vercel Edge CDN with HTML5 SPA rewrites).
   - **Synchronization Tool**: `sync_to_erp.py` (Windows Robocopy mirroring source, backend, and documentation).

2. **Frontend Routes Catalog (35 Routes in `src/App.tsx`)**:
   - `/`: Counter Workbench (`HomeScreen.tsx`)
   - `/dashboard`: Executive BI Dashboard (`Dashboard.tsx`)
   - `/sales`: Marg-Speed Sales Counter Billing (`SalesBill.tsx`)
   - `/purchase`: Direct Inward Purchase Bill (`PurchaseBill.tsx`)
   - `/purchase/list`: Inward Purchase Bills Register (`PurchaseList.tsx`)
   - `/sales-return`: Customer Credit Note (`SalesReturnBill.tsx`)
   - `/purchase-return`: Supplier Debit Note (`PurchaseReturnBill.tsx`)
   - `/brk-receive`: Breakage & Damage Receive Entry (`BrkReceiveBill.tsx`)
   - `/brk-issue`: Breakage & Damage Return to Manufacturer (`BrkIssueBill.tsx`)
   - `/receipt` & `/finance/receipt`: Customer Collection Voucher (`ReceiptPaymentVoucher.tsx`)
   - `/payment` & `/finance/payment`: Supplier Payment Voucher (`ReceiptPaymentVoucher.tsx`)
   - `/journal` & `/finance/journal`: Multi-Leg Journal Voucher Cockpit (`JournalVoucherEntry.tsx`)
   - `/finance/journal-register`: Journal Register & 1-Click Reversal Desk (`JournalRegister.tsx`)
   - `/finance/daybook`: Chronological Daily Ledger Audit Trail (`DayBook.tsx`)
   - `/finance/ledger-statement`: Running Balance Ledger Statement (`LedgerStatement.tsx`)
   - `/finance/trial-balance`: Double-Entry Trial Balance (`TrialBalance.tsx`)
   - `/finance/profit-loss`: Revenue, COGS, Gross/Net Profit (`ProfitAndLoss.tsx`)
   - `/finance/balance-sheet`: Assets, Liabilities, Owner's Equity (`BalanceSheet.tsx`)
   - `/finance/bank-reconciliation`: BRS Auto-Matching & Cash Counter (`BankReconciliation.tsx`)
   - `/finance/fixed-assets`: Asset Register & WDV/SLM Depreciation (`FixedAssets.tsx`)
   - `/finance/expenses`: Direct Expense Payouts & Imprest Claims (`ExpenseManagement.tsx`)
   - `/finance/outstanding`: Customer & Vendor Ageing Analysis (`OutstandingWorkbench.tsx`)
   - `/stock`: Active Sellable Inventory Register (`CurrentStock.tsx`)
   - `/brk-exp-stock`: Non-Saleable Quarantined Stock Register (`CurrentStock.tsx`)
   - `/inventory-dashboard`: Expiry Radar & Breakage Cockpit (`InventoryDashboard.tsx`)
   - `/stock-shift`: Atomic Godown Stock Shift Desk (`StockShiftVoucher.tsx`)
   - `/inventory/replenishment`: Sales Velocity Reorder Engine (`Replenishment.tsx`)
   - `/cargo`: Logistics Consignment Kanban Board (`CargoBoard.tsx`)
   - `/cargo/costs`: Multi-Client Freight MIS Center (`CargoCostCenter.tsx`)
   - `/cargo/pod-exceptions`: 4-Eyes Delivery POD & Claims (`PodExceptionDesk.tsx`)
   - `/freight/contracts`: Carrier Rate Cards & Rating Sandbox (`FreightRateMaster.tsx`)
   - `/freight/reconciliation`: 3-Way Transporter Billing Reconciliation (`FreightReconciliationDesk.tsx`)
   - `/principal`: Principal Control Center & Custody Matrix (`PrincipalControlCenter.tsx`)
   - `/principal/statement`: Reconstructable Business Statement (`PrincipalStatementDesk.tsx`)
   - `/commission`: 4-Pillar C&F Commission Engine & Client Billing (`CommissionControlCenter.tsx`)
   - `/admin/tracking` & `/tracking`: Enterprise Multi-Client Operations Radar (`AdminEnterpriseTracker.tsx`)
   - `/master/companies` & `/companies`: Product Brand Manufacturers Master (`CompanyMasterDesk.tsx`)
   - `/clients`: Multi-Tenant Client Management & Mapping (`ClientManagement.tsx`)
   - `/master/parties`: Debtor & Creditor Master (`PartyMaster.tsx`)
   - `/gst`: GSTR-1, GSTR-2, GSTR-3B & Government Offline JSON (`GstReports.tsx`)
   - `/compliance`: E-Invoicing, IRN & QR Generation (`ComplianceWorkbench.tsx`)
   - `/workflow/inbox`: Maker-Checker Approval Inbox (`WorkflowInbox.tsx`)
   - `/workflow/designer`: Rule Hierarchy & Simulator (`WorkflowDesigner.tsx`)
   - `/workflow/monitor`: Turnaround Time & SLA Monitor (`WorkflowMonitor.tsx`)
   - `/audit`: SHA-256 Chained Event Stream Explorer (`AuditExplorer.tsx`)
   - `/audit/governance`: Statutory Retention & Legal Holds (`GovernanceConsole.tsx`)
   - `/reports`: Management Reports Viewer (`ReportViewer.tsx`)
   - `/reports/designer`: Custom Semantic Report Query Builder (`ReportDesigner.tsx`)

3. **Backend API Routers (40 Modules in `backend/api/`)**:
   - `sales.py`, `stock.py`, `finance_v2.py`, `reports_v2.py`, `reports.py`, `gst.py`, `admin_tracker.py`, `commission.py`, `principal.py`, `principals.py`, `freight.py`, `cargo.py`, `workflow.py`, `audit.py`, `master.py`, `parties.py`, `pricing.py`, `schemes.py`, `warehouses.py`, `transport.py`, `organizations.py`, `company_analytics.py`, `expenses.py`, `assets.py`, `compliance.py`, `orders.py`, `procurement.py`, `dispatch.py`, `bulletins.py`, `dashboard.py`, `batches.py`, `billing.py`, `claims.py`, `replenishment.py`, `stock_new.py`, `system.py`, `tds_tcs.py`, `append_stock.py`.

---

## Pharma Expiry Radar, Stock Shift Quarantine Engine & Principal Debit Note Settlement Desk (DOC-41)

1. **Architecture & Flow**:
   - Real-time batch shelf-life surveillance (`/inventory-dashboard`) across 4 risk horizons: 🔴 Expired ($\le 0$ days), 🟠 Critical ($\le 30$ days), 🟡 Warning ($\le 60$ days), and 🔵 Attention ($\le 90$ days).
   - Atomic Godown Stock Shift (`/stock-shift`): Reallocates batch inventory from `MAIN_SALEABLE_GODOWN` to `QUARANTINE_EXPIRY_GODOWN` by atomically decrementing `Batch.current_stock` and incrementing `Batch.brk_exp_stock`.
   - Automated Principal Debit Note Claim Bridging: Toggling `#check-auto-claim` automatically generates a formal `PrincipalClaim` (`CLM-PRN-YYYY-XXXX`) and itemized `PrincipalClaimLine`s under the selected Principal (*Sun Pharma*, *Cipla*, *Krishna Medical Agencies*), creating an instant audit trail in the Principal Claims Desk (`/principal`).
2. **Backend APIs**:
   - `GET /api/stock/expiry-cockpit-telemetry`: Aggregate live KPIs across Main Stock, Quarantine, 30/60/90-day risk buckets, and pending claims.
   - `GET /api/stock/expiry-radar-batches`: Classified batches with days to expiry, status tags, current stock, and valuation.
   - `POST /api/stock/shifts`: Atomic reallocation transaction with optional dual-filing of `PrincipalClaim` and itemized lines.
   - `GET /api/stock/shifts`: Historical audit register of `SHF-2026-XXXX` vouchers.
3. **Automated QA Verification (`test_pharma_expiry_quarantine_selenium.py`)**:
   - 13/13 Stages PASSED (Exit Code 0).
   - Live visual proof screenshots captured:
     - `verified_pharma_expiry_cockpit.png`
     - `verified_expiry_radar_batches.png`
     - `verified_stock_shift_voucher.png`
     - `verified_stock_shift_claim_success.png`
     - `verified_quarantine_stock_ledger.png`
     - `verified_principal_claim_from_shift.png`

---

## Statutory GST E-Way Bill & E-Invoice (IRN) Generation Desk (DOC-42)

1. **Statutory Transit Clearance Engine**:
   - Real-time qualification detection: Identifies all outbound B2B sales invoices exceeding the **₹50,000** statutory threshold (Rule 138 of CGST Rules, 2017) and inter-state consignments.
   - 1-Click Cryptographic IRN & EWB Generation: Computes 64-character SHA-256 IRN hash, 15-digit Ack No, 12-digit E-Way Bill number starting with `24`, journey validity calculation (1 day per 200 km), and signed digital QR code payload.
   - Printable CBIC Two-Part Delivery Slips: Official Government format featuring Part A (Supplier/Recipient GSTINs, Document Details, Valuation, HSN `3004 - Medicaments`), Part B (Vehicle number `DL-01-AB-1234`, Road Mode, Transporter Details), and high-contrast signed digital QR code representation.
   - Offline National Informatics Centre (NIC) Bulk JSON Generation: Generates official Schema 1.1 bulk JSON upload payloads with `TranDtls`, `DocDtls`, `SellerDtls`, `BuyerDtls`, `ItemList`, `ValDtls`, and `EwbDtls`.
2. **Database Schema**:
   - Enhanced `models.EinvoiceEwayLog` with `transporter_id`, `transporter_name`, `transporter_gstin`, `vehicle_no`, `vehicle_type`, `distance_km`, `transport_mode`, `doc_type`, `supply_type`, and `qr_code_svg`.
3. **Backend APIs (`backend/api/compliance.py`)**:
   - `GET /api/compliance/summary`: Live scorecards telemetry (Qualifying invoices, pending EWB, generated IRN, compliance rate, transporters).
   - `GET /api/compliance/invoices`: Filterable qualifying consignments register with live compliance badges.
   - `POST /api/compliance/generate-eway-irn`: Atomic cryptographic generation of 64-char IRN, 15-digit Ack No, 12-digit EWB No, validity period, and QR payload.
   - `GET /api/compliance/eway-slip/{invoice_id}`: Structured CBIC two-part delivery slip data with driver handover layout.
   - `POST /api/compliance/export-nic-json`: Strict Government-compliant bulk upload JSON payload.
4. **Master UI Elements in `ComplianceWorkbench.tsx` (`/compliance`)**:
   - 4 Live Scorecards: `#card-qualifying-invoices`, `#card-pending-eway`, `#card-generated-irn`, `#card-compliance-rate`.
   - 3 High-Contrast Tabs: `[F2] Qualifying Invoices Desk` (`#tab-qualifying-invoices`), `[F3] E-Way & IRN Register` (`#tab-eway-register`), `[F4] NIC Export Center` (`#tab-nic-center`).
   - Filters & Search: `#btn-filter-all`, `#btn-filter-pending-eway`, `#btn-filter-pending-irn`, `#btn-filter-compliant`, `#search-compliance-input`.
   - Transporter & Vehicle Modal (`#modal-transport-assignment`): `#select-transporter`, `#input-vehicle-no`, `#input-transport-distance`, `#select-transport-mode`, `#select-vehicle-type`, `#toggle-gen-eway`, `#toggle-gen-irn`, `#btn-confirm-generate-compliance`.
   - CBIC Printable Slip Modal (`#modal-eway-slip-preview`): `#btn-print-slip-dialog`, `#btn-close-slip-modal`, Part A and Part B sections, signed digital QR representation.
5. **Master Automated Selenium Suite (`test_gst_einvoice_eway_selenium.py`)**:
   - 13/13 Stages PASSED (Exit Code 0).
   - 3 live visual proof screenshots captured:
     - `verified_transport_assignment_modal.png`
     - `verified_compliance_cockpit.png`
     - `verified_eway_slip_preview.png`

---

## Statutory Multi-State GSTR-1, GSTR-2B & GSTR-3B Reconciliation Cockpit with Section 16(2)(aa) 2B ITC Matching Engine (DOC-43)

1. **Statutory Legislative Compliance**:
   - Enforces Section 16(2)(aa) of the CGST Act, 2017: Disallows Input Tax Credit (ITC) claiming in monthly GSTR-3B unless supplier has furnished the invoice in GSTR-1/IFF and it reflects in the recipient's auto-drafted Form GSTR-2B.
   - Dual-ledger matching engine: Correlates internal purchase vouchers against GSTR-2B entries into 4 distinct categories: `MATCHED`, `TAX_MISMATCH`, `MISSING_IN_2B` (At-risk blocked ITC), and `MISSING_IN_BOOKS` (Unclaimed credit).
   - Differential Tolerance Switcher: Allows accounts operators to switch tolerance thresholds ($\pm ₹1$, $\pm ₹5$, $\pm ₹10$) to accommodate rounding variances across diverse supplier billing systems.
   - Multi-State GSTIN Filtering: Supports multi-state operations filtering by 2-digit state code (`07 - Delhi`, `27 - Maharashtra`).
   - WhatsApp Supplier Dunning Desk: 1-click legal reminder modal pre-populated with Section 16(2)(aa) citation, blocked tax exposure, and instant WhatsApp dispatch (`https://wa.me/?text=...`).
   - 1-Click Bulk ITC Approval: Atomically marks qualifying records as `CLAIM_ITC` with remarks for monthly GSTR-3B Table 4(A)(5) filings.
   - Official GST Portal JSON Statement Ingestion: Ingests official JSON returns from `gst.gov.in`, instantly populating database tables and updating compliance scorecards.
2. **Database Schema**:
   - Added `models.Gstr2bEntry` (`gstr2b_entries` table in Neon PostgreSQL) with indexes on `(organization_id, return_period)`, `supplier_gstin`, and `invoice_number`.
3. **Backend REST APIs (`backend/api/gst.py`)**:
   - `GET /api/gst/reconciliation-summary`: Live scorecards telemetry (Available ITC, Safe ITC, At-Risk ITC, Unclaimed ITC, match ratio, multi-state GSTIN filters).
   - `GET /api/gst/reconcile-2b`: Itemized dual-ledger records with side-by-side values, taxable diff, tax diff, and audit actions.
   - `POST /api/gst/reconciliation-action`: Bulk/individual audit status updates (`CLAIM_ITC`, `DISPUTE`, `FORCE_MATCH`, `REVERSE`).
   - `POST /api/gst/import-2b`: Official GST Portal JSON return ingestion.
4. **Master UI Elements in `GstReports.tsx` (`/gst`)**:
   - 4 Live Scorecards: `#metric-2b-total-itc`, `#metric-2b-safe-itc`, `#metric-2b-match-ratio`, `#metric-2b-at-risk-itc`, `#metric-2b-unclaimed-itc`.
   - Category Pills: `#filter-recon-all`, `#filter-recon-matched`, `#filter-recon-tax_mismatch`, `#filter-recon-missing_in_2b`, `#filter-recon-missing_in_books`.
   - Control Bar: `#btn-open-ingest-2b`, `#btn-bulk-approve-itc`, `#input-recon-search`, `#select-recon-state`, `#btn-tolerance-1`, `#btn-tolerance-5`, `#btn-tolerance-10`, `#btn-export-2b-reconciliation`.
   - Dual-Ledger Grid: `#tbl-gstr2b-reconciliation`, `#chk-select-all-recon`, `#chk-recon-row-{idx}`, `#btn-approve-row-{idx}`, `#btn-dunning-row-{idx}`, `#btn-force-row-{idx}`.
   - Supplier Dunning Modal (`#modal-supplier-dunning`): `#textarea-dunning-message`, `#btn-copy-dunning`, `#btn-send-whatsapp`, `#btn-mark-disputed`, `#btn-close-dunning-modal`.
   - Portal JSON Ingest Modal (`#modal-ingest-portal-2b`): `#textarea-json-2b`, `#btn-cancel-ingest-modal`, `#btn-submit-ingest-2b`.
5. **Master Automated Selenium Suite (`test_gstr2b_reconciliation_selenium.py`)**:
   - 13/13 Stages PASSED (Exit Code 0).
   - 4 live visual proof screenshots captured:
     - `verified_gstr2b_telemetry_scorecards.png`
     - `verified_supplier_dunning_modal.png`
     - `verified_gstr2b_ingest_modal.png`
     - `verified_gstr2b_reconciliation_workbench.png`

---

## Enterprise Cloud Authentication, Multi-Tenant Session Recovery & Production Client Onboarding Desk (DOC-44)

1. **Production Cloud Authentication Handshake & Architecture**:
   - Asynchronous Live Cloud Authentication: 1-click demo button (`#btn-demo-login`) initiates live authentication against Render FastAPI backend (`https://erp-backend-liaw.onrender.com`), acquiring a genuine, cryptographically signed 8-hour JWT access token with full `am_admin` God-mode authority.
   - Quick Autofill Credential Chips: `#btn-quick-fill-admin` (`AM-0001` / `admin` / `Admin@123`) and `#btn-quick-fill-client` (`KMA` / `SAN` / `Admin@123`).
   - Self-Healing Session Recovery Engine: In `RegisterClientModal.tsx` and `ClientManagement.tsx`, stale or mock preview tokens (`demo-preview-jwt-token`) are transparently upgraded to active cloud sessions in the background before invoking write endpoints.
2. **Database Schema & Automated Seeding**:
   - `models.Organization`: Multi-tenant client companies with UUID primary key, unique uppercase `org_code`, and `is_am` flag.
   - `models.User`: Admin and staff accounts bound to `organization_id` with salted Bcrypt passwords and `role`.
   - `models.Session`: Active JWT token hashes (`token_hash`) with 8-hour expiration and instant server-side revocation.
   - `seed_chart_of_accounts`: Atomically populates 40+ statutory General Ledger accounts upon every new client creation.
3. **Backend REST APIs**:
   - `POST /auth/login`: Issues genuine 8-hour signed JWT access token.
   - `GET /api/organizations/`: Returns client companies matrix for AM Admin oversight.
   - `POST /api/organizations/register`: Enforces AM Admin role, creates organization and admin user, seeds chart of accounts, and commits atomically.
   - `POST /auth/impersonate`: Transitions active session into client's isolated database environment.
4. **Master UI Elements**:
   - Login: `#btn-quick-fill-admin`, `#btn-quick-fill-client`, `#btn-demo-login`.
   - Client Management: `#btn-register-new-client`, `#btn-open-enterprise-radar`.
   - Register Client Modal: `#input-client-org-name`, `#input-client-org-code`, `#input-client-admin-name`, `#input-client-admin-username`, `#input-client-admin-password`, `#btn-cancel-register-client`, `#btn-submit-register-client`.
5. **Master Automated Selenium Suite (`verify_live_vercel_client_creation.py`)**:
   - 6/6 Stages PASSED (Exit Code 0 against production `https://erp-rho-three.vercel.app`).
   - Visual artifacts captured:
     - `verified_live_vercel_login_chips.png`
     - `verified_live_vercel_client_registered.png`
     - `verified_live_vercel_clients_grid.png`

---

## DOC-45: Enterprise Purchase Order, Intelligent Stock Replenishment Radar & Vendor Procurement Desk

1. **Autonomous Replenishment Radar (`GET /api/procurement/replenishment-radar`)**:
   - Reconciles active product inventory with unexpired batch quantities.
   - Calculates effective stock: $\\text{Physical Stock} + \\text{Pending PO Qty}$.
   - Determines deficit quantity: $\\max(0, \\text{min\\_stock\\_level} - \\text{Effective Stock})$.
   - Computes suggested purchase volume: $\\max(\\text{Deficit Qty}, \\text{reorder\\_quantity})$.
   - Returns 4 Telemetry Scorecards: Critical 0-Stock Count, Below Reorder Count, Total Projected Deficit Outlay (₹ INR), and Active PO Pipeline.
2. **Multi-Vendor Best-Rate Optimizer (`GET /api/procurement/vendor-rate-comparison/{product_id}`)**:
   - Compares supplier quotes from historical purchase invoices and master party profiles.
   - Computes Net Effective Rate: $\\text{Offered Rate} \\times (1 - \\text{Discount \\%})$.
   - Evaluates payment credit terms (e.g. 21 vs 60 days) and delivery lead times.
   - Categorizes vendors with badges: `BEST_PRICE`, `FASTEST_DELIVERY`, `LONGEST_CREDIT`, `BULK_DISCOUNT`.
3. **1-Click Bulk PO Generation (`POST /api/procurement/generate-from-replenishment`)**:
   - Partitions selected deficit line items by preferred supplier.
   - Generates sequential Purchase Orders (`PO-YYYYMM-XXXX`) with line items.
4. **Keyboard-Operated PO Authoring Desk (`/po`)**:
   - Built in Flagship Luxury Forest Green design system (`#1b4332`, `#2d6a4f`).
   - 4 Tabs: `[F1]` Master PO Directory, `[F2]` Replenishment Radar, `[F3]` Create New PO, `[F4]` Vendor Rate Intelligence.
   - Supplier WhatsApp & Print Slip Modal (`#modal-po-dispatch`) with direct copy and WhatsApp Web URL.
   - Inward Purchase Bill Conversion Modal (`#modal-convert-po-purchase`), converting PO to `PUR-PO-XXXX` and updating GL.
5. **Master Automated Selenium Suite (`test_procurement_po_replenishment_selenium.py`)**:
   - 10/10 Stages PASSED (Exit Code 0).
   - Visual artifacts captured:
     - `verified_po_replenishment_scorecards.png`
     - `verified_po_replenishment_radar.png`
     - `verified_po_creation_workbench.png`
     - `verified_po_supplier_dispatch_modal.png`

---

## Comprehensive Master QA Test Registry (21 Suites)

| # | Suite Filename | Focus Area | Result |
| :--- | :--- | :--- | :--- |
| 1 | `test_master_all_6_modules_selenium.py` | Sales, Purchase, Debit/Credit Notes, Breakage Issue/Receive | 100% PASS (Exit Code 0) |
| 2 | `test_reports_and_finance_selenium.py` | Day Book, Ledger, Trial Balance, P&L, Balance Sheet, BRS | 100% PASS (Exit Code 0) |
| 3 | `test_gst_compliance_selenium.py` | GSTR-1, GSTR-2, GSTR-3B, Offline JSON, E-Invoice Desk | 100% PASS (Exit Code 0) |
| 4 | `test_receipt_payment_settlement_selenium.py` | Receipt `[F6]`, Payment `[F5]`, FIFO Bill Allocation `[Alt+A]` | 100% PASS (Exit Code 0) |
| 5 | `test_journal_accrual_engine_selenium.py` | Double-entry journal voucher, auto-balancing, accrual scheduler | 100% PASS (Exit Code 0) |
| 6 | `test_direct_expense_ui_selenium.py` | Direct expenses, live P&L impact box, imprest advances | 100% PASS (Exit Code 0) |
| 7 | `test_fixed_assets_selenium.py` | Fixed assets registration, periodic WDV/SLM depreciation | 100% PASS (Exit Code 0) |
| 8 | `test_bank_recon_cash_selenium.py` | BRS bank reconciliation, physical cash counter drawer tally | 100% PASS (Exit Code 0) |
| 9 | `test_dashboard_bi_control_center_selenium.py` | Executive BI dashboard, sales curves, opex donut, territory map | 100% PASS (Exit Code 0) |
| 10 | `test_workflow_approval_automation_selenium.py` | Multi-tier approval workflows, Maker-Checker, Designer | 100% PASS (Exit Code 0) |
| 11 | `test_audit_governance_selenium.py` | SHA-256 chained audit stream, before/after diffs, legal holds | 100% PASS (Exit Code 0) |
| 12 | `test_cargo_consignment_selenium.py` | Logistics consignment kanban board, CBM volumetric calc, POD desk | 100% PASS (Exit Code 0) |
| 13 | `test_freight_logistics_selenium.py` | Carrier rate contracts, rating calculation sandbox, transporter recon | 100% PASS (Exit Code 0) |
| 14 | `test_principal_operations_selenium.py` | Principal custody stock matrix, claims desk, 3-way reconciliation | 100% PASS (Exit Code 0) |
| 15 | `test_client_commission_billing_selenium.py` | C&F commission billing desk, dual-posting outward/inward invoices | 100% PASS (Exit Code 0) |
| 16 | `test_pharma_expiry_quarantine_selenium.py` | Expiry radar, stock shift quarantine voucher, principal claim bridging | 100% PASS (Exit Code 0) |
| 17 | `test_gst_einvoice_eway_selenium.py` | Compliance desk, transporter assignment, CBIC slips, NIC Schema 1.1 JSON | 100% PASS (Exit Code 0) |
| 18 | `test_gstr2b_reconciliation_selenium.py` | GST Cockpit `[F5]`, Scorecards, Tolerance $\pm ₹1/5/10$, Dunning Modal, Ingest 2B Modal | 100% PASS (Exit Code 0) |
| 19 | `verify_live_vercel_client_creation.py` | Live Vercel Auth, Presets, Client Management, Modal Form, Neon DB Write | 100% PASS (Exit Code 0) |
| 20 | `test_procurement_po_replenishment_selenium.py` | Procurement Desk `/po`, Scorecards, Radar `[F2]`, Bulk PO `[F7]`, Builder `[F3]`, WhatsApp Slip, Convert to Inward Bill | 100% PASS (Exit Code 0) |
| 21 | `test_grn_quality_inspection_selenium.py` | GRN Desk `/grn`, Inward Dock `[F2]`, Web Audio Barcode Scanner `[F3]`, Cold Chain `[F4]`, QA Inspection `[F8]`, GL Purchase Conversion | 100% PASS (Exit Code 0) |

---

## DOC-46: Goods Receipt Note (GRN), Physical Quality Inspection & Barcode Inward Verification Desk (`/grn`)

1. **Warehouse Gate Inward & PO Matching Engine (`POST /api/grn/`)**:
   - Linked to open Purchase Orders (`PurchaseOrder` model) with auto-population of vendor and line items.
   - Captures delivery vehicle number, vendor delivery challan number, carrier E-Way bill number, receiving bay, driver contact, received temperature, and tamper-evident seal integrity check.
   - Calculates item-level shortage automatically: $\text{Shortage Qty} = \max(0, \text{Challan Qty} - \text{Received Qty})$.
2. **Audio-Synthesized Barcode Rapid Scanner Desk (`[F3]`)**:
   - Web Audio API real-time acoustic synthesizer (`AudioContext` oscillator generating high-pitch `880Hz / 1760Hz` chime) providing instant acoustic feedback upon scanning.
   - Real-time tally counter and barcode string matching against SKU codes and EAN barcodes.
3. **Physical Quality Inspection & Cold-Chain Protocol (`[F4]`, `PATCH /api/grn/{grn_id}/inspection`)**:
   - Strict cold-chain compliance auditing ($2^\circ\text{C} - 8^\circ\text{C}$ refrigerated vs $15^\circ\text{C} - 25^\circ\text{C}$ ambient pharma stock).
   - Inspection outcome workflow: `ACCEPTED`, `REJECTED`, `PARTIALLY_ACCEPTED`, `QUARANTINED` with mandatory inspector badge and quarantine defect reasoning.
4. **General Ledger Purchase Bill Conversion Engine (`POST /api/grn/{grn_id}/convert-to-purchase`)**:
   - Automatically books standard `Purchase` bill (`PUR-GRN-XXXX`) crediting Creditors (`Sundry Creditors / Vendor Payable`) and debiting Purchase Account (`Stock In Trade`).
   - Distributes inward inventory into separate physical batches: accepted quantity increments `current_stock` (ready for sale), while damaged/rejected quantity increments `brk_exp_stock` (quarantine isolation).
5. **Master Automated Selenium Suite (`test_grn_quality_inspection_selenium.py`)**:
   - 12/12 Stages PASSED (100% Exit Code 0).
   - Visual artifacts captured:
     - `verified_grn_telemetry_scorecards.png`
     - `verified_grn_gate_inward_workbench.png`
     - `verified_grn_barcode_rapid_scanner.png`
     - `verified_grn_qc_coldchain_inspection.png`

---

*End of Master Memory File.*



