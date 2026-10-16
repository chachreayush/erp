import uuid
import json
import hashlib
from datetime import datetime, timedelta
from decimal import Decimal
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified
from sqlalchemy import desc, asc, func, or_
from pydantic import BaseModel, Field

from database import get_db
import models
from auth.router import get_current_user

router = APIRouter(prefix="", tags=["Principal Commission & Recovery Engine (DOC-37)"])

# ─────────────────────────────────────────────────────────────
# Pydantic Schemas
# ─────────────────────────────────────────────────────────────

class CommissionCalculateRequest(BaseModel):
    principal_id: uuid.UUID
    event_type: str = "SALES_BILL" # SALES_BILL, SALES_RETURN, FREIGHT_COST, STORAGE_CHARGE, LOADING_CHARGE, GODOWN_RENT, STAFF_SALARY
    source_doc_type: str = "INVOICE" # INVOICE, RETURN, FREIGHT_EVENT, CONSIGNMENT, VOUCHER
    source_doc_id: str
    base_value: float = 100000.0
    quantity: Optional[float] = 1.0
    category: Optional[str] = None # EARNED_COMMISSION, RECOVERABLE_EXPENSE, SERVICE_FEE
    custom_rate: Optional[float] = None
    rule_id: Optional[uuid.UUID] = None
    description: Optional[str] = None
    client_id: Optional[uuid.UUID] = None
    client_name: Optional[str] = None
    custom_salary_amount: Optional[float] = None
    custom_rent_amount: Optional[float] = None

class AgreementDealTermsUpdate(BaseModel):
    agreement_type: Optional[str] = "CF_CONSIGNMENT_AGENT"
    cargo_expense_borne_by: Optional[str] = "PRINCIPAL" # PRINCIPAL, DISTRIBUTOR
    staff_salary_borne_by: Optional[str] = "PRINCIPAL" # PRINCIPAL, DISTRIBUTOR
    godown_storage_borne_by: Optional[str] = "PRINCIPAL" # PRINCIPAL, DISTRIBUTOR
    default_monthly_staff_salary: Optional[float] = 25000.0
    default_monthly_godown_rent: Optional[float] = 15000.0
    sales_commission_rate: Optional[float] = 5.0

class CalculationActionRequest(BaseModel):
    action: str # APPROVE, DISPUTE, ADJUST, CANCEL
    delta_amount: Optional[float] = 0.0
    reason: Optional[str] = None

class RecoveryClaimLineInput(BaseModel):
    calc_id: Optional[uuid.UUID] = None
    source_doc_type: str = "INVOICE"
    source_doc_id: str
    line_description: str
    requested_amount: float

class RecoveryClaimCreateRequest(BaseModel):
    principal_id: uuid.UUID
    period_from: Optional[str] = None
    period_to: Optional[str] = None
    calc_ids: Optional[List[uuid.UUID]] = []
    lines: Optional[List[RecoveryClaimLineInput]] = []
    notes: Optional[str] = None

class ClaimActionRequest(BaseModel):
    action: str # SUBMIT, APPROVE, DISPUTE, CREATE_DOCUMENT, SETTLE, REJECT
    approved_amount: Optional[float] = None
    disputed_amount: Optional[float] = None
    document_type: Optional[str] = "SERVICE_INVOICE" # SERVICE_INVOICE, DEBIT_NOTE, CREDIT_NOTE
    notes: Optional[str] = None

class StatementGenerateRequest(BaseModel):
    principal_id: uuid.UUID
    period_from: Optional[str] = None
    period_to: Optional[str] = None

class GenerateClientCommissionBillRequest(BaseModel):
    client_org_id: uuid.UUID
    period_from: Optional[str] = None
    period_to: Optional[str] = None
    sales_turnover: float
    commission_rate_percent: float = 5.0
    commission_amount: float
    godown_rent_amount: float = 0.0
    staff_salary_amount: float = 0.0
    freight_reimbursement_amount: float = 0.0
    handling_charges_amount: float = 0.0
    other_expenses_amount: float = 0.0
    tax_rate_percent: float = 18.0
    remarks: Optional[str] = None
    due_days: Optional[int] = 15
    auto_post_client_purchase: bool = True

# ─────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────

def generate_calculation_number(db: Session, prefix: str = "CALC") -> str:
    year = datetime.utcnow().year
    full_prefix = f"{prefix}-{year}-"
    all_calcs = db.query(models.CommissionCalculation.calculation_number).filter(
        models.CommissionCalculation.calculation_number.like(f"{full_prefix}%")
    ).all()
    max_num = 0
    for (c_num,) in all_calcs:
        try:
            num = int(c_num.split("-")[-1])
            if num > max_num:
                max_num = num
        except Exception:
            pass
    return f"{full_prefix}{str(max_num + 1).zfill(4)}"

def generate_claim_number(db: Session) -> str:
    year = datetime.utcnow().year
    prefix = f"CLM-REC-{year}-"
    all_claims = db.query(models.RecoveryClaim.claim_number).filter(
        models.RecoveryClaim.claim_number.like(f"{prefix}%")
    ).all()
    max_num = 0
    for (c_num,) in all_claims:
        try:
            num = int(c_num.split("-")[-1])
            if num > max_num:
                max_num = num
        except Exception:
            pass
    return f"{prefix}{str(max_num + 1).zfill(3)}"

def generate_statement_number(db: Session) -> str:
    year = datetime.utcnow().year
    prefix = f"REC-STM-{year}-"
    all_stmts = db.query(models.RecoveryStatement.statement_number).filter(
        models.RecoveryStatement.statement_number.like(f"{prefix}%")
    ).all()
    max_num = 0
    for (s_num,) in all_stmts:
        try:
            num = int(s_num.split("-")[-1])
            if num > max_num:
                max_num = num
        except Exception:
            pass
    return f"{prefix}{str(max_num + 1).zfill(3)}"

# ─────────────────────────────────────────────────────────────
# Endpoints
# ─────────────────────────────────────────────────────────────

