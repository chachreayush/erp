
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session as DBSession
from database import get_db
from models import Organization, UserRole
from auth.router import get_current_user
from pydantic import BaseModel
from typing import List
from uuid import UUID

router = APIRouter(prefix="/organizations", tags=["Organizations"])

class OrganizationResponse(BaseModel):
    id: UUID
    name: str
    org_code: str
    is_am: bool

    class Config:
        from_attributes = True

@router.get("/", response_model=List[OrganizationResponse])
def list_organizations(current_user = Depends(get_current_user), db: DBSession = Depends(get_db)):
    if current_user.role != UserRole.AM_ADMIN.value:
        raise HTTPException(status_code=403, detail="Only AM Admin can view all organizations")
    return db.query(Organization).filter(Organization.is_am == False).all()

from schemas import ClientRegistrationRequest
from models import User
from auth.utils import hash_password
from seed_coa import seed_chart_of_accounts

@router.post("/register", response_model=OrganizationResponse)
def register_client(request: ClientRegistrationRequest, current_user = Depends(get_current_user), db: DBSession = Depends(get_db)):
    if current_user.role != UserRole.AM_ADMIN.value:
        raise HTTPException(status_code=403, detail="Only AM Admin can register new clients")
    
    # Check if organization code already exists
    existing_organization = db.query(Organization).filter(Organization.org_code == request.org_code).first()
    if existing_organization:
        raise HTTPException(status_code=400, detail="Organization code already in use")
        

    # 1. Create the new Organization
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
    )
    db.add(admin_user)
    db.flush()

    # 3. Seed Chart of Accounts
    seed_chart_of_accounts(new_organization.id, db)

    db.commit()
    db.refresh(new_organization)
    
    return new_organization

# ── CRM PERMISSIONS MATRIX ENDPOINTS ──────────────────────────

from schemas import OrganizationPermissionsResponse, OrganizationPermissionsUpdate

@router.get("/{org_id}/permissions", response_model=OrganizationPermissionsResponse)
def get_organization_permissions(
    org_id: UUID,
    current_user = Depends(get_current_user),
    db: DBSession = Depends(get_db)
):
    """
    Returns the role_permissions JSONB for a specific organization.
    Only AM Admins can view permissions for any org.
    CM Admins can view permissions for their own org.
    """
    if current_user.role == UserRole.AM_ADMIN.value:
        org = db.query(Organization).filter(Organization.id == org_id).first()
    elif current_user.role == UserRole.CM_ADMIN.value:
        org = db.query(Organization).filter(
            Organization.id == org_id,
            Organization.id == current_user.organization_id
        ).first()
    else:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    return OrganizationPermissionsResponse(
        org_id=org.id,
        org_name=org.name,
        role_permissions=org.role_permissions
    )


@router.put("/{org_id}/permissions", response_model=OrganizationPermissionsResponse)
def update_organization_permissions(
    org_id: UUID,
    payload: OrganizationPermissionsUpdate,
    current_user = Depends(get_current_user),
    db: DBSession = Depends(get_db)
):
    """
    Replaces the entire role_permissions JSONB for a specific organization.
    Only AM Admins can update permissions for any org.
    CM Admins can update permissions for their own org.
    """
    # Validate allowed module slugs
    VALID_MODULES = {"sales", "purchase", "inventory", "finance", "hr", "crm", "reports", "settings"}
    for role_name, modules in payload.role_permissions.items():
        invalid = set(modules) - VALID_MODULES
        if invalid:
            raise HTTPException(
                status_code=422,
                detail=f"Invalid module(s) for role '{role_name}': {', '.join(invalid)}. Valid modules: {', '.join(sorted(VALID_MODULES))}"
            )

    if current_user.role == UserRole.AM_ADMIN.value:
        org = db.query(Organization).filter(Organization.id == org_id).first()
    elif current_user.role == UserRole.CM_ADMIN.value:
        org = db.query(Organization).filter(
            Organization.id == org_id,
            Organization.id == current_user.organization_id
        ).first()
    else:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    org.role_permissions = payload.role_permissions
    db.commit()
    db.refresh(org)

    return OrganizationPermissionsResponse(
        org_id=org.id,
        org_name=org.name,
        role_permissions=org.role_permissions
    )
