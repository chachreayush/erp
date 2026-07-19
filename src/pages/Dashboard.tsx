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
  TrendingUp, Package, ShoppingCart,
  Users, Clock, CheckCircle, AlertTriangle, Activity
} from 'lucide-react'

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
    <div style={{
      backgroundColor: 'var(--color-bg-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      transition: 'border-color var(--transition-fast)',
      cursor: 'default'
    }}>
      {/* Top row: label + icon */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '12px', color: 'var(--color-text-muted)',
          textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 500 }}>
          {label}
        </span>
        {/* Colored icon badge */}
        <div style={{
          width: '34px', height: '34px',
          borderRadius: 'var(--radius-md)',
          backgroundColor: color,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          {icon}
        </div>
      </div>

      {/* Metric value */}
      <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
        {value}
      </div>

      {/* Percentage change badge (if provided) */}
      {change && (
        <div style={{
          fontSize: '12px', fontWeight: 500,
          color: positive ? 'var(--color-success)' : 'var(--color-danger)'
        }}>
          {change} vs last month
        </div>
      )}
    </div>
  )
}

// ── DASHBOARD PAGE COMPONENT ──────────────────────────────────
function DashboardPage() {
  // Get the current user from the global auth store
  const user = useAuthStore(state => state.user)

  // Get the current time for the greeting message
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div style={{ maxWidth: '1200px' }}>

      {/* ── PAGE HEADER ─────────────────────────────────────── */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, marginBottom: '4px' }}>
          {greeting}, {user?.name?.split(' ')[0] ?? 'User'} 👋
        </h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>
          {user?.companyName} · {new Date().toLocaleDateString('en-IN', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
          })}
        </p>
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
        <div style={{
          backgroundColor: 'var(--color-bg-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: '20px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <CheckCircle size={16} color="var(--color-success)" />
            <span style={{ fontWeight: 600, fontSize: '14px' }}>Pending Approvals</span>
          </div>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>
            No pending approvals at this time.
          </p>
        </div>

        {/* System Alerts Widget */}
        <div style={{
          backgroundColor: 'var(--color-bg-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: '20px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <AlertTriangle size={16} color="var(--color-warning)" />
            <span style={{ fontWeight: 600, fontSize: '14px' }}>System Alerts</span>
          </div>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>
            All systems operating normally.
          </p>
        </div>

        {/* Recent Activity Widget */}
        <div style={{
          backgroundColor: 'var(--color-bg-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: '20px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Activity size={16} color="var(--color-info)" />
            <span style={{ fontWeight: 600, fontSize: '14px' }}>Recent Activity</span>
          </div>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>
            Activity log will appear here once modules are active.
          </p>
        </div>

      </div>

      {/* ── SPRINT NOTE ──────────────────────────────────────── */}
      {/* Temporary note shown during development — remove in production */}
      <div style={{
        padding: '14px 18px',
        borderRadius: 'var(--radius-md)',
        backgroundColor: 'rgba(79,70,229,0.08)',
        border: '1px solid rgba(79,70,229,0.2)',
        fontSize: '13px',
        color: 'var(--color-text-secondary)'
      }}>
        <strong style={{ color: 'var(--color-primary)' }}>Sprint 1 Complete ✅</strong>
        {' '}— Foundation scaffold is ready. Login, sidebar, header, and dashboard layout are functional.
        Real data will populate these widgets as ERP modules are built in upcoming sprints.
      </div>

    </div>
  )
}

export default DashboardPage
