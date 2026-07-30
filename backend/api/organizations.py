
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

@router.post("/register", response_model=OrganizationResponse)
def register_client(request: ClientRegistrationRequest, current_user = Depends(get_current_user), db: DBSession = Depends(get_db)):
    if current_user.role != UserRole.AM_ADMIN.value:
        raise HTTPException(status_code=403, detail="Only AM Admin can register new clients")
    
    # Check if organization code already exists
    existing_organization = db.query(Organization).filter(Organization.org_code == request.org_code).first()
    if existing_organization:
        raise HTTPException(status_code=400, detail="Organization code already in use")
        
    # Check if admin username already exists globally (for simplicity, though it only needs to be unique per organization)
    existing_user = db.query(User).filter(User.username == request.admin_username).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Admin username already in use")
        
    # 1. Create the new Organization
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
    )
    db.add(admin_user)
    
    db.commit()
    db.refresh(new_organization)
    
    return new_organization
