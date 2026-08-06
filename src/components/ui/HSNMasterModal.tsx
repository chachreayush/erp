import React, { useState, useEffect } from 'react'
import { Modal } from './Modal'
import { Button } from './Button'
import { HSNForm } from '../master/HSNForm'
import { apiCreateHSNCode, apiUpdateHSNCode } from '../../lib/api'

interface HSNMasterModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (hsnData: any) => void
  initialData?: any // Pass if editing (F3)
}

export const HSNMasterModal: React.FC<HSNMasterModalProps> = ({ isOpen, onClose, onSave, initialData }) => {
  const [formData, setFormData] = useState<any>({})
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData(initialData)
      } else {
        setFormData({
          type: 'Goods',
          igst: 0,
          cgst: 0,
          sgst: 0
        })
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
        code: formData.code,
        description: formData.description || null,
        igst: formData.igst || 0,
        cgst: formData.cgst || 0,
        sgst: formData.sgst || 0,
        type: formData.type || 'Goods'
      }

      let savedData
      if (initialData?.id) {
        savedData = await apiUpdateHSNCode(initialData.id, payload)
      } else {
        savedData = await apiCreateHSNCode(payload)
      }
      onSave(savedData)
      onClose()
    } catch (err) {
      console.error("Failed to save HSN:", err)
      alert("Failed to save HSN. Check console for details.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={initialData?.id ? "Modify HSN & Tax Master" : "Add New HSN & Tax Master"}
      maxWidth="600px"
    >
      <form onSubmit={handleSubmit} onKeyDown={handleKeyDown}>
        <div style={{ padding: '8px 0' }}>
          <HSNForm 
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
