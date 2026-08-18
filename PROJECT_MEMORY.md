# ERP Project — Master Memory File
> Last Updated: 2026-08-19 | Auto-loaded at the start of every session.

---

## Project Identity

| Item | Detail |
|---|---|
| **Project Name** | ERP Software (Tauri + React + FastAPI) |
| **Dev Folder** | `C:\Users\DELL\OneDrive\Desktop\erp2` (working copy) |
| **Original Folder** | `C:\Users\DELL\OneDrive\Desktop\erp` (Git repo, synced via `sync-to-original.ps1`) |
| **Git Branch** | `feature/epic-1-foundation` |
| **Frontend URL** | http://localhost:50005 (Vite dev server) |
| **Backend URL** | http://localhost:8000 (FastAPI/Uvicorn) |
| **Tauri App** | `npm run tauri dev` — native Windows ERP window |

---

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript + Vite |
| Desktop Shell | Tauri v2 (Rust) |
| Backend | Python FastAPI + Uvicorn |
| Database | PostgreSQL (local, port 5432) |
| ORM | SQLAlchemy (models auto-create via `Base.metadata.create_all`) |
| Auth | JWT tokens (PyJWT), stored in Zustand (`authStore`) |
| State Management | Zustand |
| HTTP Client | Axios (`src/lib/api.ts`) |
| Styling | Vanilla CSS (no Tailwind) |

---

## How to Start Servers

```powershell
# 1. Backend (FastAPI)
cd C:\Users\DELL\OneDrive\Desktop\erp2\backend
python -m uvicorn main:app --reload --port 8000

# 2. Frontend (Vite)
cd C:\Users\DELL\OneDrive\Desktop\erp2
npm run dev

# 3. Desktop App (Tauri)
cd C:\Users\DELL\OneDrive\Desktop\erp2
npm run tauri dev
```

---

## Database

- **Engine:** PostgreSQL at `postgresql+psycopg://postgres:postgres@localhost:5432/postgres`
- **Connection in:** `backend/.env` → `DATABASE_URL`
- **Schema auto-created by:** `Base.metadata.create_all(engine)` in `main.py`

### All Tables

| Table | Purpose | FK |
|---|---|---|
| `organizations` | Multi-tenant root — all CM clients | — |
| `users` | All users (AM admin, CM admin, staff) | `organization_id → organizations` |
| `sessions` | JWT session tracking | `user_id → users` |
| `bulletins` | Announcements | `organization_id → organizations` |
| `products` | Inventory items | `organization_id → organizations` |
| `invoices` | Sales invoices | `organization_id → organizations` |
| `invoice_items` | Line items for invoices | `invoice_id → invoices` |
| `ledgers` | Finance ledger accounts | `organization_id → organizations` |
| `salts` | Pharmaceutical salt master | `organization_id → organizations` |
| `manufacturers` | Company/manufacturer master | `organization_id → organizations` |
| `hsn_codes` | HSN tax code master | `organization_id → organizations` |
| `state_codes` | Indian state codes for GST | `organization_id → organizations` |
| `companies` | **LEGACY backup table** (do not use) | — |

> [!IMPORTANT]
> The `companies` table is old/legacy. ALL code uses `organizations` now.
> `company_id` columns were migrated to `organization_id` on all tables.

---

## Architecture — Multi-Tenancy

- **AM (Account Master):** The top-level admin who manages all client organizations. Role = `am_admin`.
- **CM (Client Master):** Each client company is an `Organization`. Role = `cm_admin` or `cm_user`.
- **Data Isolation:** Every DB record has `organization_id` — users only see their own org's data.
- **Impersonation:** AM admin can switch into any CM org via `POST /auth/impersonate` with `{ target_org_id: "..." }`.

---

## Key File Locations

### Backend
| File | Purpose |
|---|---|
| `backend/main.py` | App entry point, all routers registered, CORS config |
| `backend/models.py` | All SQLAlchemy ORM models |
| `backend/schemas.py` | All Pydantic request/response schemas |
| `backend/database.py` | DB engine + `get_db()` dependency |
| `backend/auth/router.py` | Login, logout, /auth/me, impersonate endpoints |
| `backend/auth/service.py` | authenticate_user(), build_permissions_for_role() |
| `backend/auth/utils.py` | JWT sign/verify, password hash |
| `backend/api/master.py` | Ledger, Salt, Manufacturer, HSN, State CRUD |
| `backend/api/organizations.py` | List orgs, register new client org |
| `backend/api/bulletins.py` | Bulletin CRUD |
| `backend/api/sales.py` | Invoice CRUD |

### Frontend
| File | Purpose |
|---|---|
| `src/lib/api.ts` | All API functions + Axios client (baseURL from `.env`) |
| `src/store/authStore.ts` | Zustand global auth state (user, token, role) |
| `src/pages/Login.tsx` | Login page — org_code + username + password |
| `src/pages/admin/ClientManagement.tsx` | AM admin — list/manage client orgs |
| `src/pages/admin/RegisterClientModal.tsx` | AM admin — create new client org |
| `src/pages/master/MasterPage.tsx` | Master Data Setup page (tabs) |
| `src/pages/sales/Billing.tsx` | POS/Invoice screen |
| `src/components/ui/BulletinModal.tsx` | Create/edit bulletins |

