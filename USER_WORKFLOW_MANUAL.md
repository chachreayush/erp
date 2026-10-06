# User Workflow & Navigation Manual — Modern ERP

Welcome to the ERP Software suite. This comprehensive manual details the end-to-end user workflows, keyboard shortcuts, and interface operations.

---

## 1. Authentication & Tenant Access
1. **Login Credentials**:
   - **Company Code**: Your unique organization identifier (e.g. `AM-0001` or `MUM-6135`).
   - **Username**: Admin or assigned staff username.
   - **Password**: Secure account password.
2. **Brute Force Protection**: Failed attempts are restricted by automated rate-limiting guards.
3. **Multi-Tenant Isolation**: Once logged in, your workspace is strictly restricted to your company's data.

---

## 2. Landscape Dashboard Operations (`/`)
- **Horizontal Split Screen**: The main home screen displays all module navigation on the left and the company **Bulletin Board** on the right.
- **No-Scroll Design**: All options and announcements are visible immediately upon login without scrolling.
- **Posting Announcements**: Authorized managers can click `+ Post New Bulletin` to publish company notices, holiday announcements, and urgent alerts.

---

## 3. High-Speed Billing & Invoicing (`/sales`, `/purchase`)

### Full-Screen Mode
Entering the **Sales Bill** or **Purchase Bill** automatically hides the top navigational header to grant 100% of your screen estate to data entry. To exit back to the Home Dashboard at any time, press **`Escape`**.

### Standard Keyboard Billing Flow:
1. **Header Entry**:
   - **Entry No**: Automatically increments or allows custom series entry. Press `Enter`.
   - **Party Name**: Press `Enter`, `Space`, or `F7` to open the search modal. Select the Sundry Creditor/Debtor with arrow keys and press `Enter`.
   - **Invoice Date / Tax Type / Entry Date**: Flow smoothly through dates with `Enter` / `Tab`.
2. **Product Grid Entry**:
   - **Product Search**: Press `Enter` or `Space` on the `#` or `PRODUCT` field to open the product catalog search modal.
   - **Batch Selection**: Press `F3` or `Enter` on the `BATCH` column to open the batch selection window.
   - **Expiry Date**: Enter in `MM/YY` format.
   - **Quantity & Free**: Input billed quantity and any bonus/free stock.
   - **Extra Scheme (`EXTRA SCHEM`)**: Input additional trade scheme quantities.
   - **Purchase Rate / Discount**: Enter unit rates and line item discounts.
   - **Moving to Next Row**: Pressing `Enter` at the end of a line immediately shifts focus to the next product row.
3. **Finalizing & Saving**:
   - Press **`End`** or **`Tab`** to jump directly to the **Discount (±)** and Ledger adjustment fields.
   - Press **`Ctrl + S`** or click **`SAVE (End / Ctrl+S)`** to commit the invoice to the live cloud database.

---

## 4. Inventory, Stock & Batch Ledger (`/stock`, `/inventory`)

### Real-Time Current Stock
- View all products and quantities grouped across active batches.
- Zero-stock items are preserved in the list for reorder planning.

### Product Stock Register
- Click any product in the stock table and select **Register** to inspect a full chronological ledger of all stock inwards, outwards, invoice references, and running balances.

### Breakage & Expiry Management
- Record **Brk/Exp Receive** and **Brk/Exp Issue** vouchers.
- Broken or expired goods are strictly quarantined in isolated breakage stock tracking registers and do not contaminate saleable stock.

---

## 5. Master Data Setup (`/master`)
- **Ledgers**: Add suppliers, customers, bank accounts, and expense heads.
- **Manufacturers / Companies**: Register pharmaceutical companies and suppliers.
- **Salts / Molecules**: Register chemical drug compositions.
- **HSN Codes & State Codes**: Manage GST percentages and interstate tax mappings.

---

## 6. Live Cloud & Vercel Synchronization
- Local offline data caches have been unified with live PostgreSQL cloud endpoints.
- Any invoice, ledger, or product saved from the desktop Tauri app or local browser is instantaneously synchronized and viewable across Vercel cloud deployments.


### [Update: 2026-09-01]
#### New Workflows & Features
1. **Smart MRP Configuration**
   - **Access**: Navigate to Inventory > Products, click the Smart MRP button.
   - **Workflow**: The system scans past sales and suggests new Minimum Stock and Reorder quantities.
2. **Global Search**
   - **Access**: Click the Search bar in the top navigation or press Ctrl + K.
   - **Workflow**: Type any module name (e.g., Sale, Ledger) to instantly navigate to it.
3. **Enhanced Sales Bill Workspace**
   - The billing screen now utilizes the full monitor width.
   - A **Live Intelligence Panel** on the right side provides instant details on the selected party balance and the currently highlighted product MRP, Stock, and Margins.

