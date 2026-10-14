import uuid
import json
from datetime import datetime, timedelta
from decimal import Decimal
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc, func, or_
from pydantic import BaseModel, Field

from database import get_db
import models
from auth.router import get_current_user

router = APIRouter(prefix="", tags=["Freight & Logistics Cost Recovery Engine (DOC-35)"])

# ─────────────────────────────────────────────────────────────
# Pydantic Schemas
# ─────────────────────────────────────────────────────────────

class LaneInput(BaseModel):
    origin_zone: str = "Jaipur Central Logistics Hub"
    destination_zone: str = "Delhi South Distribution Center"
    distance_km: float = 260.0
    distance_source: str = "CONTRACTED"
    transit_days: int = 1
    priority: int = 1

class SlabItem(BaseModel):
    min_kg: float
    max_kg: float
    rate: float

class RateRuleInput(BaseModel):
    charge_basis: str = "PER_KG" # FLAT, PER_KG, PER_PACKAGE, PER_QUINTAL, PER_TON, PER_KM, PERCENTAGE, SLAB, HYBRID
    base_rate: float = 6.50
    min_charge: float = 500.0
    max_cap: Optional[float] = None
    slab_config: Optional[List[SlabItem]] = None
    rounding_rule: str = "NEAREST_1"

class AncillaryRuleInput(BaseModel):
    ancillary_type: str = "LOADING" # LOADING, UNLOADING, HAMALI, TOLL, PARKING, DETENTION, INSURANCE, HANDLING, OTHER
    charge_basis: str = "FLAT" # FLAT, PER_KG, PER_PACKAGE, PERCENTAGE, ACTUAL
    rate: float = 300.0
    is_mandatory: bool = False
    condition_text: Optional[str] = None

class ContractCreateRequest(BaseModel):
    contract_number: Optional[str] = None
    transporter_name: str = "V-Trans Logistics India Ltd."
    vehicle_class: str = "32FT_CONTAINER"
    priority: int = 1
    notes: Optional[str] = None
    lanes: Optional[List[LaneInput]] = None
    rate_rules: Optional[List[RateRuleInput]] = None
    ancillary_rules: Optional[List[AncillaryRuleInput]] = None

class FreightCalculateRequest(BaseModel):
    contract_id: Optional[str] = None
    transporter_name: Optional[str] = None
    origin_zone: str = "Jaipur Central Logistics Hub"
    destination_zone: str = "Delhi South Distribution Center"
    gross_weight_kg: float = 25.0
    volumetric_weight_kg: Optional[float] = 0.0
    package_count: int = 2
    distance_km: Optional[float] = 260.0
    declared_value: Optional[float] = 50000.0
    ancillaries_requested: Optional[List[str]] = None # ["LOADING", "TOLL", "HAMALI"]
    recovery_type: Optional[str] = "SUBSIDY" # FULL_PASS_THROUGH, FIXED, RATE_BASED, PERCENTAGE, SUBSIDY, NO_RECOVERY
    recovery_amount: Optional[float] = 0.0

class CostEventCreateRequest(BaseModel):
    consignment_id: Optional[str] = None
    contract_id: Optional[str] = None
    cost_type: str = "COMBINED_FREIGHT"
    estimated_amount: float
    actual_amount: Optional[float] = 0.0
    currency: str = "INR"
    is_admin_funded: bool = True
    calculation_inputs: Optional[Dict[str, Any]] = None
    calculation_outputs: Optional[Dict[str, Any]] = None
    formula_text: Optional[str] = None
    allocation_targets: Optional[List[Dict[str, Any]]] = None # [{"target_type": "INVOICE", "target_number": "RJ-INV-1001", "weight": 25.0}]
    recovery_data: Optional[Dict[str, Any]] = None

class AllocationItem(BaseModel):
    target_type: str = "INVOICE" # INVOICE, CHALLAN, CONSIGNMENT, PACKAGE
    target_id: Optional[str] = None
    target_number: str
    weight: Optional[float] = 0.0
    value: Optional[float] = 0.0
    package_count: Optional[int] = 0

