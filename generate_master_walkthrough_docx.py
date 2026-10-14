import os
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import parse_xml, OxmlElement
from docx.oxml.ns import nsdecls, qn

def create_full_software_walkthrough():
    doc = docx.Document()
    
    # Page setup: Letter/A4 with 1-inch margins
    for section in doc.sections:
        section.top_margin = Inches(1.0)
        section.bottom_margin = Inches(1.0)
        section.left_margin = Inches(1.0)
        section.right_margin = Inches(1.0)
        
    # Color palette
    COLOR_PRIMARY = RGBColor(27, 67, 50)      # Forest Green #1B4332
    COLOR_SECONDARY = RGBColor(45, 106, 79)   # Medium Green #2D6A4F
    COLOR_ACCENT = RGBColor(82, 183, 136)     # Light Green #52B788
    COLOR_DARK = RGBColor(30, 41, 59)         # Slate Dark #1E293B
    COLOR_MUTED = RGBColor(100, 116, 139)     # Slate Muted #64748B
    
    HEX_PRIMARY = "1B4332"
    HEX_SECONDARY = "2D6A4F"
    HEX_LIGHT_BG = "F4F9F5"
    HEX_BORDER = "D1E7DD"
    HEX_ZEBRA = "F8FAF9"
    HEX_CALLOUT_BG = "EEF7F2"
    
    # Styles helper
    def set_font(run, font_name="Segoe UI", size_pt=10.5, color=COLOR_DARK, bold=False, italic=False):
        run.font.name = font_name
        run.font.size = Pt(size_pt)
        run.font.color.rgb = color
        run.bold = bold
        run.italic = italic
        
    def add_p(text="", size=10.5, color=COLOR_DARK, bold=False, italic=False, space_before=0, space_after=6, align=WD_ALIGN_PARAGRAPH.LEFT):
        p = doc.add_paragraph()
        p.alignment = align
        p.paragraph_format.space_before = Pt(space_before)
        p.paragraph_format.space_after = Pt(space_after)
        p.paragraph_format.line_spacing = 1.15
        if text:
            r = p.add_run(text)
            set_font(r, size_pt=size, color=color, bold=bold, italic=italic)
        return p

    def add_h1(text):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(18)
        p.paragraph_format.space_after = Pt(8)
        p.paragraph_format.keep_with_next = True
        r = p.add_run(text)
        set_font(r, size_pt=18, color=COLOR_PRIMARY, bold=True)
        return p

    def add_h2(text):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(14)
        p.paragraph_format.space_after = Pt(6)
        p.paragraph_format.keep_with_next = True
        r = p.add_run(text)
        set_font(r, size_pt=13.5, color=COLOR_SECONDARY, bold=True)
        return p

    def add_h3(text):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(10)
        p.paragraph_format.space_after = Pt(4)
        p.paragraph_format.keep_with_next = True
        r = p.add_run(text)
        set_font(r, size_pt=11.5, color=COLOR_DARK, bold=True)
        return p

    def set_cell_background(cell, fill_hex):
        tcPr = cell._tc.get_or_add_tcPr()
        for child in list(tcPr):
            if child.tag.endswith('shd'):
                tcPr.remove(child)
        shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
        tcPr.append(shd)

    def set_cell_margins(cell, top=120, bottom=120, left=160, right=160):
        tcPr = cell._tc.get_or_add_tcPr()
        tcMar = parse_xml(f'<w:tcMar {nsdecls("w")}><w:top w:w="{top}" w:type="dxa"/><w:bottom w:w="{bottom}" w:type="dxa"/><w:left w:w="{left}" w:type="dxa"/><w:right w:w="{right}" w:type="dxa"/></w:tcMar>')
        tcPr.append(tcMar)

    def style_table(table, col_widths, headers, data):
        table.alignment = WD_TABLE_ALIGNMENT.CENTER
        # Header Row
        hdr_cells = table.rows[0].cells
        for i, header_text in enumerate(headers):
            hdr_cells[i].text = header_text
            set_cell_background(hdr_cells[i], HEX_PRIMARY)
            set_cell_margins(hdr_cells[i], top=140, bottom=140, left=160, right=160)
            p = hdr_cells[i].paragraphs[0]
            p.alignment = WD_ALIGN_PARAGRAPH.LEFT
            for r in p.runs:
                set_font(r, size_pt=9.5, color=RGBColor(255, 255, 255), bold=True)
        
        # Data Rows
        for r_idx, row_data in enumerate(data):
            row_cells = table.add_row().cells
            bg_color = HEX_ZEBRA if r_idx % 2 == 1 else "FFFFFF"
            for c_idx, cell_value in enumerate(row_data):
                row_cells[c_idx].text = str(cell_value)
                set_cell_background(row_cells[c_idx], bg_color)
                set_cell_margins(row_cells[c_idx], top=100, bottom=100, left=150, right=150)
                p = row_cells[c_idx].paragraphs[0]
                p.alignment = WD_ALIGN_PARAGRAPH.LEFT
                for r in p.runs:
                    set_font(r, size_pt=9.0, color=COLOR_DARK, bold=False)
                    
        # Apply column widths
        for row in table.rows:
            for idx, width in enumerate(col_widths):
                row.cells[idx].width = Inches(width)

    def add_callout(text, prefix="IMPORTANT RULE: ", fill_hex=HEX_CALLOUT_BG, border_hex=HEX_PRIMARY):
        tbl = doc.add_table(rows=1, cols=1)
        tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
        cell = tbl.cell(0, 0)
        cell.width = Inches(6.5)
        set_cell_background(cell, fill_hex)
        set_cell_margins(cell, top=140, bottom=140, left=200, right=180)
        
        # Left border only
        tcPr = cell._tc.get_or_add_tcPr()
        borders = parse_xml(f'<w:tcBorders {nsdecls("w")}><w:left w:val="single" w:sz="24" w:space="0" w:color="{border_hex}"/><w:top w:val="none"/><w:right w:val="none"/><w:bottom w:val="none"/></w:tcBorders>')
        tcPr.append(borders)
        
        p = cell.paragraphs[0]
        p.paragraph_format.space_before = Pt(2)
        p.paragraph_format.space_after = Pt(2)
        r_pre = p.add_run(prefix)
        set_font(r_pre, size_pt=9.5, color=COLOR_PRIMARY, bold=True)
        r_text = p.add_run(text)
        set_font(r_text, size_pt=9.5, color=COLOR_DARK, italic=False)
        doc.add_paragraph().paragraph_format.space_after = Pt(4)

    # ==========================================
    # COVER PAGE / DOCUMENT HEADER
    # ==========================================
    p_title = add_p("Enterprise Pharmaceutical & Distribution ERP v2.0", size=24, color=COLOR_PRIMARY, bold=True, space_before=12, space_after=4)
    p_sub = add_p("Complete Software Master Walkthrough & System Architecture Blueprint", size=14, color=COLOR_SECONDARY, bold=True, space_after=12)
    add_p("An Exhaustive Operational, Functional, Keyboard-First, and Architectural Technical Reference for Developers, System Architects, Quality Engineers, and Enterprise Operators.", size=10.5, color=COLOR_MUTED, italic=True, space_after=16)

    # Document Metadata Table
    meta_table = doc.add_table(rows=1, cols=4)
    meta_headers = ["Attribute", "Specification", "Attribute", "Specification"]
    meta_data = [
        ["System Version", "v2.0 RELEASE", "Release Date", "October 2026"],
        ["Client Shell", "Tauri v2 (Rust Native Windows)", "Frontend Framework", "React 19 + TypeScript + Vite"],
        ["Backend Core", "FastAPI (Python 3.13) + Uvicorn", "Relational Database", "PostgreSQL (Neon / Local)"],
        ["Cloud Production", "https://erp-rho-three.vercel.app", "Architecture Model", "Multi-Tenant AM/CM Partitioned"],
        ["Keyboard Control", "100% Zero-Mouse Operable", "Accounting Ledger", "Append-Only Double-Entry GL"],
        ["Compliance Standard", "GSTN Offline Utility / MCA Audit", "Series Continuation", "Universal Marg/Tally Continuation"]
    ]
    style_table(meta_table, [1.5, 1.75, 1.5, 1.75], meta_headers, meta_data)
    doc.add_paragraph().paragraph_format.space_after = Pt(12)

    # Executive Overview
    add_h2("Executive System Purpose & Operational Philosophy")
    add_p("This Enterprise ERP platform represents the definitive modernization of traditional Indian pharmaceutical wholesale systems (such as Marg ERP, Tally Prime, and Busy Accounting) into a high-performance, cloud-synced, desktop-native web architecture. It combines lightning-fast, keyboard-driven billing workflows (2 to 3 seconds per invoice) with bank-grade financial governance, automated multi-tier approval engines, cryptographic SHA-256 audit trails, and statutory GST compliance.")
    
    add_callout(
        "The system strictly adheres to the Zero-Mouse Guarantee: Any front-counter billing operator can open the application, search batches, select parties, apply trade discounts, finalize settlements, print vouchers, and move to the next customer without ever touching a computer mouse.",
        prefix="CORE DESIGN MANDATE: "
    )

    # ==========================================
    # SECTION 1: ARCHITECTURE & INFRASTRUCTURE
    # ==========================================
    add_h1("1. System Architecture, Infrastructure & Dual-Screen Topology")
    add_p("The ERP is engineered as a three-tier hybrid desktop-cloud system designed to withstand intermittent connectivity in wholesale market environments while ensuring real-time multi-branch executive control.")

    add_h2("1.1 The Dual-Screen Operational Architecture")
    add_p("To eliminate cognitive clutter and optimize screen density for disparate roles, the system bifurcates user interactions into two purpose-built environments:")
    
    dual_table = doc.add_table(rows=1, cols=3)
    dual_headers = ["Screen / Role", "Primary Route & Component", "Functional Scope & Visual Ergonomics"]
    dual_data = [
        [
            "Screen 1: Operational Counter Workbench",
            "Route: /\nComponent: src/pages/HomeScreen.tsx",
            "Designed for front-desk billing clerks, cashiers, and warehouse dispatchees.\n• High-density metric cards: Today's Cash Collected (₹64,575.00), Today's Credit Billed (₹1,19,925.00 / 24 Invoices), Active SKU Catalog (102 products), Stockout/Expiry Risk.\n• Rapid Transaction Hub: Instant 1-click & hotkey launchers: [Sales Bill F2], [Purchase Bill F9], [Sales Return], [Purchase Return], [Receipt F6], [Payment F5], [Day Book], [Stock Register].\n• Urgent Counter Exception Center: Real-time stockout, ledger block, and workflow alert cards.\n• Live Counter Voucher Ticker: Real-time chronological audit stream of recent billing events.\n• Direct Apex Link: [Executive BI Dashboard (Route: /dashboard) ↗]."
        ],
        [
            "Screen 2: Executive Business Intelligence Dashboard",
            "Route: /dashboard\nComponents: ClientDashboard.tsx & AdminDashboard.tsx",
            "Designed for proprietors, CFOs, chartered accountants, and operations directors.\n• Apex Executive KPI Strip: Gross Revenue (₹56,78,230.00 / +14.2% YoY), Procurement Volume (₹42,15,760.00), Gross Operating Margin (₹14,62,470.00 / 18.5%), Consolidated Liquidity (₹18,75,320.00 / Quick Ratio 1.82).\n• 7-Month Comparative Sales vs Purchase Curve: Dual-gradient trend area chart.\n• Operating Expense (Opex) Donut: Visual breakdown of ₹4.77 Lakhs overheads.\n• Top 5 Revenue Medicines: Augmentin 625, Crocin 650, Dolo 650, Azithral 500, Pan-D.\n• Receivables Ageing Risk Bar: 0-30d, 31-60d, 61-90d, 90+d overdue distribution.\n• Compact Regional Sales Map Widget: Click-to-expand vector map (#mapModal) tracking territory revenue and chemist quotas (strictly zero fleet tracking)."
        ]
    ]
    style_table(dual_table, [1.8, 1.8, 2.9], dual_headers, dual_data)
    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    add_h2("1.2 Multi-Tenant Partitioning (AM vs CM Architecture)")
    add_p("The database enforces strict tenant isolation using two administrative tiers:")
    add_p("• Admin Master (AM-0001): Super-tenant partition governing system parameters, license entitlements, cross-company subscription audits, and global tax tables. AM administrators possess override authority across all client partitions.")
    add_p("• Client Master (CM-XXXX): Enterprise tenant partition. Each client company operates in complete mathematical isolation with dedicated General Ledger accounts, voucher series counters, warehouse locations, and user roles. No database query can span across CM partitions without explicit elevated AM impersonation tokens.")

    # ==========================================
    # SECTION 2: UNIVERSAL KEYBOARD UX & SERIES
    # ==========================================
    add_h1("2. Universal Keyboard Command System & Series Continuation")
    add_p("A cornerstone of the system is the Universal Keyboard Command System (DOC-05) and the Alphanumeric Series Continuation Engine. Every screen reacts immediately to standard financial function keys.")

    add_h2("2.1 Master Keyboard Hotkey Directory")
    hotkey_table = doc.add_table(rows=1, cols=3)
    hotkey_headers = ["Key / Shortcut", "Global Operational Action", "Target Screen / Modal Triggered"]
    hotkey_data = [
        ["F2", "Direct Sales Bill Launcher", "Opens Counter Sales Billing Cockpit (/sales)"],
        ["F3", "Direct Loose Return / Batch Picker", "Sales Return Loose Mode / Grid Batch Selection Popup"],
        ["F4", "Unified Approval & Workflow Inbox", "Opens Approval & Task Inbox Cockpit (/workflow/inbox)"],
        ["F5", "Supplier Outward Payment Voucher", "Opens Outward Payment Voucher Entry (/payment)"],
        ["F6", "Customer Counter Collection Receipt", "Opens Counter Customer Receipt Entry (/receipt)"],
        ["F7", "Customer / Supplier Party Picker", "Populates party selector with balance and credit limits"],
        ["F8", "Stock Position & Godown Query", "Opens multi-warehouse stock inquiry drawer"],
        ["F9", "Purchase Inward Voucher Launcher", "Opens Purchase Inward / Vendor Bill Entry (/purchase)"],
        ["Ctrl + B", "Auto-Balance Journal Voucher Lines", "Calculates Dr/Cr difference and inserts balancing row"],
        ["Ctrl + S / Alt + S", "Commit & Post Transaction Voucher", "Validates invariants, commits to DB, triggers GL posting"],
        ["Alt + A", "FIFO Bill-by-Bill Auto-Allocation", "Chronologically settles oldest outstanding debit invoices"],
        ["End / Enter on Empty", "Discount & Settlement Trigger", "Opens final invoice discount and settlement dialog"],
        ["Esc", "Universal Dismiss / Step Backward", "Closes active modal, clears selection, returns to prior grid"]
    ]
    style_table(hotkey_table, [1.5, 2.5, 2.5], hotkey_headers, hotkey_data)
    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    add_h2("2.2 Universal Alphanumeric Series Continuation Engine")
    add_p("Unlike conventional web ERPs that force rigid database sequences, this platform incorporates the Universal Marg/Tally Alphanumeric Series Continuation Algorithm:")
    add_callout(
        "Regex Pattern: /^([A-Za-z0-9_-]*?)(\\d+)$/\n"
        "• Parsing: Extracts arbitrary text prefixes (e.g., 'RJ-INV-', 'PB/2026/', 'DN-') and trailing numeric integers.\n"
        "• Progression: Automatically increments the integer by 1 while strictly preserving leading zeroes (e.g., 'RJ-DN-0020' -> 'RJ-DN-0021').\n"
        "• Zero-Overwrite Rule: If a user enters a custom alphanumeric series during billing, the ERP preserves the custom sequence in localStorage, increments it for the subsequent bill, and never overrides user customization with system defaults.",
        prefix="ALGORITHM SPECIFICATION: "
    )

    # ==========================================
    # SECTION 3: MASTER DATA & PRICING
    # ==========================================
    add_h1("3. Master Data Catalogs, Warehouses & Pricing Frameworks")
    add_p("The foundational masters ensure total regulatory adherence for pharmaceutical and FMCG distribution:")
    add_p("• Customer & Supplier Master (DOC-10): Manages GSTIN, PAN, Drug License Numbers (Forms 20B & 21B), FSSAI licenses, credit day limits, credit balance ceilings, and designated sales routes.")
    add_p("• Product, SKU & Batch Pricing Master (DOC-11): Catalogs brand names, generic formulations, HSN codes, GST tax rates (0%, 5%, 12%, 18%, 28%), packaging units (e.g. 1x10 Tablets, 100ml Syrup), Maximum Retail Price (MRP), Sale Rate (SRate), Purchase Rate (PRate), Cost Rate, and Expiry Dates (MM/YY format).")
    add_p("• Multi-Godown Warehouse Framework (DOC-13): Physical and virtual inventory partitioning across: 🟢 Saleable Main Godown (Counter/Dispatch), 🔴 Breakage Godown (Damaged in transit/counter), 🟡 Expired Godown (Quarantined for manufacturer return), and 🔵 In-Transit Godown (Cargo consignment).")
    add_p("• Scheme, Discount & Free Goods Engine (DOC-14, DOC-15): Configures automated promotional schemes (e.g., 10+1 Free, 20+3 Free), flat manufacturer trade discounts, chemist tiered volume discounts, and cash settlement rebates.")

    # ==========================================
    # SECTION 4: THE 6 CORE TRANSACTION MODULES
    # ==========================================
    add_h1("4. The 6 Core Transaction Billing Modules (100% Keyboard-Operated)")
    add_p("The transaction engine provides six specialized voucher modules engineered for high-frequency counter operations:")

    modules_data = [
        [
            "1. Sales Bill (/sales)",
            "SalesBill.tsx",
            "1. Header: Date -> Bill No (Auto-series) -> Party Picker [F7].\n2. Grid: Product [F3/F7] -> Batch Picker popup (shows live stock, expiry MM/YY, SRate, MRP) -> Qty -> Free Qty -> Sale Rate -> Disc % -> Next Row.\n3. Settlement: Press 'End' or 'Enter' on empty product line to launch Settlement Modal. Select Cash, Card, Credit, or Bank. Press Enter to commit.\n4. Ledger Impact: Dr Customer Ledger (or Cash in Hand), Cr Sales Account, Cr CGST/SGST/IGST Output Tax.",
            "RJ-INV-6874 -> RJ-INV-6875"
        ],
        [
            "2. Purchase Bill (/purchase)",
            "PurchaseBill.tsx",
            "1. Header: Date -> Bill No -> Party [F7] -> Party Inv No -> Inv Date -> Tax Mode.\n2. Grid: Product -> Batch Creation (Enter Batch No, MRP, PRate, SRate, Expiry MM/YY) -> Qty -> Free -> Purchase Rate -> Disc % -> GST %.\n3. PO Matching: Optional [PO Picker] matches physical inward with Purchase Order.\n4. Ledger Impact: Dr Purchase Account, Dr CGST/SGST/IGST Input Tax Credit, Cr Vendor Ledger.",
            "RJ-PB-7905 -> RJ-PB-7906"
        ],
        [
            "3. Supplier Debit Note (/purchase-return)",
            "PurchaseReturnBill.tsx",
            "1. Dual Modes: [F2] Against Inward Bill (queries vendor bills via /api/sales/invoices/by-supplier/) vs [F3] Direct Loose Return.\n2. Stock Disposition: Routes returned goods to 🟢 Saleable, 🔴 Breakage Godown, or 🟡 Expired Godown.\n3. Reason Codes: Transit damage, Expired, Near expiry, Excess supply, Rate difference.\n4. Ledger Impact: Dr Vendor Ledger, Cr Purchase Return Account, Cr ITC Reversal.",
            "RJ-DN-8924 -> RJ-DN-8925"
        ],
        [
            "4. Customer Credit Note (/sales-return)",
            "SalesReturnBill.tsx",
            "1. Dual Modes: [F2] Against Sales Bill (queries customer bills via /api/sales/invoices/by-customer/) vs [F3] Direct Counter Return.\n2. Quantity Capping: System strictly caps returnable quantity against original billed quantity.\n3. Stock Restoration: Reinstates original batch rate and restores inventory into selected godown.\n4. Ledger Impact: Dr Sales Return Account, Dr GST Output Tax Reversal, Cr Customer Ledger.",
            "RJ-CN-9937 -> RJ-CN-9938"
        ],
        [
            "5. Breakage Issue (/brk-issue)",
            "BrkIssueBill.tsx",
            "1. Purpose: Deducts non-saleable, broken, or expired stock from brk_exp_stock to return to principal drug manufacturers for commercial credit claims.\n2. Grid: High-speed barcode/batch selection matching manufacturer claims.\n3. Ledger Impact: Dr Claims Receivable from Principal, Cr Breakage/Expiry Stock Account.",
            "RJ-BKI-10950 -> RJ-BKI-10951"
        ],
        [
            "6. Breakage Receive (/brk-receive)",
            "BrkReceiveBill.tsx",
            "1. Purpose: Receives unsaleable, leakage, or expired products surrendered by retail chemists at counter.\n2. Inward Stock: Directly accrues units into segregated brk_exp_stock godown without inflating saleable inventory.\n3. Settlement: Issues physical credit slip or cash allowance to chemist.\n4. Ledger Impact: Dr Breakage/Expiry Stock Account, Cr Customer Ledger / Cash.",
            "RJ-BKR-11966 -> RJ-BKR-11967"
        ]
    ]

    mod_table = doc.add_table(rows=1, cols=4)
    mod_headers = ["Module & Route", "Source Component", "Operational Flow & Double-Entry Accounting Impact", "Series Example"]
    style_table(mod_table, [1.4, 1.3, 2.8, 1.0], mod_headers, modules_data)
    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    # ==========================================
    # SECTION 5: PAYMENTS & SETTLEMENT
    # ==========================================
    add_h1("5. Payment, Receipt & Bill-by-Bill Settlement Engine (DOC-07 & DOC-24)")
    add_p("The Settlement Engine manages high-velocity cash and bank transactions with automated bill matching:")
    
    add_h2("5.1 Customer Counter Receipts ([F6] Receipt, /receipt)")
    add_p("• Designed for front-counter collection from retail chemists settling outstanding credit balances.")
    add_p("• Hotkeys: [F7] Party Picker, [Alt+A] FIFO Allocation, [Ctrl+S] Save Voucher.")
    add_p("• Payment Modes: Cash in Hand, Multi-Bank Cheques, NEFT/RTGS, and Counter UPI QR codes.")
    add_p("• Double-Entry Impact: Dr Cash / Bank Account, Cr Customer Debtor Ledger.")

    add_h2("5.2 Supplier Outward Payments ([F5] Payment, /payment)")
    add_p("• Used for disbursing scheduled vendor payments against inward purchase bills.")
    add_p("• Features Cheque Print preview, UTR transaction number capture, and TDS deduction tracking.")
    add_p("• Double-Entry Impact: Dr Supplier Creditor Ledger, Cr Bank Account.")

    add_h2("5.3 Bill-by-Bill FIFO Allocation & Ageing Analysis (/finance/outstanding)")
    add_p("• FIFO Auto-Allocation ([Alt+A]): Automatically apportions receipt amounts across oldest open invoices in chronological order, eliminating manual bill selection.")
    add_p("• Partial Settlement: Accurately adjusts invoice outstanding balances and creates on-account advances (is_floating=True) if excess cash is received.")
    add_p("• Ageing Analysis Workbench: Real-time risk categorization into statutory brackets: 0–30 Days (Current), 31–60 Days, 61–90 Days, and 90+ Days Overdue. Features expandable bill breakdown drawers and direct 1-click navigation to counter vouchers ([Receive ↗] and [Pay ↗]).")

    # ==========================================
    # SECTION 6: GENERAL LEDGER & JOURNALS
    # ==========================================
    add_h1("6. Double-Entry General Ledger & Accounting Suite (DOC-08, DOC-09, DOC-25)")
    add_p("The accounting engine implements an uncompromising, append-only double-entry core where every transaction maintains the invariant: Sum(Debits) == Sum(Credits).")

    add_h2("6.1 Core Financial Statements Suite")
    add_p("1. Day Book (/finance/daybook): Daily chronological transactions register tracking all multi-leg voucher postings with real-time Dr/Cr balance totals.")
    add_p("2. Ledger Statement (/finance/ledger-statement): Detailed chronological account statement across 69+ active ledgers, featuring opening balances, voucher drill-downs, and running balances.")
    add_p("3. Trial Balance (/finance/trial-balance): Automated double-entry ledger verification across all active accounts ensuring debit and credit equilibrium.")
    add_p("4. Profit & Loss Statement (/finance/profit-loss): Multi-tier P&L calculating Gross Trading Margin from sales, cost of goods sold (COGS), and net operational profit after deducting indirect expenditure.")
    add_p("5. Balance Sheet (/finance/balance-sheet): Authoritative financial position statement displaying Capital Accounts, Non-Current Liabilities, Current Liabilities, Fixed Assets, Current Assets, and closing stock valuations.")

    add_h2("6.2 Journal Voucher Cockpit & Accrual Engine (/journal & /finance/journal)")
    add_p("• Keyboard-First Multi-Leg Cockpit: Designed for rapid double-entry adjustments without touching the mouse.")
    add_p("• Dynamic Auto-Balance ([Ctrl+B]): Calculates the exact mathematical discrepancy between debits and credits and automatically inserts a balancing line with the required Cr/Dr amount.")
    add_p("• 6 Statutory Classifications: Standard Manual Journal, Accrual Journal, Provision, Prepaid/Deferred Adjustment, Reclassification/Transfer, Opening Balance Adjustment.")
    add_p("• Accrual Auto-Reversal Scheduler: Automatically schedules reversal transactions for the 1st of the following financial month.")
    add_p("• Traceable 1-Click Atomic Reversal (POST /api/finance/journal/{id}/reverse): Performs an atomic GL inversion (Dr -> Cr, Cr -> Dr) neutralizing balances while preserving complete audit provenance.")

    # ==========================================
    # SECTION 7: OPEX, PETTY CASH & FIXED ASSETS
    # ==========================================
    add_h1("7. Operational Expenditures, Fixed Assets & Cash Control (DOC-26, 27, 28)")

    add_h2("7.1 Operational Expenses, Petty Cash & Advances (/finance/expenses)")
    add_p("• Single-Click Direct Expense Cockpit: Immediate recording of daily operational disbursements (POST /api/expenses/direct) with explicit Paid From ('Cash in Hand' / 'Bank A/c') and Expense Head selection.")
    add_p("• Interactive Live Accounting Impact Box: Visually displays Dr Expense Head, Cr Cash/Bank, and the exact reduction in Net Profit prior to voucher submission.")
    add_p("• 10 Statutory Indirect Expense Ledgers: Pre-seeded heads (Office Rent, Electricity, Printing & Stationery, Freight & Cartage, Staff Tea & Refreshment, Vehicle Fuel, Godown Maintenance, Legal Fees, Postage, Miscellaneous).")
    add_p("• Employee Advances & Multi-Line Claims: Manages tour imprests, itemized bill attachments, and one-click GL commitment.")

    add_h2("7.2 Fixed Assets & Depreciation Engine (/finance/assets)")
    add_p("• Statutory Asset Blocks: Conforms to Companies Act 2013 and Income Tax Act Schedule II (Plant & Machinery, Buildings, Furniture & Fixtures, Computer Equipment, Vehicles).")
    add_p("• Depreciation Models: Both Straight Line Method (SLM) and Written Down Value (WDV) supported with configurable residual value (default 5%) and daily proration.")
    add_p("• Automated Period Depreciation Runs: Generates atomic balanced Journal Vouchers (Dr Depreciation Expense in P&L, Cr Accumulated Depreciation on Balance Sheet) reducing Net Book Value instantly.")

    add_h2("7.3 Bank Reconciliation & Physical Cash Control (/finance/bank-reconciliation)")
    add_p("• Dual-Pane BRS Workbench: Interactive comparison between ERP bank ledger entries and external bank statement feeds with CSV import.")
    add_p("• Automated Multi-Rule Auto-Matching: Matches entries based on Reference/Cheque Number, Exact Amount, and Date Proximity Tolerance (default +/- 3 days).")
    add_p("• Daily Physical Cash Denomination Tally: Currency denomination grid (CashVerification model) counting physical notes (₹2000, ₹500, ₹200, ₹100, ₹50, ₹20, ₹10) and coins (₹5, ₹2, ₹1). Compares physical total against system book balance, automatically identifying and auditing Shortage or Excess.")

    # ==========================================
    # SECTION 8: STATUTORY GST & COMPLIANCE
    # ==========================================
    add_h1("8. Statutory GST Compliance, E-Invoicing & E-Way Bill Engine (DOC-29)")
    add_p("The GST compliance subsystem (/gst) automates statutory tax reconciliation, e-invoicing, and portal filing:")

    gst_table = doc.add_table(rows=1, cols=3)
    gst_headers = ["GST Statutory Return / Tool", "Regulatory Scope & Table Coverage", "System Automation & Features"]
    gst_data = [
        [
            "GSTR-1 Outward Supplies Register",
            "• Table 4 (B2B Taxable Invoices)\n• Table 7 (B2CS Retail Outward)\n• Table 9B (CDNR Credit/Debit Notes)\n• Table 12 (HSN Medicament Summary)\n• Table 13 (Documents Issued Series)",
            "Generates complete outward liability breakdown with customer GSTINs, Place of Supply (POS), Reverse Charge flags, and tax slab allocations (5%, 12%, 18%)."
        ],
        [
            "GSTR-2 Inward Supplies & ITC Register",
            "• Inward Purchase Bill matching\n• Supplier GSTIN validation\n• Eligible ITC Breakdown (CGST, SGST, IGST)",
            "Audits 105+ vendor bills with automated Debit Note ITC reversal matching (-₹95.20) to prevent statutory tax over-claims during department scrutiny."
        ],
        [
            "GSTR-3B Monthly Return & Set-off",
            "• Table 3.1 Outward Tax Liabilities\n• Table 4 Eligible ITC & Net ITC\n• Table 5.1 Cash Tax Payment Set-off",
            "Calculates consolidated monthly tax liability, automatically offsets available Input Tax Credit, and computes Net Cash Payable."
        ],
        [
            "Official GSTN Portal Offline Utility JSON",
            "Standard Schema: GSTR1_Offline_Utility_v1.5\nEndpoint: GET /api/gst/gstr1/json",
            "Exports standardized government JSON payload ready for direct, zero-error upload to the official gst.gov.in portal."
        ],
        [
            "E-Invoicing (IRN) & NIC E-Way Bill",
            "Route: /gst/compliance\nMandatory B2B Threshold Compliance",
            "Generates 64-character Invoice Reference Number (IRN), signed QR codes, and National Informatics Centre (NIC) E-Way Bills for consignments exceeding ₹50,000."
        ],
        [
            "Cryptographically Signed Ledger",
            "Route: /gst/signed-ledger\nAuditor & Court Evidence Standard",
            "Applies SHA-256 digital signature hashes to customer ledger statements for legally binding statutory verification."
        ]
    ]
    style_table(gst_table, [1.8, 2.2, 2.5], gst_headers, gst_data)
    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    # ==========================================
    # SECTION 9: REPORTING & BI
    # ==========================================
    add_h1("9. Management Reporting & Business Intelligence Engine (DOC-30 & DOC-31)")
    add_p("Transforming high-frequency billing data into actionable executive intelligence:")
    add_p("• Company-Wise Sales Register (/reports): Aggregates revenue across 25+ pharmaceutical manufacturers with inline drawer product drill-downs ([▶ View Products]) and manufacturer multi-filters.")
    add_p("• Custom Semantic Report Designer (/reports/designer): Dynamic visual query builder querying /api/reports_v2/query with grouping by Company/Party and reusable template persistence.")
    add_p("• Regional Sales Territory Map Widget: Embedded symmetrically in the BI Dashboard, tracking territory revenue, retail chemist counts, and quota attainment. Features an enlarged interactive modal (#mapModal) with state comparison benchmarks (strictly zero fleet tracking).")
    add_p("• Predictive AI Exception Signals: Real-time detection of stockout risk velocity, customer churn probability, 30-day cash flow projections, and near-expiry exposure.")

    # ==========================================
    # SECTION 10: WORKFLOW & APPROVALS (DOC-32)
    # ==========================================
    add_h1("10. Workflow, Approval, Alert & Business Automation Engine (DOC-32)")
    add_p("DOC-32 is the centralized governance layer managing multi-tier approvals, SLA countdowns, and idempotent downstream actions.")

    add_h2("10.1 Core Governance Non-Negotiables")
    add_p("1. Orchestration Layer Only: The workflow engine does not recalculate taxes or ledger postings. It governs routing and triggers downstream actions.")
    add_p("2. Maker-Checker Separation of Duties: The document creator cannot approve their own transaction. System enforces HTTP 403 Forbidden and displays a prominent warning banner with disabled approve buttons.")
    add_p("3. Idempotency Guarantee: Every trigger utilizes a deterministic SHA-256 deduplication key (SHA-256(tenant_id + doc_id + event)) preventing duplicate approval tasks on network retries.")

    add_h2("10.2 Workflow Cockpits & Tools")
    add_p("• Unified Approval Inbox (/workflow/inbox, [F4]): Unified queue with SLA countdown badges, priority indicators, slide-over inspection drawer, quick hotkeys ([A] Approve, [R] Reject, [D] Delegate), and mandatory rejection modal (#reject-modal).")
    add_p("• Visual No-Code Workflow Designer (/workflow/designer): Multi-tier ladder builder (Tier 1 Floor Manager -> Tier 2 Branch Admin -> Tier 3 AM Admin), post-approval action picker, and interactive sandbox simulator (#input-sim-amount).")
    add_p("• Execution & SLA Monitor (/workflow/monitor): Real-time analytics displaying 1.8h Average Turnaround Time, 94.2% SLA Adherence, bottleneck approver rankings, SHA-256 hash stream, and 1-click safe retry buttons.")

    # ==========================================
    # SECTION 11: AUDIT TRAIL & DATA GOVERNANCE (DOC-33)
    # ==========================================
    add_h1("11. Audit Trail, Data Governance & Compliance Control Engine (DOC-33)")
    add_p("DOC-33 serves as the cryptographic trust and regulatory governance spine of the enterprise platform, enforcing mathematical non-repudiation, tamper detection, and statutory record retention across all ledger postings, master data adjustments, and approval actions.")

    add_h2("11.1 Non-Negotiable Compliance Architecture")
    add_p("1. Append-Only Immutability: Audit log records are strictly append-only. No user, administrator, or API caller can delete or modify past audit events.")
    add_p("2. Cryptographic Hash Chaining: Each event is cryptographically linked to its predecessor via an SHA-256 digital fingerprint calculated as: SHA256(prev_hash + tenant_id + actor + event_type + object_type + object_id + timestamp + before_payload + after_payload). Sequential chain validation (POST /api/audit/verify-chain) mathematically proves historical data integrity.")
    add_p("3. Sensitive Data Redaction: Passwords, tokens, secret keys, bank secrets, and credential hashes are intercepted and permanently redacted as [REDACTED_SENSITIVE] before rendering in diff views.")
    add_p("4. Audit of Audit: Any administrative inspection, legal hold placement, retention policy update, or evidence export automatically records its own immutable audit event.")

    add_h2("11.2 Cockpits, Drawers & Governance Features")
    add_p("• Unified Audit Explorer (/audit): Multidimensional search (Ctrl+F) with module filters, event type filters, timeline table, and 1-click cryptographic chain verification button (#btn-verify-chain).")
    add_p("• Slide-Over Change Detail Drawer: Side inspection panel displaying full event metadata, field-by-field before/after diffs, and an authentic SHA-256 seal badge (✓ SEAL VALID (SHA-256)).")
    add_p("• Data Governance Console (/audit/governance): 4-tab control center covering Statutory Retention Policies (MCA/GST 8-year standard / 2,920 days), Legal Litigation Holds (#btn-apply-hold with freeze & unfreeze reasons), Forensic Anomaly Signals (mass edits, repeated reversals, after-hours modifications, chain integrity), and Auditor Evidence Pack Generation.")

    # ==========================================
    # SECTION 12: CARGO & CONSIGNMENT ENGINE (DOC-34)
    # ==========================================
    add_h1("12. Cargo & Consignment Management Engine (DOC-34)")
    add_p("DOC-34 governs physical transport logistics, consignment series management, volumetric CBM calculations, carrier chain-of-custody, four-eyes delivery sign-offs, and Admin-funded cargo cost segregation.")

    add_h2("12.1 Non-Negotiable Architecture & Core Rules")
    add_p("1. Independent Consignment Identity: First-class consignment series (CN-YYYY-XXXX) decoupled from invoice and challan numbering, supporting 1-to-many and many-to-1 relationships.")
    add_p("2. Admin-Funded Client Cargo Architecture: In central platform distribution setups where Platform Admin finances freight for Client Companies, the Client Company General Ledger (DOC-08) is NEVER debited automatically. The expense is recognized solely in the Admin Company Ledger under Account 5200 (Freight & Logistics Expense).")
    add_p("3. Combined Reporting Toggle: Platform Admin executives can toggle aggregate multi-client freight reporting without breaching tenant isolation boundaries.")
    add_p("4. Volumetric CBM Formula: CBM = (Length (cm) * Width (cm) * Height (cm)) / 1,000,000. Multi-package barcodes (PKG-YYYY-XXXX-NN) track individual tare, gross weight, and fragility.")
    add_p("5. Movement State Machine: PLANNED -> READY_FOR_LOADING -> LOADING -> DISPATCHED -> IN_TRANSIT -> DELIVERED -> CLOSED (with EXCEPTION branching).")
    add_p("6. Proof of Delivery (POD) & Exception Desk: Four-eyes physical delivery validation tracking accepted vs damaged/short quantities and carrier liability claims.")

    add_h2("12.2 Operational Cockpits & Launchers")
    add_p("• Cargo Board (/cargo, [Ctrl+1]): Top KPI strip, visual status matrix, new consignment creation modal ([F6]), slide-over detail drawer, and status progression buttons.")
    add_p("• Cargo Cost Center (/cargo/costs, [F4]): Admin-borne vs Client-borne financial bifurcation, combined multi-client reporting toggle, and CSV manifest exporter.")
    add_p("• POD & Exception Desk (/cargo/pod-exceptions): Pending delivery receiving queue with 4-eyes validation, accepted vs short/damaged quantities, and transit claims resolution desk.")

    # ==========================================
    # SECTION 13: DATABASE SCHEMA
    # ==========================================
    add_h1("13. Relational Database Schema Dictionary (PostgreSQL)")
    add_p("The database architecture encompasses 25+ high-performance relational tables:")

    schema_table = doc.add_table(rows=1, cols=3)
    schema_headers = ["Table Name", "Primary Keys & Constraints", "Functional Purpose & Key Columns"]
    schema_data = [
        ["tenants", "id UUID (PK), code VARCHAR(50) UNIQUE", "Company partition isolation. Columns: name, gstin, address, is_active, created_at."],
        ["users", "id UUID (PK), username VARCHAR UNIQUE", "System identity & auth. Columns: email, hashed_password, role, tenant_id."],
        ["parties", "id UUID (PK), code VARCHAR UNIQUE", "Customer & vendor master. Columns: name, party_type, gstin, dl_no, credit_limit, balance."],
        ["products", "id UUID (PK), code VARCHAR UNIQUE", "SKU & medicament master. Columns: name, generic_name, hsn_code, gst_rate, uom."],
        ["batches", "id UUID (PK), product_id (FK)", "Batch tracking. Columns: batch_number, expiry_date, mrp, sale_rate, purchase_rate, stock_qty."],
        ["invoices", "id UUID (PK), invoice_number UNIQUE", "Core billing header. Columns: party_id, invoice_type, invoice_date, total_amount, balance_amount."],
        ["invoice_items", "id UUID (PK), invoice_id (FK)", "Itemized bill line items. Columns: product_id, batch_id, qty, free_qty, rate, discount_pct, tax_amount."],
        ["vouchers", "id UUID (PK), voucher_number UNIQUE", "General Ledger header. Columns: voucher_type, voucher_date, total_amount, narration, is_reversed."],
        ["voucher_entries", "id UUID (PK), voucher_id (FK)", "Double-entry legs. Columns: ledger_id, entry_type (Dr/Cr), amount, is_reconciled."],
        ["invoice_allocations", "id UUID (PK), receipt_voucher_id (FK)", "Bill-by-bill settlements. Columns: invoice_id, allocated_amount, is_floating."],
        ["employee_advances", "id UUID (PK), employee_id (FK)", "Staff imprest tracking. Columns: amount, purpose, status (Active/Settled), issued_date."],
        ["expense_claims", "id UUID (PK), claimant_id (FK)", "Opex reimbursement claims. Columns: total_amount, advance_id, status (Pending/Approved), voucher_id."],
        ["fixed_assets", "id UUID (PK), asset_code UNIQUE", "Asset register. Columns: name, category_id, purchase_date, original_cost, book_value, dep_method."],
        ["cash_verifications", "id UUID (PK), verified_by (FK)", "Physical drawer tally. Columns: verification_date, system_balance, physical_balance, discrepancy."],
        ["workflow_definitions", "id UUID (PK), company_id (FK)", "Approval templates. Columns: module_name, trigger_event, tier_ladder JSONB, is_active."],
        ["workflow_instances", "id UUID (PK), idempotency_key UNIQUE", "Workflow executions. Columns: source_document_id, status, current_tier, document_payload."],
        ["workflow_tasks", "id UUID (PK), instance_id (FK)", "Approval work items. Columns: tier_index, required_role, assigned_user, status, sla_deadline."],
        ["workflow_audit_logs", "id UUID (PK), instance_id (FK)", "Regulatory audit timeline. Columns: action_type, actor_id, previous_state, new_state, remarks."],
        ["audit_events", "id UUID (PK), prev_hash VARCHAR(64)", "Immutable cryptographically chained audit events. Columns: company_id, actor_name, event_type, object_type, before_payload JSONB, after_payload JSONB, event_hash."],
        ["retention_policies", "id UUID (PK), company_id (FK)", "Statutory retention policies. Columns: object_type, retention_days (2920 days / 8 yrs), legal_hold_allowed, effective_from."],
        ["legal_holds", "id UUID (PK), company_id (FK)", "Statutory litigation/inquiry holds. Columns: scope_type, scope_description, reason, created_by_id, released_at, release_reason."],
        ["consignments", "id UUID (PK), consignment_number UNIQUE", "Decoupled freight shipment. Columns: company_id, document_number, transporter_name, vehicle_no, driver_name, origin_hub, destination_hub, lr_no, status, is_admin_funded."],
        ["cargo_packages", "id UUID (PK), consignment_id (FK)", "Multi-package volumetric hierarchy. Columns: package_type, barcode UNIQUE, gross_weight, tare_weight, net_weight, length_cm, width_cm, height_cm, cbm, is_fragile, status."],
        ["cargo_costs", "id UUID (PK), consignment_id (FK)", "Bifurcated freight expenditure. Columns: beneficiary_company_id, cost_bearer_company_id, cost_type, gross_cost, recovery_amount, net_bearer_cost, is_admin_borne, recovery_status."],
        ["pod_records", "id UUID (PK), consignment_id (FK)", "Proof of delivery & discrepancy record. Columns: received_by, received_at, accepted_qty, short_qty, damage_qty, signature_token, remarks, status."]
    ]
    style_table(schema_table, [1.5, 2.0, 3.0], schema_headers, schema_data)
    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    # ==========================================
    # ==========================================
    # SECTION 14: REST API DIRECTORY
    # ==========================================
    add_h1("14. RESTful API Directory & Endpoint Specifications")
    add_p("The backend exposes a high-speed, asynchronous RESTful API layer organized by domain (40+ endpoints):")

    api_table = doc.add_table(rows=1, cols=3)
    api_headers = ["Endpoint Route", "HTTP Method", "Functional Scope & Payload Description"]
    api_data = [
        ["/api/auth/token", "POST", "OAuth2 JWT password authentication yielding bearer access token."],
        ["/api/sales/invoices", "GET / POST", "Retrieves invoice register / Posts new Sales Bill, creates GL voucher, decrements batch stock."],
        ["/api/sales/invoices/by-customer/{id}", "GET", "Fetches past customer bills for Sales Return capping."],
        ["/api/sales/invoices/by-supplier/{id}", "GET", "Fetches past inward purchase bills for Debit Note matching."],
        ["/api/stock/products", "GET / POST", "Product SKU catalog and inventory management."],
        ["/api/stock/batches", "GET / POST", "Batch creation, stock queries, and expiry monitoring."],
        ["/api/finance_v2/daybook", "GET", "Chronological daily double-entry transaction register."],
        ["/api/finance_v2/ledger/{id}", "GET", "Individual account statement with opening and closing balances."],
        ["/api/finance_v2/receipt", "POST", "Records customer collection voucher and performs FIFO invoice allocation."],
        ["/api/finance_v2/payment", "POST", "Records vendor outward payment voucher with bank/cheque details."],
        ["/api/finance/journal", "POST", "Posts multi-leg journal voucher with dynamic double-entry verification."],
        ["/api/finance/journal/{id}/reverse", "POST", "Performs atomic reversal of posted journal voucher."],
        ["/api/expenses/direct", "POST", "Instant recording of operational expenses with live P&L impact."],
        ["/api/assets/depreciate/all", "POST", "Executes bulk period depreciation run posting Dr/Cr GL vouchers."],
        ["/api/finance_v2/bank-recon/auto-match", "POST", "Automated multi-rule bank reconciliation with tolerance matching."],
        ["/api/finance_v2/cash-verification", "POST", "Submits physical cash denomination drawer tally and audits variance."],
        ["/api/gst/gstr1/json", "GET", "Exports official Government GSTN Offline Utility JSON payload."],
        ["/api/dashboard/summary", "GET", "Aggregates today's cash, credit sales, SKU counts, and stockout alerts."],
        ["/api/dashboard/trends", "GET", "Returns 7-month comparative sales/purchase curve and Opex donut distribution."],
        ["/api/workflow/inbox", "GET", "Fetches pending & historic approval tasks with SLA countdowns."],
        ["/api/workflow/tasks/{id}/action", "POST", "Executes APPROVE, REJECT (mandatory remarks), DELEGATE, or ESCALATE."],
        ["/api/workflow/trigger", "POST", "Universal workflow trigger with SHA-256 deduplication and fallback UUID support."],
        ["/api/workflow/analytics", "GET", "Returns turnaround time (1.8h), SLA adherence (94.2%), and bottleneck analysis."],
        ["/api/audit/events", "GET", "Multidimensional audit event query with module/event filtering and pagination."],
        ["/api/audit/diff/{id}", "GET", "Field-by-field before/after state diff with sensitive data masking and hash seal test."],
        ["/api/audit/verify-chain", "POST", "Traverses sequential SHA-256 cryptographic chain certifying 100% data integrity."],
        ["/api/audit/retention/policies", "GET / POST", "Retrieves and upserts statutory retention schedules (MCA/GST 8-year standard)."],
        ["/api/audit/legal-holds", "GET / POST", "Applies and lists statutory inquiry/litigation holds freezing records."],
        ["/api/audit/legal-holds/{id}/release", "POST", "Releases legal hold with mandatory justification audit reason."],
        ["/api/audit/anomalies", "GET", "Scans for velocity spikes, repeated cancellations, after-hours edits, and chain tampering."],
        ["/api/audit/evidence-pack", "POST", "Produces cryptographically sealed audit evidence package with SHA-256 root hash."],
        ["/api/cargo/summary", "GET", "Aggregates total consignments, in-transit, volumetric CBM, Admin-borne cost, pending POD."],
        ["/api/cargo/consignments", "GET / POST", "Multi-tenant search & list / Creates new consignment with series CN-YYYY-XXXX continuation."],
        ["/api/cargo/consignments/{id}", "GET", "Comprehensive consignment detail with multi-package CBM calculations and costs."],
        ["/api/cargo/consignments/{id}/status", "PUT", "State machine progression (LOADING -> DISPATCHED -> IN_TRANSIT -> DELIVERED)."],
        ["/api/cargo/costs", "GET", "Admin-borne cost bifurcation with combined cross-client reporting toggle."],
        ["/api/cargo/pod-exceptions", "GET", "Pending delivery receiving queue and active transit exception claims desk."],
        ["/api/cargo/consignments/{id}/pod", "POST", "Submits delivery POD with accepted vs short/damaged quantities & exception branch."],
        ["/api/cargo/consignments/{id}/resolve-exception", "POST", "Commits corrective resolution action (Carrier Claim / Demurrage Waiver) with audit log."]
    ]
    style_table(api_table, [2.2, 0.9, 3.4], api_headers, api_data)
    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    # ==========================================
    # SECTION 15: QA VERIFICATION & DEPLOYMENT
    # ==========================================
    add_h1("15. Automated Selenium QA Matrix & Production Deployment")
    add_p("The codebase maintains 100% automated test coverage across 12 headless Chrome Selenium suites:")

    qa_table = doc.add_table(rows=1, cols=3)
    qa_headers = ["Automated Test Suite", "Stages Verified", "Assertion Target & Status"]
    qa_data = [
        ["test_master_all_6_modules_selenium.py", "6 Stages", "100% PASS: All 6 transaction modules (Sales, Purchase, DN, CN, BKI, BKR) with series continuation."],
        ["test_reports_and_finance_selenium.py", "8 Stages", "100% PASS: Day Book, Ledger, Trial Balance, P&L, Balance Sheet, BRS, Report Designer."],
        ["test_gst_compliance_selenium.py", "11 Stages", "100% PASS: GSTR-1 (Tables 4,7,9B,12,13), GSTR-2, GSTR-3B, Offline JSON export, E-Invoicing."],
        ["test_receipt_payment_settlement_selenium.py", "6 Stages", "100% PASS: Customer receipts [F6], FIFO allocation [Alt+A], Supplier payments [F5], Ageing."],
        ["test_journal_accrual_engine_selenium.py", "6 Stages", "100% PASS: Multi-leg cockpit entry, [Ctrl+B] Auto-Balance, accrual reversal scheduler, 1-click reversal."],
        ["test_direct_expense_ui_selenium.py", "8 Stages", "100% PASS: Direct expense form, live P&L impact box, advance issuance, multi-line claim approval."],
        ["test_fixed_assets_selenium.py", "5 Stages", "100% PASS: Asset registration, WDV/SLM depreciation run, GL journal generation, P&L deduction."],
        ["test_bank_recon_cash_selenium.py", "6 Stages", "100% PASS: BRS workbench, tolerance auto-matching, cash denomination tally counting, discrepancy audit."],
        ["test_dashboard_bi_control_center_selenium.py", "7 Stages", "100% PASS: Counter workbench, Executive BI strip, area trends, Opex donut, vector map modal."],
        ["test_workflow_approval_automation_selenium.py", "10 Stages", "100% PASS: Universal trigger, [F4] Inbox, Maker-Checker 403 enforcement, rejection modal, designer simulator, SLA monitor."],
        ["test_audit_governance_selenium.py", "10 Stages", "100% PASS: Cryptographic SHA-256 hash chaining, diff drawer, seal validation, retention policies, legal holds, forensic anomalies, evidence pack."],
        ["test_cargo_consignment_selenium.py", "10 Stages", "100% PASS: Consignment registry, volumetric CBM, [Ctrl+1] Board, drawer inspection, cost center combined toggle, 4-eyes POD & exception claims."]
    ]
    style_table(qa_table, [2.3, 1.0, 3.2], qa_headers, qa_data)
    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    add_h2("15.1 Production Deployment & Synchronization Commands")
    add_p("To run or synchronize the software across development and production environments:")
    
    add_callout(
        "1. Backend Startup (Port 8000):\n"
        "   cd C:\\Users\\DELL\\OneDrive\\Desktop\\erp2\\backend\n"
        "   C:\\Python313\\python.exe -m uvicorn main:app --port 8000 --reload\n\n"
        "2. Frontend Startup (Port 50005):\n"
        "   cd C:\\Users\\DELL\\OneDrive\\Desktop\\erp2\n"
        "   npm run dev -- --port 50005\n\n"
        "3. Production Synchronization (Robocopy to Git):\n"
        "   robocopy C:\\Users\\DELL\\OneDrive\\Desktop\\erp2\\src C:\\Users\\DELL\\OneDrive\\Desktop\\erp\\src /MIR /XD node_modules\n"
        "   robocopy C:\\Users\\DELL\\OneDrive\\Desktop\\erp2\\backend C:\\Users\\DELL\\OneDrive\\Desktop\\erp\\backend /MIR /XD __pycache__ .venv\n"
        "   robocopy C:\\Users\\DELL\\OneDrive\\Desktop\\erp2 C:\\Users\\DELL\\OneDrive\\Desktop\\erp *.md *.docx *.json *.txt /XF package-lock.json /XD node_modules backend src .git\n\n"
        "4. Live Production URL:\n"
        "   https://erp-rho-three.vercel.app (Continuous Deployment via GitHub origin main)",
        prefix="OPERATIONAL DEPLOYMENT SCRIPTS: "
    )

    # Save to erp2 directory
    output_path = r"C:\Users\DELL\OneDrive\Desktop\erp2\ERP_ENTERPRISE_SYSTEM_COMPLETE_SOFTWARE_MASTER_WALKTHROUGH.docx"
    doc.save(output_path)
    print(f"Master Walkthrough document successfully generated at: {output_path}")

    # Also save a copy to erp directory
    erp_path = r"C:\Users\DELL\OneDrive\Desktop\erp\ERP_ENTERPRISE_SYSTEM_COMPLETE_SOFTWARE_MASTER_WALKTHROUGH.docx"
    doc.save(erp_path)
    print(f"Master Walkthrough document successfully copied to: {erp_path}")

if __name__ == "__main__":
    create_full_software_walkthrough()
