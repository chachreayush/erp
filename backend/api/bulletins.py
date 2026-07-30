from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from database import get_db
from models import Bulletin, User
from schemas import BulletinCreate, BulletinUpdate, BulletinResponse
from auth.router import get_current_user

router = APIRouter(
    prefix="/bulletins",
    tags=["Bulletins"]
)

@router.get("/", response_model=List[BulletinResponse])
def get_bulletins(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Fetch all bulletins for the current user's organization or global ones.
    """
    bulletins = db.query(Bulletin).filter(
        (Bulletin.organization_id == current_user.organization_id) | (Bulletin.is_global == True)
    ).order_by(Bulletin.created_at.desc()).all()
    
    # We map author_name manually to avoid complex joins in the schema if we want it simple
    result = []
    for b in bulletins:
        author_name = b.author.name if b.author else "Unknown"
        # Create a dict from the model and inject author_name
        b_dict = {
            "id": b.id,
            "organization_id": b.organization_id,
            "author_id": b.author_id,
            "title": b.title,
            "content": b.content,
            "priority": b.priority,
            "is_global": b.is_global,
            "created_at": b.created_at,
            "updated_at": b.updated_at,
            "author_name": author_name
        }
        result.append(b_dict)
        
    return result

@router.post("/", response_model=BulletinResponse)
def create_bulletin(bulletin_in: BulletinCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Create a new bulletin. Only am_admin or cm_admin can do this.
    """
    if current_user.role.value not in ["am_admin", "cm_admin"]:
        raise HTTPException(status_code=403, detail="Not authorized to create bulletins")
        
    organization_id_to_use = current_user.organization_id
    is_global_val = False
    
    if current_user.role.value == "am_admin":
        if bulletin_in.is_global:
            is_global_val = True
        elif bulletin_in.target_org_id:
            organization_id_to_use = bulletin_in.target_org_id

    bulletin = Bulletin(
        organization_id=organization_id_to_use,
        author_id=current_user.id,
        title=bulletin_in.title,
        content=bulletin_in.content,
        priority=bulletin_in.priority,
        is_global=is_global_val
    )
    db.add(bulletin)
    db.commit()
    db.refresh(bulletin)
    
    author_name = bulletin.author.name if bulletin.author else "Unknown"
    return {**bulletin.__dict__, "author_name": author_name}

@router.put("/{bulletin_id}", response_model=BulletinResponse)
def update_bulletin(bulletin_id: UUID, bulletin_in: BulletinUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Update a bulletin. Only am_admin or cm_admin can do this.
    """
    if current_user.role.value not in ["am_admin", "cm_admin"]:
        raise HTTPException(status_code=403, detail="Not authorized to update bulletins")
        
    bulletin = db.query(Bulletin).filter(
        Bulletin.id == bulletin_id, 
        (Bulletin.organization_id == current_user.organization_id) | (Bulletin.author_id == current_user.id)
    ).first()
    if not bulletin:
        raise HTTPException(status_code=404, detail="Bulletin not found")
        
    update_data = bulletin_in.model_dump(exclude_unset=True)
    
    # Only am_admin can set is_global
    if "is_global" in update_data and current_user.role.value != "am_admin":
        del update_data["is_global"]

    for key, value in update_data.items():
        setattr(bulletin, key, value)
        
    db.commit()
    db.refresh(bulletin)
    
    author_name = bulletin.author.name if bulletin.author else "Unknown"
    return {**bulletin.__dict__, "author_name": author_name}

@router.delete("/{bulletin_id}")
def delete_bulletin(bulletin_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Delete a bulletin.
    """
    if current_user.role.value not in ["am_admin", "cm_admin"]:
        raise HTTPException(status_code=403, detail="Not authorized to delete bulletins")
        
    bulletin = db.query(Bulletin).filter(
        Bulletin.id == bulletin_id, 
        (Bulletin.organization_id == current_user.organization_id) | (Bulletin.author_id == current_user.id)
    ).first()
    if not bulletin:
        raise HTTPException(status_code=404, detail="Bulletin not found")
        
    db.delete(bulletin)
    db.commit()
    return {"ok": True}
