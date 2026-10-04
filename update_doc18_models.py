import os

path = 'backend/models.py'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

new_column = """
    # Permission: Direct Billing Allowed vs Sales Order Only
    allow_direct_billing = Column(Boolean, default=False, nullable=False)
"""

if 'allow_direct_billing = Column(Boolean' not in content:
    content = content.replace(
        'role = Column(',
        new_column + '\n    role = Column('
    )
    
    # Also add sales order hold engine models since they were discussed
    new_models = """

# =====================================================================
# DOC-18: Sales Order Management Engine
# =====================================================================

class SalesOrder(Base):
    __tablename__ = "sales_orders"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    created_by_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    order_number = Column(String(100), nullable=False, index=True)
    date = Column(DateTime, default=datetime.utcnow, nullable=False)
    party_id = Column(UUID(as_uuid=True), ForeignKey("ledgers.id", ondelete="RESTRICT"), nullable=False)
    
    status = Column(String(50), nullable=False, default="DRAFT") # DRAFT, HOLD, APPROVED, CONFIRMED, CANCELLED, CLOSED
    total_amount = Column(Numeric(15, 2), default=0.00)
    
    created_at = Column(DateTime, default=datetime.utcnow)

class SalesOrderItem(Base):
    __tablename__ = "sales_order_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id = Column(UUID(as_uuid=True), ForeignKey("sales_orders.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id", ondelete="SET NULL"), nullable=True)
    
    product_name = Column(String(255), nullable=False)
    quantity = Column(Integer, nullable=False, default=1)
    allocated_qty = Column(Integer, nullable=False, default=0)
    rate = Column(Numeric(10, 2), nullable=False)
    line_total = Column(Numeric(15, 2), nullable=False)

class SalesOrderHold(Base):
    __tablename__ = "sales_order_holds"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id = Column(UUID(as_uuid=True), ForeignKey("sales_orders.id", ondelete="CASCADE"), nullable=False, index=True)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    
    hold_reason = Column(String(255), nullable=False) # e.g., "Credit Limit Exceeded", "Price Override"
    status = Column(String(50), nullable=False, default="ACTIVE") # ACTIVE, CLEARED
    
    cleared_by_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    cleared_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
"""
    if 'class SalesOrder(Base):' not in content:
        content += new_models
        
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Updated models.py with allow_direct_billing and Sales Order Engine")
else:
    print("models.py already updated")