class AllocateCostRequest(BaseModel):
    cost_event_id: str
    allocation_method: str = "WEIGHT" # WEIGHT, VALUE, PACKAGE_COUNT, EQUAL, MANUAL
    targets: List[AllocationItem]

class ReconciliationCreateRequest(BaseModel):
    transporter_name: str
    transporter_invoice_no: str
    transporter_invoice_date: Optional[str] = None
    expected_amount: float
    billed_amount: float
    dispute_reason: Optional[str] = None

class ReconciliationActionRequest(BaseModel):
    action: str # APPROVE, DISPUTE, RESOLVE, POST_TO_GL
    approved_amount: Optional[float] = None
    dispute_reason: Optional[str] = None

# ─────────────────────────────────────────────────────────────
# Helper Functions
# ─────────────────────────────────────────────────────────────

def generate_cost_event_number(db: Session, company_id: uuid.UUID) -> str:
    year = datetime.utcnow().year
    prefix = f"FCE-{year}-"
    latest = db.query(models.FreightCostEvent).filter(
        models.FreightCostEvent.company_id == company_id,
        models.FreightCostEvent.event_number.like(f"{prefix}%")
    ).order_by(desc(models.FreightCostEvent.event_number)).first()

    if latest:
        try:
            num = int(latest.event_number.split("-")[-1]) + 1
        except Exception:
            num = 1
    else:
        num = 1
    return f"{prefix}{str(num).zfill(4)}"

def generate_recon_number(db: Session) -> str:
    year = datetime.utcnow().year
    prefix = f"REC-FRT-{year}-"
    latest = db.query(models.FreightReconciliation).filter(
        models.FreightReconciliation.recon_number.like(f"{prefix}%")
    ).order_by(desc(models.FreightReconciliation.recon_number)).first()

    if latest:
        try:
            num = int(latest.recon_number.split("-")[-1]) + 1
        except Exception:
            num = 1
    else:
        num = 1
    return f"{prefix}{str(num).zfill(4)}"

# ─────────────────────────────────────────────────────────────
# Endpoints
# ─────────────────────────────────────────────────────────────

