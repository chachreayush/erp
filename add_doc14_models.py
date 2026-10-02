with open('backend/models.py', 'r', encoding='utf-8') as f:
    content = f.read()

new_models = """

# -- DOC-14: Scheme & Free Goods Engine -------------------------------

class Scheme(Base):
    __tablename__ = "schemes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    principal_id = Column(UUID(as_uuid=True), ForeignKey("principals.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    code = Column(String(50), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    scheme_type = Column(String(50), nullable=False) # 'official', 'extra_allowance'
    status = Column(String(20), nullable=False, default='active')

    # 🔗 RELATIONSHIPS
    versions = relationship("SchemeVersion", back_populates="scheme", cascade="all, delete-orphan")


class SchemeVersion(Base):
    __tablename__ = "scheme_versions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    scheme_id = Column(UUID(as_uuid=True), ForeignKey("schemes.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    version_number = Column(Integer, nullable=False, default=1)
    valid_from = Column(Date, nullable=False)
    valid_to = Column(Date, nullable=False)
    
    # Simple rule: buy_qty gets free_qty
    buy_qty = Column(Numeric(10, 2), nullable=False, default=0)
    free_qty = Column(Numeric(10, 2), nullable=False, default=0)
    
    status = Column(String(20), nullable=False, default='active')

    # 🔗 RELATIONSHIPS
    scheme = relationship("Scheme", back_populates="versions")
    product = relationship("Product")


class Entitlement(Base):
    '''Tracks granted allowances like 3 extra units and their consumption'''
    __tablename__ = "entitlements"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    scheme_version_id = Column(UUID(as_uuid=True), ForeignKey("scheme_versions.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    granted_qty = Column(Numeric(10, 2), nullable=False, default=0)
    consumed_qty = Column(Numeric(10, 2), nullable=False, default=0)
    claimable_qty = Column(Numeric(10, 2), nullable=False, default=0) # consumed_qty - claimed_qty
    
    status = Column(String(20), nullable=False, default='active')

    # 🔗 RELATIONSHIPS
    scheme_version = relationship("SchemeVersion")


class SchemeMovement(Base):
    '''Ledger of entitlement consumption against transactions'''
    __tablename__ = "scheme_movements"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    entitlement_id = Column(UUID(as_uuid=True), ForeignKey("entitlements.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    document_type = Column(String(50), nullable=False) # e.g. 'invoice', 'challan'
    document_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    qty = Column(Numeric(10, 2), nullable=False)
    movement_type = Column(String(20), nullable=False) # 'consume', 'reverse'


class SchemeClaim(Base):
    '''Pending reimbursement claims sent to the principal'''
    __tablename__ = "scheme_claims"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    principal_id = Column(UUID(as_uuid=True), ForeignKey("principals.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    claim_number = Column(String(50), nullable=False, index=True)
    claim_date = Column(Date, nullable=False)
    
    total_claim_qty = Column(Numeric(10, 2), nullable=False, default=0)
    settled_qty = Column(Numeric(10, 2), nullable=False, default=0)
    status = Column(String(20), nullable=False, default='pending') # pending, approved, settled, rejected

    # 🔗 RELATIONSHIPS
    principal = relationship("Principal")
"""

if 'class Scheme(Base):' not in content:
    with open('backend/models.py', 'a', encoding='utf-8') as f:
        f.write(new_models)
    print("Added DOC-14 models.")
else:
    print("DOC-14 models already exist.")
