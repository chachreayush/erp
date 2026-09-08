
with open('src/pages/sales/SalesBill.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    'product: selectedProd.name,',
    'product_id: selectedProd.id,\n          product: selectedProd.name,'
)

content = content.replace(
    'product_name: row.product,',
    'product_id: row.product_id,\n           product_name: row.product,'
)

with open('src/pages/sales/SalesBill.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Fixed SalesBill.tsx part 2 successfully!')

