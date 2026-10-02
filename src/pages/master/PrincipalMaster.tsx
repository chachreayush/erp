import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '../../lib/api'
import { Input } from '../../components/ui/Input'
import { Search, Plus, Building2, FileText, Warehouse, Shield, ChevronRight, X, Edit2, Trash2, CheckCircle, PauseCircle, Archive } from 'lucide-react'

// ── Types ────────────────────────────────────────────────────
interface Principal {
  id: string
  organization_id: string
  code: string
  legal_name: string
  brand: string | null
  gstin: string | null
  status: string
  created_at: string
}

interface PrincipalAgreement {
  id: string
  organization_id: string
  principal_id: string
  version_name: string
  valid_from: string
  valid_to: string | null
  commission_percent: number
  handling_percent: number
  is_active: boolean
  created_at: string
}

// ── Component ────────────────────────────────────────────────
export default function PrincipalMaster() {
  const [principals, setPrincipals] = useState<Principal[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedPrincipal, setSelectedPrincipal] = useState<Principal | null>(null)
  const [activeTab, setActiveTab] = useState<'profile' | 'agreements' | 'warehouses'>('profile')
  const [editMode, setEditMode] = useState(false)
  const [agreements, setAgreements] = useState<PrincipalAgreement[]>([])
  const [showAgreementModal, setShowAgreementModal] = useState(false)

  // Form state
  const [form, setForm] = useState({ code: '', legal_name: '', brand: '', gstin: '', status: 'active' })
  const [agreementForm, setAgreementForm] = useState({
    version_name: '', valid_from: '', valid_to: '', commission_percent: 0, handling_percent: 0, is_active: true
  })

  const navigate = useNavigate()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (!showCreateModal && !showAgreementModal) {
          navigate('/')
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showCreateModal, showAgreementModal, navigate])

  const fetchPrincipals = useCallback(async () => {
    try {
      setLoading(true)
      const res = await apiClient.get<Principal[]>('/api/principals/')
      setPrincipals(res.data)
    } catch (err) {
      console.error('Failed to fetch principals', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchPrincipals() }, [fetchPrincipals])

  const fetchAgreements = useCallback(async (principalId: string) => {
    try {
      const res = await apiClient.get<PrincipalAgreement[]>(`/api/principals/${principalId}/agreements`)
      setAgreements(res.data)
    } catch (err) {
      console.error('Failed to fetch agreements', err)
    }
  }, [])

  useEffect(() => {
    if (selectedPrincipal && activeTab === 'agreements') {
      fetchAgreements(selectedPrincipal.id)
    }
  }, [selectedPrincipal, activeTab, fetchAgreements])

  const handleCreate = async () => {
    try {
      await apiClient.post('/api/principals/', form)
      setShowCreateModal(false)
      setForm({ code: '', legal_name: '', brand: '', gstin: '', status: 'active' })
      fetchPrincipals()
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Failed to create principal')
    }
  }

  const handleUpdate = async () => {
    if (!selectedPrincipal) return
    try {
      const res = await apiClient.put<Principal>(`/api/principals/${selectedPrincipal.id}`, form)
      setSelectedPrincipal(res.data)
      setEditMode(false)
      fetchPrincipals()
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Failed to update principal')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this principal?')) return
    try {
      await apiClient.delete(`/api/principals/${id}`)
      setSelectedPrincipal(null)
      fetchPrincipals()
    } catch (err) {
      alert('Failed to delete principal')
    }
  }

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await apiClient.patch(`/api/principals/${id}/status?new_status=${newStatus}`)
      fetchPrincipals()
      if (selectedPrincipal?.id === id) {
        setSelectedPrincipal({ ...selectedPrincipal, status: newStatus })
      }
    } catch (err) {
      alert('Failed to change status')
    }
  }

  const handleCreateAgreement = async () => {
    if (!selectedPrincipal) return
    try {
      await apiClient.post(`/api/principals/${selectedPrincipal.id}/agreements`, {
        ...agreementForm,
        principal_id: selectedPrincipal.id,
        valid_from: new Date(agreementForm.valid_from).toISOString(),
        valid_to: agreementForm.valid_to ? new Date(agreementForm.valid_to).toISOString() : null
      })
      setShowAgreementModal(false)
      setAgreementForm({ version_name: '', valid_from: '', valid_to: '', commission_percent: 0, handling_percent: 0, is_active: true })
      fetchAgreements(selectedPrincipal.id)
    } catch (err) {
      alert('Failed to create agreement')
    }
  }

  const filtered = principals.filter(p =>
    p.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.legal_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.brand || '').toLowerCase().includes(searchQuery.toLowerCase())
  )

  const statusBadge = (status: string) => {
    const colors: Record<string, { bg: string; text: string }> = {
      active: { bg: 'rgba(34,197,94,0.15)', text: '#22c55e' },
      suspended: { bg: 'rgba(234,179,8,0.15)', text: '#eab308' },
      archived: { bg: 'rgba(107,114,128,0.15)', text: '#6b7280' },
    }
    const c = colors[status] || colors.archived
    return (
      <span style={{ padding: '2px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 600, background: c.bg, color: c.text, textTransform: 'uppercase' }}>
        {status}
      </span>
    )
  }

  // ── Detail Panel ───────────────────────────────────────────
  const renderDetail = () => {
    if (!selectedPrincipal) return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-text-muted)' }}>
        <div style={{ textAlign: 'center' }}>
          <Building2 size={48} strokeWidth={1} style={{ marginBottom: '16px', opacity: 0.3 }} />
          <p style={{ fontSize: '14px' }}>Select a principal to view details</p>
        </div>
      </div>
    )

    const tabs: { key: typeof activeTab; label: string; icon: React.ReactNode }[] = [
      { key: 'profile', label: 'Profile', icon: <Building2 size={14} /> },
      { key: 'agreements', label: 'Agreements', icon: <FileText size={14} /> },
      { key: 'warehouses', label: 'Warehouses', icon: <Warehouse size={14} /> },
    ]

    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>{selectedPrincipal.legal_name}</h2>
              {statusBadge(selectedPrincipal.status)}
            </div>
            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
              Code: {selectedPrincipal.code} {selectedPrincipal.gstin && `· GSTIN: ${selectedPrincipal.gstin}`} {selectedPrincipal.brand && `· Brand: ${selectedPrincipal.brand}`}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {selectedPrincipal.status === 'active' && (
              <button onClick={() => handleStatusChange(selectedPrincipal.id, 'suspended')} style={{ ...btnStyle, background: 'rgba(234,179,8,0.15)', color: '#eab308' }}>
                <PauseCircle size={14} /> Suspend
              </button>
            )}
            {selectedPrincipal.status === 'suspended' && (
              <button onClick={() => handleStatusChange(selectedPrincipal.id, 'active')} style={{ ...btnStyle, background: 'rgba(34,197,94,0.15)', color: '#22c55e' }}>
                <CheckCircle size={14} /> Activate
              </button>
            )}
            {selectedPrincipal.status !== 'archived' && (
              <button onClick={() => handleStatusChange(selectedPrincipal.id, 'archived')} style={{ ...btnStyle, background: 'rgba(107,114,128,0.15)', color: '#6b7280' }}>
                <Archive size={14} /> Archive
              </button>
            )}
            <button onClick={() => handleDelete(selectedPrincipal.id)} style={{ ...btnStyle, background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>
              <Trash2 size={14} /> Delete
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0', borderBottom: '1px solid var(--color-border)' }}>
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '10px 20px', fontSize: '13px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px',
                background: 'transparent', border: 'none', cursor: 'pointer',
                color: activeTab === tab.key ? 'var(--color-primary)' : 'var(--color-text-muted)',
                borderBottom: activeTab === tab.key ? '2px solid var(--color-primary)' : '2px solid transparent',
              }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>
          {activeTab === 'profile' && renderProfileTab()}
          {activeTab === 'agreements' && renderAgreementsTab()}
          {activeTab === 'warehouses' && renderWarehousesTab()}
        </div>
      </div>
    )
  }

  const renderProfileTab = () => {
    if (!selectedPrincipal) return null
    if (editMode) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '500px' }}>
          <Input variant="dense" label="Code" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} />
          <Input variant="dense" label="Legal Name" value={form.legal_name} onChange={e => setForm({ ...form, legal_name: e.target.value })} />
          <Input variant="dense" label="Brand" value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })} />
          <Input variant="dense" label="GSTIN" value={form.gstin} onChange={e => setForm({ ...form, gstin: e.target.value })} />
          <Input variant="dense" label="Status" as="select" value={form.status} onChange={e => setForm({ ...form, status: (e.target as any).value })}>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="archived">Archived</option>
          </Input>
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <button onClick={handleUpdate} style={{ ...btnStyle, background: 'var(--color-primary)', color: '#fff' }}>Save Changes</button>
            <button onClick={() => setEditMode(false)} style={{ ...btnStyle, background: 'var(--color-bg-hover)', color: 'var(--color-text-secondary)' }}>Cancel</button>
          </div>
        </div>
      )
    }
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
          <button onClick={() => { setEditMode(true); setForm({ code: selectedPrincipal.code, legal_name: selectedPrincipal.legal_name, brand: selectedPrincipal.brand || '', gstin: selectedPrincipal.gstin || '', status: selectedPrincipal.status }) }} style={{ ...btnStyle, background: 'var(--color-bg-hover)', color: 'var(--color-text-secondary)' }}>
            <Edit2 size={14} /> Edit
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '12px 16px', fontSize: '13px' }}>
          {[
            ['Code', selectedPrincipal.code],
            ['Legal Name', selectedPrincipal.legal_name],
            ['Brand', selectedPrincipal.brand || '—'],
            ['GSTIN', selectedPrincipal.gstin || '—'],
            ['Status', selectedPrincipal.status],
            ['Created', new Date(selectedPrincipal.created_at).toLocaleDateString()],
          ].map(([label, value]) => (
            <React.Fragment key={label}>
              <span style={{ color: 'var(--color-text-muted)', fontWeight: 600 }}>{label}</span>
              <span style={{ color: 'var(--color-text-primary)' }}>{value}</span>
            </React.Fragment>
          ))}
        </div>
      </div>
    )
  }

  const renderAgreementsTab = () => (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)' }}>Commercial Agreements</h3>
        <button onClick={() => setShowAgreementModal(true)} style={{ ...btnStyle, background: 'var(--color-primary)', color: '#fff' }}>
          <Plus size={14} /> New Agreement
        </button>
      </div>
      {agreements.length === 0 ? (
        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', textAlign: 'center', padding: '32px' }}>No agreements found. Create one to define commercial terms.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {agreements.map(a => (
            <div key={a.id} style={{ padding: '12px 16px', background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)' }}>{a.version_name}</span>
                  {a.is_active && <span style={{ marginLeft: '8px', padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 600, background: 'rgba(34,197,94,0.15)', color: '#22c55e' }}>ACTIVE</span>}
                </div>
                <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                  {new Date(a.valid_from).toLocaleDateString()} — {a.valid_to ? new Date(a.valid_to).toLocaleDateString() : 'Ongoing'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '24px', marginTop: '8px', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                <span>Commission: <strong>{a.commission_percent}%</strong></span>
                <span>Handling: <strong>{a.handling_percent}%</strong></span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  const renderWarehousesTab = () => (
    <div style={{ textAlign: 'center', padding: '48px', color: 'var(--color-text-muted)' }}>
      <Warehouse size={40} strokeWidth={1} style={{ marginBottom: '12px', opacity: 0.3 }} />
      <p style={{ fontSize: '14px' }}>Warehouse mapping will be available once DOC-13 (Warehouse Master) is implemented.</p>
    </div>
  )

  // ── Main Layout ────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 56px)', background: 'var(--color-bg)' }}>
      {/* Left Panel: Principal List */}
      <div style={{ width: '340px', borderRight: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column' }}>
        {/* Search & Create */}
        <div style={{ padding: '16px', borderBottom: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h1 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>
              <Building2 size={18} style={{ verticalAlign: 'middle', marginRight: '8px' }} />
              Principals
            </h1>
            <button onClick={() => setShowCreateModal(true)} style={{ ...btnStyle, background: 'var(--color-primary)', color: '#fff', padding: '6px 12px' }}>
              <Plus size={14} /> Add
            </button>
          </div>
          <Input
            variant="dense"
            placeholder="Search by code, name, brand..."
            leftIcon={<Search size={14} />}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        {/* List */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          {loading ? (
            <p style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '13px' }}>Loading...</p>
          ) : filtered.length === 0 ? (
            <p style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '13px' }}>No principals found.</p>
          ) : (
            filtered.map(p => (
              <div
                key={p.id}
                onClick={() => { setSelectedPrincipal(p); setEditMode(false); setActiveTab('profile') }}
                style={{
                  padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid var(--color-border)',
                  background: selectedPrincipal?.id === p.id ? 'var(--color-bg-hover)' : 'transparent',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  transition: 'background 0.1s ease',
                }}
                onMouseEnter={e => { if (selectedPrincipal?.id !== p.id) (e.currentTarget.style.background = 'var(--color-bg-surface)') }}
                onMouseLeave={e => { if (selectedPrincipal?.id !== p.id) (e.currentTarget.style.background = 'transparent') }}
              >
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>{p.legal_name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                    {p.code} {p.brand && `· ${p.brand}`}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {statusBadge(p.status)}
                  <ChevronRight size={14} style={{ color: 'var(--color-text-muted)' }} />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right Panel: Detail */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {renderDetail()}
      </div>

      {/* Create Principal Modal */}
      {showCreateModal && (
        <div style={overlayStyle} onClick={() => setShowCreateModal(false)}>
          <div style={modalStyle} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text-primary)' }}>Create Principal</h2>
              <button onClick={() => setShowCreateModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <Input variant="dense" label="Code *" placeholder="PRIN-001" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} />
              <Input variant="dense" label="Legal Name *" placeholder="XYZ Pharmaceuticals Pvt. Ltd." value={form.legal_name} onChange={e => setForm({ ...form, legal_name: e.target.value })} />
              <Input variant="dense" label="Brand" placeholder="XYZ Pharma" value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })} />
              <Input variant="dense" label="GSTIN" placeholder="22AAAAA0000A1Z5" value={form.gstin} onChange={e => setForm({ ...form, gstin: e.target.value })} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '24px' }}>
              <button onClick={() => setShowCreateModal(false)} style={{ ...btnStyle, background: 'var(--color-bg-hover)', color: 'var(--color-text-secondary)' }}>Cancel</button>
              <button onClick={handleCreate} disabled={!form.code || !form.legal_name} style={{ ...btnStyle, background: 'var(--color-primary)', color: '#fff', opacity: (!form.code || !form.legal_name) ? 0.5 : 1 }}>
                <Plus size={14} /> Create Principal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Agreement Modal */}
      {showAgreementModal && (
        <div style={overlayStyle} onClick={() => setShowAgreementModal(false)}>
          <div style={modalStyle} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text-primary)' }}>New Commercial Agreement</h2>
              <button onClick={() => setShowAgreementModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <Input variant="dense" label="Version Name *" placeholder="FY2026-27 Agreement" value={agreementForm.version_name} onChange={e => setAgreementForm({ ...agreementForm, version_name: e.target.value })} />
              <Input variant="dense" label="Valid From *" type="date" value={agreementForm.valid_from} onChange={e => setAgreementForm({ ...agreementForm, valid_from: e.target.value })} />
              <Input variant="dense" label="Valid To" type="date" value={agreementForm.valid_to} onChange={e => setAgreementForm({ ...agreementForm, valid_to: e.target.value })} />
              <Input variant="dense" label="Commission %" type="number" value={String(agreementForm.commission_percent)} onChange={e => setAgreementForm({ ...agreementForm, commission_percent: parseFloat(e.target.value) || 0 })} />
              <Input variant="dense" label="Handling %" type="number" value={String(agreementForm.handling_percent)} onChange={e => setAgreementForm({ ...agreementForm, handling_percent: parseFloat(e.target.value) || 0 })} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '24px' }}>
              <button onClick={() => setShowAgreementModal(false)} style={{ ...btnStyle, background: 'var(--color-bg-hover)', color: 'var(--color-text-secondary)' }}>Cancel</button>
              <button onClick={handleCreateAgreement} disabled={!agreementForm.version_name || !agreementForm.valid_from} style={{ ...btnStyle, background: 'var(--color-primary)', color: '#fff', opacity: (!agreementForm.version_name || !agreementForm.valid_from) ? 0.5 : 1 }}>
                <Plus size={14} /> Create Agreement
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Shared Styles ────────────────────────────────────────────
const btnStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: '6px',
  padding: '6px 14px', borderRadius: '6px', border: 'none',
  cursor: 'pointer', fontSize: '12px', fontWeight: 600, fontFamily: 'inherit',
  transition: 'all 0.15s ease',
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 1000,
  background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}

const modalStyle: React.CSSProperties = {
  background: 'var(--color-bg-surface)', borderRadius: '12px',
  padding: '24px 28px', width: '480px', maxHeight: '85vh', overflow: 'auto',
  border: '1px solid var(--color-border)',
  boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
}
