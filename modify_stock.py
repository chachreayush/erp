import re

with open(r'C:\Users\DELL\OneDrive\Desktop\erp\src\pages\stock\CurrentStock.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add ProductRegister import
if 'ProductRegister' not in content:
    content = content.replace('import { apiClient, apiGetBatches, Batch } from \'../../lib/api\'', 'import { apiClient, apiGetBatches, Batch } from \'../../lib/api\'\nimport ProductRegister from \'./ProductRegister\'')

# Replace states and handleRowClick
target = '''  // Popup state
  const [selectedProduct, setSelectedProduct] = useState<StockItem | null>(null)
  const [productBatches, setProductBatches] = useState<Batch[]>([])
  const [isBatchesLoading, setIsBatchesLoading] = useState(false)

  const handleRowClick = async (item: StockItem) => {
    setSelectedProduct(item)
    setIsBatchesLoading(true)
    try {
      const batches = await apiGetBatches(item.product_id)
      setProductBatches(batches)
    } catch (err) {
      console.error("Failed to fetch batches", err)
    } finally {
      setIsBatchesLoading(false)
    }
  }'''

replacement = '''  // Popup state
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
  }, [showActionPopup, actionSelectionIndex, selectedProduct])'''

if 'const [showBatchDetails' not in content:
    content = content.replace(target, replacement)

# Replace Batch popup condition and add new popups
target2 = '''      {/* Batch Details Popup */}
      {selectedProduct && ('''

replacement2 = '''      {/* Action Popup */}
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
          stockType={type}
          onClose={() => setShowRegister(false)}
        />
      )}

      {/* Batch Details Popup */}
      {showBatchDetails && selectedProduct && ('''

if '{/* Action Popup */}' not in content:
    content = content.replace(target2, replacement2)

# Fix Batch popup close button
target3 = '''<button onClick={() => setSelectedProduct(null)}'''
replacement3 = '''<button onClick={() => setShowBatchDetails(false)}'''
content = content.replace(target3, replacement3)

with open(r'C:\Users\DELL\OneDrive\Desktop\erp\src\pages\stock\CurrentStock.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
