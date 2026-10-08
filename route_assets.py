with open("src/App.tsx", "r", encoding="utf-8") as f:
    code = f.read()

import_target = "import BankReconciliation from './pages/finance/BankReconciliation';"
import_replacement = import_target + "\nimport AssetCategories from './pages/finance/AssetCategories';\nimport FixedAssets from './pages/finance/FixedAssets';"
code = code.replace(import_target, import_replacement)

route_target = '<Route path="finance/bank-reconciliation" element={<BankReconciliation />} />'
route_replacement = route_target + '\n          <Route path="finance/asset-categories" element={<AssetCategories />} />\n          <Route path="finance/fixed-assets" element={<FixedAssets />} />'
code = code.replace(route_target, route_replacement)

with open("src/App.tsx", "w", encoding="utf-8") as f:
    f.write(code)

with open("src/components/Layout/Header.tsx", "r", encoding="utf-8") as f:
    header = f.read()

nav_target = "{ label: 'Bank Reconciliation', path: '/finance/bank-reconciliation' }"
nav_replacement = nav_target + ",\n              { label: 'Fixed Assets', path: '/finance/fixed-assets' }"
header = header.replace(nav_target, nav_replacement)

with open("src/components/Layout/Header.tsx", "w", encoding="utf-8") as f:
    f.write(header)
