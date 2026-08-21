# Developer Manual - Multi-Tenant ERP Software

## Architecture Overview
This project is a modern, high-performance ERP system designed with a three-tier architecture:
1. **Frontend**: React, Vite, TypeScript, and Zustand (for state management).
2. **Desktop Client**: Tauri (Rust-based wrapper for delivering the Vite app as a lightweight, native Windows/macOS app).
3. **Backend**: FastAPI (Python), SQLAlchemy (ORM), PostgreSQL.

## Database & Multi-Tenancy
The database strictly enforces isolation between different client organizations.
- Every table containing client data (e.g., `products`, `invoices`, `batches`) includes an `organization_id` foreign key.
- The `get_current_user` FastAPI dependency extracts the JWT token, determines the user's `organization_id`, and ensures all endpoints filter queries appropriately (e.g., `db.query(Product).filter(Product.organization_id == current_user.organization_id)`).

## Core Modules

### Authentication & Authorization (ackend/auth/router.py)
- **Security & Rate Limiting**: The POST /login endpoint is protected by slowapi to restrict attempts (e.g. 5 requests per minute) and block brute-force attacks.
- Standard JWT-based authentication.
- **AM Admin** (Account Master) can register new clients and impersonate CM Admins.
- **CM Admin** (Client Master) has full control over their organization's ERP data.
- **Role-Based Access Control (RBAC)**: Handled dynamically via `authStore.ts` on the frontend and `UserRole` enums on the backend.

### Inventory & Master Data (`backend/inventory/router.py`, `backend/api/master.py`)
- Products are linked to `Manufacturer`, `Salt`, and `HSNCode`.
- When a product is created, string names for companies and salts are automatically resolved to UUIDs via the `_resolve_fks` function. If the entity doesn't exist, it is created automatically.

### Sales & Purchases (`backend/api/sales.py`)
- Centralized transaction engine for creating invoices.
- Supports generic `invoice_type`s (e.g., 'purchase', 'sales').
- Automatically calculates and deducts/adds stock quantities in the `Batch` table via `_deduct_stock_for_invoice`.

### Stock Engine (`backend/api/stock.py`)
- Instead of keeping a static integer on the `Product` model, stock is calculated dynamically based on active `Batches`.
- The `/api/stock/` endpoint performs a `GROUP BY product_id` sum on the `batches` table to return real-time, accurate current stock, ensuring no data desynchronization.

## Getting Started (Local Development)

### 1. Backend (FastAPI)
```bash
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```
*Note: Ensure PostgreSQL is running and your `.env` contains the correct database URI (`DATABASE_URL`) and `JWT_SECRET_KEY`.*

### 2. Frontend (Vite Web App)
```bash
npm install
npm run dev
```

### 3. Desktop App (Tauri)
```bash
npm run tauri dev
```

## Vercel Deployment
To deploy the frontend to Vercel:
1. Connect the GitHub repository.
2. Select **Vite** as the Framework Preset.
3. Ensure the `vercel.json` file is present in the root to handle React Router single-page application rewrites.

## Live Database & Deployment
- **Frontend**: Deployed and automatically synced via Vercel.
- **Backend API**: Deployed and automatically synced via Render.
- **Database**: Hosted securely on Neon (PostgreSQL).
All billing and modification modules (Sales, Purchase, Returns, Breakage/Expiry) now strictly interact with the live FastAPI endpoints instead of offline browser storage, ensuring multi-tenant data synchronization across all devices and clouds.



### Database & Query Optimizations
- **Server-Side Filtering**: List endpoints (e.g., /api/sales/invoices) process debounced query parameters (rom_date, party_search) directly via SQLAlchemy to minimize API payload sizes and memory consumption.
- **Lazy Loading Prevention**: Endpoints querying collections containing nested relationships (like Invoices with InvoiceItems) must utilize SQLAlchemy's joinedload() to sidestep N+1 query inefficiencies.
- **Indexing**: High-traffic search columns (such as invoice_number, customer_name) are strictly indexed in PostgreSQL for instantaneous B-Tree traversal.


### Breakage & Expiry System
- Breakage and Expiry inventory is isolated directly at the Batch model level via the rk_exp_stock column.
- The pi/sales.py engine intelligently intercepts rk-receive and rk-issue invoice types, routing stock additions and deductions specifically to rk_exp_stock rather than the main current_stock.
- The /api/stock/brk-exp endpoint provides a grouped sum of this isolated stock to the frontend.

### Product Register (Stock Ledger)
- The /api/stock/{product_id}/register endpoint generates a chronological, row-by-row ledger for a specific product.
- Supports context isolation via the stock_type query parameter: main calculates flow excluding breakage, while rk-exp calculates flow showing exclusively breakage transactions.
- Frontend logic uses useMemo for client-side search filtering and g-grid for rendering.

### Navigation & State Hooks
- **\useReturnNavigation\ Hook**: Manages global \Escape\ key interception across billing modules. Deep link states (e.g. \eturnTo\) are passed securely into the React Router \location.state\ rather than polluting the browser's Search Params.
