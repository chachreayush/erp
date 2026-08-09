# ERP Software — Core Workflows & User Manual

Welcome to your ERP system's User Manual. This document is written in plain business language (zero code) to serve as a guide for you, your staff, and as a shared canvas between you and the AI developer. 

You can read this to understand how the software works, and you can edit this file to add notes, request changes, or explain specific business rules to me.

---

## 1. Core Principles & Business Benefits

Our ERP is designed around three main pillars:

1. **Keyboard-First Speed (Mouse-Free Operation):**
   * **The Goal:** In retail, wholesale, and pharmaceutical distribution, speed is money. Operators cannot afford to reach for a mouse during a rush.
   * **How it works:** The entire software is navigable via keyboard. You can jump through menus with arrow keys, open options with **Enter**, close or back out with **Escape**, and quickly type line items.
2. **Offline-First / LAN Stability:**
   * **The Goal:** Internet connections can be unstable. A billing counter must never stop working due to a slow internet connection.
   * **How it works:** The software runs directly on your local network (LAN) for lightning speed and offline operation. It automatically syncs to the cloud when internet is available.
3. **Strict Stock Separation (Saleable vs. Non-Saleable):**
   * **The Goal:** Damaged, expired, or broken goods must never be accidentally sold to a customer, but they must still be tracked for accounting claims.
   * **How it works:** System keeps separate records for active warehouse stock and damaged/expired items (Breakage/Expiry).

---

## 2. Main Navigation Directory

All options are available in the **Top Navigation Bar** of the software. You can navigate them using the **Left** and **Right** arrow keys.

| Menu Option | Purpose | Key Actions |
| :--- | :--- | :--- |
| **Dashboard** | Overview of business performance. | View quick stats like today's total sales, active alerts. |
| **Finance & Accounting** | Core company accounts, ledgers, and balances. | Add new bank/cash accounts, check ledger entries. |
| **Inventory** | Management of items, products, and prices. | Add items, define tax rates, update pricing tiers. |
| **Sales & Purchase** | The transactional engine (Invoicing, Buying, Returns). | Create bills, challans, orders, returns (details below). |
| **CRM** | Customer management. | View customer contact details, outstanding credits. |
| **HR Management** | Staff accounts and permissions. | Manage employee logins and access roles. |
| **Reports** | Analytics and GST tax statements. | Generate sales registers, inventory audit reports. |
| **Settings** | Configuration and theme picker. | Change themes (e.g., Marg classic layout), configure printers. |

---

## 3. Detailed "Sales & Purchase" Menu (Flyout Options)

Selecting **Sales & Purchase** opens a dropdown. Pressing **ArrowRight** on an item opens its sub-options.

### 📊 SALE (Customer Facing)
* **Bill:** Standard sales invoice. Creates a permanent tax invoice, registers the sale, and deducts items from active stock.
* **Challan:** Temporary dispatch sheet. Confirms delivery/shipment of items to a customer *before* raising the final bill.
* **Modify Bill:** Search, edit, reprint, or cancel existing sales bills.
* **Modify Challan:** Search and convert delivery challans into final bills.

### 📥 PURCHASE (Supplier Facing)
* **Purchase Bill:** Logs goods bought from a supplier. Adds items into active inventory and updates what you owe the supplier.
* **Purchase Challan:** Logs temporary goods received from a supplier before the invoice arrives.
* **Modify Purchase:** Edit or view past purchase entries.
* **Modify Purchase Challan:** Review temporary supplier receipts.

### 🔄 RETURNS & ADJUSTMENTS
* **Sale Return:** Customer returns active, good-quality items.
  * *Options:* Credit Note, Challan, Modify Credit Note, Modify Challan.
  * *Result:* Adds goods back to active saleable stock; reduces customer's balance.
* **Purchase Return:** You return active, good-quality items back to a supplier.
  * *Options:* Debit Note, Challan, Modify Debit Note, Modify Challan.
  * *Result:* Removes goods from active stock; reduces what you owe the supplier.
* **Brk/Exp Receive:** Expired or broken goods returned by customers.
  * *Options:* Receive Entry, Challan, Modify Entry, Modify Challan.
  * *Result:* Puts returned items in a **Non-Saleable Expiry bucket** (safe from being sold). Updates customer's balance/refund.
