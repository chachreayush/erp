# -- DOC-10: Business Partner / Party Master ------------------------
from typing import List

class PartyAddressBase(BaseModel):
    address_type: str
    is_default: bool = False
    line1: str
    line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    country: str = "India"

class PartyAddressCreate(PartyAddressBase):
    pass

class PartyAddressResponse(PartyAddressBase):
    id: UUID
    party_id: UUID

    class Config:
        orm_mode = True

class CustomerProfileBase(BaseModel):
    route_id: Optional[str] = None
    credit_limit: float = 0
    credit_days: int = 0
    price_list: Optional[str] = None

class SupplierProfileBase(BaseModel):
    payment_terms: Optional[str] = None
    lead_time_days: int = 0
    supplier_rating: Optional[str] = None

class CustomerProfileCreate(CustomerProfileBase):
    pass

class SupplierProfileCreate(SupplierProfileBase):
    pass

class CustomerProfileResponse(CustomerProfileBase):
    party_id: UUID
    ledger_id: Optional[UUID] = None

    class Config:
        orm_mode = True

class SupplierProfileResponse(SupplierProfileBase):
    party_id: UUID
    ledger_id: Optional[UUID] = None

    class Config:
        orm_mode = True

class PartyBase(BaseModel):
    legal_name: str
    trade_name: Optional[str] = None
    pan: Optional[str] = None
    gst: Optional[str] = None
    status: str = 'active'

class PartyCreate(PartyBase):
    addresses: List[PartyAddressCreate] = []
    customer_profile: Optional[CustomerProfileCreate] = None
    supplier_profile: Optional[SupplierProfileCreate] = None
    # If creating a ledger automatically:
    create_ledger: bool = True
    ledger_group_id: Optional[UUID] = None
    opening_balance: float = 0
    op_type: str = "Dr"

class PartyResponse(PartyBase):
    id: UUID
    organization_id: UUID
    created_at: datetime
    updated_at: datetime
    addresses: List[PartyAddressResponse] = []
    customer_profile: Optional[CustomerProfileResponse] = None
    supplier_profile: Optional[SupplierProfileResponse] = None

    class Config:
        orm_mode = True
