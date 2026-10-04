import os

path = 'backend/schemas.py'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

new_schemas = """

# =====================================================================
# DOC-18: Sales Order Management Schemas
# =====================================================================

class SalesOrderItemBase(BaseModel):
    product_id: Optional[UUID4] = None
    product_name: str
    quantity: int
    allocated_qty: int = 0
    rate: Decimal
    line_total: Decimal

class SalesOrderBase(BaseModel):
    order_number: str
    date: datetime
    party_id: UUID4
    status: str = "DRAFT"
    total_amount: Decimal = Decimal('0.00')

class SalesOrderCreate(SalesOrderBase):
    items: List[SalesOrderItemBase]

class SalesOrderHoldBase(BaseModel):
    hold_reason: str
    status: str = "ACTIVE"

class SalesOrderHoldResponse(SalesOrderHoldBase):
    id: UUID4
    order_id: UUID4
    organization_id: UUID4
    created_at: datetime
    cleared_at: Optional[datetime] = None
    cleared_by_user_id: Optional[UUID4] = None
    model_config = ConfigDict(from_attributes=True)

class SalesOrderItemResponse(SalesOrderItemBase):
    id: UUID4
    order_id: UUID4
    model_config = ConfigDict(from_attributes=True)

class SalesOrderResponse(SalesOrderBase):
    id: UUID4
    organization_id: UUID4
    created_by_user_id: Optional[UUID4] = None
    created_at: datetime
    items: List[SalesOrderItemResponse] = []
    holds: List[SalesOrderHoldResponse] = [] # Optional, maybe fetched separately or joined
    model_config = ConfigDict(from_attributes=True)

"""

if 'class SalesOrderBase(BaseModel):' not in content:
    # Also update UserCreate to accept allow_direct_billing
    content = content.replace(
        'role: Optional[str] = "staff"',
        'role: Optional[str] = "staff"\n    allow_direct_billing: Optional[bool] = False'
    )
    content = content.replace(
        'role: str',
        'role: str\n    allow_direct_billing: bool'
    )
    content += new_schemas
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Updated schemas.py for DOC-18")
else:
    print("schemas.py already updated")
