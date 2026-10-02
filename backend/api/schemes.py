from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List
from uuid import UUID
from database import get_db
from auth.router import get_current_user
from models import Scheme, SchemeVersion, Entitlement, SchemeClaim
from schemas import (
    SchemeCreate, SchemeResponse,
    SchemeVersionCreate, SchemeVersionResponse,
    EntitlementCreate, EntitlementResponse,
    SchemeClaimCreate, SchemeClaimResponse
)

router = APIRouter(
    prefix="/api/schemes",
    tags=["Schemes (DOC-14)"],
    dependencies=[Depends(get_current_user)]
)

# ── SCHEMES ──────────────────────────────────────────────────

@router.get("/", response_model=List[SchemeResponse])
def list_schemes(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    return db.query(Scheme).options(joinedload(Scheme.versions)).filter(
        Scheme.organization_id == current_user.organization_id
    ).order_by(Scheme.code).all()

@router.post("/", response_model=SchemeResponse, status_code=201)
def create_scheme(
    payload: SchemeCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    s = Scheme(
        organization_id=current_user.organization_id,
        principal_id=payload.principal_id,
        code=payload.code,
        name=payload.name,
        scheme_type=payload.scheme_type,
        status=payload.status
    )
    db.add(s)
    db.commit()
    db.refresh(s)
    return s

@router.post("/{scheme_id}/versions", response_model=SchemeVersionResponse, status_code=201)
def create_scheme_version(
    scheme_id: UUID,
    payload: SchemeVersionCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    v = SchemeVersion(
        organization_id=current_user.organization_id,
        scheme_id=scheme_id,
        product_id=payload.product_id,
        version_number=payload.version_number,
        valid_from=payload.valid_from,
        valid_to=payload.valid_to,
        buy_qty=payload.buy_qty,
        free_qty=payload.free_qty,
        status=payload.status
    )
    db.add(v)
    db.commit()
    db.refresh(v)
    return v

# ── ENTITLEMENTS ─────────────────────────────────────────────

@router.get("/entitlements", response_model=List[EntitlementResponse])
def list_entitlements(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    return db.query(Entitlement).filter(
        Entitlement.organization_id == current_user.organization_id
    ).all()

@router.post("/entitlements", response_model=EntitlementResponse, status_code=201)
def create_entitlement(
    payload: EntitlementCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    e = Entitlement(
        organization_id=current_user.organization_id,
        scheme_version_id=payload.scheme_version_id,
        granted_qty=payload.granted_qty,
        consumed_qty=0,
        claimable_qty=0,
        status=payload.status
    )
    db.add(e)
    db.commit()
    db.refresh(e)
    return e

# ── CLAIMS ───────────────────────────────────────────────────

@router.get("/claims", response_model=List[SchemeClaimResponse])
def list_claims(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    return db.query(SchemeClaim).filter(
        SchemeClaim.organization_id == current_user.organization_id
    ).order_by(SchemeClaim.created_at.desc()).all()

@router.post("/claims", response_model=SchemeClaimResponse, status_code=201)
def create_claim(
    payload: SchemeClaimCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    c = SchemeClaim(
        organization_id=current_user.organization_id,
        principal_id=payload.principal_id,
        claim_number=payload.claim_number,
        claim_date=payload.claim_date,
        total_claim_qty=payload.total_claim_qty,
        settled_qty=0,
        status=payload.status
    )
    db.add(c)
    db.commit()
    db.refresh(c)
    return c

from sqlalchemy import func
from pydantic import BaseModel

class ExtraSchemeReportRow(BaseModel):
    product_id: str
    product_name: str
    purchased_extra_qty: float
    sold_extra_qty: float
    pending_extra_qty: float

@router.get("/reports/extra-scheme-settlement")
def get_extra_scheme_settlement_report(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    from models import Product
    
    results = db.query(
        Product.id,
        Product.name,
        func.sum(Entitlement.granted_qty).label("purchased_extra_qty"),
        func.sum(Entitlement.consumed_qty).label("sold_extra_qty")
    ).select_from(Entitlement).join(
        SchemeVersion, Entitlement.scheme_version_id == SchemeVersion.id
    ).join(
        Product, SchemeVersion.product_id == Product.id
    ).filter(
        Entitlement.organization_id == current_user.organization_id
    ).group_by(Product.id, Product.name).all()

    report = []
    for r in results:
        pending = (r.purchased_extra_qty or 0) - (r.sold_extra_qty or 0)
        report.append({
            "product_id": str(r.id),
            "product_name": r.name,
            "purchased_extra_qty": float(r.purchased_extra_qty or 0),
            "sold_extra_qty": float(r.sold_extra_qty or 0),
            "pending_extra_qty": float(pending)
        })
    return report
