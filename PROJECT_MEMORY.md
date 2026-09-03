# ERP Project — Master Memory File
> Last Updated: 2026-09-03 | Auto-loaded at the start of every session.

---

## Project Identity

| Item | Detail |
|---|---|
| **Project Name** | Enterprise Multi-Tenant ERP (Tauri + React 19 + FastAPI) |
| **Dev Folder** | `C:\Users\DELL\OneDrive\Desktop\erp2` (working copy) |
| **Original Folder** | `C:\Users\DELL\OneDrive\Desktop\erp` (Git repo, synced via `sync-to-original.ps1` / Robocopy) |
| **Git Repository** | `https://github.com/chachreayush/erp.git` (Branch: `main`) |
| **Frontend URL** | `http://localhost:50005` (Vite dev server) / Vercel Production (`https://erp-nbbigyye0-erp-b646.vercel.app`) |
| **Backend URL** | `http://localhost:8000` (FastAPI/Uvicorn) / Render Production |
| **Tauri App** | `npm run tauri dev` — native Windows/Desktop ERP client |
| **Standard Test Auth** | Company: `AM-0001` | Username: `admin` | Password: `Admin@123` |

---

## Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19 + TypeScript + Vite |
| **Desktop Shell** | Tauri v2 (Rust) |
| **Backend** | Python FastAPI + Uvicorn |
| **Database** | PostgreSQL (Neon Cloud / Local) |
| **ORM** | SQLAlchemy (models auto-create via `Base.metadata.create_all`) |
| **Auth** | JWT tokens (PyJWT), stored in Zustand (`authStore`) |
| **State Management** | Zustand |
| **HTTP Client** | Axios (`src/lib/api.ts`) |
| **Hosting & CI/CD** | Vercel (Frontend SPA) + Render (Backend API) |

---

## Recent Major Milestones & Architectural Upgrades

1. **Modern Enterprise ERP Redesign**:
   - Upgraded `SalesBill.tsx`, `PurchaseBill.tsx`, and all returns/breakage billing modules to a modern dark enterprise theme.
   - Fixed column proportions: `#`, `PRODUCT` (auto-flex), `PACK`, `BATCH` (100px constrained), `QTY`, `FREE`, `EXTRA SCHEM` (100px), `P.RATE/S`, `DIS1%`, `AMOUNT`.
   - 10-row balanced grid eliminating empty voids on 1080p desktop viewports.
   - Status badge indicators for Stock, SRate, HSN, Tax% and dedicated Total Invoice Hero Card.
2. **Dynamic Full-Screen Mode (`AppShell.tsx`)**:
   - Header navigation conditionally renders on `/` (Home Dashboard) and automatically hides during module entries (`/sales`, `/purchase`, etc.).
   - Added `useReturnNavigation` hook enabling instantaneous `Escape` key return to dashboard.
3. **Landscape Dashboard (`HomeScreen.tsx`)**:
   - 2-column horizontal split: Left side contains modular navigation cards, Right side houses the real-time company Bulletin Board.
   - Zero vertical scrolling required.
4. **Cloud Database Unification**:
   - Removed legacy local storage fallbacks for invoices and stock ledger.
   - Live synchronization across all devices and Vercel cloud deployment.
5. **Clean TypeScript Compilation**:
   - Full `tsc && vite build` validation with 100% type safety.

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

## Syncing to Original Folder

To copy updates from `erp2` to the original `erp` folder:
```powershell
robocopy C:\Users\DELL\OneDrive\Desktop\erp2\src C:\Users\DELL\OneDrive\Desktop\erp\src /MIR /XD node_modules
robocopy C:\Users\DELL\OneDrive\Desktop\erp2\backend C:\Users\DELL\OneDrive\Desktop\erp\backend /MIR /XD __pycache__ .venv .pytest_cache
```

### [Update: 2026-09-01]
- **Smart MRP Integration**: Added an AI-powered Smart MRP modal to calculate min_stock_level and reorder_quantity based on a 30-day sales velocity algorithm. Injected into the Products page and integrated with the Dashboard Low Stock Alerts.
- **Global Search**: Implemented a Marg/Odoo-style Ctrl+K search bar in the header for quick navigation between modules and products.
- **UI & Layout Fixes**: Fixed AppShell padding to allow edge-to-edge layouts. Centered the Finance & Accounting page layout. Restored dropdown text legibility in the Minimal White/Green theme.
- **Sales Bill Remaster**: Restructured SalesBill.tsx to an edge-to-edge layout, compressed the Product column width, and added a Live Intelligence right-side panel containing Party Details, Active Product metrics, and Keyboard shortcuts.
- **Document Cancellation**: Added POST /api/sales/invoices/{id}/cancel endpoint (SAP-style reversal) to create negative quantity records without deleting original audit trails.
- **Sales Bill Hotfix**: Resolved React-Babel JSX nesting issue (Unterminated JSX contents) to stabilize the edge-to-edge layout.

### [Update: 2026-09-03]
- **Default Theme Configuration**: Set Neumorphic Minimalist (`'minimal'`) as the default theme in `src/store/themeStore.ts` and prioritized it as the top option in `Settings.tsx`.
- **Sales Bill UX Flow**: Reordered header fields so that `Entry Date` precedes `Entry No.` with seamless keyboard focus navigation (`handleDateKeyDown` focusing `billNoRef`).
- **Client Impersonation 500 Fix**: Resolved Python indentation nesting bug in `backend/auth/router.py` (`POST /auth/impersonate`) that caused `ResponseValidationError` when AM admins switch into client ERPs.
- **Invoice Upsert Engine**: Added automatic Upsert detection in `backend/api/sales.py` (`create_invoice`). Modifying an existing invoice and saving now smoothly invokes `update_invoice` (reverting old stock, updating items, deducting new stock) rather than creating duplicate invoices.
- **Negative Stock & Backorder Tolerance**: Removed the rigid `400 Insufficient stock` blocker in `backend/api/sales.py`, allowing businesses to record sales before purchase entries without application crashes.
- **Bulletproof Product ID Auto-Resolution**: Upgraded `backend/api/sales.py` (`create_invoice`, `update_invoice`, `_update_stock_for_invoice`) to auto-resolve `product_id` by `product_name` from the product catalog in real time. Guarantees that all transaction types (`sales-bill`, `purchase-bill`, `returns`, `breakage`) reliably deduct/add stock and link to the Product Register even if frontend forms omit `product_id`.
- **Database Ledger Repair**: Re-linked 591 legacy invoice items in Neon PostgreSQL database to their respective product records. Verified that the Product Register (e.g. Crosin Forte: 1,770 Inward, 98 Outward, 1,672 Balance) precisely matches the Current Stock table.
- **Enhanced Error Reporting**: Replaced generic `"Failed to save to backend database"` alert with human-readable error messages extracted directly from backend API responses.
- **Build Verification**: `tsc --noEmit` and `npm run build` validated with zero errors. All changes committed to GitHub and synced to `erp`.
