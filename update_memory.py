import os

path = 'PROJECT_MEMORY.md'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

new_update = """
## [Update - DOC-17 Procurement Engine]
Implemented the Purchase Order, Goods Receipt Note (GRN), and Vendor Complaints engines. Added `grn` to main_inward_types in `stock.py` so physical inventory strictly updates on receipt. Created UI routing under Sales & Purchase -> Purchase dropdowns.
"""

if 'DOC-17 Procurement Engine' not in content:
    content = content.replace(
        '## [Update - DOC-16 Integration]',
        new_update + '\n## [Update - DOC-16 Integration]'
    )
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Updated PROJECT_MEMORY.md")
else:
    print("PROJECT_MEMORY.md already updated")
