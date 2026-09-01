
import os
path = "C:/Users/DELL/OneDrive/Desktop/erp2/src/pages/inventory/Products.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

if "TrendingUp" not in content[:1000]:
    content = content.replace("Plus, Download, Package", "Plus, Download, Package, TrendingUp")
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Fixed import")

