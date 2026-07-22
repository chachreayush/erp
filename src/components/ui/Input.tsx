import React from 'react'
import { AlertCircle } from 'lucide-react'

// ── INPUT COMPONENT ───────────────────────────────────────────
// A premium styled text input with support for icons, error
// states, and smooth focus animations.
// ──────────────────────────────────────────────────────────────

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  fullWidth?: boolean
  as?: 'input' | 'select'
  variant?: 'standard' | 'dense'
  children?: React.ReactNode
}

export const Input = React.forwardRef<HTMLInputElement | HTMLSelectElement, InputProps>(({
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
}, ref) => {
  const [isFocused, setIsFocused] = React.useState(false)
  const isDense = variant === 'dense'

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: isDense ? 'row' : 'column',
    alignItems: isDense ? 'center' : 'stretch',
    gap: isDense ? '8px' : '6px',
    width: fullWidth ? '100%' : 'auto',
    marginBottom: isDense ? '4px' : '16px'
  }

  const labelStyle: React.CSSProperties = {
    fontSize: isDense ? '12px' : '13px',
    fontWeight: 600,
    color: error ? '#ef4444' : 'var(--color-text)',
    marginLeft: isDense ? '0' : '2px',
    width: isDense ? '120px' : 'auto', // Fixed width for inline labels
    flexShrink: 0,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    transition: 'color 0.2s ease'
  }

  const inputWrapperStyle: React.CSSProperties = {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    flex: 1, // Take up remaining space in dense mode
    backgroundColor: 'var(--color-bg-input)',
    border: `1px solid ${error ? '#ef4444' : (isFocused ? 'var(--color-border-strong)' : 'var(--color-border)')}`,
    borderRadius: isDense ? '2px' : 'var(--radius-md)',
    transition: 'all 0.1s ease',
    boxShadow: isFocused ? '0 0 0 1px var(--color-primary)' : 'none',
  }

  const iconWrapperStyle = (position: 'left' | 'right'): React.CSSProperties => ({
    position: 'absolute',
    [position]: isDense ? '4px' : '12px',
    color: error ? '#ef4444' : (isFocused ? 'var(--color-primary)' : 'var(--color-text-muted)'),
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
    transition: 'color 0.2s ease'
  })

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: isDense 
      ? `4px ${rightIcon ? '24px' : '8px'} 4px ${leftIcon ? '24px' : '8px'}` 
      : `12px ${rightIcon ? '40px' : '16px'} 12px ${leftIcon ? '40px' : '16px'}`,
    backgroundColor: 'transparent',
    border: 'none',
    outline: 'none',
    color: 'var(--color-text)',
    fontSize: isDense ? '12px' : '15px',
    fontFamily: 'inherit',
    ...style
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
        <span style={{ fontSize: '12px', color: '#ef4444', marginLeft: '2px', marginTop: '2px' }}>
          {error}
        </span>
      )}
    </div>
  )
})

Input.displayName = 'Input'
