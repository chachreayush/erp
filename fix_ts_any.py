
with open('src/pages/sales/SalesBill.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    'product_id: item.product_id || (matchedProd ? matchedProd.id : \'\'),',
    'product_id: item.product_id || (matchedProd ? (matchedProd as any).id : \'\'),'
)

with open('src/pages/sales/SalesBill.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Fixed TS error via as any!')

