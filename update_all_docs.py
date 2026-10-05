import os

memory_path = 'PROJECT_MEMORY.md'
dev_manual_path = 'DEVELOPER_MANUAL.md'
user_manual_path = 'USER_WORKFLOW_MANUAL.md'

update_text_memory = """

## Session Updates (DOC-19, DOC-20, DOC-21, DOC-24)
- **DOC-19 Delivery Challan:** Built DispatchManager.tsx and backend dispatch routing for vehicle/POD tracking.
- **DOC-20 Document Series Engine:** Replaced rigid auto-increment with flexible DocumentSeries master. Implemented dynamic prefix/next_number allocation with concurrency locks (`FOR UPDATE`). Added editable voucher numbers.
- **DOC-21 Sales Return Engine:** Integrated Credit Notes seamlessly into SalesBill.tsx. Added `F8 - Load Inv` hook to fetch original sales, validate remaining returnable quantity, and add back stock.
- **DOC-24 Payment & Receipt Vouchers:** Upgraded existing VoucherEntry.tsx to use the new DocumentSeries engine and removed old hard-coded VoucherSequence table.
"""

update_text_dev = """

## Recent Core Architecture Implementations
### Document Series Engine (DOC-20/24)
- **Database:** Added `DocumentSeries` table to handle prefixes, suffixes, and `next_number` for *all* transaction types.
- **Concurrency:** Uses `SELECT ... FOR UPDATE` exclusively in `create_invoice` and `create_voucher` to guarantee atomic numbering.
- **Frontend Integration:** Instead of hardcoded read-only sequences, the UI offers a dropdown of active series, allowing manual override if needed.

### Returns & Stock Mapping (DOC-21)
- **Database:** Added `returned_qty` and `source_invoice_item_id` to `InvoiceItem`.
- **API:** When `invoice_type="credit_note"`, the API adds stock *back* to inventory instead of deducting it, and increments the `returned_qty` of the original source item.
- **UI:** `SalesBill.tsx` uses `F8` to query `GET /api/sales/invoice/by-number/` and filters out items with `quantity - returned_qty <= 0`.
"""

update_text_user = """

## New Financial & Billing Workflows (DOC-20, 21, 24)
1. **Managing Document Numbering:** 
   - Go to **Master > Masters > Document Series** to create custom prefix series (e.g., `C-` for Cash Sales, `B-` for Bank Receipts).
   - In any billing/voucher screen, select the series and the system automatically fills the next available number. You can manually edit the number if you are copying from a physical receipt book.
2. **Processing Sales Returns (Credit Notes):**
   - Go to **Sales & Purchase > Sale > Sales Return**.
   - Press **F8** and type the original Sales Invoice Number.
   - The system loads the items and verifies exactly how many items you are allowed to return (preventing duplicates).
   - Stock is automatically added back to the ERP.
3. **Payment & Receipt Vouchers:**
   - Go to **Finance & Accounts > Vouchers, P&L > Payment / Receipt**.
   - Select your document series, fill the amounts, and save. This directly posts the accounting double-entry safely to the ledger.
"""

def append_to_file(filepath, content):
    if os.path.exists(filepath):
        with open(filepath, 'a', encoding='utf-8') as f:
            f.write(content)
        print(f"Appended updates to {filepath}")
    else:
        print(f"File {filepath} not found.")

append_to_file(memory_path, update_text_memory)
append_to_file(dev_manual_path, update_text_dev)
append_to_file(user_manual_path, update_text_user)
