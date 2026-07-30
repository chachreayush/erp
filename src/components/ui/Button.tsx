import React from 'react'
import { Loader2 } from 'lucide-react'

// ── BUTTON COMPONENT ──────────────────────────────────────────
// A premium, reusable button component that supports multiple
// variants (primary, secondary, danger, ghost), sizes, and a
// loading state. Designed to look beautiful across all themes.
// ──────────────────────────────────────────────────────────────

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  style,
  disabled,
  ...props
}, ref) => {
  // Base styles applied to all buttons
  const baseStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    borderRadius: 'var(--radius-md)',
    fontWeight: 600,
    fontFamily: 'inherit',
    cursor: disabled || isLoading ? 'not-allowed' : 'pointer',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    border: 'none',
    outline: 'none',
    opacity: disabled || isLoading ? 0.6 : 1,
    whiteSpace: 'nowrap',
    boxShadow: 'var(--shadow-sm)'
  }

  // Size variations
  const sizeStyles: Record<string, React.CSSProperties> = {
    sm: { padding: '6px 12px', fontSize: '13px' },
    md: { padding: '10px 18px', fontSize: '14px' },
    lg: { padding: '14px 24px', fontSize: '16px' }
  }

  // Variant variations
  const variantStyles: Record<string, React.CSSProperties> = {
    primary: {
      backgroundColor: 'var(--color-primary)',
      color: 'white',
      boxShadow: '0 4px 14px rgba(79, 70, 229, 0.25)', // Glow effect
    },
    secondary: {
      backgroundColor: 'var(--color-bg-surface)',
      color: 'var(--color-text)',
      border: '1px solid var(--color-border)',
    },
    danger: {
      backgroundColor: '#ef4444',
      color: 'white',
      boxShadow: '0 4px 14px rgba(239, 68, 68, 0.25)',
    },
    ghost: {
      backgroundColor: 'transparent',
      color: 'var(--color-text)',
      boxShadow: 'none',
    }
  }

  // Handle hover effect dynamically via mouse events since we are using inline styles
  const [isHovered, setIsHovered] = React.useState(false)
  const [isActive, setIsActive] = React.useState(false)
  const [isFocused, setIsFocused] = React.useState(false)

  const dynamicStyle: React.CSSProperties = {
    ...baseStyle,
    ...sizeStyles[size],
    ...variantStyles[variant],
    ...style,
    transform: isActive && !disabled && !isLoading ? 'scale(0.97)' : (isHovered && !disabled && !isLoading ? 'translateY(-1px)' : 'none'),
    filter: isHovered && !disabled && !isLoading && variant === 'primary' ? 'brightness(1.1)' : 'none',
    backgroundColor: isHovered && !disabled && !isLoading && variant === 'ghost' ? 'rgba(128, 128, 128, 0.1)' : variantStyles[variant].backgroundColor,
    outline: isFocused ? '2px solid var(--color-primary)' : 'none',
    outlineOffset: '2px'
  }

  return (
    <button
      ref={ref}
      style={dynamicStyle}
      disabled={disabled || isLoading}
      onMouseEnter={(e) => { setIsHovered(true); props.onMouseEnter?.(e) }}
      onMouseLeave={(e) => { setIsHovered(false); setIsActive(false); props.onMouseLeave?.(e) }}
      onMouseDown={(e) => { setIsActive(true); props.onMouseDown?.(e) }}
      onMouseUp={(e) => { setIsActive(false); props.onMouseUp?.(e) }}
      onFocus={(e) => { setIsFocused(true); props.onFocus?.(e) }}
      onBlur={(e) => { setIsFocused(false); props.onBlur?.(e) }}
      {...props}
    >
      {isLoading && <Loader2 size={16} className="animate-spin" />}
      {!isLoading && leftIcon}
      {children}
      {!isLoading && rightIcon}
    </button>
  )
})

Button.displayName = 'Button'
