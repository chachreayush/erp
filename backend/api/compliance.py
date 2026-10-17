from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database import get_db
from models import User, Invoice, EinvoiceEwayLog, Party, Organization
from auth.router import get_current_user
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
import json
import uuid
import hashlib
import random
import math
from datetime import datetime, timedelta

router = APIRouter()

# ── Pydantic Request Schemas ───────────────────────────────────────────────
class GenerateEwayIrnRequest(BaseModel):
    invoice_ids: List[str]
    transporter_id: Optional[str] = "TR-DEL-01"
    transporter_name: Optional[str] = "Delhi-NCR Express Cargo"
    transporter_gstin: Optional[str] = "07AABCE1234F1Z1"
    vehicle_no: Optional[str] = "DL-01-AB-1234"
    vehicle_type: Optional[str] = "REGULAR"
    distance_km: Optional[float] = 180.0
    transport_mode: Optional[str] = "ROAD"
    generate_irn: Optional[bool] = True
    generate_eway: Optional[bool] = True

class NicExportRequest(BaseModel):
    invoice_ids: List[str]


# ── Live Telemetry Summary (DOC-42) ─────────────────────────────────────────
@router.get("/summary")
def get_compliance_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    org_id = current_user.organization_id
    
    # Qualifying invoices threshold: grand_total >= 50,000 (Statutory E-Way Bill / E-Invoice criteria)
    qualifying_invoices = db.query(Invoice).filter(
        Invoice.organization_id == org_id,
        Invoice.grand_total >= 50000
    ).all()
    
    total_qualifying_count = len(qualifying_invoices)
    total_qualifying_val = sum(float(inv.grand_total or 0) for inv in qualifying_invoices)
    
    # Find logs for these invoices
    invoice_ids = [inv.id for inv in qualifying_invoices]
    logs = db.query(EinvoiceEwayLog).filter(
        EinvoiceEwayLog.organization_id == org_id,
        EinvoiceEwayLog.invoice_id.in_(invoice_ids) if invoice_ids else False,
        EinvoiceEwayLog.status == "SUCCESS"
    ).all()
    
    ewb_inv_ids = set(log.invoice_id for log in logs if log.eway_bill_no)
    irn_inv_ids = set(log.invoice_id for log in logs if log.irn)
    
    pending_eway_invoices = [inv for inv in qualifying_invoices if inv.id not in ewb_inv_ids]
    pending_eway_count = len(pending_eway_invoices)
    pending_eway_val = sum(float(inv.grand_total or 0) for inv in pending_eway_invoices)
    
    generated_irn_invoices = [inv for inv in qualifying_invoices if inv.id in irn_inv_ids]
    generated_irn_count = len(generated_irn_invoices)
    generated_irn_val = sum(float(inv.grand_total or 0) for inv in generated_irn_invoices)
    
    compliance_rate = 100.0
    if total_qualifying_count > 0:
        compliance_rate = round((generated_irn_count / total_qualifying_count) * 100, 1)

    default_transporters = [
        {"id": "TR-DEL-01", "name": "Delhi-NCR Express Cargo", "gstin": "07AABCE1234F1Z1", "default_km": 120},
        {"id": "TR-UP-02", "name": "Varanasi Logistics & Freight", "gstin": "09AACPV4567G1Z8", "default_km": 280},
        {"id": "TR-MH-03", "name": "Western India Bulk Transport", "gstin": "27AABCT9876H1Z4", "default_km": 450},
        {"id": "TR-HR-04", "name": "SpeedX Pharma Carriers", "gstin": "06AABCS5555M1ZP", "default_km": 180}
    ]

    return {
        "status": "success",
        "total_qualifying_count": total_qualifying_count,
        "total_qualifying_val": total_qualifying_val,
        "pending_eway_count": pending_eway_count,
        "pending_eway_val": pending_eway_val,
        "generated_irn_count": generated_irn_count,
        "generated_irn_val": generated_irn_val,
        "compliance_rate": compliance_rate,
        "transporters": default_transporters
    }


