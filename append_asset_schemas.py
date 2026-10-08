with open("backend/schemas.py", "r", encoding="utf-8") as f:
    code = f.read()

schemas = """
# ==========================================
# FIXED ASSETS & DEPRECIATION SCHEMAS
# ==========================================
class AssetCategoryBase(BaseModel):
    name: str
    depreciation_method: str = "WDV"
    depreciation_rate: float
    asset_ledger_id: UUID
    acc_depreciation_ledger_id: UUID
    depreciation_expense_ledger_id: UUID

class AssetCategoryCreate(AssetCategoryBase):
    pass

class AssetCategoryResponse(AssetCategoryBase):
    id: UUID
    organization_id: UUID
    created_at: datetime
    class Config:
        from_attributes = True

class FixedAssetBase(BaseModel):
    category_id: UUID
    name: str
    description: Optional[str] = None
    serial_number: Optional[str] = None
    location: Optional[str] = None
    purchase_date: datetime
    purchase_value: float
    salvage_value: float = 0.0

class FixedAssetCreate(FixedAssetBase):
    pass

class FixedAssetResponse(FixedAssetBase):
    id: UUID
    organization_id: UUID
    current_net_block: float
    status: str
    created_at: datetime
    class Config:
        from_attributes = True

class DepreciationRunRequest(BaseModel):
    run_date: datetime
    notes: Optional[str] = None

class DepreciationLogResponse(BaseModel):
    id: UUID
    asset_id: UUID
    voucher_id: Optional[UUID] = None
    run_date: datetime
    depreciation_amount: float
    closing_net_block: float
    notes: Optional[str] = None
    created_at: datetime
    class Config:
        from_attributes = True
"""

if "class AssetCategoryBase" not in code:
    code += "\n" + schemas

with open("backend/schemas.py", "w", encoding="utf-8") as f:
    f.write(code)
