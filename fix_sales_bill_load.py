
with open('src/pages/sales/SalesBill.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    'product: item.product_name,',
    'product_id: item.product_id || \'\',\n                  product: item.product_name,'
)

with open('src/pages/sales/SalesBill.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Fixed load mappedRows!')

