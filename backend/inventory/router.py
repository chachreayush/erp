from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from database import get_db
import models, schemas
from auth.router import get_current_user
from typing import Optional
from uuid import UUID

router = APIRouter(prefix="/products", tags=["Inventory"])

@router.get("/", response_model=list[schemas.ProductResponse])
def get_products(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    """
    Fetch all products for the current user's organization with pagination.
    """
    query = db.query(models.Product).filter(
        models.Product.organization_id == current_user.organization_id,
        models.Product.is_active == True
    )
    products = query.offset(skip).limit(limit).all()
    return products

def _resolve_fks(db: Session, org_id: UUID, product_data: schemas.ProductCreate) -> dict:
    """Resolve string names to UUID foreign keys for product creation/update."""
    data = product_data.model_dump()
    
    # Resolve manufacturer (company)
    if data.get("company_name"):
        manufacturer = db.query(models.Manufacturer).filter(
            models.Manufacturer.organization_id == org_id,
            models.Manufacturer.name == data["company_name"]
        ).first()
        if manufacturer:
            data["company_id"] = manufacturer.id
        else:
            # Create new manufacturer if not found
            manufacturer = models.Manufacturer(
                organization_id=org_id,
                name=data["company_name"],
                status="continue"
            )
            db.add(manufacturer)
            db.flush()
            data["company_id"] = manufacturer.id
        del data["company_name"]
    
    # Resolve salt
    if data.get("salt"):
        salt = db.query(models.Salt).filter(
            models.Salt.organization_id == org_id,
            models.Salt.formula == data["salt"]
        ).first()
        if salt:
            data["salt_id"] = salt.id
        else:
            # Create new salt if not found
            salt = models.Salt(
                organization_id=org_id,
                formula=data["salt"]
            )
            db.add(salt)
            db.flush()
            data["salt_id"] = salt.id
        del data["salt"]
    
    # Resolve HSN code
    if data.get("hsn_code"):
        hsn = db.query(models.HSNCode).filter(
            models.HSNCode.organization_id == org_id,
            models.HSNCode.code == data["hsn_code"]
        ).first()
        if hsn:
            data["hsn_id"] = hsn.id
        else:
            # Create new HSN if not found
            hsn = models.HSNCode(
                organization_id=org_id,
                code=data["hsn_code"],
                description=f"Auto-created for {data.get('name', 'product')}"
            )
            db.add(hsn)
            db.flush()
            data["hsn_id"] = hsn.id
        del data["hsn_code"]
    
    return data

@router.post("/", response_model=schemas.ProductResponse, status_code=status.HTTP_201_CREATED)
def create_product(
    product: schemas.ProductCreate, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    """
    Create a new product for the current user's organization.
    Automatically resolves manufacturer, salt, and HSN code names to UUIDs.
    """
    org_id = current_user.organization_id
    data = _resolve_fks(db, org_id, product)
    
    new_product = models.Product(
        organization_id=org_id,
        **data
    )
    db.add(new_product)
    db.commit()
    db.refresh(new_product)
    return new_product

@router.put("/{product_id}", response_model=schemas.ProductResponse)
def update_product(
    product_id: UUID,
    product: schemas.ProductCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Update an existing product.
    """
    org_id = current_user.organization_id
    db_product = db.query(models.Product).filter(
        models.Product.id == product_id,
        models.Product.organization_id == org_id
    ).first()
    
    if not db_product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    data = _resolve_fks(db, org_id, product)
    
    for key, value in data.items():
        setattr(db_product, key, value)
    
    db.commit()
    db.refresh(db_product)
    return db_product

@router.delete("/{product_id}")
def delete_product(
    product_id: UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Soft delete a product (set is_active=False).
    """
    org_id = current_user.organization_id
    db_product = db.query(models.Product).filter(
        models.Product.id == product_id,
        models.Product.organization_id == org_id
    ).first()
    
    if not db_product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    db_product.is_active = False
    db.commit()
    return {"message": "Product deleted successfully"}
