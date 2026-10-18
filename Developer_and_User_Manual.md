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
### 2.9 Customer Receipt & Supplier Payment Luxury Architecture (`/receipt`, `/payment`)
* **Financial Telemetry Strip**: 3 cards displaying Active Ledger Balance, Total Settlement Allocation, and Unallocated Floating Credit.
* **Party Lookup Modal (`[F7]`)**: Instant search across Debtor and Creditor ledgers with live balances and drug licenses.
* **FIFO Bill-by-Bill Allocation Engine (`[Alt+A]`)**: Auto-allocates payments chronologically from oldest overdue bills; permits row-by-row manual allocation.
* **Alphanumeric Series Continuation**: Alphanumeric series continuation (`REC-YYYY-XXXX`, `PAY-YYYY-XXXX`).
* **Verified 100% PASS**: Automated Selenium suite `test_receipt_payment_settlement_selenium.py`.

### 2.10 Executive Business Intelligence & Control Center (`/dashboard`)
* **Executive KPI Strip**: Gross Sales Turnover, Procurement Volume, Gross Operating Margin (%), Quick Ratio.
* **7-Month Comparative Curves**: Sales vs Procurement volume trends.
* **Opex Donut & Territory Map**: Expense breakdown and interactive regional territory modal (`#mapModal`) with chemist network drill-downs.
* **Verified 100% PASS**: Automated Selenium suite `test_dashboard_bi_control_center_selenium.py`.

### 2.11 Workflow Approval & Automation Engine (`/workflow/inbox`, `/workflow/designer`, `/workflow/monitor`)
* **Approvals Inbox (`[F4]`)**: Unified queue with SLA countdowns, 1-click Approve/Reject, and Maker-Checker 403 enforcement.
* **No-Code Designer**: Multi-tier hierarchy builder with sandbox transaction amount simulator (`#input-sim-amount`).
* **Real-Time SLA Monitor**: Enterprise TAT benchmarks (1.8h avg), 94.2% SLA adherence, and SHA-256 idempotency locks.
* **Verified 100% PASS**: Automated Selenium suite `test_workflow_approval_automation_selenium.py`.

### 2.12 Audit Trail & Data Governance Console (`/audit`, `/audit/governance`)
* **Audit Explorer (`/audit`)**: Top 4 KPIs, sequential SHA-256 hash chaining banner (`#banner-chain-integrity`), slide-over diff drawer (`#drawer-audit-diff`) with sensitive data masking, and auditor evidence pack generator (`[E]`).
* **Data Governance Console (`/audit/governance`)**: Retention schedules (2,920 days MCA/GST standard), statutory litigation legal holds (`#modal-apply-hold`), and forensic anomaly detection radar.
* **Verified 100% PASS**: Automated Selenium suite `test_audit_governance_selenium.py`.

### 2.13 Cargo & Consignment Management Engine (`/cargo`, `/cargo/costs`, `/cargo/pod-exceptions`)
* **Consignment Board (`/cargo` / `Ctrl+1`)**: Alphanumeric series continuation (`CN-YYYY-XXXX`), volumetric CBM calculator ($\text{Length} \times \text{Width} \times \text{Height} / 1,000,000$), package barcodes (`PKG-YYYY-XXXX-NN`).
* **Admin-Funded Client Cargo Architecture**: Logistics costs posted solely in Platform Admin GL under Account 5200; Client GL is never auto-debited (`Zero-Debit Rule`). Combined multi-client reporting toggle (`#toggle-combined-reporting`).
* **4-Eyes POD & Exception Claims Desk (`/cargo/pod-exceptions`)**: Delivery receiving queue, discrepancy damage/shortage logging, and carrier liability claim branch.
* **Verified 100% PASS**: Automated Selenium suite `test_cargo_consignment_selenium.py`.

### 2.14 Universal Escape Key Lifecycle & Header Workflows
* **Hierarchical Esc Handling**: Topmost modal/drawer dismissal &rarr; Sub-page return to Counter Workbench (`/`) &rarr; Counter Workbench Exit Confirmation Modal (`#modal-exit-app`).
* **Workflows Dropdown (`[F4]`)**: Application header dropdown providing immediate access to Approvals Inbox, Designer, SLA Monitor, Cargo Board, Cost Center, and POD Desk.
* **Verified 100% PASS**: Automated Selenium suite `test_esc_navigation_and_cargo_flow_selenium.py`.

