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
        
    # Replace table style for the main grid
    content = re.sub(
        r'<table\s+style=\{\{\s*width:\s*\'100%\',\s*borderCollapse:\s*\'collapse\',\s*fontSize:\s*\'13px\',\s*textAlign:\s*\'left\'\s*\}\}>',
        r'<table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", textAlign: "left", tableLayout: "fixed" }}>',
        content,
        count=1
    )
    
    # Replace padding on grid inputs
    content = re.sub(
        r'padding:\s*\'6px\s+8px\'',
        r'padding: "0px 4px"',
        content
    )
    
    # Replace padding on grid tds
    content = re.sub(
        r'padding:\s*\'4px\'',
        r'padding: "0px 2px"',
        content
    )

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
        
    print(f'Updated {file}')
