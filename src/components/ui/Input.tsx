import React from 'react'
import { AlertCircle } from 'lucide-react'

// ── INPUT COMPONENT ───────────────────────────────────────────
// Unified input with consistent font/spacing across all modals.
// variant='standard' — for full-page forms
// variant='dense'    — for inline label forms
// variant='compact'  — for modals/dialogs (default for modals)
// ──────────────────────────────────────────────────────────────

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  fullWidth?: boolean
  as?: 'input' | 'select'
  variant?: 'standard' | 'dense' | 'compact'
  children?: React.ReactNode
}

// Shared design tokens for modal forms — use these everywhere
export const MODAL_FIELD: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  borderRadius: '6px',
  border: '1px solid var(--color-border)',
  background: 'var(--color-bg-surface)',
  color: 'var(--color-text-primary)',
  fontSize: '13px',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
}

export const MODAL_LABEL: React.CSSProperties = {
  display: 'block',
  fontSize: '11px',
  fontWeight: 600,
  color: 'var(--color-text-secondary)',
  marginBottom: '4px',
}

export const MODAL_GAP = '10px'

export const Input = React.forwardRef<HTMLInputElement | HTMLSelectElement, InputProps>((
  {
    label,
    error,
    leftIcon,
    rightIcon,
    fullWidth = true,
    as = 'input',
    variant = 'standard',
    children,
    style,
    className,
    ...props
  },
  ref
) => {
  const [isFocused, setIsFocused] = React.useState(false)
  const isDense = variant === 'dense'
  const isCompact = variant === 'compact'

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: isDense ? 'row' : 'column',
    alignItems: isDense ? 'center' : 'stretch',
    gap: isDense ? '8px' : isCompact ? '4px' : '6px',
    width: fullWidth ? '100%' : 'auto',
    marginBottom: isDense ? '4px' : isCompact ? '0px' : '0px',
  }

  const labelStyle: React.CSSProperties = {
    fontSize: isCompact ? '11px' : isDense ? '12px' : '12px',
    fontWeight: 600,
    color: error ? '#ef4444' : 'var(--color-text-secondary)',
    marginLeft: isDense ? '0' : '0px',
    width: isDense ? '120px' : 'auto',
    flexShrink: 0,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    transition: 'color 0.2s ease',
  }

  const inputWrapperStyle: React.CSSProperties = {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    flex: 1,
    backgroundColor: 'var(--color-bg-input)',
    border: `1px solid ${error ? '#ef4444' : (isFocused ? 'var(--color-border-strong)' : 'var(--color-border)')}`,
    borderRadius: isDense ? '2px' : '6px',
    transition: 'all 0.1s ease',
    boxShadow: isFocused ? '0 0 0 1px var(--color-primary)' : 'none',
  }

  const iconWrapperStyle = (position: 'left' | 'right'): React.CSSProperties => ({
    position: 'absolute',
    [position]: isDense ? '4px' : '10px',
    color: error ? '#ef4444' : (isFocused ? 'var(--color-primary)' : 'var(--color-text-muted)'),
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
    transition: 'color 0.2s ease',
  })

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: isDense
      ? `4px ${rightIcon ? '24px' : '8px'} 4px ${leftIcon ? '24px' : '8px'}`
      : isCompact
      ? `8px ${rightIcon ? '32px' : '10px'} 8px ${leftIcon ? '32px' : '10px'}`
      : `10px ${rightIcon ? '40px' : '14px'} 10px ${leftIcon ? '40px' : '14px'}`,
    backgroundColor: 'transparent',
    border: 'none',
    outline: 'none',
    color: 'var(--color-text)',
    fontSize: isCompact ? '13px' : isDense ? '12px' : '13px',
    fontFamily: 'inherit',
    ...style,
  }

  return (
    <div style={containerStyle} className={className}>
      {label && <label style={labelStyle}>{label}</label>}
      
      <div style={inputWrapperStyle}>
        {leftIcon && <div style={iconWrapperStyle('left')}>{leftIcon}</div>}
        
        {as === 'input' ? (
          <input
            ref={ref as React.Ref<HTMLInputElement>}
            style={inputStyle}
            onFocus={(e) => { setIsFocused(true); props.onFocus?.(e as any) }}
            onBlur={(e) => { setIsFocused(false); props.onBlur?.(e as any) }}
            {...(props as React.InputHTMLAttributes<HTMLInputElement>)}
          />
        ) : (
          <select
            ref={ref as React.Ref<HTMLSelectElement>}
            style={inputStyle}
            onFocus={(e) => { setIsFocused(true); props.onFocus?.(e as any) }}
            onBlur={(e) => { setIsFocused(false); props.onBlur?.(e as any) }}
            {...(props as React.SelectHTMLAttributes<HTMLSelectElement>)}
          >
            {children}
          </select>
        )}
        
        {rightIcon && !error && <div style={iconWrapperStyle('right')}>{rightIcon}</div>}
        {error && <div style={iconWrapperStyle('right')}><AlertCircle size={18} /></div>}
      </div>
      
      {error && (
        <span style={{ fontSize: '11px', color: '#ef4444', marginLeft: '2px', marginTop: '2px' }}>
          {error}
        </span>
      )}
    </div>
  )
})

Input.displayName = 'Input'
