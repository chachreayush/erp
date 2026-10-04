import os

path = 'src/App.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

imports = """import PurchaseOrderMaster from './pages/procurement/PurchaseOrderMaster'
import GoodsReceipt from './pages/procurement/GoodsReceipt'
import VendorComplaints from './pages/procurement/VendorComplaints'
"""

routes = """        {/* Procurement Routes */}
        <Route path="po" element={<PurchaseOrderMaster />} />
        <Route path="grn" element={<GoodsReceipt />} />
        <Route path="vendor-complaints" element={<VendorComplaints />} />
"""

if 'import PurchaseOrderMaster' not in content:
    content = content.replace("import PurchaseBill from './pages/purchase/PurchaseBill'", imports + "import PurchaseBill from './pages/purchase/PurchaseBill'")
    content = content.replace("<Route path=\"purchase\" element={<PurchaseBill />} />", routes + '        <Route path="purchase" element={<PurchaseBill />} />')
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Added procurement routes to App.tsx")
else:
    print("Procurement routes already in App.tsx")
