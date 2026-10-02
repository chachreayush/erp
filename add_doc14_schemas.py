with open('backend/schemas.py', 'r', encoding='utf-8') as f:
    content = f.read()

new_schemas = """

# ============================================================
# DOC-14: Scheme & Free Goods Engine
# ============================================================

class SchemeVersionBase(BaseModel):
    version_number: int = 1
    valid_from: date
    valid_to: date
    buy_qty: float
    free_qty: float
    status: str = "active"

class SchemeVersionCreate(SchemeVersionBase):
    product_id: UUID

class SchemeVersionResponse(SchemeVersionBase):
    id: UUID
    scheme_id: UUID
    product_id: UUID
    class Config:
        from_attributes = True

class SchemeBase(BaseModel):
    code: str
    name: str
    scheme_type: str
    status: str = "active"

class SchemeCreate(SchemeBase):
    principal_id: UUID

class SchemeResponse(SchemeBase):
    id: UUID
    principal_id: UUID
    versions: List[SchemeVersionResponse] = []
    class Config:
        from_attributes = True

class EntitlementBase(BaseModel):
    granted_qty: float
    status: str = "active"

class EntitlementCreate(EntitlementBase):
    scheme_version_id: UUID

class EntitlementResponse(EntitlementBase):
    id: UUID
    organization_id: UUID
    scheme_version_id: UUID
    consumed_qty: float
    claimable_qty: float
    created_at: datetime
    class Config:
        from_attributes = True

class SchemeClaimBase(BaseModel):
    claim_number: str
    claim_date: date
    total_claim_qty: float
    status: str = "pending"

class SchemeClaimCreate(SchemeClaimBase):
    principal_id: UUID

class SchemeClaimResponse(SchemeClaimBase):
    id: UUID
    organization_id: UUID
    principal_id: UUID
    settled_qty: float
    created_at: datetime
    class Config:
        from_attributes = True
"""

if 'class SchemeBase' not in content:
    with open('backend/schemas.py', 'a', encoding='utf-8') as f:
        f.write(new_schemas)
    print("Added DOC-14 schemas.")
else:
    print("DOC-14 schemas already exist.")
