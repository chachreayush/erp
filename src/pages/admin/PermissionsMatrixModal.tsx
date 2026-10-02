import { useState, useEffect } from 'react'
import { Shield, X, Save, Loader2, Check } from 'lucide-react'
import { apiGetOrganizationPermissions, apiUpdateOrganizationPermissions } from '../../lib/api'

// ── CONSTANTS ────────────────────────────────────────────────
const ROLES = [
  { key: 'manager', label: 'Manager' },
  { key: 'area_manager', label: 'Area Manager' },
  { key: 'staff', label: 'Staff' },
  { key: 'field_staff', label: 'Field Staff' },
  { key: 'viewer', label: 'Viewer' },
]

const MODULES = [
  { key: 'sales', label: 'Sales', color: '#3b82f6' },
  { key: 'purchase', label: 'Purchase', color: '#8b5cf6' },
  { key: 'inventory', label: 'Inventory', color: '#f59e0b' },
  { key: 'finance', label: 'Finance', color: '#10b981' },
  { key: 'hr', label: 'HR', color: '#ec4899' },
  { key: 'crm', label: 'CRM', color: '#06b6d4' },
  { key: 'reports', label: 'Reports', color: '#f97316' },
  { key: 'settings', label: 'Settings', color: '#6366f1' },
]

interface PermissionsMatrixModalProps {
  isOpen: boolean
  onClose: () => void
  orgId: string
  orgName: string
}

