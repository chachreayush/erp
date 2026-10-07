with open("backend/models.py", "a", encoding="utf-8") as f:
    f.write("""
# -- TABLE 26: Expense Management ---------------------------------
class ExpenseCategory(Base):
    __tablename__ = "expense_categories"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    description = Column(String(255), nullable=True)
    ledger_id = Column(UUID(as_uuid=True), ForeignKey("ledgers.id", ondelete="RESTRICT"), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    organization = relationship("Organization")
    ledger = relationship("Ledger")

class EmployeeAdvance(Base):
    __tablename__ = "employee_advances"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    employee_ledger_id = Column(UUID(as_uuid=True), ForeignKey("ledgers.id", ondelete="RESTRICT"), nullable=False)
    date = Column(DateTime, default=datetime.utcnow, nullable=False)
    amount = Column(Numeric(15, 2), nullable=False)
    reason = Column(String(255), nullable=True)
    status = Column(String(50), nullable=False, default="Active") # Active, Settled
    voucher_id = Column(UUID(as_uuid=True), ForeignKey("vouchers.id", ondelete="SET NULL"), nullable=True)

    employee_ledger = relationship("Ledger")
    voucher = relationship("Voucher")

class ExpenseClaim(Base):
    __tablename__ = "expense_claims"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    claim_number = Column(String(100), nullable=False, index=True)
    employee_ledger_id = Column(UUID(as_uuid=True), ForeignKey("ledgers.id", ondelete="RESTRICT"), nullable=False)
    date = Column(DateTime, default=datetime.utcnow, nullable=False)
    total_amount = Column(Numeric(15, 2), nullable=False, default=0)
    status = Column(String(50), nullable=False, default="Draft") # Draft, Approved, Paid, Rejected
    approved_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    payment_voucher_id = Column(UUID(as_uuid=True), ForeignKey("vouchers.id", ondelete="SET NULL"), nullable=True)
    remarks = Column(Text, nullable=True)

    employee_ledger = relationship("Ledger", foreign_keys=[employee_ledger_id])
    lines = relationship("ExpenseLine", back_populates="claim", cascade="all, delete-orphan")

class ExpenseLine(Base):
    __tablename__ = "expense_lines"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    claim_id = Column(UUID(as_uuid=True), ForeignKey("expense_claims.id", ondelete="CASCADE"), nullable=False)
    category_id = Column(UUID(as_uuid=True), ForeignKey("expense_categories.id", ondelete="RESTRICT"), nullable=False)
    amount = Column(Numeric(15, 2), nullable=False)
    bill_number = Column(String(100), nullable=True)
    bill_date = Column(DateTime, nullable=True)
    note = Column(String(255), nullable=True)

    claim = relationship("ExpenseClaim", back_populates="lines")
    category = relationship("ExpenseCategory")
""")
