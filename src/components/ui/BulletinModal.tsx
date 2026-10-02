import React, { useState, useEffect } from 'react'
import { Megaphone, X, Save, Loader2, Check } from 'lucide-react'
import { api, apiGetOrganizations } from '../../lib/api'
import { useAuthStore } from '../../store/authStore'

interface BulletinModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  editingBulletin?: any
}

export default function BulletinModal({ isOpen, onClose, onSuccess, editingBulletin }: BulletinModalProps) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [priority, setPriority] = useState<'general' | 'important'>('general')
  const [broadcastTarget, setBroadcastTarget] = useState<string>('internal')
  const [companies, setCompanies] = useState<any[]>([])
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)
  
  const user = useAuthStore(state => state.user)
  const isAmAdmin = user?.role === 'am_admin'

  useEffect(() => {
    if (isAmAdmin) {
      apiGetOrganizations().then(orgs => setCompanies(orgs)).catch(() => {})
    }
  }, [isAmAdmin])

  useEffect(() => {
    if (editingBulletin) {
      setTitle(editingBulletin.title)
      setContent(editingBulletin.content)
      setPriority(editingBulletin.priority)
      if (editingBulletin.is_global) {
        setBroadcastTarget('global')
      } else if (user && editingBulletin.organization_id !== user.companyId) {
        setBroadcastTarget(editingBulletin.organization_id)
      } else {
        setBroadcastTarget('internal')
      }
    } else {
      setTitle('')
      setContent('')
      setPriority('general')
      setBroadcastTarget('internal')
    }
    setError(null)
    setSaveSuccess(false)
  }, [editingBulletin, isOpen, user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSaveSuccess(false)

    try {
      const payload: any = { title, content, priority }
      if (isAmAdmin) {
        payload.is_global = broadcastTarget === 'global'
        if (broadcastTarget !== 'global' && broadcastTarget !== 'internal') {
          payload.target_org_id = broadcastTarget
        }
      }
      
      if (editingBulletin) {
        await api.bulletins.update(editingBulletin.id, payload)
      } else {
        await api.bulletins.create(payload)
      }
      
      setSaveSuccess(true)
      setTimeout(() => {
        setSaveSuccess(false)
        onSuccess()
      }, 1000)
    } catch (err: any) {
      if (err.response?.status === 401) {
        setError('Your session has expired. You will be redirected to log in again.');
      } else {
        const msg = err.response?.data?.detail;
        setError(typeof msg === 'string' ? msg : 'An error occurred while saving the bulletin.');
      }
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!editingBulletin || !window.confirm('Are you sure you want to delete this bulletin?')) return
    setLoading(true)
    try {
      await api.bulletins.delete(editingBulletin.id)
      onSuccess()
    } catch (err: any) {
      setError('Failed to delete bulletin.')
      setLoading(false)
    }
  }

  if (!isOpen) return null

  // Input styles
  const inputStyle = {
    padding: '10px 14px',
    borderRadius: '8px',
    border: '1px solid #334155',
    backgroundColor: '#0f172a',
    color: '#e2e8f0',
    fontSize: '14px',
    outline: 'none',
    transition: 'all 0.2s',
    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)'
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      animation: 'fadeIn 0.2s ease-out'
    }}>
      <div style={{
        width: '560px', maxWidth: '95vw',
        backgroundColor: '#0f172a', border: '1px solid #1e293b',
        borderRadius: '16px', overflow: 'hidden',
        boxShadow: '0 25px 60px rgba(0,0,0,0.5), 0 0 40px rgba(59,130,246,0.1)',
        display: 'flex', flexDirection: 'column',
        animation: 'slideUp 0.3s ease-out'
      }}>
        
        {/* ── HEADER ──────────────────────────────────────────── */}
        <div style={{
          padding: '20px 24px',
          background: 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(99,102,241,0.08))',
          borderBottom: '1px solid #1e293b',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '42px', height: '42px', borderRadius: '12px',
              background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(59,130,246,0.4)'
            }}>
              <Megaphone size={20} color="#fff" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#e2e8f0' }}>
                {editingBulletin ? 'Edit Bulletin' : 'Post New Bulletin'}
              </h2>
              <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>
                Publish an announcement to the board
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

        {/* ── FORM BODY ───────────────────────────────────────── */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {error && (
              <div style={{ padding: '12px', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderLeft: '4px solid #ef4444', color: '#f87171', borderRadius: '6px', fontSize: '14px' }}>
                {error}
              </div>
            )}

            {/* Title */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#94a3b8' }}>Bulletin Title <span style={{ color: '#ef4444' }}>*</span></label>
              <input
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g., Office closed for holidays"
                style={inputStyle}
                onFocus={e => { e.target.style.borderColor = '#3b82f6'; e.target.style.boxShadow = '0 0 0 2px rgba(59,130,246,0.2)' }}
                onBlur={e => { e.target.style.borderColor = '#334155'; e.target.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.2)' }}
              />
            </div>

            {/* Content */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#94a3b8' }}>Content <span style={{ color: '#ef4444' }}>*</span></label>
              <textarea
                required
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="Write the announcement details here..."
                style={{ ...inputStyle, minHeight: '120px', resize: 'vertical', fontFamily: 'inherit' }}
                onFocus={e => { e.target.style.borderColor = '#3b82f6'; e.target.style.boxShadow = '0 0 0 2px rgba(59,130,246,0.2)' }}
                onBlur={e => { e.target.style.borderColor = '#334155'; e.target.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.2)' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {/* Priority */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#94a3b8' }}>Priority</label>
                <select
                  value={priority}
                  onChange={e => setPriority(e.target.value as 'general' | 'important')}
                  style={inputStyle}
                  onFocus={e => { e.target.style.borderColor = '#3b82f6'; e.target.style.boxShadow = '0 0 0 2px rgba(59,130,246,0.2)' }}
                  onBlur={e => { e.target.style.borderColor = '#334155'; e.target.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.2)' }}
                >
                  <option value="general">General (Blue)</option>
                  <option value="important">Important (Red)</option>
                </select>
              </div>

              {/* Broadcast Target (AM Only) */}
              {isAmAdmin && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#94a3b8' }}>Broadcast Target</label>
                  <select
                    value={broadcastTarget}
                    onChange={e => setBroadcastTarget(e.target.value)}
                    style={inputStyle}
                    onFocus={e => { e.target.style.borderColor = '#3b82f6'; e.target.style.boxShadow = '0 0 0 2px rgba(59,130,246,0.2)' }}
                    onBlur={e => { e.target.style.borderColor = '#334155'; e.target.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.2)' }}
                  >
                    <option value="internal">Internal Only</option>
                    <option value="global">Global (All Clients)</option>
                    {companies.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* ── FOOTER ──────────────────────────────────────────── */}
          <div style={{
            padding: '16px 24px',
            borderTop: '1px solid #1e293b',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            backgroundColor: 'rgba(15,23,42,0.8)'
          }}>
            <div>
              {editingBulletin && (
                <button type="button" onClick={handleDelete} disabled={loading} style={{
                  padding: '10px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
                  backgroundColor: 'transparent', border: '1px solid #ef4444',
                  color: '#ef4444', cursor: 'pointer', transition: 'all 0.15s'
                }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.1)' }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent' }}
                >
                  Delete
                </button>
              )}
            </div>
            
            <div style={{ display: 'flex', gap: '12px' }}>
              <button type="button" onClick={onClose} disabled={loading} style={{
                padding: '10px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
                backgroundColor: 'transparent', border: '1px solid #334155',
                color: '#94a3b8', cursor: 'pointer', transition: 'all 0.15s'
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#475569'; e.currentTarget.style.color = '#e2e8f0' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#334155'; e.currentTarget.style.color = '#94a3b8' }}
              >
                Cancel
              </button>
              
              <button type="submit" disabled={loading} style={{
                padding: '10px 24px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
                background: saveSuccess
                  ? 'linear-gradient(135deg, #10b981, #059669)'
                  : 'linear-gradient(135deg, #3b82f6, #2563eb)',
                border: 'none', color: '#fff', cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: '8px',
                boxShadow: saveSuccess
                  ? '0 4px 12px rgba(16,185,129,0.4)'
                  : '0 4px 12px rgba(59,130,246,0.4)',
                transition: 'all 0.25s', opacity: loading ? 0.7 : 1
              }}>
                {loading && !saveSuccess ? (
                  <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Saving...</>
                ) : saveSuccess ? (
                  <><Check size={16} /> Saved!</>
                ) : (
                  <><Save size={16} /> Save Bulletin</>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
      `}</style>
    </div>
  )
}
