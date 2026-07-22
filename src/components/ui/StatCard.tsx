import { Card } from './Card'

interface StatCardProps {
  label:      string          // Metric name (e.g., "Total Revenue")
  value:      string          // Metric value (e.g., "₹4,28,500")
  change?:    string          // Percentage change (e.g., "+12%")
  positive?:  boolean         // true = green change, false = red change
  icon:       React.ReactNode // Icon to display in the card
  color:      string          // Accent color for the icon background
}

export function StatCard({ label, value, change, positive, icon, color }: StatCardProps) {
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
