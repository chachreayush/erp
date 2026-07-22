
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session as DBSession
from database import get_db
from models import Company, UserRole
from auth.router import get_current_user
from pydantic import BaseModel
from typing import List
from uuid import UUID

router = APIRouter(prefix="/companies", tags=["Companies"])

class CompanyResponse(BaseModel):
    id: UUID
    name: str
    company_code: str
    is_am: bool

    class Config:
        orm_mode = True

@router.get("/", response_model=List[CompanyResponse])
def list_companies(current_user = Depends(get_current_user), db: DBSession = Depends(get_db)):
    if current_user.role != UserRole.AM_ADMIN.value:
        raise HTTPException(status_code=403, detail="Only AM Admin can view all companies")
    return db.query(Company).filter(Company.is_am == False).all()

from schemas import ClientRegistrationRequest
from models import User
from auth.utils import hash_password

@router.post("/register", response_model=CompanyResponse)
def register_client(request: ClientRegistrationRequest, current_user = Depends(get_current_user), db: DBSession = Depends(get_db)):
    if current_user.role != UserRole.AM_ADMIN.value:
        raise HTTPException(status_code=403, detail="Only AM Admin can register new clients")
    
    # Check if company code already exists
    existing_company = db.query(Company).filter(Company.company_code == request.company_code).first()
    if existing_company:
        raise HTTPException(status_code=400, detail="Company code already in use")
        
    # Check if admin username already exists globally (for simplicity, though it only needs to be unique per company)
    existing_user = db.query(User).filter(User.username == request.admin_username).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Admin username already in use")
        
    # 1. Create the new Company
    new_company = Company(
        name=request.company_name,
        company_code=request.company_code,
        is_am=False
    )
    db.add(new_company)
    db.flush() # Flush to get the new_company.id
    
    # 2. Create the Admin User for this company
    admin_user = User(
        company_id=new_company.id,
        name=request.admin_name,
        username=request.admin_username,
        hashed_password=hash_password(request.admin_password),
        role=UserRole.CM_ADMIN.value
    )
    db.add(admin_user)
    
    db.commit()
    db.refresh(new_company)
    
    return new_company
