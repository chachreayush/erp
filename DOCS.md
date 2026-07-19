# ERP Software — Master Documentation

**Version:** 1.0 (Living Document — Updated Every Sprint)
**Owner:** chachreayush
**Repository:** https://github.com/chachreayush/erp

---

## Table of Contents
1. [Project Overview](#1-project-overview)
2. [Architecture](#2-architecture)
3. [Tech Stack](#3-tech-stack)
4. [Database Schema](#4-database-schema)
5. [API Reference](#5-api-reference)
6. [Modules](#6-modules)
7. [Security & Permissions](#7-security--permissions)
8. [Deployment](#8-deployment)
9. [Sprint History](#9-sprint-history)

---

## 1. Project Overview

This is a multi-tenant, offline-first ERP system built on the **AM / CM model**:

- **AM (Account Master):** The main company / owner of the software. Has full, unrestricted access to all CMs and their data.
- **CM (Client Module):** Client companies created and managed by the AM. Each CM is completely isolated from other CMs.

**Core Principles:**
- Data is stored **locally first** on the main server for zero-lag performance.
- Data syncs to **Supabase cloud** in the background for remote access.
- Remote users connect via **Company ID + Username + Password**.
- LAN users connect by **copying a single ERP.exe** — no installation required (Marg ERP style).
- The **local database is the authoritative source of truth** — cloud changes require admin approval before entering the main database.

---

## 2. Architecture

```
OFFICE (LAN)
├── Main Server PC
│   ├── PostgreSQL        ← Primary database (all company data)
│   ├── FastAPI           ← Backend API (all business logic)
│   ├── ERP.exe (Server)  ← Admin uses this
│   └── UDP Beacon        ← Broadcasts server presence on LAN

├── Client PC 1 (ERP.exe copied)  ← Auto-discovers server
├── Client PC 2 (ERP.exe copied)  ← Auto-discovers server
└── Client PC N (ERP.exe copied)  ← Auto-discovers server

INTERNET
├── Supabase Cloud        ← Sync bridge (isolated per company)
├── Remote Windows User   ← ERP.exe (Remote mode + SQLite cache)
├── Android App           ← React Native (Future)
└── iOS App               ← React Native (Future)
```

---

## 3. Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Desktop UI | Tauri 2.0 | Lightweight native desktop app shell |
| Frontend | React 19 + TypeScript | All screens and UI components |
| UI Components | shadcn/ui (Radix UI) | Keyboard-navigable, accessible components |
| Data Grid | AG Grid React | ERP-grade tables with 100k+ row support |
| State Management | Zustand | User session, permissions, app mode (LAN/Remote) |
| Data Fetching | TanStack Query | Server data caching and background sync |
| Backend | Python 3.13 + FastAPI | All business logic and API endpoints |
| Server DB | PostgreSQL | Primary authoritative database |
| Remote Cache | SQLite | Offline cache for remote clients |
| Cloud Bridge | Supabase | Cloud sync + remote auth |
| Packaging | PyInstaller + Inno Setup | Bundles backend into .exe installers |
| LAN Discovery | UDP Broadcast | Zero-config server auto-discovery |
| Charts | Recharts | Dashboards and reports |

---

## 4. Database Schema

> ⏳ This section will be populated as each module is built.

### Tables (Planned)

| Table | Module | Description |
|---|---|---|
| `companies` | Core | AM + all CM companies |
| `users` | Auth | All user accounts |
| `roles` | Auth | Role definitions per company |
| `permissions` | Auth | Module-level permissions per user |
| `sessions` | Auth | Active login sessions |
| `invoices` | Finance | All billing and invoice records |
| `ledger_entries` | Finance | General ledger transactions |
| `products` | Inventory | Stock items / products |
| `stock_movements` | Inventory | Inventory in/out records |
| `sales_orders` | Sales | Customer sales orders |
| `purchase_orders` | Sales | Supplier purchase orders |
| `customers` | CRM | Customer records |
| `crm_visits` | CRM | Field staff visit records |
| `employees` | HR | Employee master records |
| `attendance` | HR | Daily attendance records |
| `payroll` | HR | Salary and payroll records |
| `audit_logs` | Core | All user actions (full traceability) |
| `sync_queue` | Sync | Pending cloud-to-local change approvals |

---

## 5. API Reference

> ⏳ This section will be populated as each endpoint is built.

### Authentication
| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/login` | Login (LAN or Remote via Company ID) |
| POST | `/auth/logout` | Logout and invalidate session |
| POST | `/auth/2fa/verify` | Verify 2FA OTP code |
| GET | `/auth/me` | Get current logged-in user profile |

---

## 6. Modules

> ⏳ Each module section will be populated as it is built.

### Module Status

| Module | Status | Sprint |
|---|---|---|
| Auth & User Management | ⏳ Planned | Epic 2 |
| Finance & Accounting | ⏳ Planned | Epic 3 |
| Inventory & Warehouse | ⏳ Planned | Epic 4 |
| Sales & Purchase | ⏳ Planned | Epic 5 |
| CRM | ⏳ Planned | Epic 6 |
| HR Management | ⏳ Planned | Epic 7 |
| Reporting & Analytics | ⏳ Planned | Epic 8 |
| Cloud Sync | ⏳ Planned | Epic 9 |

---

## 7. Security & Permissions

### Permission Layers (3-Layer Enforcement)

1. **Frontend (UI Layer):** Buttons and menu items are hidden if the user does not have permission. The user never even sees actions they cannot perform.
2. **Backend (API Layer):** FastAPI middleware checks the user's JWT token and role on every request. Even if someone bypasses the UI, the server rejects unauthorized calls.
3. **Database (Supabase RLS):** Row Level Security policies at the database level ensure remote users can only read/write data belonging to their own company.

### Role Hierarchy
```
AM Admin
  └── CM Admin (per company)
        └── Manager
              └── Area Manager / Sales Manager
                    └── Staff / Field Staff
                          └── Viewer (Read Only)
```

### Remote Login Flow
1. User opens ERP.exe
2. App scans LAN for server (UDP broadcast) — 2 second timeout
3. If server found → LAN Login (Username + Password only)
4. If server NOT found → Remote Login (Company ID + Username + Password)
5. Company ID routes user to correct isolated company database
6. Role and permissions loaded from database
7. App renders only the modules and actions the user is permitted to see

---

## 8. Deployment

### Installer 1: `ServerSetup.exe`
- Installs: PostgreSQL, Python FastAPI backend, ERP application
- Target: Main office server PC only
- Creates: A copy of `ERP.exe` in `C:\ERP\Client\` for distribution to LAN clients

### Installer 2: `RemoteSetup.exe`
- Installs: ERP application only (with embedded SQLite)
- Target: Remote users working outside the office
- Connects: To Supabase cloud using Company ID + credentials

### LAN Client Distribution
- No installer needed
- Admin copies `ERP.exe` from `C:\ERP\Client\` to any LAN PC
- Double-click → auto-discovers server → login screen → works

---

## 9. Sprint History

| Sprint | Epic | Description | Status | Date |
|---|---|---|---|---|
| 1 | Epic 1 | Project scaffold + folder structure + GitHub setup | ✅ Done | 2026-07-19 |

---

*This document is updated at the end of every sprint. Last updated: 2026-07-19*
