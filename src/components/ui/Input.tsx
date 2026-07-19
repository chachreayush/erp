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
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  leftIcon,
  rightIcon,
  fullWidth = true,
  style,
  className,
  ...props
}, ref) => {
  const [isFocused, setIsFocused] = React.useState(false)

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    width: fullWidth ? '100%' : 'auto',
    marginBottom: '16px'
  }

  const labelStyle: React.CSSProperties = {
    fontSize: '13px',
    fontWeight: 600,
    color: error ? '#ef4444' : 'var(--color-text)',
    marginLeft: '2px',
    transition: 'color 0.2s ease'
  }

  const inputWrapperStyle: React.CSSProperties = {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    backgroundColor: 'var(--color-bg-input)',
    border: `1px solid ${error ? '#ef4444' : (isFocused ? 'var(--color-primary)' : 'var(--color-border)')}`,
    borderRadius: 'var(--radius-md)',
    transition: 'all 0.2s ease',
    boxShadow: isFocused ? (error ? '0 0 0 3px rgba(239, 68, 68, 0.15)' : '0 0 0 3px rgba(79, 70, 229, 0.15)') : 'none',
  }

  const iconWrapperStyle = (position: 'left' | 'right'): React.CSSProperties => ({
    position: 'absolute',
    [position]: '12px',
    color: error ? '#ef4444' : (isFocused ? 'var(--color-primary)' : 'var(--color-text-muted)'),
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
    transition: 'color 0.2s ease'
  })

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: `12px ${rightIcon ? '40px' : '16px'} 12px ${leftIcon ? '40px' : '16px'}`,
    backgroundColor: 'transparent',
    border: 'none',
    outline: 'none',
    color: 'var(--color-text)',
    fontSize: '15px',
    fontFamily: 'inherit',
    ...style
  }

  return (
    <div style={containerStyle} className={className}>
      {label && <label style={labelStyle}>{label}</label>}
      
      <div style={inputWrapperStyle}>
        {leftIcon && <div style={iconWrapperStyle('left')}>{leftIcon}</div>}
        
        <input
          ref={ref}
          style={inputStyle}
          onFocus={(e) => { setIsFocused(true); props.onFocus?.(e) }}
          onBlur={(e) => { setIsFocused(false); props.onBlur?.(e) }}
          {...props}
        />
        
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
