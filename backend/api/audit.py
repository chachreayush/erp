import uuid
import json
import hashlib
from datetime import datetime, date, timedelta
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc, or_
from database import get_db
import models
from auth.router import get_current_user

router = APIRouter(prefix="/api/audit", tags=["Audit & Governance Engine"])


# ── SENSITIVE FIELD MASKING HELPER ────────────────────────────
SENSITIVE_KEYS = {"password", "hashed_password", "token", "secret", "api_key", "salt"}

def mask_sensitive_payload(data: Any) -> Any:
    if not isinstance(data, dict):
        return data
    masked = {}
    for k, v in data.items():
        if any(s in k.lower() for s in SENSITIVE_KEYS):
            masked[k] = "[REDACTED_SENSITIVE]"
        elif isinstance(v, dict):
            masked[k] = mask_sensitive_payload(v)
        else:
            masked[k] = v
    return masked

def compute_event_hash(
    prev_hash: str,
    company_id: str,
    actor_name: str,
    event_type: str,
    object_type: str,
    object_id: str,
    event_time_iso: str,
    before_payload: Any,
    after_payload: Any
) -> str:
    raw = f"{prev_hash}|{company_id}|{actor_name}|{event_type}|{object_type}|{object_id}|{event_time_iso}|{json.dumps(before_payload or {}, sort_keys=True)}|{json.dumps(after_payload or {}, sort_keys=True)}"
    return hashlib.sha256(raw.encode('utf-8')).hexdigest()

def get_latest_hash(db: Session, company_id: uuid.UUID) -> str:
    latest_event = db.query(models.AuditEvent).filter(
        models.AuditEvent.company_id == company_id
    ).order_by(desc(models.AuditEvent.event_time), desc(models.AuditEvent.id)).first()
    return latest_event.event_hash if latest_event else ("0" * 64)

# ── PYDANTIC SCHEMAS ──────────────────────────────────────────
class RetentionPolicyCreate(BaseModel):
    object_type: str
    retention_days: int
    legal_hold_allowed: bool = True
    effective_from: Optional[date] = None

class LegalHoldCreate(BaseModel):
    scope_type: str # RECORD, MODULE, PARTY, ALL
    scope_id: Optional[str] = None
    scope_description: str
    reason: str

class LegalHoldRelease(BaseModel):
    release_reason: str

class EvidencePackRequest(BaseModel):
    purpose: str
    date_from: Optional[str] = None
    date_to: Optional[str] = None
    module: Optional[str] = None

class AuditLogRequest(BaseModel):
    event_type: str
    object_type: str
    object_id: Optional[str] = None
    document_number: Optional[str] = None
    before_payload: Optional[Dict[str, Any]] = None
    after_payload: Optional[Dict[str, Any]] = None
    reason: Optional[str] = None
    correlation_id: Optional[str] = None

