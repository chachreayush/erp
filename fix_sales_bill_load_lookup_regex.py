
import re

with open('src/pages/sales/SalesBill.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(
    r'const mappedRows = billInfo\.items\.map\(\(item: any, i: number\) => \(\{',
    '''const mappedRows = billInfo.items.map((item: any, i: number) => {
                  const matchedProd = productsList.find(p => p.name === item.product_name);
                  return {''',
    content
)

content = re.sub(
    r'schSalesQty: \'\', schSalesFree: \'\'\n                \}\)\)',
    '''schSalesQty: '', schSalesFree: ''
                }})''',
    content
)

content = re.sub(
    r'product_id: item\.product_id \|\| \'\',',
    '''product_id: item.product_id || (matchedProd ? matchedProd.id : ''),''',
    content
)

with open('src/pages/sales/SalesBill.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Regex fixed fetchBill product lookup!')

