import React, { useState, useEffect } from 'react'
import { Plus, Search, Filter, Download, MoreVertical, Package } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { apiGetProducts, apiCreateProduct, Product } from '../../lib/api'

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // New product form state
  const [newProduct, setNewProduct] = useState({
    name: '',
    sku: '',
    category: '',
    price: '',
    stock: '',
    status: 'active'
  })

  // Fetch products on mount
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
      setNewProduct({ name: '', sku: '', category: '', price: '', stock: '', status: 'active' })
    } catch (error) {
      console.error("Failed to create product:", error)
    }
  }

  // Filter logic
  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  return (
    <div style={{ maxWidth: '1200px', animation: 'fadeIn 0.3s ease-in-out' }}>
      
      {/* ── HEADER & ACTIONS ────────────────────────────────── */}
      <div style={{ 
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
        marginBottom: '24px' 
      }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, color: 'var(--color-text)', marginBottom: '4px' }}>
            Products
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>
            Manage your inventory, pricing, and stock levels.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Button variant="secondary" leftIcon={<Download size={16} />}>
            Export
          </Button>
          <Button variant="primary" leftIcon={<Plus size={16} />} onClick={() => setIsAdding(!isAdding)}>
            {isAdding ? 'Cancel' : 'Add Product'}
          </Button>
        </div>
      </div>

      {/* ── ADD PRODUCT FORM (CONDITIONAL) ──────────────────── */}
      {isAdding && (
        <Card style={{ marginBottom: '24px', animation: 'fadeIn 0.2s ease-in-out' }}>
          <CardHeader>
            <CardTitle>Add New Product</CardTitle>
            <CardDescription>Enter the details for the new inventory item.</CardDescription>
          </CardHeader>
          <form onSubmit={handleCreateSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <Input 
                label="Product Name *" 
                required 
                value={newProduct.name}
                onChange={e => setNewProduct({...newProduct, name: e.target.value})}
              />
              <Input 
                label="SKU (Stock Keeping Unit)" 
                value={newProduct.sku}
                onChange={e => setNewProduct({...newProduct, sku: e.target.value})}
              />
              <Input 
                label="Category" 
                value={newProduct.category}
                onChange={e => setNewProduct({...newProduct, category: e.target.value})}
              />
              <Input 
                label="Price (₹)" 
                type="number"
                step="0.01"
                value={newProduct.price}
                onChange={e => setNewProduct({...newProduct, price: e.target.value})}
              />
              <Input 
                label="Initial Stock" 
                type="number"
                value={newProduct.stock}
                onChange={e => setNewProduct({...newProduct, stock: e.target.value})}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text)', marginLeft: '2px' }}>
                  Status
                </label>
                <select 
                  style={{
                    width: '100%', padding: '12px 16px',
                    backgroundColor: 'var(--color-bg-input)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--color-text)',
                    fontSize: '15px', outline: 'none'
                  }}
                  value={newProduct.status}
                  onChange={e => setNewProduct({...newProduct, status: e.target.value})}
                >
                  <option value="active">Active</option>
                  <option value="out_of_stock">Out of Stock</option>
                  <option value="discontinued">Discontinued</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
              <Button type="submit" variant="primary">Save Product</Button>
            </div>
          </form>
        </Card>
      )}

      {/* ── PRODUCT DATA TABLE ──────────────────────────────── */}
      <Card padding="none">
        {/* Table Toolbar */}
        <div style={{ 
          padding: '16px 24px', 
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ width: '300px', margin: 0 }}>
            <Input 
              leftIcon={<Search size={16} />} 
              placeholder="Search products..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ marginBottom: 0 }}
            />
          </div>
          <Button variant="ghost" leftIcon={<Filter size={16} />}>
            Filters
          </Button>
        </div>

        {/* Table Content */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-input)' }}>
                <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Product</th>
                <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>SKU</th>
                <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Category</th>
                <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Price</th>
                <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Stock</th>
                <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Status</th>
                <th style={{ padding: '16px 24px' }}></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    Loading products...
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '60px 40px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                      <Package size={48} opacity={0.5} />
                      <p>No products found.</p>
                      {searchQuery && <Button variant="ghost" onClick={() => setSearchQuery('')}>Clear search</Button>}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredProducts.map(product => (
                  <tr key={product.id} style={{ borderBottom: '1px solid var(--color-border)', transition: 'background-color 0.2s', cursor: 'pointer' }}>
                    <td style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--color-text)' }}>{product.name}</td>
                    <td style={{ padding: '16px 24px', color: 'var(--color-text-secondary)', fontSize: '14px' }}>{product.sku || '—'}</td>
                    <td style={{ padding: '16px 24px', color: 'var(--color-text-secondary)', fontSize: '14px' }}>{product.category || '—'}</td>
                    <td style={{ padding: '16px 24px', color: 'var(--color-text-secondary)', fontSize: '14px' }}>{product.price ? `₹${product.price}` : '—'}</td>
                    <td style={{ padding: '16px 24px', color: 'var(--color-text-secondary)', fontSize: '14px' }}>{product.stock}</td>
                    <td style={{ padding: '16px 24px' }}>
                      <span style={{
                        padding: '4px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: 600,
                        backgroundColor: product.status === 'active' ? 'rgba(34,197,94,0.15)' : 'rgba(245,158,11,0.15)',
                        color: product.status === 'active' ? 'var(--color-success)' : 'var(--color-warning)'
                      }}>
                        {product.status}
                      </span>
                    </td>
                    <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                      <Button variant="ghost" size="sm" style={{ padding: '6px' }}>
                        <MoreVertical size={16} />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

    </div>
  )
}
