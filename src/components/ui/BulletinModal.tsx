import React, { useState, useEffect } from 'react'
import { Modal } from './Modal'
import { Button } from './Button'
import { Input } from './Input'
import { api, apiGetOrganizations } from '../../lib/api'
import { useAuthStore } from '../../store/authStore'

interface BulletinModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  editingBulletin?: any
}

export default function BulletinModal({ isOpen, onClose, onSuccess, editingBulletin }: BulletinModalProps) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [priority, setPriority] = useState<'general' | 'important'>('general')
  const [broadcastTarget, setBroadcastTarget] = useState<string>('internal')
  const [companies, setCompanies] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const user = useAuthStore(state => state.user)
  const isAmAdmin = user?.role === 'am_admin'

  useEffect(() => {
    if (isAmAdmin) {
      apiGetOrganizations().then(orgs => setCompanies(orgs)).catch(() => {})
    }
  }, [isAmAdmin])

  useEffect(() => {
    if (editingBulletin) {
      setTitle(editingBulletin.title)
      setContent(editingBulletin.content)
      setPriority(editingBulletin.priority)
      if (editingBulletin.is_global) {
        setBroadcastTarget('global')
      } else if (user && editingBulletin.organization_id !== user.companyId) {
        setBroadcastTarget(editingBulletin.organization_id)
      } else {
        setBroadcastTarget('internal')
      }
    } else {
      setTitle('')
      setContent('')
      setPriority('general')
      setBroadcastTarget('internal')
    }
    setError(null)
  }, [editingBulletin, isOpen, user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const payload: any = { title, content, priority }
      if (isAmAdmin) {
        payload.is_global = broadcastTarget === 'global'
        if (broadcastTarget !== 'global' && broadcastTarget !== 'internal') {
          payload.target_org_id = broadcastTarget
        }
      }
      
      if (editingBulletin) {
        await api.bulletins.update(editingBulletin.id, payload)
      } else {
        await api.bulletins.create(payload)
      }
      onSuccess()
    } catch (err: any) {
      if (err.response?.status === 401) {
        setError('Your session has expired. You will be redirected to log in again.');
      } else {
        const msg = err.response?.data?.detail;
        setError(typeof msg === 'string' ? msg : 'An error occurred while saving the bulletin.');
      }
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!editingBulletin || !window.confirm('Are you sure you want to delete this bulletin?')) return
    setLoading(true)
    try {
      await api.bulletins.delete(editingBulletin.id)
      onSuccess()
    } catch (err: any) {
      setError('Failed to delete bulletin.')
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editingBulletin ? 'Edit Bulletin' : 'Post New Bulletin'}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        {error && (
          <div style={{ padding: '12px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-danger)', borderRadius: '6px', fontSize: '14px' }}>
            {error}
          </div>
        )}

        <Input
          label="Bulletin Title"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., Office closed for holidays"
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text)' }}>Content</label>
          <textarea
            required
            value={content}
            onChange={(e) => setContent(e.target.value)}
            style={{ 
              padding: '10px 12px', 
              borderRadius: '8px', 
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-bg-secondary)',
              color: 'var(--color-text)',
              minHeight: '120px',
              fontFamily: 'inherit',
              resize: 'vertical'
            }}
            placeholder="Write the announcement details here..."
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text)' }}>Priority</label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as 'general' | 'important')}
            style={{ 
              padding: '10px 12px', 
              borderRadius: '8px', 
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-bg-secondary)',
              color: 'var(--color-text)'
            }}
          >
            <option value="general">General Notice (Blue)</option>
            <option value="important">Important / Urgent (Red)</option>
          </select>
        </div>

        {isAmAdmin && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text)' }}>Broadcast Target</label>
            <select
              value={broadcastTarget}
              onChange={(e) => setBroadcastTarget(e.target.value)}
              style={{ 
                padding: '10px 12px', 
                borderRadius: '8px', 
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-bg-secondary)',
                color: 'var(--color-text)'
              }}
            >
              <option value="internal">Internal (My Company Only)</option>
              <option value="global">Global (All Client Companies)</option>
              {companies.map(c => (
                <option key={c.id} value={c.id}>Specific Client: {c.name}</option>
              ))}
            </select>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px' }}>
          {editingBulletin ? (
            <Button type="button" variant="secondary" style={{ color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }} onClick={handleDelete} disabled={loading}>
              Delete
            </Button>
          ) : <div></div>}
          
          <div style={{ display: 'flex', gap: '12px' }}>
            <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Bulletin'}
            </Button>
          </div>
        </div>

      </form>
    </Modal>
  )
}
