with open('backend/models.py', 'r', encoding='utf-8') as f:
    content = f.read()

new_models = """

# -- DOC-13: Warehouse & Transport Master -------------------------------

class Warehouse(Base):
    __tablename__ = "warehouses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    code = Column(String(50), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    address = Column(Text, nullable=True)
    manager_name = Column(String(100), nullable=True)
    status = Column(String(20), nullable=False, default='active')

    # Defaults for operations
    default_receiving_bin_id = Column(UUID(as_uuid=True), nullable=True) # Logical foreign key to WarehouseBin
    default_dispatch_bin_id = Column(UUID(as_uuid=True), nullable=True)
    default_returns_bin_id = Column(UUID(as_uuid=True), nullable=True)

    # 🔗 RELATIONSHIPS
    zones = relationship("WarehouseZone", back_populates="warehouse", cascade="all, delete-orphan")


class WarehouseZone(Base):
    __tablename__ = "warehouse_zones"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    warehouse_id = Column(UUID(as_uuid=True), ForeignKey("warehouses.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    code = Column(String(50), nullable=False)
    name = Column(String(100), nullable=False)
    storage_type = Column(String(50), nullable=True) # e.g. Bulk, Picking, Cold
    status = Column(String(20), nullable=False, default='active')

    # 🔗 RELATIONSHIPS
    warehouse = relationship("Warehouse", back_populates="zones")
    bins = relationship("WarehouseBin", back_populates="zone", cascade="all, delete-orphan")


class WarehouseBin(Base):
    __tablename__ = "warehouse_bins"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    warehouse_id = Column(UUID(as_uuid=True), ForeignKey("warehouses.id", ondelete="CASCADE"), nullable=False, index=True)
    zone_id = Column(UUID(as_uuid=True), ForeignKey("warehouse_zones.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    code = Column(String(50), nullable=False) # e.g. A1-R1-S1-B1
    aisle = Column(String(20), nullable=True)
    rack = Column(String(20), nullable=True)
    shelf = Column(String(20), nullable=True)
    bin_number = Column(String(20), nullable=True)
    status = Column(String(20), nullable=False, default='available')

    # 🔗 RELATIONSHIPS
    zone = relationship("WarehouseZone", back_populates="bins")


class Transporter(Base):
    __tablename__ = "transporters"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    code = Column(String(50), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    gstin = Column(String(15), nullable=True)
    contact_person = Column(String(100), nullable=True)
    phone = Column(String(20), nullable=True)
    status = Column(String(20), nullable=False, default='active')

    # 🔗 RELATIONSHIPS
    vehicles = relationship("Vehicle", back_populates="transporter", cascade="all, delete-orphan")


class Vehicle(Base):
    __tablename__ = "vehicles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    transporter_id = Column(UUID(as_uuid=True), ForeignKey("transporters.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    registration_number = Column(String(50), nullable=False, index=True)
    vehicle_type = Column(String(50), nullable=True) # e.g. LCV, HCV, 3-Wheeler
    capacity_kg = Column(Numeric(10, 2), nullable=True)
    driver_name = Column(String(100), nullable=True)
    status = Column(String(20), nullable=False, default='active')

    # 🔗 RELATIONSHIPS
    transporter = relationship("Transporter", back_populates="vehicles")
"""

# Append models if they don't exist
if 'class Warehouse(Base):' not in content:
    content += new_models

# Restore PrincipalWarehouseMapping FK
target_mapping_old = '''    warehouse_id = Column(UUID(as_uuid=True), nullable=False, index=True)  # FK to warehouses.id will be added with DOC-13
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # 🔗 RELATIONSHIPS 
    principal = relationship("Principal", back_populates="warehouse_mappings")'''

target_mapping_new = '''    warehouse_id = Column(UUID(as_uuid=True), ForeignKey("warehouses.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # 🔗 RELATIONSHIPS 
    principal = relationship("Principal", back_populates="warehouse_mappings")
    warehouse = relationship("Warehouse")'''

if target_mapping_old in content:
    content = content.replace(target_mapping_old, target_mapping_new)

with open('backend/models.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("Added DOC-13 models and restored PrincipalWarehouseMapping FK.")
