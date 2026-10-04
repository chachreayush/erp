import os

path = 'DEVELOPER_MANUAL.md'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

new_update = """
## [Update - DOC-17 Procurement & GRN Integration]
- **Unified Stock Ledger**: Goods Receipt Notes (GRNs) use the unified `Invoice` model with `invoice_type="grn"`. The `main_inward_types` array in `api/stock.py` has been updated to include `"grn"`, meaning physical inventory increments seamlessly without duplicating stock calculation logic.
- **New Tables**: `PurchaseOrder`, `VendorSupplyRule`, and `VendorComplaint` have been added to `models.py`.
- **UI Menu Map**: Procurement features are placed in the `Sales & Purchase` dropdown (`Purchase` sub-menu).
"""

if 'DOC-17 Procurement & GRN Integration' not in content:
    content += new_update
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Updated DEVELOPER_MANUAL.md")
else:
    print("DEVELOPER_MANUAL.md already updated")
