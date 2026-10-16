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

---

*End of Unified Master Manual.*