### [Update: 2026-09-06]
#### Finance & Accounting Upgrades
1. **Fully Automated Ledger Posting**
   - **Workflow**: When you save a Sales or Purchase Bill, the system automatically posts the corresponding accounting Voucher (Journal).
   - The Ledger Statement for parties (e.g. Cipla Pharmaceuticals) now instantly reflects the debit/credit amounts of all sales and purchases.
2. **Ledger Statement & Day Book Revamp**
   - **Access**: Navigate to Finance > Ledger Statement.
   - **Workflow**: Select a Party from the dropdown, adjust the From/To Dates, and click Load. The system calculates true Opening Balances based on the Fiscal Year and renders a running balance on each row.
   - All historical bills have been successfully recovered and retroactively posted into the new accounting ledger.


### Dashboard Updates (2026-09-08)
The new Admin Dashboard features a highly visual, data-first approach:
- Top 4 Cards: Finance Hub, Supply Chain, Human Capital, Projects & Tasks.
- Middle Section: Auto-scaling Geographic Sales Map.
- Bottom Section: Platform Alerts (Severity/Warning indicators) and Global Stats with trend lines.

## [Update - DOC-14 & DOC-15 Integration]
Implemented Multi-Rate Pricing Engine, Formula Builder (DOC-15), and Extra Scheme Settlement (DOC-14) in Purchase/Sales flows. Purchase Bill Layout restructured and fixed.

## [Update - DOC-17 Procurement Execution]
- **Purchase Orders**: Create POs under `Sales & Purchase > Purchase > Purchase Order` to specify exact quantities, vendors, and delivery expectations.
- **Goods Receipt Notes (GRN)**: Instead of direct Purchase Bills, you can record physical receipt of goods via the GRN screen (`Sales & Purchase > Purchase > Goods Receipt Note`). Loading a PO automatically populates the items. Saving a GRN updates stock levels immediately.
- **Vendor Complaints**: Track shortages, damage, and quality issues centrally under `Sales & Purchase > Purchase > Vendor Complaints`.

## [Update - DOC-18 Sales Order & Order Management Engine]
- **Hold Engine**: Orders exceeding credit limits or pricing margins are put on `HOLD`. Admins/Managers must explicitly review these in the `OrderApprovalDashboard` (accessible via Sales & Purchase > Sale > Order Approvals).
- **Direct Billing Bypass (Permissions)**: To prevent the Hold engine from slowing down fast billing, the `User` account has an `allow_direct_billing` permission flag. Admin/Manager roles or users with this flag enabled can bypass the strict Sales Order flow and use the fast-path direct `SalesBill` / `PurchaseBill` invoicing. Users without this flag are hard-blocked from accessing direct billing and must go through the Sales Order approval flow.


## New Financial & Billing Workflows (DOC-20, 21, 24)
1. **Managing Document Numbering:** 
   - Go to **Master > Masters > Document Series** to create custom prefix series (e.g., `C-` for Cash Sales, `B-` for Bank Receipts).
   - In any billing/voucher screen, select the series and the system automatically fills the next available number. You can manually edit the number if you are copying from a physical receipt book.
2. **Processing Sales Returns (Credit Notes):**
   - Go to **Sales & Purchase > Sale > Sales Return**.
   - Press **F8** and type the original Sales Invoice Number.
   - The system loads the items and verifies exactly how many items you are allowed to return (preventing duplicates).
   - Stock is automatically added back to the ERP.
3. **Payment & Receipt Vouchers:**
   - Go to **Finance & Accounts > Vouchers, P&L > Payment / Receipt**.
   - Select your document series, fill the amounts, and save. This directly posts the accounting double-entry safely to the ledger.

## DOC-28: Bank Reconciliation Workflow (2026-10-06)

### How to Reconcile Bank Statements
1. Go to **Finance & Accounts > Bank Reconciliation**.
2. Select your Bank Ledger from the dropdown at the top.
3. Click **Import Statement**. 
   - *First time?* Select "+ Create New Mapping Profile" and enter the column names exactly as they appear in your Bank's Excel/CSV file (e.g., Profile Name: "HDFC Format", Date Column: "Transaction Date", Withdrawal Column: "Debit").
   - *Next time?* Just select your saved "HDFC Format" from the dropdown.
4. Upload your CSV. The statement rows will populate on the **Left Pane** (Unreconciled Bank Statement).
5. The **Right Pane** automatically shows all un-matched Payments and Receipts logged in the ERP for this ledger.
6. Click one row on the left and one row on the right. The **Match Selected** button will turn blue. Click it to permanently reconcile the two records.
