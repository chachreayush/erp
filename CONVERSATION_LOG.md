# ERP Project — Full Conversation Log
> This file records every major user request and AI action across all sessions.

---

## SESSION 1 — Project Inception & Foundation
*(Reconstructed from checkpoint summary — original session truncated)*

### Topics Covered
- Project concept introduced: Desktop ERP app using Tauri + React + FastAPI + PostgreSQL
- Agreed on multi-tenant architecture: AM (Account Master) admin manages CM (Client Master) organizations
- Decided on Tally/Marg-inspired keyboard-first UX
- Set up initial project scaffold: Tauri v2, React 19, TypeScript, Vite, FastAPI

### User Requests
1. Set up the initial ERP project structure
2. Create the login page with LAN/Remote mode auto-detection
3. Build JWT authentication with session tracking
4. Create AM Admin dashboard with bulletin board
5. Build inventory/products module

### Decisions Made
- Tech stack: Tauri v2 + React + TypeScript + FastAPI + PostgreSQL + SQLAlchemy
- No SQLite — all data in PostgreSQL
- Data isolation via `organization_id` column on every table
- Agile/Scrum workflow — small sprints, owner approval before proceeding

---

## SESSION 2 — Navigation & Keyboard UX
*(Reconstructed from checkpoint summary)*

### User Requests
1. "After last field entered shift the cursor to the option 'exit without saving' and then user can switch option between save and other and in all options and everywhere enable the cursor can be moved by arrow keys also"
2. "Shift the cursor from last field to exit without saving and user can use arrow key to shift the cursor and save"
3. "Also after pressing esc button on the popup or dialog box ask user to exit without saving to select yes or no and then close the dialog box or popup and shift the cursor to the header"
4. "In this cursor will be on the cancel and user can navigate cursor to yes or cancel and when user selects yes shift cursor to the headers and if cancel then shift cursor to the first field of the dialog box"

### Work Done
- Keyboard navigation implemented: Enter moves between fields, arrow keys navigate buttons
- Esc key triggers "Exit without saving?" Yes/No dialog
- Focus management: last field → "Exit without saving", Yes → header, Cancel → first field

---

## SESSION 3 — Git, Documentation & Database Setup
*(Reconstructed from checkpoint summary)*

### User Requests
5. "Have you updated the erp original folder, developer user manual, user manual workflow and git before do anything answer it first"
6. "Yes go ahead and update all of this"
7. "Have you created the database and let all the informations save?"
8. "Yes start that phase and also work on the database simultaneously with the project"

### Work Done
- Updated `Developer_and_User_Manual.md` and `User_Manual_and_Workflow.md`
- Ran `sync-to-original.ps1` to copy erp2 → erp
- Git committed on branch `feature/epic-1-foundation`
- PostgreSQL database confirmed — SQLAlchemy creates all tables on startup
- Integrated Master Data endpoints into `main.py`
- Fixed Unicode encoding error (emojis in print statements crashed uvicorn)

---

## SESSION 4 — Organizations Refactoring
*(Reconstructed from checkpoint summary)*

### User Requests
9. "Let's go with the name organizations for cm clients and proceed. And break this into small tasks so that you won't crash do it step by step."
10. "Ok proceed"

### Work Done
- Renamed all frontend "Companies" → "Organizations"
- Updated `src/lib/api.ts`: added `Organization` interface, `apiGetOrganizations()`, `apiRegisterOrganization()`
- Updated `src/pages/admin/ClientManagement.tsx`: replaced `ClientCompany` with `Organization`, updated impersonation to send `target_org_id`
- Updated `src/pages/admin/RegisterClientModal.tsx`: fields renamed to `org_name`, `org_code`, `admin_name`, `admin_username`, `admin_password`
- Registered `organizations.py` router in `main.py`
- Fixed import error in `api/master.py` (`auth.utils` → `auth.router`)

---

## SESSION 5 — Sync, Audit, and Full DB Migration
*(2026-07-30, ~19:00–19:30 IST)*

### User Requests
11. "Update the erp original folder, developer user manual, user manual workflow and git"
12. "Ok go through whole project and check for any error and also check the database has properly been created. If there is any suggestion from you then let me know"
13. "Ok go through whole project and check for any error... and do it step by step and break it into little tasks so you won't crash"

### Work Done

**Documentation:**
- Appended Organizations architecture section to `Developer_and_User_Manual.md` and `User_Manual_and_Workflow.md`
- Ran `sync-to-original.ps1` → synced erp2 to erp folder
- Git commit: `"feat: Backend API integration for master data and Organizations module refactoring"` (19 files, 1105 insertions)

**Project Audit:**
- All 12 Python backend files: ✅ syntax clean
- All 5 routers registered in `main.py` ✅
- TypeScript check: found unused variables (non-breaking) + 1 real bug in `BulletinModal.tsx`
- Fixed `BulletinModal.tsx`: `user.company_id` → `user.companyId`, `target_company_id` → `target_org_id`