### 2.16 Freight Management & Transporter Reconciliation (/freight/contracts, /freight/reconciliation)
* **Rate Master (`[Ctrl+2]`)**: Versioned carrier contracts with vehicle types (Tata 407, 14ft Canter, 32ft MXL), lane matrices, and surcharge schedules.
* **Calculation Sandbox (`[F4]`)**: Interactive rating engine evaluating weight breaks, minimum freight floors, and fuel surcharges.
* **Reconciliation Desk**: 3-way variance audit matching LR freight cost against transporter bills, posting settled freight liabilities to GL Account 5200.

### 2.17 Principal Operations & Consignment Custody (/principal)
* **Control Center (`[Ctrl+3]`)**: Neumorphic Forest Green dashboard with 5 KPI telemetry cards (Custody Stock, Open Claims, Settlements, Reconciliations, Admin Freight Subsidy).
* **Custody Inventory Matrix**: Physical godown segregation of pharmaceutical formulations with batch numbers and expiry tracking.
* **Claims Desk (`[F7]`)**: Fast breakage and damage claims filing with mandatory return proof and [Esc] dismissal.
* **Statements Desk**: Full-screen periodic stock and financial reconciliation statement with SHA-256 integrity hash.

### 2.18 C&F Commission & Recovery Engine (/commission)
* **Control Center (`[Ctrl+4]`)**: 6 KPI cards tracking earned turnover commission, recoverable depot expenses, and open claims.
* **4-Pillar Commercial Matrix**: Contractual deal terms for Godown Rent, Staff Salary, Freight Reimbursement, and Sales Commission %.
* **Deterministic Sandbox**: Live turnover simulation with dynamic month-to-month salary and rent overrides.
* **Bilateral Dual-Posting**: Approved claims batching generates outward Service Invoices and auto-posts inward purchase bills (`PUR-SRV-2026-XXXX`) directly into `/purchase/list`.

### 2.19 Admin Enterprise Multi-Client Radar (/admin/tracking, /tracking)
* **Enterprise Operations Radar (`[Ctrl+6]`)**: High-level single-pane-of-glass monitoring multiple client companies from Client Management.
* **Apex Scope Selector**: Instant toggle between consolidated multi-client analytics and isolated client-specific telemetry.
* **4 High-Contrast Tabs**: `[F2] Client Scorecards` with 1-click drilldown, `[F3] Sales Tracking` cross-client ledger, `[F4] Expenses Tracking`, `[F6] Cargo Tracking` pipeline.

### 2.20 Responsive 10-Item Top Navigation Bar
* **Screen Fit Architecture**: Refactored into 10 streamlined parent categories cleanly fitting standard screens (1366px, 1440px) with zero horizontal overflow.
* **C&F & Logistics Dropdown**: Consolidates Principal Ops, Commission Engine, Multi-Client Radar, Cargo Board, Freight Contracts, Transporter Recon, and Cost Center.
* **Zero-Mouse Ergonomics**: Full arrow key trapping (`ArrowDown`, `ArrowUp`, `ArrowRight`, `ArrowLeft`), `Enter` navigation, and universal `Esc` dismissal.

### 2.21 Client Management C&F Commission & Expense Billing Desk ([F5] on /commission)
* **Client Selection**: Direct integration with organizations from Client Management (e.g. Krishna Medical Agencies).
* **1-Click Auto-Fetch Telemetry**: Automatically queries client sales turnover, computes commission % (e.g. 5%), and aggregates godown rent, staff payroll, and freight recharges.
* **Manual Customization**: Flexible parameter adjustments for turnover, commission %, storage rent, staff salaries, transport costs, and handling charges.
* **Itemized Line Items Table**: Live invoice preview with SAC 998599 (C&F Support) and configurable GST.
* **Automated Dual-Posting Engine**: Atomically creates Outward Service Bill (`CF-BILL-2026-XXXX`) in Admin Billing and Inward Purchase Bill (`PUR-CF-2026-XXXX`) in the Client Company partition.
* **Success Feedback Card**: Instant links to View in Billing Desk (`[F7]`) and View in Purchase Register (`[F9]`), plus historical bills table.

### 2.22 Master Screen-by-Screen UI Element & Hotkey Catalog (Updated)

