import { useThemeStore, ThemeOption } from '../store/themeStore'
import { Palette, CheckCircle2 } from 'lucide-react'
import { useReturnNavigation } from '../hooks/useReturnNavigation'

// Array of available themes for the UI picker
const THEME_OPTIONS: { id: ThemeOption; name: string; description: string; colors: string[] }[] = [
  {
    id: 'default',
    name: 'ERP Default (Dark)',
    description: 'The standard dark enterprise theme.',
    colors: ['#0f0f11', '#18181b', '#4f46e5'] // BG, Surface, Primary
  },
  {
    id: 'glass',
    name: 'Modern SaaS',
    description: 'Glassmorphism with vibrant gradients.',
    colors: ['#0f0e17', '#252431', '#8b5cf6']
  },
  {
    id: 'minimal',
    name: 'Neumorphic Minimalist',
    description: 'High contrast light mode for data density.',
    colors: ['#f8fafc', '#ffffff', '#2563eb']
  },
  {
    id: 'enterprise',
    name: 'Enterprise Classic Pro',
    description: 'Solid, robust navy blue layout.',
    colors: ['#0f172a', '#1e293b', '#0ea5e9']
  },
  {
    id: 'marg',
    name: 'Marg ERP Classic',
    description: 'The authentic legacy layout and styling.',
    colors: ['#d4d0c8', '#ffffff', '#008080']
  }
]

function SettingsPage() {
  useReturnNavigation()
  const { activeTheme, setTheme } = useThemeStore()

  return (
    <div style={{ height: "100%", overflowY: "auto", maxWidth: '800px' }}>
      <h1 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, marginBottom: '24px' }}>
        Settings
      </h1>

      {/* ── THEME & APPEARANCE SECTION ──────────────────────── */}
      <section style={{
        backgroundColor: 'var(--color-bg-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        padding: '24px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <Palette size={20} color="var(--color-primary)" />
          <h2 style={{ fontSize: '16px', fontWeight: 600 }}>Theme & Appearance</h2>
        </div>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px', marginBottom: '20px' }}>
          Customize how the ERP looks. Your preference is saved to this device.
        </p>

        {/* Theme Picker Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px'
        }}>
          {THEME_OPTIONS.map((theme) => {
            const isActive = activeTheme === theme.id

            return (
              <button
                key={theme.id}
                onClick={() => setTheme(theme.id)}
                style={{
                  textAlign: 'left',
                  backgroundColor: 'var(--color-bg)',
                  border: isActive ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '16px',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'all var(--transition-fast)'
                }}
              >
                {/* Checkmark icon for active theme */}
                {isActive && (
                  <div style={{ position: 'absolute', top: '12px', right: '12px', color: 'var(--color-primary)' }}>
                    <CheckCircle2 size={18} />
                  </div>
                )}

                {/* Theme Name & Description */}
                <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '4px' }}>
                  {theme.name}
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
                  {theme.description}
                </p>

                {/* Color Swatches (Preview of the theme) */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  {theme.colors.map((color, idx) => (
                    <div
                      key={idx}
                      style={{
                        width: '24px', height: '24px',
                        borderRadius: '50%',
                        backgroundColor: color,
                        border: '1px solid rgba(255,255,255,0.1)'
                      }}
                    />
                  ))}
                </div>
              </button>
            )
          })}
        </div>
      </section>

    </div>
  )
}

export default SettingsPage
