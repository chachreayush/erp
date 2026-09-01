
import os

# Fix API types
path = "C:/Users/DELL/OneDrive/Desktop/erp2/src/lib/api.ts"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

if "min_stock_level" not in content and "export interface ProductCreatePayload" in content:
    content = content.replace(
        "category: string;",
        "category: string;\n  min_stock_level: number;\n  reorder_quantity: number;"
    )
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)

# Fix SmartMRPModal size
path_modal = "C:/Users/DELL/OneDrive/Desktop/erp2/src/components/ui/SmartMRPModal.tsx"
with open(path_modal, "r", encoding="utf-8") as f:
    modal_content = f.read()

if "size=\"xl\"" in modal_content:
    modal_content = modal_content.replace("size=\"xl\"", "/* size removed */")
    with open(path_modal, "w", encoding="utf-8") as f:
        f.write(modal_content)

print("Fixed API and Modal TS errors")

