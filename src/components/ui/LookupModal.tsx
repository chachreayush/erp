import React, { useState, useMemo } from 'react'
import { Modal } from './Modal'
import { Input } from './Input'
import { Button } from './Button'
import { Search, Plus } from 'lucide-react'

interface LookupItem {
  id: string
  label: string
  // Optional secondary text to display (e.g. HSN rates)
  description?: string
  // Any generic data payload
  data?: any
}

interface LookupModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  items: LookupItem[]
  onSelect: (item: LookupItem) => void
  onCreateNew?: () => void
  createNewText?: string
}

export const LookupModal: React.FC<LookupModalProps> = ({
  isOpen,
  onClose,
  title,
  items,
  onSelect,
  onCreateNew,
  createNewText = "Create New"
}) => {
  const [search, setSearch] = useState('')

  const filteredItems = useMemo(() => {
    if (!search) return items
    return items.filter(item => 
      item.label.toLowerCase().includes(search.toLowerCase()) || 
      (item.description && item.description.toLowerCase().includes(search.toLowerCase()))
    )
  }, [items, search])

  // Reset search on close
  React.useEffect(() => {
    if (!isOpen) setSearch('')
  }, [isOpen])

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="500px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '400px' }}>
        
        <div style={{ display: 'flex', gap: '8px' }}>
          <div style={{ flex: 1 }}>
            <Input 
              leftIcon={<Search size={16} />}
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>
          {onCreateNew && (
            <Button variant="primary" leftIcon={<Plus size={16} />} onClick={onCreateNew}>
              {createNewText}
            </Button>
          )}
        </div>

        <div style={{ 
          flex: 1, 
          overflowY: 'auto', 
          border: '1px solid var(--color-border)', 
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'var(--color-bg-surface)'
        }}>
          {filteredItems.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
              No results found.
            </div>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {filteredItems.map(item => (
                <li 
                  key={item.id}
                  onClick={() => onSelect(item)}
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--color-border)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{item.label}</span>
                  {item.description && (
                    <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>{item.description}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  )
}
