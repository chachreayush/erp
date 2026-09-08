import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { 
  LayoutDashboard, Receipt, Package, ShoppingCart, 
  Users, BarChart3, Settings, Boxes, AlertTriangle, Clock, Globe
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { apiGetLowStockAlerts, apiGetInvoices, LowStockAlert, Invoice } from '../../lib/api'

export default function HomeScreen() {
  const navigate = useNavigate()
  const user = useAuthStore(state => state.user)

  const [alerts, setAlerts] = useState<LowStockAlert[]>([])
  const [recentInvoices, setRecentInvoices] = useState<Invoice[]>([])

  useEffect(() => {
    // Fetch live data for the dashboard widgets
    const fetchData = async () => {
      try {
        const alertsRes = await apiGetLowStockAlerts()
        setAlerts(alertsRes.alerts || [])
        
        // Fetch recent bills (mixed types)
        const invoicesRes = await apiGetInvoices()
        setRecentInvoices(invoicesRes.slice(0, 8)) // Get top 8 recent
      } catch (err) {
        console.error("Failed to fetch dashboard data:", err)
      }
    }
    fetchData()
  }, [])

  const modules = [
    { label: 'Sales & Purchase', path: '/sales', icon: <ShoppingCart size={28} />, color: '#3b82f6', desc: 'Invoices, POS, Bills' },
    { label: 'Master Data', path: '/master', icon: <LayoutDashboard size={28} />, color: '#f59e0b', desc: 'Ledgers, Products' },
    { label: 'Current Stock', path: '/stock', icon: <Boxes size={28} />, color: '#10b981', desc: 'Real-time inventory' },
    { label: 'Finance & Accounts', path: '/finance', icon: <Receipt size={28} />, color: '#8b5cf6', desc: 'Vouchers, P&L' },
    { label: 'Reports', path: '/reports', icon: <BarChart3 size={28} />, color: '#6366f1', desc: 'Analytics' },
    { label: 'Inventory (Brk/Exp)', path: '/inventory', icon: <Package size={28} />, color: '#ef4444', desc: 'Breakage, expiry' },
    { label: 'Settings', path: '/settings', icon: <Settings size={28} />, color: '#64748b', desc: 'Configuration' },
  ]

  if (user?.role === 'am_admin') {
    modules.push({ label: 'Client Management', path: '/admin/clients', icon: <Users size={28} />, color: '#ec4899', desc: 'Manage organizations' })
  }

  return (
    <div style={{ maxWidth: '1600px', margin: '0 auto', padding: '24px', animation: 'fadeIn 0.3s ease-in-out', height: '100%', display: 'flex', flexDirection: 'column', gap: '32px', overflowY: 'auto' }}>
      
      {/* ── ROW 1: HEADER ── */}
      <div style={{ flexShrink: 0 }}>
        <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800, color: 'var(--color-text)', marginBottom: '4px' }}>
          Welcome back, {user?.username}
        </h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '15px', margin: 0 }}>
          Here is what's happening with your business today.
        </p>
      </div>

      {/* ── ROW 2: MODULE LAUNCHER GRID (Workspace Hub) ── */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', 
        gap: '16px',
        flexShrink: 0
      }}>
        {modules.map(mod => (
          <div 
            key={mod.path}
            onClick={() => navigate(mod.path)}
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '12px',
              padding: '20px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              transition: 'all 0.2s',
              boxShadow: '0 2px 4px -1px rgba(0,0,0,0.05)'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 12px -4px rgba(0,0,0,0.1)';
              e.currentTarget.style.borderColor = mod.color;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 4px -1px rgba(0,0,0,0.05)';
              e.currentTarget.style.borderColor = 'var(--color-border)';
            }}
          >
            <div style={{ 
              width: '56px', height: '56px', borderRadius: '12px', flexShrink: 0,
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

      {/* ── ROW 2.5: DYNAMIC GEOGRAPHIC MAP ── */}
      <div style={{
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: '12px',
        padding: '24px',
        flexShrink: 0,
        height: '300px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundImage: 'radial-gradient(circle at center, rgba(59, 130, 246, 0.05) 0%, transparent 70%)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ position: 'absolute', top: '20px', left: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Globe size={20} color="#3b82f6" />
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--color-text)' }}>Live Geographic Sales Map</h3>
        </div>
        
        {/* Placeholder Map Visuals */}
        <div style={{ width: '100%', height: '100%', border: '2px dashed var(--color-border)', borderRadius: '8px', marginTop: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.6 }}>
           <p style={{ color: 'var(--color-text-muted)', fontSize: '14px', fontWeight: 500, textAlign: 'center' }}>
             [ Interactive Map Canvas ]<br/>
             <span style={{ fontSize: '12px' }}>Auto-scaling geo-spatial engine will render here in Stage 2</span>
           </p>
        </div>
      </div>

      {/* ── ROW 3: BOTTOM WIDGETS (2-Column Layout) ── */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr', 
        gap: '24px', 
        flex: 1,
        minHeight: '400px'
      }}>
        
        {/* Widget 1: System Alerts (Live Data) */}
        <div style={{ 
          backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', 
          borderRadius: '12px', display: 'flex', flexDirection: 'column', overflow: 'hidden'
        }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={18} color="#ef4444" />
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--color-text)' }}>System Alerts</h3>
          </div>
          <div style={{ padding: '12px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {alerts.length === 0 ? (
              <p style={{ padding: '16px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '14px' }}>No pending alerts. You're all caught up!</p>
            ) : (
              alerts.map((alert, idx) => (
                <div key={idx} style={{ 
                  padding: '12px 16px', backgroundColor: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '8px',
                  display: 'flex', flexDirection: 'column', gap: '4px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#991b1b' }}>Low Stock: {alert.name}</span>
                    <span style={{ fontSize: '12px', backgroundColor: '#fee2e2', color: '#991b1b', padding: '2px 8px', borderRadius: '12px', fontWeight: 500 }}>
                      {alert.current_stock} left
                    </span>
                  </div>
                  <span style={{ fontSize: '12px', color: '#b91c1c' }}>Reorder recommended ({alert.suggested_order} qty)</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Widget 2: Recent Activities (Live Data) */}
        <div style={{ 
          backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', 
          borderRadius: '12px', display: 'flex', flexDirection: 'column', overflow: 'hidden'
        }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={18} color="#3b82f6" />
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--color-text)' }}>Recent Activities</h3>
          </div>
          <div style={{ padding: '0', overflowY: 'auto', flex: 1 }}>
            {recentInvoices.length === 0 ? (
               <p style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '14px' }}>No recent activities found.</p>
            ) : (
               <div style={{ display: 'flex', flexDirection: 'column' }}>
                 {recentInvoices.map((inv, idx) => (
                   <div key={inv.id || idx} style={{ 
                     padding: '12px 20px', borderBottom: '1px solid var(--color-border)',
                     display: 'flex', flexDirection: 'column', gap: '4px'
                   }}>
                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                       <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text)' }}>
                         Created {(inv.invoice_type || '').replace('-', ' ').toUpperCase()}
                       </span>
                       <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                         {new Date(inv.date || '').toLocaleDateString()}
                       </span>
                     </div>
                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                       <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>{inv.invoice_number} | {inv.customer_name}</span>
                       <span style={{ fontSize: '13px', fontWeight: 600, color: (inv.invoice_type || '').includes('return') || (inv.invoice_type || '').includes('purchase-bill') ? '#ef4444' : '#10b981' }}>
                         ₹{inv.grand_total?.toFixed(2)}
                       </span>
                     </div>
                   </div>
                 ))}
               </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
