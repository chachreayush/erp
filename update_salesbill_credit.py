import os

path = 'src/pages/sales/SalesBill.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

target = "if (type.includes('credit_note')) targetType = \"credit_note\";"
replacement = "if (type.includes('credit')) targetType = \"credit_note\";"

content = content.replace(target, replacement)

target2 = "type === 'credit_note'"
replacement2 = "(type === 'credit_note' || type === 'credit')"
content = content.replace(target2, replacement2)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated SalesBill to support 'credit' type alias")
