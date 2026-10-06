import os

def add_hook(path):
    if not os.path.exists(path):
        return
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    if 'useReturnNavigation' in content:
        print(f"Hook already in {path}")
        return

    content = content.replace("import React", "import { useReturnNavigation } from '../../hooks/useReturnNavigation';\nimport React")

    lines = content.split('\n')
    for i, line in enumerate(lines):
        if line.startswith('export default function '):
            lines.insert(i + 1, '  useReturnNavigation();')
            break
            
    with open(path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))
    print(f'Added hook to {path}')

add_hook('src/pages/finance/SchemeClaims.tsx')
add_hook('src/pages/stock/StockShiftVoucher.tsx')
