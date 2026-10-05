import os

path = 'backend/api/sales.py'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update invoice_number generation in create_invoice
series_injection = """
    # --- DOC-20 Document Series Numbering ---
    final_invoice_number = invoice_data.invoice_number
    if invoice_data.series_id:
        # Lock the row for atomic increment
        series = db.query(models.DocumentSeries).with_for_update().filter(
            models.DocumentSeries.id == invoice_data.series_id,
            models.DocumentSeries.organization_id == org_id
        ).first()
        if series:
            prefix = series.prefix or ""
            suffix = series.suffix or ""
            # Generate number e.g., W-1004
            final_invoice_number = f"{prefix}{series.next_number}{suffix}"
            series.next_number += 1
            db.add(series)
    # ----------------------------------------
    
    # 1. Create the parent Invoice record with ALL fields
    new_invoice = models.Invoice(
        organization_id=org_id,
        invoice_type=invoice_data.invoice_type,
        invoice_number=final_invoice_number,
        series_id=invoice_data.series_id,
"""

if 'DOC-20 Document Series Numbering' not in content:
    content = content.replace(
        """    # 1. Create the parent Invoice record with ALL fields
    new_invoice = models.Invoice(
        organization_id=org_id,
        invoice_type=invoice_data.invoice_type,
        invoice_number=invoice_data.invoice_number,""",
        series_injection
    )

# 2. Add Challan source tracking logic inside the item loop
challan_injection = """
        # Track partial billing back to source Challan
        if item.source_challan_item_id:
            challan_item = db.query(models.InvoiceItem).filter(models.InvoiceItem.id == item.source_challan_item_id).first()
            if challan_item:
                challan_item.billed_qty += item.quantity
                db.add(challan_item)
"""

if 'if item.source_challan_item_id:' not in content:
    content = content.replace(
        """        # --- DOC-19 Sales Order Allocation Update ---
        if item.source_order_item_id:""",
        challan_injection + """\n        # --- DOC-19 Sales Order Allocation Update ---
        if item.source_order_item_id:"""
    )

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated sales.py with series allocation and challan tracking")
