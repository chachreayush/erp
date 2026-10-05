import os

# 1. Update models.py
path = 'backend/models.py'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

if 'returned_qty = Column' not in content:
    content = content.replace(
        'billed_qty = Column(Integer, nullable=False, default=0)',
        'billed_qty = Column(Integer, nullable=False, default=0)\n    source_invoice_item_id = Column(UUID(as_uuid=True), ForeignKey("invoice_items.id", ondelete="SET NULL"), nullable=True)\n    returned_qty = Column(Integer, nullable=False, default=0)'
    )
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Updated models.py")

# 2. Update schemas.py
path = 'backend/schemas.py'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

if 'source_invoice_item_id: Optional[UUID] = None' not in content:
    content = content.replace(
        'billed_qty: Optional[int] = 0',
        'billed_qty: Optional[int] = 0\n    source_invoice_item_id: Optional[UUID] = None\n    returned_qty: Optional[int] = 0'
    )
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Updated schemas.py")
