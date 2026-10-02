with open('backend/schemas.py', 'r', encoding='utf-8') as f:
    content = f.read()

new_schemas = '''

# ============================================================
# DOC-15: Pricing, Rate, MRP & Formula Engine
# ============================================================

class PriceListRuleBase(BaseModel):
    product_id: UUID
    valid_from: date
    valid_to: date
    fixed_price: float

class PriceListRuleCreate(PriceListRuleBase):
    pass

class PriceListRuleResponse(PriceListRuleBase):
    id: UUID
    price_list_id: UUID
    class Config:
        from_attributes = True

class PriceListBase(BaseModel):
    code: str
    name: str
    description: Optional[str] = None
    status: str = "active"

class PriceListCreate(PriceListBase):
    pass

class PriceListResponse(PriceListBase):
    id: UUID
    organization_id: UUID
    rules: List[PriceListRuleResponse] = []
    created_at: datetime
    class Config:
        from_attributes = True

class PriceFormulaBase(BaseModel):
    target_rate_type: str
    source_rate_type: str
    operator: str
    operand: float
    floor_price: Optional[float] = None
    status: str = "active"

class PriceFormulaCreate(PriceFormulaBase):
    pass

class PriceFormulaResponse(PriceFormulaBase):
    id: UUID
    organization_id: UUID
    created_at: datetime
    class Config:
        from_attributes = True

class CustomerPriceConfigBase(BaseModel):
    party_id: UUID
    default_rate_type: Optional[str] = None
    price_list_id: Optional[UUID] = None

class CustomerPriceConfigCreate(CustomerPriceConfigBase):
    pass

class CustomerPriceConfigResponse(CustomerPriceConfigBase):
    id: UUID
    organization_id: UUID
    created_at: datetime
    class Config:
        from_attributes = True
'''

if 'class PriceListBase' not in content:
    with open('backend/schemas.py', 'a', encoding='utf-8') as f:
        f.write(new_schemas)
    print("Added DOC-15 schemas.")
else:
    print("DOC-15 schemas already exist.")
