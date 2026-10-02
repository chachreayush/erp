from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from database import get_db
from models import User, Party, PartyAddress, CustomerProfile, SupplierProfile, Ledger
from schemas import PartyCreate, PartyResponse, PartyAddressCreate, CustomerProfileCreate, SupplierProfileCreate
from auth.router import get_current_user

router = APIRouter(prefix="/parties", tags=["Parties"])

@router.post("/", response_model=PartyResponse)
def create_party(party_in: PartyCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # 1. Create Party
    db_party = Party(
        organization_id=current_user.organization_id,
        legal_name=party_in.legal_name,
        trade_name=party_in.trade_name,
        pan=party_in.pan,
        gst=party_in.gst,
        status=party_in.status
    )
    db.add(db_party)
    db.flush()

    # 2. Addresses
    for addr_in in party_in.addresses:
        db_addr = PartyAddress(
            party_id=db_party.id,
            address_type=addr_in.address_type,
            is_default=addr_in.is_default,
            line1=addr_in.line1,
            line2=addr_in.line2,
            city=addr_in.city,
            state=addr_in.state,
            pincode=addr_in.pincode,
            country=addr_in.country
        )
        db.add(db_addr)

    # 3 & 4. Ledgers and Profiles
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
        db.add(db_supp)

    db.commit()
    db.refresh(db_party)
    return db_party

@router.get("/", response_model=List[PartyResponse])
def get_parties(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Party).filter(Party.organization_id == current_user.organization_id).all()
