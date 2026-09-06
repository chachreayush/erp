import { useEffect, useState } from 'react'
import { apiGetLedgerGroups, LedgerGroup } from '../../lib/api'
import apiClient from '../../lib/api'
import { useNavigate } from 'react-router-dom'
import { useReturnNavigation } from '../../hooks/useReturnNavigation'

export default function LedgerGroupMaster() {
  const [groups, setGroups] = useState<LedgerGroup[]>([])
  const [name, setName] = useState('')
  const [parentId, setParentId] = useState('')
  const navigate = useNavigate()

  useReturnNavigation(false, {
    isDirty: Boolean(name || parentId)
  })

  useEffect(() => {
    fetchGroups()
  }, [])

  const fetchGroups = async () => {
    const data = await apiGetLedgerGroups()
    setGroups(data)
  }

  const handleSave = async () => {
    if (!name) return
    try {
      await apiClient.post('/api/finance/groups', {
        name,
        parent_id: parentId || null,
        is_active: true
      })
      setName('')
      setParentId('')
      fetchGroups()
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div style={{ padding: '20px', backgroundColor: '#020617', minHeight: '100vh', color: '#f8fafc', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ color: '#38bdf8', margin: 0 }}>Ledger Groups (Account Heads)</h2>
        <button
          onClick={() => navigate('/')}
          style={{
            padding: '6px 12px',
            backgroundColor: '#1e293b',
            color: '#f8fafc',
            border: '1px solid #334155',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <span style={{ backgroundColor: '#334155', padding: '1px 5px', borderRadius: '3px', fontSize: '10px' }}>ESC</span>
          <span>Exit</span>
        </button>
      </div>
      
      <div style={{ backgroundColor: '#0f172a', padding: '20px', borderRadius: '8px', border: '1px solid #1e293b', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Group Name</label>
            <input 
              value={name} onChange={e => setName(e.target.value)}
              style={{ width: '100%', padding: '8px', backgroundColor: '#020617', border: '1px solid #334155', color: '#fff', borderRadius: '4px' }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Parent Group (Optional)</label>
            <select 
              value={parentId} onChange={e => setParentId(e.target.value)}
              style={{ width: '100%', padding: '8px', backgroundColor: '#020617', border: '1px solid #334155', color: '#fff', borderRadius: '4px' }}
            >
              <option value="">-- Root Level --</option>
              {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
          <button onClick={handleSave} style={{ padding: '8px 24px', backgroundColor: '#38bdf8', color: '#0f172a', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', height: '35px' }}>
            Save Group
          </button>
        </div>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
        <thead>
          <tr style={{ backgroundColor: '#1e293b', textAlign: 'left' }}>
            <th style={{ padding: '12px', color: '#94a3b8' }}>Group Name</th>
            <th style={{ padding: '12px', color: '#94a3b8' }}>Parent Group</th>
          </tr>
        </thead>
        <tbody>
          {groups.map(g => (
            <tr key={g.id} style={{ borderBottom: '1px solid #1e293b' }}>
              <td style={{ padding: '12px' }}>{g.name}</td>
              <td style={{ padding: '12px', color: '#64748b' }}>
                {g.parent_id ? groups.find(p => p.id === g.parent_id)?.name : '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
