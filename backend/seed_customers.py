import sys
import os
import uuid
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal
import models

SAMPLE_CUSTOMERS = [
    {
        "legal_name": "APOLLO PHARMACY LTD.",
        "trade_name": "Apollo Pharmacy",
        "pan": "AABCA1234F",
        "gst": "27AABCA1234F1Z5",
        "tds_tcs_mode": "AUTOMATIC",
        "credit_limit": 250000.0,
        "credit_days": 30,
        "price_list": "Retail",
        "dl_no": "20B/21B-MH-MZ4-10492",
        "address": {
            "address_type": "Billing",
            "is_default": True,
            "line1": "Shop 4, Ground Floor, Grand Central Mall",
            "city": "Mumbai",
            "state": "Maharashtra",
            "pincode": "400001",
            "country": "India"
        }
    },
    {
        "legal_name": "LIFECARE CHEMIST & DRUGGIST",
        "trade_name": "LifeCare Medicos",
        "pan": "BCCDE5678G",
        "gst": "27BCCDE5678G1Z2",
        "tds_tcs_mode": "AUTOMATIC",
        "credit_limit": 150000.0,
        "credit_days": 21,
        "price_list": "Retail",
        "dl_no": "20B/21B-MH-PUN-8841",
        "address": {
            "address_type": "Billing",
            "is_default": True,
            "line1": "Plot 12, FC Road, Shivaji Nagar",
            "city": "Pune",
            "state": "Maharashtra",
            "pincode": "411005",
            "country": "India"
        }
    },
    {
        "legal_name": "SHREE BALAJI MEDICOS",
        "trade_name": "Balaji Pharmacy",
        "pan": "CDDEF9012H",
        "gst": "27CDDEF9012H1Z9",
        "tds_tcs_mode": "PROMPT",
        "credit_limit": 80000.0,
        "credit_days": 15,
        "price_list": "Retail",
        "dl_no": "20B/21B-MH-NGP-3321",
        "address": {
            "address_type": "Billing",
            "is_default": True,
            "line1": "Main Hospital Road, Dharampeth",
            "city": "Nagpur",
            "state": "Maharashtra",
            "pincode": "440010",
            "country": "India"
        }
    }
]

def run():
    db = SessionLocal()
    try:
        org = db.query(models.Organization).first()
        if not org:
            print("No organization found. Cannot seed customers.")
            return

        print(f"Seeding customers for organization: {org.name} ({org.id})")

        # Find or create Sundry Debtors ledger group
        debtors_group = db.query(models.LedgerGroup).filter(
            models.LedgerGroup.organization_id == org.id,
            models.LedgerGroup.name.ilike("Sundry Debtors")
        ).first()

        created_count = 0
        for cust_data in SAMPLE_CUSTOMERS:
            existing = db.query(models.Party).filter(
                models.Party.organization_id == org.id,
                models.Party.legal_name.ilike(cust_data["legal_name"].strip())
            ).first()

            if existing:
                print(f"[EXISTS] {cust_data['legal_name']}")
                # Ensure customer_profile exists
                if not existing.customer_profile:
                    cp = models.CustomerProfile(
                        party_id=existing.id,
                        credit_limit=cust_data["credit_limit"],
                        credit_days=cust_data["credit_days"],
                        price_list=cust_data["price_list"]
                    )
                    db.add(cp)
                    db.commit()
                continue

            # Create Party
            party = models.Party(
                id=uuid.uuid4(),
                organization_id=org.id,
                legal_name=cust_data["legal_name"],
                trade_name=cust_data["trade_name"],
                pan=cust_data["pan"],
                gst=cust_data["gst"],
                status="active",
                tds_tcs_mode=cust_data["tds_tcs_mode"],
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            db.add(party)
            db.flush()

            # Create Address
            addr_info = cust_data["address"]
            addr = models.PartyAddress(
                id=uuid.uuid4(),
                party_id=party.id,
                address_type=addr_info["address_type"],
                is_default=addr_info["is_default"],
                line1=addr_info["line1"],
                city=addr_info["city"],
                state=addr_info["state"],
                pincode=addr_info["pincode"],
                country=addr_info["country"]
            )
            db.add(addr)

            # Create Ledger for Customer
            ledger = models.Ledger(
                id=uuid.uuid4(),
                organization_id=org.id,
                name=f"{cust_data['legal_name']} (Customer)",
                group_name="Sundry Debtors",
                group_id=debtors_group.id if debtors_group else None,
                opening_balance=0,
                op_type="Dr",
                closing_balance=0,
                cl_type="Dr",
                city=addr_info["city"],
                state=addr_info["state"],
                dl_no=cust_data["dl_no"],
                gstin=cust_data["gst"]
            )
            db.add(ledger)
            db.flush()

            # Create Customer Profile
            cp = models.CustomerProfile(
                party_id=party.id,
                ledger_id=ledger.id,
                credit_limit=cust_data["credit_limit"],
                credit_days=cust_data["credit_days"],
                price_list=cust_data["price_list"]
            )
            db.add(cp)
            db.commit()

            print(f"[CREATED] Party: {party.legal_name} | Trade: {party.trade_name} | GSTIN: {party.gst}")
            created_count += 1

        print(f"Customer seeding complete. Total newly created: {created_count}")

    except Exception as e:
        db.rollback()
        print(f"Error seeding customers: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    run()
