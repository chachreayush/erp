import React, { useState } from 'react'
import { Card, CardHeader, CardTitle } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { X, Building2, User, Key } from 'lucide-react'
import { apiRegisterOrganization } from '../../lib/api'

interface RegisterClientModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function RegisterClientModal({ isOpen, onClose, onSuccess }: RegisterClientModalProps) {
  const [formData, setFormData] = useState({
    org_name: '',
    org_code: '',
    admin_name: '',
    admin_username: '',
    admin_password: ''
  })
  
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'org_code' ? value.toUpperCase().replace(/\s+/g, '-') : value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    
    if (formData.admin_password.length < 6) {
      setError('Admin password must be at least 6 characters.')
      setIsLoading(false)
      return
    }

    try {
      const payload = {
        org_name: formData.org_name.trim(),
        org_code: formData.org_code.trim().toUpperCase(),
        admin_name: formData.admin_name.trim(),
        admin_username: formData.admin_username.trim(),
        admin_password: formData.admin_password
      }
      await apiRegisterOrganization(payload)
      onSuccess() // Close modal and refresh list
      setFormData({
        org_name: '',
        org_code: '',
        admin_name: '',
        admin_username: '',
        admin_password: ''
      })
    } catch (err: any) {
      console.error(err)
      let errorMessage = 'Failed to register client'
      const detail = err.response?.data?.detail
      
      if (err.code === 'ECONNABORTED' || err.message?.toLowerCase().includes('timeout')) {
        errorMessage = 'The cloud server took longer than expected to respond (cloud instance waking up from sleep). Please click "Register Client" once more to complete registration.'
      } else if (typeof detail === 'string') {
        errorMessage = detail
      } else if (Array.isArray(detail)) {
        // Handle Pydantic validation error array
        errorMessage = detail.map((d: any) => `${d.loc?.at(-1)}: ${d.msg}`).join(', ')
      } else if (err.message) {
        errorMessage = err.message
      }
      
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.6)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
      animation: 'fadeIn 0.2s ease-out'
    }}>
      <Card padding="lg" style={{ width: '100%', maxWidth: '500px', position: 'relative' }}>
        <button 
          onClick={onClose}
          style={{
            position: 'absolute', top: '16px', right: '16px',
            background: 'none', border: 'none', color: 'var(--color-text-muted)',
            cursor: 'pointer', padding: '4px'
          }}
        >
          <X size={20} />
        </button>

        <CardHeader style={{ marginBottom: '24px' }}>
          <CardTitle>Register New Client ERP</CardTitle>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '14px', marginTop: '4px' }}>
            Creates a new isolated database schema and Client Admin account.
          </p>
        </CardHeader>

        {error && (
          <div style={{
            padding: '12px', marginBottom: '20px', borderRadius: 'var(--radius-md)',
            backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-danger)', fontSize: '14px',
            lineHeight: 1.4
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600 }}>Organization Name</label>
            <div style={{ position: 'relative' }}>
              <Building2 size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
              <input 
                name="org_name"
                value={formData.org_name}
                onChange={handleChange}
                required
                placeholder="e.g. Delta Logistics"
                style={{
                  width: '100%', padding: '10px 12px 10px 36px',
                  backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)', color: 'var(--color-text)'
                }}
              />
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600 }}>Organization Code</label>
              <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Auto-capitalized (e.g. KSK-HDA)</span>
            </div>
            <input 
              name="org_code"
              value={formData.org_code}
              onChange={handleChange}
              required
              placeholder="e.g. DELTA-2026"
              style={{
                width: '100%', padding: '10px 12px',
                backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)', color: 'var(--color-text)',
                textTransform: 'uppercase', letterSpacing: '0.5px'
              }}
            />
          </div>

          <div style={{ height: '1px', backgroundColor: 'var(--color-border)', margin: '8px 0' }} />

          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600 }}>Admin Name</label>
            <div style={{ position: 'relative' }}>
              <User size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
              <input 
                name="admin_name"
                value={formData.admin_name}
                onChange={handleChange}
                required
                placeholder="e.g. John Doe"
                style={{
                  width: '100%', padding: '10px 12px 10px 36px',
                  backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)', color: 'var(--color-text)'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600 }}>Admin Username</label>
              <input 
                name="admin_username"
                value={formData.admin_username}
                onChange={handleChange}
                required
                placeholder="john.admin"
                style={{
                  width: '100%', padding: '10px 12px',
                  backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)', color: 'var(--color-text)'
                }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600 }}>Admin Password</label>
                <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Min 6 chars</span>
              </div>
              <div style={{ position: 'relative' }}>
                <Key size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                <input 
                  type="password"
                  name="admin_password"
                  value={formData.admin_password}
                  onChange={handleChange}
                  required
                  minLength={6}
                  placeholder="••••••••"
                  style={{
                    width: '100%', padding: '10px 12px 10px 36px',
                    backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)', color: 'var(--color-text)'
                  }}
                />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="primary" isLoading={isLoading}>Register Client</Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
