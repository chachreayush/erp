import { useNavigate } from 'react-router-dom'
import BulletinBoard from './bulletin/BulletinBoard'
import { 
  LayoutDashboard, Receipt, Package, ShoppingCart, 
  Users, BarChart3, Settings, Boxes 
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'

export default function HomeScreen() {
  const navigate = useNavigate()
  const user = useAuthStore(state => state.user)

  const modules = [
    { label: 'Master Data', path: '/master', icon: <LayoutDashboard size={24} />, color: '#3b82f6', desc: 'Manage ledgers, products, companies' },
    { label: 'Current Stock', path: '/stock', icon: <Boxes size={24} />, color: '#10b981', desc: 'Real-time inventory and tracking' },
    { label: 'Sales & Purchase', path: '/sales', icon: <ShoppingCart size={24} />, color: '#f59e0b', desc: 'Invoices, POS, Bills' },
    { label: 'Inventory (Brk/Exp)', path: '/inventory', icon: <Package size={24} />, color: '#ef4444', desc: 'Breakage, expiry and transfers' },
    { label: 'Finance & Accounts', path: '/finance', icon: <Receipt size={24} />, color: '#8b5cf6', desc: 'Ledgers, trial balance, P&L' },
    { label: 'Reports', path: '/reports', icon: <BarChart3 size={24} />, color: '#6366f1', desc: 'Analytics and detailed reports' },
    { label: 'Settings', path: '/settings', icon: <Settings size={24} />, color: '#64748b', desc: 'System configuration' },
  ]

  if (user?.role === 'am_admin') {
    modules.unshift({ label: 'Client Management', path: '/admin/clients', icon: <Users size={24} />, color: '#ec4899', desc: 'Manage client organizations' })
  }

  return (
    <div style={{ maxWidth: '1600px', margin: '0 auto', padding: '24px', animation: 'fadeIn 0.3s ease-in-out', height: '100%', overflow: 'hidden', display: 'flex', gap: '32px' }}>
      
      {/* LEFT COLUMN: Welcome & Modules */}
      <div style={{ flex: '2.5', display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ marginBottom: '24px', flexShrink: 0 }}>
          <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800, color: 'var(--color-text)', marginBottom: '8px' }}>
            Welcome back, {user?.username}
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '15px', margin: 0 }}>
            Select a module below to begin, or check the latest company bulletins.
          </p>
        </div>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(2, 1fr)', 
          gap: '16px',
          alignContent: 'start',
          flex: 1,
          overflowY: 'auto',
          paddingRight: '8px'
        }}>
          {modules.map(mod => (
            <div 
              key={mod.path}
              onClick={() => navigate(mod.path)}
              style={{
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: '12px',
                padding: '16px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                transition: 'all 0.2s',
                boxShadow: '0 2px 4px -1px rgba(0,0,0,0.1)'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 10px -3px rgba(0,0,0,0.1)';
                e.currentTarget.style.borderColor = mod.color;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 4px -1px rgba(0,0,0,0.1)';
                e.currentTarget.style.borderColor = 'var(--color-border)';
              }}
            >
              <div style={{ 
                width: '48px', height: '48px', borderRadius: '12px', flexShrink: 0,
                backgroundColor: `${mod.color}15`, color: mod.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                {mod.icon}
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 4px 0', color: 'var(--color-text)' }}>
                  {mod.label}
                </h3>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-text-muted)' }}>
                  {mod.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT COLUMN: Bulletin Board */}
      <div style={{ 
        flex: '1.5', 
        borderLeft: '1px solid var(--color-border)', 
        paddingLeft: '32px',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden'
      }}>
        <div style={{ height: '100%', overflowY: 'auto', paddingRight: '12px' }}>
          <BulletinBoard />
        </div>
      </div>

    </div>
  )
}
