# Enterprise ERP System — Unified Developer & User Master Manual
*Definitive Technical Architecture and Operational Reference Guide*

This document provides a unified, exhaustive reference bridging technical architecture specifications for software engineers with operational workflows for cashiers, accountants, store managers, and system administrators.

---

# Part 1: Technical Developer Architecture

## 1.1 Multi-Tier Architecture & Communication Topology

```
+-----------------------------------------------------------------------------------+
|                                PRESENTATION LAYER                                 |
|                                                                                   |
|  +------------------------------+     +----------------------------------------+  |
|  | Modern Web SPA (Vite/React)  |     | Desktop Shell (Tauri v2 Native Rust)   |  |
|  | - Port 50005                 |     | - Windows Native Windowing & Hotkeys   |  |
|  | - React 19 + TypeScript      |     | - Direct Hardware ESC / Function Keys  |  |
|  | - Zustand State Stores       |     | - Zero Mouse Keyboard Trapping Engine  |  |
|  +--------------+---------------+     +-------------------+--------------------+  |
|                 |                                         |                       |
|                 +--------------------+--------------------+                       |
|                                      | HTTP / REST API (JSON)                     |
|                                      v                                            |
+-----------------------------------------------------------------------------------+
|                                 APPLICATION LAYER                                 |
|                                                                                   |
|  FastAPI ASGI Gateway + Uvicorn (Port 8000)                                       |
|  +----------------------+--------------------+---------------------------------+  |
|  | /auth                | /api/sales         | /api/finance_v2                 |  |
|  | JWT Multi-Tenant Auth| Billing & Invoices | Append-Only Double-Entry GL     |  |
|  +----------------------+--------------------+---------------------------------+  |
|  | /api/stock           | /api/procurement   | /api/compliance                 |  |
|  | Batch Stock Ledger   | DOC-45 P2P & POs   | DOC-42 EWB & IRN Generation     |  |
|  +----------------------+--------------------+---------------------------------+  |
|  | /api/gst             | /api/cargo         | /api/principal & /commission    |  |
|  | DOC-43 2B ITC Engine | Logistics & Freight| Consignment Custody & Dual-Post |  |
|  +----------------------+--------------------+---------------------------------+  |
|                                      | SQLAlchemy 2.0 ORM                         |
|                                      v                                            |
+-----------------------------------------------------------------------------------+
|                                    DATA LAYER                                     |
|                                                                                   |
|  PostgreSQL 15+ (Local / Neon Serverless Cloud)                                   |
|  - Strict Multi-Tenant Isolation by organization_id                               |
|  - Append-Only Financial Ledgers with Cryptographic SHA-256 Chaining              |
|  - Dual Godown Partitioning: current_stock (Active) vs brk_exp_stock (Quarantine) |
+-----------------------------------------------------------------------------------+
```

---

## 1.2 Relational Database Schema & Entity Models

### Core Database Entities

| Table Name | SQLAlchemy Model | Primary Role & Constraints |
| :--- | :--- | :--- |
| `organizations` | `models.Organization` | Multi-tenant tenant company partition. Primary key UUID, unique uppercase `org_code`, `is_am` flag. |
| `users` | `models.User` | Operator accounts scoped by `organization_id`. Salted Bcrypt `hashed_password`, RBAC role, `allow_direct_billing`. |
| `sessions` | `models.Session` | Active authentication sessions. Tracks SHA-256 `token_hash`, 8-hour expiry, instant server-side revocation. |
| `products` | `models.Product` | Central SKU catalog. Tracks drug formulations, HSN code, pack size, manufacturer, min safety stock, reorder qty. |
| `batches` | `models.Batch` | Batch inventory ledger. Tracks batch number, expiry date (`MM/YY`), MRP, sale rate, purchase cost, `current_stock`, and `brk_exp_stock`. |
| `sales_invoices` | `models.Invoice` | Legal and accounting master for all 6 transaction voucher types (`sales-bill`, `purchase-bill`, `sales-return`, `purchase-return`, `brk-receive`, `brk-issue`). |
| `invoice_items` | `models.InvoiceItem` | Itemized lines linked to `sales_invoices.id`. Captures SKU, batch, quantity, free units, unit rate, discount, and GST splits. |
| `purchase_orders` | `models.PurchaseOrder` | Master Purchase Order entity. Tracks sequential `po_number`, vendor party reference, delivery date, status (`DRAFT`, `APPROVED`, `COMPLETED`, `CANCELLED`). |
| `purchase_order_items` | `models.PurchaseOrderItem` | PO line items linked to `purchase_orders.id`. Captures SKU, quantity, received quantity, and purchase rate. |
| `principal_claims` | `models.PrincipalClaim` | Operational and expiry claims submitted to manufacturers. Captures claim reference `CLM-PRN-YYYY-XXXX`, status, and settlement actions. |
| `vouchers` & `voucher_entries` | `models.Voucher`, `models.VoucherEntry` | Double-entry General Ledger. Append-only ledger entries enforcing Debit == Credit balance rule. |

