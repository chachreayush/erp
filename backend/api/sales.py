from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List
from uuid import UUID

from database import get_db
import models
import schemas
from auth.router import get_current_user

# ── ROUTER SETUP ───────────────────────────────────────────────
router = APIRouter(
    prefix="/sales",
    tags=["Sales"],
    dependencies=[Depends(get_current_user)]
)

# ── GET INVOICES ───────────────────────────────────────────────
@router.get("/invoices", response_model=List[schemas.InvoiceResponse])
def get_invoices(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Fetch all invoices for the current user's organization.
    """
    invoices = db.query(models.Invoice)\
        .filter(models.Invoice.organization_id == current_user.organization_id)\
        .order_by(desc(models.Invoice.created_at))\
        .all()
    return invoices


# ── CREATE INVOICE ─────────────────────────────────────────────
@router.post("/invoices", response_model=schemas.InvoiceResponse, status_code=status.HTTP_201_CREATED)
def create_invoice(
    invoice_data: schemas.InvoiceCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Create a new invoice, save its line items, and deduct stock.
    """
    # 1. Create the parent Invoice record
    new_invoice = models.Invoice(
        organization_id=current_user.organization_id,
        invoice_number=invoice_data.invoice_number,
        customer_name=invoice_data.customer_name,
        subtotal=invoice_data.subtotal,
        tax_total=invoice_data.tax_total,
        grand_total=invoice_data.grand_total
    )
    
    db.add(new_invoice)
    db.flush() # Get the new_invoice.id before committing

    # 2. Add Invoice Items
    for item in invoice_data.items:
        new_item = models.InvoiceItem(
            invoice_id=new_invoice.id,
            product_id=item.product_id,
            product_name=item.product_name,
            quantity=item.quantity,
            rate=item.rate,
            igst_percent=item.igst_percent,
            line_total=item.line_total
        )
        db.add(new_item)

    # Commit all changes to the database
    db.commit()
    db.refresh(new_invoice)
    
    return new_invoice
