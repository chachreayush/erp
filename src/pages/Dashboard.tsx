/* ============================================================
   Dashboard.tsx — Role-Based Main Dashboard Page
   ============================================================
   The dashboard is the HOME page of the ERP — the first thing
   every user sees after logging in.
   
   It shows personalized content based on the user's role:
   - AM Admin:    Full system overview across all companies
   - CM Admin:    Company-level KPIs and pending approvals
   - Manager:     Team metrics and pending approvals
   - Staff:       Their own activity and quick actions
   
   For Sprint 1, we build the layout and placeholder cards.
   Real data from the database will be wired in later sprints.
   ============================================================ */

import { useAuthStore } from '../store/authStore'
import {
  TrendingUp, Package,
  Users, Clock, CheckCircle, AlertTriangle, Activity, ArrowRight
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { useNavigate } from 'react-router-dom'

// ── STAT CARD COMPONENT ────────────────────────────────────────
// A reusable card for displaying a single KPI metric.
// Used across the dashboard for consistent styling.
interface StatCardProps {
  label:      string          // Metric name (e.g., "Total Revenue")
  value:      string          // Metric value (e.g., "₹4,28,500")
  change?:    string          // Percentage change (e.g., "+12%")
  positive?:  boolean         // true = green change, false = red change
  icon:       React.ReactNode // Icon to display in the card
  color:      string          // Accent color for the icon background
}

function StatCard({ label, value, change, positive, icon, color }: StatCardProps) {
  return (
    <Card padding="md" style={{
      display: 'flex', flexDirection: 'column', gap: '12px', cursor: 'default'
    }}>
      {/* Top row: label + icon */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '13px', color: 'var(--color-text-muted)',
          textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
          {label}
        </span>
        {/* Colored icon badge */}
        <div style={{
          width: '36px', height: '36px',
          borderRadius: 'var(--radius-md)',
          backgroundColor: color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 4px 12px ${color.replace('0.6', '0.2')}`
        }}>
          {icon}
        </div>
      </div>

      {/* Metric value */}
      <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
        {value}
      </div>

      {/* Percentage change badge (if provided) */}
      {change && (
        <div style={{
          fontSize: '13px', fontWeight: 600,
          color: positive ? 'var(--color-success)' : 'var(--color-danger)',
          display: 'flex', alignItems: 'center', gap: '4px'
        }}>
          {positive ? '↑' : '↓'} {change} vs last month
        </div>
      )}
    </Card>
  )
}

// ── DASHBOARD PAGE COMPONENT ──────────────────────────────────
function DashboardPage() {
  // Get the current user from the global auth store
  const user = useAuthStore(state => state.user)

  // Get the current time for the greeting message
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  const navigate = useNavigate()

  return (
    <div style={{ maxWidth: '1200px', animation: 'fadeIn 0.3s ease-in-out' }}>
      
      {/* ── PAGE HEADER ─────────────────────────────────────── */}
      <div style={{ 
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', 
        marginBottom: '32px' 
      }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 800, marginBottom: '6px', color: 'var(--color-text)' }}>
            {greeting}, {user?.name?.split(' ')[0] ?? 'User'} 👋
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '14px', fontWeight: 500 }}>
            {user?.companyName} · {new Date().toLocaleDateString('en-IN', {
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
            })}
          </p>
        </div>
        
        {/* Quick Action */}
        <Button 
          variant="primary" 
          rightIcon={<ArrowRight size={16} />}
          onClick={() => navigate('/inventory')}
        >
          Go to Inventory
        </Button>
      </div>

      {/* ── KPI STAT CARDS GRID ─────────────────────────────── */}
      {/* 4 columns on wide screens, 2 on medium, 1 on narrow */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '16px',
        marginBottom: '28px'
      }}>
        <StatCard
          label="Today's Revenue"
          value="₹0"
          change="— No data yet"
          positive={true}
          icon={<TrendingUp size={16} color="white" />}
          color="rgba(79,70,229,0.6)"
        />
        <StatCard
          label="Pending Orders"
          value="0"
          icon={<Clock size={16} color="white" />}
          color="rgba(245,158,11,0.6)"
        />
        <StatCard
          label="Stock Items"
          value="0"
          icon={<Package size={16} color="white" />}
          color="rgba(59,130,246,0.6)"
        />
        <StatCard
          label="Active Customers"
          value="0"
          icon={<Users size={16} color="white" />}
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

        {/* Pending Approvals Widget */}
        <Card padding="md">
          <CardHeader style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <CheckCircle size={18} color="var(--color-success)" />
            <CardTitle>Pending Approvals</CardTitle>
          </CardHeader>
          <CardDescription>
            No pending approvals at this time.
          </CardDescription>
        </Card>

        {/* System Alerts Widget */}
        <Card padding="md">
          <CardHeader style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <AlertTriangle size={18} color="var(--color-warning)" />
            <CardTitle>System Alerts</CardTitle>
          </CardHeader>
          <CardDescription>
            All systems operating normally.
          </CardDescription>
        </Card>

        {/* Recent Activity Widget */}
        <Card padding="md">
          <CardHeader style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Activity size={18} color="var(--color-info)" />
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardDescription>
            Activity log will appear here once modules are active.
          </CardDescription>
        </Card>

      </div>

      {/* ── SPRINT NOTE ──────────────────────────────────────── */}
      {/* Temporary note shown during development — remove in production */}
      <div style={{
        padding: '16px 20px',
        borderRadius: 'var(--radius-lg)',
        backgroundColor: 'rgba(79,70,229,0.08)',
        border: '1px solid rgba(79,70,229,0.2)',
        fontSize: '14px',
        lineHeight: 1.5,
        color: 'var(--color-text-secondary)',
        backdropFilter: 'blur(8px)'
      }}>
        <strong style={{ color: 'var(--color-primary)' }}>Sprint 2 Complete ✅</strong>
        {' '}— Backend foundation and JWT authentication are fully working. Dashboard UI has been upgraded with premium components.
      </div>

    </div>
  )
}

export default DashboardPage