@router.get("/summary")
def get_commission_summary(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Returns executive summary KPIs for DOC-37 Principal Commission & Recovery Engine.
    """
    company_id = current_user.organization_id

    # 1. Total Earned Commission (Active / Non-cancelled calculations)
    earned_comm_query = db.query(func.coalesce(func.sum(models.CommissionCalculation.calculated_amount), 0)).filter(
        models.CommissionCalculation.category == "EARNED_COMMISSION",
        models.CommissionCalculation.state.notin_(["CANCELLED", "DISPUTED"])
    )
    total_earned_commission = float(earned_comm_query.scalar() or 0.0)

    # 2. Total Recoverable Expenses
    recoverable_query = db.query(func.coalesce(func.sum(models.CommissionCalculation.calculated_amount), 0)).filter(
        models.CommissionCalculation.category == "RECOVERABLE_EXPENSE",
        models.CommissionCalculation.state.notin_(["CANCELLED", "DISPUTED"])
    )
    total_recoverable_expenses = float(recoverable_query.scalar() or 0.0)

    # 3. Net Commercial Total
    net_commercial_total = round(total_earned_commission + total_recoverable_expenses, 2)

    # 4. Open Claims
    open_claims = db.query(models.RecoveryClaim).filter(
        models.RecoveryClaim.status.in_(["DRAFT", "READY", "SUBMITTED", "ACKNOWLEDGED"])
    ).all()
    open_claims_count = len(open_claims)
    open_claims_amount = float(sum(c.total_claimed_amount for c in open_claims))

    # 5. Approved Claims
    approved_claims = db.query(models.RecoveryClaim).filter(
        models.RecoveryClaim.status.in_(["APPROVED", "PARTIALLY_APPROVED", "SETTLED"])
    ).all()
    approved_claims_count = len(approved_claims)
    approved_claims_amount = float(sum(c.approved_amount for c in approved_claims))

    # 6. Disputed Total
    disputed_calcs = db.query(func.coalesce(func.sum(models.CommissionCalculation.calculated_amount), 0)).filter(
        models.CommissionCalculation.state == "DISPUTED"
    ).scalar() or 0.0
    disputed_claims = db.query(func.coalesce(func.sum(models.RecoveryClaim.disputed_amount), 0)).scalar() or 0.0
    total_disputed_amount = round(float(disputed_calcs) + float(disputed_claims), 2)

    # 7. Active Agreements
    active_agreements_count = db.query(models.PrincipalCommissionAgreement).filter(
        models.PrincipalCommissionAgreement.status == "ACTIVE"
    ).count()

    # 8. Exceptions & Audits
    open_exceptions_count = db.query(models.CommissionException).filter(
        models.CommissionException.state == "OPEN"
    ).count()

    # 9. Statements Summary
    statements = db.query(models.RecoveryStatement).all()
    total_settled = float(sum(s.settled_total for s in statements))
    total_outstanding = float(sum(s.outstanding_balance for s in statements))

    return {
        "status": "success",
        "data": {
            "total_earned_commission": total_earned_commission,
            "total_recoverable_expenses": total_recoverable_expenses,
            "net_commercial_total": net_commercial_total,
            "open_claims_count": open_claims_count,
            "open_claims_amount": open_claims_amount,
            "approved_claims_count": approved_claims_count,
            "approved_claims_amount": approved_claims_amount,
            "total_disputed_amount": total_disputed_amount,
            "active_agreements_count": active_agreements_count,
            "open_exceptions_count": open_exceptions_count,
            "total_settled": total_settled,
            "total_outstanding": total_outstanding,
            "as_of": datetime.utcnow().isoformat()
        }
    }


@router.get("/agreements")
def list_agreements(
    principal_id: Optional[uuid.UUID] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    List Principal Commission Agreements with rules and scopes.
    """
    query = db.query(models.PrincipalCommissionAgreement)
    if principal_id:
        query = query.filter(models.PrincipalCommissionAgreement.principal_id == principal_id)
    if status:
        query = query.filter(models.PrincipalCommissionAgreement.status == status)

    agreements = query.order_by(models.PrincipalCommissionAgreement.principal_name).all()

    result = []
    for agr in agreements:
        rules = db.query(models.CommissionRule).filter(
            models.CommissionRule.agreement_id == agr.id
        ).order_by(models.CommissionRule.priority).all()

        rules_data = []
        for r in rules:
            scopes = db.query(models.CommissionScope).filter(
                models.CommissionScope.rule_id == r.id
            ).all()
            rules_data.append({
                "id": str(r.id),
                "rule_code": r.rule_code,
                "rule_name": r.rule_name,
                "priority": r.priority,
                "rule_type": r.rule_type,
                "rate_pct": float(r.rate_pct) if r.rate_pct else 0.0,
                "unit_rate": float(r.unit_rate) if r.unit_rate else 0.0,
                "fixed_amount": float(r.fixed_amount) if r.fixed_amount else 0.0,
                "min_guarantee_amount": float(r.min_guarantee_amount) if r.min_guarantee_amount else 0.0,
                "formula_config": r.formula_config,
                "status": r.status,
                "scopes": [
                    {
                        "id": str(sc.id),
                        "product_scope": sc.product_scope,
                        "customer_scope": sc.customer_scope,
                        "territory_scope": sc.territory_scope
                    } for sc in scopes
                ]
            })

        result.append({
            "id": str(agr.id),
            "principal_id": str(agr.principal_id),
            "principal_code": agr.principal_code,
            "principal_name": agr.principal_name,
            "agreement_code": agr.agreement_code,
            "version_no": agr.version_no,
            "valid_from": agr.valid_from.isoformat() if agr.valid_from else None,
            "valid_to": agr.valid_to.isoformat() if agr.valid_to else None,
            "status": agr.status,
            "terms_json": agr.terms_json,
            "rules": rules_data
        })

    return {"status": "success", "count": len(result), "data": result}


@router.put("/agreements/{agreement_id}/deal-terms")
def update_agreement_deal_terms(
    agreement_id: uuid.UUID,
    payload: AgreementDealTermsUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    agr = db.query(models.PrincipalCommissionAgreement).filter(
        models.PrincipalCommissionAgreement.id == agreement_id
    ).first()
    if not agr:
        raise HTTPException(status_code=404, detail="Agreement not found")

    terms = dict(agr.terms_json or {})
    terms["agreement_type"] = payload.agreement_type or "CF_CONSIGNMENT_AGENT"
    reimb = dict(terms.get("reimbursement_terms", {}) or {})
    reimb["cargo_expenses"] = {
        "borne_by": payload.cargo_expense_borne_by,
        "reimbursable": payload.cargo_expense_borne_by == "PRINCIPAL"
    }
    reimb["staff_salaries"] = {
        "borne_by": payload.staff_salary_borne_by,
        "reimbursable": payload.staff_salary_borne_by == "PRINCIPAL",
        "monthly_budget": payload.default_monthly_staff_salary
    }
    reimb["godown_storage"] = {
        "borne_by": payload.godown_storage_borne_by,
        "reimbursable": payload.godown_storage_borne_by == "PRINCIPAL",
        "monthly_rent": payload.default_monthly_godown_rent
    }
    reimb["sales_commission"] = {
        "rate_pct": payload.sales_commission_rate
    }
    terms["reimbursement_terms"] = reimb
    agr.terms_json = terms
    flag_modified(agr, "terms_json")
    db.commit()
    db.refresh(agr)
    return {"status": "success", "message": "C&F deal terms updated successfully", "data": agr.terms_json}


@router.post("/calculate")
def execute_commission_calculation(
    payload: CommissionCalculateRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Executes on-the-fly commission calculation or recoverable expense simulation.
    Persists deterministic CommissionCalculation with SHA-256 hash.
    """
    company_id = current_user.organization_id

    # 1. Look up active agreement
    agr = db.query(models.PrincipalCommissionAgreement).filter(
        models.PrincipalCommissionAgreement.principal_id == payload.principal_id,
        models.PrincipalCommissionAgreement.status == "ACTIVE"
    ).first()

    if not agr:
        # Check context
        ctx = db.query(models.PrincipalOperatingContext).filter(
            models.PrincipalOperatingContext.principal_id == payload.principal_id
        ).first()
        principal_name = ctx.principal_name if ctx else "Standard Principal"
        rate = payload.custom_rate if payload.custom_rate is not None else 5.0
        rule_desc = f"Ad-hoc Rule ({rate}%)"
    else:
        principal_name = agr.principal_name
        # Match rule
        if payload.rule_id:
            rule = db.query(models.CommissionRule).filter(models.CommissionRule.id == payload.rule_id).first()
        else:
            rule = db.query(models.CommissionRule).filter(
                models.CommissionRule.agreement_id == agr.id,
                models.CommissionRule.status == "ACTIVE"
            ).order_by(models.CommissionRule.priority).first()

        if rule:
            if rule.rule_type == "PERCENTAGE":
                rate = float(rule.rate_pct)
                rule_desc = f"{rule.rule_name} ({rate}%)"
            elif rule.rule_type == "PER_UNIT":
                rate = float(rule.unit_rate)
                rule_desc = f"{rule.rule_name} (₹{rate}/unit)"
            else:
                rate = float(rule.rate_pct or 5.0)
                rule_desc = f"{rule.rule_name}"
        else:
            rate = payload.custom_rate if payload.custom_rate is not None else 5.0
            rule_desc = f"Default fallback rate ({rate}%)"

    # Determine category and calculate amount based on C&F event type
    base_val = payload.base_value
    qty = payload.quantity or 1.0

    if payload.event_type == "GODOWN_RENT":
        category = "RECOVERABLE_EXPENSE"
        rent_terms = (agr.terms_json or {}).get("reimbursement_terms", {}).get("godown_storage", {}) if agr else {}
        calc_amount = payload.custom_rent_amount if payload.custom_rent_amount is not None else float(rent_terms.get("monthly_rent", payload.base_value))
        trace = f"C&F Godown & Storage Services Reimbursement: ₹{calc_amount:.2f} (Agreement Deal Terms)"
    elif payload.event_type == "STAFF_SALARY":
        category = "RECOVERABLE_EXPENSE"
        salary_terms = (agr.terms_json or {}).get("reimbursement_terms", {}).get("staff_salaries", {}) if agr else {}
        calc_amount = payload.custom_salary_amount if payload.custom_salary_amount is not None else float(salary_terms.get("monthly_budget", payload.base_value))
        trace = f"C&F Dedicated Staff & Field Employee Salaries: ₹{calc_amount:.2f} (Agreement Deal Terms / Monthly Allocation)"
    elif payload.event_type == "FREIGHT_COST":
        category = "RECOVERABLE_EXPENSE"
        calc_amount = round(base_val, 2)
        trace = f"Formula: 100% C&F Inward/Outward Transportation Recharge = ₹{calc_amount:.2f} ({payload.description or 'Freight LR Cost'})"
    elif payload.event_type in ["STORAGE_CHARGE", "LOADING_CHARGE"]:
        category = "RECOVERABLE_EXPENSE"
        if qty > 1.0:
            calc_amount = round(qty * rate, 2)
            trace = f"Formula: {qty} units * ₹{rate:.2f} = ₹{calc_amount:.2f} ({rule_desc})"
        else:
            calc_amount = round(base_val, 2)
            trace = f"Formula: 100% Recharge of Verified Cost = ₹{calc_amount:.2f} ({payload.description or rule_desc})"
    else: # SALES_BILL, SALES_RETURN, etc.
        category = payload.category or "EARNED_COMMISSION"
        calc_amount = round((base_val * rate) / 100.0, 2)
        client_str = f"Client: {payload.client_name} - " if payload.client_name else ""
        trace = f"Formula: {client_str}₹{base_val:.2f} * {rate:.2f}% = ₹{calc_amount:.2f} ({rule_desc})"

    # Create Event
    idempotency = f"EVT-{payload.source_doc_type}-{payload.source_doc_id}-{uuid.uuid4().hex[:6]}"
    evt = models.CommissionEvent(
        id=uuid.uuid4(),
        company_id=company_id,
        principal_id=payload.principal_id,
        event_type=payload.event_type,
        event_date=datetime.utcnow(),
        source_doc_type=payload.source_doc_type,
        source_doc_id=payload.source_doc_id,
        idempotency_key=idempotency,
        payload_json={"base_value": base_val, "qty": qty, "rate": rate, "client_id": str(payload.client_id) if payload.client_id else None}
    )
    db.add(evt)
    db.flush()

    # Create Measure
    measure = models.CommissionMeasure(
        id=uuid.uuid4(),
        event_id=evt.id,
        measure_type="NET_SALES_VALUE" if category == "EARNED_COMMISSION" else "EXPENSE_BASE",
        base_amount=base_val,
        base_quantity=qty,
        uom="INR"
    )
    db.add(measure)

    # Create Calculation
    calc_num = generate_calculation_number(db)
    raw_hash_str = f"{calc_num}:{base_val}:{rate}:{calc_amount}:{evt.id}"
    sha_hash = hashlib.sha256(raw_hash_str.encode("utf-8")).hexdigest()

    calc = models.CommissionCalculation(
        id=uuid.uuid4(),
        calculation_number=calc_num,
        event_id=evt.id,
        rule_id=rule.id if 'rule' in locals() and rule else None,
        principal_id=payload.principal_id,
        principal_name=principal_name,
        category=category,
        event_type=payload.event_type,
        client_id=payload.client_id,
        client_name=payload.client_name,
        base_value=base_val,
        rate_applied=rate,
        calculated_amount=calc_amount,
        formula_trace=trace,
        state="CALCULATED",
        sha256_hash=sha_hash,
        created_at=datetime.utcnow()
    )
    db.add(calc)

    # Audit log
    audit = models.CommissionAudit(
        id=uuid.uuid4(),
        company_id=company_id,
        object_type="CALCULATION",
        object_id=calc_num,
        action="CALCULATE",
        actor_username=current_user.username if hasattr(current_user, "username") else "admin",
        after_hash=sha_hash,
        details_json={"event_id": str(evt.id), "amount": calc_amount, "category": category, "event_type": payload.event_type}
    )
    db.add(audit)

    db.commit()

    return {
        "status": "success",
        "message": f"Calculation {calc_num} executed successfully",
        "data": {
            "id": str(calc.id),
            "calculation_number": calc.calculation_number,
            "principal_name": calc.principal_name,
            "category": calc.category,
            "event_type": calc.event_type,
            "client_id": str(calc.client_id) if calc.client_id else None,
            "client_name": calc.client_name,
            "base_value": float(calc.base_value),
            "rate_applied": float(calc.rate_applied),
            "calculated_amount": float(calc.calculated_amount),
            "formula_trace": calc.formula_trace,
            "state": calc.state,
            "sha256_hash": calc.sha256_hash,
            "created_at": calc.created_at.isoformat()
        }
    }


@router.get("/calculations")
def list_calculations(
    principal_id: Optional[uuid.UUID] = None,
    category: Optional[str] = None,
    state: Optional[str] = None,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    List calculations with optional filtering.
    """
    query = db.query(models.CommissionCalculation)
    if principal_id:
        query = query.filter(models.CommissionCalculation.principal_id == principal_id)
    if category:
        query = query.filter(models.CommissionCalculation.category == category)
    if state:
        query = query.filter(models.CommissionCalculation.state == state)

    calcs = query.order_by(desc(models.CommissionCalculation.created_at)).limit(limit).all()

    result = []
    for c in calcs:
        result.append({
            "id": str(c.id),
            "calculation_number": c.calculation_number,
            "principal_id": str(c.principal_id),
            "principal_name": c.principal_name,
            "category": c.category,
            "event_type": c.event_type,
            "client_id": str(c.client_id) if c.client_id else None,
            "client_name": c.client_name,
            "base_value": float(c.base_value),
            "rate_applied": float(c.rate_applied),
            "calculated_amount": float(c.calculated_amount),
            "currency": c.currency,
            "formula_trace": c.formula_trace,
            "state": c.state,
            "sha256_hash": c.sha256_hash,
            "created_at": c.created_at.isoformat()
        })

    return {"status": "success", "count": len(result), "data": result}


@router.post("/calculations/{calc_id}/action")
def update_calculation_state(
    calc_id: uuid.UUID,
    payload: CalculationActionRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Actions on calculation: APPROVE, DISPUTE, ADJUST, CANCEL.
    """
    calc = db.query(models.CommissionCalculation).filter(
        models.CommissionCalculation.id == calc_id
    ).first()
    if not calc:
        raise HTTPException(status_code=404, detail="Commission calculation not found")

    old_state = calc.state
    before_hash = calc.sha256_hash

    if payload.action == "APPROVE":
        calc.state = "APPROVED"
    elif payload.action == "DISPUTE":
        calc.state = "DISPUTED"
    elif payload.action == "CANCEL":
        calc.state = "CANCELLED"
    elif payload.action == "ADJUST":
        delta = Decimal(str(payload.delta_amount or 0.0))
        calc.calculated_amount = Decimal(str(calc.calculated_amount)) + delta
        calc.formula_trace = f"{calc.formula_trace} | Adjusted by ₹{float(delta):.2f}: {payload.reason or 'Manual adjustment'}"
        calc.state = "APPROVED"

        adj = models.CommissionAdjustment(
            id=uuid.uuid4(),
            original_calc_id=calc.id,
            delta_amount=delta,
            reason_code=payload.reason or "MANUAL_ADJUSTMENT",
            description=f"Adjusted by {current_user.username if hasattr(current_user, 'username') else 'admin'}"
        )
        db.add(adj)

    # Recompute hash
    raw_hash_str = f"{calc.calculation_number}:{calc.base_value}:{calc.rate_applied}:{calc.calculated_amount}:{calc.state}"
    calc.sha256_hash = hashlib.sha256(raw_hash_str.encode("utf-8")).hexdigest()

    audit = models.CommissionAudit(
        id=uuid.uuid4(),
        company_id=current_user.organization_id,
        object_type="CALCULATION",
        object_id=calc.calculation_number,
        action=payload.action,
        actor_username=current_user.username if hasattr(current_user, "username") else "admin",
        before_hash=before_hash,
        after_hash=calc.sha256_hash,
        details_json={"old_state": old_state, "new_state": calc.state, "delta": payload.delta_amount}
    )
    db.add(audit)
    db.commit()

    return {
        "status": "success",
        "message": f"Calculation {calc.calculation_number} updated to {calc.state}",
        "data": {
            "id": str(calc.id),
            "calculation_number": calc.calculation_number,
            "calculated_amount": float(calc.calculated_amount),
            "state": calc.state,
            "sha256_hash": calc.sha256_hash
        }
    }


@router.get("/claims")
def list_claims(
    principal_id: Optional[uuid.UUID] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    List Recovery Claims with claim lines and linked documents.
    """
    query = db.query(models.RecoveryClaim)
    if principal_id:
        query = query.filter(models.RecoveryClaim.principal_id == principal_id)
    if status:
        query = query.filter(models.RecoveryClaim.status == status)

    claims = query.order_by(desc(models.RecoveryClaim.created_at)).all()

    result = []
    for clm in claims:
        lines = db.query(models.RecoveryClaimLine).filter(
            models.RecoveryClaimLine.claim_id == clm.id
        ).all()
        docs = db.query(models.RecoveryDocumentLink).filter(
            models.RecoveryDocumentLink.claim_id == clm.id
        ).all()

        result.append({
            "id": str(clm.id),
            "claim_number": clm.claim_number,
            "principal_id": str(clm.principal_id),
            "principal_name": clm.principal_name,
            "period_from": clm.period_from.isoformat() if clm.period_from else None,
            "period_to": clm.period_to.isoformat() if clm.period_to else None,
            "total_earned_commission": float(clm.total_earned_commission),
            "total_recoverable_expenses": float(clm.total_recoverable_expenses),
            "total_claimed_amount": float(clm.total_claimed_amount),
            "approved_amount": float(clm.approved_amount),
            "disputed_amount": float(clm.disputed_amount),
            "status": clm.status,
            "submitted_at": clm.submitted_at.isoformat() if clm.submitted_at else None,
            "approved_at": clm.approved_at.isoformat() if clm.approved_at else None,
            "created_at": clm.created_at.isoformat(),
            "lines": [
                {
                    "id": str(l.id),
                    "calc_id": str(l.calc_id) if l.calc_id else None,
                    "source_doc_type": l.source_doc_type,
                    "source_doc_id": l.source_doc_id,
                    "line_description": l.line_description,
                    "requested_amount": float(l.requested_amount),
                    "approved_amount": float(l.approved_amount),
                    "disputed_amount": float(l.disputed_amount),
                    "status": l.status
                } for l in lines
            ],
            "linked_documents": [
                {
                    "id": str(d.id),
                    "document_type": d.document_type,
                    "document_number": d.document_number,
                    "amount": float(d.amount),
                    "linked_at": d.linked_at.isoformat()
                } for d in docs
            ]
        })

    return {"status": "success", "count": len(result), "data": result}


@router.post("/claims")
def create_recovery_claim(
    payload: RecoveryClaimCreateRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Creates a new Recovery Claim batching calculations or direct claim lines.
    """
    company_id = current_user.organization_id

    # Principal lookup
    agr = db.query(models.PrincipalCommissionAgreement).filter(
        models.PrincipalCommissionAgreement.principal_id == payload.principal_id
    ).first()
    if agr:
        principal_name = agr.principal_name
    else:
        ctx = db.query(models.PrincipalOperatingContext).filter(
            models.PrincipalOperatingContext.principal_id == payload.principal_id
        ).first()
        principal_name = ctx.principal_name if ctx else "Principal Partner"

    p_from = datetime.fromisoformat(payload.period_from) if payload.period_from else (datetime.utcnow() - timedelta(days=30))
    p_to = datetime.fromisoformat(payload.period_to) if payload.period_to else datetime.utcnow()

    claim_num = generate_claim_number(db)

    # Initialize claim
    claim = models.RecoveryClaim(
        id=uuid.uuid4(),
        claim_number=claim_num,
        company_id=company_id,
        principal_id=payload.principal_id,
        principal_name=principal_name,
        period_from=p_from,
        period_to=p_to,
        total_earned_commission=0.0,
        total_recoverable_expenses=0.0,
        total_claimed_amount=0.0,
        approved_amount=0.0,
        disputed_amount=0.0,
        status="DRAFT",
        created_at=datetime.utcnow()
    )
    db.add(claim)
    db.flush()

    earned = Decimal("0.0")
    recoverable = Decimal("0.0")

    # Add lines from calc_ids
    if payload.calc_ids:
        calcs = db.query(models.CommissionCalculation).filter(
            models.CommissionCalculation.id.in_(payload.calc_ids)
        ).all()
        for c in calcs:
            amt = Decimal(str(c.calculated_amount))
            if c.category == "EARNED_COMMISSION":
                earned += amt
            else:
                recoverable += amt

            line = models.RecoveryClaimLine(
                id=uuid.uuid4(),
                claim_id=claim.id,
                calc_id=c.id,
                source_doc_type="CALCULATION",
                source_doc_id=c.calculation_number,
                line_description=f"{c.category}: {c.formula_trace[:80] if c.formula_trace else c.calculation_number}",
                requested_amount=amt,
                approved_amount=0.0,
                disputed_amount=0.0,
                status="PENDING"
            )
            db.add(line)
            c.state = "BATCHED"

    # Add custom lines
    if payload.lines:
        for l in payload.lines:
            amt = Decimal(str(l.requested_amount))
            recoverable += amt
            line = models.RecoveryClaimLine(
                id=uuid.uuid4(),
                claim_id=claim.id,
                calc_id=l.calc_id,
                source_doc_type=l.source_doc_type,
                source_doc_id=l.source_doc_id,
                line_description=l.line_description,
                requested_amount=amt,
                approved_amount=0.0,
                disputed_amount=0.0,
                status="PENDING"
            )
            db.add(line)

    claim.total_earned_commission = earned
    claim.total_recoverable_expenses = recoverable
    claim.total_claimed_amount = earned + recoverable

    # Audit log
    audit = models.CommissionAudit(
        id=uuid.uuid4(),
        company_id=company_id,
        object_type="CLAIM",
        object_id=claim.claim_number,
        action="CREATE",
        actor_username=current_user.username if hasattr(current_user, "username") else "admin",
        after_hash=hashlib.sha256(f"{claim.claim_number}:{claim.total_claimed_amount}".encode("utf-8")).hexdigest(),
        details_json={"earned": float(earned), "recoverable": float(recoverable)}
    )
    db.add(audit)

    db.commit()

    return {
        "status": "success",
        "message": f"Recovery claim {claim_num} created successfully",
        "data": {
            "id": str(claim.id),
            "claim_number": claim.claim_number,
            "principal_name": claim.principal_name,
            "total_claimed_amount": float(claim.total_claimed_amount),
            "status": claim.status
        }
    }


@router.post("/claims/{claim_id}/action")
def update_claim_action(
    claim_id: uuid.UUID,
    payload: ClaimActionRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Actions on Recovery Claim: SUBMIT, APPROVE, DISPUTE, CREATE_DOCUMENT, SETTLE, REJECT.
    """
    claim = db.query(models.RecoveryClaim).filter(models.RecoveryClaim.id == claim_id).first()
    if not claim:
        raise HTTPException(status_code=404, detail="Recovery claim not found")

    old_status = claim.status

    if payload.action == "SUBMIT":
        claim.status = "SUBMITTED"
        claim.submitted_at = datetime.utcnow()

    elif payload.action == "APPROVE":
        approved = Decimal(str(payload.approved_amount if payload.approved_amount is not None else claim.total_claimed_amount))
        claim.approved_amount = approved
        claim.disputed_amount = Decimal(str(claim.total_claimed_amount)) - approved
        claim.status = "APPROVED" if claim.disputed_amount <= 0 else "PARTIALLY_APPROVED"
        claim.approved_at = datetime.utcnow()

        # Update lines
        lines = db.query(models.RecoveryClaimLine).filter(models.RecoveryClaimLine.claim_id == claim.id).all()
        for l in lines:
            l.approved_amount = l.requested_amount
            l.status = "APPROVED"

    elif payload.action == "DISPUTE":
        disputed = Decimal(str(payload.disputed_amount if payload.disputed_amount is not None else claim.total_claimed_amount))
        claim.disputed_amount = disputed
        claim.status = "DISPUTED"

    elif payload.action == "CREATE_DOCUMENT":
        # Create linked service invoice or debit note
        doc_type = payload.document_type or "SERVICE_INVOICE"
        doc_prefix = "SINV" if doc_type == "SERVICE_INVOICE" else "DN"
        doc_number = f"{doc_prefix}-{datetime.utcnow().year}-{str(uuid.uuid4().int)[:4]}"
        amt = claim.approved_amount if claim.approved_amount > 0 else claim.total_claimed_amount

        doc_link = models.RecoveryDocumentLink(
            id=uuid.uuid4(),
            claim_id=claim.id,
            document_type=doc_type,
            document_number=doc_number,
            amount=amt,
            linked_at=datetime.utcnow()
        )
        db.add(doc_link)

        # ── DUAL POSTING: Inward Purchase Bill for Principal in Purchase Section ──
        principal_ledger = db.query(models.Ledger).filter(
            models.Ledger.name.ilike(f"%{claim.principal_name}%")
        ).first()
        if not principal_ledger:
            principal_ledger = db.query(models.Ledger).filter(
                models.Ledger.name.ilike("%Supplier%")
            ).first()

        pur_bill_no = f"PUR-SRV-{datetime.utcnow().year}-{str(uuid.uuid4().int)[:4]}"
        pur_invoice = models.Invoice(
            id=uuid.uuid4(),
            organization_id=current_user.organization_id,
            invoice_type="purchase-bill",
            invoice_number=pur_bill_no,
            date=datetime.utcnow(),
            customer_name=claim.principal_name,
            party_id=principal_ledger.id if principal_ledger else None,
            party_inv_no=doc_number,
            party_inv_date=datetime.utcnow().strftime("%Y-%m-%d"),
            remarks=f"C&F Consigning Agent Commission & Reimbursed Expenses - Claim {claim.claim_number}",
            subtotal=amt,
            tax_total=0.0,
            grand_total=amt,
            is_active=True
        )
        db.add(pur_invoice)
        db.flush()

        # Itemize lines from claim
        lines = db.query(models.RecoveryClaimLine).filter(models.RecoveryClaimLine.claim_id == claim.id).all()
        if lines:
            for l in lines:
                item = models.InvoiceItem(
                    id=uuid.uuid4(),
                    invoice_id=pur_invoice.id,
                    product_name=l.line_description[:250],
                    quantity=1,
                    rate=l.requested_amount,
                    line_total=l.requested_amount
                )
                db.add(item)
        else:
            item = models.InvoiceItem(
                id=uuid.uuid4(),
                invoice_id=pur_invoice.id,
                product_name=f"C&F Services & Commission ({claim.principal_name})",
                quantity=1,
                rate=amt,
                line_total=amt
            )
            db.add(item)

        # Record link for PURCHASE_BILL
        pur_link = models.RecoveryDocumentLink(
            id=uuid.uuid4(),
            claim_id=claim.id,
            document_type="PURCHASE_BILL",
            document_number=pur_bill_no,
            amount=amt,
            linked_at=datetime.utcnow()
        )
        db.add(pur_link)

        claim.status = "RECOVERY_CREATED"

    elif payload.action == "SETTLE":
        claim.status = "SETTLED"

    elif payload.action == "REJECT":
        claim.status = "REJECTED"

    # Audit log
    audit = models.CommissionAudit(
        id=uuid.uuid4(),
        company_id=current_user.organization_id,
        object_type="CLAIM",
        object_id=claim.claim_number,
        action=payload.action,
        actor_username=current_user.username if hasattr(current_user, "username") else "admin",
        after_hash=hashlib.sha256(f"{claim.claim_number}:{claim.status}:{claim.approved_amount}".encode("utf-8")).hexdigest(),
        details_json={"old_status": old_status, "new_status": claim.status, "notes": payload.notes}
    )
    db.add(audit)
    db.commit()

    docs = db.query(models.RecoveryDocumentLink).filter(
        models.RecoveryDocumentLink.claim_id == claim.id
    ).all()
    links_data = [
        {
            "id": str(d.id),
            "document_type": d.document_type,
            "document_reference": d.document_number,
            "amount": float(d.amount),
            "linked_at": d.linked_at.isoformat() if d.linked_at else None
        }
        for d in docs
    ]

    return {
        "status": "success",
        "message": f"Claim {claim.claim_number} updated to {claim.status}",
        "data": {
            "id": str(claim.id),
            "claim_number": claim.claim_number,
            "status": claim.status,
            "approved_amount": float(claim.approved_amount),
            "disputed_amount": float(claim.disputed_amount),
            "recovery_document_links": links_data
        }
    }


@router.get("/statements")
def list_statements(
    principal_id: Optional[uuid.UUID] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    List Recovery Statements and lines.
    """
    query = db.query(models.RecoveryStatement)
    if principal_id:
        query = query.filter(models.RecoveryStatement.principal_id == principal_id)

    stmts = query.order_by(desc(models.RecoveryStatement.created_at)).all()

    result = []
    for s in stmts:
        lines = db.query(models.RecoveryStatementLine).filter(
            models.RecoveryStatementLine.statement_id == s.id
        ).all()

        result.append({
            "id": str(s.id),
            "statement_number": s.statement_number,
            "principal_id": str(s.principal_id),
            "principal_name": s.principal_name,
            "period_from": s.period_from.isoformat() if s.period_from else None,
            "period_to": s.period_to.isoformat() if s.period_to else None,
            "earned_commission": float(s.earned_commission),
            "service_fees": float(s.service_fees),
            "expense_recovery": float(s.expense_recovery),
            "adjustments": float(s.adjustments),
            "approved_commercial": float(s.approved_commercial),
            "invoiced_total": float(s.invoiced_total),
            "settled_total": float(s.settled_total),
            "outstanding_balance": float(s.outstanding_balance),
            "disputed_total": float(s.disputed_total),
            "statement_hash": s.statement_hash,
            "status": s.status,
            "created_at": s.created_at.isoformat(),
            "lines": [
                {
                    "id": str(l.id),
                    "category": l.category,
                    "reference_doc_id": l.reference_doc_id,
                    "description": l.description,
                    "amount": float(l.amount)
                } for l in lines
            ]
        })

    return {"status": "success", "count": len(result), "data": result}


@router.post("/statements/generate")
def generate_statement(
    payload: StatementGenerateRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Consolidates period commission calculations and expense recoveries into a formal RecoveryStatement.
    """
    agr = db.query(models.PrincipalCommissionAgreement).filter(
        models.PrincipalCommissionAgreement.principal_id == payload.principal_id
    ).first()
    principal_name = agr.principal_name if agr else "Enterprise Principal"

    p_from = datetime.fromisoformat(payload.period_from) if payload.period_from else (datetime.utcnow() - timedelta(days=30))
    p_to = datetime.fromisoformat(payload.period_to) if payload.period_to else datetime.utcnow()

    # Query approved calculations
    calcs = db.query(models.CommissionCalculation).filter(
        models.CommissionCalculation.principal_id == payload.principal_id,
        models.CommissionCalculation.state.in_(["APPROVED", "BATCHED", "RECOVERY_CREATED", "SETTLED"])
    ).all()

    earned = sum(c.calculated_amount for c in calcs if c.category == "EARNED_COMMISSION") or Decimal("0.0")
    recoverable = sum(c.calculated_amount for c in calcs if c.category == "RECOVERABLE_EXPENSE") or Decimal("0.0")
    commercial_total = earned + recoverable

    stmt_num = generate_statement_number(db)
    raw_hash = f"{stmt_num}:{commercial_total}:{datetime.utcnow().isoformat()}"
    stmt_hash = hashlib.sha256(raw_hash.encode("utf-8")).hexdigest()

    stmt = models.RecoveryStatement(
        id=uuid.uuid4(),
        statement_number=stmt_num,
        principal_id=payload.principal_id,
        principal_name=principal_name,
        period_from=p_from,
        period_to=p_to,
        earned_commission=earned,
        service_fees=0.0,
        expense_recovery=recoverable,
        adjustments=0.0,
        approved_commercial=commercial_total,
        invoiced_total=commercial_total,
        settled_total=0.0,
        outstanding_balance=commercial_total,
        disputed_total=0.0,
        statement_hash=stmt_hash,
        status="GENERATED",
        created_at=datetime.utcnow()
    )
    db.add(stmt)
    db.flush()

    # Add lines
    if earned > 0:
        l1 = models.RecoveryStatementLine(
            id=uuid.uuid4(),
            statement_id=stmt.id,
            category="EARNED_COMMISSION",
            reference_doc_id=f"CALCS-{datetime.utcnow().strftime('%Y%m')}",
            description=f"Consolidated Earned Turnover Commission ({p_from.strftime('%d %b')} - {p_to.strftime('%d %b')})",
            amount=earned
        )
        db.add(l1)

    if recoverable > 0:
        l2 = models.RecoveryStatementLine(
            id=uuid.uuid4(),
            statement_id=stmt.id,
            category="EXPENSE_RECOVERY",
            reference_doc_id=f"RECOV-{datetime.utcnow().strftime('%Y%m')}",
            description=f"Recharged Inward Freight & Handling Ancillaries ({p_from.strftime('%d %b')} - {p_to.strftime('%d %b')})",
            amount=recoverable
        )
        db.add(l2)

    # Audit log
    audit = models.CommissionAudit(
        id=uuid.uuid4(),
        company_id=current_user.organization_id,
        object_type="STATEMENT",
        object_id=stmt.statement_number,
        action="GENERATE",
        actor_username=current_user.username if hasattr(current_user, "username") else "admin",
        after_hash=stmt_hash,
        details_json={"earned": float(earned), "recoverable": float(recoverable), "total": float(commercial_total)}
    )
    db.add(audit)
    db.commit()

    return {
        "status": "success",
        "message": f"Recovery statement {stmt_num} generated successfully",
        "data": {
            "id": str(stmt.id),
            "statement_number": stmt.statement_number,
            "principal_name": stmt.principal_name,
            "approved_commercial": float(stmt.approved_commercial),
            "outstanding_balance": float(stmt.outstanding_balance),
            "statement_hash": stmt.statement_hash
        }
    }


@router.get("/exceptions")
def list_exceptions(
    state: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    List commission and recovery exceptions.
    """
    query = db.query(models.CommissionException)
    if state:
        query = query.filter(models.CommissionException.state == state)

    exceptions = query.order_by(desc(models.CommissionException.created_at)).all()

    return {
        "status": "success",
        "count": len(exceptions),
        "data": [
            {
                "id": str(e.id),
                "source_id": e.source_id,
                "exception_type": e.exception_type,
                "severity": e.severity,
                "description": e.description,
                "state": e.state,
                "created_at": e.created_at.isoformat()
            } for e in exceptions
        ]
    }


@router.post("/exceptions/{ex_id}/resolve")
def resolve_exception(
    ex_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Mark an exception as resolved.
    """
    ex = db.query(models.CommissionException).filter(models.CommissionException.id == ex_id).first()
    if not ex:
        raise HTTPException(status_code=404, detail="Exception not found")

    ex.state = "RESOLVED"
    db.commit()

    return {"status": "success", "message": f"Exception {ex.source_id} marked as RESOLVED"}


@router.get("/audits")
def list_audits(
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    List immutable audit records for commission and claims.
    """
    audits = db.query(models.CommissionAudit).order_by(
        desc(models.CommissionAudit.created_at)
    ).limit(limit).all()

    return {
        "status": "success",
        "count": len(audits),
        "data": [
            {
                "id": str(a.id),
                "object_type": a.object_type,
                "object_id": a.object_id,
                "action": a.action,
                "actor_username": a.actor_username,
                "before_hash": a.before_hash,
                "after_hash": a.after_hash,
                "details_json": a.details_json,
                "created_at": a.created_at.isoformat()
            } for a in audits
        ]
    }


# ─────────────────────────────────────────────────────────────
# C&F Client Management Commission & Expense Billing Endpoints
# ─────────────────────────────────────────────────────────────

@router.get("/clients/{client_org_id}/telemetry")
def get_client_commission_telemetry(
    client_org_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Fetch live sales turnover, invoice count, and recoverable expense telemetry
    for a Client Management organization (e.g. KRISHNA MEDICAL AGENCIES).
    """
    client_org = db.query(models.Organization).filter(models.Organization.id == client_org_id).first()
    if not client_org:
        raise HTTPException(status_code=404, detail="Client organization not found")

    # 1. Total sales turnover from active invoices for this organization
    sales_q = db.query(
        func.coalesce(func.sum(models.Invoice.grand_total), 0).label("turnover"),
        func.count(models.Invoice.id).label("cnt")
    ).filter(
        models.Invoice.organization_id == client_org_id,
        models.Invoice.is_active == True,
        models.Invoice.invoice_type.in_(["bill", "sales", "tax-invoice"])
    ).first()

    turnover = float(sales_q.turnover) if sales_q and float(sales_q.turnover) > 0 else 0.0
    invoices_count = int(sales_q.cnt) if sales_q else 0

    # If turnover is 0 in DB (e.g. newly onboarded client), provide standard baseline turnover
    if turnover == 0:
        turnover = 1250000.0  # ₹12.50 Lakh baseline sales turnover

    # 2. Agreement or deal terms lookup
    agreement = db.query(models.PrincipalCommissionAgreement).filter(
        models.PrincipalCommissionAgreement.status == "ACTIVE"
    ).first()

    rate = 5.0
    godown_rent = 15000.0
    staff_salary = 25000.0
    freight_cost = 8500.0
    handling_charges = 2500.0

    if agreement and agreement.terms_json:
        reimb = agreement.terms_json.get("reimbursement_terms", {})
        if "sales_commission" in reimb:
            rate = float(reimb["sales_commission"].get("rate_pct", rate))
        if "godown_storage" in reimb:
            godown_rent = float(reimb["godown_storage"].get("monthly_rent", godown_rent))
        if "staff_salaries" in reimb:
            staff_salary = float(reimb["staff_salaries"].get("monthly_budget", staff_salary))

    suggested_commission = round(turnover * (rate / 100.0), 2)

    return {
        "status": "success",
        "data": {
            "client_org_id": str(client_org.id),
            "client_name": client_org.name,
            "client_code": client_org.org_code,
            "sales_turnover": turnover,
            "invoices_count": invoices_count,
            "default_commission_rate": rate,
            "suggested_commission": suggested_commission,
            "default_godown_rent": godown_rent,
            "default_staff_salary": staff_salary,
            "default_freight_cost": freight_cost,
            "default_handling_charges": handling_charges,
            "tax_rate_percent": 18.0
        }
    }


@router.post("/generate-client-bill")
def generate_client_commission_bill(
    payload: GenerateClientCommissionBillRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Automate or manually generate a formal C&F Commission & Expense Reimbursement Bill
    for a Client Management client (e.g. KRISHNA MEDICAL AGENCIES).
    Dual-posts:
      1. Outward Service Bill in Main Admin Billing register (models.Invoice with invoice_type="bill")
      2. Inward Purchase Bill in Client Organization Purchase register (models.Invoice with invoice_type="purchase-bill")
      3. Models CommissionCalculation & RecoveryClaim for transparent ledger tracking.
    """
    client_org = db.query(models.Organization).filter(models.Organization.id == payload.client_org_id).first()
    if not client_org:
        raise HTTPException(status_code=404, detail="Client organization not found")

    comm_amt = Decimal(str(payload.commission_amount))
    rent_amt = Decimal(str(payload.godown_rent_amount))
    sal_amt = Decimal(str(payload.staff_salary_amount))
    frt_amt = Decimal(str(payload.freight_reimbursement_amount))
    hnd_amt = Decimal(str(payload.handling_charges_amount))
    oth_amt = Decimal(str(payload.other_expenses_amount))

    expenses_total = rent_amt + sal_amt + frt_amt + hnd_amt + oth_amt
    subtotal = comm_amt + expenses_total
    tax_rate = Decimal(str(payload.tax_rate_percent))
    tax_total = round(subtotal * (tax_rate / Decimal("100")), 2)
    grand_total = subtotal + tax_total

    # 1. Outward Service Bill for Main Admin Company (Billing Section)
    year = datetime.utcnow().year
    outward_count = db.query(models.Invoice).filter(
        models.Invoice.invoice_number.like(f"CF-BILL-{year}-%")
    ).count()
    outward_bill_no = f"CF-BILL-{year}-{str(outward_count + 1).zfill(4)}"

    # Check or create Party in Main Admin for this Client
    client_party = db.query(models.Party).filter(
        models.Party.organization_id == current_user.organization_id,
        or_(
            models.Party.legal_name.ilike(client_org.name),
            models.Party.trade_name.ilike(client_org.name)
        )
    ).first()

    due_date = (datetime.utcnow() + timedelta(days=payload.due_days or 15)).strftime("%Y-%m-%d")
    remarks = payload.remarks or f"C&F Commission ({payload.commission_rate_percent}%) & Reimbursable Operating Expenses for {client_org.name}"

    outward_invoice = models.Invoice(
        id=uuid.uuid4(),
        organization_id=current_user.organization_id,
        invoice_type="bill",
        invoice_number=outward_bill_no,
        date=datetime.utcnow(),
        customer_name=client_org.name,
        party_id=client_party.id if client_party else None,
        party_inv_no=outward_bill_no,
        party_inv_date=datetime.utcnow().strftime("%Y-%m-%d"),
        due_date=due_date,
        remarks=remarks,
        subtotal=subtotal,
        tax_total=tax_total,
        grand_total=grand_total,
        is_active=True
    )
    db.add(outward_invoice)
    db.flush()

    # Add item lines to outward bill
    if comm_amt > 0:
        db.add(models.InvoiceItem(
            id=uuid.uuid4(),
            invoice_id=outward_invoice.id,
            product_name=f"C&F Sales Commission ({payload.commission_rate_percent}% on turnover INR {payload.sales_turnover:,.2f})",
            quantity=1,
            rate=comm_amt,
            line_total=comm_amt,
            igst_percent=tax_rate
        ))
    if rent_amt > 0:
        db.add(models.InvoiceItem(
            id=uuid.uuid4(),
            invoice_id=outward_invoice.id,
            product_name="Godown Storage & Warehousing Charges Reimbursement",
            quantity=1,
            rate=rent_amt,
            line_total=rent_amt,
            igst_percent=tax_rate
        ))
    if sal_amt > 0:
        db.add(models.InvoiceItem(
            id=uuid.uuid4(),
            invoice_id=outward_invoice.id,
            product_name="Depot Staff Salary & Operation Handling Reimbursement",
            quantity=1,
            rate=sal_amt,
            line_total=sal_amt,
            igst_percent=tax_rate
        ))
    if frt_amt > 0:
        db.add(models.InvoiceItem(
            id=uuid.uuid4(),
            invoice_id=outward_invoice.id,
            product_name="Inward & Outward Freight / Transport Reimbursement",
            quantity=1,
            rate=frt_amt,
            line_total=frt_amt,
            igst_percent=tax_rate
        ))
    if hnd_amt > 0:
        db.add(models.InvoiceItem(
            id=uuid.uuid4(),
            invoice_id=outward_invoice.id,
            product_name="Cargo Handling, Loading & Unloading Charges Reimbursement",
            quantity=1,
            rate=hnd_amt,
            line_total=hnd_amt,
            igst_percent=tax_rate
        ))
    if oth_amt > 0:
        db.add(models.InvoiceItem(
            id=uuid.uuid4(),
            invoice_id=outward_invoice.id,
            product_name="Other Reimbursable Operating Ancillaries",
            quantity=1,
            rate=oth_amt,
            line_total=oth_amt,
            igst_percent=tax_rate
        ))

    # 2. Dual-posting into Client Organization as Inward Purchase Bill
    inward_bill_no = None
    inward_invoice = None
    if payload.auto_post_client_purchase:
        inward_count = db.query(models.Invoice).filter(
            models.Invoice.invoice_number.like(f"PUR-CF-{year}-%")
        ).count()
        inward_bill_no = f"PUR-CF-{year}-{str(inward_count + 1).zfill(4)}"

        agency_name = "Main Admin C&F Agency"
        admin_org = db.query(models.Organization).filter(models.Organization.id == current_user.organization_id).first()
        if admin_org:
            agency_name = admin_org.name

        inward_invoice = models.Invoice(
            id=uuid.uuid4(),
            organization_id=client_org.id,
            invoice_type="purchase-bill",
            invoice_number=inward_bill_no,
            date=datetime.utcnow(),
            customer_name=agency_name,
            party_inv_no=outward_bill_no,
            party_inv_date=datetime.utcnow().strftime("%Y-%m-%d"),
            due_date=due_date,
            remarks=f"Dual-Posted Inward C&F Bill from {agency_name} (Ref: {outward_bill_no})",
            subtotal=subtotal,
            tax_total=tax_total,
            grand_total=grand_total,
            is_active=True
        )
        db.add(inward_invoice)
        db.flush()

        if comm_amt > 0:
            db.add(models.InvoiceItem(
                id=uuid.uuid4(),
                invoice_id=inward_invoice.id,
                product_name=f"C&F Sales Commission ({payload.commission_rate_percent}% on turnover INR {payload.sales_turnover:,.2f})",
                quantity=1,
                rate=comm_amt,
                line_total=comm_amt,
                igst_percent=tax_rate
            ))
        if rent_amt > 0:
            db.add(models.InvoiceItem(
                id=uuid.uuid4(),
                invoice_id=inward_invoice.id,
                product_name="Godown Storage & Warehousing Charges Reimbursement",
                quantity=1,
                rate=rent_amt,
                line_total=rent_amt,
                igst_percent=tax_rate
            ))
        if sal_amt > 0:
            db.add(models.InvoiceItem(
                id=uuid.uuid4(),
                invoice_id=inward_invoice.id,
                product_name="Depot Staff Salary & Operation Handling Reimbursement",
                quantity=1,
                rate=sal_amt,
                line_total=sal_amt,
                igst_percent=tax_rate
            ))
        if frt_amt > 0:
            db.add(models.InvoiceItem(
                id=uuid.uuid4(),
                invoice_id=inward_invoice.id,
                product_name="Inward & Outward Freight / Transport Reimbursement",
                quantity=1,
                rate=frt_amt,
                line_total=frt_amt,
                igst_percent=tax_rate
            ))
        if hnd_amt > 0:
            db.add(models.InvoiceItem(
                id=uuid.uuid4(),
                invoice_id=inward_invoice.id,
                product_name="Cargo Handling, Loading & Unloading Charges Reimbursement",
                quantity=1,
                rate=hnd_amt,
                line_total=hnd_amt,
                igst_percent=tax_rate
            ))
        if oth_amt > 0:
            db.add(models.InvoiceItem(
                id=uuid.uuid4(),
                invoice_id=inward_invoice.id,
                product_name="Other Reimbursable Operating Ancillaries",
                quantity=1,
                rate=oth_amt,
                line_total=oth_amt,
                igst_percent=tax_rate
            ))

    # 3. Create Commission Engine Calculation and Claim records
    principal = db.query(models.Principal).first()
    principal_id = principal.id if principal else client_org.id
    principal_name = client_org.name

    try:
        period_from_dt = datetime.fromisoformat(payload.period_from) if payload.period_from else datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    except Exception:
        period_from_dt = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    try:
        period_to_dt = datetime.fromisoformat(payload.period_to) if payload.period_to else datetime.utcnow()
    except Exception:
        period_to_dt = datetime.utcnow()

    # Create Commission Event parent record
    comm_evt = models.CommissionEvent(
        id=uuid.uuid4(),
        company_id=current_user.organization_id,
        principal_id=principal_id,
        event_type="SALES_BILL",
        event_date=datetime.utcnow(),
        source_doc_type="INVOICE",
        source_doc_id=outward_bill_no,
        idempotency_key=f"CF-BILL-EVT-{outward_bill_no}-{uuid.uuid4().hex[:8]}",
        payload_json={
            "client_name": client_org.name,
            "sales_turnover": float(payload.sales_turnover),
            "commission_rate_percent": float(payload.commission_rate_percent),
            "expenses_total": float(expenses_total),
            "outward_bill_no": outward_bill_no,
            "inward_bill_no": inward_bill_no
        },
        created_at=datetime.utcnow()
    )
    db.add(comm_evt)
    db.flush()

    calc_num = generate_calculation_number(db, "CALC-CF")
    calc_trace = json.dumps({
        "description": f"C&F Commission on sales turnover for {client_org.name}",
        "turnover": float(payload.sales_turnover),
        "rate_pct": float(payload.commission_rate_percent),
        "bill_no": outward_bill_no
    })
    raw_hash_earned = f"{calc_num}:{payload.sales_turnover}:{payload.commission_rate_percent}:{comm_amt}:{comm_evt.id}"
    sha_hash_earned = hashlib.sha256(raw_hash_earned.encode("utf-8")).hexdigest()

    calc_earned = models.CommissionCalculation(
        id=uuid.uuid4(),
        calculation_number=calc_num,
        event_id=comm_evt.id,
        principal_id=principal_id,
        principal_name=principal_name,
        client_id=client_org.id,
        client_name=client_org.name,
        category="EARNED_COMMISSION",
        event_type="SALES_BILL",
        base_value=Decimal(str(payload.sales_turnover)),
        rate_applied=Decimal(str(payload.commission_rate_percent)),
        calculated_amount=comm_amt,
        currency="INR",
        formula_trace=calc_trace,
        state="APPROVED",
        sha256_hash=sha_hash_earned,
        created_at=datetime.utcnow()
    )
    db.add(calc_earned)

    if expenses_total > 0:
        calc_exp_num = generate_calculation_number(db, "CALC-RECOV")
        exp_trace = json.dumps({
            "description": f"Depot Storage, Salary & Transport Reimbursement for {client_org.name}",
            "rent": float(rent_amt),
            "salary": float(sal_amt),
            "freight": float(frt_amt),
            "handling": float(hnd_amt),
            "other": float(oth_amt),
            "bill_no": outward_bill_no
        })
        raw_hash_exp = f"{calc_exp_num}:{expenses_total}:100.0:{expenses_total}:{comm_evt.id}"
        sha_hash_exp = hashlib.sha256(raw_hash_exp.encode("utf-8")).hexdigest()

        calc_expenses = models.CommissionCalculation(
            id=uuid.uuid4(),
            calculation_number=calc_exp_num,
            event_id=comm_evt.id,
            principal_id=principal_id,
            principal_name=principal_name,
            client_id=client_org.id,
            client_name=client_org.name,
            category="RECOVERABLE_EXPENSE",
            event_type="EXPENSE_RECOVERY",
            base_value=expenses_total,
            rate_applied=Decimal("100.0"),
            calculated_amount=expenses_total,
            currency="INR",
            formula_trace=exp_trace,
            state="APPROVED",
            sha256_hash=sha_hash_exp,
            created_at=datetime.utcnow()
        )
        db.add(calc_expenses)

    claim_num = generate_claim_number(db)
    claim = models.RecoveryClaim(
        id=uuid.uuid4(),
        company_id=current_user.organization_id,
        principal_id=principal_id,
        principal_name=principal_name,
        claim_number=claim_num,
        period_from=period_from_dt,
        period_to=period_to_dt,
        total_earned_commission=comm_amt,
        total_recoverable_expenses=expenses_total,
        total_claimed_amount=subtotal,
        approved_amount=subtotal,
        disputed_amount=Decimal("0.0"),
        status="APPROVED",
        submitted_at=datetime.utcnow(),
        approved_at=datetime.utcnow(),
        created_at=datetime.utcnow()
    )
    db.add(claim)
    db.flush()

    doc_link_outward = models.RecoveryDocumentLink(
        id=uuid.uuid4(),
        claim_id=claim.id,
        document_type="SERVICE_INVOICE",
        document_number=outward_bill_no,
        amount=grand_total,
        linked_at=datetime.utcnow()
    )
    db.add(doc_link_outward)

    if inward_bill_no:
        doc_link_inward = models.RecoveryDocumentLink(
            id=uuid.uuid4(),
            claim_id=claim.id,
            document_type="PURCHASE_BILL",
            document_number=inward_bill_no,
            amount=grand_total,
            linked_at=datetime.utcnow()
        )
        db.add(doc_link_inward)

    audit = models.CommissionAudit(
        id=uuid.uuid4(),
        company_id=current_user.organization_id,
        object_type="CLAIM",
        object_id=claim.claim_number,
        action="APPROVE",
        actor_username=current_user.username if hasattr(current_user, "username") else "admin",
        details_json={
            "client_name": client_org.name,
            "outward_bill_no": outward_bill_no,
            "inward_bill_no": inward_bill_no,
            "subtotal": float(subtotal),
            "tax_total": float(tax_total),
            "grand_total": float(grand_total),
            "claim_number": claim.claim_number
        },
        created_at=datetime.utcnow()
    )
    db.add(audit)
    db.commit()

    return {
        "status": "success",
        "message": f"C&F Commission Bill {outward_bill_no} generated and dual-posted to {client_org.name}",
        "data": {
            "outward_bill_id": str(outward_invoice.id),
            "outward_bill_no": outward_bill_no,
            "inward_bill_id": str(inward_invoice.id) if inward_invoice else None,
            "inward_bill_no": inward_bill_no,
            "client_org_id": str(client_org.id),
            "client_name": client_org.name,
            "sales_turnover": float(payload.sales_turnover),
            "commission_rate_percent": float(payload.commission_rate_percent),
            "commission_amount": float(comm_amt),
            "expenses_reimbursement": float(expenses_total),
            "subtotal": float(subtotal),
            "tax_total": float(tax_total),
            "grand_total": float(grand_total),
            "claim_number": claim.claim_number,
            "date": datetime.utcnow().isoformat()
        }
    }


@router.get("/client-bills")
def list_client_commission_bills(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    List all generated C&F commission and expense reimbursement bills.
    """
    bills = db.query(models.Invoice).filter(
        models.Invoice.organization_id == current_user.organization_id,
        models.Invoice.invoice_number.like("CF-BILL-%"),
        models.Invoice.is_active == True
    ).order_by(desc(models.Invoice.date)).all()

    result = []
    for b in bills:
        pur_link = db.query(models.RecoveryDocumentLink).filter(
            models.RecoveryDocumentLink.document_number == b.invoice_number
        ).first()
        inward_no = None
        if pur_link:
            inward_link = db.query(models.RecoveryDocumentLink).filter(
                models.RecoveryDocumentLink.claim_id == pur_link.claim_id,
                models.RecoveryDocumentLink.document_type == "PURCHASE_BILL"
            ).first()
            if inward_link:
                inward_no = inward_link.document_number

        result.append({
            "id": str(b.id),
            "invoice_number": b.invoice_number,
            "date": b.date.isoformat(),
            "customer_name": b.customer_name,
            "subtotal": float(b.subtotal),
            "tax_total": float(b.tax_total),
            "grand_total": float(b.grand_total),
            "due_date": b.due_date,
            "remarks": b.remarks,
            "inward_bill_no": inward_no,
            "items_count": len(b.items)
        })

    return {
        "status": "success",
        "count": len(result),
        "data": result
    }
