from database import SessionLocal
import models
import uuid

def seed_ledgers():
    db = SessionLocal()
    org_id = db.query(models.Organization).first().id # Get first org
    
    tds = db.query(models.Ledger).filter(
        models.Ledger.organization_id == org_id,
        models.Ledger.name == "TDS Payable"
    ).first()
    
    if not tds:
        tds = models.Ledger(
            organization_id=org_id,
            name="TDS Payable",
            group_name="Duties & Taxes",
            opening_balance=0,
            op_type="Cr",
            closing_balance=0,
            cl_type="Cr",
            is_active=True
        )
        db.add(tds)

    tcs = db.query(models.Ledger).filter(
        models.Ledger.organization_id == org_id,
        models.Ledger.name == "TCS Receivable"
    ).first()
    
    if not tcs:
        tcs = models.Ledger(
            organization_id=org_id,
            name="TCS Receivable",
            group_name="Duties & Taxes",
            opening_balance=0,
            op_type="Dr",
            closing_balance=0,
            cl_type="Dr",
            is_active=True
        )
        db.add(tcs)
        
    tcs_p = db.query(models.Ledger).filter(
        models.Ledger.organization_id == org_id,
        models.Ledger.name == "TCS Payable"
    ).first()
    
    if not tcs_p:
        tcs_p = models.Ledger(
            organization_id=org_id,
            name="TCS Payable",
            group_name="Duties & Taxes",
            opening_balance=0,
            op_type="Cr",
            closing_balance=0,
            cl_type="Cr",
            is_active=True
        )
        db.add(tcs_p)

    db.commit()
    db.close()
    print("Ledgers created!")

if __name__ == "__main__":
    seed_ledgers()
