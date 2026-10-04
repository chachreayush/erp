import os

path = 'src/components/Layout/Header.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

target = """  'purchase': [
    { label: 'Purchase Bill', path: '/purchase?type=bill' },"""

replacement = """  'purchase': [
    { label: 'Purchase Order', path: '/po' },
    { label: 'Goods Receipt Note (GRN)', path: '/grn' },
    { label: 'Vendor Complaints', path: '/vendor-complaints' },
    { label: 'Purchase Bill', path: '/purchase?type=bill' },"""

if "{ label: 'Purchase Order', path: '/po' }" not in content:
    content = content.replace(target, replacement)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Successfully added new items to the Purchase menu.")
else:
    print("Items already exist in the Purchase menu.")
