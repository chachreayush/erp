import os

path = 'backend/models.py'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

new_models = """

# =====================================================================
# DOC-17: Procurement Execution (POs, Rules, Complaints)
# =====================================================================

class VendorSupplyRule(Base):
    __tablename__ = "vendor_supply_rules"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    vendor_id = Column(UUID(as_uuid=True), ForeignKey("ledgers.id", ondelete="CASCADE"), nullable=False)
    
    rule_type = Column(String(50), nullable=False, default="authorized") # fixed, authorized, blocked
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    
    po_number = Column(String(100), nullable=False, index=True)
    date = Column(DateTime, default=datetime.utcnow, nullable=False)
    vendor_id = Column(UUID(as_uuid=True), ForeignKey("ledgers.id", ondelete="RESTRICT"), nullable=False)
    
    status = Column(String(50), nullable=False, default="DRAFT") # DRAFT, APPROVED, PARTIAL, COMPLETED, CANCELLED
    expected_delivery = Column(DateTime, nullable=True)
    supply_classification = Column(String(50), nullable=True) # e.g. Special Supply, Standard
    total_amount = Column(Numeric(15, 2), default=0.00)
    
    created_at = Column(DateTime, default=datetime.utcnow)

class PurchaseOrderItem(Base):
    __tablename__ = "purchase_order_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    po_id = Column(UUID(as_uuid=True), ForeignKey("purchase_orders.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id", ondelete="SET NULL"), nullable=True)
    
    product_name = Column(String(255), nullable=False)
    quantity = Column(Integer, nullable=False, default=1)
    received_qty = Column(Integer, nullable=False, default=0)
    rate = Column(Numeric(10, 2), nullable=False)
    line_total = Column(Numeric(15, 2), nullable=False)

class VendorComplaint(Base):
    __tablename__ = "vendor_complaints"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    
    complaint_number = Column(String(100), nullable=False, index=True)
    vendor_id = Column(UUID(as_uuid=True), ForeignKey("ledgers.id", ondelete="RESTRICT"), nullable=False)
    
    category = Column(String(50), nullable=False) # SHORTAGE, DAMAGE, QUALITY, PRICING
    status = Column(String(50), nullable=False, default="OPEN") # OPEN, PENDING, RESOLVED, CLOSED
    severity = Column(String(50), nullable=False, default="MEDIUM") # LOW, MEDIUM, HIGH, CRITICAL
    
    description = Column(Text, nullable=True)
    related_document_id = Column(UUID(as_uuid=True), nullable=True) # Link to Invoice/GRN ID
    
    created_at = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)

"""

if 'class PurchaseOrder(Base):' not in content:
    content += new_models
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Added procurement models to models.py")
else:
    print("Procurement models already exist in models.py")
