import os
import sys
import uuid
import hashlib
from datetime import datetime, timedelta

# Ensure python path includes backend
sys.path.insert(0, os.path.dirname(__file__))

from database import engine, SessionLocal, Base
from models import (
    Base,
    PrincipalCommissionAgreement,
    CommissionRule,
    CommissionScope,
    CommissionEvent,
    CommissionMeasure,
    CommissionCalculation,
    CommissionAdjustment,
    RecoveryClaim,
    RecoveryClaimLine,
    RecoveryDocumentLink,
    RecoveryStatement,
    RecoveryStatementLine,
    CommissionException,
    CommissionAudit,
    PrincipalOperatingContext,
    Organization
)

def init_commission_tables():
    print("=" * 60)
    print("INITIALIZING DOC-37 PRINCIPAL COMMISSION & RECOVERY TABLES")
    print("=" * 60)

    tables = [
        PrincipalCommissionAgreement.__table__,
        CommissionRule.__table__,
        CommissionScope.__table__,
        CommissionEvent.__table__,
        CommissionMeasure.__table__,
        CommissionCalculation.__table__,
        CommissionAdjustment.__table__,
        RecoveryClaim.__table__,
        RecoveryClaimLine.__table__,
        RecoveryDocumentLink.__table__,
        RecoveryStatement.__table__,
        RecoveryStatementLine.__table__,
        CommissionException.__table__,
        CommissionAudit.__table__,
    ]

    print(f"Creating {len(tables)} tables in PostgreSQL...")
    Base.metadata.create_all(bind=engine, tables=tables)
    print("Tables created successfully!")

    db = SessionLocal()
    try:
        # Check default organization
        org = db.query(Organization).first()
        org_id = org.id if org else uuid.UUID("78fca6c8-eb92-41c4-96ec-ac2e150d56a4")

        # Find existing principals from DOC-36 if available
        sun_ctx = db.query(PrincipalOperatingContext).filter(PrincipalOperatingContext.principal_code == "P-SUN-001").first()
        p1_id = sun_ctx.principal_id if sun_ctx else uuid.uuid4()

        cip_ctx = db.query(PrincipalOperatingContext).filter(PrincipalOperatingContext.principal_code == "P-CIP-002").first()
        p2_id = cip_ctx.principal_id if cip_ctx else uuid.uuid4()

        existing_agr = db.query(PrincipalCommissionAgreement).first()
        if existing_agr:
            print("Principal Commission Agreements already seeded. Skipping initial seeding.")
            return

        print("Seeding Enterprise Principal Commission Agreements & Recovery Engine...")

        # 1. Agreements
        agr1 = PrincipalCommissionAgreement(
            id=uuid.uuid4(),
            company_id=org_id,
            principal_id=p1_id,
            principal_code="P-SUN-001",
            principal_name="Sun Pharma Healthcare Ltd.",
            agreement_code="AGR-COMM-SUN-2026-001",
            version_no="v1.0",
            valid_from=datetime.utcnow() - timedelta(days=90),
            valid_to=datetime.utcnow() + timedelta(days=275),
            status="ACTIVE",
            terms_json={
                "description": "Standard C&F Master Agreement with 6.5% Net Commission & Loading Recovery",
                "payment_cycle": "MONTHLY",
                "dispute_grace_days": 15,
                "minimum_guarantee_monthly": 25000.0,
                "freight_recovery_allowed": True
            }
        )

        agr2 = PrincipalCommissionAgreement(
            id=uuid.uuid4(),
            company_id=org_id,
            principal_id=p2_id,
            principal_code="P-CIP-002",
            principal_name="Cipla Therapeutics Ltd.",
            agreement_code="AGR-COMM-CIP-2026-002",
            version_no="v1.0",
            valid_from=datetime.utcnow() - timedelta(days=60),
            valid_to=datetime.utcnow() + timedelta(days=305),
            status="ACTIVE",
            terms_json={
                "description": "Consignment Distribution Agreement with 5.0% Gross Commission & Secondary Handling",
                "payment_cycle": "FORTNIGHTLY",
                "dispute_grace_days": 10,
                "minimum_guarantee_monthly": 20000.0,
                "freight_recovery_allowed": True
            }
        )
        db.add_all([agr1, agr2])
        db.flush()

        # 2. Commission Rules
        # Sun Pharma Rules
        r1_sun = CommissionRule(
            id=uuid.uuid4(),
            agreement_id=agr1.id,
            rule_code="RULE-SUN-SALES-PCT",
            rule_name="Standard Net Sales Commission 6.5%",
            priority=1,
            rule_type="PERCENTAGE",
            rate_pct=6.5,
            formula_config={"base": "NET_SALES_VALUE", "deduct_returns": True},
            status="ACTIVE"
        )
        r2_sun = CommissionRule(
            id=uuid.uuid4(),
            agreement_id=agr1.id,
            rule_code="RULE-SUN-MIN-GUARANTEE",
            rule_name="Monthly Minimum Floor Guarantee",
            priority=2,
            rule_type="MINIMUM_GUARANTEE",
            min_guarantee_amount=25000.0,
            status="ACTIVE"
        )
        r3_sun = CommissionRule(
            id=uuid.uuid4(),
            agreement_id=agr1.id,
            rule_code="RULE-SUN-LOADING-RECOVERY",
            rule_name="Consignment Inward Loading Recovery",
            priority=3,
            rule_type="PER_UNIT",
            unit_rate=300.0,
            formula_config={"uom": "CONSIGNMENT"},
            status="ACTIVE"
        )

        # Cipla Rules
        r1_cip = CommissionRule(
            id=uuid.uuid4(),
            agreement_id=agr2.id,
            rule_code="RULE-CIP-SALES-PCT",
            rule_name="Gross Sales Turnover Commission 5.0%",
            priority=1,
            rule_type="PERCENTAGE",
            rate_pct=5.0,
            formula_config={"base": "GROSS_SALES_VALUE"},
            status="ACTIVE"
        )
        r2_cip = CommissionRule(
            id=uuid.uuid4(),
            agreement_id=agr2.id,
            rule_code="RULE-CIP-HANDLING",
            rule_name="Secondary Packaging & Handling",
            priority=2,
            rule_type="PER_UNIT",
            unit_rate=15.0,
            formula_config={"uom": "PACKAGE"},
            status="ACTIVE"
        )
        db.add_all([r1_sun, r2_sun, r3_sun, r1_cip, r2_cip])
        db.flush()

        # 3. Commission Scopes
        sc1 = CommissionScope(
            id=uuid.uuid4(),
            rule_id=r1_sun.id,
            product_scope="ALL",
            customer_scope="ALL",
            territory_scope="RAJASTHAN_ZONE"
        )
        sc2 = CommissionScope(
            id=uuid.uuid4(),
            rule_id=r1_cip.id,
            product_scope="ALL",
            customer_scope="ALL",
            territory_scope="DELHI_NCR_ZONE"
        )
        db.add_all([sc1, sc2])

        # 4. Commission Events & Calculations
        # Event 1: Sun Pharma Sales Bill
        evt1 = CommissionEvent(
            id=uuid.uuid4(),
            company_id=org_id,
            principal_id=p1_id,
            event_type="SALES_BILL",
            event_date=datetime.utcnow() - timedelta(days=12),
            source_doc_type="INVOICE",
            source_doc_id="INV-2026-0941",
            idempotency_key="EVT-SUN-INV-2026-0941",
            payload_json={"gross_val": 475000.0, "discounts": 25000.0, "net_val": 450000.0}
        )
        # Event 2: Sun Pharma Ancillary Recovery
        evt2 = CommissionEvent(
            id=uuid.uuid4(),
            company_id=org_id,
            principal_id=p1_id,
            event_type="FREIGHT_COST",
            event_date=datetime.utcnow() - timedelta(days=10),
            source_doc_type="FREIGHT_EVENT",
            source_doc_id="FRT-EVT-0812",
            idempotency_key="EVT-SUN-FRT-0812",
            payload_json={"route": "Bhiwadi to Jaipur", "weight_kg": 1450, "recovery_authorized": True}
        )
        # Event 3: Cipla Sales Bill
        evt3 = CommissionEvent(
            id=uuid.uuid4(),
            company_id=org_id,
            principal_id=p2_id,
            event_type="SALES_BILL",
            event_date=datetime.utcnow() - timedelta(days=6),
            source_doc_type="INVOICE",
            source_doc_id="INV-2026-0955",
            idempotency_key="EVT-CIP-INV-2026-0955",
            payload_json={"gross_val": 380000.0, "tax_val": 45600.0}
        )
        # Event 4: Cipla Handling
        evt4 = CommissionEvent(
            id=uuid.uuid4(),
            company_id=org_id,
            principal_id=p2_id,
            event_type="STORAGE_CHARGE",
            event_date=datetime.utcnow() - timedelta(days=4),
            source_doc_type="CONSIGNMENT",
            source_doc_id="CSG-CIP-0044",
            idempotency_key="EVT-CIP-CSG-0044",
            payload_json={"packages": 240, "pallet_count": 8}
        )
        db.add_all([evt1, evt2, evt3, evt4])
        db.flush()

        # Measures
        m1 = CommissionMeasure(
            id=uuid.uuid4(),
            event_id=evt1.id,
            measure_type="NET_SALES_VALUE",
            base_amount=450000.0,
            base_quantity=1.0,
            uom="INR"
        )
        m2 = CommissionMeasure(
            id=uuid.uuid4(),
            event_id=evt2.id,
            measure_type="GROSS_SALES_VALUE",
            base_amount=3850.0,
            base_quantity=1.0,
            uom="INR"
        )
        m3 = CommissionMeasure(
            id=uuid.uuid4(),
            event_id=evt3.id,
            measure_type="GROSS_SALES_VALUE",
            base_amount=380000.0,
            base_quantity=1.0,
            uom="INR"
        )
        m4 = CommissionMeasure(
            id=uuid.uuid4(),
            event_id=evt4.id,
            measure_type="PACKAGE_COUNT",
            base_amount=3600.0,
            base_quantity=240.0,
            uom="PACKAGES"
        )
        db.add_all([m1, m2, m3, m4])

        # Calculations
        calc1 = CommissionCalculation(
            id=uuid.uuid4(),
            calculation_number="CALC-SUN-2026-0001",
            event_id=evt1.id,
            rule_id=r1_sun.id,
            principal_id=p1_id,
            principal_name="Sun Pharma Healthcare Ltd.",
            category="EARNED_COMMISSION",
            base_value=450000.0,
            rate_applied=6.5000,
            calculated_amount=29250.00,
            formula_trace="Formula: 450000.00 * 6.50% = 29250.00 INR (Standard Net Sales Commission)",
            state="APPROVED",
            sha256_hash=hashlib.sha256(b"CALC-SUN-2026-0001:450000.00:6.50:29250.00").hexdigest()
        )
        calc2 = CommissionCalculation(
            id=uuid.uuid4(),
            calculation_number="CALC-SUN-2026-0002",
            event_id=evt2.id,
            rule_id=r3_sun.id,
            principal_id=p1_id,
            principal_name="Sun Pharma Healthcare Ltd.",
            category="RECOVERABLE_EXPENSE",
            base_value=3850.0,
            rate_applied=100.0000,
            calculated_amount=3850.00,
            formula_trace="Formula: Recharged Inward Freight & Demurrage Voucher = 3850.00 INR",
            state="APPROVED",
            sha256_hash=hashlib.sha256(b"CALC-SUN-2026-0002:3850.00:100.0:3850.00").hexdigest()
        )
        calc3 = CommissionCalculation(
            id=uuid.uuid4(),
            calculation_number="CALC-CIP-2026-0003",
            event_id=evt3.id,
            rule_id=r1_cip.id,
            principal_id=p2_id,
            principal_name="Cipla Therapeutics Ltd.",
            category="EARNED_COMMISSION",
            base_value=380000.0,
            rate_applied=5.0000,
            calculated_amount=19000.00,
            formula_trace="Formula: 380000.00 * 5.00% = 19000.00 INR (Turnover Commission)",
            state="APPROVED",
            sha256_hash=hashlib.sha256(b"CALC-CIP-2026-0003:380000.00:5.00:19000.00").hexdigest()
        )
        calc4 = CommissionCalculation(
            id=uuid.uuid4(),
            calculation_number="CALC-CIP-2026-0004",
            event_id=evt4.id,
            rule_id=r2_cip.id,
            principal_id=p2_id,
            principal_name="Cipla Therapeutics Ltd.",
            category="RECOVERABLE_EXPENSE",
            base_value=240.0,
            rate_applied=15.0000,
            calculated_amount=3600.00,
            formula_trace="Formula: 240 Packages * 15.00 INR = 3600.00 INR (Handling Reimbursement)",
            state="CALCULATED",
            sha256_hash=hashlib.sha256(b"CALC-CIP-2026-0004:240.00:15.00:3600.00").hexdigest()
        )
        db.add_all([calc1, calc2, calc3, calc4])
        db.flush()

        # 5. Recovery Claims
        clm1 = RecoveryClaim(
            id=uuid.uuid4(),
            claim_number="CLM-REC-2026-001",
            company_id=org_id,
            principal_id=p1_id,
            principal_name="Sun Pharma Healthcare Ltd.",
            period_from=datetime.utcnow() - timedelta(days=30),
            period_to=datetime.utcnow(),
            total_earned_commission=29250.00,
            total_recoverable_expenses=3850.00,
            total_claimed_amount=33100.00,
            approved_amount=33100.00,
            disputed_amount=0.00,
            status="APPROVED",
            submitted_at=datetime.utcnow() - timedelta(days=8),
            approved_at=datetime.utcnow() - timedelta(days=3)
        )
        clm2 = RecoveryClaim(
            id=uuid.uuid4(),
            claim_number="CLM-REC-2026-002",
            company_id=org_id,
            principal_id=p2_id,
            principal_name="Cipla Therapeutics Ltd.",
            period_from=datetime.utcnow() - timedelta(days=15),
            period_to=datetime.utcnow(),
            total_earned_commission=19000.00,
            total_recoverable_expenses=3600.00,
            total_claimed_amount=22600.00,
            approved_amount=0.00,
            disputed_amount=0.00,
            status="SUBMITTED",
            submitted_at=datetime.utcnow() - timedelta(days=1)
        )
        db.add_all([clm1, clm2])
        db.flush()

        # Claim Lines
        cl1_1 = RecoveryClaimLine(
            id=uuid.uuid4(),
            claim_id=clm1.id,
            calc_id=calc1.id,
            source_doc_type="INVOICE",
            source_doc_id="INV-2026-0941",
            line_description="Net Sales Commission 6.5% on INV-2026-0941",
            requested_amount=29250.00,
            approved_amount=29250.00,
            disputed_amount=0.00,
            status="APPROVED"
        )
        cl1_2 = RecoveryClaimLine(
            id=uuid.uuid4(),
            claim_id=clm1.id,
            calc_id=calc2.id,
            source_doc_type="FREIGHT_EVENT",
            source_doc_id="FRT-EVT-0812",
            line_description="Inward Transit Freight Recovery on FRT-EVT-0812",
            requested_amount=3850.00,
            approved_amount=3850.00,
            disputed_amount=0.00,
            status="APPROVED"
        )
        cl2_1 = RecoveryClaimLine(
            id=uuid.uuid4(),
            claim_id=clm2.id,
            calc_id=calc3.id,
            source_doc_type="INVOICE",
            source_doc_id="INV-2026-0955",
            line_description="Turnover Commission 5.0% on INV-2026-0955",
            requested_amount=19000.00,
            approved_amount=0.00,
            disputed_amount=0.00,
            status="SUBMITTED"
        )
        cl2_2 = RecoveryClaimLine(
            id=uuid.uuid4(),
            claim_id=clm2.id,
            calc_id=calc4.id,
            source_doc_type="CONSIGNMENT",
            source_doc_id="CSG-CIP-0044",
            line_description="Secondary Repack & Handling 240 Pkgs",
            requested_amount=3600.00,
            approved_amount=0.00,
            disputed_amount=0.00,
            status="SUBMITTED"
        )
        db.add_all([cl1_1, cl1_2, cl2_1, cl2_2])

        # Document Links
        doc1 = RecoveryDocumentLink(
            id=uuid.uuid4(),
            claim_id=clm1.id,
            document_type="SERVICE_INVOICE",
            document_number="SINV-2026-0081",
            amount=33100.00,
            linked_at=datetime.utcnow() - timedelta(days=2)
        )
        db.add(doc1)

        # 6. Recovery Statement
        stm1 = RecoveryStatement(
            id=uuid.uuid4(),
            statement_number="REC-STM-2026-001",
            principal_id=p1_id,
            principal_name="Sun Pharma Healthcare Ltd.",
            period_from=datetime.utcnow() - timedelta(days=30),
            period_to=datetime.utcnow(),
            earned_commission=29250.00,
            service_fees=0.00,
            expense_recovery=3850.00,
            adjustments=0.00,
            approved_commercial=33100.00,
            invoiced_total=33100.00,
            settled_total=25000.00,
            outstanding_balance=8100.00,
            disputed_total=0.00,
            statement_hash=hashlib.sha256(b"REC-STM-2026-001:33100.00:25000.00:8100.00").hexdigest(),
            status="GENERATED"
        )
        db.add(stm1)
        db.flush()

        stml1 = RecoveryStatementLine(
            id=uuid.uuid4(),
            statement_id=stm1.id,
            category="EARNED_COMMISSION",
            reference_doc_id="CLM-REC-2026-001",
            description="Earned Sales Commission - Oct 2026",
            amount=29250.00
        )
        stml2 = RecoveryStatementLine(
            id=uuid.uuid4(),
            statement_id=stm1.id,
            category="EXPENSE_RECOVERY",
            reference_doc_id="CLM-REC-2026-001",
            description="Recoverable Freight & Inward Demurrage Recharges",
            amount=3850.00
        )
        stml3 = RecoveryStatementLine(
            id=uuid.uuid4(),
            statement_id=stm1.id,
            category="SETTLEMENT",
            reference_doc_id="PAY-SUN-8841",
            description="Principal Bank Remittance Payment Recd (NEFT)",
            amount=-25000.00
        )
        db.add_all([stml1, stml2, stml3])

        # 7. Exceptions
        ex1 = CommissionException(
            id=uuid.uuid4(),
            company_id=org_id,
            source_id="SKU-DERMA-999",
            exception_type="UNMAPPED_PRODUCT",
            severity="WARNING",
            description="Dermatology SKU-DERMA-999 missing contractual commission slab. Defaulted to standard 6.5%.",
            state="RESOLVED"
        )
        ex2 = CommissionException(
            id=uuid.uuid4(),
            company_id=org_id,
            source_id="AGR-COMM-CIP-2026-002",
            exception_type="MISSING_RATE_CARD",
            severity="INFO",
            description="Cipla handling fee applies flat rate. Verified with principal operational memo.",
            state="OPEN"
        )
        db.add_all([ex1, ex2])

        # 8. Audits
        aud1 = CommissionAudit(
            id=uuid.uuid4(),
            company_id=org_id,
            object_type="CALCULATION",
            object_id="CALC-SUN-2026-0001",
            action="CALCULATE",
            actor_username="system_engine",
            after_hash=calc1.sha256_hash,
            details_json={"event": "SALES_BILL", "base": 450000.0, "rate": 6.5}
        )
        aud2 = CommissionAudit(
            id=uuid.uuid4(),
            company_id=org_id,
            object_type="CLAIM",
            object_id="CLM-REC-2026-001",
            action="APPROVE",
            actor_username="finance_lead",
            after_hash=hashlib.sha256(b"CLAIM_APPROVED:33100.00").hexdigest(),
            details_json={"claim_no": "CLM-REC-2026-001", "approved_amount": 33100.0}
        )
        db.add_all([aud1, aud2])

        db.commit()
        print("DOC-37 Principal Commission & Recovery Engine data seeded successfully!")

    except Exception as e:
        db.rollback()
        print(f"Error seeding commission data: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    init_commission_tables()
