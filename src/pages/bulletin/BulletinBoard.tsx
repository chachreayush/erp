import React, { useEffect, useState } from 'react'
import { useAuthStore } from '../../store/authStore'
import { api } from '../../lib/api'
import { AlertCircle, Megaphone, Plus } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card'
import BulletinModal from '../../components/ui/BulletinModal'

export interface Bulletin {
  id: string
  company_id: string
  author_id: string
  title: string
  content: string
  priority: 'important' | 'general'
  created_at: string
  updated_at: string
  author_name: string
}

export default function BulletinBoard() {
  const user = useAuthStore(state => state.user)
  const [bulletins, setBulletins] = useState<Bulletin[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingBulletin, setEditingBulletin] = useState<Bulletin | null>(null)

  const canEdit = user?.role === 'am_admin' || user?.role === 'cm_admin'

  const fetchBulletins = async () => {
    setLoading(true)
    try {
      const res = await api.bulletins.getAll()
      setBulletins(res.data)
    } catch (err) {
      console.error('Failed to fetch bulletins', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBulletins()
  }, [])

  const handleCreate = () => {
    setEditingBulletin(null)
    setIsModalOpen(true)
  }

  const handleEdit = (bulletin: Bulletin) => {
    setEditingBulletin(bulletin)
    setIsModalOpen(true)
  }

  const importantBulletins = bulletins.filter(b => b.priority === 'important')
  const generalBulletins = bulletins.filter(b => b.priority === 'general')

  return (
    <div style={{ maxWidth: '1200px', animation: 'fadeIn 0.3s ease-in-out' }}>
      
      {/* ── PAGE HEADER ─────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800, marginBottom: '6px', color: 'var(--color-text)' }}>
            Bulletin Board
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '15px', fontWeight: 500 }}>
            Company-wide announcements and important notices.
          </p>
        </div>
        
        {canEdit && (
          <Button onClick={handleCreate} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={18} />
            Post New Bulletin
          </Button>
        )}
      </div>

      {loading ? (
        <p>Loading bulletins...</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
          {/* ── IMPORTANT SECTION ───────────────────────────── */}
          <section>
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-danger)' }}>
              <AlertCircle size={20} />
              Important Announcements
            </h2>
            
            {importantBulletins.length === 0 ? (
              <p style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>No important announcements right now.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                {importantBulletins.map(b => (
                  <Card key={b.id} style={{ borderLeft: '4px solid var(--color-danger)' }}>
                    <CardHeader style={{ paddingBottom: '12px' }}>
                      <CardTitle style={{ fontSize: '16px', lineHeight: 1.4 }}>{b.title}</CardTitle>
                      <CardDescription>By {b.author_name} • {new Date(b.created_at).toLocaleDateString()}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', whiteSpace: 'pre-wrap' }}>{b.content}</p>
                      {canEdit && (
                        <div style={{ marginTop: '16px', textAlign: 'right' }}>
                          <Button variant="secondary" onClick={() => handleEdit(b)} size="sm">Edit</Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>

          {/* ── GENERAL SECTION ────────────────────────────── */}
          <section>
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-primary)' }}>
              <Megaphone size={20} />
              General Notices
            </h2>
            
            {generalBulletins.length === 0 ? (
              <p style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>No general notices.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                {generalBulletins.map(b => (
                  <Card key={b.id}>
                    <CardHeader style={{ paddingBottom: '12px' }}>
                      <CardTitle style={{ fontSize: '16px', lineHeight: 1.4 }}>{b.title}</CardTitle>
                      <CardDescription>By {b.author_name} • {new Date(b.created_at).toLocaleDateString()}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', whiteSpace: 'pre-wrap' }}>{b.content}</p>
                      {canEdit && (
                        <div style={{ marginTop: '16px', textAlign: 'right' }}>
                          <Button variant="secondary" onClick={() => handleEdit(b)} size="sm">Edit</Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>

        </div>
      )}

      {/* ── MODAL ────────────────────────────────────────── */}
      {isModalOpen && (
        <BulletinModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          onSuccess={() => { setIsModalOpen(false); fetchBulletins(); }}
          editingBulletin={editingBulletin}
        />
      )}
    </div>
  )
}
