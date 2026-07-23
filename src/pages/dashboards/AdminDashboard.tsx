import { useAuthStore } from '../../store/authStore'
import { Building2, Users, Server, Globe, ArrowRight } from 'lucide-react'
import { StatCard } from '../../components/ui/StatCard'
import { Button } from '../../components/ui/Button'
import { useNavigate } from 'react-router-dom'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card'
import { api } from '../../lib/api'
import { useEffect, useState } from 'react'
import { AlertCircle, Megaphone } from 'lucide-react'

// Lightweight Dashboard Widget for Bulletins
function DashboardBulletinWidget() {
  const [bulletin, setBulletin] = useState<any>(null)
  
  useEffect(() => {
    api.bulletins.getAll().then(res => {
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

export default function AdminDashboard() {
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
            {greeting}, {(user?.name || 'Admin').split(' ')[0]} 👋
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '14px', fontWeight: 500 }}>
            {user?.companyName} (Account Master) · Global Overview
          </p>
        </div>
        
        {/* Quick Action */}
        <Button 
          variant="primary" 
          rightIcon={<ArrowRight size={16} />}
          onClick={() => navigate('/clients')}
        >
          Manage Clients
        </Button>
      </div>

      <DashboardBulletinWidget />

      {/* ── KPI STAT CARDS GRID ─────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '16px',
        marginBottom: '28px'
      }}>
        <StatCard
          label="Total Registered Clients"
          value="2"
          change="+1 this week"
          positive={true}
          icon={<Building2 size={16} color="white" />}
          color="rgba(79,70,229,0.6)"
        />
        <StatCard
          label="Global Active Users"
          value="10"
          icon={<Users size={16} color="white" />}
          color="rgba(34,197,94,0.6)"
        />
        <StatCard
          label="System Health"
          value="99.9%"
          icon={<Server size={16} color="white" />}
          color="rgba(59,130,246,0.6)"
        />
        <StatCard
          label="Global Revenue (Est)"
          value="₹0"
          icon={<Globe size={16} color="white" />}
          color="rgba(245,158,11,0.6)"
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
            <Server size={18} color="var(--color-success)" />
            <CardTitle>System Status</CardTitle>
          </CardHeader>
          <CardDescription>
            All multi-tenant database clusters are operating normally.
          </CardDescription>
        </Card>
      </div>
    </div>
  )
}
