with open("src/components/Layout/Header.tsx", "r", encoding="utf-8") as f:
    code = f.read()

target = "{ label: 'Bank Reconciliation', path: '/finance/bank-reconciliation' },"
replacement = target + "\n    { label: 'Expense Management', path: '/finance/expenses' },"

code = code.replace(target, replacement)

with open("src/components/Layout/Header.tsx", "w", encoding="utf-8") as f:
    f.write(code)