---

## 1.3 Alphanumeric Series Continuation Engine

The ERP implements universal Marg and Tally series continuation through the client-side `incrementSeries` algorithm:
1. **Mathematical Extraction**: Regex `^(.*?)(0*)(\d+)$` partitions any voucher number into:
   - Prefix text (e.g. `RJ-DN-`, `SLS-2026-`, `PUR-PO-`)
   - Leading zeros (e.g. `00`, `000`)
   - Integer sequence counter (e.g. `20`, `1001`)
2. **Incrementation & Padding**: The integer is incremented by 1 and re-padded to preserve the original visual character width (e.g. `RJ-DN-0020` &rarr; `RJ-DN-0021`).
3. **Local Storage Persistence**: Whenever an operator customizes a sequence number in the UI, the modified sequence is stored in `localStorage` under `erp_series_{voucher_type}`.
4. **Zero Overwrite Rule**: The system guarantees that an operator's customized series is never replaced by system fallback defaults.

---

## 1.4 Multi-Tenant Partitioning, JWT Session Lifecycles & Self-Healing Cloud Authentication

1. **Partitioning Standard**: Every database table includes an `organization_id` foreign key referencing `organizations.id`. All database queries strictly filter by the active tenant ID extracted from the verified JWT.
2. **JWT Lifecycle**: Issues 8-hour access tokens signed with HMAC-SHA256 containing `sub` (user ID), `org_id`, `role`, and `is_am`.
3. **Transparent Self-Healing**: When executing operations in cloud environments (Vercel connecting to Render/Neon), client components execute `ensureLiveCloudAuthSession` to automatically detect synthetic preview tokens and exchange them for genuine cloud database credentials without interrupting user workflow.

---

## 1.5 Master RESTful API Directory

| Subsystem | HTTP Method & Route | Description & Parameters | Return Status |
| :--- | :--- | :--- | :--- |
| **Authentication** | `POST /auth/login` | Authenticates username/password; returns JWT bearer token & profile. | 200 OK |
| **Multi-Tenancy** | `POST /api/organizations/register` | Registers new client company, provisions admin user, seeds 40+ GL accounts. | 200 OK |
| **Multi-Tenancy** | `POST /auth/impersonate` | Issues scoped token allowing AM Admin to impersonate tenant environment. | 200 OK |
| **Sales Billing** | `POST /api/sales/invoices/` | Creates sales bill, decrements batch stock, auto-posts double-entry GL voucher. | 200 OK |
| **Purchase Inward**| `POST /api/sales/invoices/` | Creates inward bill, increments batch stock, auto-posts Accounts Payable in GL. | 200 OK |
| **Returns Engine** | `GET /api/sales/invoices/by-supplier/` | Queries past inward bills for supplier to populate Against Inward Bill mode. | 200 OK |
| **Returns Engine** | `GET /api/sales/invoices/by-customer/` | Queries past sales bills for customer to populate Against Sales Bill mode. | 200 OK |
| **Expiry Radar** | `GET /api/stock/expiry-cockpit-telemetry` | Aggregates live inventory valuation, units, and 30/60/90-day expiry risk buckets. | 200 OK |
| **Stock Shift** | `POST /api/stock/shifts` | Atomically moves inventory from saleable to quarantine godown; files principal claim. | 200 OK |
| **Compliance** | `POST /api/compliance/generate-eway-irn` | Generates 64-char SHA-256 IRN hash, 15-digit Ack No, 12-digit E-Way Bill No. | 200 OK |
| **Compliance** | `POST /api/compliance/export-nic-json` | Generates official Government NIC Schema 1.1 bulk upload JSON payload. | 200 OK |
| **2B ITC Engine** | `GET /api/gst/reconcile-2b` | Returns paired records with books vs portal side-by-side values and match tags. | 200 OK |
| **2B ITC Engine** | `POST /api/gst/reconciliation-action` | Updates audit status (`CLAIM_ITC`, `DISPUTE`, `FORCE_MATCH`, `REVERSE`). | 200 OK |
| **2B ITC Engine** | `POST /api/gst/import-2b` | Ingests official Government GST Portal GSTR-2B JSON return file. | 200 OK |
| **Procurement** | `GET /api/procurement/replenishment-radar` | Scans inventory, calculates deficits against safety buffers, yields scorecards. | 200 OK |
| **Procurement** | `GET /api/procurement/vendor-rate-comparison/{product_id}` | Compares supplier historical purchase vouchers, discounts, and credit terms. | 200 OK |
| **Procurement** | `POST /api/procurement/generate-from-replenishment` | 1-Click bulk PO generator partitioning selected deficit SKUs by vendor. | 200 OK |
| **Procurement** | `POST /api/procurement/orders/{po_id}/convert-to-purchase` | Converts approved PO into Inward Purchase Bill (`PUR-PO-XXXX`) in GL. | 200 OK |

