import os

path = 'backend/schemas.py'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# InvoiceItemCreate
if 'source_order_item_id: Optional[UUID4] = None' not in content:
    content = content.replace(
        'igst_percent: Decimal = Decimal("0")',
        'igst_percent: Decimal = Decimal("0")\n    source_order_item_id: Optional[UUID4] = None'
    )

# InvoiceCreate
if 'source_order_id: Optional[UUID4] = None' not in content:
    content = content.replace(
        'bill_discount: Optional[Decimal] = Decimal("0")',
        'bill_discount: Optional[Decimal] = Decimal("0")\n    source_order_id: Optional[UUID4] = None'
    )

# Dispatch schemas
dispatch_schemas = """
# =====================================================================
# DOC-19: Dispatch and Delivery Schemas
# =====================================================================

class DispatchRecordBase(BaseModel):
    vehicle_number: Optional[str] = None
    driver_name: Optional[str] = None
    transport_agency: Optional[str] = None
    status: str = "READY"
    pod_captured: bool = False
    pod_remarks: Optional[str] = None
    pod_date: Optional[datetime] = None

class DispatchRecordCreate(DispatchRecordBase):
    challan_id: UUID4

class DispatchRecordResponse(DispatchRecordBase):
    id: UUID4
    organization_id: UUID4
    challan_id: UUID4
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)
"""

if 'class DispatchRecordBase' not in content:
    content += dispatch_schemas

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated schemas.py with DOC-19 fields")
