import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useReturnNavigation } from '../../hooks/useReturnNavigation'
import {
  FileText,
  Download,
  FileSpreadsheet,
  Calendar,
  Layers,
  FileCode,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  RefreshCw,
  TrendingUp,
  Receipt,
  ArrowLeft,
  HelpCircle,
  ExternalLink,
  ShieldCheck
} from 'lucide-react'
import {
  apiGetGstSummary,
  apiGetGstr1,
  apiGetGstr2,
  apiGetGstr3b,
  apiGetGstr1Json,
  GstSummaryResponse,
  Gstr1Response,
  Gstr2Response,
  Gstr3bResponse
} from '../../lib/api'
import { exportToCSV, exportToExcel, exportToPDF } from '../../lib/exportUtils'

type GstTab = 'gstr1' | 'gstr2' | 'gstr3b'
type Gstr1SubTab = 'b2b' | 'b2cs' | 'cdnr' | 'hsn' | 'docs'

export default function GstReports() {
  useReturnNavigation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<GstTab>('gstr1')
  const [activeGstr1SubTab, setActiveGstr1SubTab] = useState<Gstr1SubTab>('b2b')
  const [fromDate, setFromDate] = useState('2026-04-01')
  const [toDate, setToDate] = useState('2027-03-31')
  const [isLoading, setIsLoading] = useState(false)
  const [notification, setNotification] = useState<string | null>(null)

  // Data states
  const [summary, setSummary] = useState<GstSummaryResponse | null>(null)
  const [gstr1Data, setGstr1Data] = useState<Gstr1Response | null>(null)
  const [gstr2Data, setGstr2Data] = useState<Gstr2Response | null>(null)
  const [gstr3bData, setGstr3bData] = useState<Gstr3bResponse | null>(null)

  const notifTimerRef = useRef<any>(null)

  const showNotification = (msg: string) => {
    if (notifTimerRef.current) {
      clearTimeout(notifTimerRef.current)
    }
    setNotification(msg)
    notifTimerRef.current = setTimeout(() => {
      setNotification(null)
      notifTimerRef.current = null
    }, 6000)
  }

  const fetchAllGstData = async () => {
    setIsLoading(true)
    try {
      const [sumRes, g1Res, g2Res, g3Res] = await Promise.all([
        apiGetGstSummary(fromDate || undefined, toDate || undefined),
        apiGetGstr1(fromDate || undefined, toDate || undefined),
        apiGetGstr2(fromDate || undefined, toDate || undefined),
        apiGetGstr3b(fromDate || undefined, toDate || undefined)
      ])
      setSummary(sumRes)
      setGstr1Data(g1Res)
      setGstr2Data(g2Res)
      setGstr3bData(g3Res)
    } catch (err) {
      console.error('Failed to load GST return records:', err)
      showNotification('Error loading GST returns from backend.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchAllGstData()
  }, [])

  const handleDownloadOfflineJson = async () => {
    try {
      if (notifTimerRef.current) clearTimeout(notifTimerRef.current)
      setNotification('Generating Government GSTN offline payload...')
      const jsonData = await apiGetGstr1Json(fromDate || undefined, toDate || undefined)
      const jsonString = JSON.stringify(jsonData, null, 2)
      const blob = new Blob([jsonString], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const periodTag = fromDate ? fromDate.replace(/-/g, '') : 'FULL'
      a.href = url
      a.download = `GSTR1_${periodTag}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      showNotification('GSTN Official JSON export ready for upload to gst.gov.in')
    } catch (err) {
      console.error('Failed to download offline JSON:', err)
      showNotification('Error exporting GSTN offline JSON')
    }
  }

  const applyPreset = (preset: string) => {
    const today = new Date().toISOString().split('T')[0]
    if (preset === 'FY2026-27') {
      setFromDate('2026-04-01')
      setToDate('2027-03-31')
    } else if (preset === 'MTD') {
      setFromDate('2026-10-01')
      setToDate(today)
    } else if (preset === 'Q1') {
      setFromDate('2026-04-01')
      setToDate('2026-06-30')
    } else if (preset === 'Q2') {
      setFromDate('2026-07-01')
      setToDate('2026-09-30')
    } else if (preset === 'CLEAR') {
      setFromDate('')
      setToDate('')
    }
  }

  const fmtCurrency = (val: number | undefined | null) => {
    return '₹' + Number(val || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
  }

  // Active table rows & columns for export
  const getActiveExportData = () => {
    if (activeTab === 'gstr1') {
      if (!gstr1Data) return { data: [], columns: [], name: 'GSTR1' }
      if (activeGstr1SubTab === 'b2b') {
        return {
          data: gstr1Data.b2b || [],
          columns: [
            { header: 'Invoice No', key: 'invoice_no' },
            { header: 'Date', key: 'date' },
            { header: 'Customer', key: 'customer' },
            { header: 'GSTIN', key: 'gstin' },
            { header: 'POS', key: 'place_of_supply' },
            { header: 'Taxable Amt', key: 'taxable_amount' },
            { header: 'CGST', key: 'cgst' },
            { header: 'SGST', key: 'sgst' },
            { header: 'IGST', key: 'igst' },
            { header: 'Total', key: 'total' }
          ],
          name: 'GSTR1_Table4_B2B'
        }
      } else if (activeGstr1SubTab === 'b2cs') {
        return {
          data: gstr1Data.b2cs || [],
          columns: [
            { header: 'Invoice No', key: 'invoice_no' },
            { header: 'Date', key: 'date' },
            { header: 'Customer', key: 'customer' },
            { header: 'POS', key: 'place_of_supply' },
            { header: 'Taxable Amt', key: 'taxable_amount' },
            { header: 'CGST', key: 'cgst' },
            { header: 'SGST', key: 'sgst' },
            { header: 'Total', key: 'total' }
          ],
          name: 'GSTR1_Table7_B2CS'
        }
      } else if (activeGstr1SubTab === 'cdnr') {
        return {
          data: gstr1Data.cdnr || [],
          columns: [
            { header: 'Note No', key: 'note_number' },
            { header: 'Date', key: 'date' },
            { header: 'Customer', key: 'customer' },
            { header: 'GSTIN', key: 'gstin' },
            { header: 'Orig Inv', key: 'original_invoice' },
            { header: 'Taxable Amt', key: 'taxable_amount' },
            { header: 'CGST', key: 'cgst' },
            { header: 'SGST', key: 'sgst' },
            { header: 'Total', key: 'total' }
          ],
          name: 'GSTR1_Table9B_CDNR'
        }
      } else if (activeGstr1SubTab === 'hsn') {
        return {
          data: gstr1Data.hsn_summary || [],
          columns: [
            { header: 'HSN Code', key: 'hsn_code' },
            { header: 'Description', key: 'description' },
            { header: 'UQC', key: 'uqc' },
            { header: 'Quantity', key: 'total_quantity' },
            { header: 'Total Value', key: 'total_value' },
            { header: 'Taxable Value', key: 'taxable_value' },
            { header: 'Central Tax', key: 'central_tax' },
            { header: 'State Tax', key: 'state_tax' },
            { header: 'Integrated Tax', key: 'integrated_tax' }
          ],
          name: 'GSTR1_Table12_HSN'
        }
      } else {
        const docList = gstr1Data.doc_issues || (gstr1Data as any).document_summary || []
        return {
          data: docList,
          columns: [
            { header: 'Doc Type', key: 'doc_type' },
            { header: 'From Serial', key: 'from_serial' },
            { header: 'To Serial', key: 'to_serial' },
            { header: 'Total Issued', key: 'total_count' },
            { header: 'Cancelled', key: 'cancelled' },
            { header: 'Net Issued', key: 'net_issued' }
          ],
          name: 'GSTR1_Table13_Docs'
        }
      }
    } else if (activeTab === 'gstr2') {
      if (!gstr2Data) return { data: [], columns: [], name: 'GSTR2' }
      return {
        data: gstr2Data.inward_supplies || [],
        columns: [
          { header: 'Supplier Invoice', key: 'invoice_no' },
          { header: 'Internal Ref', key: 'internal_voucher_no' },
          { header: 'Date', key: 'date' },
          { header: 'Supplier', key: 'supplier' },
          { header: 'GSTIN', key: 'gstin' },
          { header: 'Taxable Amt', key: 'taxable_amount' },
          { header: 'CGST', key: 'cgst' },
          { header: 'SGST', key: 'sgst' },
          { header: 'Total', key: 'total' },
          { header: 'ITC Eligibility', key: 'itc_eligibility' }
        ],
        name: 'GSTR2_Inward_ITC'
      }
    } else {
      if (!gstr3bData) return { data: [], columns: [], name: 'GSTR3B' }
      return {
        data: gstr3bData.table_3_1_outward || [],
        columns: [
          { header: 'Nature of Supplies', key: 'nature_of_supplies' },
          { header: 'Taxable Value', key: 'taxable_value' },
          { header: 'IGST', key: 'igst' },
          { header: 'CGST', key: 'cgst' },
          { header: 'SGST', key: 'sgst' },
          { header: 'Cess', key: 'cess' }
        ],
        name: 'GSTR3B_Consolidated'
      }
    }
  }

  const exportCurrent = (format: 'csv' | 'excel' | 'pdf') => {
    const { data, columns, name } = getActiveExportData()
    if (!data || data.length === 0) {
      showNotification('No data available to export in current view.')
      return
    }
    const filename = `${name}_${fromDate || 'ALL'}_${toDate || 'ALL'}`
    if (format === 'csv') exportToCSV(data as any, columns, filename)
    else if (format === 'excel') exportToExcel(data as any, columns, filename)
    else exportToPDF(data as any, columns, filename, `${name} Statutory Filing Report`)
  }

  const inputStyle = {
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid #d8e2dc',
    backgroundColor: '#ffffff',
    color: '#111827',
    fontSize: '13px',
    outline: 'none',
    transition: 'all 0.2s'
  }

  const exportBtnStyle = (color: string) => ({
    padding: '8px 14px',
    borderRadius: '6px',
    border: '1px solid #d8e2dc',
    backgroundColor: '#ffffff',
    color: '#1b4332',
    fontSize: '12px',
    fontWeight: 600 as const,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center' as const,
    gap: '6px',
    transition: 'all 0.2s'
  })

  return (
    <div style={{ backgroundColor: '#eef2ef', minHeight: '100vh', padding: '24px', color: '#111827', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Toast Notification */}
      {notification && (
        <div
          id="gst-notification-banner"
          style={{
            position: 'fixed',
            top: '20px',
            right: '24px',
            zIndex: 9999,
            backgroundColor: '#e8f5e9',
            border: '1px solid #81c784',
            color: '#1b5e20',
            padding: '12px 20px',
            borderRadius: '8px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '13px',
            fontWeight: 700
          }}
        >
          <CheckCircle2 size={18} color="#2e7d32" />
          <span>{notification}</span>
        </div>
      )}

      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <button 
              onClick={() => navigate('/finance')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#2d6a4f', display: 'flex', alignItems: 'center' }}
              title="Return to Finance Hub [ESC]"
            >
              <ArrowLeft size={20} />
            </button>
            <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#2d6a4f' }}>
              FINANCE HUB / STATUTORY TAX COMPLIANCE
            </span>
            <span style={{ backgroundColor: '#d8e2dc', color: '#1b4332', fontSize: '11px', fontWeight: 800, padding: '2px 8px', borderRadius: '4px' }}>
              DOC-29
            </span>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#1b4332', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Receipt size={26} color="#1b4332" />
            Statutory GST Compliance & Tax Filing Engine
          </h1>
          <p style={{ color: '#52796f', fontSize: '13px', margin: '4px 0 0 0' }}>
            DOC-29: GSTR-1 Outward Registers, GSTR-2 Inward ITC Reconciliation, GSTR-3B Monthly Return & Official GSTN Offline JSON
          </p>
        </div>

        {/* Action Drilldown Buttons */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => navigate('/finance/profit-loss')}
            style={{ backgroundColor: '#ffffff', color: '#2d6a4f', border: '1px solid #d8e2dc', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            P&L Statement <ExternalLink size={14} />
          </button>
          <button
            onClick={() => navigate('/compliance')}
            style={{ backgroundColor: '#ffffff', color: '#1b4332', border: '1px solid #2d6a4f', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <ShieldCheck size={16} /> E-Invoicing Workbench <ExternalLink size={14} />
          </button>
          <button
            id="download-gstn-json-btn"
            onClick={handleDownloadOfflineJson}
            style={{
              padding: '8px 18px',
              backgroundColor: '#1b4332',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 2px 8px rgba(27,67,50,0.2)'
            }}
          >
            <FileCode size={16} />
            <span>Download GST Portal JSON</span>
          </button>
        </div>
      </div>

      {/* 3-Step Compliance Flow Explainer Banner */}
      <div style={{ backgroundColor: '#ffffff', border: '1px solid #d8e2dc', borderRadius: '12px', padding: '16px 20px', marginBottom: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <span style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#1b4332', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <HelpCircle size={16} color="#2d6a4f" />
            HOW STATUTORY GST & COMPLIANCE ENGINE WORKS (DOC-29 AUDIT RULES)
          </span>
          <span style={{ fontSize: '11px', color: '#52796f', fontWeight: 600 }}>
            GSTN Schema v1.5 / NIC E-Invoice 1.1 Compliant
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <div style={{ backgroundColor: '#eef2ef', color: '#1b4332', borderRadius: '8px', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '12px', flexShrink: 0 }}>
              1
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '13px', color: '#1b4332' }}>Tax Engine & Invoice Tagging</div>
              <div style={{ fontSize: '12px', color: '#52796f', marginTop: '2px', lineHeight: 1.4 }}>
                Inter-state IGST vs intra-state CGST/SGST routing, B2B recipient GSTINs and HSN/SAC chapter classification.
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <div style={{ backgroundColor: '#eef2ef', color: '#1b4332', borderRadius: '8px', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '12px', flexShrink: 0 }}>
              2
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '13px', color: '#1b4332' }}>E-Invoicing (IRN) & E-Way Bill</div>
              <div style={{ fontSize: '12px', color: '#52796f', marginTop: '2px', lineHeight: 1.4 }}>
                Offline bulk JSON export and response import with 64-char IRN hash generation and QR code embedding.
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <div style={{ backgroundColor: '#eef2ef', color: '#1b4332', borderRadius: '8px', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '12px', flexShrink: 0 }}>
              3
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '13px', color: '#1b4332' }}>Statutory GSTR Consolidation</div>
              <div style={{ fontSize: '12px', color: '#52796f', marginTop: '2px', lineHeight: 1.4 }}>
                GSTR-1 outward registers, GSTR-2 inward credit matching, GSTR-3B tax set-off, and portal JSON download.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Executive Metric Cards Banner */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        {/* Card 1: Outward Supplies */}
        <div style={{
          backgroundColor: '#ffffff',
          border: '1px solid #d8e2dc',
          borderLeft: '4px solid #1b4332',
          borderRadius: '12px',
          padding: '16px 20px',
          boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#52796f', textTransform: 'uppercase' }}>
              Gross Outward Supplies
            </span>
            <div style={{ padding: '4px', borderRadius: '6px', backgroundColor: '#eef2ef' }}>
              <ArrowUpRight size={16} color="#1b4332" />
            </div>
          </div>
          <div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#1b4332' }} id="metric-outward-taxable">
              {fmtCurrency(summary?.metrics.outward_taxable)}
            </div>
            <div style={{ fontSize: '12px', color: '#52796f', marginTop: '4px' }}>
              Tax Liability: <strong style={{ color: '#2d6a4f' }}>{fmtCurrency(summary?.metrics.outward_tax)}</strong>
            </div>
          </div>
        </div>

        {/* Card 2: Inward ITC */}
        <div style={{
          backgroundColor: '#ffffff',
          border: '1px solid #d8e2dc',
          borderLeft: '4px solid #d97706',
          borderRadius: '12px',
          padding: '16px 20px',
          boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#52796f', textTransform: 'uppercase' }}>
              Eligible Inward ITC
            </span>
            <div style={{ padding: '4px', borderRadius: '6px', backgroundColor: '#fef3c7' }}>
              <ArrowDownLeft size={16} color="#d97706" />
            </div>
          </div>
          <div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#d97706' }} id="metric-inward-taxable">
              {fmtCurrency(summary?.metrics.inward_taxable)}
            </div>
            <div style={{ fontSize: '12px', color: '#52796f', marginTop: '4px' }}>
              ITC Available: <strong style={{ color: '#b45309' }}>{fmtCurrency(summary?.metrics.inward_itc_tax)}</strong>
            </div>
          </div>
        </div>

        {/* Card 3: Net GST Payable (Cash) */}
        <div style={{
          backgroundColor: '#ffffff',
          border: '1px solid #d8e2dc',
          borderLeft: '4px solid #0284c7',
          borderRadius: '12px',
          padding: '16px 20px',
          boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#52796f', textTransform: 'uppercase' }}>
              Net Cash Tax Payable
            </span>
            <div style={{ padding: '4px', borderRadius: '6px', backgroundColor: '#e0f2fe' }}>
              <TrendingUp size={16} color="#0284c7" />
            </div>
          </div>
          <div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#0284c7' }} id="metric-net-payable">
              {fmtCurrency(summary?.metrics.net_gst_payable)}
            </div>
            <div style={{ fontSize: '12px', color: '#52796f', marginTop: '4px' }}>
              After ITC Set-off in Table 5.1
            </div>
          </div>
        </div>

        {/* Card 4: Accumulated ITC Credit Balance */}
        <div style={{
          backgroundColor: '#ffffff',
          border: '1px solid #d8e2dc',
          borderLeft: '4px solid #10b981',
          borderRadius: '12px',
          padding: '16px 20px',
          boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#52796f', textTransform: 'uppercase' }}>
              ITC Balance Carried Forward
            </span>
            <div style={{ padding: '4px', borderRadius: '6px', backgroundColor: '#dcfce7' }}>
              <CheckCircle2 size={16} color="#10b981" />
            </div>
          </div>
          <div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#10b981' }} id="metric-itc-credit">
              {fmtCurrency(summary?.metrics.itc_credit_balance)}
            </div>
            <div style={{ fontSize: '12px', color: '#52796f', marginTop: '4px' }}>
              Active Electronic Credit Ledger
            </div>
          </div>
        </div>
      </div>

      {/* Filter Toolbar & Presets */}
      <div style={{
        backgroundColor: '#ffffff',
        border: '1px solid #d8e2dc',
        borderRadius: '12px',
        padding: '14px 18px',
        marginBottom: '20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '14px',
        boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
      }}>
        {/* Date Pickers & Presets */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <Calendar size={16} color="#64748b" />
          <input
            id="gst-from-date"
            type="date"
            value={fromDate}
            onChange={e => setFromDate(e.target.value)}
            style={inputStyle}
          />
          <span style={{ color: '#475569', fontSize: '13px' }}>to</span>
          <input
            id="gst-to-date"
            type="date"
            value={toDate}
            onChange={e => setToDate(e.target.value)}
            style={inputStyle}
          />

          {/* Quick Presets */}
          <div style={{ display: 'flex', gap: '6px', marginLeft: '6px' }}>
            <button
              onClick={() => applyPreset('FY2026-27')}
              style={{ padding: '6px 10px', fontSize: '11px', borderRadius: '4px', border: '1px solid #d8e2dc', backgroundColor: '#eef2ef', color: '#1b4332', fontWeight: 600, cursor: 'pointer' }}
            >
              FY 2026-27
            </button>
            <button
              onClick={() => applyPreset('MTD')}
              style={{ padding: '6px 10px', fontSize: '11px', borderRadius: '4px', border: '1px solid #d8e2dc', backgroundColor: '#eef2ef', color: '#1b4332', fontWeight: 600, cursor: 'pointer' }}
            >
              MTD
            </button>
            <button
              onClick={() => applyPreset('Q1')}
              style={{ padding: '6px 10px', fontSize: '11px', borderRadius: '4px', border: '1px solid #d8e2dc', backgroundColor: '#eef2ef', color: '#1b4332', fontWeight: 600, cursor: 'pointer' }}
            >
              Q1
            </button>
            <button
              onClick={() => applyPreset('Q2')}
              style={{ padding: '6px 10px', fontSize: '11px', borderRadius: '4px', border: '1px solid #d8e2dc', backgroundColor: '#eef2ef', color: '#1b4332', fontWeight: 600, cursor: 'pointer' }}
            >
              Q2
            </button>
            <button
              onClick={() => applyPreset('CLEAR')}
              style={{ padding: '6px 10px', fontSize: '11px', borderRadius: '4px', border: '1px solid #d8e2dc', backgroundColor: '#f8faf9', color: '#52796f', cursor: 'pointer' }}
            >
              Clear
            </button>
          </div>

          <button
            id="fetch-gst-returns-btn"
            onClick={fetchAllGstData}
            disabled={isLoading}
            style={{
              padding: '7px 14px',
              backgroundColor: '#1b4332',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginLeft: '8px'
            }}
          >
            <RefreshCw size={13} className={isLoading ? 'spin' : ''} />
            <span>{isLoading ? 'Fetching...' : 'Fetch Returns'}</span>
          </button>
        </div>

        {/* Standard Export Tools */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            id="export-csv-btn"
            onClick={() => exportCurrent('csv')}
            style={exportBtnStyle('#10b981')}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(16,185,129,0.1)' }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent' }}
          >
            <Download size={13} /> CSV
          </button>
          <button
            id="export-excel-btn"
            onClick={() => exportCurrent('excel')}
            style={exportBtnStyle('#3b82f6')}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(59,130,246,0.1)' }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent' }}
          >
            <FileSpreadsheet size={13} /> Excel
          </button>
          <button
            id="export-pdf-btn"
            onClick={() => exportCurrent('pdf')}
            style={exportBtnStyle('#ef4444')}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.1)' }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent' }}
          >
            <FileText size={13} /> PDF
          </button>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div style={{
        display: 'flex',
        gap: '4px',
        marginBottom: '20px',
        borderBottom: '2px solid #d8e2dc'
      }}>
        <button
          id="tab-gstr1"
          onClick={() => setActiveTab('gstr1')}
          style={{
            padding: '12px 24px',
            fontSize: '14px',
            fontWeight: activeTab === 'gstr1' ? 700 : 500,
            border: 'none',
            borderBottom: activeTab === 'gstr1' ? '2px solid #1b4332' : '2px solid transparent',
            backgroundColor: 'transparent',
            color: activeTab === 'gstr1' ? '#1b4332' : '#52796f',
            cursor: 'pointer',
            transition: 'all 0.2s',
            marginBottom: '-1px'
          }}
        >
          GSTR-1 Outward Supplies
        </button>
        <button
          id="tab-gstr2"
          onClick={() => setActiveTab('gstr2')}
          style={{
            padding: '12px 24px',
            fontSize: '14px',
            fontWeight: activeTab === 'gstr2' ? 700 : 500,
            border: 'none',
            borderBottom: activeTab === 'gstr2' ? '2px solid #1b4332' : '2px solid transparent',
            backgroundColor: 'transparent',
            color: activeTab === 'gstr2' ? '#1b4332' : '#52796f',
            cursor: 'pointer',
            transition: 'all 0.2s',
            marginBottom: '-1px'
          }}
        >
          GSTR-2 Inward Supplies (ITC)
        </button>
        <button
          id="tab-gstr3b"
          onClick={() => setActiveTab('gstr3b')}
          style={{
            padding: '12px 24px',
            fontSize: '14px',
            fontWeight: activeTab === 'gstr3b' ? 700 : 500,
            border: 'none',
            borderBottom: activeTab === 'gstr3b' ? '2px solid #1b4332' : '2px solid transparent',
            backgroundColor: 'transparent',
            color: activeTab === 'gstr3b' ? '#1b4332' : '#52796f',
            cursor: 'pointer',
            transition: 'all 0.2s',
            marginBottom: '-1px'
          }}
        >
          GSTR-3B Monthly Consolidated Return
        </button>
      </div>

      {/* ──────────────────────────────────────────────────────────
          TAB 1: GSTR-1 OUTWARD SUPPLIES
          ────────────────────────────────────────────────────────── */}
      {activeTab === 'gstr1' && (
        <div>
          {/* GSTR-1 Sub-tabs */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <button
              id="subtab-b2b"
              onClick={() => setActiveGstr1SubTab('b2b')}
              style={{
                padding: '6px 14px',
                fontSize: '12px',
                fontWeight: 600,
                borderRadius: '6px',
                border: activeGstr1SubTab === 'b2b' ? '1px solid #3b82f6' : '1px solid #334155',
                backgroundColor: activeGstr1SubTab === 'b2b' ? '#1b4332' : '#ffffff',
                color: activeGstr1SubTab === 'b2b' ? '#ffffff' : '#52796f',
                cursor: 'pointer'
              }}
            >
              Table 4: B2B Invoices ({gstr1Data?.b2b?.length || 0})
            </button>
            <button
              id="subtab-b2cs"
              onClick={() => setActiveGstr1SubTab('b2cs')}
              style={{
                padding: '6px 14px',
                fontSize: '12px',
                fontWeight: 600,
                borderRadius: '6px',
                border: activeGstr1SubTab === 'b2cs' ? '1px solid #3b82f6' : '1px solid #334155',
                backgroundColor: activeGstr1SubTab === 'b2cs' ? '#1b4332' : '#ffffff',
                color: activeGstr1SubTab === 'b2cs' ? '#ffffff' : '#52796f',
                cursor: 'pointer'
              }}
            >
              Table 7: B2CS Small ({gstr1Data?.b2cs?.length || 0})
            </button>
            <button
              id="subtab-cdnr"
              onClick={() => setActiveGstr1SubTab('cdnr')}
              style={{
                padding: '6px 14px',
                fontSize: '12px',
                fontWeight: 600,
                borderRadius: '6px',
                border: activeGstr1SubTab === 'cdnr' ? '1px solid #3b82f6' : '1px solid #334155',
                backgroundColor: activeGstr1SubTab === 'cdnr' ? '#1b4332' : '#ffffff',
                color: activeGstr1SubTab === 'cdnr' ? '#ffffff' : '#52796f',
                cursor: 'pointer'
              }}
            >
              Table 9B: CDNR Notes ({gstr1Data?.cdnr?.length || 0})
            </button>
            <button
              id="subtab-hsn"
              onClick={() => setActiveGstr1SubTab('hsn')}
              style={{
                padding: '6px 14px',
                fontSize: '12px',
                fontWeight: 600,
                borderRadius: '6px',
                border: activeGstr1SubTab === 'hsn' ? '1px solid #3b82f6' : '1px solid #334155',
                backgroundColor: activeGstr1SubTab === 'hsn' ? '#1b4332' : '#ffffff',
                color: activeGstr1SubTab === 'hsn' ? '#ffffff' : '#52796f',
                cursor: 'pointer'
              }}
            >
              Table 12: HSN Summary ({gstr1Data?.hsn_summary?.length || 0})
            </button>
            <button
              id="subtab-docs"
              onClick={() => setActiveGstr1SubTab('docs')}
              style={{
                padding: '6px 14px',
                fontSize: '12px',
                fontWeight: 600,
                borderRadius: '6px',
                border: activeGstr1SubTab === 'docs' ? '1px solid #3b82f6' : '1px solid #334155',
                backgroundColor: activeGstr1SubTab === 'docs' ? '#1b4332' : '#ffffff',
                color: activeGstr1SubTab === 'docs' ? '#ffffff' : '#52796f',
                cursor: 'pointer'
              }}
            >
              Table 13: Documents Issued ({gstr1Data?.doc_issues?.length || (gstr1Data as any)?.document_summary?.length || 0})
            </button>
          </div>

          {/* Subtab Table Content */}
          <div style={{
            border: '1px solid #1e293b',
            borderRadius: '10px',
            overflow: 'hidden',
            backgroundColor: '#ffffff'
          }}>
            {activeGstr1SubTab === 'b2b' && (
              <table style={{ width: '100%', borderCollapse: 'collapse' }} id="gst-table-b2b">
                <thead>
                  <tr style={{ backgroundColor: '#f8faf9' }}>
                    {['Invoice No', 'Date', 'Customer', 'GSTIN', 'POS', 'Taxable Amt', 'CGST', 'SGST', 'IGST', 'Total'].map(h => (
                      <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#52796f', textTransform: 'uppercase' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(!gstr1Data?.b2b || gstr1Data.b2b.length === 0) ? (
                    <tr><td colSpan={10} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>No B2B invoices found in this period.</td></tr>
                  ) : (
                    gstr1Data.b2b.map((r, i) => (
                      <tr key={i} style={{ borderBottom: '2px solid #d8e2dc' }}>
                        <td style={{ padding: '10px 14px', fontSize: '13px', color: '#60a5fa', fontWeight: 600 }}>{r.invoice_no}</td>
                        <td style={{ padding: '10px 14px', fontSize: '13px', color: '#52796f' }}>{r.date}</td>
                        <td style={{ padding: '10px 14px', fontSize: '13px', color: '#1f2937' }}>{r.customer}</td>
                        <td style={{ padding: '10px 14px', fontSize: '13px', color: '#374151', fontFamily: 'monospace' }}>{r.gstin}</td>
                        <td style={{ padding: '10px 14px', fontSize: '13px', color: '#52796f' }}>{r.place_of_supply}</td>
                        <td style={{ padding: '10px 14px', fontSize: '13px', color: '#1f2937', textAlign: 'right' }}>{fmtCurrency(r.taxable_amount)}</td>
                        <td style={{ padding: '10px 14px', fontSize: '13px', color: '#52796f', textAlign: 'right' }}>{fmtCurrency(r.cgst)}</td>
                        <td style={{ padding: '10px 14px', fontSize: '13px', color: '#52796f', textAlign: 'right' }}>{fmtCurrency(r.sgst)}</td>
                        <td style={{ padding: '10px 14px', fontSize: '13px', color: '#52796f', textAlign: 'right' }}>{fmtCurrency(r.igst)}</td>
                        <td style={{ padding: '10px 14px', fontSize: '13px', color: '#1b4332', fontWeight: 700, textAlign: 'right' }}>{fmtCurrency(r.total)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {activeGstr1SubTab === 'b2cs' && (
              <table style={{ width: '100%', borderCollapse: 'collapse' }} id="gst-table-b2cs">
                <thead>
                  <tr style={{ backgroundColor: '#f8faf9' }}>
                    {['Invoice No', 'Date', 'Customer / Consumer', 'POS', 'Taxable Amt', 'CGST', 'SGST', 'Total'].map(h => (
                      <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#52796f', textTransform: 'uppercase' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(!gstr1Data?.b2cs || gstr1Data.b2cs.length === 0) ? (
                    <tr><td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>No B2CS transactions in this period.</td></tr>
                  ) : (
                    gstr1Data.b2cs.map((r, i) => (
                      <tr key={i} style={{ borderBottom: '2px solid #d8e2dc' }}>
                        <td style={{ padding: '10px 14px', fontSize: '13px', color: '#60a5fa', fontWeight: 600 }}>{r.invoice_no}</td>
                        <td style={{ padding: '10px 14px', fontSize: '13px', color: '#52796f' }}>{r.date}</td>
                        <td style={{ padding: '10px 14px', fontSize: '13px', color: '#1f2937' }}>{r.customer}</td>
                        <td style={{ padding: '10px 14px', fontSize: '13px', color: '#52796f' }}>{r.place_of_supply}</td>
                        <td style={{ padding: '10px 14px', fontSize: '13px', color: '#1f2937', textAlign: 'right' }}>{fmtCurrency(r.taxable_amount)}</td>
                        <td style={{ padding: '10px 14px', fontSize: '13px', color: '#52796f', textAlign: 'right' }}>{fmtCurrency(r.cgst)}</td>
                        <td style={{ padding: '10px 14px', fontSize: '13px', color: '#52796f', textAlign: 'right' }}>{fmtCurrency(r.sgst)}</td>
                        <td style={{ padding: '10px 14px', fontSize: '13px', color: '#1b4332', fontWeight: 700, textAlign: 'right' }}>{fmtCurrency(r.total)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {activeGstr1SubTab === 'cdnr' && (
              <table style={{ width: '100%', borderCollapse: 'collapse' }} id="gst-table-cdnr">
                <thead>
                  <tr style={{ backgroundColor: '#f8faf9' }}>
                    {['Note No', 'Date', 'Customer', 'GSTIN', 'Orig Invoice', 'Taxable Amt', 'CGST', 'SGST', 'Total'].map(h => (
                      <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#52796f', textTransform: 'uppercase' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(!gstr1Data?.cdnr || gstr1Data.cdnr.length === 0) ? (
                    <tr><td colSpan={9} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>No Credit/Debit Notes registered in this period.</td></tr>
                  ) : (
                    gstr1Data.cdnr.map((r, i) => (
                      <tr key={i} style={{ borderBottom: '2px solid #d8e2dc' }}>
                        <td style={{ padding: '10px 14px', fontSize: '13px', color: '#f87171', fontWeight: 600 }}>{r.note_number}</td>
                        <td style={{ padding: '10px 14px', fontSize: '13px', color: '#52796f' }}>{r.date}</td>
                        <td style={{ padding: '10px 14px', fontSize: '13px', color: '#1f2937' }}>{r.customer}</td>
                        <td style={{ padding: '10px 14px', fontSize: '13px', color: '#374151', fontFamily: 'monospace' }}>{r.gstin}</td>
                        <td style={{ padding: '10px 14px', fontSize: '13px', color: '#52796f' }}>{r.original_invoice}</td>
                        <td style={{ padding: '10px 14px', fontSize: '13px', color: '#1f2937', textAlign: 'right' }}>{fmtCurrency(r.taxable_amount)}</td>
                        <td style={{ padding: '10px 14px', fontSize: '13px', color: '#52796f', textAlign: 'right' }}>{fmtCurrency(r.cgst)}</td>
                        <td style={{ padding: '10px 14px', fontSize: '13px', color: '#52796f', textAlign: 'right' }}>{fmtCurrency(r.sgst)}</td>
                        <td style={{ padding: '10px 14px', fontSize: '13px', color: '#f87171', fontWeight: 700, textAlign: 'right' }}>{fmtCurrency(r.total)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {activeGstr1SubTab === 'hsn' && (
              <table style={{ width: '100%', borderCollapse: 'collapse' }} id="gst-table-hsn">
                <thead>
                  <tr style={{ backgroundColor: '#f8faf9' }}>
                    {['HSN Code', 'Description', 'UQC', 'Total Qty', 'Total Value', 'Taxable Value', 'Central Tax', 'State Tax', 'Integrated Tax'].map(h => (
                      <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#52796f', textTransform: 'uppercase' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(!gstr1Data?.hsn_summary || gstr1Data.hsn_summary.length === 0) ? (
                    <tr><td colSpan={9} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>No HSN summary data available.</td></tr>
                  ) : (
                    gstr1Data.hsn_summary.map((r, i) => (
                      <tr key={i} style={{ borderBottom: '2px solid #d8e2dc' }}>
                        <td style={{ padding: '10px 14px', fontSize: '13px', color: '#a78bfa', fontWeight: 700, fontFamily: 'monospace' }}>{r.hsn_code}</td>
                        <td style={{ padding: '10px 14px', fontSize: '13px', color: '#1f2937' }}>{r.description}</td>
                        <td style={{ padding: '10px 14px', fontSize: '13px', color: '#52796f' }}>{r.uqc}</td>
                        <td style={{ padding: '10px 14px', fontSize: '13px', color: '#1f2937', textAlign: 'right' }}>{r.total_quantity}</td>
                        <td style={{ padding: '10px 14px', fontSize: '13px', color: '#1f2937', textAlign: 'right' }}>{fmtCurrency(r.total_value)}</td>
                        <td style={{ padding: '10px 14px', fontSize: '13px', color: '#1b4332', fontWeight: 600, textAlign: 'right' }}>{fmtCurrency(r.taxable_value)}</td>
                        <td style={{ padding: '10px 14px', fontSize: '13px', color: '#52796f', textAlign: 'right' }}>{fmtCurrency(r.central_tax)}</td>
                        <td style={{ padding: '10px 14px', fontSize: '13px', color: '#52796f', textAlign: 'right' }}>{fmtCurrency(r.state_tax)}</td>
                        <td style={{ padding: '10px 14px', fontSize: '13px', color: '#52796f', textAlign: 'right' }}>{fmtCurrency(r.integrated_tax)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {activeGstr1SubTab === 'docs' && (
              <table style={{ width: '100%', borderCollapse: 'collapse' }} id="gst-table-docs">
                <thead>
                  <tr style={{ backgroundColor: '#f8faf9' }}>
                    {['Nature of Document', 'From Serial No', 'To Serial No', 'Total Number', 'Cancelled', 'Net Issued'].map(h => (
                      <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#52796f', textTransform: 'uppercase' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(!gstr1Data?.doc_issues || gstr1Data.doc_issues.length === 0) ? (
                    <tr><td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>No document serial sequences found.</td></tr>
                  ) : (
                    gstr1Data.doc_issues.map((r, i) => (
                      <tr key={i} style={{ borderBottom: '2px solid #d8e2dc' }}>
                        <td style={{ padding: '10px 14px', fontSize: '13px', color: '#1f2937', fontWeight: 600 }}>{r.doc_type}</td>
                        <td style={{ padding: '10px 14px', fontSize: '13px', color: '#60a5fa', fontFamily: 'monospace' }}>{r.from_serial}</td>
                        <td style={{ padding: '10px 14px', fontSize: '13px', color: '#60a5fa', fontFamily: 'monospace' }}>{r.to_serial}</td>
                        <td style={{ padding: '10px 14px', fontSize: '13px', color: '#1f2937', textAlign: 'right' }}>{r.total_count}</td>
                        <td style={{ padding: '10px 14px', fontSize: '13px', color: '#f87171', textAlign: 'right' }}>{r.cancelled}</td>
                        <td style={{ padding: '10px 14px', fontSize: '13px', color: '#34d399', fontWeight: 700, textAlign: 'right' }}>{r.net_issued}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────
          TAB 2: GSTR-2 INWARD SUPPLIES (ITC)
          ────────────────────────────────────────────────────────── */}
      {activeTab === 'gstr2' && (
        <div>
          {/* Summary Banner for ITC */}
          <div style={{
            padding: '16px 20px',
            backgroundColor: 'rgba(16,185,129,0.06)',
            border: '1px solid rgba(16,185,129,0.2)',
            borderRadius: '8px',
            marginBottom: '20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#34d399' }}>
                GSTR-2 Input Tax Credit (ITC) Matching
              </div>
              <div style={{ fontSize: '12px', color: '#52796f', marginTop: '2px' }}>
                Reconciles supplier tax invoices against eligible credit in Electronic Credit Ledger
              </div>
            </div>
            <div style={{ display: 'flex', gap: '24px' }}>
              <div>
                <span style={{ fontSize: '11px', color: '#52796f' }}>Gross ITC Available: </span>
                <strong style={{ color: '#86efac' }}>{fmtCurrency(gstr2Data?.summary.gross_itc_available)}</strong>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: '#52796f' }}>Debit Note Reversals: </span>
                <strong style={{ color: '#f87171' }}>{fmtCurrency(gstr2Data?.summary.itc_reversed_debit_notes)}</strong>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: '#52796f' }}>Net Eligible ITC: </span>
                <strong style={{ color: '#1b4332', fontSize: '14px' }}>{fmtCurrency(gstr2Data?.summary.net_eligible_itc)}</strong>
              </div>
            </div>
          </div>

          {/* Inward Purchases Table */}
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#1f2937', marginBottom: '10px' }}>
            Inward Taxable Supplies (Purchases)
          </h3>
          <div style={{
            border: '1px solid #1e293b',
            borderRadius: '10px',
            overflow: 'hidden',
            backgroundColor: '#ffffff',
            marginBottom: '24px'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }} id="gst-table-gstr2">
              <thead>
                <tr style={{ backgroundColor: '#f8faf9' }}>
                  {['Supplier Invoice', 'Internal Voucher', 'Date', 'Supplier Name', 'GSTIN', 'Taxable Amt', 'CGST', 'SGST', 'Total', 'ITC Eligibility'].map(h => (
                    <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#52796f', textTransform: 'uppercase' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(!gstr2Data?.inward_supplies || gstr2Data.inward_supplies.length === 0) ? (
                  <tr><td colSpan={10} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>No inward purchase records found.</td></tr>
                ) : (
                  gstr2Data.inward_supplies.map((r, i) => (
                    <tr key={i} style={{ borderBottom: '2px solid #d8e2dc' }}>
                      <td style={{ padding: '10px 14px', fontSize: '13px', color: '#60a5fa', fontWeight: 600 }}>{r.invoice_no}</td>
                      <td style={{ padding: '10px 14px', fontSize: '13px', color: '#52796f', fontFamily: 'monospace' }}>{r.internal_voucher_no}</td>
                      <td style={{ padding: '10px 14px', fontSize: '13px', color: '#52796f' }}>{r.date}</td>
                      <td style={{ padding: '10px 14px', fontSize: '13px', color: '#1f2937' }}>{r.supplier}</td>
                      <td style={{ padding: '10px 14px', fontSize: '13px', color: '#374151', fontFamily: 'monospace' }}>{r.gstin}</td>
                      <td style={{ padding: '10px 14px', fontSize: '13px', color: '#1f2937', textAlign: 'right' }}>{fmtCurrency(r.taxable_amount)}</td>
                      <td style={{ padding: '10px 14px', fontSize: '13px', color: '#52796f', textAlign: 'right' }}>{fmtCurrency(r.cgst)}</td>
                      <td style={{ padding: '10px 14px', fontSize: '13px', color: '#52796f', textAlign: 'right' }}>{fmtCurrency(r.sgst)}</td>
                      <td style={{ padding: '10px 14px', fontSize: '13px', color: '#1b4332', fontWeight: 700, textAlign: 'right' }}>{fmtCurrency(r.total)}</td>
                      <td style={{ padding: '10px 14px', fontSize: '12px' }}>
                        <span style={{ padding: '3px 8px', borderRadius: '4px', backgroundColor: 'rgba(16,185,129,0.15)', color: '#34d399', fontWeight: 600 }}>
                          {r.itc_eligibility}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Debit Notes / ITC Reversals Section */}
          {gstr2Data?.itc_reversals && gstr2Data.itc_reversals.length > 0 && (
            <div>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#f87171', marginBottom: '10px' }}>
                Debit Notes (ITC Reversals / Purchase Returns)
              </h3>
              <div style={{
                border: '1px solid #1e293b',
                borderRadius: '10px',
                overflow: 'hidden',
                backgroundColor: '#ffffff'
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }} id="gst-table-gstr2-reversals">
                  <thead>
                    <tr style={{ backgroundColor: '#f8faf9' }}>
                      {['Note No', 'Date', 'Supplier', 'GSTIN', 'Taxable Amt', 'CGST', 'SGST', 'Total', 'ITC Impact'].map(h => (
                        <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#52796f', textTransform: 'uppercase' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {gstr2Data.itc_reversals.map((r, i) => (
                      <tr key={i} style={{ borderBottom: '2px solid #d8e2dc' }}>
                        <td style={{ padding: '10px 14px', fontSize: '13px', color: '#f87171', fontWeight: 600 }}>{r.invoice_no}</td>
                        <td style={{ padding: '10px 14px', fontSize: '13px', color: '#52796f' }}>{r.date}</td>
                        <td style={{ padding: '10px 14px', fontSize: '13px', color: '#1f2937' }}>{r.supplier}</td>
                        <td style={{ padding: '10px 14px', fontSize: '13px', color: '#374151', fontFamily: 'monospace' }}>{r.gstin}</td>
                        <td style={{ padding: '10px 14px', fontSize: '13px', color: '#1f2937', textAlign: 'right' }}>{fmtCurrency(r.taxable_amount)}</td>
                        <td style={{ padding: '10px 14px', fontSize: '13px', color: '#52796f', textAlign: 'right' }}>{fmtCurrency(r.cgst)}</td>
                        <td style={{ padding: '10px 14px', fontSize: '13px', color: '#52796f', textAlign: 'right' }}>{fmtCurrency(r.sgst)}</td>
                        <td style={{ padding: '10px 14px', fontSize: '13px', color: '#f87171', fontWeight: 700, textAlign: 'right' }}>{fmtCurrency(r.total)}</td>
                        <td style={{ padding: '10px 14px', fontSize: '12px' }}>
                          <span style={{ padding: '3px 8px', borderRadius: '4px', backgroundColor: 'rgba(239,68,68,0.15)', color: '#f87171', fontWeight: 600 }}>
                            {r.itc_eligibility}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────
          TAB 3: GSTR-3B MONTHLY CONSOLIDATED RETURN
          ────────────────────────────────────────────────────────── */}
      {activeTab === 'gstr3b' && (
        <div>
          {/* Table 3.1: Details of Outward Supplies */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <Layers size={16} color="#3b82f6" />
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#1f2937', margin: 0 }}>
                3.1 Details of Outward Supplies and Inward Supplies Liable to Reverse Charge
              </h3>
            </div>
            <div style={{
              border: '1px solid #1e293b',
              borderRadius: '10px',
              overflow: 'hidden',
              backgroundColor: '#ffffff'
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }} id="gst-table-gstr3b-31">
                <thead>
                  <tr style={{ backgroundColor: '#f8faf9' }}>
                    {['Nature of Supplies', 'Total Taxable Value', 'Integrated Tax (IGST)', 'Central Tax (CGST)', 'State/UT Tax (SGST)', 'Cess'].map(h => (
                      <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#52796f', textTransform: 'uppercase' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(!gstr3bData?.table_3_1_outward || gstr3bData.table_3_1_outward.length === 0) ? (
                    <tr><td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>No outward supply records.</td></tr>
                  ) : (
                    gstr3bData.table_3_1_outward.map((r, i) => (
                      <tr key={i} style={{ borderBottom: '2px solid #d8e2dc' }}>
                        <td style={{ padding: '10px 14px', fontSize: '13px', color: '#1f2937', fontWeight: 500 }}>{r.nature_of_supplies}</td>
                        <td style={{ padding: '10px 14px', fontSize: '13px', color: '#1b4332', fontWeight: 700, textAlign: 'right' }}>{fmtCurrency(r.taxable_value)}</td>
                        <td style={{ padding: '10px 14px', fontSize: '13px', color: '#52796f', textAlign: 'right' }}>{fmtCurrency(r.igst)}</td>
                        <td style={{ padding: '10px 14px', fontSize: '13px', color: '#93c5fd', textAlign: 'right' }}>{fmtCurrency(r.cgst)}</td>
                        <td style={{ padding: '10px 14px', fontSize: '13px', color: '#93c5fd', textAlign: 'right' }}>{fmtCurrency(r.sgst)}</td>
                        <td style={{ padding: '10px 14px', fontSize: '13px', color: '#64748b', textAlign: 'right' }}>{fmtCurrency(r.cess)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Table 4: Eligible ITC */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <CheckCircle2 size={16} color="#10b981" />
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#1f2937', margin: 0 }}>
                4. Eligible Input Tax Credit (ITC)
              </h3>
            </div>
            <div style={{
              border: '1px solid #1e293b',
              borderRadius: '10px',
              overflow: 'hidden',
              backgroundColor: '#ffffff'
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }} id="gst-table-gstr3b-4">
                <thead>
                  <tr style={{ backgroundColor: '#f8faf9' }}>
                    {['Details', 'Integrated Tax (IGST)', 'Central Tax (CGST)', 'State/UT Tax (SGST)', 'Cess'].map(h => (
                      <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#52796f', textTransform: 'uppercase' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(!gstr3bData?.table_4_itc || gstr3bData.table_4_itc.length === 0) ? (
                    <tr><td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>No ITC records.</td></tr>
                  ) : (
                    gstr3bData.table_4_itc.map((r, i) => (
                      <tr key={i} style={{ borderBottom: '2px solid #d8e2dc' }}>
                        <td style={{ padding: '10px 14px', fontSize: '13px', color: '#1f2937', fontWeight: 500 }}>{r.details}</td>
                        <td style={{ padding: '10px 14px', fontSize: '13px', color: '#52796f', textAlign: 'right' }}>{fmtCurrency(r.igst)}</td>
                        <td style={{ padding: '10px 14px', fontSize: '13px', color: '#86efac', textAlign: 'right' }}>{fmtCurrency(r.cgst)}</td>
                        <td style={{ padding: '10px 14px', fontSize: '13px', color: '#86efac', textAlign: 'right' }}>{fmtCurrency(r.sgst)}</td>
                        <td style={{ padding: '10px 14px', fontSize: '13px', color: '#64748b', textAlign: 'right' }}>{fmtCurrency(r.cess)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Table 5.1: Payment of Tax */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <TrendingUp size={16} color="#f59e0b" />
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#1f2937', margin: 0 }}>
                5.1 Payment of Tax (Liability vs ITC Set-off vs Cash Payable)
              </h3>
            </div>
            <div style={{
              border: '1px solid #1e293b',
              borderRadius: '10px',
              overflow: 'hidden',
              backgroundColor: '#ffffff'
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }} id="gst-table-gstr3b-51">
                <thead>
                  <tr style={{ backgroundColor: '#f8faf9' }}>
                    {['Tax Description', 'Total Tax Payable', 'Paid Through ITC (Set-off)', 'Tax Paid in Cash (Challan)'].map(h => (
                      <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#52796f', textTransform: 'uppercase' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(!gstr3bData?.table_5_1_payment || gstr3bData.table_5_1_payment.length === 0) ? (
                    <tr><td colSpan={4} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>No tax payment records.</td></tr>
                  ) : (
                    gstr3bData.table_5_1_payment.map((r, i) => (
                      <tr key={i} style={{ borderBottom: '2px solid #d8e2dc' }}>
                        <td style={{ padding: '10px 14px', fontSize: '13px', color: '#1f2937', fontWeight: 600 }}>{r.description}</td>
                        <td style={{ padding: '10px 14px', fontSize: '13px', color: '#f87171', fontWeight: 700, textAlign: 'right' }}>{fmtCurrency(r.tax_payable)}</td>
                        <td style={{ padding: '10px 14px', fontSize: '13px', color: '#34d399', fontWeight: 600, textAlign: 'right' }}>{fmtCurrency(r.paid_through_itc)}</td>
                        <td style={{ padding: '10px 14px', fontSize: '13px', color: '#fbbf24', fontWeight: 700, textAlign: 'right' }}>{fmtCurrency(r.tax_paid_in_cash)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