export default function PermissionsMatrixModal({ isOpen, onClose, orgId, orgName }: PermissionsMatrixModalProps) {
  const [permissions, setPermissions] = useState<Record<string, string[]>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  useEffect(() => {
    if (isOpen && orgId) {
      fetchPermissions()
    }
  }, [isOpen, orgId])

  const fetchPermissions = async () => {
    setIsLoading(true)
    try {
      const data = await apiGetOrganizationPermissions(orgId)
      // If null, initialize with empty arrays for each role
      if (data.role_permissions) {
        setPermissions(data.role_permissions)
      } else {
        const defaults: Record<string, string[]> = {}
        ROLES.forEach(r => { defaults[r.key] = MODULES.map(m => m.key) })
        setPermissions(defaults)
      }
    } catch (err) {
      console.error('Failed to fetch permissions', err)
      // Initialize with all permissions enabled as fallback
      const defaults: Record<string, string[]> = {}
      ROLES.forEach(r => { defaults[r.key] = MODULES.map(m => m.key) })
      setPermissions(defaults)
    } finally {
      setIsLoading(false)
    }
  }

  const togglePermission = (role: string, module: string) => {
    setPermissions(prev => {
      const current = prev[role] || []
      const hasModule = current.includes(module)
      return {
        ...prev,
        [role]: hasModule
          ? current.filter(m => m !== module)
          : [...current, module]
      }
    })
    setSaveSuccess(false)
  }

  const toggleAllForRole = (role: string) => {
    setPermissions(prev => {
      const current = prev[role] || []
      const allEnabled = MODULES.every(m => current.includes(m.key))
      return {
        ...prev,
        [role]: allEnabled ? [] : MODULES.map(m => m.key)
      }
    })
    setSaveSuccess(false)
  }

  const toggleAllForModule = (moduleKey: string) => {
    setPermissions(prev => {
      const allEnabled = ROLES.every(r => (prev[r.key] || []).includes(moduleKey))
      const next = { ...prev }
      ROLES.forEach(r => {
        const current = next[r.key] || []
        if (allEnabled) {
          next[r.key] = current.filter(m => m !== moduleKey)
        } else if (!current.includes(moduleKey)) {
          next[r.key] = [...current, moduleKey]
        }
      })
      return next
    })
    setSaveSuccess(false)
  }

  const handleSave = async () => {
    setIsSaving(true)
    setSaveSuccess(false)
    try {
      await apiUpdateOrganizationPermissions(orgId, { role_permissions: permissions })
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err: any) {
      const detail = err?.response?.data?.detail || err.message || 'Unknown error'
      alert('Failed to save permissions: ' + detail)
    } finally {
      setIsSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      animation: 'fadeIn 0.2s ease-out'
    }}>
      <div style={{
        width: '900px', maxWidth: '95vw', maxHeight: '85vh',
        backgroundColor: '#0f172a', border: '1px solid #1e293b',
        borderRadius: '16px', overflow: 'hidden',
        boxShadow: '0 25px 60px rgba(0,0,0,0.5), 0 0 40px rgba(99,102,241,0.1)',
        display: 'flex', flexDirection: 'column',
        animation: 'slideUp 0.3s ease-out'
      }}>

        {/* ── HEADER ──────────────────────────────────────────── */}
        <div style={{
          padding: '20px 24px',
          background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(59,130,246,0.08))',
          borderBottom: '1px solid #1e293b',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '42px', height: '42px', borderRadius: '12px',
              background: 'linear-gradient(135deg, #6366f1, #3b82f6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(99,102,241,0.4)'
            }}>
              <Shield size={20} color="#fff" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#e2e8f0' }}>
                Permissions Matrix
              </h2>
              <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>
                {orgName} — Configure module access per role
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.05)', border: '1px solid #334155',
            borderRadius: '8px', padding: '8px', cursor: 'pointer', color: '#94a3b8',
            transition: 'all 0.15s'
          }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#e2e8f0' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#94a3b8' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* ── BODY ────────────────────────────────────────────── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {isLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px', color: '#94a3b8', gap: '12px' }}>
              <Loader2 size={22} style={{ animation: 'spin 1s linear infinite' }} />
              Loading permissions...
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                <thead>
                  <tr>
                    <th style={{
                      padding: '12px 16px', textAlign: 'left', fontSize: '12px',
                      fontWeight: 600, color: '#64748b', textTransform: 'uppercase',
                      letterSpacing: '0.05em', borderBottom: '1px solid #1e293b',
                      position: 'sticky', top: 0, backgroundColor: '#0f172a', zIndex: 1
                    }}>
                      Role
                    </th>
                    {MODULES.map(mod => (
                      <th key={mod.key} style={{
                        padding: '12px 8px', textAlign: 'center', fontSize: '11px',
                        fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase',
                        letterSpacing: '0.03em', borderBottom: '1px solid #1e293b',
                        position: 'sticky', top: 0, backgroundColor: '#0f172a', zIndex: 1,
                        cursor: 'pointer'
                      }}
                        onClick={() => toggleAllForModule(mod.key)}
                        title={`Toggle all roles for ${mod.label}`}
                      >
                        <div style={{
                          display: 'inline-block', padding: '4px 10px', borderRadius: '6px',
                          backgroundColor: `${mod.color}18`, color: mod.color, fontSize: '11px',
                          fontWeight: 600, transition: 'transform 0.15s'
                        }}>
                          {mod.label}
                        </div>
                      </th>
                    ))}
                    <th style={{
                      padding: '12px 8px', textAlign: 'center', fontSize: '11px',
                      fontWeight: 600, color: '#64748b', borderBottom: '1px solid #1e293b',
                      position: 'sticky', top: 0, backgroundColor: '#0f172a', zIndex: 1
                    }}>
                      ALL
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {ROLES.map((role, idx) => {
                    const rolePerms = permissions[role.key] || []
                    const allEnabled = MODULES.every(m => rolePerms.includes(m.key))
                    return (
                      <tr key={role.key} style={{
                        backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
                        transition: 'background-color 0.15s'
                      }}
                        onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(99,102,241,0.05)' }}
                        onMouseLeave={e => { e.currentTarget.style.backgroundColor = idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}
                      >
                        <td style={{
                          padding: '14px 16px', fontSize: '14px', fontWeight: 600,
                          color: '#e2e8f0', borderBottom: '1px solid rgba(30,41,59,0.5)',
                          whiteSpace: 'nowrap'
                        }}>
                          {role.label}
                        </td>
                        {MODULES.map(mod => {
                          const isEnabled = rolePerms.includes(mod.key)
                          return (
                            <td key={mod.key} style={{
                              padding: '10px 8px', textAlign: 'center',
                              borderBottom: '1px solid rgba(30,41,59,0.5)'
                            }}>
                              {/* Toggle Switch */}
                              <div
                                onClick={() => togglePermission(role.key, mod.key)}
                                style={{
                                  display: 'inline-flex', alignItems: 'center', cursor: 'pointer',
                                  width: '40px', height: '22px', borderRadius: '11px',
                                  backgroundColor: isEnabled ? mod.color : '#334155',
                                  padding: '2px', transition: 'all 0.25s ease',
                                  boxShadow: isEnabled ? `0 0 8px ${mod.color}40` : 'none',
                                  position: 'relative'
                                }}
                              >
                                <div style={{
                                  width: '18px', height: '18px', borderRadius: '50%',
                                  backgroundColor: '#fff',
                                  transform: isEnabled ? 'translateX(18px)' : 'translateX(0)',
                                  transition: 'transform 0.25s ease',
                                  boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
                                }} />
                              </div>
                            </td>
                          )
                        })}
                        <td style={{
                          padding: '10px 8px', textAlign: 'center',
                          borderBottom: '1px solid rgba(30,41,59,0.5)'
                        }}>
                          {/* Toggle All for this role */}
                          <div
                            onClick={() => toggleAllForRole(role.key)}
                            style={{
                              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                              cursor: 'pointer', width: '28px', height: '28px', borderRadius: '6px',
                              backgroundColor: allEnabled ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.05)',
                              border: `1px solid ${allEnabled ? '#10b981' : '#334155'}`,
                              color: allEnabled ? '#10b981' : '#64748b',
                              transition: 'all 0.2s ease',
                              fontSize: '12px', fontWeight: 700
                            }}
                            title={allEnabled ? 'Revoke all modules' : 'Grant all modules'}
                          >
                            {allEnabled ? <Check size={14} /> : '—'}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── FOOTER ──────────────────────────────────────────── */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid #1e293b',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          backgroundColor: 'rgba(15,23,42,0.8)'
        }}>
          <div style={{ fontSize: '12px', color: '#64748b' }}>
            Click column headers to toggle an entire module. Click "ALL" to toggle all modules for a role.
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={onClose} style={{
              padding: '10px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
              backgroundColor: 'transparent', border: '1px solid #334155',
              color: '#94a3b8', cursor: 'pointer', transition: 'all 0.15s'
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#475569'; e.currentTarget.style.color = '#e2e8f0' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#334155'; e.currentTarget.style.color = '#94a3b8' }}
            >
              Cancel
            </button>
            <button onClick={handleSave} disabled={isSaving} style={{
              padding: '10px 24px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
              background: saveSuccess
                ? 'linear-gradient(135deg, #10b981, #059669)'
                : 'linear-gradient(135deg, #6366f1, #3b82f6)',
              border: 'none', color: '#fff', cursor: isSaving ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: '8px',
              boxShadow: saveSuccess
                ? '0 4px 12px rgba(16,185,129,0.4)'
                : '0 4px 12px rgba(99,102,241,0.4)',
              transition: 'all 0.25s', opacity: isSaving ? 0.7 : 1
            }}>
              {isSaving ? (
                <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Saving...</>
              ) : saveSuccess ? (
                <><Check size={16} /> Saved!</>
              ) : (
                <><Save size={16} /> Save Permissions</>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── KEYFRAME ANIMATIONS ─────────────────────────────── */}
      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
      `}</style>
    </div>
  )
}
