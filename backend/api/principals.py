from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from uuid import UUID
from database import get_db
from auth.router import get_current_user
from models import Principal, PrincipalAgreement, PrincipalWarehouseMapping
from schemas import (
    PrincipalCreate, PrincipalResponse,
    PrincipalAgreementCreate, PrincipalAgreementResponse,
    PrincipalWarehouseMappingCreate, PrincipalWarehouseMappingResponse
)

router = APIRouter(
    prefix="/api/principals",
    tags=["Principals (DOC-12)"],
    dependencies=[Depends(get_current_user)]
)


# ── PRINCIPAL CRUD ────────────────────────────────────────────

@router.get("/", response_model=List[PrincipalResponse])
def list_principals(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    status_filter: Optional[str] = Query(None, alias="status")
):
    query = db.query(Principal).filter(
        Principal.organization_id == current_user.organization_id
    )
    if status_filter:
        query = query.filter(Principal.status == status_filter)
    return query.order_by(Principal.code).all()


@router.post("/", response_model=PrincipalResponse, status_code=201)
def create_principal(
    payload: PrincipalCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    existing = db.query(Principal).filter(
        Principal.organization_id == current_user.organization_id,
        Principal.code == payload.code
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail=f"Principal code '{payload.code}' already exists.")
    
    principal = Principal(
        organization_id=current_user.organization_id,
        code=payload.code,
        legal_name=payload.legal_name,
        brand=payload.brand,
        gstin=payload.gstin,
        status=payload.status
    )
    db.add(principal)
    db.commit()
    db.refresh(principal)
    return principal


@router.get("/{principal_id}", response_model=PrincipalResponse)
def get_principal(
    principal_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    principal = db.query(Principal).filter(
        Principal.id == principal_id,
        Principal.organization_id == current_user.organization_id
    ).first()
    if not principal:
        raise HTTPException(status_code=404, detail="Principal not found.")
    return principal


@router.put("/{principal_id}", response_model=PrincipalResponse)
def update_principal(
    principal_id: UUID,
    payload: PrincipalCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    principal = db.query(Principal).filter(
        Principal.id == principal_id,
        Principal.organization_id == current_user.organization_id
    ).first()
    if not principal:
        raise HTTPException(status_code=404, detail="Principal not found.")
    
    principal.code = payload.code
    principal.legal_name = payload.legal_name
    principal.brand = payload.brand
    principal.gstin = payload.gstin
    principal.status = payload.status
    db.commit()
    db.refresh(principal)
    return principal


@router.delete("/{principal_id}", status_code=204)
def delete_principal(
    principal_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    principal = db.query(Principal).filter(
        Principal.id == principal_id,
        Principal.organization_id == current_user.organization_id
    ).first()
    if not principal:
        raise HTTPException(status_code=404, detail="Principal not found.")
    db.delete(principal)
    db.commit()


# ── PRINCIPAL STATUS ──────────────────────────────────────────

@router.patch("/{principal_id}/status")
def change_principal_status(
    principal_id: UUID,
    new_status: str = Query(...),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    if new_status not in ("active", "suspended", "archived"):
        raise HTTPException(status_code=400, detail="Status must be active, suspended, or archived.")
    
    principal = db.query(Principal).filter(
        Principal.id == principal_id,
        Principal.organization_id == current_user.organization_id
    ).first()
    if not principal:
        raise HTTPException(status_code=404, detail="Principal not found.")
    
    principal.status = new_status
    db.commit()
    return {"id": str(principal.id), "status": principal.status}


# ── AGREEMENTS ────────────────────────────────────────────────

@router.get("/{principal_id}/agreements", response_model=List[PrincipalAgreementResponse])
def list_agreements(
    principal_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    return db.query(PrincipalAgreement).filter(
        PrincipalAgreement.principal_id == principal_id,
        PrincipalAgreement.organization_id == current_user.organization_id
    ).order_by(PrincipalAgreement.valid_from.desc()).all()


@router.post("/{principal_id}/agreements", response_model=PrincipalAgreementResponse, status_code=201)
def create_agreement(
    principal_id: UUID,
    payload: PrincipalAgreementCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    agreement = PrincipalAgreement(
        organization_id=current_user.organization_id,
        principal_id=principal_id,
        version_name=payload.version_name,
        valid_from=payload.valid_from,
        valid_to=payload.valid_to,
        commission_percent=payload.commission_percent,
        handling_percent=payload.handling_percent,
        is_active=payload.is_active
    )
    db.add(agreement)
    db.commit()
    db.refresh(agreement)
    return agreement


# ── WAREHOUSE MAPPINGS ────────────────────────────────────────

@router.get("/{principal_id}/warehouses", response_model=List[PrincipalWarehouseMappingResponse])
def list_warehouse_mappings(
    principal_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    return db.query(PrincipalWarehouseMapping).filter(
        PrincipalWarehouseMapping.principal_id == principal_id,
        PrincipalWarehouseMapping.organization_id == current_user.organization_id
    ).all()


@router.post("/{principal_id}/warehouses", response_model=PrincipalWarehouseMappingResponse, status_code=201)
def map_warehouse(
    principal_id: UUID,
    payload: PrincipalWarehouseMappingCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    mapping = PrincipalWarehouseMapping(
        organization_id=current_user.organization_id,
        principal_id=principal_id,
        warehouse_id=payload.warehouse_id
    )
    db.add(mapping)
    db.commit()
    db.refresh(mapping)
    return mapping


@router.delete("/{principal_id}/warehouses/{mapping_id}", status_code=204)
def unmap_warehouse(
    principal_id: UUID,
    mapping_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    mapping = db.query(PrincipalWarehouseMapping).filter(
        PrincipalWarehouseMapping.id == mapping_id,
        PrincipalWarehouseMapping.principal_id == principal_id,
        PrincipalWarehouseMapping.organization_id == current_user.organization_id
    ).first()
    if not mapping:
        raise HTTPException(status_code=404, detail="Warehouse mapping not found.")
    db.delete(mapping)
    db.commit()
