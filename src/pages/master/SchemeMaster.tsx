import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '../../lib/api'
import { Input } from '../../components/ui/Input'
import { Search, Plus, Percent, Archive, Edit2, Shield, Calendar, Box, Star } from 'lucide-react'

export default function SchemeMaster() {
  const navigate = useNavigate()
  const [schemes, setSchemes] = useState<any[]>([])
  const [principals, setPrincipals] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [selectedS, setSelectedS] = useState<any>(null)
  
  // Modals
  const [showSModal, setShowSModal] = useState(false)
  const [showVModal, setShowVModal] = useState(false)
  const [showEModal, setShowEModal] = useState(false)
  
  const [sForm, setSForm] = useState({ code: '', name: '', scheme_type: 'official', principal_id: '', status: 'active' })
  const [vForm, setVForm] = useState({ product_id: '', valid_from: '', valid_to: '', buy_qty: 0, free_qty: 0 })
  const [eForm, setEForm] = useState({ scheme_version_id: '', granted_qty: 0 })

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !showSModal && !showVModal && !showEModal) {
        navigate('/')
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showSModal, showVModal, showEModal, navigate])

  const fetchData = useCallback(async () => {
    try {
      const [sRes, pRes, prRes] = await Promise.all([
        apiClient.get('/api/schemes/'),
        apiClient.get('/api/principals/'),
        apiClient.get('/api/products/')
      ])
      setSchemes(sRes.data)
      setPrincipals(pRes.data)
      setProducts(prRes.data)
      if (selectedS) setSelectedS(sRes.data.find((x:any) => x.id === selectedS.id))
    } catch (err) { console.error(err) }
  }, [selectedS])

  useEffect(() => { fetchData() }, [fetchData])

  const handleCreateS = async () => {
    await apiClient.post('/api/schemes/', sForm)
    setShowSModal(false)
    fetchData()
  }

  const handleCreateV = async () => {
    if (!selectedS) return
    await apiClient.post(`/api/schemes/${selectedS.id}/versions`, vForm)
    setShowVModal(false)
    fetchData()
  }

  const handleGrantE = async () => {
    await apiClient.post(`/api/schemes/entitlements`, eForm)
    setShowEModal(false)
    alert('Entitlement granted successfully!')
  }

  const filtered = schemes.filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.code.toLowerCase().includes(search.toLowerCase()))

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 56px)', background: 'var(--color-bg)' }}>
      {/* LEFT */}
      <div style={{ width: '340px', borderRight: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px', borderBottom: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h1 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}><Percent size={16} style={{ marginRight: 8, verticalAlign: 'middle' }}/>Schemes</h1>
            <button onClick={() => setShowSModal(true)} style={btnStyle}><Plus size={14}/> Add</button>
          </div>
          <Input variant="dense" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} leftIcon={<Search size={14}/>} />
        </div>
        <div style={{ flex: 1, overflow: 'auto' }}>
          {filtered.map(s => (
            <div key={s.id} onClick={() => setSelectedS(s)}
              style={{ padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid var(--color-border)', background: selectedS?.id === s.id ? 'var(--color-bg-hover)' : 'transparent' }}>
              <div style={{ fontWeight: 600, fontSize: '14px', display: 'flex', justifyContent: 'space-between' }}>
                {s.name}
                {s.scheme_type === 'extra_allowance' && <Star size={14} color="#f59e0b" />}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{s.code} · {s.versions?.length || 0} versions</div>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {!selectedS ? (
          <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            <Percent size={48} opacity={0.3} style={{ marginBottom: 16 }} />
            <p>Select a scheme to view rules</p>
          </div>
        ) : (
          <>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--color-border)' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>{selectedS.name}</h2>
              <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: '4px 0 0 0' }}>Type: {selectedS.scheme_type.replace('_', ' ').toUpperCase()}</p>
            </div>
            <div style={{ padding: '20px 24px', flex: 1, overflow: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>Versions & Rules</h3>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {selectedS.scheme_type === 'extra_allowance' && (
                    <button onClick={() => setShowEModal(true)} style={{...btnStyle, color: '#f59e0b'}}><Star size={14}/> Grant Allowance</button>
                  )}
                  <button onClick={() => setShowVModal(true)} style={btnStyle}><Plus size={14}/> New Version</button>
                </div>
              </div>
              
              {selectedS.versions?.map((v: any) => {
                const p = products.find(x => x.id === v.product_id)
                return (
                  <div key={v.id} style={{ padding: '16px', background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <div style={{ fontWeight: 600 }}>v{v.version_number}: {p?.name || 'Unknown Product'}</div>
                      <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}><Calendar size={12}/> {v.valid_from} to {v.valid_to}</div>
                    </div>
                    <div style={{ fontSize: '14px' }}>
                      <span style={{ color: 'var(--color-text-muted)' }}>Rule:</span> Buy <b style={{color: 'var(--color-primary)'}}>{v.buy_qty}</b> get <b style={{color: '#10b981'}}>{v.free_qty}</b> free
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* S MODAL */}
      {showSModal && (
        <div style={overlayStyle} onClick={() => setShowSModal(false)}>
          <div style={modalStyle} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '20px' }}>Create Scheme Program</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <Input variant="dense" label="Code" value={sForm.code} onChange={e => setSForm({...sForm, code: e.target.value})} />
              <Input variant="dense" label="Name" value={sForm.name} onChange={e => setSForm({...sForm, name: e.target.value})} />
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <label style={{ width: '120px', fontSize: '12px', color: 'var(--color-text-muted)' }}>Principal</label>
                <select style={selectStyle} value={sForm.principal_id} onChange={e => setSForm({...sForm, principal_id: e.target.value})}>
                  <option value="">-- Select --</option>
                  {principals.map(p => <option key={p.id} value={p.id}>{p.legal_name}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <label style={{ width: '120px', fontSize: '12px', color: 'var(--color-text-muted)' }}>Type</label>
                <select style={selectStyle} value={sForm.scheme_type} onChange={e => setSForm({...sForm, scheme_type: e.target.value})}>
                  <option value="official">Official (Customer Facing)</option>
                  <option value="extra_allowance">Extra Allowance (Reimbursable)</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '24px' }}>
              <button onClick={handleCreateS} style={{ ...btnStyle, background: 'var(--color-primary)', color: '#fff' }}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* V MODAL */}
      {showVModal && (
        <div style={overlayStyle} onClick={() => setShowVModal(false)}>
          <div style={modalStyle} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '20px' }}>Create Scheme Version</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <label style={{ width: '120px', fontSize: '12px', color: 'var(--color-text-muted)' }}>Product</label>
                <select style={selectStyle} value={vForm.product_id} onChange={e => setVForm({...vForm, product_id: e.target.value})}>
                  <option value="">-- Select --</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <Input variant="dense" label="Valid From" type="date" value={vForm.valid_from} onChange={e => setVForm({...vForm, valid_from: e.target.value})} />
              <Input variant="dense" label="Valid To" type="date" value={vForm.valid_to} onChange={e => setVForm({...vForm, valid_to: e.target.value})} />
              <Input variant="dense" label="Buy Qty" type="number" value={String(vForm.buy_qty)} onChange={e => setVForm({...vForm, buy_qty: Number(e.target.value)})} />
              <Input variant="dense" label="Free Qty" type="number" value={String(vForm.free_qty)} onChange={e => setVForm({...vForm, free_qty: Number(e.target.value)})} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '24px' }}>
              <button onClick={handleCreateV} style={{ ...btnStyle, background: 'var(--color-primary)', color: '#fff' }}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* E MODAL */}
      {showEModal && (
        <div style={overlayStyle} onClick={() => setShowEModal(false)}>
          <div style={modalStyle} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '20px' }}>Grant Entitlement</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <label style={{ width: '120px', fontSize: '12px', color: 'var(--color-text-muted)' }}>Version</label>
                <select style={selectStyle} value={eForm.scheme_version_id} onChange={e => setEForm({...eForm, scheme_version_id: e.target.value})}>
                  <option value="">-- Select --</option>
                  {selectedS?.versions?.map((v: any) => (
                    <option key={v.id} value={v.id}>v{v.version_number} - Buy {v.buy_qty} Get {v.free_qty}</option>
                  ))}
                </select>
              </div>
              <Input variant="dense" label="Granted Qty" type="number" value={String(eForm.granted_qty)} onChange={e => setEForm({...eForm, granted_qty: Number(e.target.value)})} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '24px' }}>
              <button onClick={handleGrantE} style={{ ...btnStyle, background: '#f59e0b', color: '#fff' }}>Grant</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const btnStyle: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 600, fontFamily: 'inherit', background: 'var(--color-bg-hover)', color: 'var(--color-text-primary)' }
const overlayStyle: React.CSSProperties = { position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }
const modalStyle: React.CSSProperties = { background: 'var(--color-bg-surface)', borderRadius: '12px', padding: '24px 28px', width: '400px', border: '1px solid var(--color-border)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', color: 'var(--color-text-primary)' }
const selectStyle: React.CSSProperties = { flex: 1, padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text-primary)' }
