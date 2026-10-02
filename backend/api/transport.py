from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List
from uuid import UUID
from database import get_db
from auth.router import get_current_user
from models import Transporter, Vehicle
from schemas import (
    TransporterCreate, TransporterResponse,
    VehicleCreate, VehicleResponse
)

router = APIRouter(
    prefix="/api/transport",
    tags=["Transport (DOC-13)"],
    dependencies=[Depends(get_current_user)]
)

# ── TRANSPORTERS ────────────────────────────────────────────

@router.get("/transporters", response_model=List[TransporterResponse])
def list_transporters(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    return db.query(Transporter).options(joinedload(Transporter.vehicles)).filter(
        Transporter.organization_id == current_user.organization_id
    ).order_by(Transporter.code).all()

@router.post("/transporters", response_model=TransporterResponse, status_code=201)
def create_transporter(
    payload: TransporterCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    t = Transporter(
        organization_id=current_user.organization_id,
        code=payload.code,
        name=payload.name,
        gstin=payload.gstin,
        contact_person=payload.contact_person,
        phone=payload.phone,
        status=payload.status
    )
    db.add(t)
    db.commit()
    db.refresh(t)
    return t

@router.delete("/transporters/{transporter_id}", status_code=204)
def delete_transporter(
    transporter_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    t = db.query(Transporter).filter(
        Transporter.id == transporter_id,
        Transporter.organization_id == current_user.organization_id
    ).first()
    if not t:
        raise HTTPException(status_code=404, detail="Transporter not found")
    db.delete(t)
    db.commit()

# ── VEHICLES ────────────────────────────────────────────────

@router.post("/transporters/{transporter_id}/vehicles", response_model=VehicleResponse, status_code=201)
def create_vehicle(
    transporter_id: UUID,
    payload: VehicleCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    v = Vehicle(
        organization_id=current_user.organization_id,
        transporter_id=transporter_id,
        registration_number=payload.registration_number,
        vehicle_type=payload.vehicle_type,
        capacity_kg=payload.capacity_kg,
        driver_name=payload.driver_name,
        status=payload.status
    )
    db.add(v)
    db.commit()
    db.refresh(v)
    return v

@router.delete("/vehicles/{vehicle_id}", status_code=204)
def delete_vehicle(
    vehicle_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    v = db.query(Vehicle).filter(
        Vehicle.id == vehicle_id,
        Vehicle.organization_id == current_user.organization_id
    ).first()
    if not v:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    db.delete(v)
    db.commit()
