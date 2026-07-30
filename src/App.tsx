/* ============================================================
   App.tsx — Root Application Component & Route Definitions
   ============================================================
   This is the top-level component of the entire React app.
   Its two responsibilities are:
   
   1. ROUTING: Define every URL path and which page component
      renders when the user navigates to that path.
   
   2. AUTHENTICATION GUARD: Check if the user is logged in.
      - If NOT logged in → redirect to /login automatically.
      - If logged in → show the main ERP layout with sidebar.
   
   The <AppShell> component wraps all authenticated pages and
   provides the persistent sidebar + header layout.
   ============================================================ */

import { Routes, Route, Navigate } from 'react-router-dom'

// ── STORE ─────────────────────────────────────────────────────
// useAuthStore gives us access to the global auth state
// We use it to check if the user is logged in
import { useAuthStore } from './store/authStore'

// ── LAYOUT COMPONENTS ─────────────────────────────────────────
import AppShell from './components/Layout/AppShell'
import MargAppShell from './components/Layout/MargAppShell'
import ThemeProvider from './components/Layout/ThemeProvider'
import { useThemeStore } from './store/themeStore'

// ── PAGES ─────────────────────────────────────────────────────
import LoginPage from './pages/Login'
import DashboardPage from './pages/Dashboard'
import SettingsPage from './pages/Settings'
import ProductsPage from './pages/inventory/Products'
import FinancePage from './pages/finance/Finance'
import ClientManagementPage from './pages/admin/ClientManagement'
import BulletinBoard from './pages/bulletin/BulletinBoard'
import BillingPage from './pages/sales/Billing'
import PurchaseBill from './pages/purchase/PurchaseBill'
import MasterPage from './pages/master/MasterPage'

// ── PROTECTED ROUTE WRAPPER ───────────────────────────────────
// This component wraps any page that requires authentication.
// If the user is not logged in, it redirects them to /login.
// This is the standard pattern for protecting routes in React Router v6+.
//
// Usage: <ProtectedRoute><SomePage /></ProtectedRoute>
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  // Read the user from the global auth store
  const user = useAuthStore(state => state.user)

  // If no user is logged in, redirect to the login page
  // `replace` means the login page replaces the current history entry
  // so pressing "Back" won't bring them back to a protected page
  if (!user) {
    return <Navigate to="/login" replace />
  }

  // User is logged in — render the requested page
  return <>{children}</>
}

// ── ROOT APP COMPONENT ────────────────────────────────────────
function App() {
  const activeTheme = useThemeStore(state => state.activeTheme)
  const CurrentShell = activeTheme === 'marg' ? MargAppShell : AppShell

  return (
    <ThemeProvider>
      <Routes>
        {/* ── PUBLIC ROUTES (No login required) ───────────────
          /login: The login page shown to unauthenticated users.
          It auto-detects LAN vs Remote mode and shows the
          appropriate login form (2 fields vs 3 fields).
      ─────────────────────────────────────────────────────── */}
      <Route path="/login" element={<LoginPage />} />

      {/* ── PROTECTED ROUTES (Login required) ───────────────
          All ERP module pages are wrapped in ProtectedRoute.
          The AppShell provides the sidebar + header layout.
          Each child Route is a different ERP module page.
      ─────────────────────────────────────────────────────── */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            {/* Renders MargAppShell if 'marg' theme is active, otherwise modern AppShell */}
            <CurrentShell />
          </ProtectedRoute>
        }
      >
        {/* index: The default page when navigating to "/" — the main dashboard */}
        <Route index element={<BulletinBoard />} />
        <Route path="dashboard" element={<DashboardPage />} />

        {/* ERP Module routes */}
        <Route path="master"           element={<MasterPage />} />
        <Route path="finance"          element={<FinancePage />} />
        <Route path="inventory"        element={<ProductsPage />} />
        <Route path="bulletin"         element={<BulletinBoard />} />
        <Route path="sales"            element={<BillingPage />} />
        <Route path="purchase"         element={<PurchaseBill />} />
        <Route path="sales-return"     element={<BillingPage />} />
        <Route path="purchase-return"  element={<BillingPage />} />
        <Route path="brk-receive"      element={<BillingPage />} />
        <Route path="brk-issue"        element={<BillingPage />} />
        <Route path="gst-inward"       element={<BillingPage />} />
        <Route path="gst-outward"      element={<BillingPage />} />
        <Route path="stock-issue"      element={<BillingPage />} />
        <Route path="stock-receive"    element={<BillingPage />} />
        <Route path="sales-order"      element={<BillingPage />} />
        <Route path="settings"         element={<SettingsPage />} />
        
        {/* AM Admin Routes */}
        <Route path="clients" element={<ClientManagementPage />} />
      </Route>

      {/* ── CATCH-ALL REDIRECT ───────────────────────────────
          Any unknown URL redirects to "/" (dashboard).
          The ProtectedRoute will then redirect to /login if needed.
      ─────────────────────────────────────────────────────── */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </ThemeProvider>
  )
}

export default App
