/* ============================================================
   authStore.ts — Global Authentication State (Zustand Store)
   ============================================================
   This file manages the SINGLE SOURCE OF TRUTH for all
   authentication and session data across the entire app.

   WHY ZUSTAND?
   Zustand is a minimal, fast state management library.
   Unlike Redux, it has no boilerplate — just a store with
   state and actions. It's perfect for session state that
   needs to be accessible from any component.

   WHAT THIS STORE TRACKS:
   - Whether the user is logged in
   - The user's profile (name, role, company)
   - Which company they belong to (AM or a specific CM)
   - What mode the app is in (LAN connected or Remote/Cloud)
   - Their permissions (which modules and actions they can do)

   HOW IT WORKS:
   Any component can read from or write to this store by
   calling useAuthStore(). Changes automatically re-render
   all components that use the changed data.
   ============================================================ */

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware' // Saves state to appropriate storage

// ── TYPE DEFINITIONS ──────────────────────────────────────────

// The connection mode the app detected on startup:
// - 'lan'    → server was found on local network via UDP broadcast
// - 'remote' → no server on LAN, connecting via Supabase cloud
// - 'server' → this machine IS the server (full admin mode)
// - null     → app just started, detection not yet complete
export type AppMode = 'lan' | 'remote' | 'server' | null

// The role hierarchy (in order of highest to lowest authority)
export type UserRole =
  | 'am_admin'       // Account Master Admin — God mode, sees everything
  | 'cm_admin'       // Client Module Admin — Full control within their CM
  | 'manager'        // Manager — Approvals, team view, reports
  | 'area_manager'   // Area/Sales Manager — Regional oversight
  | 'staff'          // Regular staff — Standard ERP operations
  | 'field_staff'    // Field staff — Mobile-focused, limited ERP access
  | 'viewer'         // Read-only access — Can see but cannot create/edit/delete

// Module permission structure for a single ERP module
// Each boolean represents whether the user can perform that action
export interface ModulePermission {
  view:    boolean  // Can the user see this module at all?
  create:  boolean  // Can the user create new records?
  edit:    boolean  // Can the user edit existing records?
  delete:  boolean  // Can the user delete records? (often requires approval)
  approve: boolean  // Can the user approve pending actions?
}

// The complete permission set — one entry per ERP module
export interface UserPermissions {
  finance:    ModulePermission
  inventory:  ModulePermission
  sales:      ModulePermission
  crm:        ModulePermission
  hr:         ModulePermission
  reports:    ModulePermission
  settings:   ModulePermission // User management, company settings
}

// The authenticated user's complete profile
export interface AuthUser {
  id:          string          // Unique user ID from the database
  name:        string          // Full display name (e.g., "Rahul Sharma")
  username:    string          // Login username (e.g., "rahul.sharma")
  email:       string          // Email address
  role:        UserRole        // Their role in the hierarchy
  companyId:   string          // The Company ID they belong to (e.g., "MUM-6135")
  companyName: string          // Human-readable company name (e.g., "Mumbai Traders")
  isAmUser:    boolean         // true = belongs to AM company, false = belongs to a CM
  permissions: UserPermissions // Exact module-level permissions for this user
  avatarUrl?:  string          // Optional profile picture URL
}

// The complete shape of the auth store (state + actions)
interface AuthState {
  // ── STATE ───────────────────────────────────────────────────
  user:        AuthUser | null  // null = not logged in
  token:       string | null    // JWT access token for API requests
  originalAmUser: AuthUser | null // To switch back from impersonation
  originalAmToken: string | null
  appMode:     AppMode          // How this instance connects to the backend
  serverUrl:   string | null    // LAN server URL (e.g., "http://192.168.1.5:8000")
  isLoading:   boolean          // true while login request is in progress
  error:       string | null    // Login error message, if any

  // ── ACTIONS ─────────────────────────────────────────────────
  // setAppMode: Called by the server discovery service when it
  // determines whether we're on LAN or need remote connection
  setAppMode:  (mode: AppMode, serverUrl?: string) => void

  // login: Called after successful authentication. Stores the
  // user profile and token received from the backend.
  login:       (user: AuthUser, token: string) => void

  // impersonate: Switch to a client company ERP
  impersonate: (user: AuthUser, token: string) => void

  // revertImpersonation: Switch back to the AM Admin firm
  revertImpersonation: () => void

  // logout: Clears all session data and returns to login screen
  logout:      () => void

  // setLoading: Shows/hides loading spinner during auth requests
  setLoading:  (loading: boolean) => void

  // setError: Stores a login error message to display to the user
  setError:    (error: string | null) => void

