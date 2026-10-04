import os

file_path = 'backend/api/stock.py'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

new_endpoint = """
@router.get("/auto-shift-candidates")
def get_auto_shift_candidates(
    expiry_before: Optional[str] = None,
    company_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    org_id = current_user.organization_id
    
    query = db.query(models.Batch, models.Product).join(
        models.Product, models.Batch.product_id == models.Product.id
    ).filter(
        models.Batch.organization_id == org_id,
        models.Batch.current_stock > 0
    )
    
    if company_id:
        query = query.filter(models.Product.company_id == company_id)
        
    results = query.all()
    
    def parse_mmyy(val):
        if not val or "/" not in val:
            return 999999
        try:
            m, y = val.split('/')
            m = int(m.strip())
            y = int(y.strip())
            if y < 100:
                y += 2000
            return y * 100 + m
        except:
            return 999999
            
    target_date_num = parse_mmyy(expiry_before) if expiry_before else None
    
    candidates = []
    for batch, product in results:
        if target_date_num:
            batch_date_num = parse_mmyy(batch.expiry)
            if batch_date_num > target_date_num:
                continue
                
        candidates.append({
            "product_id": str(product.id),
            "product_name": product.name,
            "batch_id": str(batch.id),
            "batch_number": batch.batch_number,
            "expiry": batch.expiry,
            "qty": batch.current_stock,
            "rate": float(batch.mrp or 0.0),
            "value": float(batch.current_stock * (batch.mrp or 0))
        })
        
    return {"candidates": candidates}
"""

if "/auto-shift-candidates" not in content:
    content = content + "\n" + new_endpoint
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Endpoint added")
else:
    print("Endpoint already exists")
