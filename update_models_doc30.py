import os
import re

models_path = "backend/models.py"

def inject_doc30_models():
    with open(models_path, "r", encoding="utf-8") as f:
        content = f.read()
        
    if "class ReportTemplate" in content:
        print("DOC-30 models already exist.")
        return

    doc30_models = """

# ==========================================
# DOC-30: Financial & Management Reporting
# ==========================================

class ReportTemplate(Base):
    __tablename__ = "report_templates"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"))
    name = Column(String, index=True)
    subject = Column(String) # e.g., "Sales", "Ledger", "Inventory"
    config = Column(JSON) # Stores selected columns, calculations, default filters
    is_published = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class ReportVariant(Base):
    __tablename__ = "report_variants"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    template_id = Column(UUID(as_uuid=True), ForeignKey("report_templates.id"), nullable=True)
    name = Column(String)
    saved_state = Column(JSON) # Hidden columns, custom order, active filters
    created_at = Column(DateTime, default=datetime.utcnow)

class DashboardExclusion(Base):
    __tablename__ = "dashboard_exclusions"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"))
    entity_type = Column(String) # 'Party', 'Ledger', 'Invoice'
    entity_id = Column(UUID(as_uuid=True))
    reason = Column(String)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    expiry_date = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
"""
    content += doc30_models
    with open(models_path, "w", encoding="utf-8") as f:
        f.write(content)
    print("DOC-30 models injected.")

inject_doc30_models()
