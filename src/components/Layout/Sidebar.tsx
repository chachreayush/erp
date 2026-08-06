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

import React, { useEffect, useRef } from 'react'
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
  Building,        // Client Management
  Wifi,            // LAN connection indicator
  Globe,           // Remote connection indicator
  Megaphone,       // Bulletin Board
} from 'lucide-react'

// ── NAV ITEM DEFINITION ───────────────────────────────────────
interface NavItem {
  label:      string
  path:       string
  icon:       React.ReactNode
  module?:    string
}

// ── NAV ITEMS CONFIGURATION ───────────────────────────────────
const NAV_ITEMS: NavItem[] = [
  {
    label:  'Dashboard',
    path:   '/dashboard',
    icon:   <LayoutDashboard size={18} />,
    module: undefined
  },
  {
    label:  'Finance & Accounting',
    path:   '/finance',
    icon:   <Receipt size={18} />,
    module: 'finance'
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
  }
]

interface SidebarProps {
  salesSubMenuOpen: boolean
  setSalesSubMenuOpen: (open: boolean) => void
  salesPurchaseRef: React.RefObject<HTMLButtonElement | null>
}

// ── SIDEBAR COMPONENT ─────────────────────────────────────────
function Sidebar({ salesSubMenuOpen: _salesSubMenuOpen, setSalesSubMenuOpen, salesPurchaseRef }: SidebarProps) {
  const location = useLocation()
  const navigate = useNavigate()

  const user = useAuthStore(state => state.user)
  const hasPermission = useAuthStore(state => state.hasPermission)
  const appMode = useAuthStore(state => state.appMode)

  const visibleNavItems = NAV_ITEMS.filter(item => {
    if (!item.module) return true
    return hasPermission(item.module as any, 'view')
  })

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  // Flatten all buttons into a single array for unified keyboard navigation
  const sidebarButtons = [
    ...visibleNavItems.map(item => ({ label: item.label, path: item.path, icon: item.icon })),
    ...(user?.role === 'am_admin' ? [{ label: 'Client Management', path: '/clients', icon: <Building size={18} /> }] : []),
    { label: 'Bulletin Board', path: '/bulletin', icon: <Megaphone size={18} /> }
  ]

  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([])

  // Focus Dashboard on mount
  useEffect(() => {
    // We delay slightly to ensure DOM is ready
    const timer = setTimeout(() => {
      buttonRefs.current[0]?.focus()
    }, 100)
    return () => clearTimeout(timer)
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      const nextIndex = (index + 1) % sidebarButtons.length
      buttonRefs.current[nextIndex]?.focus()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      const prevIndex = (index - 1 + sidebarButtons.length) % sidebarButtons.length
      buttonRefs.current[prevIndex]?.focus()
    } else if (e.key === 'Enter') {
      const item = sidebarButtons[index]
      if (item.label === 'Sales & Purchase') {
        e.preventDefault()
        setSalesSubMenuOpen(true)
      } else {
        navigate(item.path)
      }
    }
  }

  return (
    <aside
      style={{
        width: 'var(--sidebar-width)',
        minWidth: 'var(--sidebar-width)',
        height: '100%',
        backgroundColor: 'var(--color-bg-surface)',
        borderRight: '1px solid var(--color-border)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      {/* ── COMPANY INFO SECTION ─────────────────────────────── */}
      <div style={{
        padding: '16px',
        borderBottom: '1px solid var(--color-border)',
        flexShrink: 0
      }}>
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
            <div style={{
              fontSize: '13px', fontWeight: 600,
              color: 'var(--color-text-primary)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
            }}>
              {user?.companyName ?? 'Loading...'}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'capitalize' }}>
              {user?.role?.replace('_', ' ') ?? ''}
            </div>
          </div>
        </div>

        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '5px',
          padding: '3px 8px',
          borderRadius: '999px',
          fontSize: '11px',
          backgroundColor: appMode === 'remote'
            ? 'rgba(59,130,246,0.15)'
            : 'rgba(34,197,94,0.15)',
          color: appMode === 'remote'
            ? 'var(--color-info)'
            : 'var(--color-success)'
        }}>
          {appMode === 'remote'
            ? <><Globe size={10} /> Remote</>
            : <><Wifi size={10} /> LAN Connected</>
          }
        </div>
      </div>

      {/* ── NAVIGATION ITEMS ──────────────────────────────────── */}
      <nav
        style={{ flex: 1, overflowY: 'auto', padding: '8px' }}
        aria-label="Main navigation"
      >
        {sidebarButtons.map((item, index) => {
          const active = isActive(item.path)
          const isSalesPurchase = item.label === 'Sales & Purchase'

          return (
            <button
              key={item.path}
              ref={(el) => {
                buttonRefs.current[index] = el
                if (isSalesPurchase) {
                  // Assign the ref passed from AppShell
                  (salesPurchaseRef as any).current = el
                }
              }}
              onClick={() => {
                if (isSalesPurchase) {
                  setSalesSubMenuOpen(true)
                } else {
                  navigate(item.path)
                }
              }}
              onKeyDown={(e) => handleKeyDown(e, index)}
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
                backgroundColor: active
                  ? 'rgba(79,70,229,0.15)'
                  : 'transparent',
                color: active
                  ? 'var(--color-primary)'
                  : 'var(--color-text-secondary)',
                transition: 'all var(--transition-fast)',
                borderLeft: active
                  ? '2px solid var(--color-primary)'
                  : '2px solid transparent',
              }}
              aria-current={active ? 'page' : undefined}
              title={item.label}
            >
              <span style={{ flexShrink: 0, opacity: active ? 1 : 0.7 }}>
                {item.icon}
              </span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {item.label}
              </span>
            </button>
          )
        })}
      </nav>

      {/* ── USER INFO / LOGOUT SECTION ──────────────────────────── */}
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
