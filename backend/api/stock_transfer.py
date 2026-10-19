# =====================================================================
# DOC-47: Multi-Branch & Inter-Depot Stock Transfer Order (STO),
# In-Transit Telemetry & Hub Receiving Desk API Router
# =====================================================================

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import List, Optional
from datetime import datetime, date, timedelta
from decimal import Decimal
import uuid

import models
import schemas
from database import get_db
from auth.router import get_current_user

router = APIRouter(tags=["Stock Transfer"])


# ── Helper: Generate STO Series Number ───────────────────────────────────────

def generate_sto_number(db: Session, org_id: uuid.UUID) -> str:
    now = datetime.utcnow()
    prefix = f"STO-{now.strftime('%Y%m')}-"
    last_sto = db.query(models.StockTransferOrder).filter(
        models.StockTransferOrder.organization_id == org_id,
        models.StockTransferOrder.order_number.like(f"{prefix}%")
    ).order_by(desc(models.StockTransferOrder.created_at)).first()

    if last_sto and last_sto.order_number:
        try:
            last_seq = int(last_sto.order_number.split("-")[-1])
            seq = last_seq + 1
        except Exception:
            seq = 1
    else:
        seq = 1
    return f"{prefix}{seq:04d}"


def generate_std_challan_number(db: Session, org_id: uuid.UUID) -> str:
    now = datetime.utcnow()
    prefix = f"STD-{now.strftime('%Y%m')}-"
    last_std = db.query(models.StockTransferOrder).filter(
        models.StockTransferOrder.organization_id == org_id,
        models.StockTransferOrder.challan_number.like(f"{prefix}%")
    ).order_by(desc(models.StockTransferOrder.dispatch_date)).first()

    if last_std and last_std.challan_number:
        try:
            last_seq = int(last_std.challan_number.split("-")[-1])
            seq = last_seq + 1
        except Exception:
            seq = 1
    else:
        seq = 1
    return f"{prefix}{seq:04d}"


# ── Telemetry Scorecards Endpoint ─────────────────────────────────────────────

@router.get("/telemetry")
def get_stock_transfer_telemetry(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    org_id = current_user.organization_id
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)

    # 1. Active In-Transit Consignments
    active_transit_count = db.query(func.count(models.StockTransferOrder.id)).filter(
        models.StockTransferOrder.organization_id == org_id,
        models.StockTransferOrder.status == "IN_TRANSIT"
    ).scalar() or 0

    # 2. In-Transit Stock Valuation (INR)
    active_transit_value = db.query(func.sum(models.StockTransferOrder.total_transfer_value)).filter(
        models.StockTransferOrder.organization_id == org_id,
        models.StockTransferOrder.status == "IN_TRANSIT"
    ).scalar() or Decimal("0.00")

    # 3. Pending Requisitions (Awaiting Outward Dispatch)
    pending_requisitions = db.query(func.count(models.StockTransferOrder.id)).filter(
        models.StockTransferOrder.organization_id == org_id,
        models.StockTransferOrder.status.in_(["DRAFT", "APPROVED"])
    ).scalar() or 0

    # 4. Acknowledged Today
    acknowledged_today = db.query(func.count(models.StockTransferOrder.id)).filter(
        models.StockTransferOrder.organization_id == org_id,
        models.StockTransferOrder.status == "COMPLETED",
        models.StockTransferOrder.received_date >= today_start
    ).scalar() or 0

    # 5. Total Transit Loss / Variance Units
    total_transit_variance_units = db.query(func.sum(models.StockTransferOrder.total_transit_loss_qty)).filter(
        models.StockTransferOrder.organization_id == org_id
    ).scalar() or Decimal("0.00")

    return {
        "active_transit_count": int(active_transit_count),
        "active_transit_value": float(active_transit_value),
        "pending_requisitions": int(pending_requisitions),
        "acknowledged_today": int(acknowledged_today),
        "total_transit_variance_units": float(total_transit_variance_units)
    }


# ── Warehouse Directory for Dropdowns ─────────────────────────────────────────

