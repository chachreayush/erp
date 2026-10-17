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
  ShieldCheck,
  AlertTriangle,
  Check,
  X,
  Search,
  SlidersHorizontal,
  Send,
  UploadCloud,
  Copy,
  Filter,
  CheckSquare,
  Square,
  MessageSquare
} from 'lucide-react'
import {
  apiGetGstSummary,
  apiGetGstr1,
  apiGetGstr2,
  apiGetGstr3b,
  apiGetGstr1Json,
  apiGetGstr2bSummary,
  apiGetGstr2bRecords,
  apiPostGstr2bAction,
  apiImportGstr2b,
  GstSummaryResponse,
  Gstr1Response,
  Gstr2Response,
  Gstr3bResponse,
  Gstr2bSummaryResponse,
  Gstr2bRecord
} from '../../lib/api'
import { exportToCSV, exportToExcel, exportToPDF } from '../../lib/exportUtils'

type GstTab = 'gstr1' | 'gstr2' | 'gstr3b' | 'gstr2b'
type Gstr1SubTab = 'b2b' | 'b2cs' | 'cdnr' | 'hsn' | 'docs'
type ReconCategoryTab = 'ALL' | 'MATCHED' | 'TAX_MISMATCH' | 'MISSING_IN_2B' | 'MISSING_IN_BOOKS'

