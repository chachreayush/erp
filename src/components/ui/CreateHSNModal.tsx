import React, { useState } from 'react'
import { Modal } from './Modal'
import { Input } from './Input'
import { Button } from './Button'

interface CreateHSNModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (hsnData: any) => void
}

export const CreateHSNModal: React.FC<CreateHSNModalProps> = ({ isOpen, onClose, onSave }) => {
  const [hsn, setHsn] = useState({
    code: '',
    description: '',
    cgst: 0,
    sgst: 0,
    igst: 0,
  })

  // Handle GST auto-calculation logic
  const handleGstChange = (type: 'cgst' | 'sgst' | 'igst', value: string) => {
    const numValue = Number(value) || 0
    if (type === 'cgst') {
      setHsn({ ...hsn, cgst: numValue, sgst: numValue, igst: numValue * 2 })
    } else if (type === 'sgst') {
      setHsn({ ...hsn, cgst: numValue, sgst: numValue, igst: numValue * 2 })
    } else if (type === 'igst') {
      setHsn({ ...hsn, cgst: numValue / 2, sgst: numValue / 2, igst: numValue })
    }
  }

  // Basic Enter-key navigation inside the modal
  const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      const form = e.currentTarget
      const focusable = Array.from(form.querySelectorAll('input, select')) as HTMLElement[]
      const target = e.target as HTMLElement
      const currentIndex = focusable.indexOf(target)
      if (currentIndex > -1 && currentIndex < focusable.length - 1) {
        focusable[currentIndex + 1].focus()
      }
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(hsn)
    // Reset form after saving
    setHsn({ code: '', description: '', cgst: 0, sgst: 0, igst: 0 })
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New HSN">
      <form onSubmit={handleSubmit} onKeyDown={handleKeyDown}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <Input 
            variant="dense" 
            label="HSN Code" 
            autoFocus 
            required
            value={hsn.code} 
            onChange={e => setHsn({ ...hsn, code: e.target.value })} 
          />
          <Input 
            variant="dense" 
            label="Description" 
            value={hsn.description} 
            onChange={e => setHsn({ ...hsn, description: e.target.value })} 
          />
          <Input 
            variant="dense" 
            label="CGST (%)" 
            type="number"
            step="0.01"
            value={hsn.cgst} 
            onChange={e => handleGstChange('cgst', e.target.value)} 
          />
          <Input 
            variant="dense" 
            label="SGST (%)" 
            type="number"
            step="0.01"
            value={hsn.sgst} 
            onChange={e => handleGstChange('sgst', e.target.value)} 
          />
          <Input 
            variant="dense" 
            label="IGST (%)" 
            type="number"
            step="0.01"
            value={hsn.igst} 
            onChange={e => handleGstChange('igst', e.target.value)} 
          />
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary">Save HSN</Button>
        </div>
      </form>
    </Modal>
  )
}
