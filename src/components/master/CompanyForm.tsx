import React, { useEffect, useState } from 'react'
import { Input, MODAL_FIELD, MODAL_LABEL, MODAL_GAP } from '../ui/Input'
import { apiGetLedgers } from '../../lib/api'

interface CompanyFormProps {
  errors?: Record<string, string>;
  formData: any
  setFormData: (data: any) => void
  modalMode: 'create' | 'edit' | 'view'
  firstInputRef?: React.RefObject<HTMLInputElement | HTMLSelectElement>
}

export function CompanyForm({ formData, setFormData, modalMode, firstInputRef }: CompanyFormProps) {
  const [ledgers, setLedgers] = useState<{id: string, name: string, group: string}[]>([])

  useEffect(() => {
    // Only fetch ledgers for supplier list
    apiGetLedgers().then(res => {
      setLedgers(res.map(l => ({ id: l.id as string, name: l.name, group: l.group_name })))
    }).catch(err => console.error("Failed to fetch ledgers for company form", err))
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: MODAL_GAP }}>
      {/* ROW 1: Name | Short Code | Status | Prohibited | Discount | Dump Days */}
      <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 1fr 1fr 1fr 1fr 1fr', gap: MODAL_GAP }}>
        <Input ref={firstInputRef} disabled={modalMode === 'view'} variant="compact" label="Name *" required value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Cipla Ltd" />
        <Input disabled={modalMode === 'view'} variant="compact" label="Short Code" value={formData.code || formData.short_code || ''} onChange={e => setFormData({ ...formData, code: e.target.value, short_code: e.target.value })} placeholder="CIP" />
        <div>
          <label style={MODAL_LABEL}>Status</label>
          <select disabled={modalMode === 'view'} value={formData.status || 'continue'} onChange={e => setFormData({ ...formData, status: e.target.value })} style={MODAL_FIELD}>
            <option value="continue">Continue</option>
            <option value="close">Close</option>
          </select>
        </div>
        <div>
          <label style={MODAL_LABEL}>Prohibited</label>
          <select disabled={modalMode === 'view'} value={formData.prohibited ? 'yes' : 'no'} onChange={e => setFormData({ ...formData, prohibited: e.target.value === 'yes' })} style={MODAL_FIELD}>
            <option value="no">No</option>
            <option value="yes">Yes</option>
          </select>
        </div>
        <Input disabled={modalMode === 'view'} variant="compact" label="Discount (%)" type="number" step="0.01" value={formData.discount ?? formData.default_discount ?? 0} onChange={e => setFormData({ ...formData, discount: Number(e.target.value) })} />
        <Input disabled={modalMode === 'view'} variant="compact" label="Dump Days" type="number" value={formData.dump_days ?? 0} onChange={e => setFormData({ ...formData, dump_days: Number(e.target.value) })} />
      </div>

      {/* ROW 2: Room No | Floor | Rack No | Rack Row No | Supplier | Supplier Ledger */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 2fr', gap: MODAL_GAP }}>
        {(['room_no','floor','rack_no','rack_row_no'] as const).map((field, i) => (
          <Input key={field} disabled={modalMode === 'view'} variant="compact" label={['Room No','Floor','Rack No','Rack Row No'][i]} value={(formData as any)[field] || ''} onChange={e => setFormData({ ...formData, [field]: e.target.value })} />
        ))}
        <div>
          <label style={MODAL_LABEL}>Supplier</label>
          <select disabled={modalMode === 'view'} value={formData.is_supplier === 'yes' || formData.is_supplier === true ? 'yes' : 'no'} onChange={e => setFormData({ ...formData, is_supplier: e.target.value })} style={MODAL_FIELD}>
            <option value="no">No</option>
            <option value="yes">Yes</option>
          </select>
        </div>
        <div>
          <label style={MODAL_LABEL}>Supplier Ledger</label>
          <select disabled={modalMode === 'view' || !(formData.is_supplier === 'yes' || formData.is_supplier === true)} value={formData.supplier_ledger_id || ''} onChange={e => setFormData({ ...formData, supplier_ledger_id: e.target.value })} style={{ ...MODAL_FIELD, opacity: (formData.is_supplier === 'yes' || formData.is_supplier === true) ? 1 : 0.4 }}>
            <option value="">-- Select Ledger --</option>
            {ledgers.filter(l => l.group === 'Sundry Creditors' || l.group === 'Sundry Debtors').map(l => (
              <option key={l.id} value={l.id}>{l.name} ({l.group})</option>
            ))}
          </select>
        </div>
      </div>

      {/* ROW 3: Field Staff Name | Staff Contact | Email | CC | BCC */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1.2fr 1.5fr 1fr 1fr', gap: MODAL_GAP }}>
        {([
          { field: 'field_staff_name', label: 'Field Staff Name' },
          { field: 'field_staff_contact', label: 'Staff Contact' },
          { field: 'email', label: 'Email ID', type: 'email' },
          { field: 'cc', label: 'CC' },
          { field: 'bcc', label: 'BCC' },
        ] as { field: string; label: string; type?: string }[]).map(({ field, label, type }) => (
          <Input key={field} disabled={modalMode === 'view'} variant="compact" label={label} type={type || 'text'} value={(formData as any)[field] || ''} onChange={e => setFormData({ ...formData, [field]: e.target.value })} />
        ))}
      </div>

      {/* ROW 4: Website | Contact Number | Address */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1.2fr 3fr', gap: MODAL_GAP }}>
        <Input disabled={modalMode === 'view'} variant="compact" label="Website" value={formData.website || ''} onChange={e => setFormData({ ...formData, website: e.target.value })} />
        <Input disabled={modalMode === 'view'} variant="compact" label="Contact Number" value={formData.contact_number || ''} onChange={e => setFormData({ ...formData, contact_number: e.target.value })} />
        <Input disabled={modalMode === 'view'} variant="compact" label="Address" value={formData.address || ''} onChange={e => setFormData({ ...formData, address: e.target.value })} />
      </div>
    </div>
  )
}
