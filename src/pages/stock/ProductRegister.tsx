import { useEffect, useState, useMemo } from 'react'
import { X, Search } from 'lucide-react'
import { AgGridReact } from 'ag-grid-react'
import { ColDef } from 'ag-grid-community'
import { apiGetProductRegister, RegisterResponse } from '../../lib/api'
import { useNavigate, useLocation } from 'react-router-dom'

interface ProductRegisterProps {
  productId: string
  onClose: () => void
  stockType?: 'main' | 'brk-exp'
  productItem?: any // to preserve state when returning
}

export default function ProductRegister({ productId, onClose, stockType = 'main', productItem }: ProductRegisterProps) {
  const [data, setData] = useState<RegisterResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const fetchRegister = async () => {
      try {
        const res = await apiGetProductRegister(productId, stockType)
        setData(res)
      } catch (err) {
        console.error("Failed to fetch register", err)
      } finally {
        setLoading(false)
      }
    }
    fetchRegister()
  }, [productId, stockType])

  const filteredEntries = useMemo(() => {
    if (!data) return []
    if (!search) return data.entries
    const s = search.toLowerCase()
    return data.entries.filter(e => 
      e.party_name.toLowerCase().includes(s) || 
      e.invoice_number.toLowerCase().includes(s)
    )
  }, [data, search])

  const colDefs: ColDef[] = [
    { field: 'date', headerName: 'Date', width: 120 },
    { field: 'invoice_number', headerName: 'Entry No', flex: 1 },
    { field: 'party_name', headerName: 'Party Name', flex: 2 },
    { field: 'invoice_type', headerName: 'Type', flex: 1 },
    { field: 'inward', headerName: 'Inward', width: 120, cellStyle: { textAlign: 'right', color: 'var(--color-primary)' } },
    { field: 'outward', headerName: 'Outward', width: 120, cellStyle: { textAlign: 'right', color: 'var(--color-danger)' } },
    { field: 'running_balance', headerName: 'Balance', width: 120, cellStyle: { textAlign: 'right', fontWeight: 'bold' } }
  ]

  const handleRowAction = (entry: any) => {
    if (!entry || !entry.invoice_type) return;
    
    let route = '';
    const type = entry.invoice_type;
    
    if (type.startsWith('purchase-bill')) route = '/purchase?type=modify-bill';
    else if (type.startsWith('purchase-challan')) route = '/purchase?type=modify-challan';
    else if (type.startsWith('sales-bill')) route = '/sales?type=modify-bill';
    else if (type.startsWith('sales-challan')) route = '/sales?type=modify-challan';
    else if (type.startsWith('sales-return-credit') || type.startsWith('sales-return-bill')) route = '/sales-return?type=modify-bill';
    else if (type.startsWith('sales-return-challan')) route = '/sales-return?type=modify-challan';
    else if (type.startsWith('purchase-return-debit') || type.startsWith('purchase-return-bill')) route = '/purchase-return?type=modify-bill';
    else if (type.startsWith('purchase-return-challan')) route = '/purchase-return?type=modify-challan';
    else if (type.startsWith('brk-receive-bill')) route = '/brk-receive?type=modify-bill';
    else if (type.startsWith('brk-receive-challan')) route = '/brk-receive?type=modify-challan';
    else if (type.startsWith('brk-issue-bill')) route = '/brk-issue?type=modify-bill';
    else if (type.startsWith('brk-issue-challan')) route = '/brk-issue?type=modify-challan';
    else if (type.startsWith('stock-receive')) route = '/stock-receive?type=modify-bill';
    else if (type.startsWith('stock-issue')) route = '/stock-issue?type=modify-bill';
    
    if (route) {
      route += `&invoice=${entry.invoice_number}`;
      // Pass state to preserve this modal when coming back
      navigate(route, { 
        state: { 
          returnTo: location.pathname + location.search, 
          productItem: productItem,
          showRegister: true,
          stockType
        } 
      });
    }
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'var(--color-bg-subtle)',
        borderRadius: '8px',
        width: '100%',
        maxWidth: '1200px',
        height: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        border: '1px solid var(--color-border)'
      }}>
        <div style={{
          padding: '20px',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h2 style={{ margin: 0, color: 'var(--color-text)' }}>Product Register</h2>
            <p style={{ margin: '5px 0 0 0', color: 'var(--color-text-muted)' }}>
              {data ? data.product_name : 'Loading...'} 
              {stockType === 'brk-exp' ? ' (Breakage & Expiry)' : ' (Main Stock)'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <Search style={{ position: 'absolute', left: '10px', top: '10px', color: '#666' }} size={18} />
              <input 
                type="text" 
                placeholder="Search..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  padding: '8px 10px 8px 35px',
                  borderRadius: '4px',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-bg)',
                  color: 'var(--color-text)',
                  width: '250px'
                }}
              />
            </div>
            <button onClick={onClose} style={{
              background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-text)'
            }}>
              <X size={24} />
            </button>
          </div>
        </div>

        <div style={{ flex: 1, padding: '20px' }} className="ag-theme-alpine-dark">
          {loading ? (
            <div style={{ color: 'var(--color-text-muted)' }}>Loading register data...</div>
          ) : (
            <AgGridReact 
              rowData={filteredEntries}
              columnDefs={colDefs}
              defaultColDef={{ resizable: true, sortable: true, filter: true }}
              headerHeight={40}
              rowHeight={40}
              onRowClicked={(e) => handleRowAction(e.data)}
              onCellKeyDown={(e) => {
                if (e.event && (e.event as KeyboardEvent).key === 'Enter') {
                  handleRowAction(e.data)
                }
              }}
            />
          )}
        </div>

        {data && (
          <div style={{
            padding: '20px',
            borderTop: '1px solid var(--color-border)',
            display: 'flex',
            gap: '20px',
            backgroundColor: 'var(--color-bg)'
          }}>
            <div style={{ flex: 1, padding: '15px', borderRadius: '8px', border: '1px solid var(--color-primary)', backgroundColor: 'rgba(99, 102, 241, 0.05)' }}>
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '5px' }}>Total Inward</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--color-primary)' }}>{data.total_inward}</div>
            </div>
            <div style={{ flex: 1, padding: '15px', borderRadius: '8px', border: '1px solid var(--color-danger)', backgroundColor: 'rgba(239, 68, 68, 0.05)' }}>
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '5px' }}>Total Outward</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--color-danger)' }}>{data.total_outward}</div>
            </div>
            <div style={{ flex: 1, padding: '15px', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-subtle)' }}>
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '5px' }}>Total Value of Avl Stock</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--color-text)' }}>
                ₹ {data.total_value.toFixed(2)}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
