import os
import re

files = [
    'src/pages/sales/SalesBill.tsx',
    'src/pages/purchase/PurchaseBill.tsx',
    'src/pages/returns/SalesReturnBill.tsx',
    'src/pages/returns/PurchaseReturnBill.tsx',
    'src/pages/brk/BrkIssueBill.tsx',
    'src/pages/brk/BrkReceiveBill.tsx',
    'src/pages/sales/Billing.tsx'
]

rows = ",\n      ".join([f"{{ ...initialRow, id: {i} }}" for i in range(1, 9)])

for file in files:
    path = os.path.join('C:\\Users\\DELL\\OneDrive\\Desktop\\erp2', file)
    if not os.path.exists(path):
        continue
    
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
        
    # Regex to find the useState([ ... ]) array
    # Since it can have 15 rows now, we need a regex that matches a variable number of rows
    content = re.sub(
        r'const \[gridRows,\s*setGridRows\]\s*=\s*useState\(\[\s*(?:\{[^\}]+\},?\s*)+\]\)',
        f'const [gridRows, setGridRows] = useState([\n      {rows}\n    ])',
        content
    )

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
        
    print(f'Updated {file}')
