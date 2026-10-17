# Enterprise ERP System — Comprehensive Developer Manual
*Version 2.4 | Active Architecture & Implementation Reference*

Welcome to the definitive developer and engineering manual for the Enterprise Multi-Tenant Pharmaceutical & Distribution ERP System. This manual details every architectural subsystem, database schema, API endpoint, keyboard navigation framework, series continuation engine, inventory disposition model, and accounting auto-posting pipeline.

> **Master Editable Walkthrough Reference**: An exhaustive, publication-grade Microsoft Word document covering the complete software architecture, keyboard operations, data models, APIs, and screens is available in `ERP_ENTERPRISE_SYSTEM_COMPLETE_SOFTWARE_MASTER_WALKTHROUGH.docx`.

---

## 1. System Architecture & High-Level Topology

```
+-----------------------------------------------------------------------------------+
|                                PRESENTATION LAYER                                 |
|                                                                                   |
|  +------------------------------+     +----------------------------------------+  |
|  | Modern Web SPA (Vite/React)  |     | Desktop Shell (Tauri v2 Native Rust)   |  |
|  | - Port 50005                 |     | - Windows Native Windowing & Hotkeys   |  |
|  | - React 19 + TypeScript      |     | - Direct Hardware ESC / Function Keys  |  |
|  +--------------+---------------+     +-------------------+--------------------+  |
|                 |                                         |                       |
+-----------------|-----------------------------------------|-----------------------+
                  |                                         |
                  +--------------------+--------------------+
                                       | HTTP / REST API (JSON)
                                       v
+-----------------------------------------------------------------------------------+
|                                 APPLICATION LAYER                                 |
|                                                                                   |
|  FastAPI + Uvicorn (Port 8000)                                                    |
|  +----------------------+--------------------+---------------------------------+  |
|  | /auth                | /api/sales         | /api/finance_v2                 |  |
|  | JWT Multi-Tenant Auth| Billing & Invoices | ACID Double-Entry Accounting    |  |
|  +----------------------+--------------------+---------------------------------+  |
|  | /api/stock           | /api/master        | /api/reports_v2                 |  |
|  | Batch Stock Ledger   | Parties & Products | Aggregations & Report Designer  |  |
|  +----------------------+--------------------+---------------------------------+  |
|  | /api/dashboard       | /api/workflow      | /api/compliance                 |  |
|  | BI & KPI Engine      | DOC-32 Automation  | E-Invoice / Signed Ledger       |  |
|  +----------------------+--------------------+---------------------------------+  |
+--------------------------------------|--------------------------------------------+
                                       | SQLAlchemy ORM
                                       v
+-----------------------------------------------------------------------------------+
|                                    DATA LAYER                                     |
|                                                                                   |
|  PostgreSQL (Local / Neon Cloud)                                                  |
|  - Multi-Tenant Isolation by organization_id                                      |
|  - Append-Only Financial Ledgers & Audited Reversals                              |
|  - Godown Partitioning: current_stock (Active) vs brk_exp_stock (Quarantined)     |
+-----------------------------------------------------------------------------------+
```

### 1.1 Technology Stack Matrix

| Subsystem | Technology | Version / Tooling | Purpose & Design Decisions |
| :--- | :--- | :--- | :--- |
| **Frontend Framework** | React | 19.x | Modern functional components, hooks, high rendering performance |
| **Language** | TypeScript | 5.x | Strict type safety, shared interfaces across ERP entities |
| **Bundler & Dev Server**| Vite | 5.x / 6.x | Rapid HMR, port 50005, optimized tree-shaking production builds |
| **Desktop Wrapper** | Tauri | v2 (Rust) | Lightweight alternative to Electron (< 15MB binary, native speed) |
| **Backend Framework** | FastAPI | Python 3.11+ / 3.13 | High-throughput asynchronous REST APIs, automatic OpenAPI docs |
| **ASGI Server** | Uvicorn | Standard | Asynchronous worker serving port 8000 |
| **ORM** | SQLAlchemy | 2.x | Relational mapping, connection pooling, transaction boundaries |
| **Relational Database**| PostgreSQL | 15+ | ACID compliance, JSONB queries, row locks (`FOR UPDATE`) |
| **State Management** | Zustand | 4.x / 5.x | Minimal boilerplate, persistent local store synchronization |
| **HTTP Client** | Axios | Custom Instance | Injected bearer tokens, LAN/Cloud URL auto-switching (`src/lib/api.ts`)|
| **End-to-End Testing** | Selenium WebDriver | Python 3.13 + Chrome | Automated headless validation of keyboard UX & database writes |

---

## 2. Multi-Tenant Architecture & Security Model

The system enforces strict multi-tenancy at both the application level and the database level.

### 2.1 Admin Master (AM) vs Client Master (CM)
1. **Admin Master (AM)**: Platform administrative scope. AM accounts manage global subscriptions, tenant provisioning, system health, and cross-organization audits.
2. **Client Master (CM)**: Individual enterprise/tenant scope (e.g. wholesale chemist, C&F distributor). Every tenant is assigned a unique `organization_id` (UUID).
3. **Data Isolation Rule**: Every database query in `sales.py`, `stock.py`, `finance_v2.py`, and `master.py` must filter explicitly by `organization_id`. Cross-tenant data leaks are mathematically impossible.
4. **Secure AM Impersonation**: AM administrators can troubleshoot client issues using `/auth/impersonate`. The system issues a short-lived impersonation JWT with the target `organization_id` while retaining the `original_am_user` in the audit payload.

### 2.2 Role-Based Access Control (RBAC)
* `Admin`: Full organizational control, document cancellation, ledger adjustments, series overrides.
* `Manager`: Billing approval, Sales Order Hold release (DOC-18), inventory write-offs.
* `BillingOperator` / `Cashier`: Fast counter billing access (`/sales`, `/purchase`, returns), restricted from modifying statutory accounting charts or editing closed fiscal periods.
* `allow_direct_billing` Flag: In the `User` model, users with this flag enabled can bypass the strict Sales Order hold workflow to perform instantaneous counter billing.

---

## 3. Database Schema & Data Models

### 3.1 Core Invoice Engine (`models.Invoice` & `models.InvoiceItem`)

Invoices represent the legal and financial foundation for all 6 transaction voucher categories:

```python
class Invoice(Base):
    __tablename__ = "sales_invoices"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id = Column(String(36), ForeignKey("organizations.id"), nullable=False, index=True)
    fiscal_year_id = Column(String(36), ForeignKey("fiscal_years.id"), nullable=True)
    
    # Supported: sales-bill, purchase-bill, sales-return, purchase-return, brk-receive, brk-issue, challan
    invoice_type = Column(String(50), nullable=False, default="sales-bill", index=True)
    invoice_number = Column(String(100), nullable=False, index=True) # Unique per org + type
    date = Column(DateTime, default=datetime.utcnow)
    
    # Counterparty details
    customer_name = Column(String(255), nullable=True) # Also stores Supplier name in purchase flows
    party_id = Column(String(36), ForeignKey("parties.id"), nullable=True)
    party_inv_no = Column(String(100), nullable=True)  # Supplier original bill reference
    party_inv_date = Column(Date, nullable=True)
    
    # Financial Aggregates
    subtotal = Column(Numeric(12, 2), default=0.0)
    tax_total = Column(Numeric(12, 2), default=0.0)
    discount_total = Column(Numeric(12, 2), default=0.0)
    grand_total = Column(Numeric(12, 2), default=0.0)
    
    status = Column(String(50), default="Active") # Active, Cancelled, Amended
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationship to item lines
    items = relationship("InvoiceItem", back_populates="invoice", cascade="all, delete-orphan")
```

```python
class InvoiceItem(Base):
    __tablename__ = "sales_invoice_items"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    invoice_id = Column(String(36), ForeignKey("sales_invoices.id"), nullable=False, index=True)
    product_id = Column(String(36), ForeignKey("products.id"), nullable=True)
    product_name = Column(String(255), nullable=False)
    
    batch = Column(String(100), nullable=True)
    expiry = Column(String(20), nullable=True) # Formatted MM/YY
    quantity = Column(Numeric(12, 2), default=0.0)
    free_quantity = Column(Numeric(12, 2), default=0.0)
    rate = Column(Numeric(12, 2), default=0.0)
    mrp = Column(Numeric(12, 2), default=0.0)
    discount_percent = Column(Numeric(5, 2), default=0.0)
    igst_percent = Column(Numeric(5, 2), default=0.0)
    line_total = Column(Numeric(12, 2), default=0.0)
    
    # Pharma Stock Disposition Routing: saleable, breakage, expiry
    disposition = Column(String(50), default="saleable")
    source_invoice_item_id = Column(String(36), nullable=True)
```

### 3.2 Double-Entry General Ledger (`models.Voucher` & `models.VoucherEntry`)

The financial engine strictly adheres to append-only CQRS principles:

```python
class Voucher(Base):
    __tablename__ = "vouchers"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id = Column(String(36), nullable=False, index=True)
    fiscal_year_id = Column(String(36), nullable=True)
    voucher_number = Column(String(100), nullable=False, index=True) # e.g. JRN/2026-27/0165
    voucher_type = Column(String(50), nullable=False) # Journal, Payment, Receipt, Contra, Sales, Purchase
    date = Column(Date, nullable=False)
    ref_invoice_id = Column(String(36), nullable=True) # Ties voucher directly to invoice
    total_amount = Column(Numeric(14, 2), nullable=False)
    narration = Column(Text, nullable=True)
    status = Column(String(50), default="Active")
    
    entries = relationship("VoucherEntry", back_populates="voucher", cascade="all, delete-orphan")

class VoucherEntry(Base):
    __tablename__ = "voucher_entries"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    voucher_id = Column(String(36), ForeignKey("vouchers.id"), nullable=False)
    ledger_id = Column(String(36), ForeignKey("ledgers.id"), nullable=False)
    cr_dr = Column(String(2), nullable=False) # 'Dr' or 'Cr'
    amount = Column(Numeric(14, 2), nullable=False)
```

---

## 4. The 6 Core Transaction Voucher Modules

The ERP implements 6 high-speed transaction modules, each fulfilling a distinct business and accounting mandate:

```
+-------------------+---------------------+---------------------------------------------+
| TRANSACTION TYPE  | PRIMARY ROUTE       | INVENTORY & GODOWN EFFECT                   |
+-------------------+---------------------+---------------------------------------------+
| 1. Sales Bill     | /sales              | Deducts active batch current_stock          |
| 2. Purchase Bill  | /purchase           | Accrues active batch current_stock          |
| 3. Debit Note     | /purchase-return    | Removes stock (saleable or brk_exp_stock)   |
| 4. Credit Note    | /sales-return       | Adds stock (saleable or brk_exp_stock)      |
| 5. Breakage Issue | /brk-issue          | Deducts brk_exp_stock (claims to company)   |
| 6. Breakage Recv  | /brk-receive        | Accrues brk_exp_stock (returns from chemist)|
+-------------------+---------------------+---------------------------------------------+
```

### 4.1 Sales Bill (`src/pages/sales/SalesBill.tsx`)
* **Counter Speed**: Keyboard-optimized counter flow (< 2s per invoice).
* **Grid Traversal**: Focus begins on `Date` &rarr; `Bill No` &rarr; `Party Name` (`[F7]` search modal).
* **Row Workflow**: `Product` &rarr; `Batch` (`[F3]` batch modal with stock, MRP, expiry, rate) &rarr; `Qty` &rarr; `Free` &rarr; `Rate` &rarr; `Disc %` &rarr; auto-creates next row.
* **Instant Settlement**: Pressing `End` key or `Enter` on an empty product row jumps directly to the Bill Discount & Settlement modal.
* **Auto-Continuation**: Saving auto-advances the bill series using `incrementSeries(billNo)` (e.g. `RJ-INV-1001` &rarr; `RJ-INV-1002`).

### 4.2 Purchase Bill (`src/pages/purchase/PurchaseBill.tsx`)
* **Dual Inward Modes**:
  1. `DIRECT`: Fast counter purchase entry.
  2. `AGAINST_PO`: Matches against open Purchase Orders (DOC-17).
* **Vendor Header**: Captures Supplier Name (`[F7]`), Supplier Invoice No (`party_inv_no`), Supplier Invoice Date, and GST Tax Mode.
* **Batch Creation**: Automatically registers new batches and sets Sale Rate (SRate), Cost Price (P.Rate), MRP, and Expiry date.
* **Vendor Discrepancy Tracking**: Logs vendor complaints for damaged goods or billing rate mismatches directly during the inward flow.

### 4.3 Supplier Debit Note / Purchase Return (`src/pages/returns/PurchaseReturnBill.tsx`)
* **Theme**: Neumorphic Minimalist (White & Forest Green `#1b4332`, `#2d6a4f`).
* **Modes**:
  1. `[F2] Against Inward Bill`: Queries past supplier bills via `/api/sales/invoices/by-supplier/{supplier_name}`. Loads original items, purchase rates, and caps return units.
  2. `[F3] Direct Loose Return`: Allows loose counter entry for unlinked supplier returns.
* **Godown Routing**: Each item line specifies `disposition`:
  * `🟢 Saleable`: Deducts active stock.
  * `🔴 Breakage Godown`: Deducts non-saleable breakage stock.
  * `🟡 Expired Godown`: Deducts expired stock.
* **Reason Codes**: Transit damage, Expired goods, Near expiry recall, Excess supply, Rate difference.

### 4.4 Customer Credit Note / Sales Return (`src/pages/returns/SalesReturnBill.tsx`)
* **Modes**:
  1. `[F2] Against Original Invoice`: Queries past customer invoices via `/api/sales/invoices/by-customer/{customer_name}`. Displays billed quantity and remaining returnable quantity.
  2. `[F3] Direct Counter Return`: Counter loose item return.
* **Keyboard Flow**: `Enter` walks `return-qty` &rarr; `return-rate` &rarr; `return-disc` &rarr; next row. `ArrowUp`/`ArrowDown` navigates across rows vertically. `Enter` on the final row focuses the Save button.
* **Accounting Effect**: Posts Credit to Debtor Ledger (reducing accounts receivable) and Debit to Sales Return Ledger.

### 4.5 Breakage Issue (`src/pages/brk/BrkIssueBill.tsx`)
* Logs damaged or broken goods returned to pharmaceutical manufacturers/principals for replacement or credit claims.
* Deducts inventory strictly from `brk_exp_stock`. Active saleable stock remains unaffected.

### 4.6 Breakage Receive (`src/pages/brk/BrkReceiveBill.tsx`)
* Logs damaged goods returned by retail chemists/customers.
* Accrues inventory strictly into `brk_exp_stock`, quarantining damaged medicine from active retail counters.

---

## 5. Marg/Tally Alphanumeric Series Continuation Engine

In high-speed pharmaceutical wholesale environments, hardcoded numeric increments fail because different counters, departments, and financial years employ custom alphanumeric prefixes and sequence lengths (e.g. `RJ-DN-0020`, `2026/INV/045`, `CRN-999`).

### 5.1 Universal Series Parser & Increment Algorithm
The system employs the universal `incrementSeries` algorithm implemented across all billing components:

```typescript
export const incrementSeries = (str: string): string => {
  if (!str) return '1';
  
  // Match prefix and trailing numeric digits
  const match = str.match(/^(.*?)(\d+)$/);
  if (match) {
    const prefix = match[1];
    const numStr = match[2];
    const nextNum = parseInt(numStr, 10) + 1;
    let nextNumStr = nextNum.toString();
    
    // Preserve leading zeros and sequence width
    if (nextNumStr.length < numStr.length) {
      nextNumStr = nextNumStr.padStart(numStr.length, '0');
    }
    return prefix + nextNumStr;
  }
  
  // Non-numeric fallback (e.g., pure text series)
  return `${str}-0001`;
};
```

### 5.2 Persistence & User Override Rules
1. **Initial Value**: Defaults to the last saved series stored in `localStorage` (e.g. `erp_series_purchase_return`, `erp_series_sales_return`, `lastPurchaseBillNo`).
2. **User Edit Tolerance**: The user can click into the Entry No field or navigate via `Enter` to type *any* custom series (e.g. `RJ-DN-0020`).
3. **Save Advancement**: Upon successful invoice posting, the ERP takes the *exact value entered by the user*, runs `incrementSeries(val)`, updates the state to `RJ-DN-0021`, and persists this to `localStorage`.
4. **Zero Reset Rule**: The system never reverts a user's customized series back to hardcoded defaults (such as `DN-0002` or `INV-0002`).

---

## 6. General Ledger Double-Entry Auto-Posting Engine

Every invoice saved via `/api/sales/invoices` triggers the backend `_auto_post_accounting` hook in `backend/api/sales.py`.

### 6.1 Transaction Journal Rules Matrix

| Invoice Type | Debit Leg (Dr) | Credit Leg (Cr) | Amount |
| :--- | :--- | :--- | :--- |
| `sales-bill` | Customer Account (Debtor) | Sales Account + Output GST | Full Invoice Total |
| `purchase-bill` | Purchase Account + Input GST | Supplier Account (Creditor) | Full Invoice Total |
| `purchase-return` *(Debit Note)* | Supplier Account (Creditor) | Purchase Return Account + Input Tax Reversal | Full Return Total |
| `sales-return` *(Credit Note)* | Sales Return Account + Output Tax Reversal | Customer Account (Debtor) | Full Return Total |

### 6.2 Implementation Architecture (`backend/api/sales.py`)
```python
def _auto_post_accounting(db: Session, invoice: models.Invoice):
    inv_type = invoice.invoice_type.lower()
    
    # 1. Resolve Ledger Accounts
    # Resolves Party Ledger (Debtor or Creditor) and Sales/Purchase/Return Ledger
    ...
    
    # 2. Build Balanced Journal Voucher Entries
    entries = []
    if inv_type.startswith("sales-return"):
        # Dr Sales Return, Cr Debtor
        entries.append({"ledger_id": return_ledger_id, "cr_dr": "Dr", "amount": invoice.grand_total})
        entries.append({"ledger_id": party_ledger_id, "cr_dr": "Cr", "amount": invoice.grand_total})
    elif inv_type.startswith("purchase-return"):
        # Dr Creditor, Cr Purchase Return
        entries.append({"ledger_id": party_ledger_id, "cr_dr": "Dr", "amount": invoice.grand_total})
        entries.append({"ledger_id": return_ledger_id, "cr_dr": "Cr", "amount": invoice.grand_total})
    ...
    
    # 3. Commit Journal Voucher to PostgreSQL
    voucher = models.Voucher(
        organization_id=invoice.organization_id,
        fiscal_year_id=invoice.fiscal_year_id,
        voucher_number=f"JRN/{fiscal_year_name}/{next_seq:04d}",
        voucher_type="Journal",
        date=invoice.date.date(),
        ref_invoice_id=invoice.id,
        total_amount=invoice.grand_total,
        narration=f"Auto-posted from {invoice.invoice_type}: {invoice.invoice_number}"
    )
    db.add(voucher)
    db.flush()
```

---

## 7. Exhaustive API Route Directory (All 40 Backend Modules)

The ERP application backend is structured into 40 specialized API modules in `backend/api/`, all exposed through FastAPI and protected by JWT authentication and tenant isolation (`organization_id`):

### 7.1 `/api/sales` — Transaction & Billing Engine (`backend/api/sales.py`)
* `POST /api/sales/invoices`: Create or upsert an invoice (sales, purchase, returns, breakage). Deducts/adds inventory, evaluates margins, and auto-posts double-entry journal vouchers.
* `GET /api/sales/invoices`: Paginated invoice query with date, customer, type, and status filtering.
* `GET /api/sales/invoices/{id}`: Detailed invoice view including all item lines, tax breakdowns, and linked vouchers.
* `POST /api/sales/invoices/{id}/cancel`: SAP-style audit reversal. Marks status as `Cancelled`, creates reverse stock adjustments, and posts reversal journal vouchers.
* `GET /api/sales/invoices/by-customer/{customer_name}`: Fast query of past customer sales invoices for `[F2] Against Bill` returns.
* `GET /api/sales/invoices/by-supplier/{supplier_name}`: Fast substring query of past supplier inward bills for `[F2] Against Inward Bill` debit notes.
* `GET /api/sales/series/next`: Resolves next sequential voucher series number based on series code and organization.

### 7.2 `/api/stock` — Inventory, Expiry Radar & Stock Shift Engine (`backend/api/stock.py`)
* `GET /api/stock/current`: Paginated active inventory in `current_stock` godown.
* `GET /api/stock/brk-exp`: Dedicated non-saleable quarantine godown inventory (`brk_exp_stock`).
* `GET /api/stock/expiry-cockpit-telemetry`: Computes real-time Main Stock valuation & units, Quarantine stock, 90-day near-expiry risk valuations across 4 buckets, and active pending claims.
* `GET /api/stock/expiry-radar-batches`: Classifies active batches by risk bucket (`ALL`, `EXPIRED`, `30_DAYS`, `60_DAYS`, `90_DAYS`), manufacturer, and search query.
* `POST /api/stock/shifts`: Atomic stock reallocation transaction moving stock from `MAIN_SALEABLE_GODOWN` to `QUARANTINE_EXPIRY_GODOWN` decrementing `current_stock` and incrementing `brk_exp_stock`, creating `StockShiftVoucher` + `StockShiftItem`s, and auto-filing `PrincipalClaim` (`CLM-PRN-YYYY-XXXX`).
* `GET /api/stock/shifts`: Audit register listing historical stock shift vouchers.
* `GET /api/stock/shifts/{id}`: Full itemized detail of a specific stock shift voucher.

### 7.3 `/api/finance_v2` — Double-Entry Accounting Engine (`backend/api/finance_v2.py`)
* `POST /api/finance/vouchers`: Create multi-leg balanced accounting vouchers (Payment `[F5]`, Receipt `[F6]`, Journal, Contra).
* `GET /api/finance/vouchers`: Filterable voucher register with date range and voucher type filtering.
* `GET /api/finance/daybook`: Real-time chronological day book with running daily debit and credit totals.
* `GET /api/finance/ledger-statement/{ledger_id}`: Detailed ledger statement with Dr/Cr splits and running balance.
* `GET /api/finance/trial-balance`: Real-time Trial Balance verifying $\sum \text{Debits} = \sum \text{Credits}$.
* `GET /api/finance/profit-loss`: Period P&L statement calculating Gross and Net Profit.
* `GET /api/finance/balance-sheet`: Balance Sheet calculating Assets, Liabilities, and Owner's Equity.
* `GET /api/finance/outstanding`: Bill-by-bill outstanding debit/credit clearing and ageing analysis (0-30, 31-60, 61-90, >90 days).
* `POST /api/finance/allocate-fifo`: Automatic FIFO settlement allocation across unpaid invoices.

### 7.4 `/api/reports_v2` & `/api/reports` — Reporting & Drill-Down Engine (`backend/api/reports_v2.py`, `backend/api/reports.py`)
* `GET /api/reports_v2/company-wise-sales`: Aggregates invoice lines across all 25+ pharmaceutical manufacturers, calculating invoice counts, units sold, and turnover in `₹`.
* `GET /api/reports_v2/company-products/{company_id}`: Powers the inline drawer product drill-down for detailed item-level sales.
* `POST /api/reports_v2/query`: Semantic query execution engine powering the Custom Report Designer.
* `GET /api/reports/list`: Catalog of pre-configured financial, operational, and audit reports.

### 7.5 `/api/gst` — Statutory GST Compliance Engine (`backend/api/gst.py`)
* `GET /api/gst/summary`: High-level statutory turnover, tax liability, inward purchases, eligible ITC, net cash payable, and accumulated ITC balance.
* `GET /api/gst/gstr1`: Official GSTR-1 return dataset containing Table 4 (B2B), Table 7 (B2CS), Table 9B (CDNR), Table 12 (HSN Summary), and Table 13 (Documents Issued).
* `GET /api/gst/gstr2`: Official GSTR-2 inward register detailing supplier bills, supplier GSTINs, and automatic Debit Note ITC reversals.
* `GET /api/gst/gstr3b`: Monthly consolidated return computing Table 3.1 Outward supplies, Table 4 Eligible ITC, and Table 5.1 Tax payment breakdown (ITC set-off vs cash).
* `GET /api/gst/gstr1/json`: Official Government GSTN Offline Utility v1.5 payload export directly importable into the Government GST portal (`gst.gov.in`).

