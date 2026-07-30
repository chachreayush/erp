import React, { useState, useEffect } from 'react'
import { useSearchParams, useLocation } from 'react-router-dom'
import { Plus, Trash2, Search, FileText, CheckCircle2, ListFilter, Printer } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { apiGetProducts, Product, apiCreateInvoice, InvoiceCreatePayload, InvoiceItem, apiGetInvoices, Invoice } from '../../lib/api'

export default function BillingPage() {
  const [searchParams] = useSearchParams()
  const location = useLocation()
  
  const type = searchParams.get('type') || 'bill' // bill, challan, modify-bill, modify-challan
  const path = location.pathname

  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [invoices, setInvoices] = useState<Invoice[]>([])

  // Invoice state
  const [customerName, setCustomerName] = useState('')
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [items, setItems] = useState<InvoiceItem[]>([])
  
  // Product Search Modal
  const [isProductModalOpen, setIsProductModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  
  // Success state
  const [showSuccess, setShowSuccess] = useState(false)

  // Get configuration dynamically based on path and type
  const getModuleConfig = () => {
    const isModify = type.startsWith('modify')
    switch (path) {
      case '/purchase':
        return {
          title: isModify ? 'Modify Purchases' : 'Purchase Bill',
          sub: isModify ? 'View and reprint purchase bills' : 'Create new purchase bills',
          prefix: type === 'challan' ? 'PCHL' : 'PUR',
          saveLabel: type === 'challan' ? 'Save & Print Purchase Challan' : 'Save & Print Purchase'
        }
      case '/sales-return':
        return {
          title: type === 'challan' ? 'Sale Return Challan' : type === 'modify-challan' ? 'Modify Sale Return Challans' : isModify ? 'Modify Credit Notes' : 'Credit Note (Sale Return)',
          sub: type === 'challan' ? 'Create sale return challan' : type === 'modify-challan' ? 'View and reprint sale return challans' : isModify ? 'View credit notes' : 'Create credit note for returns',
          prefix: type.includes('challan') ? 'SRCHL' : 'CRN',
          saveLabel: type === 'challan' ? 'Save & Print Challan' : 'Save Credit Note'
        }
      case '/purchase-return':
        return {
          title: type === 'challan' ? 'Purchase Return Challan' : type === 'modify-challan' ? 'Modify Purchase Return Challans' : isModify ? 'Modify Debit Notes' : 'Debit Note (Purchase Return)',
          sub: type === 'challan' ? 'Create purchase return challan' : type === 'modify-challan' ? 'View and reprint purchase return challans' : isModify ? 'View debit notes' : 'Create debit note for returns',
          prefix: type.includes('challan') ? 'PRCHL' : 'DBN',
          saveLabel: type === 'challan' ? 'Save & Print Challan' : 'Save Debit Note'
        }
      case '/brk-receive':
        return {
          title: type === 'challan' ? 'Brk/Exp Receive Challan' : type === 'modify-challan' ? 'Modify Brk/Exp Receive Challans' : isModify ? 'Modify Brk/Exp Receive Entries' : 'Brk/Exp Receive Entry',
          sub: type === 'challan' ? 'Create breakage/expiry receive challan' : type === 'modify-challan' ? 'View and reprint receive challans' : isModify ? 'View receive entries' : 'Create breakage/expiry receive entry',
          prefix: type.includes('challan') ? 'BRCHL' : 'BKR',
          saveLabel: type === 'challan' ? 'Save & Print Challan' : 'Save Entry'
        }
      case '/brk-issue':
        return {
          title: type === 'challan' ? 'Brk/Exp Issue Challan' : type === 'modify-challan' ? 'Modify Brk/Exp Issue Challans' : isModify ? 'Modify Brk/Exp Issue Entries' : 'Brk/Exp Issue Entry',
          sub: type === 'challan' ? 'Create breakage/expiry issue challan' : type === 'modify-challan' ? 'View and reprint issue challans' : isModify ? 'View issue entries' : 'Create breakage/expiry issue entry',
          prefix: type.includes('challan') ? 'BICHL' : 'BKI',
          saveLabel: type === 'challan' ? 'Save & Print Challan' : 'Save Entry'
        }
      case '/gst-inward':
        return {
          title: isModify ? 'Modify GST Inward' : 'GST Inward (Expenses)',
          sub: isModify ? 'View entries' : 'Create GST inward entry for expenses',
          prefix: 'GTI',
          saveLabel: 'Save Entry'
        }
      case '/gst-outward':
        return {
          title: isModify ? 'Modify GST Outward' : 'GST Outward (Services)',
          sub: isModify ? 'View entries' : 'Create GST outward entry for services',
          prefix: 'GTO',
          saveLabel: 'Save Entry'
        }
      case '/stock-issue':
        return {
          title: isModify ? 'Modify Stock Issue' : 'Stock Issue Entry',
          sub: isModify ? 'View entries' : 'Create stock issue entry',
          prefix: 'STI',
          saveLabel: 'Save Entry'
        }
      case '/stock-receive':
        return {
          title: isModify ? 'Modify Stock Receive' : 'Stock Receive Entry',
          sub: isModify ? 'View entries' : 'Create stock receive entry',
          prefix: 'STR',
          saveLabel: 'Save Entry'
        }
      case '/sales-order':
        return {
          title: isModify ? 'Modify Sales Orders' : 'Sales Order Entry',
          sub: isModify ? 'View entries' : 'Create sales order entry',
          prefix: 'SORD',
          saveLabel: 'Save Order'
        }
      default:
        return {
          title: type === 'challan' ? 'Sales Challan' : isModify ? 'Modify Bills' : 'Billing & POS',
          sub: type === 'challan' ? 'Generate dispatch challan' : isModify ? 'View and reprint bills' : 'Create new sales invoices instantly',
          prefix: type === 'challan' ? 'CHL' : 'INV',
          saveLabel: type === 'challan' ? 'Save & Print Challan' : 'Save & Print Invoice'
        }
    }
  }

  const config = getModuleConfig()

  // Load prefix/postfix depending on type
  useEffect(() => {
    setInvoiceNumber(`${config.prefix}-${Date.now().toString().slice(-6)}`)
  }, [type, path])

  useEffect(() => {
    fetchProducts()
    if (type.startsWith('modify')) {
      fetchInvoices()
    }
  }, [type, path])

  const fetchProducts = async () => {
    try {
      const apiData = await apiGetProducts()
      const localData = JSON.parse(localStorage.getItem('erp_inventory_items') || '[]')
      const map = new Map()
      ;[...localData, ...apiData].forEach(p => {
        if (p && p.name) map.set(p.name.trim().toLowerCase(), p)
      })
      setProducts(Array.from(map.values()))
    } catch (err) {
      console.error('Failed to load products from API, using localStorage:', err)
      const localData = JSON.parse(localStorage.getItem('erp_inventory_items') || '[]')
      setProducts(localData)
    }
  }

  const fetchInvoices = async () => {
    setIsLoading(true)
    try {
      const data = await apiGetInvoices()
      setInvoices(data)
    } catch (err) {
      console.error('Failed to load invoices', err)
    } finally {
      setIsLoading(false)
    }
  }

  const addProductToInvoice = (product: Product) => {
    const existingItemIndex = items.findIndex(item => item.product_id === product.id)
    
    if (existingItemIndex >= 0) {
      const newItems = [...items]
      const item = newItems[existingItemIndex]
      item.quantity += 1
      item.line_total = item.quantity * item.rate * (1 + item.igst_percent / 100)
      setItems(newItems)
    } else {
      const newItem: InvoiceItem = {
        product_id: product.id,
        product_name: product.name,
        quantity: 1,
        rate: product.mrp > 0 ? product.mrp : 0,
        igst_percent: product.igst_percent || 0,
        line_total: product.mrp * (1 + (product.igst_percent || 0) / 100)
      }
      setItems([...items, newItem])
    }
    
    setIsProductModalOpen(false)
    setSearchQuery('')
  }

  const updateQuantity = (index: number, newQty: number) => {
    if (newQty < 1) return
    const newItems = [...items]
    const item = newItems[index]
    item.quantity = newQty
    item.line_total = item.quantity * item.rate * (1 + item.igst_percent / 100)
    setItems(newItems)
  }

  const updateRate = (index: number, newRate: number) => {
    if (newRate < 0) return
    const newItems = [...items]
    const item = newItems[index]
    item.rate = newRate
    item.line_total = item.quantity * item.rate * (1 + item.igst_percent / 100)
    setItems(newItems)
  }

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  // Financial Calculations
  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.rate), 0)
  const taxTotal = items.reduce((sum, item) => sum + ((item.quantity * item.rate) * (item.igst_percent / 100)), 0)
  const grandTotal = subtotal + taxTotal

  const handleSaveInvoice = async () => {
    if (items.length === 0 || !customerName) {
      alert("Please enter customer name and add at least one item.")
      return
    }
    
    setIsLoading(true)
    try {
      const payload: InvoiceCreatePayload = {
        customer_name: customerName,
        invoice_number: invoiceNumber,
        subtotal: Number(subtotal.toFixed(2)),
        tax_total: Number(taxTotal.toFixed(2)),
        grand_total: Number(grandTotal.toFixed(2)),
        items: items.map(item => ({
          ...item,
          line_total: Number(item.line_total.toFixed(2))
        }))
      }
      
      await apiCreateInvoice(payload)
      setShowSuccess(true)
      
      setTimeout(() => {
        setCustomerName('')
        setInvoiceNumber(`${config.prefix}-${Date.now().toString().slice(-6)}`)
        setItems([])
        setShowSuccess(false)
      }, 2000)
      
    } catch (err) {
      console.error("Failed to save entry", err)
      alert("Failed to save. See console for details.")
    } finally {
      setIsLoading(false)
    }
  }

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.code.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // ── RENDER LIST VIEW FOR MODIFY PATHS ───────
  if (type.startsWith('modify')) {
    const filteredInvoices = invoices.filter(inv => 
      inv.invoice_number.startsWith(config.prefix)
    )

    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {config.title}
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            {config.sub}
          </p>
        </div>

        <Card className="p-6">
          {isLoading ? (
            <div className="text-center py-12 text-gray-500">Loading list...</div>
          ) : filteredInvoices.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl text-gray-500">
              <ListFilter className="w-8 h-8 mx-auto mb-3 text-gray-400" />
              <p>No records found.</p>
              <p className="text-sm">Create a new entry to see it listed here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400">
                    <th className="pb-3 font-medium">Date</th>
                    <th className="pb-3 font-medium">Number</th>
                    <th className="pb-3 font-medium">Customer Name</th>
                    <th className="pb-3 font-medium text-right">Subtotal (₹)</th>
                    <th className="pb-3 font-medium text-right">Tax (₹)</th>
                    <th className="pb-3 font-medium text-right">Grand Total (₹)</th>
                    <th className="pb-3 w-20"></th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-gray-100 dark:divide-gray-800">
                  {filteredInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                      <td className="py-3">{inv.created_at ? new Date(inv.created_at).toLocaleDateString() : ''}</td>
                      <td className="py-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">{inv.invoice_number}</td>
                      <td className="py-3">{inv.customer_name}</td>
                      <td className="py-3 text-right">₹{inv.subtotal.toFixed(2)}</td>
                      <td className="py-3 text-right">₹{inv.tax_total.toFixed(2)}</td>
                      <td className="py-3 text-right font-bold text-gray-900 dark:text-white">₹{inv.grand_total.toFixed(2)}</td>
                      <td className="py-3 text-right">
                        <Button size="sm" variant="ghost" className="p-1">
                          <Printer className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {config.title}
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            {config.sub}
          </p>
        </div>
        <Button 
          onClick={handleSaveInvoice} 
          disabled={isLoading || items.length === 0 || !customerName}
          className="bg-indigo-600 hover:bg-indigo-700 text-white"
        >
          <FileText className="w-4 h-4 mr-2" />
          {isLoading ? 'Saving...' : config.saveLabel}
        </Button>
      </div>

      {showSuccess && (
        <div className="bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 p-4 rounded-xl flex items-center space-x-3">
          <CheckCircle2 className="w-5 h-5" />
          <span className="font-medium">
            Entry {invoiceNumber} created successfully!
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Details & Items */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Transaction Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Customer / Ledger Name *</label>
                <Input 
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  placeholder="Enter ledger/customer name..."
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Number
                </label>
                <Input 
                  value={invoiceNumber}
                  onChange={e => setInvoiceNumber(e.target.value)}
                  className="w-full font-mono"
                />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Line Items</h3>
              <Button size="sm" onClick={() => setIsProductModalOpen(true)}>
                <Search className="w-4 h-4 mr-2" /> Browse Products
              </Button>
            </div>
            
            {items.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl text-gray-500">
                <Search className="w-8 h-8 mx-auto mb-3 text-gray-400" />
                <p>No items added yet.</p>
                <p className="text-sm">Click "Browse Products" to add items to this sheet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400">
                      <th className="pb-3 font-medium">Product Name</th>
                      <th className="pb-3 font-medium text-right w-24">Qty</th>
                      <th className="pb-3 font-medium text-right w-32">Rate (₹)</th>
                      <th className="pb-3 font-medium text-right w-24">Tax %</th>
                      <th className="pb-3 font-medium text-right w-32">Total (₹)</th>
                      <th className="pb-3 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-gray-100 dark:divide-gray-800">
                    {items.map((item, index) => (
                      <tr key={index} className="group">
                        <td className="py-3 font-medium">{item.product_name}</td>
                        <td className="py-3">
                          <Input 
                            type="number" 
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateQuantity(index, parseInt(e.target.value) || 1)}
                            className="w-full text-right h-8"
                          />
                        </td>
                        <td className="py-3 pl-2">
                          <Input 
                            type="number" 
                            min="0"
                            step="0.01"
                            value={item.rate}
                            onChange={(e) => updateRate(index, parseFloat(e.target.value) || 0)}
                            className="w-full text-right h-8"
                          />
                        </td>
                        <td className="py-3 text-right">{item.igst_percent}%</td>
                        <td className="py-3 text-right font-medium">{item.line_total.toFixed(2)}</td>
                        <td className="py-3 text-right">
                          <button 
                            onClick={() => removeItem(index)}
                            className="text-gray-400 hover:text-red-500 transition-colors p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        {/* Right Column: Summary */}
        <div className="space-y-6">
          <Card className="p-6 sticky top-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 border-b border-gray-100 dark:border-gray-800 pb-4">
              Sheet Summary
            </h3>
            
            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-gray-500 dark:text-gray-400">
                <span>Subtotal</span>
                <span className="font-medium text-gray-900 dark:text-white">₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-500 dark:text-gray-400">
                <span>Total Tax (GST)</span>
                <span className="font-medium text-gray-900 dark:text-white">₹{taxTotal.toFixed(2)}</span>
              </div>
              
              <div className="pt-4 mt-4 border-t border-gray-100 dark:border-gray-800">
                <div className="flex justify-between items-center">
                  <span className="text-base font-bold text-gray-900 dark:text-white">Grand Total</span>
                  <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                    ₹{grandTotal.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Product Selection Modal */}
      <Modal isOpen={isProductModalOpen} onClose={() => setIsProductModalOpen(false)} title="Select Product">
        <div className="p-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input 
              autoFocus
              placeholder="Search by product name or code..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 w-full"
            />
          </div>
          
          <div className="max-h-96 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-xl divide-y divide-gray-100 dark:divide-gray-800">
            {filteredProducts.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No products found.</div>
            ) : (
              filteredProducts.map(product => (
                <div 
                  key={product.id} 
                  className="p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer flex justify-between items-center transition-colors"
                  onClick={() => addProductToInvoice(product)}
                >
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">{product.name}</div>
                    <div className="text-xs text-gray-500">Code: {product.code}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-indigo-600 dark:text-indigo-400">₹{product.mrp.toFixed(2)}</div>
                    <div className="text-xs text-gray-500">Tax: {product.igst_percent}%</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </Modal>
    </div>
  )
}
