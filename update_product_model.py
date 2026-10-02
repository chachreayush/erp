import re

with open('backend/models.py', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update Product Model
old_product_fields = """    is_active = Column(Boolean, default=True)

    # Relationships"""

new_product_fields = """    is_active = Column(Boolean, default=True)

    # DOC-11: New UOM & Multi-Tenant Batch Flags
    base_uom = Column(String(50), nullable=True, default="EACH")
    purchase_uom = Column(String(50), nullable=True)
    sales_uom = Column(String(50), nullable=True)
    pack_size = Column(String(100), nullable=True)
    track_batch = Column(Boolean, default=True, nullable=False)
    hsn_code = Column(String(50), nullable=True)
    tax_rule_id = Column(String(100), nullable=True)

    # Relationships
    principal_mappings = relationship("ProductPrincipalMapping", back_populates="product", cascade="all, delete-orphan")"""

content = content.replace(old_product_fields, new_product_fields)

# 2. Add ProductPrincipalMapping Model
principal_mapping_model = """class ProductPrincipalMapping(Base):
    __tablename__ = "product_principal_mappings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    
    principal_code = Column(String(100), nullable=False)
    principal_name = Column(String(255), nullable=True)
    principal_uom = Column(String(50), nullable=True)
    principal_pack = Column(String(100), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    organization = relationship("Organization")
    product = relationship("Product", back_populates="principal_mappings")

"""

# Insert before class Batch
if 'class ProductPrincipalMapping' not in content:
    content = content.replace('class Batch(Base):', principal_mapping_model + '\nclass Batch(Base):')


# 3. Update Batch Model
old_batch_fields = """    batch_number = Column(String(100), nullable=False, index=True)
    expiry = Column(String(50), nullable=True)"""

new_batch_fields = """    batch_number = Column(String(100), nullable=False, index=True)
    expiry = Column(String(50), nullable=True)
    
    # DOC-11 additions
    mfg_date = Column(String(50), nullable=True)
    sell_rate = Column(Numeric(12, 2), nullable=True, default=0)"""

content = content.replace(old_batch_fields, new_batch_fields)

with open('backend/models.py', 'w', encoding='utf-8') as f:
    f.write(content)
