# Developer Manual — Multi-Tenant Modern ERP Software

## 1. Architecture Overview
This enterprise-grade ERP system is built on a modern, high-performance three-tier architecture:
1. **Frontend**: React 19, TypeScript, Vite, and Zustand (global authentication and UI state management).
2. **Desktop Client**: Tauri v2 (Rust-based container for distributing the Vite web app as a native, ultra-lightweight Windows/macOS desktop application).
3. **Backend API**: Python 3.11+, FastAPI, SQLAlchemy (ORM), Alembic/PostgreSQL.
4. **Cloud Database**: PostgreSQL hosted on Neon with multi-tenant isolation.
5. **Deployment & CI/CD**:
   - **Frontend (Web)**: Auto-deployed on **Vercel** with client-side SPA routing via `vercel.json`.
   - **Backend API**: Auto-deployed on **Render** with CORS configuration and Uvicorn.

---

## 2. Multi-Tenancy & Data Isolation Model
The database enforces strict tenant boundaries at the query and model level:
- **Account Master (AM)**: Role `am_admin`. Top-level administrator managing client organizations (`organizations` table) with cross-tenant impersonation capabilities (`POST /auth/impersonate`).
- **Client Master (CM)**: Role `cm_admin` / `cm_user`. Tenant-isolated admin/staff users bound to a single `organization_id`.
- **Query Isolation**: Every business entity (`products`, `invoices`, `batches`, `ledgers`, `bulletins`, etc.) carries an `organization_id` foreign key. Endpoints extract `organization_id` from validated JWT bearer tokens via `get_current_user`.

---

## 3. UI/UX & Layout Architecture

### Full-Screen Dynamic Layout Engine (`AppShell.tsx` & `MargAppShell.tsx`)
- **Navigational Hubs**: On the root path (`/`), the global header navigation and sidebars are visible.
- **Module Immersion**: On deep module routes (e.g. `/sales`, `/purchase`, `/inventory`, `/finance`, `/settings`), the global header bar is automatically hidden to provide a focused, full-screen environment.
- **Return Navigation (`useReturnNavigation`)**: Users seamlessly exit any full-screen module and return to the dashboard by pressing `Escape` or clicking back actions.

### Modern Enterprise Billing Design System (`SalesBill.tsx`, `PurchaseBill.tsx`, etc.)
- **Header Ribbon**: Dark slate surface (`#0f172a` to `#1e293b`), accented entry number (`#38bdf8`), large high-contrast inputs with search (`F7`) and date triggers.
- **Precision Data Grid**:
  - Locked column proportions with flexible `PRODUCT` name width.
  - Dedicated columns: `#`, `PRODUCT`, `PACK`, `BATCH` (100px constrained), `QTY`, `FREE`, `EXTRA SCHEM` (100px), `P.RATE/S`, `DIS1%`, `AMOUNT`.
  - Balanced 10-row default grid filling standard 1080p desktop viewports without vertical scrolling.
  - Active row glow (`rgba(59, 130, 246, 0.12)`) and indicator border (`3px solid #3b82f6`).
- **Bottom Summary Console**:
  - Left: Active batch metadata inputs + status chips for Stock, SRate, HSN, Tax%.
  - Middle: Real-time calculation breakdown (MRP Value, Taxable Amt, Post-Tax Adj, Total Qty, Balance).
  - Right: Value of Goods, GST Amount, Gold Discount field (`#fbbf24`), and 3 selectable post-tax ledger adjustment dropdowns.
  - Far Right Hero Card: Total Invoice Value badge (`₹ 0.00`) with vibrant cyan text.
- **Last 6 Saved Bills Console**: Shows chronological previous sales/purchase bills strictly for the active product line.
- **Action Toolbar**: Floating bottom bar with keyboard shortcut pills (`[F1] Help`, `[F2] Sale`, `[F4] Purc`, `[F5] SC`, `[F6] PC`) and primary `SAVE (End / Ctrl+S)` gradient button.

### Landscape Dashboard Layout (`HomeScreen.tsx`)
- Horizontal split: Left column features module navigation in compact horizontal cards (2-column grid), Right column embeds the real-time company Bulletin Board.
- Zero-scroll guarantee on standard displays.

---

## 4. Local Development Setup

### Backend (FastAPI)
```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```

### Frontend (Vite)
```powershell
npm install
npm run dev
# Dev server runs at http://localhost:50005
```

### Desktop App (Tauri)
```powershell
npm run tauri dev
```

### Production Build Verification
```powershell
npm run build
# Runs `tsc && vite build` ensuring 100% type safety and bundle output in `dist/`
```

---

## 5. Vercel & Cloud Deployment
- **Configuration (`vercel.json`)**:
  ```json
  {
    "rewrites": [
      {
        "source": "/(.*)",
        "destination": "/index.html"
      }
    ]
  }
  ```
- **Environment Variables**:
  - `VITE_API_URL`: Live Render backend URL (e.g. `https://erp-backend.onrender.com`)
  - `VITE_PORT`: `50005` (Local development)
