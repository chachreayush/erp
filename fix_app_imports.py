with open("src/App.tsx", "r", encoding="utf-8") as f:
    code = f.read()

target = "import BankReconciliation from './pages/finance/BankReconciliation'"
replacement = target + "\nimport AssetCategories from './pages/finance/AssetCategories'\nimport FixedAssets from './pages/finance/FixedAssets'"
code = code.replace(target, replacement)

with open("src/App.tsx", "w", encoding="utf-8") as f:
    f.write(code)
