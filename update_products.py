import re

with open('src/pages/inventory/Products.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Update handleCreateSubmit
new_handle_create_submit = '''
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

    let finalProduct = { ...newProduct }

    try {
      // Auto-create Manufacturer if typed manually
      if (finalProduct.company_name && !finalProduct.company_id) {
        const existing = companies.find(c => c.label.toLowerCase() === finalProduct.company_name?.toLowerCase())
        if (existing) {
          finalProduct.company_id = existing.id
        } else {
          const newMfg = await apiCreateManufacturer({ name: finalProduct.company_name, status: "continue", prohibited: false, default_discount: 0 } as any)
          finalProduct.company_id = newMfg.id
          setCompanies(prev => [...prev, { id: newMfg.id, label: newMfg.name, data: newMfg }])
        }
      }

      // Auto-create Salt if typed manually
      if (finalProduct.salt && !finalProduct.salt_id) {
        const existing = salts.find(s => s.label.toLowerCase() === finalProduct.salt?.toLowerCase())
        if (existing) {
          finalProduct.salt_id = existing.id
        } else {
          const newSalt = await apiCreateSalt({ formula: finalProduct.salt } as any)
          finalProduct.salt_id = newSalt.id
          setSalts(prev => [...prev, { id: newSalt.id, label: newSalt.formula, data: newSalt }])
        }
      }

      // Auto-create HSN if typed manually
      if (finalProduct.hsn_code && !finalProduct.hsn_id) {
        const existing = hsns.find(h => h.label.toLowerCase() === finalProduct.hsn_code?.toLowerCase())
        if (existing) {
          finalProduct.hsn_id = existing.id
        } else {
          const newHsn = await apiCreateHSNCode({ code: finalProduct.hsn_code, igst: finalProduct.igst_percent, cgst: finalProduct.cgst_percent, sgst: finalProduct.sgst_percent } as any)
          finalProduct.hsn_id = newHsn.id
          setHsns(prev => [...prev, { id: newHsn.id, label: newHsn.code, data: newHsn }])
        }
      }
    } catch (err) {
      console.error("Error auto-creating master data", err)
    }

    if (modifyingProductId) {
      const updatedProducts = products.map(p => 
        p.id === modifyingProductId ? { ...p, ...finalProduct } : p
      )
      setProducts(updatedProducts)
      localStorage.setItem('erp_inventory_items', JSON.stringify(updatedProducts))
      setIsAdding(false)
      setModifyingProductId(null)
      return
    }

    let created: Product
    try {
      created = await apiCreateProduct(finalProduct)
    } catch (error) {
      console.error("Failed to create product via API, saving to localStorage:", error)
      created = {
        ...finalProduct,
        id: 'local_' + Date.now(),
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
      name: '', packing: '', unit: '', salt: '', salt_id: '',
      company_name: '', company_id: '', hsn_code: '', hsn_id: '',
      mrp: 0, p_rate: 0, pts_rate: 0, rate_a: 0, ptr_rate: 0
    })
  }
'''

content = re.sub(r'  const handleCreateSubmit = async \(e: React\.FormEvent\) => \{.*?(?=  // .*? Enter Navigation Logic .*?)', new_handle_create_submit + '\n', content, flags=re.DOTALL)

# Update onSelect for Company
content = content.replace(
    'setNewProduct({ ...newProduct, company_name: item.label })',
    'setNewProduct({ ...newProduct, company_name: item.label, company_id: item.id })'
)

# Update onSelect for Salt
content = content.replace(
    'setNewProduct({ ...newProduct, salt: item.label })',
    'setNewProduct({ ...newProduct, salt: item.label, salt_id: item.id })'
)

# Update onSelect for HSN (no data)
content = content.replace(
    'setNewProduct({ ...newProduct, hsn_code: item.label })',
    'setNewProduct({ ...newProduct, hsn_code: item.label, hsn_id: item.id })'
)
content = content.replace(
    'hsn_code: item.label,\n                igst_percent: item.data.igst,',
    'hsn_code: item.label,\n                hsn_id: item.id,\n                igst_percent: item.data.igst,'
)


with open('src/pages/inventory/Products.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated Products.tsx successfully.")
