import re

with open('src/pages/inventory/Products.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Update initial state
old_state = """      unit: '',
      colour_type: 'normal',
      item_type: 'normal',"""

new_state = """      unit: '',
      colour_type: 'normal',
      item_type: 'normal',
      base_uom: 'EACH',
      purchase_uom: '',
      sales_uom: '',
      pack_size: '',
      track_batch: true,"""

content = content.replace(old_state, new_state)

# Update form inputs
old_form = """              <Input variant="dense" label="Packing" placeholder="10x10" value={newProduct.packing} onChange={e => setNewProduct({...newProduct, packing: e.target.value})} />
              <Input variant="dense" label="Unit" placeholder="Tabs" value={newProduct.unit} onChange={e => setNewProduct({...newProduct, unit: e.target.value})} />"""

new_form = """              <Input variant="dense" label="Packing" placeholder="10x10" value={newProduct.packing} onChange={e => setNewProduct({...newProduct, packing: e.target.value})} />
              <Input variant="dense" label="Unit" placeholder="Tabs" value={newProduct.unit} onChange={e => setNewProduct({...newProduct, unit: e.target.value})} />
              
              <div style={{ gridColumn: '1 / -1', marginTop: '10px', marginBottom: '10px', fontSize: '14px', fontWeight: 'bold', color: 'var(--color-primary)' }}>DOC-11: UOM & Batch Traceability Config</div>
              
              <Input variant="dense" label="Base UOM" placeholder="EACH" value={newProduct.base_uom || ''} onChange={e => setNewProduct({...newProduct, base_uom: e.target.value})} />
              <Input variant="dense" label="Purchase UOM" placeholder="BOX" value={newProduct.purchase_uom || ''} onChange={e => setNewProduct({...newProduct, purchase_uom: e.target.value})} />
              <Input variant="dense" label="Sales UOM" placeholder="STRIP" value={newProduct.sales_uom || ''} onChange={e => setNewProduct({...newProduct, sales_uom: e.target.value})} />
              <Input variant="dense" label="Pack Size (DOC-11)" placeholder="10 STRIPS" value={newProduct.pack_size || ''} onChange={e => setNewProduct({...newProduct, pack_size: e.target.value})} />
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input type="checkbox" id="track_batch" checked={newProduct.track_batch !== false} onChange={e => setNewProduct({...newProduct, track_batch: e.target.checked})} />
                <label htmlFor="track_batch" style={{ fontSize: '13px', cursor: 'pointer' }}>Enable Strict Batch/Expiry Tracking</label>
              </div>"""

content = content.replace(old_form, new_form)

with open('src/pages/inventory/Products.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
