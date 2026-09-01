# ERP Project — Master Memory File
> Last Updated: 2026-08-31 | Auto-loaded at the start of every session.

---

## Project Identity

| Item | Detail |
|---|---|
| **Project Name** | Enterprise Multi-Tenant ERP (Tauri + React 19 + FastAPI) |
| **Dev Folder** | `C:\Users\DELL\OneDrive\Desktop\erp2` (working copy) |
| **Original Folder** | `C:\Users\DELL\OneDrive\Desktop\erp` (Git repo, synced via `sync-to-original.ps1`) |
| **Git Repository** | `https://github.com/chachreayush/erp.git` (Branch: `main`) |
| **Frontend URL** | `http://localhost:50005` (Vite dev server) / Vercel Production |
| **Backend URL** | `http://localhost:8000` (FastAPI/Uvicorn) / Render Production |
| **Tauri App** | `npm run tauri dev` — native Windows/Desktop ERP client |

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
powershell -ExecutionPolicy Bypass -File C:\Users\DELL\OneDrive\Desktop\erp2\sync-to-original.ps1
```


### [Update: 2026-09-01]
- **Smart MRP Integration**: Added an AI-powered Smart MRP modal to calculate min_stock_level and reorder_quantity based on a 30-day sales velocity algorithm. Injected into the Products page and integrated with the Dashboard Low Stock Alerts.
- **Global Search**: Implemented a Marg/Odoo-style Ctrl+K search bar in the header for quick navigation between modules and products.
- **UI & Layout Fixes**: Fixed AppShell padding to allow edge-to-edge layouts. Centered the Finance & Accounting page layout. Restored dropdown text legibility in the Minimal White/Green theme.
- **Sales Bill Remaster**: Restructured SalesBill.tsx to an edge-to-edge layout, compressed the Product column width, and added a Live Intelligence right-side panel containing Party Details, Active Product metrics, and Keyboard shortcuts.
- **Document Cancellation**: Added POST /api/sales/invoices/{id}/cancel endpoint (SAP-style reversal) to create negative quantity records without deleting original audit trails.
- **Sales Bill Hotfix**: Resolved React-Babel JSX nesting issue (Unterminated JSX contents) to stabilize the edge-to-edge layout.
