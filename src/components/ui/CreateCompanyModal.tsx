import React, { useState } from 'react'
import { Modal } from './Modal'
import { Input } from './Input'
import { Button } from './Button'

interface CreateCompanyModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (companyData: any) => void
}

export const CreateCompanyModal: React.FC<CreateCompanyModalProps> = ({ isOpen, onClose, onSave }) => {
  const [company, setCompany] = useState({
    name: '',
    contact_person: '',
    phone: '',
    email: '',
    address: '',
    gstin: '',
  })

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
    onSave(company)
    // Reset form after saving
    setCompany({ name: '', contact_person: '', phone: '', email: '', address: '', gstin: '' })
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Company">
      <form onSubmit={handleSubmit} onKeyDown={handleKeyDown}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <Input 
            variant="dense" 
            label="Company Name" 
            autoFocus 
            required
            value={company.name} 
            onChange={e => setCompany({ ...company, name: e.target.value })} 
          />
          <Input 
            variant="dense" 
            label="Contact Person" 
            value={company.contact_person} 
            onChange={e => setCompany({ ...company, contact_person: e.target.value })} 
          />
          <Input 
            variant="dense" 
            label="Phone Number" 
            type="tel"
            value={company.phone} 
            onChange={e => setCompany({ ...company, phone: e.target.value })} 
          />
          <Input 
            variant="dense" 
            label="Email" 
            type="email"
            value={company.email} 
            onChange={e => setCompany({ ...company, email: e.target.value })} 
          />
          <Input 
            variant="dense" 
            label="GSTIN" 
            value={company.gstin} 
            onChange={e => setCompany({ ...company, gstin: e.target.value })} 
          />
          <Input 
            variant="dense" 
            label="Address" 
            value={company.address} 
            onChange={e => setCompany({ ...company, address: e.target.value })} 
          />
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary">Save Company</Button>
        </div>
      </form>
    </Modal>
  )
}