### 7.6 `/api/admin/tracking` — Enterprise Multi-Client Radar Engine (`backend/api/admin_tracker.py`)
* `GET /api/admin/tracking/summary`: Consolidated high-level KPIs (Total Sales, Operating Expenses, Active Cargo, Client Count, Mapped Product Brands).
* `GET /api/admin/tracking/clients`: Client-by-client operational scorecard matrix with turnover, expenses, cargo count, and mapped manufacturers.
* `GET /api/admin/tracking/sales`: Multi-client sales invoices ledger with client attribution, customer names, and line items.
* `GET /api/admin/tracking/expenses`: Multi-client operational claims and C&F depot costs ledger with status badges.
* `GET /api/admin/tracking/cargo`: Cross-client logistics consignment pipeline displaying transporters, vehicles, and live shipment status.

### 7.7 `/api/commission` — C&F Commission, Deal Terms & Billing Desk (`backend/api/commission.py`)
* `GET /api/commission/agreements`: Lists 4-pillar commercial deal terms (Sales % Comm, Godown Rent, Staff Salary, Transport Recovery).
* `POST /api/commission/agreements`: Creates or updates contractual commission deal terms.
* `POST /api/commission/simulate`: Deterministic sandbox calculation evaluating live turnover against commission slabs.
* `GET /api/commission/clients/{client_org_id}/telemetry`: 1-Click Auto-Fetch pulling client sales turnover, suggested commission, and depot operating expenses.
* `POST /api/commission/generate-client-bill`: Generates Outward C&F Service Bill (`CF-BILL-`) and dual-posts Inward Purchase Bill (`PUR-CF-`) into the Client Organization partition.
* `GET /api/commission/client-bills`: Historical audit register of all generated client commission bills with dual-post references.
* `GET /api/commission/claims`: Lists all recovery claims packages with approval workflow.

### 7.8 `/api/principal` & `/api/principals` — Principal Operations & Custody Control (`backend/api/principal.py`, `backend/api/principals.py`)
* `GET /api/principal/dashboard`: 5 KPI telemetry metrics (Custody Stock, Open Claims, Settlements, Reconciliations, Admin Freight Subsidy).
* `GET /api/principal/custody-stock`: Batch-level custody stock inventory matrix segregated by manufacturer.
* `POST /api/principal/claims`: Files formal Principal damage/breakage/expiry claims (`CLM-PRN-YYYY-XXXX`).
* `GET /api/principal/reconciliations`: 3-way reconciliation statements comparing physical vs ledger balances.
* `GET /api/principal/statements/{principal_id}`: Comprehensive period business statements with SHA-256 seal.

### 7.9 `/api/freight` — Freight Management & Transporter Reconciliation (`backend/api/freight.py`)
* `GET /api/freight/contracts`: Versioned carrier rate contracts with vehicle types and lane matrices.
* `POST /api/freight/contracts`: Registers new carrier rate card contract with surcharge rules.
* `POST /api/freight/calculate`: Deterministic calculation sandbox evaluating weight breaks, distance, and surcharges with formula trace.
* `GET /api/freight/reconciliation`: 3-way variance audit matching LR freight cost against transporter bills.
* `POST /api/freight/bills/approve`: Approves carrier invoice within tolerable variance and posts liability to GL Account 5200.

### 7.10 `/api/cargo` — Cargo & Consignment Management Engine (`backend/api/cargo.py`)
* `GET /api/cargo/consignments`: Kanban shipment pipeline (Planned -> In-Transit -> Delivered).
* `POST /api/cargo/consignments`: Registers consignment with IATA volumetric CBM auto-calculation and package barcodes (`PKG-YYYY-XXXX-NN`).
* `GET /api/cargo/costs`: Multi-client freight MIS with single-client vs combined reporting toggle.
* `POST /api/cargo/pod`: Submits 4-eyes Proof of Delivery with accepted vs damaged quantities.

### 7.11 `/api/workflow` — Business Automation & Approvals Engine (`backend/api/workflow.py`)
* `GET /api/workflow/inbox`: Pending approval tasks with SLA countdown timers and priority tags.
* `POST /api/workflow/tasks/{id}/approve`: 1-Click approval with maker-checker 403 authorization enforcement.
* `POST /api/workflow/tasks/{id}/reject`: Task rejection requiring mandatory audit remarks.
* `GET /api/workflow/designer/rules`: Configured workflow rules hierarchy.
* `POST /api/workflow/designer/simulate`: Evaluates sandbox transaction amount against approval hierarchy.

### 7.12 `/api/audit` — Cryptographic Audit Trail & Data Governance (`backend/api/audit.py`)
* `GET /api/audit/events`: Paginated audit events stream with SHA-256 hash chains.
* `POST /api/audit/verify-chain`: Traverses sequential hash blocks and certifies 100% cryptographic integrity.
* `GET /api/audit/events/{id}/diff`: Field-level before/after JSON visual diff inspection.
* `POST /api/audit/evidence-pack`: Generates cryptographically sealed Auditor Evidence Pack.
* `GET /api/audit/governance/policies`: Statutory retention schedules (2,920 days MCA/GST standard).
* `POST /api/audit/governance/holds`: Establishes statutory litigation legal hold.

### 7.13 `/api/master` & Master Subsystems (`backend/api/master.py`, `parties.py`, `pricing.py`, `schemes.py`, `warehouses.py`, `transport.py`)
* `GET /api/master/parties`: Business partner lookup (Debtors, Creditors, C&F Agents) with GSTIN and drug licenses.
* `GET /api/master/products`: Master product catalog with packaging, MRP, GST rate, and salt composition.
* `GET /api/master/ledger-groups`: Statutory Schedule III Account Heads and groupings.
* `GET /api/master/warehouses`: Multi-godown locations (Main, Breakage, Expiry, Quarantine).
* `GET /api/master/transport`: Registered transporters and vehicle master.
* `GET /api/master/schemes`: Promotional schemes and volume discounts matrix.
* `GET /api/master/pricing`: Tiered pricing formulas and margin rules.
* `GET /api/master/error-entries`: Crash recovery and unposted transaction staging ledger.

### 7.14 `/api/organizations` & Multi-Tenant Administration (`backend/api/organizations.py`)
* `GET /api/organizations`: Lists all tenant organizations and client entities.
* `POST /api/organizations/{org_id}/manufacturers`: Assigns authorized product brands/manufacturers to a client organization with custom commission overrides.
* `GET /api/organizations/{org_id}/manufacturers`: Queries assigned product manufacturers and contract terms for a specific client.

### 7.15 `/api/company_analytics` — Manufacturer Sales Intelligence (`backend/api/company_analytics.py`)
* `GET /api/company-analytics/turnover`: Aggregated line-item sales turnover, unit volume, and net revenue per pharmaceutical manufacturer.
* `GET /api/company-analytics/top-performers/{company_id}`: Top 3 selling products and top 3 purchasing chemist clients per manufacturer.

### 7.16 `/api/expenses` — Operational Expense & Petty Cash Engine (`backend/api/expenses.py`)
* `POST /api/finance/expenses`: Quick direct cash/bank operational expense posting with live P&L impact.
* `POST /api/finance/expenses/advances`: Issues employee imprest tour advances.
* `POST /api/finance/expenses/claims`: Submits itemized multi-line reimbursement claims with advance reconciliation.

### 7.17 `/api/assets` — Fixed Assets & Depreciation Engine (`backend/api/assets.py`)
* `GET /api/finance/assets`: Fixed assets register with gross block, capitalization date, and salvage value.
* `POST /api/finance/assets/depreciate`: Executes periodic SLM/WDV depreciation run posting GL entries (`Dr Depreciation Expense`, `Cr Accumulated Depreciation`).

### 7.18 `/api/compliance` — Statutory E-Invoicing & Signed Ledger (`backend/api/compliance.py`)
* `POST /api/compliance/einvoice/generate`: Generates NIC-compliant IRN and QR payload.
* `GET /api/compliance/signed-ledger`: Returns cryptographically signed general ledger extract.

### 7.19 `/api/orders` & `/api/procurement` — Order Management & Procurement (`backend/api/orders.py`, `procurement.py`, `dispatch.py`)
* `GET /api/orders/sales`: Sales orders queue and approvals workflow.
* `POST /api/orders/dispatch`: Creates dispatch manifests and assigns carrier PODs.
* `GET /api/procurement/po`: Purchase order master and vendor procurement tracker.
* `POST /api/procurement/grn`: Goods Receipt Note entry with batch accrual.
* `GET /api/procurement/vendor-complaints`: Logs vendor quality complaints and debit claim requests.

### 7.20 `/api/bulletins` & `/api/dashboard` — Announcements & Executive BI (`backend/api/bulletins.py`, `dashboard.py`)
* `GET /api/bulletins`: Company-wide announcements, circulars, and policy alerts.
* `GET /api/dashboard/kpis`: Real-time executive BI metrics, 7-month comparative sales vs procurement curves, and regional territory sales map data.


---

## 8. Automated Selenium Verification & QA Standards

To prevent regression in high-speed counter billing and series continuation, the repository includes headless Chrome Selenium test suites:

### 8.1 Test Scripts
* `test_purchase_return_selenium.py`: Validates Supplier Debit Note series customization (`RJ-DN-0020` &rarr; `RJ-DN-0021`), inward bill loading, stock disposition routing, and PostgreSQL GL voucher posting (`100% Pass`).
* `test_sales_return_selenium.py`: Validates Customer Credit Note series customization (`RJ-CN-8281` &rarr; `RJ-CN-8282`), bill picker modal, keyboard navigation on row inputs, and PostgreSQL GL voucher posting (`100% Pass`).
* `test_sales_bill_selenium.py`: Validates Sales Bill counter flow, batch selection, and save modal execution.

### 8.2 Execution Instructions
```powershell
# From the backend directory (ensuring .env is loaded):
cd C:\Users\DELL\OneDrive\Desktop\erp2\backend
C:\Python313\python.exe ..\test_purchase_return_selenium.py
C:\Python313\python.exe ..\test_sales_return_selenium.py
```

---

## 9. Development & Deployment Procedures

### 9.1 Starting Local Development Services
```powershell
# 1. Start FastAPI Backend (Port 8000)
cd C:\Users\DELL\OneDrive\Desktop\erp2\backend
C:\Python313\python.exe -m uvicorn main:app --port 8000 --reload

# 2. Start Vite Frontend (Port 50005)
cd C:\Users\DELL\OneDrive\Desktop\erp2
npm run dev -- --port 50005

# 3. Launch Native Desktop Shell (Optional)
cd C:\Users\DELL\OneDrive\Desktop\erp2
npm run tauri dev
```

### 9.2 TypeScript Verification & Production Build
```powershell
cd C:\Users\DELL\OneDrive\Desktop\erp2
npx tsc --noEmit
npm run build
```

---

## 10. Automated Selenium Testing Suite & Verification Matrix

The repository includes comprehensive headless Selenium end-to-end tests:
* `test_master_all_6_modules_selenium.py`: Master automated suite covering all 6 transaction voucher modules.
* `test_sales_bill_selenium.py`: Focused test on fast counter billing, batch modal, and receipt generation.
* `test_purchase_return_selenium.py`: Focused test on supplier debit note with inward bill matching.
* `test_sales_return_selenium.py`: Focused test on customer credit note with saleable/breakage/expiry routing.

### Running the Master Test Suite:
```powershell
cd C:\Users\DELL\OneDrive\Desktop\erp2
C:\Python313\python.exe test_master_all_6_modules_selenium.py
```

### Verification Assertions:
1. **Marg/Tally Alphanumeric Series Continuation**: Custom series entered by the operator (e.g., `RJ-INV-6874`, `RJ-PB-7905`, `RJ-DN-8924`, `RJ-CN-9937`, `RJ-BKI-10950`, `RJ-BKR-11966`) advance by +1 on transaction commit and remain persisted in `localStorage`.
2. **PostgreSQL Database Record Creation**: Verifies that `POST /api/sales/invoices` stores the exact custom invoice number and totals in `models.Invoice`.
3. **Double-Entry General Ledger Journal Posting**: Validates that balanced journal vouchers (`models.Voucher`) are posted in `models.GeneralLedger`.

---

## 11. Master Selenium Testing Suite: Management Reports & Financial Analytics

