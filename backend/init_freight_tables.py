import uuid
import json
from datetime import datetime, timedelta
from decimal import Decimal
from database import engine, SessionLocal, Base
import models

def init_freight_tables():
    print("Initializing DOC-35 Freight & Logistics Cost Recovery tables in PostgreSQL...")
    Base.metadata.create_all(bind=engine)
    print("Tables created successfully (freight_contracts, freight_lanes, freight_rate_rules, freight_ancillary_rules, freight_cost_events, freight_calculation_snapshots, freight_allocations, freight_recoveries, freight_reconciliations, freight_cost_bearer_policies, freight_exceptions).")

    db = SessionLocal()
    try:
        # Fetch or verify default tenant organization
        org = db.query(models.Organization).filter(models.Organization.is_am == True).first()
        if not org:
            org = db.query(models.Organization).first()
        if not org:
            print("No organization found. Please run initial seed first.")
            return

        company_id = org.id
        print(f"Target Organization Context: {org.name} ({company_id})")

        # 1. Seed Cost Bearer Policy
        existing_policy = db.query(models.FreightCostBearerPolicy).first()
        if not existing_policy:
            policy = models.FreightCostBearerPolicy(
                scope_type="GLOBAL",
                bearer_type="ADMIN_COMPANY",
                bearer_company_id=company_id,
                is_recharge_enabled=False,
                effective_from=datetime(2026, 1, 1),
                effective_to=None
            )
            db.add(policy)
            print("Seeded default Global Admin Cost Bearer Policy.")

        # 2. Seed Contracts, Lanes & Rate Rules
        existing_contracts = db.query(models.FreightContract).count()
        if existing_contracts == 0:
            print("Seeding initial freight contracts, lanes, and rate cards...")

            # Contract 1: V-Trans
            contract1 = models.FreightContract(
                contract_number="FC-2026-VTR-01",
                transporter_name="V-Trans Logistics India Ltd.",
                company_id=company_id,
                status="ACTIVE",
                effective_from=datetime(2026, 1, 1),
                priority=1,
                vehicle_class="32FT_CONTAINER",
                notes="Interstate primary linehaul contract with tiered weight slabs."
            )
            db.add(contract1)
            db.flush()

            # Lanes for Contract 1
            lane1_1 = models.FreightLane(
                contract_id=contract1.id,
                origin_zone="Jaipur Central Logistics Hub",
                destination_zone="Delhi South Distribution Center",
                distance_km=Decimal("260.00"),
                distance_source="CONTRACTED",
                transit_days=1,
                priority=1
            )
            lane1_2 = models.FreightLane(
                contract_id=contract1.id,
                origin_zone="Jaipur Central Logistics Hub",
                destination_zone="Chandigarh Distribution Depot",
                distance_km=Decimal("490.00"),
                distance_source="CONTRACTED",
                transit_days=2,
                priority=1
            )
            db.add_all([lane1_1, lane1_2])
            db.flush()

            # Rate rules for Contract 1
            slabs_vtr = json.dumps([
                {"min_kg": 0, "max_kg": 500, "rate": 7.0},
                {"min_kg": 501, "max_kg": 1500, "rate": 6.5},
                {"min_kg": 1501, "max_kg": 99999, "rate": 5.8}
            ])
            rate1 = models.FreightRateRule(
                contract_id=contract1.id,
                lane_id=lane1_1.id,
                charge_basis="SLAB",
                base_rate=Decimal("6.50"),
                min_charge=Decimal("500.00"),
                slab_config=slabs_vtr,
                rounding_rule="NEAREST_1"
            )
            db.add(rate1)

            # Ancillaries for Contract 1
            anc1_1 = models.FreightAncillaryRule(
                contract_id=contract1.id,
                ancillary_type="LOADING",
                charge_basis="FLAT",
                rate=Decimal("300.00"),
                is_mandatory=True,
                condition_text="Mandatory terminal loading fee"
            )
            anc1_2 = models.FreightAncillaryRule(
                contract_id=contract1.id,
                ancillary_type="TOLL",
                charge_basis="ACTUAL",
                rate=Decimal("450.00"),
                is_mandatory=False,
                condition_text="Fastag toll reimbursement per receipt"
            )
            anc1_3 = models.FreightAncillaryRule(
                contract_id=contract1.id,
                ancillary_type="HAMALI",
                charge_basis="PER_PACKAGE",
                rate=Decimal("15.00"),
                is_mandatory=False,
                condition_text="Labor handling per package"
            )
            db.add_all([anc1_1, anc1_2, anc1_3])

            # Contract 2: Gati KWE Express Cargo
            contract2 = models.FreightContract(
                contract_number="FC-2026-GATI-02",
                transporter_name="Gati KWE Express Cargo",
                company_id=company_id,
                status="ACTIVE",
                effective_from=datetime(2026, 1, 1),
                priority=2,
                vehicle_class="14FT_TRUCK",
                notes="Express courier and time-critical medical supplies contract."
            )
            db.add(contract2)
            db.flush()

            lane2_1 = models.FreightLane(
                contract_id=contract2.id,
                origin_zone="Jaipur Central Logistics Hub",
                destination_zone="Gurugram Healthcare Depot",
                distance_km=Decimal("230.00"),
                distance_source="GOOGLE_MAPS",
                transit_days=1,
                priority=1
            )
            db.add(lane2_1)
            db.flush()

            rate2 = models.FreightRateRule(
                contract_id=contract2.id,
                lane_id=lane2_1.id,
                charge_basis="PER_KG",
                base_rate=Decimal("8.50"),
                min_charge=Decimal("450.00"),
                rounding_rule="NEAREST_1"
            )
            db.add(rate2)

            anc2_1 = models.FreightAncillaryRule(
                contract_id=contract2.id,
                ancillary_type="INSURANCE",
                charge_basis="PERCENTAGE",
                rate=Decimal("0.50"),
                is_mandatory=True,
                condition_text="0.5% declared cargo risk transit coverage"
            )
            anc2_2 = models.FreightAncillaryRule(
                contract_id=contract2.id,
                ancillary_type="DETENTION",
                charge_basis="FLAT",
                rate=Decimal("500.00"),
                is_mandatory=False,
                condition_text="Demurrage penalty beyond 4 hours idle time"
            )
            db.add_all([anc2_1, anc2_2])

            db.commit()
            print("Successfully seeded Freight Contracts, Lanes, Rates, and Ancillary rules.")
        else:
            print(f"Contracts already initialized ({existing_contracts} contracts found).")

        # 3. Seed Cost Events, Allocations, and Recoveries
        existing_events = db.query(models.FreightCostEvent).count()
        if existing_events == 0:
            print("Seeding freight cost events, document allocations, and recovery margins...")

            consignments = db.query(models.Consignment).all()
            cn_map = {c.consignment_number: c for c in consignments}

            c1 = cn_map.get("CN-2026-0041")
            c2 = cn_map.get("CN-2026-0042")
            c3 = cn_map.get("CN-2026-0043")

            contract_vtr = db.query(models.FreightContract).filter(models.FreightContract.contract_number == "FC-2026-VTR-01").first()
            contract_gati = db.query(models.FreightContract).filter(models.FreightContract.contract_number == "FC-2026-GATI-02").first()

            # Event 1
            fce1 = models.FreightCostEvent(
                event_number="FCE-2026-0001",
                consignment_id=c1.id if c1 else None,
                company_id=company_id,
                beneficiary_company_id=company_id,
                cost_bearer_company_id=company_id,
                contract_id=contract_vtr.id if contract_vtr else None,
                cost_type="COMBINED_FREIGHT",
                estimated_amount=Decimal("1970.00"),
                actual_amount=Decimal("1970.00"),
                variance_amount=Decimal("0.00"),
                currency="INR",
                status="FINALIZED",
                is_admin_funded=True,
                created_at=datetime.utcnow() - timedelta(days=2)
            )
            db.add(fce1)
            db.flush()

            # Snapshot 1
            snap1 = models.FreightCalculationSnapshot(
                cost_event_id=fce1.id,
                source_ref=c1.consignment_number if c1 else "CN-2026-0041",
                rule_version="v2.0-DOC35",
                inputs_json=json.dumps({"weight_kg": 26.5, "packages": 2, "lane": "Jaipur->Delhi", "rate_basis": "PER_KG"}),
                outputs_json=json.dumps({"base_freight": 1450.0, "loading": 180.0, "toll": 340.0, "total": 1970.0}),
                formula_text="Weight (26.5kg) x Rate (Rs 54.71/kg effective) + Loading (Rs 180) + Toll (Rs 340) = Rs 1,970.00"
            )
            db.add(snap1)

            # Allocation 1
            alloc1 = models.FreightAllocation(
                cost_event_id=fce1.id,
                target_type="INVOICE",
                target_id=uuid.uuid4(),
                target_number="RJ-INV-6870",
                allocation_method="WEIGHT",
                allocated_ratio=Decimal("1.0000"),
                allocated_amount=Decimal("1970.00")
            )
            db.add(alloc1)

            # Recovery 1 (Admin Subsidized)
            rec1 = models.FreightRecovery(
                cost_event_id=fce1.id,
                recovery_type="SUBSIDY",
                recovery_party_type="INTERNAL",
                recovery_amount=Decimal("0.00"),
                subsidy_amount=Decimal("1970.00"),
                logistics_margin=Decimal("-1970.00"),
                status="WAIVED"
            )
            db.add(rec1)

            # Event 2
            fce2 = models.FreightCostEvent(
                event_number="FCE-2026-0002",
                consignment_id=c2.id if c2 else None,
                company_id=company_id,
                beneficiary_company_id=company_id,
                cost_bearer_company_id=company_id,
                contract_id=contract_gati.id if contract_gati else None,
                cost_type="COMBINED_FREIGHT",
                estimated_amount=Decimal("2350.00"),
                actual_amount=Decimal("2500.00"),
                variance_amount=Decimal("150.00"),
                currency="INR",
                status="ACTUAL_RECEIVED",
                is_admin_funded=True,
                created_at=datetime.utcnow() - timedelta(days=1)
            )
            db.add(fce2)
            db.flush()

            alloc2 = models.FreightAllocation(
                cost_event_id=fce2.id,
                target_type="INVOICE",
                target_id=uuid.uuid4(),
                target_number="RJ-INV-6874",
                allocation_method="WEIGHT",
                allocated_ratio=Decimal("1.0000"),
                allocated_amount=Decimal("2500.00")
            )
            db.add(alloc2)

            rec2 = models.FreightRecovery(
                cost_event_id=fce2.id,
                recovery_type="RATE_BASED",
                recovery_party_type="CUSTOMER",
                recovery_party_name="Apollo Pharmacy Ltd.",
                recovery_amount=Decimal("500.00"),
                subsidy_amount=Decimal("2000.00"),
                logistics_margin=Decimal("-2000.00"),
                status="BILLED"
            )
            db.add(rec2)

            # Event 3
            fce3 = models.FreightCostEvent(
                event_number="FCE-2026-0003",
                consignment_id=c3.id if c3 else None,
                company_id=company_id,
                beneficiary_company_id=company_id,
                cost_bearer_company_id=company_id,
                contract_id=contract_vtr.id if contract_vtr else None,
                cost_type="BASE_FREIGHT",
                estimated_amount=Decimal("4250.00"),
                actual_amount=Decimal("0.00"),
                variance_amount=Decimal("0.00"),
                currency="INR",
                status="ESTIMATED",
                is_admin_funded=True,
                created_at=datetime.utcnow()
            )
            db.add(fce3)
            db.flush()

            alloc3 = models.FreightAllocation(
                cost_event_id=fce3.id,
                target_type="INVOICE",
                target_id=uuid.uuid4(),
                target_number="SO-2026-1140",
                allocation_method="VALUE",
                allocated_ratio=Decimal("1.0000"),
                allocated_amount=Decimal("4250.00")
            )
            db.add(alloc3)

            rec3 = models.FreightRecovery(
                cost_event_id=fce3.id,
                recovery_type="NO_RECOVERY",
                recovery_party_type="INTERNAL",
                recovery_amount=Decimal("0.00"),
                subsidy_amount=Decimal("4250.00"),
                logistics_margin=Decimal("-4250.00"),
                status="PENDING"
            )
            db.add(rec3)

            # 4. Seed Transporter Reconciliations
            recon1 = models.FreightReconciliation(
                recon_number="REC-VTR-2026-0001",
                transporter_name="V-Trans Logistics India Ltd.",
                transporter_invoice_no="INV-VTR-8921",
                transporter_invoice_date=datetime.utcnow() - timedelta(days=2),
                expected_amount=Decimal("1970.00"),
                billed_amount=Decimal("1970.00"),
                approved_amount=Decimal("1970.00"),
                variance_amount=Decimal("0.00"),
                variance_status="MATCHED",
                status="RECONCILED"
            )
            recon2 = models.FreightReconciliation(
                recon_number="REC-GATI-2026-0002",
                transporter_name="Gati KWE Express Cargo",
                transporter_invoice_no="INV-GATI-4401",
                transporter_invoice_date=datetime.utcnow() - timedelta(days=1),
                expected_amount=Decimal("2350.00"),
                billed_amount=Decimal("2500.00"),
                approved_amount=Decimal("2350.00"),
                variance_amount=Decimal("150.00"),
                variance_status="TOLERABLE",
                dispute_reason="Pending toll verification difference (+Rs 150)",
                status="SUBMITTED"
            )
            db.add_all([recon1, recon2])

            db.commit()
            print("Successfully seeded Freight Cost Events, Allocations, Recoveries, and Reconciliations.")
        else:
            print(f"Cost events already initialized ({existing_events} records found).")

    finally:
        db.close()

if __name__ == "__main__":
    init_freight_tables()
