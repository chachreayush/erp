with open("backend/schemas.py", "a", encoding="utf-8") as f:
    f.write("""
# -- EXPENSE MANAGEMENT SCHEMAS ---------------------------------

class ExpenseCategoryBase(BaseModel):
    name: str
    description: Optional[str] = None
    ledger_id: UUID
    is_active: bool = True

class ExpenseCategoryCreate(ExpenseCategoryBase):
    pass

class ExpenseCategoryResponse(ExpenseCategoryBase):
    id: UUID
    organization_id: UUID
    class Config:
        from_attributes = True

class EmployeeAdvanceBase(BaseModel):
    employee_ledger_id: UUID
    date: datetime
    amount: Decimal
    reason: Optional[str] = None

class EmployeeAdvanceCreate(EmployeeAdvanceBase):
    pass

class EmployeeAdvanceResponse(EmployeeAdvanceBase):
    id: UUID
    organization_id: UUID
    status: str
    voucher_id: Optional[UUID] = None
    class Config:
        from_attributes = True

class ExpenseLineBase(BaseModel):
    category_id: UUID
    amount: Decimal
    bill_number: Optional[str] = None
    bill_date: Optional[datetime] = None
    note: Optional[str] = None

class ExpenseLineCreate(ExpenseLineBase):
    pass

class ExpenseLineResponse(ExpenseLineBase):
    id: UUID
    claim_id: UUID
    class Config:
        from_attributes = True

class ExpenseClaimBase(BaseModel):
    claim_number: Optional[str] = None
    employee_ledger_id: UUID
    date: datetime
    total_amount: Decimal
    remarks: Optional[str] = None

class ExpenseClaimCreate(ExpenseClaimBase):
    lines: List[ExpenseLineCreate]

class ExpenseClaimResponse(ExpenseClaimBase):
    id: UUID
    organization_id: UUID
    status: str
    approved_by: Optional[UUID] = None
    payment_voucher_id: Optional[UUID] = None
    lines: List[ExpenseLineResponse]
    class Config:
        from_attributes = True
""")
