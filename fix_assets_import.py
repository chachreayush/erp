with open("backend/api/assets.py", "r", encoding="utf-8") as f:
    code = f.read()

target = "from api.organizations import get_org_id"
replacement = """def get_org_id(user: models.User) -> UUID:
    if not user.organization_id:
        raise HTTPException(status_code=400, detail="User is not assigned to an organization")
    return user.organization_id
"""
code = code.replace(target, replacement)

with open("backend/api/assets.py", "w", encoding="utf-8") as f:
    f.write(code)
