with open('backend/models.py', 'r', encoding='utf-8') as f:
    content = f.read()

new_models = """

# -- DOC-12: Principal Master & Agreements ------------------------------

class Principal(Base):
    __tablename__ = "principals"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    code = Column(String(50), nullable=False, index=True)
    legal_name = Column(String(255), nullable=False)
    brand = Column(String(100), nullable=True)
    gstin = Column(String(15), nullable=True)
    status = Column(String(20), nullable=False, default='active') # active, suspended, archived
    
    # 🔗 RELATIONSHIPS 
    organization = relationship("Organization")
    agreements = relationship("PrincipalAgreement", back_populates="principal", cascade="all, delete-orphan")
    warehouse_mappings = relationship("PrincipalWarehouseMapping", back_populates="principal", cascade="all, delete-orphan")


class PrincipalAgreement(Base):
    __tablename__ = "principal_agreements"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    principal_id = Column(UUID(as_uuid=True), ForeignKey("principals.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    version_name = Column(String(100), nullable=False)
    valid_from = Column(DateTime, nullable=False)
    valid_to = Column(DateTime, nullable=True)
    commission_percent = Column(Numeric(5, 2), nullable=False, default=0)
    handling_percent = Column(Numeric(5, 2), nullable=False, default=0)
    is_active = Column(Boolean, default=True, nullable=False)

    # 🔗 RELATIONSHIPS 
    principal = relationship("Principal", back_populates="agreements")


class PrincipalWarehouseMapping(Base):
    __tablename__ = "principal_warehouse_mappings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    principal_id = Column(UUID(as_uuid=True), ForeignKey("principals.id", ondelete="CASCADE"), nullable=False, index=True)
    warehouse_id = Column(UUID(as_uuid=True), ForeignKey("warehouses.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # 🔗 RELATIONSHIPS 
    principal = relationship("Principal", back_populates="warehouse_mappings")
    warehouse = relationship("Warehouse")
"""

if 'class Principal(Base):' not in content:
    with open('backend/models.py', 'a', encoding='utf-8') as f:
        f.write(new_models)
    print('Added Principal models.')
else:
    print('Principal models already exist.')
