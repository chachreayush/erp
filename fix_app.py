with open("src/App.tsx", "r", encoding="utf-8") as f:
    code = f.read()

import_statement = "import BankReconciliation from './pages/finance/BankReconciliation'\nimport ExpenseManagement from './pages/finance/ExpenseManagement'"
code = code.replace("import BankReconciliation from './pages/finance/BankReconciliation'", import_statement)

route_statement = "<Route path=\"finance/bank-reconciliation\" element={<BankReconciliation />} />\n          <Route path=\"finance/expenses\" element={<ExpenseManagement />} />"
code = code.replace("<Route path=\"finance/bank-reconciliation\" element={<BankReconciliation />} />", route_statement)

with open("src/App.tsx", "w", encoding="utf-8") as f:
    f.write(code)
