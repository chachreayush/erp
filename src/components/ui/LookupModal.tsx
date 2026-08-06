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
  onModify?: (item: LookupItem) => void
  createNewText?: string
}

export const LookupModal: React.FC<LookupModalProps> = ({
  isOpen,
  onClose,
  title,
  items,
  onSelect,
  onCreateNew,
  onModify,
  createNewText = "Create New"
}) => {
  const [search, setSearch] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)

  const filteredItems = useMemo(() => {
    if (!search) return items
    return items.filter(item => 
      item.label.toLowerCase().includes(search.toLowerCase()) || 
      (item.description && item.description.toLowerCase().includes(search.toLowerCase()))
    )
  }, [items, search])

  // Reset search and selection on close
  React.useEffect(() => {
    if (!isOpen) {
      setSearch('')
      setSelectedIndex(0)
    }
  }, [isOpen])

  // Reset selection when search changes
  React.useEffect(() => {
    setSelectedIndex(0)
  }, [search])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => Math.min(prev + 1, filteredItems.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter' && filteredItems.length > 0) {
      e.preventDefault()
      onSelect(filteredItems[selectedIndex])
    } else if (e.key === 'F2') {
      e.preventDefault()
      if (onCreateNew) onCreateNew()
    } else if (e.key === 'F3') {
      e.preventDefault()
      if (onModify && filteredItems.length > 0) {
        onModify(filteredItems[selectedIndex])
      }
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="500px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '400px' }} onKeyDown={handleKeyDown}>
        
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
              {filteredItems.map((item, index) => (
                <li 
                  key={item.id}
                  onClick={() => onSelect(item)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--color-border)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    backgroundColor: index === selectedIndex ? 'var(--color-bg-hover)' : 'transparent'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{item.label}</span>
                    {index === selectedIndex && (
                      <div style={{ display: 'flex', gap: '8px', fontSize: '11px', color: 'var(--color-text-muted)' }}>
                        {onCreateNew && <span>[F2] New</span>}
                        {onModify && <span>[F3] Edit</span>}
                        <span>[Enter] Select</span>
                      </div>
                    )}
                  </div>
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
