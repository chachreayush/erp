from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload, selectinload
from sqlalchemy import desc
from typing import List, Optional
from uuid import UUID
from datetime import datetime
from decimal import Decimal
from api.finance_v2 import create_voucher, cancel_voucher, get_active_fiscal_year

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
    invoice_type: Optional[str] = Query(None),
    party_search: Optional[str] = Query(None),
    bill_no_search: Optional[str] = Query(None),
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Fetch all invoices for the current user's organization, optionally filtered by type.
    Supports pagination.
    """
    query = db.query(models.Invoice).options(
        selectinload(models.Invoice.items)
    ).filter(
        models.Invoice.organization_id == current_user.organization_id,
        models.Invoice.is_active == True
    )
    
    if invoice_type:
        query = query.filter(models.Invoice.invoice_type == invoice_type)
        
    if party_search:
        query = query.filter(models.Invoice.customer_name.ilike(f"%{party_search}%"))
        
    if bill_no_search:
        query = query.filter(models.Invoice.invoice_number.ilike(f"%{bill_no_search}%"))
        
    if from_date:
        try:
            fd = datetime.strptime(from_date, "%Y-%m-%d")
            query = query.filter(models.Invoice.date >= fd)
        except ValueError:
            pass
            
    if to_date:
        try:
            td = datetime.strptime(to_date, "%Y-%m-%d")
            # Set to end of day to include all invoices on the to_date
            td = td.replace(hour=23, minute=59, second=59)
            query = query.filter(models.Invoice.date <= td)
        except ValueError:
            pass
        
    invoices = query.order_by(desc(models.Invoice.created_at)).offset(skip).limit(limit).all()
    return invoices


@router.get("/invoices/{invoice_number}", response_model=schemas.InvoiceResponse)
def get_invoice_by_number(
    invoice_number: str,
    invoice_type: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Fetch a single invoice by its entry number, including its line items.
    """
    query = db.query(models.Invoice).filter(
        models.Invoice.organization_id == current_user.organization_id,
        models.Invoice.invoice_number == invoice_number,
        models.Invoice.is_active == True
    )
    
    if invoice_type:
        query = query.filter(models.Invoice.invoice_type == invoice_type)
        
    invoice = query.first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
        
    return invoice


def _update_stock_for_invoice(db: Session, org_id: UUID, items: list[schemas.InvoiceItemCreate], invoice_type: str):
    """Update stock from batches for invoice items."""
    is_brk = invoice_type.startswith("brk-")
    is_addition = True
    if invoice_type.startswith("sales-bill") or invoice_type.startswith("sales-challan") or invoice_type.startswith("purchase-return") or invoice_type.startswith("stock-issue") or invoice_type.startswith("brk-issue"):
        is_addition = False
    
    stock_attr = "brk_exp_stock" if is_brk else "current_stock"

    for item in items:
        if not item.product_id and item.product_name:
            prod = db.query(models.Product).filter(
                models.Product.organization_id == org_id,
                models.Product.name.ilike(item.product_name.strip())
            ).first()
            if prod:
                item.product_id = prod.id

        if not item.product_id or not item.batch:
            continue  # Skip if no product or batch specified
        
        batch = db.query(models.Batch).filter(
            models.Batch.organization_id == org_id,
            models.Batch.product_id == item.product_id,
            models.Batch.batch_number == item.batch
        ).first()
        
        if batch:
            batch_stock = getattr(batch, stock_attr)
            
            if is_addition:
                setattr(batch, stock_attr, batch_stock + item.quantity)
            else:
                setattr(batch, stock_attr, batch_stock - item.quantity)
        else:
            # Batch not found - create with negative stock (backorder) or positive if purchase
            new_batch = models.Batch(
                organization_id=org_id,
                product_id=item.product_id,
                batch_number=item.batch,
                expiry=item.expiry,
                mrp=item.mrp or 0,
                rate=item.rate,
                rate_a=item.rate,
                rate_b=0,
                rate_c=0,
                cost=0,
                current_stock=0 if is_brk else (item.quantity if is_addition else -item.quantity),
                brk_exp_stock=(item.quantity if is_addition else -item.quantity) if is_brk else 0
            )
            db.add(new_batch)

