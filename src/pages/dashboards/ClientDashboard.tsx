import { useAuthStore } from '../../store/authStore'
import { TrendingUp, Package, CheckCircle, Activity, ArrowRight, AlertTriangle } from 'lucide-react'
import { StatCard } from '../../components/ui/StatCard'
import { Button } from '../../components/ui/Button'
import { useNavigate } from 'react-router-dom'
import { Card, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card'

export default function ClientDashboard() {
  const user = useAuthStore(state => state.user)
  const navigate = useNavigate()

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div style={{ maxWidth: '1200px', animation: 'fadeIn 0.3s ease-in-out' }}>
      
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
