import re

with open('backend/schemas.py', 'r', encoding='utf-8') as f:
    content = f.read()

old_product_base = """class ProductBase(BaseModel):
    # Base
    status: str = "continue"
    hide: str = "no"
    code: str
    name: str
    packing: Optional[str] = None
    unit: Optional[str] = None
    colour_type: str = "normal"
    item_type: str = "normal"
    company_name: Optional[str] = None
    salt: Optional[str] = None
    
    # Taxes & HSN
    hsn_applicable: str = "no"
    hsn_code: Optional[str] = None"""

new_product_base = """class ProductBase(BaseModel):
    # Base
    status: str = "continue"
    hide: str = "no"
    code: str
    name: str
    packing: Optional[str] = None
    unit: Optional[str] = None
    colour_type: str = "normal"
    item_type: str = "normal"
    company_name: Optional[str] = None
    salt: Optional[str] = None
    
    # DOC-11 Fields
    base_uom: Optional[str] = "EACH"
    purchase_uom: Optional[str] = None
    sales_uom: Optional[str] = None
    pack_size: Optional[str] = None
    track_batch: bool = True
    tax_rule_id: Optional[str] = None
    
    # Taxes & HSN
    hsn_applicable: str = "no"
    hsn_code: Optional[str] = None"""

content = content.replace(old_product_base, new_product_base)

principal_schema = """
class ProductPrincipalMappingBase(BaseModel):
    principal_code: str
    principal_name: Optional[str] = None
    principal_uom: Optional[str] = None
    principal_pack: Optional[str] = None

class ProductPrincipalMappingCreate(ProductPrincipalMappingBase):
    product_id: UUID4

class ProductPrincipalMappingResponse(ProductPrincipalMappingBase):
    id: UUID4
    product_id: UUID4
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)
"""

if "ProductPrincipalMappingBase" not in content:
    content = content.replace("class ProductCreate(ProductBase):", principal_schema + "\nclass ProductCreate(ProductBase):")

with open('backend/schemas.py', 'w', encoding='utf-8') as f:
    f.write(content)