# ── ACCOUNTING AUTO-POSTING ───────────────────────────────────
def _cancel_accounting(db: Session, current_user: models.User, invoice: models.Invoice):
    org_id = current_user.organization_id
    existing_vouchers = db.query(models.Voucher).filter(
        models.Voucher.organization_id == org_id,
        models.Voucher.ref_invoice_id == invoice.id,
        models.Voucher.status == 'Active'
    ).all()
    for v in existing_vouchers:
        cancel_voucher(v.id, db, current_user)

def _auto_post_accounting(db: Session, current_user: models.User, invoice: models.Invoice):
    if invoice.invoice_type not in ["sales-bill", "purchase-bill", "sales-return", "purchase-return"]:
        return
        
    org_id = current_user.organization_id
    _cancel_accounting(db, current_user, invoice)
        
    if invoice.grand_total <= 0:
        return
        
    def get_or_create_ledger(name: str, group_name: str, op_type: str = "Dr"):
        ledger = db.query(models.Ledger).filter(
            models.Ledger.organization_id == org_id,
            models.Ledger.name.ilike(name.strip())
        ).first()
        if not ledger:
            ledger = models.Ledger(
                organization_id=org_id,
                name=name.strip(),
                group_name=group_name,
                opening_balance=0,
                op_type=op_type,
                closing_balance=0,
                cl_type=op_type,
                is_active=True
            )
            db.add(ledger)
            db.flush()
        return ledger
        
    entries = []
    party_group = "Sundry Debtors" if "sales" in invoice.invoice_type else "Sundry Creditors"
    party_ledger = get_or_create_ledger(invoice.customer_name, party_group)
    
    if invoice.invoice_type == "sales-bill":
        sales_ledger = get_or_create_ledger("Sales Account", "Sales Accounts", "Cr")
        entries = [
            {"ledger_id": str(party_ledger.id), "cr_dr": "Dr", "amount": Decimal(str(invoice.grand_total))},
            {"ledger_id": str(sales_ledger.id), "cr_dr": "Cr", "amount": Decimal(str(invoice.grand_total))}
        ]
        v_type = "Journal"
    elif invoice.invoice_type == "purchase-bill":
        purchase_ledger = get_or_create_ledger("Purchase Account", "Purchase Accounts", "Dr")
        entries = [
            {"ledger_id": str(purchase_ledger.id), "cr_dr": "Dr", "amount": Decimal(str(invoice.grand_total))},
            {"ledger_id": str(party_ledger.id), "cr_dr": "Cr", "amount": Decimal(str(invoice.grand_total))}
        ]
        v_type = "Journal"
    elif invoice.invoice_type == "sales-return":
        sales_ret_ledger = get_or_create_ledger("Sales Return", "Sales Accounts", "Dr")
        entries = [
            {"ledger_id": str(sales_ret_ledger.id), "cr_dr": "Dr", "amount": Decimal(str(invoice.grand_total))},
            {"ledger_id": str(party_ledger.id), "cr_dr": "Cr", "amount": Decimal(str(invoice.grand_total))}
        ]
        v_type = "Journal"
    elif invoice.invoice_type == "purchase-return":
        purch_ret_ledger = get_or_create_ledger("Purchase Return", "Purchase Accounts", "Cr")
        entries = [
            {"ledger_id": str(party_ledger.id), "cr_dr": "Dr", "amount": Decimal(str(invoice.grand_total))},
            {"ledger_id": str(purch_ret_ledger.id), "cr_dr": "Cr", "amount": Decimal(str(invoice.grand_total))}
        ]
        v_type = "Journal"
        
    if entries:
        fy = get_active_fiscal_year(db, org_id)
        if not fy: return
            
        voucher_payload = schemas.VoucherCreate(
            voucher_type=v_type,
            date=invoice.date.strftime("%Y-%m-%d"),
            narration=f"Auto-generated for {invoice.invoice_type} {invoice.invoice_number}",
            total_amount=Decimal(str(invoice.grand_total)),
            fiscal_year_id=fy.id,
            ref_invoice_id=invoice.id,
            entries=entries
        )
        try:
            create_voucher(voucher_payload, db, current_user)
        except Exception as e:
            print(f"Error auto-posting: {e}")

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
    org_id = current_user.organization_id
    
    # Check if invoice already exists to perform UPSERT (modify-bill logic)
    existing_invoice = db.query(models.Invoice).filter(
        models.Invoice.organization_id == org_id,
        models.Invoice.invoice_type == invoice_data.invoice_type,
        models.Invoice.invoice_number == invoice_data.invoice_number,
        models.Invoice.is_active == True
    ).first()
    
    if existing_invoice:
        return update_invoice(existing_invoice.id, invoice_data, db, current_user)
    
    # 1. Create the parent Invoice record with ALL fields
    new_invoice = models.Invoice(
        organization_id=org_id,
        invoice_type=invoice_data.invoice_type,
        invoice_number=invoice_data.invoice_number,
        date=datetime.utcnow(),  # Set current timestamp
        customer_name=invoice_data.customer_name,
        
        # Advanced ERP fields
        party_inv_no=invoice_data.party_inv_no,
        party_inv_date=invoice_data.party_inv_date,
        due_date=invoice_data.due_date,
        remarks=invoice_data.remarks,
        dispatch_through=invoice_data.dispatch_through,
        destination=invoice_data.destination,
        bill_discount=invoice_data.bill_discount,
        
        ledger1_name=invoice_data.ledger1_name,
        ledger1_amt=invoice_data.ledger1_amt,
        ledger2_name=invoice_data.ledger2_name,
        ledger2_amt=invoice_data.ledger2_amt,
        ledger3_name=invoice_data.ledger3_name,
        ledger3_amt=invoice_data.ledger3_amt,
        
        # Financials
        subtotal=invoice_data.subtotal,
        tax_total=invoice_data.tax_total,
        grand_total=invoice_data.grand_total
    )
    
    db.add(new_invoice)
    db.flush()  # Get the new_invoice.id before committing

    # 2. Add Invoice Items with ALL fields
    for item in invoice_data.items:
        if not item.product_id and item.product_name:
            prod = db.query(models.Product).filter(
                models.Product.organization_id == org_id,
                models.Product.name.ilike(item.product_name.strip())
            ).first()
            if prod:
                item.product_id = prod.id

        new_item = models.InvoiceItem(
            invoice_id=new_invoice.id,
            product_id=item.product_id,
            product_name=item.product_name,
            quantity=item.quantity,
            rate=item.rate,
            igst_percent=item.igst_percent,
            line_total=item.line_total,
            
            # Advanced ERP fields
            batch=item.batch,
            expiry=item.expiry,
            mrp=item.mrp,
            discount_percent=item.discount_percent,
            margin_percent=item.margin_percent
        )
        db.add(new_item)

    # 3. Update stock from batches
    _update_stock_for_invoice(db, org_id, invoice_data.items, invoice_type=invoice_data.invoice_type)

    # Commit all changes to the database
    db.commit()
    db.refresh(new_invoice)
    
    # Auto-post to accounting
    _auto_post_accounting(db, current_user, new_invoice)
    
    return new_invoice