  // hasPermission: Helper to check if the user can do a specific
  // action in a specific module. Used by components to show/hide UI.
  // Example: hasPermission('finance', 'delete') → false for a staff user
  hasPermission: (module: keyof UserPermissions, action: keyof ModulePermission) => boolean
}

// ── CREATE THE ZUSTAND STORE ──────────────────────────────────
// `persist` middleware automatically saves the store to localStorage
// so the user stays logged in after refreshing or reopening the app.
// Only the user, token, appMode, and serverUrl are persisted.
// isLoading and error are always reset on app start.
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // ── INITIAL STATE ────────────────────────────────────────
      user:      null,  // No user logged in at start
      token:     null,  // No token at start
      originalAmUser: null,
      originalAmToken: null,
      appMode:   null,  // Mode not yet determined (discovery in progress)
      serverUrl: null,  // No server URL until LAN discovery completes
      isLoading: false, // Not loading at start
      error:     null,  // No error at start

      // ── ACTION: setAppMode ───────────────────────────────────
      // Called by the UDP discovery service after scanning the LAN.
      // If a server is found, we store its URL for future API calls.
      // If not found, mode is set to 'remote' and Supabase is used.
      setAppMode: (mode, serverUrl) =>
        set({
          appMode: mode,
          serverUrl: serverUrl ?? null // Store URL if provided (LAN mode only)
        }),

      // ── ACTION: login ────────────────────────────────────────
      // Stores the authenticated user's data after successful login.
      // The token is used in every subsequent API request as a
      // Bearer token in the Authorization header.
      login: (user, token) =>
        set({
          user,
          token,
          originalAmUser: null,
          originalAmToken: null,
          isLoading: false, // Hide loading spinner
          error: null        // Clear any previous error
        }),

      // ── ACTION: impersonate ──────────────────────────────────
      impersonate: (newUser, newToken) => {
        const currentUser = get().user
        const currentToken = get().token
        if (!get().originalAmUser) {
          set({
            originalAmUser: currentUser,
            originalAmToken: currentToken,
            user: newUser,
            token: newToken
          })
        } else {
          set({ user: newUser, token: newToken })
        }
      },

      // ── ACTION: revertImpersonation ──────────────────────────
      revertImpersonation: () => {
        const originalUser = get().originalAmUser
        const originalToken = get().originalAmToken
        if (originalUser && originalToken) {
          set({
            user: originalUser,
            token: originalToken,
            originalAmUser: null,
            originalAmToken: null
          })
        }
      },

      // ── ACTION: logout ───────────────────────────────────────
      // Wipes all user data. The persist middleware will also
      // clear the saved localStorage data automatically.
      logout: () =>
        set({
          user:      null,
          token:     null,
          originalAmUser: null,
          originalAmToken: null,
          isLoading: false,
          error:     null
          // Note: we keep appMode and serverUrl so the next login
          // attempt reconnects in the same mode automatically.
        }),

      // ── ACTION: setLoading ───────────────────────────────────
      // Toggled true when a login API call starts, false when done.
      setLoading: (loading) => set({ isLoading: loading }),

      // ── ACTION: setError ─────────────────────────────────────
      // Stores an error message to display under the login form.
      // Pass null to clear the error.
      setError: (error) => set({ error }),

      // ── ACTION: hasPermission ─────────────────────────────────
      // Checks if the currently logged-in user has a specific
      // permission for a specific module.
      //
      // Usage example in a component:
      //   const canDelete = useAuthStore(s => s.hasPermission('finance', 'delete'))
      //   {canDelete && <button>Delete</button>}
      //
      // If no user is logged in, always returns false.
      hasPermission: (module, action) => {
        const user = get().user
        if (!user) return false                              // Not logged in → no access
        return user.permissions[module]?.[action] ?? false  // Return the specific permission
      }
    }),

    // ── PERSIST CONFIGURATION ────────────────────────────────
    // name: The localStorage key where state is saved.
    // partialize: Only save these specific fields (not isLoading/error).
    {
      name: 'erp-auth',
      storage: createJSONStorage(() => {
        // Mobile users: localStorage (persistent until logout/app deletion)
        // Desktop users (Tauri/Browser): sessionStorage (cleared on system restart/software close)
        const isMobile = typeof navigator !== 'undefined' && /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
        return isMobile ? localStorage : sessionStorage;
      }),
      partialize: (state) => ({
        user:      state.user,
        token:     state.token,
        originalAmUser: state.originalAmUser,
        originalAmToken: state.originalAmToken,
        appMode:   state.appMode,
        serverUrl: state.serverUrl
      })
    }
  )
)
