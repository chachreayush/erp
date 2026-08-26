import { useState, useEffect } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { 
  HelpCircle, Monitor, 
  Search, LayoutDashboard, Receipt, Package, ShoppingCart, Users, UserCheck, BarChart3, Settings, Boxes
} from 'lucide-react'
import './MargAppShell.css'

// Custom hook for current time
const useCurrentTime = () => {
  const [time, setTime] = useState(new Date())
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])
  return time
}

// Same routing structure as the modern AppShell
interface NavItem {
  label: string
  path: string
  icon: React.ReactNode
  module?: string
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', path: '/', icon: <LayoutDashboard size={14} /> },
  { label: 'Finance & Accounting', path: '/finance', icon: <Receipt size={14} />, module: 'finance' },
  { label: 'Inventory', path: '/inventory', icon: <Package size={14} />, module: 'inventory' },
  { label: 'Current Stock', path: '/stock', icon: <Boxes size={14} />, module: 'inventory' },
  { label: 'Sales & Purchase', path: '/sales', icon: <ShoppingCart size={14} />, module: 'sales' },
  { label: 'CRM', path: '/crm', icon: <Users size={14} />, module: 'crm' },
  { label: 'HR Management', path: '/hr', icon: <UserCheck size={14} />, module: 'hr' },
  { label: 'Reports', path: '/reports', icon: <BarChart3 size={14} />, module: 'reports' },
  { label: 'Settings', path: '/settings', icon: <Settings size={14} />, module: 'settings' },
]

