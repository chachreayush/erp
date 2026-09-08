import os
import re

files_to_update = [
    'src/pages/sales/SalesBill.tsx',
    'src/pages/purchase/PurchaseBill.tsx',
    'src/pages/returns/SalesReturnBill.tsx',
    'src/pages/returns/PurchaseReturnBill.tsx',
    'src/pages/brk/BrkIssueBill.tsx',
    'src/pages/brk/BrkReceiveBill.tsx',
    'src/pages/sales/Billing.tsx'
]

for file in files_to_update:
    path = os.path.join('C:\\Users\\DELL\\OneDrive\\Desktop\\erp2', file)
    if not os.path.exists(path):
        continue
        
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    new_content = re.sub(
        r'fallbackAction:\s*\(\)\s*=>\s*\{\s*if\s*\(selectedModifyBill\)\s*\{\s*setSelectedModifyBill\(null\);?\s*searchParams\.delete\([^)]+\);?\s*setSearchParams\(searchParams\);?\s*\}\s*\}',
        '''fallbackAction: () => {
          if (selectedModifyBill) {
            setSelectedModifyBill(null);
            searchParams.delete('invoice');
            setSearchParams(searchParams);
            return true;
          }
          return false;
        }''',
        content
    )

    if content != new_content:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f'Updated {file}')
