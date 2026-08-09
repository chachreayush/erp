from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List
from uuid import UUID

from database import get_db
import models
import schemas
from auth.router import get_current_user

router = APIRouter(
    prefix="/purchases",
    tags=["Purchases"],
    dependencies=[Depends(get_current_user)]
)

@router.get("/invoices", response_model=List[schemas.InvoiceResponse])
def get_purchase_invoices(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    """
    Retrieve all purchase invoices for the current user's organization.
    """
    org_id = current_user.organization_id
    if not org_id:
        raise HTTPException(status_code=403, detail="User does not belong to an organization")
        
    invoices = db.query(models.Invoice).filter(
        models.Invoice.organization_id == org_id,
        models.Invoice.invoice_type == "purchase"
    ).order_by(desc(models.Invoice.created_at)).offset(skip).limit(limit).all()
    
    return invoices

@router.post("/invoices", response_model=schemas.InvoiceResponse, status_code=status.HTTP_201_CREATED)
def create_purchase_invoice(
    invoice_data: schemas.InvoiceCreate, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    """
    Create a new purchase invoice (bill) and its line items.
    """
    org_id = current_user.organization_id
    if not org_id:
        raise HTTPException(status_code=403, detail="User does not belong to an organization")
    
    # 1. Create the parent Invoice
    new_invoice = models.Invoice(
        organization_id=org_id,
        invoice_type="purchase", # Force purchase type
        invoice_number=invoice_data.invoice_number,
        party_invoice_number=invoice_data.party_invoice_number,
        customer_name=invoice_data.customer_name, # In purchase context, this is the supplier/party
        subtotal=invoice_data.subtotal,
        bill_discount=invoice_data.bill_discount,
        tax_total=invoice_data.tax_total,
        grand_total=invoice_data.grand_total,
        ledger1_name=invoice_data.ledger1_name,
        ledger1_amount=invoice_data.ledger1_amount,
        ledger2_name=invoice_data.ledger2_name,
        ledger2_amount=invoice_data.ledger2_amount,
        ledger3_name=invoice_data.ledger3_name,
        ledger3_amount=invoice_data.ledger3_amount
    )
    
    db.add(new_invoice)
    db.flush() # flush to get the UUID generated for new_invoice
    
    # 2. Create the child InvoiceItems
    for item_data in invoice_data.items:
        new_item = models.InvoiceItem(
            invoice_id=new_invoice.id,
            product_id=item_data.product_id,
            product_name=item_data.product_name,
            pack=item_data.pack,
            batch=item_data.batch,
            expiry=item_data.expiry,
            quantity=item_data.quantity,
            free_quantity=item_data.free_quantity,
            rate=item_data.rate,
            discount_percent=item_data.discount_percent,
            mrp=item_data.mrp,
            cgst_percent=item_data.cgst_percent,
            sgst_percent=item_data.sgst_percent,
            igst_percent=item_data.igst_percent,
            rate_a=item_data.rate_a,
            rate_b=item_data.rate_b,
            rate_c=item_data.rate_c,
            cost=item_data.cost,
            hsn=item_data.hsn,
            line_total=item_data.line_total
        )
        db.add(new_item)
        
        # 3. Sync with Batch Master
        if item_data.product_id and item_data.batch:
            batch_record = db.query(models.Batch).filter(
                models.Batch.product_id == item_data.product_id,
                models.Batch.batch_number == item_data.batch,
                models.Batch.organization_id == org_id
            ).first()
            
            if batch_record:
                # Update existing batch stock
                batch_record.current_stock += item_data.quantity + item_data.free_quantity
                # Optionally update rates if they changed, but usually batch details are static or updated manually
                batch_record.rate = item_data.rate
                batch_record.mrp = item_data.mrp
                batch_record.expiry = item_data.expiry
                batch_record.cost = item_data.cost
                batch_record.rate_a = item_data.rate_a
                batch_record.rate_b = item_data.rate_b
                batch_record.rate_c = item_data.rate_c
            else:
                # Create a new batch
                new_batch = models.Batch(
                    organization_id=org_id,
                    product_id=item_data.product_id,
                    batch_number=item_data.batch,
                    expiry=item_data.expiry,
                    mrp=item_data.mrp,
                    rate=item_data.rate,
                    rate_a=item_data.rate_a,
                    rate_b=item_data.rate_b,
                    rate_c=item_data.rate_c,
                    cost=item_data.cost,
                    current_stock=item_data.quantity + item_data.free_quantity
                )
                db.add(new_batch)
        
    db.commit()
    db.refresh(new_invoice)
    
    return new_invoice
