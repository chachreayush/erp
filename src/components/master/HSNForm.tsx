import React from 'react'
import { Input, MODAL_FIELD, MODAL_LABEL, MODAL_GAP } from '../ui/Input'

interface HSNFormProps {
  formData: any
  setFormData: (data: any) => void
  modalMode: 'create' | 'edit' | 'view'
  firstInputRef?: React.RefObject<HTMLInputElement | HTMLSelectElement>
}

export function HSNForm({ formData, setFormData, modalMode, firstInputRef }: HSNFormProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: MODAL_GAP }}>
      <Input ref={firstInputRef} disabled={modalMode === 'view'} variant="compact" label="HSN / SAC Code *" required value={formData.code || ''} onChange={e => setFormData({ ...formData, code: e.target.value })} placeholder="e.g. 3004" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: MODAL_GAP }}>
        <div>
          <label style={MODAL_LABEL}>Type</label>
          <select disabled={modalMode === 'view'} value={formData.type || 'Goods'} onChange={e => setFormData({ ...formData, type: e.target.value })} style={MODAL_FIELD}>
            <option value="Goods">Goods</option>
            <option value="Service">Service</option>
          </select>
        </div>
        <Input disabled={modalMode === 'view'} variant="compact" label="CGST (%)" type="number" step="0.01" value={formData.cgst ?? 0} onChange={e => {
          const v = Number(e.target.value);
          setFormData({ ...formData, cgst: v, sgst: v, igst: v * 2 });
        }} />
        <Input disabled={modalMode === 'view'} variant="compact" label="SGST (%)" type="number" step="0.01" value={formData.sgst ?? 0} onChange={e => {
          const v = Number(e.target.value);
          setFormData({ ...formData, cgst: v, sgst: v, igst: v * 2 });
        }} />
        <Input disabled={modalMode === 'view'} variant="compact" label="IGST Tax Rate (%) *" type="number" step="0.01" value={formData.igst ?? 0} onChange={e => {
          const v = Number(e.target.value);
          setFormData({ ...formData, cgst: v / 2, sgst: v / 2, igst: v });
        }} />
      </div>
      <Input disabled={modalMode === 'view'} variant="compact" label="Commodity Description" value={formData.description || ''} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="e.g. Medicaments consisting of mixed products" />
    </div>
  )
}