---

# Part 2: User Operational Guide

## 2.1 Master Screen-by-Screen Semantic DOM Catalog

| Screen & Route | DOM Element Selector / ID | Control Type & Hotkey | Operational Role & Business Validation Rule |
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
| **Counter Sales (`/sales`)** | `#input-bill-series` | Text Input | Alphanumeric sales invoice sequence input (`SLS-YYYY-XXXX`). |
| **Counter Sales (`/sales`)** | `#btn-search-party` | Button `[F7]` | Debtor Party search modal with live running balance, drug license numbers, and GSTIN. |
| **Counter Sales (`/sales`)** | `#grid-bill-items` | Grid Table | 8-Row Marg billing grid (Item, Pack, Batch, Exp, Qty, Free, Rate, Dis%, GST%). |
| **Counter Sales (`/sales`)** | `#btn-batch-modal` | Button `[F3]` | Batch Selection modal showing stock, expiry dates, and MRP for active product. |
| **Counter Sales (`/sales`)** | `#btn-settlement-modal` | Button `[End]` | Settlement & Payment Mode modal (Cash, Bank, Credit, Cheque). |
| **Counter Sales (`/sales`)** | `#btn-save-bill` | Button `[Ctrl+S]` | Validates items, decrements batch stock, posts double-entry GL voucher. |
| **Purchase Inward (`/purchase`)** | `#input-purchase-series` | Text Input | Inward purchase sequence series input (`PUR-YYYY-XXXX`). |
| **Purchase Inward (`/purchase`)** | `#input-vendor-inv-no` | Text Input | Supplier external invoice reference number (`party_inv_no`). |
| **Purchase Inward (`/purchase`)** | `#btn-search-vendor` | Button `[F7]` | Creditor vendor search popup with live ledger balance. |
| **Purchase Inward (`/purchase`)** | `#btn-save-purchase` | Button `[Ctrl+S]` | Commits purchase, creates batches, updates physical stock, and posts accounts payable. |
| **Purchase Register (`/purchase/list`)** | `#grid-purchase-bills` | Ag-Grid | Inward purchase bills register with search, filter, and bilateral dual-post tags. |
| **Supplier Debit Note (`/purchase-return`)** | `#btn-mode-against-bill` | Button `[F2]` | Activates Against Inward Bill mode to load original purchase line items. |
| **Supplier Debit Note (`/purchase-return`)** | `#btn-mode-loose` | Button `[F3]` | Activates Loose Return mode for ad-hoc debit note issuance. |
| **Supplier Debit Note (`/purchase-return`)** | `#select-stock-disposition` | Select | Directs returned goods to `Saleable`, `Breakage Godown`, or `Expired Godown`. |
| **Supplier Debit Note (`/purchase-return`)** | `#btn-save-debit-note` | Button `[Ctrl+S]` | Posts debit note, adjusts inventory, generates reverse GL and ITC reversal entries. |
| **Customer Credit Note (`/sales-return`)** | `#btn-mode-against-bill` | Button `[F2]` | Activates Against Sales Bill mode to retrieve customer invoice lines. |
| **Customer Credit Note (`/sales-return`)** | `#btn-mode-counter` | Button `[F3]` | Activates Counter Return mode with returnable quantity caps. |
| **Customer Credit Note (`/sales-return`)** | `#btn-save-credit-note` | Button `[Ctrl+S]` | Saves credit note, increments stock, auto-posts sales return GL entries. |
| **Breakage Receive (`/brk-receive`)** | `#input-bkr-series` | Text Input | Alphanumeric Breakage Receive series continuation (`BKR-YYYY-XXXX`). |
| **Breakage Receive (`/brk-receive`)** | `#btn-save-bkr` | Button `[Ctrl+S]` | Posts breakage receive, routing stock strictly into quarantined `brk_exp_stock`. |
| **Breakage Issue (`/brk-issue`)** | `#input-bki-series` | Text Input | Alphanumeric Breakage Issue series continuation (`BKI-YYYY-XXXX`). |
| **Breakage Issue (`/brk-issue`)** | `#btn-save-bki` | Button `[Ctrl+S]` | Posts breakage issue to manufacturer, decrementing `brk_exp_stock`. |
| **Customer Receipt (`/receipt`)** | `#voucher-series-input` | Text Input | Alphanumeric receipt series continuation (`REC-YYYY-XXXX`). |
| **Customer Receipt (`/receipt`)** | `#party-search-input` | Text Input `[F7]` | Triggers Debtor Party Search modal with live running balance and drug licenses. |
| **Customer Receipt (`/receipt`)** | `#voucher-amount-input` | Number Input | Payout amount; automatically recalculates unallocated floating credit dynamically. |
| **Customer Receipt (`/receipt`)** | `#btn-auto-allocate-fifo` | Button `[Alt+A]` | Executes FIFO auto-allocation across pending customer invoices. |
| **Customer Receipt (`/receipt`)** | `#btn-post-voucher` | Button `[Ctrl+S]` | Posts receipt voucher to GL, updates ledger balances, increments sequence series. |
| **Supplier Payment (`/payment`)** | `#voucher-series-input` | Text Input | Alphanumeric payment series continuation (`PAY-YYYY-XXXX`). |
| **Supplier Payment (`/payment`)** | `#party-search-input` | Text Input `[F7]` | Triggers Creditor Vendor Search modal with live running balance and bank details. |
| **Supplier Payment (`/payment`)** | `#btn-auto-allocate-fifo` | Button `[Alt+A]` | Executes FIFO auto-allocation across pending vendor purchase bills. |
| **Journal Voucher (`/journal`)** | `#input-journal-series` | Text Input | Alphanumeric Journal series continuation (`JRN-YYYY-XXXX`). |
| **Journal Voucher (`/journal`)** | `#btn-auto-balance-gl` | Button `[Ctrl+B]` | Automatically calculates and inserts balancing Dr/Cr line. |
| **Journal Voucher (`/journal`)** | `#btn-add-journal-leg` | Button `[Alt+A]` | Adds new ledger line item row to journal entry grid. |
| **Journal Voucher (`/journal`)** | `#check-schedule-accrual` | Checkbox | Configures scheduled automatic GL reversal on 1st of subsequent month. |
| **Journal Voucher (`/journal`)** | `#btn-post-journal` | Button `[Ctrl+S]` | Validates sum(Dr) == sum(Cr) and commits journal voucher to GL. |
| **Direct Expense Desk (`/finance/expenses`)** | `#input-expense-amount` | Number Input | Expense payout amount with live P&L impact preview. |
| **Direct Expense Desk (`/finance/expenses`)** | `#select-expense-account` | Select | Dropdown listing 10 statutory P&L expense heads. |
| **Direct Expense Desk (`/finance/expenses`)** | `#btn-post-expense` | Button | Posts direct cash/bank expense voucher debiting P&L immediately. |
| **Fixed Assets (`/finance/assets`)** | `#btn-register-asset` | Button `[F2]` | Opens modal to register capital asset with Schedule II statutory category. |
| **Fixed Assets (`/finance/assets`)** | `#btn-run-depreciation` | Button `[F5]` | Executes periodic WDV/SLM depreciation run across active assets. |
| **Bank Recon (`/finance/bank-reconciliation`)** | `#btn-auto-match-brs` | Button | Runs auto-matching algorithm against imported bank statement CSV. |
| **Bank Recon (`/finance/bank-reconciliation`)** | `#btn-cash-drawer-tally` | Button `[F8]` | Opens RBI physical currency denomination counter and cash discrepancy report. |
| **Audit Explorer (`/audit`)** | `#input-audit-search` | Text Input `[Ctrl+F]` | Fuzzy search across audit trail by document number, actor, or reason. |
| **Audit Explorer (`/audit`)** | `#btn-verify-chain` | Button | Traverses cryptographic SHA-256 hash chain and certifies 100% integrity. |
| **Audit Explorer (`/audit`)** | `#drawer-audit-diff` | Drawer `[Enter]` | Slides over before/after field diff with sensitive data masking. |
| **Audit Explorer (`/audit`)** | `#btn-export-evidence-pack` | Button `[E]` | Generates auditor-compliant sealed JSON evidence pack. |
| **Cargo Board (`/cargo`)** | `#btn-register-consignment` | Button `[F6]` | Opens consignment registration modal with volumetric CBM calculator. |
| **Cargo Board (`/cargo`)** | `#drawer-consignment-detail` | Drawer | Slide-over drawer showing package barcodes, weights, and status advance. |
| **Cargo Costs (`/cargo/costs`)** | `#toggle-combined-reporting` | Toggle | Switches between single-tenant and aggregated multi-client MIS view. |
| **POD Desk (`/cargo/pod-exceptions`)** | `#btn-record-delivery-pod` | Button | Submits delivery POD with accepted vs short/damaged quantity validation. |
| **Freight Master (`/freight/contracts`)** | `#btn-new-contract` | Button `[F2]` | Opens modal to create new carrier contract with lane slabs. |
| **Freight Master (`/freight/contracts`)** | `#tab-btn-rate-cards` | Button `[F2]` | Carrier rate card directory. |
| **Freight Master (`/freight/contracts`)** | `#tab-btn-sandbox` | Button `[F4]` | Freight calculation rating sandbox evaluating fuel surcharges and minimums. |
| **Freight Recon (`/freight/reconciliation`)** | `#tab-btn-unreconciled` | Button `[F2]` | Unmatched freight vouchers workbench for 3-way variance auditing. |
| **Principal (`/principal`)** | `#btn-open-claim-modal` | Button `[F7]` | Opens Principal breakage/damage claim modal with [Esc] dismissal. |
| **Principal (`/principal`)** | `#tab-btn-custody` | Button `[F2]` | Principal custody inventory stock matrix showing SKU segregation. |
| **Principal (`/principal`)** | `#tab-btn-claims` | Button `[F3]` | Principal claims & returns register. |
| **Principal (`/principal`)** | `#tab-btn-reconciliation` | Button `[F4]` | 3-Way physical vs ledger reconciliation workspace. |
| **Principal (`/principal`)** | `#tab-btn-statement` | Button `[F5]` | Periodic business reconciliation statement with cryptographic hash. |
| **Commission (`/commission`)** | `#tab-btn-agreements` | Button `[F2]` | 4-Pillar C&F deal terms and rate cards (Storage, Staff, Freight, Comm %). |
| **Commission (`/commission`)** | `#tab-btn-sandbox` | Button `[F3]` | Deterministic calculation sandbox & formula trace. |
| **Commission (`/commission`)** | `#tab-btn-claims` | Button `[F4]` | Recovery claims desk & dual-post action. |
| **Commission (`/commission`)** | `#tab-btn-client-billing` | Button `[F5]` | Client C&F Commission & Expense Billing Desk. |
| **Commission (`/commission`)** | `#client-billing-org-select` | Select | Client organization dropdown selector (e.g. Krishna Medical Agencies). |
| **Commission (`/commission`)** | `#btn-autofetch-client-telemetry` | Button | 1-Click Auto-Fetch turnover and depot operating expenses. |
| **Commission (`/commission`)** | `#input-billing-turnover` | Number Input | Client sales turnover input base for commission calculation. |
| **Commission (`/commission`)** | `#input-billing-comm-rate` | Number Input | Commission percentage input (e.g. 5.0%). |
| **Commission (`/commission`)** | `#input-billing-rent` | Number Input | Godown storage rent reimbursement input. |
| **Commission (`/commission`)** | `#input-billing-salary` | Number Input | Depot staff salaries reimbursement input. |
| **Commission (`/commission`)** | `#input-billing-freight` | Number Input | Freight & transport recharge input. |
| **Commission (`/commission`)** | `#check-dual-post-purchase` | Checkbox | Toggles automated dual-posting into the client company's inward purchase register. |
| **Commission (`/commission`)** | `#btn-generate-client-bill` | Button | Atomically creates outward bill (`CF-BILL-`) and inward purchase bill (`PUR-CF-`). |
| **Commission (`/commission`)** | `#generated-bill-success-card` | Banner | Success feedback card with outward/inward invoice numbers. |
| **Commission (`/commission`)** | `#btn-goto-outward-billing` | Button `[F7]` | Jump to Outward Bill in Billing Desk. |
| **Commission (`/commission`)** | `#btn-goto-inward-purchase` | Button `[F9]` | Jump to Inward Bill in Purchase Register. |
| **Radar (`/admin/tracking`)** | `#select-tracking-scope` | Select | Consolidated vs single client scope selector. |
| **Radar (`/admin/tracking`)** | `#card-tracking-sales` | Metric Card | Gross sales turnover KPI scorecard. |
| **Radar (`/admin/tracking`)** | `#card-tracking-expenses` | Metric Card | Operating expenses & C&F KPI scorecard. |
| **Radar (`/admin/tracking`)** | `#card-tracking-cargo` | Metric Card | Cargo consignments pipeline KPI card. |
| **Radar (`/admin/tracking`)** | `#tab-btn-scorecards` | Button `[F2]` | Client operational scorecards matrix tab with 1-click drilldown. |
| **Radar (`/admin/tracking`)** | `#tab-btn-sales` | Button `[F3]` | Cross-client sales ledger tab. |
| **Radar (`/admin/tracking`)** | `#tab-btn-expenses` | Button `[F4]` | Multi-client expense claims tab. |
| **Radar (`/admin/tracking`)** | `#tab-btn-cargo` | Button `[F6]` | Logistics pipeline tracking tab. |
| **Expiry Cockpit (`/inventory-dashboard`)** | `#card-main-stock` | Metric Card | Main Saleable Stock Value & Healthy Units KPI scorecard. |
| **Expiry Cockpit (`/inventory-dashboard`)** | `#card-quarantine-stock` | Metric Card | Quarantined / Brk-Exp Stock Value KPI scorecard. |
| **Expiry Cockpit (`/inventory-dashboard`)** | `#card-near-expiry-risk` | Metric Card | 90-Day Near-Expiry Risk Batches KPI scorecard. |
| **Expiry Cockpit (`/inventory-dashboard`)** | `#card-claim-exposure` | Metric Card | Principal Claims & Debit Note Exposure KPI scorecard. |
| **Expiry Cockpit (`/inventory-dashboard`)** | `#tab-btn-radar` | Button `[F2]` | Expiry Radar table and alert filters tab. |
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
| **Expiry Cockpit (`/inventory-dashboard`)** | `#tab-btn-quarantine` | Button `[F3]` | Quarantined & Breakage Stock Ledger tab. |
| **Expiry Cockpit (`/inventory-dashboard`)** | `#tab-btn-history` | Button `[F4]` | Stock Shift Audit Register historical vouchers tab. |
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
| **GST Workbench (`/gst`)** | `#tab-gstr2b` | Button `[F5]` | Activates GSTR-2B ITC Matching Engine workbench. |
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

