import uuid
from datetime import datetime, timedelta
from decimal import Decimal
from database import engine, SessionLocal, Base
import models

def init_cargo_tables():
    print("Initializing DOC-34 Cargo & Consignment tables in PostgreSQL...")
    Base.metadata.create_all(bind=engine)
    print("Tables created successfully (consignments, cargo_packages, cargo_costs, pod_records).")

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

        existing_consignments = db.query(models.Consignment).filter(models.Consignment.company_id == company_id).count()
        if existing_consignments == 0:
            print("Seeding initial realistic consignments and cargo data...")

            # 5 representative consignments across lifecycle states
            seed_data = [
                {
                    "num": "CN-2026-0041",
                    "doc_no": "RJ-INV-6870",
                    "lr_no": "LR-VT-98241",
                    "status": "DELIVERED",
                    "transporter": "V-Trans Logistics India Ltd.",
                    "vehicle": "RJ-14-GA-7821",
                    "driver": "Mukesh Sharma",
                    "phone": "9829012345",
                    "origin": "Jaipur Central Logistics Hub",
                    "destination": "Delhi South Distribution Center",
                    "is_admin_funded": True,
                    "dispatch_hours_ago": 72,
                    "delivered_hours_ago": 24,
                    "packages": [
                        {"type": "Carton", "barcode": "PKG-2026-0041-01", "gross": 14.5, "net": 13.2, "l": 45, "w": 35, "h": 30, "fragile": False},
                        {"type": "Carton", "barcode": "PKG-2026-0041-02", "gross": 12.0, "net": 11.0, "l": 40, "w": 30, "h": 25, "fragile": True},
                    ],
                    "costs": [
                        {"type": "FREIGHT", "gross": 1450.00, "rec": 0.00, "admin_borne": True},
                        {"type": "LOADING", "gross": 180.00, "rec": 0.00, "admin_borne": True},
                        {"type": "TOLL", "gross": 340.00, "rec": 0.00, "admin_borne": True}
                    ],
                    "pod": {
                        "receiver": "Rajesh Verma (Store Incharge)",
                        "accepted": 2.0,
                        "short": 0.0,
                        "damage": 0.0,
                        "status": "CONFIRMED",
                        "remarks": "Received in good condition with unbroken seals."
                    }
                },
                {
                    "num": "CN-2026-0042",
                    "doc_no": "RJ-INV-6874",
                    "lr_no": "LR-GATI-11092",
                    "status": "IN_TRANSIT",
                    "transporter": "Gati KWE Express Cargo",
                    "vehicle": "HR-26-BR-4902",
                    "driver": "Satish Kumar",
                    "phone": "9811098765",
                    "origin": "Jaipur Central Logistics Hub",
                    "destination": "Gurugram Healthcare Depot",
                    "is_admin_funded": True,
                    "dispatch_hours_ago": 16,
                    "delivered_hours_ago": None,
                    "packages": [
                        {"type": "Box", "barcode": "PKG-2026-0042-01", "gross": 8.5, "net": 8.0, "l": 30, "w": 25, "h": 20, "fragile": False},
                        {"type": "Box", "barcode": "PKG-2026-0042-02", "gross": 9.2, "net": 8.8, "l": 32, "w": 26, "h": 22, "fragile": True},
                        {"type": "Carton", "barcode": "PKG-2026-0042-03", "gross": 18.0, "net": 16.5, "l": 50, "w": 40, "h": 35, "fragile": False}
                    ],
                    "costs": [
                        {"type": "FREIGHT", "gross": 2100.00, "rec": 500.00, "admin_borne": True},
                        {"type": "HANDLING", "gross": 250.00, "rec": 0.00, "admin_borne": True}
                    ],
                    "pod": None
                },
                {
                    "num": "CN-2026-0043",
                    "doc_no": "SO-2026-1140",
                    "lr_no": "LR-TCI-55420",
                    "status": "DISPATCHED",
                    "transporter": "TCI Freight Express",
                    "vehicle": "DL-01-AB-4921",
                    "driver": "Gurpreet Singh",
                    "phone": "9876543210",
                    "origin": "Jaipur Cold-Chain Godown",
                    "destination": "Noida Industrial Hub",
                    "is_admin_funded": True,
                    "dispatch_hours_ago": 4,
                    "delivered_hours_ago": None,
                    "packages": [
                        {"type": "Pallet", "barcode": "PKG-2026-0043-01", "gross": 120.0, "net": 110.0, "l": 120, "w": 100, "h": 80, "fragile": False}
                    ],
                    "costs": [
                        {"type": "FREIGHT", "gross": 3800.00, "rec": 0.00, "admin_borne": True},
                        {"type": "LOADING", "gross": 450.00, "rec": 0.00, "admin_borne": True}
                    ],
                    "pod": None
                },
                {
                    "num": "CN-2026-0044",
                    "doc_no": "RJ-INV-6878",
                    "lr_no": "LR-SAFE-77192",
                    "status": "EXCEPTION",
                    "transporter": "Safexpress Logistics Ltd.",
                    "vehicle": "RJ-02-CB-1920",
                    "driver": "Dinesh Yadav",
                    "phone": "9828112233",
                    "origin": "Jaipur Central Logistics Hub",
                    "destination": "Alwar Regional Pharma Center",
                    "is_admin_funded": True,
                    "dispatch_hours_ago": 36,
                    "delivered_hours_ago": 12,
                    "packages": [
                        {"type": "Carton", "barcode": "PKG-2026-0044-01", "gross": 22.0, "net": 20.0, "l": 60, "w": 40, "h": 30, "fragile": True},
                        {"type": "Carton", "barcode": "PKG-2026-0044-02", "gross": 21.5, "net": 19.8, "l": 60, "w": 40, "h": 30, "fragile": True}
                    ],
                    "costs": [
                        {"type": "FREIGHT", "gross": 1850.00, "rec": 0.00, "admin_borne": True},
                        {"type": "INSURANCE", "gross": 320.00, "rec": 0.00, "admin_borne": True}
                    ],
                    "pod": {
                        "receiver": "Suresh Gupta (Store Manager)",
                        "accepted": 1.0,
                        "short": 0.0,
                        "damage": 1.0,
                        "status": "DISCREPANCY",
                        "remarks": "Carton PKG-2026-0044-02 received water-damaged in transit during heavy rain."
                    }
                },
                {
                    "num": "CN-2026-0045",
                    "doc_no": "PO-2026-0891",
                    "lr_no": "LR-VT-98310",
                    "status": "PLANNED",
                    "transporter": "V-Trans Logistics India Ltd.",
                    "vehicle": "RJ-14-GA-9912",
                    "driver": "Ramesh Chandra",
                    "phone": "9829445566",
                    "origin": "Jaipur Central Logistics Hub",
                    "destination": "Chandigarh Distribution Depot",
                    "is_admin_funded": True,
                    "dispatch_hours_ago": None,
                    "delivered_hours_ago": None,
                    "packages": [
                        {"type": "Box", "barcode": "PKG-2026-0045-01", "gross": 15.0, "net": 14.0, "l": 40, "w": 35, "h": 25, "fragile": False}
                    ],
                    "costs": [
                        {"type": "FREIGHT", "gross": 1600.00, "rec": 0.00, "admin_borne": True}
                    ],
                    "pod": None
                }
            ]

            for s in seed_data:
                now = datetime.utcnow()
                disp_time = (now - timedelta(hours=s["dispatch_hours_ago"])) if s["dispatch_hours_ago"] else None
                deliv_time = (now - timedelta(hours=s["delivered_hours_ago"])) if s["delivered_hours_ago"] else None

                consignment = models.Consignment(
                    consignment_number=s["num"],
                    company_id=company_id,
                    cost_bearer_company_id=company_id, # Admin bears the cost
                    document_number=s["doc_no"],
                    transporter_name=s["transporter"],
                    vehicle_no=s["vehicle"],
                    driver_name=s["driver"],
                    driver_phone=s["phone"],
                    origin_hub=s["origin"],
                    destination_hub=s["destination"],
                    lr_no=s["lr_no"],
                    status=s["status"],
                    dispatch_at=disp_time,
                    expected_delivery_at=(disp_time + timedelta(hours=24)) if disp_time else None,
                    delivered_at=deliv_time,
                    is_admin_funded=s["is_admin_funded"],
                    created_at=disp_time or now
                )
                db.add(consignment)
                db.flush()

                # Add packages
                for p in s["packages"]:
                    cbm_val = round((p["l"] * p["w"] * p["h"]) / 1000000.0, 6)
                    pkg = models.CargoPackage(
                        consignment_id=consignment.id,
                        package_type=p["type"],
                        barcode=p["barcode"],
                        gross_weight=Decimal(str(p["gross"])),
                        tare_weight=Decimal(str(round(p["gross"] - p["net"], 3))),
                        net_weight=Decimal(str(p["net"])),
                        length_cm=Decimal(str(p["l"])),
                        width_cm=Decimal(str(p["w"])),
                        height_cm=Decimal(str(p["h"])),
                        cbm=Decimal(str(cbm_val)),
                        is_fragile=p["fragile"],
                        status="DAMAGED" if s["status"] == "EXCEPTION" and "02" in p["barcode"] else "INTACT",
                        created_at=disp_time or now
                    )
                    db.add(pkg)

                # Add costs
                for c in s["costs"]:
                    net_cost = Decimal(str(c["gross"])) - Decimal(str(c["rec"]))
                    cost_entry = models.CargoCost(
                        consignment_id=consignment.id,
                        beneficiary_company_id=company_id,
                        cost_bearer_company_id=company_id,
                        cost_type=c["type"],
                        gross_cost=Decimal(str(c["gross"])),
                        recovery_amount=Decimal(str(c["rec"])),
                        net_bearer_cost=net_cost,
                        is_admin_borne=c["admin_borne"],
                        is_recoverable=c["rec"] > 0,
                        recovery_status="BILLED" if c["rec"] > 0 else "UNBILLED",
                        created_at=disp_time or now
                    )
                    db.add(cost_entry)

                # Add POD if exists
                if s["pod"]:
                    pod_entry = models.PodRecord(
                        consignment_id=consignment.id,
                        received_by=s["pod"]["receiver"],
                        received_at=deliv_time or now,
                        accepted_qty=Decimal(str(s["pod"]["accepted"])),
                        short_qty=Decimal(str(s["pod"]["short"])),
                        damage_qty=Decimal(str(s["pod"]["damage"])),
                        status=s["pod"]["status"],
                        remarks=s["pod"]["remarks"],
                        signature_token=f"SIG-{consignment.consignment_number}",
                        created_at=deliv_time or now
                    )
                    db.add(pod_entry)

            db.commit()
            print("Successfully seeded 5 initial consignments with packages, CBM volumetrics, Admin costs, and POD records.")
        else:
            print(f"Consignments already initialized ({existing_consignments} records found).")

    finally:
        db.close()

if __name__ == "__main__":
    init_cargo_tables()
