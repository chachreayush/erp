import uuid
from datetime import datetime, timedelta
from decimal import Decimal
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc, func, or_
from pydantic import BaseModel, Field

from database import get_db
import models
from auth.router import get_current_user

router = APIRouter(prefix="", tags=["Cargo & Consignment Engine (DOC-34)"])

# ─────────────────────────────────────────────────────────────
# Pydantic Schemas
# ─────────────────────────────────────────────────────────────

class PackageInput(BaseModel):
    package_type: str = "Carton"
    barcode: Optional[str] = None
    gross_weight: float = 0.0
    tare_weight: float = 0.0
    net_weight: float = 0.0
    length_cm: float = 0.0
    width_cm: float = 0.0
    height_cm: float = 0.0
    is_fragile: bool = False

class CostInput(BaseModel):
    cost_type: str = "FREIGHT" # FREIGHT, LOADING, TOLL, DRAYAGE, HANDLING, INSURANCE
    gross_cost: float = 0.0
    recovery_amount: float = 0.0
    is_admin_borne: bool = True
    is_recoverable: bool = False

class ConsignmentCreateRequest(BaseModel):
    consignment_number: Optional[str] = None
    document_number: Optional[str] = None
    transporter_name: str = "V-Trans Logistics India Ltd."
    vehicle_no: Optional[str] = None
    driver_name: Optional[str] = None
    driver_phone: Optional[str] = None
    origin_hub: str = "Jaipur Central Logistics Hub"
    destination_hub: str = "Delhi South Distribution Center"
    lr_no: Optional[str] = None
    is_admin_funded: bool = True
    notes: Optional[str] = None
    packages: Optional[List[PackageInput]] = None
    costs: Optional[List[CostInput]] = None

class StatusUpdateRequest(BaseModel):
    status: str # READY_FOR_LOADING, LOADING, DISPATCHED, IN_TRANSIT, DELIVERED, EXCEPTION, CLOSED
    reason: Optional[str] = None

class PodSubmitRequest(BaseModel):
    received_by: str
    accepted_qty: float = 1.0
    short_qty: float = 0.0
    damage_qty: float = 0.0
    remarks: Optional[str] = None
    signature_token: Optional[str] = None

class ExceptionResolveRequest(BaseModel):
    resolution_action: str # ACCEPT_SHORTAGE, INSURANCE_CLAIM, RESHIP_SHORTAGE, WAIVE
    resolution_remarks: str

# ─────────────────────────────────────────────────────────────
# Helper: Series Continuation for Consignments
# ─────────────────────────────────────────────────────────────

def generate_consignment_number(db: Session, company_id: uuid.UUID) -> str:
    year = datetime.utcnow().year
    prefix = f"CN-{year}-"
    latest = db.query(models.Consignment).filter(
        models.Consignment.company_id == company_id,
        models.Consignment.consignment_number.like(f"{prefix}%")
    ).order_by(desc(models.Consignment.consignment_number)).first()

    if latest:
        try:
            num_part = int(latest.consignment_number.split("-")[-1])
            next_num = num_part + 1
        except Exception:
            next_num = 1
    else:
        next_num = 1

    return f"{prefix}{str(next_num).zfill(4)}"

# ─────────────────────────────────────────────────────────────
# API Endpoints
# ─────────────────────────────────────────────────────────────

