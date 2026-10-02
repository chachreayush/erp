from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List, Dict, Any
from uuid import UUID
from datetime import date
from database import get_db
from auth.router import get_current_user
from models import PriceList, PriceListRule, PriceFormula, CustomerPriceConfig, Product
from schemas import (
    PriceListCreate, PriceListResponse,
    PriceListRuleCreate, PriceListRuleResponse,
    PriceFormulaCreate, PriceFormulaResponse,
    CustomerPriceConfigCreate, CustomerPriceConfigResponse
)

router = APIRouter(
    prefix="/api/pricing",
    tags=["Pricing & Formulas (DOC-15)"],
    dependencies=[Depends(get_current_user)]
)

# ── PRICE LISTS ────────────────────────────────────────────────

@router.get("/lists", response_model=List[PriceListResponse])
def list_price_lists(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return db.query(PriceList).options(joinedload(PriceList.rules)).filter(
        PriceList.organization_id == current_user.organization_id
    ).order_by(PriceList.code).all()

@router.post("/lists", response_model=PriceListResponse, status_code=201)
def create_price_list(payload: PriceListCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    p = PriceList(
        organization_id=current_user.organization_id,
        code=payload.code,
        name=payload.name,
        description=payload.description,
        status=payload.status
    )
    db.add(p)
    db.commit()
    db.refresh(p)
    return p

@router.post("/lists/{list_id}/rules", response_model=PriceListRuleResponse, status_code=201)
def add_price_list_rule(list_id: UUID, payload: PriceListRuleCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    r = PriceListRule(
        organization_id=current_user.organization_id,
        price_list_id=list_id,
        product_id=payload.product_id,
        valid_from=payload.valid_from,
        valid_to=payload.valid_to,
        fixed_price=payload.fixed_price
    )
    db.add(r)
    db.commit()
    db.refresh(r)
    return r

# ── FORMULAS ───────────────────────────────────────────────────

@router.get("/formulas", response_model=List[PriceFormulaResponse])
def list_formulas(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return db.query(PriceFormula).filter(
        PriceFormula.organization_id == current_user.organization_id
    ).all()

@router.post("/formulas", response_model=PriceFormulaResponse, status_code=201)
def create_formula(payload: PriceFormulaCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    f = PriceFormula(
        organization_id=current_user.organization_id,
        target_rate_type=payload.target_rate_type,
        source_rate_type=payload.source_rate_type,
        operator=payload.operator,
        operand=payload.operand,
        floor_price=payload.floor_price,
        status=payload.status
    )
    db.add(f)
    db.commit()
    db.refresh(f)
    return f

@router.put("/formulas/{formula_id}", response_model=PriceFormulaResponse)
def update_formula(formula_id: UUID, payload: PriceFormulaCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    f = db.query(PriceFormula).filter(PriceFormula.id == formula_id, PriceFormula.organization_id == current_user.organization_id).first()
    if not f:
        raise HTTPException(status_code=404, detail="Formula not found")
    
    f.target_rate_type = payload.target_rate_type
    f.source_rate_type = payload.source_rate_type
    f.operator = payload.operator
    f.operand = payload.operand
    f.floor_price = payload.floor_price
    f.status = payload.status
    
    db.commit()
    db.refresh(f)
    return f

@router.delete("/formulas/{formula_id}")
def delete_formula(formula_id: UUID, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    f = db.query(PriceFormula).filter(PriceFormula.id == formula_id, PriceFormula.organization_id == current_user.organization_id).first()
    if not f:
        raise HTTPException(status_code=404, detail="Formula not found")
    db.delete(f)
    db.commit()
    return {"status": "deleted"}

# ── CUSTOMER CONFIG ────────────────────────────────────────────

@router.get("/customer-config", response_model=List[CustomerPriceConfigResponse])
def list_customer_configs(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return db.query(CustomerPriceConfig).filter(
        CustomerPriceConfig.organization_id == current_user.organization_id
    ).all()

@router.post("/customer-config", response_model=CustomerPriceConfigResponse, status_code=201)
def create_customer_config(payload: CustomerPriceConfigCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    # Upsert logic
    existing = db.query(CustomerPriceConfig).filter(
        CustomerPriceConfig.organization_id == current_user.organization_id,
        CustomerPriceConfig.party_id == payload.party_id
    ).first()
    
    if existing:
        existing.default_rate_type = payload.default_rate_type
        existing.price_list_id = payload.price_list_id
        db.commit()
        db.refresh(existing)
        return existing
        
    c = CustomerPriceConfig(
        organization_id=current_user.organization_id,
        party_id=payload.party_id,
        default_rate_type=payload.default_rate_type,
        price_list_id=payload.price_list_id
    )
    db.add(c)
    db.commit()
    db.refresh(c)
    return c

# ── ENGINE / SIMULATION ────────────────────────────────────────

@router.get("/simulate")
def simulate_price(
    product_id: UUID,
    party_id: UUID,
    tx_date: date,
    qty: float = 1.0,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """
    Simulates price resolution.
    Precedence: 
    1. Customer-Specific Price List
    2. Customer Default Rate Type -> Formula
    3. Standard MRP (Fallback)
    """
    trace = []
    final_price = 0.0
    
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        return {"error": "Product not found"}
        
    trace.append(f"Loaded product '{product.name}' (MRP: {product.mrp})")
    
    # 1. Check Customer Config
    config = db.query(CustomerPriceConfig).filter(CustomerPriceConfig.party_id == party_id).first()
    
    if config and config.price_list_id:
        trace.append(f"Customer has assigned Price List {config.price_list_id}")
        rule = db.query(PriceListRule).filter(
            PriceListRule.price_list_id == config.price_list_id,
            PriceListRule.product_id == product_id,
            PriceListRule.valid_from <= tx_date,
            PriceListRule.valid_to >= tx_date
        ).first()
        if rule:
            trace.append(f"Found active Price List Rule: {rule.fixed_price}")
            final_price = float(rule.fixed_price)
            return {"final_price": final_price, "trace": trace, "source": "price_list"}
        else:
            trace.append("No active rule found in Price List for this date/product.")
            
    if config and config.default_rate_type:
        trace.append(f"Customer has Default Rate Type: {config.default_rate_type}")
        formula = db.query(PriceFormula).filter(
            PriceFormula.target_rate_type == config.default_rate_type
        ).first()
        
        if formula:
            trace.append(f"Found Formula: {formula.source_rate_type} {formula.operator} {formula.operand}")
            # Mocking source rate mapping
            base = float(product.mrp or 0)
            if formula.source_rate_type == 'purchase':
                base = base * 0.7 # Simulated purchase rate
                trace.append(f"Using simulated Purchase Rate: {base}")
            else:
                trace.append(f"Using MRP as base: {base}")
                
            if formula.operator == 'multiply':
                final_price = base * float(formula.operand)
            elif formula.operator == 'add_percent':
                final_price = base * (1 + (float(formula.operand) / 100))
            else:
                final_price = base
                
            trace.append(f"Calculated price: {final_price}")
            if formula.floor_price and final_price < float(formula.floor_price):
                trace.append(f"Price adjusted to floor: {formula.floor_price}")
                final_price = float(formula.floor_price)
                
            return {"final_price": final_price, "trace": trace, "source": "formula"}
    
    trace.append("Falling back to standard product MRP")
    final_price = float(product.mrp or 0)
    return {"final_price": final_price, "trace": trace, "source": "mrp"}
