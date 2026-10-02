import os
import re

schemas_path = r'backend/schemas.py'
with open(schemas_path, 'r', encoding='utf-8') as file:
    content = file.read()

schemas_to_add = """
# DOC-16: Inventory & Claims Schemas

class StockStatusEnum(str, enum.Enum):
    SELLABLE = "SELLABLE"
    EXPIRED = "EXPIRED"
    BREAKAGE = "BREAKAGE"
    QUARANTINE = "QUARANTINE"
    BLOCKED = "BLOCKED"
    SCRAP = "SCRAP"
    VENDOR_RETURN_PENDING = "VENDOR_RETURN_PENDING"

class SupplyClassificationEnum(str, enum.Enum):
    NORMAL = "NORMAL"
    SPECIAL = "SPECIAL"
    UNDERCUTTING = "UNDERCUTTING"
    NON_REORDER = "NON_REORDER"

class StockPositionBase(BaseModel):
    warehouse_id: Optional[UUID4] = None
    product_id: UUID4
    batch_id: Optional[UUID4] = None
    principal_owner_id: Optional[UUID4] = None
    status: StockStatusEnum = StockStatusEnum.SELLABLE
    classification: SupplyClassificationEnum = SupplyClassificationEnum.NORMAL
    quantity: float = 0.0
    reserved_quantity: float = 0.0

class StockPositionCreate(StockPositionBase):
    organization_id: UUID4

class StockPositionResponse(StockPositionBase):
    id: UUID4
    organization_id: UUID4
    
    class Config:
        orm_mode = True

class CustomerClaimItemBase(BaseModel):
    product_id: UUID4
    batch_id: UUID4
    quantity: float

class CustomerClaimBase(BaseModel):
    customer_id: UUID4
    claim_type: str
    status: str = "QUARANTINED"
    items: List[CustomerClaimItemBase]

class VendorClaimItemBase(BaseModel):
    product_id: UUID4
    batch_id: UUID4
    quantity: float
    source_receipt_id: Optional[str] = None

class VendorClaimBase(BaseModel):
    vendor_id: UUID4
    claim_type: str
    status: str = "SUBMITTED"
    items: List[VendorClaimItemBase]

class ReorderRuleBase(BaseModel):
    product_id: Optional[UUID4] = None
    formula: str
    safety_stock: float = 0.0
    lead_time_days: int = 0

class ReorderRuleCreate(ReorderRuleBase):
    pass

class ReorderRuleResponse(ReorderRuleBase):
    id: UUID4
    organization_id: UUID4
    
    class Config:
        orm_mode = True
        
class PurchaseProposalBase(BaseModel):
    product_id: UUID4
    suggested_qty: float
    explanation: Optional[str] = None
    status: str = "DRAFT"
    
class PurchaseProposalResponse(PurchaseProposalBase):
    id: UUID4
    created_at: datetime
    
    class Config:
        orm_mode = True
"""

if 'StockPositionBase' not in content:
    with open(schemas_path, 'a', encoding='utf-8') as file:
        file.write("\n" + schemas_to_add)
    print("Added DOC-16 schemas to schemas.py")
else:
    print("DOC-16 schemas already in schemas.py")
