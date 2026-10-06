import os

path = 'backend/schemas.py'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

schemas_to_add = """
# -- DOC-28: Bank Reconciliation Schemas ---------------------------------
class BankStatementProfileBase(BaseModel):
    name: str
    column_mapping: dict

class BankStatementProfileCreate(BankStatementProfileBase):
    pass

class BankStatementProfileResponse(BankStatementProfileBase):
    id: UUID
    organization_id: UUID
    created_at: datetime
    class Config:
        from_attributes = True

class BankStatementRowResponse(BaseModel):
    id: UUID
    transaction_date: date
    description: str
    reference_no: Optional[str] = None
    withdrawal: Decimal
    deposit: Decimal
    balance: Optional[Decimal] = None
    is_reconciled: bool
    matched_voucher_id: Optional[UUID] = None
    class Config:
        from_attributes = True

class BankReconciliationMatchRequest(BaseModel):
    statement_row_id: UUID
    voucher_id: UUID
"""

if "class BankStatementProfileBase" not in content:
    content += "\n" + schemas_to_add
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Added Bank Reconcilation schemas to schemas.py")
else:
    print("Schemas already exist in schemas.py")
