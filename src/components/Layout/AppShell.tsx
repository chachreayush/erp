/* ============================================================
   AppShell.tsx — Main Application Layout (Sidebar + Header)
   ============================================================
   AppShell is the persistent layout wrapper for ALL authenticated
   ERP pages. It renders:
   
   ┌─────────────────────────────────────────────────────────┐
   │                    HEADER (56px)                        │
   ├──────────────┬──────────────────────────────────────────┤
   │              │                                          │
   │   SIDEBAR    │         PAGE CONTENT AREA                │
   │   (240px)    │     (renders current route page)         │
   │              │                                          │
   └──────────────┴──────────────────────────────────────────┘
   
   The <Outlet /> component from React Router renders the
   specific page for the current URL inside the content area.
   ============================================================ */

import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'

// ── INLINE STYLES ─────────────────────────────────────────────
// Defined as a constant object for type safety and clarity.
// In later sprints these will move to CSS classes.
const styles = {
  // The outermost container — fills the entire window
  shell: {
    display: 'flex',
    flexDirection: 'column' as const,
    height: '100vh',          // Full viewport height
    width: '100vw',           // Full viewport width
    overflow: 'hidden',       // No outer scroll — inner sections scroll
    backgroundColor: 'var(--color-bg)'
  },
  // The body area below the header — sidebar + content side by side
  body: {
    display: 'flex',
    flex: 1,                  // Take up all remaining height below header
    overflow: 'hidden'        // Prevent overflow — children will scroll individually
  },
  // The main content area to the right of the sidebar
  content: {
    flex: 1,                  // Take all remaining width after sidebar
    overflow: 'auto',         // Scrollable — ERP pages can be long
    padding: '24px',
    backgroundColor: 'var(--color-bg)'
  }
}

// ── APPSHELL COMPONENT ────────────────────────────────────────
function AppShell() {
  return (
    // Outer wrapper fills the full window
    <div style={styles.shell}>

      {/* TOP HEADER BAR
          Contains: app logo/name, current user info, notifications button, logout.
          Fixed at the top, always visible regardless of scroll position. */}
      <Header />

      {/* BODY: Sidebar + Content Area side by side */}
      <div style={styles.body}>

        {/* LEFT SIDEBAR
            Contains: navigation links to all ERP modules.
            Width is fixed at 240px (defined in CSS variables).
            Role-based: only shows modules the user has access to. */}
        <Sidebar />

        {/* MAIN CONTENT AREA
            <Outlet /> is a React Router placeholder that renders
            the page component for the currently active URL.
            Example: if URL is "/finance", it renders <FinancePage /> here. */}
        <main style={styles.content}>
          <Outlet />
        </main>

      </div>
    </div>
  )
}

export default AppShell
