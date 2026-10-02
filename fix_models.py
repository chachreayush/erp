import re

with open('backend/models.py', 'r', encoding='utf-8') as f:
    content = f.read()

target = """    is_active = Column(Boolean, default=True)

    # Relationships"""

replacement = """    is_active = Column(Boolean, default=True)

    # DOC-11: New UOM & Multi-Tenant Batch Flags
    base_uom = Column(String(50), nullable=True, default="EACH")
    purchase_uom = Column(String(50), nullable=True)
    sales_uom = Column(String(50), nullable=True)
    pack_size = Column(String(100), nullable=True)
    track_batch = Column(Boolean, default=True, nullable=False)
    tax_rule_id = Column(String(100), nullable=True)

    # Relationships
    principal_mappings = relationship("ProductPrincipalMapping", back_populates="product", cascade="all, delete-orphan")"""

if 'principal_mappings = relationship' not in content:
    content = content.replace(target, replacement)
    with open('backend/models.py', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Fixed models.py")
else:
    print("Already fixed")
