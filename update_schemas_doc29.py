import os

schemas_path = "backend/schemas.py"

def inject_field(class_name, field_code, after_line):
    with open(schemas_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        
    for i, line in enumerate(lines):
        if line.strip().startswith(after_line) and class_name in "".join(lines[max(0, i-20):i]):
            lines.insert(i + 1, field_code + "\n")
            break
            
    with open(schemas_path, 'w', encoding='utf-8') as f:
        f.writelines(lines)

# 1. Add fields to PartyCreate and PartyResponse
inject_field("class PartyCreate", "    is_non_filer_206ab_cca: Optional[bool] = False", "gst:")
inject_field("class PartyCreate", "    tds_tcs_mode: Optional[str] = 'PROMPT'", "gst:")
inject_field("class PartyResponse", "    is_non_filer_206ab_cca: Optional[bool]", "gst:")
inject_field("class PartyResponse", "    tds_tcs_mode: Optional[str]", "gst:")

# 2. Add party_id to InvoiceCreate and InvoiceResponse
inject_field("class InvoiceCreate", "    party_id: Optional[UUID] = None", "customer_name:")
inject_field("class InvoiceResponse", "    party_id: Optional[UUID]", "customer_name:")

# 3. Append new schemas for DOC-29
new_schemas = """

# ============================================================
# DOC-29: GST, Tax, E-Invoicing, E-Way Bill & TDS/TCS Schemas
# ============================================================
from typing import Any, Dict

class TaxProfileCreate(BaseModel):
    name: str
    jurisdiction: str = "IN"
    is_active: bool = True
    rules_json: Optional[Dict[str, Any]] = None

class TaxProfileResponse(TaxProfileCreate):
    id: UUID
    organization_id: UUID
    created_at: datetime
    class Config:
        orm_mode = True

class TaxTransactionLineCreate(BaseModel):
    invoice_item_id: UUID
    tax_component: str
    tax_rate: float
    taxable_amount: float
    tax_amount: float
    rule_version: Optional[str] = None

class TaxTransactionLineResponse(TaxTransactionLineCreate):
    id: UUID
    organization_id: UUID
    class Config:
        orm_mode = True

class EinvoiceEwayLogCreate(BaseModel):
    invoice_id: UUID
    log_type: str
    status: str
    irn: Optional[str] = None
    ack_no: Optional[str] = None
    ack_date: Optional[str] = None
    signed_qr_data: Optional[str] = None
    signed_invoice_data: Optional[str] = None
    eway_bill_no: Optional[str] = None
    eway_bill_valid_till: Optional[str] = None
    error_message: Optional[str] = None
    request_payload_json: Optional[Dict[str, Any]] = None
    response_payload_json: Optional[Dict[str, Any]] = None

class EinvoiceEwayLogResponse(EinvoiceEwayLogCreate):
    id: UUID
    organization_id: UUID
    created_at: datetime
    class Config:
        orm_mode = True

class TdsTcsTransactionCreate(BaseModel):
    party_id: UUID
    invoice_id: Optional[UUID] = None
    financial_year: str
    transaction_type: str
    transaction_amount: float
    cumulative_amount: float
    section_code: Optional[str] = None
    deducted_amount: float = 0
    is_threshold_breached: bool = False

class TdsTcsTransactionResponse(TdsTcsTransactionCreate):
    id: UUID
    organization_id: UUID
    created_at: datetime
    class Config:
        orm_mode = True
"""

with open(schemas_path, 'a', encoding='utf-8') as f:
    f.write(new_schemas)

print("backend/schemas.py updated successfully.")
