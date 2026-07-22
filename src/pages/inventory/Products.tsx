import React, { useState, useEffect } from 'react'
import { Plus, Download, Package } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { LookupModal } from '../../components/ui/LookupModal'
import { CreateCompanyModal } from '../../components/ui/CreateCompanyModal'
import { CreateHSNModal } from '../../components/ui/CreateHSNModal'
import { apiGetProducts, apiCreateProduct, ProductCreatePayload, Product } from '../../lib/api'

// Mock Data for Lookups
const MOCK_COMPANIES = [
  { id: '1', label: 'Cipla Ltd' },
  { id: '2', label: 'Sun Pharma' },
  { id: '3', label: 'Mankind Pharma' },
]

const MOCK_HSN = [
  { id: '1', label: '3004', description: 'Medicaments (IGST 12%)', data: { igst: 12 } },
  { id: '2', label: '3005', description: 'Wadding, gauze, bandages (IGST 5%)', data: { igst: 5 } },
  { id: '3', label: '3304', description: 'Beauty or make-up prep (IGST 18%)', data: { igst: 18 } },
]

// Simple helper to format currency
const formatCurrency = (val: number) => `₹${val.toFixed(2)}`

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [isCompanyLookupOpen, setIsCompanyLookupOpen] = useState(false)
  const [isHsnLookupOpen, setIsHsnLookupOpen] = useState(false)
  const [isCreatingCompany, setIsCreatingCompany] = useState(false)
  const [isCreatingHSN, setIsCreatingHSN] = useState(false)
  
  const [companies, setCompanies] = useState(MOCK_COMPANIES)
  const [hsns, setHsns] = useState(MOCK_HSN)

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
    category: 'na'
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
  }, [])

  const fetchProducts = async () => {
    setIsLoading(true)
    try {
      const data = await apiGetProducts()
      setProducts(data)
    } catch (error) {
      console.error("Failed to fetch products:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const created = await apiCreateProduct(newProduct)
      setProducts([created, ...products])
      setIsAdding(false)
      // Reset form
      setNewProduct({
        ...newProduct,
        code: (parseInt(newProduct.code) + 1).toString(), // Auto-increment code
        name: '', packing: '', unit: '', salt: '',
        mrp: 0, p_rate: 0, pts_rate: 0, rate_a: 0, ptr_rate: 0
      })
    } catch (error) {
      console.error("Failed to create product:", error)
    }
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
    <div style={{ maxWidth: '1200px', animation: 'fadeIn 0.3s ease-in-out' }}>
      
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
          <Button variant="primary" leftIcon={<Plus size={16} />} onClick={() => setIsAdding(true)}>
            Add Product
          </Button>
        </div>
      </div>

      {/* ── ADD PRODUCT MODAL (MARG WORKFLOW) ──────────────────── */}
      <Modal 
        isOpen={isAdding} 
        onClose={() => setIsAdding(false)} 
        title="Item Creation (Product Profile)"
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
              <Input variant="dense" label="Product Name *" required value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} />
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
              <Input variant="dense" label="Salt" value={newProduct.salt} onChange={e => setNewProduct({...newProduct, salt: e.target.value})} />
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
                <Input variant="dense" label="M.R.P (₹)" type="number" step="0.01" required value={newProduct.mrp} onChange={e => setNewProduct({...newProduct, mrp: Number(e.target.value)})} />
                <Input variant="dense" label="Rate-A" type="number" step="0.01" value={newProduct.rate_a} onChange={e => setNewProduct({...newProduct, rate_a: Number(e.target.value)})} />
                <Input variant="dense" label="P.T.R" type="number" step="0.01" value={newProduct.ptr_rate} onChange={e => setNewProduct({...newProduct, ptr_rate: Number(e.target.value)})} />
                <Input variant="dense" label="P.Rate" type="number" step="0.01" value={newProduct.p_rate} onChange={e => setNewProduct({...newProduct, p_rate: Number(e.target.value)})} />
                <Input variant="dense" label="P.T.S" type="number" step="0.01" value={newProduct.pts_rate} onChange={e => setNewProduct({...newProduct, pts_rate: Number(e.target.value)})} />
                <Input variant="dense" label="Item Discount %" type="number" step="0.01" value={newProduct.item_discount_percent} onChange={e => setNewProduct({...newProduct, item_discount_percent: Number(e.target.value)})} />
                <Input variant="dense" label="Discount Status" as="select" value={newProduct.discount_type} onChange={handleSelect('discount_type')}>
                  <option value="applicable">Applicable</option>
                  <option value="no discount">No Discount</option>
                  <option value="no sch discount">No Sch Discount</option>
                  <option value="no schem">No Schem</option>
                </Input>
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
          setIsCreatingCompany(true)
        }}
      />

      <LookupModal
        isOpen={isHsnLookupOpen}
        onClose={() => setIsHsnLookupOpen(false)}
        title="Select HSN Code"
        items={hsns}
        onSelect={(item) => {
          // If the item has attached GST data, auto-fill it
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
          setIsCreatingHSN(true)
        }}
      />

      {/* ── CREATION MODALS ──────────────────────────────────── */}
      <CreateCompanyModal 
        isOpen={isCreatingCompany} 
        onClose={() => setIsCreatingCompany(false)} 
        onSave={(newComp) => {
          // Add to local list and select
          const newLookupItem = { id: Date.now().toString(), label: newComp.name }
          setCompanies([...companies, newLookupItem])
          setNewProduct({ ...newProduct, company_name: newComp.name })
          setIsCreatingCompany(false)
        }} 
      />

      <CreateHSNModal 
        isOpen={isCreatingHSN} 
        onClose={() => setIsCreatingHSN(false)} 
        onSave={(newHsn) => {
          // Add to local list and select
          const newLookupItem = { 
            id: Date.now().toString(), 
            label: newHsn.code, 
            description: `${newHsn.description} (IGST ${newHsn.igst}%)`,
            data: { igst: newHsn.igst }
          }
          setHsns([...hsns, newLookupItem])
          setNewProduct({ 
            ...newProduct, 
            hsn_code: newHsn.code,
            igst_percent: newHsn.igst,
            cgst_percent: newHsn.cgst,
            sgst_percent: newHsn.sgst
          })
          setIsCreatingHSN(false)
        }} 
      />

      {/* ── PRODUCT DATA TABLE ──────────────────────────────── */}
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
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
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
                </tr>
              ))}
              {products.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    No products found. Click "Add Product" to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
