
import os

path = "C:/Users/DELL/OneDrive/Desktop/erp2/backend/api/stock.py"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

smart_mrp_code = """
from datetime import datetime, timedelta
from sqlalchemy import func
from pydantic import BaseModel
from typing import List, Optional

class MRPSuggestion(BaseModel):
    product_id: str
    code: str
    name: str
    thirty_day_sales: int
    avg_daily_sales: float
    current_min_stock: int
    suggested_min_stock: int
    current_reorder_qty: int
    suggested_reorder_qty: int

class MRPApplyRequest(BaseModel):
    product_ids: List[str]

@router.get("/mrp/suggestions")
def get_mrp_suggestions(
    days: int = 30,
    lead_time_days: int = 7,
    safety_stock_days: int = 7,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    \"\"\"
    Smart MRP: Dynamically calculates required stock levels based on historical sales velocity.
    Suggested Min Stock = (Avg Daily Sales * Lead Time) + Safety Stock
    Suggested Reorder Qty = Avg Daily Sales * 30 (1 month supply)
    \"\"\"
    org_id = current_user.organization_id
    cutoff_date = datetime.utcnow() - timedelta(days=days)
    
    # Aggregate sales over the last X days
    sales_data = db.query(
        models.InvoiceItem.product_id,
        func.sum(models.InvoiceItem.quantity).label("total_sold")
    ).join(models.Invoice).filter(
        models.Invoice.organization_id == org_id,
        models.Invoice.is_active == True,
        models.Invoice.invoice_type.in_(["sales-bill", "sales-challan", "brk-issue", "stock-issue"]),
        models.Invoice.date >= cutoff_date,
        models.InvoiceItem.product_id.isnot(None)
    ).group_by(models.InvoiceItem.product_id).all()
    
    sales_map = {str(r.product_id): int(r.total_sold) for r in sales_data}
    
    products = db.query(models.Product).filter(
        models.Product.organization_id == org_id,
        models.Product.is_active == True
    ).all()
    
    suggestions = []
    
    for p in products:
        total_sold = sales_map.get(str(p.id), 0)
        if total_sold > 0:
            avg_daily = total_sold / days
            sug_min = int((avg_daily * lead_time_days) + (avg_daily * safety_stock_days))
            sug_reorder = int(avg_daily * 30)
            
            # Only suggest if there is a meaningful difference (> 10%)
            if abs(sug_min - p.min_stock_level) > (p.min_stock_level * 0.1) or \\
               abs(sug_reorder - p.reorder_quantity) > (p.reorder_quantity * 0.1):
                
                suggestions.append({
                    "product_id": str(p.id),
                    "code": p.code,
                    "name": p.name,
                    "thirty_day_sales": total_sold,
                    "avg_daily_sales": round(avg_daily, 2),
                    "current_min_stock": p.min_stock_level,
                    "suggested_min_stock": max(sug_min, 1),
                    "current_reorder_qty": p.reorder_quantity,
                    "suggested_reorder_qty": max(sug_reorder, 1)
                })
                
    # Sort by highest velocity (most sold)
    suggestions.sort(key=lambda x: x["thirty_day_sales"], reverse=True)
    return {"suggestions": suggestions}


@router.post("/mrp/apply")
def apply_mrp_suggestions(
    req: MRPApplyRequest,
    days: int = 30,
    lead_time_days: int = 7,
    safety_stock_days: int = 7,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    \"\"\"
    Applies the auto-calculated MRP suggestions to the database.
    \"\"\"
    org_id = current_user.organization_id
    cutoff_date = datetime.utcnow() - timedelta(days=days)
    
    # Re-calculate to ensure data integrity
    sales_data = db.query(
        models.InvoiceItem.product_id,
        func.sum(models.InvoiceItem.quantity).label("total_sold")
    ).join(models.Invoice).filter(
        models.Invoice.organization_id == org_id,
        models.Invoice.is_active == True,
        models.Invoice.invoice_type.in_(["sales-bill", "sales-challan", "brk-issue", "stock-issue"]),
        models.Invoice.date >= cutoff_date,
        models.InvoiceItem.product_id.is_in(req.product_ids)
    ).group_by(models.InvoiceItem.product_id).all()
    
    sales_map = {str(r.product_id): int(r.total_sold) for r in sales_data}
    
    updated_count = 0
    products = db.query(models.Product).filter(
        models.Product.organization_id == org_id,
        models.Product.id.in_(req.product_ids)
    ).all()
    
    for p in products:
        total_sold = sales_map.get(str(p.id), 0)
        if total_sold > 0:
            avg_daily = total_sold / days
            sug_min = max(int((avg_daily * lead_time_days) + (avg_daily * safety_stock_days)), 1)
            sug_reorder = max(int(avg_daily * 30), 1)
            
            p.min_stock_level = sug_min
            p.reorder_quantity = sug_reorder
            updated_count += 1
            
    db.commit()
    return {"message": f"Successfully updated MRP planning for {updated_count} products."}
"""

if "/mrp/suggestions" not in content:
    with open(path, "a", encoding="utf-8") as f:
        f.write("\n\n" + smart_mrp_code)
    print("Added Smart MRP endpoints")
else:
    print("Endpoints exist")