| Route | Selector / ID | Hotkey | Functionality |
| :--- | :--- | :--- | :--- |
| `/` | `#hub-btn-sales-bill` | `[F2]` | Counter Sales Billing with sequential continuation |
| `/` | `#hub-btn-receipt-voucher` | `[F6]` | Customer Collection & Receipt Voucher |
| `/` | `#hub-btn-payment-voucher` | `[F5]` | Supplier Outward Payment Voucher |
| `/` | `#hub-btn-cargo-management` | `[Ctrl+1]` | Cargo & Consignment Management Board |
| `/` | `#hub-btn-freight-management` | `[Ctrl+2]` | Freight Contracts & Rate Master |
| `/` | `#hub-btn-principal-management`| `[Ctrl+3]` | Principal Operations & Custody Control Center |
| `/` | `#hub-btn-commission-management`| `[Ctrl+4]` | C&F Commission & Recovery Engine |
| `/` | `#hub-btn-admin-tracking` | `[Ctrl+6]` | Enterprise Multi-Client Operations Radar |
| `/` | `#hub-btn-audit-trail` | - | Cryptographic SHA-256 Audit Trail Explorer |
| `/` | `#modal-exit-app` | `[Esc]` | Application exit confirmation modal (`Enter` exit, `Esc` cancel) |
| Header | `#btn-workflow-dropdown` | `[F4]` | Workflows navigation dropdown menu |
| Header | `parent-menu-btn-cf` | - | C&F & Logistics consolidated parent dropdown |
| `/receipt` | `#voucher-series-input` | - | Alphanumeric receipt series continuation (`REC-YYYY-XXXX`) |
| `/receipt` | `#party-search-input` | `[F7]` | Debtor party search popup with live balance |
| `/receipt` | `#btn-auto-allocate-fifo` | `[Alt+A]` | 1-Click FIFO auto-allocation across pending invoices |
| `/receipt` | `#btn-post-voucher` | `[Ctrl+S]` | Post receipt voucher to double-entry GL |
| `/payment` | `#voucher-series-input` | - | Alphanumeric payment series continuation (`PAY-YYYY-XXXX`) |
| `/payment` | `#party-search-input` | `[F7]` | Creditor party search popup with live balance |
| `/payment` | `#btn-auto-allocate-fifo` | `[Alt+A]` | 1-Click FIFO auto-allocation across pending vendor bills |
| `/audit` | `#input-audit-search` | `[Ctrl+F]` | Fuzzy search across audit trail |
| `/audit` | `#btn-verify-chain` | - | Cryptographic SHA-256 hash chain verification |
| `/audit` | `#drawer-audit-diff` | `[Enter]` | Slide-over before/after diff drawer |
| `/audit` | `#btn-export-evidence-pack` | `[E]` | Digitally sealed auditor evidence pack export |
| `/audit/governance` | `#tab-retention-policies` | - | Statutory 2,920-day retention policies tab |
| `/audit/governance` | `#btn-apply-legal-hold` | - | Establish litigation preservation legal hold |
| `/cargo` | `#btn-register-consignment` | `[F6]` | Consignment creation with volumetric CBM calculator |
| `/cargo` | `#drawer-consignment-detail` | - | Package barcodes and consignment detail drawer |
| `/cargo/costs` | `#toggle-combined-reporting` | - | Toggle combined multi-client freight MIS |
| `/cargo/pod-exceptions` | `#btn-record-delivery-pod` | - | Submit delivery POD with accepted vs damaged quantities |
| `/freight/contracts` | `#btn-new-contract` | `[F2]` | Create carrier rate card contract modal |
| `/freight/contracts` | `#tab-btn-rate-cards` | `[F2]` | Carrier rate card directory |
| `/freight/contracts` | `#tab-btn-sandbox` | `[F4]` | Freight calculation rating sandbox |
| `/freight/reconciliation` | `#tab-btn-unreconciled` | `[F2]` | Unmatched freight vouchers workbench |
| `/principal` | `#btn-open-claim-modal` | `[F7]` | Open Principal breakage/damage claim modal |
| `/principal` | `#tab-btn-custody` | `[F2]` | Principal custody inventory stock matrix |
| `/principal` | `#tab-btn-claims` | `[F3]` | Principal claims & returns register |
| `/principal` | `#tab-btn-reconciliation` | `[F4]` | 3-Way physical vs ledger reconciliation |
| `/principal` | `#tab-btn-statement` | `[F5]` | Periodic business reconciliation statement |
| `/commission` | `#tab-btn-agreements` | `[F2]` | 4-Pillar C&F deal terms and rate cards |
| `/commission` | `#tab-btn-sandbox` | `[F3]` | Deterministic calculation sandbox & trace |
| `/commission` | `#tab-btn-claims` | `[F4]` | Recovery claims desk & dual-post action |
| `/commission` | `#tab-btn-client-billing` | `[F5]` | Client C&F Commission & Expense Billing Desk |
| `/commission` | `#client-billing-org-select` | - | Client organization dropdown selector |
| `/commission` | `#btn-autofetch-client-telemetry` | - | 1-Click Auto-Fetch turnover and depot expenses |
| `/commission` | `#input-billing-turnover` | - | Client sales turnover input |
| `/commission` | `#input-billing-comm-rate` | - | Commission percentage input |
| `/commission` | `#input-billing-rent` | - | Godown storage rent reimbursement input |
| `/commission` | `#input-billing-salary` | - | Depot staff salaries reimbursement input |
| `/commission` | `#input-billing-freight` | - | Freight & transport recharge input |
| `/commission` | `#check-dual-post-purchase` | - | Checkbox for dual-posting to client purchase |
| `/commission` | `#btn-generate-client-bill` | - | Generate & post C&F bill button |
| `/commission` | `#generated-bill-success-card` | - | Success feedback card with outward/inward numbers |
| `/commission` | `#btn-goto-outward-billing` | `[F7]` | Jump to Outward Bill in Billing Desk |
| `/commission` | `#btn-goto-inward-purchase` | `[F9]` | Jump to Inward Bill in Purchase Register |
| `/admin/tracking` | `#select-tracking-scope` | - | Consolidated vs single client scope selector |
| `/admin/tracking` | `#card-tracking-sales` | - | Gross sales turnover KPI scorecard |
| `/admin/tracking` | `#card-tracking-expenses` | - | Operating expenses & C&F KPI scorecard |
| `/admin/tracking` | `#card-tracking-cargo` | - | Cargo consignments pipeline KPI card |
| `/admin/tracking` | `#tab-btn-scorecards` | `[F2]` | Client operational scorecards matrix tab |
| `/admin/tracking` | `#tab-btn-sales` | `[F3]` | Cross-client sales ledger tab |
| `/admin/tracking` | `#tab-btn-expenses` | `[F4]` | Multi-client expense claims tab |
| `/admin/tracking` | `#tab-btn-cargo` | `[F6]` | Logistics pipeline tracking tab |
| `/purchase/list` | `#grid-purchase-bills` | - | Inward purchase bills register Ag-Grid table |
| `/inventory-dashboard` | `#card-main-stock` | - | Main Saleable Stock Value & Units KPI scorecard |
| `/inventory-dashboard` | `#card-quarantine-stock` | - | Quarantined / Brk-Exp Stock Value KPI scorecard |
| `/inventory-dashboard` | `#card-near-expiry-risk` | - | 90-Day Near-Expiry Risk Batches KPI scorecard |
| `/inventory-dashboard` | `#card-claim-exposure` | - | Principal Claims & Debit Note Exposure KPI scorecard |
| `/inventory-dashboard` | `#tab-btn-radar` | `[F2]` | Expiry Radar table and alert filters tab |
| `/inventory-dashboard` | `#filter-bucket-ALL` | - | All Critical near-expiry filter pill |
| `/inventory-dashboard` | `#filter-bucket-EXPIRED` | - | Expired stock (<0d) filter pill |
| `/inventory-dashboard` | `#filter-bucket-30_DAYS` | - | Critical <30 days near-expiry filter pill |
| `/inventory-dashboard` | `#filter-bucket-60_DAYS` | - | Warning <60 days near-expiry filter pill |
| `/inventory-dashboard` | `#filter-bucket-90_DAYS` | - | Attention <90 days near-expiry filter pill |
| `/inventory-dashboard` | `#filter-company-select` | - | Manufacturer / Principal dropdown filter |
| `/inventory-dashboard` | `#search-batches-input` | - | Batch / SKU search text input |
| `/inventory-dashboard` | `#tbl-expiry-radar` | - | Real-time batch surveillance table |
| `/inventory-dashboard` | `#btn-select-all-batches` | - | Multi-batch select all checkbox toggle |
| `/inventory-dashboard` | `#btn-shift-selected-action` | `[F7]` | Shift selected batches to quarantine action button |
| `/inventory-dashboard` | `#tab-btn-quarantine` | `[F3]` | Quarantined & Breakage Stock Ledger tab |
| `/inventory-dashboard` | `#tab-btn-history` | `[F4]` | Stock Shift Audit Register historical vouchers tab |
| `/stock-shift` | `#select-from-godown` | - | Source Godown selector (Main Saleable Godown) |
| `/stock-shift` | `#select-to-godown` | - | Destination Godown selector (Quarantine Godown) |
| `/stock-shift` | `#check-auto-claim` | - | Auto-generate Principal claim & debit note checkbox |
| `/stock-shift` | `#select-principal-claim-target` | - | Target Principal dropdown (Sun Pharma, Cipla, Krishna) |
| `/stock-shift` | `#tbl-shift-items` | - | Stock Shift line items grid table |
| `/stock-shift` | `#btn-save-shift-voucher` | `[F7]` | Save Shift Voucher & execute atomic reallocation |
| `/stock-shift` | `#stock-shift-success-card` | - | Shift success card with voucher and claim references |
| `/stock-shift` | `#lbl-success-voucher-no` | - | Generated Stock Shift Voucher number (SHF-2026-XXXX) |
| `/stock-shift` | `#lbl-success-claim-no` | - | Generated Principal Claim reference (CLM-PRN-XXXX) |
| `/stock-shift` | `#btn-view-in-audit` | `[F2]` | View voucher in Stock Shift Audit Register |
| `/stock-shift` | `#btn-view-claim-desk` | `[F8]` | Jump to Principal Claims Desk |
| `/sales` | `#input-bill-series` | - | Alphanumeric series continuation input (`SLS-YYYY-XXXX`) |
| `/sales` | `#btn-search-party` | `[F7]` | Debtor Party search modal with live balance and drug license |
| `/sales` | `#grid-bill-items` | - | Bill item lines grid (Item, Pack, Batch, Exp, Qty, Free, Rate, Dis%, GST%) |
| `/sales` | `#btn-batch-modal` | `[F3]` | Batch Selection modal showing stock and expiry dates |
| `/sales` | `#btn-settlement-modal` | `[End]` | Settlement & Payment Mode modal (Cash, Bank, Credit) |
| `/sales` | `#btn-save-bill` | `[Ctrl+S]` | Saves bill, decrements batch stock, auto-posts double-entry GL voucher |
| `/purchase` | `#input-purchase-series` | - | Alphanumeric inward bill series input (`PUR-YYYY-XXXX`) |
| `/purchase` | `#input-vendor-inv-no` | - | Supplier's external invoice reference number |
| `/purchase` | `#btn-search-vendor` | `[F7]` | Creditor vendor search popup with live ledger balance |
| `/purchase` | `#btn-save-purchase` | `[Ctrl+S]` | Commits purchase, updates batch stock, auto-posts inventory & accounts payable |
| `/purchase/list` | `#grid-purchase-bills` | - | Inward purchase bills register with search, filter, and dual-post tags |
| `/purchase-return` | `#btn-mode-against-bill` | `[F2]` | Activates Against Inward Bill mode to load original purchase line items |
| `/purchase-return` | `#btn-mode-loose` | `[F3]` | Activates Loose Return mode for ad-hoc debit note issuance |
| `/purchase-return` | `#select-stock-disposition` | - | Routes returned goods to Saleable, Breakage, or Expired godown |
| `/purchase-return` | `#btn-save-debit-note` | `[Ctrl+S]` | Posts debit note, adjusts stock, generates reverse GL and ITC entries |
| `/sales-return` | `#btn-mode-against-bill` | `[F2]` | Activates Against Sales Bill mode to retrieve customer invoice lines |
| `/sales-return` | `#btn-mode-counter` | `[F3]` | Activates Counter Return mode with returnable quantity validation |
| `/sales-return` | `#btn-save-credit-note` | `[Ctrl+S]` | Saves credit note, increments stock, auto-posts sales return GL entries |
| `/brk-receive` | `#input-bkr-series` | - | Alphanumeric Breakage Receive series (`BKR-YYYY-XXXX`) |
| `/brk-receive` | `#btn-save-bkr` | `[Ctrl+S]` | Posts breakage receive, routing stock strictly into `brk_exp_stock` |
| `/brk-issue` | `#input-bki-series` | - | Alphanumeric Breakage Issue series (`BKI-YYYY-XXXX`) |
| `/brk-issue` | `#btn-save-bki` | `[Ctrl+S]` | Posts breakage issue to manufacturer, decrementing `brk_exp_stock` |
| `/journal` | `#input-journal-series` | - | Alphanumeric Journal series (`JRN-YYYY-XXXX`) |
| `/journal` | `#btn-auto-balance-gl` | `[Ctrl+B]` | Automatically calculates and inserts balancing Dr/Cr line |
| `/journal` | `#btn-add-journal-leg` | `[Alt+A]` | Adds new ledger line item to journal entry |
| `/journal` | `#check-schedule-accrual` | - | Configures scheduled automatic GL reversal on 1st of subsequent month |
| `/journal` | `#btn-post-journal` | `[Ctrl+S]` | Validates $\sum \text{Dr} = \sum \text{Cr}$ and posts journal voucher to ledger |
| `/finance/journal-register` | `#btn-reverse-journal` | - | 1-Click atomic GL reversal with linked audit trail |
| `/finance/expenses` | `#input-expense-amount` | - | Expense payout amount with live P&L impact preview |
| `/finance/expenses` | `#select-expense-account` | - | Dropdown for 10 statutory P&L expense heads |
| `/finance/expenses` | `#btn-post-expense` | - | Posts direct cash/bank expense voucher debiting P&L immediately |
| `/finance/fixed-assets` | `#btn-register-asset` | `[F2]` | Opens modal to register capital asset with Schedule II category |
| `/finance/fixed-assets` | `#btn-run-depreciation` | `[F5]` | Executes periodic WDV/SLM depreciation run across active assets |
| `/finance/bank-reconciliation` | `#btn-auto-match-brs` | - | Runs auto-matching algorithm against imported bank statement CSV |
| `/finance/bank-reconciliation` | `#btn-cash-drawer-tally` | `[F8]` | Opens RBI physical currency denomination counter and cash discrepancy report |
| `/finance/outstanding` | `#tab-btn-debtors` | - | Outstanding customer debit balances with 0-30, 31-60, 61-90, >90d ageing |
| `/finance/outstanding` | `#tab-btn-creditors` | - | Outstanding vendor credit liabilities with ageing analysis |
| `/gst` | `#tab-btn-gstr1` | - | GSTR-1 Outward Supplies return tables (B2B, B2CS, CDNR, HSN, Docs) |
| `/gst` | `#tab-btn-gstr2` | - | GSTR-2 Inward ITC register matching purchase bills and debit notes |
| `/gst` | `#tab-btn-gstr3b` | - | GSTR-3B Monthly consolidated return calculation |
| `/gst` | `#btn-export-gstn-json` | - | Exports official Government Offline Utility JSON file for `gst.gov.in` |
| `/reports` | `#select-report-category` | - | Financial, inventory, sales, and audit report catalog |
| `/reports/designer` | `#btn-execute-query` | - | Runs custom semantic report query builder |
| `/workflow/inbox` | `#btn-approve-task` | - | 1-Click task approval with maker-checker verification |
| `/workflow/inbox` | `#btn-reject-task` | - | Opens mandatory rejection remarks dialog |
| `/workflow/designer` | `#input-sim-amount` | - | Approval threshold simulator sandbox |
| `/workflow/monitor` | `#chart-sla-adherence` | - | SLA adherence metrics and average resolution TAT |
| `/master/parties` | `#btn-new-party` | `[F2]` | Opens new customer/vendor registration dialog |
| `/master/parties` | `#input-party-gstin` | - | Party GSTIN with statutory checksum validation |
| `/stock` | `#input-stock-search` | - | Instant search across product formulations, batches, and godowns |
| `/inventory/replenishment` | `#btn-generate-reorder` | - | Computes reorder quantities based on minimum stock and sales velocity |
| `/compliance` | `#card-qualifying-invoices` | - | Telemetry scorecard for qualifying outbound consignments (≥ ₹50,000) |
| `/compliance` | `#card-pending-eway` | - | Consignments pending E-Way Bill Part A & B transport slips |
| `/compliance` | `#card-generated-irn` | - | Invoices with verified cryptographic IRN and digital QR codes |
| `/compliance` | `#card-compliance-rate` | - | Live statutory compliance rating and color-coded progress bar |
| `/compliance` | `#btn-open-transport-modal` | `[F7]` | Opens Transporter & Vehicle Assignment modal (`#modal-transport-assignment`) |
| `/compliance` | `#btn-export-nic-json` | `[F8]` | Exports official Government NIC Schema 1.1 Bulk Upload JSON |
| `/compliance` | `#btn-confirm-generate-compliance` | `[Enter]` | 1-Click generation of 64-char IRN, 15-digit Ack No, 12-digit E-Way Bill |
| `/compliance` | `#btn-print-slip-dialog` | - | Print trigger for official Government of India CBIC two-part delivery slip |

