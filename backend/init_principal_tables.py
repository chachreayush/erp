import os
import sys
import uuid
from datetime import datetime, timedelta

# Ensure python path includes backend
sys.path.insert(0, os.path.dirname(__file__))

from database import engine, SessionLocal, Base
from models import (
    Base,
    PrincipalOperatingContext,
    PrincipalAgreementVersion,
    PrincipalProductRule,
    PrincipalCustomerRule,
    PrincipalOwnershipRule,
    PrincipalEvent,
    PrincipalStockSnapshot,
    PrincipalClaim,
    PrincipalClaimLine,
    PrincipalReconciliation,
    PrincipalReconciliationLine,
    PrincipalStatementRun,
    PrincipalStatementLine,
    PrincipalCostAttribution,
    PrincipalCommissionRef,
    PrincipalSyncCheckpoint,
    Organization
)

def init_principal_tables():
    print("=" * 60)
    print("INITIALIZING DOC-36 PRINCIPAL & C&F OPERATIONS TABLES")
    print("=" * 60)

    tables = [
        PrincipalOperatingContext.__table__,
        PrincipalAgreementVersion.__table__,
        PrincipalProductRule.__table__,
        PrincipalCustomerRule.__table__,
        PrincipalOwnershipRule.__table__,
        PrincipalEvent.__table__,
        PrincipalStockSnapshot.__table__,
        PrincipalClaim.__table__,
        PrincipalClaimLine.__table__,
        PrincipalReconciliation.__table__,
        PrincipalReconciliationLine.__table__,
        PrincipalStatementRun.__table__,
        PrincipalStatementLine.__table__,
        PrincipalCostAttribution.__table__,
        PrincipalCommissionRef.__table__,
        PrincipalSyncCheckpoint.__table__,
    ]

    print(f"Creating {len(tables)} tables in PostgreSQL...")
    Base.metadata.create_all(bind=engine, tables=tables)
    print("Tables created successfully!")

    db = SessionLocal()
    try:
        # Check default organization
        org = db.query(Organization).first()
        org_id = org.id if org else uuid.UUID("78fca6c8-eb92-41c4-96ec-ac2e150d56a4")

        existing_ctx = db.query(PrincipalOperatingContext).first()
        if existing_ctx:
            print("Principal data already seeded. Skipping seed.")
            return

        print("Seeding Enterprise Principal C&F Data...")

        # 1. Principals
        p1_id = uuid.uuid4()
        p2_id = uuid.uuid4()

        # 2. Agreement Versions
        agr1 = PrincipalAgreementVersion(
            id=uuid.uuid4(),
            principal_id=p1_id,
            agreement_number="AGR-2026-SUN-01",
            version_no="v1.0",
            valid_from=datetime.utcnow() - timedelta(days=90),
            valid_to=datetime.utcnow() + timedelta(days=275),
            terms_json={
                "commission_rate_pct": 6.5,
                "freight_bearer": "ADMIN_COMPANY",
                "gl_expense_account": "5200",
                "claim_window_days": 45,
                "credit_days": 30,
                "breakage_allowance_pct": 0.5
            },
            status="ACTIVE"
        )

        agr2 = PrincipalAgreementVersion(
            id=uuid.uuid4(),
            principal_id=p2_id,
            agreement_number="AGR-2026-CIP-01",
            version_no="v1.0",
            valid_from=datetime.utcnow() - timedelta(days=60),
            valid_to=datetime.utcnow() + timedelta(days=305),
            terms_json={
                "commission_rate_pct": 5.0,
                "freight_bearer": "CLIENT_COMPANY",
                "claim_window_days": 30,
                "credit_days": 21,
                "breakage_allowance_pct": 0.25
            },
            status="ACTIVE"
        )
        db.add_all([agr1, agr2])
        db.flush()

        # 3. Operating Contexts
        ctx1 = PrincipalOperatingContext(
            id=uuid.uuid4(),
            company_id=org_id,
            principal_id=p1_id,
            principal_code="P-SUN-001",
            principal_name="Sun Pharma Healthcare Ltd.",
            agreement_version_id=agr1.id,
            status="ACTIVE"
        )
        ctx2 = PrincipalOperatingContext(
            id=uuid.uuid4(),
            company_id=org_id,
            principal_id=p2_id,
            principal_code="P-CIP-002",
            principal_name="Cipla Therapeutics Ltd.",
            agreement_version_id=agr2.id,
            status="ACTIVE"
        )
        db.add_all([ctx1, ctx2])

        # 4. Product Rules (Authorized SKUs)
        pr1 = PrincipalProductRule(
            id=uuid.uuid4(),
            principal_id=p1_id,
            product_id=uuid.uuid4(),
            product_name="Amoxicillin 500mg Trihydrate",
            sku_code="SKU-AMOX-500",
            valid_from=datetime.utcnow() - timedelta(days=90),
            is_exclusive=True,
            status="ACTIVE"
        )
        pr2 = PrincipalProductRule(
            id=uuid.uuid4(),
            principal_id=p1_id,
            product_id=uuid.uuid4(),
            product_name="Paracetamol 650mg Infusion",
            sku_code="SKU-PCM-650",
            valid_from=datetime.utcnow() - timedelta(days=90),
            is_exclusive=False,
            status="ACTIVE"
        )
        pr3 = PrincipalProductRule(
            id=uuid.uuid4(),
            principal_id=p2_id,
            product_id=uuid.uuid4(),
            product_name="Azithromycin 250mg Tablets",
            sku_code="SKU-AZI-250",
            valid_from=datetime.utcnow() - timedelta(days=60),
            is_exclusive=True,
            status="ACTIVE"
        )
        db.add_all([pr1, pr2, pr3])

        # 5. Ownership Rules
        own1 = PrincipalOwnershipRule(
            id=uuid.uuid4(),
            principal_id=p1_id,
            product_scope="ALL",
            warehouse_scope="ALL",
            mode="CONSIGNMENT_CUSTODY",
            valid_from=datetime.utcnow() - timedelta(days=90)
        )
        own2 = PrincipalOwnershipRule(
            id=uuid.uuid4(),
            principal_id=p2_id,
            product_scope="ALL",
            warehouse_scope="ALL",
            mode="CONSIGNMENT_CUSTODY",
            valid_from=datetime.utcnow() - timedelta(days=60)
        )
        db.add_all([own1, own2])

        # 6. Stock Snapshots (Segregated by Principal owner)
        snap1 = PrincipalStockSnapshot(
            id=uuid.uuid4(),
            principal_id=p1_id,
            product_id=pr1.product_id,
            product_name=pr1.product_name,
            batch_no="B-SUN-991",
            warehouse_name="Central C&F Depot - Jaipur",
            as_of=datetime.utcnow(),
            qty_on_hand=2400.0,
            qty_reserved=200.0,
            qty_damage_breakage=15.0,
            unit_cost=15.0,
            total_valuation=36000.0,
            source_version="DOC16:v2"
        )
        snap2 = PrincipalStockSnapshot(
            id=uuid.uuid4(),
            principal_id=p1_id,
            product_id=pr2.product_id,
            product_name=pr2.product_name,
            batch_no="B-SUN-442",
            warehouse_name="Central C&F Depot - Jaipur",
            as_of=datetime.utcnow(),
            qty_on_hand=1800.0,
            qty_reserved=100.0,
            qty_damage_breakage=0.0,
            unit_cost=12.0,
            total_valuation=21600.0,
            source_version="DOC16:v2"
        )
        snap3 = PrincipalStockSnapshot(
            id=uuid.uuid4(),
            principal_id=p2_id,
            product_id=pr3.product_id,
            product_name=pr3.product_name,
            batch_no="B-CIP-812",
            warehouse_name="Regional Distribution Center - Delhi",
            as_of=datetime.utcnow(),
            qty_on_hand=1200.0,
            qty_reserved=50.0,
            qty_damage_breakage=40.0,
            unit_cost=40.0,
            total_valuation=48000.0,
            source_version="DOC16:v2"
        )
        db.add_all([snap1, snap2, snap3])

        # 7. Principal Claims
        clm1 = PrincipalClaim(
            id=uuid.uuid4(),
            claim_number="CLM-SUN-2026-001",
            principal_id=p1_id,
            principal_name="Sun Pharma Healthcare Ltd.",
            claim_type="EXPIRY",
            source_doc_type="RETURN_INWARD",
            source_doc_id="RTN-2026-0812",
            product_id=pr1.product_id,
            product_name=pr1.product_name,
            batch_no="B-SUN-991",
            claimed_qty=150.0,
            claimed_amount=2250.0,
            approved_amount=0.0,
            reason="Near-expiry distributor batch returns within contractual window",
            status="PENDING"
        )
        clm2 = PrincipalClaim(
            id=uuid.uuid4(),
            claim_number="CLM-CIP-2026-002",
            principal_id=p2_id,
            principal_name="Cipla Therapeutics Ltd.",
            claim_type="BREAKAGE",
            source_doc_type="CARGO_POD_EXCEPTION",
            source_doc_id="CN-2026-0104",
            product_id=pr3.product_id,
            product_name=pr3.product_name,
            batch_no="B-CIP-812",
            claimed_qty=40.0,
            claimed_amount=1600.0,
            approved_amount=1600.0,
            reason="Transit breakage verified during unloading at Delhi Hub",
            status="APPROVED",
            settlement_doc_id="REC-PAY-2026-0091"
        )
        db.add_all([clm1, clm2])
        db.flush()

        # Claim Lines
        line1 = PrincipalClaimLine(
            id=uuid.uuid4(),
            claim_id=clm1.id,
            source_movement_id="MOV-2026-901",
            product_id=pr1.product_id,
            batch_no="B-SUN-991",
            qty=150.0,
            eligible_qty=150.0,
            rate=15.0,
            amount=2250.0,
            approved_amount=0.0,
            status="PENDING"
        )
        line2 = PrincipalClaimLine(
            id=uuid.uuid4(),
            claim_id=clm2.id,
            source_movement_id="MOV-2026-902",
            product_id=pr3.product_id,
            batch_no="B-CIP-812",
            qty=40.0,
            eligible_qty=40.0,
            rate=40.0,
            amount=1600.0,
            approved_amount=1600.0,
            status="APPROVED"
        )
        db.add_all([line1, line2])

        # 8. Principal Reconciliation Run
        rec1 = PrincipalReconciliation(
            id=uuid.uuid4(),
            recon_number="REC-PRN-2026-001",
            principal_id=p1_id,
            principal_name="Sun Pharma Healthcare Ltd.",
            period_from=datetime.utcnow() - timedelta(days=30),
            period_to=datetime.utcnow(),
            system_opening_val=50000.0,
            external_opening_val=50000.0,
            system_closing_val=57600.0,
            external_closing_val=57600.0,
            net_variance_val=0.0,
            matched_lines_count=18,
            variance_lines_count=0,
            version="v1.0",
            status="APPROVED"
        )
        db.add(rec1)
        db.flush()

        recline1 = PrincipalReconciliationLine(
            id=uuid.uuid4(),
            reconciliation_id=rec1.id,
            source_key="INV-2026-0901",
            source_type="SALE",
            system_qty=120.0,
            external_qty=120.0,
            variance_qty=0.0,
            system_val=1800.0,
            external_val=1800.0,
            variance_val=0.0,
            status="MATCHED"
        )
        db.add(recline1)

        # 9. Cost Attribution (Adhering to DOC-35 Admin Freight policy)
        cost1 = PrincipalCostAttribution(
            id=uuid.uuid4(),
            principal_id=p1_id,
            source_cost_id="EVT-FRT-2026-001",
            bearer="ADMIN_COMPANY",
            recovery_target="SUBSIDY",
            amount=2150.0,
            policy_version="v2.0",
            status="ATTRIBUTED"
        )
        cost2 = PrincipalCostAttribution(
            id=uuid.uuid4(),
            principal_id=p2_id,
            source_cost_id="EVT-FRT-2026-002",
            bearer="PRINCIPAL",
            recovery_target="PRINCIPAL_CLAIM",
            amount=1850.0,
            policy_version="v2.0",
            status="ATTRIBUTED"
        )
        db.add_all([cost1, cost2])

        # 10. Commission Reference
        comm1 = PrincipalCommissionRef(
            id=uuid.uuid4(),
            principal_id=p1_id,
            source_event_id=uuid.uuid4(),
            commission_doc_id="COM-2026-0901",
            gross_sales_val=45000.0,
            commission_rate_pct=6.5,
            commission_amount=2925.0,
            status="ACCRUED"
        )
        db.add(comm1)

        db.commit()
        print("DOC-36 Principal & C&F Operations data seeded successfully!")

    except Exception as e:
        db.rollback()
        print(f"Error during seeding: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    init_principal_tables()
