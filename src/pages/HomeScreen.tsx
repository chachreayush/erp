import React from 'react'
import { useNavigate } from 'react-router-dom'
import BulletinBoard from './bulletin/BulletinBoard'
import { 
  LayoutDashboard, Receipt, Package, ShoppingCart, 
  Users, UserCheck, BarChart3, Settings, Boxes 
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'

export default function HomeScreen() {
  const navigate = useNavigate()
  const user = useAuthStore(state => state.user)

  const modules = [
    { label: 'Master Data', path: '/master', icon: <LayoutDashboard size={32} />, color: '#3b82f6', desc: 'Manage ledgers, products, companies' },
    { label: 'Current Stock', path: '/stock', icon: <Boxes size={32} />, color: '#10b981', desc: 'Real-time inventory and tracking' },
    { label: 'Sales & Purchase', path: '/sales', icon: <ShoppingCart size={32} />, color: '#f59e0b', desc: 'Invoices, POS, Bills' },
    { label: 'Inventory (Brk/Exp)', path: '/inventory', icon: <Package size={32} />, color: '#ef4444', desc: 'Breakage, expiry and transfers' },
    { label: 'Finance & Accounts', path: '/finance', icon: <Receipt size={32} />, color: '#8b5cf6', desc: 'Ledgers, trial balance, P&L' },
    { label: 'Reports', path: '/reports', icon: <BarChart3 size={32} />, color: '#6366f1', desc: 'Analytics and detailed reports' },
    { label: 'Settings', path: '/settings', icon: <Settings size={32} />, color: '#64748b', desc: 'System configuration' },
  ]

  if (user?.role === 'am_admin') {
    modules.unshift({ label: 'Client Management', path: '/admin/clients', icon: <Users size={32} />, color: '#ec4899', desc: 'Manage client organizations' })
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px', animation: 'fadeIn 0.3s ease-in-out' }}>
      
      <div style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 800, color: 'var(--color-text)', marginBottom: '8px' }}>
          Welcome back, {user?.username}
        </h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '16px' }}>
          Select a module below to begin, or check the latest company bulletins.
        </p>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', 
        gap: '20px',
        marginBottom: '40px'
      }}>
        {modules.map(mod => (
          <div 
            key={mod.path}
            onClick={() => navigate(mod.path)}
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '12px',
              padding: '24px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              transition: 'all 0.2s',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0,0,0,0.1)';
              e.currentTarget.style.borderColor = mod.color;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.1)';
              e.currentTarget.style.borderColor = 'var(--color-border)';
            }}
          >
            <div style={{ 
              width: '56px', height: '56px', borderRadius: '12px', 
              backgroundColor: \\15\, color: mod.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              {mod.icon}
            </div>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 4px 0', color: 'var(--color-text)' }}>
                {mod.label}
              </h3>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-text-muted)' }}>
                {mod.desc}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '40px' }}>
        <BulletinBoard />
      </div>

    </div>
  )
}