---

### 2.23 Module 23 — DOC-41: Pharma Expiry Radar, Stock Shift Quarantine Engine & Principal Debit Note Settlement Desk

- **Route**: `/inventory-dashboard`, `/inventory/dashboard`, `/stock-shift` (or Top Nav `Inventory ▾` &rarr; `Expiry & Breakage Cockpit`).
- **Core Purpose**: Real-time batch shelf-life surveillance, atomic stock reallocation from Saleable to Quarantine Godowns (`Batch.current_stock` &rarr; `Batch.brk_exp_stock`), and automated bridging into `PrincipalClaim` (`CLM-PRN-YYYY-XXXX`) for debit note recovery.
- **Backend APIs**:
  - `GET /api/stock/expiry-cockpit-telemetry`: Aggregate live KPIs across Main Stock, Quarantine, 30/60/90-day risk buckets, and pending claims.
  - `GET /api/stock/expiry-radar-batches`: Classified batches with days to expiry, status tags (🔴 EXPIRED, 🟠 <30d, 🟡 <60d, 🔵 <90d), current stock, and valuation.
  - `POST /api/stock/shifts`: Atomic reallocation transaction with optional dual-filing of `PrincipalClaim` and itemized `PrincipalClaimLine`s.
  - `GET /api/stock/shifts`: Historical audit register of `SHF-2026-XXXX` vouchers.
