import os
import re

schemas_path = "backend/schemas.py"

def inject_doc30_schemas():
    with open(schemas_path, "r", encoding="utf-8") as f:
        content = f.read()

    if "class ReportTemplateBase" in content:
        print("DOC-30 schemas already exist.")
        return

    doc30_schemas = """

# ==========================================
# DOC-30: Financial & Management Reporting
# ==========================================
class ReportTemplateBase(BaseModel):
    name: str
    subject: str
    config: dict
    is_published: bool = False

class ReportTemplateCreate(ReportTemplateBase):
    pass

class ReportTemplateResponse(ReportTemplateBase):
    id: UUID
    organization_id: UUID
    created_at: datetime
    updated_at: datetime
    class Config:
        from_attributes = True

class ReportVariantBase(BaseModel):
    template_id: Optional[UUID] = None
    name: str
    saved_state: dict

class ReportVariantCreate(ReportVariantBase):
    pass

class ReportVariantResponse(ReportVariantBase):
    id: UUID
    user_id: UUID
    created_at: datetime
    class Config:
        from_attributes = True

class DashboardExclusionBase(BaseModel):
    entity_type: str
    entity_id: UUID
    reason: str
    expiry_date: Optional[datetime] = None
    is_active: bool = True

class DashboardExclusionCreate(DashboardExclusionBase):
    pass

class DashboardExclusionResponse(DashboardExclusionBase):
    id: UUID
    organization_id: UUID
    user_id: UUID
    created_at: datetime
    class Config:
        from_attributes = True
"""
    content += doc30_schemas
    with open(schemas_path, "w", encoding="utf-8") as f:
        f.write(content)
    print("DOC-30 schemas injected.")

inject_doc30_schemas()
