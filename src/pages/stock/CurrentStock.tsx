import { useEffect, useState } from 'react'
import { Package, Search, Download, X } from 'lucide-react'
import { apiClient, apiGetBatches, Batch } from '../../lib/api'
import ProductRegister from './ProductRegister'

interface StockItem {
  product_id: string
  product_code: string
  product_name: string
  company_name: string
  salt_name: string
  current_stock: number
}

const CurrentStock = ({ type = 'current' }: { type?: 'current' | 'brk-exp' }) => {
  const [stockData, setStockData] = useState<StockItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  
  // Popup state
  const [selectedProduct, setSelectedProduct] = useState<StockItem | null>(null)
  const [productBatches, setProductBatches] = useState<Batch[]>([])
  const [isBatchesLoading, setIsBatchesLoading] = useState(false)
  const [showBatchDetails, setShowBatchDetails] = useState(false)

  const [showActionPopup, setShowActionPopup] = useState(false)
  const [actionSelectionIndex, setActionSelectionIndex] = useState(0) // 0 = Register, 1 = Batch Details
  const [showRegister, setShowRegister] = useState(false)

  const handleRowClick = (item: StockItem) => {
    setSelectedProduct(item)
    setShowActionPopup(true)
    setActionSelectionIndex(0)
  }

  const openBatchDetails = async (item: StockItem) => {
    setShowBatchDetails(true)
    setIsBatchesLoading(true)
    try {
      const batches = await apiGetBatches(item.product_id)
      setProductBatches(batches)
    } catch (err) {
      console.error("Failed to fetch batches", err)
    } finally {
      setIsBatchesLoading(false)
    }
  }

  useEffect(() => {
    if (!showActionPopup) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') {
        setActionSelectionIndex(prev => Math.max(0, prev - 1))
      } else if (e.key === 'ArrowDown') {
        setActionSelectionIndex(prev => Math.min(1, prev + 1))
      } else if (e.key === 'Enter') {
        if (actionSelectionIndex === 0) {
          setShowActionPopup(false)
          setShowRegister(true)
        } else {
          setShowActionPopup(false)
          openBatchDetails(selectedProduct!)
        }
      } else if (e.key === 'Escape') {
        setShowActionPopup(false)
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showActionPopup, actionSelectionIndex, selectedProduct])

  useEffect(() => {
    const fetchStock = async () => {
      try {
        const endpoint = type === 'brk-exp' ? '/api/stock/brk-exp' : '/api/stock'
        const res = await apiClient.get<StockItem[]>(endpoint)
        setStockData(res.data)
      } catch (err) {
        console.error("Failed to fetch stock", err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchStock()
  }, [type])

  const filteredStock = stockData.filter(item => 
    item.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.salt_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.product_code.includes(searchQuery)
  )

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', animation: 'fadeIn 0.3s ease-in-out' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
            <Package className="mr-2 text-indigo-600" />
            {type === 'brk-exp' ? 'Breakage/Expiry Stock' : 'Current Stock'}
          </h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>
            Real-time overview of your inventory stock levels based on purchases and sales.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', backgroundColor: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', color: 'var(--color-text)', cursor: 'pointer', fontWeight: 500 }}>
            <Download size={16} />
            Export CSV
          </button>
        </div>
      </div>

      <div style={{ backgroundColor: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '20px', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
            <input 
              type="text" 
              placeholder="Search by product name, code, company, or salt..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ 
                width: '100%', 
                padding: '10px 10px 10px 36px', 
                backgroundColor: 'var(--color-bg)', 
                border: '1px solid var(--color-border)', 
                borderRadius: 'var(--radius-md)', 
                color: 'var(--color-text)', 
                outline: 'none',
                fontSize: '14px'
              }} 
            />
          </div>
        </div>

        {isLoading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            Loading stock data...
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--color-border)', color: 'var(--color-text-muted)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Code</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Product Name</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Company</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Salt / Molecule</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'right' }}>
                    {type === 'brk-exp' ? 'Brk/Exp Stock' : 'Current Stock'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredStock.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                      No stock data found matching your search.
                    </td>
                  </tr>
                ) : (
                  filteredStock.map((item, index) => (
                    <tr 
                      key={item.product_id} 
                      onClick={() => handleRowClick(item)}
                      style={{ 
                        borderBottom: '1px solid var(--color-border)',
                        backgroundColor: index % 2 === 0 ? 'transparent' : 'var(--color-bg-hover)',
                        cursor: 'pointer'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--color-bg-active)'}
                      onMouseOut={(e) => e.currentTarget.style.backgroundColor = index % 2 === 0 ? 'transparent' : 'var(--color-bg-hover)'}
                    >
                      <td style={{ padding: '12px 16px', color: 'var(--color-text-secondary)', fontSize: '13px' }}>{item.product_code}</td>
                      <td style={{ padding: '12px 16px', fontWeight: 500, color: 'var(--color-primary)' }}>{item.product_name}</td>
                      <td style={{ padding: '12px 16px', color: 'var(--color-text-secondary)', fontSize: '13px' }}>{item.company_name || '-'}</td>
                      <td style={{ padding: '12px 16px', color: 'var(--color-text-muted)', fontSize: '12px' }}>{item.salt_name || '-'}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <span style={{ 
                          display: 'inline-block', 
                          padding: '4px 10px', 
                          backgroundColor: item.current_stock > 0 ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)', 
                          color: item.current_stock > 0 ? '#16a34a' : '#dc2626', 
                          borderRadius: '100px', 
                          fontWeight: 600,
                          fontSize: '14px'
                        }}>
                          {item.current_stock}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Action Popup */}
      {showActionPopup && selectedProduct && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            backgroundColor: 'var(--color-bg)', padding: '24px', borderRadius: '8px',
            width: '300px', boxShadow: '0 4px 20px rgba(0,0,0,0.3)', textAlign: 'center'
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '20px', color: 'var(--color-text)' }}>Select Action</h3>
            <div
              style={{
                padding: '12px', marginBottom: '10px', borderRadius: '4px', cursor: 'pointer',
                backgroundColor: actionSelectionIndex === 0 ? 'var(--color-primary)' : 'var(--color-bg-subtle)',
                color: actionSelectionIndex === 0 ? '#fff' : 'var(--color-text)',
                fontWeight: actionSelectionIndex === 0 ? 'bold' : 'normal',
                transition: 'all 0.1s'
              }}
              onClick={() => { setShowActionPopup(false); setShowRegister(true); }}
            >
              Register
            </div>
            <div
              style={{
                padding: '12px', borderRadius: '4px', cursor: 'pointer',
                backgroundColor: actionSelectionIndex === 1 ? 'var(--color-primary)' : 'var(--color-bg-subtle)',
                color: actionSelectionIndex === 1 ? '#fff' : 'var(--color-text)',
                fontWeight: actionSelectionIndex === 1 ? 'bold' : 'normal',
                transition: 'all 0.1s'
              }}
              onClick={() => { setShowActionPopup(false); openBatchDetails(selectedProduct); }}
            >
              Batch Details
            </div>
          </div>
        </div>
      )}

      {/* Register View */}
      {showRegister && selectedProduct && (
        <ProductRegister
          productId={selectedProduct.product_id}
          stockType={type === 'current' ? 'main' : 'brk-exp'}
          onClose={() => setShowRegister(false)}
        />
      )}

      {/* Batch Details Popup */}
      {showBatchDetails && selectedProduct && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, 
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'fadeIn 0.2s'
        }}>
          <div style={{
            backgroundColor: 'var(--color-bg)', padding: '24px', borderRadius: 'var(--radius-lg)', 
            width: '90%', maxWidth: '800px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            maxHeight: '80vh', display: 'flex', flexDirection: 'column'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-text)', marginBottom: '4px' }}>
                  Batch Details: {selectedProduct.product_name}
                </h2>
                <p style={{ fontSize: '14px', color: 'var(--color-text-muted)' }}>
                  Code: {selectedProduct.product_code} | Total Stock: {selectedProduct.current_stock}
                </p>
              </div>
              <button onClick={() => setShowBatchDetails(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}>
                <X size={24} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
              {isBatchesLoading ? (
                <div style={{ padding: '30px', textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading batches...</div>
              ) : productBatches.length === 0 ? (
                <div style={{ padding: '30px', textAlign: 'center', color: 'var(--color-text-muted)' }}>No batches found for this product.</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--color-border)', color: 'var(--color-text-muted)', fontSize: '12px', textTransform: 'uppercase' }}>
                      <th style={{ padding: '10px', fontWeight: 600 }}>Batch No.</th>
                      <th style={{ padding: '10px', fontWeight: 600 }}>Expiry</th>
                      <th style={{ padding: '10px', fontWeight: 600, textAlign: 'right' }}>MRP</th>
                      <th style={{ padding: '10px', fontWeight: 600, textAlign: 'right' }}>Rate</th>
                      <th style={{ padding: '10px', fontWeight: 600, textAlign: 'right' }}>Stock</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productBatches.map(batch => (
                      <tr key={batch.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <td style={{ padding: '10px', fontWeight: 500, color: 'var(--color-text)' }}>{batch.batch_number}</td>
                        <td style={{ padding: '10px', color: 'var(--color-text-secondary)' }}>{batch.expiry || '-'}</td>
                        <td style={{ padding: '10px', textAlign: 'right', color: 'var(--color-text-secondary)' }}>₹{batch.mrp.toFixed(2)}</td>
                        <td style={{ padding: '10px', textAlign: 'right', color: 'var(--color-text-secondary)' }}>₹{batch.rate.toFixed(2)}</td>
                        <td style={{ padding: '10px', textAlign: 'right' }}>
                          <span style={{ 
                            padding: '2px 8px', borderRadius: '100px', fontSize: '13px', fontWeight: 600,
                            backgroundColor: batch.current_stock > 0 ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)', 
                            color: batch.current_stock > 0 ? '#16a34a' : '#dc2626'
                          }}>
                            {batch.current_stock}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CurrentStock