---

## 2.2 Module 22 — DOC-41: Pharma Expiry Radar, Stock Shift Quarantine Engine & Principal Debit Note Settlement Desk

- **Route**: `/inventory-dashboard` & `/stock-shift` (or Top Nav `Inventory ▾` &rarr; `Expiry & Breakage Cockpit`).
- **Operational Purpose**: Continuous batch surveillance across 4 shelf-life risk horizons (<0d, <30d, <60d, <90d), atomic physical stock transfer from `MAIN_SALEABLE_GODOWN` to `QUARANTINE_EXPIRY_GODOWN` (`Batch.current_stock` &rarr; `Batch.brk_exp_stock`), and automatic generation of `PrincipalClaim` (`CLM-PRN-YYYY-XXXX`) for supplier debit note settlement.
- **Key Operator Steps**:
  1. Review Top Scorecards for Healthy Stock vs Quarantine Stock vs 90-Day Risk Outlay.
  2. In Expiry Radar table (`[F2]`), filter by risk bucket (`#filter-bucket-EXPIRED` or `#filter-bucket-30_DAYS`).
  3. Select batches using `#btn-select-all-batches` or row checkboxes.
  4. Click `[F7] Shift Selected to Quarantine` (`#btn-shift-selected-action`).
  5. On Stock Shift Desk (`/stock-shift`), confirm godowns, check `#check-auto-claim`, select Principal, and press `[F7] Save Shift Voucher`.
  6. Voucher `SHF-2026-XXXX` and claim `CLM-PRN-XXXX` are generated; viewable in Audit Register (`[F2]`) and Claims Desk (`[F8]`).

