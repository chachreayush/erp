# User Workflow Manual

Welcome to the ERP system! This guide explains how to navigate the core workflows of the software.

## 1. Registration and Login
- **Super Admin (Account Master)**: If you are the system owner, you can log in directly and manage multiple client organizations.
- **Client Registration**: The Account Master registers new organizations (clients). Upon registration, a unique **Organization Code** (e.g., `MUM-6135`) is generated along with an Admin username and password.
- **Client Login**: Client Admins must enter their `Organization Code`, `Username`, and `Password` to access their isolated workspace. 
  - **Security Feature**: The login system is protected by rate limiting. Entering incorrect passwords rapidly will temporarily block access to protect your data. 

## 2. Master Data Management
Before you can record transactions, you should populate your master data.
- **Companies (Manufacturers)**: Add drug manufacturers or generic vendors.
- **Salts (Molecules)**: Add chemical compositions.
- **HSN Codes**: Add tax codes for billing.
- **Ledgers**: Add suppliers (Sundry Creditors) and customers (Sundry Debtors).

## 3. Managing Products
Navigate to the **Inventory > Add Product** menu.
1. Enter the product details (Name, Code, Packing, MRP, Rates).
2. **Smart Mapping**: You can type the name of a Company or Salt directly into the product form. The system will automatically link it to an existing master record. If the company or salt doesn't exist yet, the system will seamlessly create it in the background!
3. All products you create are instantly isolated to your organization.

## 4. Processing Purchases (Stock In)
When you receive goods from a supplier, you must record a Purchase Bill to increase your inventory stock.
1. Navigate to **Sales & Purchase > Purchase > Entry**.
2. Select your Supplier (Sundry Creditor) from the ledger list.
3. Add products to the invoice. For each product, you must specify:
   - **Quantity**: How many units received.
   - **Batch Number**: Essential for pharmaceutical tracking.
   - **Expiry Date**: MM/YY format.
4. Save the invoice. The system automatically creates batch records and adds the quantities to your active stock!

## 5. Viewing Current Stock
To see what you have on hand:
1. Navigate to **Inventory > Current Stock**.
2. The grid displays real-time stock levels for all your products.
3. The system calculates stock dynamically by summing all your active batches.
4. **Zero-Stock Products**: Products that have completely run out of stock (or haven't had a purchase yet) will still appear in this list with a quantity of `0`, allowing you to quickly identify what needs to be reordered.

## Live Synchronization (Vercel & Render)
Because the ERP is now successfully connected to a live cloud database (Neon), all invoice registrations and modifications made locally will instantly reflect on the Vercel hosted site, and vice versa. There is no longer any temporary offline storage for billing.

## 6. Modifying Invoices
All invoice modification views (Sales, Purchases, Returns, Breakage) are fully integrated with the live database.
1. Navigate to **Modify Bills** under any section (e.g., Sales -> Modify).
2. You will see a live grid of your previously saved invoices.
3. If the grid is empty, it means you haven't created any invoices of that type in the system yet.
4. Click on any invoice to load it for modification.


## 7. High-Speed Invoice Searching
When viewing your Modify Sales or Purchase lists, you can utilize the Search bars (Party Name, Bill Number) or Date ranges. 
- **Real-Time Database Filtering**: Your searches are processed instantly on the secure cloud server, enabling you to effortlessly sift through millions of historical records without slowing down your computer.
