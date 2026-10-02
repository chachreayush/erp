with open('backend/schemas.py', 'r', encoding='utf-8') as f:
    content = f.read()

principal_schemas = '''

# ============================================================
# DOC-12: Principal Master Schemas
# ============================================================

class PrincipalBase(BaseModel):
    code: str
    legal_name: str
    brand: Optional[str] = None
    gstin: Optional[str] = None
    status: str = "active"

class PrincipalCreate(PrincipalBase):
    pass

class PrincipalResponse(PrincipalBase):
    id: UUID
    organization_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True

class PrincipalAgreementBase(BaseModel):
    version_name: str
    valid_from: datetime
    valid_to: Optional[datetime] = None
    commission_percent: float = 0
    handling_percent: float = 0
    is_active: bool = True

class PrincipalAgreementCreate(PrincipalAgreementBase):
    principal_id: UUID

class PrincipalAgreementResponse(PrincipalAgreementBase):
    id: UUID
    organization_id: UUID
    principal_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True

class PrincipalWarehouseMappingCreate(BaseModel):
    principal_id: UUID
    warehouse_id: UUID

class PrincipalWarehouseMappingResponse(BaseModel):
    id: UUID
    organization_id: UUID
    principal_id: UUID
    warehouse_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True
'''

if 'class PrincipalBase' not in content:
    with open('backend/schemas.py', 'a', encoding='utf-8') as f:
        f.write(principal_schemas)
    print("Added Principal schemas.")
else:
    print("Principal schemas already exist.")
