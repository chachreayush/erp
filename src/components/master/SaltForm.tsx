import React from 'react'
import { Input, MODAL_GAP } from '../ui/Input'

interface SaltFormProps {
  formData: any
  setFormData: (data: any) => void
  modalMode: 'create' | 'edit' | 'view'
  firstInputRef?: React.RefObject<HTMLInputElement | HTMLSelectElement>
}

export function SaltForm({ formData, setFormData, modalMode, firstInputRef }: SaltFormProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: MODAL_GAP }}>
      <Input ref={firstInputRef} disabled={modalMode === 'view'} variant="compact" label="Pharmaceutical Salt Formula *" required value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Paracetamol + Caffeine" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: MODAL_GAP }}>
        <Input disabled={modalMode === 'view'} variant="compact" label="Indications" value={formData.indications || ''} onChange={e => setFormData({ ...formData, indications: e.target.value })} placeholder="e.g. Fever" />
        <Input disabled={modalMode === 'view'} variant="compact" label="Dosage" value={formData.dosage || ''} onChange={e => setFormData({ ...formData, dosage: e.target.value })} placeholder="e.g. 500mg BID" />
        <Input disabled={modalMode === 'view'} variant="compact" label="Labels (e.g. Sch H)" value={formData.labels || ''} onChange={e => setFormData({ ...formData, labels: e.target.value })} placeholder="e.g. Normal" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: MODAL_GAP }}>
        <Input disabled={modalMode === 'view'} variant="compact" label="Side Effects" value={formData.sideEffects || ''} onChange={e => setFormData({ ...formData, sideEffects: e.target.value })} placeholder="e.g. Nausea, Dizziness" />
        <Input disabled={modalMode === 'view'} variant="compact" label="Special Precautions" value={formData.precautions || ''} onChange={e => setFormData({ ...formData, precautions: e.target.value })} placeholder="e.g. Avoid alcohol" />
      </div>
    </div>
  )
}
