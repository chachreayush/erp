with open('backend/schemas.py', 'r', encoding='utf-8') as f:
    content = f.read()

old_schema = """class ClientRegistrationRequest(BaseModel):
    org_name: str
    org_code: str
    admin_name: str
    admin_username: str
    admin_password: str"""

new_schema = """class ClientRegistrationRequest(BaseModel):
    org_name: str
    org_code: str
    admin_name: str
    admin_username: str
    admin_password: str
    is_admin_company: bool = False"""

content = content.replace(old_schema, new_schema)
with open('backend/schemas.py', 'w', encoding='utf-8') as f:
    f.write(content)

with open('backend/api/organizations.py', 'r', encoding='utf-8') as f:
    content = f.read()

old_logic = """    # 1. Create the new Organization
    new_organization = Organization(
        name=request.org_name,
        org_code=request.org_code,
        is_am=False
    )
    db.add(new_organization)
    db.flush() # Flush to get the new_organization.id
    
    # 2. Create the Admin User for this organization
    admin_user = User(
        organization_id=new_organization.id,
        name=request.admin_name,
        username=request.admin_username,
        hashed_password=hash_password(request.admin_password),
        role=UserRole.CM_ADMIN.value
    )"""

new_logic = """    # 1. Create the new Organization
    new_organization = Organization(
        name=request.org_name,
        org_code=request.org_code,
        is_am=request.is_admin_company
    )
    db.add(new_organization)
    db.flush() # Flush to get the new_organization.id
    
    # 2. Create the Admin User for this organization
    admin_user = User(
        organization_id=new_organization.id,
        name=request.admin_name,
        username=request.admin_username,
        hashed_password=hash_password(request.admin_password),
        role=UserRole.AM_ADMIN.value if request.is_admin_company else UserRole.CM_ADMIN.value
    )"""

content = content.replace(old_logic, new_logic)
with open('backend/api/organizations.py', 'w', encoding='utf-8') as f:
    f.write(content)
