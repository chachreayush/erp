from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import User, Invoice, EinvoiceEwayLog
from auth.router import get_current_user
from typing import List, Dict, Any
import json
import uuid
from datetime import datetime

router = APIRouter()

@router.get("/pending", response_model=List[Dict[str, Any]])
def get_pending_compliance(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Dummy logic to fetch invoices that need E-invoice / E-way bill
    # In a real scenario, this would check if the invoice qualifies and doesn't have a SUCCESS log
    invoices = db.query(Invoice).filter(
        Invoice.organization_id == current_user.organization_id,
        Invoice.grand_total > 50000 # Example condition for E-Way bill / E-Invoice threshold
    ).all()
    
    result = []
    for inv in invoices:
        # Check if already processed
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
    # Generates a JSON payload for the IRP portal based on Indian Government Schema
    payloads = []
    for inv_id in invoice_ids:
        inv = db.query(Invoice).filter(
            Invoice.id == inv_id,
            Invoice.organization_id == current_user.organization_id
        ).first()
        if not inv:
            continue
            
        # Example JSON structure for IRP
        payload = {
            "Version": "1.1",
            "TranDtls": {
                "TaxSch": "GST",
                "SupTyp": "B2B",
                "RegRev": "Y"
            },
            "DocDtls": {
                "Typ": "INV",
                "No": inv.invoice_number,
                "Dt": inv.date.strftime("%d/%m/%Y") if inv.date else ""
            },
            # ... Add Seller, Buyer, Item details ...
            "ValDtls": {
                "AssVal": float(inv.subtotal),
                "CgstVal": float(inv.tax_total) / 2, # Example
                "SgstVal": float(inv.tax_total) / 2,
                "TotInvVal": float(inv.grand_total)
            }
        }
        payloads.append(payload)
        
        # Log the export
        log = EinvoiceEwayLog(
            organization_id=current_user.organization_id,
            invoice_id=inv.id,
            log_type="EINVOICE",
            status="EXPORTED",
            request_payload_json=payload
        )
        db.add(log)
    
    db.commit()
    return {"status": "success", "data": payloads}

@router.post("/import-response")
def import_response_json(
    response_data: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Parse the response from IRP and update records
    # Assuming response_data is a list of results
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
    ).all()
    
    result = []
    for log, inv_num in logs:
        result.append({
            "id": str(log.id),
            "invoice_number": inv_num,
            "log_type": log.log_type,
            "status": log.status,
            "irn": log.irn,
            "ack_no": log.ack_no,
            "created_at": log.created_at.isoformat() if log.created_at else None
        })
    return result
