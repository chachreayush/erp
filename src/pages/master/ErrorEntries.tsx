import React, { useEffect, useState } from 'react'
import { apiGetDrafts, apiDeleteDraft, ErrorEntry } from '../../lib/api'
import { useNavigate } from 'react-router-dom'
import { useReturnNavigation } from '../../hooks/useReturnNavigation'

export default function ErrorEntries() {
  const [drafts, setDrafts] = useState<ErrorEntry[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useReturnNavigation()

  useEffect(() => {
    fetchDrafts()
  }, [])

  const fetchDrafts = async () => {
    try {
      const data = await apiGetDrafts()
      setDrafts(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm("Permanently delete this recovered entry?")) return
    try {
      await apiDeleteDraft(id)
      fetchDrafts()
    } catch (e) {
      console.error(e)
    }
  }

  const handleRestore = (draft: ErrorEntry) => {
    // Navigate to the correct route with the draft ID in state
    let route = '/'
    if (draft.module_name === 'SalesBill') route = '/sales/sales-bill'
    if (draft.module_name === 'PurchaseBill') route = '/purchase/purchase-bill'
    if (draft.module_name === 'PaymentVoucher') route = '/finance/payment'
    if (draft.module_name === 'ReceiptVoucher') route = '/finance/receipt'
    
    navigate(route, { state: { draftPayload: draft.json_payload, draftId: draft.id } })
  }

  if (loading) return <div style={{ padding: '20px', color: '#fff' }}>Loading recovered entries...</div>

  return (
    <div style={{ padding: '20px', backgroundColor: '#020617', minHeight: '100vh', color: '#f8fafc', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <h2 style={{ color: '#38bdf8', margin: 0 }}>Crash Recovery & Drafts</h2>
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
      <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '24px' }}>
        These are unsaved entries recovered after a system crash, power outage, or accidental navigation.
        Entries are automatically purged after 10 system restarts.
      </p>

      {drafts.length === 0 ? (
        <div style={{ backgroundColor: '#0f172a', padding: '40px', borderRadius: '8px', textAlign: 'center', border: '1px solid #1e293b' }}>
          <div style={{ fontSize: '40px', marginBottom: '10px' }}>✓</div>
          <div style={{ fontSize: '18px', fontWeight: 'bold' }}>System is clear</div>
          <div style={{ color: '#64748b', fontSize: '14px' }}>No recovered entries found.</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '16px' }}>
          {drafts.map(d => (
            <div key={d.id} style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ backgroundColor: '#1e3a8a', color: '#60a5fa', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>{d.module_name}</span>
                <span style={{ color: '#64748b', fontSize: '12px' }}>{new Date(d.created_at).toLocaleString()}</span>
              </div>
              
              <div style={{ fontSize: '13px', color: '#cbd5e1', backgroundColor: '#020617', padding: '8px', borderRadius: '4px', height: '60px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {d.json_payload.substring(0, 150)}...
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: 'auto' }}>
                <button onClick={() => handleDelete(d.id)} style={{ backgroundColor: 'transparent', border: '1px solid #ef4444', color: '#ef4444', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Discard</button>
                <button onClick={() => handleRestore(d)} style={{ backgroundColor: '#10b981', border: 'none', color: '#fff', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>Restore</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