- **Automated QA Verification**: `test_pharma_expiry_quarantine_selenium.py` (13 stages, 100% Passed, Exit Code 0).

---

### 2.24 Module 24 — DOC-42: Statutory GST E-Way Bill & E-Invoice (IRN) Generation Desk with NIC Offline JSON & Transport Part A/B Slips

- **Route**: `/compliance` (or Top Nav `GST & Compliance ▾` &rarr; `Compliance Workbench`).
- **Core Purpose**: Rule 138 CGST Rules and Rule 48(4) E-Invoicing statutory compliance desk for all B2B consignments $\ge ₹50,000$. Features real-time qualifying invoice detection, 1-click cryptographic IRN/Ack generation, 12-digit E-Way bill generation with distance validity calculation (1 day per 200 km), signed digital QR code generation, official CBIC printable two-part delivery slips (Part A & Part B), and National Informatics Centre (NIC) Schema 1.1 bulk JSON generation.
- **Backend APIs**:
  - `GET /api/compliance/summary`: Real-time statutory telemetry (qualifying invoices, pending EWB, generated IRN, compliance rate, transporters).
  - `GET /api/compliance/invoices`: Filterable qualifying consignments register with live compliance badges.
  - `POST /api/compliance/generate-eway-irn`: Atomic cryptographic generation of 64-char IRN, 15-digit Ack No, 12-digit EWB No, validity period, and QR payload.
  - `GET /api/compliance/eway-slip/{invoice_id}`: Structured CBIC two-part delivery slip data with driver handover layout.
  - `POST /api/compliance/export-nic-json`: Strict Government-compliant bulk upload JSON payload.
