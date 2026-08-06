import React, { useState, useEffect } from 'react'
import { Modal } from './Modal'
import { Button } from './Button'
import { CompanyForm } from '../master/CompanyForm'
import { apiCreateManufacturer, apiUpdateManufacturer } from '../../lib/api'

interface CompanyMasterModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (companyData: any) => void
  initialData?: any // Pass if editing (F3)
}

export const CompanyMasterModal: React.FC<CompanyMasterModalProps> = ({ isOpen, onClose, onSave, initialData }) => {
  const [formData, setFormData] = useState<any>({})
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData(initialData)
      } else {
        setFormData({
          status: 'continue',
          prohibited: false,
          discount: 0,
          dump_days: 0,
          is_supplier: 'no'
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
      // payload matches schema
      const payload = {
        name: formData.name,
        short_code: formData.code || formData.short_code,
        default_discount: formData.discount ?? 0,
        status: formData.status || 'continue',
        prohibited: formData.prohibited === 'yes' || formData.prohibited === true,
        room_no: formData.room_no,
        floor: formData.floor,
        rack_no: formData.rack_no,
        rack_row_no: formData.rack_row_no,
        dump_days: formData.dump_days ?? 0,
        is_supplier: formData.is_supplier === 'yes' || formData.is_supplier === true,
        supplier_ledger_id: (formData.is_supplier === 'yes' || formData.is_supplier === true) ? formData.supplier_ledger_id : null,
        email: formData.email,
        cc: formData.cc,
        bcc: formData.bcc,
        website: formData.website,
        contact_number: formData.contact_number,
        field_staff_name: formData.field_staff_name,
        field_staff_contact: formData.field_staff_contact,
        address: formData.address
      }

      let savedData
      if (initialData?.id) {
        savedData = await apiUpdateManufacturer(initialData.id, payload as any)
      } else {
        savedData = await apiCreateManufacturer(payload as any)
      }
      onSave(savedData)
      onClose()
    } catch (err) {
      console.error("Failed to save manufacturer:", err)
      alert("Failed to save company. Check console for details.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={initialData?.id ? "Modify Company Master" : "Create New Company Master"}
      maxWidth="1000px" // Same as MasterPage modal
    >
      <form onSubmit={handleSubmit} onKeyDown={handleKeyDown}>
        <div style={{ padding: '8px 0' }}>
          <CompanyForm 
            formData={formData} 
            setFormData={setFormData} 
            modalMode={initialData?.id ? 'edit' : 'create'} 
          />
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Company"}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
