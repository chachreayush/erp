import sys
import os

try:
    from docx import Document
    from docx.shared import Pt, RGBColor
except ImportError:
    import subprocess
    subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'python-docx'])
    from docx import Document
    from docx.shared import Pt, RGBColor

folder_path = r'C:\Users\DELL\OneDrive\Desktop\erp2\finance and accounting document'
old_file_path = os.path.join(folder_path, 'Best_of_Best_Master_Finance_Architecture.docx')
new_file_path = os.path.join(folder_path, 'Best_of_Best_Master_Finance_Architecture_v2.docx')

if os.path.exists(old_file_path):
    # We will try to open the original as a template, but save as a new name to bypass file locks
    import shutil
    # Copying to temp location to avoid lock if python-docx tries to read a locked file (it usually can read it, but let's be safe)
    temp_path = os.path.join(folder_path, 'temp_copy.docx')
    shutil.copy2(old_file_path, temp_path)
    doc = Document(temp_path)
    os.remove(temp_path)
else:
    doc = Document()
    doc.add_heading('Master ERP Finance Architecture Blueprint', level=0)

# Add spacing
doc.add_paragraph()

# Add Section 7: Detailed Explanation & Workflows
doc.add_heading('7. Detailed Finance & Accounting Operations Workflow', level=1)
doc.add_paragraph('To put this architecture into practice, the system follows a strict state-machine workflow that moves data from operational reality into financial ledgers seamlessly:')

doc.add_heading('A. The Ingestion Layer (Operational Front-End)', level=2)
doc.add_paragraph('When a user (e.g., a cashier or procurement officer) performs a task like saving an invoice, the system does not immediately lock the database. It constructs a "Draft Voucher". Once validated against the budget and rules, it fires an Event Hook that commits the operational record and places a payload into the async accounting queue.')

doc.add_heading('B. The Processing Layer (Ledger Engine)', level=2)
doc.add_paragraph('The Ledger Engine picks up the queue, performs Lexicographical Lock Sorting to prevent deadlocks, and strictly appends the Debit and Credit lines to the Universal Journal. Simultaneously, it updates the Redis cache so that the CEO looking at the dashboard sees the cash balance update in real-time.')

doc.add_heading('C. The Reporting Layer (Delta Rollup)', level=2)
doc.add_paragraph('When the CFO requests a Trial Balance, the system does not read millions of lines. It fetches the "Snapshot Balance" from the 1st of the month, and only adds the live transactions that occurred between the 1st and today, ensuring reports generate in milliseconds.')

# Add Section 8: Bill-by-Bill / Tally & Marg Invoice Specific Payment Adjustment
doc.add_heading('8. Advanced Outstanding Management: Tally & Marg Style "Bill-by-Bill" Adjustments', level=1)
doc.add_paragraph('A critical feature inspired by industry staples like TallyPrime and Marg ERP is "Bill-wise Details" or Invoice-Specific Payment Adjustments. Standard double-entry accounting only tells you that a customer owes ,000 in total. It does NOT tell you WHICH specific invoices make up that ,000. Our architecture introduces an Invoice Allocation mapping layer to solve this.')

doc.add_heading('The Bill-by-Bill Workflow:', level=2)

doc.add_paragraph('1. New Reference (Invoice Creation):', style='List Number')
doc.add_paragraph('When Sales Invoice #INV-001 is finalized for ,000, the system generates the accounting voucher and simultaneously registers an outstanding "Receivable Reference" tagged specifically to INV-001.')

doc.add_paragraph('2. Against Reference (Payment Adjustment):', style='List Number')
doc.add_paragraph('When the customer pays , the clerk opens a Receipt Voucher. The system forces the clerk to select WHICH invoice is being paid. The clerk selects "Against Reference: INV-001". The system maps the receipt directly to that invoice.')

doc.add_paragraph('3. Partial Clearances & Aging:', style='List Number')
doc.add_paragraph('Because of this mapping, the system knows INV-001 still has a  pending balance. This allows the ERP to generate precise Aging Reports (e.g.,  is 30 Days Overdue). The collection team can call the debtor and say exactly: "You still owe  specifically on Invoice #INV-001," rather than just "You owe us money."')

doc.add_paragraph('4. Advance / On Account Payments:', style='List Number')
doc.add_paragraph('If the customer pays  before an invoice is even generated, the payment is stored as an "Advance" or "On Account" reference. Later, when the invoice is created, the user can match the new invoice against this pre-existing advance payment.')

doc.add_heading('Architectural Implementation (The Mapping Table)', level=2)
doc.add_paragraph('To achieve this without bloating the main ledger, we will architect an "invoice_allocations" or "bill_adjustments" relational table. This table will serve as the bridge connecting a Receipt Voucher Line ID directly to a Sales Invoice Voucher Line ID, maintaining the exact cleared and pending amounts in real time. This guarantees that Ledger Balances and Outstanding Bill Reports are always 100% mathematically synchronized.')

doc.save(new_file_path)
print('Document updated successfully as v2!')