@router.get("/summary")
def get_freight_summary(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Returns executive summary metrics for DOC-35 Freight & Logistics Cost Engine.
    """
    company_id = current_user.organization_id

    # Spend metrics
    total_spend = db.query(func.coalesce(func.sum(models.FreightCostEvent.estimated_amount), 0.0)).filter(
        models.FreightCostEvent.company_id == company_id
    ).scalar() or 0.0

    admin_spend = db.query(func.coalesce(func.sum(models.FreightCostEvent.estimated_amount), 0.0)).filter(
        models.FreightCostEvent.company_id == company_id,
        models.FreightCostEvent.is_admin_funded == True
    ).scalar() or 0.0

    total_recoveries = db.query(func.coalesce(func.sum(models.FreightRecovery.recovery_amount), 0.0)).join(
        models.FreightCostEvent
    ).filter(models.FreightCostEvent.company_id == company_id).scalar() or 0.0

    total_subsidies = db.query(func.coalesce(func.sum(models.FreightRecovery.subsidy_amount), 0.0)).join(
        models.FreightCostEvent
    ).filter(models.FreightCostEvent.company_id == company_id).scalar() or 0.0

    # Counts
    contracts_count = db.query(models.FreightContract).filter(
        models.FreightContract.company_id == company_id,
        models.FreightContract.status == "ACTIVE"
    ).count()

    events_count = db.query(models.FreightCostEvent).filter(
        models.FreightCostEvent.company_id == company_id
    ).count()

    pending_recons = db.query(models.FreightReconciliation).filter(
        models.FreightReconciliation.status.in_(["DRAFT", "SUBMITTED", "DISPUTED"])
    ).count()

    margin = float(total_recoveries) - float(total_spend)

    return {
        "success": True,
        "summary": {
            "total_freight_spend": float(total_spend),
            "admin_funded_spend": float(admin_spend),
            "total_recoveries": float(total_recoveries),
            "total_subsidies": float(total_subsidies),
            "net_logistics_margin": float(margin),
            "active_contracts_count": contracts_count,
            "cost_events_count": events_count,
            "pending_reconciliations": pending_recons,
            "currency": "INR"
        }
    }

@router.get("/contracts")
def list_contracts(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    List all freight contracts, associated lanes, rate rules, and ancillary rules.
    """
    contracts = db.query(models.FreightContract).filter(
        models.FreightContract.company_id == current_user.organization_id
    ).order_by(asc(models.FreightContract.priority)).all()

    results = []
    for c in contracts:
        lanes = [
            {
                "id": str(l.id),
                "origin_zone": l.origin_zone,
                "destination_zone": l.destination_zone,
                "distance_km": float(l.distance_km),
                "distance_source": l.distance_source,
                "transit_days": l.transit_days,
                "priority": l.priority
            }
            for l in c.lanes
        ]
        rate_rules = []
        for r in c.rate_rules:
            slabs = []
            if r.slab_config:
                try:
                    slabs = json.loads(r.slab_config)
                except Exception:
                    slabs = []
            rate_rules.append({
                "id": str(r.id),
                "lane_id": str(r.lane_id) if r.lane_id else None,
                "charge_basis": r.charge_basis,
                "base_rate": float(r.base_rate),
                "min_charge": float(r.min_charge),
                "max_cap": float(r.max_cap) if r.max_cap else None,
                "slab_config": slabs,
                "rounding_rule": r.rounding_rule
            })
        ancillaries = [
            {
                "id": str(a.id),
                "ancillary_type": a.ancillary_type,
                "charge_basis": a.charge_basis,
                "rate": float(a.rate),
                "is_mandatory": a.is_mandatory,
                "condition_text": a.condition_text
            }
            for a in c.ancillary_rules
        ]

        results.append({
            "id": str(c.id),
            "contract_number": c.contract_number,
            "transporter_name": c.transporter_name,
            "vehicle_class": c.vehicle_class,
            "status": c.status,
            "priority": c.priority,
            "notes": c.notes,
            "effective_from": c.effective_from.isoformat() if c.effective_from else None,
            "lanes": lanes,
            "rate_rules": rate_rules,
            "ancillary_rules": ancillaries
        })

    return {"success": True, "contracts": results}

@router.post("/contracts")
def create_contract(
    req: ContractCreateRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Create a new freight rate contract with lanes, rate rules, and ancillaries.
    """
    company_id = current_user.organization_id
    contract_number = req.contract_number or f"FC-{datetime.utcnow().year}-{str(uuid.uuid4())[:8].upper()}"

    contract = models.FreightContract(
        contract_number=contract_number,
        transporter_name=req.transporter_name,
        company_id=company_id,
        status="ACTIVE",
        priority=req.priority,
        vehicle_class=req.vehicle_class,
        notes=req.notes
    )
    db.add(contract)
    db.flush()

    # Lanes
    lane_objs = []
    if req.lanes:
        for l in req.lanes:
            lane = models.FreightLane(
                contract_id=contract.id,
                origin_zone=l.origin_zone,
                destination_zone=l.destination_zone,
                distance_km=Decimal(str(l.distance_km)),
                distance_source=l.distance_source,
                transit_days=l.transit_days,
                priority=l.priority
            )
            db.add(lane)
            lane_objs.append(lane)
        db.flush()

    # Rate rules
    if req.rate_rules:
        for r in req.rate_rules:
            slab_json = json.dumps([s.dict() for s in r.slab_config]) if r.slab_config else None
            rate_rule = models.FreightRateRule(
                contract_id=contract.id,
                lane_id=lane_objs[0].id if lane_objs else None,
                charge_basis=r.charge_basis,
                base_rate=Decimal(str(r.base_rate)),
                min_charge=Decimal(str(r.min_charge)),
                max_cap=Decimal(str(r.max_cap)) if r.max_cap else None,
                slab_config=slab_json,
                rounding_rule=r.rounding_rule
            )
            db.add(rate_rule)

    # Ancillaries
    if req.ancillary_rules:
        for a in req.ancillary_rules:
            anc = models.FreightAncillaryRule(
                contract_id=contract.id,
                ancillary_type=a.ancillary_type,
                charge_basis=a.charge_basis,
                rate=Decimal(str(a.rate)),
                is_mandatory=a.is_mandatory,
                condition_text=a.condition_text
            )
            db.add(anc)

    db.commit()
    db.refresh(contract)
    return {"success": True, "message": "Contract created successfully", "contract_id": str(contract.id), "contract_number": contract.contract_number}

@router.post("/calculate")
def calculate_freight(
    req: FreightCalculateRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Deterministic Freight Calculation Engine (DOC-35):
    Resolves contract, rate rules, slabs, ancillaries, rounding, recovery, and produces full explainability snapshot.
    """
    company_id = current_user.organization_id

    # 1. Resolve contract
    contract = None
    if req.contract_id:
        contract = db.query(models.FreightContract).filter(
            models.FreightContract.id == uuid.UUID(req.contract_id),
            models.FreightContract.company_id == company_id
        ).first()
    elif req.transporter_name:
        contract = db.query(models.FreightContract).filter(
            models.FreightContract.transporter_name.ilike(f"%{req.transporter_name}%"),
            models.FreightContract.company_id == company_id,
            models.FreightContract.status == "ACTIVE"
        ).order_by(asc(models.FreightContract.priority)).first()

    if not contract:
        contract = db.query(models.FreightContract).filter(
            models.FreightContract.company_id == company_id,
            models.FreightContract.status == "ACTIVE"
        ).order_by(asc(models.FreightContract.priority)).first()

    if not contract:
        raise HTTPException(status_code=404, detail="No active freight contract found for calculation.")

    # 2. Chargeable weight
    gross_wt = max(req.gross_weight_kg, 0.0)
    vol_wt = max(req.volumetric_weight_kg or 0.0, 0.0)
    chargeable_wt = max(gross_wt, vol_wt)

    # 3. Resolve rate rule
    rate_rule = db.query(models.FreightRateRule).filter(
        models.FreightRateRule.contract_id == contract.id
    ).first()

    base_freight = 0.0
    calculation_steps = []
    formula_parts = []

    if rate_rule:
        basis = rate_rule.charge_basis
        base_rate = float(rate_rule.base_rate)
        min_charge = float(rate_rule.min_charge)
        max_cap = float(rate_rule.max_cap) if rate_rule.max_cap else None

        if basis == "FLAT":
            base_freight = base_rate
            formula_parts.append(f"Flat rate: Rs {base_rate:.2f}")
        elif basis == "PER_PACKAGE":
            base_freight = float(req.package_count) * base_rate
            formula_parts.append(f"{req.package_count} pkgs x Rs {base_rate:.2f} = Rs {base_freight:.2f}")
        elif basis == "PER_KM":
            dist = float(req.distance_km or 100.0)
            base_freight = dist * base_rate
            formula_parts.append(f"{dist:.1f} km x Rs {base_rate:.2f}/km = Rs {base_freight:.2f}")
        elif basis == "SLAB" and rate_rule.slab_config:
            try:
                slabs = json.loads(rate_rule.slab_config)
                # Find matching slab for chargeable weight
                applied_slab_rate = base_rate
                for s in slabs:
                    if s["min_kg"] <= chargeable_wt <= s["max_kg"]:
                        applied_slab_rate = float(s["rate"])
                        break
                base_freight = chargeable_wt * applied_slab_rate
                formula_parts.append(f"Slab Tier: {chargeable_wt:.2f}kg x Rs {applied_slab_rate:.2f}/kg = Rs {base_freight:.2f}")
            except Exception:
                base_freight = chargeable_wt * base_rate
                formula_parts.append(f"Fallback wt: {chargeable_wt:.2f}kg x Rs {base_rate:.2f}/kg = Rs {base_freight:.2f}")
        else: # Default PER_KG
            base_freight = chargeable_wt * base_rate
            formula_parts.append(f"{chargeable_wt:.2f}kg x Rs {base_rate:.2f}/kg = Rs {base_freight:.2f}")

        # Apply min charge
        if base_freight < min_charge:
            formula_parts.append(f"Applied Min Charge: Rs {min_charge:.2f} (Computed Rs {base_freight:.2f})")
            base_freight = min_charge

        # Apply max cap
        if max_cap and base_freight > max_cap:
            formula_parts.append(f"Capped at Max: Rs {max_cap:.2f}")
            base_freight = max_cap
    else:
        # Fallback flat
        base_freight = max(chargeable_wt * 6.5, 500.0)
        formula_parts.append(f"Standard fallback: Rs {base_freight:.2f}")

    # 4. Ancillaries
    ancillaries_applied = []
    total_ancillary = 0.0

    anc_rules = db.query(models.FreightAncillaryRule).filter(
        models.FreightAncillaryRule.contract_id == contract.id
    ).all()

    req_ancs = [a.upper() for a in (req.ancillaries_requested or [])]

    for a in anc_rules:
        # Include if mandatory or requested
        if a.is_mandatory or a.ancillary_type in req_ancs:
            amt = 0.0
            r_val = float(a.rate)
            if a.charge_basis == "FLAT":
                amt = r_val
            elif a.charge_basis == "PER_PACKAGE":
                amt = float(req.package_count) * r_val
            elif a.charge_basis == "PER_KG":
                amt = chargeable_wt * r_val
            elif a.charge_basis == "PERCENTAGE":
                amt = (float(req.declared_value or 0.0) * r_val) / 100.0
            elif a.charge_basis == "ACTUAL":
                amt = r_val # estimated nominal actual

            amt = round(amt, 2)
            total_ancillary += amt
            ancillaries_applied.append({
                "type": a.ancillary_type,
                "basis": a.charge_basis,
                "rate": r_val,
                "amount": amt,
                "condition": a.condition_text
            })
            formula_parts.append(f"+ {a.ancillary_type} (Rs {amt:.2f})")

    # 5. Total gross freight & rounding
    gross_total = base_freight + total_ancillary
    gross_total = round(gross_total) # Nearest rupee

    # 6. Recovery & logistics margin calculation
    rec_type = req.recovery_type or "SUBSIDY"
    rec_amount = 0.0

    if rec_type == "FULL_PASS_THROUGH":
        rec_amount = float(gross_total)
    elif rec_type == "FIXED":
        rec_amount = float(req.recovery_amount or 0.0)
    elif rec_type == "RATE_BASED":
        rec_amount = float(req.recovery_amount or 0.0)
    elif rec_type == "PERCENTAGE":
        rec_amount = (float(req.declared_value or 0.0) * float(req.recovery_amount or 1.0)) / 100.0
    elif rec_type == "NO_RECOVERY" or rec_type == "SUBSIDY":
        rec_amount = 0.0

    rec_amount = round(rec_amount, 2)
    subsidy_amount = round(max(gross_total - rec_amount, 0.0), 2)
    margin = round(rec_amount - gross_total, 2)

    full_formula = " ".join(formula_parts) + f" = Gross Rs {gross_total:.2f}"

    return {
        "success": True,
        "calculation": {
            "contract_id": str(contract.id),
            "contract_number": contract.contract_number,
            "transporter_name": contract.transporter_name,
            "chargeable_weight_kg": chargeable_wt,
            "base_freight": base_freight,
            "ancillary_charges": ancillaries_applied,
            "total_ancillary": total_ancillary,
            "gross_freight_cost": gross_total,
            "recovery_type": rec_type,
            "recovery_amount": rec_amount,
            "subsidy_amount": subsidy_amount,
            "logistics_margin": margin,
            "formula_text": full_formula,
            "is_admin_funded": True,
            "cost_bearer": "Admin Company (Platform)",
            "beneficiary": "Client Company",
            "currency": "INR"
        }
    }

@router.get("/events")
def list_cost_events(
    status: Optional[str] = None,
    consignment_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    List freight cost events with allocations, recoveries, and explainability snapshots.
    """
    query = db.query(models.FreightCostEvent).filter(
        models.FreightCostEvent.company_id == current_user.organization_id
    )
    if status:
        query = query.filter(models.FreightCostEvent.status == status)
    if consignment_id:
        query = query.filter(models.FreightCostEvent.consignment_id == uuid.UUID(consignment_id))

    events = query.order_by(desc(models.FreightCostEvent.created_at)).all()

    results = []
    for e in events:
        allocations = [
            {
                "id": str(a.id),
                "target_type": a.target_type,
                "target_number": a.target_number,
                "allocation_method": a.allocation_method,
                "allocated_amount": float(a.allocated_amount)
            }
            for a in e.allocations
        ]
        recoveries = [
            {
                "id": str(r.id),
                "recovery_type": r.recovery_type,
                "recovery_party_type": r.recovery_party_type,
                "recovery_party_name": r.recovery_party_name,
                "recovery_amount": float(r.recovery_amount),
                "subsidy_amount": float(r.subsidy_amount),
                "logistics_margin": float(r.logistics_margin),
                "status": r.status
            }
            for r in e.recoveries
        ]
        results.append({
            "id": str(e.id),
            "event_number": e.event_number,
            "consignment_id": str(e.consignment_id) if e.consignment_id else None,
            "cost_type": e.cost_type,
            "estimated_amount": float(e.estimated_amount),
            "actual_amount": float(e.actual_amount),
            "variance_amount": float(e.variance_amount),
            "currency": e.currency,
            "status": e.status,
            "is_admin_funded": e.is_admin_funded,
            "created_at": e.created_at.isoformat() if e.created_at else None,
            "allocations": allocations,
            "recoveries": recoveries
        })

    return {"success": True, "events": results}

@router.post("/events")
def create_cost_event(
    req: CostEventCreateRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Create a persistent Freight Cost Event with snapshot, document allocations, and recovery details.
    """
    company_id = current_user.organization_id
    event_no = generate_cost_event_number(db, company_id)

    event = models.FreightCostEvent(
        event_number=event_no,
        consignment_id=uuid.UUID(req.consignment_id) if req.consignment_id else None,
        company_id=company_id,
        beneficiary_company_id=company_id,
        cost_bearer_company_id=company_id,
        contract_id=uuid.UUID(req.contract_id) if req.contract_id else None,
        cost_type=req.cost_type,
        estimated_amount=Decimal(str(req.estimated_amount)),
        actual_amount=Decimal(str(req.actual_amount or req.estimated_amount)),
        variance_amount=Decimal(str((req.actual_amount or req.estimated_amount) - req.estimated_amount)),
        currency=req.currency,
        status="ESTIMATED" if req.actual_amount == 0 else "ACTUAL_RECEIVED",
        is_admin_funded=req.is_admin_funded
    )
    db.add(event)
    db.flush()

    # Snapshot
    if req.calculation_inputs or req.formula_text:
        snap = models.FreightCalculationSnapshot(
            cost_event_id=event.id,
            source_ref=event.event_number,
            rule_version="v2.0-DOC35",
            inputs_json=json.dumps(req.calculation_inputs or {}),
            outputs_json=json.dumps(req.calculation_outputs or {}),
            formula_text=req.formula_text or "Standard freight calculation formula"
        )
        db.add(snap)

    # Allocations
    if req.allocation_targets:
        total_amt = float(event.actual_amount or event.estimated_amount)
        cnt = len(req.allocation_targets)
        for t in req.allocation_targets:
            alloc_amt = round(total_amt / cnt, 2)
            alloc = models.FreightAllocation(
                cost_event_id=event.id,
                target_type=t.get("target_type", "INVOICE"),
                target_id=uuid.uuid4(),
                target_number=t.get("target_number", "DOC-PENDING"),
                allocation_method="EQUAL",
                allocated_ratio=Decimal(str(round(1.0 / cnt, 4))),
                allocated_amount=Decimal(str(alloc_amt))
            )
            db.add(alloc)

    # Recovery
    if req.recovery_data:
        rec_d = req.recovery_data
        rec_amt = float(rec_d.get("recovery_amount", 0.0))
        act_amt = float(event.actual_amount or event.estimated_amount)
        sub_amt = max(act_amt - rec_amt, 0.0)
        margin = rec_amt - act_amt

        rec = models.FreightRecovery(
            cost_event_id=event.id,
            recovery_type=rec_d.get("recovery_type", "SUBSIDY"),
            recovery_party_type=rec_d.get("recovery_party_type", "CUSTOMER"),
            recovery_party_name=rec_d.get("recovery_party_name", "Walk-in Party"),
            recovery_amount=Decimal(str(rec_amt)),
            subsidy_amount=Decimal(str(sub_amt)),
            logistics_margin=Decimal(str(margin)),
            status="BILLED" if rec_amt > 0 else "WAIVED"
        )
        db.add(rec)

    db.commit()
    return {"success": True, "message": "Freight Cost Event created", "event_id": str(event.id), "event_number": event.event_number}

@router.post("/allocate")
def allocate_freight_cost(
    req: AllocateCostRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Split freight cost across target invoices or challans with deterministic rounding residual handling.
    """
    event = db.query(models.FreightCostEvent).filter(
        models.FreightCostEvent.id == uuid.UUID(req.cost_event_id)
    ).first()
    if not event:
        raise HTTPException(status_code=404, detail="Cost event not found")

    total_amount = float(event.actual_amount or event.estimated_amount)
    if not req.targets:
        raise HTTPException(status_code=400, detail="At least one target document is required.")

    # Delete prior allocations for this event
    db.query(models.FreightAllocation).filter(
        models.FreightAllocation.cost_event_id == event.id
    ).delete()

    # Calculate proportional weights
    method = req.allocation_method
    ratios = []

    if method == "WEIGHT":
        total_wt = sum(max(t.weight or 1.0, 0.1) for t in req.targets)
        ratios = [max(t.weight or 1.0, 0.1) / total_wt for t in req.targets]
    elif method == "VALUE":
        total_val = sum(max(t.value or 1.0, 0.1) for t in req.targets)
        ratios = [max(t.value or 1.0, 0.1) / total_val for t in req.targets]
    elif method == "PACKAGE_COUNT":
        total_pkg = sum(max(t.package_count or 1, 1) for t in req.targets)
        ratios = [max(t.package_count or 1, 1) / total_pkg for t in req.targets]
    else: # EQUAL
        ratios = [1.0 / len(req.targets)] * len(req.targets)

    allocated_records = []
    running_total = Decimal("0.00")

    for i, t in enumerate(req.targets):
        is_last = (i == len(req.targets) - 1)
        ratio = ratios[i]

        if is_last:
            amt = Decimal(str(total_amount)) - running_total
        else:
            amt = Decimal(str(round(total_amount * ratio, 2)))
            running_total += amt

        alloc = models.FreightAllocation(
            cost_event_id=event.id,
            target_type=t.target_type,
            target_id=uuid.UUID(t.target_id) if t.target_id else uuid.uuid4(),
            target_number=t.target_number,
            allocation_method=method,
            allocated_ratio=Decimal(str(round(ratio, 4))),
            allocated_amount=amt
        )
        db.add(alloc)
        allocated_records.append({
            "target_number": t.target_number,
            "ratio": round(ratio, 4),
            "allocated_amount": float(amt)
        })

    db.commit()
    return {
        "success": True,
        "message": f"Successfully allocated Rs {total_amount:.2f} across {len(req.targets)} documents by {method}",
        "allocations": allocated_records
    }

@router.get("/reconciliation")
def list_reconciliations(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    List three-way transporter bill reconciliations with variance status tags.
    """
    recons = db.query(models.FreightReconciliation).order_by(
        desc(models.FreightReconciliation.created_at)
    ).all()

    results = []
    for r in recons:
        results.append({
            "id": str(r.id),
            "recon_number": r.recon_number,
            "transporter_name": r.transporter_name,
            "transporter_invoice_no": r.transporter_invoice_no,
            "transporter_invoice_date": r.transporter_invoice_date.isoformat() if r.transporter_invoice_date else None,
            "expected_amount": float(r.expected_amount),
            "billed_amount": float(r.billed_amount),
            "approved_amount": float(r.approved_amount),
            "variance_amount": float(r.variance_amount),
            "variance_status": r.variance_status,
            "dispute_reason": r.dispute_reason,
            "status": r.status,
            "created_at": r.created_at.isoformat() if r.created_at else None
        })

    return {"success": True, "reconciliations": results}

@router.post("/reconciliation")
def create_reconciliation(
    req: ReconciliationCreateRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Enter a transporter invoice to reconcile against system-expected costs.
    """
    recon_no = generate_recon_number(db)
    variance = req.billed_amount - req.expected_amount

    # Classify variance status
    if abs(variance) < 0.01:
        v_status = "MATCHED"
    elif abs(variance) <= 200.0:
        v_status = "TOLERABLE"
    else:
        v_status = "UNAPPROVED_EXCESS"

    recon = models.FreightReconciliation(
        recon_number=recon_no,
        transporter_name=req.transporter_name,
        transporter_invoice_no=req.transporter_invoice_no,
        transporter_invoice_date=datetime.utcnow(),
        expected_amount=Decimal(str(req.expected_amount)),
        billed_amount=Decimal(str(req.billed_amount)),
        approved_amount=Decimal(str(req.expected_amount if v_status != "MATCHED" else req.billed_amount)),
        variance_amount=Decimal(str(variance)),
        variance_status=v_status,
        dispute_reason=req.dispute_reason,
        status="RECONCILED" if v_status == "MATCHED" else "SUBMITTED"
    )
    db.add(recon)
    db.commit()
    return {"success": True, "message": "Reconciliation statement created", "recon_number": recon.recon_number, "variance_status": v_status}

@router.post("/reconciliation/{recon_id}/action")
def update_reconciliation_action(
    recon_id: str,
    req: ReconciliationActionRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Approve variance, register dispute, or post approved transporter cost to GL.
    """
    recon = db.query(models.FreightReconciliation).filter(
        models.FreightReconciliation.id == uuid.UUID(recon_id)
    ).first()
    if not recon:
        raise HTTPException(status_code=404, detail="Reconciliation statement not found")

    if req.action == "APPROVE":
        recon.approved_amount = Decimal(str(req.approved_amount or recon.billed_amount))
        recon.variance_status = "MATCHED"
        recon.status = "RECONCILED"
        recon.approved_by_id = current_user.id
    elif req.action == "DISPUTE":
        recon.variance_status = "DISPUTED"
        recon.status = "DISPUTED"
        recon.dispute_reason = req.dispute_reason or "Transporter billed in excess of contracted rate card."
    elif req.action == "POST_TO_GL":
        recon.status = "POSTED"
    elif req.action == "RESOLVE":
        recon.status = "RECONCILED"
        recon.variance_status = "RESOLVED"

    db.commit()
    return {"success": True, "message": f"Reconciliation action '{req.action}' applied successfully", "status": recon.status}

@router.get("/policies")
def get_freight_policies(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Get active freight cost-bearer policy (DOC-35).
    """
    policy = db.query(models.FreightCostBearerPolicy).first()
    return {
        "success": True,
        "policy": {
            "scope_type": policy.scope_type if policy else "GLOBAL",
            "bearer_type": policy.bearer_type if policy else "ADMIN_COMPANY",
            "is_recharge_enabled": policy.is_recharge_enabled if policy else False,
            "description": "Platform Admin bears freight expense (Account 5200); Client Company General Ledger has 0 auto-debits."
        }
    }