- **Automated QA Verification**: `test_gst_einvoice_eway_selenium.py` (13 stages, 100% Passed, Exit Code 0).

---

### 2.25 Module 25 — DOC-43: Statutory Multi-State GSTR-1, GSTR-2B & GSTR-3B Reconciliation Cockpit with Section 16(2)(aa) 2B ITC Matching Engine

- **Route**: `/gst` > Tab `[F5]` (`GSTR-2B ITC Matching Engine`).
- **Core Purpose**: Comprehensive dual-ledger statutory GST reconciliation platform enforcing Section 16(2)(aa) CGST Act rules. Correlates internal purchase vouchers with official Government GSTR-2B auto-drafted statements. Features fuzzy/exact invoice number normalization, 4-way matching classification (`MATCHED`, `TAX_MISMATCH`, `MISSING_IN_2B`, `MISSING_IN_BOOKS`), 3-tier differential tolerance switcher ($\pm ₹1$, $\pm ₹5$, $\pm ₹10$), 2-digit multi-state GSTIN filtering (`07 - Delhi`, `27 - Maharashtra`), 1-click bulk approval for monthly GSTR-3B Table 4(A)(5) credit availing, WhatsApp supplier dunning notification modal for blocked credits, and official GST Portal JSON statement import.
- **Backend APIs**:
  - `GET /api/gst/reconciliation-summary`: Aggregates Safe ITC, At-Risk ITC, Unclaimed ITC, match percentage, and multi-state GSTIN filters.
  - `GET /api/gst/reconcile-2b`: Returns paired records with books vs portal side-by-side values, diffs, and categorization.
  - `POST /api/gst/reconciliation-action`: Updates audit status (`CLAIM_ITC`, `DISPUTE`, `FORCE_MATCH`, `REVERSE`) on single or bulk entries.
  - `POST /api/gst/import-2b`: Ingests official Government GST Portal JSON download payloads (`b2b`, `b2ba`, `cdnr`).
