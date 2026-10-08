import os
from datetime import datetime

date_str = datetime.now().strftime("%Y-%m-%d")

memory_update = f"""
### [{date_str}] DOC-29: GST, Tax, E-Invoicing, E-Way Bill & Global Statutory Compliance Engine
- **Models**: Proposed `TaxProfile`, `TaxTransactionLine`, `EinvoiceEwayLog`, and `TdsTcsTransaction` for comprehensive tax rules, compliance logs, and TDS/TCS tracking.
- **Architecture**: Zero-recurring-cost strategy implemented. Uses bulk JSON export for the IRP portal and imports the response JSON, mapping IRN/QR to internal transactions.
- **TDS/TCS Engine**: Continuous monitoring of cumulative transaction values per party per FY (₹50 Lakhs limit). Real-time user decision prompt (Auto/Manual/Defer) upon breach.
"""

dev_update = f"""
## DOC-29: GST, E-Invoicing, and Compliance Engine ({date_str})
**Architecture Notes**:
- **Zero-Cost Strategy**: We strictly avoid paid GSP APIs. Instead, the backend generates a precise JSON payload compliant with the government schema, which users upload manually. The response JSON is then parsed and reconciled.
- **TDS/TCS Monitoring**: A new `tds_tcs_transactions` table tracks cumulative ledger values for a party across the FY. When an invoice pushes this past ₹50 Lakhs (Sec 194Q / 206C(1H)), an alert is triggered.
- **Data Integrity**: Signed QR codes, IRN, and portal errors are preserved immutably in `einvoice_eway_logs`. We never overwrite government acknowledgements; corrections create new appended records.
"""

workflow_update = f"""
## DOC-29: Compliance & TDS/TCS Workflow ({date_str})

### E-Invoicing & E-Way Bill Generation (Zero-Cost Workflow)
1. Go to **Compliance > Compliance Workbench**.
2. Select pending invoices and press **F6** to validate them locally for errors (e.g., missing HSN or invalid GSTIN).
3. Press **F7** to **Export Bulk JSON**.
4. Log in to the official IRP/E-Way Bill portal and upload the exported JSON file.
5. Download the success/error JSON response from the portal.
6. Return to the ERP and press **F8** to **Import Response**. The system will automatically link the IRN, Acknowledgement No., and Signed QR code to your invoices.
7. You can view the completed government evidence under **Signed Ledger**.

### TDS/TCS Threshold Monitoring (₹50 Lakhs Limit)
1. The ERP automatically tracks all purchases from a single supplier and sales to a single customer in the current Financial Year.
2. When creating a Sales Bill or Purchase Bill, if the cumulative amount crosses ₹50 Lakhs, a prompt will appear.
3. You can choose:
   - **Automatic Mode**: The ERP will automatically deduct 0.1% TDS/TCS (or higher if the party is a non-filer) on the amount exceeding the limit, creating the respective accounting ledgers.
   - **Manual Mode**: You will handle deductions manually; the ERP will just show reminders on subsequent bills.
   - **Defer**: Remind later.
"""

def append_to_file(filepath, content):
    if os.path.exists(filepath):
        with open(filepath, 'a', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {filepath}")
    else:
        print(f"File not found: {filepath}")

# Update all existing manual files mentioned by the user and existing in repo
append_to_file('PROJECT_MEMORY.md', memory_update)
append_to_file('DEVELOPER_MANUAL.md', dev_update)
append_to_file('USER_WORKFLOW_MANUAL.md', workflow_update)
append_to_file('Developer_and_User_Manual.md', dev_update + "\n" + workflow_update)
append_to_file('User_Manual_and_Workflow.md', workflow_update)
