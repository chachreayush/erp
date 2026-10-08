with open("backend/models.py", "r", encoding="utf-8") as f:
    code = f.read()

models = """
class AssetCategory(Base):
    __tablename__ = "asset_categories"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), index=True)
    name = Column(String, nullable=False)
    depreciation_method = Column(String, default="WDV") # WDV or SLM
    depreciation_rate = Column(Numeric(5, 2), default=0) # Percentage
    
    # Ledger Mappings
    asset_ledger_id = Column(UUID(as_uuid=True), ForeignKey('ledgers.id'), nullable=False)
    acc_depreciation_ledger_id = Column(UUID(as_uuid=True), ForeignKey('ledgers.id'), nullable=False)
    depreciation_expense_ledger_id = Column(UUID(as_uuid=True), ForeignKey('ledgers.id'), nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)

class FixedAsset(Base):
    __tablename__ = "fixed_assets"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), index=True)
    category_id = Column(UUID(as_uuid=True), ForeignKey('asset_categories.id'))
    
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    serial_number = Column(String, nullable=True)
    location = Column(String, nullable=True)
    
    purchase_date = Column(DateTime, nullable=False)
    purchase_value = Column(Numeric(15, 2), nullable=False)
    salvage_value = Column(Numeric(15, 2), default=0)
    
    current_net_block = Column(Numeric(15, 2), nullable=False)
    status = Column(String, default="Active") # Active, Disposed
    
    category = relationship("AssetCategory")
    depreciation_logs = relationship("DepreciationLog", back_populates="asset")
    
    created_at = Column(DateTime, default=datetime.utcnow)

class DepreciationLog(Base):
    __tablename__ = "depreciation_logs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    asset_id = Column(UUID(as_uuid=True), ForeignKey('fixed_assets.id'))
    voucher_id = Column(UUID(as_uuid=True), ForeignKey('vouchers.id'), nullable=True)
    
    run_date = Column(DateTime, nullable=False)
    depreciation_amount = Column(Numeric(15, 2), nullable=False)
    closing_net_block = Column(Numeric(15, 2), nullable=False)
    notes = Column(String, nullable=True)
    
    asset = relationship("FixedAsset", back_populates="depreciation_logs")
    created_at = Column(DateTime, default=datetime.utcnow)
"""

if "class AssetCategory" not in code:
    code += "\n" + models

with open("backend/models.py", "w", encoding="utf-8") as f:
    f.write(code)
