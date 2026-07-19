from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
import models, schemas
from auth.router import get_current_user

router = APIRouter(prefix="/products", tags=["Inventory"])

@router.get("/", response_model=list[schemas.ProductResponse])
def get_products(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """
    Fetch all products for the current user's company.
    """
    products = db.query(models.Product).filter(models.Product.company_id == current_user.company_id).all()
    return products

@router.post("/", response_model=schemas.ProductResponse)
def create_product(product: schemas.ProductCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """
    Create a new product for the current user's company.
    """
    new_product = models.Product(
        company_id=current_user.company_id,
        name=product.name,
        sku=product.sku,
        category=product.category,
        price=product.price,
        stock=product.stock,
        status=product.status
    )
    db.add(new_product)
    db.commit()
    db.refresh(new_product)
    return new_product