export default function GstReports() {
  useReturnNavigation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<GstTab>('gstr1')
  const [activeGstr1SubTab, setActiveGstr1SubTab] = useState<Gstr1SubTab>('b2b')
  const [fromDate, setFromDate] = useState('2026-04-01')
  const [toDate, setToDate] = useState('2027-03-31')
  const [isLoading, setIsLoading] = useState(false)
  const [notification, setNotification] = useState<string | null>(null)

  // Data states for GSTR-1, 2, 3B
  const [summary, setSummary] = useState<GstSummaryResponse | null>(null)
  const [gstr1Data, setGstr1Data] = useState<Gstr1Response | null>(null)
  const [gstr2Data, setGstr2Data] = useState<Gstr2Response | null>(null)
  const [gstr3bData, setGstr3bData] = useState<Gstr3bResponse | null>(null)

  // GSTR-2B Reconciliation states
  const [reconSummary, setReconSummary] = useState<Gstr2bSummaryResponse | null>(null)
  const [reconRecords, setReconRecords] = useState<Gstr2bRecord[]>([])
  const [reconTolerance, setReconTolerance] = useState<number>(10.0)
  const [reconStateCode, setReconStateCode] = useState<string>('ALL')
  const [reconCategory, setReconCategory] = useState<ReconCategoryTab>('ALL')
  const [reconSearch, setReconSearch] = useState<string>('')
  const [selectedReconIds, setSelectedReconIds] = useState<string[]>([])
  const [dunningModalOpen, setDunningModalOpen] = useState<boolean>(false)
  const [selectedDunningRecord, setSelectedDunningRecord] = useState<Gstr2bRecord | null>(null)
  const [ingestModalOpen, setIngestModalOpen] = useState<boolean>(false)
  const [ingestJsonInput, setIngestJsonInput] = useState<string>('')
  const [isActionLoading, setIsActionLoading] = useState<boolean>(false)

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

  const fetchReconciliationData = async () => {
    try {
      const [sumRes, recsRes] = await Promise.all([
        apiGetGstr2bSummary(reconTolerance, reconStateCode !== 'ALL' ? reconStateCode : undefined),
        apiGetGstr2bRecords({
          tolerance: reconTolerance,
          state_code: reconStateCode !== 'ALL' ? reconStateCode : undefined,
          category: reconCategory !== 'ALL' ? reconCategory : undefined,
          search: reconSearch || undefined
        })
      ])
      setReconSummary(sumRes)
      setReconRecords(recsRes)
    } catch (err) {
      console.error('Failed to load GSTR-2B reconciliation:', err)
      showNotification('Failed to load GSTR-2B statement data.')
    }
  }

  useEffect(() => {
    fetchAllGstData()
    fetchReconciliationData()
  }, [])

  useEffect(() => {
    fetchReconciliationData()
  }, [reconTolerance, reconStateCode, reconCategory, reconSearch])

  // Global hotkeys: [F1] GSTR-1, [F2] GSTR-2, [F3] GSTR-3B, [F5] GSTR-2B
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F1') { e.preventDefault(); setActiveTab('gstr1'); }
      else if (e.key === 'F2') { e.preventDefault(); setActiveTab('gstr2'); }
      else if (e.key === 'F3') { e.preventDefault(); setActiveTab('gstr3b'); }
      else if (e.key === 'F5') { e.preventDefault(); setActiveTab('gstr2b'); }
      else if (e.key === 'Escape') {
        if (dunningModalOpen) { setDunningModalOpen(false); }
        else if (ingestModalOpen) { setIngestModalOpen(false); }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dunningModalOpen, ingestModalOpen]);


  const handleSelectAllRecon = (checked: boolean) => {
    if (checked) {
      setSelectedReconIds(reconRecords.map(r => r.id))
    } else {
      setSelectedReconIds([])
    }
  }

  const handleToggleReconRow = (id: string) => {
    setSelectedReconIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const handleReconAction = async (ids: string[], action: string, remarks?: string) => {
    if (!ids || ids.length === 0) {
      showNotification('Please select at least one record to update.')
      return
    }
    setIsActionLoading(true)
    try {
      const res = await apiPostGstr2bAction(ids, action, remarks)
      showNotification(res.message || `Updated ${res.updated_records} records to ${action}`)
      setSelectedReconIds([])
      await fetchReconciliationData()
    } catch (err) {
      console.error('Reconciliation action failed:', err)
      showNotification('Failed to execute reconciliation action.')
    } finally {
      setIsActionLoading(false)
    }
  }

  const handleBulkClaimItc = async () => {
    if (selectedReconIds.length === 0) {
      showNotification('Select records to approve ITC.')
      return
    }
    await handleReconAction(selectedReconIds, 'CLAIM_ITC', 'Bulk approved for GSTR-3B Table 4(A)(5)')
  }

  const handleOpenDunning = (record: Gstr2bRecord) => {
    setSelectedDunningRecord(record)
    setDunningModalOpen(true)
  }

  const handleIngest2bSubmit = async () => {
    if (!ingestJsonInput.trim()) {
      showNotification('Please paste portal GSTR-2B JSON payload.')
      return
    }
    setIsActionLoading(true)
    try {
      const parsed = JSON.parse(ingestJsonInput)
      const res = await apiImportGstr2b({ portal_json: parsed })
      showNotification(res.message || `Successfully ingested ${res.imported_records} GSTR-2B records.`)
      setIngestModalOpen(false)
      setIngestJsonInput('')
      await fetchReconciliationData()
    } catch (err: any) {
      console.error('Ingest failed:', err)
      showNotification('Invalid JSON or ingestion error: ' + (err.message || 'Check payload format'))
    } finally {
      setIsActionLoading(false)
    }
  }

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
    } else if (activeTab === 'gstr3b') {
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
    } else {
      return {
        data: reconRecords.map(r => ({
          status: r.category,
          supplier: r.supplier_name,
          gstin: r.supplier_gstin,
          inv_books: r.books?.supplier_inv_no || r.books?.invoice_no || '-',
          inv_2b: r.gstr2b?.invoice_no || '-',
          date_books: r.books?.date || '-',
          date_2b: r.gstr2b?.date || '-',
          taxable_books: r.books?.taxable || 0,
          taxable_2b: r.gstr2b?.taxable || 0,
          tax_books: r.books?.total_tax || 0,
          tax_2b: r.gstr2b?.total_tax || 0,
          tax_diff: r.diff?.tax_diff || 0,
          action: r.status
        })),
        columns: [
          { header: 'Match Status', key: 'status' },
          { header: 'Supplier', key: 'supplier' },
          { header: 'GSTIN', key: 'gstin' },
          { header: 'Inv No (Books)', key: 'inv_books' },
          { header: 'Inv No (2B)', key: 'inv_2b' },
          { header: 'Date (Books)', key: 'date_books' },
          { header: 'Date (2B)', key: 'date_2b' },
          { header: 'Taxable (Books)', key: 'taxable_books' },
          { header: 'Taxable (2B)', key: 'taxable_2b' },
          { header: 'Tax (Books)', key: 'tax_books' },
          { header: 'Tax (2B)', key: 'tax_2b' },
          { header: 'Tax Diff', key: 'tax_diff' },
          { header: 'ITC Action', key: 'action' }
        ],
        name: 'GSTR2B_ITC_Reconciliation'
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
        <button
          id="tab-gstr2b"
          onClick={() => setActiveTab('gstr2b')}
          style={{
            padding: '12px 24px',
            fontSize: '14px',
            fontWeight: activeTab === 'gstr2b' ? 700 : 500,
            border: 'none',
            borderBottom: activeTab === 'gstr2b' ? '2px solid #1b4332' : '2px solid transparent',
            backgroundColor: 'transparent',
            color: activeTab === 'gstr2b' ? '#1b4332' : '#52796f',
            cursor: 'pointer',
            transition: 'all 0.2s',
            marginBottom: '-1px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <span>GSTR-2B ITC Matching Engine</span>
          <span style={{
            fontSize: '10px',
            fontWeight: 800,
            backgroundColor: activeTab === 'gstr2b' ? '#2d6a4f' : '#d8e2dc',
            color: activeTab === 'gstr2b' ? '#ffffff' : '#1b4332',
            padding: '2px 6px',
            borderRadius: '4px'
          }}>
            [F5] Sec 16(2)(aa)
          </span>
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

      {/* ──────────────────────────────────────────────────────────
          TAB 4: GSTR-2B AUTO-DRAFTED ITC RECONCILIATION WORKBENCH
          ────────────────────────────────────────────────────────── */}
      {activeTab === 'gstr2b' && (
        <div id="gstr2b-workbench" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Telemetry 4 Scorecards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '16px'
          }}>
            {/* Scorecard 1: Total ITC in GSTR-2B */}
            <div style={{
              backgroundColor: '#ffffff',
              border: '1px solid #d8e2dc',
              borderLeft: '4px solid #1b4332',
              borderRadius: '12px',
              padding: '16px 20px',
              boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#52796f', textTransform: 'uppercase' }}>
                  Total ITC in GSTR-2B
                </span>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#1b4332', backgroundColor: '#eef2ef', padding: '2px 8px', borderRadius: '4px' }}>
                  Portal Auto-Drafted
                </span>
              </div>
              <div id="metric-2b-total-itc" style={{ fontSize: '22px', fontWeight: 800, color: '#1b4332' }}>
                {fmtCurrency(reconSummary?.metrics.total_2b_available_itc)}
              </div>
              <div style={{ fontSize: '12px', color: '#52796f', marginTop: '4px' }}>
                {reconSummary?.counts.total_2b_entries || 0} Inward Portal Invoices Received
              </div>
            </div>

            {/* Scorecard 2: Reconciled Safe ITC */}
            <div style={{
              backgroundColor: '#ffffff',
              border: '1px solid #d8e2dc',
              borderLeft: '4px solid #2d6a4f',
              borderRadius: '12px',
              padding: '16px 20px',
              boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#52796f', textTransform: 'uppercase' }}>
                  Safe & Claimable ITC
                </span>
                <span id="metric-2b-match-ratio" style={{ fontSize: '11px', fontWeight: 800, color: '#15803d', backgroundColor: '#dcfce7', padding: '2px 8px', borderRadius: '4px' }}>
                  {reconSummary?.metrics.match_ratio_percent.toFixed(1) || '0.0'}% Matched
                </span>
              </div>
              <div id="metric-2b-safe-itc" style={{ fontSize: '22px', fontWeight: 800, color: '#2d6a4f' }}>
                {fmtCurrency(reconSummary?.metrics.reconciled_safe_itc)}
              </div>
              <div style={{ fontSize: '12px', color: '#52796f', marginTop: '4px' }}>
                {reconSummary?.counts.matched || 0} Perfect Matches (Sec 16(2)(aa) Cleared)
              </div>
            </div>

            {/* Scorecard 3: At-Risk ITC */}
            <div style={{
              backgroundColor: '#ffffff',
              border: '1px solid #d8e2dc',
              borderLeft: '4px solid #dc2626',
              borderRadius: '12px',
              padding: '16px 20px',
              boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#52796f', textTransform: 'uppercase' }}>
                  At-Risk Blocked ITC
                </span>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#b91c1c', backgroundColor: '#fee2e2', padding: '2px 8px', borderRadius: '4px' }}>
                  Missing / Mismatched
                </span>
              </div>
              <div id="metric-2b-at-risk-itc" style={{ fontSize: '22px', fontWeight: 800, color: '#dc2626' }}>
                {fmtCurrency(reconSummary?.metrics.at_risk_itc_exposure)}
              </div>
              <div style={{ fontSize: '12px', color: '#52796f', marginTop: '4px' }}>
                {reconSummary?.counts.missing_in_2b || 0} Invoices Missing in Portal + {reconSummary?.counts.tax_mismatch || 0} Mismatched
              </div>
            </div>

            {/* Scorecard 4: Unclaimed Credit in Books */}
            <div style={{
              backgroundColor: '#ffffff',
              border: '1px solid #d8e2dc',
              borderLeft: '4px solid #d97706',
              borderRadius: '12px',
              padding: '16px 20px',
              boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#52796f', textTransform: 'uppercase' }}>
                  Unclaimed Credit in 2B
                </span>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#b45309', backgroundColor: '#fef3c7', padding: '2px 8px', borderRadius: '4px' }}>
                  Omission in Books
                </span>
              </div>
              <div id="metric-2b-unclaimed-itc" style={{ fontSize: '22px', fontWeight: 800, color: '#d97706' }}>
                {fmtCurrency(reconSummary?.metrics.unclaimed_itc_credit)}
              </div>
              <div style={{ fontSize: '12px', color: '#52796f', marginTop: '4px' }}>
                {reconSummary?.counts.missing_in_books || 0} Supplier Invoices Unrecorded in Ledger
              </div>
            </div>
          </div>

          {/* Workbench Controls & Filter Bar */}
          <div style={{
            backgroundColor: '#ffffff',
            border: '1px solid #d8e2dc',
            borderRadius: '12px',
            padding: '16px 20px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px'
          }}>
            {/* Top Row: Category Tabs & Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              {/* Category Pills */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {(
                  [
                    { id: 'ALL', label: 'All Records', count: (reconSummary?.counts.matched || 0) + (reconSummary?.counts.tax_mismatch || 0) + (reconSummary?.counts.missing_in_2b || 0) + (reconSummary?.counts.missing_in_books || 0), color: '#1b4332', bg: '#eef2ef' },
                    { id: 'MATCHED', label: 'Matched (Safe)', count: reconSummary?.counts.matched || 0, color: '#2d6a4f', bg: '#dcfce7' },
                    { id: 'TAX_MISMATCH', label: 'Tax Mismatch', count: reconSummary?.counts.tax_mismatch || 0, color: '#b45309', bg: '#fef3c7' },
                    { id: 'MISSING_IN_2B', label: 'Missing in 2B', count: reconSummary?.counts.missing_in_2b || 0, color: '#b91c1c', bg: '#fee2e2' },
                    { id: 'MISSING_IN_BOOKS', label: 'Missing in Books', count: reconSummary?.counts.missing_in_books || 0, color: '#6d28d9', bg: '#ede9fe' }
                  ] as const
                ).map(tab => (
                  <button
                    key={tab.id}
                    id={`filter-recon-${tab.id.toLowerCase()}`}
                    onClick={() => setReconCategory(tab.id as ReconCategoryTab)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      border: reconCategory === tab.id ? '2px solid #1b4332' : '1px solid #d8e2dc',
                      backgroundColor: reconCategory === tab.id ? '#1b4332' : '#ffffff',
                      color: reconCategory === tab.id ? '#ffffff' : '#1f2937',
                      transition: 'all 0.15s'
                    }}
                  >
                    <span>{tab.label}</span>
                    <span style={{
                      fontSize: '10px',
                      fontWeight: 800,
                      padding: '1px 6px',
                      borderRadius: '10px',
                      backgroundColor: reconCategory === tab.id ? 'rgba(255,255,255,0.2)' : (tab.bg || '#eef2ef'),
                      color: reconCategory === tab.id ? '#ffffff' : (tab.color || '#1b4332')
                    }}>
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Action Buttons: Ingest 2B & Bulk Approve */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  id="btn-open-ingest-2b"
                  onClick={() => setIngestModalOpen(true)}
                  style={{
                    padding: '8px 14px',
                    backgroundColor: '#ffffff',
                    color: '#1b4332',
                    border: '1px solid #2d6a4f',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <UploadCloud size={14} /> Import Portal GSTR-2B
                </button>
                <button
                  id="btn-bulk-approve-itc"
                  onClick={handleBulkClaimItc}
                  disabled={selectedReconIds.length === 0 || isActionLoading}
                  style={{
                    padding: '8px 14px',
                    backgroundColor: selectedReconIds.length > 0 ? '#1b4332' : '#e2e8f0',
                    color: selectedReconIds.length > 0 ? '#ffffff' : '#94a3b8',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: selectedReconIds.length > 0 ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <CheckSquare size={14} /> Approve ITC ({selectedReconIds.length})
                </button>
              </div>
            </div>

            {/* Bottom Row: Search, Multi-State Filter & Tolerance Switcher */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', paddingTop: '10px', borderTop: '1px solid #f1f5f3' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '280px' }}>
                <div style={{ position: 'relative', flex: 1, maxWidth: '360px' }}>
                  <Search size={14} color="#64748b" style={{ position: 'absolute', left: '10px', top: '10px' }} />
                  <input
                    id="input-recon-search"
                    type="text"
                    placeholder="Search by Supplier, GSTIN, Invoice Number..."
                    value={reconSearch}
                    onChange={e => setReconSearch(e.target.value)}
                    style={{
                      ...inputStyle,
                      paddingLeft: '32px',
                      width: '100%',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                {/* State Code Filter */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#52796f' }}>GSTIN State:</span>
                  <select
                    id="select-recon-state"
                    value={reconStateCode}
                    onChange={e => setReconStateCode(e.target.value)}
                    style={{ ...inputStyle, padding: '7px 10px', fontWeight: 600 }}
                  >
                    <option value="ALL">All States ({reconSummary?.available_states.length || 0})</option>
                    {reconSummary?.available_states.map(st => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Tolerance Switcher */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#52796f', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <SlidersHorizontal size={13} /> Tolerance:
                </span>
                <div style={{ display: 'flex', borderRadius: '6px', border: '1px solid #d8e2dc', overflow: 'hidden' }}>
                  {[1.0, 5.0, 10.0].map(tol => (
                    <button
                      key={tol}
                      id={`btn-tolerance-${tol.toFixed(0)}`}
                      onClick={() => setReconTolerance(tol)}
                      style={{
                        padding: '6px 10px',
                        fontSize: '11px',
                        fontWeight: 700,
                        border: 'none',
                        cursor: 'pointer',
                        backgroundColor: reconTolerance === tol ? '#1b4332' : '#ffffff',
                        color: reconTolerance === tol ? '#ffffff' : '#2d6a4f',
                        transition: 'all 0.15s'
                      }}
                    >
                      ±₹{tol.toFixed(0)}
                    </button>
                  ))}
                </div>

                {/* Export 2B Report */}
                <button
                  id="btn-export-2b-reconciliation"
                  onClick={() => exportCurrent('excel')}
                  style={{
                    ...exportBtnStyle('#1b4332'),
                    padding: '6px 12px',
                    fontSize: '11px'
                  }}
                >
                  <Download size={13} /> Export 2B Matching
                </button>
              </div>
            </div>
          </div>

          {/* Dual-Ledger Side-by-Side Reconciliation Table */}
          <div style={{
            backgroundColor: '#ffffff',
            border: '1px solid #d8e2dc',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
          }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1100px' }} id="tbl-gstr2b-reconciliation">
                <thead>
                  <tr style={{ backgroundColor: '#1b4332', color: '#ffffff' }}>
                    <th style={{ padding: '12px 14px', width: '36px', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        id="chk-select-all-recon"
                        checked={reconRecords.length > 0 && selectedReconIds.length === reconRecords.length}
                        onChange={e => handleSelectAllRecon(e.target.checked)}
                        style={{ cursor: 'pointer' }}
                      />
                    </th>
                    <th style={{ padding: '12px 14px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Status
                    </th>
                    <th style={{ padding: '12px 14px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Supplier & State
                    </th>
                    <th style={{ padding: '12px 14px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', backgroundColor: '#143826' }}>
                      Internal Books (Purchase Ledger)
                    </th>
                    <th style={{ padding: '12px 14px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', backgroundColor: '#0f2c1e' }}>
                      Government Portal (GSTR-2B)
                    </th>
                    <th style={{ padding: '12px 14px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'right' }}>
                      Variance (Tax Diff)
                    </th>
                    <th style={{ padding: '12px 14px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'center' }}>
                      Audit Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {reconRecords.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                          <CheckCircle2 size={32} color="#2d6a4f" />
                          <span style={{ fontSize: '14px', fontWeight: 600 }}>No reconciliation records found for selected filters.</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    reconRecords.map((r, idx) => {
                      const isSelected = selectedReconIds.includes(r.id);
                      const isMatched = r.category === 'MATCHED';
                      const isTaxMismatch = r.category === 'TAX_MISMATCH';
                      const isMissingIn2B = r.category === 'MISSING_IN_2B';
                      const isMissingInBooks = r.category === 'MISSING_IN_BOOKS';

                      return (
                        <tr
                          key={r.id}
                          id={`row-recon-${idx}`}
                          style={{
                            borderBottom: '1px solid #eef2ef',
                            backgroundColor: isSelected ? '#f0fdf4' : idx % 2 === 0 ? '#ffffff' : '#fafcfb',
                            transition: 'background-color 0.15s'
                          }}
                        >
                          {/* Checkbox */}
                          <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                            <input
                              type="checkbox"
                              id={`chk-recon-row-${idx}`}
                              checked={isSelected}
                              onChange={() => handleToggleReconRow(r.id)}
                              style={{ cursor: 'pointer' }}
                            />
                          </td>

                          {/* Match Category Badge */}
                          <td style={{ padding: '12px 14px' }}>
                            {isMatched && (
                              <span style={{ fontSize: '11px', fontWeight: 800, color: '#15803d', backgroundColor: '#dcfce7', border: '1px solid #86efac', padding: '3px 8px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <Check size={12} /> MATCHED
                              </span>
                            )}
                            {isTaxMismatch && (
                              <span style={{ fontSize: '11px', fontWeight: 800, color: '#b45309', backgroundColor: '#fef3c7', border: '1px solid #fcd34d', padding: '3px 8px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <AlertTriangle size={12} /> MISMATCH
                              </span>
                            )}
                            {isMissingIn2B && (
                              <span style={{ fontSize: '11px', fontWeight: 800, color: '#b91c1c', backgroundColor: '#fee2e2', border: '1px solid #fca5a5', padding: '3px 8px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <X size={12} /> NOT IN 2B
                              </span>
                            )}
                            {isMissingInBooks && (
                              <span style={{ fontSize: '11px', fontWeight: 800, color: '#6d28d9', backgroundColor: '#ede9fe', border: '1px solid #c4b5fd', padding: '3px 8px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <AlertTriangle size={12} /> NOT IN BOOKS
                              </span>
                            )}
                            {r.status === 'CLAIM_ITC' && (
                              <div style={{ fontSize: '10px', fontWeight: 700, color: '#2d6a4f', marginTop: '4px' }}>
                                ✓ Claimed in 3B
                              </div>
                            )}
                            {r.status === 'DISPUTE' && (
                              <div style={{ fontSize: '10px', fontWeight: 700, color: '#dc2626', marginTop: '4px' }}>
                                ⚠ Supplier Disputed
                              </div>
                            )}
                          </td>

                          {/* Supplier & State */}
                          <td style={{ padding: '12px 14px' }}>
                            <div style={{ fontWeight: 700, fontSize: '13px', color: '#1f2937' }}>
                              {r.supplier_name}
                            </div>
                            <div style={{ fontSize: '11px', color: '#52796f', fontFamily: 'monospace', marginTop: '2px' }}>
                              {r.supplier_gstin}
                            </div>
                            <span style={{ fontSize: '10px', fontWeight: 700, color: '#2d6a4f', backgroundColor: '#eef2ef', padding: '1px 6px', borderRadius: '3px', marginTop: '4px', display: 'inline-block' }}>
                              State: {r.state_code}
                            </span>
                          </td>

                          {/* Internal Books */}
                          <td style={{ padding: '12px 14px', backgroundColor: idx % 2 === 0 ? '#fbfdfc' : '#f7fbf9' }}>
                            {r.books ? (
                              <div>
                                <div style={{ fontWeight: 600, fontSize: '12px', color: '#1f2937' }}>
                                  Inv #{r.books.supplier_inv_no || r.books.invoice_no}
                                </div>
                                <div style={{ fontSize: '11px', color: '#64748b' }}>
                                  Date: {r.books.date}
                                </div>
                                <div style={{ fontSize: '12px', marginTop: '4px', display: 'flex', gap: '8px' }}>
                                  <span style={{ color: '#475569' }}>Taxable: <strong>{fmtCurrency(r.books.taxable)}</strong></span>
                                  <span style={{ color: '#2d6a4f' }}>Tax: <strong>{fmtCurrency(r.books.total_tax)}</strong></span>
                                </div>
                              </div>
                            ) : (
                              <div style={{ fontSize: '12px', fontStyle: 'italic', color: '#94a3b8' }}>
                                — No internal purchase record —
                              </div>
                            )}
                          </td>

                          {/* Portal GSTR-2B */}
                          <td style={{ padding: '12px 14px', backgroundColor: idx % 2 === 0 ? '#f7fbf9' : '#f3f8f5' }}>
                            {r.gstr2b ? (
                              <div>
                                <div style={{ fontWeight: 600, fontSize: '12px', color: '#1f2937' }}>
                                  Inv #{r.gstr2b.invoice_no}
                                </div>
                                <div style={{ fontSize: '11px', color: '#64748b' }}>
                                  Date: {r.gstr2b.date} • Filed: {r.gstr2b.filing_date}
                                </div>
                                <div style={{ fontSize: '12px', marginTop: '4px', display: 'flex', gap: '8px' }}>
                                  <span style={{ color: '#475569' }}>Taxable: <strong>{fmtCurrency(r.gstr2b.taxable)}</strong></span>
                                  <span style={{ color: '#1b4332' }}>Tax: <strong>{fmtCurrency(r.gstr2b.total_tax)}</strong></span>
                                </div>
                              </div>
                            ) : (
                              <div style={{ fontSize: '12px', fontStyle: 'italic', color: '#dc2626' }}>
                                ✕ Missing on Government GSTN Portal
                              </div>
                            )}
                          </td>

                          {/* Variance */}
                          <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                            <div style={{
                              fontSize: '13px',
                              fontWeight: 800,
                              color: Math.abs(r.diff.tax_diff) > 0.01 ? (Math.abs(r.diff.tax_diff) <= reconTolerance ? '#d97706' : '#dc2626') : '#15803d'
                            }}>
                              {Math.abs(r.diff.tax_diff) <= 0.01 ? '₹0.00' : fmtCurrency(r.diff.tax_diff)}
                            </div>
                            {Math.abs(r.diff.taxable_diff) > 0.01 && (
                              <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
                                Taxable Diff: {fmtCurrency(r.diff.taxable_diff)}
                              </div>
                            )}
                          </td>

                          {/* Audit Action */}
                          <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center' }}>
                              {isMatched && (
                                <button
                                  id={`btn-approve-row-${idx}`}
                                  onClick={() => handleReconAction([r.id], 'CLAIM_ITC', 'Verified matched against GSTR-2B')}
                                  disabled={isActionLoading}
                                  style={{
                                    padding: '5px 10px',
                                    backgroundColor: r.status === 'CLAIM_ITC' ? '#dcfce7' : '#1b4332',
                                    color: r.status === 'CLAIM_ITC' ? '#15803d' : '#ffffff',
                                    border: r.status === 'CLAIM_ITC' ? '1px solid #86efac' : 'none',
                                    borderRadius: '6px',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                  }}
                                >
                                  <Check size={12} /> {r.status === 'CLAIM_ITC' ? 'Claimed' : 'Claim ITC'}
                                </button>
                              )}

                              {(isMissingIn2B || isTaxMismatch) && (
                                <button
                                  id={`btn-dunning-row-${idx}`}
                                  onClick={() => handleOpenDunning(r)}
                                  style={{
                                    padding: '5px 10px',
                                    backgroundColor: '#ffffff',
                                    color: '#b91c1c',
                                    border: '1px solid #fca5a5',
                                    borderRadius: '6px',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                  }}
                                  title="Send Section 16(2)(aa) supplier reminder"
                                >
                                  <MessageSquare size={12} /> Remind Supplier
                                </button>
                              )}

                              {isMissingInBooks && (
                                <button
                                  id={`btn-force-row-${idx}`}
                                  onClick={() => handleReconAction([r.id], 'FORCE_MATCH', 'Omission in books flagged for voucher booking')}
                                  disabled={isActionLoading}
                                  style={{
                                    padding: '5px 10px',
                                    backgroundColor: '#ffffff',
                                    color: '#6d28d9',
                                    border: '1px solid #c4b5fd',
                                    borderRadius: '6px',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                  }}
                                >
                                  Book Inward
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────
          MODAL 1: SUPPLIER DUNNING & WHATSAPP COMMUNICATION
          ────────────────────────────────────────────────────────── */}
      {dunningModalOpen && selectedDunningRecord && (
        <div
          id="modal-supplier-dunning"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '20px'
          }}
        >
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            maxWidth: '620px',
            width: '100%',
            padding: '24px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#b91c1c' }}>
                  SECTION 16(2)(aa) STATUTORY ITC COMPLIANCE NOTICE
                </span>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#1b4332', margin: '4px 0 0 0' }}>
                  Supplier Dunning Notice: {selectedDunningRecord.supplier_name}
                </h2>
              </div>
              <button
                id="btn-close-dunning-modal"
                onClick={() => setDunningModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} color="#64748b" />
              </button>
            </div>

            {/* Invoice & Exposure Snapshot */}
            <div style={{
              backgroundColor: '#fee2e2',
              border: '1px solid #fca5a5',
              borderRadius: '8px',
              padding: '12px 16px',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '8px'
            }}>
              <div>
                <span style={{ fontSize: '11px', color: '#7f1d1d', fontWeight: 600 }}>Supplier GSTIN:</span>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#991b1b', fontFamily: 'monospace' }}>
                  {selectedDunningRecord.supplier_gstin}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: '#7f1d1d', fontWeight: 600 }}>Invoice Number:</span>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#991b1b' }}>
                  {selectedDunningRecord.books?.supplier_inv_no || selectedDunningRecord.books?.invoice_no || selectedDunningRecord.gstr2b?.invoice_no}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: '#7f1d1d', fontWeight: 600 }}>Taxable Value:</span>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#991b1b' }}>
                  {fmtCurrency(selectedDunningRecord.books?.taxable || selectedDunningRecord.gstr2b?.taxable)}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: '#7f1d1d', fontWeight: 600 }}>Blocked / Disputed ITC:</span>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#b91c1c' }}>
                  {fmtCurrency(selectedDunningRecord.books?.total_tax || selectedDunningRecord.gstr2b?.total_tax)}
                </div>
              </div>
            </div>

            {/* Communication Message Editor */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#1f2937', marginBottom: '6px', display: 'block' }}>
                Statutory Notice Message Body:
              </label>
              <textarea
                id="textarea-dunning-message"
                readOnly
                rows={6}
                value={`STATUTORY ITC COMPLIANCE REMINDER (U/S 16(2)(aa) CGST ACT)
Dear ${selectedDunningRecord.supplier_name},
Your Invoice #${selectedDunningRecord.books?.supplier_inv_no || selectedDunningRecord.books?.invoice_no} dated ${selectedDunningRecord.books?.date || 'N/A'} for Taxable Amount ${fmtCurrency(selectedDunningRecord.books?.taxable)} with Tax Amount ${fmtCurrency(selectedDunningRecord.books?.total_tax)} is currently NOT reflecting in our government GSTR-2B portal return.

Under Section 16(2)(aa) of the CGST Act, our Input Tax Credit (ITC) of ${fmtCurrency(selectedDunningRecord.books?.total_tax)} is legally blocked until you upload this invoice in your GSTR-1.

Kindly file your GSTR-1 immediately or upload an amendment to ensure credit flow and prevent automated debit note reversals.
Regards,
Accounts & Tax Compliance Department`}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #d8e2dc',
                  fontSize: '12px',
                  lineHeight: '1.5',
                  color: '#1f2937',
                  backgroundColor: '#f8faf9',
                  boxSizing: 'border-box',
                  fontFamily: 'monospace'
                }}
              />
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
              <button
                id="btn-copy-dunning"
                onClick={() => {
                  const text = `STATUTORY ITC COMPLIANCE REMINDER (U/S 16(2)(aa) CGST ACT)\nDear ${selectedDunningRecord.supplier_name},\nYour Invoice #${selectedDunningRecord.books?.supplier_inv_no || selectedDunningRecord.books?.invoice_no} is not reflecting in our GSTR-2B. ITC of ${fmtCurrency(selectedDunningRecord.books?.total_tax)} is blocked. Kindly upload in your GSTR-1 immediately.`;
                  navigator.clipboard.writeText(text);
                  showNotification('Statutory notice copied to clipboard!');
                }}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#ffffff',
                  color: '#1f2937',
                  border: '1px solid #d8e2dc',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Copy size={14} /> Copy Notice
              </button>
              <button
                id="btn-send-whatsapp"
                onClick={() => {
                  const text = encodeURIComponent(`STATUTORY ITC COMPLIANCE REMINDER (U/S 16(2)(aa) CGST ACT)\nDear ${selectedDunningRecord.supplier_name},\nYour Invoice #${selectedDunningRecord.books?.supplier_inv_no || selectedDunningRecord.books?.invoice_no} is not reflecting in our GSTR-2B. ITC of ${fmtCurrency(selectedDunningRecord.books?.total_tax)} is blocked. Kindly upload in your GSTR-1 immediately.`);
                  window.open(`https://wa.me/?text=${text}`, '_blank');
                  showNotification('Opened WhatsApp sharing window.');
                }}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#25D366',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Send size={14} /> Share via WhatsApp
              </button>
              <button
                id="btn-mark-disputed"
                onClick={() => {
                  handleReconAction([selectedDunningRecord.id], 'DISPUTE', 'Supplier dunning notice issued via portal');
                  setDunningModalOpen(false);
                }}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#b91c1c',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Mark Disputed
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────
          MODAL 2: IMPORT PORTAL GSTR-2B JSON PAYLOAD
          ────────────────────────────────────────────────────────── */}
      {ingestModalOpen && (
        <div
          id="modal-ingest-portal-2b"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '20px'
          }}
        >
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            maxWidth: '680px',
            width: '100%',
            padding: '24px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#1b4332' }}>
                  GOVERNMENT GST PORTAL INTEGRATION
                </span>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#1b4332', margin: '4px 0 0 0' }}>
                  Import GSTR-2B Auto-Drafted Statement (JSON)
                </h2>
              </div>
              <button
                id="btn-close-ingest-modal"
                onClick={() => setIngestModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} color="#64748b" />
              </button>
            </div>

            <p style={{ fontSize: '13px', color: '#52796f', margin: 0, lineHeight: 1.4 }}>
              Paste the official JSON file downloaded from the GST Portal (<strong>Returns Dashboard &gt; GSTR-2B &gt; Download JSON</strong>).
              The matching engine will immediately normalize supplier invoice numbers, recalculate IGST/CGST/SGST variances, and update ITC eligibility scorecards.
            </p>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#1f2937', marginBottom: '6px', display: 'block' }}>
                GSTR-2B Portal JSON Payload:
              </label>
              <textarea
                id="textarea-json-2b"
                rows={10}
                placeholder={`{\n  "gstin": "07AAAAA0000A1Z5",\n  "fp": "102026",\n  "cur_gt": 0,\n  "data": {\n    "docdata": {\n      "b2b": [\n        {\n          "ctin": "27AABCS1429B1ZB",\n          "inv": [\n            {\n              "inum": "INV-2026-0042",\n              "idt": "12-10-2026",\n              "val": 118000.0,\n              "pos": "07",\n              "items": [\n                { "txval": 100000.0, "iamt": 18000.0 }\n              ]\n            }\n          ]\n        }\n      ]\n    }\n  }\n}`}
                value={ingestJsonInput}
                onChange={e => setIngestJsonInput(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #d8e2dc',
                  fontSize: '12px',
                  fontFamily: 'monospace',
                  color: '#1f2937',
                  backgroundColor: '#f8faf9',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                id="btn-cancel-ingest-modal"
                onClick={() => setIngestModalOpen(false)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#ffffff',
                  color: '#1f2937',
                  border: '1px solid #d8e2dc',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                id="btn-submit-ingest-2b"
                onClick={handleIngest2bSubmit}
                disabled={isActionLoading}
                style={{
                  padding: '8px 18px',
                  backgroundColor: '#1b4332',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <UploadCloud size={14} /> Parse & Sync Inward Supplies
              </button>
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
