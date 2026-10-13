import os
import zipfile
import xml.etree.ElementTree as ET
import sys

sys.stdout.reconfigure(encoding='utf-8')

folder = r"C:\Users\DELL\Desktop\New folder (3)"

WORD_NAMESPACE = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
PARA = WORD_NAMESPACE + 'p'
TEXT = WORD_NAMESPACE + 't'

def get_docx_text(path):
    try:
        with zipfile.ZipFile(path) as doc:
            xml_content = doc.read('word/document.xml')
        tree = ET.XML(xml_content)
        paras = []
        for p in tree.iter(PARA):
            t = ''.join([n.text for n in p.iter(TEXT) if n.text]).strip()
            if t:
                paras.append(t)
        return paras
    except Exception as e:
        return [f"ERROR: {e}"]

target_docs = [
    "DOC-05_Keyboard_First_UX_Command_System_v1_0_RELEASE.docx",
    "DOC-07_Complete_Accounting_Bill_by_Bill_Settlement_Engine.docx",
    "DOC-16_Inventory_Stock_Expiry_Breakage_Claims_Engine_v2_0_FINAL.docx",
    "DOC-18_Sales_Order_Order_Management_Engine_v1_0_FINAL.docx",
    "DOC-20_Sales_Invoice_Billing_Document_Series_Engine_v1_0_FINAL.docx",
    "DOC-21_Sales_Return_Customer_Return_Return_to_Stock_Engine_v2_0_DETAILED_FINAL.docx",
    "DOC-29_GST_Tax_EInvoicing_EWayBill_Global_Statutory_Compliance_Engine_v3_0_DETAILED_FINAL.docx",
    "DOC-30_Financial_Statutory_Management_Reporting_Engine_v3_0_FINAL.docx",
    "DOC-41_Financial_Statements_Closing_Engine_v1_0_Detailed_Implementation.docx"
]

for doc_name in target_docs:
    p = os.path.join(folder, doc_name)
    if os.path.exists(p):
        paras = get_docx_text(p)
        print("=" * 80)
        print(f"FILE: {doc_name} (Total Paras: {len(paras)})")
        print("=" * 80)
        # print first 15 paras
        for line in paras[:15]:
            print(f"  * {line}")
    else:
        print(f"NOT FOUND: {doc_name}")
