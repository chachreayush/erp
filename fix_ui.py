import re

with open('src/pages/inventory/Products.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_code = """<div style={{ gridColumn: '1 / -1', marginTop: '10px', marginBottom: '10px', fontSize: '14px', fontWeight: 'bold', color: 'var(--color-primary)' }}>DOC-11: UOM & Batch Traceability Config</div>
              
              <Input variant="dense" label="Base UOM" placeholder="EACH" value={newProduct.base_uom || ''} onChange={e => setNewProduct({...newProduct, base_uom: e.target.value})} />
              <Input variant="dense" label="Purchase UOM" placeholder="BOX" value={newProduct.purchase_uom || ''} onChange={e => setNewProduct({...newProduct, purchase_uom: e.target.value})} />
              <Input variant="dense" label="Sales UOM" placeholder="STRIP" value={newProduct.sales_uom || ''} onChange={e => setNewProduct({...newProduct, sales_uom: e.target.value})} />
              <Input variant="dense" label="Pack Size (DOC-11)" placeholder="10 STRIPS" value={newProduct.pack_size || ''} onChange={e => setNewProduct({...newProduct, pack_size: e.target.value})} />
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input type="checkbox" id="track_batch" checked={newProduct.track_batch !== false} onChange={e => setNewProduct({...newProduct, track_batch: e.target.checked})} />
                <label htmlFor="track_batch" style={{ fontSize: '13px', cursor: 'pointer' }}>Enable Strict Batch/Expiry Tracking</label>
              </div>"""

new_code = """<div style={{ marginTop: '16px', marginBottom: '8px', paddingBottom: '4px', borderBottom: '1px solid var(--color-border)' }}>
                <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>UOM & Batch Traceability Config (DOC-11)</h3>
              </div>
              
              <Input variant="dense" label="Base UOM" placeholder="EACH" value={newProduct.base_uom || ''} onChange={e => setNewProduct({...newProduct, base_uom: e.target.value})} />
              <Input variant="dense" label="Purchase UOM" placeholder="BOX" value={newProduct.purchase_uom || ''} onChange={e => setNewProduct({...newProduct, purchase_uom: e.target.value})} />
              <Input variant="dense" label="Sales UOM" placeholder="STRIP" value={newProduct.sales_uom || ''} onChange={e => setNewProduct({...newProduct, sales_uom: e.target.value})} />
              <Input variant="dense" label="Pack Size" placeholder="10 STRIPS" value={newProduct.pack_size || ''} onChange={e => setNewProduct({...newProduct, pack_size: e.target.value})} />
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '128px', marginTop: '4px', marginBottom: '8px' }}>
                <input type="checkbox" id="track_batch" checked={newProduct.track_batch !== false} onChange={e => setNewProduct({...newProduct, track_batch: e.target.checked})} />
                <label htmlFor="track_batch" style={{ fontSize: '12px', fontWeight: 500, color: 'var(--color-text-secondary)', cursor: 'pointer' }}>Enable Strict Batch/Expiry Tracking</label>
              </div>"""

content = content.replace(old_code, new_code)

with open('src/pages/inventory/Products.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
