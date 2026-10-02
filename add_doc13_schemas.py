with open('backend/schemas.py', 'r', encoding='utf-8') as f:
    content = f.read()

new_schemas = """

# ============================================================
# DOC-13: Warehouse & Transport Schemas
# ============================================================

# -- WAREHOUSE --
class WarehouseBinBase(BaseModel):
    code: str
    aisle: Optional[str] = None
    rack: Optional[str] = None
    shelf: Optional[str] = None
    bin_number: Optional[str] = None
    status: str = "available"

class WarehouseBinCreate(WarehouseBinBase):
    zone_id: UUID

class WarehouseBinResponse(WarehouseBinBase):
    id: UUID
    organization_id: UUID
    warehouse_id: UUID
    zone_id: UUID
    created_at: datetime
    class Config:
        from_attributes = True

class WarehouseZoneBase(BaseModel):
    code: str
    name: str
    storage_type: Optional[str] = None
    status: str = "active"

class WarehouseZoneCreate(WarehouseZoneBase):
    pass

class WarehouseZoneResponse(WarehouseZoneBase):
    id: UUID
    organization_id: UUID
    warehouse_id: UUID
    created_at: datetime
    bins: List[WarehouseBinResponse] = []
    class Config:
        from_attributes = True

class WarehouseBase(BaseModel):
    code: str
    name: str
    address: Optional[str] = None
    manager_name: Optional[str] = None
    status: str = "active"

class WarehouseCreate(WarehouseBase):
    pass

class WarehouseResponse(WarehouseBase):
    id: UUID
    organization_id: UUID
    created_at: datetime
    zones: List[WarehouseZoneResponse] = []
    default_receiving_bin_id: Optional[UUID] = None
    default_dispatch_bin_id: Optional[UUID] = None
    default_returns_bin_id: Optional[UUID] = None
    class Config:
        from_attributes = True


# -- TRANSPORT --
class VehicleBase(BaseModel):
    registration_number: str
    vehicle_type: Optional[str] = None
    capacity_kg: Optional[float] = None
    driver_name: Optional[str] = None
    status: str = "active"

class VehicleCreate(VehicleBase):
    transporter_id: UUID

class VehicleResponse(VehicleBase):
    id: UUID
    organization_id: UUID
    transporter_id: UUID
    created_at: datetime
    class Config:
        from_attributes = True

class TransporterBase(BaseModel):
    code: str
    name: str
    gstin: Optional[str] = None
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    status: str = "active"

class TransporterCreate(TransporterBase):
    pass

class TransporterResponse(TransporterBase):
    id: UUID
    organization_id: UUID
    created_at: datetime
    vehicles: List[VehicleResponse] = []
    class Config:
        from_attributes = True
"""

if 'class WarehouseBase' not in content:
    with open('backend/schemas.py', 'a', encoding='utf-8') as f:
        f.write(new_schemas)
    print("Added DOC-13 schemas.")
else:
    print("DOC-13 schemas already exist.")
