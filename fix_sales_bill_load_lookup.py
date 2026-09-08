
import re

with open('src/pages/sales/SalesBill.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

target = '''                const mappedRows = billInfo.items.map((item: any, i: number) => ({
                  id: i + 1,
                  product_id: item.product_id || '',
                  product: item.product_name,'''

replacement = '''                const mappedRows = billInfo.items.map((item: any, i: number) => {
                  const matchedProd = productsList.find(p => p.name === item.product_name)
                  return {
                  id: i + 1,
                  product_id: item.product_id || (matchedProd ? matchedProd.id : ''),
                  product: item.product_name,'''

# we need to close the bracket for map!
content = content.replace(target, replacement)
content = content.replace('schSalesQty: \'\', schSalesFree: \'\'\n                }))', 'schSalesQty: \'\', schSalesFree: \'\'\n                }})')

with open('src/pages/sales/SalesBill.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Fixed fetchBill product lookup!')

