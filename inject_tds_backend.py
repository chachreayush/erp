import os

sales_path = "backend/api/sales.py"

def inject_tds_logic():
    with open(sales_path, 'r', encoding='utf-8') as f:
        content = f.read()

    if "TdsTcsTransaction" not in content:
        # Add imports for TDS at top
        content = content.replace(
            "from models import Product",
            "from models import Product, Party, TdsTcsTransaction"
        )
    
    # Inject logic into _auto_post_accounting
    # We'll inject just after creating the `entries` array but before the `if entries:` block
    injection_target = "    if entries:\n        fy = get_active_fiscal_year(db, org_id)"
    
    tds_logic = """
    # --- DOC-29 Automatic TDS/TCS Ledger Posting ---
    if invoice.party_id:
        party = db.query(models.Party).filter(models.Party.id == invoice.party_id).first()
        if party:
            # Calculate total cumulative amount for this party in current FY BEFORE this invoice
            fy = get_active_fiscal_year(db, org_id)
            if fy:
                prev_tx = db.query(models.TdsTcsTransaction).filter(
                    models.TdsTcsTransaction.party_id == party.id,
                    models.TdsTcsTransaction.financial_year == str(fy.year_label)
                ).order_by(models.TdsTcsTransaction.created_at.desc()).first()
                
                prev_cumulative = float(prev_tx.cumulative_amount) if prev_tx else 0.0
                new_cumulative = prev_cumulative + float(invoice.grand_total)
                
                threshold = 5000000.0 # 50 Lakhs
                deducted_amount = 0.0
                
                if new_cumulative > threshold:
                    # Find taxable base
                    taxable_base = float(invoice.grand_total)
                    if prev_cumulative <= threshold:
                        # It just crossed, so only the excess is taxed
                        taxable_base = new_cumulative - threshold
                        
                    # Rate logic: 0.1% normally, 5% if non-filer
                    rate = 0.05 if party.is_non_filer_206ab_cca else 0.001
                    deducted_amount = taxable_base * rate
                    
                    if party.tds_tcs_mode == "AUTOMATIC" and deducted_amount > 0 and entries:
                        # Append the Ledger Posting
                        if invoice.invoice_type == "purchase-bill":
                            tds_payable_ledger = get_or_create_ledger("TDS Payable", "Duties & Taxes", "Cr")
                            # We reduce the Party Credit and Add TDS Payable Credit
                            for e in entries:
                                if e["ledger_id"] == str(party_ledger.id) and e["cr_dr"] == "Cr":
                                    e["amount"] -= Decimal(str(deducted_amount))
                            entries.append({"ledger_id": str(tds_payable_ledger.id), "cr_dr": "Cr", "amount": Decimal(str(deducted_amount))})
                            
                        elif invoice.invoice_type == "sales-bill":
                            tcs_receivable_ledger = get_or_create_ledger("TCS Receivable", "Duties & Taxes", "Dr")
                            # We increase Party Debit and add TCS Receivable Credit? No, TCS is collected.
                            # So Party owes more (Debit Party, Credit TCS Payable).
                            tcs_payable_ledger = get_or_create_ledger("TCS Payable", "Duties & Taxes", "Cr")
                            for e in entries:
                                if e["ledger_id"] == str(party_ledger.id) and e["cr_dr"] == "Dr":
                                    e["amount"] += Decimal(str(deducted_amount))
                                if e["ledger_id"] == str(sales_ledger.id) and e["cr_dr"] == "Cr":
                                    pass # Sales stays same
                            entries.append({"ledger_id": str(tcs_payable_ledger.id), "cr_dr": "Cr", "amount": Decimal(str(deducted_amount))})

                # Always log the transaction for tracking
                log_tx = models.TdsTcsTransaction(
                    organization_id=org_id,
                    party_id=party.id,
                    invoice_id=invoice.id,
                    financial_year=str(fy.year_label),
                    transaction_type=invoice.invoice_type,
                    transaction_amount=float(invoice.grand_total),
                    cumulative_amount=new_cumulative,
                    deducted_amount=deducted_amount,
                    is_threshold_breached=(new_cumulative > threshold)
                )
                db.add(log_tx)
                db.flush()
    # -----------------------------------------------
"""
    if "# --- DOC-29 Automatic TDS/TCS Ledger Posting ---" not in content:
        content = content.replace(injection_target, tds_logic + "\n" + injection_target)
        with open(sales_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print("TDS logic injected successfully.")
    else:
        print("TDS logic already injected.")
        
inject_tds_logic()