* **Brk/Exp Issue:** Expired or broken goods you return to manufacturers for replacement/credit.
  * *Options:* Issue Entry, Challan, Modify Entry, Modify Challan.
  * *Result:* Deducts items from the Non-Saleable bucket and sends a claim note to the manufacturer.

### ⚙️ SPECIAL ENTRIES & STOCK MOVEMENTS
* **GST Inward (Expenses):** Register office expenses, rent, or supplies where you want to claim GST input tax credit.
* **GST Outward (Services):** Raise bills for services rendered rather than physical products.
* **Stock Issue:** Remove stock from inventory for self-use, testing, or internal transit.
* **Stock Receive:** Add stock from external adjustments or manual corrections.
* **Sales Order:** Create booking orders for customers before generating bills or shipping.

---

## 4. Business Workflow: The Lifecycle of an Item

To keep inventory and accounts correct, items move through the software in a specific order:

```
[Define Item in Inventory] ──> [Purchase Bill (Adds to active Stock)]
                                      │
                                      ▼
                        [Sales Bill (Sells active Stock)]
                                      │
              ┌───────────────────────┴───────────────────────┐
              ▼                                               ▼
     [Active Sale Return]                           [Breakage/Expiry Receive]
   (Adds back to active stock)                     (Puts in non-saleable bucket)
                                                              │
                                                              ▼
                                                     [Breakage/Expiry Issue]
                                                  (Ships back to manufacturer)
```

---

## 5. User Notes & Custom Explanations (Your Workspace)

*Use this section to write down notes, explain how a particular option should behave in your shop/warehouse, or define rules you want me (the AI) to build next.*

### 📝 Write your instructions here:
1. *(Example: "In our pharmacy, Brk/Exp Receive must always deduct 10% value if the product is expired more than 6 months...")*
2. 
3. 

---

## 3. Organizations (CM Clients) & Multi-Tenancy Updates

### Backend Alignment (ackend/api/organizations.py)
- The system enforces a strict Multi-Tenant architecture. 
- The top-level hierarchy for all Client Master (CM) environments is officially named **Organizations**.
- All data records (products, sales, ledgers) are isolated by organization_id.
- The pi/organizations.py router exclusively handles fetching organizations and registering new client databases with their CM Admin accounts.

### Frontend Alignment (src/pages/admin/ClientManagement.tsx)
- The Client Management dashboard has been refactored to align with the backend Organizations terminology.
- ClientCompany interfaces were replaced with Organization interfaces containing org_code.
- **Impersonation**: The handleSwitchToClient action successfully exchanges an AM Admin token for a CM Admin token by dispatching 	arget_org_id to /auth/impersonate.


### Update 2026-07-31
- Master Data Setup: Ledgers and Tax codes are fully wired and saving to the database.
- Memory Log: Implemented a persistent memory file (PROJECT_MEMORY.md) to maintain perfect context across sessions.

### Feature Updates (August 2026)
- The F3 Batch Modal now hides zero-quantity batches by default. To view them, press the **ArrowUp** key when selecting the topmost batch.
- Each transaction type (Sales Bill, Challan, Purchase, Brk/Exp, GST) now maintains an independent auto-incrementing Entry No series (e.g. S0001, CRN0001). The system automatically prevents you from creating duplicates.

### August 2026 - Purchase Module & Batch System Integration
- **Batch Master Architecture:** The database now explicitly tracks Batch entities linked to products. Every batch holds precise values for atch_number, expiry, mrp, ate, ate_a, ate_b, ate_c, cost, and current_stock.
- **Purchase Module Inwarding:** Saving a Purchase Bill now automatically generates or updates master Batch records.
- **Sales Module Alignment:** The Sales Grid (F3 Batch Modal) now directly queries the live Batch table and dynamically syncs MRP, Rate, and Expiry based on the selected batch, ensuring perfect parity between outward flows and real batch data.
- **Current Stock:** The Current Stock calculation engine was rewritten to aggregate active Batch.current_stock records rather than relying on legacy invoice tallies, providing true real-time inventory precision.
- **Strict DB Fetching:** Removed local storage caching from Products.tsx, enforcing the frontend to display exactly what exists in the PostgreSQL backend.
