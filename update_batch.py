with open('backend/models.py', 'r', encoding='utf-8') as f:
    content = f.read()

target_batch = """    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)"""

replacement_batch = """    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    principal_owner_id = Column(UUID(as_uuid=True), ForeignKey("principals.id", ondelete="SET NULL"), nullable=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)"""

if 'principal_owner_id' not in content:
    content = content.replace(target_batch, replacement_batch)
    with open('backend/models.py', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Added principal_owner_id to Batch")
else:
    print("Already added principal_owner_id")
