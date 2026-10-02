import os

app_path = "src/App.tsx"
with open(app_path, "r", encoding="utf-8") as f:
    content = f.read()

imports_block = """import InventoryDashboard from './pages/inventory/InventoryDashboard';
import CustomerClaims from './pages/inventory/CustomerClaims';
import VendorClaims from './pages/inventory/VendorClaims';
import Replenishment from './pages/inventory/Replenishment';
"""

routes_block = """          <Route path="/inventory" element={<InventoryDashboard />} />
          <Route path="/inventory/customer-claims" element={<CustomerClaims />} />
          <Route path="/inventory/vendor-claims" element={<VendorClaims />} />
          <Route path="/inventory/replenishment" element={<Replenishment />} />
"""

if "InventoryDashboard" not in content:
    last_import = content.rfind("import")
    nl = content.find("\n", last_import) + 1
    content = content[:nl] + imports_block + content[nl:]

if "/inventory" not in content:
    routes_end = content.rfind("</Routes>")
    content = content[:routes_end] + routes_block + content[routes_end:]

with open(app_path, "w", encoding="utf-8") as f:
    f.write(content)

print("App.tsx updated")
