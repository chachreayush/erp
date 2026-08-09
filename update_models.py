import re

with open('backend/models.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove string columns and add relationships
new_fields = '''    company_id = Column(UUID(as_uuid=True), ForeignKey("manufacturers.id"), nullable=True)
    salt_id = Column(UUID(as_uuid=True), ForeignKey("salts.id"), nullable=True)
    
    # Relationships for masters
    company = relationship("Manufacturer", backref="products")
    salt_relation = relationship("Salt", backref="products")
    hsn_relation = relationship("HSNCode", backref="products")'''

# Find the Product class definition block
# It looks like:
#     company_name = Column(String(255), nullable=True) # Manufacturer name
#     company_id = Column(UUID(as_uuid=True), ForeignKey("manufacturers.id"), nullable=True)
#     salt = Column(String(255), nullable=True)
#     salt_id = Column(UUID(as_uuid=True), ForeignKey("salts.id"), nullable=True)

content = re.sub(
    r'    company_name = Column\(String\(255\), nullable=True\).*?salt_id = Column\(UUID\(as_uuid=True\), ForeignKey\("salts\.id"\), nullable=True\)',
    new_fields,
    content,
    flags=re.DOTALL
)

# Find HSN
#     hsn_code = Column(String(100), nullable=True)
#     hsn_id = Column(UUID(as_uuid=True), ForeignKey("hsn_codes.id"), nullable=True)
new_hsn = '''    hsn_id = Column(UUID(as_uuid=True), ForeignKey("hsn_codes.id"), nullable=True)'''
content = re.sub(
    r'    hsn_code = Column\(String\(100\), nullable=True\)\n    hsn_id = Column\(UUID\(as_uuid=True\), ForeignKey\("hsn_codes\.id"\), nullable=True\)',
    new_hsn,
    content
)

with open('backend/models.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated models.py")
