import os

path = 'src/App.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

imports = """import PurchaseOrderMaster from './pages/procurement/PurchaseOrderMaster'
import GoodsReceipt from './pages/procurement/GoodsReceipt'
import VendorComplaints from './pages/procurement/VendorComplaints'
"""

routes = """          <Route path="/po" element={<PurchaseOrderMaster />} />
          <Route path="/grn" element={<GoodsReceipt />} />
          <Route path="/vendor-complaints" element={<VendorComplaints />} />
"""

if 'import PurchaseOrderMaster' not in content:
    content = content.replace("import Layout from './components/Layout/Layout'", imports + "import Layout from './components/Layout/Layout'")
    content = content.replace("<Route path=\"/dashboard\"", routes + '          <Route path="/dashboard"')
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Added routes to App.tsx")
else:
    print("Routes already in App.tsx")
