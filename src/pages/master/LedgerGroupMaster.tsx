import { useEffect, useState } from 'react'
import { apiGetLedgerGroups, apiGetLedgers, apiCreateLedgerGroup, LedgerGroup, Ledger } from '../../lib/api'
import apiClient from '../../lib/api'
import { useNavigate } from 'react-router-dom'
import { useReturnNavigation } from '../../hooks/useReturnNavigation'
import { ChevronRight, ChevronDown, Plus, Book, FolderTree, Shield, Trash2 } from 'lucide-react'

type ClassType = 'Asset' | 'Liability' | 'Income' | 'Expense'
const ROOT_CLASSES: ClassType[] = ['Asset', 'Liability', 'Income', 'Expense']

export default function LedgerGroupMaster() {
  const [groups, setGroups] = useState<LedgerGroup[]>([])
  const [ledgers, setLedgers] = useState<Ledger[]>([])
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())
  const navigate = useNavigate()

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [name, setName] = useState('')
  const [parentId, setParentId] = useState('')
  const [classType, setClassType] = useState<ClassType>('Asset')

  useReturnNavigation(false, {
    isDirty: Boolean(name || parentId)
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [gData, lData] = await Promise.all([
        apiGetLedgerGroups(),
        apiGetLedgers()
      ])
      setGroups(gData)
      setLedgers(lData)
    } catch (e) {
      console.error(e)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name) return
    try {
      await apiClient.post('/api/finance/groups', {
        name,
        parent_id: parentId || null,
        class_type: classType,
        is_active: true
      })
      setName('')
      setParentId('')
      setClassType('Asset')
      setIsModalOpen(false)
      fetchData()
    } catch (e) {
      console.error(e)
      alert('Error saving group')
    }
  }

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (!window.confirm('Are you sure you want to delete this group?')) return
    try {
      await apiClient.delete(`/api/finance/groups/${id}`)
      fetchData()
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Cannot delete group')
    }
  }

  const toggleNode = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setExpandedNodes(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const openGroupModal = (parentGroup?: LedgerGroup) => {
    if (parentGroup) {
      setParentId(parentGroup.id)
      setClassType(parentGroup.class_type as ClassType || 'Asset')
    } else {
      setParentId('')
      setClassType('Asset')
    }
    setName('')
    setIsModalOpen(true)
  }

  const goToCreateLedger = (groupId: string) => {
    navigate(`/master?tab=ledgers&groupId=${groupId}`)
  }

  const renderTree = (parent_id: string | null = null, currentClass?: ClassType) => {
    // Filter groups by parent. If parent_id is null, filter by currentClass.
    let currentGroups = groups.filter(g => g.parent_id === parent_id)
    if (parent_id === null && currentClass) {
      currentGroups = currentGroups.filter(g => g.class_type === currentClass)
    }

    const currentLedgers = parent_id ? ledgers.filter(l => l.group_id === parent_id) : []

    if (currentGroups.length === 0 && currentLedgers.length === 0) return null

    return (
      <div style={{ marginLeft: parent_id ? '24px' : '8px', borderLeft: parent_id ? '1px solid #334155' : 'none', paddingLeft: parent_id ? '12px' : '0' }}>
        {currentGroups.map(group => {
          const isExpanded = expandedNodes.has(group.id)
          const hasChildren = groups.some(g => g.parent_id === group.id) || ledgers.some(l => l.group_id === group.id)
          
          return (
            <div key={group.id} style={{ marginBottom: '4px' }}>
              <div 
                className="tree-node group"
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  padding: '6px 8px', 
                  backgroundColor: isExpanded ? 'rgba(56, 189, 248, 0.05)' : 'transparent',
                  borderRadius: '6px',
                  cursor: hasChildren ? 'pointer' : 'default',
                  transition: 'background-color 0.2s',
                  
                }}
                onClick={(e) => hasChildren ? toggleNode(group.id, e) : undefined}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(56, 189, 248, 0.1)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = isExpanded ? 'rgba(56, 189, 248, 0.05)' : 'transparent'}
              >
                {/* Expand Icon */}
                <div style={{ width: '20px', display: 'flex', justifyContent: 'center' }}>
                  {hasChildren ? (
                    isExpanded ? <ChevronDown size={16} color="#94a3b8" /> : <ChevronRight size={16} color="#94a3b8" />
                  ) : <span style={{ width: '16px' }}></span>}
                </div>
                
                {/* Node Icon & Name */}
                <FolderTree size={16} color="#38bdf8" style={{ margin: '0 8px' }} />
                <span style={{ fontSize: '14px', fontWeight: group.is_system ? 600 : 500, color: '#e2e8f0', flex: 1 }}>
                  {group.name}
                </span>

                {/* Badges & Actions */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {group.is_system && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '2px 6px', backgroundColor: '#3f3f46', color: '#a1a1aa', borderRadius: '4px', fontSize: '10px', fontWeight: 700 }}>
                      <Shield size={10} /> SYSTEM
                    </span>
                  )}
                  
                  {/* Actions (visible on hover would be ideal, but rendering inline for simplicity/accessibility) */}
                  <div style={{ display: 'flex', gap: '4px', opacity: 0.8 }}>
                    <button 
                      onClick={(e) => { e.stopPropagation(); openGroupModal(group) }}
                      style={{ padding: '2px 6px', fontSize: '11px', backgroundColor: 'transparent', border: '1px solid #334155', color: '#94a3b8', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                      title="Add Subgroup"
                    >
                      <Plus size={12} /> Group
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); goToCreateLedger(group.id) }}
                      style={{ padding: '2px 6px', fontSize: '11px', backgroundColor: 'transparent', border: '1px solid #334155', color: '#94a3b8', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                      title="Add Ledger"
                    >
                      <Plus size={12} /> Ledger
                    </button>
                    {!group.is_system && (
                      <button 
                        onClick={(e) => handleDelete(e, group.id)}
                        style={{ padding: '2px 6px', fontSize: '11px', backgroundColor: 'transparent', border: '1px solid transparent', color: '#ef4444', borderRadius: '4px', cursor: 'pointer' }}
                        title="Delete Group"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Children */}
              {isExpanded && renderTree(group.id)}
            </div>
          )
        })}

        {/* Leaf Nodes (Ledgers) */}
        {currentLedgers.map(ledger => (
          <div 
            key={ledger.id} 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              padding: '6px 8px 6px 36px',
              fontSize: '13px',
              color: '#cbd5e1',
              borderBottom: '1px solid transparent',
              transition: 'background-color 0.2s',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <Book size={14} color="#94a3b8" style={{ marginRight: '8px' }} />
            {ledger.name}
            <span style={{ marginLeft: 'auto', fontSize: '11px', color: '#64748b' }}>
              ₹{ledger.opening_balance} {ledger.op_type}
            </span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div style={{ padding: '24px', backgroundColor: '#020617', minHeight: '100vh', color: '#f8fafc', fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', maxWidth: '1200px', margin: '0 auto 32px' }}>
        <div>
          <h2 style={{ color: '#f8fafc', margin: '0 0 8px 0', fontSize: '24px', fontWeight: 700 }}>Chart of Accounts</h2>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: '14px' }}>Hierarchical view of Account Classes, Groups, and Ledgers</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => openGroupModal()}
            style={{
              padding: '8px 16px', backgroundColor: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'
            }}
          >
            <Plus size={16} /> New Group
          </button>
          <button
            onClick={() => navigate('/')}
            style={{
              padding: '8px 16px', backgroundColor: '#1e293b', color: '#f8fafc', border: '1px solid #334155', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'
            }}
          >
            <span style={{ backgroundColor: '#334155', padding: '2px 6px', borderRadius: '4px', fontSize: '11px' }}>ESC</span>
            Exit
          </button>
        </div>
      </div>

      {/* Main Tree Container */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gap: '24px' }}>
        {ROOT_CLASSES.map(cls => (
          <div key={cls} style={{ backgroundColor: '#0f172a', borderRadius: '12px', border: '1px solid #1e293b', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', backgroundColor: '#1e293b', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center' }}>
              <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '16px', fontWeight: 700 }}>{cls}</h3>
            </div>
            <div style={{ padding: '16px 12px' }}>
              {renderTree(null, cls)}
            </div>
          </div>
        ))}
      </div>

      {/* Group Creation Modal */}
      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(4px)' }}>
          <div style={{ backgroundColor: '#0f172a', padding: '32px', borderRadius: '12px', width: '400px', border: '1px solid #1e293b', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)' }}>
            <h3 style={{ margin: '0 0 24px 0', color: '#f8fafc', fontSize: '18px' }}>
              {parentId ? 'Create Sub-Group' : 'Create Root Group'}
            </h3>
            
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '8px' }}>Account Group Name</label>
                <input 
                  autoFocus
                  value={name} 
                  onChange={e => setName(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', backgroundColor: '#020617', border: '1px solid #334155', color: '#fff', borderRadius: '6px', outline: 'none', fontSize: '14px' }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '8px' }}>Parent Group</label>
                <select 
                  value={parentId} 
                  onChange={e => {
                    setParentId(e.target.value)
                    if (e.target.value) {
                      const parent = groups.find(g => g.id === e.target.value)
                      if (parent) setClassType(parent.class_type as ClassType || 'Asset')
                    }
                  }}
                  style={{ width: '100%', padding: '10px 12px', backgroundColor: '#020617', border: '1px solid #334155', color: '#fff', borderRadius: '6px', outline: 'none', fontSize: '14px' }}
                >
                  <option value="">-- None (Root Level) --</option>
                  {groups.map(g => <option key={g.id} value={g.id}>{g.name} ({g.class_type})</option>)}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '8px' }}>Account Class</label>
                <select 
                  value={classType} 
                  onChange={e => setClassType(e.target.value as ClassType)}
                  disabled={Boolean(parentId)}
                  style={{ 
                    width: '100%', padding: '10px 12px', backgroundColor: parentId ? '#1e293b' : '#020617', 
                    border: '1px solid #334155', color: parentId ? '#94a3b8' : '#fff', borderRadius: '6px', outline: 'none', fontSize: '14px',
                    cursor: parentId ? 'not-allowed' : 'pointer'
                  }}
                >
                  {ROOT_CLASSES.map(cls => <option key={cls} value={cls}>{cls}</option>)}
                </select>
                {parentId && <p style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', marginBottom: 0 }}>Class is inherited from the parent group.</p>}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  style={{ padding: '10px 16px', backgroundColor: 'transparent', border: '1px solid #334155', color: '#cbd5e1', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  style={{ padding: '10px 24px', backgroundColor: '#3b82f6', border: 'none', color: '#fff', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}
                >
                  Save Group
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
