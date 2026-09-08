

import { 
  Building2, Users, Server, Globe,
  
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'

// Mini Sparkline SVG Component (Hardcoded for aesthetics)
const Sparkline = ({ color, points }: { color: string, points: string }) => (
  <svg width="80" height="30" viewBox="0 0 100 30" style={{ overflow: 'visible' }}>
    <polyline fill="none" stroke={color} strokeWidth="3" points={points} strokeLinecap="round" strokeLinejoin="round" />
    <polygon fill={`${color}20`} points={`0,30 ${points} 100,30`} />
  </svg>
)



const MiniGanttChart = ({ color }: { color: string }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', height: '30px', justifyContent: 'center' }}>
    <div style={{ width: '20px', height: '6px', backgroundColor: color, borderRadius: '2px', marginLeft: '0px' }} />
    <div style={{ width: '15px', height: '6px', backgroundColor: color, borderRadius: '2px', marginLeft: '10px' }} />
    <div style={{ width: '25px', height: '6px', backgroundColor: color, borderRadius: '2px', marginLeft: '20px' }} />
  </div>
)

export default function AdminDashboard() {
  
  const user = useAuthStore(state => state.user)

  return (
    <div style={{ 
      maxWidth: '1600px', margin: '0 auto', padding: '32px', 
      animation: 'fadeIn 0.3s ease-in-out', height: '100%', 
      display: 'flex', flexDirection: 'column', gap: '24px', overflowY: 'auto' 
    }}>
      
      {/* ── HEADER ── */}
      <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--color-text)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            Good morning, {(user?.name || 'Admin').split(' ')[0]} 👋
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '14px', margin: 0, fontWeight: 500 }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} • Global Overview
          </p>
        </div>
      </div>

      {/* ── TOP 4 CARDS (Exact match to Mockup) ── */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', 
        gap: '24px',
        flexShrink: 0
      }}>
        
        {/* Card 1: FINANCE HUB */}
        <div style={{ backgroundColor: '#1e1f23', border: '1px solid #1e3a5f', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#3b82f620', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Building2 size={24} color="#3b82f6" />
              </div>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#fff', margin: '0 0 4px 0', letterSpacing: '0.5px' }}>FINANCE HUB</h3>
                <p style={{ fontSize: '13px', color: '#8892b0', margin: 0 }}>Cash flow graph</p>
              </div>
            </div>
            <Sparkline color="#3b82f6" points="0,25 20,15 40,20 60,5 80,10 100,2" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', borderTop: '1px solid #ffffff10', paddingTop: '16px' }}>
             <div><p style={{ fontSize:'12px', color:'#8892b0', margin:'0 0 4px 0' }}>Revenue</p><p style={{ fontSize:'20px', fontWeight:700, color:'#fff', margin:0 }}>$145.2K</p></div>
             <div><p style={{ fontSize:'12px', color:'#8892b0', margin:'0 0 4px 0' }}>Expenses</p><p style={{ fontSize:'20px', fontWeight:700, color:'#fff', margin:0 }}>$78.1K</p></div>
             <div><p style={{ fontSize:'12px', color:'#8892b0', margin:'0 0 4px 0' }}>Payables</p><p style={{ fontSize:'20px', fontWeight:700, color:'#fff', margin:0 }}>$32K</p></div>
          </div>
        </div>

        {/* Card 2: SUPPLY CHAIN */}
        <div style={{ backgroundColor: '#1e1f23', border: '1px solid #14402a', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#10b98120', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Server size={24} color="#10b981" />
              </div>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#fff', margin: '0 0 4px 0', letterSpacing: '0.5px' }}>SUPPLY CHAIN</h3>
                <p style={{ fontSize: '13px', color: '#8892b0', margin: 0 }}>Inventory flow</p>
              </div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', borderTop: '1px solid #ffffff10', paddingTop: '16px' }}>
             <div><p style={{ fontSize:'12px', color:'#8892b0', margin:'0 0 4px 0' }}>Orders</p><p style={{ fontSize:'20px', fontWeight:700, color:'#fff', margin:0 }}>189</p></div>
             <div><p style={{ fontSize:'12px', color:'#8892b0', margin:'0 0 4px 0' }}>Stock level</p><p style={{ fontSize:'20px', fontWeight:700, color:'#fff', margin:0 }}>88%</p></div>
             <div><p style={{ fontSize:'12px', color:'#8892b0', margin:'0 0 4px 0' }}>Shipments</p><p style={{ fontSize:'20px', fontWeight:700, color:'#fff', margin:0 }}>112</p></div>
          </div>
        </div>

        {/* Card 3: HUMAN CAPITAL */}
        <div style={{ backgroundColor: '#1e1f23', border: '1px solid #5c3a21', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#f59e0b20', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Users size={24} color="#f59e0b" />
              </div>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#fff', margin: '0 0 4px 0', letterSpacing: '0.5px' }}>HUMAN CAPITAL</h3>
                <p style={{ fontSize: '13px', color: '#8892b0', margin: 0 }}>Team overview</p>
              </div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', borderTop: '1px solid #ffffff10', paddingTop: '16px' }}>
             <div><p style={{ fontSize:'12px', color:'#8892b0', margin:'0 0 4px 0' }}>Employees</p><p style={{ fontSize:'20px', fontWeight:700, color:'#fff', margin:0 }}>210</p></div>
             <div><p style={{ fontSize:'12px', color:'#8892b0', margin:'0 0 4px 0' }}>Leave requests</p><p style={{ fontSize:'20px', fontWeight:700, color:'#fff', margin:0 }}>14</p></div>
             <div><p style={{ fontSize:'12px', color:'#8892b0', margin:'0 0 4px 0' }}>New Hires</p><p style={{ fontSize:'20px', fontWeight:700, color:'#fff', margin:0 }}>5</p></div>
          </div>
        </div>

        {/* Card 4: PROJECTS & TASKS */}
        <div style={{ backgroundColor: '#1e1f23', border: '1px solid #4a2b66', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#8b5cf620', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Globe size={24} color="#8b5cf6" />
              </div>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#fff', margin: '0 0 4px 0', letterSpacing: '0.5px' }}>PROJECTS & TASKS</h3>
                <p style={{ fontSize: '13px', color: '#8892b0', margin: 0 }}>Gantt chart</p>
              </div>
            </div>
             <MiniGanttChart color="#8b5cf6" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', borderTop: '1px solid #ffffff10', paddingTop: '16px' }}>
             <div><p style={{ fontSize:'12px', color:'#8892b0', margin:'0 0 4px 0' }}>Active Projects</p><p style={{ fontSize:'20px', fontWeight:700, color:'#fff', margin:0 }}>24</p></div>
             <div><p style={{ fontSize:'12px', color:'#8892b0', margin:'0 0 4px 0' }}>Overdue</p><p style={{ fontSize:'20px', fontWeight:700, color:'#ef4444', margin:0 }}>3</p></div>
             <div><p style={{ fontSize:'12px', color:'#8892b0', margin:'0 0 4px 0' }}>Milestones</p><p style={{ fontSize:'20px', fontWeight:700, color:'#fff', margin:0 }}>19</p></div>
          </div>
        </div>

      </div>

      {/* ── MAP PLACEHOLDER ── */}
      <div style={{
        backgroundColor: '#1e1f23', border: '1px solid #ffffff10', borderRadius: '16px', padding: '24px', 
        height: '240px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        backgroundImage: 'radial-gradient(circle at center, rgba(59, 130, 246, 0.05) 0%, transparent 70%)',
        position: 'relative', overflow: 'hidden', flexShrink: 0
      }}>
        <div style={{ position: 'absolute', top: '20px', left: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Globe size={18} color="#8892b0" />
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#fff' }}>Live Geographic Sales Map</h3>
        </div>
        <p style={{ color: '#8892b0', fontSize: '14px', fontWeight: 500, textAlign: 'center' }}>
          [ Map Engine Rendering Disabled ]<br/>
          <span style={{ fontSize: '12px', opacity: 0.7 }}>Will render geo-spatial clusters in production</span>
        </p>
      </div>

      {/* ── BOTTOM WIDGETS (2-Column) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', flex: 1, minHeight: '400px' }}>
        
        {/* Widget 1: Platform Alerts */}
        <div style={{ backgroundColor: '#1e1f23', border: '1px solid #ffffff10', borderRadius: '16px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '24px', borderBottom: '1px solid #ffffff10', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#fff' }}>Platform Alerts</h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#8892b0' }}>Recent critical/warning alerts</p>
            </div>
            <div style={{ color: '#8892b0', cursor: 'pointer' }}>•••</div>
          </div>
          <div style={{ padding: '0', overflowY: 'auto', flex: 1 }}>
             
             <div style={{ padding: '20px 24px', borderBottom: '1px solid #ffffff05', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                   <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ef4444' }} />
                   <span style={{ fontSize: '12px', color: '#8892b0' }}>10:33:17 PM</span>
                   <span style={{ fontSize: '11px', backgroundColor: '#ef444420', color: '#ef4444', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>Severity</span>
                </div>
                <p style={{ margin: 0, fontSize: '14px', color: '#e2e8f0', lineHeight: '1.5', paddingLeft: '20px' }}>Critical database lag detected on Tenant 04.</p>
             </div>

             <div style={{ padding: '20px 24px', borderBottom: '1px solid #ffffff05', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                   <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#f59e0b' }} />
                   <span style={{ fontSize: '12px', color: '#8892b0' }}>10:32:16 PM</span>
                   <span style={{ fontSize: '11px', backgroundColor: '#f59e0b20', color: '#f59e0b', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>Warning</span>
                </div>
                <p style={{ margin: 0, fontSize: '14px', color: '#e2e8f0', lineHeight: '1.5', paddingLeft: '20px' }}>Manual override triggered by admin for invoice cancellation.</p>
             </div>

          </div>
        </div>

        {/* Widget 2: Global Stats */}
        <div style={{ backgroundColor: '#1e1f23', border: '1px solid #ffffff10', borderRadius: '16px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '24px', borderBottom: '1px solid #ffffff10', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
             <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#fff' }}>Global Stats</h3>
             <div style={{ color: '#8892b0', cursor: 'pointer' }}>•••</div>
          </div>
          
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                   <p style={{ margin: '0 0 4px 0', fontSize: '13px', color: '#8892b0' }}>Total Revenue</p>
                   <p style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#fff' }}>$645K</p>
                </div>
                <div style={{ flex: 1 }}>
                   <p style={{ margin: '0 0 4px 0', fontSize: '13px', color: '#8892b0' }}>Active Projects</p>
                   <p style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#fff' }}>24</p>
                </div>
                <Sparkline color="#3b82f6" points="0,25 20,20 40,22 60,15 80,10 100,2" />
             </div>
             
             <div style={{ borderTop: '1px solid #ffffff10', margin: '8px 0' }} />

             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                   <p style={{ margin: '0 0 4px 0', fontSize: '13px', color: '#8892b0' }}>Open Positions</p>
                   <p style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#fff' }}>12</p>
                </div>
                <div style={{ flex: 1 }}>
                   <p style={{ margin: '0 0 4px 0', fontSize: '13px', color: '#8892b0' }}>Inventory Level</p>
                   <p style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#fff' }}>88%</p>
                </div>
                <Sparkline color="#10b981" points="0,15 20,10 40,18 60,8 80,2 100,5" />
             </div>

             <div style={{ borderTop: '1px solid #ffffff10', margin: '8px 0' }} />

             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                   <p style={{ margin: '0 0 4px 0', fontSize: '13px', color: '#8892b0' }}>New Hires</p>
                   <p style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#fff' }}>5</p>
                </div>
                <div style={{ flex: 1 }}>
                   <p style={{ margin: '0 0 4px 0', fontSize: '13px', color: '#8892b0' }}>System Health</p>
                   <p style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#fff' }}>99.8%</p>
                </div>
                <Sparkline color="#10b981" points="0,20 20,22 40,15 60,18 80,5 100,8" />
             </div>
          </div>
        </div>

      </div>
    </div>
  )
}
