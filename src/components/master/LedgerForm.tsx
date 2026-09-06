import React, { useEffect, useState } from 'react'
import { Input, MODAL_FIELD, MODAL_LABEL, MODAL_GAP } from '../ui/Input'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { apiGetStateCodes, apiGetStations, apiCreateStation, Station, apiGetLedgerGroups, LedgerGroup } from '../../lib/api'

interface LedgerFormProps {
  formData: any
  setFormData: (data: any) => void
  errors?: Record<string, string>
  modalMode: 'create' | 'edit' | 'view'
  firstInputRef?: React.RefObject<HTMLInputElement | HTMLSelectElement>
}

const PREDEFINED_COLOURS = [
  { label: 'Default', value: '' },
  { label: 'Red', value: 'red' },
  { label: 'Blue', value: 'blue' },
  { label: 'Green', value: 'green' },
  { label: 'Orange', value: 'orange' },
  { label: 'Purple', value: 'purple' }
]

export function LedgerForm({ formData, setFormData, errors, modalMode, firstInputRef }: LedgerFormProps) {
  const [states, setStates] = useState<{name: string, code: string}[]>([])

  const [stations, setStations] = useState<Station[]>([])
  const [ledgerGroups, setLedgerGroups] = useState<LedgerGroup[]>([])

  const categories = [
    { value: 'na', label: 'N/A' },
    { value: 'schedule h', label: 'Schedule H' },
    { value: 'schedule h1', label: 'Schedule H1' },
    { value: 'narcotics', label: 'Narcotics' }
  ]
  
  const [isStationModalOpen, setIsStationModalOpen] = useState(false)
  const [newStationName, setNewStationName] = useState('')

  useEffect(() => {
    // Fetch related master data
    apiGetStateCodes().then(res => setStates(res.map(s => ({ name: s.name, code: s.gst_code || '' })))).catch(console.error)
    
    apiGetStations().then(res => setStations(res)).catch(console.error)
    apiGetLedgerGroups().then(res => setLedgerGroups(res)).catch(console.error)

  }, [])

  // Auto-extract PAN from GSTIN if applicable (15 chars)
  useEffect(() => {
    if (formData.gstin && formData.gstin.length === 15) {
      const extractedPan = formData.gstin.substring(2, 12)
      // Only set if not already set, or if it changed due to GSTIN change
      if (formData.pan_no !== extractedPan && formData.pan_no?.length !== 10) {
        setFormData((prev: any) => ({ ...prev, pan_no: extractedPan }))
      }
    }
  }, [formData.gstin])

  const handleStationF2 = (e: React.KeyboardEvent) => {
    if (e.key === 'F2') {
      e.preventDefault()
      setIsStationModalOpen(true)
    }
  }

  const handleCreateStation = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newStationName.trim()) return
    try {
      const created = await apiCreateStation({ name: newStationName.trim() })
      setStations([...stations, created])
      setFormData({ ...formData, station: created.name })
      setIsStationModalOpen(false)
      setNewStationName('')
    } catch (e) {
      console.error(e)
      alert("Failed to create Station")
    }
  }

  const handleRestrictChange = (cat: string) => {
    if (modalMode === 'view') return
    if (cat === 'ALL') {
      setFormData({ ...formData, restrict_item: 'ALL' })
      return
    }
    
    let current = formData.restrict_item ? formData.restrict_item.split(',').filter(Boolean) : []
    if (current.includes('ALL')) current = [] // Remove ALL if individual selected
    
    if (current.includes(cat)) {
      current = current.filter((c: string) => c !== cat)
    } else {
      current.push(cat)
    }
    setFormData({ ...formData, restrict_item: current.join(',') })
  }

  const restrictList = formData.restrict_item ? formData.restrict_item.split(',').filter(Boolean) : []

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '32px', padding: '4px' }}>
      
      {/* COLUMN 1: General & Address */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: MODAL_GAP }}>
        <h4 style={{ margin: 0, paddingBottom: '4px', borderBottom: '1px solid var(--color-border)', color: 'var(--color-primary)' }}>General & Address</h4>
        
        <Input ref={firstInputRef} disabled={modalMode === 'view'} variant="compact" label="Account / Ledger Name *" error={errors?.name} required value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Select or enter account name" />
        
        <div>
            <label style={MODAL_LABEL}>Account Group *</label>
            <select disabled={modalMode === 'view'} value={formData.group_id || ''} onChange={e => setFormData({ ...formData, group_id: e.target.value })} style={MODAL_FIELD}>
              <option value="">Select Ledger Group</option>
              {ledgerGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
        <div>
          <label style={MODAL_LABEL}>Station (Press F2 to create)</label>
          <select disabled={modalMode === 'view'} value={formData.station || ''} onChange={e => setFormData({ ...formData, station: e.target.value })} onKeyDown={handleStationF2} style={{...MODAL_FIELD, borderColor: errors?.station ? '#ef4444' : undefined}}>
            <option value="">-- Select Station --</option>
            {stations.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: MODAL_GAP, marginTop: '8px' }}>
          <Input disabled={modalMode === 'view'} variant="compact" label="Plot / Flat No." value={formData.plot_no || ''} onChange={e => setFormData({ ...formData, plot_no: e.target.value })} />
          <Input disabled={modalMode === 'view'} variant="compact" label="Locality" value={formData.locality || ''} onChange={e => setFormData({ ...formData, locality: e.target.value })} />
        </div>
        <Input disabled={modalMode === 'view'} variant="compact" label="Road / Street" value={formData.road_street || ''} onChange={e => setFormData({ ...formData, road_street: e.target.value })} />
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: MODAL_GAP }}>
          <Input disabled={modalMode === 'view'} variant="compact" label="City" value={formData.city || ''} onChange={e => setFormData({ ...formData, city: e.target.value })} />
          <Input disabled={modalMode === 'view'} variant="compact" label="District" value={formData.district || ''} onChange={e => setFormData({ ...formData, district: e.target.value })} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: MODAL_GAP }}>
          <div>
            <label style={MODAL_LABEL}>State</label>
            <select disabled={modalMode === 'view'} value={formData.state || ''} onChange={e => setFormData({ ...formData, state: e.target.value })} style={MODAL_FIELD}>
              <option value="">-- Select State --</option>
              {states.map(s => <option key={s.code} value={`${s.code}-${s.name}`}>{s.code} - {s.name}</option>)}
            </select>
          </div>
          <Input disabled={modalMode === 'view'} variant="compact" label="Pincode" value={formData.pincode || ''} onChange={e => setFormData({ ...formData, pincode: e.target.value })} />
        </div>

      </div>


      {/* COLUMN 2: Tax & Legal & Restrictions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: MODAL_GAP }}>
        <h4 style={{ margin: 0, paddingBottom: '4px', borderBottom: '1px solid var(--color-border)', color: 'var(--color-primary)' }}>Tax & Legal</h4>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: MODAL_GAP }}>
          <div>
            <label style={MODAL_LABEL}>Ledger Type</label>
            <select disabled={modalMode === 'view'} value={formData.ledger_type || 'Unregistered'} onChange={e => setFormData({ ...formData, ledger_type: e.target.value })} style={MODAL_FIELD}>
              <option value="Registered">Registered</option>
              <option value="Composition">Composition</option>
              <option value="Unregistered">Unregistered</option>
            </select>
          </div>
          <div>
            <label style={MODAL_LABEL}>Tax Type</label>
            <select disabled={modalMode === 'view'} value={formData.tax_type || 'Local'} onChange={e => setFormData({ ...formData, tax_type: e.target.value })} style={MODAL_FIELD}>
              <option value="Local">Local</option>
              <option value="Central">Central</option>
            </select>
          </div>
        </div>

        <Input 
          disabled={modalMode === 'view' || formData.ledger_type === 'Unregistered'} 
          variant="compact" 
          label="GSTIN" 
          error={errors?.gstin}
          value={formData.gstin || ''} 
          onChange={e => {
            const val = e.target.value.toUpperCase().slice(0, 15)
            setFormData({ ...formData, gstin: val })
          }} 
          placeholder="15 char GST No." 
        />
        {formData.ledger_type !== 'Unregistered' && formData.gstin && formData.gstin.length > 0 && formData.gstin.length !== 15 && (
          <span style={{ color: '#dc2626', fontSize: '11px', marginTop: '-8px' }}>GSTIN must be exactly 15 characters if provided.</span>
        )}

        <Input disabled={modalMode === 'view'} variant="compact" label="P.A.N. No" value={formData.pan_no || ''} onChange={e => setFormData({ ...formData, pan_no: e.target.value.toUpperCase().slice(0,10) })} />

        <Input disabled={modalMode === 'view'} variant="compact" label="DL No. (Drug License)" value={formData.dl_no || ''} onChange={e => setFormData({ ...formData, dl_no: e.target.value })} />

        <h4 style={{ margin: '12px 0 0 0', paddingBottom: '4px', borderBottom: '1px solid var(--color-border)', color: 'var(--color-primary)' }}>Ban Items</h4>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={MODAL_LABEL}>Ban Items (Categories)</label>
          <select 
            disabled={modalMode === 'view'} 
            value="" 
            onChange={e => handleRestrictChange(e.target.value)} 
            style={MODAL_FIELD}
          >
            <option value="" disabled>-- Add Ban --</option>
            <option value="ALL">Allow All</option>
            {categories.map(cat => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
            ))}
          </select>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', minHeight: '24px' }}>
            {restrictList.length === 0 && <span style={{ fontSize: '12px', color: 'var(--color-text-tertiary)' }}>No bans set</span>}
            {restrictList.map((c: string) => (
              <span key={c} style={{ background: 'rgba(79,70,229,0.1)', color: 'var(--color-primary)', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                {c === 'ALL' ? 'Allow All' : (categories.find(cat => cat.value === c)?.label || c)}
                {modalMode !== 'view' && (
                  <button type="button" onClick={() => handleRestrictChange(c)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 0, color: 'inherit', fontSize: '14px', lineHeight: 1 }}>&times;</button>
                )}
              </span>
            ))}
          </div>
        </div>

      </div>


      {/* COLUMN 3: Contact & Accounting */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: MODAL_GAP }}>
        <h4 style={{ margin: 0, paddingBottom: '4px', borderBottom: '1px solid var(--color-border)', color: 'var(--color-primary)' }}>Contact Info</h4>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: MODAL_GAP }}>
          <Input disabled={modalMode === 'view'} variant="compact" label="Mobile Number" error={errors?.mobile} value={formData.mobile || ''} onChange={e => setFormData({ ...formData, mobile: e.target.value })} placeholder="10 digit mobile" />
          <Input disabled={modalMode === 'view'} variant="compact" label="Phone Number" value={formData.phone_number || ''} onChange={e => setFormData({ ...formData, phone_number: e.target.value })} placeholder="Landline" />
        </div>

        <Input disabled={modalMode === 'view'} variant="compact" label="Email" type="email" error={errors?.email} value={formData.email || ''} onChange={e => setFormData({ ...formData, email: e.target.value })} />
        <Input disabled={modalMode === 'view'} variant="compact" label="Website" value={formData.website || ''} onChange={e => setFormData({ ...formData, website: e.target.value })} />
        <Input disabled={modalMode === 'view'} variant="compact" label="Contact Person" value={formData.contact_person || ''} onChange={e => setFormData({ ...formData, contact_person: e.target.value })} />

        <h4 style={{ margin: '12px 0 0 0', paddingBottom: '4px', borderBottom: '1px solid var(--color-border)', color: 'var(--color-primary)' }}>Accounting & Settings</h4>
        
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: MODAL_GAP, alignItems: 'flex-end' }}>
          <Input disabled={modalMode === 'view'} variant="compact" label="Opening Balance" type="number" step="0.01" value={formData.opening_balance ?? formData.balance ?? 0} onChange={e => setFormData({ ...formData, opening_balance: Number(e.target.value), balance: Number(e.target.value) })} />
          <div>
            <label style={MODAL_LABEL}>Type</label>
            <select disabled={modalMode === 'view'} value={formData.op_type || formData.type || 'Dr'} onChange={e => setFormData({ ...formData, op_type: e.target.value, type: e.target.value })} style={MODAL_FIELD}>
              <option value="Dr">Dr (Debit)</option>
              <option value="Cr">Cr (Credit)</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: MODAL_GAP }}>
          <Input disabled={modalMode === 'view'} variant="compact" label="Freeze Upto (Limit)" type="number" value={formData.freeze_upto || 0} onChange={e => setFormData({ ...formData, freeze_upto: Number(e.target.value) })} />
          
          <div>
            <label style={MODAL_LABEL}>Colour</label>
            <select disabled={modalMode === 'view'} value={formData.colour || ''} onChange={e => setFormData({ ...formData, colour: e.target.value })} style={MODAL_FIELD}>
              {PREDEFINED_COLOURS.map(c => <option key={c.label} value={c.value}>{c.label}</option>)}
            </select>
          </div>
        </div>

        <Input disabled={modalMode === 'view'} variant="compact" label="Ledger Date" type="date" value={formData.ledger_date ? formData.ledger_date.split('T')[0] : new Date().toISOString().split('T')[0]} onChange={e => setFormData({ ...formData, ledger_date: new Date(e.target.value).toISOString() })} />
        
      </div>

      {/* Mini Modal for Station Creation */}
      <Modal isOpen={isStationModalOpen} onClose={() => setIsStationModalOpen(false)} title="Create New Station" maxWidth="400px" footer={
        <>
          <Button type="button" variant="secondary" onClick={() => setIsStationModalOpen(false)}>Cancel</Button>
          <Button type="button" variant="primary" onClick={handleCreateStation}>Save Station</Button>
        </>
      }>
        <form onSubmit={handleCreateStation} style={{ display: 'flex', flexDirection: 'column', gap: MODAL_GAP }}>
          <Input autoFocus label="Station Name *" required value={newStationName} onChange={e => setNewStationName(e.target.value)} placeholder="e.g. North Zone" />
        </form>
      </Modal>

    </div>
  )
}