- **Automated QA Verification**: `test_gstr2b_reconciliation_selenium.py` (13 stages, 100% Passed, Exit Code 0).

---

### 2.26 Module 26 — DOC-44: Enterprise Cloud Authentication, Multi-Tenant Session Recovery & Production Client Onboarding Desk

- **Route**: `/login` and `/clients`.
- **Core Purpose**: Asynchronous production cloud authentication engine, self-healing session recovery, and multi-tenant client organization provisioning. Authenticates users with genuine 8-hour HMAC-SHA256 JWT tokens against Render FastAPI and Neon PostgreSQL. Features 1-click credential autofill presets (`#btn-quick-fill-admin` for `AM-0001`, `#btn-quick-fill-client` for `KMA`), asynchronous live demo authentication (`#btn-demo-login`), transparent session upgrading in `RegisterClientModal.tsx` and `ClientManagement.tsx`, client tenant provisioning (`POST /api/organizations/register`), automated 40+ Chart of Accounts seeding (`seed_chart_of_accounts`), and 1-click tenant impersonation (`Switch to ERP ->`).
- **Backend APIs**:
  - `POST /auth/login`: Bcrypt verification and genuine signed 8-hour JWT access token issuance.
  - `GET /api/organizations/`: Multi-tenant client companies registry for AM Admin oversight.
  - `POST /api/organizations/register`: Multi-tenant organization creation, admin user provisioning, and automated Chart of Accounts seeding.
  - `POST /auth/impersonate`: Tenant switching into isolated client database environments.
