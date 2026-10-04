import os

path = 'backend/schemas.py'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

new_schemas = """

# =====================================================================
# DOC-17: Procurement Schemas (POs, Rules, Complaints)
# =====================================================================

class VendorSupplyRuleBase(BaseModel):
    product_id: UUID4
    vendor_id: UUID4
    rule_type: str
    is_active: bool = True

class VendorSupplyRuleCreate(VendorSupplyRuleBase):
    pass

class VendorSupplyRuleResponse(VendorSupplyRuleBase):
    id: UUID4
    organization_id: UUID4
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class PurchaseOrderItemBase(BaseModel):
    product_id: Optional[UUID4] = None
    product_name: str
    quantity: int
    received_qty: int = 0
    rate: Decimal
    line_total: Decimal

class PurchaseOrderBase(BaseModel):
    po_number: str
    date: datetime
    vendor_id: UUID4
    status: str = "DRAFT"
    expected_delivery: Optional[datetime] = None
    supply_classification: Optional[str] = None
    total_amount: Decimal = Decimal('0.00')

class PurchaseOrderCreate(PurchaseOrderBase):
    items: List[PurchaseOrderItemBase]

class PurchaseOrderItemResponse(PurchaseOrderItemBase):
    id: UUID4
    po_id: UUID4
    model_config = ConfigDict(from_attributes=True)

class PurchaseOrderResponse(PurchaseOrderBase):
    id: UUID4
    organization_id: UUID4
    created_at: datetime
    items: List[PurchaseOrderItemResponse] = []
    model_config = ConfigDict(from_attributes=True)

class VendorComplaintBase(BaseModel):
    complaint_number: str
    vendor_id: UUID4
    category: str
    status: str = "OPEN"
    severity: str = "MEDIUM"
    description: Optional[str] = None
    related_document_id: Optional[UUID4] = None

class VendorComplaintCreate(VendorComplaintBase):
    pass

class VendorComplaintResponse(VendorComplaintBase):
    id: UUID4
    organization_id: UUID4
    created_at: datetime
    resolved_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

"""

if 'class PurchaseOrderBase(BaseModel):' not in content:
    content += new_schemas
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Added procurement schemas to schemas.py")
else:
    print("Procurement schemas already exist")
