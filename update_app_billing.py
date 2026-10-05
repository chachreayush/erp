import os

path = 'src/App.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

imports = """import BillingConsolidation from './pages/sales/BillingConsolidation'
"""

routes = """
        {/* Billing Consolidation Routes */}
        <Route path="billing-consolidation" element={<BillingConsolidation />} />
"""

if 'import BillingConsolidation' not in content:
    content = content.replace("import DispatchManager from './pages/sales/DispatchManager'", imports + "import DispatchManager from './pages/sales/DispatchManager'")
    content = content.replace('<Route path="dispatch-manager" element={<DispatchManager />} />', '<Route path="dispatch-manager" element={<DispatchManager />} />' + routes)
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Added BillingConsolidation routes to App.tsx")

path2 = 'src/components/Layout/Header.tsx'
with open(path2, 'r', encoding='utf-8') as f:
    content2 = f.read()

target2 = """  'sale': [
    { label: 'Sales Order', path: '/sales-order-master' },
    { label: 'Order Approvals', path: '/order-approvals' },
    { label: 'Dispatch & POD', path: '/dispatch-manager' },
    { label: 'Bill', path: '/sales?type=bill' },
    { label: 'Challan', path: '/sales?type=challan' },"""

replacement2 = """  'sale': [
    { label: 'Sales Order', path: '/sales-order-master' },
    { label: 'Order Approvals', path: '/order-approvals' },
    { label: 'Dispatch & POD', path: '/dispatch-manager' },
    { label: 'Billing Consolidation', path: '/billing-consolidation' },
    { label: 'Bill', path: '/sales?type=bill' },
    { label: 'Challan', path: '/sales?type=challan' },"""

if "{ label: 'Billing Consolidation', path: '/billing-consolidation' }" not in content2:
    content2 = content2.replace(target2, replacement2)
    with open(path2, 'w', encoding='utf-8') as f:
        f.write(content2)
    print("Successfully added Consolidation to Header.tsx")
