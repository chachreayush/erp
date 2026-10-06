import os
import re

path = 'src/components/Layout/Header.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

route_str = "{ label: 'Bank Reconciliation', path: '/finance/bank-reconciliation' },"
if route_str not in content:
    target = "{ label: 'Ledger Statement', path: '/finance/ledger-statement' },"
    content = content.replace(target, route_str + "\n      " + target)

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Updated Header.tsx successfully")
else:
    print("Already in Header")
