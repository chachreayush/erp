with open('backend/api/schemes.py', 'a', encoding='utf-8') as f:
    f.write('''
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
''')
