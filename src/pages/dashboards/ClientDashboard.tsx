import { useAuthStore } from '../../store/authStore'
import { TrendingUp, Package, CheckCircle, Activity, ArrowRight, AlertTriangle } from 'lucide-react'
import { StatCard } from '../../components/ui/StatCard'
import { Button } from '../../components/ui/Button'
import { useNavigate } from 'react-router-dom'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card'
import { api } from '../../lib/api'
import { useEffect, useState } from 'react'
import { AlertCircle, Megaphone } from 'lucide-react'


import { apiGetLowStockAlerts, LowStockAlert } from "../../lib/api"

// MRP: Low Stock Alert Widget
function LowStockWidget() {
  const [alerts, setAlerts] = useState<LowStockAlert[]>([])
  
  useEffect(() => {
    apiGetLowStockAlerts().then(res => {
      setAlerts(res.alerts || [])
    }).catch(console.error)
  }, [])
  
  if (alerts.length === 0) return null
  
  return (
    <Card style={{ marginBottom: "28px", borderLeft: "4px solid #f59e0b" }}>
      <CardHeader style={{ paddingBottom: "12px", display: "flex", flexDirection: "row", alignItems: "center", gap: "8px" }}>
        <AlertTriangle size={18} color="#f59e0b" />
        <CardTitle style={{ fontSize: "15px", color: "#b45309" }}>MRP Alerts: Low Stock ({alerts.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "8px" }}>
          {alerts.map(alert => (
            <div key={alert.product_id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", backgroundColor: "#fffbeb", borderRadius: "6px", fontSize: "13px" }}>
              <span style={{ fontWeight: 600 }}>{alert.name} ({alert.code})</span>
              <div style={{ display: "flex", gap: "16px" }}>
                <span>Stock: <span style={{ color: "#dc2626", fontWeight: 700 }}>{alert.current_stock}</span></span>
                <span>Min: {alert.min_stock_level}</span>
                <span style={{ color: "#d97706", fontWeight: 600 }}>Reorder Qty: {alert.suggested_order}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}


// Lightweight Dashboard Widget for Bulletins
function DashboardBulletinWidget() {
  const [bulletin, setBulletin] = useState<any>(null)
  
  useEffect(() => {
    api.bulletins.getAll().then(res => {
      // Pick the most recent important bulletin, or just the most recent general one
      const data = res.data
      if (data.length > 0) {
        const important = data.find((b: any) => b.priority === 'important')
        setBulletin(important || data[0])
      }
    }).catch(() => {})
  }, [])

  if (!bulletin) return null

  const isImportant = bulletin.priority === 'important'

  return (
    <Card style={{ marginBottom: '28px', borderLeft: isImportant ? '4px solid var(--color-danger)' : '4px solid var(--color-primary)' }}>
      <CardHeader style={{ paddingBottom: '12px', display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '8px' }}>
        {isImportant ? <AlertCircle size={18} color="var(--color-danger)" /> : <Megaphone size={18} color="var(--color-primary)" />}
        <CardTitle style={{ fontSize: '15px' }}>{bulletin.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p style={{ fontSize: '14px', color: 'var(--color-text-muted)' }}>
          {bulletin.content.length > 150 ? bulletin.content.substring(0, 150) + '...' : bulletin.content}
        </p>
      </CardContent>
    </Card>
  )
}

export default function ClientDashboard() {
  const user = useAuthStore(state => state.user)
  const navigate = useNavigate()

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div style={{ height: "100%", overflowY: "auto", maxWidth: '1200px', animation: 'fadeIn 0.3s ease-in-out' }}>
      
      {/* ── PAGE HEADER ─────────────────────────────────────── */}
      <div style={{ 
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', 
        marginBottom: '32px' 
      }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 800, marginBottom: '6px', color: 'var(--color-text)' }}>
            {greeting}, {(user?.name || 'User').split(' ')[0]} 👋
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '14px', fontWeight: 500 }}>
            {user?.companyName} ERP · {new Date().toLocaleDateString('en-IN', {
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
            })}
          </p>
        </div>
        
        {/* Quick Action */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <Button 
            variant="secondary" 
            onClick={() => navigate('/finance')}
          >
            Go to Finance
          </Button>
          <Button 
            variant="primary" 
            rightIcon={<ArrowRight size={16} />}
            onClick={() => navigate('/inventory')}
          >
            Go to Inventory
          </Button>
        </div>
      </div>

      <LowStockWidget />
      <DashboardBulletinWidget />

      {/* ── KPI STAT CARDS GRID ─────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '16px',
        marginBottom: '28px'
      }}>
        <StatCard
          label="Today's Sales"
          value="₹0"
          change="— No data yet"
          positive={true}
          icon={<TrendingUp size={16} color="white" />}
          color="rgba(79,70,229,0.6)"
        />
        <StatCard
          label="Pending Orders"
          value="0"
          icon={<Package size={16} color="white" />}
          color="rgba(245,158,11,0.6)"
        />
        <StatCard
          label="Low Stock Alerts"
          value="0"
          icon={<AlertTriangle size={16} color="white" />}
          color="rgba(239,68,68,0.6)"
        />
        <StatCard
          label="Active Employees"
          value="5"
          icon={<Activity size={16} color="white" />}
          color="rgba(34,197,94,0.6)"
        />
      </div>

      {/* ── QUICK STATUS ROW ─────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '16px',
        marginBottom: '28px'
      }}>
        <Card padding="md">
          <CardHeader style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <CheckCircle size={18} color="var(--color-success)" />
            <CardTitle>Pending Approvals</CardTitle>
          </CardHeader>
          <CardDescription>
            You have no pending approvals in {user?.companyName} at this time.
          </CardDescription>
        </Card>

        <Card padding="md">
          <CardHeader style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Activity size={18} color="var(--color-info)" />
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardDescription>
            No recent activity recorded in this workspace.
          </CardDescription>
        </Card>
      </div>
    </div>
  )
}
