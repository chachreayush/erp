import os

path = 'backend/schemas.py'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add DocumentSeries schemas
series_schemas = """
class DocumentSeriesBase(BaseModel):
    series_code: str
    invoice_type: str
    prefix: Optional[str] = None
    suffix: Optional[str] = None
    next_number: int = 1
    is_active: bool = True

class DocumentSeriesCreate(DocumentSeriesBase):
    pass

class DocumentSeriesResponse(DocumentSeriesBase):
    id: UUID
    organization_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True
"""
if 'class DocumentSeriesBase' not in content:
    content = content.replace(
        'class InvoiceItemBase(BaseModel):',
        series_schemas + '\nclass InvoiceItemBase(BaseModel):'
    )

# 2. Add source_challan_item_id and billed_qty to InvoiceItemBase
if 'source_challan_item_id: Optional[UUID] = None' not in content:
    content = content.replace(
        'source_order_item_id: Optional[UUID] = None',
        'source_order_item_id: Optional[UUID] = None\n    source_challan_item_id: Optional[UUID] = None\n    billed_qty: Optional[int] = 0'
    )

# 3. Add series_id to InvoiceCreate and InvoiceResponse
if 'series_id: Optional[UUID] = None' not in content:
    content = content.replace(
        'bill_discount: Optional[float] = 0',
        'bill_discount: Optional[float] = 0\n    series_id: Optional[UUID] = None'
    )

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated schemas.py")
