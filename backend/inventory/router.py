from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from database import get_db
import models, schemas
from auth.router import get_current_user

router = APIRouter(prefix="/products", tags=["Inventory"])

@router.get("/", response_model=list[schemas.ProductResponse])
def get_products(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """
    Fetch all products for the current user's organization.
    """
    products = db.query(models.Product).options(
        joinedload(models.Product.company),
        joinedload(models.Product.salt_relation),
        joinedload(models.Product.hsn_relation)
    ).filter(models.Product.organization_id == current_user.organization_id).all()
    return products

@router.post("/", response_model=schemas.ProductResponse)
def create_product(product: schemas.ProductCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """
    Create a new product for the current user's organization.
    """
    new_product = models.Product(
        organization_id=current_user.organization_id,
        status=product.status,
        hide=product.hide,
        code=product.code,
        name=product.name,
        packing=product.packing,
        unit=product.unit,
        colour_type=product.colour_type,
        item_type=product.item_type,
        company_id=product.company_id,
        salt_id=product.salt_id,
        hsn_applicable=product.hsn_applicable,
        hsn_id=product.hsn_id,
        local_tax=product.local_tax,
        central_tax=product.central_tax,
        sgst_percent=product.sgst_percent,
        cgst_percent=product.cgst_percent,
        igst_percent=product.igst_percent,
        mrp=product.mrp,
        p_rate=product.p_rate,
        pts_rate=product.pts_rate,
        rate_a=product.rate_a,
        ptr_rate=product.ptr_rate,
        item_discount_percent=product.item_discount_percent,
        discount_type=product.discount_type,
        category=product.category
    )
    db.add(new_product)
    db.commit()
    db.refresh(new_product)
    return new_product
