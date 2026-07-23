import React from 'react'

// ── CARD COMPONENT ────────────────────────────────────────────
// A reusable container for grouping related content (widgets,
// forms, lists). Adapts beautifully to all theme variants.
// ──────────────────────────────────────────────────────────────

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  padding?: 'none' | 'sm' | 'md' | 'lg'
  noBackground?: boolean
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(({
  children,
  padding = 'md',
  noBackground = false,
  style,
  ...props
}, ref) => {

  const paddingStyles = {
    none: '0px',
    sm: '16px',
    md: '24px',
    lg: '32px'
  }

  const baseStyle: React.CSSProperties = {
    backgroundColor: noBackground ? 'transparent' : 'var(--color-bg-surface)',
    borderRadius: 'var(--radius-lg)',
    border: noBackground ? 'none' : '1px solid var(--color-border)',
    boxShadow: noBackground ? 'none' : 'var(--shadow-md)',
    padding: paddingStyles[padding],
    transition: 'background-color 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease',
    overflow: 'hidden',
  }

  return (
    <div ref={ref} style={{ ...baseStyle, ...style }} {...props}>
      {children}
    </div>
  )
})

Card.displayName = 'Card'

// ── SUBCOMPONENTS ─────────────────────────────────────────────

export const CardHeader = ({ children, style, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div style={{ marginBottom: '16px', ...style }} {...props}>
    {children}
  </div>
)

export const CardTitle = ({ children, style, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: 'var(--color-text)', ...style }} {...props}>
    {children}
  </h3>
)

export const CardDescription = ({ children, style, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: 'var(--color-text-muted)', ...style }} {...props}>
    {children}
  </p>
)

export const CardContent = ({ children, style, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div style={{ ...style }} {...props}>
    {children}
  </div>
)
