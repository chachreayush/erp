from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from uuid import UUID
from database import get_db
from auth.router import get_current_user
from models import Warehouse, WarehouseZone, WarehouseBin
from schemas import (
    WarehouseCreate, WarehouseResponse,
    WarehouseZoneCreate, WarehouseZoneResponse,
    WarehouseBinCreate, WarehouseBinResponse
)

router = APIRouter(
    prefix="/api/warehouses",
    tags=["Warehouses (DOC-13)"],
    dependencies=[Depends(get_current_user)]
)

# ── WAREHOUSES ──────────────────────────────────────────────

@router.get("/", response_model=List[WarehouseResponse])
def list_warehouses(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    return db.query(Warehouse).options(
        joinedload(Warehouse.zones).joinedload(WarehouseZone.bins)
    ).filter(
        Warehouse.organization_id == current_user.organization_id
    ).order_by(Warehouse.code).all()


@router.post("/", response_model=WarehouseResponse, status_code=201)
def create_warehouse(
    payload: WarehouseCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    existing = db.query(Warehouse).filter(
        Warehouse.organization_id == current_user.organization_id,
        Warehouse.code == payload.code
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Warehouse code already exists.")
    
    warehouse = Warehouse(
        organization_id=current_user.organization_id,
        code=payload.code,
        name=payload.name,
        address=payload.address,
        manager_name=payload.manager_name,
        status=payload.status
    )
    db.add(warehouse)
    db.commit()
    db.refresh(warehouse)
    return warehouse


@router.delete("/{warehouse_id}", status_code=204)
def delete_warehouse(
    warehouse_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    warehouse = db.query(Warehouse).filter(
        Warehouse.id == warehouse_id,
        Warehouse.organization_id == current_user.organization_id
    ).first()
    if not warehouse:
        raise HTTPException(status_code=404, detail="Warehouse not found.")
    db.delete(warehouse)
    db.commit()


# ── ZONES ───────────────────────────────────────────────────

@router.post("/{warehouse_id}/zones", response_model=WarehouseZoneResponse, status_code=201)
def create_zone(
    warehouse_id: UUID,
    payload: WarehouseZoneCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    zone = WarehouseZone(
        organization_id=current_user.organization_id,
        warehouse_id=warehouse_id,
        code=payload.code,
        name=payload.name,
        storage_type=payload.storage_type,
        status=payload.status
    )
    db.add(zone)
    db.commit()
    db.refresh(zone)
    return zone

@router.delete("/zones/{zone_id}", status_code=204)
def delete_zone(
    zone_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    zone = db.query(WarehouseZone).filter(
        WarehouseZone.id == zone_id,
        WarehouseZone.organization_id == current_user.organization_id
    ).first()
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found.")
    db.delete(zone)
    db.commit()


# ── BINS ────────────────────────────────────────────────────

@router.post("/{warehouse_id}/bins", response_model=WarehouseBinResponse, status_code=201)
def create_bin(
    warehouse_id: UUID,
    payload: WarehouseBinCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    wbin = WarehouseBin(
        organization_id=current_user.organization_id,
        warehouse_id=warehouse_id,
        zone_id=payload.zone_id,
        code=payload.code,
        aisle=payload.aisle,
        rack=payload.rack,
        shelf=payload.shelf,
        bin_number=payload.bin_number,
        status=payload.status
    )
    db.add(wbin)
    db.commit()
    db.refresh(wbin)
    return wbin

@router.delete("/bins/{bin_id}", status_code=204)
def delete_bin(
    bin_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    wbin = db.query(WarehouseBin).filter(
        WarehouseBin.id == bin_id,
        WarehouseBin.organization_id == current_user.organization_id
    ).first()
    if not wbin:
        raise HTTPException(status_code=404, detail="Bin not found.")
    db.delete(wbin)
    db.commit()