@router.get("/summary")
def get_cargo_summary(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Returns top KPI strip metrics for Cargo & Consignment Management."""
    cid = current_user.organization_id

    total_consignments = db.query(models.Consignment).filter(models.Consignment.company_id == cid).count()
    active_in_transit = db.query(models.Consignment).filter(
        models.Consignment.company_id == cid,
        models.Consignment.status.in_(["DISPATCHED", "IN_TRANSIT", "LOADING"])
    ).count()

    delivered_count = db.query(models.Consignment).filter(
        models.Consignment.company_id == cid,
        models.Consignment.status == "DELIVERED"
    ).count()

    exceptions_count = db.query(models.Consignment).filter(
        models.Consignment.company_id == cid,
        models.Consignment.status == "EXCEPTION"
    ).count()

    # Total CBM
    total_cbm = db.query(func.coalesce(func.sum(models.CargoPackage.cbm), 0)).join(
        models.Consignment, models.CargoPackage.consignment_id == models.Consignment.id
    ).filter(models.Consignment.company_id == cid).scalar()

    # Total Admin-Borne Cargo Expenses
    admin_borne_cost = db.query(func.coalesce(func.sum(models.CargoCost.net_bearer_cost), 0)).join(
        models.Consignment, models.CargoCost.consignment_id == models.Consignment.id
    ).filter(
        models.Consignment.company_id == cid,
        models.CargoCost.is_admin_borne == True
    ).scalar()

    # Pending PODs
    pending_pod_count = db.query(models.Consignment).filter(
        models.Consignment.company_id == cid,
        models.Consignment.status.in_(["IN_TRANSIT", "DISPATCHED"])
    ).count()

    return {
        "total_consignments": total_consignments,
        "active_in_transit": active_in_transit,
        "delivered_count": delivered_count,
        "exceptions_count": exceptions_count,
        "total_cbm": float(total_cbm or 0.0),
        "admin_borne_cost": float(admin_borne_cost or 0.0),
        "pending_pod_count": pending_pod_count
    }

@router.get("/consignments")
def get_consignments(
    search: Optional[str] = None,
    status: Optional[str] = None,
    transporter: Optional[str] = None,
    cost_bearer: Optional[str] = None, # ALL, ADMIN, CLIENT
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Multi-dimensional search and list for consignments."""
    cid = current_user.organization_id
    query = db.query(models.Consignment).filter(models.Consignment.company_id == cid)

    if status and status != "ALL":
        query = query.filter(models.Consignment.status == status)

    if transporter and transporter != "ALL":
        query = query.filter(models.Consignment.transporter_name.ilike(f"%{transporter}%"))

    if cost_bearer == "ADMIN":
        query = query.filter(models.Consignment.is_admin_funded == True)
    elif cost_bearer == "CLIENT":
        query = query.filter(models.Consignment.is_admin_funded == False)

    if search:
        s = f"%{search}%"
        query = query.filter(
            or_(
                models.Consignment.consignment_number.ilike(s),
                models.Consignment.lr_no.ilike(s),
                models.Consignment.document_number.ilike(s),
                models.Consignment.transporter_name.ilike(s),
                models.Consignment.destination_hub.ilike(s)
            )
        )

    total = query.count()
    records = query.order_by(desc(models.Consignment.created_at)).offset(offset).limit(limit).all()

    items = []
    for r in records:
        pkg_count = len(r.packages)
        tot_cbm = sum([float(p.cbm or 0) for p in r.packages])
        tot_weight = sum([float(p.gross_weight or 0) for p in r.packages])
        tot_cost = sum([float(c.gross_cost or 0) for c in r.costs])
        admin_cost = sum([float(c.net_bearer_cost or 0) for c in r.costs if c.is_admin_borne])

        items.append({
            "id": str(r.id),
            "consignment_number": r.consignment_number,
            "document_number": r.document_number,
            "lr_no": r.lr_no,
            "transporter_name": r.transporter_name,
            "vehicle_no": r.vehicle_no,
            "driver_name": r.driver_name,
            "driver_phone": r.driver_phone,
            "origin_hub": r.origin_hub,
            "destination_hub": r.destination_hub,
            "status": r.status,
            "dispatch_at": r.dispatch_at.isoformat() if r.dispatch_at else None,
            "delivered_at": r.delivered_at.isoformat() if r.delivered_at else None,
            "is_admin_funded": r.is_admin_funded,
            "package_count": pkg_count,
            "total_cbm": round(tot_cbm, 4),
            "total_gross_weight": round(tot_weight, 2),
            "total_cost": round(tot_cost, 2),
            "admin_borne_cost": round(admin_cost, 2),
            "has_pod": len(r.pod_records) > 0,
            "created_at": r.created_at.isoformat()
        })

    return {"total": total, "consignments": items}

@router.post("/consignments")
def create_consignment(
    payload: ConsignmentCreateRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Creates a new consignment with automatic series continuation and initial packages/costs."""
    cid = current_user.organization_id

    c_num = payload.consignment_number or generate_consignment_number(db, cid)

    # Check uniqueness
    existing = db.query(models.Consignment).filter(
        models.Consignment.company_id == cid,
        models.Consignment.consignment_number == c_num
    ).first()
    if existing:
        c_num = generate_consignment_number(db, cid)

    consignment = models.Consignment(
        consignment_number=c_num,
        company_id=cid,
        cost_bearer_company_id=cid,
        document_number=payload.document_number,
        transporter_name=payload.transporter_name,
        vehicle_no=payload.vehicle_no,
        driver_name=payload.driver_name,
        driver_phone=payload.driver_phone,
        origin_hub=payload.origin_hub,
        destination_hub=payload.destination_hub,
        lr_no=payload.lr_no or f"LR-{c_num.replace('CN-', '')}",
        status="PLANNED",
        is_admin_funded=payload.is_admin_funded,
        notes=payload.notes,
        created_at=datetime.utcnow()
    )
    db.add(consignment)
    db.flush()

    # Add packages if supplied
    if payload.packages:
        for idx, p in enumerate(payload.packages, 1):
            b_code = p.barcode or f"PKG-{c_num}-{str(idx).zfill(2)}"
            cbm_val = round((p.length_cm * p.width_cm * p.height_cm) / 1000000.0, 6)
            pkg = models.CargoPackage(
                consignment_id=consignment.id,
                package_type=p.package_type,
                barcode=b_code,
                gross_weight=Decimal(str(p.gross_weight)),
                tare_weight=Decimal(str(p.tare_weight)),
                net_weight=Decimal(str(p.net_weight or max(0, p.gross_weight - p.tare_weight))),
                length_cm=Decimal(str(p.length_cm)),
                width_cm=Decimal(str(p.width_cm)),
                height_cm=Decimal(str(p.height_cm)),
                cbm=Decimal(str(cbm_val)),
                is_fragile=p.is_fragile,
                status="INTACT",
                created_at=datetime.utcnow()
            )
            db.add(pkg)

    # Add costs if supplied
    if payload.costs:
        for c in payload.costs:
            net_c = Decimal(str(c.gross_cost)) - Decimal(str(c.recovery_amount))
            cost_entry = models.CargoCost(
                consignment_id=consignment.id,
                beneficiary_company_id=cid,
                cost_bearer_company_id=cid,
                cost_type=c.cost_type,
                gross_cost=Decimal(str(c.gross_cost)),
                recovery_amount=Decimal(str(c.recovery_amount)),
                net_bearer_cost=net_c,
                is_admin_borne=c.is_admin_borne,
                is_recoverable=c.is_recoverable,
                recovery_status="BILLED" if c.recovery_amount > 0 else "UNBILLED",
                created_at=datetime.utcnow()
            )
            db.add(cost_entry)

    # Write immutable audit log
    try:
        from api.audit import log_audit_event
        log_audit_event(
            db=db,
            company_id=cid,
            actor_name=current_user.username,
            event_type="CREATE",
            object_type="CONSIGNMENT",
            object_id=consignment.id,
            document_number=consignment.consignment_number,
            reason="Consignment created via Cargo Management Board",
            before_payload=None,
            after_payload={
                "consignment_number": consignment.consignment_number,
                "transporter": consignment.transporter_name,
                "destination": consignment.destination_hub,
                "is_admin_funded": consignment.is_admin_funded
            }
        )
    except Exception as e:
        print(f"Audit log notice: {e}")

    db.commit()
    return {
        "status": "SUCCESS",
        "consignment_id": str(consignment.id),
        "consignment_number": consignment.consignment_number,
        "message": f"Consignment {consignment.consignment_number} successfully registered."
    }

@router.get("/consignments/{consignment_id}")
def get_consignment_detail(
    consignment_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Returns comprehensive details for a single consignment."""
    try:
        c_uuid = uuid.UUID(consignment_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid consignment UUID")

    consignment = db.query(models.Consignment).filter(
        models.Consignment.id == c_uuid,
        models.Consignment.company_id == current_user.organization_id
    ).first()

    if not consignment:
        raise HTTPException(status_code=404, detail="Consignment not found")

    pkgs = [
        {
            "id": str(p.id),
            "package_type": p.package_type,
            "barcode": p.barcode,
            "gross_weight": float(p.gross_weight or 0),
            "tare_weight": float(p.tare_weight or 0),
            "net_weight": float(p.net_weight or 0),
            "length_cm": float(p.length_cm or 0),
            "width_cm": float(p.width_cm or 0),
            "height_cm": float(p.height_cm or 0),
            "cbm": float(p.cbm or 0),
            "is_fragile": p.is_fragile,
            "status": p.status
        }
        for p in consignment.packages
    ]

    costs = [
        {
            "id": str(c.id),
            "cost_type": c.cost_type,
            "gross_cost": float(c.gross_cost or 0),
            "recovery_amount": float(c.recovery_amount or 0),
            "net_bearer_cost": float(c.net_bearer_cost or 0),
            "is_admin_borne": c.is_admin_borne,
            "is_recoverable": c.is_recoverable,
            "recovery_status": c.recovery_status
        }
        for c in consignment.costs
    ]

    pod_data = None
    if consignment.pod_records:
        latest_pod = consignment.pod_records[-1]
        pod_data = {
            "id": str(latest_pod.id),
            "received_by": latest_pod.received_by,
            "received_at": latest_pod.received_at.isoformat(),
            "accepted_qty": float(latest_pod.accepted_qty or 0),
            "short_qty": float(latest_pod.short_qty or 0),
            "damage_qty": float(latest_pod.damage_qty or 0),
            "status": latest_pod.status,
            "remarks": latest_pod.remarks,
            "signature_token": latest_pod.signature_token
        }

    tot_cbm = sum([float(p["cbm"]) for p in pkgs])
    tot_cost = sum([float(c["gross_cost"]) for c in costs])
    admin_cost = sum([float(c["net_bearer_cost"]) for c in costs if c["is_admin_borne"]])

    return {
        "id": str(consignment.id),
        "consignment_number": consignment.consignment_number,
        "document_number": consignment.document_number,
        "lr_no": consignment.lr_no,
        "transporter_name": consignment.transporter_name,
        "vehicle_no": consignment.vehicle_no,
        "driver_name": consignment.driver_name,
        "driver_phone": consignment.driver_phone,
        "origin_hub": consignment.origin_hub,
        "destination_hub": consignment.destination_hub,
        "status": consignment.status,
        "dispatch_at": consignment.dispatch_at.isoformat() if consignment.dispatch_at else None,
        "delivered_at": consignment.delivered_at.isoformat() if consignment.delivered_at else None,
        "is_admin_funded": consignment.is_admin_funded,
        "notes": consignment.notes,
        "package_count": len(pkgs),
        "total_cbm": round(tot_cbm, 4),
        "total_cost": round(tot_cost, 2),
        "admin_borne_cost": round(admin_cost, 2),
        "packages": pkgs,
        "costs": costs,
        "pod": pod_data,
        "created_at": consignment.created_at.isoformat()
    }

@router.put("/consignments/{consignment_id}/status")
def update_consignment_status(
    consignment_id: str,
    payload: StatusUpdateRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Advances consignment status through the lifecycle state machine."""
    c_uuid = uuid.UUID(consignment_id)
    consignment = db.query(models.Consignment).filter(
        models.Consignment.id == c_uuid,
        models.Consignment.company_id == current_user.organization_id
    ).first()

    if not consignment:
        raise HTTPException(status_code=404, detail="Consignment not found")

    old_status = consignment.status
    consignment.status = payload.status

    now = datetime.utcnow()
    if payload.status == "DISPATCHED" and not consignment.dispatch_at:
        consignment.dispatch_at = now
    elif payload.status == "DELIVERED" and not consignment.delivered_at:
        consignment.delivered_at = now

    # Write immutable audit log
    try:
        from api.audit import log_audit_event
        log_audit_event(
            db=db,
            company_id=current_user.organization_id,
            actor_name=current_user.username,
            event_type="UPDATE",
            object_type="CONSIGNMENT_STATUS",
            object_id=consignment.id,
            document_number=consignment.consignment_number,
            reason=payload.reason or f"Status changed from {old_status} to {payload.status}",
            before_payload={"status": old_status},
            after_payload={"status": payload.status}
        )
    except Exception as e:
        print(f"Audit log notice: {e}")

    db.commit()
    return {
        "status": "SUCCESS",
        "consignment_id": str(consignment.id),
        "previous_status": old_status,
        "current_status": consignment.status,
        "message": f"Consignment status advanced to {consignment.status}."
    }

@router.get("/costs")
def get_cargo_costs(
    include_clients: bool = True,
    cost_type: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Retrieves cargo costs with Admin-borne bifurcation and combined multi-client reporting toggle."""
    cid = current_user.organization_id

    query = db.query(models.CargoCost).join(
        models.Consignment, models.CargoCost.consignment_id == models.Consignment.id
    )

    if not include_clients:
        # Strict tenant filtering
        query = query.filter(models.CargoCost.beneficiary_company_id == cid)
    else:
        # Cross-company consolidated reporting for Admin
        query = query.filter(
            or_(
                models.CargoCost.beneficiary_company_id == cid,
                models.CargoCost.cost_bearer_company_id == cid
            )
        )

    if cost_type and cost_type != "ALL":
        query = query.filter(models.CargoCost.cost_type == cost_type)

    total_gross = query.with_entities(func.coalesce(func.sum(models.CargoCost.gross_cost), 0)).scalar()
    total_recovered = query.with_entities(func.coalesce(func.sum(models.CargoCost.recovery_amount), 0)).scalar()
    total_net_admin = query.filter(models.CargoCost.is_admin_borne == True).with_entities(
        func.coalesce(func.sum(models.CargoCost.net_bearer_cost), 0)
    ).scalar()

    costs = query.order_by(desc(models.CargoCost.created_at)).offset(offset).limit(limit).all()

    items = []
    for c in costs:
        c_num = c.consignment.consignment_number if c.consignment else "N/A"
        lr_no = c.consignment.lr_no if c.consignment else "N/A"
        transporter = c.consignment.transporter_name if c.consignment else "N/A"
        b_name = c.beneficiary_company.name if c.beneficiary_company else "Client Company"

        items.append({
            "id": str(c.id),
            "consignment_number": c_num,
            "lr_no": lr_no,
            "transporter_name": transporter,
            "beneficiary_name": b_name,
            "cost_type": c.cost_type,
            "gross_cost": float(c.gross_cost or 0),
            "recovery_amount": float(c.recovery_amount or 0),
            "net_bearer_cost": float(c.net_bearer_cost or 0),
            "is_admin_borne": c.is_admin_borne,
            "is_recoverable": c.is_recoverable,
            "recovery_status": c.recovery_status,
            "created_at": c.created_at.isoformat()
        })

    return {
        "summary": {
            "total_gross": float(total_gross or 0),
            "total_recovered": float(total_recovered or 0),
            "total_net_admin": float(total_net_admin or 0),
            "combined_mode": include_clients
        },
        "costs": items
    }

@router.get("/pod-exceptions")
def get_pod_exceptions(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Returns queue of deliveries pending POD receipt and active transit exceptions."""
    cid = current_user.organization_id

    # Pending PODs: in transit or dispatched without confirmed POD
    pending_consignments = db.query(models.Consignment).filter(
        models.Consignment.company_id == cid,
        models.Consignment.status.in_(["IN_TRANSIT", "DISPATCHED"])
    ).order_by(desc(models.Consignment.created_at)).all()

    # Active Exceptions
    exceptions = db.query(models.Consignment).filter(
        models.Consignment.company_id == cid,
        models.Consignment.status == "EXCEPTION"
    ).order_by(desc(models.Consignment.created_at)).all()

    pending_list = [
        {
            "id": str(c.id),
            "consignment_number": c.consignment_number,
            "document_number": c.document_number,
            "lr_no": c.lr_no,
            "transporter_name": c.transporter_name,
            "destination_hub": c.destination_hub,
            "driver_name": c.driver_name,
            "driver_phone": c.driver_phone,
            "package_count": len(c.packages),
            "dispatch_at": c.dispatch_at.isoformat() if c.dispatch_at else None,
            "status": c.status
        }
        for c in pending_consignments
    ]

    exception_list = []
    for c in exceptions:
        latest_pod = c.pod_records[-1] if c.pod_records else None
        exception_list.append({
            "id": str(c.id),
            "consignment_number": c.consignment_number,
            "lr_no": c.lr_no,
            "transporter_name": c.transporter_name,
            "destination_hub": c.destination_hub,
            "short_qty": float(latest_pod.short_qty or 0) if latest_pod else 0,
            "damage_qty": float(latest_pod.damage_qty or 0) if latest_pod else 0,
            "remarks": latest_pod.remarks if latest_pod else "Transit discrepancy flagged",
            "created_at": c.created_at.isoformat()
        })

    return {
        "pending_pods": pending_list,
        "exceptions": exception_list
    }

@router.post("/consignments/{consignment_id}/pod")
def submit_pod(
    consignment_id: str,
    payload: PodSubmitRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Submits Proof of Delivery with accepted vs damaged/short quantities."""
    c_uuid = uuid.UUID(consignment_id)
    consignment = db.query(models.Consignment).filter(
        models.Consignment.id == c_uuid,
        models.Consignment.company_id == current_user.organization_id
    ).first()

    if not consignment:
        raise HTTPException(status_code=404, detail="Consignment not found")

    has_discrepancy = (payload.short_qty > 0 or payload.damage_qty > 0)
    pod_status = "DISCREPANCY" if has_discrepancy else "CONFIRMED"

    pod = models.PodRecord(
        consignment_id=consignment.id,
        received_by=payload.received_by,
        received_at=datetime.utcnow(),
        accepted_qty=Decimal(str(payload.accepted_qty)),
        short_qty=Decimal(str(payload.short_qty)),
        damage_qty=Decimal(str(payload.damage_qty)),
        status=pod_status,
        remarks=payload.remarks,
        signature_token=payload.signature_token or f"SIG-{consignment.consignment_number}",
        created_at=datetime.utcnow()
    )
    db.add(pod)

    # Transition consignment status
    if has_discrepancy:
        consignment.status = "EXCEPTION"
    else:
        consignment.status = "DELIVERED"
        consignment.delivered_at = datetime.utcnow()

    # Immutable audit log
    try:
        from api.audit import log_audit_event
        log_audit_event(
            db=db,
            company_id=current_user.organization_id,
            actor_name=current_user.username,
            event_type="POD_RECORDED",
            object_type="POD",
            object_id=pod.id,
            document_number=consignment.consignment_number,
            reason=f"POD recorded by {payload.received_by}. Status: {pod_status}",
            before_payload=None,
            after_payload={
                "accepted_qty": payload.accepted_qty,
                "short_qty": payload.short_qty,
                "damage_qty": payload.damage_qty,
                "status": pod_status
            }
        )
    except Exception as e:
        print(f"Audit log notice: {e}")

    db.commit()
    return {
        "status": "SUCCESS",
        "pod_id": str(pod.id),
        "consignment_status": consignment.status,
        "message": f"POD recorded for {consignment.consignment_number}. Status: {consignment.status}"
    }

@router.post("/consignments/{consignment_id}/resolve-exception")
def resolve_exception(
    consignment_id: str,
    payload: ExceptionResolveRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Resolves a transit exception with authorized corrective action."""
    c_uuid = uuid.UUID(consignment_id)
    consignment = db.query(models.Consignment).filter(
        models.Consignment.id == c_uuid,
        models.Consignment.company_id == current_user.organization_id
    ).first()

    if not consignment:
        raise HTTPException(status_code=404, detail="Consignment not found")

    consignment.status = "DELIVERED"
    consignment.notes = f"{consignment.notes or ''}\n[Exception Resolved: {payload.resolution_action}] {payload.resolution_remarks}"

    # Immutable audit log
    try:
        from api.audit import log_audit_event
        log_audit_event(
            db=db,
            company_id=current_user.organization_id,
            actor_name=current_user.username,
            event_type="EXCEPTION_RESOLVED",
            object_type="CONSIGNMENT_EXCEPTION",
            object_id=consignment.id,
            document_number=consignment.consignment_number,
            reason=f"Action: {payload.resolution_action}. Remarks: {payload.resolution_remarks}",
            before_payload={"status": "EXCEPTION"},
            after_payload={"status": "DELIVERED", "resolution": payload.resolution_action}
        )
    except Exception as e:
        print(f"Audit log notice: {e}")

    db.commit()
    return {
        "status": "SUCCESS",
        "consignment_id": str(consignment.id),
        "current_status": consignment.status,
        "message": "Transit exception successfully resolved and audited."
    }
