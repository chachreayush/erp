import { useEffect, useState } from 'react'
import { useAuthStore } from '../../store/authStore'
import { api } from '../../lib/api'
import { AlertCircle, Megaphone, Plus } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import BulletinModal from '../../components/ui/BulletinModal'
import { useReturnNavigation } from '../../hooks/useReturnNavigation'

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

  useReturnNavigation(isModalOpen);

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

  // Common card style generator
  const getCardStyle = (isImportant: boolean) => ({
    backgroundColor: '#0f172a',
    border: `1px solid ${isImportant ? 'rgba(239,68,68,0.3)' : '#1e293b'}`,
    borderRadius: '12px',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
    transition: 'all 0.25s ease',
    cursor: canEdit ? 'pointer' : 'default',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  })

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', animation: 'fadeIn 0.3s ease-in-out' }}>
      
      {/* ── PAGE HEADER ─────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800, marginBottom: '6px', color: '#e2e8f0' }}>
            Bulletin Board
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '15px', fontWeight: 500, margin: 0 }}>
            Company-wide announcements and important notices.
          </p>
        </div>
        
        {canEdit && (
          <Button variant="primary" onClick={handleCreate} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={18} />
            Post New Bulletin
          </Button>
        )}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px', color: '#94a3b8' }}>
          Loading bulletins...
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
          
          {/* ── IMPORTANT SECTION ───────────────────────────── */}
          <section>
            <h2 style={{ 
              fontSize: '18px', fontWeight: 700, marginBottom: '20px', 
              display: 'flex', alignItems: 'center', gap: '10px', color: '#ef4444',
              borderBottom: '1px solid #1e293b', paddingBottom: '12px'
            }}>
              <AlertCircle size={22} />
              Important Announcements
            </h2>
            
            {importantBulletins.length === 0 ? (
              <p style={{ color: '#64748b', fontSize: '14px', fontStyle: 'italic' }}>No important announcements right now.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
                {importantBulletins.map(b => (
                  <div 
                    key={b.id} 
                    style={getCardStyle(true)}
                    onMouseEnter={e => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 12px 20px -8px rgba(239,68,68,0.2)';
                      e.currentTarget.style.borderColor = 'rgba(239,68,68,0.5)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
                      e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)';
                    }}
                    onClick={() => canEdit && handleEdit(b)}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                      <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#f87171', lineHeight: 1.4 }}>
                        {b.title}
                      </h3>
                      {canEdit && (
                        <div style={{ fontSize: '11px', fontWeight: 600, color: '#ef4444', backgroundColor: 'rgba(239,68,68,0.1)', padding: '2px 8px', borderRadius: '4px' }}>
                          Edit
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>
                      By {b.author_name} • {new Date(b.created_at).toLocaleDateString()}
                    </div>
                    <div style={{ fontSize: '14px', color: '#cbd5e1', whiteSpace: 'pre-wrap', marginTop: '4px', lineHeight: 1.6 }}>
                      {b.content}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ── GENERAL SECTION ────────────────────────────── */}
          <section>
            <h2 style={{ 
              fontSize: '18px', fontWeight: 700, marginBottom: '20px', 
              display: 'flex', alignItems: 'center', gap: '10px', color: '#3b82f6',
              borderBottom: '1px solid #1e293b', paddingBottom: '12px'
            }}>
              <Megaphone size={22} />
              General Notices
            </h2>
            
            {generalBulletins.length === 0 ? (
              <p style={{ color: '#64748b', fontSize: '14px', fontStyle: 'italic' }}>No general notices.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
                {generalBulletins.map(b => (
                  <div 
                    key={b.id} 
                    style={getCardStyle(false)}
                    onMouseEnter={e => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 12px 20px -8px rgba(59,130,246,0.15)';
                      e.currentTarget.style.borderColor = '#3b82f6';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
                      e.currentTarget.style.borderColor = '#1e293b';
                    }}
                    onClick={() => canEdit && handleEdit(b)}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                      <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#e2e8f0', lineHeight: 1.4 }}>
                        {b.title}
                      </h3>
                      {canEdit && (
                        <div style={{ fontSize: '11px', fontWeight: 600, color: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.1)', padding: '2px 8px', borderRadius: '4px' }}>
                          Edit
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>
                      By {b.author_name} • {new Date(b.created_at).toLocaleDateString()}
                    </div>
                    <div style={{ fontSize: '14px', color: '#94a3b8', whiteSpace: 'pre-wrap', marginTop: '4px', lineHeight: 1.6 }}>
                      {b.content}
                    </div>
                  </div>
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