const MargAppShell = () => {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const now = useCurrentTime()
  
  // Format dates for the footer
  const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  const dayStr = now.toLocaleDateString('en-GB', { weekday: 'long' })
  const timeStr = now.toLocaleTimeString('en-GB', { hour12: false })

  // Filter items based on user role (simulated here if user object lacks permissions, assuming true for demo)
  const allowedNavItems = NAV_ITEMS.filter(item => {
    if (!item.module) return true
    // If permissions exist, check them. Otherwise allow.
    return user?.permissions ? (user.permissions as any)[item.module]?.view : true
  })

  const isHomeScreen = location.pathname === '/'

  return (
    <div className="marg-shell">
      
      {/* 1. TITLE BAR — Only show on Home Screen */}
      {isHomeScreen && (
        <div className="marg-title-bar">
          <div className="marg-title-left">
            <div className="marg-title-brand">MARG ERP 9+ (Theme)</div>
            <span className="marg-title-info">|Gold|Ver-26-08-2025|Lic-TRIAL|ANDURO-ANDUROX 2025-2026|USER-{user?.username?.toUpperCase() || 'ADMIN'}</span>
          </div>
        </div>
      )}

      {/* 2. MENU BAR (Replaced with actual modules) */}
      {isHomeScreen && (
        <div className="marg-menu-bar">
          {allowedNavItems.map(item => (
            <div 
              key={item.path} 
              className="marg-menu-item"
              style={{ cursor: 'pointer', backgroundColor: location.pathname === item.path ? '#dbeafe' : 'transparent', outline: location.pathname === item.path ? '1px solid #60a5fa' : 'none' }}
              onClick={() => navigate(item.path)}
            >
              {item.label}
            </div>
          ))}
        </div>
      )}

      {/* ── 3. MAIN CONTENT AREA (Flex Row) ─────────────────────────── */}
      <div className="marg-main-area">
        
        {/* LEFT SIDEBAR (Replaced with actual navigation) */}
        <div className="marg-left-sidebar">
          
          <div className="marg-sidebar-section">
            <div className="marg-sidebar-title">Modules</div>
            <ul className="marg-sidebar-list">
              {allowedNavItems.map(item => (
                <li 
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 8px', backgroundColor: location.pathname === item.path ? 'var(--color-primary-light)' : 'transparent' }}
                >
                  {item.icon} {item.label}
                </li>
              ))}
            </ul>
          </div>
          
          {/* Keep bottom section but clean it up for our actual tools */}
          <div className="marg-sidebar-bottom">
            <div className="marg-sidebar-btn" onClick={() => navigate('/')}>
              <Monitor size={14}/> Dashboard
            </div>
            <div className="marg-sidebar-btn" onClick={() => navigate('/settings')}>
              <Settings size={14}/> Settings
            </div>
            <div className="marg-sidebar-btn" style={{ justifyContent: 'space-between', fontSize: '11px', color: '#000' }}>
              Search ERP <Search size={12} color="#2563eb"/>
            </div>
          </div>
        </div>

        {/* CENTER DASHBOARD AREA */}
        <div className="marg-center-content">
          
          {/* Top Quick Action Bar (Simplified to real actions) */}
          <div className="marg-quick-actions">
            <div className="marg-action-red" onClick={() => navigate('/inventory')}>Inventory</div>
            <div className="marg-action-gray" onClick={() => navigate('/sales')}>Sales</div>
            <div className="marg-action-gray" onClick={() => navigate('/finance')}>Finance</div>
            <div className="marg-action-red"><HelpCircle size={12}/> MARG HELP</div>
            <div className="marg-action-gray marg-action-search">Search <Search size={12}/></div>
          </div>

          <div className="marg-dashboard-area" style={location.pathname !== '/' ? { justifyContent: 'flex-start', alignItems: 'stretch', flex: 1, height: '100%' } : undefined}>
            
            {/* Marg Logos / Badges area - ONLY render if on Dashboard */}
            {location.pathname === '/' && (
              <div className="marg-logos">
                <div className="marg-logo-box">
                  <div className="marg-logo-title">Marg<span style={{ color: '#3b82f6', fontSize: '24px', fontStyle: 'normal' }}>®</span></div>
                  <div className="marg-logo-subtitle">The Business Backbone</div>
                  <div className="marg-logo-version">Marg ERP 9+ (Clone)</div>
                </div>
                
                <div className="marg-badges">
                  <div className="marg-circle-badge">CMMI 3</div>
                  <div className="marg-circle-badge">GDPR</div>
                  <div className="marg-circle-badge">ISO</div>
                </div>
              </div>
            )}

            <div className="marg-outlet-container" style={{ height: location.pathname !== '/' ? '100%' : 'auto', flex: location.pathname !== '/' ? 1 : 'none', marginTop: location.pathname !== '/' ? '0' : 'auto', borderTop: location.pathname !== '/' ? 'none' : '1px solid #e5e7eb', paddingBottom: location.pathname !== '/' ? '0' : '16px' }}>
               <Outlet /> 
            </div>

          </div>

        </div>

        {/* Removed Fake Right Sidebars as requested */}

      </div>

      {/* ── 4. STATUS / FOOTER BAR ──────────────────────────────────── */}
      <div className="marg-status-bar">
        
        <div className="marg-status-top">
          {/* Company Info */}
          <div className="marg-company-info">
            <div className="marg-company-name">ANDUROX-ANDURO</div>
            <div className="marg-company-period">Period Apr., 2025 - Mar., 2026</div>
          </div>
          
          {/* Date / Time */}
          <div className="marg-date-time">
            <div className="marg-dt-grid">
              <div>Date :</div><div className="marg-dt-val">{dateStr}</div>
              <div>Day :</div><div className="marg-dt-val">{dayStr}</div>
              <div>Time :</div>
              <div className="marg-time-flex">
                <span className="marg-time-box">{timeStr}</span>
                <span className="marg-updates-btn">New Updates</span>
              </div>
            </div>
            
            <div className="marg-help-btn">HELP</div>
          </div>
        </div>

        {/* Shortcuts Bar */}
        <div className="marg-shortcuts">
          <span>F1-Company</span>
          <span>Ctr+I-Item</span>
          <span>+L-Party</span>
          <span>+U-User</span>
          <span>+F1-Directory</span>
          <span>+F10-Calendar</span>
          <span>+F11-Printer</span>
        </div>

        {/* Developer / License Info */}
        <div className="marg-dev-info">
          <div className="marg-dev-left">
            <div>Developed & Marketed By :</div>
            <div className="marg-dev-brand">MARG ERP LIMITED</div>
            <div>Support : <span className="marg-dev-email">SUPPORT@MARGERP.COM</span></div>
            <div>Help Line : +911130969600,+911166969600</div>
          </div>
          
          <div className="marg-dev-center">
            <div style={{ textAlign: 'center' }}>
              <div className="marg-dev-center-title">Marg</div>
              <div className="marg-dev-center-sub">The Business Backbone</div>
            </div>
          </div>
          
          <div className="marg-dev-right">
            <div className="marg-dev-right-label">Authorised User :</div>
            <div className="marg-dev-right-val">Trial Version</div>
          </div>
        </div>

      </div>

    </div>
  )
}

export default MargAppShell
