import os

path = 'src/App.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

imports = """import DispatchManager from './pages/sales/DispatchManager'
"""

routes = """
        {/* Dispatch Routes */}
        <Route path="dispatch-manager" element={<DispatchManager />} />
"""

if 'import DispatchManager' not in content:
    content = content.replace("import OrderApprovalDashboard from './pages/sales/OrderApprovalDashboard'", imports + "import OrderApprovalDashboard from './pages/sales/OrderApprovalDashboard'")
    content = content.replace('<Route path="order-approvals" element={<OrderApprovalDashboard />} />', '<Route path="order-approvals" element={<OrderApprovalDashboard />} />' + routes)
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Added Dispatch Manager routes to App.tsx")

path2 = 'src/components/Layout/Header.tsx'
with open(path2, 'r', encoding='utf-8') as f:
    content2 = f.read()

target2 = """  'sale': [
    { label: 'Sales Order', path: '/sales-order-master' },
    { label: 'Order Approvals', path: '/order-approvals' },"""

replacement2 = """  'sale': [
    { label: 'Sales Order', path: '/sales-order-master' },
    { label: 'Order Approvals', path: '/order-approvals' },
    { label: 'Dispatch & POD', path: '/dispatch-manager' },"""

if "{ label: 'Dispatch & POD', path: '/dispatch-manager' }" not in content2:
    content2 = content2.replace(target2, replacement2)
    with open(path2, 'w', encoding='utf-8') as f:
        f.write(content2)
    print("Successfully added Dispatch to Header.tsx")
