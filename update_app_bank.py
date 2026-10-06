import os
import re

path = 'src/App.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

import_str = "import BankReconciliation from './pages/finance/BankReconciliation'"
if import_str not in content:
    content = content.replace("import FinanceReports from './pages/finance/FinanceReports'", "import FinanceReports from './pages/finance/FinanceReports'\n" + import_str)

route_str = '<Route path="finance/bank-reconciliation" element={<BankReconciliation />} />'
if route_str not in content:
    content = content.replace('<Route path="finance/claims" element={<SchemeClaims />} />', '<Route path="finance/claims" element={<SchemeClaims />} />\n        ' + route_str)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated App.tsx successfully")
