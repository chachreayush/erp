import uuid
from sqlalchemy.orm import Session
from models import LedgerGroup, Organization
from database import SessionLocal

def seed_chart_of_accounts(org_id: uuid.UUID, db: Session):
    # 1. Assets
    assets = LedgerGroup(organization_id=org_id, name="Assets", class_type="Asset", is_system=True)
    db.add(assets)
    db.flush()

    current_assets = LedgerGroup(organization_id=org_id, name="Current Assets", parent_id=assets.id, class_type="Asset", is_system=True)
    fixed_assets = LedgerGroup(organization_id=org_id, name="Fixed Assets", parent_id=assets.id, class_type="Asset", is_system=True)
    db.add_all([current_assets, fixed_assets])
    db.flush()

    sundry_debtors = LedgerGroup(organization_id=org_id, name="Sundry Debtors", parent_id=current_assets.id, class_type="Asset", is_system=True)
    cash = LedgerGroup(organization_id=org_id, name="Cash-in-Hand", parent_id=current_assets.id, class_type="Asset", is_system=True)
    bank = LedgerGroup(organization_id=org_id, name="Bank Accounts", parent_id=current_assets.id, class_type="Asset", is_system=True)
    inventory = LedgerGroup(organization_id=org_id, name="Inventory", parent_id=current_assets.id, class_type="Asset", is_system=True)
    db.add_all([sundry_debtors, cash, bank, inventory])

    # 2. Liabilities
    liabilities = LedgerGroup(organization_id=org_id, name="Liabilities", class_type="Liability", is_system=True)
    db.add(liabilities)
    db.flush()

    current_liab = LedgerGroup(organization_id=org_id, name="Current Liabilities", parent_id=liabilities.id, class_type="Liability", is_system=True)
    db.add(current_liab)
    db.flush()

    sundry_creditors = LedgerGroup(organization_id=org_id, name="Sundry Creditors", parent_id=current_liab.id, class_type="Liability", is_system=True)
    taxes = LedgerGroup(organization_id=org_id, name="Duties & Taxes", parent_id=current_liab.id, class_type="Liability", is_system=True)
    db.add_all([sundry_creditors, taxes])

    # 3. Income
    income = LedgerGroup(organization_id=org_id, name="Income", class_type="Income", is_system=True)
    db.add(income)
    db.flush()

    sales = LedgerGroup(organization_id=org_id, name="Sales Accounts", parent_id=income.id, class_type="Income", is_system=True)
    direct_inc = LedgerGroup(organization_id=org_id, name="Direct Incomes", parent_id=income.id, class_type="Income", is_system=True)
    indirect_inc = LedgerGroup(organization_id=org_id, name="Indirect Incomes", parent_id=income.id, class_type="Income", is_system=True)
    db.add_all([sales, direct_inc, indirect_inc])

    # 4. Expenses
    expenses = LedgerGroup(organization_id=org_id, name="Expenses", class_type="Expense", is_system=True)
    db.add(expenses)
    db.flush()

    purchase = LedgerGroup(organization_id=org_id, name="Purchase Accounts", parent_id=expenses.id, class_type="Expense", is_system=True)
    direct_exp = LedgerGroup(organization_id=org_id, name="Direct Expenses", parent_id=expenses.id, class_type="Expense", is_system=True)
    indirect_exp = LedgerGroup(organization_id=org_id, name="Indirect Expenses", parent_id=expenses.id, class_type="Expense", is_system=True)
    db.add_all([purchase, direct_exp, indirect_exp])


def seed_existing_organizations():
    db = SessionLocal()
    try:
        orgs = db.query(Organization).all()
        for org in orgs:
            # Check if this org already has groups
            existing = db.query(LedgerGroup).filter(LedgerGroup.organization_id == org.id).first()
            if not existing:
                print(f"Seeding CoA for organization {org.name} ({org.id})")
                seed_chart_of_accounts(org.id, db)
            else:
                print(f"Organization {org.name} already has LedgerGroups. Migrating existing ones...")
                # As a fallback data-migration, set all existing to "Asset" if they don't have it (default handles this)
                # We'll just seed the system ones if they are missing
                sys = db.query(LedgerGroup).filter(LedgerGroup.organization_id == org.id, LedgerGroup.is_system == True).first()
                if not sys:
                    print(f"Seeding missing system groups for {org.name}")
                    seed_chart_of_accounts(org.id, db)
        db.commit()
        print("Done seeding existing organizations.")
    finally:
        db.close()

if __name__ == "__main__":
    seed_existing_organizations()
