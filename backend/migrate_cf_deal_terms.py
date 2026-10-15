import os
import sys
import uuid
import json
from datetime import datetime

sys.path.insert(0, os.path.dirname(__file__))

from database import engine, SessionLocal
from sqlalchemy import text
import models

def migrate():
    print("=" * 60)
    print("RUNNING C&F CONSIGNMENT AGENT SCHEMA & DATA MIGRATION")
    print("=" * 60)

    with engine.connect() as conn:
        # 1. Add company_ids column to customer_profiles if missing
        try:
            conn.execute(text("ALTER TABLE customer_profiles ADD COLUMN IF NOT EXISTS company_ids JSON DEFAULT '[\"ALL\"]';"))
            print("  SUCCESS: customer_profiles.company_ids verified/added.")
        except Exception as e:
            print(f"  Note on customer_profiles.company_ids: {e}")

        # 2. Add client_id, client_name, event_type to commission_calculations if missing
        try:
            conn.execute(text("ALTER TABLE commission_calculations ADD COLUMN IF NOT EXISTS client_id UUID;"))
            conn.execute(text("ALTER TABLE commission_calculations ADD COLUMN IF NOT EXISTS client_name VARCHAR(200);"))
            conn.execute(text("ALTER TABLE commission_calculations ADD COLUMN IF NOT EXISTS event_type VARCHAR(60) DEFAULT 'SALES_BILL';"))
            print("  SUCCESS: commission_calculations client & event_type columns verified/added.")
        except Exception as e:
            print(f"  Note on commission_calculations columns: {e}")

        conn.commit()

    db = SessionLocal()
    try:
        # 3. Update existing agreements with rich C&F Consignment Agent deal terms
        agreements = db.query(models.PrincipalCommissionAgreement).all()
        for agr in agreements:
            terms = agr.terms_json or {}
            terms["agreement_type"] = "CF_CONSIGNMENT_AGENT"
            terms["services_provided"] = ["GODOWN_STORAGE", "STAFF_SALARIES", "TRANSPORTATION", "SALES_COMMISSION"]
            terms["reimbursement_terms"] = {
                "godown_storage": {
                    "borne_by": "PRINCIPAL",
                    "reimbursable": True,
                    "monthly_rent": 18000.0 if "SUN" in agr.principal_code else 15000.0,
                    "billing_mode": "FIXED_MONTHLY"
                },
                "staff_salaries": {
                    "borne_by": "PRINCIPAL",
                    "reimbursable": True,
                    "monthly_budget": 28000.0 if "SUN" in agr.principal_code else 22500.0,
                    "billing_mode": "MONTHLY_OR_ACTUAL"
                },
                "transportation": {
                    "borne_by": "PRINCIPAL",
                    "reimbursable": True,
                    "billing_mode": "ACTUAL_BILLS"
                },
                "sales_commission": {
                    "rate_pct": 6.5 if "SUN" in agr.principal_code else 5.0,
                    "basis": "CLIENT_SALES_TURNOVER"
                }
            }
            agr.terms_json = terms
            print(f"  SUCCESS: Updated C&F Deal terms for {agr.principal_code}: {agr.principal_name}")

        # 4. Check/seed customer profiles with company_ids
        cust_profiles = db.query(models.CustomerProfile).all()
        for cp in cust_profiles:
            if not cp.company_ids:
                cp.company_ids = ["ALL"]
        
        # Ensure we have at least 2 demonstration clients with company tags
        party1 = db.query(models.Party).filter(models.Party.legal_name.ilike("%Apollo%")).first()
        if party1 and party1.customer_profile:
            party1.customer_profile.company_ids = ["ALL"]
            print(f"  Tagged client {party1.legal_name} with companies: {party1.customer_profile.company_ids}")

        party2 = db.query(models.Party).filter(models.Party.legal_name.ilike("%MedPlus%")).first()
        if party2 and party2.customer_profile:
            party2.customer_profile.company_ids = ["ALL"]
            print(f"  Tagged client {party2.legal_name} with companies: {party2.customer_profile.company_ids}")

        db.commit()
        print("\nC&F MIGRATION COMPLETED SUCCESSFULLY!")
    except Exception as e:
        db.rollback()
        print(f"Migration error: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    migrate()