---

## API Naming Conventions

> [!IMPORTANT]
> The backend was refactored from `companies` → `organizations`. These naming rules MUST be followed.

| Context | Use This | NOT This |
|---|---|---|
| DB column | `organization_id` | `company_id` |
| DB table | `organizations` | `companies` |
| Login payload | `org_code` | `company_code` |
| Auth response | `organization_id`, `org_name`, `org_code` | `company_id`, `company_name` |
| Impersonate payload | `target_org_id` | `target_company_id` |
| Frontend store | `companyId`, `companyName` (camelCase legacy — OK for now) | — |

---

## Environment Variables

### Frontend (`erp2/.env`)
```
VITE_API_URL=http://localhost:8000
VITE_PORT=50005
```

### Backend (`erp2/backend/.env`)
```
DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/postgres
JWT_SECRET_KEY=fallback_dev_key_change_in_production
```

---

## Known Issues & Fixes Applied

| Issue | Fix Applied |
|---|---|
| `VITE_API_URL` was pointing to port 8001 | Fixed to port 8000 in `.env` |
| All tables used `company_id` but models used `organization_id` | DB migration ran: renamed columns + re-pointed FKs |
| `companies` table data not in `organizations` | Copied 7 rows with original IDs preserved |
| `BulletinModal.tsx` used `user.company_id` (wrong) | Fixed to `user.companyId` |
| `BulletinModal.tsx` sent `target_company_id` | Fixed to `target_org_id` |
| Login sent `company_code` | Fixed to `org_code` |
| Login mapped `company_id` from response | Fixed to `organization_id` |
| Emoji in Python print statements crashed uvicorn | Removed all emoji from print statements |
| `auth/utils` bad import in `master.py` | Fixed import to `auth/router` |
| Master Data save failed / UI crashed | SQLAlchemy `ledgers` model had new columns not in Postgres. Dropped & recreated empty tables. |

---

## User Preferences & Workflow Style

- **Data Entry:** Tally/Marg-inspired keyboard-first. Enter key moves between fields.
- **Cursor Navigation:** Arrow keys navigate between buttons/options in dialogs.
- **Esc Key:** Should show "Exit without saving?" Yes/No dialog, then return focus to header.
- **After last field:** Focus should jump to "Exit without saving" button automatically.
- **Break into small tasks:** User prefers step-by-step execution to avoid crashes.
- **Sync after every change:** Run `sync-to-original.ps1` and `git commit` after major changes.

---

## Current Sprint Status (as of 2026-07-31)

- [x] Project scaffold (Tauri + React + FastAPI)
- [x] Login page with LAN/Remote mode detection
- [x] JWT auth with session tracking
- [x] AM Admin dashboard
- [x] Client Management (Organizations CRUD)
- [x] Bulletin board
- [x] Master Data page (Ledger, Salt, Manufacturer, HSN, State)
- [x] Inventory/Products
- [x] Sales/Billing (POS-style invoice)
- [x] DB migration: companies → organizations
- [ ] Keyboard navigation polish (Esc dialog, arrow keys in modals)
- [ ] O/C Balances wiring
- [ ] Purchase module
- [ ] HR module
- [ ] Reports module

### August 2026 - Sales Module Upgrade & Series Isolation
- [x] Migrated Sales to robust grid-based SalesBill.tsx component.
- [x] Eliminated Party Inv No requirement for Sales entries.
- [x] Implemented 'Smart Batch Filtering' in Sales/Purchase (hiding 0 qty batches, revealed via ArrowUp).
- [x] Implemented isolated default auto-increment series (e.g. S0001, SC0001, P0001) based on prefix across ALL billing modules.
- [x] Implemented strict local duplicate validation for Entry Numbers across all forms.

### Database Migration to Neon Postgres (Vercel + Render)
- [x] Migrated all offline `localStorage` billing form modules (Sales, Purchase, Returns, Brk/Exp) to fetch and store live data from PostgreSQL via FastAPI (Render) + Neon backend.
- [x] Verified full stack deployment synchronization with Vercel and Render.

## Latest Updates (August 2026)
- **Multi-Tenant Deployment**: Deployed on Render (Backend) and Vercel (Frontend) utilizing Neon PostgreSQL.
- **Invoice Modifiers Migration**: All modify bill lists (Sales, Purchase, Sales Return, Purchase Return, Brk Issue, Brk Receive) migrated from LocalStorage to the live Database API via piGetInvoices.
- **Stock Calculation Fix**: Corrected the _update_stock_for_invoice logic to deduct stock for Sales and **add** stock for Purchases, ensuring zero-stock items can still be purchased without generating 400 errors.
