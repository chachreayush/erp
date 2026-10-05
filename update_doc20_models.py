import os

path = 'backend/models.py'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add DocumentSeries Model
document_series_model = """
class DocumentSeries(Base):
    __tablename__ = "document_series"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    series_code = Column(String(50), nullable=False)  # e.g., 'W', 'I', 'C'
    invoice_type = Column(String(50), nullable=False) # e.g., 'sales_challan', 'sales_invoice', 'cash_bill'
    prefix = Column(String(20), nullable=True)        # e.g., 'W-'
    suffix = Column(String(20), nullable=True)        # e.g., '-25'
    next_number = Column(Integer, nullable=False, default=1)
    is_active = Column(Boolean, default=True, nullable=False)
    
    __table_args__ = (
        UniqueConstraint('organization_id', 'series_code', name='uix_org_series_code'),
    )
"""

if 'class DocumentSeries' not in content:
    content = content.replace(
        "class Invoice(Base):",
        document_series_model + "\nclass Invoice(Base):"
    )

# 2. Add series_id to Invoice
if 'series_id = Column' not in content:
    content = content.replace(
        'due_date = Column(String(50), nullable=True)',
        'due_date = Column(String(50), nullable=True)\n    series_id = Column(UUID(as_uuid=True), ForeignKey("document_series.id", ondelete="SET NULL"), nullable=True)'
    )

# 3. Add billed_qty and source_challan_item_id to InvoiceItem
if 'billed_qty = Column' not in content:
    content = content.replace(
        'source_order_item_id = Column(UUID(as_uuid=True), ForeignKey("sales_order_items.id", ondelete="SET NULL"), nullable=True)',
        'source_order_item_id = Column(UUID(as_uuid=True), ForeignKey("sales_order_items.id", ondelete="SET NULL"), nullable=True)\n    source_challan_item_id = Column(UUID(as_uuid=True), ForeignKey("invoice_items.id", ondelete="SET NULL"), nullable=True)\n    billed_qty = Column(Integer, nullable=False, default=0)'
    )

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated models.py")
