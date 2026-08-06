import React, { useState, useEffect } from 'react'
import { Modal } from './Modal'
import { Button } from './Button'
import { SaltForm } from '../master/SaltForm'
import { apiCreateSalt, apiUpdateSalt } from '../../lib/api'

interface SaltMasterModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (saltData: any) => void
  initialData?: any // Pass if editing (F3)
}

export const SaltMasterModal: React.FC<SaltMasterModalProps> = ({ isOpen, onClose, onSave, initialData }) => {
  const [formData, setFormData] = useState<any>({})
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData(initialData)
      } else {
        setFormData({})
      }
    }
  }, [isOpen, initialData])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === 'Enter') {
      const form = e.currentTarget
      const focusable = Array.from(form.querySelectorAll('input:not([disabled]), select:not([disabled])')) as HTMLElement[]
      const target = e.target as HTMLElement
      const currentIndex = focusable.indexOf(target)
      if (currentIndex > -1 && currentIndex < focusable.length - 1) {
        e.preventDefault()
        focusable[currentIndex + 1].focus()
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      const payload = {
        formula: formData.name, // The backend field is formula
        indications: formData.indications || null,
        dosage: formData.dosage || null,
        side_effects: formData.sideEffects || null,
        precautions: formData.precautions || null,
        labels: formData.labels || null
      }

      let savedData
      if (initialData?.id) {
        savedData = await apiUpdateSalt(initialData.id, payload)
      } else {
        savedData = await apiCreateSalt(payload)
      }
      onSave(savedData)
      onClose()
    } catch (err) {
      console.error("Failed to save Salt:", err)
      alert("Failed to save Salt. Check console for details.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={initialData?.id ? "Modify Pharmaceutical Salt" : "Add New Pharmaceutical Salt"}
      maxWidth="600px"
    >
      <form onSubmit={handleSubmit} onKeyDown={handleKeyDown}>
        <div style={{ padding: '8px 0' }}>
          <SaltForm 
            formData={formData} 
            setFormData={setFormData} 
            modalMode={initialData?.id ? 'edit' : 'create'} 
          />
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={isSaving}>
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
