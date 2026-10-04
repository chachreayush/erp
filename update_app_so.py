import os

path = 'src/App.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

imports = """import SalesOrderMaster from './pages/sales/SalesOrderMaster'
import OrderApprovalDashboard from './pages/sales/OrderApprovalDashboard'
"""

routes = """
        {/* Sales Order Routes */}
        <Route path="sales-order-master" element={<SalesOrderMaster />} />
        <Route path="order-approvals" element={<OrderApprovalDashboard />} />
"""

if 'import SalesOrderMaster' not in content:
    content = content.replace("import SalesBill from './pages/sales/SalesBill'", imports + "import SalesBill from './pages/sales/SalesBill'")
    content = content.replace('<Route path="sales"            element={<SalesBill />} />', '<Route path="sales"            element={<SalesBill />} />' + routes)
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Added Sales Order routes to App.tsx")
else:
    print("Sales Order routes already in App.tsx")