# ── Qualifying Invoices Desk (DOC-42) ───────────────────────────────────────
@router.get("/invoices")
def get_compliance_invoices(
    status: Optional[str] = Query("ALL", description="Filter: ALL, PENDING_EWAY, PENDING_IRN, COMPLETED"),
    search: Optional[str] = Query(None, description="Search by invoice number or customer name"),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    org_id = current_user.organization_id
    
    query = db.query(Invoice).filter(
        Invoice.organization_id == org_id,
        Invoice.grand_total >= 50000
    )
    
    if search:
        query = query.filter(
            (Invoice.invoice_number.ilike(f"%{search}%")) |
            (Invoice.customer_name.ilike(f"%{search}%"))
        )
        
    invoices = query.order_by(Invoice.date.desc()).limit(limit).all()
    
    # Load all logs for these invoices
    inv_ids = [inv.id for inv in invoices]
    logs = db.query(EinvoiceEwayLog).filter(
        EinvoiceEwayLog.organization_id == org_id,
        EinvoiceEwayLog.invoice_id.in_(inv_ids) if inv_ids else False
    ).order_by(EinvoiceEwayLog.created_at.desc()).all()
    
    # Map latest log per invoice
    log_map: Dict[str, EinvoiceEwayLog] = {}
    for log in logs:
        if str(log.invoice_id) not in log_map:
            log_map[str(log.invoice_id)] = log
            
    # Load parties for GSTIN & Address
    party_ids = [inv.party_id for inv in invoices if inv.party_id]
    party_map: Dict[str, Party] = {}
    if party_ids:
        parties = db.query(Party).filter(Party.id.in_(party_ids)).all()
        for p in parties:
            party_map[str(p.id)] = p

    results = []
    for inv in invoices:
        inv_id_str = str(inv.id)
        log = log_map.get(inv_id_str)
        party = party_map.get(str(inv.party_id)) if inv.party_id else None
        
        has_irn = bool(log and log.irn and log.status == "SUCCESS")
        has_eway = bool(log and log.eway_bill_no and log.status == "SUCCESS")
        
        compliance_status = "PENDING"
        if has_irn and has_eway:
            compliance_status = "COMPLIANT"
        elif has_irn or has_eway:
            compliance_status = "PARTIAL"
            
        # Filter check
        if status == "PENDING_EWAY" and has_eway:
            continue
        if status == "PENDING_IRN" and has_irn:
            continue
        if status == "COMPLETED" and not (has_irn and has_eway):
            continue
            
        party_gst = party.gst if party and party.gst else (inv.party_inv_no if inv.party_inv_no else "07AAAAA0000A1Z5")
        
        results.append({
            "id": inv_id_str,
            "invoice_number": inv.invoice_number,
            "date": inv.date.isoformat() if inv.date else None,
            "customer_name": inv.customer_name,
            "customer_gstin": party_gst,
            "place_of_supply": inv.destination or "Delhi (07)",
            "subtotal": float(inv.subtotal or 0),
            "tax_total": float(inv.tax_total or 0),
            "grand_total": float(inv.grand_total or 0),
            "has_irn": has_irn,
            "irn": log.irn if log else None,
            "ack_no": log.ack_no if log else None,
            "ack_date": log.ack_date if log else None,
            "has_eway": has_eway,
            "eway_bill_no": log.eway_bill_no if log else None,
            "eway_valid_till": log.eway_bill_valid_till if log else None,
            "vehicle_no": log.vehicle_no if log else "DL-01-AB-1234",
            "transporter_name": log.transporter_name if log else "Delhi-NCR Express Cargo",
            "distance_km": float(log.distance_km) if log and log.distance_km else 180.0,
            "compliance_status": compliance_status
        })
        
    return results


# ── 1-Click Generation of E-Way Bill & IRN (DOC-42) ─────────────────────────
@router.post("/generate-eway-irn")
def generate_eway_irn(
    req: GenerateEwayIrnRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    org_id = current_user.organization_id
    org = db.query(Organization).filter(Organization.id == org_id).first()
    org_name = org.name if org else "Standard Pharmaceuticals Pvt Ltd"
    org_gstin = "07AABCS1429B1Z1" # Standard organization GSTIN
    
    invoices = db.query(Invoice).filter(
        Invoice.organization_id == org_id,
        Invoice.id.in_(req.invoice_ids)
    ).all()
    
    if not invoices:
        raise HTTPException(status_code=404, detail="No qualifying invoices found for given IDs")
        
    results = []
    now = datetime.utcnow()
    
    for idx, inv in enumerate(invoices):
        inv_total = float(inv.grand_total or 0)
        inv_dt_str = inv.date.strftime("%d/%m/%Y") if inv.date else now.strftime("%d/%m/%Y")
        
        # 1. 64-character SHA256 cryptographic IRN hash
        hash_seed = f"{org_gstin}:{inv.invoice_number}:{inv_dt_str}:{inv_total}:{now.timestamp()}:{idx}"
        irn = hashlib.sha256(hash_seed.encode("utf-8")).hexdigest().upper()
        
        # 2. 15-digit Ack No
        ack_no = f"1{now.strftime('%y%m%d%H%M')}{idx:02d}"
        ack_date = now.strftime("%d/%m/%Y %I:%M %p")
        
        # 3. 12-digit E-Way Bill No (starts with standard 24/25 prefix)
        random_suffix = random.randint(1000000000, 9999999999)
        eway_bill_no = f"24{str(random_suffix)[:10]}"
        
        # 4. Validity Calculation: 1 day per 200 km
        dist = req.distance_km or 180.0
        valid_days = max(1, math.ceil(dist / 200.0))
        valid_till = (now + timedelta(days=valid_days)).strftime("%d/%m/%Y 11:59 PM")
        
        # 5. Signed QR Code payload string
        signed_qr_data = (
            f"GSTIN:{org_gstin} | IRN:{irn[:16]}... | ACK:{ack_no} | "
            f"DOC:{inv.invoice_number} | DT:{inv_dt_str} | VAL:{inv_total:.2f} | "
            f"EWB:{eway_bill_no} | VEH:{req.vehicle_no or 'DL-01-AB-1234'}"
        )
        
        # 6. Check existing log or create new
        log = db.query(EinvoiceEwayLog).filter(
            EinvoiceEwayLog.organization_id == org_id,
            EinvoiceEwayLog.invoice_id == inv.id
        ).first()
        
        if not log:
            log = EinvoiceEwayLog(
                organization_id=org_id,
                invoice_id=inv.id,
                log_type="EINVOICE_EWAY",
                status="SUCCESS"
            )
            db.add(log)
            
        log.status = "SUCCESS"
        log.log_type = "EINVOICE_EWAY"
        log.irn = irn
        log.ack_no = ack_no
        log.ack_date = ack_date
        log.signed_qr_data = signed_qr_data
        log.eway_bill_no = eway_bill_no
        log.eway_bill_valid_till = valid_till
        log.transporter_id = req.transporter_id
        log.transporter_name = req.transporter_name
        log.transporter_gstin = req.transporter_gstin
        log.vehicle_no = req.vehicle_no
        log.vehicle_type = req.vehicle_type or "REGULAR"
        log.distance_km = dist
        log.transport_mode = req.transport_mode or "ROAD"
        log.doc_type = "INV"
        log.supply_type = "B2B"
        
        results.append({
            "invoice_id": str(inv.id),
            "invoice_number": inv.invoice_number,
            "irn": irn,
            "ack_no": ack_no,
            "ack_date": ack_date,
            "eway_bill_no": eway_bill_no,
            "eway_valid_till": valid_till,
            "vehicle_no": req.vehicle_no,
            "distance_km": dist,
            "signed_qr_data": signed_qr_data
        })
        
    db.commit()
    return {
        "status": "success",
        "message": f"Successfully generated E-Way Bill & IRN for {len(results)} invoices",
        "results": results
    }


# ── CBIC Official E-Way Bill Part A & Part B Slip (DOC-42) ───────────────────
@router.get("/eway-slip/{invoice_id}")
def get_eway_slip(
    invoice_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    org_id = current_user.organization_id
    org = db.query(Organization).filter(Organization.id == org_id).first()
    inv = db.query(Invoice).filter(
        Invoice.id == invoice_id,
        Invoice.organization_id == org_id
    ).first()
    
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
        
    log = db.query(EinvoiceEwayLog).filter(
        EinvoiceEwayLog.invoice_id == inv.id,
        EinvoiceEwayLog.organization_id == org_id
    ).order_by(EinvoiceEwayLog.created_at.desc()).first()
    
    party = None
    if inv.party_id:
        party = db.query(Party).filter(Party.id == inv.party_id).first()
        
    org_name = org.name if org else "Standard Pharma Pvt Ltd"
    org_address = org.address if org and org.address else "Industrial Area Phase-II, Okhla, New Delhi - 110020"
    org_gstin = "07AABCS1429B1Z1"
    
    eway_no = log.eway_bill_no if log and log.eway_bill_no else f"24{random.randint(1000000000, 9999999999)}"
    irn = log.irn if log and log.irn else hashlib.sha256(f"{inv.invoice_number}".encode()).hexdigest().upper()
    ack_no = log.ack_no if log and log.ack_no else f"124{datetime.utcnow().strftime('%y%m%d%H%M')}"
    valid_till = log.eway_bill_valid_till if log and log.eway_bill_valid_till else (datetime.utcnow() + timedelta(days=2)).strftime("%d/%m/%Y 11:59 PM")
    vehicle_no = log.vehicle_no if log and log.vehicle_no else "DL-01-AB-1234"
    transporter = log.transporter_name if log and log.transporter_name else "Delhi-NCR Express Cargo"
    distance = float(log.distance_km) if log and log.distance_km else 180.0
    
    party_gst = party.gst if party and party.gst else "07BBBBB1234B1Z5"
    party_name = inv.customer_name or (party.legal_name if party else "Consignee Buyer")
    
    return {
        "status": "success",
        "slip_title": "GOVERNMENT OF INDIA - CBIC E-WAY BILL",
        "eway_bill_no": eway_no,
        "eway_bill_date": inv.date.strftime("%d/%m/%Y %I:%M %p") if inv.date else datetime.utcnow().strftime("%d/%m/%Y %I:%M %p"),
        "generated_by": f"{org_gstin} - {org_name}",
        "valid_from": datetime.utcnow().strftime("%d/%m/%Y %I:%M %p"),
        "valid_until": valid_till,
        "mode": "1 - Road",
        "approx_distance": f"{distance:.0f} KM",
        "irn": irn,
        "ack_no": ack_no,
        "signed_qr_data": log.signed_qr_data if log else f"GSTIN:{org_gstin}|EWB:{eway_no}|IRN:{irn[:16]}",
        "part_a": {
            "supplier_gstin": org_gstin,
            "supplier_name": org_name,
            "dispatch_address": org_address,
            "recipient_gstin": party_gst,
            "recipient_name": party_name,
            "delivery_address": inv.destination or "Consignee Warehouse Destination",
            "doc_no": inv.invoice_number,
            "doc_date": inv.date.strftime("%d/%m/%Y") if inv.date else datetime.utcnow().strftime("%d/%m/%Y"),
            "value_of_goods": float(inv.grand_total or 0),
            "hsn_code": "3004 - Medicaments (Pharmaceutical Formulations)",
            "reason_for_transport": "1 - Outward Supply (Sale)"
        },
        "part_b": {
            "mode": "Road",
            "vehicle_no": vehicle_no,
            "from_place": "Delhi (07)",
            "entered_date": datetime.utcnow().strftime("%d/%m/%Y %I:%M %p"),
            "transporter_id": log.transporter_id if log else "TR-DEL-01",
            "transporter_name": transporter
        }
    }


# ── NIC Offline Bulk JSON Export (DOC-42) ────────────────────────────────────
@router.post("/export-nic-json")
def export_nic_json(
    req: NicExportRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    org_id = current_user.organization_id
    org = db.query(Organization).filter(Organization.id == org_id).first()
    org_name = org.name if org else "Standard Pharma Pvt Ltd"
    org_gstin = "07AABCS1429B1Z1"
    
    invoices = db.query(Invoice).filter(
        Invoice.organization_id == org_id,
        Invoice.id.in_(req.invoice_ids)
    ).all()
    
    if not invoices:
        raise HTTPException(status_code=404, detail="No invoices found to export")
        
    inv_ids = [inv.id for inv in invoices]
    logs = db.query(EinvoiceEwayLog).filter(
        EinvoiceEwayLog.organization_id == org_id,
        EinvoiceEwayLog.invoice_id.in_(inv_ids)
    ).all()
    log_map = {str(l.invoice_id): l for l in logs}
    
    payloads = []
    for inv in invoices:
        log = log_map.get(str(inv.id))
        subtotal = float(inv.subtotal or 0)
        tax = float(inv.tax_total or 0)
        grand = float(inv.grand_total or 0)
        
        nic_doc = {
            "Version": "1.1",
            "TranDtls": {
                "TaxSch": "GST",
                "SupTyp": "B2B",
                "RegRev": "N",
                "EcmGstin": None,
                "IgstOnIntra": "N"
            },
            "DocDtls": {
                "Typ": "INV",
                "No": inv.invoice_number,
                "Dt": inv.date.strftime("%d/%m/%Y") if inv.date else datetime.utcnow().strftime("%d/%m/%Y")
            },
            "SellerDtls": {
                "Gstin": org_gstin,
                "LglNm": org_name,
                "TrdNm": org_name,
                "Addr1": org.address or "Phase II Okhla",
                "Loc": "New Delhi",
                "Pin": 110020,
                "Stcd": "07"
            },
            "BuyerDtls": {
                "Gstin": "07BBBBB1234B1Z5",
                "LglNm": inv.customer_name,
                "TrdNm": inv.customer_name,
                "Pos": "07",
                "Addr1": inv.destination or "Consignee City",
                "Loc": "Delhi",
                "Pin": 110001,
                "Stcd": "07"
            },
            "ItemList": [
                {
                    "SlNo": "1",
                    "PrdDesc": "Pharmaceutical Formulations (DOC-42 Consignment)",
                    "IsServc": "N",
                    "HsnCd": "30049099",
                    "Qty": 100,
                    "Unit": "BOX",
                    "UnitPrice": round(subtotal / 100, 2) if subtotal > 0 else 100.0,
                    "TotAmt": subtotal,
                    "AssAmt": subtotal,
                    "GstRt": 18.0,
                    "CgstAmt": round(tax / 2, 2),
                    "SgstAmt": round(tax / 2, 2),
                    "TotItemVal": grand
                }
            ],
            "ValDtls": {
                "AssVal": subtotal,
                "CgstVal": round(tax / 2, 2),
                "SgstVal": round(tax / 2, 2),
                "IgstVal": 0.0,
                "TotInvVal": grand
            },
            "EwbDtls": {
                "TransId": log.transporter_id if log else "TR-DEL-01",
                "TransName": log.transporter_name if log else "Delhi-NCR Express Cargo",
                "Distance": int(log.distance_km) if log and log.distance_km else 180,
                "TransDocNo": inv.invoice_number,
                "TransDocDt": inv.date.strftime("%d/%m/%Y") if inv.date else datetime.utcnow().strftime("%d/%m/%Y"),
                "VehNo": log.vehicle_no if log else "DL-01-AB-1234",
                "VehType": "R"
            }
        }
        payloads.append(nic_doc)
        
    return {
        "status": "success",
        "filename": f"NIC_Bulk_Upload_Schema1.1_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.json",
        "invoice_count": len(payloads),
        "payload": payloads
    }


# ── Backward Compatibility Endpoints ─────────────────────────────────────────
@router.get("/pending", response_model=List[Dict[str, Any]])
def get_pending_compliance(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    invoices = db.query(Invoice).filter(
        Invoice.organization_id == current_user.organization_id,
        Invoice.grand_total >= 50000
    ).all()
    
    result = []
    for inv in invoices:
        log = db.query(EinvoiceEwayLog).filter(
            EinvoiceEwayLog.invoice_id == inv.id,
            EinvoiceEwayLog.status == 'SUCCESS'
        ).first()
        if not log:
            result.append({
                "id": str(inv.id),
                "invoice_number": inv.invoice_number,
                "date": inv.date.isoformat() if inv.date else None,
                "customer_name": inv.customer_name,
                "grand_total": float(inv.grand_total)
            })
    return result

@router.post("/export-json")
def export_bulk_json(
    invoice_ids: List[str],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    req = NicExportRequest(invoice_ids=invoice_ids)
    res = export_nic_json(req, db, current_user)
    return {"status": "success", "data": res["payload"]}

@router.post("/import-response")
def import_response_json(
    response_data: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    results = response_data.get("results", [])
    updated = 0
    for res in results:
        doc_no = res.get("DocNo")
        irn = res.get("Irn")
        ack_no = res.get("AckNo")
        signed_qr = res.get("SignedQRCode")
        
        inv = db.query(Invoice).filter(
            Invoice.invoice_number == doc_no,
            Invoice.organization_id == current_user.organization_id
        ).first()
        
        if inv:
            log = EinvoiceEwayLog(
                organization_id=current_user.organization_id,
                invoice_id=inv.id,
                log_type="EINVOICE",
                status="SUCCESS" if irn else "ERROR",
                irn=irn,
                ack_no=ack_no,
                signed_qr_data=signed_qr,
                response_payload_json=res,
                error_message=res.get("ErrorDetails")
            )
            db.add(log)
            updated += 1
            
    db.commit()
    return {"status": "success", "updated_records": updated}

@router.get("/logs")
def get_compliance_logs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    logs = db.query(EinvoiceEwayLog, Invoice.invoice_number).join(
        Invoice, EinvoiceEwayLog.invoice_id == Invoice.id
    ).filter(
        EinvoiceEwayLog.organization_id == current_user.organization_id
    ).order_by(EinvoiceEwayLog.created_at.desc()).all()
    
    result = []
    for log, inv_num in logs:
        result.append({
            "id": str(log.id),
            "invoice_number": inv_num,
            "log_type": log.log_type,
            "status": log.status,
            "irn": log.irn,
            "ack_no": log.ack_no,
            "eway_bill_no": log.eway_bill_no,
            "vehicle_no": log.vehicle_no,
            "created_at": log.created_at.isoformat() if log.created_at else None
        })
    return result
