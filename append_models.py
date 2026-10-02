# -- DOC-10: Business Partner / Party Master ------------------------
class Party(Base):
    __tablename__ = "parties"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    legal_name = Column(String(255), nullable=False, index=True)
    trade_name = Column(String(255), nullable=True)
    pan = Column(String(15), nullable=True)
    gst = Column(String(20), nullable=True)
    status = Column(String(20), nullable=False, default='active') # 'active', 'inactive'

    # Relationships
    organization = relationship("Organization")
    addresses = relationship("PartyAddress", back_populates="party", cascade="all, delete-orphan")
    customer_profile = relationship("CustomerProfile", back_populates="party", uselist=False, cascade="all, delete-orphan")
    supplier_profile = relationship("SupplierProfile", back_populates="party", uselist=False, cascade="all, delete-orphan")


class PartyAddress(Base):
    __tablename__ = "party_addresses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    party_id = Column(UUID(as_uuid=True), ForeignKey("parties.id", ondelete="CASCADE"), nullable=False, index=True)
    
    address_type = Column(String(50), nullable=False) # 'Billing', 'Shipping', 'Corporate'
    is_default = Column(Boolean, default=False, nullable=False)

    line1 = Column(String(255), nullable=False)
    line2 = Column(String(255), nullable=True)
    city = Column(String(100), nullable=True)
    state = Column(String(100), nullable=True)
    pincode = Column(String(20), nullable=True)
    country = Column(String(100), default="India")
    
    party = relationship("Party", back_populates="addresses")


class CustomerProfile(Base):
    __tablename__ = "customer_profiles"

    party_id = Column(UUID(as_uuid=True), ForeignKey("parties.id", ondelete="CASCADE"), primary_key=True)
    ledger_id = Column(UUID(as_uuid=True), ForeignKey("ledgers.id", ondelete="RESTRICT"), nullable=True) # Financial link
    
    route_id = Column(String(100), nullable=True) # String for now, can be FK to Routes later
    credit_limit = Column(Numeric(15, 2), nullable=False, default=0)
    credit_days = Column(Integer, nullable=False, default=0)
    price_list = Column(String(50), nullable=True) # e.g. 'Retail', 'Wholesale'
    
    party = relationship("Party", back_populates="customer_profile")
    ledger = relationship("Ledger")


class SupplierProfile(Base):
    __tablename__ = "supplier_profiles"

    party_id = Column(UUID(as_uuid=True), ForeignKey("parties.id", ondelete="CASCADE"), primary_key=True)
    ledger_id = Column(UUID(as_uuid=True), ForeignKey("ledgers.id", ondelete="RESTRICT"), nullable=True) # Financial link
    
    payment_terms = Column(String(100), nullable=True)
    lead_time_days = Column(Integer, nullable=False, default=0)
    supplier_rating = Column(String(20), nullable=True)
    
    party = relationship("Party", back_populates="supplier_profile")
    ledger = relationship("Ledger")
