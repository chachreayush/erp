import sys
import os

try:
    from docx import Document
except ImportError:
    import subprocess
    subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'python-docx'])
    from docx import Document

folder_path = r'C:\Users\DELL\OneDrive\Desktop\erp2\finance and accounting document'
v3_file_path = os.path.join(folder_path, 'Best_of_Best_Master_Finance_Architecture_v3.docx')

if os.path.exists(v3_file_path):
    try:
        doc = Document(v3_file_path)
        
        # Add Section 10
        doc.add_heading('10. Exhaustive List of Supported Finance & Accounting Modules', level=1)
        doc.add_paragraph('While the sections above describe the technical architecture, this engine is designed to support the complete suite of standard enterprise Finance & Accounting options natively:')
        
        modules = [
            "General Ledger (GL): Automated journal entries, multi-dimensional chart of accounts, and trial balances.",
            "Accounts Payable (AP) & Accounts Receivable (AR): Vendor/Customer aging, bill-by-bill outstanding tracking, credit limits, and dunning letters.",
            "Bank Reconciliation Statement (BRS): Automated matching of ERP cash books with live bank statement feeds or MT940/CSV uploads.",
            "Fixed Asset Management: Asset capitalization, lifecycle tracking, and automated scheduled depreciation (SLM/WDV methods).",
            "Costing & Management Accounting: Cost Centers, Profit Centers, and expense allocation across different departments or projects.",
            "Budgeting & Forecasting: Setting financial limits per ledger/cost center and generating real-time Budget vs. Actual Variance reports.",
            "Multi-Currency & Forex Revaluation: Automatic calculation of realized/unrealized Foreign Exchange (Forex) gains and losses at month-end.",
            "Taxation Engine: Configurable tax rules for Input/Output VAT, GST, TDS, and TCS, with automated tax settlement runs.",
            "Financial Statements & Analytics: 0-millisecond generation of Balance Sheets, Profit & Loss (Income Statement), and Cash Flow statements."
        ]
        
        for mod in modules:
            doc.add_paragraph(mod, style='List Bullet')
            
        doc.save(v3_file_path)
        print('Successfully appended Section 10 to v3.')
    except Exception as e:
        print('Error updating v3:', e)
else:
    print('v3 not found.')