---

## 2.3 Module 23 — DOC-42: Statutory GST E-Way Bill & E-Invoice Desk with CBIC Slips & NIC Schema 1.1 JSON

- **Route**: `/compliance` (or Top Nav `GST & Compliance ▾` &rarr; `Compliance Workbench`).
- **Operational Purpose**: Rule 138 (E-Way Bill) and Rule 48(4) (E-Invoice IRN) statutory transit governance for all consignments >= Rs. 50,000.
- **Key Operator Steps**:
  1. Inspect 4 Telemetry Scorecards: Qualifying Invoices, Pending EWB, Generated IRN, Compliance Rate %.
  2. Select qualifying invoice pending vehicle assignment.
  3. Press `[F7] Assign Transport` (`#btn-open-transport-modal`), select carrier, enter vehicle number (e.g. `DL-01-AB-1234`), transit distance in KM, and submit.
  4. Click `[Enter] Confirm & Generate` (`#btn-confirm-generate-compliance`). The system computes 64-char SHA-256 IRN hash, 15-digit Ack No, 12-digit EWB No, and signed QR representation.
  5. Click `Print Slip` (`#btn-print-slip-dialog`) to generate the official Government of India CBIC delivery slip with QR code.
  6. Press `[F8]` (`#btn-export-nic-json`) to export the official Government Schema 1.1 JSON bulk payload.

