import os
import re

path = 'backend/models.py'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# We need to find class Product(Base): and remove the wrong lines.
# Instead of regex, I'll just find the exact block and replace it.

target = """      igst_percent = Column(Numeric(5, 2), nullable=False, default=0)
      source_order_item_id = Column(UUID(as_uuid=True), ForeignKey("sales_order_items.id", ondelete="SET NULL"), nullable=True)
      source_challan_item_id = Column(UUID(as_uuid=True), ForeignKey("invoice_items.id", ondelete="SET NULL"), nullable=True)
      billed_qty = Column(Integer, nullable=False, default=0)
      source_invoice_item_id = Column(UUID(as_uuid=True), ForeignKey("invoice_items.id", ondelete="SET NULL"), nullable=True)
      returned_qty = Column(Integer, nullable=False, default=0)"""

# I need to only replace the ONE in class Product.
# I'll use regex to isolate the Product class.
match = re.search(r'class Product\(Base\):(.*?)(?=class ProductPrincipalMapping\(Base\):)', content, re.DOTALL)
if match:
    product_class = match.group(1)
    new_product_class = product_class.replace(target, "      igst_percent = Column(Numeric(5, 2), nullable=False, default=0)")
    content = content.replace(product_class, new_product_class)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Fixed Product class!")
else:
    print("Could not find Product class block")
