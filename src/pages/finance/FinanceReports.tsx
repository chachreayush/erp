import { useState, useEffect } from 'react'
import { Download, FileSpreadsheet, FileText, Filter, Search } from 'lucide-react'
import { apiClient } from '../../lib/api'
import { exportToCSV, exportToExcel, exportToPDF } from '../../lib/exportUtils'

interface LedgerOption {
  id: string
  name: string
  group_name: string | null
}

interface LedgerEntry {
  date: string
  voucher_id: string
  voucher_number: string
  voucher_type: string
  particulars: string
  dr_amount: number | null
  cr_amount: number | null
  running_balance: number
  balance_type: string
}

interface LedgerStatementResponse {
  ledger_id: string
  ledger_name: string
  from_date: string
  to_date: string
  opening_balance: number
  opening_type: string
  entries: LedgerEntry[]
  closing_balance: number
  closing_type: string
  total_dr: number
  total_cr: number
}

export default function FinanceReports() {
  const [ledgers, setLedgers] = useState<LedgerOption[]>([])
  const [selectedLedger, setSelectedLedger] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [report, setReport] = useState<LedgerStatementResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    apiClient.get('/api/master/ledgers').then(res => {
      setLedgers(res.data)
    }).catch(() => {})
  }, [])

  const fetchReport = async () => {
    if (!selectedLedger || !fromDate || !toDate) return
    setLoading(true)
    try {
      const res = await apiClient.get(`/api/finance/ledger-statement/${selectedLedger}`, {
        params: { from_date: fromDate, to_date: toDate }
      })
      setReport(res.data)
    } catch {
      setReport(null)
    } finally {
      setLoading(false)
    }
  }

  const columns = [
    { header: 'Date', key: 'date' },
    { header: 'Particulars', key: 'particulars' },
    { header: 'Vch Type', key: 'voucher_type' },
    { header: 'Vch No', key: 'voucher_number' },
    { header: 'Debit', key: 'dr_amount' },
    { header: 'Credit', key: 'cr_amount' },
    { header: 'Balance', key: 'balance' }
  ]

  const exportData = (report?.entries || []).map(e => ({
    date: new Date(e.date).toLocaleDateString('en-IN'),
    particulars: e.particulars,
    voucher_type: e.voucher_type,
    voucher_number: e.voucher_number,
    dr_amount: e.dr_amount ? Number(e.dr_amount).toFixed(2) : '',
    cr_amount: e.cr_amount ? Number(e.cr_amount).toFixed(2) : '',
    balance: `${Number(e.running_balance).toFixed(2)} ${e.balance_type}`
  }))

  const filteredLedgers = ledgers.filter(l =>
    l.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const inputStyle = {
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid #334155',
    backgroundColor: '#0f172a',
    color: '#e2e8f0',
    fontSize: '13px',
    outline: 'none',
    transition: 'all 0.2s'
  }

  const exportBtnStyle = (color: string) => ({
    padding: '8px 16px',
    borderRadius: '6px',
    border: `1px solid ${color}`,
    backgroundColor: 'transparent',
    color: color,
    fontSize: '12px',
    fontWeight: 600 as const,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center' as const,
    gap: '6px',
    transition: 'all 0.2s'
  })

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', animation: 'fadeIn 0.3s ease-in-out' }}>
      {/* Page Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#e2e8f0', marginBottom: '6px' }}>
          Finance Reports
        </h1>
        <p style={{ color: '#94a3b8', fontSize: '14px', margin: 0 }}>
          Party Ledger, Trial Balance, and Outstanding Ageing reports.
        </p>
      </div>

      {/* Filters */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: '16px',
        marginBottom: '24px',
        flexWrap: 'wrap',
        padding: '20px',
        backgroundColor: '#0f172a',
        border: '1px solid #1e293b',
        borderRadius: '10px'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minWidth: '220px' }}>
          <label style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8' }}>Select Ledger</label>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
            <input
              type="text"
              value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value) }}
              placeholder="Search ledger..."
              style={{ ...inputStyle, paddingLeft: '32px', width: '100%', boxSizing: 'border-box' }}
              onFocus={e => { e.target.style.borderColor = '#3b82f6'; e.target.style.boxShadow = '0 0 0 2px rgba(59,130,246,0.2)' }}
              onBlur={e => { e.target.style.borderColor = '#334155'; e.target.style.boxShadow = 'none' }}
            />
          </div>
          <select
            value={selectedLedger}
            onChange={e => setSelectedLedger(e.target.value)}
            style={{ ...inputStyle, width: '100%' }}
          >
            <option value="">-- Select Ledger --</option>
            {filteredLedgers.map(l => (
              <option key={l.id} value={l.id}>{l.name} {l.group_name ? `(${l.group_name})` : ''}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8' }}>From Date</label>
          <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} style={inputStyle} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8' }}>To Date</label>
          <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} style={inputStyle} />
        </div>

        <button
          onClick={fetchReport}
          disabled={!selectedLedger || !fromDate || !toDate || loading}
          style={{
            padding: '9px 20px',
            borderRadius: '6px',
            border: 'none',
            background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
            color: '#fff',
            fontSize: '13px',
            fontWeight: 600,
            cursor: !selectedLedger || !fromDate || !toDate || loading ? 'not-allowed' : 'pointer',
            opacity: !selectedLedger || !fromDate || !toDate || loading ? 0.5 : 1,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s',
            boxShadow: '0 4px 12px rgba(59,130,246,0.3)'
          }}
        >
          <Filter size={14} />
          {loading ? 'Loading...' : 'Generate Report'}
        </button>
      </div>

      {/* Report Summary & Export */}
      {report && (
        <>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', gap: '24px' }}>
              <div style={{ fontSize: '13px', color: '#94a3b8' }}>
                <span style={{ fontWeight: 600 }}>Opening:</span>{' '}
                <span style={{ color: '#e2e8f0' }}>₹{Number(report.opening_balance).toFixed(2)} {report.opening_type}</span>
              </div>
              <div style={{ fontSize: '13px', color: '#94a3b8' }}>
                <span style={{ fontWeight: 600 }}>Closing:</span>{' '}
                <span style={{ color: report.closing_type === 'Dr' ? '#f87171' : '#34d399' }}>
                  ₹{Number(report.closing_balance).toFixed(2)} {report.closing_type}
                </span>
              </div>
              <div style={{ fontSize: '13px', color: '#94a3b8' }}>
                <span style={{ fontWeight: 600 }}>Total Dr:</span>{' '}
                <span style={{ color: '#f87171' }}>₹{Number(report.total_dr).toFixed(2)}</span>
              </div>
              <div style={{ fontSize: '13px', color: '#94a3b8' }}>
                <span style={{ fontWeight: 600 }}>Total Cr:</span>{' '}
                <span style={{ color: '#34d399' }}>₹{Number(report.total_cr).toFixed(2)}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => exportToCSV(exportData, columns, `Ledger_${report.ledger_name}`)}
                style={exportBtnStyle('#10b981')}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(16,185,129,0.1)' }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent' }}
              >
                <Download size={14} /> CSV
              </button>
              <button
                onClick={() => exportToExcel(exportData, columns, `Ledger_${report.ledger_name}`)}
                style={exportBtnStyle('#3b82f6')}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(59,130,246,0.1)' }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent' }}
              >
                <FileSpreadsheet size={14} /> Excel
              </button>
              <button
                onClick={() => exportToPDF(exportData, columns, `Ledger_${report.ledger_name}`, `Party Ledger: ${report.ledger_name}`)}
                style={exportBtnStyle('#ef4444')}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.1)' }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent' }}
              >
                <FileText size={14} /> PDF
              </button>
            </div>
          </div>

          {/* Data Table */}
          <div style={{
            border: '1px solid #1e293b',
            borderRadius: '10px',
            overflow: 'hidden',
            backgroundColor: '#0f172a'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#1e293b' }}>
                  <th style={thStyle}>Date</th>
                  <th style={thStyle}>Particulars</th>
                  <th style={thStyle}>Vch Type</th>
                  <th style={thStyle}>Vch No</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Debit</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Credit</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Balance</th>
                </tr>
              </thead>
              <tbody>
                {report.entries.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: '14px', fontStyle: 'italic' }}>
                      No transactions found for the selected period.
                    </td>
                  </tr>
                ) : (
                  report.entries.map((entry, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #1e293b', transition: 'background-color 0.15s' }}
                      onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(59,130,246,0.03)' }}
                      onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent' }}
                    >
                      <td style={tdStyle}>{new Date(entry.date).toLocaleDateString('en-IN')}</td>
                      <td style={tdStyle}>{entry.particulars}</td>
                      <td style={tdStyle}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 600,
                          backgroundColor: 'rgba(59,130,246,0.1)',
                          color: '#60a5fa'
                        }}>
                          {entry.voucher_type}
                        </span>
                      </td>
                      <td style={tdStyle}>{entry.voucher_number}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', color: entry.dr_amount ? '#f87171' : '#475569' }}>
                        {entry.dr_amount ? `₹${Number(entry.dr_amount).toFixed(2)}` : '-'}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right', color: entry.cr_amount ? '#34d399' : '#475569' }}>
                        {entry.cr_amount ? `₹${Number(entry.cr_amount).toFixed(2)}` : '-'}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600, color: entry.balance_type === 'Dr' ? '#f87171' : '#34d399' }}>
                        ₹{Number(entry.running_balance).toFixed(2)} {entry.balance_type}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
      `}</style>
    </div>
  )
}

const thStyle: React.CSSProperties = {
  padding: '12px 16px',
  textAlign: 'left',
  fontSize: '11px',
  fontWeight: 700,
  color: '#94a3b8',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  borderBottom: '1px solid #334155'
}

const tdStyle: React.CSSProperties = {
  padding: '10px 16px',
  fontSize: '13px',
  color: '#cbd5e1'
}