---

## 2.4 Module 24 — DOC-43: Statutory Multi-State GSTR-1, GSTR-2B & GSTR-3B Reconciliation Cockpit with Section 16(2)(aa) 2B ITC Matching Engine

- **Route**: `/gst` > Tab `[F5]` (`GSTR-2B ITC Matching Engine`).
- **Operational Purpose**: Section 16(2)(aa) CGST Act compliance platform matching internal purchase vouchers against portal GSTR-2B statements.
- **Key Operator Steps**:
  1. Inspect Telemetry Scorecards: Total 2B ITC, Safe & Claimable ITC, At-Risk Blocked ITC, Unclaimed ITC.
  2. Set tolerance thresholds (+-Rs.1, +-Rs.5, +-Rs.10) and multi-state GSTIN state filter (e.g. `07` Delhi).
  3. Filter by `MATCHED` records, select all, and click `1-Click Bulk Approve Matched ITC` (`#btn-bulk-approve-itc`) to unlock credit for monthly GSTR-3B Table 4(A)(5).
  4. Filter by `MISSING_IN_2B`, click dunning icon on delinquent vendor row (`#btn-dunning-row-{idx}`), open `#modal-supplier-dunning`, and click `Send via WhatsApp Web` (`#btn-send-whatsapp`).
  5. Ingest monthly portal JSON returns via `#btn-open-ingest-2b` to auto-reconcile database records.

