import os
import re

files_to_update = [
    'src/pages/Dashboard.tsx',
    'src/pages/Settings.tsx',
    'src/pages/admin/ClientManagement.tsx',
    'src/pages/brk/BrkIssueList.tsx',
    'src/pages/brk/BrkReceiveList.tsx',
    'src/pages/purchase/PurchaseList.tsx',
    'src/pages/returns/PurchaseReturnList.tsx',
    'src/pages/returns/SalesReturnList.tsx',
    'src/pages/sales/SalesList.tsx',
    'src/pages/stock/CurrentStock.tsx'
]

for file in files_to_update:
    path = os.path.join('C:\\Users\\DELL\\OneDrive\\Desktop\\erp2', file)
    if not os.path.exists(path):
        continue
        
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    if 'useReturnNavigation' in content:
        continue

    lines = content.split('\n')
    last_import = 0
    for i, line in enumerate(lines):
        if line.startswith('import '):
            last_import = i

    depth = file.count('/') - 1
    if depth == 1:
        import_path = "'../../hooks/useReturnNavigation'"
    elif depth == 2:
        import_path = "'../../../hooks/useReturnNavigation'"
    elif depth == 0:
        import_path = "'../hooks/useReturnNavigation'"
        
    lines.insert(last_import + 1, f'import {{ useReturnNavigation }} from {import_path}')

    new_content = '\n'.join(lines)
    
    new_content = re.sub(
        r'(export default function [a-zA-Z0-9_]+\s*\([^)]*\)\s*\{)',
        r'\1\n  useReturnNavigation(false);',
        new_content
    )
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print(f'Updated {file}')
