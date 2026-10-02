import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '../../lib/api'
import { Input } from '../../components/ui/Input'
import { Search, Plus, Truck, X, Trash2, Shield } from 'lucide-react'

export default function TransportMaster() {
  const [transporters, setTransporters] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedT, setSelectedT] = useState<any>(null)
  
  // Modals
  const [showTModal, setShowTModal] = useState(false)
  const [showVModal, setShowVModal] = useState(false)
  
  // Forms
  const [tForm, setTForm] = useState({ code: '', name: '', gstin: '', contact_person: '', phone: '', status: 'active' })
  const [vForm, setVForm] = useState({ registration_number: '', vehicle_type: '', capacity_kg: 0, driver_name: '', status: 'active' })

  const navigate = useNavigate()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (!showTModal && !showVModal) {
          navigate('/')
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showTModal, showVModal, navigate])

  const fetchTransporters = useCallback(async () => {
    try {
      setLoading(true)
      const res = await apiClient.get('/api/transport/transporters')
      setTransporters(res.data)
      if (selectedT) {
        const updated = res.data.find((t: any) => t.id === selectedT.id)
        setSelectedT(updated || null)
      }
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }, [selectedT])

  useEffect(() => { fetchTransporters() }, [fetchTransporters])

  const handleCreateT = async () => {
    try {
      await apiClient.post('/api/transport/transporters', tForm)
      setShowTModal(false)
      setTForm({ code: '', name: '', gstin: '', contact_person: '', phone: '', status: 'active' })
      fetchTransporters()
    } catch (err: any) { alert(err?.response?.data?.detail || 'Failed to create transporter') }
  }

  const handleCreateV = async () => {
    if (!selectedT) return
    try {
      await apiClient.post(`/api/transport/transporters/${selectedT.id}/vehicles`, vForm)
      setShowVModal(false)
      setVForm({ registration_number: '', vehicle_type: '', capacity_kg: 0, driver_name: '', status: 'active' })
      fetchTransporters()
    } catch (err: any) { alert('Failed to create vehicle') }
  }

  const handleDeleteT = async (id: string) => {
    if (!confirm('Delete transporter?')) return
    await apiClient.delete(`/api/transport/transporters/${id}`)
    setSelectedT(null)
    fetchTransporters()
  }
  const handleDeleteV = async (id: string) => {
    if (!confirm('Delete vehicle?')) return
    await apiClient.delete(`/api/transport/vehicles/${id}`)
    fetchTransporters()
  }

  const filtered = transporters.filter(t => t.name.toLowerCase().includes(search.toLowerCase()) || t.code.toLowerCase().includes(search.toLowerCase()))

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 56px)', background: 'var(--color-bg)' }}>
      
      {/* LEFT: Transporter List */}
      <div style={{ width: '340px', borderRight: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px', borderBottom: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h1 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}><Truck size={16} style={{ marginRight: 8, verticalAlign: 'middle' }}/>Transport</h1>
            <button onClick={() => setShowTModal(true)} style={btnStyle}><Plus size={14}/> Add</button>
          </div>
          <Input variant="dense" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} leftIcon={<Search size={14}/>} />
        </div>
        <div style={{ flex: 1, overflow: 'auto' }}>
          {filtered.map(t => (
            <div key={t.id} onClick={() => setSelectedT(t)}
              style={{
                padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid var(--color-border)',
                background: selectedT?.id === t.id ? 'var(--color-bg-hover)' : 'transparent',
              }}>
              <div style={{ fontWeight: 600, fontSize: '14px' }}>{t.name}</div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{t.code} · {t.vehicles?.length || 0} Vehicles</div>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT: Detail View */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {!selectedT ? (
          <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            <Truck size={48} opacity={0.3} style={{ marginBottom: 16 }} />
            <p>Select a transporter to view fleet</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>{selectedT.name}</h2>
                <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: '4px 0 0 0' }}>Code: {selectedT.code} {selectedT.phone && `· Ph: ${selectedT.phone}`}</p>
              </div>
              <div>
                <button onClick={() => handleDeleteT(selectedT.id)} style={{ ...btnStyle, background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}><Trash2 size={14}/> Delete</button>
              </div>
            </div>
            
            {/* Fleet */}
            <div style={{ padding: '20px 24px', flex: 1, overflow: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>Fleet & Vehicles</h3>
                <button onClick={() => setShowVModal(true)} style={btnStyle}><Plus size={14}/> Add Vehicle</button>
              </div>

              {selectedT.vehicles?.length === 0 ? (
                <p style={{ color: 'var(--color-text-muted)', fontSize: '13px', textAlign: 'center', padding: '40px' }}>No vehicles registered to this transporter.</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '12px' }}>
                  {selectedT.vehicles.map((v: any) => (
                    <div key={v.id} style={{ padding: '16px', background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <div style={{ fontWeight: 600, fontSize: '14px' }}>{v.registration_number}</div>
                        <button onClick={() => handleDeleteV(v.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 0 }}><Trash2 size={14}/></button>
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                        Type: {v.vehicle_type || 'Unknown'} <br/>
                        Driver: {v.driver_name || 'Unassigned'} <br/>
                        Capacity: {v.capacity_kg ? `${v.capacity_kg} kg` : 'N/A'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* TRANSPORTER MODAL */}
      {showTModal && (
        <div style={overlayStyle} onClick={() => setShowTModal(false)}>
          <div style={modalStyle} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '20px' }}>Register Transporter</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <Input variant="dense" label="Code *" value={tForm.code} onChange={e => setTForm({...tForm, code: e.target.value})} />
              <Input variant="dense" label="Name *" value={tForm.name} onChange={e => setTForm({...tForm, name: e.target.value})} />
              <Input variant="dense" label="GSTIN" value={tForm.gstin} onChange={e => setTForm({...tForm, gstin: e.target.value})} />
              <Input variant="dense" label="Contact Person" value={tForm.contact_person} onChange={e => setTForm({...tForm, contact_person: e.target.value})} />
              <Input variant="dense" label="Phone" value={tForm.phone} onChange={e => setTForm({...tForm, phone: e.target.value})} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '24px' }}>
              <button onClick={() => setShowTModal(false)} style={{ ...btnStyle, background: 'var(--color-bg-hover)' }}>Cancel</button>
              <button onClick={handleCreateT} style={{ ...btnStyle, background: 'var(--color-primary)', color: '#fff' }}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* VEHICLE MODAL */}
      {showVModal && (
        <div style={overlayStyle} onClick={() => setShowVModal(false)}>
          <div style={modalStyle} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '20px' }}>Register Vehicle</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <Input variant="dense" label="Reg No. *" placeholder="MH-12-AB-1234" value={vForm.registration_number} onChange={e => setVForm({...vForm, registration_number: e.target.value})} />
              <Input variant="dense" label="Type" placeholder="LCV, Open, Container" value={vForm.vehicle_type} onChange={e => setVForm({...vForm, vehicle_type: e.target.value})} />
              <Input variant="dense" label="Capacity (kg)" type="number" value={String(vForm.capacity_kg)} onChange={e => setVForm({...vForm, capacity_kg: Number(e.target.value)})} />
              <Input variant="dense" label="Driver Name" value={vForm.driver_name} onChange={e => setVForm({...vForm, driver_name: e.target.value})} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '24px' }}>
              <button onClick={() => setShowVModal(false)} style={{ ...btnStyle, background: 'var(--color-bg-hover)' }}>Cancel</button>
              <button onClick={handleCreateV} style={{ ...btnStyle, background: 'var(--color-primary)', color: '#fff' }}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const btnStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: '6px',
  padding: '6px 14px', borderRadius: '6px', border: 'none',
  cursor: 'pointer', fontSize: '12px', fontWeight: 600, fontFamily: 'inherit',
  background: 'var(--color-bg-hover)', color: 'var(--color-text-primary)'
}
const overlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 1000,
  background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}
const modalStyle: React.CSSProperties = {
  background: 'var(--color-bg-surface)', borderRadius: '12px',
  padding: '24px 28px', width: '400px', border: '1px solid var(--color-border)',
  boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', color: 'var(--color-text-primary)'
}