---

## 2.5 Module 25 — DOC-44: Enterprise Cloud Authentication, Multi-Tenant Session Recovery & Production Client Onboarding Desk

- **Route**: `/login` & `/clients`.
- **Operational Purpose**: Live cloud authentication handshake, self-healing session upgrading, and multi-tenant client organization onboarding on Vercel connecting to Render/Neon PostgreSQL.
- **Key Operator Steps**:
  1. On `/login`, click `#btn-demo-login` or `#btn-quick-fill-admin` to authenticate asynchronously against Render FastAPI with verified cloud credentials (`AM-0001` / `admin` / `Admin@123`), acquiring an authentic 8-hour JWT token.
  2. Navigate to `/clients` and click `+ Register New Client` (`#btn-register-new-client`).
  3. The modal executes `ensureLiveCloudAuthSession` to transparently upgrade any mock session.
  4. Fill Organization Name (`#input-client-org-name`), Organization Code (`#input-client-org-code`), Admin Name, Username, and Password.
  5. Click `#btn-submit-register-client`. The backend provisions the tenant organization, admin user, and seeds 40+ statutory General Ledger accounts.
  6. The newly registered tenant card appears in the grid; click `Switch to ERP ->` to impersonate the client.

---

## 2.6 Module 26 — DOC-45: Enterprise Purchase Order, Intelligent Stock Replenishment Radar & Vendor Procurement Desk

