# =====================================================================
# DOC-46: Goods Receipt Note (GRN), Physical Quality Inspection
# & Barcode Inward Verification Desk API Router
# =====================================================================

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime, timedelta
from decimal import Decimal
import uuid

import models
import schemas
from database import get_db
from auth.router import get_current_user

router = APIRouter(tags=["Goods Receipt Note"])


# ── Telemetry Scorecards Endpoint ─────────────────────────────────────────────

@router.get("/telemetry")
def get_grn_telemetry(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    org_id = current_user.organization_id
    
    total_grns = db.query(func.count(models.GoodsReceiptNote.id)).filter(
        models.GoodsReceiptNote.organization_id == org_id
    ).scalar() or 0

    pending_inspection = db.query(func.count(models.GoodsReceiptNote.id)).filter(
        models.GoodsReceiptNote.organization_id == org_id,
        models.GoodsReceiptNote.inspection_status == "PENDING_INSPECTION"
    ).scalar() or 0

    inspected_accepted = db.query(func.count(models.GoodsReceiptNote.id)).filter(
        models.GoodsReceiptNote.organization_id == org_id,
        models.GoodsReceiptNote.inspection_status.in_(["ACCEPTED", "PARTIAL_ACCEPT"])
    ).scalar() or 0

    converted_to_purchase = db.query(func.count(models.GoodsReceiptNote.id)).filter(
        models.GoodsReceiptNote.organization_id == org_id,
        models.GoodsReceiptNote.status == "CONVERTED_TO_PURCHASE"
    ).scalar() or 0

    # Sum of damaged / quarantined quantity across items
    total_damaged_qty = db.query(func.sum(models.GoodsReceiptNoteItem.damaged_qty)).join(
        models.GoodsReceiptNote, models.GoodsReceiptNoteItem.grn_id == models.GoodsReceiptNote.id
    ).filter(
        models.GoodsReceiptNote.organization_id == org_id
    ).scalar() or 0

    # Total inward value
    total_inward_value = db.query(func.sum(models.GoodsReceiptNote.total_received_amount)).filter(
        models.GoodsReceiptNote.organization_id == org_id
    ).scalar() or Decimal("0.00")

    return {
        "total_grns": total_grns,
        "pending_inspection": pending_inspection,
        "inspected_accepted": inspected_accepted,
        "converted_to_purchase": converted_to_purchase,
        "total_damaged_qty": int(total_damaged_qty),
        "total_inward_value": float(total_inward_value)
    }


def get_vendor_display_name(vendor: Optional[models.Party]) -> str:
    if not vendor:
        return "Unknown Vendor"
    return vendor.legal_name or vendor.trade_name or "Vendor"


# ── Pending Purchase Orders for Gate Inward Matching ─────────────────────────

@router.get("/pending-orders")
def get_pending_purchase_orders(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    org_id = current_user.organization_id
    pos = db.query(models.PurchaseOrder).filter(
        models.PurchaseOrder.organization_id == org_id,
        models.PurchaseOrder.status.in_(["APPROVED", "PARTIAL", "DRAFT"])
    ).order_by(models.PurchaseOrder.date.desc()).all()

    results = []
    for po in pos:
        vendor_name = get_vendor_display_name(po.vendor)
        items = [
            {
                "id": str(item.id),
                "product_id": str(item.product_id) if item.product_id else None,
                "product_name": item.product_name,
                "ordered_qty": item.quantity,
                "received_qty": item.received_qty,
                "pending_qty": max(0, item.quantity - item.received_qty),
                "rate": float(item.rate),
                "line_total": float(item.line_total)
            }
            for item in po.items
        ]
        results.append({
            "id": str(po.id),
            "po_number": po.po_number,
            "date": po.date.isoformat() if po.date else None,
            "vendor_id": str(po.vendor_id),
            "vendor_name": vendor_name,
            "status": po.status,
            "total_amount": float(po.total_amount),
            "supply_classification": po.supply_classification,
            "items": items
        })
    return results


# ── GRN Master Register (List & Filter) ───────────────────────────────────────

@router.get("/", response_model=List[schemas.GoodsReceiptNoteResponse])
def get_goods_receipt_notes(
    vendor_id: Optional[uuid.UUID] = None,
    status: Optional[str] = None,
    inspection_status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    org_id = current_user.organization_id
    query = db.query(models.GoodsReceiptNote).filter(
        models.GoodsReceiptNote.organization_id == org_id
    )

    if vendor_id:
        query = query.filter(models.GoodsReceiptNote.vendor_id == vendor_id)
    if status:
        query = query.filter(models.GoodsReceiptNote.status == status)
    if inspection_status:
        query = query.filter(models.GoodsReceiptNote.inspection_status == inspection_status)

    grns = query.order_by(models.GoodsReceiptNote.date.desc()).all()

    for grn in grns:
        if grn.vendor:
            grn.vendor_name = get_vendor_display_name(grn.vendor)
        if grn.purchase_order:
            grn.po_number = grn.purchase_order.po_number

    return grns


# ── Single GRN Details ────────────────────────────────────────────────────────

@router.get("/{grn_id}", response_model=schemas.GoodsReceiptNoteResponse)
def get_goods_receipt_note(
    grn_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    grn = db.query(models.GoodsReceiptNote).filter(
        models.GoodsReceiptNote.id == grn_id,
        models.GoodsReceiptNote.organization_id == current_user.organization_id
    ).first()

    if not grn:
        raise HTTPException(status_code=404, detail="Goods Receipt Note not found")

    if grn.vendor:
        grn.vendor_name = get_vendor_display_name(grn.vendor)
    if grn.purchase_order:
        grn.po_number = grn.purchase_order.po_number

    return grn


# ── Create Goods Receipt Note (Gate Entry & PO Inward) ───────────────────────

@router.post("/", response_model=schemas.GoodsReceiptNoteResponse)
def create_goods_receipt_note(
    grn_in: schemas.GoodsReceiptNoteCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    org_id = current_user.organization_id

    # Auto-generate GRN number if placeholder or not given
    grn_number = grn_in.grn_number
    if not grn_number or grn_number == "AUTO":
        count = db.query(func.count(models.GoodsReceiptNote.id)).filter(
            models.GoodsReceiptNote.organization_id == org_id
        ).scalar() or 0
        now = datetime.utcnow()
        grn_number = f"GRN-{now.strftime('%Y%m')}-{count + 1:04d}"

    # Calculate item details & totals
    total_received_amount = Decimal("0.00")
    items_to_create = []

    for item in grn_in.items:
        challan_qty = item.challan_qty
        received_qty = item.received_qty
        # Short quantity = challan - received
        short_qty = max(0, challan_qty - received_qty)
        # Default accepted = received until physical QC inspection
        accepted_qty = item.accepted_qty if item.accepted_qty > 0 else received_qty
        damaged_qty = item.damaged_qty
        
        # Line total = accepted_qty * purchase_rate
        line_total = Decimal(str(accepted_qty)) * Decimal(str(item.purchase_rate))
        total_received_amount += line_total

        items_to_create.append(
            models.GoodsReceiptNoteItem(
                po_item_id=item.po_item_id,
                product_id=item.product_id,
                product_name=item.product_name,
                ordered_qty=item.ordered_qty,
                challan_qty=challan_qty,
                received_qty=received_qty,
                accepted_qty=accepted_qty,
                damaged_qty=damaged_qty,
                short_qty=short_qty,
                batch_number=item.batch_number or f"BATCH-{uuid.uuid4().hex[:6].upper()}",
                expiry_date=item.expiry_date or "12/28",
                mrp=item.mrp,
                purchase_rate=item.purchase_rate,
                line_total=line_total,
                quality_remarks=item.quality_remarks or "Gate inward recorded"
            )
        )

    db_grn = models.GoodsReceiptNote(
        organization_id=org_id,
        grn_number=grn_number,
        date=grn_in.date or datetime.utcnow(),
        po_id=grn_in.po_id,
        vendor_id=grn_in.vendor_id,
        challan_number=grn_in.challan_number,
        challan_date=grn_in.challan_date,
        gate_entry_number=grn_in.gate_entry_number,
        vehicle_number=grn_in.vehicle_number,
        received_by=grn_in.received_by or current_user.name,
        temperature_celsius=grn_in.temperature_celsius,
        seal_intact=grn_in.seal_intact,
        inspection_status="PENDING_INSPECTION",
        status="DRAFT",
        total_received_amount=total_received_amount,
        remarks=grn_in.remarks,
        items=items_to_create
    )

    db.add(db_grn)

    # If linked to a PO, update PO item received_qty and PO status
    if grn_in.po_id:
        po = db.query(models.PurchaseOrder).filter(
            models.PurchaseOrder.id == grn_in.po_id,
            models.PurchaseOrder.organization_id == org_id
        ).first()
        if po:
            all_fulfilled = True
            for grn_item in items_to_create:
                if grn_item.po_item_id:
                    po_item = db.query(models.PurchaseOrderItem).filter(
                        models.PurchaseOrderItem.id == grn_item.po_item_id
                    ).first()
                    if po_item:
                        po_item.received_qty += grn_item.received_qty
                        if po_item.received_qty < po_item.quantity:
                            all_fulfilled = False
            po.status = "COMPLETED" if all_fulfilled else "PARTIAL"

    db.commit()
    db.refresh(db_grn)

    if db_grn.vendor:
        db_grn.vendor_name = get_vendor_display_name(db_grn.vendor)
    if db_grn.purchase_order:
        db_grn.po_number = db_grn.purchase_order.po_number

    return db_grn


# ── Physical Quality Inspection & Cold-Chain Verification ────────────────────

@router.patch("/{grn_id}/inspection", response_model=schemas.GoodsReceiptNoteResponse)
def update_grn_inspection(
    grn_id: uuid.UUID,
    inspection: schemas.GRNInspectionUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    org_id = current_user.organization_id
    grn = db.query(models.GoodsReceiptNote).filter(
        models.GoodsReceiptNote.id == grn_id,
        models.GoodsReceiptNote.organization_id == org_id
    ).first()

    if not grn:
        raise HTTPException(status_code=404, detail="Goods Receipt Note not found")

    if grn.status == "CONVERTED_TO_PURCHASE":
        raise HTTPException(status_code=400, detail="Cannot alter inspection on an already converted GRN")

    # Update cold-chain & tamper evidence
    if inspection.temperature_celsius is not None:
        grn.temperature_celsius = inspection.temperature_celsius
    if inspection.seal_intact is not None:
        grn.seal_intact = inspection.seal_intact
    if inspection.inspection_status:
        grn.inspection_status = inspection.inspection_status
    if inspection.remarks:
        grn.remarks = inspection.remarks

    # Update item level QC quantities and batch info
    total_amount = Decimal("0.00")
    for item_update in inspection.items:
        db_item = db.query(models.GoodsReceiptNoteItem).filter(
            models.GoodsReceiptNoteItem.id == item_update.item_id,
            models.GoodsReceiptNoteItem.grn_id == grn.id
        ).first()
        if db_item:
            db_item.accepted_qty = item_update.accepted_qty
            db_item.damaged_qty = item_update.damaged_qty
            db_item.short_qty = item_update.short_qty
            if item_update.batch_number:
                db_item.batch_number = item_update.batch_number
            if item_update.expiry_date:
                db_item.expiry_date = item_update.expiry_date
            if item_update.mrp is not None:
                db_item.mrp = item_update.mrp
            if item_update.purchase_rate is not None:
                db_item.purchase_rate = item_update.purchase_rate
            if item_update.quality_remarks:
                db_item.quality_remarks = item_update.quality_remarks
            
            # Recalculate line total based on accepted qty
            db_item.line_total = Decimal(str(db_item.accepted_qty)) * Decimal(str(db_item.purchase_rate))
            total_amount += db_item.line_total
        else:
            # Item not in update list, add existing line total
            pass

    # Sum total amount across all items
    grn.total_received_amount = sum(
        (Decimal(str(it.accepted_qty)) * Decimal(str(it.purchase_rate))) for it in grn.items
    )
    grn.status = "VERIFIED"

    db.commit()
    db.refresh(grn)

    if grn.vendor:
        grn.vendor_name = get_vendor_display_name(grn.vendor)
    if grn.purchase_order:
        grn.po_number = grn.purchase_order.po_number

    return grn


# ── Convert Verified GRN to Purchase Bill (General Ledger & Stock Inward) ────

@router.post("/{grn_id}/convert-to-purchase")
def convert_grn_to_purchase(
    grn_id: uuid.UUID,
    payload: schemas.GRNConvertToPurchaseRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    org_id = current_user.organization_id
    grn = db.query(models.GoodsReceiptNote).filter(
        models.GoodsReceiptNote.id == grn_id,
        models.GoodsReceiptNote.organization_id == org_id
    ).first()

    if not grn:
        raise HTTPException(status_code=404, detail="Goods Receipt Note not found")

    if grn.status == "CONVERTED_TO_PURCHASE":
        raise HTTPException(status_code=400, detail="GRN has already been converted to a purchase bill")

    vendor = db.query(models.Party).filter(
        models.Party.id == grn.vendor_id,
        models.Party.organization_id == org_id
    ).first()

    vendor_name = get_vendor_display_name(vendor)

    # Compute financials
    subtotal = Decimal("0.00")
    invoice_items = []

    for item in grn.items:
        if item.accepted_qty <= 0:
            continue

        line_sub = Decimal(str(item.accepted_qty)) * Decimal(str(item.purchase_rate))
        subtotal += line_sub

        invoice_items.append(
            models.InvoiceItem(
                product_id=item.product_id,
                product_name=item.product_name,
                quantity=item.accepted_qty,
                rate=item.purchase_rate,
                batch=item.batch_number or "GENERIC",
                expiry=item.expiry_date or "12/28",
                mrp=item.mrp,
                igst_percent=payload.tax_rate,
                line_total=line_sub
            )
        )

        # Batch Stock Inward Update
        if item.product_id:
            batch = db.query(models.Batch).filter(
                models.Batch.organization_id == org_id,
                models.Batch.product_id == item.product_id,
                models.Batch.batch_number == (item.batch_number or "GENERIC")
            ).first()

            if not batch:
                batch = models.Batch(
                    organization_id=org_id,
                    product_id=item.product_id,
                    batch_number=item.batch_number or f"BATCH-{uuid.uuid4().hex[:6].upper()}",
                    expiry_date=item.expiry_date or "12/28",
                    mrp=item.mrp or Decimal("0.00"),
                    rate=item.purchase_rate or Decimal("0.00"),
                    current_stock=item.accepted_qty,
                    brk_exp_stock=item.damaged_qty
                )
                db.add(batch)
            else:
                batch.current_stock += item.accepted_qty
                if item.damaged_qty > 0:
                    batch.brk_exp_stock += item.damaged_qty

    tax_total = (subtotal * payload.tax_rate) / Decimal("100.00")
    grand_total = subtotal + tax_total

    # Generate Invoice Number
    now = datetime.utcnow()
    invoice_number = payload.invoice_number
    if not invoice_number:
        count = db.query(func.count(models.Invoice.id)).filter(
            models.Invoice.organization_id == org_id,
            models.Invoice.invoice_type == "PURCHASE"
        ).scalar() or 0
        invoice_number = f"PUR-{now.strftime('%Y%m')}-{count + 1:04d}"

    due_date = (now + timedelta(days=payload.payment_terms_days)).strftime("%Y-%m-%d")

    purchase_invoice = models.Invoice(
        organization_id=org_id,
        invoice_type="PURCHASE",
        invoice_number=invoice_number,
        date=payload.invoice_date or now,
        customer_name=vendor_name,
        party_id=grn.vendor_id,
        party_inv_no=grn.challan_number,
        party_inv_date=grn.challan_date.strftime("%Y-%m-%d") if grn.challan_date else None,
        due_date=due_date,
        subtotal=subtotal,
        tax_total=tax_total,
        grand_total=grand_total,
        remarks=f"Inward Purchase generated against GRN #{grn.grn_number}. Gate Entry: {grn.gate_entry_number or 'N/A'}",
        items=invoice_items
    )

    db.add(purchase_invoice)

    # Mark GRN as CONVERTED_TO_PURCHASE
    grn.status = "CONVERTED_TO_PURCHASE"

    db.commit()
    db.refresh(purchase_invoice)

    return {
        "success": True,
        "message": f"Successfully converted GRN #{grn.grn_number} to Purchase Bill #{purchase_invoice.invoice_number}",
        "invoice_id": str(purchase_invoice.id),
        "invoice_number": purchase_invoice.invoice_number,
        "grn_number": grn.grn_number,
        "grand_total": float(grand_total),
        "items_inwarded": len(invoice_items)
    }
