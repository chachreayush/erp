import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '../../lib/api'
import { Input } from '../../components/ui/Input'
import { Search, Plus, Warehouse, Box, Layers, Archive, X, Trash2, Edit2, ChevronDown, ChevronRight } from 'lucide-react'

export default function WarehouseMaster() {
  const [warehouses, setWarehouses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedWh, setSelectedWh] = useState<any>(null)
  
  // Modals
  const [showWhModal, setShowWhModal] = useState(false)
  const [showZoneModal, setShowZoneModal] = useState(false)
  const [showBinModal, setShowBinModal] = useState(false)
  
  // Forms
  const [whForm, setWhForm] = useState({ code: '', name: '', address: '', manager_name: '', status: 'active' })
  const [zoneForm, setZoneForm] = useState({ code: '', name: '', storage_type: '', status: 'active' })
  const [binForm, setBinForm] = useState({ zone_id: '', code: '', aisle: '', rack: '', shelf: '', bin_number: '', status: 'available' })

  // UI state
  const [expandedZones, setExpandedZones] = useState<Record<string, boolean>>({})

  const navigate = useNavigate()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (!showWhModal && !showZoneModal && !showBinModal) {
          navigate('/')
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showWhModal, showZoneModal, showBinModal, navigate])

  const fetchWarehouses = useCallback(async () => {
    try {
      setLoading(true)
      const res = await apiClient.get('/api/warehouses/')
      setWarehouses(res.data)
      if (selectedWh) {
        const updated = res.data.find((w: any) => w.id === selectedWh.id)
        setSelectedWh(updated || null)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [selectedWh])

  useEffect(() => { fetchWarehouses() }, [fetchWarehouses])

  const handleCreateWh = async () => {
    try {
      await apiClient.post('/api/warehouses/', whForm)
      setShowWhModal(false)
      setWhForm({ code: '', name: '', address: '', manager_name: '', status: 'active' })
      fetchWarehouses()
    } catch (err: any) { alert(err?.response?.data?.detail || 'Failed to create warehouse') }
  }

  const handleCreateZone = async () => {
    if (!selectedWh) return
    try {
      await apiClient.post(`/api/warehouses/${selectedWh.id}/zones`, zoneForm)
      setShowZoneModal(false)
      setZoneForm({ code: '', name: '', storage_type: '', status: 'active' })
      fetchWarehouses()
    } catch (err: any) { alert('Failed to create zone') }
  }

  const handleCreateBin = async () => {
    if (!selectedWh || !binForm.zone_id) return
    try {
      await apiClient.post(`/api/warehouses/${selectedWh.id}/bins`, binForm)
      setShowBinModal(false)
      setBinForm({ zone_id: '', code: '', aisle: '', rack: '', shelf: '', bin_number: '', status: 'available' })
      fetchWarehouses()
    } catch (err: any) { alert('Failed to create bin') }
  }

  const handleDeleteWh = async (id: string) => {
    if (!confirm('Delete warehouse?')) return
    await apiClient.delete(`/api/warehouses/${id}`)
    setSelectedWh(null)
    fetchWarehouses()
  }
  const handleDeleteZone = async (id: string) => {
    if (!confirm('Delete zone?')) return
    await apiClient.delete(`/api/warehouses/zones/${id}`)
    fetchWarehouses()
  }
  const handleDeleteBin = async (id: string) => {
    if (!confirm('Delete bin?')) return
    await apiClient.delete(`/api/warehouses/bins/${id}`)
    fetchWarehouses()
  }

  const toggleZone = (id: string) => setExpandedZones(prev => ({ ...prev, [id]: !prev[id] }))

  const filtered = warehouses.filter(w => w.name.toLowerCase().includes(search.toLowerCase()) || w.code.toLowerCase().includes(search.toLowerCase()))

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 56px)', background: 'var(--color-bg)' }}>
      
      {/* LEFT: Warehouse List */}
      <div style={{ width: '340px', borderRight: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px', borderBottom: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h1 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}><Warehouse size={16} style={{ marginRight: 8, verticalAlign: 'middle' }}/>Warehouses</h1>
            <button onClick={() => setShowWhModal(true)} style={btnStyle}><Plus size={14}/> Add</button>
          </div>
          <Input variant="dense" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} leftIcon={<Search size={14}/>} />
        </div>
        <div style={{ flex: 1, overflow: 'auto' }}>
          {filtered.map(w => (
            <div key={w.id} onClick={() => setSelectedWh(w)}
              style={{
                padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid var(--color-border)',
                background: selectedWh?.id === w.id ? 'var(--color-bg-hover)' : 'transparent',
              }}>
              <div style={{ fontWeight: 600, fontSize: '14px' }}>{w.name}</div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{w.code} · {w.zones?.length || 0} Zones</div>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT: Detail View */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {!selectedWh ? (
          <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            <Warehouse size={48} opacity={0.3} style={{ marginBottom: 16 }} />
            <p>Select a warehouse to view details</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>{selectedWh.name}</h2>
                <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: '4px 0 0 0' }}>Code: {selectedWh.code} {selectedWh.manager_name && `· Manager: ${selectedWh.manager_name}`}</p>
              </div>
              <div>
                <button onClick={() => handleDeleteWh(selectedWh.id)} style={{ ...btnStyle, background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}><Trash2 size={14}/> Delete</button>
              </div>
            </div>
            
            {/* WMS Hierarchy */}
            <div style={{ padding: '20px 24px', flex: 1, overflow: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>Storage Hierarchy</h3>
                <button onClick={() => setShowZoneModal(true)} style={btnStyle}><Plus size={14}/> Add Zone</button>
              </div>

              {selectedWh.zones?.length === 0 ? (
                <p style={{ color: 'var(--color-text-muted)', fontSize: '13px', textAlign: 'center', padding: '40px' }}>No zones configured. Start building your location hierarchy.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {selectedWh.zones.map((zone: any) => (
                    <div key={zone.id} style={{ border: '1px solid var(--color-border)', borderRadius: '8px', overflow: 'hidden' }}>
                      {/* Zone Row */}
                      <div style={{ padding: '12px 16px', background: 'var(--color-bg-surface)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }} onClick={() => toggleZone(zone.id)}>
                          {expandedZones[zone.id] ? <ChevronDown size={16}/> : <ChevronRight size={16}/>}
                          <Layers size={16} color="var(--color-primary)" />
                          <span style={{ fontWeight: 600, fontSize: '14px' }}>{zone.name}</span>
                          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>({zone.code}) {zone.storage_type && `- ${zone.storage_type}`}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button onClick={() => { setBinForm(prev => ({ ...prev, zone_id: zone.id })); setShowBinModal(true) }} style={{ ...btnStyle, background: 'transparent', border: '1px solid var(--color-border)' }}><Plus size={12}/> Bin</button>
                          <button onClick={() => handleDeleteZone(zone.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={14}/></button>
                        </div>
                      </div>
                      
                      {/* Bins List */}
                      {expandedZones[zone.id] && (
                        <div style={{ padding: '0 16px 12px 40px', background: 'var(--color-bg-surface)' }}>
                          {zone.bins?.length === 0 ? (
                            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', padding: '8px 0' }}>No bins in this zone.</div>
                          ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px', marginTop: '8px' }}>
                              {zone.bins.map((b: any) => (
                                <div key={b.id} style={{ padding: '8px 12px', background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: '6px', fontSize: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Box size={14} color="var(--color-text-muted)"/> {b.code}</div>
                                  <button onClick={() => handleDeleteBin(b.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 0 }}><X size={14}/></button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* WH MODAL */}
      {showWhModal && (
        <div style={overlayStyle} onClick={() => setShowWhModal(false)}>
          <div style={modalStyle} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '20px' }}>Create Warehouse</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <Input variant="dense" label="Code" value={whForm.code} onChange={e => setWhForm({...whForm, code: e.target.value})} />
              <Input variant="dense" label="Name" value={whForm.name} onChange={e => setWhForm({...whForm, name: e.target.value})} />
              <Input variant="dense" label="Address" value={whForm.address} onChange={e => setWhForm({...whForm, address: e.target.value})} />
              <Input variant="dense" label="Manager" value={whForm.manager_name} onChange={e => setWhForm({...whForm, manager_name: e.target.value})} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '24px' }}>
              <button onClick={() => setShowWhModal(false)} style={{ ...btnStyle, background: 'var(--color-bg-hover)' }}>Cancel</button>
              <button onClick={handleCreateWh} style={{ ...btnStyle, background: 'var(--color-primary)', color: '#fff' }}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* ZONE MODAL */}
      {showZoneModal && (
        <div style={overlayStyle} onClick={() => setShowZoneModal(false)}>
          <div style={modalStyle} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '20px' }}>Create Zone</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <Input variant="dense" label="Zone Code" value={zoneForm.code} onChange={e => setZoneForm({...zoneForm, code: e.target.value})} />
              <Input variant="dense" label="Zone Name" value={zoneForm.name} onChange={e => setZoneForm({...zoneForm, name: e.target.value})} />
              <Input variant="dense" label="Storage Type" placeholder="e.g., Bulk, Cold, Picking" value={zoneForm.storage_type} onChange={e => setZoneForm({...zoneForm, storage_type: e.target.value})} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '24px' }}>
              <button onClick={() => setShowZoneModal(false)} style={{ ...btnStyle, background: 'var(--color-bg-hover)' }}>Cancel</button>
              <button onClick={handleCreateZone} style={{ ...btnStyle, background: 'var(--color-primary)', color: '#fff' }}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* BIN MODAL */}
      {showBinModal && (
        <div style={overlayStyle} onClick={() => setShowBinModal(false)}>
          <div style={modalStyle} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '20px' }}>Create Bin Location</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <Input variant="dense" label="Bin Code *" placeholder="A1-R1-S1-B1" value={binForm.code} onChange={e => setBinForm({...binForm, code: e.target.value})} />
              <Input variant="dense" label="Aisle" value={binForm.aisle} onChange={e => setBinForm({...binForm, aisle: e.target.value})} />
              <Input variant="dense" label="Rack" value={binForm.rack} onChange={e => setBinForm({...binForm, rack: e.target.value})} />
              <Input variant="dense" label="Shelf" value={binForm.shelf} onChange={e => setBinForm({...binForm, shelf: e.target.value})} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '24px' }}>
              <button onClick={() => setShowBinModal(false)} style={{ ...btnStyle, background: 'var(--color-bg-hover)' }}>Cancel</button>
              <button onClick={handleCreateBin} style={{ ...btnStyle, background: 'var(--color-primary)', color: '#fff' }}>Save</button>
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