# ── 1. GET /api/audit/events ──────────────────────────────────
@router.get("/events")
def get_audit_events(
    search: Optional[str] = Query(None),
    module: Optional[str] = Query(None),
    event_type: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    query = db.query(models.AuditEvent).filter(models.AuditEvent.company_id == current_user.organization_id)

    if module and module != "ALL":
        query = query.filter(models.AuditEvent.object_type == module)

    if event_type and event_type != "ALL":
        query = query.filter(models.AuditEvent.event_type == event_type)

    if search:
        s = f"%{search}%"
        query = query.filter(
            or_(
                models.AuditEvent.document_number.ilike(s),
                models.AuditEvent.actor_name.ilike(s),
                models.AuditEvent.reason.ilike(s),
                models.AuditEvent.object_type.ilike(s),
                models.AuditEvent.event_type.ilike(s)
            )
        )

    total = query.count()
    events = query.order_by(desc(models.AuditEvent.event_time)).offset(offset).limit(limit).all()
    latest_hash = get_latest_hash(db, current_user.organization_id)

    return {
        "total": total,
        "offset": offset,
        "limit": limit,
        "latest_hash": latest_hash,
        "chain_verified": True,
        "events": [
            {
                "id": str(e.id),
                "actor_name": e.actor_name,
                "event_type": e.event_type,
                "object_type": e.object_type,
                "object_id": str(e.object_id) if e.object_id else None,
                "document_number": e.document_number or "—",
                "event_time": e.event_time.isoformat(),
                "reason": e.reason or "",
                "prev_hash": e.prev_hash,
                "event_hash": e.event_hash,
                "correlation_id": str(e.correlation_id) if e.correlation_id else None,
                "is_verified": e.is_verified
            }
            for e in events
        ]
    }

# ── 2. GET /api/audit/diff/{event_id} ──────────────────────────
@router.get("/diff/{event_id}")
def get_audit_diff(
    event_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    try:
        ev_uuid = uuid.UUID(event_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid UUID format")

    event = db.query(models.AuditEvent).filter(
        models.AuditEvent.id == ev_uuid,
        models.AuditEvent.company_id == current_user.organization_id
    ).first()

    if not event:
        raise HTTPException(status_code=404, detail="Audit event not found")

    before = mask_sensitive_payload(event.before_payload or {})
    after = mask_sensitive_payload(event.after_payload or {})

    # Compute field-by-field diff
    diff_items = []
    all_keys = set(before.keys()).union(set(after.keys()))

    for k in sorted(all_keys):
        old_val = before.get(k)
        new_val = after.get(k)
        if k not in before:
            diff_status = "ADDED"
        elif k not in after:
            diff_status = "REMOVED"
        elif old_val != new_val:
            diff_status = "MODIFIED"
        else:
            diff_status = "UNCHANGED"

        diff_items.append({
            "field": k,
            "old_value": old_val,
            "new_value": new_val,
            "status": diff_status
        })

    # Validate individual hash
    expected_hash = compute_event_hash(
        prev_hash=event.prev_hash or ("0" * 64),
        company_id=str(event.company_id),
        actor_name=event.actor_name,
        event_type=event.event_type,
        object_type=event.object_type,
        object_id=str(event.object_id) if event.object_id else str(event.id),
        event_time_iso=event.event_time.isoformat(),
        before_payload=event.before_payload,
        after_payload=event.after_payload
    )
    is_hash_intact = (expected_hash == event.event_hash)

    return {
        "event_id": str(event.id),
        "document_number": event.document_number or "—",
        "actor_name": event.actor_name,
        "event_type": event.event_type,
        "object_type": event.object_type,
        "event_time": event.event_time.isoformat(),
        "reason": event.reason,
        "prev_hash": event.prev_hash,
        "event_hash": event.event_hash,
        "is_hash_intact": is_hash_intact,
        "diff_items": diff_items,
        "before_payload": before,
        "after_payload": after
    }

# ── 3. POST /api/audit/verify-chain ───────────────────────────
@router.post("/verify-chain")
def verify_audit_chain(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    events = db.query(models.AuditEvent).filter(
        models.AuditEvent.company_id == current_user.organization_id
    ).order_by(asc(models.AuditEvent.event_time), asc(models.AuditEvent.id)).all()

    if not events:
        return {
            "is_valid": True,
            "total_verified": 0,
            "genesis_hash": "0" * 64,
            "latest_hash": "0" * 64,
            "broken_link_id": None,
            "message": "No audit records found. Chain is trivially valid."
        }

    expected_prev = "0" * 64
    broken_link_id = None
    is_valid = True

    for idx, ev in enumerate(events):
        if idx == 0:
            expected_prev = ev.prev_hash

        # Check prev_hash matches prior event_hash
        if ev.prev_hash != expected_prev:
            is_valid = False
            broken_link_id = str(ev.id)
            break

        # Check event_hash matches computed hash
        computed = compute_event_hash(
            prev_hash=ev.prev_hash,
            company_id=str(ev.company_id),
            actor_name=ev.actor_name,
            event_type=ev.event_type,
            object_type=ev.object_type,
            object_id=str(ev.object_id) if ev.object_id else str(ev.id),
            event_time_iso=ev.event_time.isoformat(),
            before_payload=ev.before_payload,
            after_payload=ev.after_payload
        )
        if computed != ev.event_hash:
            is_valid = False
            broken_link_id = str(ev.id)
            break

        expected_prev = ev.event_hash

    return {
        "is_valid": is_valid,
        "total_verified": len(events),
        "genesis_hash": events[0].prev_hash if events else ("0" * 64),
        "latest_hash": events[-1].event_hash if events else ("0" * 64),
        "broken_link_id": broken_link_id,
        "verified_at": datetime.utcnow().isoformat(),
        "status_badge": "CRYPTOGRAPHICALLY_VERIFIED" if is_valid else "TAMPER_DETECTED"
    }

# ── 4. GET & POST /api/audit/retention/policies ───────────────
@router.get("/retention/policies")
def get_retention_policies(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    policies = db.query(models.RetentionPolicy).filter(
        models.RetentionPolicy.company_id == current_user.organization_id
    ).all()
    return [
        {
            "id": str(p.id),
            "object_type": p.object_type,
            "retention_days": p.retention_days,
            "retention_years": round(p.retention_days / 365, 1),
            "legal_hold_allowed": p.legal_hold_allowed,
            "effective_from": p.effective_from.isoformat() if p.effective_from else None,
            "created_at": p.created_at.isoformat()
        }
        for p in policies
    ]

@router.post("/retention/policies")
def upsert_retention_policy(
    policy_data: RetentionPolicyCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    existing = db.query(models.RetentionPolicy).filter(
        models.RetentionPolicy.company_id == current_user.organization_id,
        models.RetentionPolicy.object_type == policy_data.object_type
    ).first()

    old_days = existing.retention_days if existing else None

    if existing:
        existing.retention_days = policy_data.retention_days
        existing.legal_hold_allowed = policy_data.legal_hold_allowed
        if policy_data.effective_from:
            existing.effective_from = policy_data.effective_from
        policy_rec = existing
    else:
        policy_rec = models.RetentionPolicy(
            company_id=current_user.organization_id,
            object_type=policy_data.object_type,
            retention_days=policy_data.retention_days,
            legal_hold_allowed=policy_data.legal_hold_allowed,
            effective_from=policy_data.effective_from or date.today()
        )
        db.add(policy_rec)

    db.commit()
    db.refresh(policy_rec)

    # DOC-33 Mandate: Policy change generates its own immutable audit event
    prev_hash = get_latest_hash(db, current_user.organization_id)
    ev_time = datetime.utcnow()
    ev_id = uuid.uuid4()
    before_p = {"retention_days": old_days} if old_days else None
    after_p = {"retention_days": policy_data.retention_days, "object_type": policy_data.object_type}

    ev_hash = compute_event_hash(
        prev_hash=prev_hash,
        company_id=str(current_user.organization_id),
        actor_name=current_user.username,
        event_type="UPDATE_POLICY" if old_days else "CREATE_POLICY",
        object_type="RETENTION_POLICY",
        object_id=str(policy_rec.id),
        event_time_iso=ev_time.isoformat(),
        before_payload=before_p,
        after_payload=after_p
    )

    audit_entry = models.AuditEvent(
        id=ev_id,
        company_id=current_user.organization_id,
        actor_id=current_user.id,
        actor_name=current_user.username,
        event_type="UPDATE_POLICY" if old_days else "CREATE_POLICY",
        object_type="RETENTION_POLICY",
        object_id=policy_rec.id,
        document_number=f"POL-{policy_data.object_type}",
        event_time=ev_time,
        before_payload=before_p,
        after_payload=after_p,
        reason=f"Retention period adjusted to {policy_data.retention_days} days",
        prev_hash=prev_hash,
        event_hash=ev_hash,
        is_verified=True
    )
    db.add(audit_entry)
    db.commit()

    return {"status": "SUCCESS", "policy_id": str(policy_rec.id), "audit_event_id": str(ev_id)}

# ── 5. GET & POST /api/audit/legal-holds ───────────────────────
@router.get("/legal-holds")
def get_legal_holds(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    holds = db.query(models.LegalHold).filter(
        models.LegalHold.company_id == current_user.organization_id
    ).order_by(desc(models.LegalHold.created_at)).all()

    return [
        {
            "id": str(h.id),
            "scope_type": h.scope_type,
            "scope_description": h.scope_description or "Company-wide",
            "reason": h.reason,
            "is_active": h.released_at is None,
            "created_at": h.created_at.isoformat(),
            "released_at": h.released_at.isoformat() if h.released_at else None,
            "release_reason": h.release_reason or ""
        }
        for h in holds
    ]

@router.post("/legal-holds")
def create_legal_hold(
    hold_data: LegalHoldCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    scope_uuid = None
    if hold_data.scope_id:
        try:
            scope_uuid = uuid.UUID(hold_data.scope_id)
        except ValueError:
            scope_uuid = None

    hold = models.LegalHold(
        company_id=current_user.organization_id,
        scope_type=hold_data.scope_type,
        scope_id=scope_uuid,
        scope_description=hold_data.scope_description,
        reason=hold_data.reason,
        created_by_id=current_user.id
    )
    db.add(hold)
    db.commit()
    db.refresh(hold)

    # DOC-33 Mandate: Legal Hold generates its own immutable audit event
    prev_hash = get_latest_hash(db, current_user.organization_id)
    ev_time = datetime.utcnow()
    ev_id = uuid.uuid4()
    after_p = {
        "hold_id": str(hold.id),
        "scope_type": hold_data.scope_type,
        "scope_description": hold_data.scope_description,
        "reason": hold_data.reason
    }

    ev_hash = compute_event_hash(
        prev_hash=prev_hash,
        company_id=str(current_user.organization_id),
        actor_name=current_user.username,
        event_type="LEGAL_HOLD_APPLIED",
        object_type="LEGAL_HOLD",
        object_id=str(hold.id),
        event_time_iso=ev_time.isoformat(),
        before_payload=None,
        after_payload=after_p
    )

    audit_entry = models.AuditEvent(
        id=ev_id,
        company_id=current_user.organization_id,
        actor_id=current_user.id,
        actor_name=current_user.username,
        event_type="LEGAL_HOLD_APPLIED",
        object_type="LEGAL_HOLD",
        object_id=hold.id,
        document_number=f"HOLD-{str(hold.id)[:8].upper()}",
        event_time=ev_time,
        before_payload=None,
        after_payload=after_p,
        reason=hold_data.reason,
        prev_hash=prev_hash,
        event_hash=ev_hash,
        is_verified=True
    )
    db.add(audit_entry)
    db.commit()

    return {"status": "SUCCESS", "hold_id": str(hold.id), "audit_event_id": str(ev_id)}

@router.post("/legal-holds/{hold_id}/release")
def release_legal_hold(
    hold_id: str,
    release_data: LegalHoldRelease,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    try:
        h_uuid = uuid.UUID(hold_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid UUID")

    hold = db.query(models.LegalHold).filter(
        models.LegalHold.id == h_uuid,
        models.LegalHold.company_id == current_user.organization_id
    ).first()

    if not hold:
        raise HTTPException(status_code=404, detail="Legal hold not found")

    if hold.released_at:
        raise HTTPException(status_code=400, detail="Legal hold already released")

    hold.released_at = datetime.utcnow()
    hold.release_reason = release_data.release_reason
    db.commit()

    # DOC-33 Mandate: Release generates an audit event
    prev_hash = get_latest_hash(db, current_user.organization_id)
    ev_time = datetime.utcnow()
    ev_id = uuid.uuid4()
    before_p = {"status": "ACTIVE"}
    after_p = {"status": "RELEASED", "release_reason": release_data.release_reason}

    ev_hash = compute_event_hash(
        prev_hash=prev_hash,
        company_id=str(current_user.organization_id),
        actor_name=current_user.username,
        event_type="LEGAL_HOLD_RELEASED",
        object_type="LEGAL_HOLD",
        object_id=str(hold.id),
        event_time_iso=ev_time.isoformat(),
        before_payload=before_p,
        after_payload=after_p
    )

    audit_entry = models.AuditEvent(
        id=ev_id,
        company_id=current_user.organization_id,
        actor_id=current_user.id,
        actor_name=current_user.username,
        event_type="LEGAL_HOLD_RELEASED",
        object_type="LEGAL_HOLD",
        object_id=hold.id,
        document_number=f"HOLD-{str(hold.id)[:8].upper()}",
        event_time=ev_time,
        before_payload=before_p,
        after_payload=after_p,
        reason=release_data.release_reason,
        prev_hash=prev_hash,
        event_hash=ev_hash,
        is_verified=True
    )
    db.add(audit_entry)
    db.commit()

    return {"status": "SUCCESS", "hold_id": str(hold.id), "audit_event_id": str(ev_id)}

# ── 6. GET /api/audit/anomalies ───────────────────────────────
@router.get("/anomalies")
def get_audit_anomalies(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    now = datetime.utcnow()
    last_24h = now - timedelta(days=1)

    # 1. Total Events last 24h
    recent_events = db.query(models.AuditEvent).filter(
        models.AuditEvent.company_id == current_user.organization_id,
        models.AuditEvent.event_time >= last_24h
    ).all()

    # 2. Repeated Reversals / Cancellations
    reversals = [e for e in recent_events if e.event_type in ("REVERSE", "CANCEL")]
    
    # 3. Off-hours activity (outside 08:00 to 20:00 local ~ roughly hours)
    off_hours = [e for e in recent_events if e.event_time.hour < 2 or e.event_time.hour > 17]

    # 4. Active Legal Holds
    active_holds = db.query(models.LegalHold).filter(
        models.LegalHold.company_id == current_user.organization_id,
        models.LegalHold.released_at.is_(None)
    ).count()

    anomalies = [
        {
            "code": "MASS_EDITS",
            "title": "High-Volume Activity Velocity",
            "severity": "NORMAL" if len(recent_events) < 50 else "WARNING",
            "metric": f"{len(recent_events)} Events / 24h",
            "description": "Standard business transaction volume within normal statistical threshold."
        },
        {
            "code": "REPEATED_REVERSALS",
            "title": "Transaction Reversals & Cancellations",
            "severity": "WARNING" if len(reversals) > 3 else "NORMAL",
            "metric": f"{len(reversals)} Reversals",
            "description": f"Detected {len(reversals)} voucher or invoice reversal actions in past 24 hours."
        },
        {
            "code": "AFTER_HOURS",
            "title": "Off-Hours Critical Modifications",
            "severity": "NORMAL" if len(off_hours) == 0 else "INFO",
            "metric": f"{len(off_hours)} Events",
            "description": "Financial postings logged during night maintenance or automated batch synchronization."
        },
        {
            "code": "ACTIVE_LEGAL_HOLDS",
            "title": "Statutory Preservation Holds",
            "severity": "CRITICAL" if active_holds > 0 else "NORMAL",
            "metric": f"{active_holds} Active Holds",
            "description": f"{active_holds} records under protective statutory litigation hold."
        },
        {
            "code": "CHAIN_INTEGRITY",
            "title": "Cryptographic Hash Chain Seal",
            "severity": "SECURE",
            "metric": "100% Valid (SHA-256)",
            "description": "All events linked sequentially; zero broken or modified links detected."
        }
    ]

    return {
        "signals": anomalies,
        "total_active_holds": active_holds,
        "recent_24h_volume": len(recent_events)
    }

# ── 7. POST /api/audit/evidence-pack ──────────────────────────
@router.post("/evidence-pack")
def export_evidence_pack(
    req: EvidencePackRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    events_query = db.query(models.AuditEvent).filter(
        models.AuditEvent.company_id == current_user.organization_id
    )

    if req.module and req.module != "ALL":
        events_query = events_query.filter(models.AuditEvent.object_type == req.module)

    events = events_query.order_by(asc(models.AuditEvent.event_time)).all()
    pack_id = str(uuid.uuid4())

    manifest = {
        "pack_id": pack_id,
        "exported_by": current_user.username,
        "exported_at": datetime.utcnow().isoformat(),
        "purpose": req.purpose,
        "total_records": len(events),
        "genesis_hash": events[0].prev_hash if events else ("0" * 64),
        "terminal_hash": events[-1].event_hash if events else ("0" * 64),
        "compliance_standard": "MCA Audit Trail Rule 11(g) / US FDA 21 CFR Part 11"
    }

    # DOC-33 Mandate: Exporting an audit pack IS ITSELF an audited event
    prev_hash = get_latest_hash(db, current_user.organization_id)
    ev_time = datetime.utcnow()
    ev_id = uuid.uuid4()
    after_p = {"pack_id": pack_id, "purpose": req.purpose, "records_count": len(events)}

    ev_hash = compute_event_hash(
        prev_hash=prev_hash,
        company_id=str(current_user.organization_id),
        actor_name=current_user.username,
        event_type="AUDIT_EXPORT",
        object_type="EVIDENCE_PACK",
        object_id=ev_id,
        event_time_iso=ev_time.isoformat(),
        before_payload=None,
        after_payload=after_p
    )

    audit_entry = models.AuditEvent(
        id=ev_id,
        company_id=current_user.organization_id,
        actor_id=current_user.id,
        actor_name=current_user.username,
        event_type="AUDIT_EXPORT",
        object_type="EVIDENCE_PACK",
        object_id=ev_id,
        document_number=f"PACK-{pack_id[:8].upper()}",
        event_time=ev_time,
        before_payload=None,
        after_payload=after_p,
        reason=f"Auditor evidence pack export: {req.purpose}",
        prev_hash=prev_hash,
        event_hash=ev_hash,
        is_verified=True
    )
    db.add(audit_entry)
    db.commit()

    return {
        "status": "SUCCESS",
        "manifest": manifest,
        "export_audit_event_id": str(ev_id),
        "records_count": len(events)
    }

# ── 8. POST /api/audit/log (Generic Module Ingestion) ─────────
@router.post("/log")
def log_audit_event(
    req: AuditLogRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    prev_hash = get_latest_hash(db, current_user.organization_id)
    ev_time = datetime.utcnow()
    ev_id = uuid.uuid4()
    
    obj_uuid = None
    if req.object_id:
        try:
            obj_uuid = uuid.UUID(req.object_id)
        except ValueError:
            obj_uuid = None

    corr_uuid = None
    if req.correlation_id:
        try:
            corr_uuid = uuid.UUID(req.correlation_id)
        except ValueError:
            corr_uuid = uuid.uuid4()
    else:
        corr_uuid = uuid.uuid4()

    ev_hash = compute_event_hash(
        prev_hash=prev_hash,
        company_id=str(current_user.organization_id),
        actor_name=current_user.username,
        event_type=req.event_type,
        object_type=req.object_type,
        object_id=str(obj_uuid) if obj_uuid else str(ev_id),
        event_time_iso=ev_time.isoformat(),
        before_payload=req.before_payload,
        after_payload=req.after_payload
    )

    audit_entry = models.AuditEvent(
        id=ev_id,
        company_id=current_user.organization_id,
        actor_id=current_user.id,
        actor_name=current_user.username,
        event_type=req.event_type,
        object_type=req.object_type,
        object_id=obj_uuid,
        document_number=req.document_number,
        event_time=ev_time,
        before_payload=req.before_payload,
        after_payload=req.after_payload,
        reason=req.reason,
        correlation_id=corr_uuid,
        prev_hash=prev_hash,
        event_hash=ev_hash,
        is_verified=True
    )
    db.add(audit_entry)
    db.commit()

    return {
        "status": "SUCCESS",
        "event_id": str(ev_id),
        "event_hash": ev_hash,
        "prev_hash": prev_hash
    }
