import os
import re

models_path = r'backend/models.py'
with open(models_path, 'r', encoding='utf-8') as file:
    content = file.read()

models_to_add = """
# DOC-16: Inventory & Claims Engine Models

class StockStatus(str, enum.Enum):
    SELLABLE = "SELLABLE"
    EXPIRED = "EXPIRED"
    BREAKAGE = "BREAKAGE"
    QUARANTINE = "QUARANTINE"
    BLOCKED = "BLOCKED"
    SCRAP = "SCRAP"
    VENDOR_RETURN_PENDING = "VENDOR_RETURN_PENDING"

class SupplyClassification(str, enum.Enum):
    NORMAL = "NORMAL"
    SPECIAL = "SPECIAL"
    UNDERCUTTING = "UNDERCUTTING"
    NON_REORDER = "NON_REORDER"

class StockPosition(Base):
    __tablename__ = "stock_positions"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    warehouse_id = Column(UUID(as_uuid=True), ForeignKey("warehouses.id"), nullable=True, index=True)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id"), nullable=False, index=True)
    batch_id = Column(UUID(as_uuid=True), ForeignKey("batches.id"), nullable=True, index=True)
    principal_owner_id = Column(UUID(as_uuid=True), ForeignKey("principals.id"), nullable=True)
    
    status = Column(Enum(StockStatus), default=StockStatus.SELLABLE, nullable=False)
    classification = Column(Enum(SupplyClassification), default=SupplyClassification.NORMAL, nullable=False)
    
    quantity = Column(Numeric(14,4), default=0)
    reserved_quantity = Column(Numeric(14,4), default=0)

class StockMovement(Base):
    __tablename__ = "stock_movements"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id"), nullable=False)
    batch_id = Column(UUID(as_uuid=True), ForeignKey("batches.id"), nullable=True)
    
    source_document_type = Column(String(50)) # 'PURCHASE', 'SALE', 'CUSTOMER_RETURN'
    source_document_id = Column(String(50))
    
    quantity_change = Column(Numeric(14,4), nullable=False)
    status_before = Column(Enum(StockStatus), nullable=True)
    status_after = Column(Enum(StockStatus), nullable=False)
    
    movement_date = Column(DateTime, default=datetime.utcnow)
    user_context = Column(String(100), nullable=True)

class CustomerClaim(Base):
    __tablename__ = "customer_claims"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), index=True)
    customer_id = Column(UUID(as_uuid=True), ForeignKey("parties.id"))
    claim_type = Column(String(50)) # 'EXPIRY', 'BREAKAGE'
    status = Column(String(50), default="QUARANTINED")
    claim_date = Column(DateTime, default=datetime.utcnow)
    
class CustomerClaimItem(Base):
    __tablename__ = "customer_claim_items"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    claim_id = Column(UUID(as_uuid=True), ForeignKey("customer_claims.id", ondelete="CASCADE"))
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id"))
    batch_id = Column(UUID(as_uuid=True), ForeignKey("batches.id"))
    quantity = Column(Numeric(14,4), default=0)
    provenance_verified = Column(Boolean, default=False)
    
class VendorClaim(Base):
    __tablename__ = "vendor_claims"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), index=True)
    vendor_id = Column(UUID(as_uuid=True), ForeignKey("parties.id"))
    claim_type = Column(String(50))
    status = Column(String(50), default="SUBMITTED")
    claim_date = Column(DateTime, default=datetime.utcnow)
    
class VendorClaimItem(Base):
    __tablename__ = "vendor_claim_items"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    claim_id = Column(UUID(as_uuid=True), ForeignKey("vendor_claims.id", ondelete="CASCADE"))
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id"))
    batch_id = Column(UUID(as_uuid=True), ForeignKey("batches.id"))
    source_receipt_id = Column(String(100), nullable=True) # Provenance receipt link
    quantity = Column(Numeric(14,4), default=0)

class ReorderRule(Base):
    __tablename__ = "reorder_rules"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), index=True)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id"), nullable=True) # Null for generic fallback
    formula = Column(Text, nullable=False) 
    safety_stock = Column(Numeric(14,4), default=0)
    lead_time_days = Column(Integer, default=0)
    
class PurchaseProposal(Base):
    __tablename__ = "purchase_proposals"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), index=True)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id"))
    suggested_qty = Column(Numeric(14,4), default=0)
    explanation = Column(Text)
    status = Column(String(50), default="DRAFT")
    created_at = Column(DateTime, default=datetime.utcnow)
"""

if 'StockPosition' not in content:
    with open(models_path, 'a', encoding='utf-8') as file:
        file.write("\n" + models_to_add)
    print("Added DOC-16 models to models.py")
else:
    print("DOC-16 models already in models.py")
