import os

path = 'backend/models.py'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

models_to_add = """
# -- DOC-28: Bank Reconciliation Models ---------------------------------
class BankStatementProfile(Base):
    __tablename__ = "bank_statement_profiles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), nullable=False) # e.g. "HDFC Current Account"
    
    # JSON mapping: {"date": "Transaction Date", "description": "Narration", "withdrawal": "Debit", "deposit": "Credit", "reference": "Cheque/Ref No."}
    column_mapping = Column(JSON, nullable=False) 
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

class BankStatementImport(Base):
    __tablename__ = "bank_statement_imports"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    ledger_id = Column(UUID(as_uuid=True), ForeignKey("ledgers.id", ondelete="CASCADE"), nullable=False, index=True)
    profile_id = Column(UUID(as_uuid=True), ForeignKey("bank_statement_profiles.id", ondelete="SET NULL"), nullable=True)
    
    filename = Column(String(255), nullable=False)
    import_date = Column(DateTime, default=datetime.utcnow, nullable=False)
    imported_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

class BankStatementRow(Base):
    __tablename__ = "bank_statement_rows"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    import_id = Column(UUID(as_uuid=True), ForeignKey("bank_statement_imports.id", ondelete="CASCADE"), nullable=False, index=True)
    
    transaction_date = Column(Date, nullable=False)
    description = Column(String(500), nullable=False)
    reference_no = Column(String(100), nullable=True)
    
    withdrawal = Column(Numeric(15, 2), default=0)
    deposit = Column(Numeric(15, 2), default=0)
    balance = Column(Numeric(15, 2), nullable=True)
    
    is_reconciled = Column(Boolean, default=False, nullable=False)
    matched_voucher_id = Column(UUID(as_uuid=True), ForeignKey("vouchers.id", ondelete="SET NULL"), nullable=True)
    
    # Store original row for audit
    raw_data = Column(JSON, nullable=True)

class BankReconciliationMatch(Base):
    __tablename__ = "bank_reconciliation_matches"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    statement_row_id = Column(UUID(as_uuid=True), ForeignKey("bank_statement_rows.id", ondelete="CASCADE"), nullable=False, unique=True)
    voucher_id = Column(UUID(as_uuid=True), ForeignKey("vouchers.id", ondelete="CASCADE"), nullable=False)
    
    matched_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    matched_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    match_type = Column(String(50), nullable=False) # 'AUTO', 'MANUAL'
"""

if "class BankStatementProfile" not in content:
    content += "\n" + models_to_add
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Added Bank Reconcilation models to models.py")
else:
    print("Models already exist in models.py")
