
import re

with open('src/pages/sales/SalesBill.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add product_id to initialRow
content = content.replace(
    'id: 0, product: \'\', pack: \'\', batch: \'\', qty: \'\', free: \'\',',
    'id: 0, product_id: \'\', product: \'\', pack: \'\', batch: \'\', qty: \'\', free: \'\','
)

# 2. Add product_id to selectAndImportProduct
content = content.replace(
    '''        let row = { 
          ...newRows[rowIndex], 
          product: selectedProd.name,''',
    '''        let row = { 
          ...newRows[rowIndex], 
          product_id: selectedProd.id,
          product: selectedProd.name,'''
)

# 3. Add product_id to payload mapping
content = content.replace(
    '''        items: validRows.map(row => ({
           product_name: row.product,''',
    '''        items: validRows.map(row => ({
           product_id: row.product_id,
           product_name: row.product,'''
)

with open('src/pages/sales/SalesBill.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Fixed SalesBill.tsx successfully!')