The test suite [`test_reports_and_finance_selenium.py`](file:///c:/Users/DELL/OneDrive/Desktop/erp2/test_reports_and_finance_selenium.py) provides complete end-to-end regression coverage across 8 analytics and financial accounting modules:

```powershell
cd C:\Users\DELL\OneDrive\Desktop\erp2
C:\Python313\python.exe test_reports_and_finance_selenium.py
```

### Module Verification Scope:
1. **Report Viewer (`/reports`)**:
   * Evaluates `api/master/manufacturers` retrieval across 25+ pharmaceutical companies.
   * Tests Marg ERP company filter modal (`Select All`, `Clear All`, filter search `Cipla`).
   * Validates inline product drill-down expansion (`[▶ View Products]`) hitting `/api/reports_v2/sales/company-wise/products`.
2. **Custom Report Designer (`/reports/designer`)**:
   * Executes multi-dimensional semantic queries against `POST /api/reports_v2/query` (Sales grouped by Company/Principal and Customer/Party).
   * Validates template persistence via `POST /api/reports_v2/templates`.
3. **Day Book (`/finance/daybook`)**:
   * Retrieves chronological voucher entries hitting `GET /api/finance/daybook` with multi-leg debit and credit breakdown.
4. **Ledger Statement (`/finance/ledger-statement`)**:
   * Loads 69 active ledger accounts via `GET /api/master/ledgers`.
   * Queries statement via `GET /api/finance/ledger-statement/{ledger_id}` asserting opening balance and real-time running balance calculation.
5. **Trial Balance (`/finance/trial-balance`)**:
   * Queries `GET /api/finance/trial-balance` evaluating closing balances across 62 active ledgers.
   * Asserts $\sum \text{Debits} = \sum \text{Credits}$ double-entry balancing.
6. **Profit & Loss Statement (`/finance/profit-loss`)**:
   * Queries `GET /api/finance/profit-loss` for fiscal period.
   * Categorizes Income vs Expense accounts with subtotals and highlighted Net Profit/Loss.
7. **Balance Sheet (`/finance/balance-sheet`)**:
   * Queries `GET /api/finance/balance-sheet`.
   * Evaluates $\text{Assets} = \text{Liabilities} + \text{Equity}$ accounting equation.
8. **Bank Reconciliation (`/finance/bank-reconciliation`)**:
   * Evaluates bank account selector and split-screen unreconciled bank statements and ledger vouchers.

---

## 12. Master Selenium Testing Suite: Statutory GST Compliance & Tax Filing Engine

The test suite [`test_gst_compliance_selenium.py`](file:///c:/Users/DELL/OneDrive/Desktop/erp2/test_gst_compliance_selenium.py) provides 100% automated regression verification of the statutory tax engine:

```powershell
cd C:\Users\DELL\OneDrive\Desktop\erp2
C:\Python313\python.exe test_gst_compliance_selenium.py
```

### 12.1 High-Performance Query Architecture & Optimization
* **Elimination of N+1 Queries**: Previous loop-based party and ledger lookups produced $O(N)$ database roundtrips resulting in 10.6s response latency.
* **Bulk Pre-Fetch Caching**: In `backend/api/gst.py`, all parties and ledgers within the active organization are queried into in-memory dictionaries (`party_map`, `ledger_map`) in 2 fast queries.
* **Result**: Latency dropped from 10.6 seconds to 0.4 seconds (>25x speedup), ensuring instant sub-second page loads even with hundreds of transaction vouchers.

### 12.2 Verification Assertions (10/10 Steps - 100% Pass):
1. **JWT Authentication & Tenant Context**: Authenticates as `admin` on Organization `78fca6c8-eb92-41c4-96ec-ac2e150d56a4`.
2. **Direct Backend API Verification**: Asserts HTTP 200 on all 5 statutory endpoints (`/api/gst/summary`, `/api/gst/gstr1`, `/api/gst/gstr2`, `/api/gst/gstr3b`, `/api/gst/gstr1/json`).
3. **Headless Chrome Launch**: Injects auth session into both `sessionStorage` and `localStorage` to ensure desktop-compatible persistence.
4. **Executive Summary KPI Cards**:
   * Outward Supplies: ₹1,52,519.34 (Tax: ₹17,318.00)
   * Inward Supplies & ITC: ₹1,81,76,245.90 (Eligible ITC: ₹29,03,956.42)
   * Net Cash Payable: ₹0.00 | Accumulated ITC Balance Carried Forward: ₹28,86,638.42
   * Document Counts: 49 Outward, 105 Inward
5. **GSTR-1 Multi-Tab Tables**:
   * Table 4 (B2B): 12 rows verified with customer GSTINs, POS, and tax breakdowns.
   * Table 7 (B2CS): 37 retail sales rows verified.
   * Table 9B (CDNR): 10 sales return credit notes verified.
   * Table 12 (HSN): 19 distinct HSN summaries verified with quantities and UQC codes.
   * Table 13 (Documents Issued): 1 sequence verified with serial ranges and cancellations.
6. **GSTR-2 Inward Supplies Register**:
   * 105 purchase records rendered with supplier GSTINs and bill numbers.
   * Emerald ITC Reconciliation banner confirms automatic deduction of Debit Note ITC reversals (-₹95.20).
7. **GSTR-3B Consolidated Return**:
   * Table 3.1 Outward supplies (5 rows), Table 4 Eligible ITC (3 rows), Table 5.1 Tax payment breakdown (3 rows).
8. **Government GSTN Portal JSON Export**:
   * Triggers native download of official JSON schema `GSTR1_Offline_Utility_v1.5`.
   * Asserts confirmation banner: `"GSTN Official JSON export ready for upload to gst.gov.in"`.
9. **Period Filtering Engine**:
   * Executes `MTD` date preset and `Fetch Returns` action, asserting clean refresh.
---

## 13. Master Selenium Testing Suite: Payment, Receipt & Bill-by-Bill Settlement Engine (DOC-24 & DOC-07)

The automated test suite [`test_receipt_payment_settlement_selenium.py`](file:///c:/Users/DELL/OneDrive/Desktop/erp2/test_receipt_payment_settlement_selenium.py) provides end-to-end regression verification of counter receipt entry, outward vendor payments, FIFO bill allocations, and outstanding ageing statements:

```powershell
cd C:\Users\DELL\OneDrive\Desktop\erp2
C:\Python313\python.exe test_receipt_payment_settlement_selenium.py
```

### 13.1 Architecture & Endpoints Under Test
* `POST /api/finance/receipt-payment`: Atomically creates `models.Voucher`, balanced `models.VoucherEntry` records (`Dr Cash/Bank`, `Cr Debtor` or vice versa), and links `models.InvoiceAllocation` records.
* `GET /api/finance/allocations/pending`: Queries open receivable/payable invoices scoped by `party_id`, calculating `days_overdue` and net unallocated amounts.
* `GET /api/finance/outstanding`: Computes real-time debtor/creditor ageing across statutory brackets (`0-30`, `31-60`, `61-90`, `90+`).

### 13.2 Automated Verification Assertions (6/6 Steps - 100% Pass):
1. **API Authentication & Tenant Context**: Authenticates as `admin` on Organization `78fca6c8-eb92-41c4-96ec-ac2e150d56a4`.
2. **Direct Backend API Verification**:
   - Asserts HTTP 200 on `GET /api/finance/allocations/pending` (237 open bills returned).
   - Asserts HTTP 200 on `GET /api/finance/outstanding?type=receivables` and `?type=payables`.
3. **Headless Chrome Initialization**: Launches Selenium WebDriver with auth injection in `sessionStorage` and `localStorage`.
4. **Customer Counter Receipt Voucher (`/receipt`)**:
   - Verifies apex header and keyboard navigation.
   - Selects customer `APOLLO PHARMACY LTD.` from modal.
   - Enters receipt amount `₹750.00`.
   - Triggers `Auto-Allocate FIFO [Alt+A]`, applying ₹284.00 to oldest bill and ₹466.00 to next bill.
   - Clicks `Post & Save Receipt`, confirms modal, and asserts success banner and series advancement to `RCP-0002`.
5. **Supplier Outward Payment Voucher (`/payment`)**:
   - Switches context to Payment Voucher (`[F5]`).
   - Selects supplier `Sun Pharma Ltd.` from modal.
   - Enters disbursement amount `₹600.00` and executes FIFO allocation against purchase bill `PB-TEST-49EF`.
   - Posts voucher and confirms series rollover to `PMT-0002`.
6. **Outstanding & Ageing Workbench (`/finance/outstanding`)**:
   - Asserts Ageing KPI cards (`0–30 Days (Current)`, `31–60 Days`, `61–90 Days`, `90+ Days Overdue`).
   - Switches to Payables tab via `#tab-payables-btn`.
   - Expands supplier bill drawer via `.party-ageing-row` click, verifying bill numbers, dates, values, settled amounts, net due, and ageing brackets.
   - Asserts that Apollo Pharmacy and Sun Pharma Ltd. outstanding balances accurately decreased in real time.

---

## 14. Master Selenium Testing Suite: Journal Voucher & Accrual Engine (DOC-25)

The automated test suite `test_journal_accrual_engine_selenium.py` provides end-to-end regression verification of multi-leg journal entries, dynamic auto-balancing (`[Ctrl+B]`), accrual scheduling, and traceable one-click reversals:

```powershell
cd C:\Users\DELL\OneDrive\Desktop\erp2
C:\Python313\python.exe test_journal_accrual_engine_selenium.py
```

### 14.1 Architecture & Endpoints Under Test
* `POST /api/finance/journal`: Validates sum(Debits) == sum(Credits) > 0, generates sequential voucher number (with series lock), inserts master `models.Voucher` and multi-leg `models.VoucherEntry` records, and updates per-FY `models.LedgerBalance` and `models.Ledger.closing_balance`.
* `GET /api/finance/journals`: Queries journal vouchers with classification filters (`journal_type`), status, and date range.
* `POST /api/finance/journal/{id}/reverse`: Executes atomic GL inversion (Dr -> Cr, Cr -> Dr), updates ledger balances, transitions original voucher status to `Reversed`, and links `reversal_voucher_id`.

### 14.2 Automated Verification Assertions (6/6 Stages - 100% Pass):
1. **API Authentication & Tenant Context**: Authenticates as `admin` on Neon PostgreSQL (`Org: 78fca6c8-eb92-41c4-96ec-ac2e150d56a4`).
2. **Direct Backend API Verification**:
   - Asserts HTTP 200 on `GET /api/finance/journals`.
   - Asserts HTTP 400 Bad Request rejection when posting unbalanced entries (Debit 1000 != Credit 900).
   - Posts balanced entry via API and validates status, entries count, and voucher numbering.
   - Tests `POST /api/finance/journal/{id}/reverse`, asserting inversion where original Dr became Cr and vice versa.
3. **Headless Chrome Initialization**: Launches Selenium WebDriver (1440x950) with auth injection in `sessionStorage` and `localStorage`.
4. **Keyboard-First Cockpit Entry (`/journal`)**:
   - Enters multi-leg transaction: Rent Expense Dr Rs.10,000.00, Electricity Dr Rs.2,500.00.
   - Asserts real-time validation displays `OUT OF BALANCE`.
   - Triggers Auto-Balance (`[Ctrl+B]`), asserting automatic population of Leg 3 (Cash/Bank Cr Rs.12,500.00) and `BALANCED` status.
   - Confirms pre-posting modal and asserts success banner and series rollover.
5. **Accrual Journal & Auto-Reversal Scheduler**:
   - Selects `Accrual Journal` classification, verifying automatic activation of the Auto-Reversal checkbox.
   - Posts balanced accrual entry and captures screenshot.
6. **Journal Register & One-Click Reversal (`/finance/journal-register`)**:
   - Verifies audit metrics cards (Total Journals, Volume, Active Accruals, Reversals).
   - Expands voucher drawer showing underlying multi-leg debit and credit legs.
   - Clicks `[Reverse ↩]`, opens reversal modal, inputs audit reason, and posts reversal.
   - Asserts status transition to `Reversed` and verification of linked reversal voucher number.

---

## 15. Master Selenium Testing Suite: Expense, Petty Cash & Reimbursement Engine (DOC-26)

The automated test suite `test_expense_petty_cash_selenium.py` provides end-to-end regression verification of operational expenditure workflows, employee advances, multi-line itemized claims, and atomic General Ledger double-entry postings:

```powershell
cd C:\Users\DELL\OneDrive\Desktop\erp2
C:\Python313\python.exe test_expense_petty_cash_selenium.py
```

### 15.1 Architecture & Endpoints Under Test
* `GET /api/expenses/summary`: Live KPI metrics (`total_expenses`, `pending_claims_count`, `active_advances_amount`, `settled_advances_count`, `categories_count`).
* `GET /api/expenses/categories`: Operational categories mapped to ledger accounts (`models.ExpenseCategory`).
* `POST /api/expenses/advances`: Creates employee advance (`models.EmployeeAdvance`), tracking status (`Active` / `Settled`).
* `POST /api/expenses/claims`: Creates multi-line itemized reimbursement claims (`models.ExpenseClaim` and `models.ExpenseLine`).
* `POST /api/expenses/claims/{id}/approve`: Approves claim, atomically generates double-entry Journal Voucher in `vouchers` and `voucher_entries` (`Cr Employee Ledger`, `Dr Category Ledgers`), and settles any linked `EmployeeAdvance` record.

### 15.2 Automated Verification Assertions (8/8 Stages - 100% Pass):
1. **API Authentication & Tenant Context**: Authenticates as `admin` on Neon PostgreSQL (`Org: 78fca6c8-eb92-41c4-96ec-ac2e150d56a4`).
2. **Direct Backend API Verification**: Verifies auto-seeded operational categories, summary KPIs, and ensures test employee ledger exists.
3. **Headless Chrome WebDriver Initialization**: Launches Chrome (1440x950) with auth injection in `sessionStorage` and `localStorage`.
4. **Cockpit Overview (`/finance/expenses`)**: Asserts `Expense & Petty Cash Engine` header, `DOC-26` badge, and all 4 KPI metric cards.
5. **Employee Advance Issuance**: Opens advance modal, selects employee `Vikram Malhotra`, inputs ₹5,000.00, submits, switches to Advances tab, and asserts `Active` status.
6. **Multi-Line Claim Submission**: Opens claim modal, links the ₹5,000.00 advance, inputs 3 itemized lines totaling ₹4,000.00 (Travel ₹2,500, Meals ₹1,200, Supplies ₹300), verifies dynamic total calculation, and submits draft.
7. **One-Click Claim Approval & UI Feedback**: Clicks `[Approve]` on claim row, asserts approval banner with voucher ID, confirms status transitions to `Approved`, and verifies action displays `GL Committed`.
8. **GL Accounting Invariance & Advance Settlement Assertion**:
   - Retrieves generated Journal Voucher via `GET /api/finance/vouchers/{voucher_id}`.
   - Asserts $\sum \text{Dr} = \sum \text{Cr} = 4000.00$ with Credit to employee and Debits to expense accounts.
   - Asserts linked `EmployeeAdvance.status == "Settled"` with voucher ID populated.
   - Asserts updated summary KPIs (`settled_advances_count >= 1`).

### 15.3 Single-Click Direct Operational Expense & Live P&L Architecture (DOC-26 Overhaul)
To support high-speed recurring petty expenses without multi-step claim overhead:
* `ensure_statutory_expense_ledgers()`: Automatically seeds 10 standard P&L heads under `group_name = "Indirect Expenses"` (or `"Direct Expenses"` for freight).
* `POST /api/expenses/direct`: 
  - Validates `expense_ledger_id`, `paid_from_ledger_id`, and `amount > 0`.
  - Atomically generates a balanced `Payment` (or `Journal`) Voucher with `voucher_number` (e.g. `PAY/2026-27/0002`).
  - Commits `Dr: Expense Head (Indirect Expenses)` and `Cr: Paid From (Cash in Hand / Bank A/c)`.
  - Decreases Net Profit in P&L and deducts Cash/Bank closing balance in general ledger.
  - Automatically records an audit `ExpenseClaim` and single `ExpenseLine` tagged with `[Direct Payment Voucher: {voucher_number}]`.
* UI Cockpit (`src/pages/finance/ExpenseManagement.tsx`):
  - Form with explicit Paid From dropdown, Expense Head dropdown, amount, payee, and narration.
  - Live Accounting Impact Box displaying Dr, Cr, and Net Profit reduction before submitting.
  - Fast deep links to `/finance/profit-loss`, `/finance/daybook`, and `/finance/ledger-statement/:id`.
* Automated Verification:
  - `test_direct_expense_pnl.py`: Verifies statutory seeding, direct posting, P&L reflection, DayBook payment voucher, and KPI updates.
  - `test_direct_expense_ui_selenium.py`: Verifies UI data-testids, live preview box, form submission, and captures verification screenshots (`expense_quick_direct_entry_filled.png`, `expense_quick_direct_posted.png`, `expense_pnl_verified.png`, `expense_daybook_verified.png`).

---

## 16. Master Selenium Testing Suite: Fixed Assets & Depreciation Engine (DOC-27)

The automated test suite `test_fixed_assets_selenium.py` provides end-to-end verification of asset lifecycle management, statutory categories, Straight Line and Written Down Value depreciation calculations, and automated General Ledger double-entry postings:

```powershell
cd C:\Users\DELL\OneDrive\Desktop\erp2
C:\Python313\python.exe test_fixed_assets_selenium.py
```

### 16.1 Architecture & Endpoints Under Test
* `GET /api/assets/summary`: Returns real-time metrics (`total_gross_block`, `accumulated_depreciation`, `net_book_value`, `active_assets_count`).
* `GET /api/assets/`: Fetches registered fixed assets (`models.FixedAsset`) joined with statutory category metadata.
* `POST /api/assets/`: Registers new enterprise asset with code, name, category, purchase cost, salvage value, and depreciation method (SLM vs WDV).
* `GET /api/assets/categories`: Queries statutory category classes (`models.AssetCategory`).
* `POST /api/assets/{id}/depreciate`: Calculates single asset period depreciation and posts atomic GL Journal Voucher.
* `POST /api/assets/depreciate/all`: Executes bulk period depreciation run across all active enterprise assets.

### 16.2 Depreciation Mathematical Models & Invariants
1. **Straight Line Method (SLM)**:
   $$\text{Annual Depreciation} = \frac{\text{Purchase Cost} - \text{Salvage Value}}{\text{Useful Life (Years)}}$$
2. **Written Down Value (WDV)**:
   $$\text{Periodic Depreciation} = \text{Current Net Book Value} \times \left(1 - \left(\frac{\text{Salvage}}{\text{Cost}}\right)^{1/n}\right)$$
3. **Double-Entry General Ledger Invariance**:
   $$\text{Dr: Depreciation Expense A/c (P&L - Indirect Expenses)}$$
   $$\text{Cr: Accumulated Depreciation A/c (Balance Sheet - Asset Contra)}$$
   $$\sum \text{Dr} = \sum \text{Cr}$$

### 16.3 Automated Verification Assertions (5/5 Stages - 100% Pass):
1. **API Authentication & Tenant Context**: Authenticates as `admin` on Neon PostgreSQL (`Org: 78fca6c8-eb92-41c4-96ec-ac2e150d56a4`).
2. **Headless Chrome WebDriver Initialization**: Launches Chrome (1440x950) with auth injection in `sessionStorage` and `localStorage`.
3. **Asset Registration Flow (`/finance/assets`)**:
   - Opens asset registration modal, fills code `AST-2026-0001`, name `Cold Storage Chiller Unit 5HP`, cost ₹2,00,000.00, salvage value ₹10,000.00, method SLM, useful life 10 years.
   - Asserts registration success banner and table rendering.
4. **Depreciation Run Execution**:
   - Triggers `[Run Depreciation]`, calculating period depreciation of ₹20,000.00.
   - Asserts generated Journal Voucher (`JRN/2026-27/0201`) with Dr Depreciation Expense and Cr Accumulated Depreciation.
   - Asserts Net Book Value reduction to ₹1,80,000.00 on Asset Cockpit.
5. **Financial Statements Integration**:
   - Navigates to `/finance/profit-loss`, asserting ₹20,000.00 under `INDIRECT EXPENSES` reducing Net Profit.
   - Captures visual artifacts (`asset_cockpit_initial.png`, `asset_registered_success.png`, `asset_depreciation_run_posted.png`, `asset_pnl_depreciation_verified.png`).

---

## 17. Master Selenium Testing Suite: Bank Reconciliation & Cash Control Engine (DOC-28)

The automated test suite `test_bank_recon_cash_selenium.py` provides end-to-end verification of dual-pane bank statement reconciliation, multi-criteria auto-matching algorithms, and physical cash denomination drawer verification:

```powershell
cd C:\Users\DELL\OneDrive\Desktop\erp2
C:\Python313\python.exe test_bank_recon_cash_selenium.py
```

### 17.1 Architecture & Endpoints Under Test
* `GET /api/finance_v2/bank-recon/summary`: Calculates BRS balances (`statement_balance`, `erp_book_balance`, `unreconciled_delta`, `uncleared_items_count`).
* `GET /api/finance_v2/bank-recon/transactions`: Retrieves ERP ledger bank vouchers and imported statement entries.
* `POST /api/finance_v2/bank-recon/auto-match`: Multi-rule matching engine executing:
  - Exact reference / cheque number matching.
  - Exact amount matching ($\text{ERP Amount} == \text{Statement Amount}$).
  - Date proximity tolerance matching ($\pm 3$ days window).
* `POST /api/finance_v2/cash-verifications`: Submits physical cash count with full denomination breakdown (`models.CashVerification`).
* `GET /api/finance_v2/cash-verifications`: Fetches historical drawer count audit logs.

### 17.2 Physical Cash Denomination Invariants
- Denominations tracked: Notes (₹2000, ₹500, ₹200, ₹100, ₹50, ₹20, ₹10) and Coins (₹5, ₹2, ₹1).
- Physical Total: $\sum (\text{Denomination} \times \text{Count})$.
- Variance: $\text{Physical Total} - \text{Book Balance}$.
- Cash Shortage (Variance $< 0$) or Cash Excess (Variance $> 0$) flagged with required audit explanation.

### 17.3 Automated Verification Assertions (6/6 Stages - 100% Pass):
1. **API Authentication & Tenant Context**: Authenticates as `admin` on Neon PostgreSQL.
2. **Headless Chrome Initialization**: Launches Chrome (1440x950) with auth token injection.
3. **BRS Cockpit Navigation (`/finance/bank-reconciliation`)**:
   - Asserts BRS metrics strip (Statement Balance, Book Balance, Unreconciled Variance, Pending Clearance).
   - Selects corporate bank ledger (`HDFC Bank Current A/c`).
4. **Statement Balance Entry & Dual Workbench**:
   - Inputs statement closing balance and date.
   - Inspects left pane (ERP vouchers) and right pane (statement feed).
5. **Auto-Match Multi-Criteria Engine**:
   - Launches Auto-Match modal, configures $\pm 3$ days date tolerance and reference matching.
   - Executes auto-matching, asserting matching transaction clearance and updated variance.
6. **Physical Cash Denomination Tally**:
   - Fills currency denomination grid across ₹500, ₹200, ₹100 notes and ₹10 coins.
   - Asserts real-time physical total computation vs book balance.
   - Submits verification and asserts database persistence.
   - Captures visual artifacts (`bank_recon_cockpit_initial.png`, `bank_recon_auto_match_modal.png`, `bank_recon_cash_denomination_tally.png`).

---

## 18. Master Selenium Testing Suite: Statutory GST Compliance & E-Invoicing Engine (DOC-29)

The automated test suite `test_gst_compliance_selenium.py` provides end-to-end regression verification of statutory GST reporting, GSTR-1 multi-table registers, GSTR-2 inward purchase reconciliation with Debit Note ITC reversals, GSTR-3B monthly consolidated returns, and official Government GSTN Portal Offline JSON Utility generation:

```powershell
cd C:\Users\DELL\OneDrive\Desktop\erp2
C:\Python313\python.exe test_gst_compliance_selenium.py
```

### 18.1 Architecture & Endpoints Under Test
* `GET /api/gst/dashboard`: Real-time executive metrics (`outward_taxable_value`, `outward_tax_liability`, `inward_taxable_value`, `eligible_itc`, `net_cash_payable`, `accumulated_itc_balance`).
* `GET /api/gst/gstr1`: Official GSTR-1 dataset spanning:
  - Table 4 (B2B Taxable Invoices)
  - Table 7 (B2CS Unregistered Retail Supplies)
  - Table 9B (Credit / Debit Notes Registered - CDNR)
  - Table 12 (HSN Summary with Quantities and UQC Codes)
  - Table 13 (Documents Issued Serial Numbering Audit)
* `GET /api/gst/gstr1/json`: Direct export formatted according to `GSTR1_Offline_Utility_v1.5` JSON schema for upload to `gst.gov.in`.
* `GET /api/gst/gstr2`: Inward purchases register with automated Debit Note ITC reversal matching.
* `GET /api/gst/gstr3b`: Consolidated Table 3.1, Table 4, and Table 5.1 calculations.
* `POST /api/compliance/einvoice/generate`: 64-character hash Invoice Reference Number (IRN) generation with signed QR code.
* `POST /api/compliance/ewaybill/generate`: NIC E-Way Bill generation for consignments $> ₹50,000$.
* `GET /api/compliance/signed-ledger/verify`: SHA-256 cryptographic signature validation for customer ledger statements.

### 18.2 Automated Verification Assertions (11/11 Stages - 100% Pass):
1. **API Authentication & Tenant Context**: Authenticates as `admin` on Organization `78fca6c8-eb92-41c4-96ec-ac2e150d56a4`.
2. **Headless Chrome WebDriver Initialization**: Launches Chrome (1440x950) with auth token injection.
3. **Executive Summary KPI Cards (`/gst`)**:
   - Asserts Outward Taxable Value ₹1,52,519.34 and Outward Tax ₹17,318.00.
   - Asserts Inward Taxable Value ₹1,81,76,245.90 and Eligible ITC ₹29,03,956.42.
   - Asserts Net Cash Tax ₹0.00 and ITC Carried Forward ₹28,86,638.42.
4. **GSTR-1 Multi-Tab Workbench**:
   - Table 4 (B2B): Asserts 12 registered B2B invoice rows with customer GSTINs and POS codes.
   - Table 7 (B2CS): Asserts 37 retail sales rows.
   - Table 9B (CDNR): Asserts 10 credit note rows reducing outward liability.
   - Table 12 (HSN): Asserts 19 HSN rows with medicament codes and UQC units.
   - Table 13 (Docs Issued): Asserts serial numbering sequence tracking.
5. **GSTR-2 Inward Register**:
   - Asserts 105 purchase invoice rows with supplier GSTINs.
   - Asserts automatic deduction of Debit Note ITC reversals (-₹95.20).
6. **GSTR-3B Monthly Return**:
   - Table 3.1: Asserts outward taxable supplies and liabilities.
   - Table 4: Asserts eligible ITC breakdown.
   - Table 5.1: Asserts tax payment calculation and cash set-off.
7. **Government GSTN Offline Utility JSON Export**:
   - Downloads official `GSTR1_Offline_Utility_v1.5` JSON payload.
   - Asserts valid structure and portal compatibility.
8. **Compliance Workbench & Signed Ledger (`/gst/compliance` & `/gst/signed-ledger`)**:
   - Verifies E-Invoicing (IRN), E-Way Bill generation, and SHA-256 signed ledger verification.
   - Captures visual artifacts (`gst_cockpit_initial_view.png`, `gst_gstr1_view.png`, `gst_gstr2_view.png`, `gst_gstr3b_view.png`, `gst_compliance_workbench_view.png`).

---
## 19. Master Selenium Testing Suite: Dashboard, KPI, BI & Management Control Centre Engine (DOC-31)

The automated test suite `test_dashboard_bi_control_center_selenium.py` provides end-to-end regression verification of the dual-screen architecture: the Operational Counter Workbench (`Route: /`) and the Executive BI Dashboard (`Route: /dashboard`) featuring the compact regional sales map and interactive click-to-expand modal:

```powershell
cd C:\Users\DELL\OneDrive\Desktop\erp2
C:\Python313\python.exe test_dashboard_bi_control_center_selenium.py
```

### 19.1 Architecture & Endpoints Under Test
* `GET /api/dashboard/summary`: Aggregates live today's sales, MTD revenue, procurement volume, trading margin, bank/cash balances, and inventory health with exclusion filters.
* `GET /api/dashboard/sales-territories`: Multi-state pharmaceutical sales turnover, chemist coverage, and quota attainment percentages.
* `GET /api/dashboard/trends`: 7-month comparative performance curve, Opex distribution, top products ranking, and receivables ageing.
* `GET /api/dashboard/predictive`: AI-ready rule engine calculating 30-day cash flow forecast, stockout velocity (run rates & days-to-stockout), customer churn risk, and near-expiry exposure.
* `GET /api/dashboard/alerts`: Urgent exception center warnings and real-time counter voucher ticker feed.

### 19.2 Automated Verification Assertions (7/7 Stages - 100% Pass):
1. **API Authentication & Tenant Context**: Authenticates as `admin` on Organization `78fca6c8-eb92-41c4-96ec-ac2e150d56a4`.
2. **Direct Backend API Verification**:
   - Asserts HTTP 200 on `/summary` (Today Sales: Rs. 1,84,500.00).
   - Asserts HTTP 200 on `/sales-territories` (Territories: 4).
   - Asserts HTTP 200 on `/trends` (7-Month Comparative Analysis).
   - Asserts HTTP 200 on `/alerts` (Exceptions & Counter Ticker).
3. **Headless Chrome WebDriver Initialization**: Launches Chrome (1600x1050) with auth token injection.
4. **Operational Counter Workbench (`Route: /`)**:
   - Asserts `DOC-31 COUNTER WORKBENCH` badge and operational counter header.
   - Asserts Rapid Transaction Hub with keyboard hotkeys (`F2`, `F5`, `F6`, `F9`).
   - Asserts Urgent Counter Exceptions with 1-click action buttons.
   - Asserts Live Counter Voucher Ticker with real-time audit entries.
   - Captures `verified_homescreen_operational_workbench.png`.
5. **Executive BI Dashboard (`Route: /dashboard`)**:
   - Navigates to `/dashboard` and asserts `DOC-31 BI ENGINE` badge.
   - Asserts Executive KPI Strip (Gross Revenue, Procurement Volume, Gross Operating Margin, Consolidated Liquidity).
   - Asserts Sales Turnover vs Purchase Trend Area chart and Operating Expenses donut chart.
   - Asserts presence of Compact Regional Sales Map card (~340px height, `col-span-3`).
   - Captures `verified_dashboard_bi_compact_view.png`.
6. **Click-to-Expand Sales Map Modal Interaction**:
   - Clicks compact sales map card.
   - Asserts `#mapModal` launches with backdrop blur.
   - Asserts `Regional Pharmaceutical Sales Intelligence` header.
   - Asserts enlarged vector territory polygons and territory KPI scorecard.
   - Asserts state comparative performance table.
   - Captures `verified_dashboard_bi_map_modal_opened.png`.
7. **Modal Dismissal**:
   - Clicks close button `[✕]`.
   - Asserts modal dismisses cleanly, restoring executive dashboard view.

---

## 20. Master Selenium Testing Suite: Workflow, Approval & Business Automation Engine (DOC-32)

The automated test suite `test_workflow_approval_automation_selenium.py` provides end-to-end regression verification of the DOC-32 Workflow Engine, including the Unified Approval Inbox (`/workflow/inbox`, `[F4]`), Visual No-Code Designer (`/workflow/designer`), and Real-Time Execution Monitor (`/workflow/monitor`):

```powershell
cd C:\Users\DELL\OneDrive\Desktop\erp2
C:\Python313\python.exe test_workflow_approval_automation_selenium.py
```

### 20.1 Architecture & Endpoints Under Test
* `GET /api/workflow/inbox`: Fetches pending & historic tasks for the authenticated user, automatically computing live SLA deadlines, priority badges, and Maker-Checker compliance status.
* `POST /api/workflow/tasks/{task_id}/action`: Executes `APPROVE`, `REJECT` (mandatory explanation), `DELEGATE`, or `ESCALATE`. Validates Maker-Checker separation of duties with HTTP 403 Forbidden on creator self-approval attempts.
* `GET/POST /api/workflow/definitions`: Configures multi-tier threshold rules, approver role hierarchies, and automated downstream triggers.
* `POST /api/workflow/trigger`: Universal cross-module workflow trigger with SHA-256 deduplication key `SHA-256(tenant_id + doc_id + event)` preventing duplicate workflows on network retries.
* `GET /api/workflow/instances`: Real-time stream of workflow execution instances with audit timeline logs.
* `POST /api/workflow/instances/{id}/retry`: Idempotent action retry for interrupted downstream steps.
* `GET /api/workflow/analytics`: Aggregates enterprise SLA metrics: Average Turnaround Time (1.8h TAT), SLA Adherence Rate (94.2%), Department distribution, and Bottleneck approvers.

### 20.2 Automated Verification Assertions (10/10 Stages - 100% Pass):
1. **API Authentication & Tenant Context**: Authenticates as `admin` on Organization `78fca6c8-eb92-41c4-96ec-ac2e150d56a4`.
2. **Direct Backend API Verification**:
   - Asserts HTTP 200 on `/inbox` (Total Tasks count).
   - Asserts HTTP 200 on `/definitions` (4 Configured Rule Templates).
   - Asserts HTTP 200 on `/instances` (Active/Historic Instances).
   - Asserts HTTP 200 on `/analytics` (Avg TAT: 1.8h, Adherence: 94.2%).
   - Asserts HTTP 200 on `/trigger` with SHA-256 deduplication key validation.
3. **Headless Chrome WebDriver Initialization**: Launches Chrome (1600x1050) with session auth injection.
4. **Counter Workbench Launchers & F4 Hotkey**:
   - Asserts `Approval Inbox` launcher card on Counter Workbench (`/`).
   - Asserts `Approvals Inbox [F4]` button in Urgent Counter Exceptions card.
   - Captures `verified_workflow_homescreen_launcher.png`.
5. **Keyboard F4 Hotkey Trigger**:
   - Sends `Keys.F4` to Counter Workbench body.
   - Asserts browser navigates cleanly to `/workflow/inbox`.
6. **Approval Inbox UI & Inspection Drawer**:
   - Asserts `DOC-32 WORKFLOW ENGINE` header badge.
   - Asserts actionable task rows (`task-row-*`).
   - Clicks row to open slide-over Inspection Drawer.
   - Asserts `Inspection Drawer` and `Transaction Value` attributes.
   - Captures `verified_workflow_inbox_drawer.png`.
7. **1-Click Approve Action (`[A]`)**:
   - Clicks `#drawer-btn-approve`.
   - Asserts task status advances cleanly and reloads queue.
8. **Reject Action with Mandatory Remarks Modal**:
   - Clicks `#drawer-btn-reject`.
   - Asserts `#reject-remarks-input` modal appears.
   - Inputs required explanation comment and clicks `#btn-confirm-reject`.
   - Asserts immutable audit log entry created.
   - Captures `verified_workflow_inbox_approved_rejected.png`.
9. **Visual No-Code Workflow Designer (`/workflow/designer`)**:
   - Navigates to `/workflow/designer`.
   - Asserts `Visual No-Code Workflow Designer` header.
   - Asserts `Multi-Tier Approval Hierarchy` builder.
   - Asserts `Interactive Sandbox Simulator`.
   - Enters `75000` into `#input-sim-amount` and verifies `Simulation Output:` routing evaluation.
   - Captures `verified_workflow_designer_simulator.png`.
10. **Real-Time Execution & SLA Monitor (`/workflow/monitor`)**:
    - Navigates to `/workflow/monitor`.
    - Asserts `Live Automation & SLA Execution Monitor` header.
    - Asserts `Average Turnaround (TAT)` (1.8 Hours) and `SLA Compliance Rate` (94.2%) KPI cards.
    - Asserts `SHA-256` idempotency deduplication key on execution stream.
    - Captures `verified_workflow_monitor_analytics.png`.

---

## 21. Master Selenium Testing Suite: Audit Trail, Data Governance & Compliance Control Engine (DOC-33)

The automated test suite `test_audit_governance_selenium.py` provides end-to-end regression verification of the DOC-33 Audit Trail, Data Governance & Compliance Control Engine, covering the Unified Audit Explorer (`/audit`), Change Detail Drawer with Before/After Diff & Seal Verification, Cryptographic Hash Chain Traversal, and the Data Governance Console (`/audit/governance`):

```powershell
cd C:\Users\DELL\OneDrive\Desktop\erp2
C:\Python313\python.exe test_audit_governance_selenium.py
```

### 21.1 Architecture & Endpoints Under Test
* **Append-Only & Tamper-Evident Storage**: Audit events are strictly immutable. Neither business users nor administrators can alter or delete logged records through UI or standard APIs.
* **Cryptographic Hash Chaining**: Every audit entry computes a deterministic SHA-256 digest linking back to the immediate predecessor:
  $$\text{event\_hash} = \text{SHA256}(\text{prev\_hash} + \text{tenant\_id} + \text{actor} + \text{event\_type} + \text{object\_type} + \text{object\_id} + \text{timestamp} + \text{before\_payload} + \text{after\_payload})$$
* **Sequential Chain Traversal (`POST /api/audit/verify-chain`)**: Traverses all sequential audit blocks chronologically, recalculating each SHA-256 hash against its predecessor. Mathematical proof confirms no deletions, insertions, or payload modifications.
* **Sensitive Data Redaction**: Automatic masking engine intercepts passwords, auth tokens, secret keys, bank account secrets, and credential hashes, outputting `[REDACTED_SENSITIVE]` in payload diff viewers.
* **Audit of Audit**: All governance operations—such as creating or releasing legal holds, modifying retention policies, or generating evidence packs—automatically write immutable audit events.
* **Statutory Retention Policies (`GET/POST /api/audit/retention/policies`)**: Implements MCA/GST 8-year statutory compliance (2,920 days) across financial ledgers, invoices, vouchers, and audit logs.
* **Litigation & Inquiry Legal Holds (`GET/POST /api/audit/legal-holds`, `POST /api/audit/legal-holds/{id}/release`)**: Freezes records subject to regulatory inquiry, overriding retention purges with mandatory release reason tracking.
* **Forensic Anomaly Detection (`GET /api/audit/anomalies`)**: Scans for high-velocity edits (>20/hour), repeated document cancellations (>3), after-hours activity (20:00–06:00), active hold conflicts, and cryptographic chain breaks.
* **Auditor Evidence Pack Generator (`POST /api/audit/evidence-pack`)**: Compiles filtered audit logs, policy profiles, and active holds into a cryptographically sealed JSON/CSV manifest signed with an SHA-256 root hash for statutory auditors.

### 21.2 Database Models
* `audit_events`: Stores `id`, `company_id`, `actor_id`, `actor_name`, `event_type`, `object_type`, `object_id`, `document_number`, `event_time`, `before_payload` (JSONB), `after_payload` (JSONB), `reason`, `correlation_id`, `prev_hash` (VARCHAR 64), `event_hash` (VARCHAR 64), and `is_verified` (BOOLEAN).
* `retention_policies`: Stores `id`, `company_id`, `object_type`, `retention_days` (default 2,920 days / 8 years), `legal_hold_allowed`, `effective_from`, and `created_at`.
* `legal_holds`: Stores `id`, `company_id`, `scope_type` (RECORD, MODULE, PARTY, ALL), `scope_id`, `scope_description`, `reason`, `created_by_id`, `released_at`, `release_reason`, and `created_at`.

### 21.3 Automated Verification Assertions (10/10 Stages - 100% Pass):
1. **API Authentication & Tenant Context**: Authenticates as `admin` on Organization `78fca6c8-eb92-41c4-96ec-ac2e150d56a4`.
2. **DOC-33 Backend API Verification**:
   - Asserts HTTP 200 on `GET /api/audit/events` (returns seeded events, total count, latest hash).
   - Asserts at least 5 cryptographically chained audit events present.
3. **Cryptographic Hash Chain Validation API**:
   - Asserts HTTP 200 on `POST /api/audit/verify-chain`.
   - Asserts `is_valid == true` with 100% sequential chain integrity certified.
4. **Field-by-Field Diff API & Sensitive Data Masking**:
   - Asserts HTTP 200 on `GET /api/audit/diff/{event_id}`.
   - Asserts `is_hash_intact == true` (recomputed SHA-256 matches stored event hash).
   - Asserts field diff entries with before/after state comparison.
5. **Headless Chrome WebDriver Initialization**: Launches Chrome (1440x950) with session auth token injection into `localStorage` and `sessionStorage`.
6. **Counter Workbench Launcher Verification**:
   - Asserts `Audit Trail` launcher tile (`#hub-btn-audit-trail`) on Operational Counter Workbench (`/`).
   - Asserts `Audit Trail ↗` action button in Urgent Counter Exceptions card.
   - Captures `verified_audit_homescreen_launcher.png`.
7. **Unified Audit Explorer UI (`/audit`)**:
   - Clicks launcher tile to navigate to `/audit`.
   - Asserts `#input-audit-search` fuzzy filter input.
   - Asserts `#stat-total-events` metric and `#stat-chain-status` badge (`SEAL INTACT`).
   - Captures `verified_audit_explorer_table.png`.
8. **Change Detail Drawer & SHA-256 Seal Validation**:
   - Clicks first audit row (`audit-row-*`) to open slide-over Change Detail Drawer.
   - Asserts `#drawer-change-detail` presence.
   - Asserts `#badge-hash-intact` displays `✓ SEAL VALID (SHA-256)`.
   - Asserts before/after field diff table and sensitive data masking.
   - Captures `verified_audit_diff_drawer_seal.png`.
   - Closes drawer via `#btn-close-drawer`.
9. **Interactive Hash Chain Verification Action**:
   - Clicks `#btn-verify-chain` on Audit Explorer toolbar.
   - Asserts `#banner-verification-result` confirms `Cryptographic Chain Integrity Confirmed (100% Valid)`.
10. **Data Governance Console (`/audit/governance`)**:
    - Navigates to `/audit/governance`.
    - Tab 1: Asserts Retention Policies table (`#tab-btn-policies`) with statutory MCA/GST 8-year rules (2,920 days).
    - Tab 2: Clicks `#tab-btn-holds`, asserts active statutory Legal Holds and `#btn-apply-hold` action.
    - Captures `verified_audit_governance_console_holds.png`.
    - Tab 3: Clicks `#tab-btn-anomalies`, asserts forensic anomaly detection cards (`#card-anomaly-CHAIN_INTEGRITY`, `MASS_EDITS`, `REPEATED_REVERSALS`, `AFTER_HOURS`).
    - Tab 4: Clicks `#tab-btn-export`, triggers `#btn-console-generate-evidence`.
    - Asserts `#export-result-box` confirms evidence pack generation sealed with cryptographic root hash.
---

## 22. Cargo & Consignment Management Engine (DOC-34)

### 22.1 Technical Architecture & Data Topology
The Cargo & Consignment Management Engine operates as a decoupled logistics sub-system. It segregates physical dispatch packaging and multi-leg carrier movements from sales invoicing and document generation.

#### Database Entities (PostgreSQL via SQLAlchemy):
* `consignments`:
  - `id`: UUID (Primary Key)
  - `company_id`: UUID (Foreign Key to `organizations.id`)
  - `consignment_number`: VARCHAR(50) (Unique, formatted as `CN-YYYY-XXXX`)
  - `document_number`: VARCHAR(100) (Optional linkage to Invoice, Challan, or Transfer)
  - `transporter_name`: VARCHAR(200)
  - `vehicle_no`: VARCHAR(50)
  - `driver_name`, `driver_phone`: VARCHAR(100)
  - `origin_hub`, `destination_hub`: VARCHAR(200)
  - `lr_no`: VARCHAR(100) (Lorry Receipt / Docket / Bilty number)
  - `status`: VARCHAR(50) (`PLANNED`, `READY_FOR_LOADING`, `LOADING`, `DISPATCHED`, `IN_TRANSIT`, `DELIVERED`, `EXCEPTION`, `CLOSED`)
  - `dispatch_at`, `delivered_at`: TIMESTAMP WITH TIME ZONE
  - `is_admin_funded`: BOOLEAN (True if central Platform Admin finances freight)
  - `notes`: TEXT
  - `created_at`, `updated_at`: TIMESTAMP WITH TIME ZONE

* `cargo_packages`:
  - `id`: UUID (Primary Key)
  - `consignment_id`: UUID (Foreign Key to `consignments.id` ondelete CASCADE)
  - `package_type`: VARCHAR(50) (`Carton`, `Box`, `Pallet`, `Drum`, `Bag`, `Crate`)
  - `barcode`: VARCHAR(100) (Unique, formatted as `PKG-YYYY-XXXX-NN`)
  - `gross_weight`, `tare_weight`, `net_weight`: NUMERIC(12, 3) (in kg)
  - `length_cm`, `width_cm`, `height_cm`: NUMERIC(10, 2) (in cm)
  - `cbm`: NUMERIC(12, 6) (Calculated as $(L \times W \times H) / 1,000,000$)
  - `is_fragile`: BOOLEAN
  - `status`: VARCHAR(50) (`INTACT`, `DAMAGED`, `SHORT`, `LOST`)

* `cargo_costs`:
  - `id`: UUID (Primary Key)
  - `consignment_id`: UUID (Foreign Key to `consignments.id` ondelete CASCADE)
  - `beneficiary_company_id`: UUID (Client Company whose goods moved)
  - `cost_bearer_company_id`: UUID (Platform Admin Company or Client)
  - `cost_type`: VARCHAR(50) (`FREIGHT`, `LOADING`, `TOLL`, `DRAYAGE`, `HANDLING`, `INSURANCE`)
  - `gross_cost`: NUMERIC(14, 2)
  - `recovery_amount`: NUMERIC(14, 2)
  - `net_bearer_cost`: NUMERIC(14, 2) ($=\text{gross\_cost} - \text{recovery\_amount}$)
  - `is_admin_borne`: BOOLEAN
  - `is_recoverable`: BOOLEAN
  - `recovery_status`: VARCHAR(50) (`UNBILLED`, `BILLED`, `WAIVED`)

* `pod_records`:
  - `id`: UUID (Primary Key)
  - `consignment_id`: UUID (Foreign Key to `consignments.id` ondelete CASCADE)
  - `received_by`: VARCHAR(200)
  - `received_at`: TIMESTAMP WITH TIME ZONE
  - `accepted_qty`, `short_qty`, `damage_qty`: NUMERIC(10, 2)
  - `signature_token`: VARCHAR(255)
  - `remarks`: TEXT
  - `status`: VARCHAR(50) (`ACCEPTED`, `DISCREPANCY`, `REJECTED`)

---

### 22.2 Admin-Funded Client Cargo Accounting Separation
Under DOC-34, when `is_admin_funded` is true:
1. **Client General Ledger Immunity**: The Client Company General Ledger (DOC-08) is untouched and has zero automated debits.
2. **Platform Admin Expense Booking**: Central logistics costs are recognized in Admin Company GL under Account 5200 (Freight & Logistics Expense).
3. **Cross-Tenant MIS Toggle**: Admin executives can toggle `is_admin_funded` cross-client reporting in `CargoCostCenter.tsx` (`GET /api/cargo/costs?combined=true`) to view aggregate expenditure while preserving multi-tenant isolation.

---

### 22.3 Automated Selenium Verification (10/10 Stages - 100% Pass)
* **Stage 1**: Authenticate via backend API (admin / Admin@123), extract JWT, inject local storage.
* **Stage 2**: Assert `GET /api/cargo/summary` KPI payload (`total_consignments=5`, `in_transit=2`, `total_cbm=1.32`, `admin_borne_cost=₹11.8k`).
* **Stage 3**: Assert `GET /api/cargo/consignments` multi-tenant query, verifying 5 seeded shipments.
* **Stage 4**: Verify volumetric CBM calculation for package `PKG-2026-0045-01`: $(40 \times 35 \times 25)/1,000,000 = 0.035\text{ m}^3$.
* **Stage 5**: Launch Selenium Headless Chrome (1440x950).
* **Stage 6**: Assert Counter Workbench launcher tile (`#hub-btn-cargo-management`), capture `verified_cargo_homescreen_launcher.png`.
* **Stage 7**: Navigate to `/cargo`, assert Top KPI cards, search input, status filters, capture `verified_cargo_board_kanban.png`.
* **Stage 8**: Open Slide-Over Detail Drawer, verify package hierarchy, CBM, and status advance button, capture `verified_cargo_consignment_drawer.png`.
* **Stage 9**: Navigate to `/cargo/costs`, assert Admin-borne bifurcation, toggle combined multi-client reporting, export CSV manifest, capture `verified_cargo_cost_allocation_center.png`.
* **Stage 10**: Navigate to `/cargo/pod-exceptions`, assert Pending Deliveries tab and Active Transit Exceptions tab, capture `verified_cargo_pod_exception_desk.png`.

---

## 23. Customer Receipt & Supplier Payment Voucher Architecture (DOC-24 & DOC-07)

### 23.1 Component Architecture & Unified Routing
The ERP unifies customer receipts (inward cash/bank collections) and supplier payments (outward disbursements) into a single, high-performance transactional workbench located at `src/pages/finance/ReceiptPaymentVoucher.tsx`.

#### Route Bindings:
- `/receipt` and `/finance/receipt`: Automatically binds the component to Customer Receipt mode (`isPayment = false`).
- `/payment` and `/finance/payment`: Automatically binds the component to Supplier Payment mode (`isPayment = true`).

```typescript
export default function ReceiptPaymentVoucher({ type: propType }: { type?: 'receipt' | 'payment' }) {
  const location = useLocation();
  const navigate = useNavigate();

  // Unified Mode Resolution
  const isPayment = propType === 'payment' || location.pathname.includes('/payment');
  const voucherType: 'Receipt' | 'Payment' = isPayment ? 'Payment' : 'Receipt';
  const primaryColor = isPayment ? '#b45309' : '#1b4332';
  const badgeBg = isPayment ? '#fef3c7' : '#ecfdf5';
  const badgeColor = isPayment ? '#92400e' : '#065f46';
```

### 23.2 Series Continuation & Local Storage Persistence
The workbench implements independent sequence series for receipts and payments:
- **Receipts**: Storage key `lastReceiptVoucherNo`, default initial sequence `RCP-0001`.
- **Payments**: Storage key `lastPaymentVoucherNo`, default initial sequence `PMT-0001`.
- **Custom Series Support**: If a user customizes a series (e.g. `RJ-RCP-8001`), the series continuation algorithm (`incrementSeries`) parses the prefix and sequential digits, stores the updated value in `localStorage`, and auto-increments it for subsequent vouchers.

### 23.3 Real-Time Settlement Telemetry Strip
Positioned directly above the allocation table, the telemetry strip computes mathematical allocations in real time:
1. **Total Voucher Amount (`#transaction-amount-input`)**: The gross remittance or receipt sum entered by the cashier.
2. **Allocated to Invoices**: Sum of all per-row allocated amounts ($\sum \text{allocate\_amount}$).
3. **Floating Advance / Credit**: Excess unallocated balance ($=\max(0, \text{Gross Amount} - \text{Total Allocated})$) automatically earmarked as an on-account credit or advance payment for future billing.

### 23.4 Bill-by-Bill Allocation Engine (DOC-07)
When a party is selected, `apiGetPendingAllocations()` queries open invoices, debit notes, and credit notes:
- **FIFO Auto-Allocation (`[Alt+A]` / `#fifo-allocate-btn`)**: Walks open documents chronologically from oldest to newest, fully exhausting earlier dues before advancing to later invoices.
- **Manual Per-Row Allocation (`#allocate-input-${row.id}`)**: Allows cashiers to key in exact partial settlement amounts against specific invoices.
- **Quick "Full" Pay Action (`#btn-full-pay-${row.id}`)**: 1-click shortcut populating the full outstanding bill balance into the allocation cell.
- **Days Overdue Badge**: Color-coded badges highlighting delinquent invoices (`#b91c1c` for >60 days, `#b45309` for 30-60 days, `#1b4332` for current).

### 23.5 Keyboard Navigation Registry for Receipt & Payment Voucher
| Hotkey | Target Selector / Function | Description |
| :--- | :--- | :--- |
| `[Esc]` | Global Navigation | Cancels active modal (Party picker or Confirmation); if no modal is open, returns to Counter Workbench (`/`). |
| `[F5]` | Mode Switch | Switches immediately to Supplier Payment Voucher (`/payment`). |
| `[F6]` | Mode Switch | Switches immediately to Customer Receipt Voucher (`/receipt`). |
| `[F7]` | `#party-select-btn` | Opens Party / Chemist / Supplier search modal with auto-focused search input (`#party-search-input`). |
| `[Alt+A]` | `#fifo-allocate-btn` | Executes chronological FIFO auto-allocation across open bills. |
| `[Ctrl+S]` | `#save-voucher-btn` | Validates transaction and opens posting confirmation dialog (`#modal-confirm-voucher`). |
| `[Enter]` | Confirmation Modal | Commits voucher posting, invokes `apiCreateReceiptPayment()`, advances sequence series. |

---

## 24. Audit Trail & Data Governance Architecture (DOC-33)

### 24.1 Tamper-Evident SHA-256 Chained Event Stream
DOC-33 guarantees unalterable financial provenance compliant with MCA Rule 11(g) and US FDA 21 CFR Part 11:
- Every operational action (`CREATE`, `UPDATE`, `CANCEL`, `POST`, `APPROVE`, `LEGAL_HOLD_APPLIED`) creates an immutable audit block.
- **Sequential Cryptographic Seal**:
  $$\text{event\_hash}_n = \text{SHA-256}(\text{prev\_hash}_{n-1} + \text{event\_time} + \text{actor\_id} + \text{payload\_json} + \text{salt})$$
- Breaking any historical record invalidates all subsequent terminal hashes, making database tampering immediately detectable.

### 24.2 Audit Trail Explorer (`src/pages/audit/AuditExplorer.tsx`)
1. **Executive KPI Strip**:
   - `Total Audited Events`: Total sequential ledger blocks.
   - `Chain Integrity`: Displays real-time cryptographic seal status (100% Intact).
   - `Active Legal Holds`: Active statutory preservation orders.
   - `Terminal Event Hash`: Real-time display of the latest SHA-256 block hash.
2. **Interactive SHA-256 Hash Chain Verification (`#btn-verify-chain`)**:
   - Invokes `apiVerifyAuditChain()`.
   - Traces the entire chain from Genesis block (`00000000...`) to Terminal hash.
   - Renders green verification seal banner (`#banner-verification-result`).
3. **Field-by-Field Diff Slide-Over Drawer (`#drawer-change-detail`)**:
   - Triggered via `#btn-inspect-${ev.id}`.
   - Compares before and after states for every modified field.
   - Highlights changes with color-coded status badges (`MODIFIED`, `NEW`, `UNCHANGED`).
   - Automatically redacts sensitive credentials and passwords.
4. **Auditor Evidence Pack Generator (`#btn-export-pack` / `[E]`)**:
   - Opens `#modal-export-evidence`.
   - Prompts for statutory audit purpose and regulatory citation.
   - Generates digitally sealed evidence manifest with export audit block.

### 24.3 Data Governance & Regulatory Compliance Console (`GovernanceConsole.tsx`)
1. **Statutory Retention Policies (`#tab-btn-policies`)**:
   - Displays mandatory 8-year schedules (2,920 days) under Indian Companies Act 2013 (Section 128) and CGST Act 2017.
   - Click `#btn-edit-policy-${object_type}` to adjust duration with `#btn-save-policy`.
2. **Litigation & Inquiry Legal Holds (`#tab-btn-holds`)**:
   - Establishes binding preservation holds freezing document disposal.
   - Click `#btn-apply-hold` to open `#modal-apply-hold`, select scope (`MODULE`, `RECORD`, `PARTY`, `ALL`), enter citation and commit (`#btn-confirm-apply-hold`).
   - Click `#btn-release-hold-${id}` to open `#modal-release-hold`, enter mandatory release justification, and commit (`#btn-confirm-release-hold`).
3. **Automated Forensic Anomaly Signals (`#tab-btn-anomalies`)**:
   - Heuristic evaluation cards: `#card-anomaly-CHAIN_INTEGRITY`, `#card-anomaly-MASS_EDITS`, `#card-anomaly-REPEATED_REVERSALS`, `#card-anomaly-AFTER_HOURS`.
4. **Defensive API Array Guards**:
   - All state setters implement defensive array checks (`Array.isArray(res) ? res : fallback`) preventing runtime crashes during partial network responses.

---

## 25. Universal Escape Navigation & Workflows Header Integration

### 25.1 Header Workflows Dropdown Menu
The application header integrates a dedicated Workflows & Logistics dropdown menu accessible via mouse click or hotkey `[F4]`:
- **Parent Button (`#parent-menu-btn-workflows`)**: Toggles the dropdown menu.
- **Workflow Inbox (`#workflow-item-inbox`)**: Navigates to `/workflow/inbox`.
- **Workflow Designer (`#workflow-item-designer`)**: Navigates to `/workflow/designer`.
- **Workflow Monitor (`#workflow-item-monitor`)**: Navigates to `/workflow/monitor`.
- **Cargo & Consignment Board (`#workflow-item-cargo`)**: Navigates directly to `/cargo`.
- **Cargo Cost Allocation (`#workflow-item-cargo-costs`)**: Navigates directly to `/cargo/costs`.
- **POD & Exceptions Desk (`#workflow-item-cargo-pod-exceptions`)**: Navigates directly to `/cargo/pod-exceptions`.

### 25.2 Workflow Inbox Quick Operational Launcher
In `src/pages/workflow/WorkflowInbox.tsx`, an operational quick launcher tile is prominently embedded:
- **Button Selector (`#hub-btn-cargo-management`)**: Features freight icon, title "Cargo & Consignments", and description "DOC-34 Freight & Carrier Tracking Desk".
- Click navigates directly to `/cargo`.

### 25.3 Universal Escape Key (`[Esc]`) Lifecycle Architecture
To prevent accidental application exit and guarantee predictable keyboard navigation, the `Esc` key implements a hierarchical lifecycle:
1. **Level 1 — Modal & Drawer Cancellation**:
   If any modal dialog, batch selection popup, party search modal, or slide-over drawer is open on screen, pressing `Esc` dismisses that overlay exclusively. Focus returns to the parent form.
2. **Level 2 — Return to Counter Workbench**:
   If no modal or drawer is active on a secondary screen (e.g. `/sales`, `/purchase`, `/receipt`, `/payment`, `/cargo`, `/workflow/inbox`), pressing `Esc` safely routes the user back to the primary Counter Workbench (`/`).
3. **Level 3 — Exit Application Modal (HomeScreen `/`)**:
   When pressed on the root Counter Workbench (`HomeScreen.tsx`), `Esc` triggers the luxury confirmation modal (`#modal-exit-application`):
   - Pressing `Esc` again dismisses the modal.
   - Pressing `Enter` (`#btn-confirm-exit`) confirms session termination and executes graceful logout.

---

## 26. Complete Screen-by-Screen UI Element & Selector Catalog

The following master catalog documents every functional UI selector across the ERP to ensure 100% testability and zero ambiguity for developers:

| Module / Screen | Route | Key Selector / ID | Element Type | Function & Behavior |
| :--- | :--- | :--- | :--- | :--- |
| **Counter Workbench** | `/` | `#btn-exit-app` | Button | Triggers Exit Application modal `[Esc]`. |
| **Counter Workbench** | `/` | `#modal-exit-application` | Modal | Confirmation modal to exit application. |
| **Counter Workbench** | `/` | `#btn-confirm-exit` | Button | Confirms session termination and log out. |
| **Counter Workbench** | `/` | `#hub-btn-cargo-management` | Button | Quick launcher navigating to `/cargo`. |
| **Counter Workbench** | `/` | `#btn-goto-executive-dashboard` | Button | Apex navigation button to `/dashboard`. |
| **Header Navigation** | Global | `#parent-menu-btn-workflows` | Button | Toggles Workflows & Cargo dropdown menu `[F4]`. |
| **Header Navigation** | Global | `#workflow-item-cargo` | Menu Item | Navigates to `/cargo`. |
| **Header Navigation** | Global | `#workflow-item-cargo-costs` | Menu Item | Navigates to `/cargo/costs`. |
| **Header Navigation** | Global | `#workflow-item-cargo-pod-exceptions`| Menu Item | Navigates to `/cargo/pod-exceptions`. |
| **Receipt Voucher** | `/receipt` | `#btn-switch-voucher-mode` | Button | Switches between Receipt and Payment `[F5]/[F6]`. |
| **Receipt Voucher** | `/receipt` | `#party-select-btn` | Button | Opens Party lookup modal `[F7]`. |
| **Receipt Voucher** | `/receipt` | `#party-search-input` | Input | Instant filter input for parties in modal. |
| **Receipt Voucher** | `/receipt` | `#voucher-number-input` | Input | Voucher sequence series input with continuation. |
| **Receipt Voucher** | `/receipt` | `#voucher-date-input` | Input | Posting date input. |
| **Receipt Voucher** | `/receipt` | `#transaction-amount-input` | Input | Gross transaction amount input. |
| **Receipt Voucher** | `/receipt` | `#fifo-allocate-btn` | Button | Executes FIFO auto-allocation across bills `[Alt+A]`. |
| **Receipt Voucher** | `/receipt` | `#allocate-input-${id}` | Input | Per-row manual allocation cell. |
| **Receipt Voucher** | `/receipt` | `#save-voucher-btn` | Button | Posts voucher to GL `[Ctrl+S]`. |
| **Receipt Voucher** | `/receipt` | `#btn-back-to-counter` | Button | Exits voucher entry back to Counter `[Esc]`. |
| **Audit Explorer** | `/audit` | `#btn-verify-chain` | Button | Traverses sequential SHA-256 hash blocks. |
| **Audit Explorer** | `/audit` | `#banner-verification-result` | Banner | Cryptographic hash seal confirmation banner. |
| **Audit Explorer** | `/audit` | `#input-audit-search` | Input | Filter input across all audit events `[Ctrl+F]`. |
| **Audit Explorer** | `/audit` | `#btn-inspect-${id}` | Button | Opens slide-over field diff comparison drawer. |
| **Audit Explorer** | `/audit` | `#drawer-change-detail` | Drawer | Slide-over inspector showing before/after state. |
| **Audit Explorer** | `/audit` | `#btn-export-pack` | Button | Opens auditor evidence pack export modal `[E]`. |
| **Audit Explorer** | `/audit` | `#btn-nav-governance` | Button | Navigates to `/audit/governance`. |
| **Audit Explorer** | `/audit` | `#btn-back-to-counter` | Button | Exits audit explorer to Counter `[Esc]`. |
| **Governance Console** | `/audit/governance` | `#tab-btn-policies` | Tab | Activates Statutory Retention Policies view. |
| **Governance Console** | `/audit/governance` | `#tab-btn-holds` | Tab | Activates Litigation Legal Holds view. |
| **Governance Console** | `/audit/governance` | `#tab-btn-anomalies` | Tab | Activates Forensic Anomaly Signals view. |
| **Governance Console** | `/audit/governance` | `#tab-btn-export` | Tab | Activates Auditor Evidence Pack view. |
| **Governance Console** | `/audit/governance` | `#btn-apply-hold` | Button | Opens Establish Statutory Legal Hold modal. |
| **Governance Console** | `/audit/governance` | `#modal-apply-hold` | Modal | Modal form to establish binding legal hold. |
| **Governance Console** | `/audit/governance` | `#btn-confirm-apply-hold` | Button | Commits legal hold to database and audit log. |
| **Governance Console** | `/audit/governance` | `#btn-release-hold-${id}` | Button | Opens Release Legal Hold modal. |
| **Governance Console** | `/audit/governance` | `#modal-release-hold` | Modal | Modal form to release legal hold with reason. |
| **Governance Console** | `/audit/governance` | `#btn-confirm-release-hold` | Button | Commits legal hold release to audit log. |
| **Governance Console** | `/audit/governance` | `#btn-console-generate-evidence`| Button | Generates sealed compliance pack with root hash. |
| **Governance Console** | `/audit/governance` | `#btn-back-to-audit` | Button | Returns to Audit Explorer `[Esc]`. |
| **Cargo Board** | `/cargo` | `#input-cargo-search` | Input | Search by consignment number, LR, or carrier. |
| **Cargo Board** | `/cargo` | `#btn-register-consignment` | Button | Opens New Consignment registration modal `[F6]`. |
| **Cargo Board** | `/cargo` | `#drawer-consignment-detail` | Drawer | Slide-over drawer showing CBM, packages, costs. |
| **Cargo Board** | `/cargo` | `#btn-back-to-counter` | Button | Returns to Counter Workbench `[Esc]`. |
| **Cargo Costs** | `/cargo/costs` | `#toggle-combined-reporting` | Toggle | Switches between single-client & combined MIS. |
| **Cargo Costs** | `/cargo/costs` | `#btn-export-cost-report` | Button | Exports freight allocation manifest to CSV. |
| **Cargo POD Desk** | `/cargo/pod-exceptions` | `#tab-pending-pods` | Tab | Lists shipments awaiting delivery sign-off. |
| **Cargo POD Desk** | `/cargo/pod-exceptions` | `#tab-exceptions` | Tab | Lists active transit damage and shortage claims. |
| **Counter Workbench** | `/` | `#hub-btn-freight-management` | Button | Quick launcher navigating to Freight & Rates Master `[Ctrl+2]`. |
| **Freight Rate Master** | `/freight/contracts` | `#kpi-active-contracts` | Card | Displays total active transporter rate contracts with tiered slabs. |
| **Freight Rate Master** | `/freight/contracts` | `#kpi-freight-spend` | Card | Displays gross Platform Admin freight spend. |
| **Freight Rate Master** | `/freight/contracts` | `#kpi-total-recoveries` | Card | Displays total customer/principal recoveries. |
| **Freight Rate Master** | `/freight/contracts` | `#kpi-logistics-margin` | Card | Displays net logistics margin (recoveries - costs). |
| **Freight Rate Master** | `/freight/contracts` | `#btn-switch-tab-sandbox` | Tab | Toggles interactive deterministic calculation sandbox `[F4]`. |
| **Freight Rate Master** | `/freight/contracts` | `#sandbox-origin-pincode` | Input | Origin pincode for deterministic lane resolution. |
| **Freight Rate Master** | `/freight/contracts` | `#sandbox-dest-pincode` | Input | Destination pincode for deterministic lane resolution. |
| **Freight Rate Master** | `/freight/contracts` | `#sandbox-weight-input` | Input | Parameter input for test gross weight in kg. |
| **Freight Rate Master** | `/freight/contracts` | `#sandbox-declared-value`| Input | Declared consignment invoice value for risk surcharges. |
| **Freight Rate Master** | `/freight/contracts` | `#btn-execute-calc` | Button | Executes deterministic rate resolution engine `[Enter]`. |
| **Freight Rate Master** | `/freight/contracts` | `#card-calc-result` | Card | Renders gross freight cost, formula trace, and cost bearer. |
| **Freight Rate Master** | `/freight/contracts` | `#sandbox-total-freight` | Output | Displays calculated total freight cost. |
| **Freight Rate Master** | `/freight/contracts` | `#sandbox-gl-account` | Badge | Shows bound General Ledger account (Account 5200). |
| **Freight Rate Master** | `/freight/contracts` | `#btn-new-contract` | Button | Opens modal to register new freight contract `[F6]`. |
| **Freight Rate Master** | `/freight/contracts` | `#modal-new-contract` | Modal | Form to create contract with lanes and rate rules `[Esc]`. |
| **Reconciliation Desk** | `/freight/reconciliation` | `#kpi-total-recons` | Card | Displays total transporter statement count. |
| **Reconciliation Desk** | `/freight/reconciliation` | `#kpi-recons-matched` | Card | Displays exact match statements (0 variance). |
| **Reconciliation Desk** | `/freight/reconciliation` | `#kpi-recons-tolerable` | Card | Displays statements within ₹200 tolerable variance. |
| **Reconciliation Desk** | `/freight/reconciliation` | `#kpi-recons-disputed` | Card | Displays statements with unapproved excess charges. |
| **Reconciliation Desk** | `/freight/reconciliation` | `#btn-enter-transporter-bill` | Button | Opens modal to enter manual transporter invoice `[F6]`. |
| **Reconciliation Desk** | `/freight/reconciliation` | `#modal-enter-transporter-bill` | Modal | Form to record transporter bill for three-way audit `[Esc]`. |
| **Reconciliation Desk** | `/freight/reconciliation` | `#btn-approve-bill` | Button | Approves carrier invoice within tolerable variance. |
| **Reconciliation Desk** | `/freight/reconciliation` | `#btn-dispute-bill` | Button | Flags carrier invoice into DISPUTED status. |
| **Reconciliation Desk** | `/freight/reconciliation` | `#btn-post-gl` | Button | Posts approved freight cost to GL Account 5200. |
| **Counter Workbench** | `/` | `#hub-btn-principal-management` | Button | Quick launcher navigating to Principal Control Center `[Ctrl+3]`. |
| **Principal Control Center** | `/principal` | `#kpi-active-principals` | Card | Displays active contract-validated principals. |
| **Principal Control Center** | `/principal` | `#kpi-total-stock-val` | Card | Displays custody stock valuation held across depots. |
| **Principal Control Center** | `/principal` | `#kpi-pending-claims` | Card | Displays open expiry and breakage claims awaiting action. |
| **Principal Control Center** | `/principal` | `#kpi-reconciled-health` | Card | Displays approved reconciliations count. |
| **Principal Control Center** | `/principal` | `#kpi-freight-attribution` | Card | Displays Admin-funded freight subsidies under GL 5200. |
| **Principal Control Center** | `/principal` | `#tab-btn-stock` | Tab | Opens Stock Ownership & Custody Matrix `[F2]`. |
| **Principal Control Center** | `/principal` | `#tab-btn-claims` | Tab | Opens Claims & Returns Desk `[F3]`. |
| **Principal Control Center** | `/principal` | `#tab-btn-recon` | Tab | Opens 3-Way Reconciliation Workspace `[F4]`. |
| **Principal Control Center** | `/principal` | `#tab-btn-statement` | Tab | Opens Authoritative Business Statement `[F5]`. |
| **Principal Control Center** | `/principal` | `#tab-btn-mis` | Tab | Opens Commercial MIS & Operational Profitability `[F6]`. |
| **Principal Control Center** | `/principal` | `#btn-open-claim-modal` | Button | Opens modal to raise operational claim `[F7]`. |
| **Principal Control Center** | `/principal` | `#modal-new-claim` | Modal | Form to submit claim with batch provenance `[Esc]`. |
| **Principal Control Center** | `/principal` | `#btn-run-reconciliation` | Button | Executes automated 3-way matching engine against external statements. |
| **Principal Statement Desk** | `/principal/statement` | `#select-statement-principal` | Dropdown | Selects active principal for period drill-down. |
| **Principal Statement Desk** | `/principal/statement` | `#table-statement-lines` | Grid | Renders reconstructed transaction lines across Inward, Sales, Returns, Claims, Freight. |
| **Commission Control Center** | `/commission` | `#kpi-earned-commission` | Card | Displays earned turnover commission across client accounts. |
| **Commission Control Center** | `/commission` | `#kpi-recoverable-expenses` | Card | Displays recoverable depot operating costs. |
| **Commission Control Center** | `/commission` | `#kpi-approved-claims` | Card | Displays approved recovery claims value. |
| **Commission Control Center** | `/commission` | `#tab-btn-agreements` | Tab `[F2]` | Opens 4-pillar commercial deal terms and rate cards. |
| **Commission Control Center** | `/commission` | `#tab-btn-sandbox` | Tab `[F3]` | Opens deterministic calculation sandbox with formula trace. |
| **Commission Control Center** | `/commission` | `#tab-btn-claims` | Tab `[F4]` | Opens recovery claims desk & dual-post action. |
| **Commission Control Center** | `/commission` | `#tab-btn-client-billing` | Tab `[F5]` | Opens Client Management C&F Commission & Expense Billing Desk. |
| **Commission Control Center** | `/commission` | `#client-billing-org-select` | Select | Dropdown to choose client organization from Client Management. |
| **Commission Control Center** | `/commission` | `#btn-autofetch-client-telemetry` | Button | 1-Click Auto-Fetch pulling live sales turnover and depot expenses. |
| **Commission Control Center** | `/commission` | `#input-billing-turnover` | Input | Client sales turnover base amount. |
| **Commission Control Center** | `/commission` | `#input-billing-comm-rate` | Input | Commission percentage rate applied to turnover. |
| **Commission Control Center** | `/commission` | `#input-billing-comm-amount` | Input | Calculated commission amount with manual override support. |
| **Commission Control Center** | `/commission` | `#input-billing-rent` | Input | Godown storage rent reimbursement amount. |
| **Commission Control Center** | `/commission` | `#input-billing-salary` | Input | Depot dedicated staff salaries reimbursement amount. |
| **Commission Control Center** | `/commission` | `#input-billing-freight` | Input | Freight and transport charges reimbursement amount. |
| **Commission Control Center** | `/commission` | `#input-billing-handling` | Input | Cargo loading/unloading and handling charges. |
| **Commission Control Center** | `/commission` | `#input-billing-other` | Input | Miscellaneous ancillary operating expenses. |
| **Commission Control Center** | `/commission` | `#select-billing-tax-rate` | Select | GST rate selector (18%, 12%, 5%, 0% - SAC 998599). |
| **Commission Control Center** | `/commission` | `#check-dual-post-purchase` | Checkbox | Checkbox to dual-post directly into Client Inward Purchase Register. |
| **Commission Control Center** | `/commission` | `#btn-generate-client-bill` | Button | Submits bill generation, creating outward and inward bills. |
| **Commission Control Center** | `/commission` | `#generated-bill-success-card` | Banner | Displays outward bill number (`CF-BILL-`), inward number (`PUR-CF-`), and claim. |
| **Commission Control Center** | `/commission` | `#btn-goto-outward-billing` | Button `[F7]` | Jump to Billing Desk to inspect generated Outward Bill. |
| **Commission Control Center** | `/commission` | `#btn-goto-inward-purchase` | Button `[F9]` | Jump to Purchase Register to inspect dual-posted Inward Bill. |
| **Admin Multi-Client Radar** | `/admin/tracking` | `#select-tracking-scope` | Select | Toggles between Consolidated multi-client view and single-client isolation. |
| **Admin Multi-Client Radar** | `/admin/tracking` | `#card-tracking-sales` | Card | Displays gross sales turnover across clients. |
| **Admin Multi-Client Radar** | `/admin/tracking` | `#card-tracking-expenses` | Card | Displays operating expenses & C&F costs across clients. |
| **Admin Multi-Client Radar** | `/admin/tracking` | `#card-tracking-cargo` | Card | Displays cargo consignments pipeline with in-transit pulse. |
| **Admin Multi-Client Radar** | `/admin/tracking` | `#card-tracking-clients` | Card | Displays total active client organizations and mapped product brands. |
| **Admin Multi-Client Radar** | `/admin/tracking` | `#tab-btn-scorecards` | Tab `[F2]` | Comparative client operational scorecards matrix table with 1-click drilldown. |
| **Admin Multi-Client Radar** | `/admin/tracking` | `#tab-btn-sales` | Tab `[F3]` | Multi-client sales invoice register with client attribution. |
| **Admin Multi-Client Radar** | `/admin/tracking` | `#tab-btn-expenses` | Tab `[F4]` | Multi-client operational expense claims with status badges. |
| **Admin Multi-Client Radar** | `/admin/tracking` | `#tab-btn-cargo` | Tab `[F6]` | Active logistics consignments pipeline board. |
| **Client Management** | `/clients` | `#btn-open-company-mapping` | Button | Opens Authorized Product Companies assignment modal for selected client. |
| **Client Management** | `/clients` | `#modal-company-mapping` | Modal | Modal form to map product brands and configure commission override %. |
| **Client Management** | `/clients` | `#btn-save-company-mapping` | Button | Commits client-manufacturer mapping rules to database. |
| **Product Company Master** | `/master/companies` | `#kpi-total-companies` | Card | Total registered pharmaceutical manufacturers. |
| **Product Company Master** | `/master/companies` | `#kpi-total-turnover` | Card | Gross invoice turnover aggregated by manufacturer. |
| **Product Company Master** | `/master/companies` | `#tbl-company-catalog` | Table | Manufacturer directory with ledger linkages and top product metrics. |
| **Pharma Expiry Cockpit** | `/inventory-dashboard` | `#card-main-stock` | Card | Real-time Main Saleable Stock Value (`Batch.current_stock`) and healthy units. |
| **Pharma Expiry Cockpit** | `/inventory-dashboard` | `#card-quarantine-stock` | Card | Quarantined / Brk-Exp Stock Value (`Batch.brk_exp_stock`) and segregated units. |
| **Pharma Expiry Cockpit** | `/inventory-dashboard` | `#card-near-expiry-risk` | Card | 90-Day Near-Expiry Surveillance Value across 4 critical risk buckets. |
| **Pharma Expiry Cockpit** | `/inventory-dashboard` | `#card-claim-exposure` | Card | Principal Claims & Debit Note recovery exposure. |
| **Pharma Expiry Cockpit** | `/inventory-dashboard` | `#tab-btn-radar` | Tab `[F2]` | Real-time batch surveillance table with days to expiry. |
| **Pharma Expiry Cockpit** | `/inventory-dashboard` | `#filter-bucket-ALL` | Button | Filters all critical batches within 90-day window. |
| **Pharma Expiry Cockpit** | `/inventory-dashboard` | `#filter-bucket-EXPIRED` | Button | Filters strictly expired batches ($\le 0$ days). |
| **Pharma Expiry Cockpit** | `/inventory-dashboard` | `#filter-bucket-30_DAYS` | Button | Filters critical batches expiring within 30 days. |
| **Pharma Expiry Cockpit** | `/inventory-dashboard` | `#filter-bucket-60_DAYS` | Button | Filters warning batches expiring within 60 days. |
| **Pharma Expiry Cockpit** | `/inventory-dashboard` | `#filter-bucket-90_DAYS` | Button | Filters attention batches expiring within 90 days. |
| **Pharma Expiry Cockpit** | `/inventory-dashboard` | `#filter-company-select` | Select | Manufacturer / Principal dropdown filter. |
| **Pharma Expiry Cockpit** | `/inventory-dashboard` | `#search-batches-input` | Input | Live search input for batch number or product name. |
| **Pharma Expiry Cockpit** | `/inventory-dashboard` | `#tbl-expiry-radar` | Table | Interactive batch surveillance grid with selection checkboxes. |
| **Pharma Expiry Cockpit** | `/inventory-dashboard` | `#btn-select-all-batches` | Checkbox | Toggles select all batches across active filter set. |
| **Pharma Expiry Cockpit** | `/inventory-dashboard` | `#btn-shift-selected-action` | Button `[F7]` | Shifts chosen batches to quarantine and routes to `/stock-shift`. |
| **Pharma Expiry Cockpit** | `/inventory-dashboard` | `#tab-btn-quarantine` | Tab `[F3]` | Quarantined stock ledger showing segregated inventory. |
| **Pharma Expiry Cockpit** | `/inventory-dashboard` | `#tab-btn-history` | Tab `[F4]` | Stock Shift Audit Register tracking historical `SHF-2026-XXXX` vouchers. |
| **Stock Shift Desk** | `/stock-shift` | `#select-from-godown` | Select | Source Godown selector (default: Main Saleable Godown). |
| **Stock Shift Desk** | `/stock-shift` | `#select-to-godown` | Select | Destination Godown selector (default: Quarantine Expiry Godown). |
| **Stock Shift Desk** | `/stock-shift` | `#input-shift-voucher-no` | Input | Alphanumeric stock shift voucher sequence (`SHF-YYYY-XXXX`). |
| **Stock Shift Desk** | `/stock-shift` | `#input-shift-date` | Input | Voucher shift execution date. |
| **Stock Shift Desk** | `/stock-shift` | `#check-auto-claim` | Checkbox | Auto-generate official Principal Claim & Debit Note checkbox. |
| **Stock Shift Desk** | `/stock-shift` | `#select-principal-claim-target`| Select | Principal selector for debit claim filing (Sun Pharma, Cipla, Krishna). |
| **Stock Shift Desk** | `/stock-shift` | `#tbl-shift-items` | Table | Shift line items grid with product, batch, exp, qty, rate, value. |
| **Stock Shift Desk** | `/stock-shift` | `#btn-save-shift-voucher` | Button `[F7]` | Saves voucher, decrements saleable stock, increments quarantine, files claim. |
| **Stock Shift Desk** | `/stock-shift` | `#stock-shift-success-card` | Card | Success card showing generated voucher number and linked claim number. |
| **Stock Shift Desk** | `/stock-shift` | `#lbl-success-voucher-no` | Label | Displays generated Stock Shift Voucher number (e.g. `SHF-2026-0001`). |
| **Stock Shift Desk** | `/stock-shift` | `#lbl-success-claim-no` | Label | Displays generated Principal Claim reference (e.g. `CLM-PRN-2026-0006`). |
| **Stock Shift Desk** | `/stock-shift` | `#btn-view-in-audit` | Button `[F2]` | Jump to Cockpit Audit Register to inspect newly created voucher. |
| **Stock Shift Desk** | `/stock-shift` | `#btn-view-claim-desk` | Button `[F8]` | Jump directly to Principal Claims Desk (`/principal`). |
| **Sales Bill** | `/sales` | `#input-bill-series` | Input | Alphanumeric series continuation input (`SLS-YYYY-XXXX`). |
| **Sales Bill** | `/sales` | `#btn-search-party` | Button `[F7]` | Opens Debtor Party search modal with live balance and drug license. |
| **Sales Bill** | `/sales` | `#grid-bill-items` | Table | Bill item lines grid (Item, Pack, Batch, Exp, Qty, Free, Rate, Dis%, GST%). |
| **Sales Bill** | `/sales` | `#btn-batch-modal` | Button `[F3]` | Opens Batch Selection modal showing stock and expiry dates. |
| **Sales Bill** | `/sales` | `#btn-settlement-modal` | Button `[End]` | Opens Settlement & Payment Mode modal (Cash, Bank, Credit). |
| **Sales Bill** | `/sales` | `#btn-save-bill` | Button `[Ctrl+S]` | Saves bill, decrements batch stock, auto-posts double-entry GL voucher. |
| **Purchase Bill** | `/purchase` | `#input-purchase-series` | Input | Alphanumeric inward bill series input (`PUR-YYYY-XXXX`). |
| **Purchase Bill** | `/purchase` | `#input-vendor-inv-no` | Input | Supplier's external invoice reference number. |
| **Purchase Bill** | `/purchase` | `#btn-search-vendor` | Button `[F7]` | Creditor vendor search popup with live ledger balance. |
| **Purchase Bill** | `/purchase` | `#btn-save-purchase` | Button `[Ctrl+S]` | Commits purchase, updates batch stock, auto-posts inventory & accounts payable. |
| **Purchase List** | `/purchase/list` | `#grid-purchase-bills` | Table | Ag-Grid inward purchase bills register with search, filter, and dual-post tags. |
| **Supplier Debit Note** | `/purchase-return` | `#btn-mode-against-bill` | Button `[F2]` | Activates Against Inward Bill mode to load original purchase line items. |
| **Supplier Debit Note** | `/purchase-return` | `#btn-mode-loose` | Button `[F3]` | Activates Loose Return mode for ad-hoc debit note issuance. |
| **Supplier Debit Note** | `/purchase-return` | `#select-stock-disposition` | Select | Routes returned goods to Saleable, Breakage, or Expired godown. |
| **Supplier Debit Note** | `/purchase-return` | `#btn-save-debit-note` | Button `[Ctrl+S]` | Posts debit note, adjusts stock, generates reverse GL and ITC entries. |
| **Customer Credit Note** | `/sales-return` | `#btn-mode-against-bill` | Button `[F2]` | Activates Against Sales Bill mode to retrieve customer invoice lines. |
| **Customer Credit Note** | `/sales-return` | `#btn-mode-counter` | Button `[F3]` | Activates Counter Return mode with returnable quantity validation. |
| **Customer Credit Note** | `/sales-return` | `#btn-save-credit-note` | Button `[Ctrl+S]` | Saves credit note, increments stock, auto-posts sales return GL entries. |
| **Breakage Receive** | `/brk-receive` | `#input-bkr-series` | Input | Alphanumeric Breakage Receive series (`BKR-YYYY-XXXX`). |
| **Breakage Receive** | `/brk-receive` | `#btn-save-bkr` | Button `[Ctrl+S]` | Posts breakage receive, routing stock strictly into `brk_exp_stock`. |
| **Breakage Issue** | `/brk-issue` | `#input-bki-series` | Input | Alphanumeric Breakage Issue series (`BKI-YYYY-XXXX`). |
| **Breakage Issue** | `/brk-issue` | `#btn-save-bki` | Button `[Ctrl+S]` | Posts breakage issue to manufacturer, decrementing `brk_exp_stock`. |
| **Journal Voucher** | `/journal` | `#input-journal-series` | Input | Alphanumeric Journal series (`JRN-YYYY-XXXX`). |
| **Journal Voucher** | `/journal` | `#btn-auto-balance-gl` | Button `[Ctrl+B]` | Automatically calculates and inserts balancing Dr/Cr line. |
| **Journal Voucher** | `/journal` | `#btn-add-journal-leg` | Button `[Alt+A]` | Adds new ledger line item to journal entry. |
| **Journal Voucher** | `/journal` | `#check-schedule-accrual` | Checkbox | Configures scheduled automatic GL reversal on 1st of subsequent month. |
| **Journal Voucher** | `/journal` | `#btn-post-journal` | Button `[Ctrl+S]` | Validates $\sum \text{Dr} = \sum \text{Cr}$ and posts journal voucher to ledger. |
| **Journal Register** | `/finance/journal-register` | `#btn-reverse-journal` | Button | 1-Click atomic GL reversal with linked audit trail. |
| **Expense Management** | `/finance/expenses` | `#input-expense-amount` | Input | Expense payout amount with live P&L impact preview. |
| **Expense Management** | `/finance/expenses` | `#select-expense-account` | Select | Dropdown for 10 statutory P&L expense heads. |
| **Expense Management** | `/finance/expenses` | `#btn-post-expense` | Button | Posts direct cash/bank expense voucher debiting P&L immediately. |
| **Fixed Assets** | `/finance/fixed-assets` | `#btn-register-asset` | Button `[F2]` | Opens modal to register capital asset with Schedule II category. |
| **Fixed Assets** | `/finance/fixed-assets` | `#btn-run-depreciation` | Button `[F5]` | Executes periodic WDV/SLM depreciation run across active assets. |
| **Bank Reconciliation** | `/finance/bank-reconciliation` | `#btn-auto-match-brs` | Button | Runs auto-matching algorithm against imported bank statement CSV. |
| **Bank Reconciliation** | `/finance/bank-reconciliation` | `#btn-cash-drawer-tally` | Button `[F8]` | Opens RBI physical currency denomination counter and cash discrepancy report. |
| **Outstanding Workbench** | `/finance/outstanding` | `#tab-btn-debtors` | Tab | Outstanding customer debit balances with 0-30, 31-60, 61-90, >90d ageing. |
| **Outstanding Workbench** | `/finance/outstanding` | `#tab-btn-creditors` | Tab | Outstanding vendor credit liabilities with ageing analysis. |
| **GST Workbench** | `/gst` | `#tab-btn-gstr1` | Tab | GSTR-1 Outward Supplies return tables (B2B, B2CS, CDNR, HSN, Docs). |
| **GST Workbench** | `/gst` | `#tab-btn-gstr2` | Tab | GSTR-2 Inward ITC register matching purchase bills and debit notes. |
| **GST Workbench** | `/gst` | `#tab-btn-gstr3b` | Tab | GSTR-3B Monthly consolidated return calculation. |
| **GST Workbench** | `/gst` | `#btn-export-gstn-json` | Button | Exports official Government Offline Utility JSON file for `gst.gov.in`. |
| **Report Viewer** | `/reports` | `#select-report-category` | Select | Financial, inventory, sales, and audit report catalog. |
| **Report Designer** | `/reports/designer` | `#btn-execute-query` | Button | Runs custom semantic report query builder. |
| **Workflow Inbox** | `/workflow/inbox` | `#btn-approve-task` | Button | 1-Click task approval with maker-checker verification. |
| **Workflow Inbox** | `/workflow/inbox` | `#btn-reject-task` | Button | Opens mandatory rejection remarks dialog. |
| **Workflow Designer** | `/workflow/designer` | `#input-sim-amount` | Input | Approval threshold simulator sandbox. |
| **Workflow Monitor** | `/workflow/monitor` | `#chart-sla-adherence` | Chart | SLA adherence metrics and average resolution TAT. |
| **Party Master** | `/master/parties` | `#btn-new-party` | Button `[F2]` | Opens new customer/vendor registration dialog. |
| **Party Master** | `/master/parties` | `#input-party-gstin` | Input | Party GSTIN with statutory checksum validation. |
| **Current Stock** | `/stock` | `#input-stock-search` | Input | Instant search across product formulations, batches, and godowns. |
| **Replenishment** | `/inventory/replenishment` | `#btn-generate-reorder` | Button | Computes reorder quantities based on minimum stock and sales velocity. |

---

## 27. Automated QA Test Suites & Continuous Deployment Pipeline

### 27.1 Complete Automated Selenium Test Suites Matrix (16 Suites — 100% Pass)
| Test Suite Script | Verified Module Scope | Assertion Target & Verification Method | Status |
| :--- | :--- | :--- | :--- |
| `test_master_all_6_modules_selenium.py` | Sales, Purchase, DN, CN, BKI, BKR | 100% PASS: All 6 transaction modules with alphanumeric series continuation. | 100% PASS |
| `test_escape_and_workflows_selenium.py` | Workflows Dropdown, Cargo Links, Esc Exit | 100% PASS: Header Workflows `[F4]` dropdown, Cargo board navigation, Exit modal `[Esc]`. | 100% PASS |
| `test_receipt_payment_audit_redesign_selenium.py`| Receipt, Payment, Audit Trail, Governance | 100% PASS: Luxury UI, party picker `[F7]`, FIFO `[Alt+A]`, hash verification, diff drawer, holds. | 100% PASS |
| `test_cargo_consignment_selenium.py` | Consignment Board, Costs, POD Desk | 100% PASS: Volumetric CBM calculations, Admin freight bifurcation, 4-eyes POD. | 100% PASS |
| `test_freight_logistics_selenium.py` | Rate Contracts, Sandbox, 3-Way Reconciliation | 100% PASS: Tiered slabs, deterministic calculation, Admin GL 5200 segregation, variance approvals. | 100% PASS |
| `test_principal_operations_selenium.py` | Agreement Catalog, Custody Matrix, Claims Desk, 3-Way Reconciliation | 100% PASS: 16 models, custody segregation, breakage claims, reconstructable statement, [Esc] lifecycle. | 100% PASS |
| `test_audit_governance_selenium.py` | Audit Ledger, Chaining, Legal Holds | 100% PASS: SHA-256 seal verification, before/after diff drawer, retention schedules. | 100% PASS |
| `test_workflow_approval_automation_selenium.py` | Approvals Inbox, Task Actions, SLA | 100% PASS: Universal trigger, Maker-Checker 403, rejection reason modal, simulator. | 100% PASS |
| `test_dashboard_bi_control_center_selenium.py` | Counter Workbench, BI Dashboard | 100% PASS: Dual-screen architecture, 7-month comparative curve, map modal `#mapModal`. | 100% PASS |
| `test_gst_compliance_selenium.py` | GSTR-1, GSTR-2, GSTR-3B, E-Invoice | 100% PASS: GST tables, debit note ITC reversal, Gov offline JSON export, IRN signing. | 100% PASS |
| `test_reports_and_finance_selenium.py` | Day Book, Trial Balance, P&L, Balance Sheet | 100% PASS: Double-entry reports, account statements, custom report designer. | 100% PASS |
| `test_receipt_payment_settlement_selenium.py` | Receipts, Payments, FIFO Allocation | 100% PASS: Customer receipts `[F6]`, FIFO allocation, vendor payments `[F5]`. | 100% PASS |
| `test_journal_accrual_engine_selenium.py` | Journal Entry, Auto-Balance, Accruals | 100% PASS: Multi-leg cockpit, `[Ctrl+B]` auto-balance, scheduled reversals. | 100% PASS |
| `test_direct_expense_ui_selenium.py` | Operational Expenses, Live P&L Impact | 100% PASS: Direct expense vouchers, live P&L impact box, advance disbursements. | 100% PASS |
| `test_fixed_assets_selenium.py` | Asset Categories, Fixed Assets, Depreciation | 100% PASS: Asset registry, WDV/SLM depreciation run, automatic GL vouchers. | 100% PASS |
| `test_bank_recon_cash_selenium.py` | Bank Reconciliation, Cash Drawer Tally | 100% PASS: Statement auto-matching, currency denomination tally counting. | 100% PASS |

### 27.2 Production Cloud Verification Scripts (Live Vercel CDN)
- `verify_live_vercel_escape_and_workflows.py`: Automated verification of live Vercel production deployment for Workflows dropdown and `Esc` navigation.
- `verify_live_vercel_receipt_payment_audit.py`: Automated verification of live Vercel production deployment for Receipt Voucher, Payment Voucher, Audit Trail Explorer, and Governance Console.
- `verify_live_vercel_freight_audit.py`: Automated verification of live Vercel production deployment for Freight Rate Master, Calculation Sandbox, and Transporter Reconciliation Desk (4/4 Stages 100% PASS).
- `verify_live_vercel_principal_audit.py`: Automated verification of live Vercel production deployment for Principal Control Center, Claims Desk, and Statement Desk (4/4 Stages 100% PASS).

---

## 28. Freight & Logistics Cost Recovery Engine (DOC-35)

### 28.1 Architectural Role & Subsystem Topology
DOC-35 defines the centralized calculation, multi-tier rate resolution, cost allocation, commercial recovery, and three-way transporter billing reconciliation engine. It operates directly upon physical consignment records registered in DOC-34 (Cargo & Consignment Engine) and prepares accounting posting instructions for DOC-08 (General Ledger).

### 28.2 Inviolable Architectural Governance Rules
1. **Strict Cost vs. Recovery Segregation**: Transporter freight cost is never silently offset or replaced by customer or principal recoveries. Gross transporter cost, commercial recovery, and net logistics margin remain separate immutable ledger items.
2. **Platform Admin-Funded Freight (Account 5200)**: When Platform Admin finances cargo for a client company, the expense is posted exclusively to Account 5200 (`Central Freight & Logistics Expense`) in the Platform Admin General Ledger. The Client Company General Ledger maintains zero auto-debits.
3. **Deterministic Explainability Snapshots**: Every rate calculation produces an immutable JSON snapshot (`FreightCalculationSnapshot`) capturing the inputs, formula trace, and rule version for historical auditability.
4. **Three-Way Transporter Billing & Tolerable Variances**: Transporter invoices are reconciled against expected system costs. Variances $\le ₹200$ are flagged as `TOLERABLE`; variances $> ₹200$ require manager approval or dispute logging before posting to accounts payable.

### 28.3 Relational Database Schema (11 PostgreSQL Models in `backend/models.py`)
1. `FreightContract`: PK `id` (UUID), FK `organization_id`, `transporter_id`. Stores `contract_code`, `contract_name`, `valid_from`, `valid_to`, `priority`, `status`.
2. `FreightLane`: PK `id` (UUID), FK `contract_id`. Stores `origin_pincode`, `dest_pincode`, `origin_zone`, `dest_zone`, `transit_days`, `distance_km`.
3. `FreightRateRule`: PK `id` (UUID), FK `lane_id`. Stores `slab_min_kg`, `slab_max_kg`, `rate_per_kg`, `flat_rate`, `min_charge`, `calc_mode` (`PER_KG`, `FLAT`, `TIERED`).
4. `FreightAncillaryRule`: PK `id` (UUID), FK `contract_id`. Stores `charge_code`, `charge_name`, `rate_type` (`FLAT`, `PERCENT`, `PER_PACKAGE`), `rate_value`, `is_mandatory`.
5. `FreightCostEvent`: PK `id` (UUID), FK `organization_id`, `consignment_id`, `contract_id`. Stores `event_type`, `gross_cost`, `net_cost`, `currency`, `created_at`.
6. `FreightCalculationSnapshot`: PK `id` (UUID), FK `event_id`. Stores `input_payload` (JSON), `rate_rule_applied` (JSON), `ancillary_breakdown` (JSON), `formula_trace` (Text), `sha256_hash`.
7. `FreightAllocation`: PK `id` (UUID), FK `event_id`, `invoice_id`. Stores `allocation_method` (`WEIGHT`, `VALUE`, `PACKAGE`, `EQUAL`), `allocated_cost`, `allocated_pct`.
8. `FreightRecovery`: PK `id` (UUID), FK `allocation_id`, `customer_id`, `principal_id`. Stores `recovery_target` (`CUSTOMER`, `PRINCIPAL`, `SUBSIDY`), `recovery_amount`, `billing_status`.
9. `FreightReconciliation`: PK `id` (UUID), FK `contract_id`. Stores `statement_ref`, `carrier_billed_val`, `system_expected_val`, `variance_val`, `status` (`MATCHED`, `TOLERABLE`, `UNAPPROVED_EXCESS`, `DISPUTED`, `POSTED`).
10. `FreightCostBearerPolicy`: PK `id` (UUID), FK `organization_id`. Stores `scope`, `bearer` (`ADMIN`, `CLIENT`, `RECIPIENT`), `gl_account_code` (`5200`), `is_active`.
11. `FreightException`: PK `id` (UUID), FK `reconciliation_id`. Stores `exception_type` (`RATE_MISMATCH`, `WEIGHT_VARIANCE`, `UNAPPROVED_ANCILLARY`), `amount`, `status`.

### 28.4 Deterministic Rate Resolution & Volumetric Rating Formulas
- **Chargeable Weight Resolution**:
  $$\text{Volumetric Weight (kg)} = \frac{L \,(\text{cm}) \times W \,(\text{cm}) \times H \,(\text{cm})}{5,000}$$
  $$\text{Chargeable Weight} = \max(\text{Gross Weight}, \text{Volumetric Weight})$$
- **Tiered Slab Calculation**:
  - Slab 1 (0–500 kg): Base rate ₹7.00/kg (Minimum charge ₹500.00).
  - Slab 2 (501–1,500 kg): Base rate ₹6.50/kg.
  - Slab 3 (> 1,500 kg): Base rate ₹5.80/kg.
- **Ancillary Surcharge Model**:
  - Loading / Unloading: ₹300.00 flat.
  - Highway Toll / Green Tax: ₹450.00 flat.
  - Hamali / Labour: ₹15.00 per package.
  - Transit Risk Cover: $0.5\%$ of Declared Invoice Value.
  - Demurrage / Waiting: ₹500.00 per day after grace period.

### 28.5 RESTful API Reference (`/api/freight/*`)
| Method | Path | Request Body / Query | Success Response | Status | Invariant Impact |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/freight/summary` | None | `{summary: {...}}` | 200 | Aggregates gross spend, recoveries, margin. |
| `GET` | `/api/freight/contracts` | `transporter_id?` | `{contracts: [...]}` | 200 | Returns carrier rate cards and lanes. |
| `POST` | `/api/freight/contracts` | `FreightContractCreate` | `{status: "SUCCESS"}` | 201 | Registers carrier agreement and lanes. |
| `POST` | `/api/freight/calculate` | `FreightCalculateRequest` | `{calculated_cost: {...}}`| 200 | Deterministic live rating with formula trace. |
| `GET` | `/api/freight/events` | `consignment_id?` | `{events: [...]}` | 200 | Fact ledger of rated consignment events. |
| `POST` | `/api/freight/allocate` | `FreightAllocateRequest` | `{status: "SUCCESS"}` | 200 | Multi-invoice proportional cost splitting. |
| `GET` | `/api/freight/reconciliation` | `status?` | `{reconciliations: [...]}`| 200 | Transporter bill audit queue. |
| `POST` | `/api/freight/reconciliation` | `FreightReconCreate` | `{reconciliation: {...}}` | 201 | Ingests carrier bill for 3-way match. |
| `POST` | `/api/freight/reconciliation/{id}/action` | `{action: "APPROVE"\|"POST_GL"}`| `{status: "SUCCESS"}` | 200 | 1-click GL 5200 posting or dispute logging. |
| `GET` | `/api/freight/policies` | None | `{policies: [...]}` | 200 | Validates Account 5200 cost-bearer binding. |

---

## 29. Principal & C&F Operations Management Engine (DOC-36)

### 29.1 Architectural Role & Subsystem Topology
DOC-36 establishes the institutional-grade operational engine that transforms static Principal and C&F master records into a continuously auditable, traceable, and reconstructable operating position. In modern pharmaceutical distribution, super-distributors and C&F agents hold consignment stocks for multiple drug manufacturers (Principals). Operating under diverse commercial agreements, tiered commission rates, strict credit windows, and complex freight recovery policies, enterprises face severe financial and statutory risks if stock ownership commingles or ledger reconciliations drift. DOC-36 orchestrates Principal context across DOC-12 (Master), DOC-14 (Schemes), DOC-16 (Stock Movement), DOC-08 (GL Postings), DOC-07 (Settlements), and DOC-35 (Freight).

### 29.2 Inviolable Architectural Governance Rules
1. **Zero Duplicate Engines Rule**: DOC-36 never duplicates existing core transaction ledgers. All movements refer directly to DOC-16 batches, DOC-20 sales bills, and DOC-35 freight attributions.
2. **Owner Separation at SKU/Batch Level**: Principal ownership is an explicit relational dimension (`PrincipalOwnershipRule`). Multiple Principals can stock identical SKUs in the same warehouse without cross-owner stock pollution or commingling.
3. **Non-Editable Reconstructable Statements**: Principal stock statements and commercial balances are mathematically reconstructed from source movements and immutable events. Manual balance overrides are strictly prohibited.
4. **Reconciliation Variance Immutability**: Reconciliation cannot alter historical transaction ledgers; variances generate audit trails and follow-up adjustment or claim documents with four-eyes approval.

### 29.3 Relational Database Schema (16 PostgreSQL Models in `backend/models.py`)
1. `PrincipalOperatingContext`: PK `id` (UUID), FK `company_id` -> `organizations.id`, `principal_id`, `branch_id`. Stores `principal_code`, `principal_name`, `agreement_version_id`, `status` (`ACTIVE`, `SUSPENDED`, `TERMINATED`).
2. `PrincipalAgreementVersion`: PK `id` (UUID), FK `principal_id`. Stores `agreement_number`, `version_no`, `valid_from`, `valid_to`, `terms_json` (commission %, credit days, freight allowances), `status` (`DRAFT`, `ACTIVE`, `SUPERSEDED`).
3. `PrincipalProductRule`: PK `id` (UUID), FK `principal_id`, `product_id`. Stores `product_name`, `sku_code`, `branch_id`, `warehouse_id`, `is_exclusive`, `status`.
4. `PrincipalCustomerRule`: PK `id` (UUID), FK `principal_id`, `customer_id`. Stores `customer_group`, `territory_id`, `territory_name`, `status`.
5. `PrincipalOwnershipRule`: PK `id` (UUID), FK `principal_id`. Stores `product_scope`, `warehouse_scope`, `mode` (`CONSIGNMENT_CUSTODY`, `OUTRIGHT_PURCHASE`, `PRINCIPAL_OWNED`).
6. `PrincipalEvent`: PK `id` (UUID), FK `company_id`, `principal_id`. Stores `event_type`, `event_time`, `source_doc_type`, `source_doc_id`, `payload_json`, `payload_hash` (SHA-256).
7. `PrincipalStockSnapshot`: PK `id` (UUID), FK `principal_id`, `product_id`. Stores `product_name`, `batch_no`, `warehouse_name`, `as_of`, `qty_on_hand`, `qty_reserved`, `qty_damage_breakage`, `unit_cost`, `total_valuation`.
8. `PrincipalClaim`: PK `id` (UUID), Unique `claim_number`, FK `principal_id`. Stores `claim_type` (`EXPIRY`, `BREAKAGE`, `SHORTAGE`, `RATE_DIFFERENCE`), `source_doc_id`, `claimed_qty`, `claimed_amount`, `approved_amount`, `status` (`PENDING`, `APPROVED`, `DISPUTED`, `SETTLED`).
9. `PrincipalClaimLine`: PK `id` (UUID), FK `claim_id` -> `principal_claims.id`, `product_id`. Stores `source_movement_id`, `batch_no`, `expiry_date`, `qty`, `rate`, `amount`, `approved_amount`.
10. `PrincipalReconciliation`: PK `id` (UUID), Unique `recon_number`, FK `principal_id`. Stores `period_from`, `period_to`, `system_opening_val`, `external_opening_val`, `system_closing_val`, `external_closing_val`, `net_variance_val`, `matched_lines_count`, `variance_lines_count`, `status`.
11. `PrincipalReconciliationLine`: PK `id` (UUID), FK `reconciliation_id`. Stores `source_key`, `source_type` (`SALE`, `INWARD`, `RETURN`, `CLAIM`), `system_qty`, `external_qty`, `variance_qty`, `system_val`, `external_val`, `variance_val`, `reason_code`, `status`.
12. `PrincipalStatementRun`: PK `id` (UUID), Unique `run_number`, FK `principal_id`. Stores `period_from`, `period_to`, `filters_hash`, `source_versions`, `opening_stock_val`, `receipts_val`, `sales_val`, `returns_val`, `claims_pending_val`, `freight_cost_val`, `closing_stock_val`, `status`.
13. `PrincipalStatementLine`: PK `id` (UUID), FK `run_id`. Stores `event_id`, `source_doc_id`, `category` (`OPENING`, `INWARD`, `SALE`, `RETURN`, `CLAIM`, `FREIGHT`, `CLOSING`), `product_name`, `batch_no`, `qty`, `amount`.
14. `PrincipalCostAttribution`: PK `id` (UUID), FK `principal_id`, Ref `source_cost_id` -> DOC-35. Stores `bearer` (`ADMIN_COMPANY`, `PRINCIPAL`, `CLIENT_COMPANY`), `recovery_target`, `amount`, `policy_version`, `status`.
15. `PrincipalCommissionRef`: PK `id` (UUID), FK `principal_id`, `source_event_id`, Ref `commission_doc_id` -> DOC-37. Stores `gross_sales_val`, `commission_rate_pct`, `commission_amount`, `status` (`ACCRUED`, `BILLED`, `SETTLED`).
16. `PrincipalSyncCheckpoint`: PK `id` (UUID), FK `company_id`, `principal_id`. Stores `scope_key` (`STOCK`, `CLAIMS`, `RECON`, `EVENTS`), `cursor`, `hash` (SHA-256), `synced_at`.

### 29.4 RESTful API Reference (`/api/principal/*`)
| Method | Path | Request Body / Query | Success Response | Status | Invariant Impact |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/principal/summary` | None | `{summary: {...}}` | 200 | Feeds 5 top telemetry KPI cards on Control Center. |
| `GET` | `/api/principal/list` | `search?` | `{principals: [...]}` | 200 | Searchable principal catalog with commission and stock. |
| `GET` | `/api/principal/{id}/position` | Path: `id` (UUID) | `{position: {...}}` | 200 | SKU/batch custody segregation and sales velocity. |
| `GET` | `/api/principal/{id}/statement`| Path: `id`, `period_from?`, `period_to?` | `{statement: {...}}` | 200 | Reconstructs non-editable statement from source vouchers. |
| `POST` | `/api/principal/claims` | `ClaimCreateRequest` | `{claim: {...}}` | 200 | Logs operational claim with batch provenance (`CLM-PRN-YYYY-XXXX`). |
| `POST` | `/api/principal/claims/{id}/action` | `{action: "APPROVE"\|"DISPUTE"}` | `{claim: {...}}` | 200 | 4-eyes approval workflow without ledger tampering. |
| `GET` | `/api/principal/reconciliations` | `principal_id?` | `{reconciliations: [...]}` | 200 | Lists 3-way reconciliation runs with net variance. |
| `POST` | `/api/principal/reconciliation/run` | `ReconciliationRunRequest` | `{reconciliation: {...}}` | 200 | Executes automated matching against external statements (`REC-PRN-YYYY-XXXX`). |

### 29.5 Terminal Cockpits & Zero-Mouse Keyboard Layout
- **Counter Workbench Launcher**: Added `#hub-btn-principal-management` tile to `/` with global hotkey `[Ctrl+3]`.
- **Principal Operational Control Center (`/principal`)**:
  - Telemetry Strip: 5 KPI metric cards (`#kpi-active-principals`, `#kpi-total-stock-val`, `#kpi-pending-claims`, `#kpi-reconciled-health`, `#kpi-freight-attribution`).
  - `[F2]` Stock Ownership & Custody Matrix (`#tab-btn-stock`): SKU/batch segregation, custody mode (`CONSIGNMENT_CUSTODY`).
  - `[F3]` Claims & Returns Desk (`#tab-btn-claims`): Operational claims tracking with 1-click Approve/Dispute actions.
  - `[F4]` 3-Way Reconciliation Workspace (`#tab-btn-recon`): Automated matching runs against external statements.
  - `[F5]` Authoritative Business Statement (`#tab-btn-statement`): Embedded reconstructed statement with drill-down line items.
  - `[F6]` Commercial MIS & Profitability (`#tab-btn-mis`): Net commissions accrued, gross margins, attributed logistics.
  - `[F7]` New Claim Modal (`#btn-open-claim-modal`, `#modal-new-claim`): Registers claims with batch provenance; clean `[Esc]` dismissal.
- **Principal Business Statement Desk (`/principal/statement`)**:
  - Full-screen statement workspace with principal selector (`#select-statement-principal`), date ranges, transaction category filters, native print formatting, and zero manual balance override guarantee.

---

## 30. Principal & C&F Commission & Recovery Engine (DOC-37)

### 30.1 Architectural Role & Subsystem Topology
DOC-37 establishes the enterprise commercial commission calculation and expense recovery subsystem for Principal and C&F operations. Built strictly adhering to the 4 architectural invariants, it unifies rate contract versioning, deterministic on-the-fly commission calculation, 4-eyes claim submission and approval workflows, service invoice/debit note linking, consolidated periodic recovery statement generation, and immutable SHA-256 audit trails.

```
+---------------------------------------------------------------------------------------------------+
|                        DOC-37 PRINCIPAL COMMISSION & RECOVERY ENGINE                              |
+---------------------------------------------------------------------------------------------------+
|  Operational Sources        Calculation Sandbox         Claims & Approval        Commercial Links |
|  - Invoices (DOC-20)   ==>  - Rate Cards (Rules)   ==>  - 4-Eyes Claims     ==>  - Service Invoice|
|  - Returns (DOC-24)         - Formula Tracing           - Partial Approval       - Debit Notes    |
|  - Freight Cost (DOC-35)    - SHA-256 Hashes            - Quarantine Queue       - GL 5200 / Tax  |
+---------------------------------------------------------------------------------------------------+
```

### 30.2 4 Inviolable Architectural Governance Rules
1. **Zero Duplicate Ledgers Rule**: DOC-37 never creates shadow accounting ledgers. Calculations, claims, and recovery statements remain operational commercial objects. Financial recognition strictly routes through DOC-08 General Ledger, DOC-29 Statutory Tax, DOC-16 Stock, and DOC-07 Settlements via standard service invoices or credit/debit notes.
2. **Separation of Earned Commission vs Recoverable Expenses**: Turnover commission (commercial income earned on goods sold) is strictly segregated from recoverable expenses (operational recharges for freight, demurrage, loading, and repacking). This guarantees clean taxability and profit-and-loss categorization.
3. **Deterministic Explainability & SHA-256 Integrity**: Every calculation freezes its exact mathematical formula trace, unit rates, slab parameters, and generates an immutable SHA-256 hash. Retroactive changes never overwrite history; they generate explicit delta adjustments (`commission_adjustments`).
4. **4-Eyes Claim Workflow & Dispute Isolation**: Recovery claims support partial approval, allowing undisputed amounts to be invoiced immediately while disputed items are isolated into quarantine without blocking periodic settlement runs.

### 30.3 Relational Database Schema (14 PostgreSQL Models in `backend/models.py`)
1. `PrincipalCommissionAgreement`: PK `id` (UUID), FK `company_id` -> `organizations.id`, `principal_id`. Stores `principal_code`, `principal_name`, `agreement_code`, `version_no`, `valid_from`, `valid_to`, `status`, `terms_json`.
2. `CommissionRule`: PK `id` (UUID), FK `agreement_id` -> `principal_commission_agreements.id`. Stores `rule_code`, `rule_name`, `priority`, `rule_type`, `rate_pct`, `unit_rate`, `fixed_amount`, `min_guarantee_amount`, `formula_config`.
3. `CommissionScope`: PK `id` (UUID), FK `rule_id` -> `commission_rules.id`. Stores `product_scope`, `customer_scope`, `territory_scope`, `branch_id`, `scope_filter_json`.
4. `CommissionEvent`: PK `id` (UUID), FK `company_id`, `principal_id`. Stores `event_type`, `event_date`, `source_doc_type`, `source_doc_id`, `idempotency_key` (unique), `payload_json`.
5. `CommissionMeasure`: PK `id` (UUID), FK `event_id` -> `commission_events.id`. Stores `measure_type`, `base_amount`, `base_quantity`, `uom`.
6. `CommissionCalculation`: PK `id` (UUID), Unique `calculation_number`, FK `event_id`, `rule_id`. Stores `category`, `base_value`, `rate_applied`, `calculated_amount`, `formula_trace`, `state`, `sha256_hash`.
7. `CommissionAdjustment`: PK `id` (UUID), FK `original_calc_id` -> `commission_calculations.id`. Stores `delta_amount`, `reason_code`, `description`, `approved_by_id`.
8. `RecoveryClaim`: PK `id` (UUID), Unique `claim_number`, FK `company_id`, `principal_id`. Stores `period_from`, `period_to`, `total_earned_commission`, `total_recoverable_expenses`, `total_claimed_amount`, `approved_amount`, `disputed_amount`, `status`.
9. `RecoveryClaimLine`: PK `id` (UUID), FK `claim_id` -> `recovery_claims.id`, `calc_id`. Stores `source_doc_type`, `source_doc_id`, `line_description`, `requested_amount`, `approved_amount`, `disputed_amount`, `status`.
10. `RecoveryDocumentLink`: PK `id` (UUID), FK `claim_id` -> `recovery_claims.id`. Stores `document_type`, `document_number`, `amount`, `linked_at`.
11. `RecoveryStatement`: PK `id` (UUID), Unique `statement_number`, FK `principal_id`. Stores `period_from`, `period_to`, `earned_commission`, `expense_recovery`, `approved_commercial`, `invoiced_total`, `settled_total`, `outstanding_balance`, `statement_hash`, `status`.
12. `RecoveryStatementLine`: PK `id` (UUID), FK `statement_id` -> `recovery_statements.id`. Stores `category`, `reference_doc_id`, `description`, `amount`.
13. `CommissionException`: PK `id` (UUID), FK `company_id` -> `organizations.id`. Stores `source_id`, `exception_type`, `severity`, `description`, `state`.
14. `CommissionAudit`: PK `id` (UUID), FK `company_id` -> `organizations.id`. Stores `object_type`, `object_id`, `action`, `actor_username`, `before_hash`, `after_hash`, `details_json`.

### 30.4 RESTful API Reference (`/api/commission/*`)
| Method | Path | Request Body / Query | Success Response | Status | Invariant Impact |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/commission/summary` | None | `{status, data: {...}}` | 200 | Returns live commercial metrics for Control Center cards. |
| `GET` | `/api/commission/agreements` | `principal_id?`, `status?` | `{status, count, data: [...]}` | 200 | Lists active agreements with nested rule matrix and scopes. |
| `POST` | `/api/commission/calculate` | `CommissionCalculateRequest` | `{status, data: {...}}` | 200 | Deterministic calculation evaluating active rules with SHA-256 hash. |
| `GET` | `/api/commission/calculations` | `principal_id?`, `category?`, `state?` | `{status, count, data: [...]}` | 200 | Lists calculation ledger records with formula traces. |
| `POST` | `/api/commission/calculations/{id}/action` | `{action, delta_amount?, reason?}` | `{status, data: {...}}` | 200 | State transition; generates CommissionAdjustment on delta adjustment. |
| `GET` | `/api/commission/claims` | `principal_id?`, `status?` | `{status, count, data: [...]}` | 200 | Lists recovery claims with lines and linked documents. |
| `POST` | `/api/commission/claims` | `RecoveryClaimCreateRequest` | `{status, data: {...}}` | 200 | Batches approved calculations into recovery claim (`CLM-REC-YYYY-XXX`). |
| `POST` | `/api/commission/claims/{id}/action` | `{action, approved_amount?, document_type?}`| `{status, data: {...}}` | 200 | 4-eyes claim workflow; links Service Invoices/Debit Notes. |
| `GET` | `/api/commission/statements` | `principal_id?` | `{status, count, data: [...]}` | 200 | Lists consolidated statements with reconstructable line movements. |
| `POST` | `/api/commission/statements/generate` | `{principal_id, period_from?, period_to?}` | `{status, data: {...}}` | 200 | Consolidates period calculations into statement (`REC-STM-YYYY-XXX`). |
| `GET` | `/api/commission/exceptions` | `state?` | `{status, count, data: [...]}` | 200 | Operational exceptions queue for unmapped products or slabs. |
| `POST` | `/api/commission/exceptions/{id}/resolve`| Path: `id` | `{status, message}` | 200 | Resolves exception after supervisor verification. |
| `GET` | `/api/commission/audits` | `limit?` | `{status, count, data: [...]}` | 200 | Immutable forensic audit trail records with before/after hashes. |

### 30.5 Terminal Cockpits & Zero-Mouse Keyboard Layout
- **Counter Workbench Launcher**: Added `#hub-btn-commission-management` tile to `/` with global hotkey `[Ctrl+4]`.
- **Commission Control Center (`/commission`)**:
  - Telemetry Strip: 6 KPI metric cards (`Earned Commission`, `Recoverable Ancillaries`, `Net Commercial Total`, `Open Claims Desk`, `Settled Remittances`, `Active Agreements`).
  - `[F2]` Agreements & Rate Cards: Detailed contractual rules (turnover %, minimum guarantees, packaging recovery).
  - `[F3]` Calculation Sandbox & Trace: Live simulation workspace with formula breakdown and SHA-256 integrity hash.
  - `[F4]` Recovery Claims Desk: 4-eyes approval workflow, claim lines breakdown, and 1-click Service Invoice generation.
  - `[F5]` Principal Recovery Statements: Consolidated periodic runs with transaction-level audit traceability.
  - `[F6]` Exceptions & Audit Trail: Operational exception quarantine and immutable forensic audit trail.
  - `[F7]` New Claim Modal (`#btn-open-claim-modal`): Batches approved calculations into claim; clean `[Esc]` dismissal.

---

## 31. C&F Consigning Agent Operational Model, 4-Pillar Commercial Deal Terms & Dual-Posting to Purchase Bills

### 31.1 Architectural Domain & Conceptual Separation
The C&F (Carrying & Forwarding) and Consigning Agent architecture enforces a strict separation between:
1. **Product Company** (`item.company_id` / `items.company`): The brand manufacturer entity associated with catalog SKUs, sales turnover reporting, and contractual commission agreements.
2. **Accounting Ledger** (`accounts.id` / `ledgers`): The legal entity debtor/creditor ledger maintained in double-entry General Ledger (DOC-08).
3. **Client-Company Mapping** (`CustomerProfile.company_ids`): A JSON column storing an array of company UUIDs or `["ALL"]`. Allows filtering clients eligible for brand dealership sales in calculation sandboxes via `GET /api/parties/clients-by-company/{company_id}`.

### 31.2 Database Schema & Model Extensions
1. **`CustomerProfile.company_ids`** (`backend/models.py`):
   ```python
   company_ids = Column(JSON, nullable=True, default=list)  # List of company UUIDs or ["ALL"]
   ```
2. **`CommissionCalculation` Extensions** (`backend/models.py`):
   ```python
   client_id = Column(UUID(as_uuid=True), nullable=True)
   client_name = Column(String(255), nullable=True)
   event_type = Column(String(50), nullable=True)  # STAFF_SALARY, GODOWN_RENT, SALES_BILL
   ```
3. **4-Pillar Deal Terms Schema** (`PrincipalCommissionAgreement.terms_json`):
   ```json
   {
     "deal_terms": {
       "godown_rent": {"bearer": "PRINCIPAL", "default_amount": 42000.0, "notes": "Agreed monthly warehouse rental"},
       "staff_salary": {"bearer": "PRINCIPAL", "default_amount": 28500.0, "notes": "Dedicated staff salaries"},
       "cargo_freight": {"bearer": "DISTRIBUTOR", "default_amount": 0.0, "notes": "Borne by distributor"},
       "sales_commission": {"commission_rate_pct": 6.5, "basis": "CLIENT_SALES_TURNOVER", "notes": "Percentage on client sales"}
     }
   }
   ```

### 31.3 Backend RESTful API Endpoints
| Method | Path | Description | Invariant Impact |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/parties/clients-by-company/{company_id}` | Returns clients associated with a specific Product Company or `ALL`. | Multi-tenant customer profile lookup. |
| `PUT` | `/api/commission/agreements/{agreement_id}/deal-terms` | Updates 4-pillar deal terms in `terms_json`. | Uses `flag_modified` to guarantee SQLAlchemy JSON change tracking. |
| `POST` | `/api/commission/calculate` | Supports `STAFF_SALARY`, `GODOWN_RENT`, and `SALES_BILL` (with `client_id`, `client_name`). | Tags calculation records with immutable SHA-256 hashes. |
| `POST` | `/api/commission/claims/{id}/action` | Executes `CREATE_DOCUMENT` generating **Outward Service Invoice** and **Inward Service Purchase Bill**. | Creates bilateral `RecoveryDocumentLink` entries and posts to Purchase Section. |

### 31.4 The Dual-Posting Engine Implementation
When `action == "CREATE_DOCUMENT"` is dispatched to `/api/commission/claims/{id}/action`:
1. **Outward Service Invoice**:
   - `doc_number = f"SINV-2026-{claim.id.hex[:4].upper()}"`
   - Linked to `RecoveryDocumentLink(document_type="SERVICE_INVOICE", document_number=doc_number, amount=claim.approved_amount)`.
2. **Inward Service Purchase Bill**:
   - `pur_bill_number = f"PUR-SRV-2026-{claim.id.hex[:4].upper()}"`
   - Created in `models.Invoice` table:
     - `invoice_type = "purchase-bill"`
     - `invoice_number = pur_bill_number`
     - `customer_name = principal_name`
     - `subtotal = claim.approved_amount`
     - `total_amount = claim.approved_amount`
     - `status = "APPROVED"`
     - `notes = f"Auto-generated C&F Service Purchase Bill against Claim #{claim.claim_number}"`
   - Linked to `RecoveryDocumentLink(document_type="PURCHASE_BILL", document_number=pur_bill_number, amount=claim.approved_amount)`.
3. **Purchase List Route & Ag-Grid Table**:
   - Direct route `/purchase/list` in `src/App.tsx` mapped to `PurchaseList.tsx`.
   - Inward bill is immediately searchable, verifiable, and editable in the purchase register.

### 31.5 Automated Selenium Verification Matrix
- **Test Suite**: `test_commission_recovery_selenium.py` (12 stages, 100% Exit Code 0).
- **Visual Proof**: `verified_commission_purchase_dual_post.png` capturing the Ag-Grid table on `/purchase/list` displaying `PUR-SRV-2026-XXXX`.

---

---

## 32. Enterprise Multi-Client Operations Tracking & Radar Engine (DOC-38)

### 32.1 Architectural Domain & Scope
The Enterprise Multi-Client Operations Tracking & Radar Engine (`AdminEnterpriseTracker.tsx`) is designed for holding corporations, parent administrators, and 3PL/C&F agencies who manage multiple distinct client companies (e.g., Krishna Medical Agencies, Test Org). It provides an executive-level single-pane-of-glass interface to monitor:
1. **Consolidated Financial Telemetry**: Aggregated gross sales turnover, operating expenses, in-transit logistics, and client product dealerships across all tenant organizations.
2. **Client-Specific Isolated Telemetry**: Dynamic filtering by specific `client_id` (from `models.Organization`), isolating revenue, expense claims, and cargo pipelines for a single client without data leakage.
3. **Client Operational Scorecards Matrix**: A multi-tenant comparative scorecard ranking clients by sales volume, transaction counts, expense claims, cargo shipments, and mapped product company brands (`CustomerProfile.company_ids`).

### 32.2 Database Schema & Model Associations
The tracking engine aggregates data across core relational tables:
- `models.Organization`: Tenant organization entity (`id`, `name`, `code`, `org_type`).
- `models.Invoice`: Sales invoices (`invoice_type="sales-bill"` or `"bill"`, `organization_id`, `grand_total`, `date`, `status`).
- `models.ExpenseClaim`: Operational expense claims (`organization_id`, `total_claimed_amount`, `status`, `claim_date`).
- `models.Consignment`: Cargo logistics consignments (`organization_id`, `consignment_number`, `status`, `origin_hub`, `destination_hub`, `vehicle_number`).
- `models.CustomerProfile`: Client customer profiles storing mapped manufacturer brands in `company_ids` JSON column.

### 32.3 RESTful API Reference (`/api/admin/tracking/*`)
Located in `backend/api/admin_tracker.py` and registered with prefix `/api/admin/tracking`:

| Method | Path | Query Parameters | Response Schema | Description & Invariants |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/admin/tracking/summary` | `client_id` (optional UUID), `date_preset` (optional: `TODAY`, `WEEK`, `MONTH`, `FY`, `ALL`) | `{status: "success", data: {total_sales_turnover, total_expenses, in_transit_cargo, delivered_cargo, total_clients, mapped_brands_count}}` | Computes high-level KPI scorecard. If `client_id` is supplied, filters aggregates strictly for that client company. |
| `GET` | `/api/admin/tracking/clients` | `search` (optional string) | `{status: "success", count: int, data: [{id, name, code, sales_turnover, invoices_count, expenses_total, active_cargo_count, mapped_companies: [...]}]}` | Multi-tenant comparative scorecard matrix computing per-client turnover, invoices count, operational claims, and active shipments. |
| `GET` | `/api/admin/tracking/sales` | `client_id` (optional), `limit` (default 50) | `{status: "success", count: int, data: [{id, invoice_number, date, customer_name, client_name, client_id, subtotal, tax_total, grand_total, status, items_count}]}` | Cross-client sales ledger displaying invoice metadata and client organization attribution tags. |
| `GET` | `/api/admin/tracking/expenses`| `client_id` (optional), `limit` (default 50) | `{status: "success", count: int, data: [{id, claim_number, claim_date, claimant_name, client_name, client_id, total_amount, approved_amount, status, category}]}` | Multi-client operational expense claims tracking C&F depot storage, salaries, freight recharges, and petty cash. |
| `GET` | `/api/admin/tracking/cargo` | `client_id` (optional), `limit` (default 50) | `{status: "success", count: int, data: [{id, consignment_number, client_name, client_id, transporter_name, origin_hub, destination_hub, vehicle_number, status, total_weight_kg}]}` | Cross-client cargo logistics pipeline tracking shipments from `PLANNED` to `IN_TRANSIT` and `DELIVERED`. |

### 32.4 Frontend Architecture & UI Component Catalog (`AdminEnterpriseTracker.tsx`)
- **Route & Access Points**:
  - Direct routes: `/admin/tracking` and `/tracking`.
  - Counter Workbench tile: `#hub-btn-admin-tracking` with hotkey `[Ctrl+6]`.
  - Client Management quick button: `#btn-open-multi-client-radar` on `/clients`.
  - Top navigation menu: `C&F & Logistics ▾` &rarr; `Admin Multi-Client Radar`.
- **Apex Bar Elements**:
  - Scope Selector (`#select-tracking-scope`): Toggles between `"ALL"` (Consolidated Multi-Client Radar) and individual client organizations.
  - Date Presets (`#btn-filter-today`, `#btn-filter-week`, `#btn-filter-month`, `#btn-filter-fy`): Dynamic date range filtering.
  - Search Input (`#input-tracking-search`): Client name and invoice filtering.
  - Refresh Button (`#btn-refresh-tracking`): Reloads all telemetry datasets.
- **4 Neumorphic Metric KPI Cards**:
  1. `#card-tracking-sales`: Total Sales Turnover (INR) with invoice volume indicator.
  2. `#card-tracking-expenses`: Total Operating Expenses & C&F Recharges (INR).
  3. `#card-tracking-cargo`: Cargo Consignments Pipeline with animated in-transit pulse.
  4. `#card-tracking-clients`: Active Client Companies & Authorized Product Brands.
- **4 High-Contrast Workspaces**:
  - `[F2] Client Scorecards` (`#tab-btn-scorecards`): Matrix table ranking clients with 1-click **Drilldown** (`#btn-drilldown-${client_id}`) scoping all tabs to that specific client.
  - `[F3] Sales Tracking` (`#tab-btn-sales`): Cross-client invoice ledger with client name badge, customer, date, amount, and items count.
  - `[F4] Expenses Tracking` (`#tab-btn-expenses`): Multi-client operational expense claims with status badges (`APPROVED`, `PAID`, `SETTLED`).
  - `[F6] Cargo Tracking` (`#tab-btn-cargo`): Logistics board with vehicle numbers, transporter, route hubs, and live shipment status.
  - `[Esc]` Hotkey: Universally returns operator to Counter Workbench (`/`).

### 32.5 Automated Selenium Verification Runbook
- **Script**: `test_admin_enterprise_tracking_selenium.py` (12 stages, Exit Code 0).
- **Verified Assertions**:
  1. Stage 1: Authenticates as `admin` and verifies admin permissions.
  2. Stage 2: Direct backend API validation of `/summary`, `/clients`, `/sales`, `/expenses`, `/cargo`.
  3. Stage 3-5: Counter Workbench `[Ctrl+6]` tile launch, Apex bar rendering, and 4 KPI cards.
  4. Stage 6-8: Client Scorecards matrix table, 1-click drilldown into *KRISHNA MEDICAL AGENCIES*, and scope banner verification.
  5. Stage 9-11: Sales ledger client attribution, Expense claims tracking, and Cargo logistics pipeline.
  6. Stage 12: `[Esc]` return navigation to Counter Workbench.

---

## 33. Responsive Top Navigation Architecture & High-Density Screen Ergonomics (DOC-39)

### 33.1 Ergonomic Problem Analysis & Viewport Constraints
On standard enterprise laptop screens (1366x768 and 1440x900 viewports), the top navigation bar previously rendered 13+ raw top-level menu buttons. This caused severe horizontal overflow:
- Rightmost options (CRM, Admin, Reports) were clipped or pushed below the visible viewport.
- Submenu dropdowns overflowed past the right viewport boundary.
- Mobile/tablet views lacked a structured taxonomy.

### 33.2 The 10-Item Non-Overflow Taxonomy (`Header.tsx`)
The top bar was refactored into **10 streamlined, non-overflowing categories** occupying exactly 1422px within standard desktop viewports:

```
+--------------------------------------------------------------------------------------------------------------------+
| [Logo] Dashboard | Master v | Finance v | Inventory v | Sales & Purchase v | C&F & Logistics v | Workflows [F4] v | ...|
+--------------------------------------------------------------------------------------------------------------------+
```

1. **Dashboard** (`/`): Direct route to Counter Workbench.
2. **Master ▾**: Ledger, Masters (Business Partners, Companies, HSN, Warehouses, Document Series).
3. **Finance & Accounting ▾**: Payment, Receipt, Journal, Contra, Day Book, Bank Reconciliation, Trial Balance, P&L, Balance Sheet.
4. **Inventory ▾**: Product (Create/Modify), Current Stock, Claims & Replenishment.
5. **Sales & Purchase ▾**: Nested dual menus for Sale, Purchase, Sale Return, Purchase Return, Brk/Exp, GST Vouchers.
6. **C&F & Logistics ▾**: Consolidated operational sub-menu:
   - `Principal & C&F Operations` (`/principal`)
   - `C&F Commission & Recovery Engine` (`/commission`)
   - `Admin Multi-Client Radar` (`/admin/tracking`)
   - `---`
   - `Cargo & Consignment Board` (`/cargo`)
   - `Freight Contracts & Rates` (`/freight/contracts`)
   - `Transporter Reconciliation` (`/freight/reconciliation`)
   - `Cargo Cost Allocation Center` (`/cargo/costs`)
   - `POD & Transit Exception Desk` (`/cargo/pod-exceptions`)
7. **Workflows [F4] ▾**: Approval Inbox (`[F4]`), Rule Designer, SLA Monitor, Audit Trail Explorer (`/audit`), Data Governance Console (`/audit/governance`).
8. **GST & Compliance ▾**: GSTR-1, GSTR-2, GSTR-3B, E-Invoicing & E-Way Bill Desk (`/compliance`).
9. **CRM & Admin ▾**: CRM Dashboard, Client Management (`/clients`), Admin Multi-Client Radar (`/admin/tracking`), Product Companies Master (`/master/companies`), Bulletin Board, Settings.
10. **Reports ▾**: Report Viewer (`/reports`), Report Designer (`/reports/designer`).

### 33.3 Zero-Mouse Keyboard Trapping & Accessibility Architecture
- **Opening Dropdowns**: Pressing `Enter` or `ArrowDown` on any top menu item opens the child menu and sets focus to index 0.
- **Vertical Navigation**: `ArrowDown` and `ArrowUp` cycle through items, automatically skipping divider rows (`isSeparator: true`).
- **Sub-Menu Trapping**: `ArrowRight` opens child sub-menus (e.g. Sales & Purchase sub-items); `ArrowLeft` returns focus to parent.
- **Escape Dismissal**: Pressing `Escape` closes all open popovers and returns focus cleanly to the originating main header button.
- **Route Active Highlighting**: Matches `location.pathname` to highlight the active menu parent with deep forest green styling (`bg-[#143627] text-white`).

---

## 34. Client Management C&F Commission & Expense Reimbursement Billing Engine with Bilateral Inward/Outward Dual-Posting (DOC-40)

### 34.1 Architectural Domain & Business Context
When the Main Admin Company operates as a Carrying & Forwarding (C&F) Agent for a pharmaceutical client company registered in Client Management (e.g. *KRISHNA MEDICAL AGENCIES*), commercial billing requires a bilateral dual-posting mechanism:
1. **Outward Commercial Bill (Main Admin Ledger)**:
   - The Admin agency bills the client for **Sales Commission** (e.g., 5.0% on gross sales turnover) plus **Reimbursable Operating Expenses** (godown storage rent, dedicated staff salaries, inward/outward freight recharges, cargo handling charges).
   - Classified under GST Service Accounting Code **SAC 998599 (Other Support Services / C&F Services)** with configurable GST rate (default 18%).
   - Serialized as `models.Invoice` with `invoice_type="bill"` (e.g., `CF-BILL-2026-0002`).
2. **Inward Purchase Bill (Client Organization Ledger)**:
   - In standard ERPs, the client company would have to manually key in an inward purchase invoice to record the C&F expense.
   - Our **Automated Dual-Posting Engine** eliminates manual re-entry: it atomically creates an inward purchase bill (`models.Invoice` with `invoice_type="purchase-bill"`, e.g., `PUR-CF-2026-0002`) directly inside the client organization's database partition (`organization_id = client_org.id`).
   - Ensures both corporate entities' financial accounts balance simultaneously without reconciliation discrepancies.
3. **Audit Ledger & Claim Batching**:
   - Generates deterministic `models.CommissionCalculation` records parented to `models.CommissionEvent`.
   - Links inward and outward documents to `models.RecoveryClaim` via bilateral `models.RecoveryDocumentLink` entries.
   - Logs an immutable `models.CommissionAudit` audit trail record.

### 34.2 Database Schema & Model Definitions
```python
# Outward Bill (Main Admin) & Inward Bill (Client Org)
models.Invoice(
    id=uuid.uuid4(),
    organization_id=org_id,           # Main Admin for outward bill; Client Org for inward purchase bill
    invoice_type="bill" | "purchase-bill",
    invoice_number="CF-BILL-YYYY-XXXX" | "PUR-CF-YYYY-XXXX",
    date=datetime.utcnow(),
    customer_name=party_name,
    party_inv_no=ref_number,
    due_date=due_date_str,
    subtotal=subtotal_amount,
    tax_total=gst_amount,
    grand_total=total_payable,
    is_active=True
)

# Itemized Service Line Items
models.InvoiceItem(
    id=uuid.uuid4(),
    invoice_id=invoice.id,
    product_name="C&F Sales Commission" | "Godown Storage" | "Staff Salary" | "Freight Recharge",
    quantity=1,
    rate=line_amount,
    line_total=line_amount,
    igst_percent=tax_rate
)

# Parent Commission Event
models.CommissionEvent(
    id=uuid.uuid4(),
    company_id=current_user.organization_id,
    principal_id=principal_id,
    event_type="SALES_BILL",
    event_date=datetime.utcnow(),
    source_doc_type="INVOICE",
    source_doc_id=outward_bill_no,
    idempotency_key=f"CF-BILL-EVT-{outward_bill_no}-{uuid.uuid4().hex[:8]}",
    payload_json={...}
)

# Deterministic Calculations with SHA-256 Hashes
models.CommissionCalculation(
    id=uuid.uuid4(),
    calculation_number="CALC-CF-YYYY-XXXX",
    event_id=comm_evt.id,
    principal_id=principal_id,
    principal_name=principal_name,
    client_id=client_org.id,
    client_name=client_org.name,
    category="EARNED_COMMISSION" | "RECOVERABLE_EXPENSE",
    event_type="SALES_BILL" | "EXPENSE_RECOVERY",
    base_value=turnover_or_expense,
    rate_applied=rate_pct,
    calculated_amount=line_amount,
    currency="INR",
    formula_trace=json_trace_str,
    state="APPROVED",
    sha256_hash=computed_hash
)

# Recovery Claim Package
models.RecoveryClaim(
    id=uuid.uuid4(),
    company_id=current_user.organization_id,
    principal_id=principal_id,
    principal_name=principal_name,
    claim_number="CLM-REC-YYYY-XXXX",
    period_from=start_dt,
    period_to=end_dt,
    total_earned_commission=comm_amt,
    total_recoverable_expenses=expenses_total,
    total_claimed_amount=subtotal,
    approved_amount=subtotal,
    disputed_amount=0.0,
    status="APPROVED"
)
```

### 34.3 RESTful API Reference (`/api/commission/*`)
| Method | Path | Request Body / Query | Response Schema | Description & Invariant Impact |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/commission/clients/{client_org_id}/telemetry` | Path: `client_org_id` | `{status: "success", data: {client_org_id, client_name, sales_turnover, commission_rate_percent, suggested_commission_amount, godown_rent_amount, staff_salary_amount, freight_reimbursement_amount, invoices_count}}` | Queries actual sales turnover and operating expenses for the selected client organization from PostgreSQL. |
| `POST` | `/api/commission/generate-client-bill` | `GenerateClientCommissionBillRequest` | `{status: "success", message: str, data: {outward_bill_id, outward_bill_no, inward_bill_id, inward_bill_no, client_name, sales_turnover, commission_amount, expenses_reimbursement, subtotal, tax_total, grand_total, claim_number}}` | Generates Outward C&F Service Bill in Main Admin and atomically dual-posts Inward Purchase Bill in Client Organization partition. |
| `GET` | `/api/commission/client-bills` | None | `{status: "success", count: int, data: [{id, invoice_number, date, customer_name, subtotal, tax_total, grand_total, inward_bill_no, items_count}]}` | Returns historical audit register of all generated client commission and reimbursement bills with dual-post references. |

### 34.4 UI Element & Selector Directory (`CommissionControlCenter.tsx`)
- **Navigation**:
  - Tab Button: `#tab-btn-client-billing` with keyboard hotkey `[F5]`.
  - Header Title: `C&F Client Commission & Expense Billing Desk`.
- **Controls & Input Fields**:
  - Client Selector: `#client-billing-org-select` (Lists all organizations from `GET /api/organizations`).
  - Auto-Fetch Button: `#btn-autofetch-client-telemetry` (Triggers `/telemetry` and populates live notice `#client-billing-notice`).
  - Sales Turnover Base: `#input-billing-turnover`.
  - Commission Rate %: `#input-billing-comm-rate`.
  - Calculated Commission Override: `#input-billing-comm-amount`.
  - Godown Storage Rent: `#input-billing-rent`.
  - Depot Staff Salaries: `#input-billing-salary`.
  - Transport / Freight Reimbursement: `#input-billing-freight`.
  - Cargo Handling Charges: `#input-billing-handling`.
  - Other Ancillary Expenses: `#input-billing-other`.
  - Credit Due Days: `#input-billing-due-days`.
  - Tax Rate Selector: `#select-billing-tax-rate` (18%, 12%, 5%, 0%).
- **Dual-Posting Controls**:
  - Checkbox: `#check-dual-post-purchase` (Dual-post directly to Client's Inward Purchase Register).
  - Submit Button: `#btn-generate-client-bill` ("⚡ Generate & Post C&F Service Bill to Billing").
- **Generated Bill Success Card (`#generated-bill-success-card`)**:
  - Displays Outward Bill Number, Inward Client Purchase Bill Number, and Claim Reference.
  - `#btn-goto-outward-billing`: Quick link to Billing Desk (`/billing`, `[F7]`).
  - `#btn-goto-inward-purchase`: Quick link to Purchase Register (`/purchase/list`, `[F9]`).
- **Historical Register Table**:
  - Ag-Grid/HTML table showing Bill Number, Date, Client Company, Subtotal, GST, Grand Total, Dual Purchase Ref, and direct navigation actions.

### 34.5 Automated Selenium Verification Runbook
- **Script**: `test_client_commission_billing_selenium.py` (13 stages, Exit Code 0).
- **Verified Assertions**:
  1. Stage 1-2: Admin authentication and backend telemetry API verification for *KRISHNA MEDICAL AGENCIES*.
  2. Stage 3-5: Headless Chrome launch, 10-item top bar non-overflow verification (1422px in 1422px window), and C&F dropdown interaction.
  3. Stage 6-8: Navigation to `/commission`, switching to `[F5] Client C&F Billing Desk` tab, and selecting *KRISHNA MEDICAL AGENCIES*.
  4. Stage 9-10: 1-click Auto-Fetch verification (Turnover ₹12,50,000, Commission ₹62,500, Expenses ₹51,000) and manual adjustment of storage rent to ₹22,000.
  5. Stage 11-12: Submitting bill generation and asserting `#generated-bill-success-card` containing outward bill `CF-BILL-2026-0002` and inward purchase bill `PUR-CF-2026-0002`.
  6. Stage 13: Database persistence verification confirming dual bills exist across both organizations via `GET /api/commission/client-bills`.

---

## 35. DOC-41: Pharma Expiry Radar, Stock Shift Quarantine Engine & Principal Debit Note Settlement Desk

### 35.1 Architectural Blueprint & Purpose
In pharmaceutical distribution and C&F logistics, batch shelf-life surveillance and damaged/expired stock disposition are mission-critical. DOC-41 replaces prototype mock data in `InventoryDashboard.tsx` and static alerts in `StockShiftVoucher.tsx` with a production-grade, transactional engine that:
1. **Surveils Shelf-Life in Real-Time**: Scans active stock batches and classifies them into actionable risk buckets: 🔴 Expired ($\le 0$ days), 🟠 Critical ($\le 30$ days), 🟡 Warning ($\le 60$ days), and 🔵 Attention ($\le 90$ days).
2. **Executes Atomic Stock Shift Reallocation**: Transfers stock from `MAIN_SALEABLE_GODOWN` to `QUARANTINE_EXPIRY_GODOWN` atomically decrementing `Batch.current_stock` and incrementing `Batch.brk_exp_stock`.
3. **Bridges Seamlessly into Principal Claims**: Generates an official `PrincipalClaim` (`CLM-PRN-YYYY-XXXX`) and itemized `PrincipalClaimLine`s in the Principal Claims Desk (`/principal`), auto-calculating recovery amounts and recording auditable debit note references.

### 35.2 Database Schema (`backend/models.py`)
- **`StockShiftVoucher` (`stock_shift_vouchers`)**:
  - `id` (UUID, Primary Key)
  - `organization_id` (UUID, ForeignKey to `organizations.id`, indexed)
  - `voucher_no` (String(50), indexed, unique per organization, e.g. `SHF-2026-0001`)
  - `shift_date` (DateTime, default `utcnow`)
  - `from_godown` (String(100), default `'MAIN_SALEABLE_GODOWN'`)
  - `to_godown` (String(100), default `'QUARANTINE_EXPIRY_GODOWN'`)
  - `reason` (String(255), default `'Pharma Expiry & Damaged Stock Quarantine'`)
  - `company_id` (UUID, nullable)
  - `principal_id` (UUID, nullable)
  - `total_items` (Integer, count of items shifted)
  - `total_qty` (Numeric(12, 2), aggregate quantity shifted)
  - `total_value` (Numeric(12, 2), aggregate valuation at batch purchase cost rate)
  - `auto_claim_generated` (Boolean, default `False`)
  - `principal_claim_id` (UUID, ForeignKey to `principal_claims.id`, nullable)
  - `status` (String(30), default `'COMPLETED'`)
  - `created_at` (DateTime, default `utcnow`)
  - Relationships: `items` (1-to-many with `StockShiftItem`), `principal_claim` (many-to-1 with `PrincipalClaim`).

- **`StockShiftItem` (`stock_shift_items`)**:
  - `id` (UUID, Primary Key)
  - `voucher_id` (UUID, ForeignKey to `stock_shift_vouchers.id`, ondelete='CASCADE')
  - `product_id` (UUID, ForeignKey to `products.id`)
  - `product_name` (String(255))
  - `batch_id` (UUID, ForeignKey to `batches.id`)
  - `batch_number` (String(100))
  - `expiry` (String(50))
  - `qty` (Integer, quantity shifted)
  - `rate` (Numeric(12, 2), cost / valuation rate)
  - `value` (Numeric(12, 2), qty $\times$ rate)
  - `mrp` (Numeric(12, 2))
  - `created_at` (DateTime, default `utcnow`)
  - Relationships: `voucher`, `product`, `batch`.

### 35.3 Backend API Endpoints (`backend/api/stock.py`)
- **`GET /api/stock/expiry-cockpit-telemetry`**:
  - Returns real-time aggregate KPIs:
    - `main_stock_val` & `main_stock_units`: Healthy sellable stock in `current_stock`.
    - `brk_exp_stock_val` & `brk_exp_stock_units`: Quarantined stock in `brk_exp_stock`.
    - `expired_count` & `expired_val`: Stock with expiry date $\le$ current month.
    - `near_30_count`, `near_60_count`, `near_90_count` and respective valuations.
    - `total_near_expiry_count` & `total_near_expiry_val`: Combined risk exposure across 90-day window.
    - `pending_claims_count` & `pending_claims_val`: Active pending claims in `principal_claims`.
    - `recent_shifts`: Last 5 shift vouchers with voucher number, date, items, qty, and claim reference.

- **`GET /api/stock/expiry-radar-batches`**:
  - Query parameters: `bucket` (`ALL`, `EXPIRED`, `30_DAYS`, `60_DAYS`, `90_DAYS`), `company_id` (optional), `search` (optional).
  - Returns itemized list of batches sorted by `days_to_expiry` ascending (most urgent first) with status tag, days left, current stock, rate, and valuation.

- **`POST /api/stock/shifts`**:
  - Request Payload:
    ```json
    {
      "voucher_no": "SHF-2026-0001",
      "shift_date": "2026-10-17",
      "from_godown": "MAIN_SALEABLE_GODOWN",
      "to_godown": "QUARANTINE_EXPIRY_GODOWN",
      "reason": "Pharma Expiry & Damaged Stock Quarantine",
      "principal_id": "11111111-1111-1111-1111-111111111111",
      "auto_create_principal_claim": true,
      "items": [
        {
          "batch_id": "97e6be95-0728-444a-a2ae-c5598642a8b9",
          "product_id": "a9fb9cf6-928d-4cb0-a887-a3922c199587",
          "qty": 148,
          "rate": 30.91
        }
      ]
    }
    ```
  - Execution Flow:
    1. Validates each batch exists and has sufficient `current_stock >= item.qty`.
    2. Decrements `batch.current_stock -= item.qty` and increments `batch.brk_exp_stock += item.qty`.
    3. Creates `StockShiftVoucher` and `StockShiftItem` records.
    4. If `auto_create_principal_claim` is True: Generates `PrincipalClaim` (`CLM-PRN-YYYY-XXXX`) with `claim_type='EXPIRY'`, `source_doc_type='STOCK_SHIFT'`, `claimed_amount=total_value`, and creates `PrincipalClaimLine`s.
    5. Commits transaction and returns voucher details and claim reference.

- **`GET /api/stock/shifts`**:
  - Lists historical shift vouchers with pagination and linked principal claim details.

- **`GET /api/stock/shifts/{id}`**:
  - Returns detailed shift voucher including line items and claim data.

### 35.4 Frontend Components & User Interface Architecture
1. **`InventoryDashboard.tsx` (`/inventory-dashboard`, `/inventory/dashboard`)**:
   - Header with quick shortcuts: `[F5] Refresh`, `[F7] Stock Shift`, `[F8] Principal Claims Desk`.
   - 4 Dynamic Scorecards:
     - `#card-main-stock`: Live Main Stock Value and Healthy Units count.
     - `#card-quarantine-stock`: Live Quarantine Godown Value and Quarantined Units count.
     - `#card-near-expiry-risk`: Live Near-Expiry Surveillance Value and Risk Batches count.
     - `#card-claim-exposure`: Live Principal Claims Exposure and Pending Claims count.
   - 3 Primary Tabs:
     - `[F2] Expiry Radar`: Filter buttons (`#filter-bucket-ALL`, `#filter-bucket-EXPIRED`, `#filter-bucket-30_DAYS`, `#filter-bucket-60_DAYS`, `#filter-bucket-90_DAYS`), manufacturer dropdown (`#filter-company-select`), search input (`#search-batches-input`), batch selection checkboxes, and `[F7] Shift to Quarantine` button (`#btn-shift-selected-action`).
     - `[F3] Quarantine Godown Stock`: Quarantined stock breakdown with direct `#btn-file-principal-claim-quarantine`.
     - `[F4] Stock Shift Audit Register`: Historical audit table (`#tbl-shift-audit`) showing voucher number, date, from/to godowns, item count, valuation, and linked `CLM-PRN-XXXX` tag.

2. **`StockShiftVoucher.tsx` (`/stock-shift`)**:
   - Pre-populates batches passed from `InventoryDashboard` via React Router `state`.
   - Date picker (`#input-shift-date`) and voucher number (`#input-shift-voucher-no`).
   - Source Godown selector (`#select-from-godown`) and Destination Godown selector (`#select-to-godown`).
   - Auto-Claim Toggle (`#check-auto-claim`) and Target Principal selector (`#select-principal-claim-target`).
   - Candidate Auto-Fill filters (`#filter-expiry-mmyy`, `#filter-shift-company`, `#btn-auto-load-candidates`).
   - Real-time stock validation (prevents shifting more than available stock).
   - Save button (`#btn-save-shift-voucher`) calling `POST /api/stock/shifts`.
   - Rendered **Success Card** (`#stock-shift-success-card`) displaying generated Voucher No (`#lbl-success-voucher-no`), generated Claim No (`#lbl-success-claim-no`), and navigation buttons to Audit Register (`#btn-view-in-audit`, `[F2]`) and Principal Claims Desk (`#btn-view-claim-desk`, `[F8]`).

### 35.5 Automated Selenium Verification Runbook
- **Script**: `test_pharma_expiry_quarantine_selenium.py` (13 stages, Exit Code 0).
- **Verified Assertions**:
  1. Stage 1-2: Admin authentication and telemetry API verification (`GET /api/stock/expiry-cockpit-telemetry` returning 105,228 units, ₹1,80,39,497.67).
  2. Stage 3-5: Headless Chrome launch, navigation to `/inventory-dashboard`, verification of title and `DOC-41 ENTERPRISE` badge.
  3. Stage 6: Telemetry scorecards verification and screenshot capture (`verified_pharma_expiry_cockpit.png`).
  4. Stage 7: Expiry Radar table and filter bucket clicks (`verified_expiry_radar_batches.png`).
  5. Stage 8-9: Multi-selecting batch B8887 (Volini SR, 148 units, Exp 09/26) and clicking `#btn-shift-selected-action`.
  6. Stage 10: Navigation to `/stock-shift`, verifying godowns, auto-claim toggle, and pre-filled line items (`verified_stock_shift_voucher.png`).
  7. Stage 11-12: Submitting voucher, asserting `#stock-shift-success-card` containing voucher `SHF-2026-0001` and principal claim `CLM-PRN-2026-0006` (`verified_stock_shift_claim_success.png`).
  8. Stage 13: Verifying audit table entry, quarantine ledger update (+148 units = 303 units, ₹41,799) (`verified_quarantine_stock_ledger.png`), and verifying claim in `/principal` (`verified_principal_claim_from_shift.png`).

---

*End of Developer Manual.*

