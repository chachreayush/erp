
import os

path = "C:/Users/DELL/OneDrive/Desktop/erp2/src/pages/inventory/Products.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace("category: prod.category as any", "category: prod.category as any,\n          min_stock_level: prod.min_stock_level || 0,\n          reorder_quantity: prod.reorder_quantity || 0")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
print("Fixed Products.tsx line 194")

