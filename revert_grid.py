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

for file in files:
    path = os.path.join('C:\\Users\\DELL\\OneDrive\\Desktop\\erp2', file)
    if not os.path.exists(path):
        continue
    
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
        
    # Revert padding on grid inputs
    content = re.sub(
        r'padding:\s*"0px\s+4px"',
        r"padding: '6px 8px'",
        content
    )
    
    # Revert padding on grid tds
    content = re.sub(
        r'padding:\s*"0px\s+2px"',
        r"padding: '4px'",
        content
    )

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
        
    print(f'Updated {file}')
