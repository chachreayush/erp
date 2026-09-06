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