**Critical DB Migration:**
- Found: all old tables still had `company_id → companies` FK
- Models already updated to `organization_id → organizations` but DB was never migrated
- Ran `migrate_full.py`:
  - Copied 7 rows from `companies` → `organizations` (preserving UUIDs)
  - Renamed `company_id` → `organization_id` on: `bulletins`, `products`, `invoices`, `ledgers`, `users`
  - Updated all FK constraints to point to `organizations.id`
- Final result: ALL tables now correctly use `organization_id → organizations`

---

## SESSION 6 — Server Restarts & Login Fix
*(2026-07-30, ~23:30 – 2026-07-31, ~01:00 IST)*

### User Requests
14. "Restart the servers"
15. "Also run the Tauri server too for Windows output"
16. "Unable to login" (x3 — servers kept restarting due to system restarts)
17. "Unable to login and break this work into little tasks so you won't crash"

### Root Causes of Login Failure Found & Fixed

**Bug 1 — Wrong API port:**
- `erp2/.env` had `VITE_API_URL=http://localhost:8001` (wrong port)
- Backend runs on port `8000`
- Fixed: `VITE_API_URL=http://localhost:8000`
- Vite auto-restarted and picked up the change

**Bug 2 — Schema mismatch in login:**
- `Login.tsx` was sending `company_code` but backend schema expects `org_code`
- `Login.tsx` was reading `response.user.company_id` and `company_name` from response
- Backend now returns `organization_id`, `org_name`, `org_code`
- Fixed in `src/lib/api.ts` (interface) and `src/pages/Login.tsx` (payload + mapping)

### Servers Running
- FastAPI backend: ✅ `http://localhost:8000`
- Vite frontend: ✅ `http://localhost:50005`
- Tauri desktop: ✅ `target\debug\erp-temp.exe` (compiled in ~22s)

---

## SESSION 7 — Database Verification & Memory File
*(2026-07-31, ~01:00 IST)*

### User Requests
18. "Have you created the database for all this?"
19. "Have you created a memory file?"
20. "Also store our whole conversation too in this file"

### Confirmed DB Status
All tables created and wired:
- `ledgers` ✅ (Ledger Master tab)
- `salts` ✅ 1 row (Salt Master tab)
- `manufacturers` ✅ 4 rows (Company Master tab)
- `hsn_codes` ✅ (HSN & Tax Master tab)
- `state_codes` ✅ (State Master tab)
- `organizations` ✅ 7 rows
- `users` ✅ 7 rows

### Created PROJECT_MEMORY.md
Full project memory file created with: stack, file locations, DB schema, naming rules, known bugs, server startup commands, user preferences, sprint status.

## SESSION 8 — Master Data Save Bug Fix
*(2026-07-31, ~01:15 IST)*

### User Requests
21. "No data is getting saved"

### Work Done
- Inspected backend logs: found `sqlalchemy.exc.ProgrammingError: column ledgers.mobile does not exist`.
- Diagnosis: The `ledgers` model had been updated with new columns in the code, but the physical database table (created previously) was missing them. Because SQLAlchemy's `create_all()` doesn't automatically run `ALTER TABLE`, saving or viewing ledgers was crashing the API.
- Fix: Since the `ledgers`, `hsn_codes`, and `state_codes` tables were completely empty, I safely dropped them from PostgreSQL and allowed the backend to recreate them automatically with the fresh, correct schema on restart. 
- Verified `salts` and `manufacturers` tables (which contain data) were structurally sound and functioning properly.

---

## Pending / Upcoming Work

- [ ] Keyboard navigation: Esc dialog, arrow key navigation in modals (partially done, needs polish)
- [ ] O/C Balances tab — wire to ledger opening balances
- [ ] Purchase module (PurchaseBill.tsx exists but incomplete)
- [ ] HR module
- [ ] Reports/dashboards
- [ ] Clean up unused TypeScript imports (Header.tsx, Sidebar.tsx, Billing.tsx, etc.)
- [ ] Consider adding Alembic for proper DB migration versioning
- [ ] Drop old `companies` table once fully stable

---

## Key Decisions Log

| Date | Decision |
|---|---|
| Early sessions | Tech stack: Tauri + React + FastAPI + PostgreSQL (no SQLite ever) |
| Early sessions | Multi-tenant via `organization_id` column, not separate DBs |
| Early sessions | Tally/Marg keyboard-first UX: Enter moves fields, arrows navigate buttons |
| 2026-07-30 | Renamed "Companies" (CM clients) → "Organizations" across entire codebase |
| 2026-07-30 | DB migration: all `company_id` columns renamed to `organization_id`, data preserved |
| 2026-07-30 | Backend port = 8000, frontend port = 50005, Tauri connects to Vite dev server |
| 2026-07-30 | Always run: sync-to-original.ps1 + git commit after major changes |
| 2026-07-31 | Login payload key = `org_code` (not `company_code`) |
