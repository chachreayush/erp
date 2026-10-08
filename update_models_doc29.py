import os

models_path = "backend/models.py"

def inject_field(class_name, field_code, after_line):
    with open(models_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        
    for i, line in enumerate(lines):
        if line.strip().startswith(after_line) and class_name in "".join(lines[max(0, i-20):i]):
            lines.insert(i + 1, field_code + "\n")
            break
            
    with open(models_path, 'w', encoding='utf-8') as f:
        f.writelines(lines)


# 1. Add fields to Party
inject_field("class Party", "    is_non_filer_206ab_cca = Column(Boolean, default=False)", "status = Column(String(20)")
inject_field("class Party", "    tds_tcs_mode = Column(String(20), default='PROMPT') # 'AUTOMATIC', 'MANUAL', 'DEFER', 'PROMPT'", "status = Column(String(20)")

# 2. Add party_id to Invoice
inject_field("class Invoice", "    party_id = Column(UUID(as_uuid=True), ForeignKey('parties.id', ondelete='SET NULL'), nullable=True, index=True)", "customer_name = Column(")

# 3. Append new models for DOC-29
new_models = """

# ============================================================
# DOC-29: GST, Tax, E-Invoicing, E-Way Bill & TDS/TCS Engine
# ============================================================
from sqlalchemy import Numeric

class TaxProfile(Base):
    __tablename__ = "tax_profiles"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    name = Column(String(100), nullable=False)
    jurisdiction = Column(String(50), nullable=False, default="IN")
    is_active = Column(Boolean, default=True)
    rules_json = Column(JSONB, nullable=True) # To store dynamic tax rules

class TaxTransactionLine(Base):
    __tablename__ = "tax_transaction_lines"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    invoice_item_id = Column(UUID(as_uuid=True), ForeignKey("invoice_items.id", ondelete="CASCADE"), nullable=False)
    
    tax_component = Column(String(50), nullable=False) # e.g., CGST, SGST, IGST, CESS
    tax_rate = Column(Numeric(5, 2), nullable=False)
    taxable_amount = Column(Numeric(12, 2), nullable=False)
    tax_amount = Column(Numeric(12, 2), nullable=False)
    rule_version = Column(String(50), nullable=True) # Tracks the version of the tax rule applied

class EinvoiceEwayLog(Base):
    __tablename__ = "einvoice_eway_logs"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    invoice_id = Column(UUID(as_uuid=True), ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    log_type = Column(String(20), nullable=False) # 'EINVOICE', 'EWAYBILL'
    status = Column(String(20), nullable=False) # 'PENDING', 'EXPORTED', 'SUCCESS', 'ERROR'
    
    # Evidence from IRP
    irn = Column(String(100), nullable=True)
    ack_no = Column(String(100), nullable=True)
    ack_date = Column(String(50), nullable=True)
    signed_qr_data = Column(Text, nullable=True)
    signed_invoice_data = Column(Text, nullable=True)
    eway_bill_no = Column(String(100), nullable=True)
    eway_bill_valid_till = Column(String(50), nullable=True)
    
    # Audit trail
    error_message = Column(Text, nullable=True)
    request_payload_json = Column(JSONB, nullable=True)
    response_payload_json = Column(JSONB, nullable=True)

class TdsTcsTransaction(Base):
    __tablename__ = "tds_tcs_transactions"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    party_id = Column(UUID(as_uuid=True), ForeignKey("parties.id", ondelete="CASCADE"), nullable=False)
    invoice_id = Column(UUID(as_uuid=True), ForeignKey("invoices.id", ondelete="CASCADE"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    financial_year = Column(String(10), nullable=False) # e.g. "2025-26"
    transaction_type = Column(String(20), nullable=False) # 'PURCHASE', 'SALE'
    transaction_amount = Column(Numeric(12, 2), nullable=False)
    cumulative_amount = Column(Numeric(12, 2), nullable=False) # Tracking towards 50L limit
    
    # Deduction info
    section_code = Column(String(20), nullable=True) # e.g., "194Q"
    deducted_amount = Column(Numeric(12, 2), nullable=True, default=0)
    is_threshold_breached = Column(Boolean, default=False)
"""

with open(models_path, 'a', encoding='utf-8') as f:
    f.write(new_models)

print("backend/models.py updated successfully.")