@router.get("/warehouses")
def get_transfer_warehouses(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    org_id = current_user.organization_id
    whs = db.query(models.Warehouse).filter(
        models.Warehouse.organization_id == org_id,
        models.Warehouse.status == "active"
    ).order_by(models.Warehouse.name).all()

    return [
        {
            "id": str(w.id),
            "code": w.code,
            "name": w.name,
            "address": w.address,
            "manager_name": w.manager_name
        }
        for w in whs
    ]


# ── List Orders (Master Register) ─────────────────────────────────────────────

@router.get("/orders")
def get_stock_transfer_orders(
    status_filter: Optional[str] = Query(None, alias="status"),
    source_wh: Optional[str] = Query(None, alias="source_warehouse_id"),
    dest_wh: Optional[str] = Query(None, alias="destination_warehouse_id"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    org_id = current_user.organization_id
    query = db.query(models.StockTransferOrder).filter(
        models.StockTransferOrder.organization_id == org_id
    )

    if status_filter and status_filter != "ALL":
        query = query.filter(models.StockTransferOrder.status == status_filter)
    if source_wh:
        try:
            query = query.filter(models.StockTransferOrder.source_warehouse_id == uuid.UUID(source_wh))
        except Exception:
            pass
    if dest_wh:
        try:
            query = query.filter(models.StockTransferOrder.destination_warehouse_id == uuid.UUID(dest_wh))
        except Exception:
            pass

    orders = query.order_by(desc(models.StockTransferOrder.order_date)).all()

    results = []
    for o in orders:
        src_name = o.source_warehouse.name if o.source_warehouse else "Source Warehouse"
        dst_name = o.destination_warehouse.name if o.destination_warehouse else "Destination Warehouse"

        items_data = []
        for itm in o.items:
            items_data.append({
                "id": str(itm.id),
                "transfer_order_id": str(itm.transfer_order_id),
                "product_id": str(itm.product_id),
                "product_name": itm.product_name,
                "batch_id": str(itm.batch_id) if itm.batch_id else None,
                "batch_number": itm.batch_number,
                "expiry_date": itm.expiry_date,
                "requested_qty": float(itm.requested_qty),
                "dispatched_qty": float(itm.dispatched_qty),
                "received_qty": float(itm.received_qty),
                "transit_loss_qty": float(itm.transit_loss_qty),
                "unit_rate": float(itm.unit_rate),
                "line_total": float(itm.line_total),
                "loss_reason": itm.loss_reason
            })

        results.append({
            "id": str(o.id),
            "organization_id": str(o.organization_id),
            "order_number": o.order_number,
            "order_date": o.order_date.isoformat() if o.order_date else None,
            "status": o.status,
            "priority": o.priority,
            "source_warehouse_id": str(o.source_warehouse_id),
            "destination_warehouse_id": str(o.destination_warehouse_id),
            "source_warehouse_name": src_name,
            "destination_warehouse_name": dst_name,
            "expected_delivery_date": o.expected_delivery_date.isoformat() if o.expected_delivery_date else None,
            "dispatch_date": o.dispatch_date.isoformat() if o.dispatch_date else None,
            "received_date": o.received_date.isoformat() if o.received_date else None,
            "challan_number": o.challan_number,
            "vehicle_number": o.vehicle_number,
            "transporter_name": o.transporter_name,
            "docket_number": o.docket_number,
            "eway_bill_number": o.eway_bill_number,
            "driver_name": o.driver_name,
            "driver_phone": o.driver_phone,
            "total_items": o.total_items,
            "total_requested_qty": float(o.total_requested_qty),
            "total_dispatched_qty": float(o.total_dispatched_qty),
            "total_received_qty": float(o.total_received_qty),
            "total_transit_loss_qty": float(o.total_transit_loss_qty),
            "total_transfer_value": float(o.total_transfer_value),
            "notes": o.notes,
            "created_by": o.created_by,
            "dispatched_by": o.dispatched_by,
            "acknowledged_by": o.acknowledged_by,
            "created_at": o.created_at.isoformat() if o.created_at else None,
            "items": items_data
        })

    return results


# ── Get Single Order Details ──────────────────────────────────────────────────

@router.get("/orders/{order_id}")
def get_stock_transfer_order(
    order_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    org_id = current_user.organization_id
    order = db.query(models.StockTransferOrder).filter(
        models.StockTransferOrder.id == order_id,
        models.StockTransferOrder.organization_id == org_id
    ).first()

    if not order:
        raise HTTPException(status_code=404, detail="Stock Transfer Order not found")

    src_name = order.source_warehouse.name if order.source_warehouse else "Source Warehouse"
    dst_name = order.destination_warehouse.name if order.destination_warehouse else "Destination Warehouse"

    items_data = []
    for itm in order.items:
        items_data.append({
            "id": str(itm.id),
            "transfer_order_id": str(itm.transfer_order_id),
            "product_id": str(itm.product_id),
            "product_name": itm.product_name,
            "batch_id": str(itm.batch_id) if itm.batch_id else None,
            "batch_number": itm.batch_number,
            "expiry_date": itm.expiry_date,
            "requested_qty": float(itm.requested_qty),
            "dispatched_qty": float(itm.dispatched_qty),
            "received_qty": float(itm.received_qty),
            "transit_loss_qty": float(itm.transit_loss_qty),
            "unit_rate": float(itm.unit_rate),
            "line_total": float(itm.line_total),
            "loss_reason": itm.loss_reason
        })

    return {
        "id": str(order.id),
        "organization_id": str(order.organization_id),
        "order_number": order.order_number,
        "order_date": order.order_date.isoformat() if order.order_date else None,
        "status": order.status,
        "priority": order.priority,
        "source_warehouse_id": str(order.source_warehouse_id),
        "destination_warehouse_id": str(order.destination_warehouse_id),
        "source_warehouse_name": src_name,
        "destination_warehouse_name": dst_name,
        "expected_delivery_date": order.expected_delivery_date.isoformat() if order.expected_delivery_date else None,
        "dispatch_date": order.dispatch_date.isoformat() if order.dispatch_date else None,
        "received_date": order.received_date.isoformat() if order.received_date else None,
        "challan_number": order.challan_number,
        "vehicle_number": order.vehicle_number,
        "transporter_name": order.transporter_name,
        "docket_number": order.docket_number,
        "eway_bill_number": order.eway_bill_number,
        "driver_name": order.driver_name,
        "driver_phone": order.driver_phone,
        "total_items": order.total_items,
        "total_requested_qty": float(order.total_requested_qty),
        "total_dispatched_qty": float(order.total_dispatched_qty),
        "total_received_qty": float(order.total_received_qty),
        "total_transit_loss_qty": float(order.total_transit_loss_qty),
        "total_transfer_value": float(order.total_transfer_value),
        "notes": order.notes,
        "created_by": order.created_by,
        "dispatched_by": order.dispatched_by,
        "acknowledged_by": order.acknowledged_by,
        "created_at": order.created_at.isoformat() if order.created_at else None,
        "items": items_data
    }


# ── Create Requisition (STO) ──────────────────────────────────────────────────

@router.post("/orders")
def create_stock_transfer_order(
    payload: schemas.StockTransferOrderCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    org_id = current_user.organization_id

    if payload.source_warehouse_id == payload.destination_warehouse_id:
        raise HTTPException(
            status_code=400,
            detail="Source and Destination warehouses cannot be identical."
        )

    order_num = payload.order_number or generate_sto_number(db, org_id)

    total_requested = Decimal("0.00")
    total_value = Decimal("0.00")

    for itm in payload.items:
        total_requested += Decimal(str(itm.requested_qty))
        line_tot = Decimal(str(itm.requested_qty)) * Decimal(str(itm.unit_rate))
        total_value += line_tot

    sto = models.StockTransferOrder(
        organization_id=org_id,
        order_number=order_num,
        order_date=payload.order_date or datetime.utcnow(),
        status="APPROVED", # Direct approval for immediate dispatch readiness
        priority=payload.priority or "ROUTINE",
        source_warehouse_id=payload.source_warehouse_id,
        destination_warehouse_id=payload.destination_warehouse_id,
        expected_delivery_date=payload.expected_delivery_date,
        total_items=len(payload.items),
        total_requested_qty=total_requested,
        total_dispatched_qty=Decimal("0.00"),
        total_received_qty=Decimal("0.00"),
        total_transit_loss_qty=Decimal("0.00"),
        total_transfer_value=total_value,
        notes=payload.notes,
        created_by=current_user.username or "Admin"
    )
    db.add(sto)
    db.flush()

    for itm in payload.items:
        line_tot = Decimal(str(itm.requested_qty)) * Decimal(str(itm.unit_rate))
        sto_item = models.StockTransferOrderItem(
            transfer_order_id=sto.id,
            product_id=itm.product_id,
            product_name=itm.product_name,
            batch_id=itm.batch_id,
            batch_number=itm.batch_number,
            expiry_date=itm.expiry_date,
            requested_qty=Decimal(str(itm.requested_qty)),
            dispatched_qty=Decimal("0.00"),
            received_qty=Decimal("0.00"),
            transit_loss_qty=Decimal("0.00"),
            unit_rate=Decimal(str(itm.unit_rate)),
            line_total=line_tot
        )
        db.add(sto_item)

    db.commit()
    db.refresh(sto)
    return {
        "message": "Stock Transfer Order created successfully",
        "order_id": str(sto.id),
        "order_number": sto.order_number,
        "status": sto.status
    }


# ── Outward Dispatch Endpoint ─────────────────────────────────────────────────

@router.post("/orders/{order_id}/dispatch")
def dispatch_stock_transfer_order(
    order_id: uuid.UUID,
    payload: schemas.StockTransferDispatchPayload,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    org_id = current_user.organization_id
    sto = db.query(models.StockTransferOrder).filter(
        models.StockTransferOrder.id == order_id,
        models.StockTransferOrder.organization_id == org_id
    ).first()

    if not sto:
        raise HTTPException(status_code=404, detail="Stock Transfer Order not found")

    if sto.status not in ["DRAFT", "APPROVED"]:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot dispatch order in '{sto.status}' status."
        )

    challan_num = payload.challan_number or generate_std_challan_number(db, org_id)

    sto.status = "IN_TRANSIT"
    sto.dispatch_date = datetime.utcnow()
    sto.challan_number = challan_num
    sto.vehicle_number = payload.vehicle_number or sto.vehicle_number
    sto.transporter_name = payload.transporter_name or sto.transporter_name
    sto.docket_number = payload.docket_number or sto.docket_number
    sto.eway_bill_number = payload.eway_bill_number or sto.eway_bill_number
    sto.driver_name = payload.driver_name or sto.driver_name
    sto.driver_phone = payload.driver_phone or sto.driver_phone
    sto.dispatched_by = current_user.username or "Dispatch Officer"
    if payload.notes:
        sto.notes = f"{sto.notes or ''}\nDispatch note: {payload.notes}".strip()

    # Map of item dispatch updates
    dispatch_map = {item.item_id: item for item in payload.items}

    total_dispatched = Decimal("0.00")
    total_val = Decimal("0.00")

    for itm in sto.items:
        if itm.id in dispatch_map:
            disp_info = dispatch_map[itm.id]
            qty = Decimal(str(disp_info.dispatched_qty))
            itm.dispatched_qty = qty
            if disp_info.batch_id:
                itm.batch_id = disp_info.batch_id
            if disp_info.batch_number:
                itm.batch_number = disp_info.batch_number
            if disp_info.expiry_date:
                itm.expiry_date = disp_info.expiry_date

            # Decrement physical batch stock from source
            if itm.batch_id:
                batch = db.query(models.Batch).filter(models.Batch.id == itm.batch_id).first()
                if batch:
                    batch.current_stock = max(0, batch.current_stock - int(qty))

            itm.line_total = qty * itm.unit_rate
            total_dispatched += qty
            total_val += itm.line_total
        else:
            # If not explicitly mapped, default dispatched = requested
            itm.dispatched_qty = itm.requested_qty
            total_dispatched += itm.requested_qty
            total_val += itm.line_total

    sto.total_dispatched_qty = total_dispatched
    sto.total_transfer_value = total_val

    db.commit()
    db.refresh(sto)

    return {
        "message": "Stock Transfer Order successfully dispatched into IN_TRANSIT",
        "order_id": str(sto.id),
        "order_number": sto.order_number,
        "challan_number": sto.challan_number,
        "status": sto.status,
        "total_dispatched_qty": float(sto.total_dispatched_qty),
        "total_transfer_value": float(sto.total_transfer_value)
    }


# ── Destination Receiving Hub Inward Acknowledgement ─────────────────────────

@router.post("/orders/{order_id}/acknowledge-inward")
def acknowledge_stock_transfer_inward(
    order_id: uuid.UUID,
    payload: schemas.StockTransferAcknowledgePayload,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    org_id = current_user.organization_id
    sto = db.query(models.StockTransferOrder).filter(
        models.StockTransferOrder.id == order_id,
        models.StockTransferOrder.organization_id == org_id
    ).first()

    if not sto:
        raise HTTPException(status_code=404, detail="Stock Transfer Order not found")

    if sto.status not in ["IN_TRANSIT", "PARTIALLY_RECEIVED"]:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot acknowledge inward for order in '{sto.status}' status."
        )

    ack_map = {item.item_id: item for item in payload.items}

    total_received = Decimal("0.00")
    total_loss = Decimal("0.00")

    for itm in sto.items:
        if itm.id in ack_map:
            ack_info = ack_map[itm.id]
            rcv_qty = Decimal(str(ack_info.received_qty))
            dmg_qty = Decimal(str(ack_info.damaged_qty))

            itm.received_qty = rcv_qty
            # Shortage = max(0, dispatched - received)
            short_qty = max(Decimal("0.00"), itm.dispatched_qty - rcv_qty)
            itm.transit_loss_qty = short_qty + dmg_qty
            itm.loss_reason = ack_info.loss_reason

            # Increment destination stock
            if itm.batch_id:
                batch = db.query(models.Batch).filter(models.Batch.id == itm.batch_id).first()
                if batch:
                    batch.current_stock += int(rcv_qty)
                    if dmg_qty > 0:
                        batch.brk_exp_stock += int(dmg_qty)

            total_received += rcv_qty
            total_loss += itm.transit_loss_qty
        else:
            # If not in ack_map, default received = dispatched
            itm.received_qty = itm.dispatched_qty
            itm.transit_loss_qty = Decimal("0.00")
            total_received += itm.dispatched_qty

            if itm.batch_id:
                batch = db.query(models.Batch).filter(models.Batch.id == itm.batch_id).first()
                if batch:
                    batch.current_stock += int(itm.dispatched_qty)

    sto.total_received_qty = total_received
    sto.total_transit_loss_qty = total_loss
    sto.received_date = datetime.utcnow()
    sto.acknowledged_by = payload.acknowledged_by or current_user.username or "Receiving Manager"

    if total_loss > 0:
        sto.status = "PARTIALLY_RECEIVED" if total_received < sto.total_dispatched_qty else "COMPLETED"
    else:
        sto.status = "COMPLETED"

    if payload.notes:
        sto.notes = f"{sto.notes or ''}\nReceiving note: {payload.notes}".strip()

    db.commit()
    db.refresh(sto)

    return {
        "message": "Stock Transfer inward successfully acknowledged and inventory credited",
        "order_id": str(sto.id),
        "order_number": sto.order_number,
        "status": sto.status,
        "total_received_qty": float(sto.total_received_qty),
        "total_transit_loss_qty": float(sto.total_transit_loss_qty)
    }
