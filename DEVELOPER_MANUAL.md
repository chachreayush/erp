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

### Authentication & Authorization (`backend/auth/router.py`)
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

