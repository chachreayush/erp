from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from database import get_db
import models
import schemas
from auth.router import get_current_user

router = APIRouter()

# ── HELPER FUNCTION ───────────────────────────────────────
def get_org_id(current_user: models.User) -> UUID:
    if not current_user.organization_id:
        raise HTTPException(status_code=403, detail="User does not belong to an organization")
    return current_user.organization_id

# ── LEDGERS ───────────────────────────────────────────────
@router.get("/ledgers", response_model=List[schemas.LedgerResponse])
def get_ledgers(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    org_id = get_org_id(current_user)
    return db.query(models.Ledger).filter(
        models.Ledger.organization_id == org_id,
        models.Ledger.is_active == True
    ).offset(skip).limit(limit).all()

@router.post("/ledgers", response_model=schemas.LedgerResponse)
def create_ledger(ledger: schemas.LedgerCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    org_id = get_org_id(current_user)
    db_ledger = models.Ledger(**ledger.model_dump(), organization_id=org_id)
    db.add(db_ledger)
    db.commit()
    db.refresh(db_ledger)
    return db_ledger

@router.put("/ledgers/{ledger_id}", response_model=schemas.LedgerResponse)
def update_ledger(ledger_id: UUID, ledger: schemas.LedgerCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    org_id = get_org_id(current_user)
    db_ledger = db.query(models.Ledger).filter(models.Ledger.id == ledger_id, models.Ledger.organization_id == org_id).first()
    if not db_ledger:
        raise HTTPException(status_code=404, detail="Ledger not found")
    
    for key, value in ledger.model_dump().items():
        setattr(db_ledger, key, value)
        
    db.commit()
    db.refresh(db_ledger)
    return db_ledger

@router.delete("/ledgers/{ledger_id}")
def delete_ledger(ledger_id: UUID, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    org_id = get_org_id(current_user)
    db_ledger = db.query(models.Ledger).filter(models.Ledger.id == ledger_id, models.Ledger.organization_id == org_id).first()
    if not db_ledger:
        raise HTTPException(status_code=404, detail="Ledger not found")
    
    db.delete(db_ledger)
    db.commit()
    return {"message": "Ledger deleted successfully"}

# ── SALTS ────────────────────────────────────────────────
@router.get("/salts", response_model=List[schemas.SaltResponse])
def get_salts(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    org_id = get_org_id(current_user)
    return db.query(models.Salt).filter(
        models.Salt.organization_id == org_id,
        models.Salt.is_active == True
    ).offset(skip).limit(limit).all()

@router.post("/salts", response_model=schemas.SaltResponse)
def create_salt(salt: schemas.SaltCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    org_id = get_org_id(current_user)
    db_salt = models.Salt(**salt.model_dump(), organization_id=org_id)
    db.add(db_salt)
    db.commit()
    db.refresh(db_salt)
    return db_salt

@router.put("/salts/{salt_id}", response_model=schemas.SaltResponse)
def update_salt(salt_id: UUID, salt: schemas.SaltCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    org_id = get_org_id(current_user)
    db_salt = db.query(models.Salt).filter(models.Salt.id == salt_id, models.Salt.organization_id == org_id).first()
    if not db_salt:
        raise HTTPException(status_code=404, detail="Salt not found")
    
    for key, value in salt.model_dump().items():
        setattr(db_salt, key, value)
        
    db.commit()
    db.refresh(db_salt)
    return db_salt

@router.delete("/salts/{salt_id}")
def delete_salt(salt_id: UUID, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    org_id = get_org_id(current_user)
    db_salt = db.query(models.Salt).filter(models.Salt.id == salt_id, models.Salt.organization_id == org_id).first()
    if not db_salt:
        raise HTTPException(status_code=404, detail="Salt not found")
    
    db.delete(db_salt)
    db.commit()
    return {"message": "Salt deleted successfully"}

# ── MANUFACTURERS ───────────────────────────────────────
@router.get("/manufacturers", response_model=List[schemas.ManufacturerResponse])
def get_manufacturers(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    org_id = get_org_id(current_user)
    return db.query(models.Manufacturer).filter(
        models.Manufacturer.organization_id == org_id,
        models.Manufacturer.is_active == True
    ).offset(skip).limit(limit).all()

@router.post("/manufacturers", response_model=schemas.ManufacturerResponse)
def create_manufacturer(manufacturer: schemas.ManufacturerCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    org_id = get_org_id(current_user)
    db_manufacturer = models.Manufacturer(**manufacturer.model_dump(), organization_id=org_id)
    db.add(db_manufacturer)
    db.commit()
    db.refresh(db_manufacturer)
    return db_manufacturer

@router.put("/manufacturers/{manufacturer_id}", response_model=schemas.ManufacturerResponse)
def update_manufacturer(manufacturer_id: UUID, manufacturer: schemas.ManufacturerCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    org_id = get_org_id(current_user)
    db_manufacturer = db.query(models.Manufacturer).filter(models.Manufacturer.id == manufacturer_id, models.Manufacturer.organization_id == org_id).first()
    if not db_manufacturer:
        raise HTTPException(status_code=404, detail="Manufacturer not found")
    
    for key, value in manufacturer.model_dump().items():
        setattr(db_manufacturer, key, value)
        
    db.commit()
    db.refresh(db_manufacturer)
    return db_manufacturer

@router.delete("/manufacturers/{manufacturer_id}")
def delete_manufacturer(manufacturer_id: UUID, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    org_id = get_org_id(current_user)
    db_manufacturer = db.query(models.Manufacturer).filter(models.Manufacturer.id == manufacturer_id, models.Manufacturer.organization_id == org_id).first()
    if not db_manufacturer:
        raise HTTPException(status_code=404, detail="Manufacturer not found")
    
    db.delete(db_manufacturer)
    db.commit()
    return {"message": "Manufacturer deleted successfully"}

# ── HSN CODES ───────────────────────────────────────────
@router.get("/hsn", response_model=List[schemas.HSNCodeResponse])
def get_hsn_codes(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    org_id = get_org_id(current_user)
    return db.query(models.HSNCode).filter(
        models.HSNCode.organization_id == org_id
    ).offset(skip).limit(limit).all()

@router.post("/hsn", response_model=schemas.HSNCodeResponse)
def create_hsn_code(hsn: schemas.HSNCodeCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    org_id = get_org_id(current_user)
    db_hsn = models.HSNCode(**hsn.model_dump(), organization_id=org_id)
    db.add(db_hsn)
    db.commit()
    db.refresh(db_hsn)
    return db_hsn

@router.put("/hsn/{hsn_id}", response_model=schemas.HSNCodeResponse)
def update_hsn_code(hsn_id: UUID, hsn: schemas.HSNCodeCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    org_id = get_org_id(current_user)
    db_hsn = db.query(models.HSNCode).filter(models.HSNCode.id == hsn_id, models.HSNCode.organization_id == org_id).first()
    if not db_hsn:
        raise HTTPException(status_code=404, detail="HSN Code not found")
    
    for key, value in hsn.model_dump().items():
        setattr(db_hsn, key, value)
        
    db.commit()
    db.refresh(db_hsn)
    return db_hsn

@router.delete("/hsn/{hsn_id}")
def delete_hsn_code(hsn_id: UUID, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    org_id = get_org_id(current_user)
    db_hsn = db.query(models.HSNCode).filter(models.HSNCode.id == hsn_id, models.HSNCode.organization_id == org_id).first()
    if not db_hsn:
        raise HTTPException(status_code=404, detail="HSN Code not found")
    
    db.delete(db_hsn)
    db.commit()
    return {"message": "HSN Code deleted successfully"}

# ── STATE CODES ─────────────────────────────────────────
@router.get("/states", response_model=List[schemas.StateCodeResponse])
def get_state_codes(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    org_id = get_org_id(current_user)
    return db.query(models.StateCode).filter(
        models.StateCode.organization_id == org_id
    ).offset(skip).limit(limit).all()

@router.post("/states", response_model=schemas.StateCodeResponse)
def create_state_code(state: schemas.StateCodeCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    org_id = get_org_id(current_user)
    db_state = models.StateCode(**state.model_dump(), organization_id=org_id)
    db.add(db_state)
    db.commit()
    db.refresh(db_state)
    return db_state

@router.put("/states/{state_id}", response_model=schemas.StateCodeResponse)
def update_state_code(state_id: UUID, state: schemas.StateCodeCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    org_id = get_org_id(current_user)
    db_state = db.query(models.StateCode).filter(models.StateCode.id == state_id, models.StateCode.organization_id == org_id).first()
    if not db_state:
        raise HTTPException(status_code=404, detail="State Code not found")
    
    for key, value in state.model_dump().items():
        setattr(db_state, key, value)
        
    db.commit()
    db.refresh(db_state)
    return db_state

@router.delete("/states/{state_id}")
def delete_state_code(state_id: UUID, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    org_id = get_org_id(current_user)
    db_state = db.query(models.StateCode).filter(models.StateCode.id == state_id, models.StateCode.organization_id == org_id).first()
    if not db_state:
        raise HTTPException(status_code=404, detail="State Code not found")
    
    db.delete(db_state)
    db.commit()
    return {"message": "State Code deleted successfully"}

# "?"? STATIONS "?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?
@router.get("/stations", response_model=List[schemas.StationResponse])
def get_stations(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    org_id = get_org_id(current_user)
    return db.query(models.Station).filter(
        models.Station.organization_id == org_id
    ).offset(skip).limit(limit).all()

@router.post("/stations", response_model=schemas.StationResponse)
def create_station(station: schemas.StationCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    org_id = get_org_id(current_user)
    db_station = models.Station(**station.model_dump(), organization_id=org_id)
    db.add(db_station)
    db.commit()
    db.refresh(db_station)
    return db_station

@router.put("/stations/{station_id}", response_model=schemas.StationResponse)
def update_station(station_id: UUID, station: schemas.StationCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    org_id = get_org_id(current_user)
    db_station = db.query(models.Station).filter(models.Station.id == station_id, models.Station.organization_id == org_id).first()
    if not db_station:
        raise HTTPException(status_code=404, detail="Station not found")
    
    for key, value in station.model_dump().items():
        setattr(db_station, key, value)
        
    db.commit()
    db.refresh(db_station)
    return db_station

@router.delete("/stations/{station_id}")
def delete_station(station_id: UUID, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    org_id = get_org_id(current_user)
    db_station = db.query(models.Station).filter(models.Station.id == station_id, models.Station.organization_id == org_id).first()
    if not db_station:
        raise HTTPException(status_code=404, detail="Station not found")
    
    db.delete(db_station)
    db.commit()
    return {"message": "Station deleted successfully"}
