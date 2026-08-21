import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { Search, Calendar, Filter, FileText } from 'lucide-react'

// Assuming Ag-Grid is available in the project
import { AgGridReact } from 'ag-grid-react'
import { apiGetInvoices } from '../../lib/api'
import { ColDef } from 'ag-grid-community'

interface PurchaseReturnListProps {
  onSelectBill: (entryNo: string) => void;
  type: string; // 'modify-bill' | 'modify-challan'
}

const getTodayDateString = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function PurchaseReturnList({ onSelectBill, type }: PurchaseReturnListProps) {
  const [bills, setBills] = useState<any[]>([])
  
  // Refs for keyboard navigation
  const partyRef = useRef<HTMLInputElement>(null)
  const billNoRef = useRef<HTMLInputElement>(null)
  const fromDateRef = useRef<HTMLInputElement>(null)
  const toDateRef = useRef<HTMLInputElement>(null)
  const gridRef = useRef<AgGridReact>(null)

  // Filters
  const baseType = type.includes('challan') ? 'challan' : 'bill';
  const [partySearch, setPartySearch] = useState('')
  const [billNoSearch, setBillNoSearch] = useState('')
  const [fromDate, setFromDate] = useState(getTodayDateString())
  const [toDate, setToDate] = useState(getTodayDateString())

  useEffect(() => {
    partyRef.current?.focus()
  }, [])

  useEffect(() => {
    const fetchBills = async () => {
      try {
        const data = await apiGetInvoices(`purchase-return-${baseType}`);
        const mapped = data.map(inv => ({
          entryNo: inv.invoice_number,
          partyName: inv.customer_name,
          partyInvNo: inv.party_inv_no || '',
          recordType: baseType,
          grandTotal: inv.grand_total,
          date: inv.date ? new Date(inv.date).toLocaleDateString() : ''
        }));
        setBills(mapped);
      } catch (err) {
        console.error("Failed to fetch invoices", err);
      }
    };
    fetchBills();
  }, [baseType])

  const filteredBills = useMemo(() => {
    return bills.filter(bill => {
      if ((bill.recordType || 'bill') !== baseType) return false;
      if (partySearch && !bill.partyName?.toLowerCase().includes(partySearch.toLowerCase())) return false;
      if (billNoSearch && !bill.entryNo?.toLowerCase().includes(billNoSearch.toLowerCase())) return false;
      // Note: Date filtering can be implemented here if the bill objects stored dates
      return true;
    })
  }, [bills, partySearch, billNoSearch, fromDate, toDate])

  const colDefs: ColDef[] = [
    { field: 'date', headerName: 'Date', width: 120, filter: true },
    { field: 'entryNo', headerName: 'Entry No', width: 120, filter: true },
    { field: 'partyName', headerName: 'Party Name', flex: 1, filter: true },
    { field: 'partyInvNo', headerName: 'Party Inv No', width: 150, filter: true },
    {
      headerName: 'Action',
      width: 100,
      cellRenderer: (params: any) => (
        <button 
          tabIndex={-1}
          onClick={() => onSelectBill(params.data.entryNo)}
          style={{ 
            backgroundColor: 'var(--color-primary)', 
            color: 'white', 
            border: 'none', 
            padding: '4px 12px', 
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 'bold'
          }}
        >
          Select
        </button>
      )
    }
  ]

  const onCellKeyDown = useCallback((e: any) => {
    if (e.event.key === 'Enter') {
      onSelectBill(e.data.entryNo)
    }
  }, [onSelectBill])

  const title = type === 'modify-challan' ? 'Modify Purchase Return Challans' : 'Modify Debit Notes'

  return (
    <div style={{ padding: '20px', height: '100%', display: 'flex', flexDirection: 'column', gap: '20px', backgroundColor: 'var(--color-bg-subtle)' }}>
      {/* Header & Filters Card (Glassmorphic) */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(10px)',
        border: '1px solid var(--color-border)',
        borderRadius: '12px',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text-primary)' }}>
          <FileText size={20} style={{ color: 'var(--color-primary)' }} />
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>{title}</h2>
        </div>

        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          {/* Party Filter */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: '200px' }}>
            <label style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Party Name</label>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
              <input 
                ref={partyRef}
                type="text" 
                value={partySearch}
                onChange={e => setPartySearch(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    billNoRef.current?.focus();
                  }
                }}
                placeholder="Search by Party Name..."
                style={{
                  width: '100%', padding: '8px 12px 8px 32px', borderRadius: '6px',
                  border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg)',
                  color: 'var(--color-text-primary)', outline: 'none'
                }}
                onFocus={e => e.target.style.borderColor = 'var(--color-primary)'}
                onBlur={e => e.target.style.borderColor = 'var(--color-border)'}
              />
            </div>
          </div>

          {/* Bill No Filter */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: '150px' }}>
            <label style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Bill / Entry No</label>
            <div style={{ position: 'relative' }}>
              <Filter size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
              <input 
                ref={billNoRef}
                type="text" 
                value={billNoSearch}
                onChange={e => setBillNoSearch(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    fromDateRef.current?.focus();
                  }
                }}
                placeholder="Search by Bill No..."
                style={{
                  width: '100%', padding: '8px 12px 8px 32px', borderRadius: '6px',
                  border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg)',
                  color: 'var(--color-text-primary)', outline: 'none'
                }}
                onFocus={e => e.target.style.borderColor = 'var(--color-primary)'}
                onBlur={e => e.target.style.borderColor = 'var(--color-border)'}
              />
            </div>
          </div>
          
          {/* Date Filters (Stub) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '130px' }}>
            <label style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>From Date</label>
            <div style={{ position: 'relative' }}>
              <Calendar size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
              <input 
                ref={fromDateRef}
                type="date" 
                value={fromDate}
                onChange={e => setFromDate(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    toDateRef.current?.focus();
                  }
                }}
                style={{
                  width: '100%', padding: '8px 8px 8px 32px', borderRadius: '6px',
                  border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg)',
                  color: 'var(--color-text-primary)', outline: 'none', fontSize: '12px'
                }}
                onFocus={e => e.target.style.borderColor = 'var(--color-primary)'}
                onBlur={e => e.target.style.borderColor = 'var(--color-border)'}
              />
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '130px' }}>
            <label style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>To Date</label>
            <div style={{ position: 'relative' }}>
              <Calendar size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
              <input 
                ref={toDateRef}
                type="date" 
                value={toDate}
                onChange={e => setToDate(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (gridRef.current && filteredBills.length > 0) {
                      gridRef.current.api.setFocusedCell(0, 'entryNo');
                      gridRef.current.api.ensureIndexVisible(0);
                    }
                  }
                }}
                style={{
                  width: '100%', padding: '8px 8px 8px 32px', borderRadius: '6px',
                  border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg)',
                  color: 'var(--color-text-primary)', outline: 'none', fontSize: '12px'
                }}
                onFocus={e => e.target.style.borderColor = 'var(--color-primary)'}
                onBlur={e => e.target.style.borderColor = 'var(--color-border)'}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Grid Container */}
      <div style={{ flex: 1, border: '1px solid var(--color-border)', borderRadius: '12px', overflow: 'hidden' }} className="ag-theme-alpine-dark">
        <AgGridReact
          ref={gridRef}
          rowData={filteredBills}
          columnDefs={colDefs}
          defaultColDef={{ resizable: true, sortable: true }}
          headerHeight={40}
          rowHeight={40}
          suppressCellFocus={false}
          rowSelection="single"
          onRowClicked={(e) => onSelectBill(e.data.entryNo)}
          onCellKeyDown={onCellKeyDown}
        />
      </div>
    </div>
  )
}
