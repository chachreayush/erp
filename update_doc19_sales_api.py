import os

path = 'backend/api/sales.py'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# I need to hook into the Invoice creation to update SalesOrder fulfilled quantities
# Let's see if we can insert it after: db.add(db_item) inside the create_invoice loop.

hook = """
        if item.source_order_item_id:
            # Update the Sales Order allocated quantity
            so_item = db.query(models.SalesOrderItem).filter(models.SalesOrderItem.id == item.source_order_item_id).first()
            if so_item:
                so_item.allocated_qty += item.quantity
"""

if 'so_item.allocated_qty += item.quantity' not in content:
    content = content.replace(
        'db.add(db_item)',
        'db.add(db_item)\n' + hook
    )
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Injected Sales Order hook into create_invoice")
else:
    print("Hook already exists in sales.py")