@router.put("/invoices/{invoice_id}", response_model=schemas.InvoiceResponse)
def update_invoice(
    invoice_id: UUID,
    invoice_data: schemas.InvoiceCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Update an existing invoice (recalculates stock changes).
    """
    org_id = current_user.organization_id
    
    db_invoice = db.query(models.Invoice).filter(
        models.Invoice.id == invoice_id,
        models.Invoice.organization_id == org_id
    ).first()
    
    if not db_invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    # Restore stock from old items before updating
    old_items = db.query(models.InvoiceItem).filter(
        models.InvoiceItem.invoice_id == invoice_id
    ).all()
    
    is_brk_old = db_invoice.invoice_type.startswith("brk-")
    is_addition_old = True
    if db_invoice.invoice_type.startswith("sales-bill") or db_invoice.invoice_type.startswith("sales-challan") or db_invoice.invoice_type.startswith("purchase-return") or db_invoice.invoice_type.startswith("stock-issue") or db_invoice.invoice_type.startswith("brk-issue"):
        is_addition_old = False
    
    # Revert means flip the sign
    is_addition_old = not is_addition_old
    stock_attr_old = "brk_exp_stock" if is_brk_old else "current_stock"
    
    for old_item in old_items:
        if old_item.product_id and old_item.batch:
            batch = db.query(models.Batch).filter(
                models.Batch.organization_id == org_id,
                models.Batch.product_id == old_item.product_id,
                models.Batch.batch_number == old_item.batch
            ).first()
            if batch:
                batch_stock = getattr(batch, stock_attr_old)
                if is_addition_old:
                    setattr(batch, stock_attr_old, batch_stock + old_item.quantity)
                else:
                    setattr(batch, stock_attr_old, batch_stock - old_item.quantity)
    
    # Delete old items
    for old_item in old_items:
        db.delete(old_item)
    
    # Update invoice fields
    update_data = invoice_data.model_dump(exclude={"items"})
    for key, value in update_data.items():
        setattr(db_invoice, key, value)
    
    db.flush()
    
    # Add new items
    for item in invoice_data.items:
        if not item.product_id and item.product_name:
            prod = db.query(models.Product).filter(
                models.Product.organization_id == org_id,
                models.Product.name.ilike(item.product_name.strip())
            ).first()
            if prod:
                item.product_id = prod.id

        new_item = models.InvoiceItem(
            invoice_id=db_invoice.id,
            product_id=item.product_id,
            product_name=item.product_name,
            quantity=item.quantity,
            rate=item.rate,
            igst_percent=item.igst_percent,
            line_total=item.line_total,
            batch=item.batch,
            expiry=item.expiry,
            mrp=item.mrp,
            discount_percent=item.discount_percent,
            margin_percent=item.margin_percent
        )
        db.add(new_item)
    
    # Update stock for new items
    _update_stock_for_invoice(db, org_id, invoice_data.items, invoice_type=invoice_data.invoice_type)
    
    db.commit()
    db.refresh(db_invoice)
    
    # Auto-post to accounting
    _auto_post_accounting(db, current_user, db_invoice)
    
    return db_invoice

@router.delete("/invoices/{invoice_id}")
def delete_invoice(
    invoice_id: UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Soft delete an invoice and restore stock.
    """
    org_id = current_user.organization_id
    
    db_invoice = db.query(models.Invoice).filter(
        models.Invoice.id == invoice_id,
        models.Invoice.organization_id == org_id
    ).first()
    
    if not db_invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    # Restore stock from items
    items = db.query(models.InvoiceItem).filter(
        models.InvoiceItem.invoice_id == invoice_id
    ).all()
    
    is_brk_old = db_invoice.invoice_type.startswith("brk-")
    is_addition_old = True
    if db_invoice.invoice_type.startswith("sales-bill") or db_invoice.invoice_type.startswith("sales-challan") or db_invoice.invoice_type.startswith("purchase-return") or db_invoice.invoice_type.startswith("stock-issue") or db_invoice.invoice_type.startswith("brk-issue"):
        is_addition_old = False
        
    is_addition_old = not is_addition_old
    stock_attr_old = "brk_exp_stock" if is_brk_old else "current_stock"
    
    for item in items:
        if item.product_id and item.batch:
            batch = db.query(models.Batch).filter(
                models.Batch.organization_id == org_id,
                models.Batch.product_id == item.product_id,
                models.Batch.batch_number == item.batch
            ).first()
            if batch:
                batch_stock = getattr(batch, stock_attr_old)
                if is_addition_old:
                    setattr(batch, stock_attr_old, batch_stock + item.quantity)
                else:
                    setattr(batch, stock_attr_old, batch_stock - item.quantity)
    
    # Soft delete
    db_invoice.is_active = False
    
    # Cancel accounting voucher
    _cancel_accounting(db, current_user, db_invoice)
    
    db.commit()
    return {"message": "Invoice deleted successfully, stock restored"}



@router.post("/invoices/{invoice_id}/cancel")
def cancel_invoice(
    invoice_id: UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    SAP-Style Cancel (Reversal):
    Instead of deleting, this creates a new REVERSAL document with negative values.
    This restores stock exactly the opposite way it was deducted and creates a perfect audit trail.
    """
    org_id = current_user.organization_id
    
    original = db.query(models.Invoice).options(selectinload(models.Invoice.items)).filter(
        models.Invoice.id == invoice_id,
        models.Invoice.organization_id == org_id,
        models.Invoice.is_active == True
    ).first()
    
    if not original:
        raise HTTPException(status_code=404, detail="Invoice not found or already deleted.")
        
    rev_number = f"REV-{original.invoice_number}"
    existing_rev = db.query(models.Invoice).filter(
        models.Invoice.organization_id == org_id,
        models.Invoice.invoice_number == rev_number
    ).first()
    
    if existing_rev:
        raise HTTPException(status_code=400, detail="Invoice is already cancelled/reversed.")

    # 1. Create the Reversal Invoice
    reversal = models.Invoice(
        organization_id=org_id,
        invoice_type=original.invoice_type,
        invoice_number=rev_number,
        date=datetime.utcnow(),
        customer_name=original.customer_name,
        party_inv_no=original.party_inv_no,
        party_inv_date=original.party_inv_date,
        due_date=original.due_date,
        remarks=f"REVERSAL of {original.invoice_number}",
        dispatch_through=original.dispatch_through,
        destination=original.destination,
        bill_discount=-original.bill_discount if original.bill_discount else 0,
        
        ledger1_name=original.ledger1_name,
        ledger1_amt=-original.ledger1_amt if original.ledger1_amt else 0,
        ledger2_name=original.ledger2_name,
        ledger2_amt=-original.ledger2_amt if original.ledger2_amt else 0,
        ledger3_name=original.ledger3_name,
        ledger3_amt=-original.ledger3_amt if original.ledger3_amt else 0,
        
        subtotal=-original.subtotal,
        tax_total=-original.tax_total,
        grand_total=-original.grand_total,
        is_active=True
    )
    
    db.add(reversal)
    db.flush()
    
    stock_items_for_reversal = []
    
    for item in original.items:
        rev_item = models.InvoiceItem(
            invoice_id=reversal.id,
            product_id=item.product_id,
            product_name=item.product_name,
            quantity=-item.quantity, 
            rate=item.rate,
            batch=item.batch,
            expiry=item.expiry,
            mrp=item.mrp,
            discount_percent=item.discount_percent,
            margin_percent=item.margin_percent,
            igst_percent=item.igst_percent,
            line_total=-item.line_total
        )
        db.add(rev_item)
        
        stock_items_for_reversal.append(schemas.InvoiceItemCreate(
            product_id=item.product_id,
            product_name=item.product_name,
            quantity=-item.quantity, 
            rate=item.rate,
            batch=item.batch,
            expiry=item.expiry,
            mrp=item.mrp,
            discount_percent=item.discount_percent,
            margin_percent=item.margin_percent,
            igst_percent=item.igst_percent,
            line_total=-item.line_total
        ))
        
    # 3. Update stock (Passing negative quantities effectively reverses the original stock action)
    _update_stock_for_invoice(db, org_id, stock_items_for_reversal, reversal.invoice_type)
    
    # 4. Mark original as cancelled in remarks
    original.remarks = f"CANCELLED. Reversed by {rev_number}"
    
    # Cancel the accounting voucher for the original invoice
    _cancel_accounting(db, current_user, original)
    
    db.commit()
    
    print("Added successfully!")
