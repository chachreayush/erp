import uuid
import json
import hashlib
from datetime import datetime, date, timedelta
from database import engine, SessionLocal, Base
import models

def compute_audit_hash(prev_hash: str, company_id: str, actor_name: str, event_type: str, object_type: str, object_id: str, event_time_iso: str, before_payload: dict, after_payload: dict) -> str:
    raw = f"{prev_hash}|{company_id}|{actor_name}|{event_type}|{object_type}|{object_id}|{event_time_iso}|{json.dumps(before_payload or {}, sort_keys=True)}|{json.dumps(after_payload or {}, sort_keys=True)}"
    return hashlib.sha256(raw.encode('utf-8')).hexdigest()

def init_audit_tables():
    print("Creating DOC-33 tables (audit_events, retention_policies, legal_holds)...")
    Base.metadata.create_all(bind=engine)
    print("Tables created successfully.")

    db = SessionLocal()
    try:
        org = db.query(models.Organization).first()
        if not org:
            print("No organization found. Skipping seed.")
            return

        company_id = org.id
        admin_user = db.query(models.User).filter(models.User.organization_id == company_id).first()
        actor_id = admin_user.id if admin_user else None
        actor_name = admin_user.username if admin_user else "admin"

        # 1. Seed Retention Policies
        existing_policy = db.query(models.RetentionPolicy).filter(models.RetentionPolicy.company_id == company_id).first()
        if not existing_policy:
            print("Seeding default statutory retention policies (MCA/GST)...")
            policies = [
                models.RetentionPolicy(
                    company_id=company_id,
                    object_type="INVOICE",
                    retention_days=2920, # 8 Years
                    legal_hold_allowed=True,
                    effective_from=date(2026, 4, 1)
                ),
                models.RetentionPolicy(
                    company_id=company_id,
                    object_type="VOUCHER",
                    retention_days=2920, # 8 Years
                    legal_hold_allowed=True,
                    effective_from=date(2026, 4, 1)
                ),
                models.RetentionPolicy(
                    company_id=company_id,
                    object_type="AUDIT_EVENT",
                    retention_days=3650, # 10 Years
                    legal_hold_allowed=True,
                    effective_from=date(2026, 4, 1)
                ),
                models.RetentionPolicy(
                    company_id=company_id,
                    object_type="PARTY",
                    retention_days=3650, # 10 Years
                    legal_hold_allowed=True,
                    effective_from=date(2026, 4, 1)
                )
            ]
            db.add_all(policies)
            db.commit()
            print(f"Seeded {len(policies)} statutory retention policies.")

        # 2. Seed Sample Legal Hold
        existing_hold = db.query(models.LegalHold).filter(models.LegalHold.company_id == company_id).first()
        if not existing_hold:
            print("Seeding sample statutory legal hold...")
            sample_hold = models.LegalHold(
                company_id=company_id,
                scope_type="MODULE",
                scope_description="Sales Invoices Series RJ-INV-2025/26 (Commercial Tax Audit Notice Ref #CT-9821)",
                reason="Statutory preservation notice issued under CGST Act Section 67; all related outward invoices and credit adjustments held.",
                created_by_id=actor_id,
                created_at=datetime.utcnow() - timedelta(days=2)
            )
            db.add(sample_hold)
            db.commit()
            print("Seeded statutory legal hold.")

        # 3. Seed Cryptographically Chained Audit Events
        existing_events = db.query(models.AuditEvent).filter(models.AuditEvent.company_id == company_id).count()
        if existing_events == 0:
            print("Seeding cryptographically chained audit events...")
            genesis_hash = "0" * 64

            sample_events_data = [
                {
                    "event_type": "CREATE",
                    "object_type": "INVOICE",
                    "doc_no": "RJ-INV-6874",
                    "reason": "Retail counter sales billing execution",
                    "before": None,
                    "after": {"invoice_number": "RJ-INV-6874", "customer": "Apollo Pharmacy Ltd.", "grand_total": 571.00, "status": "POSTED"},
                    "hours_ago": 24
                },
                {
                    "event_type": "POST",
                    "object_type": "VOUCHER",
                    "doc_no": "JRN/2026-27/0161",
                    "reason": "Automated GL posting from Supplier Debit Note RJ-DN-0020",
                    "before": None,
                    "after": {"voucher_number": "JRN/2026-27/0161", "total_debit": 863.98, "total_credit": 863.98, "status": "BALANCED"},
                    "hours_ago": 18
                },
                {
                    "event_type": "UPDATE",
                    "object_type": "PARTY",
                    "doc_no": "CUST-0042",
                    "reason": "Credit limit revision approved by Branch Manager",
                    "before": {"party_name": "Apollo Pharmacy Ltd.", "credit_limit": 50000.0, "status": "ACTIVE"},
                    "after": {"party_name": "Apollo Pharmacy Ltd.", "credit_limit": 100000.0, "status": "ACTIVE"},
                    "hours_ago": 12
                },
                {
                    "event_type": "APPROVE",
                    "object_type": "WORKFLOW_TASK",
                    "doc_no": "PO-2026-0891",
                    "reason": "Four-eyes maker-checker authorization tier 2 approved",
                    "before": {"status": "PENDING", "stage": "Stage 2: Branch Manager"},
                    "after": {"status": "APPROVED", "stage": "Stage 2: Branch Manager", "approved_by": "admin"},
                    "hours_ago": 6
                },
                {
                    "event_type": "LEGAL_HOLD_APPLIED",
                    "object_type": "LEGAL_HOLD",
                    "doc_no": "HOLD-2026-0001",
                    "reason": "Statutory preservation notice issued under CGST Act Section 67",
                    "before": None,
                    "after": {"scope_type": "MODULE", "scope_description": "Sales Invoices Series RJ-INV-2025/26", "status": "ACTIVE"},
                    "hours_ago": 2
                }
            ]

            current_prev_hash = genesis_hash
            for ev in sample_events_data:
                ev_time = datetime.utcnow() - timedelta(hours=ev["hours_ago"])
                ev_id = uuid.uuid4()
                time_iso = ev_time.isoformat()
                
                ev_hash = compute_audit_hash(
                    prev_hash=current_prev_hash,
                    company_id=str(company_id),
                    actor_name=actor_name,
                    event_type=ev["event_type"],
                    object_type=ev["object_type"],
                    object_id=str(ev_id),
                    event_time_iso=time_iso,
                    before_payload=ev["before"],
                    after_payload=ev["after"]
                )

                audit_rec = models.AuditEvent(
                    id=ev_id,
                    company_id=company_id,
                    actor_id=actor_id,
                    actor_name=actor_name,
                    event_type=ev["event_type"],
                    object_type=ev["object_type"],
                    object_id=ev_id,
                    document_number=ev["doc_no"],
                    event_time=ev_time,
                    before_payload=ev["before"],
                    after_payload=ev["after"],
                    reason=ev["reason"],
                    correlation_id=uuid.uuid4(),
                    prev_hash=current_prev_hash,
                    event_hash=ev_hash,
                    is_verified=True
                )
                db.add(audit_rec)
                current_prev_hash = ev_hash

            db.commit()
            print(f"Seeded {len(sample_events_data)} cryptographically chained audit events. Final hash: {current_prev_hash[:16]}...")
        else:
            print(f"Audit events table already contains {existing_events} records.")

    finally:
        db.close()

if __name__ == "__main__":
    init_audit_tables()
