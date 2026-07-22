import os

doc_text = """
---

# PART 5: MULTI-TENANT ARCHITECTURE & CLIENT PROVISIONING
---

## File: `src/pages/admin/ClientManagement.tsx` & `RegisterClientModal.tsx`
**Location in Project:** `C:\\Users\\DELL\\OneDrive\\Desktop\\erp\\src\\pages\\admin\\ClientManagement.tsx`

### Purpose
Allows the Account Master (Admin) to view all client environments and create new isolated client databases on the fly. 

### Key Features
1. **Dynamic Provisioning**: Clicking "Register New Client" opens a modal. Submitting the form calls a backend endpoint that instantly provisions a new logical workspace for the client in the PostgreSQL database.
2. **Instant Impersonation**: Admins can click "Switch to ERP" on any client card. This immediately replaces their global token with a scoped `CM_ADMIN` token for that specific client, securely locking them into the client's isolated database space.
3. **Data Safety**: When returning a Pydantic Validation Error (e.g. for a too-short password), the React frontend catches the array of errors and parses them into a human-readable string to prevent React rendering crashes.

---

## File: `backend/api/companies.py`
**Location in Project:** `C:\\Users\\DELL\\OneDrive\\Desktop\\erp\\backend\\api\\companies.py`

### Purpose
Handles all company operations, specifically client provisioning.

### Functions:
1. `POST /register`: Registers a new client company.
   - Verifies the requester is an `AM_ADMIN`.
   - Creates the `Company` record in PostgreSQL (`is_am=False`).
   - Hashes the requested client admin password using `auth.utils.hash_password` (bcrypt).
   - Creates the `User` record mapped to the newly created `Company`.
   - Uses a database transaction (`db.flush()`) to ensure either both company and user are created, or neither is.

---

## File: `backend/auth/utils.py` & `authStore.ts`
### Purpose
Manages password security and session states.
- `hash_password`: Uses bcrypt to secure passwords before insertion.
- **Frontend Syncing**: The React `authStore.ts` explicitly maps the backend `is_am_user` (snake_case) to the frontend `isAmUser` (camelCase) to ensure the Dashboard conditional rendering logic correctly directs clients to the `ClientDashboard.tsx`.

---
"""

with open(r"c:\Users\DELL\OneDrive\Desktop\erp2\Developer_and_User_Manual.md", "a", encoding="utf-8") as f:
    f.write(doc_text)
