import { useReturnNavigation } from '../../hooks/useReturnNavigation';
import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '../../lib/api'
import { Search, Plus, Shield, RefreshCw } from 'lucide-react'

export default function SchemeClaims() {
  useReturnNavigation();
  const navigate = useNavigate()
  const [claims, setClaims] = useState<any[]>([])
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        navigate('/')
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [navigate])

  const fetchClaims = useCallback(async () => {
    try {
      const res = await apiClient.get('/api/schemes/claims')
      setClaims(res.data)
    } catch (err) { console.error(err) }
  }, [])

  useEffect(() => { fetchClaims() }, [fetchClaims])

  return (
    <div style={{ padding: '24px', background: 'var(--color-bg)', minHeight: 'calc(100vh - 56px)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>Pending Scheme Claims</h1>
        <button onClick={fetchClaims} style={{ ...btnStyle }}><RefreshCw size={14}/> Refresh</button>
      </div>

      <div style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead>
            <tr style={{ background: 'var(--color-bg-hover)', borderBottom: '1px solid var(--color-border)', textAlign: 'left' }}>
              <th style={{ padding: '12px 16px' }}>Claim Number</th>
              <th style={{ padding: '12px 16px' }}>Date</th>
              <th style={{ padding: '12px 16px', textAlign: 'right' }}>Total Qty</th>
              <th style={{ padding: '12px 16px', textAlign: 'right' }}>Settled Qty</th>
              <th style={{ padding: '12px 16px' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {claims.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)' }}>No claims found.</td>
              </tr>
            ) : (
              claims.map(c => (
                <tr key={c.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 600 }}>{c.claim_number}</td>
                  <td style={{ padding: '12px 16px' }}>{c.claim_date}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>{c.total_claim_qty}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>{c.settled_qty}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ 
                      padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600,
                      background: c.status === 'pending' ? 'rgba(245,158,11,0.2)' : 'rgba(16,185,129,0.2)',
                      color: c.status === 'pending' ? '#f59e0b' : '#10b981'
                    }}>{c.status.toUpperCase()}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const btnStyle: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 600, fontFamily: 'inherit', background: 'var(--color-bg-hover)', color: 'var(--color-text-primary)' }
