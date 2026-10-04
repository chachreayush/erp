import os

path = 'USER_WORKFLOW_MANUAL.md'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

new_update = """
## [Update - DOC-17 Procurement Execution]
- **Purchase Orders**: Create POs under `Sales & Purchase > Purchase > Purchase Order` to specify exact quantities, vendors, and delivery expectations.
- **Goods Receipt Notes (GRN)**: Instead of direct Purchase Bills, you can record physical receipt of goods via the GRN screen (`Sales & Purchase > Purchase > Goods Receipt Note`). Loading a PO automatically populates the items. Saving a GRN updates stock levels immediately.
- **Vendor Complaints**: Track shortages, damage, and quality issues centrally under `Sales & Purchase > Purchase > Vendor Complaints`.
"""

if 'DOC-17 Procurement Execution' not in content:
    content += new_update
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Updated USER_WORKFLOW_MANUAL.md")
else:
    print("USER_WORKFLOW_MANUAL.md already updated")
