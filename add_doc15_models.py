with open('backend/models.py', 'r', encoding='utf-8') as f:
    content = f.read()

new_models = '''

# -- DOC-15: Pricing, Rate, MRP & Formula Engine ----------------------

class PriceList(Base):
    __tablename__ = "price_lists"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    code = Column(String(50), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    description = Column(String(500), nullable=True)
    status = Column(String(20), nullable=False, default='active')

    rules = relationship("PriceListRule", back_populates="price_list", cascade="all, delete-orphan")


class PriceListRule(Base):
    __tablename__ = "price_list_rules"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    price_list_id = Column(UUID(as_uuid=True), ForeignKey("price_lists.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    valid_from = Column(Date, nullable=False)
    valid_to = Column(Date, nullable=False)
    fixed_price = Column(Numeric(12, 4), nullable=False)
    
    price_list = relationship("PriceList", back_populates="rules")
    product = relationship("Product")


class PriceFormula(Base):
    __tablename__ = "price_formulas"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    target_rate_type = Column(String(50), nullable=False) # e.g. 'retail'
    source_rate_type = Column(String(50), nullable=False) # e.g. 'purchase'
    operator = Column(String(20), nullable=False) # 'multiply', 'add_percent', etc.
    operand = Column(Numeric(10, 4), nullable=False) # e.g. 1.20 for 20% markup
    floor_price = Column(Numeric(12, 4), nullable=True)
    
    status = Column(String(20), nullable=False, default='active')


class CustomerPriceConfig(Base):
    __tablename__ = "customer_price_configs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    party_id = Column(UUID(as_uuid=True), ForeignKey("parties.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    default_rate_type = Column(String(50), nullable=True) # e.g. 'distributor'
    price_list_id = Column(UUID(as_uuid=True), ForeignKey("price_lists.id", ondelete="SET NULL"), nullable=True)

    party = relationship("Party")
    price_list = relationship("PriceList")
'''

if 'class PriceList(Base):' not in content:
    with open('backend/models.py', 'a', encoding='utf-8') as f:
        f.write(new_models)
    print("Added DOC-15 models.")
else:
    print("DOC-15 models already exist.")