- **Route**: `/po` (or Top Nav `Purchases ▾` &rarr; `Purchase Orders & Replenishment Radar`).
- **Operational Purpose**: Full Procure-to-Pay (P2P) automation: warehouse stock deficit calculation against reorder points, multi-vendor rate comparison, 1-click bulk PO generation, keyboard PO builder, supplier WhatsApp electronic dispatch, and 1-click inward purchase conversion.
- **Key Operator Steps**:
  1. Review Telemetry 4 Scorecards: Critical 0-Stock Count, Below Reorder Count, Total Estimated Replenishment Budget, and Active PO Pipeline.
  2. In Tab `[F2] Stock Replenishment Radar`, review SKU deficits, select items via checkboxes, and click `[F7] Generate Bulk POs` (`#btn-bulk-generate-pos`) to auto-create POs grouped by preferred vendor.
  3. For ad-hoc purchase orders, switch to Tab `[F3] Create New PO`, select vendor (`#select-po-vendor`), enter line items (`#input-po-qty-{idx}`, `#input-po-rate-{idx}`), review dynamic 18% GST calculation, and click `Submit & Approve Purchase Order [Enter]`.
  4. In Tab `[F4] Vendor Rate Intelligence`, audit historical supplier quotes, discounts, net landed rates, payment credit days, and optimization badges (`BEST_PRICE`, `FASTEST_DELIVERY`, `LONGEST_CREDIT`, `BULK_DISCOUNT`).
  5. In Tab `[F1] Master PO Directory`, click `Dispatch` (`#btn-dispatch-po-{id}`) to open the formatted WhatsApp slip modal, and click `Open in WhatsApp` (`#btn-open-whatsapp-web`).
  6. Upon consignment arrival, click `Book Inward` (`#btn-convert-po-purchase-{id}`) and click `Confirm & Generate Purchase Bill` (`#btn-confirm-convert-po`) to convert the order into `PUR-PO-XXXX` in the GL and redirect to `/purchase`.

---

## 2.7 Responsive Top Navigation & Counter Launcher Hotkeys

1. **Responsive 10-Item Top Navigation Menu**:
   - `Dashboard` | `Master ▾` | `Finance & Accounting ▾` | `Inventory ▾` | `Sales & Purchase ▾` | `C&F & Logistics ▾` | `Workflows [F4] ▾` | `GST & Compliance ▾` | `CRM & Admin ▾` | `Reports ▾`.
   - Optimized for desktop screens (1366px, 1440px, 1920px) with zero horizontal wrapping. Traversible via arrow keys, `Enter`, and `Esc`.

2. **Counter Launcher Hotkeys on HomeScreen (`/`)**:
   - `[F2]`: Sales Counter Billing
   - `[F5]`: Supplier Outward Payment Voucher
   - `[F6]`: Customer Collection & Receipt Voucher
   - `[Ctrl+1]`: Cargo & Consignment Management Board
   - `[Ctrl+2]`: Freight Contracts & Carrier Rate Master
   - `[Ctrl+3]`: Principal Operations & Consignment Custody Center
   - `[Ctrl+4]`: C&F Commission & Recovery Engine
   - `[Ctrl+5]`: Product Company Master & Manufacturer Desk
   - `[Ctrl+6]`: Enterprise Multi-Client Operations Radar
   - `[Esc]`: Application Exit confirmation modal (`#modal-exit-app`)

---

## 2.8 Comprehensive Automated QA Test Suite Registry (20 Suites)

| # | Test Suite Filename | Focus Area & Verified Modules | Status & Assertions |
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

---

*End of Unified Master Manual.*
