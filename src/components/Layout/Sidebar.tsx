/* ============================================================
   Sidebar.tsx — Left Navigation Sidebar
   ============================================================
   The sidebar displays navigation links to every ERP module.
   
   KEY FEATURES:
   1. ROLE-BASED VISIBILITY: Each nav item checks the user's
      permissions. If the user can't access Finance, the Finance
      link is simply not rendered — they never even see it exists.
   
   2. KEYBOARD NAVIGATION: Every nav item is a proper <button>
      or <a> element so it's reachable by Tab key. Active item
      is highlighted so the user knows where they are.
   
   3. ACTIVE STATE: The current page's nav item is highlighted
      using React Router's useLocation hook.
   ============================================================ */

import { useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'

// Lucide React icons — lightweight, consistent icon set
import {
  LayoutDashboard, // Dashboard home icon
  Receipt,         // Finance & Accounting
  Package,         // Inventory & Warehouse
  ShoppingCart,    // Sales & Purchase
  Users,           // CRM (customer relations)
  UserCheck,       // HR Management
  BarChart3,       // Reports & Analytics
  Settings,        // Settings & Admin
  Building2,       // Company name display
  Wifi,            // LAN connection indicator
  Globe,           // Remote connection indicator
} from 'lucide-react'

// ── NAV ITEM DEFINITION ───────────────────────────────────────
// Defines the shape of each navigation menu item
interface NavItem {
  label:      string              // Display text (e.g., "Finance")
  path:       string              // URL route (e.g., "/finance")
  icon:       React.ReactNode     // Icon component to show
  module?:    string              // Which permission module to check
                                  // undefined = always visible (e.g., Dashboard)
}

// ── NAV ITEMS CONFIGURATION ───────────────────────────────────
// The ordered list of all navigation items.
// Each item's visibility is controlled by the user's permissions.
const NAV_ITEMS: NavItem[] = [
  {
    label:  'Dashboard',
    path:   '/',
    icon:   <LayoutDashboard size={18} />,
    module: undefined // Dashboard is always visible to all logged-in users
  },
  {
    label:  'Finance & Accounting',
    path:   '/finance',
    icon:   <Receipt size={18} />,
    module: 'finance' // Only shown if user has finance.view = true
  },
  {
    label:  'Inventory',
    path:   '/inventory',
    icon:   <Package size={18} />,
    module: 'inventory'
  },
  {
    label:  'Sales & Purchase',
    path:   '/sales',
    icon:   <ShoppingCart size={18} />,
    module: 'sales'
  },
  {
    label:  'CRM',
    path:   '/crm',
    icon:   <Users size={18} />,
    module: 'crm'
  },
  {
    label:  'HR Management',
    path:   '/hr',
    icon:   <UserCheck size={18} />,
    module: 'hr'
  },
  {
    label:  'Reports',
    path:   '/reports',
    icon:   <BarChart3 size={18} />,
    module: 'reports'
  },
  {
    label:  'Settings',
    path:   '/settings',
    icon:   <Settings size={18} />,
    module: 'settings'
  },
]

// ── SIDEBAR COMPONENT ─────────────────────────────────────────
function Sidebar() {
  // Get the current URL path to highlight the active nav item
  const location = useLocation()

  // Navigate programmatically when a nav item is clicked
  const navigate = useNavigate()

  // Read user and permission checker from the global auth store
  const user = useAuthStore(state => state.user)
  const hasPermission = useAuthStore(state => state.hasPermission)
  const appMode = useAuthStore(state => state.appMode)

  // ── FILTER NAV ITEMS BY PERMISSION ──────────────────────────
  // Only include nav items the current user has VIEW permission for.
  // 'module: undefined' items (Dashboard) are always included.
  const visibleNavItems = NAV_ITEMS.filter(item => {
    if (!item.module) return true // No module restriction = always show
    return hasPermission(item.module as any, 'view')
  })

  // ── CHECK IF A NAV ITEM IS ACTIVE ───────────────────────────
  // Dashboard ("/") is only active when exactly at root.
  // Other pages are active when the path starts with their route.
  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  return (
    <aside
      style={{
        width: 'var(--sidebar-width)',       // 240px (defined in CSS variables)
        minWidth: 'var(--sidebar-width)',     // Prevent shrinking
        height: '100%',
        backgroundColor: 'var(--color-bg-surface)',
        borderRight: '1px solid var(--color-border)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      {/* ── COMPANY INFO SECTION ───────────────────────────────
          Shows the company name and connection mode indicator at the top.
          Gives the user immediate context of which company they're in. */}
      <div style={{
        padding: '16px',
        borderBottom: '1px solid var(--color-border)',
        flexShrink: 0 // Don't let this section shrink
      }}>
        {/* Company icon and name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <div style={{
            width: '32px', height: '32px',
            borderRadius: '8px',
            backgroundColor: 'var(--color-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0
          }}>
            <Building2 size={16} color="white" />
          </div>
          <div style={{ minWidth: 0 }}>
            {/* Company name — truncated if too long */}
            <div style={{
              fontSize: '13px', fontWeight: 600,
              color: 'var(--color-text-primary)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
            }}>
              {user?.companyName ?? 'Loading...'}
            </div>
            {/* User's role label */}
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'capitalize' }}>
              {user?.role?.replace('_', ' ') ?? ''}
            </div>
          </div>
        </div>

        {/* Connection mode badge: shows LAN or Remote status */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '5px',
          padding: '3px 8px',
          borderRadius: '999px',
          fontSize: '11px',
          backgroundColor: appMode === 'remote'
            ? 'rgba(59,130,246,0.15)'  // Blue for remote
            : 'rgba(34,197,94,0.15)',   // Green for LAN/server
          color: appMode === 'remote'
            ? 'var(--color-info)'
            : 'var(--color-success)'
        }}>
          {/* Show different icon and label based on connection mode */}
          {appMode === 'remote'
            ? <><Globe size={10} /> Remote</>
            : <><Wifi size={10} /> LAN Connected</>
          }
        </div>
      </div>

      {/* ── NAVIGATION ITEMS ────────────────────────────────────
          The main nav menu. Scrollable if items exceed sidebar height. */}
      <nav
        style={{ flex: 1, overflowY: 'auto', padding: '8px' }}
        aria-label="Main navigation" // Screen reader label for accessibility
      >
        {visibleNavItems.map((item) => {
          const active = isActive(item.path)

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)} // Navigate on click
              // onKeyDown handled naturally by browser for Enter/Space on buttons
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '9px 12px',
                marginBottom: '2px',
                borderRadius: 'var(--radius-md)',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: '13px',
                fontWeight: active ? 600 : 400,
                // Active item: highlighted with primary color background
                // Inactive item: transparent background (shows on hover via CSS)
                backgroundColor: active
                  ? 'rgba(79,70,229,0.15)'       // Indigo tint for active
                  : 'transparent',
                color: active
                  ? 'var(--color-primary)'        // Primary color for active text
                  : 'var(--color-text-secondary)', // Muted for inactive
                transition: 'all var(--transition-fast)',
                // Left border indicator for active state
                borderLeft: active
                  ? '2px solid var(--color-primary)'
                  : '2px solid transparent',
              }}
              // Accessibility: Mark the active page for screen readers
              aria-current={active ? 'page' : undefined}
              title={item.label} // Tooltip on hover
            >
              {/* Module icon */}
              <span style={{ flexShrink: 0, opacity: active ? 1 : 0.7 }}>
                {item.icon}
              </span>
              {/* Module label */}
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {item.label}
              </span>
            </button>
          )
        })}
      </nav>

      {/* ── BOTTOM USER INFO SECTION ────────────────────────────
          Shows the logged-in user's name at the bottom of the sidebar. */}
      <div style={{
        padding: '12px 16px',
        borderTop: '1px solid var(--color-border)',
        flexShrink: 0
      }}>
        <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
          Logged in as
        </div>
        <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-primary)' }}>
          {user?.name ?? 'Unknown User'}
        </div>
      </div>
    </aside>
  )
}

export default Sidebar
