// ============================================================
// ReceiptAllocationModal.tsx — Bill-by-Bill Allocation Modal
// ============================================================
// Allows users to allocate a Receipt/Payment Voucher against
// outstanding Invoices, Credit Notes, Debit Notes, or leave
// the balance as a Floating (On Account) advance.
//
// API Integration:
//   GET  /api/finance/allocations/pending → Fetch unpaid items
//   POST /api/finance/allocations         → Save allocations
// ============================================================

import { useState, useEffect, useCallback } from 'react'
import { apiClient } from '../../lib/api'
import { X, CheckCircle, AlertTriangle, Banknote } from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────

interface PendingItem {
  id: string
  voucher_number?: string
  invoice_number?: string
  date?: string
  total_amount: number
  allocated_total: number
  outstanding: number
  document_type: string
  // local UI state
  allocate_amount: string
}

interface ReceiptAllocationModalProps {
  isOpen: boolean
  onClose: () => void
  sourceVoucherId: string
  voucherNumber: string
  totalAmount: number
  onSuccess?: () => void
}

// ── Component ──────────────────────────────────────────────────

export default function ReceiptAllocationModal({
  isOpen,
  onClose,
  sourceVoucherId,
  voucherNumber,
  totalAmount,
  onSuccess
}: ReceiptAllocationModalProps) {

  const [pendingItems, setPendingItems] = useState<PendingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // ── Fetch pending allocations on mount ──
  const fetchPending = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await apiClient.get('/api/finance/allocations/pending')
      const items: PendingItem[] = (res.data || []).map((item: any) => ({
        ...item,
        total_amount: parseFloat(item.total_amount) || 0,
        allocated_total: parseFloat(item.allocated_total) || 0,
        outstanding: parseFloat(item.outstanding) || 0,
        allocate_amount: ''
      }))
      setPendingItems(items)
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to load pending allocations')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      fetchPending()
      setSuccessMsg('')
    }
  }, [isOpen, fetchPending])

  // ── Calculate totals ──
  const totalAllocated = pendingItems.reduce((sum, item) => {
    const val = parseFloat(item.allocate_amount) || 0
    return sum + val
  }, 0)

  const floatingBalance = totalAmount - totalAllocated

  // ── Update allocation amount for a row ──
  const updateAllocation = (id: string, value: string) => {
    setPendingItems(prev =>
      prev.map(item => {
        if (item.id !== id) return item
        // Clamp to outstanding
        const numVal = parseFloat(value) || 0
        if (numVal > item.outstanding) {
          return { ...item, allocate_amount: String(item.outstanding) }
        }
        return { ...item, allocate_amount: value }
      })
    )
  }

  // ── Save allocations ──
  const handleSave = async () => {
    setSaving(true)
    setError('')
    setSuccessMsg('')

    try {
      const allocations: any[] = []

      // Add invoice/voucher allocations
      for (const item of pendingItems) {
        const amount = parseFloat(item.allocate_amount) || 0
        if (amount <= 0) continue

        const alloc: any = { allocated_amount: amount }
        if (item.document_type === 'Invoice') {
          alloc.target_invoice_id = item.id
        } else {
          alloc.target_cn_dn_id = item.id
        }
        allocations.push(alloc)
      }

      // Add floating balance if any
      if (floatingBalance > 0.01) {
        allocations.push({
          allocated_amount: parseFloat(floatingBalance.toFixed(2)),
          narration: 'On Account / Floating Advance'
        })
      }

      if (allocations.length === 0) {
        // Everything is floating
        allocations.push({
          allocated_amount: totalAmount,
          narration: 'Full amount kept as On Account / Floating Advance'
        })
      }

      await apiClient.post('/api/finance/allocations', {
        source_voucher_id: sourceVoucherId,
        allocations
      })

      setSuccessMsg('Allocations saved successfully!')
      if (onSuccess) onSuccess()

      setTimeout(() => {
        onClose()
      }, 1200)
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to save allocations')
    } finally {
      setSaving(false)
    }
  }

  // ── Don't render if closed ──
  if (!isOpen) return null

  // ── Styles ──
  const styles: Record<string, React.CSSProperties> = {
    overlay: {
      position: 'fixed', inset: 0, zIndex: 9999,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      animation: 'fadeIn 0.2s ease-out'
    },
    modal: {
      backgroundColor: '#0f172a', color: '#e2e8f0',
      borderRadius: '12px', border: '1px solid #1e293b',
      width: '90%', maxWidth: '900px', maxHeight: '85vh',
      display: 'flex', flexDirection: 'column',
      boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
      animation: 'slideUp 0.3s ease-out'
    },
    header: {
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '20px 24px',
      borderBottom: '1px solid #1e293b',
      background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
      borderRadius: '12px 12px 0 0'
    },
    headerLeft: {
      display: 'flex', alignItems: 'center', gap: '12px'
    },
    headerIcon: {
      width: '40px', height: '40px', borderRadius: '10px',
      background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    },
    headerTitle: {
      fontSize: '18px', fontWeight: '700', margin: 0, color: '#f1f5f9'
    },
    headerSub: {
      fontSize: '13px', color: '#94a3b8', marginTop: '2px'
    },
    closeBtn: {
      background: '#1e293b', border: '1px solid #334155',
      color: '#94a3b8', borderRadius: '8px',
      width: '36px', height: '36px',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      cursor: 'pointer', transition: 'all 0.15s'
    },
    body: {
      padding: '20px 24px', overflowY: 'auto', flex: 1
    },
    table: {
      width: '100%', borderCollapse: 'collapse', fontSize: '13px'
    },
    th: {
      textAlign: 'left', padding: '10px 12px',
      borderBottom: '2px solid #1e293b',
      color: '#94a3b8', fontWeight: '600',
      fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px'
    },
    thRight: {
      textAlign: 'right', padding: '10px 12px',
      borderBottom: '2px solid #1e293b',
      color: '#94a3b8', fontWeight: '600',
      fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px'
    },
    td: {
      padding: '10px 12px', borderBottom: '1px solid #1e293b12',
      color: '#e2e8f0'
    },
    tdRight: {
      padding: '10px 12px', borderBottom: '1px solid #1e293b12',
      color: '#e2e8f0', textAlign: 'right', fontFamily: 'monospace'
    },
    allocInput: {
      width: '120px', background: '#020617',
      color: '#4ade80', border: '1px solid #1e293b',
      padding: '6px 10px', borderRadius: '6px',
      textAlign: 'right', fontFamily: 'monospace',
      fontSize: '13px', outline: 'none',
      transition: 'border-color 0.15s'
    },
    badge: {
      display: 'inline-block', padding: '2px 8px',
      borderRadius: '4px', fontSize: '11px', fontWeight: '600'
    },
    footer: {
      padding: '16px 24px',
      borderTop: '1px solid #1e293b',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      background: '#0a0f1a', borderRadius: '0 0 12px 12px'
    },
    summaryBlock: {
      display: 'flex', gap: '24px', fontSize: '13px'
    },
    summaryItem: {
      display: 'flex', flexDirection: 'column', gap: '2px'
    },
    summaryLabel: {
      fontSize: '11px', color: '#64748b', textTransform: 'uppercase',
      letterSpacing: '0.5px'
    },
    summaryValue: {
      fontSize: '16px', fontWeight: '700', fontFamily: 'monospace'
    },
    saveBtn: {
      display: 'flex', alignItems: 'center', gap: '8px',
      background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
      color: '#fff', border: 'none',
      padding: '10px 24px', borderRadius: '8px',
      cursor: 'pointer', fontWeight: '600', fontSize: '14px',
      transition: 'all 0.15s',
      opacity: saving ? 0.6 : 1
    },
    skipBtn: {
      background: '#1e293b', color: '#94a3b8',
      border: '1px solid #334155',
      padding: '10px 20px', borderRadius: '8px',
      cursor: 'pointer', fontWeight: '500', fontSize: '13px',
      marginRight: '12px'
    },
    emptyState: {
      textAlign: 'center', padding: '40px', color: '#64748b'
    },
    alertError: {
      background: '#7f1d1d20', border: '1px solid #7f1d1d',
      color: '#fca5a5', padding: '10px 16px', borderRadius: '8px',
      marginBottom: '16px', fontSize: '13px',
      display: 'flex', alignItems: 'center', gap: '8px'
    },
    alertSuccess: {
      background: '#14532d20', border: '1px solid #14532d',
      color: '#86efac', padding: '10px 16px', borderRadius: '8px',
      marginBottom: '16px', fontSize: '13px',
      display: 'flex', alignItems: 'center', gap: '8px'
    }
  }

  const getBadgeStyle = (type: string): React.CSSProperties => {
    switch (type) {
      case 'Invoice': return { ...styles.badge, background: '#1e3a5f', color: '#60a5fa' }
      case 'Receipt': return { ...styles.badge, background: '#14532d', color: '#4ade80' }
      case 'Payment': return { ...styles.badge, background: '#713f12', color: '#fbbf24' }
      case 'Credit Note': return { ...styles.badge, background: '#581c87', color: '#c084fc' }
      case 'Debit Note': return { ...styles.badge, background: '#7f1d1d', color: '#fca5a5' }
      default: return { ...styles.badge, background: '#334155', color: '#94a3b8' }
    }
  }

  const formatCurrency = (val: number) => {
    return '₹ ' + val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—'
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    } catch { return dateStr }
  }

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>

        {/* ── Header ── */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <div style={styles.headerIcon}>
              <Banknote size={20} color="#fff" />
            </div>
            <div>
              <h2 style={styles.headerTitle}>Bill-by-Bill Allocation</h2>
              <div style={styles.headerSub}>
                {voucherNumber} &nbsp;·&nbsp; {formatCurrency(totalAmount)}
              </div>
            </div>
          </div>
          <button style={styles.closeBtn} onClick={onClose} title="Close (Esc)">
            <X size={18} />
          </button>
        </div>

        {/* ── Body ── */}
        <div style={styles.body}>

          {error && (
            <div style={styles.alertError}>
              <AlertTriangle size={16} /> {error}
            </div>
          )}

          {successMsg && (
            <div style={styles.alertSuccess}>
              <CheckCircle size={16} /> {successMsg}
            </div>
          )}

          {loading ? (
            <div style={styles.emptyState}>Loading outstanding items…</div>
          ) : pendingItems.length === 0 ? (
            <div style={styles.emptyState}>
              No outstanding invoices or vouchers found.<br />
              The entire amount will be saved as a Floating / On Account advance.
            </div>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Date</th>
                  <th style={styles.th}>Document No.</th>
                  <th style={styles.th}>Type</th>
                  <th style={styles.thRight}>Total</th>
                  <th style={styles.thRight}>Outstanding</th>
                  <th style={styles.thRight}>Allocate</th>
                </tr>
              </thead>
              <tbody>
                {pendingItems.map((item, idx) => (
                  <tr key={item.id} style={{ background: idx % 2 === 0 ? 'transparent' : '#0a0f1a' }}>
                    <td style={styles.td}>{formatDate(item.date)}</td>
                    <td style={{ ...styles.td, fontWeight: '600' }}>
                      {item.invoice_number || item.voucher_number || '—'}
                    </td>
                    <td style={styles.td}>
                      <span style={getBadgeStyle(item.document_type)}>
                        {item.document_type}
                      </span>
                    </td>
                    <td style={styles.tdRight}>{formatCurrency(item.total_amount)}</td>
                    <td style={{ ...styles.tdRight, color: '#f59e0b', fontWeight: '600' }}>
                      {formatCurrency(item.outstanding)}
                    </td>
                    <td style={{ ...styles.td, textAlign: 'right' }}>
                      <input
                        style={styles.allocInput}
                        type="number"
                        min="0"
                        max={item.outstanding}
                        step="0.01"
                        placeholder="0.00"
                        value={item.allocate_amount}
                        onChange={e => updateAllocation(item.id, e.target.value)}
                        onFocus={e => {
                          e.target.style.borderColor = '#2563eb'
                          e.target.style.boxShadow = '0 0 0 2px rgba(37,99,235,0.3)'
                        }}
                        onBlur={e => {
                          e.target.style.borderColor = '#1e293b'
                          e.target.style.boxShadow = 'none'
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Footer ── */}
        <div style={styles.footer}>
          <div style={styles.summaryBlock}>
            <div style={styles.summaryItem}>
              <span style={styles.summaryLabel}>Received</span>
              <span style={{ ...styles.summaryValue, color: '#4ade80' }}>
                {formatCurrency(totalAmount)}
              </span>
            </div>
            <div style={styles.summaryItem}>
              <span style={styles.summaryLabel}>Allocated</span>
              <span style={{ ...styles.summaryValue, color: '#60a5fa' }}>
                {formatCurrency(totalAllocated)}
              </span>
            </div>
            <div style={styles.summaryItem}>
              <span style={styles.summaryLabel}>Floating</span>
              <span style={{
                ...styles.summaryValue,
                color: floatingBalance > 0.01 ? '#f59e0b' : '#4ade80'
              }}>
                {formatCurrency(floatingBalance)}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button style={styles.skipBtn} onClick={onClose}>
              Skip (Keep Floating)
            </button>
            <button style={styles.saveBtn} disabled={saving} onClick={handleSave}>
              <CheckCircle size={16} />
              {saving ? 'Saving...' : 'Save Allocations'}
            </button>
          </div>
        </div>

      </div>

      {/* ── Animations ── */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