- **Automated QA Verification**: `verify_live_vercel_client_creation.py` (6 stages, 100% Passed against production `https://erp-rho-three.vercel.app`, Exit Code 0).

---

### 2.27 Complete Operational Navigation & Menu Sizing Standard

1. **Responsive Top Navigation Architecture**:
   - Reorganized into 10 streamlined, non-wrapping parent categories fitting standard desktop displays (1366px, 1440px, 1920px):
     `Dashboard` | `Master ▾` | `Finance & Accounting ▾` | `Inventory ▾` | `Sales & Purchase ▾` | `C&F & Logistics ▾` | `Workflows [F4] ▾` | `GST & Compliance ▾` | `CRM & Admin ▾` | `Reports ▾`.
   - Accessible via arrow key traversal (`ArrowLeft`, `ArrowRight`, `ArrowDown`, `ArrowUp`), `Enter` navigation, and `Esc` dismissal.

2. **Counter Launcher Hotkeys on HomeScreen (`/`)**:
   - `[F2]`: Sales Counter Billing
   - `[F5]`: Supplier Payment Voucher
   - `[F6]`: Customer Receipt Voucher
   - `[Ctrl+1]`: Cargo & Consignment Management Board
   - `[Ctrl+2]`: Freight Contracts & Carrier Rate Master
   - `[Ctrl+3]`: Principal Operations & Custody Control Center
   - `[Ctrl+4]`: C&F Commission & Recovery Engine
   - `[Ctrl+5]`: Product Company Master & Manufacturer Desk
   - `[Ctrl+6]`: Enterprise Multi-Client Operations Radar
   - `[Esc]`: Application Exit confirmation modal (`#modal-exit-app`)

---

*End of Unified Master Manual.*

