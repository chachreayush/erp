import os

path = 'src/pages/sales/SalesOrderMaster.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('PurchaseOrderMaster', 'SalesOrderMaster')
content = content.replace('Purchase Order', 'Sales Order')
content = content.replace('Vendor', 'Customer')
content = content.replace('PO-', 'SO-')
content = content.replace('purchase', 'sales')
content = content.replace('PurchaseOrder', 'SalesOrder')
content = content.replace('/api/procurement/orders', '/api/orders')

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated SalesOrderMaster.tsx")
