import { useState } from 'react'
import { FileText, Download, FileSpreadsheet, Filter } from 'lucide-react'
import { exportToCSV, exportToExcel, exportToPDF } from '../../lib/exportUtils'

type GstTab = 'gstr1' | 'gstr2' | 'gstr3b'

interface GstTabConfig {
  id: GstTab
  label: string
  description: string
  columns: { header: string; key: string }[]
}

const GST_TABS: GstTabConfig[] = [
  {
    id: 'gstr1',
    label: 'GSTR-1',
    description: 'Outward supplies — Sales invoices and credit/debit notes filed with GST portal.',
    columns: [
      { header: 'Invoice No', key: 'invoice_no' },
      { header: 'Date', key: 'date' },
      { header: 'Customer', key: 'customer' },
      { header: 'GSTIN', key: 'gstin' },
      { header: 'Taxable Amt', key: 'taxable_amount' },
      { header: 'CGST', key: 'cgst' },
      { header: 'SGST', key: 'sgst' },
      { header: 'IGST', key: 'igst' },
      { header: 'Total', key: 'total' }
    ]
  },
  {
    id: 'gstr2',
    label: 'GSTR-2',
    description: 'Inward supplies — Purchase invoices for input tax credit reconciliation.',
    columns: [
      { header: 'Invoice No', key: 'invoice_no' },
      { header: 'Date', key: 'date' },
      { header: 'Supplier', key: 'supplier' },
      { header: 'GSTIN', key: 'gstin' },
      { header: 'Taxable Amt', key: 'taxable_amount' },
      { header: 'CGST', key: 'cgst' },
      { header: 'SGST', key: 'sgst' },
      { header: 'IGST', key: 'igst' },
      { header: 'Total', key: 'total' }
    ]
  },
  {
    id: 'gstr3b',
    label: 'GSTR-3B',
    description: 'Monthly summary return — Consolidated tax liability and ITC summary.',
    columns: [
      { header: 'Description', key: 'description' },
      { header: 'Taxable Value', key: 'taxable_value' },
      { header: 'IGST', key: 'igst' },
      { header: 'CGST', key: 'cgst' },
      { header: 'SGST', key: 'sgst' },
      { header: 'Cess', key: 'cess' }
    ]
  }
]

export default function GstReports() {
  const [activeTab, setActiveTab] = useState<GstTab>('gstr1')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [data] = useState<Record<string, any>[]>([])

  const currentTab = GST_TABS.find(t => t.id === activeTab)!

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
          GST & Compliance
        </h1>
        <p style={{ color: '#94a3b8', fontSize: '14px', margin: 0 }}>
          Generate and export GST returns for filing with the Government of India GST portal.
        </p>
      </div>

      {/* Tab Navigation */}
      <div style={{
        display: 'flex',
        gap: '4px',
        marginBottom: '24px',
        borderBottom: '1px solid #1e293b',
        paddingBottom: '0'
      }}>
        {GST_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '10px 20px',
              fontSize: '13px',
              fontWeight: activeTab === tab.id ? 700 : 500,
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid #3b82f6' : '2px solid transparent',
              backgroundColor: 'transparent',
              color: activeTab === tab.id ? '#3b82f6' : '#94a3b8',
              cursor: 'pointer',
              transition: 'all 0.2s',
              marginBottom: '-1px'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Description */}
      <div style={{
        padding: '14px 18px',
        backgroundColor: 'rgba(59,130,246,0.05)',
        border: '1px solid rgba(59,130,246,0.15)',
        borderRadius: '8px',
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
      }}>
        <FileText size={16} color="#3b82f6" />
        <span style={{ fontSize: '13px', color: '#94a3b8' }}>{currentTab.description}</span>
      </div>

      {/* Filters & Export Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Filter size={16} color="#64748b" />
          <input
            type="date"
            value={fromDate}
            onChange={e => setFromDate(e.target.value)}
            style={inputStyle}
            placeholder="From Date"
          />
          <span style={{ color: '#475569', fontSize: '13px' }}>to</span>
          <input
            type="date"
            value={toDate}
            onChange={e => setToDate(e.target.value)}
            style={inputStyle}
            placeholder="To Date"
          />
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => exportToCSV(data, currentTab.columns, `${currentTab.label}_${fromDate}_${toDate}`)}
            style={exportBtnStyle('#10b981')}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(16,185,129,0.1)' }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent' }}
          >
            <Download size={14} /> CSV
          </button>
          <button
            onClick={() => exportToExcel(data, currentTab.columns, `${currentTab.label}_${fromDate}_${toDate}`)}
            style={exportBtnStyle('#3b82f6')}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(59,130,246,0.1)' }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent' }}
          >
            <FileSpreadsheet size={14} /> Excel
          </button>
          <button
            onClick={() => exportToPDF(data, currentTab.columns, `${currentTab.label}_${fromDate}_${toDate}`, `${currentTab.label} Report`)}
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
              {currentTab.columns.map(col => (
                <th key={col.key} style={{
                  padding: '12px 16px',
                  textAlign: 'left',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#94a3b8',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  borderBottom: '1px solid #334155'
                }}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={currentTab.columns.length}
                  style={{
                    padding: '60px 16px',
                    textAlign: 'center',
                    color: '#64748b',
                    fontSize: '14px',
                    fontStyle: 'italic'
                  }}
                >
                  No data available. Select a date range and generate the report.
                </td>
              </tr>
            ) : (
              data.map((row, idx) => (
                <tr key={idx} style={{
                  borderBottom: '1px solid #1e293b',
                  transition: 'background-color 0.15s'
                }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(59,130,246,0.03)' }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent' }}
                >
                  {currentTab.columns.map(col => (
                    <td key={col.key} style={{
                      padding: '10px 16px',
                      fontSize: '13px',
                      color: '#cbd5e1'
                    }}>
                      {row[col.key] ?? '-'}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
      `}</style>
    </div>
  )
}
