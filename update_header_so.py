import os

path = 'src/components/Layout/Header.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

target = """  'sale': [
    { label: 'Bill', path: '/sales?type=bill' },"""

replacement = """  'sale': [
    { label: 'Sales Order', path: '/sales-order-master' },
    { label: 'Order Approvals', path: '/order-approvals' },
    { label: 'Bill', path: '/sales?type=bill' },"""

if "{ label: 'Sales Order', path: '/sales-order-master' }" not in content:
    content = content.replace(target, replacement)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Successfully added new items to the Sale menu.")
else:
    print("Items already exist in the Sale menu.")
