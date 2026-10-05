import os

path = 'backend/models.py'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add source_order_id to Invoice
if 'source_order_id = Column(UUID' not in content:
    content = content.replace(
        'bill_discount = Column(Numeric(12, 2), nullable=True, default=0)',
        'bill_discount = Column(Numeric(12, 2), nullable=True, default=0)\n    source_order_id = Column(UUID(as_uuid=True), ForeignKey("sales_orders.id", ondelete="SET NULL"), nullable=True)'
    )

# Add source_order_item_id to InvoiceItem
if 'source_order_item_id = Column(UUID' not in content:
    content = content.replace(
        'igst_percent = Column(Numeric(5, 2), nullable=False, default=0)',
        'igst_percent = Column(Numeric(5, 2), nullable=False, default=0)\n    source_order_item_id = Column(UUID(as_uuid=True), ForeignKey("sales_order_items.id", ondelete="SET NULL"), nullable=True)'
    )

# Add DispatchRecord model
dispatch_model = """
class DispatchRecord(Base):
    __tablename__ = "dispatch_records"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    challan_id = Column(UUID(as_uuid=True), ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False, index=True)
    
    vehicle_number = Column(String(50), nullable=True)
    driver_name = Column(String(100), nullable=True)
    transport_agency = Column(String(100), nullable=True)
    
    status = Column(String(50), nullable=False, default="READY") # READY, IN_TRANSIT, DELIVERED, FAILED
    
    pod_captured = Column(Boolean, default=False)
    pod_date = Column(DateTime, nullable=True)
    pod_remarks = Column(String(500), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
"""

if 'class DispatchRecord' not in content:
    content += dispatch_model

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated models.py with DOC-19 fields and DispatchRecord")
