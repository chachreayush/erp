import os

path = 'backend/models.py'
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
in_product_class = False

for line in lines:
    if line.startswith("class Product(Base):"):
        in_product_class = True
        
    if in_product_class and line.startswith("class ProductPrincipalMapping(Base):"):
        in_product_class = False

    # Skip the specific bad lines ONLY if we are inside the Product class
    if in_product_class:
        if "source_order_item_id = Column" in line and "sales_order_items.id" in line:
            continue
        if "source_challan_item_id = Column" in line and "invoice_items.id" in line:
            continue
        if "billed_qty = Column" in line:
            continue
        if "source_invoice_item_id = Column" in line and "invoice_items.id" in line:
            continue
        if "returned_qty = Column" in line:
            continue

    new_lines.append(line)

with open(path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("Product model fixed via line filtering")
