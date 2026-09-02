import React, { useState, useEffect } from 'react' 
import { useReturnNavigation } from '../../hooks/useReturnNavigation'
import { useSearchParams } from 'react-router-dom'
import { Plus, Download, Package, TrendingUp } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { LookupModal } from '../../components/ui/LookupModal'
import { CompanyMasterModal } from '../../components/ui/CompanyMasterModal'
import { HSNMasterModal } from '../../components/ui/HSNMasterModal'
import { SaltMasterModal } from '../../components/ui/SaltMasterModal'
import { SmartMRPModal } from '../../components/ui/SmartMRPModal'
import { 
  apiGetProducts, apiCreateProduct, ProductCreatePayload, Product,
  apiGetManufacturers, apiGetSalts, apiGetHSNCodes
} from '../../lib/api'

// Simple helper to format currency
const formatCurrency = (val: number) => `₹${val.toFixed(2)}`

export default function ProductsPage() {

  const [searchParams] = useSearchParams()
  const actionParam = searchParams.get('action')
  const [modifyingProductId, setModifyingProductId] = useState<string | null>(null)

  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [isCompanyLookupOpen, setIsCompanyLookupOpen] = useState(false)
  const [isHsnLookupOpen, setIsHsnLookupOpen] = useState(false)
  const [isSaltLookupOpen, setIsSaltLookupOpen] = useState(false)
  
  const [isCompanyMasterOpen, setIsCompanyMasterOpen] = useState(false)
  const [modifyCompanyData, setModifyCompanyData] = useState<any>(null)

  const [isHsnMasterOpen, setIsHsnMasterOpen] = useState(false)
  const [modifyHsnData, setModifyHsnData] = useState<any>(null)

  const [isSaltMasterOpen, setIsSaltMasterOpen] = useState(false)
  const [isSmartMRPOpen, setIsSmartMRPOpen] = useState(false)
  const [modifySaltData, setModifySaltData] = useState<any>(null)
  useReturnNavigation(isAdding || isCompanyLookupOpen || isHsnLookupOpen || isSaltLookupOpen || isCompanyMasterOpen || isHsnMasterOpen || isSaltMasterOpen);
  
  const [companies, setCompanies] = useState<{id: string, label: string, data?: any}[]>([])
  const [hsns, setHsns] = useState<{id: string, label: string, description?: string, data?: any}[]>([])
  const [salts, setSalts] = useState<{id: string, label: string, data?: any}[]>([])

  // Marg ERP form state
  const [newProduct, setNewProduct] = useState<ProductCreatePayload>({
    status: 'continue',
    hide: 'no',
    code: '1',
    name: '',
    packing: '',
    unit: '',
    colour_type: 'normal',
    item_type: 'normal',
    company_name: '',
    salt: '',
    hsn_applicable: 'no',
    hsn_code: '',
    local_tax: 'taxable',
    central_tax: 'taxable',
    sgst_percent: 0,
    cgst_percent: 0,
    igst_percent: 0,
    mrp: 0,
    p_rate: 0,
    pts_rate: 0,
    rate_a: 0,
    ptr_rate: 0,
    item_discount_percent: 0,
    discount_type: 'applicable',
    category: 'na',
    min_stock_level: 0,
    reorder_quantity: 0
  })

  // ── Marg Real-time Pricing Logic ──
  // User formulas: 
  // Rate-A = {(M.R.P-20%) / (IGST/100)+1}
  // P.Rate = Rate-A - 10%
  // P.T.R = Rate-A
  // P.T.S = P.Rate
  useEffect(() => {
    // Only auto-calc if MRP > 0.
    if (newProduct.mrp > 0) {
      const discountedMrp = newProduct.mrp - (newProduct.mrp * 0.20)
      const taxDivisor = 1 + (newProduct.igst_percent / 100)
      
      const calcRateA = Number((discountedMrp / taxDivisor).toFixed(2))
      const calcPRate = Number((calcRateA - (calcRateA * 0.10)).toFixed(2))

      setNewProduct(prev => ({
        ...prev,
        rate_a: calcRateA,
        ptr_rate: calcRateA, // Defaults to Rate A
        p_rate: calcPRate,
        pts_rate: calcPRate  // Defaults to P.Rate
      }))
    }
  }, [newProduct.mrp, newProduct.igst_percent])

  // ── GST Interconnected Math ──
  const handleSGSTChange = (val: number) => {
    setNewProduct(prev => ({
      ...prev,
      sgst_percent: val,
      cgst_percent: val,
      igst_percent: val * 2
    }))
  }

  const handleCGSTChange = (val: number) => {
    setNewProduct(prev => ({
      ...prev,
      cgst_percent: val,
      sgst_percent: val,
      igst_percent: val * 2
    }))
  }

  const handleIGSTChange = (val: number) => {
    setNewProduct(prev => ({
      ...prev,
      igst_percent: val,
      sgst_percent: val / 2,
      cgst_percent: val / 2
    }))
  }


  useEffect(() => {
    fetchProducts()
    fetchMasterData()
  }, [])

  const fetchMasterData = async () => {
    try {
      const [mans, slts, hsnData] = await Promise.all([
        apiGetManufacturers(),
        apiGetSalts(),
        apiGetHSNCodes()
      ])
      setCompanies(mans.map(m => ({ id: m.id || '', label: m.name, data: m })))
      setSalts(slts.map(s => ({ id: s.id || '', label: s.formula, data: s })))
      setHsns(hsnData.map(h => ({
        id: h.id || '',
        label: h.code,
        description: `${h.description || ''} (IGST ${h.igst}%)`,
        data: h
      })))
    } catch (e) {
      console.error('Failed to fetch master data:', e)
    }
  }

  const fetchProducts = async () => {
    setIsLoading(true)
    try {
      const apiData = await apiGetProducts()
      const localData = JSON.parse(localStorage.getItem('erp_inventory_items') || '[]')
      const mergedMap = new Map()
      ;[...localData, ...apiData].forEach(p => {
        if (p && p.name) {
          mergedMap.set(p.name.trim().toLowerCase(), p)
        }
      })
      const finalProducts = Array.from(mergedMap.values())
      setProducts(finalProducts)
      localStorage.setItem('erp_inventory_items', JSON.stringify(finalProducts))
    } catch (error) {
      console.error("Failed to fetch products from API, loading from localStorage:", error)
      const localData = JSON.parse(localStorage.getItem('erp_inventory_items') || '[]')
      setProducts(localData)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (actionParam === 'create') {
      setModifyingProductId(null)
      setIsAdding(true)
    } else if (actionParam === 'modify') {
      setIsAdding(false)
    }
  }, [actionParam])

  const handleModifyProduct = (product: Product) => {
    setModifyingProductId(product.id)
    setNewProduct({
      status: (product.status as any) || 'continue',
      hide: (product.hide as any) || 'no',
      code: product.code || '1',
      name: product.name || '',
      packing: product.packing || '',
      unit: product.unit || '',
      colour_type: (product.colour_type as any) || 'normal',
      item_type: (product.item_type as any) || 'normal',
      company_name: product.company_name || '',
      salt: product.salt || '',
      hsn_applicable: (product.hsn_applicable as any) || 'no',
      hsn_code: product.hsn_code || '',
      min_stock_level: product.min_stock_level || 0,
      reorder_quantity: product.reorder_quantity || 0,
      local_tax: (product.local_tax as any) || 'taxable',
      central_tax: (product.central_tax as any) || 'taxable',
      sgst_percent: product.sgst_percent || 0,
      cgst_percent: product.cgst_percent || 0,
      igst_percent: product.igst_percent || 0,
      mrp: product.mrp || 0,
      p_rate: product.p_rate || 0,
      pts_rate: product.pts_rate || 0,
      rate_a: product.rate_a || 0,
      ptr_rate: product.ptr_rate || 0,
      item_discount_percent: product.item_discount_percent || 0,
      discount_type: (product.discount_type as any) || 'applicable',
      category: (product.category as any) || 'na'
    })
    setIsAdding(true)
  }

  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const newErrors: Record<string, string> = {}
    if (!newProduct.name) newErrors.name = "Required"
    if (!newProduct.category) newErrors.category = "Required"
    if (!newProduct.hsn_code) newErrors.hsn_code = "Required"
    
    if (Number(newProduct.mrp) < 0) newErrors.mrp = "Cannot be negative"
    if (Number(newProduct.p_rate) < 0) newErrors.p_rate = "Cannot be negative"
    if (Number(newProduct.pts_rate) < 0) newErrors.pts_rate = "Cannot be negative"
    
    if (Object.keys(newErrors).length > 0) {
      setFormErrors(newErrors)
      return
    }
    setFormErrors({})

    if (modifyingProductId) {
      const updatedProducts = products.map(p => 
        p.id === modifyingProductId ? { ...p, ...newProduct } : p
      )
      setProducts(updatedProducts)
      localStorage.setItem('erp_inventory_items', JSON.stringify(updatedProducts))
      setIsAdding(false)
      setModifyingProductId(null)
      return
    }

    let created: Product
    try {
      created = await apiCreateProduct(newProduct)
    } catch (error) {
      console.error("Failed to create product via API, saving to localStorage:", error)
      created = {
        ...newProduct,
        id: 'local_' + Date.now(),
        company_id: '1',
        created_at: new Date().toISOString()
      } as Product
    }
    const updatedProducts = [created, ...products]
    setProducts(updatedProducts)
    localStorage.setItem('erp_inventory_items', JSON.stringify(updatedProducts))
    setIsAdding(false)
    // Reset form
    setNewProduct({
      ...newProduct,
      code: (parseInt(newProduct.code) || updatedProducts.length + 1).toString(), // Auto-increment code
      name: '', packing: '', unit: '', salt: '',
      mrp: 0, p_rate: 0, pts_rate: 0, rate_a: 0, ptr_rate: 0
    })
  }

  // ── Enter Navigation Logic ──
  const handleFormKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === 'Enter') {
      const target = e.target as HTMLElement
      // If it's a button or textarea, let default action happen
      if (target.tagName === 'BUTTON' || target.tagName === 'TEXTAREA') return

      e.preventDefault() // Prevent form submission
      
      const form = e.currentTarget
      // Find all focusable elements
      const focusable = Array.from(
        form.querySelectorAll<HTMLElement>('input:not([disabled]), select:not([disabled]), button[type="submit"]')
      )
      
      const currentIndex = focusable.indexOf(target)
      if (currentIndex > -1 && currentIndex < focusable.length - 1) {
        focusable[currentIndex + 1].focus()
      }
    }
  }

  // Generic change handler for selects
  const handleSelect = (field: keyof ProductCreatePayload) => (e: React.ChangeEvent<any>) => {
    setNewProduct(prev => ({ ...prev, [field]: e.target.value }))
  }

  return (
    <div style={{ height: "100%", overflowY: "auto", maxWidth: '1200px', animation: 'fadeIn 0.3s ease-in-out' }}>
      
      {/* ── HEADER & ACTIONS ────────────────────────────────── */}
      <div style={{ 
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
        marginBottom: '24px' 
      }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, color: 'var(--color-text)', marginBottom: '4px' }}>
            Products & Items
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>
            Manage Marg-style inventory profiles and dynamic pricing.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Button variant="secondary" leftIcon={<Download size={16} />}>
            Export
          </Button>
          <Button variant="secondary" leftIcon={<TrendingUp size={16} />} onClick={() => setIsSmartMRPOpen(true)}>
            Smart MRP
          </Button>
          <Button variant="primary" leftIcon={<Plus size={16} />} onClick={() => { setModifyingProductId(null); setIsAdding(true); }}>
            Add Product
          </Button>
        </div>
      </div>

      {/* ── ADD PRODUCT MODAL (MARG WORKFLOW) ──────────────────── */}
      <Modal 
        isOpen={isAdding} 
        onClose={() => { setIsAdding(false); setModifyingProductId(null); }} 
        title={modifyingProductId ? "Modify Item (Product Profile)" : "Item Creation (Product Profile)"}
        maxWidth="1000px" // Very wide modal for dense layout
      >
        <form onSubmit={handleCreateSubmit} onKeyDown={handleFormKeyDown}>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            
            {/* LEFT COLUMN: General & Compliance */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ padding: '8px', backgroundColor: 'var(--color-bg-hover)', borderRadius: 'var(--radius-sm)', marginBottom: '8px' }}>
                <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>General Details</h3>
              </div>
              
              <Input variant="dense" label="Status" as="select" value={newProduct.status} onChange={handleSelect('status')}>
                <option value="continue">Continue</option>
                <option value="close">Close</option>
              </Input>
              <Input variant="dense" label="Hide" as="select" value={newProduct.hide} onChange={handleSelect('hide')}>
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </Input>
              <Input variant="dense" label="Code" value={newProduct.code} onChange={e => setNewProduct({...newProduct, code: e.target.value})} />
              <Input variant="dense" label="Product Name *" error={formErrors.name} required value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} />
              <Input variant="dense" label="Packing" placeholder="10x10" value={newProduct.packing} onChange={e => setNewProduct({...newProduct, packing: e.target.value})} />
              <Input variant="dense" label="Unit" placeholder="Tabs" value={newProduct.unit} onChange={e => setNewProduct({...newProduct, unit: e.target.value})} />
              <Input variant="dense" label="Colour Type" as="select" value={newProduct.colour_type} onChange={handleSelect('colour_type')}>
                <option value="normal">Normal</option>
                <option value="red">Red</option>
                <option value="blue">Blue</option>
                <option value="green">Green</option>
              </Input>
              <Input variant="dense" label="Item Type" as="select" value={newProduct.item_type} onChange={handleSelect('item_type')}>
                <option value="normal">Normal</option>
                <option value="cold storage">Cold Storage</option>
                <option value="costly">Costly</option>
              </Input>
              <Input 
                variant="dense"
                label="Company Name" 
                placeholder="Press Enter to search..." 
                value={newProduct.company_name} 
                onChange={e => setNewProduct({...newProduct, company_name: e.target.value})}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    e.stopPropagation()
                    setIsCompanyLookupOpen(true)
                  }
                }} 
              />
              <Input 
                variant="dense" 
                label="Salt" 
                placeholder="Press Enter to search..." 
                value={newProduct.salt} 
                onChange={e => setNewProduct({...newProduct, salt: e.target.value})}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    e.stopPropagation()
                    setIsSaltLookupOpen(true)
                  }
                }} 
              />
              <Input variant="dense" label="Category" as="select" value={newProduct.category} onChange={handleSelect('category')}>
                <option value="na">N/A</option>
                <option value="schedule h">Schedule H</option>
                <option value="schedule h1">Schedule H1</option>
                <option value="narcotics">Narcotics</option>
              </Input>
            </div>

            {/* RIGHT COLUMN: Taxation & Pricing */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ padding: '8px', backgroundColor: 'var(--color-bg-hover)', borderRadius: 'var(--radius-sm)', marginBottom: '8px' }}>
                <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>Taxation & Pricing</h3>
              </div>

              <Input variant="dense" label="HSN Applicable" as="select" value={newProduct.hsn_applicable} onChange={handleSelect('hsn_applicable')}>
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </Input>
              {newProduct.hsn_applicable === 'yes' && (
                 <Input 
                   variant="dense"
                   label="HSN Code" 
                   placeholder="Press Enter to search..." 
                   value={newProduct.hsn_code} 
                   onChange={e => setNewProduct({...newProduct, hsn_code: e.target.value})}
                   onKeyDown={(e) => {
                     if (e.key === 'Enter') {
                       e.preventDefault()
                       e.stopPropagation()
                       setIsHsnLookupOpen(true)
                     }
                   }}
                 />
              )}
              <Input variant="dense" label="Local Tax" as="select" value={newProduct.local_tax} onChange={handleSelect('local_tax')}>
                <option value="taxable">Taxable</option>
                <option value="tax paid">Tax Paid</option>
                <option value="exempted">Exempted</option>
              </Input>
              <Input variant="dense" label="Central Tax" as="select" value={newProduct.central_tax} onChange={handleSelect('central_tax')}>
                <option value="taxable">Taxable</option>
                <option value="tax paid">Tax Paid</option>
                <option value="exempted">Exempted</option>
              </Input>
              <Input variant="dense" label="SGST %" type="number" step="0.01" value={newProduct.sgst_percent} onChange={e => handleSGSTChange(Number(e.target.value))} />
              <Input variant="dense" label="CGST %" type="number" step="0.01" value={newProduct.cgst_percent} onChange={e => handleCGSTChange(Number(e.target.value))} />
              <Input variant="dense" label="IGST %" type="number" step="0.01" value={newProduct.igst_percent} onChange={e => handleIGSTChange(Number(e.target.value))} />
              
              <div style={{ marginTop: '8px', borderTop: '1px solid var(--color-border)', paddingTop: '12px' }}>
                <Input variant="dense" label="M.R.P (₹)" error={formErrors.mrp} type="number" step="0.01" required value={newProduct.mrp} onChange={e => setNewProduct({...newProduct, mrp: Number(e.target.value)})} />
                <Input variant="dense" label="Rate-A" type="number" step="0.01" value={newProduct.rate_a} onChange={e => setNewProduct({...newProduct, rate_a: Number(e.target.value)})} />
                <Input variant="dense" label="P.T.R" type="number" step="0.01" value={newProduct.ptr_rate} onChange={e => setNewProduct({...newProduct, ptr_rate: Number(e.target.value)})} />
                <Input variant="dense" label="P.Rate" error={formErrors.p_rate} type="number" step="0.01" value={newProduct.p_rate} onChange={e => setNewProduct({...newProduct, p_rate: Number(e.target.value)})} />
                <Input variant="dense" label="P.T.S" error={formErrors.pts_rate} type="number" step="0.01" value={newProduct.pts_rate} onChange={e => setNewProduct({...newProduct, pts_rate: Number(e.target.value)})} />
                <Input variant="dense" label="Item Discount %" type="number" step="0.01" value={newProduct.item_discount_percent} onChange={e => setNewProduct({...newProduct, item_discount_percent: Number(e.target.value)})} />
                <Input variant="dense" label="Discount Status" as="select" value={newProduct.discount_type} onChange={handleSelect('discount_type')}>
                  <option value="applicable">Applicable</option>
                  <option value="no discount">No Discount</option>
                  <option value="no sch discount">No Sch Discount</option>
                  <option value="no schem">No Schem</option>
                </Input>
              </div>
              
              <div style={{ marginTop: '8px', borderTop: '1px solid var(--color-border)', paddingTop: '12px' }}>
                <h4 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '8px' }}>MRP & Reorder Planning</h4>
                <Input variant="dense" label="Min Stock Level" type="number" min="0" value={newProduct.min_stock_level} onChange={e => setNewProduct({...newProduct, min_stock_level: parseInt(e.target.value) || 0})} />
                <Input variant="dense" label="Reorder Qty" type="number" min="0" value={newProduct.reorder_quantity} onChange={e => setNewProduct({...newProduct, reorder_quantity: parseInt(e.target.value) || 0})} />
              </div>
            </div>

          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--color-border)' }}>
            <Button type="button" variant="secondary" onClick={() => setIsAdding(false)}>Cancel</Button>
            <Button type="submit" variant="primary">Save Product Profile</Button>
          </div>
        </form>
      </Modal>

      {/* ── LOOKUP MODALS ────────────────────────────────────── */}
      <LookupModal
        isOpen={isCompanyLookupOpen}
        onClose={() => setIsCompanyLookupOpen(false)}
        title="Select Company"
        items={companies}
        onSelect={(item) => {
          setNewProduct({ ...newProduct, company_name: item.label })
          setIsCompanyLookupOpen(false)
        }}
        onCreateNew={() => {
          setIsCompanyLookupOpen(false)
          setModifyCompanyData(null)
          setIsCompanyMasterOpen(true)
        }}
        onModify={(item) => {
          if (item.data) {
            setIsCompanyLookupOpen(false)
            setModifyCompanyData(item.data)
            setIsCompanyMasterOpen(true)
          }
        }}
      />

      <LookupModal
        isOpen={isSaltLookupOpen}
        onClose={() => setIsSaltLookupOpen(false)}
        title="Select Salt Formula"
        items={salts}
        onSelect={(item) => {
          setNewProduct({ ...newProduct, salt: item.label })
          setIsSaltLookupOpen(false)
        }}
        onCreateNew={() => {
          setIsSaltLookupOpen(false)
          setModifySaltData(null)
          setIsSaltMasterOpen(true)
        }}
        onModify={(item) => {
          if (item.data) {
            setIsSaltLookupOpen(false)
            setModifySaltData(item.data)
            setIsSaltMasterOpen(true)
          }
        }}
      />

      <LookupModal
        isOpen={isHsnLookupOpen}
        onClose={() => setIsHsnLookupOpen(false)}
        title="Select HSN Code"
        items={hsns}
        onSelect={(item) => {
          if (item.data) {
            setNewProduct({ 
              ...newProduct, 
              hsn_code: item.label,
              igst_percent: item.data.igst,
              cgst_percent: item.data.igst / 2,
              sgst_percent: item.data.igst / 2
            })
          } else {
            setNewProduct({ ...newProduct, hsn_code: item.label })
          }
          setIsHsnLookupOpen(false)
        }}
        onCreateNew={() => {
          setIsHsnLookupOpen(false)
          setModifyHsnData(null)
          setIsHsnMasterOpen(true)
        }}
        onModify={(item) => {
          if (item.data) {
            setIsHsnLookupOpen(false)
            setModifyHsnData(item.data)
            setIsHsnMasterOpen(true)
          }
        }}
      />

      {/* 🚀 MASTER MODALS 
      =============================================================== */}
      <CompanyMasterModal 
        isOpen={isCompanyMasterOpen} 
        initialData={modifyCompanyData}
        onClose={() => setIsCompanyMasterOpen(false)} 
        onSave={(savedItem) => {
          // If we updated an existing item, replace it in the list. Otherwise append.
          const newLookupItem = { id: savedItem.id, label: savedItem.name, data: savedItem }
          setCompanies(prev => {
            const exists = prev.findIndex(p => p.id === savedItem.id)
            if (exists >= 0) {
              const next = [...prev]; next[exists] = newLookupItem; return next;
            }
            return [...prev, newLookupItem]
          })
          setNewProduct({ ...newProduct, company_name: savedItem.name })
        }} 
      />

      <SaltMasterModal 
        isOpen={isSaltMasterOpen} 
        initialData={modifySaltData}
        onClose={() => setIsSaltMasterOpen(false)} 
        onSave={(savedItem) => {
          const newLookupItem = { id: savedItem.id, label: savedItem.formula, data: savedItem }
          setSalts(prev => {
            const exists = prev.findIndex(p => p.id === savedItem.id)
            if (exists >= 0) {
              const next = [...prev]; next[exists] = newLookupItem; return next;
            }
            return [...prev, newLookupItem]
          })
          setNewProduct({ ...newProduct, salt: savedItem.formula })
        }} 
      />

      <HSNMasterModal 
        isOpen={isHsnMasterOpen} 
        initialData={modifyHsnData}
        onClose={() => setIsHsnMasterOpen(false)} 
        onSave={(savedItem) => {
          const newLookupItem = { 
            id: savedItem.id, 
            label: savedItem.code, 
            description: `${savedItem.description || ''} (IGST ${savedItem.igst}%)`,
            data: savedItem 
          }
          setHsns(prev => {
            const exists = prev.findIndex(p => p.id === savedItem.id)
            if (exists >= 0) {
              const next = [...prev]; next[exists] = newLookupItem; return next;
            }
            return [...prev, newLookupItem]
          })
          setNewProduct({ 
            ...newProduct, 
            hsn_code: savedItem.code,
            igst_percent: savedItem.igst,
            cgst_percent: savedItem.cgst,
            sgst_percent: savedItem.sgst
          })
        }} 
      />

      {/* ── PRODUCT DATA TABLE ──────────────────────────────── */}
      {actionParam === 'modify' && (
        <div style={{
          marginBottom: '16px',
          padding: '12px 16px',
          backgroundColor: 'rgba(79, 70, 229, 0.1)',
          border: '1px solid var(--color-primary)',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: 'var(--color-primary)',
          fontWeight: 500,
          fontSize: '14px'
        }}>
          <span>✏️ <b>Modify Product Mode:</b> Click on any product or click "Modify" below to update its item setup, GST rates, and pricing formulas.</span>
        </div>
      )}

      <Card padding="none">
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-hover)' }}>
                <th style={{ padding: '16px', fontSize: '12px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Product Name</th>
                <th style={{ padding: '16px', fontSize: '12px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Packing</th>
                <th style={{ padding: '16px', fontSize: '12px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>M.R.P</th>
                <th style={{ padding: '16px', fontSize: '12px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Rate-A</th>
                <th style={{ padding: '16px', fontSize: '12px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>P.Rate</th>
                <th style={{ padding: '16px', fontSize: '12px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: 600, textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr 
                  key={product.id} 
                  style={{ 
                    borderBottom: '1px solid var(--color-border)',
                    cursor: 'pointer',
                    backgroundColor: actionParam === 'modify' ? 'rgba(79, 70, 229, 0.03)' : 'transparent',
                    transition: 'background-color var(--transition-fast)'
                  }}
                  onClick={() => handleModifyProduct(product)}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)' }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = actionParam === 'modify' ? 'rgba(79, 70, 229, 0.03)' : 'transparent' }}
                >
                  <td style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Package size={16} color="var(--color-text-secondary)" />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{product.name}</div>
                        <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Code: {product.code} | {product.company_name}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '16px', color: 'var(--color-text-secondary)' }}>{product.packing} {product.unit}</td>
                  <td style={{ padding: '16px', fontWeight: 600, color: 'var(--color-text-primary)' }}>{formatCurrency(product.mrp)}</td>
                  <td style={{ padding: '16px', color: 'var(--color-success)' }}>{formatCurrency(product.rate_a)}</td>
                  <td style={{ padding: '16px', color: 'var(--color-primary)' }}>{formatCurrency(product.p_rate)}</td>
                  <td style={{ padding: '16px', textAlign: 'center' }}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleModifyProduct(product)
                      }}
                      style={{
                        padding: '5px 12px',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: 'var(--color-primary)',
                        backgroundColor: 'rgba(79, 70, 229, 0.1)',
                        border: '1px solid var(--color-primary)',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      Modify
                    </button>
                  </td>
                </tr>
              ))}
              {products.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    No products found. Click "Add Product" or choose "Create" from the top menu to add one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <SmartMRPModal 
        isOpen={isSmartMRPOpen} 
        onClose={() => setIsSmartMRPOpen(false)} 
        onApplied={() => {
          fetchProducts() // Refresh the table
        }}
      />
    </div>
  )
}

