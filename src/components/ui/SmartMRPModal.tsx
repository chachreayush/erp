import React, { useEffect, useState } from 'react'
import { Modal } from './Modal'
import { Button } from './Button'
import { apiGetMRPSuggestions, apiApplyMRPSuggestions, MRPSuggestion } from '../../lib/api'
import { TrendingUp, Check, Loader2, AlertCircle } from 'lucide-react'

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onApplied: () => void;
}

export function SmartMRPModal({ isOpen, onClose, onApplied }: Props) {
  const [suggestions, setSuggestions] = useState<MRPSuggestion[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [isApplying, setIsApplying] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true)
      apiGetMRPSuggestions()
        .then(res => {
          setSuggestions(res.suggestions || [])
          // Auto-select all by default
          setSelectedIds(new Set((res.suggestions || []).map(s => s.product_id)))
        })
        .catch(console.error)
        .finally(() => setIsLoading(false))
    }
  }, [isOpen])

  const toggleSelectAll = () => {
    if (selectedIds.size === suggestions.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(suggestions.map(s => s.product_id)))
    }
  }

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }

  const handleApply = async () => {
    if (selectedIds.size === 0) return
    setIsApplying(true)
    try {
      await apiApplyMRPSuggestions(Array.from(selectedIds))
      onApplied()
      onClose()
    } catch (err) {
      console.error(err)
    } finally {
      setIsApplying(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="AI Smart MRP Configurator" /* size removed */>
      <div style={{ padding: '20px' }}>
        <div style={{ 
          display: 'flex', gap: '12px', alignItems: 'flex-start',
          backgroundColor: 'rgba(59, 130, 246, 0.1)', padding: '16px',
          borderRadius: '8px', marginBottom: '24px', borderLeft: '4px solid #3b82f6'
        }}>
          <TrendingUp color="#3b82f6" />
          <div>
            <h4 style={{ margin: '0 0 4px 0', color: '#1e3a8a', fontSize: '15px' }}>Dynamic Reorder Planning</h4>
            <p style={{ margin: 0, color: '#1e40af', fontSize: '13px', lineHeight: '1.5' }}>
              The system has analyzed your sales velocity over the last 30 days. It suggests updating the 
              <strong> Minimum Stock Level</strong> (Avg Daily Sales * 14 days safety/lead time) and 
              <strong> Reorder Quantity</strong> (1 month supply) for fast-moving products to prevent stockouts.
            </p>
          </div>
        </div>

        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
            <Loader2 className="animate-spin" size={24} color="#6b7280" />
          </div>
        ) : suggestions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
            <AlertCircle size={32} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
            <p>No MRP updates suggested.</p>
            <p style={{ fontSize: '12px' }}>Your current product configurations already align perfectly with your recent sales velocity.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto', border: '1px solid var(--color-border)', borderRadius: '8px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead style={{ backgroundColor: 'var(--color-bg-hover)', borderBottom: '1px solid var(--color-border)' }}>
                <tr>
                  <th style={{ padding: '12px', textAlign: 'left', width: '40px' }}>
                    <input 
                      type="checkbox" 
                      checked={selectedIds.size === suggestions.length && suggestions.length > 0}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Product</th>
                  <th style={{ padding: '12px', textAlign: 'right' }}>30d Sales</th>
                  <th style={{ padding: '12px', textAlign: 'right' }}>Daily Avg</th>
                  <th style={{ padding: '12px', textAlign: 'right', backgroundColor: 'rgba(245, 158, 11, 0.05)' }}>Min Stock (Cur &rarr; Sug)</th>
                  <th style={{ padding: '12px', textAlign: 'right', backgroundColor: 'rgba(16, 185, 129, 0.05)' }}>Reorder Qty (Cur &rarr; Sug)</th>
                </tr>
              </thead>
              <tbody>
                {suggestions.map(s => (
                  <tr key={s.product_id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '12px', textAlign: 'left' }}>
                      <input 
                        type="checkbox" 
                        checked={selectedIds.has(s.product_id)}
                        onChange={() => toggleSelect(s.product_id)}
                      />
                    </td>
                    <td style={{ padding: '12px' }}>
                      <div style={{ fontWeight: 600 }}>{s.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{s.code}</div>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', fontWeight: 600 }}>{s.thirty_day_sales}</td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>{s.avg_daily_sales.toFixed(1)}</td>
                    <td style={{ padding: '12px', textAlign: 'right', backgroundColor: 'rgba(245, 158, 11, 0.05)' }}>
                      <span style={{ color: 'var(--color-text-muted)', textDecoration: 'line-through' }}>{s.current_min_stock}</span>
                      <span style={{ margin: '0 8px' }}>&rarr;</span>
                      <span style={{ color: '#d97706', fontWeight: 700 }}>{s.suggested_min_stock}</span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', backgroundColor: 'rgba(16, 185, 129, 0.05)' }}>
                      <span style={{ color: 'var(--color-text-muted)', textDecoration: 'line-through' }}>{s.current_reorder_qty}</span>
                      <span style={{ margin: '0 8px' }}>&rarr;</span>
                      <span style={{ color: '#059669', fontWeight: 700 }}>{s.suggested_reorder_qty}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button 
            variant="primary" 
            onClick={handleApply}
            disabled={selectedIds.size === 0 || isApplying || isLoading || suggestions.length === 0}
            rightIcon={isApplying ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
          >
            {isApplying ? 'Applying...' : `Apply ${selectedIds.size} Suggestions`}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
