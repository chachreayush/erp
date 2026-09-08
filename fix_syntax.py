
with open('src/pages/sales/SalesBill.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

target = '''                schSalesQty: '', schSalesFree: ''
              }))'''
replacement = '''                schSalesQty: '', schSalesFree: ''
              }})'''

content = content.replace(target, replacement)

with open('src/pages/sales/SalesBill.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Fixed syntax error!')

