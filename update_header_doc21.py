import os

path2 = 'src/components/Layout/Header.tsx'
with open(path2, 'r', encoding='utf-8') as f:
    content2 = f.read()

target2 = """    { label: 'Challan', path: '/sales?type=challan' },"""

replacement2 = """    { label: 'Challan', path: '/sales?type=challan' },
    { label: 'Sales Return', path: '/sales?type=credit_note' },"""

if "{ label: 'Sales Return', path: '/sales?type=credit_note' }" not in content2:
    content2 = content2.replace(target2, replacement2)
    with open(path2, 'w', encoding='utf-8') as f:
        f.write(content2)
    print("Successfully added Sales Return to Header.tsx")
else:
    print("Already in Header")
