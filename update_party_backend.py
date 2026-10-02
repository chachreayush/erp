import sys

with open('backend/schemas.py', 'r', encoding='utf-8') as f:
    content = f.read()

old_create = """class PartyCreate(PartyBase):
    addresses: List[PartyAddressCreate] = []
    customer_profile: Optional[CustomerProfileCreate] = None
    supplier_profile: Optional[SupplierProfileCreate] = None
    # If creating a ledger automatically:
    create_ledger: bool = True
    ledger_group_id: Optional[UUID] = None
    opening_balance: float = 0
    op_type: str = "Dr\""""

new_create = """class PartyCreate(PartyBase):
    addresses: List[PartyAddressCreate] = []
    customer_profile: Optional[CustomerProfileCreate] = None
    supplier_profile: Optional[SupplierProfileCreate] = None
    
    # Customer Ledger Info
    create_customer_ledger: bool = False
    customer_ledger_group_id: Optional[UUID] = None
    customer_opening_balance: float = 0
    customer_op_type: str = "Dr"
    
    # Supplier Ledger Info
    create_supplier_ledger: bool = False
    supplier_ledger_group_id: Optional[UUID] = None
    supplier_opening_balance: float = 0
    supplier_op_type: str = "Cr\""""

content = content.replace(old_create, new_create)
with open('backend/schemas.py', 'w', encoding='utf-8') as f:
    f.write(content)

with open('backend/api/parties.py', 'r', encoding='utf-8') as f:
    content = f.read()

old_logic = """    # 3. Ledger creation if requested (for backwards compatibility with existing Invoice features)
    ledger_id = None
    if party_in.create_ledger:
        if not party_in.ledger_group_id:
            raise HTTPException(status_code=400, detail="ledger_group_id is required to create a ledger for this party.")
        db_ledger = Ledger(
            organization_id=current_user.organization_id,
            name=party_in.legal_name,
            group_id=party_in.ledger_group_id,
            opening_balance=party_in.opening_balance,
            op_type=party_in.op_type,
            closing_balance=party_in.opening_balance,
            cl_type=party_in.op_type,
            mobile=None,
            state=None
        )
        db.add(db_ledger)
        db.flush()
        ledger_id = db_ledger.id

    # 4. Profiles
    if party_in.customer_profile:
        db_cust = CustomerProfile(
            party_id=db_party.id,
            ledger_id=ledger_id,
            route_id=party_in.customer_profile.route_id,
            credit_limit=party_in.customer_profile.credit_limit,
            credit_days=party_in.customer_profile.credit_days,
            price_list=party_in.customer_profile.price_list
        )
        db.add(db_cust)
        
    if party_in.supplier_profile:
        db_supp = SupplierProfile(
            party_id=db_party.id,
            ledger_id=ledger_id,
            payment_terms=party_in.supplier_profile.payment_terms,
            lead_time_days=party_in.supplier_profile.lead_time_days,
            supplier_rating=party_in.supplier_profile.supplier_rating
        )
        db.add(db_supp)"""

new_logic = """    # 3 & 4. Ledgers and Profiles
    cust_ledger_id = None
    if party_in.create_customer_ledger:
        if not party_in.customer_ledger_group_id:
            raise HTTPException(status_code=400, detail="Customer ledger_group_id is required.")
        db_ledger = Ledger(
            organization_id=current_user.organization_id,
            name=f"{party_in.legal_name} (Customer)",
            group_id=party_in.customer_ledger_group_id,
            opening_balance=party_in.customer_opening_balance,
            op_type=party_in.customer_op_type,
            closing_balance=party_in.customer_opening_balance,
            cl_type=party_in.customer_op_type,
            mobile=None,
            state=None
        )
        db.add(db_ledger)
        db.flush()
        cust_ledger_id = db_ledger.id

    if party_in.customer_profile:
        db_cust = CustomerProfile(
            party_id=db_party.id,
            ledger_id=cust_ledger_id,
            route_id=party_in.customer_profile.route_id,
            credit_limit=party_in.customer_profile.credit_limit,
            credit_days=party_in.customer_profile.credit_days,
            price_list=party_in.customer_profile.price_list
        )
        db.add(db_cust)

    supp_ledger_id = None
    if party_in.create_supplier_ledger:
        if not party_in.supplier_ledger_group_id:
            raise HTTPException(status_code=400, detail="Supplier ledger_group_id is required.")
        db_ledger_supp = Ledger(
            organization_id=current_user.organization_id,
            name=f"{party_in.legal_name} (Supplier)",
            group_id=party_in.supplier_ledger_group_id,
            opening_balance=party_in.supplier_opening_balance,
            op_type=party_in.supplier_op_type,
            closing_balance=party_in.supplier_opening_balance,
            cl_type=party_in.supplier_op_type,
            mobile=None,
            state=None
        )
        db.add(db_ledger_supp)
        db.flush()
        supp_ledger_id = db_ledger_supp.id
        
    if party_in.supplier_profile:
        db_supp = SupplierProfile(
            party_id=db_party.id,
            ledger_id=supp_ledger_id,
            payment_terms=party_in.supplier_profile.payment_terms,
            lead_time_days=party_in.supplier_profile.lead_time_days,
            supplier_rating=party_in.supplier_profile.supplier_rating
        )
        db.add(db_supp)"""

content = content.replace(old_logic, new_logic)
with open('backend/api/parties.py', 'w', encoding='utf-8') as f:
    f.write(content)
