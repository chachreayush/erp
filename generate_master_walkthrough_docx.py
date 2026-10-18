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

    def add_screenshot(image_filename, caption_text):
        img_path = os.path.join(r"C:\Users\DELL\OneDrive\Desktop\erp2", image_filename)
        if os.path.exists(img_path):
            p = doc.add_paragraph()
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p.paragraph_format.space_before = Pt(8)
            p.paragraph_format.space_after = Pt(2)
            run = p.add_run()
            run.add_picture(img_path, width=Inches(6.2))
            
            p_cap = doc.add_paragraph()
            p_cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p_cap.paragraph_format.space_before = Pt(0)
            p_cap.paragraph_format.space_after = Pt(10)
            r_cap = p_cap.add_run(caption_text)
            set_font(r_cap, size_pt=8.5, color=COLOR_MUTED, italic=True)

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

    # ==========================================
    # SECTION 16: UNIVERSAL ESCAPE LIFECYCLE & HEADER WORKFLOWS
    # ==========================================
    add_h1("16. Universal Escape Key Navigation & Application Lifecycle Architecture")
    add_p("The ERP implements a hierarchical, multi-level [Esc] key lifecycle designed to provide high-speed keyboard operators with seamless backward navigation, instantaneous modal dismissal, and graceful application termination:")
    
    add_callout(
        "Hierarchical Escape Handling Architecture:\n"
        "- Level 1 (Topmost Modal / Drawer): Pressing [Esc] dismisses active slide-over inspection drawers (Consignment Drawer, Audit Diff Drawer), batch/party modals ([F3]/[F7]), or discount/settlement popups ([End]) without triggering any route change.\n"
        "- Level 2 (Sub-Page Navigation): On any dedicated transaction or financial screen (/sales, /purchase, /cargo, /audit, /receipt, /payment), pressing [Esc] safely exits the module and returns the operator to the Home Counter Workbench (HomeScreen at '/').\n"
        "- Level 3 (Home Screen Exit Modal): On the Counter Workbench (/), pressing [Esc] invokes the high-contrast Application Exit Modal (#modal-exit-app). Pressing [Enter] or clicking 'Exit Application' closes the window (or redirects to /login), while pressing [Esc] or clicking 'Cancel [Esc]' returns focus immediately to counter operations.",
        prefix="ESCAPE LIFECYCLE RULE: "
    )

    add_h2("16.1 Workflows Header Dropdown & Quick Actions")
    add_p("The primary application header features a unified 'Workflows [F4]' dropdown grouping all operational and logistics pipelines:")
    
    workflow_table = doc.add_table(rows=1, cols=3)
    wf_headers = ["Workflow Action", "Route / Hotkey", "Functional Capability & Role Authorization"]
    wf_data = [
        ["Approvals Inbox", "/workflow/inbox ([F4])", "Multi-tier approval queue with SLA countdowns, 1-click Approve/Reject, and Maker-Checker 403 enforcement."],
        ["No-Code Workflow Designer", "/workflow/designer", "Visual builder for threshold rules, approval stages, roles, SLAs, and sandbox amount simulator."],
        ["Real-Time SLA Monitor", "/workflow/monitor", "Enterprise TAT benchmarks, SLA adherence rate (94.2%), bottleneck analysis, and SHA-256 idempotency locks."],
        ["Cargo Consignment Board", "/cargo ([Ctrl+1])", "Kanban tracking, alphanumeric series continuation (CN-YYYY-XXXX), and volumetric CBM package calculation."],
        ["Cargo Costs Allocation Center", "/cargo/costs ([F4])", "Admin-borne vs Client-borne logistics cost bifurcation with combined multi-client reporting toggle."],
        ["POD & Exceptions Desk", "/cargo/pod-exceptions", "Four-eyes physical delivery sign-off, shortage/damage logging, and transit claims resolution."]
    ]
    style_table(workflow_table, [2.0, 1.8, 2.7], wf_headers, wf_data)
    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    # ==========================================
    # SECTION 17: CUSTOMER RECEIPT & SUPPLIER PAYMENT VOUCHERS
    # ==========================================
    add_h1("17. Customer Receipt & Supplier Payment Luxury Architecture")
    add_p("The Receipt (/receipt) and Payment (/payment) voucher modules have been overhauled with a high-density Marg-inspired luxury green interface, delivering real-time telemetry, party lookup modals, FIFO bill-by-bill allocation, and sequential series continuation:")

    add_h2("17.1 3-Card Financial Telemetry Strip")
    add_p("Immediately above the voucher entry form, a responsive 3-card telemetry strip provides live financial situational awareness:")
    
    telemetry_table = doc.add_table(rows=1, cols=3)
    tel_headers = ["Telemetry Card", "DOM Selector", "Functional Metric & Financial Context"]
    tel_data = [
        ["Active Ledger Balance", "#kpi-active-balance", "Displays real-time outstanding balance of the selected customer (Debtor Dr) or supplier (Creditor Cr). Updates dynamically upon party selection."],
        ["Total Settlement Allocation", "#kpi-total-allocated", "Live running sum of all amounts allocated across unpaid bills in the settlement grid. Displays exact match status against voucher amount."],
        ["Unallocated Floating Credit", "#kpi-unallocated-credit", "Calculates difference between entered voucher amount and total allocated bills. Any positive balance automatically records as on-account advance credit."]
    ]
    style_table(telemetry_table, [2.0, 1.8, 2.7], tel_headers, tel_data)
    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    add_h2("17.2 Party Lookup Modal & Keyboard Operations")
    add_p("Pressing [F7] or clicking the party search button opens the modal dialog (#modal-party-picker) featuring real-time debounce search across ledgers, outstanding balances, drug licenses, and contact numbers. Operators navigate via [ArrowUp] / [ArrowDown] and commit selection with [Enter].")

    add_h2("17.3 Bill-by-Bill FIFO Allocation Engine (DOC-07)")
    add_p("When a party with unpaid invoices is selected, the system fetches all pending invoices via /api/sales/invoices/by-customer/{id} or /api/sales/invoices/by-supplier/{id}:")
    add_callout(
        "- 1-Click FIFO Auto-Allocation ([Alt+A]): Pressing [Alt+A] or clicking 'Auto-Allocate (FIFO)' runs a deterministic chronological allocation algorithm that settles oldest overdue invoices first.\n"
        "- Manual Grid Adjustment: Operators can navigate into each bill row to specify exact allocation amounts, partial payments, or full settlements.\n"
        "- Marg Alphanumeric Series Continuation: Receipt numbers increment sequentially (e.g. REC-2026-0001 -> REC-2026-0002) and Payment numbers increment sequentially (PAY-2026-0001 -> PAY-2026-0002), preserving user custom series overrides across sessions.",
        prefix="ALLOCATION & CONTINUATION ENGINE: "
    )

    # ==========================================
    # SECTION 18: AUDIT TRAIL & DATA GOVERNANCE CONSOLE
    # ==========================================
    add_h1("18. Cryptographic SHA-256 Audit Trail Explorer & Data Governance Console")
    add_p("The compliance architecture provides statutory audit logging satisfying Ministry of Corporate Affairs (MCA) Audit Trail mandates and US FDA 21 CFR Part 11 requirements:")

    add_h2("18.1 Audit Trail Explorer (/audit)")
    add_p("The Audit Explorer provides a high-density, real-time forensic view into every transactional state change across the ERP:")
    
    audit_table = doc.add_table(rows=1, cols=3)
    aud_headers = ["Audit Feature", "UI Element", "Forensic Capability & Security Assurance"]
    aud_data = [
        ["Top Forensic KPIs", "#kpi-total-audited, #kpi-chain-integrity, #kpi-active-holds, #kpi-terminal-hash", "Real-time cards reporting total audited events, cryptographic chain integrity, active legal holds, and latest SHA-256 terminal hash."],
        ["Cryptographic Chain Banner", "#banner-chain-integrity", "High-visibility green badge certifying unbroken sequential SHA-256 hash chaining (prev_hash -> event_hash). Includes 'Verify Chain Integrity' action."],
        ["Slide-Over Diff Drawer", "#drawer-audit-diff", "Detailed side-by-side comparison of before/after states with ADDED, MODIFIED, REMOVED badges and automatic masking of sensitive credentials ([REDACTED_SENSITIVE])."],
        ["Auditor Evidence Pack Exporter", "#btn-export-evidence-pack", "Produces cryptographically sealed, digitally signed JSON compliance evidence packs with SHA-256 root manifests for MCA/GST inspectors."]
    ]
    style_table(audit_table, [1.8, 1.8, 2.9], aud_headers, aud_data)
    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    add_h2("18.2 Data Governance & Regulatory Compliance Console (/audit/governance)")
    add_p("The Data Governance Console provides multi-tab compliance controls:")
    add_callout(
        "1. Statutory Retention Policies Tab: Pre-configured with MCA & CGST 8-year standard retention (2,920 days) across INVOICE, VOUCHER, AUDIT_EVENT, and PARTY tables with audit-logged schedule adjustments.\n"
        "2. Litigation Legal Holds Tab: Apply statutory preservation holds freezing targeted records against disposal during tax audits or legal inquiry (#modal-apply-hold) with mandatory release justification.\n"
        "3. Forensic Anomaly Radar: Evaluates 5 automated heuristic signals: MASS_EDITS (velocity spikes), REPEATED_REVERSALS (cancellation spikes), AFTER_HOURS (10pm-6am postings), ACTIVE_LEGAL_HOLDS, and CHAIN_INTEGRITY.\n"
        "4. Auditor Evidence Pack Generator: 1-click generation of immutable evidence bundles certified with SHA-256 root seals.",
        prefix="DATA GOVERNANCE CONTROLS: "
    )

    # ==========================================
    # SECTION 19: MASTER UI ELEMENT & SELECTOR CATALOG
    # ==========================================
    add_h1("19. Master Screen-by-Screen UI Element & Selector Catalog")
    add_p("To guarantee zero missing elements and complete testability for software developers, the following catalog indexes all interactive DOM selectors, inputs, buttons, and keyboard hotkeys across newly modernized screens:")

    elem_table = doc.add_table(rows=1, cols=4)
    elem_headers = ["Screen / Route", "Element Selector / ID", "Type & Hotkey", "Functional Description & Expected Behavior"]
    elem_data = [
        ["Counter Workbench (/)", "#hub-btn-sales-bill", "Button [F2]", "Opens Counter Sales Billing screen with sequential invoice series continuation."],
        ["Counter Workbench (/)", "#hub-btn-receipt-voucher", "Button [F6]", "Opens Customer Collection & Receipt Voucher screen."],
        ["Counter Workbench (/)", "#hub-btn-payment-voucher", "Button [F5]", "Opens Supplier Outward Payment Voucher screen."],
        ["Counter Workbench (/)", "#hub-btn-cargo-management", "Button [Ctrl+1]", "Launches Cargo & Consignment Management Board."],
        ["Counter Workbench (/)", "#hub-btn-audit-trail", "Button", "Opens Cryptographic SHA-256 Audit Trail Explorer."],
        ["Counter Workbench (/)", "#modal-exit-app", "Modal [Esc]", "Application exit confirmation dialog with Exit [Enter] and Cancel [Esc]."],
        ["Workflows Dropdown", "#btn-workflow-dropdown", "Dropdown [F4]", "Expands workflows menu with Inbox, Designer, Monitor, Cargo, Costs, POD Desk."],
        ["Receipt Voucher (/receipt)", "#voucher-series-input", "Input", "Displays and allows editing of current receipt continuation series (REC-YYYY-XXXX)."],
        ["Receipt Voucher (/receipt)", "#party-search-input", "Input [F7]", "Triggers Party Search modal with live debtor balance and drug license."],
        ["Receipt Voucher (/receipt)", "#voucher-amount-input", "Input", "Enters receipt amount; recalculates unallocated floating credit dynamically."],
        ["Receipt Voucher (/receipt)", "#btn-auto-allocate-fifo", "Button [Alt+A]", "Executes FIFO auto-allocation across pending customer invoices."],
        ["Receipt Voucher (/receipt)", "#btn-post-voucher", "Button [Ctrl+S]", "Posts receipt voucher to GL, updates ledger balances, increments series."],
        ["Payment Voucher (/payment)", "#voucher-series-input", "Input", "Displays and allows editing of current payment continuation series (PAY-YYYY-XXXX)."],
        ["Payment Voucher (/payment)", "#party-search-input", "Input [F7]", "Triggers Party Search modal with live creditor balance and bank account."],
        ["Payment Voucher (/payment)", "#btn-auto-allocate-fifo", "Button [Alt+A]", "Executes FIFO auto-allocation across pending vendor purchase bills."],
        ["Audit Explorer (/audit)", "#input-audit-search", "Input [Ctrl+F]", "Fuzzy search across audit trail by document number, actor, or reason."],
        ["Audit Explorer (/audit)", "#btn-verify-chain", "Button", "Traverses cryptographic SHA-256 hash chain and certifies 100% integrity."],
        ["Audit Explorer (/audit)", "#drawer-audit-diff", "Drawer [Enter]", "Slides over before/after field diff with sensitive data masking."],
        ["Audit Explorer (/audit)", "#btn-export-evidence-pack", "Button [E]", "Generates auditor-compliant sealed JSON evidence pack."],
        ["Governance (/audit/governance)", "#tab-retention-policies", "Tab", "Displays statutory retention schedules and 2,920-day MCA/GST policies."],
        ["Governance (/audit/governance)", "#btn-apply-legal-hold", "Button", "Opens modal to establish statutory preservation legal hold (#modal-apply-hold)."],
        ["Governance (/audit/governance)", "#grid-forensic-anomalies", "Grid", "Displays real-time anomaly detection radar for velocity and after-hours edits."],
        ["Cargo Board (/cargo)", "#btn-register-consignment", "Button [F6]", "Opens consignment registration modal with volumetric CBM calculator."],
        ["Cargo Board (/cargo)", "#drawer-consignment-detail", "Drawer", "Slide-over drawer showing package barcodes, weights, and status advance."],
        ["Cargo Costs (/cargo/costs)", "#toggle-combined-reporting", "Toggle", "Switches between single-tenant and aggregated multi-client MIS view."],
        ["POD Desk (/cargo/pod-exceptions)", "#btn-record-delivery-pod", "Button", "Submits delivery POD with accepted vs short/damaged quantity validation."],
        ["Counter Workbench (/)", "#hub-btn-freight-management", "Button [Ctrl+2]", "Quick launcher navigating to Freight & Rates Master (/freight/contracts)."],
        ["Freight Rate Master (/freight/contracts)", "#kpi-active-contracts", "Card", "Displays total active transporter rate contracts with tiered slabs."],
        ["Freight Rate Master (/freight/contracts)", "#btn-switch-tab-sandbox", "Tab [F4]", "Toggles interactive deterministic calculation sandbox."],
        ["Freight Rate Master (/freight/contracts)", "#btn-execute-calc", "Button", "Executes live rate resolution and displays formula breakdown."],
        ["Freight Rate Master (/freight/contracts)", "#btn-new-contract", "Button [F6]", "Opens modal to register new freight contract (#modal-new-contract)."],
        ["Reconciliation Desk (/freight/reconciliation)", "#kpi-total-recons", "Card", "Displays total transporter statement count and three-way match status."],
        ["Reconciliation Desk (/freight/reconciliation)", "#btn-enter-transporter-bill", "Button [F6]", "Opens modal to enter manual transporter invoice for audit (#modal-enter-transporter-bill)."]
    ]
    style_table(elem_table, [1.5, 1.8, 1.1, 2.1], elem_headers, elem_data)
    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    # ==========================================
    # SECTION 20: COMPREHENSIVE QA VERIFICATION MATRIX
    # ==========================================
    add_h1("20. Comprehensive Verification Matrix & Headless Selenium End-to-End Test Registry")
    add_p("The software platform maintains 100% automated pass coverage across 15 comprehensive headless Chrome Selenium test suites and continuous live Vercel production audits:")

    matrix_table = doc.add_table(rows=1, cols=3)
    mat_headers = ["Test Suite / Verification Script", "Verification Scope & Stages", "Target Assertions & Status"]
    mat_data = [
        ["test_master_all_6_modules_selenium.py", "6 Stages (All 6 core billing modules)", "100% PASS: Sales Bill, Purchase Bill, Supplier Debit Note, Customer Credit Note, Breakage Issue, Breakage Receive with series continuation."],
        ["test_reports_and_finance_selenium.py", "8 Stages (Financial accounting suite)", "100% PASS: Day Book, Ledger Statement, Trial Balance, P&L, Balance Sheet, Bank Reconciliation, Report Designer."],
        ["test_gst_compliance_selenium.py", "11 Stages (Statutory tax compliance)", "100% PASS: GSTR-1 (Tables 4,7,9B,12,13), GSTR-2, GSTR-3B, Offline JSON export, E-Invoicing."],
        ["test_receipt_payment_settlement_selenium.py", "6 Stages (Settlement & FIFO engine)", "100% PASS: Customer receipts [F6], FIFO auto-allocation [Alt+A], Supplier payments [F5], Ageing analysis."],
        ["test_journal_accrual_engine_selenium.py", "6 Stages (Multi-leg journal cockpit)", "100% PASS: Multi-leg entry, [Ctrl+B] Auto-Balance, accrual scheduler, 1-click reversal."],
        ["test_direct_expense_ui_selenium.py", "8 Stages (Operational expense desk)", "100% PASS: Direct expense form, live P&L impact box, advance issuance, multi-line claim approval."],
        ["test_fixed_assets_selenium.py", "5 Stages (Fixed assets & depreciation)", "100% PASS: Asset registration, WDV/SLM depreciation run, GL journal generation, P&L deduction."],
        ["test_bank_recon_cash_selenium.py", "6 Stages (BRS & cash drawer control)", "100% PASS: BRS workbench, tolerance auto-matching, cash denomination tally counting, discrepancy audit."],
        ["test_dashboard_bi_control_center_selenium.py", "7 Stages (Executive BI control center)", "100% PASS: Counter workbench, Executive BI strip, area trends, Opex donut, territory map modal."],
        ["test_workflow_approval_automation_selenium.py", "10 Stages (Workflow automation engine)", "100% PASS: Universal trigger, [F4] Inbox, Maker-Checker 403 enforcement, rejection modal, designer simulator, SLA monitor."],
        ["test_audit_governance_selenium.py", "10 Stages (Audit trail & data governance)", "100% PASS: Cryptographic SHA-256 hash chaining, diff drawer, seal validation, retention policies, legal holds, forensic anomalies, evidence pack."],
        ["test_cargo_consignment_selenium.py", "10 Stages (Cargo & consignment engine)", "100% PASS: Consignment registry, volumetric CBM, [Ctrl+1] Board, drawer inspection, cost center combined toggle, 4-eyes POD & exception claims."],
        ["test_esc_navigation_and_cargo_flow_selenium.py", "10 Stages (Escape lifecycle & workflows)", "100% PASS: Universal Esc key navigation, Home Screen exit modal, header workflows dropdown, and quick launcher tiles."],
        ["test_freight_logistics_selenium.py", "10 Stages (Freight & logistics cost engine)", "100% PASS: Rate contracts, tiered slabs, deterministic calculation, Admin GL 5200 segregation, 3-way transporter reconciliation, [Esc] lifecycle."],
        ["test_principal_operations_selenium.py", "10 Stages (Principal & C&F operations engine)", "100% PASS: Agreement catalog, stock custody segregation, breakage claims workflow, 3-way reconciliation match, reconstructable statement desk, [Esc] lifecycle."],
        ["verify_live_vercel_receipt_payment_audit.py", "10 Stages (Live cloud production audit)", "100% PASS: Live production verification on https://erp-rho-three.vercel.app with zero regressions and complete visual screenshot artifacts."]
    ]
    style_table(matrix_table, [2.2, 1.2, 3.1], mat_headers, mat_data)
    doc.add_paragraph().paragraph_format.space_after = Pt(12)

    # ==========================================
    # SECTION 21: FREIGHT & LOGISTICS COST & RECOVERY ENGINE (DOC-35)
    # ==========================================
    add_h1("21. Freight & Logistics Cost & Recovery Engine (DOC-35)")
    add_p(
        "DOC-35 defines the centralized calculation, multi-tier rate resolution, cost allocation, commercial recovery, "
        "and three-way transporter reconciliation engine for the enterprise ERP system. In pharmaceutical and commercial distribution, "
        "freight is often handled under split financial responsibilities: platform administrators, client companies, consignees, "
        "and principals. DOC-35 guarantees mathematical determinism, transparent formula explainability, first-class cost-bearer "
        "isolation, and automated three-way invoice matching against actual physical dispatches (DOC-34 Cargo Consignments)."
    )

    add_callout(
        "DOC-35 ARCHITECTURAL INVARIANTS & CORE GOVERNANCE RULES:\n"
        "1. Strict Separation of Cost, Recovery, and Logistics Margin: Transporter cost incurred is never conflated with or silently offset by customer/principal recoveries. Cost, recovery, and margin remain separate immutable ledger items.\n"
        "2. First-Class Cost Bearer Policy: When Platform Admin is configured as cost bearer for client company dispatches, the accounting expense posts exclusively to Account 5200 in the Platform Admin General Ledger; the Client Company General Ledger maintains zero auto-debits.\n"
        "3. Deterministic Explainability Snapshots: Every calculation generates an immutable JSON snapshot with inputs, formula traces, and rule versions, ensuring 100% audit reconstructability.\n"
        "4. Three-Way Transporter Billing & Reconciliation: Transporter invoices are audited against system-expected costs with automated variance status tagging (MATCHED, TOLERABLE <= ₹200, UNAPPROVED_EXCESS > ₹200, DISPUTED) and 1-click GL posting to Account 5200.",
        prefix="DOC-35 CORE MANDATE: "
    )

    add_h2("21.1 Implemented Relational Schema & Relational Models (11 Models)")
    add_p(
        "DOC-35 introduces 11 relational entities mapped via SQLAlchemy 2.0 with strict foreign key constraints, "
        "multi-tenant scoping, and cryptographic verification snapshots. The schema maps contracts, pricing lanes, "
        "tiered weight slabs, ancillary surcharge rules, and three-way reconciliation records:"
    )

    frt_schema_table = doc.add_table(rows=1, cols=4)
    frt_sch_headers = ["Model Name & Table", "Primary & Foreign Keys", "Core Attributes & Data Types", "Operational Mandate & Governance Role"]
    frt_sch_data = [
        [
            "FreightContract\n(freight_contracts)",
            "PK: id (UUID)\nFK: organization_id -> organizations.id\nFK: transporter_id -> parties.id",
            "contract_code (String 50)\ncontract_name (String 200)\nvalid_from, valid_to (DateTime)\npriority (Integer)\nstatus (ACTIVE, INACTIVE)",
            "Master carrier agreement defining contracted pricing terms, priority resolution order, and operational status."
        ],
        [
            "FreightLane\n(freight_lanes)",
            "PK: id (UUID)\nFK: contract_id -> freight_contracts.id",
            "origin_pincode (String 10)\ndest_pincode (String 10)\norigin_zone, dest_zone (String 50)\ntransit_days (Integer)\ndistance_km (Numeric 10, 2)",
            "Origin-to-destination geographic routing lane defining transit duration expectations and distance matrices."
        ],
        [
            "FreightRateRule\n(freight_rate_rules)",
            "PK: id (UUID)\nFK: lane_id -> freight_lanes.id",
            "slab_min_kg, slab_max_kg (Numeric 12, 2)\nrate_per_kg (Numeric 12, 2)\nflat_rate (Numeric 12, 2)\nmin_charge (Numeric 12, 2)\ncalc_mode (PER_KG, FLAT, TIERED)",
            "Tiered chargeable weight slabs and base freight rates (e.g., 0-500kg @ ₹7.00/kg, 501-1,500kg @ ₹6.50/kg, >1,500kg @ ₹5.80/kg)."
        ],
        [
            "FreightAncillaryRule\n(freight_ancillary_rules)",
            "PK: id (UUID)\nFK: contract_id -> freight_contracts.id",
            "charge_code (String 50)\ncharge_name (String 100)\nrate_type (FLAT, PERCENT, PER_PACKAGE)\nrate_value (Numeric 12, 2)\nis_mandatory (Boolean)",
            "Dynamic surcharges including Loading/Unloading (₹300 flat), Highway Tolls (₹450 flat), Hamali/Handling (₹15/pkg), and Transit Risk (0.5% declared value)."
        ],
        [
            "FreightCostEvent\n(freight_cost_events)",
            "PK: id (UUID)\nFK: organization_id, consignment_id\nFK: contract_id",
            "event_type (String 50)\ngross_cost (Numeric 14, 2)\nnet_cost (Numeric 14, 2)\ncurrency (String 10)\ncreated_at (DateTime)",
            "Immutable fact table recording rated consignment cost occurrences linked directly to DOC-34 consignment dispatches."
        ],
        [
            "FreightCalculationSnapshot\n(freight_calc_snapshots)",
            "PK: id (UUID)\nFK: event_id -> freight_cost_events.id",
            "input_payload (JSON)\nrate_rule_applied (JSON)\nancillary_breakdown (JSON)\nformula_trace (Text)\nsha256_hash (String 64)",
            "Frozen explainability payload capturing exact weight inputs, applied slabs, surcharges, and formula steps for regulatory audit."
        ],
        [
            "FreightAllocation\n(freight_allocations)",
            "PK: id (UUID)\nFK: event_id -> freight_cost_events.id\nFK: invoice_id -> sales_invoices.id",
            "allocation_method (WEIGHT, VALUE, PKG, EQUAL)\nallocated_cost (Numeric 14, 2)\nallocated_pct (Numeric 6, 2)",
            "Proportional splitting of master consignment freight across multiple sales invoices or stock transfers packed in the same shipment."
        ],
        [
            "FreightRecovery\n(freight_recoveries)",
            "PK: id (UUID)\nFK: allocation_id -> freight_allocations.id\nFK: customer_id, principal_id",
            "recovery_target (CUSTOMER, PRINCIPAL, SUBSIDY)\nrecovery_amount (Numeric 14, 2)\nbilling_status (PENDING, BILLED, RECOVERED)",
            "Commercial recovery ledger mapping customer freight charges and principal reimbursements without polluting carrier cost ledgers."
        ],
        [
            "FreightReconciliation\n(freight_reconciliations)",
            "PK: id (UUID)\nFK: contract_id -> freight_contracts.id",
            "statement_ref (String 100)\ncarrier_billed_val (Numeric 14, 2)\nsystem_expected_val (Numeric 14, 2)\nvariance_val (Numeric 14, 2)\nstatus (MATCHED, TOLERABLE, UNAPPROVED_EXCESS, DISPUTED, POSTED)",
            "Three-way audit workbench matching transporter invoices against system estimated costs with automated tolerance evaluation."
        ],
        [
            "FreightCostBearerPolicy\n(freight_cost_bearer_policies)",
            "PK: id (UUID)\nFK: organization_id -> organizations.id",
            "scope (GLOBAL, CLIENT, ROUTE)\nbearer (ADMIN, CLIENT, RECIPIENT)\ngl_account_code (String 20: 5200)\nis_active (Boolean)",
            "Configures cost bearer rules, ensuring Platform Admin-funded cargo routes directly to GL Account 5200 without client ledger debits."
        ],
        [
            "FreightException\n(freight_exceptions)",
            "PK: id (UUID)\nFK: reconciliation_id -> freight_reconciliations.id",
            "exception_type (RATE_MISMATCH, WEIGHT_VARIANCE, UNAPPROVED_ANCILLARY)\namount (Numeric 14, 2)\nstatus (OPEN, RESOLVED, WAIVED)",
            "Dispute tracking records for unapproved transporter surcharges requiring carrier credit notes or supervisor waivers."
        ]
    ]
    style_table(frt_schema_table, [1.3, 1.4, 1.6, 2.2], frt_sch_headers, frt_sch_data)
    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    add_h2("21.2 RESTful API Directory (/api/freight/*)")
    add_p(
        "DOC-35 services are mounted under /api/freight with JWT multi-tenant organization filtering and strict Pydantic payload models:"
    )

    frt_api_table = doc.add_table(rows=1, cols=4)
    frt_api_headers = ["HTTP Method & Route", "Request Parameters / Payload", "Response Structure", "Operational Workflow & Invariant Impact"]
    frt_api_data = [
        [
            "GET /api/freight/summary",
            "Headers: Authorization: Bearer <JWT>\nQuery: None",
            "{summary: {active_contracts, total_spend, total_recoveries, logistics_margin, pending_recons_count, tolerable_recons_count}}",
            "Feeds executive telemetry cards on Freight Rate Master and Reconciliation Desk, reporting net spend, recoveries, and margin."
        ],
        [
            "GET /api/freight/contracts",
            "Headers: Authorization: Bearer <JWT>\nQuery: transporter_id (Optional UUID)",
            "{contracts: [{id, contract_code, contract_name, priority, lanes: [...], rate_rules: [...], ancillaries: [...]}]}",
            "Retrieves full transporter rate cards with nested origin/destination lanes, weight slabs, and ancillary surcharge rules."
        ],
        [
            "POST /api/freight/contracts",
            "Payload: {contract_code, contract_name, transporter_id, valid_from, valid_to, priority, lanes: [...]}",
            "{status: 'SUCCESS', contract: {id, contract_code, status: 'ACTIVE'}}",
            "Registers new carrier rate contract with origin-destination pincodes, tiered rate slabs, and mandatory surcharge bindings."
        ],
        [
            "POST /api/freight/calculate",
            "Payload: {origin_pincode, dest_pincode, gross_weight_kg, length_cm, width_cm, height_cm, declared_value, ancillary_codes: [...]}",
            "{calculated_cost: {gross_cost, base_freight, chargeable_weight, formula_trace, ancillary_breakdown, bearer_policy}}",
            "Deterministic rate calculation sandbox evaluating volumetric CBM ($L \\times W \\times H / 1,000,000$), tiered slabs, and ancillary items."
        ],
        [
            "GET /api/freight/events",
            "Headers: Authorization: Bearer <JWT>\nQuery: consignment_id (Optional UUID)",
            "{events: [{id, consignment_id, gross_cost, net_cost, calc_snapshot: {...}, created_at}]}",
            "Auditable list of calculated freight cost events with embedded snapshot hashes and formula explainability traces."
        ],
        [
            "POST /api/freight/allocate",
            "Payload: {event_id, allocation_method: 'WEIGHT'|'VALUE'|'PACKAGE'|'EQUAL', invoice_ids: [...]}",
            "{status: 'SUCCESS', allocations: [{invoice_id, allocated_amount, allocated_pct}]}",
            "Proportionally distributes consignment freight across individual sales invoices packaged in the same shipment."
        ],
        [
            "GET /api/freight/reconciliation",
            "Headers: Authorization: Bearer <JWT>\nQuery: status (Optional str)",
            "{reconciliations: [{id, statement_ref, carrier_billed_val, system_expected_val, variance_val, status}]}",
            "Lists transporter billing statements with three-way variance status tagging (MATCHED, TOLERABLE, UNAPPROVED_EXCESS, DISPUTED)."
        ],
        [
            "POST /api/freight/reconciliation",
            "Payload: {statement_ref, contract_id, carrier_billed_val, consignment_ids: [...]}",
            "{status: 'SUCCESS', reconciliation: {id, variance_val, status: 'TOLERABLE'|'UNAPPROVED_EXCESS'}}",
            "Records transporter invoice for automated three-way matching against system rated costs with variance calculation."
        ],
        [
            "POST /api/freight/reconciliation/{id}/action",
            "Path: id (UUID)\nPayload: {action: 'APPROVE'|'DISPUTE'|'POST_GL', notes: str}",
            "{status: 'SUCCESS', reconciliation: {id, status, gl_posting_ref}}",
            "Executes 1-click invoice approval, dispute logging, or automated double-entry GL posting to Platform Admin Account 5200."
        ],
        [
            "GET /api/freight/policies",
            "Headers: Authorization: Bearer <JWT>",
            "{policies: [{id, scope, bearer, gl_account_code: '5200', is_active: true}]}",
            "Returns active cost-bearer policies confirming Client Company GL protection and Platform Admin GL recognition."
        ]
    ]
    style_table(frt_api_table, [1.6, 1.4, 1.6, 1.9], frt_api_headers, frt_api_data)
    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    add_h2("21.3 Terminal Cockpits, Screen Layouts, Hotkeys & UI Element Catalog")
    add_p(
        "DOC-35 provides two high-density Marg/Tally terminal cockpits designed for rapid zero-mouse operation:"
    )
    add_p("1. Freight Rate Master (/freight/contracts): Features 4 top KPI telemetry cards, rate card matrix, and an interactive Calculation Sandbox [F4] with live parameter inputs and formula breakdown.")
    add_p("2. Transporter Billing & Reconciliation Desk (/freight/reconciliation): Features 4 statement status KPI cards, three-way match audit grid, manual bill entry modal [F6], and 1-click GL posting to Account 5200.")
    add_p("3. Counter Workbench Launcher: Added #hub-btn-freight-management launcher tile to the Home Screen with global hotkey [Ctrl+2].")
    add_p("4. Zero-Mouse Operational Guarantee: 100% keyboard navigable with [F6] New Contract/Bill modal, [F4] Sandbox toggle, and [Esc] hierarchical dismissal.")

    frt_ui_table = doc.add_table(rows=1, cols=4)
    frt_ui_headers = ["Screen / Cockpit Location", "Element ID Selector", "Input / Control Type", "Operational Role & Zero-Mouse Trigger"]
    frt_ui_data = [
        [
            "Counter Workbench (/)",
            "#hub-btn-freight-management",
            "Hub Tile Button [Ctrl+2]",
            "Global launcher tile on Home Screen navigating directly to Freight Rate Master (/freight/contracts)."
        ],
        [
            "Freight Rate Master (/freight/contracts)",
            "#kpi-active-contracts",
            "Telemetry Metric Card",
            "Displays total active transporter rate contracts with configured slabs and lanes."
        ],
        [
            "Freight Rate Master (/freight/contracts)",
            "#kpi-freight-spend",
            "Telemetry Metric Card",
            "Displays gross freight expense recognized under Platform Admin General Ledger."
        ],
        [
            "Freight Rate Master (/freight/contracts)",
            "#kpi-total-recoveries",
            "Telemetry Metric Card",
            "Displays aggregate freight recoveries billed to customers and principals."
        ],
        [
            "Freight Rate Master (/freight/contracts)",
            "#kpi-logistics-margin",
            "Telemetry Metric Card",
            "Displays net logistics margin calculated as Total Recoveries minus Transporter Costs."
        ],
        [
            "Freight Rate Master (/freight/contracts)",
            "#btn-switch-tab-sandbox",
            "Tab Button [F4]",
            "Toggles interactive deterministic calculation sandbox for rating simulations."
        ],
        [
            "Freight Rate Master (/freight/contracts)",
            "#sandbox-origin-pincode",
            "Input Field",
            "Origin pincode input for automatic lane matching."
        ],
        [
            "Freight Rate Master (/freight/contracts)",
            "#sandbox-dest-pincode",
            "Input Field",
            "Destination pincode input for automatic lane matching."
        ],
        [
            "Freight Rate Master (/freight/contracts)",
            "#sandbox-weight-input",
            "Input Field",
            "Consignment gross weight in kg for tiered slab rating."
        ],
        [
            "Freight Rate Master (/freight/contracts)",
            "#sandbox-declared-value",
            "Input Field",
            "Declared shipment invoice value for percentage-based risk surcharges."
        ],
        [
            "Freight Rate Master (/freight/contracts)",
            "#btn-execute-calc",
            "Action Button [Enter]",
            "Executes deterministic rate calculation and renders formula breakdown trace."
        ],
        [
            "Freight Rate Master (/freight/contracts)",
            "#card-calc-result",
            "Display Card",
            "Renders gross calculated freight cost, formula trace, and bound GL Account 5200 badge."
        ],
        [
            "Freight Rate Master (/freight/contracts)",
            "#btn-new-contract",
            "Action Button [F6]",
            "Opens modal dialog to register new carrier contract (#modal-new-contract)."
        ],
        [
            "Freight Rate Master (/freight/contracts)",
            "#modal-new-contract",
            "Modal Dialog [Esc]",
            "Form to capture contract code, carrier name, lanes, and rate slabs; dismisses via Esc."
        ],
        [
            "Reconciliation Desk (/freight/reconciliation)",
            "#kpi-total-recons",
            "Telemetry Metric Card",
            "Displays total transporter statements queued for three-way audit."
        ],
        [
            "Reconciliation Desk (/freight/reconciliation)",
            "#kpi-recons-matched",
            "Telemetry Metric Card",
            "Displays statements verified with exact ₹0.00 variance."
        ],
        [
            "Reconciliation Desk (/freight/reconciliation)",
            "#kpi-recons-tolerable",
            "Telemetry Metric Card",
            "Displays statements with acceptable variance (<= ₹200.00) eligible for approval."
        ],
        [
            "Reconciliation Desk (/freight/reconciliation)",
            "#kpi-recons-disputed",
            "Telemetry Metric Card",
            "Displays statements with unapproved excess charges (> ₹200.00) flagged for dispute."
        ],
        [
            "Reconciliation Desk (/freight/reconciliation)",
            "#btn-enter-transporter-bill",
            "Action Button [F6]",
            "Opens modal dialog to enter manual transporter invoice for audit (#modal-enter-transporter-bill)."
        ],
        [
            "Reconciliation Desk (/freight/reconciliation)",
            "#modal-enter-transporter-bill",
            "Modal Dialog [Esc]",
            "Form to enter carrier invoice reference, billed amount, and LR references; dismisses via Esc."
        ],
        [
            "Reconciliation Desk (/freight/reconciliation)",
            "#btn-post-gl",
            "Action Button",
            "Executes 1-click GL journal creation, posting approved freight cost to Account 5200."
        ]
    ]
    style_table(frt_ui_table, [1.5, 1.7, 1.2, 2.1], frt_ui_headers, frt_ui_data)
    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    add_h2("21.4 Local Automated Selenium Verification Suite (10 Stages - 100% PASS)")
    add_p(
        "DOC-35 was verified using test_freight_logistics_selenium.py executing on headless Chrome (1440x950) "
        "against the local backend (Port 8000) and frontend (Port 50005). All 10 stages completed with 100% pass rate:"
    )

    frt_local_table = doc.add_table(rows=1, cols=4)
    frt_loc_headers = ["Verification Stage & Scope", "Execution Command / Target", "Automated Assertions & Validation Criteria", "Test Result"]
    frt_loc_data = [
        [
            "Stage 1: API Authentication",
            "POST /auth/login\n(admin / Admin@123)",
            "HTTP 200 OK. Acquired JWT token. Validated organization tenant scope and session storage injection.",
            "100% PASS\n(Exit 0)"
        ],
        [
            "Stage 2: Summary Telemetry Audit",
            "GET /api/freight/summary",
            "HTTP 200 OK. Verified active contracts >= 2, total spend, total recoveries, and pending reconciliation queues.",
            "100% PASS\n(Exit 0)"
        ],
        [
            "Stage 3: Transporter Rate Cards",
            "GET /api/freight/contracts",
            "HTTP 200 OK. Verified active contracts (V-Trans Logistics, Safexpress), origin/destination lanes, and tiered slabs.",
            "100% PASS\n(Exit 0)"
        ],
        [
            "Stage 4: Deterministic Rating Engine",
            "POST /api/freight/calculate",
            "HTTP 200 OK. Calculated 350kg consignment on Lane DEL-MUM. Asserted base freight, surcharges, and formula trace.",
            "100% PASS\n(Exit 0)"
        ],
        [
            "Stage 5: Admin Cost Bearer Invariant",
            "GET /api/freight/policies",
            "HTTP 200 OK. Verified Platform Admin bearer policy; confirmed Account 5200 binding and zero client GL debits.",
            "100% PASS\n(Exit 0)"
        ],
        [
            "Stage 6: 3-Way Reconciliation Audit",
            "GET /api/freight/reconciliation",
            "HTTP 200 OK. Verified statement matching, tolerance checks (<= ₹200.00), and UNAPPROVED_EXCESS status tags.",
            "100% PASS\n(Exit 0)"
        ],
        [
            "Stage 7: Headless Browser Init",
            "Chrome Options: --headless=new\nViewport: 1440x950",
            "WebDriver initialized with GPU disabled, no-sandbox, and session storage auth injection.",
            "100% PASS\n(Exit 0)"
        ],
        [
            "Stage 8: Counter Workbench Launcher",
            "driver.get('http://localhost:50005/')",
            "Located #hub-btn-freight-management launcher tile on Counter Workbench. Captured verified_freight_homescreen_launcher.png.",
            "100% PASS\n(Exit 0)"
        ],
        [
            "Stage 9: Rate Master & Sandbox [F4]",
            "driver.get('http://localhost:50005/freight/contracts')",
            "Verified 4 top KPI cards. Switched to Sandbox [F4], executed calculation, and captured verified_freight_rate_cards_catalog.png & verified_freight_calculation_sandbox.png.",
            "100% PASS\n(Exit 0)"
        ],
        [
            "Stage 10: Reconciliation & Esc Modal",
            "driver.get('http://localhost:50005/freight/reconciliation')",
            "Verified reconciliation grid, opened #modal-enter-transporter-bill [F6], tested [Esc] dismissal. Captured verified_freight_reconciliation_desk.png.",
            "100% PASS\n(Exit 0)"
        ]
    ]
    style_table(frt_local_table, [1.2, 1.8, 2.6, 0.9], frt_loc_headers, frt_loc_data)
    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    add_h2("21.5 Live Vercel Production Cloud Verification Suite (4 Stages - 100% PASS)")
    add_p(
        "Following local testing, the live production deployment on Vercel CDN (https://erp-rho-three.vercel.app) was "
        "audited via verify_live_vercel_freight_audit.py using the automated demo authentication hook (#btn-demo-login). "
        "All 4 stages completed with 100% pass rate confirming zero cloud regressions:"
    )

    frt_cloud_table = doc.add_table(rows=1, cols=4)
    frt_cld_headers = ["Cloud Audit Stage & Scope", "Live Target URL & Trigger", "Automated Cloud Assertions & Validation Criteria", "Production Status"]
    frt_cld_data = [
        [
            "Stage 1: Production Auth & Launcher",
            "https://erp-rho-three.vercel.app/\nTrigger: #btn-demo-login",
            "Authenticated as Admin. Located #hub-btn-freight-management on live Counter Workbench. Captured live_vercel_freight_homescreen_launcher.png.",
            "100% PASS\n(Live Cloud)"
        ],
        [
            "Stage 2: Live Rate Master Telemetry",
            "https://erp-rho-three.vercel.app/freight/contracts",
            "Verified 4 live telemetry KPI cards (#kpi-active-contracts, #kpi-freight-spend, etc.) on Vercel CDN. Captured live_vercel_freight_rate_master.png.",
            "100% PASS\n(Live Cloud)"
        ],
        [
            "Stage 3: Live Calculation Sandbox [F4]",
            "https://erp-rho-three.vercel.app/freight/contracts\nTrigger: [F4] Sandbox Tab",
            "Switched to Sandbox [F4], input test parameters, clicked #btn-execute-calc, verified formula breakdown. Captured live_vercel_freight_calculation_sandbox.png.",
            "100% PASS\n(Live Cloud)"
        ],
        [
            "Stage 4: Live Reconciliation Desk",
            "https://erp-rho-three.vercel.app/freight/reconciliation",
            "Verified live statement audit grid, 3-way variance status badges, and GL 5200 posting readiness. Captured live_vercel_freight_reconciliation.png.",
            "100% PASS\n(Live Cloud)"
        ]
    ]
    style_table(frt_cloud_table, [1.2, 1.8, 2.6, 0.9], frt_cld_headers, frt_cld_data)
    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    add_h2("21.6 Visual Proof of Verification & Photographic Evidence (8 Production Screenshots)")
    add_p(
        "Below are the 8 publication-grade visual verification screenshots captured during automated local headless Selenium "
        "and live Vercel production testing, providing indisputable proof of operational readiness, terminal ergonomics, and "
        "zero-mouse hotkey execution for DOC-35:"
    )

    # 4 Local Verified Screenshots
    add_screenshot(
        "verified_freight_homescreen_launcher.png",
        "Figure 21.1: Local Verified Counter Workbench (/) displaying the dedicated Freight & Logistics Cost Recovery launcher tile (#hub-btn-freight-management) mapped to global hotkey [Ctrl+2]."
    )
    add_screenshot(
        "verified_freight_rate_cards_catalog.png",
        "Figure 21.2: Local Verified Freight Rate Master (/freight/contracts) displaying 4 top telemetry KPI cards, carrier rate cards, and origin-destination lane pricing matrices."
    )
    add_screenshot(
        "verified_freight_calculation_sandbox.png",
        "Figure 21.3: Local Verified Calculation Sandbox [F4] displaying interactive parameter inputs, live tiered slab rating, ancillary breakdown, and formula explainability trace."
    )
    add_screenshot(
        "verified_freight_reconciliation_desk.png",
        "Figure 21.4: Local Verified Transporter Billing & Reconciliation Desk (/freight/reconciliation) displaying three-way match statement grid with variance status badges."
    )

    # 4 Live Vercel Production Cloud Screenshots
    add_screenshot(
        "live_vercel_freight_homescreen_launcher.png",
        "Figure 21.5: Live Vercel Production Cloud Verification (https://erp-rho-three.vercel.app/) confirming seamless authentication and Counter Workbench launcher presence on production CDN."
    )
    add_screenshot(
        "live_vercel_freight_rate_master.png",
        "Figure 21.6: Live Vercel Production Cloud Freight Rate Master (/freight/contracts) validating live telemetry KPI cards and carrier rate matrices on production CDN."
    )
    add_screenshot(
        "live_vercel_freight_calculation_sandbox.png",
        "Figure 21.7: Live Vercel Production Cloud Calculation Sandbox [F4] validating live deterministic rate resolution and formula traces on production CDN."
    )
    add_screenshot(
        "live_vercel_freight_reconciliation.png",
        "Figure 21.8: Live Vercel Production Cloud Transporter Reconciliation Desk (/freight/reconciliation) validating three-way audit matching and GL 5200 posting readiness on production CDN."
    )

    doc.add_paragraph().paragraph_format.space_after = Pt(12)

    # ==========================================
    # SECTION 22: PRINCIPAL & C&F OPERATIONS MANAGEMENT ENGINE (DOC-36)
    # ==========================================
    add_h1("22. Principal & C&F Operations Management Engine (DOC-36)")
    add_p(
        "DOC-36 establishes an institutional-grade operational engine that transforms static Principal and C&F master "
        "records into a continuously auditable, traceable, and reconstructable operating position. In modern pharmaceutical "
        "distribution networks, Clearing & Forwarding (C&F) agents and super-distributors handle consignment inventories on "
        "behalf of multiple pharmaceutical manufacturers (Principals). Operating under diverse commercial agreements, tiered "
        "commission rates, strict credit windows, and complex freight recovery policies, enterprises face severe financial "
        "and statutory risks if stock ownership commingles or ledger reconciliations drift. DOC-36 solves this challenge by "
        "providing end-to-end custody segregation, automated three-way reconciliation, dispute-proof operational claims management, "
        "and non-editable reconstructable statements."
    )

    add_callout(
        "DOC-36 ARCHITECTURAL INVARIANTS & CORE GOVERNANCE RULES:\n"
        "1. Zero Duplicate Engines: DOC-36 orchestrates Principal context across DOC-12 (Master), DOC-14 (Schemes), DOC-16 (Stock Movement), DOC-08 (GL Postings), DOC-07 (Settlements), and DOC-35 (Freight) without duplicate ledgers.\n"
        "2. Owner Separation at SKU/Batch Level: Principal ownership is an explicit relational dimension. Multiple Principals can stock identical SKUs in the same warehouse without cross-owner stock pollution or commingling.\n"
        "3. Non-Editable Reconstructable Statements: Principal stock statements and commercial balances are mathematically reconstructed from source movements and immutable events. Manual balance overrides are strictly prohibited.\n"
        "4. Reconciliation Variance Immutability: Reconciliation cannot alter historical transaction ledgers; variances generate audit trails and follow-up adjustment or claim documents with four-eyes approval.",
        prefix="DOC-36 CORE MANDATE: "
    )

    add_h2("22.1 Implemented Relational Schema & Relational Models (16 Models)")
    add_p(
        "DOC-36 introduces 16 high-performance relational entities mapped via SQLAlchemy 2.0 with strict foreign key constraints, "
        "multi-tenant organization scoping, and cryptographic verification hashes. The schema architecture isolates custody "
        "from legal ownership, models effective-dated agreement terms, and maintains point-in-time stock snapshots:"
    )

    schema_table = doc.add_table(rows=1, cols=4)
    sch_headers = ["Model Name & Table", "Primary & Foreign Keys", "Core Attributes & Data Types", "Operational Mandate & Governance Role"]
    sch_data = [
        [
            "PrincipalOperatingContext\n(principal_operating_contexts)",
            "PK: id (UUID)\nFK: company_id -> organizations.id\nFK: principal_id, branch_id",
            "principal_code (String 50)\nprincipal_name (String 200)\nagreement_version_id (UUID)\nstatus (String 40: ACTIVE, SUSPENDED, TERMINATED)\ncreated_at, updated_at",
            "Primary multi-tenant operational anchor binding client organization to external pharmaceutical principal with branch-level scoping and status control."
        ],
        [
            "PrincipalAgreementVersion\n(principal_agreement_versions)",
            "PK: id (UUID)\nFK: principal_id",
            "agreement_number (String 80)\nversion_no (String 20)\nvalid_from, valid_to (DateTime)\nterms_json (JSON)\nstatus (DRAFT, ACTIVE, SUPERSEDED, EXPIRED)",
            "Effective-dated commercial terms, commission percentages (e.g., 6.5%), claim dispute windows, credit periods, and authorized freight allowance models."
        ],
        [
            "PrincipalProductRule\n(principal_product_rules)",
            "PK: id (UUID)\nFK: principal_id, product_id\nFK: branch_id, warehouse_id",
            "product_name (String 200)\nsku_code (String 100)\nis_exclusive (Boolean)\nvalid_from, valid_to (DateTime)\nstatus (ACTIVE, INACTIVE, RESTRICTED)",
            "Authorized product catalog constraints, exclusive SKU allocations per branch, and designated depot warehouse storage boundaries."
        ],
        [
            "PrincipalCustomerRule\n(principal_customer_rules)",
            "PK: id (UUID)\nFK: principal_id, customer_id",
            "customer_group (String 100)\nterritory_id, territory_name (String)\nvalid_from, valid_to (DateTime)\nstatus (ACTIVE, INACTIVE)",
            "Territory boundaries and customer group eligibility, enforcing authorized distribution channels for principal-consigned products."
        ],
        [
            "PrincipalOwnershipRule\n(principal_ownership_rules)",
            "PK: id (UUID)\nFK: principal_id",
            "product_scope (ALL, CATEGORY, SKU)\nwarehouse_scope (ALL, SPECIFIC_WH)\nmode (CONSIGNMENT_CUSTODY, OUTRIGHT_PURCHASE, PRINCIPAL_OWNED)\nvalid_from, valid_to",
            "Inviolable stock custody classification preventing commingling and inventory pollution when identical generic drugs are stocked across different principals."
        ],
        [
            "PrincipalEvent\n(principal_events)",
            "PK: id (UUID)\nFK: company_id -> organizations.id\nFK: principal_id",
            "event_type (String 60)\nevent_time (DateTime)\nsource_doc_type (String 50)\nsource_doc_id (String 100)\npayload_json (JSON)\npayload_hash (String 64: SHA-256)",
            "Cryptographically hashed append-only commercial event ledger providing mathematical immutability and complete event-sourcing traceability."
        ],
        [
            "PrincipalStockSnapshot\n(principal_stock_snapshots)",
            "PK: id (UUID)\nFK: principal_id, product_id\nFK: warehouse_id",
            "product_name (String 200)\nbatch_no (String 100)\nwarehouse_name (String 100)\nas_of (DateTime)\nqty_on_hand, qty_reserved, qty_damage\nunit_cost, total_valuation",
            "Point-in-time frozen inventory positions segregated by SKU and batch, supporting instant historical reconstruction and discrepancy auditing."
        ],
        [
            "PrincipalClaim\n(principal_claims)",
            "PK: id (UUID)\nUnique: claim_number\nFK: principal_id",
            "principal_name (String 200)\nclaim_type (EXPIRY, BREAKAGE, SHORTAGE, RATE_DIFFERENCE)\nsource_doc_id (String 100)\nclaimed_qty, claimed_amount, approved_amount\nreason, status (PENDING, APPROVED, etc.)",
            "Operational claim document capturing loss events with batch provenance, dispute resolution workflows, and four-eyes settlement authorization."
        ],
        [
            "PrincipalClaimLine\n(principal_claim_lines)",
            "PK: id (UUID)\nFK: claim_id -> principal_claims.id\nFK: product_id",
            "source_movement_id (String 100)\nbatch_no (String 100)\nexpiry_date (DateTime)\nqty, eligible_qty, rate, amount\napproved_amount, status",
            "Granular line-item breakdown linking each claimed unit directly to DOC-16 stock movements and batch expiry records."
        ],
        [
            "PrincipalReconciliation\n(principal_reconciliations)",
            "PK: id (UUID)\nUnique: recon_number\nFK: principal_id",
            "period_from, period_to (DateTime)\nsystem_opening_val, external_opening_val\nsystem_closing_val, external_closing_val\nnet_variance_val, matched_lines_count\nvariance_lines_count, status (APPROVED, etc.)",
            "Automated three-way reconciliation header record comparing system stock valuation against external Principal-submitted statement balances."
        ],
        [
            "PrincipalReconciliationLine\n(principal_reconciliation_lines)",
            "PK: id (UUID)\nFK: reconciliation_id -> principal_reconciliations.id",
            "source_key (String 100)\nsource_type (SALE, INWARD, RETURN, CLAIM)\nsystem_qty, external_qty, variance_qty\nsystem_val, external_val, variance_val\nreason_code, status (MATCHED, VARIANCE)",
            "Itemized transaction matching line detecting quantity and valuation discrepancies with automated root-cause reason tagging."
        ],
        [
            "PrincipalStatementRun\n(principal_statement_runs)",
            "PK: id (UUID)\nUnique: run_number\nFK: principal_id",
            "period_from, period_to (DateTime)\nfilters_hash (String 64)\nsource_versions (String 100)\nopening_stock_val, receipts_val, sales_val\nreturns_val, claims_val, freight_val, closing_val",
            "Authoritative period statement snapshot with dataset hash signature, freezing financial and inventory figures against retroactive tampering."
        ],
        [
            "PrincipalStatementLine\n(principal_statement_lines)",
            "PK: id (UUID)\nFK: run_id -> principal_statement_runs.id",
            "event_id (UUID)\nsource_doc_id (String 100)\ncategory (OPENING, INWARD, SALE, RETURN, CLAIM, FREIGHT, CLOSING)\nproduct_name, batch_no, qty, amount, status",
            "Individual transaction line in the reconstructable statement maintaining complete backward audit linkage to source transaction vouchers."
        ],
        [
            "PrincipalCostAttribution\n(principal_cost_attributions)",
            "PK: id (UUID)\nFK: principal_id\nRef: source_cost_id -> DOC-35",
            "bearer (ADMIN_COMPANY, PRINCIPAL, CLIENT_COMPANY)\nrecovery_target (PRINCIPAL_CLAIM, SUBSIDY)\namount (Numeric 18, 2)\npolicy_version, status (ATTRIBUTED, ABSORBED)",
            "Direct integration with DOC-35 Freight Engine attributing logistics costs, transporter billings, and Admin GL 5200 subsidies to principal accounts."
        ],
        [
            "PrincipalCommissionRef\n(principal_commission_refs)",
            "PK: id (UUID)\nFK: principal_id, source_event_id\nRef: commission_doc_id -> DOC-37",
            "gross_sales_val (Numeric 18, 2)\ncommission_rate_pct (Numeric 6, 2)\ncommission_amount (Numeric 18, 2)\nstatus (ACCRUED, BILLED, SETTLED)",
            "Commercial settlement reference connecting dispatched sales throughput to earned C&F commission without duplicate accounting journals."
        ],
        [
            "PrincipalSyncCheckpoint\n(principal_sync_checkpoints)",
            "PK: id (UUID)\nFK: company_id -> organizations.id\nFK: principal_id",
            "scope_key (STOCK, CLAIMS, RECON, EVENTS)\ncursor (String 100)\nhash (String 64: SHA-256)\nsynced_at (DateTime)",
            "Distributed state synchronization cursor ensuring complete ledger consistency between central C&F depots and peripheral distribution branches."
        ]
    ]
    style_table(schema_table, [1.3, 1.4, 1.6, 2.2], sch_headers, sch_data)
    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    add_h2("22.2 RESTful API Directory (/api/principal/*)")
    add_p(
        "All DOC-36 backend services are exposed under the /api/principal namespace with mandatory JWT authentication, "
        "organization tenant isolation, and strict parameter validation via Pydantic schemas:"
    )

    api_table = doc.add_table(rows=1, cols=4)
    api_headers = ["HTTP Method & Route", "Request Parameters / Payload", "Response Structure", "Operational Workflow & Invariant Impact"]
    api_data = [
        [
            "GET /api/principal/summary",
            "Headers: Authorization: Bearer <JWT>\nQuery: None",
            "{summary: {active_principals_count, total_stock_value, total_stock_quantity, pending_claims_value, approved_reconciliations_count, admin_funded_freight}}",
            "Feeds executive telemetry cards on the Control Center. Aggregates custody valuation, open claim liability, and Platform Admin freight subsidies (Account 5200)."
        ],
        [
            "GET /api/principal/list",
            "Headers: Authorization: Bearer <JWT>\nQuery: search (Optional str)",
            "{principals: [{id, principal_code, principal_name, agreement_number, agreement_version, commission_rate_pct, total_stock_val, status}]}",
            "Searchable catalog of registered pharmaceutical principals with active agreement terms, commission percentages, and live stock holding figures."
        ],
        [
            "GET /api/principal/{id}/position",
            "Headers: Authorization: Bearer <JWT>\nPath: id (UUID: principal_id)",
            "{position: {principal: {...}, stock_summary: {...}, stock_lines: [...], sales_movements: [...], open_claims: [...], cost_attributions: [...], reconciliations: [...]}}",
            "Comprehensive operational position retrieving SKU/batch custody segregation, batch expiry dates, recent dispatches, open breakage claims, and freight subsidies."
        ],
        [
            "GET /api/principal/{id}/statement",
            "Headers: Authorization: Bearer <JWT>\nPath: id (UUID)\nQuery: period_from, period_to",
            "{statement: {run_number, period, opening_stock, receipts, sales, returns, claims, freight_costs, closing_stock, lines: [...]}}",
            "Reconstructs non-editable period business statement from source vouchers and immutable event logs; enforces Zero Balance Override invariant."
        ],
        [
            "POST /api/principal/claims",
            "Payload: {principal_id, claim_type, source_doc_type, source_doc_id, product_name, batch_no, claimed_qty, rate, reason, evidence_url}",
            "{status: 'SUCCESS', claim: {id, claim_number, claimed_amount, status: 'PENDING'}}",
            "Registers operational claim (Expiry, Breakage, Shortage) with automated number generation (CLM-PRN-YYYY-XXXX), batch provenance, and audit logging."
        ],
        [
            "POST /api/principal/claims/{id}/action",
            "Path: id (UUID: claim_id)\nPayload: {action: 'APPROVE'|'DISPUTE'|'PASS_TO_SETTLEMENT'|'REJECT', approved_amount, resolution_notes}",
            "{status: 'SUCCESS', claim: {id, claim_number, status, approved_amount}}",
            "Executes multi-stage approval workflow on operational claims without historical ledger tampering, updating claim lifecycle state and settlement linkages."
        ],
        [
            "GET /api/principal/reconciliations",
            "Headers: Authorization: Bearer <JWT>\nQuery: principal_id (Optional UUID)",
            "{reconciliations: [{id, recon_number, period_from, period_to, system_closing_val, external_closing_val, net_variance_val, status, lines_count}]}",
            "Lists historical three-way reconciliation matching runs with net variance metrics, line counts, approval timestamps, and audit status flags."
        ],
        [
            "POST /api/principal/reconciliation/run",
            "Payload: {principal_id, period_from, period_to, external_closing_val, discrepancy_reason}",
            "{status: 'SUCCESS', reconciliation: {id, recon_number, net_variance_val, matched_lines_count, status: 'APPROVED'}}",
            "Executes automated three-way matching engine comparing system valuation against external principal statements, logging variance items and audit trails."
        ]
    ]
    style_table(api_table, [1.6, 1.4, 1.6, 1.9], api_headers, api_data)
    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    add_h2("22.3 Terminal Cockpits, Screen Layouts, Hotkeys & UI Element Catalog")
    add_p(
        "DOC-36 features two dedicated high-density terminal cockpits adhering to the system's Marg/Tally keyboard-first "
        "design standards, styled with forest green (#15803d) luxury accents and instant zero-mouse navigation:"
    )
    add_p("1. Principal Operational Control Center (/principal): Houses 5 top telemetry KPI cards, agreement terms banner, and 5 functional tabs switchable via hotkeys [F2] through [F6]. Includes the New Claim modal dialog triggered via [F7].")
    add_p("2. Principal Business Statement Desk (/principal/statement): Full-screen drill-down reconstructable statement workbench with principal selector, transaction category filters, native print formatting, and complete backward audit traceability.")
    add_p("3. Counter Workbench Launcher: Added #hub-btn-principal-management tile to the Home Screen with global shortcut [Ctrl+3].")
    add_p("4. Hierarchical [Esc] Lifecycle: Universal Escape key listener safely dismisses active modals and slide-over drawers without unintended page redirects.")

    ui_table = doc.add_table(rows=1, cols=4)
    ui_headers = ["Screen / Cockpit Location", "Element ID Selector", "Input / Control Type", "Operational Role & Zero-Mouse Trigger"]
    ui_data = [
        [
            "Counter Workbench (/)",
            "#hub-btn-principal-management",
            "Hub Tile Button [Ctrl+3]",
            "Global launcher tile on Home Screen navigating directly to Principal Operational Control Center."
        ],
        [
            "Principal Control Center (/principal)",
            "#kpi-active-principals",
            "Telemetry Metric Card",
            "Displays total active pharmaceutical principals with registered operational agreements."
        ],
        [
            "Principal Control Center (/principal)",
            "#kpi-total-stock-val",
            "Telemetry Metric Card",
            "Displays aggregate valuation and unit count of consignment custody inventory held across warehouses."
        ],
        [
            "Principal Control Center (/principal)",
            "#kpi-pending-claims",
            "Telemetry Metric Card",
            "Displays open claim liability value across breakage, expiry, and shortage loss events."
        ],
        [
            "Principal Control Center (/principal)",
            "#kpi-reconciled-health",
            "Telemetry Metric Card",
            "Displays approved three-way reconciliation run count and net variance health status."
        ],
        [
            "Principal Control Center (/principal)",
            "#kpi-freight-attribution",
            "Telemetry Metric Card",
            "Displays Admin-funded freight logistics subsidy (GL Account 5200) linked to DOC-35 dispatches."
        ],
        [
            "Principal Control Center (/principal)",
            "#tab-btn-stock",
            "Tab Button [F2]",
            "Activates Stock Ownership & Custody Matrix showing SKU/batch segregation and warehouse allocations."
        ],
        [
            "Principal Control Center (/principal)",
            "#tab-btn-claims",
            "Tab Button [F3]",
            "Activates Claims & Returns Desk for tracking operational claims, batch provenance, and approval actions."
        ],
        [
            "Principal Control Center (/principal)",
            "#tab-btn-recon",
            "Tab Button [F4]",
            "Activates 3-Way Reconciliation Workspace for auditing external statements against system stock."
        ],
        [
            "Principal Control Center (/principal)",
            "#tab-btn-statement",
            "Tab Button [F5]",
            "Activates embedded Authoritative Reconstructable Statement tab with opening, movements, and closing values."
        ],
        [
            "Principal Control Center (/principal)",
            "#tab-btn-mis",
            "Tab Button [F6]",
            "Activates Commercial MIS & Operational Profitability dashboard with throughput and commission tracking."
        ],
        [
            "Principal Control Center (/principal)",
            "#btn-open-claim-modal",
            "Action Button [F7]",
            "Opens modal dialog to register a new operational claim with batch linkage (#modal-new-claim)."
        ],
        [
            "Principal Control Center (/principal)",
            "#modal-new-claim",
            "Modal Dialog [Esc]",
            "Form capturing claim details (Product, Batch, Qty, Rate, Reason); dismisses cleanly via Escape key."
        ],
        [
            "Principal Statement Desk (/principal/statement)",
            "#select-statement-principal",
            "Select Dropdown",
            "Filters reconstructable business statement by specific pharmaceutical principal entity."
        ],
        [
            "Principal Statement Desk (/principal/statement)",
            "#table-statement-lines",
            "Data Grid",
            "Renders reconstructed transaction lines across Inward, Sales, Returns, Claims, and Freight categories."
        ]
    ]
    style_table(ui_table, [1.5, 1.7, 1.2, 2.1], ui_headers, ui_data)
    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    add_h2("22.4 Local Automated Selenium Verification Suite (10 Stages - 100% PASS)")
    add_p(
        "The complete full-stack implementation was validated via an automated headless Chrome Selenium verification suite "
        "(test_principal_operations_selenium.py) executing at 1440x950 resolution against the live backend (Port 8000) and "
        "Vite frontend (Port 50005). All 10 stages completed with 100% pass rate (Exit Code 0):"
    )

    local_table = doc.add_table(rows=1, cols=4)
    loc_headers = ["Verification Stage & Scope", "Execution Command / Target", "Automated Assertions & Validation Criteria", "Test Result"]
    loc_data = [
        [
            "Stage 1: API Authentication",
            "POST /auth/login\n(admin / Admin@123)",
            "HTTP 200 OK. Acquired JWT bearer token. Validated organization ID and session storage auth payload.",
            "100% PASS\n(Exit 0)"
        ],
        [
            "Stage 2: Summary Telemetry Audit",
            "GET /api/principal/summary",
            "HTTP 200 OK. Asserted >= 2 active principals, ₹105,600.00 custody valuation, 5,400 units, ₹2,450.00 pending claims, and GL 5200 subsidy.",
            "100% PASS\n(Exit 0)"
        ],
        [
            "Stage 3: Principal Catalog & Agreements",
            "GET /api/principal/list",
            "HTTP 200 OK. Asserted 2 principals: Sun Pharma Healthcare Ltd. (AGR-SUN-2026-001, 6.5% comm) and Cipla Therapeutics Ltd. (AGR-CIP-2026-002, 5.0% comm).",
            "100% PASS\n(Exit 0)"
        ],
        [
            "Stage 4: Custody Segregation Audit",
            "GET /api/principal/{id}/position",
            "HTTP 200 OK. Verified SKU/batch custody segregation (Azithromycin 250mg Tablets, Batch B-CIP-812, CONSIGNMENT_CUSTODY mode).",
            "100% PASS\n(Exit 0)"
        ],
        [
            "Stage 5: Operational Claims Workflow",
            "POST /api/principal/claims\nPOST /claims/{id}/action",
            "HTTP 200 OK. Created claim CLM-PRN-2026-0004 (BREAKAGE, ₹55.00). Executed APPROVE action; verified status transition without ledger tampering.",
            "100% PASS\n(Exit 0)"
        ],
        [
            "Stage 6: 3-Way Reconciliation Run",
            "POST /api/principal/reconciliation/run",
            "HTTP 200 OK. Executed automated match against external closing valuation. Asserted net_variance_val == 0.00, generated REC-PRN-2026-0003.",
            "100% PASS\n(Exit 0)"
        ],
        [
            "Stage 7: Headless Browser Init",
            "Chrome Options: --headless=new\nViewport: 1440x950",
            "WebDriver initialized with GPU disabled, no-sandbox, and sessionStorage auth injection.",
            "100% PASS\n(Exit 0)"
        ],
        [
            "Stage 8: Counter Workbench Integration",
            "driver.get('http://localhost:50005/')",
            "Located #hub-btn-principal-management launcher on Counter Workbench. Captured verified_principal_homescreen_launcher.png.",
            "100% PASS\n(Exit 0)"
        ],
        [
            "Stage 9: Control Center & KPI Cards",
            "driver.get('http://localhost:50005/principal')",
            "Verified all 5 Top KPI telemetry cards (#kpi-active-principals, #kpi-total-stock-val, etc.). Captured verified_principal_control_center.png.",
            "100% PASS\n(Exit 0)"
        ],
        [
            "Stage 10: Tabs Switching & Esc Modal",
            "Tab [F3], Action [F7], Key [Esc]\nTabs [F4] & [F5]",
            "Switched to Claims Desk [F3]. Opened #modal-new-claim [F7] and verified clean [Esc] dismissal. Verified Statement [F5] and Recon [F4]. Captured screenshots 3 & 4.",
            "100% PASS\n(Exit 0)"
        ]
    ]
    style_table(local_table, [1.2, 1.8, 2.6, 0.9], loc_headers, loc_data)
    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    add_h2("22.5 Live Vercel Production Cloud Verification Suite (4 Stages - 100% PASS)")
    add_p(
        "Following local verification, the live production deployment on Vercel CDN (https://erp-rho-three.vercel.app) was "
        "audited via verify_live_vercel_principal_audit.py using the automated demo authentication hook (#btn-demo-login). "
        "All 4 stages completed with 100% pass rate (Exit Code 0) confirming zero cloud regressions:"
    )

    cloud_table = doc.add_table(rows=1, cols=4)
    cld_headers = ["Cloud Audit Stage & Scope", "Live Target URL & Trigger", "Automated Cloud Assertions & Validation Criteria", "Production Status"]
    cld_data = [
        [
            "Stage 1: Production Auth & Launcher",
            "https://erp-rho-three.vercel.app/\nTrigger: #btn-demo-login",
            "Authenticated as Admin. Verified #counter-workbench-root and confirmed #hub-btn-principal-management presence. Captured live_vercel_principal_homescreen_launcher.png.",
            "100% PASS\n(Live Cloud)"
        ],
        [
            "Stage 2: Live Control Center Telemetry",
            "https://erp-rho-three.vercel.app/principal",
            "Verified all 5 Top KPI cards (#kpi-active-principals, #kpi-total-stock-val, #kpi-pending-claims, #kpi-reconciled-health, #kpi-freight-attribution). Captured live_vercel_principal_control_center.png.",
            "100% PASS\n(Live Cloud)"
        ],
        [
            "Stage 3: Live Claims Desk & Hotkey Modal",
            "https://erp-rho-three.vercel.app/principal\nTrigger: #tab-btn-claims & [F7]",
            "Switched to Claims Desk [F3]. Triggered #modal-new-claim [F7]. Verified visibility and verified instant [Esc] dismissal cleanly. Captured live_vercel_principal_claims_desk.png.",
            "100% PASS\n(Live Cloud)"
        ],
        [
            "Stage 4: Full-Screen Statement Desk",
            "https://erp-rho-three.vercel.app/principal/statement",
            "Verified full-screen authoritative statement desk with #select-statement-principal, transaction line rendering, and zero manual balance overrides. Captured live_vercel_principal_statement_desk.png.",
            "100% PASS\n(Live Cloud)"
        ]
    ]
    style_table(cloud_table, [1.2, 1.8, 2.6, 0.9], cld_headers, cld_data)
    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    add_h2("22.6 Visual Proof of Verification & Photographic Evidence (8 Production Screenshots)")
    add_p(
        "Below are the 8 publication-grade visual verification screenshots captured during automated local headless Selenium "
        "and live Vercel production testing, providing indisputable proof of operational readiness, terminal ergonomics, and "
        "zero-mouse hotkey execution:"
    )

    # 4 Local Verified Screenshots
    add_screenshot(
        "verified_principal_homescreen_launcher.png",
        "Figure 22.1: Local Verified Counter Workbench (/) displaying the dedicated Principal & C&F Operations Management hub tile (#hub-btn-principal-management) mapped to global hotkey [Ctrl+3]."
    )
    add_screenshot(
        "verified_principal_control_center.png",
        "Figure 22.2: Local Verified Principal Operational Control Center (/principal) featuring 5 top telemetry KPI cards, agreement terms banner, and the Stock Ownership & Custody Matrix tab [F2]."
    )
    add_screenshot(
        "verified_principal_claims_desk.png",
        "Figure 22.3: Local Verified Claims & Returns Desk (/principal) displaying the operational claims register, batch provenance tracking, and the New Claim Modal [F7] with [Esc] dismissal."
    )
    add_screenshot(
        "verified_principal_reconciliation_statement.png",
        "Figure 22.4: Local Verified 3-Way Reconciliation Workspace and Reconstructable Business Statement with transaction-level backward audit traceability and zero manual overrides."
    )

    # 4 Live Vercel Production Cloud Screenshots
    add_screenshot(
        "live_vercel_principal_homescreen_launcher.png",
        "Figure 22.5: Live Vercel Production Cloud Verification (https://erp-rho-three.vercel.app/) confirming seamless authentication and Counter Workbench launcher tile presence on production CDN."
    )
    add_screenshot(
        "live_vercel_principal_control_center.png",
        "Figure 22.6: Live Vercel Production Cloud Control Center (/principal) verifying live telemetry KPI cards, agreement versioning, and custody inventory monitoring."
    )
    add_screenshot(
        "live_vercel_principal_claims_desk.png",
        "Figure 22.7: Live Vercel Production Cloud Claims Desk verifying modal dialog rendering and instant [Esc] keyboard dismissal on production CDN."
    )
    add_screenshot(
        "live_vercel_principal_statement_desk.png",
        "Figure 22.8: Live Vercel Production Cloud Full-Screen Authoritative Statement Desk (/principal/statement) validating zero manual balance overrides and source-level auditability."
    )

    doc.add_paragraph().paragraph_format.space_after = Pt(12)

    # =========================================================================
    # SECTION 23: DOC-37 PRINCIPAL & C&F COMMISSION & RECOVERY ENGINE v2.0
    # =========================================================================
    add_h1("SECTION 23: DOC-37 PRINCIPAL & C&F COMMISSION & RECOVERY ENGINE v2.0")
    add_p(
        "DOC-37 establishes the enterprise commercial commission calculation and expense recovery subsystem for Principal "
        "and C&F operations. Built strictly adhering to the 4 architectural invariants, it unifies rate contract versioning, "
        "deterministic on-the-fly commission calculation, 4-eyes claim submission and approval workflows, service invoice and debit note linking, "
        "consolidated periodic recovery statement generation, and immutable SHA-256 audit trails."
    )

    add_h2("23.1 Engine Architecture, 4 Architectural Invariants & Relational Schema Directory (14 PostgreSQL Models)")
    add_p(
        "DOC-37 is engineered around four non-negotiable architectural invariants designed to prevent financial ledger corruption "
        "and ensure total auditability across multi-tier pharmaceutical distribution networks:"
    )
    add_p("1. Zero Duplicate Ledgers: DOC-37 never creates shadow accounting ledgers. Calculations, claims, and recovery statements remain operational commercial objects. Financial recognition strictly routes through DOC-08 General Ledger, DOC-29 Statutory Tax, DOC-16 Stock, and DOC-07 Settlements via standard service invoices or credit/debit notes.")
    add_p("2. Separation of Earned Commission vs Recoverable Expenses: Turnover commission (commercial income earned on goods sold) is strictly segregated from recoverable expenses (operational recharges for freight, demurrage, loading, and repacking). This guarantees clean taxability and profit-and-loss categorization.")
    add_p("3. Deterministic Explainability & SHA-256 Integrity: Every calculation freezes its exact mathematical formula trace, unit rates, slab parameters, and generates an immutable SHA-256 hash. Retroactive changes never overwrite history; they generate explicit delta adjustments (commission_adjustments).")
    add_p("4. 4-Eyes Claim Workflow & Dispute Isolation: Recovery claims support partial approval, allowing undisputed amounts to be invoiced immediately while disputed items are isolated into quarantine without blocking periodic settlement runs.")

    add_p(
        "The underlying PostgreSQL database schema comprises 14 tightly typed relational models registered in backend/models.py "
        "and initialized via backend/init_commission_tables.py:"
    )

    comm_schema_table = doc.add_table(rows=1, cols=4)
    comm_sch_headers = ["Relational Model & Table Name", "Primary & Foreign Key Topology", "Core Attributes & Data Types", "Business Function & Invariant Enforcement"]
    comm_sch_data = [
        [
            "PrincipalCommissionAgreement\n(principal_commission_agreements)",
            "PK: id (UUID)\nFK: company_id -> organizations.id\nFK: principal_id (UUID)",
            "principal_code (String 50)\nprincipal_name (String 200)\nagreement_code (String 80)\nversion_no (String 20: v1.0)\nvalid_from, valid_to (DateTime)\nstatus (ACTIVE, SUPERSEDED)\nterms_json (JSON)",
            "Master legal agreement binding the principal to specific commercial terms, payment frequencies, dispute grace periods, and minimum guarantee rules."
        ],
        [
            "CommissionRule\n(commission_rules)",
            "PK: id (UUID)\nFK: agreement_id -> principal_commission_agreements.id",
            "rule_code (String 50)\nrule_name (String 150)\npriority (Integer)\nrule_type (PERCENTAGE, PER_UNIT, FIXED_PERIOD, MINIMUM_GUARANTEE)\nrate_pct, unit_rate, min_guarantee_amount (Numeric)\nformula_config (JSON)",
            "Defines specific mathematical calculation formulas (e.g. 6.5% Net Turnover, ₹15/package handling, ₹25,000 monthly minimum guarantee floor)."
        ],
        [
            "CommissionScope\n(commission_scopes)",
            "PK: id (UUID)\nFK: rule_id -> commission_rules.id\nFK: branch_id (UUID)",
            "product_scope (ALL, CATEGORY, SKU)\ncustomer_scope (ALL, TIER, SPECIFIC)\nterritory_scope (ALL, REGIONAL)\nscope_filter_json (JSON)",
            "Granular applicability boundaries restricting commission rules to specific product categories, customer tiers, or geographic territories."
        ],
        [
            "CommissionEvent\n(commission_events)",
            "PK: id (UUID)\nFK: company_id -> organizations.id\nFK: principal_id (UUID)",
            "event_type (SALES_BILL, SALES_RETURN, FREIGHT_COST, STORAGE_CHARGE, LOADING_CHARGE)\nsource_doc_type (INVOICE, RETURN, FREIGHT_EVENT, CONSIGNMENT)\nsource_doc_id (String 100)\nidempotency_key (String 120 unique)",
            "Idempotent operational event trigger recording source transaction provenance before calculation execution, preventing duplicate calculation runs."
        ],
        [
            "CommissionMeasure\n(commission_measures)",
            "PK: id (UUID)\nFK: event_id -> commission_events.id",
            "measure_type (NET_SALES_VALUE, GROSS_SALES_VALUE, QUANTITY_UNITS, PACKAGE_COUNT)\nbase_amount (Numeric 14, 2)\nbase_quantity (Numeric 14, 2)\nuom (String 20: INR, PACKAGES)",
            "Normalized quantitative basis for computation, establishing the exact net sales value or physical handling count."
        ],
        [
            "CommissionCalculation\n(commission_calculations)",
            "PK: id (UUID)\nFK: event_id -> commission_events.id\nFK: rule_id (UUID)",
            "calculation_number (String 80 unique)\ncategory (EARNED_COMMISSION, RECOVERABLE_EXPENSE)\nbase_value (Numeric 14, 2)\nrate_applied (Numeric 8, 4)\ncalculated_amount (Numeric 14, 2)\nformula_trace (Text)\nstate (CALCULATED, APPROVED, BATCHED, RECOVERY_CREATED, DISPUTED)\nsha256_hash (String 64)",
            "Deterministic calculation record storing frozen formula breakdown, state lifecycle, and tamper-evident SHA-256 cryptographic hash."
        ],
        [
            "CommissionAdjustment\n(commission_adjustments)",
            "PK: id (UUID)\nFK: original_calc_id -> commission_calculations.id",
            "delta_amount (Numeric 14, 2)\nreason_code (RETURN_REDUCTION, RATE_CORRECTION, DISPUTE_RESOLUTION)\ndescription (Text)\napproved_by_id (UUID)",
            "Audit-preserving delta adjustments recording post-calculation amendments (e.g. sales returns or dispute resolutions) without overwriting historical calculations."
        ],
        [
            "RecoveryClaim\n(recovery_claims)",
            "PK: id (UUID)\nFK: company_id -> organizations.id\nFK: principal_id (UUID)",
            "claim_number (String 80 unique)\nperiod_from, period_to (DateTime)\ntotal_earned_commission (Numeric 14, 2)\ntotal_recoverable_expenses (Numeric 14, 2)\ntotal_claimed_amount (Numeric 14, 2)\napproved_amount, disputed_amount (Numeric 14, 2)\nstatus (DRAFT, SUBMITTED, APPROVED, PARTIALLY_APPROVED, RECOVERY_CREATED)",
            "Formal commercial claim package aggregating approved earned commissions and recoverable expenses for 4-eyes principal approval and settlement."
        ],
        [
            "RecoveryClaimLine\n(recovery_claim_lines)",
            "PK: id (UUID)\nFK: claim_id -> recovery_claims.id\nFK: calc_id (UUID)",
            "source_doc_type, source_doc_id (String)\nline_description (String 255)\nrequested_amount, approved_amount, disputed_amount (Numeric 14, 2)\nstatus (PENDING, APPROVED, DISPUTED)",
            "Granular itemization of claim components linking back to original calculation events or direct expense vouchers."
        ],
        [
            "RecoveryDocumentLink\n(recovery_document_links)",
            "PK: id (UUID)\nFK: claim_id -> recovery_claims.id",
            "document_type (SERVICE_INVOICE, CREDIT_NOTE, DEBIT_NOTE)\ndocument_number (String 100)\namount (Numeric 14, 2)\nlinked_at (DateTime)",
            "Explicit financial cross-link bridging approved operational claims into DOC-08/DOC-29 General Ledger and Statutory Tax billing."
        ],
        [
            "RecoveryStatement\n(recovery_statements)",
            "PK: id (UUID)\nFK: principal_id (UUID)",
            "statement_number (String 80 unique)\nperiod_from, period_to (DateTime)\nearned_commission, expense_recovery, approved_commercial, invoiced_total, settled_total, outstanding_balance (Numeric 14, 2)\nstatement_hash (String 64)\nstatus (GENERATED, RECONCILED)",
            "Periodic authoritative commercial statement summarizing turnover earnings, recoverable ancillaries, bank remittances, and outstanding principal balance."
        ],
        [
            "RecoveryStatementLine\n(recovery_statement_lines)",
            "PK: id (UUID)\nFK: statement_id -> recovery_statements.id",
            "category (EARNED_COMMISSION, EXPENSE_RECOVERY, SETTLEMENT)\nreference_doc_id (String 100)\ndescription (String 255)\namount (Numeric 14, 2)",
            "Reconstructable line-item movement backing the periodic statement balance with full backward source-document traceability."
        ],
        [
            "CommissionException\n(commission_exceptions)",
            "PK: id (UUID)\nFK: company_id -> organizations.id",
            "source_id (String 100)\nexception_type (UNMAPPED_PRODUCT, EXPIRED_AGREEMENT, MISSING_RATE_CARD)\nseverity (INFO, WARNING, ERROR, CRITICAL)\ndescription (Text)\nstate (OPEN, RESOLVED, WAIVED)",
            "Operational exception quarantine catching products without rate cards or expired agreements before calculations are batched."
        ],
        [
            "CommissionAudit\n(commission_audits)",
            "PK: id (UUID)\nFK: company_id -> organizations.id",
            "object_type (CALCULATION, CLAIM, STATEMENT, AGREEMENT)\nobject_id (String 100)\naction (CALCULATE, APPROVE, DISPUTE, SUBMIT, RECONCILE)\nactor_username (String 100)\nbefore_hash, after_hash (String 64)\ndetails_json (JSON)",
            "Immutable audit trail capturing user actions, before/after SHA-256 hashes, and timestamped forensic evidence for regulatory compliance."
        ]
    ]
    style_table(comm_schema_table, [1.3, 1.4, 1.6, 2.2], comm_sch_headers, comm_sch_data)
    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    add_h2("23.2 Complete RESTful API Specification (/api/commission/*)")
    add_p(
        "DOC-37 services are mounted under /api/commission with JWT multi-tenant organization filtering and strict Pydantic payload models:"
    )

    comm_api_table = doc.add_table(rows=1, cols=4)
    comm_api_headers = ["HTTP Method & Route", "Request Parameters / Payload", "Response Structure", "Operational Workflow & Invariant Impact"]
    comm_api_data = [
        [
            "GET /api/commission/summary",
            "Headers: Authorization: Bearer <JWT>\nQuery: None",
            "{status: 'success', data: {total_earned_commission, total_recoverable_expenses, net_commercial_total, open_claims_count, open_claims_amount, active_agreements_count, total_settled, total_outstanding}}",
            "Feeds executive telemetry cards on Commission Control Center, reporting live commercial position across all principals."
        ],
        [
            "GET /api/commission/agreements",
            "Headers: Authorization: Bearer <JWT>\nQuery: principal_id (Optional UUID), status (Optional str)",
            "{status: 'success', count: int, data: [{id, principal_code, principal_name, agreement_code, version_no, status, terms_json, rules: [...]}]}",
            "Retrieves active agreements with full nested rule definitions (Percentage, Per-Unit, Minimum Floor) and territory/product scopes."
        ],
        [
            "POST /api/commission/calculate",
            "Payload: {principal_id, event_type, source_doc_type, source_doc_id, base_value, quantity, category}",
            "{status: 'success', data: {id, calculation_number, principal_name, category, calculated_amount, formula_trace, sha256_hash, state}}",
            "Executes on-the-fly deterministic calculation, evaluates active agreement rules, generates frozen formula trace and SHA-256 hash."
        ],
        [
            "GET /api/commission/calculations",
            "Headers: Authorization: Bearer <JWT>\nQuery: principal_id, category, state, limit (default 50)",
            "{status: 'success', count: int, data: [{id, calculation_number, principal_name, category, calculated_amount, formula_trace, state, sha256_hash}]}",
            "Returns auditable calculations ledger with filtering by lifecycle state (CALCULATED, APPROVED, BATCHED, DISPUTED)."
        ],
        [
            "POST /api/commission/calculations/{id}/action",
            "Path: id (UUID)\nPayload: {action: 'APPROVE'|'DISPUTE'|'ADJUST'|'CANCEL', delta_amount: float, reason: str}",
            "{status: 'success', data: {id, calculation_number, calculated_amount, state, sha256_hash}}",
            "Executes lifecycle state transition. If ADJUST, updates amount, creates CommissionAdjustment delta record, and re-computes SHA-256 hash."
        ],
        [
            "GET /api/commission/claims",
            "Headers: Authorization: Bearer <JWT>\nQuery: principal_id, status",
            "{status: 'success', count: int, data: [{id, claim_number, principal_name, period_from, period_to, total_claimed_amount, approved_amount, status, lines: [...], linked_documents: [...]}]}",
            "Lists recovery claims with itemized lines and linked commercial documents (Service Invoices, Debit Notes)."
        ],
        [
            "POST /api/commission/claims",
            "Payload: {principal_id, period_from, period_to, calc_ids: [UUID], lines: [...], notes: str}",
            "{status: 'success', data: {id, claim_number, principal_name, total_claimed_amount, status: 'DRAFT'}}",
            "Batches approved earned commissions and recoverable expenses into a formal recovery claim, updating calc states to BATCHED."
        ],
        [
            "POST /api/commission/claims/{id}/action",
            "Path: id (UUID)\nPayload: {action: 'SUBMIT'|'APPROVE'|'DISPUTE'|'CREATE_DOCUMENT'|'SETTLE', approved_amount, document_type}",
            "{status: 'success', data: {id, claim_number, status, approved_amount}}",
            "Performs 4-eyes claim actions. CREATE_DOCUMENT generates linked Service Invoice (SINV-2026-XXXX) without duplicating general ledger."
        ],
        [
            "GET /api/commission/statements",
            "Headers: Authorization: Bearer <JWT>\nQuery: principal_id",
            "{status: 'success', count: int, data: [{id, statement_number, principal_name, earned_commission, expense_recovery, invoiced_total, settled_total, outstanding_balance, statement_hash, lines: [...]}]}",
            "Lists periodic recovery statements reconciling commercial earnings, recoverable expenses, and bank remittances."
        ],
        [
            "POST /api/commission/statements/generate",
            "Payload: {principal_id, period_from, period_to}",
            "{status: 'success', data: {id, statement_number, principal_name, approved_commercial, outstanding_balance, statement_hash}}",
            "Consolidates period calculations and claims into a formal periodic recovery statement with cryptographic integrity hash."
        ],
        [
            "GET /api/commission/exceptions",
            "Headers: Authorization: Bearer <JWT>\nQuery: state (OPEN, RESOLVED)",
            "{status: 'success', count: int, data: [{id, source_id, exception_type, severity, description, state}]}",
            "Returns operational exceptions queue for unmapped products or rate card discrepancies."
        ],
        [
            "POST /api/commission/exceptions/{id}/resolve",
            "Path: id (UUID)",
            "{status: 'success', message: 'Exception marked as RESOLVED'}",
            "Resolves an exception record after contract amendment or supervisor clearance."
        ],
        [
            "GET /api/commission/audits",
            "Headers: Authorization: Bearer <JWT>\nQuery: limit (default 50)",
            "{status: 'success', count: int, data: [{id, object_type, object_id, action, actor_username, before_hash, after_hash, created_at}]}",
            "Returns immutable forensic audit trail records with SHA-256 before/after state hashes."
        ]
    ]
    style_table(comm_api_table, [1.6, 1.4, 1.6, 1.9], comm_api_headers, comm_api_data)
    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    add_h2("23.3 Terminal Cockpits, Screen Layouts, Hotkeys & UI Element Catalog")
    add_p(
        "DOC-37 provides a high-density Marg/Tally terminal cockpit designed for rapid zero-mouse operation at /commission:"
    )
    add_p("1. Commission Control Center (/commission): Features 6 top telemetry KPI cards, 5 functional tab workspaces, and live status monitoring.")
    add_p("2. Counter Workbench Hub Tile: Added #hub-btn-commission-management launcher tile to the Home Screen with global hotkey [Ctrl+4].")
    add_p("3. Interactive Calculation Sandbox [F3]: Allows instant simulation of sales bill turnover commissions or recoverable ancillaries with deterministic formula trace display.")
    add_p("4. 4-Eyes Recovery Claims Desk [F4]: Allows batching of approved calculations into formal recovery claims with 1-click Service Invoice generation.")
    add_p("5. Principal Recovery Statements Desk [F5]: Displays consolidated periodic statements reconciling turnover earnings, expense recoveries, payments, and outstanding balances with SHA-256 hash validation.")
    add_p("6. Zero-Mouse Operational Guarantee: 100% keyboard navigable with [F2] Agreements, [F3] Sandbox, [F4] Claims Desk, [F5] Statements, [F6] Audits, [F7] New Claim Modal, and [Esc] Hierarchical Dismissal.")

    comm_ui_table = doc.add_table(rows=1, cols=4)
    comm_ui_headers = ["Screen / Cockpit Location", "Element ID Selector", "Input / Control Type", "Operational Role & Zero-Mouse Trigger"]
    comm_ui_data = [
        [
            "Counter Workbench (/)",
            "#hub-btn-commission-management",
            "Hub Tile Button [Ctrl+4]",
            "Global launcher tile on Home Screen navigating directly to Commission Control Center (/commission)."
        ],
        [
            "Commission Control Center (/commission)",
            "Card: Earned Commission",
            "Telemetry Metric Card",
            "Displays total turnover commission earned across active distribution agreements."
        ],
        [
            "Commission Control Center (/commission)",
            "Card: Recoverable Ancillaries",
            "Telemetry Metric Card",
            "Displays total recoverable expense recharges for freight, demurrage, loading, and handling."
        ],
        [
            "Commission Control Center (/commission)",
            "Card: Net Commercial Total",
            "Telemetry Metric Card",
            "Displays net commercial value (Earned Commission + Recoverable Expenses)."
        ],
        [
            "Commission Control Center (/commission)",
            "Card: Open Claims Desk",
            "Telemetry Metric Card",
            "Displays pending recovery claims count and aggregate value awaiting principal audit."
        ],
        [
            "Commission Control Center (/commission)",
            "Card: Settled Remittances",
            "Telemetry Metric Card",
            "Displays bank remittances received and outstanding principal balance."
        ],
        [
            "Commission Control Center (/commission)",
            "Card: Active Agreements",
            "Telemetry Metric Card",
            "Displays active principal agreements count with SHA-256 hash validation indicator."
        ],
        [
            "Calculation Sandbox Tab (/commission)",
            "#btn-run-sandbox",
            "Action Button [Enter]",
            "Executes deterministic calculation simulation and displays formula trace and SHA-256 hash."
        ],
        [
            "Claims Desk Tab (/commission)",
            "#btn-open-claim-modal",
            "Action Button [F7]",
            "Opens New Claim Batch modal with calculation multi-select checkboxes."
        ],
        [
            "New Claim Modal (/commission)",
            "#btn-submit-claim-modal",
            "Action Button [Enter]",
            "Submits new recovery claim batch and transitions calculations to BATCHED."
        ],
        [
            "Modal Dialogs (/commission)",
            "Window Key Listener",
            "Hotkey [Esc]",
            "Dismisses active modal cleanly without navigating away from the current tab."
        ]
    ]
    style_table(comm_ui_table, [1.3, 1.5, 1.4, 2.3], comm_ui_headers, comm_ui_data)
    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    add_h2("23.4 Automated Local 10-Stage Selenium Verification Suite (100% PASS - Exit Code 0)")
    add_p(
        "A dedicated automated 10-stage test suite (test_commission_recovery_selenium.py) was executed against the local environment "
        "(Backend: http://localhost:8000, Frontend: http://localhost:50005) using headless Chrome at 1440x950 resolution. "
        "All 10 stages completed with 100% pass rate (Exit Code 0):"
    )

    comm_loc_table = doc.add_table(rows=1, cols=4)
    comm_loc_headers = ["Stage Number & Name", "Target Endpoint / UI Selector", "Automated Assertions & Validation Criteria", "Execution Status"]
    comm_loc_data = [
        [
            "Stage 1: Backend API Authentication",
            "POST /auth/login\n(admin / Admin@123)",
            "HTTP 200 OK. Received JWT bearer token and verified organization tenancy ID.",
            "100% PASS\n(Exit 0)"
        ],
        [
            "Stage 2: Commission Summary API",
            "GET /api/commission/summary",
            "HTTP 200 OK. Asserted total_earned_commission > 0, total_recoverable_expenses > 0, active_agreements_count >= 2.",
            "100% PASS\n(Exit 0)"
        ],
        [
            "Stage 3: Agreements & Rate Cards",
            "GET /api/commission/agreements",
            "HTTP 200 OK. Verified Sun Pharma (6.5% Net Commission, ₹25k min guarantee) and Cipla (5.0% Gross, ₹15 handling).",
            "100% PASS\n(Exit 0)"
        ],
        [
            "Stage 4: On-the-fly Calculation Sandbox",
            "POST /api/commission/calculate",
            "HTTP 200 OK. Executed ₹350k bill calculation, verified formula trace and asserted valid 64-character SHA-256 hash.",
            "100% PASS\n(Exit 0)"
        ],
        [
            "Stage 5: Calculation Action (Approve)",
            "POST /api/commission/calculations/{id}/action",
            "HTTP 200 OK. Action APPROVE transitioned calculation state to APPROVED with audit log update.",
            "100% PASS\n(Exit 0)"
        ],
        [
            "Stage 6: Recovery Claim Batch Workflow",
            "POST /api/commission/claims\nPOST /claims/{id}/action",
            "HTTP 200 OK. Batched calculation into recovery claim, executed SUBMIT -> APPROVE -> Linked to SERVICE_INVOICE.",
            "100% PASS\n(Exit 0)"
        ],
        [
            "Stage 7: Statement Generation",
            "POST /api/commission/statements/generate",
            "HTTP 200 OK. Consolidated period earnings and recoveries into RecoveryStatement with statement hash.",
            "100% PASS\n(Exit 0)"
        ],
        [
            "Stage 8: Headless Browser Init",
            "Chrome Options: --headless=new\nViewport: 1440x950",
            "WebDriver initialized with GPU disabled, no-sandbox, and sessionStorage auth injection.",
            "100% PASS\n(Exit 0)"
        ],
        [
            "Stage 9: Counter Workbench Tile",
            "driver.get('http://localhost:50005/')",
            "Located #hub-btn-commission-management launcher on Counter Workbench. Captured verified_commission_homescreen_launcher.png.",
            "100% PASS\n(Exit 0)"
        ],
        [
            "Stage 10: Control Center, Sandbox & Modal",
            "driver.get('/commission')\n[F3], [F5], [F7], [Esc]",
            "Verified 6 KPI cards, executed Sandbox simulation [F3], verified Statements Desk [F5], tested [F7] modal & [Esc] dismissal cleanly. Captured screenshots 2, 3 & 4.",
            "100% PASS\n(Exit 0)"
        ]
    ]
    style_table(comm_loc_table, [1.2, 1.8, 2.6, 0.9], comm_loc_headers, comm_loc_data)
    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    add_h2("23.5 Live Vercel Production Cloud Verification Suite (4 Stages - 100% PASS)")
    add_p(
        "Following local verification, the live production deployment on Vercel CDN (https://erp-rho-three.vercel.app) was "
        "audited via verify_live_vercel_commission_audit.py using the automated demo authentication hook (#btn-demo-login). "
        "All 4 stages completed with 100% pass rate (Exit Code 0) confirming zero cloud regressions:"
    )

    comm_cld_table = doc.add_table(rows=1, cols=4)
    comm_cld_headers = ["Cloud Audit Stage & Scope", "Live Target URL & Trigger", "Automated Cloud Assertions & Validation Criteria", "Production Status"]
    comm_cld_data = [
        [
            "Stage 1: Production Auth & Launcher",
            "https://erp-rho-three.vercel.app/\nTrigger: #btn-demo-login",
            "Authenticated as Admin. Verified #counter-workbench-root and confirmed #hub-btn-commission-management presence. Captured live_vercel_commission_homescreen_launcher.png.",
            "100% PASS\n(Live Cloud)"
        ],
        [
            "Stage 2: Live Control Center Telemetry",
            "https://erp-rho-three.vercel.app/commission",
            "Verified all 6 Top KPI cards (Earned Commission, Recoverable Ancillaries, Net Commercial Total, Open Claims, Settled, Agreements). Captured live_vercel_commission_control_center.png.",
            "100% PASS\n(Live Cloud)"
        ],
        [
            "Stage 3: Live Sandbox & Ledger",
            "https://erp-rho-three.vercel.app/commission\nTrigger: [F3] & #btn-run-sandbox",
            "Switched to Sandbox [F3]. Triggered live calculation simulation. Verified formula trace and calculations ledger rendering. Captured live_vercel_commission_sandbox_ledger.png.",
            "100% PASS\n(Live Cloud)"
        ],
        [
            "Stage 4: Live Statements Desk & Modal",
            "https://erp-rho-three.vercel.app/commission\nTrigger: [F5], [F7] & [Esc]",
            "Verified Statements Desk [F5] with consolidated balances. Triggered New Claim Batch modal [F7] and verified instant [Esc] keyboard dismissal cleanly. Captured live_vercel_commission_statement_desk.png.",
            "100% PASS\n(Live Cloud)"
        ]
    ]
    style_table(comm_cld_table, [1.2, 1.8, 2.6, 0.9], comm_cld_headers, comm_cld_data)
    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    add_h2("23.6 Visual Proof of Verification & Photographic Evidence (8 Production Screenshots)")
    add_p(
        "Below are the 8 publication-grade visual verification screenshots captured during automated local headless Selenium "
        "and live Vercel production testing, providing indisputable proof of operational readiness, terminal ergonomics, and "
        "zero-mouse hotkey execution:"
    )

    # 4 Local Verified Screenshots
    add_screenshot(
        "verified_commission_homescreen_launcher.png",
        "Figure 23.1: Local Verified Counter Workbench (/) displaying the dedicated Commission Engine hub tile (#hub-btn-commission-management) mapped to global hotkey [Ctrl+4]."
    )
    add_screenshot(
        "verified_commission_control_center.png",
        "Figure 23.2: Local Verified Commission Control Center (/commission) featuring 6 top telemetry KPI cards, agreement versioning, and the Agreements & Rate Cards tab [F2]."
    )
    add_screenshot(
        "verified_commission_sandbox_ledger.png",
        "Figure 23.3: Local Verified Calculation Sandbox & Ledger (/commission) displaying on-the-fly turnover simulation, frozen formula trace, and SHA-256 tamper-evident hash."
    )
    add_screenshot(
        "verified_commission_statement_desk.png",
        "Figure 23.4: Local Verified Principal Recovery Statements Desk (/commission) displaying consolidated periodic run balances and transaction-level audit traceability."
    )

    # 4 Live Vercel Production Cloud Screenshots
    add_screenshot(
        "live_vercel_commission_homescreen_launcher.png",
        "Figure 23.5: Live Vercel Production Cloud Verification (https://erp-rho-three.vercel.app/) confirming seamless authentication and Counter Workbench launcher tile presence on production CDN."
    )
    add_screenshot(
        "live_vercel_commission_control_center.png",
        "Figure 23.6: Live Vercel Production Cloud Control Center (/commission) verifying live telemetry KPI cards, rate card matrix, and active principal agreements."
    )
    add_screenshot(
        "live_vercel_commission_sandbox_ledger.png",
        "Figure 23.7: Live Vercel Production Cloud Calculation Sandbox verifying interactive turnover computation and deterministic ledger rendering on production CDN."
    )
    add_screenshot(
        "live_vercel_commission_statement_desk.png",
        "Figure 23.8: Live Vercel Production Cloud Statements Desk (/commission) validating periodic recovery consolidation, modal dialog rendering, and instant [Esc] keyboard dismissal."
    )

    doc.add_paragraph().paragraph_format.space_after = Pt(12)

    # ==========================================
    # SECTION 24: C&F CONSIGNING AGENT & DUAL-POSTING ENGINE
    # ==========================================
    add_h1("24. C&F (Carrying & Forwarding) & Consigning Agent Commercial Architecture, Client-Company Association, and Automated Inward Purchase Dual-Posting")
    add_p(
        "To empower pharmaceutical distributors acting as institutional Carrying & Forwarding (C&F) and Consigning Agents, "
        "the ERP introduces an integrated commercial framework that models infrastructure recharges, manufacturer brand-dealerships, "
        "and dual-entry accounting automation. Under this operational model, the distributor provides dedicated physical assets "
        "(cold-storage godowns, material handling staff, localized cargo transportation) to Principal manufacturers, billing them "
        "periodically for turnover-based commissions and agreed operating expense reimbursements."
    )

    add_h2("24.1 The C&F Consigning Agent 4-Pillar Commercial Matrix")
    add_p(
        "Under C&F operations, commercial claims are structured across four fundamental operational pillars, each governed by "
        "explicit contractual reimbursement terms defined at the Principal Agreement level:"
    )

    cf_matrix_table = doc.add_table(rows=1, cols=4)
    cf_matrix_headers = ["Operational Pillar", "Cost Bearer Options", "Billing Mechanism", "Audit & Verification Scope"]
    cf_matrix_data = [
        ["1. Godown Storage & Rent", "PRINCIPAL or DISTRIBUTOR", "Fixed Monthly Budget (e.g. ₹42,000/mo) or Actual Rental Agreement Invoice", "Warehouse square footage verification, temperature log compliance, and landlord rent receipt matching."],
        ["2. Dedicated Staff Salaries", "PRINCIPAL or DISTRIBUTOR", "Monthly Staff Budget (e.g. ₹28,500/mo) with Dynamic Month-to-Month Payroll Override", "Depot dispatcher attendance, biometric punch logs, ESI/PF statutory challans, and payroll voucher reconciliation."],
        ["3. Transportation & Cargo", "PRINCIPAL or DISTRIBUTOR", "Per-Kg / Per-Box Freight Rate (e.g. ₹4.5/kg) or Decoupled Freight Bill Pass-Through", "Consignment LR number tracking, weighbridge slips, delivery POD confirmation, and fuel surcharge indexation."],
        ["4. Sales Commission", "PRINCIPAL (Paid to Agent)", "Percentage on Net/Gross Client Sales Turnover (e.g. 4.0% - 6.5%)", "Client invoice turnover matching, credit note deduping, rate card tier validation, and SHA-256 hash freezing."]
    ]
    style_table(cf_matrix_table, [1.4, 1.4, 1.8, 2.4], cf_matrix_headers, cf_matrix_data)
    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    add_h2("24.2 Client-to-Product Company Dealership & Multi-Brand Association")
    add_p(
        "A critical architectural requirement in pharmaceutical supply chains is the strict distinction between a 'Product Company' "
        "(the brand manufacturer associated with SKUs, e.g. Cipla, Sun Pharma, Mankind, Abbott) and an 'Accounting Ledger' "
        "(the legal entity for debtor/creditor balances). In Party Master (/master/parties), each Customer Profile now includes "
        "an authorized Product Companies multi-select registry (company_ids column):"
    )
    add_p("• Exclusive Client Dealership: Restricts a retail client (e.g. Apollo Pharmacy) to specific authorized manufacturer lines (e.g. Cipla only or Cipla + Sun Pharma).")
    add_p("• All-Company Wholesale Dealership: Allows institutional distributors and super-stockists to purchase all catalog brands using the ['ALL'] master wildcard.")
    add_p("• Targeted Billing & Reporting: Filter sales turnover by company in the Commission Sandbox, ensuring agent commission calculations only aggregate sales of goods belonging to the dealing Principal.")

    add_h2("24.3 Dynamic Month-to-Month Expense Adjustments in Calculation Sandbox")
    add_p(
        "While master agreements define default monthly reimbursement budgets, actual monthly operating expenses fluctuate due to "
        "overtime pay, bonus incentives, seasonal cold storage power tariffs, or temporary warehouse leasing. The Deterministic "
        "Commission Sandbox ([F3]) provides dynamic manual adjustment overrides:"
    )
    add_p("• Staff Salary Custom Override: Operators can input the exact payroll disbursement for the current billing cycle (e.g. ₹28,500 vs default ₹25,000), which directly updates the base calculation amount and formula trace.")
    add_p("• Godown Rent Custom Override: Accommodates seasonal warehouse expansions or utility recharges by allowing the operator to input the audited monthly lease amount (e.g. ₹42,000).")
    add_p("• Client-Specific Turnover Isolation: Select specific authorized clients dealing with the Principal to compute commission strictly against their verified billing turnover.")

    add_h2("24.4 Automated Inward Purchase Dual-Posting Architecture")
    add_p(
        "When a recovery claim batch is approved by management through the 4-Eyes Maker-Checker protocol, clicking [Invoice & Post to Purchase] "
        "triggers an atomic dual-posting operation that synchronizes both sides of the commercial ledger without manual data re-entry:"
    )

    dual_post_table = doc.add_table(rows=1, cols=3)
    dual_post_headers = ["Posting Leg", "Generated Document & Target Section", "Commercial & Accounting Function"]
    dual_post_data = [
        [
            "Leg 1: Outward Service Billing",
            "Service Invoice (SINV-2026-XXXX)\nSection: Commission Control Center (/commission)",
            "Issues legal tax invoice to Principal manufacturer for commission earned + recharge of godown, staff, and freight opex with GST."
        ],
        [
            "Leg 2: Inward Purchase Posting",
            "Purchase Bill (PUR-SRV-2026-XXXX)\nSection: Purchase Invoices (/purchase/list)",
            "Automatically inserts an inward purchase voucher into the Purchase Ledger under the Principal's supplier account. Itemizes commission, godown rent, staff payroll, and freight lines, crediting the Principal and creating an immediate audit-traceable record in the purchase register."
        ]
    ]
    style_table(dual_post_table, [1.5, 2.5, 3.0], dual_post_headers, dual_post_data)
    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    add_h2("24.5 Production Verification & Visual Photographic Evidence")
    add_p(
        "The automated Selenium test suite (test_commission_recovery_selenium.py) executes 12 end-to-end stages verifying C&F agreement "
        "deal terms, authorized client querying, custom staff salary overrides, 4-eyes claim approval, and dual-posting to the purchase ledger. "
        "The photographic evidence below certifies operational readiness:"
    )

    add_screenshot(
        "verified_commission_purchase_dual_post.png",
        "Figure 24.1: Production Verified Inward Purchase Bills Register (/purchase/list) confirming instant, automated Dual-Posting of C&F Service Invoices as purchase bills (PUR-SRV-2026-XXXX) under the Principal's supplier account."
    )

    doc.add_paragraph().paragraph_format.space_after = Pt(12)


    # =========================================================================
    # CHAPTER 25: ENTERPRISE MULTI-CLIENT OPERATIONS TRACKING & RADAR ENGINE (DOC-38)
    # =========================================================================
    doc.add_page_break()
    add_h1("Chapter 25: Enterprise Multi-Client Operations Tracking & Radar Engine (DOC-38)")
    
    add_h2("25.1 Architecture & Multi-Tenant Consolidated Telemetry")
    add_p(
        "For corporate administrators and 3PL Carrying & Forwarding agencies managing multiple client organizations "
        "(such as Krishna Medical Agencies, Test Org), operational oversight previously required repeatedly switching between "
        "tenant accounts. The Enterprise Multi-Client Operations Tracking & Radar Engine (AdminEnterpriseTracker.tsx, /admin/tracking) "
        "introduces an authoritative supervisory control plane that aggregates real-time business telemetry across all tenant partitions."
    )
    
    add_callout(
        "The Multi-Client Scope Selector allows operators to seamlessly switch between 'ALL' (Consolidated Enterprise Radar) "
        "and isolated client company telemetry. Client-isolated querying guarantees strict database tenancy isolation while "
        "providing corporate headquarters with instant single-pane-of-glass operational visibility.",
        prefix="ARCHITECTURAL INVARIANT: "
    )

    add_h2("25.2 RESTful Telemetry Directory (/api/admin/tracking/*)")
    radar_api_table = doc.add_table(rows=1, cols=4)
    radar_headers = ["Endpoint Path", "HTTP", "Telemetry Scope", "Commercial Function"]
    radar_data = [
        ["/api/admin/tracking/summary", "GET", "Consolidated or Client-Scoped", "Aggregates Gross Sales Turnover, Operating Expenses, In-Transit vs Delivered Cargo, and Client counts."],
        ["/api/admin/tracking/clients", "GET", "Multi-Tenant Matrix", "Ranks managed client companies by sales volume, transaction velocity, claims, and active cargo shipments."],
        ["/api/admin/tracking/sales", "GET", "Cross-Client Invoices", "Chronological multi-client sales invoice ledger with client company attribution badges and items count."],
        ["/api/admin/tracking/expenses", "GET", "Operational Claims Ledger", "Tracks client C&F storage rent, dedicated staff salaries, freight recharges, and petty cash advances."],
        ["/api/admin/tracking/cargo", "GET", "Logistics Pipeline", "Cross-client logistics board monitoring origin/destination hubs, transporter vehicles, and delivery statuses."]
    ]
    style_table(radar_api_table, [2.2, 0.8, 1.8, 2.2], radar_headers, radar_data)
    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    add_h2("25.3 Visual Photographic Evidence: Enterprise Multi-Client Radar")
    add_p("The automated Selenium test suite (test_admin_enterprise_tracking_selenium.py) verifies all 12 stages with 100% Exit Code 0:")

    add_screenshot(
        "verified_admin_tracker_scorecards.png",
        "Figure 25.1: Enterprise Multi-Client Operations Radar (/admin/tracking) showing the Apex Scope Selector, 4 Neumorphic KPI Cards, and the Client Scorecards Matrix Table with 1-click Drilldown actions."
    )

    add_screenshot(
        "verified_admin_tracker_sales.png",
        "Figure 25.2: Multi-Client Sales Invoices Ledger ([F3]) displaying real-time invoices across client companies with organization attribution tags and running grand totals."
    )

    add_screenshot(
        "verified_admin_tracker_expenses.png",
        "Figure 25.3: Multi-Client Operational Expense Claims Ledger ([F4]) displaying depot storage rent, dedicated staff salaries, and freight reimbursements across managed clients."
    )

    add_screenshot(
        "verified_admin_tracker_cargo.png",
        "Figure 25.4: Multi-Client Cargo Logistics Pipeline ([F6]) tracking vehicle dispatches, carrier names, route hubs, and live shipment transit statuses."
    )

    # =========================================================================
    # CHAPTER 26: RESPONSIVE TOP NAVIGATION ARCHITECTURE & HIGH-DENSITY SCREEN ERGONOMICS (DOC-39)
    # =========================================================================
    doc.add_page_break()
    add_h1("Chapter 26: Responsive Top Navigation Architecture & High-Density Screen Ergonomics (DOC-39)")

    add_h2("26.1 High-Density Screen Fit & 10-Item Menu Taxonomy")
    add_p(
        "On standard enterprise laptop screens (1366x768 and 1440x900 viewports), top navigation bars with 13+ raw menu items overflow horizontally, "
        "clipping critical modules such as CRM, Admin, and Financial Reports. The top navigation bar (Header.tsx) was refactored into "
        "a compact 10-category taxonomy that occupies exactly 1422px within a 1422px window with zero horizontal overflow."
    )

    nav_table = doc.add_table(rows=1, cols=3)
    nav_headers = ["Top Menu Category", "Sub-Modules Grouped", "Ergonomic & Screen Fit Purpose"]
    nav_data = [
        ["1. Dashboard", "Counter Workbench (/)", "Direct single-keystroke jump to cashier counter billing."],
        ["2. Master ▾", "Ledgers, Business Partners, HSN, Warehouses, Document Series", "Centralized statutory master data directory."],
        ["3. Finance & Accounting ▾", "Payment, Receipt, Journal, Day Book, BRS, Trial Balance, P&L, Balance Sheet", "Consolidates all statutory financial accounting vouchers and ledgers."],
        ["4. Inventory ▾", "Product Master, Current Stock, SCM Replenishment, Stock Shifts", "Warehouse stock tracking and reorder replenishment."],
        ["5. Sales & Purchase ▾", "Sale, Purchase, Credit Notes, Debit Notes, Breakage, GST Vouchers", "Nested double-menu for rapid keyboard-first transaction recording."],
        ["6. C&F & Logistics ▾", "Principal Ops, Commission Engine, Multi-Client Radar, Cargo Board, Freight Rates, Transporter Recon", "Consolidates all logistics, carrier freight, agency operations, and commission billing."],
        ["7. Workflows [F4] ▾", "Approval Inbox [F4], Rule Designer, SLA Monitor, Audit Trail Explorer, Data Governance", "Centralizes Maker-Checker authorizations and statutory MCA audit compliance."],
        ["8. GST & Compliance ▾", "GSTR-1, GSTR-2, GSTR-3B, E-Invoice & E-Way Bill Desk", "Statutory tax compliance and GSTN offline JSON exports."],
        ["9. CRM & Admin ▾", "CRM Dashboard, Client Management, Multi-Client Radar, Product Companies Master, Settings", "Enterprise client multi-tenancy administration."],
        ["10. Reports ▾", "Report Viewer (/reports), Visual Report Designer (/reports/designer)", "Cross-modular enterprise reporting and print layouts."]
    ]
    style_table(nav_table, [1.8, 3.2, 2.0], nav_headers, nav_data)
    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    add_h2("26.2 Visual Photographic Evidence: Top Menu Ergonomics")
    add_screenshot(
        "verified_top_menu_layout.png",
        "Figure 26.1: High-Density Top Navigation Bar Layout verifying exactly 10 top-level menu items cleanly fitting standard viewports with zero horizontal overflow."
    )

    add_screenshot(
        "verified_cf_dropdown_menu.png",
        "Figure 26.2: Consolidated C&F & Logistics Sub-Menu Dropdown displaying nested quick launchers for Principal Ops, Commission Engine, Admin Radar, Cargo, Freight Contracts, and Transporter Recon."
    )

    # =========================================================================
    # CHAPTER 27: CLIENT MANAGEMENT C&F COMMISSION & EXPENSE REIMBURSEMENT BILLING ENGINE WITH DUAL-POSTING (DOC-40)
    # =========================================================================
    doc.add_page_break()
    add_h1("Chapter 27: Client Management C&F Commission & Expense Reimbursement Billing Engine with Bilateral Dual-Posting (DOC-40)")

    add_h2("27.1 Commercial Domain & Client Management C&F Context")
    add_p(
        "When the Main Admin Company operates as a Carrying & Forwarding (C&F) Agent for a pharmaceutical client company registered in "
        "Client Management (e.g., KRISHNA MEDICAL AGENCIES), monthly commercial settlement requires billing for earned sales commission "
        "plus reimbursement of verified operating depot expenses. The Client C&F Billing Desk ([F5] on /commission) automates this bilateral workflow."
    )

    add_h2("27.2 The Bilateral Dual-Posting Architecture")
    add_p(
        "Clicking [Generate & Post C&F Service Bill to Billing] triggers an atomic database transaction that posts across both corporate entities:"
    )

    client_dual_table = doc.add_table(rows=1, cols=3)
    client_dual_headers = ["Posting Entity & Leg", "Generated Document & Route", "Accounting & Statutory Impact"]
    client_dual_data = [
        [
            "Leg 1: Main Admin Agency (C&F)",
            "Outward Service Bill (CF-BILL-2026-XXXX)\\nRoute: Billing Register (/billing, [F7])",
            "Creates commercial tax invoice billing the client for Sales Commission + Godown Storage Rent + Staff Salaries + Freight Recharges under GST SAC 998599 (18% GST). Debits Client Trade Receivable; Credits Service Revenue & Expense Recoveries."
        ],
        [
            "Leg 2: Client Company (Krishna Medical Agencies)",
            "Inward Purchase Bill (PUR-CF-2026-XXXX)\\nRoute: Purchase Register (/purchase/list, [F9])",
            "Automatically inserts an inward purchase voucher directly inside the client organization's database partition (organization_id = client_org.id). Credits C&F Agency Trade Payable; Debits Operating Expenses. Eliminates duplicate manual entry."
        ],
        [
            "Leg 3: Commission Engine Audit Trail",
            "Commission Event, Calculations & Claim\\nRoute: Recovery Statements Desk (/commission)",
            "Creates models.CommissionCalculation records with formula traces and SHA-256 integrity hashes, and an approved models.RecoveryClaim linking both vouchers via models.RecoveryDocumentLink."
        ]
    ]
    style_table(client_dual_table, [1.8, 2.5, 2.7], client_dual_headers, client_dual_data)
    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    add_h2("27.3 Visual Photographic Evidence: Client C&F Billing Desk & Dual-Posting")
    add_p("The automated Selenium test suite (test_client_commission_billing_selenium.py) verifies all 13 stages with 100% Exit Code 0:")

    add_screenshot(
        "verified_client_commission_billing_desk.png",
        "Figure 27.1: Client C&F Billing Desk ([F5] on /commission) showing client selection (KRISHNA MEDICAL AGENCIES), 1-click Auto-Fetched telemetry (Turnover ₹12,50,000, Commission ₹62,500, Depot Expenses ₹51,000), and dual configuration workspaces."
    )

    add_screenshot(
        "verified_client_bill_generated_dual_post.png",
        "Figure 27.2: Generated Bill Success Card confirming outward service bill CF-BILL-2026-0002 and automated dual-posted inward client purchase bill PUR-CF-2026-0002 with direct links to Billing [F7] and Purchase [F9]."
    )

    # =========================================================================
    # CHAPTER 28: PHARMA EXPIRY RADAR, STOCK SHIFT QUARANTINE ENGINE & PRINCIPAL CLAIM SETTLEMENT DESK (DOC-41)
    # =========================================================================
    doc.add_page_break()
    add_h1("Chapter 28: Pharma Expiry Radar, Stock Shift Quarantine Engine & Principal Debit Note Settlement Desk (DOC-41)")

    add_h2("28.1 Architectural Purpose & Pharma Shelf-Life Governance")
    add_p(
        "In pharmaceutical distribution and Carrying & Forwarding (C&F) operations, batch shelf-life surveillance and damaged/expired stock "
        "disposition are mission-critical regulatory and financial functions. DOC-41 establishes a real-time, transactional bridge that surveils "
        "batch expiries, executes atomic godown stock shifts from Saleable to Quarantine inventory, and automatically files debit note claims "
        "with Principals (manufacturers) in the Principal Claims Desk."
    )

    add_h2("28.2 The 4-Pillar Expiry Surveillance & Claim Reallocation Matrix")
    add_p("The end-to-end lifecycle of expiring stock operates across four interconnected tiers:")

    expiry_matrix_table = doc.add_table(rows=1, cols=3)
    expiry_matrix_headers = ["Pillar & Engine", "Route & UI Controls", "Transactional & Ledger Impact"]
    expiry_matrix_data = [
        [
            "Pillar 1: Expiry Cockpit Telemetry",
            "Cockpit Header & Scorecards\\nRoute: /inventory-dashboard",
            "Aggregates live inventory valuations across Main Stock (Batch.current_stock), Quarantined Stock (Batch.brk_exp_stock), 90-day risk horizons, and active pending claims in models.PrincipalClaim."
        ],
        [
            "Pillar 2: Real-Time Expiry Radar",
            "Expiry Radar Table [F2]\\nFilter Pills: Expired, <30d, <60d, <90d",
            "Classifies batches into 4 actionable risk buckets with days-to-expiry calculation, company filters, multi-batch selection checkboxes, and 1-click [⚡ Shift to Quarantine [F7]] transition."
        ],
        [
            "Pillar 3: Atomic Stock Shift Voucher",
            "Stock Shift Desk\\nRoute: /stock-shift",
            "Enforces strict stock availability validation and executes atomic database transaction (POST /api/stock/shifts): decrements Batch.current_stock, increments Batch.brk_exp_stock, and logs models.StockShiftVoucher (SHF-2026-XXXX)."
        ],
        [
            "Pillar 4: Principal Claim & Debit Note Bridging",
            "Auto-Claim Toggle (#check-auto-claim)\\nRoute: /principal",
            "Automatically generates formal models.PrincipalClaim (CLM-PRN-YYYY-XXXX) and itemized models.PrincipalClaimLine records under the selected Principal, recording debit note reference for recovery."
        ]
    ]
    style_table(expiry_matrix_table, [1.8, 2.5, 2.7], expiry_matrix_headers, expiry_matrix_data)
    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    add_h2("28.3 Visual Photographic Evidence: Expiry Cockpit, Stock Shift & Principal Claims")
    add_p("The automated Selenium test suite (test_pharma_expiry_quarantine_selenium.py) verifies all 13 stages with 100% Exit Code 0:")

    add_screenshot(
        "verified_pharma_expiry_cockpit.png",
        "Figure 28.1: Pharma Expiry Radar & Breakage Cockpit (/inventory-dashboard) showing live telemetry scorecards, risk bucket filter pills (All Critical, Expired, <30d, <60d, <90d), and batch surveillance table."
    )

    add_screenshot(
        "verified_stock_shift_claim_success.png",
        "Figure 28.2: Stock Shift Voucher Desk (/stock-shift) Success Card confirming voucher SHF-2026-0001 (148 units shifted to Quarantine Godown) and automated Principal Claim CLM-PRN-2026-0006 filed under Sun Pharma Healthcare Ltd."
    )

    add_screenshot(
        "verified_quarantine_stock_ledger.png",
        "Figure 28.3: Quarantined & Breakage Stock Ledger tab ([F3]) reflecting real-time reallocation (303 units, ₹41,799) with direct action button to File Principal Expiry Claim."
    )

    add_screenshot(
        "verified_principal_claim_from_shift.png",
        "Figure 28.4: Principal Claims Desk (/principal) displaying linked Claim CLM-PRN-2026-0006 originating from Stock Shift SHF-2026-0001 for automated debit note recovery."
    )

    # =========================================================================
    # CHAPTER 29: MASTER SCREEN-BY-SCREEN UI ELEMENT & OPERATIONAL HOTKEY DIRECTORY
    # =========================================================================
    doc.add_page_break()
    add_h1("Chapter 29: Master Screen-by-Screen UI Element & Operational Hotkey Directory")

    add_h2("29.1 Architecture of the 10 Top-Level Parent Menus")
    add_p(
        "To ensure zero screen overflow on standard desktop monitors (1366x768, 1440x900, 1920x1080), the ERP navigation bar "
        "is engineered with 10 streamlined parent categories with full keyboard arrow traversal (ArrowLeft, ArrowRight, ArrowDown, ArrowUp), "
        "Enter navigation, and universal Esc dismissal:"
    )

    nav_table = doc.add_table(rows=1, cols=3)
    nav_headers = ["Top Menu", "Route / Primary Submenus", "Key Capabilities & Roles"]
    nav_data = [
        ["1. Dashboard", "/ (HomeScreen)", "Counter Workbench, quick operational launcher tiles, and Esc exit modal."],
        ["2. Master ▾", "Ledger, Business Partners, Salt, Company, HSN, State, Series, Schemes, Pricing", "Core configuration, business partners master, alphanumeric series continuation, and pricing rules."],
        ["3. Finance & Accounting ▾", "Payment, Receipt, Journal, Contra, Day Book, BRS, Fixed Assets, Expenses, P&L, BS", "ACID double-entry general ledger, FIFO settlement allocation, statutory financial statements."],
        ["4. Inventory ▾", "Product Create/Modify, View Stock, Brk/Exp Stock, Expiry Cockpit, Stock Shift, Replenishment", "Multi-godown inventory management, real-time shelf-life surveillance, and atomic stock shift reallocation."],
        ["5. Sales & Purchase ▾", "Sales Bill, Challan, Purchase Bill, Credit Note, Debit Note, Brk Receive, Brk Issue, Orders, GRN", "Complete 6 transaction voucher modules, fast counter billing, barcode scanning, and PO tracking."],
        ["6. C&F & Logistics ▾", "Principal Ops, Commission Engine, Multi-Client Radar, Cargo Board, Freight Rates, Transporter Recon", "Carrying & Forwarding operations, 4-pillar commercial deal terms, carrier rate cards, and billing desk."],
        ["7. Workflows [F4] ▾", "Approval Inbox, Rule Designer, SLA Monitor, Audit Trail Explorer, Data Governance Console", "Maker-checker approval hierarchy, SHA-256 tamper-evident event stream, and statutory retention policies."],
        ["8. GST & Compliance ▾", "GSTR-1, GSTR-2, GSTR-3B, Finance Reports, E-Invoice Desk, Signed Ledger", "Statutory GST returns, government offline JSON utility export, and digital invoice signing."],
        ["9. CRM & Admin ▾", "CRM Dashboard, Client Management, Multi-Client Radar, Product Companies, Bulletin, Settings", "Multi-tenant tenant management, product brand assignment, company-wide circulars, and system settings."],
        ["10. Reports ▾", "Report Viewer, Custom Report Designer", "Management analytics, drill-down company sales, and visual semantic report query designer."]
    ]
    style_table(nav_table, [1.5, 2.7, 2.8], nav_headers, nav_data)
    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    add_h2("29.2 Master UI Element & Selector Directory Across All 35 Routes")
    add_p("The following master reference catalog details the functional selectors, IDs, and hotkey bindings for software developers and quality assurance engineers:")

    selector_table = doc.add_table(rows=1, cols=4)
    selector_headers = ["Screen Context", "UI Selector / Element ID", "Hotkey", "Functionality & Business Invariant"]
    selector_data = [
        ["Counter Workbench (/)", "#hub-btn-sales-bill", "[F2]", "Opens Marg-speed counter billing desk with sequential series continuation."],
        ["Counter Workbench (/)", "#hub-btn-receipt-voucher", "[F6]", "Opens Customer Collection & Receipt Voucher desk."],
        ["Counter Workbench (/)", "#hub-btn-payment-voucher", "[F5]", "Opens Supplier Outward Payment Voucher desk."],
        ["Counter Workbench (/)", "#hub-btn-cargo-management", "[Ctrl+1]", "Opens logistics consignment Kanban board."],
        ["Counter Workbench (/)", "#hub-btn-freight-management", "[Ctrl+2]", "Opens carrier contracts and freight rating sandbox."],
        ["Counter Workbench (/)", "#hub-btn-principal-management", "[Ctrl+3]", "Opens Principal operations, custody stock, and claims desk."],
        ["Counter Workbench (/)", "#hub-btn-commission-management", "[Ctrl+4]", "Opens C&F Commission Engine & Client Billing Desk."],
        ["Counter Workbench (/)", "#hub-btn-admin-tracking", "[Ctrl+6]", "Opens Enterprise Multi-Client Operations Radar."],
        ["Counter Workbench (/)", "#modal-exit-app", "[Esc]", "Application exit confirmation dialog with Enter exit and Esc cancel."],
        ["Receipt Voucher (/receipt)", "#btn-auto-allocate-fifo", "[Alt+A]", "Executes 1-click FIFO allocation across open customer invoices."],
        ["Payment Voucher (/payment)", "#btn-auto-allocate-fifo", "[Alt+A]", "Executes 1-click FIFO allocation across open vendor purchase bills."],
        ["Journal Voucher (/journal)", "#btn-auto-balance-gl", "[Ctrl+B]", "Auto-calculates and inserts balancing Dr/Cr line."],
        ["Journal Voucher (/journal)", "#check-schedule-accrual", "-", "Schedules automatic 1st-of-month general ledger reversal."],
        ["Expense Desk (/finance/expenses)", "#btn-post-expense", "-", "Posts direct cash/bank operational expense debiting P&L immediately."],
        ["Bank Recon (/finance/bank-reconciliation)", "#btn-cash-drawer-tally", "[F8]", "Opens RBI currency denomination counter and cash discrepancy report."],
        ["GST Workbench (/gst)", "#btn-export-gstn-json", "-", "Exports official Government Offline Utility JSON file for gst.gov.in."],
        ["Audit Explorer (/audit)", "#btn-verify-chain", "-", "Traverses sequential SHA-256 hash blocks certifying 100% integrity."],
        ["Audit Explorer (/audit)", "#drawer-audit-diff", "[Enter]", "Slide-over before/after JSON diff comparison drawer."],
        ["Cargo Board (/cargo)", "#btn-register-consignment", "[F6]", "Registers consignment with IATA volumetric CBM auto-calculation."],
        ["Freight Master (/freight/contracts)", "#tab-btn-sandbox", "[F4]", "Evaluates deterministic freight calculation with formula trace."],
        ["Principal Desk (/principal)", "#btn-open-claim-modal", "[F7]", "Opens Principal breakage/damage claim modal with [Esc] dismissal."],
        ["Commission Desk (/commission)", "#tab-btn-client-billing", "[F5]", "Opens Client Management C&F Commission & Expense Billing Desk."],
        ["Commission Desk (/commission)", "#btn-autofetch-client-telemetry", "-", "1-Click Auto-Fetch pulling client turnover and depot operating expenses."],
        ["Commission Desk (/commission)", "#check-dual-post-purchase", "-", "Toggles automated dual-posting into the client company inward purchase register."],
        ["Commission Desk (/commission)", "#btn-generate-client-bill", "-", "Atomically creates outward service bill (CF-BILL-) and inward purchase bill (PUR-CF-)."],
        ["Radar (/admin/tracking)", "#select-tracking-scope", "-", "Toggles between Consolidated multi-client view and single-client isolation."],
        ["Radar (/admin/tracking)", "#tab-btn-scorecards", "[F2]", "Displays comparative client scorecards matrix with 1-click drilldown."],
        ["Expiry Cockpit (/inventory-dashboard)", "#card-main-stock", "-", "Displays real-time Main Saleable Stock Value and Healthy Units count."],
        ["Expiry Cockpit (/inventory-dashboard)", "#card-quarantine-stock", "-", "Displays Quarantined Stock Value and Segregated Units count in brk_exp_stock."],
        ["Expiry Cockpit (/inventory-dashboard)", "#card-near-expiry-risk", "-", "Displays 90-Day Near-Expiry Risk Valuation across 4 critical risk buckets."],
        ["Expiry Cockpit (/inventory-dashboard)", "#card-claim-exposure", "-", "Displays active Principal Claims & Debit Note exposure."],
        ["Expiry Cockpit (/inventory-dashboard)", "#tab-btn-radar", "[F2]", "Opens Expiry Radar table with alert pills and search filters."],
        ["Expiry Cockpit (/inventory-dashboard)", "#btn-shift-selected-action", "[F7]", "Shifts chosen batches to quarantine and routes to /stock-shift."],
        ["Stock Shift Desk (/stock-shift)", "#select-from-godown", "-", "Selects source godown (Main Saleable Godown)."],
        ["Stock Shift Desk (/stock-shift)", "#select-to-godown", "-", "Selects destination godown (Quarantine / Expiry Godown)."],
        ["Stock Shift Desk (/stock-shift)", "#check-auto-claim", "-", "Toggles automated generation of official Principal Expiry Claim (CLM-PRN-)."],
        ["Stock Shift Desk (/stock-shift)", "#btn-save-shift-voucher", "[F7]", "Executes atomic stock shift reallocation and files debit note claim."],
        ["Stock Shift Desk (/stock-shift)", "#stock-shift-success-card", "-", "Displays generated voucher (SHF-2026-XXXX) and claim reference."],
        ["Compliance Desk (/compliance)", "#card-qualifying-invoices", "-", "Displays qualifying outbound consignments (≥ ₹50,000) and gross consignment value."],
        ["Compliance Desk (/compliance)", "#card-pending-eway", "-", "Displays consignments pending Part B vehicle transport delivery slips."],
        ["Compliance Desk (/compliance)", "#card-generated-irn", "-", "Displays consignments verified with cryptographic IRN and digital QR codes."],
        ["Compliance Desk (/compliance)", "#card-compliance-rate", "-", "Displays live percentage statutory compliance progress bar."],
        ["Compliance Desk (/compliance)", "#btn-open-transport-modal", "[F7]", "Opens Transporter & Vehicle Assignment modal (#modal-transport-assignment)."],
        ["Compliance Desk (/compliance)", "#btn-export-nic-json", "[F8]", "Exports official Government NIC Schema 1.1 Bulk Upload JSON payload."],
        ["Compliance Desk (/compliance)", "#btn-confirm-generate-compliance", "[Enter]", "Executes 1-Click generation of 64-char IRN, 15-digit Ack No, 12-digit E-Way Bill."],
        ["Compliance Desk (/compliance)", "#btn-print-slip-dialog", "-", "Print trigger for official Government of India CBIC two-part delivery slip."],
        ["GST Workbench (/gst)", "#tab-gstr2b", "[F5]", "Activates GSTR-2B ITC Matching Engine workbench."],
        ["GST Workbench (/gst)", "#metric-2b-total-itc", "-", "Displays Total Inward ITC present in GSTR-2B statements."],
        ["GST Workbench (/gst)", "#metric-2b-safe-itc", "-", "Displays Safe & Claimable ITC meeting Section 16(2)(aa) rules."],
        ["GST Workbench (/gst)", "#metric-2b-at-risk-itc", "-", "Displays At-Risk Blocked ITC missing in 2B or with tax mismatches."],
        ["GST Workbench (/gst)", "#metric-2b-unclaimed-itc", "-", "Displays Unclaimed Credit in 2B omitted in internal accounting ledgers."],
        ["GST Workbench (/gst)", "#btn-tolerance-1 / 5 / 10", "-", "3-tier differential matching tolerance switcher (±₹1, ±₹5, ±₹10)."],
        ["GST Workbench (/gst)", "#btn-bulk-approve-itc", "-", "1-Click bulk approval of matched records for monthly GSTR-3B Table 4(A)(5)."],
        ["GST Workbench (/gst)", "#modal-supplier-dunning", "[Esc]", "Section 16(2)(aa) notice generator with direct WhatsApp dispatch."],
        ["GST Workbench (/gst)", "#modal-ingest-portal-2b", "[Esc]", "Official Government GST Portal GSTR-2B JSON return statement ingestion."]
    ]
    style_table(selector_table, [1.5, 2.0, 0.8, 2.7], selector_headers, selector_data)
    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    # =========================================================================
    # CHAPTER 30: STATUTORY GST E-WAY BILL & E-INVOICE (IRN) DESK (DOC-42)
    # =========================================================================
    doc.add_page_break()
    add_h1("Chapter 30: Statutory GST E-Way Bill & E-Invoice (IRN) Generation Desk (DOC-42)")

    add_h2("30.1 Statutory Transit Mandates & Regulatory Overview")
    add_p(
        "Under Rule 138 of the Central Goods and Services Tax (CGST) Rules, 2017 and Rule 48(4) statutory E-Invoicing mandates, all registered "
        "pharmaceutical distribution enterprises dispatching consignments with invoice valuations exceeding ₹50,000 (and all inter-state movements) "
        "must obtain statutory transit clearances prior to physical goods dispatch: a 64-character cryptographic Invoice Reference Number (IRN) certified "
        "by the Government Invoice Registration Portal (IRP), a signed digital QR code token, and a 12-digit Electronic Way Bill (E-Way Bill) comprising "
        "Part A (Consignment metadata) and Part B (Vehicle conveyance registration number, transport mode, and transporter identification)."
    )

    add_h2("30.2 4-Pillar Compliance Generation & Transport Conveyance Matrix")
    add_p("The end-to-end statutory transit clearance engine operates across four integrated functional pillars:")

    compliance_matrix_table = doc.add_table(rows=1, cols=3)
    compliance_matrix_headers = ["Pillar & Engine", "Route & UI Controls", "Transactional & Statutory Invariant"]
    compliance_matrix_data = [
        [
            "Pillar 1: Real-Time Consignment Detection",
            "Telemetry Scorecards\\nRoute: /compliance",
            "Scans all outbound B2B sales invoices with grand_total ≥ ₹50,000, calculating gross qualifying valuation, consignments pending Part B conveyance, generated IRNs, and live percentage statutory compliance progress bar."
        ],
        [
            "Pillar 2: Transporter & Conveyance Assignment",
            "Transport Modal (#modal-transport-assignment)\\nHotkey: [F7]",
            "Captures commercial transporter profiles, vehicle registration number (e.g. DL-01-AB-1234), distance in KM with automatic CBIC validity calculation (1 day per 200 KM), transport mode (Road/Rail/Air/Ship), and vehicle type (Regular/ODC)."
        ],
        [
            "Pillar 3: 1-Click Cryptographic IRN & EWB Engine",
            "Generation Desk (POST /api/compliance/generate-eway-irn)\\nAction: [Confirm & Generate]",
            "Atomically computes 64-char SHA-256 IRN hash, 15-digit Ack No, 12-digit E-Way Bill No (starting with 24), signed digital QR code string, sets models.EinvoiceEwayLog to SUCCESS, and updates invoice compliance status."
        ],
        [
            "Pillar 4: CBIC Slips & NIC Schema 1.1 JSON",
            "Printable Slip Modal & JSON Center\\nHotkey: [F8]",
            "Generates official Government of India CBIC two-part delivery slips (Part A & Part B) with high-contrast signed digital QR code for driver handover, and exports official NIC Schema 1.1 bulk JSON payloads for direct upload to einvoice1.gst.gov.in."
        ]
    ]
    style_table(compliance_matrix_table, [1.8, 2.5, 2.7], compliance_matrix_headers, compliance_matrix_data)
    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    add_h2("30.3 Visual Photographic Evidence: Transporter Modal, Cockpit & CBIC Slips")
    add_p("The automated Selenium test suite (test_gst_einvoice_eway_selenium.py) verifies all 13 stages with 100% Exit Code 0:")

    add_screenshot(
        "verified_transport_assignment_modal.png",
        "Figure 30.1: Transporter & Vehicle Assignment Modal (#modal-transport-assignment) showing selected consignment valuation, transporter dropdown, vehicle registration input (DL-01-AB-1234), distance (180 KM), and calculated validity."
    )

    add_screenshot(
        "verified_compliance_cockpit.png",
        "Figure 30.2: Statutory GST E-Way Bill & E-Invoice Desk (/compliance) displaying 4 live telemetry scorecards (101 Qualifying Consignments, ₹2.13 Cr gross valuation), success banner, and Tab [F3] E-Way & IRN Register log."
    )

    add_screenshot(
        "verified_eway_slip_preview.png",
        "Figure 30.3: Official Government of India CBIC E-Way Bill Delivery Slip (#modal-eway-slip-preview) featuring official header, EWB 244051149018, Part A invoice details (HSN 3004), Part B vehicle conveyance (DL-01-AB-1234), and high-contrast signed digital QR code representation."
    )

    # =========================================================================
    # CHAPTER 31: STATUTORY GSTR-1, GSTR-2B & GSTR-3B RECONCILIATION COCKPIT (DOC-43)
    # =========================================================================
    doc.add_page_break()
    add_h1("Chapter 31: Statutory Multi-State GSTR-1, GSTR-2B & GSTR-3B Reconciliation Cockpit with Section 16(2)(aa) 2B ITC Matching Engine (DOC-43)")

    add_h2("31.1 Legislative Framework: Section 16(2)(aa) & Rule 37A ITC Compliance")
    add_p(
        "Under Section 16(2)(aa) of the Central Goods and Services Tax (CGST) Act, 2017 (notified w.e.f. 1 January 2022), registered businesses "
        "are strictly prohibited from availing Input Tax Credit (ITC) in their monthly GSTR-3B returns unless the underlying invoice has been furnished "
        "by the supplier in their outward statement (Form GSTR-1 or Invoice Furnishing Facility - IFF) and communicated to the recipient in auto-drafted "
        "Form GSTR-2B. Availing credit without GSTR-2B reflection triggers automated Form GST DRC-01B disparity notices, mandatory 18% per annum interest, "
        "and statutory credit reversals under Rule 37A."
    )

    add_h2("31.2 4-Way Matching Matrix & Tolerance Differential Engine")
    add_p(
        "The reconciliation engine correlates internal purchase vouchers against portal GSTR-2B records across a dual-ledger side-by-side table, "
        "applying fuzzy/exact invoice number normalization (stripping special characters and leading zeros) and 3-tier differential tolerance (±₹1, ±₹5, ±₹10):"
    )

    recon_matrix_table = doc.add_table(rows=1, cols=3)
    recon_matrix_headers = ["Reconciliation Category", "Status & Audit Criteria", "Operational & Compliance Action"]
    recon_matrix_data = [
        [
            "MATCHED (Safe ITC)",
            "Invoice present in both Books & GSTR-2B with Tax Variance <= Tolerance (e.g. +-Rs.10).",
            "Auto-cleared under Section 16(2)(aa). Operators execute 1-Click Bulk Approval (#btn-bulk-approve-itc) to unlock credit for monthly GSTR-3B Table 4(A)(5) availing."
        ],
        [
            "TAX MISMATCH",
            "Invoice present in both ledgers, but tax discrepancy exceeds configured tolerance.",
            "Visual orange warning displayed with exact rupee tax and taxable differential. Operators issue vendor debit notes or request invoice amendments."
        ],
        [
            "MISSING IN 2B (At-Risk ITC)",
            "Purchase voucher recorded in ERP internal books, but absent from Government GST Portal GSTR-2B statement.",
            "Credit is legally blocked. Operators launch Supplier Dunning Modal (#modal-supplier-dunning) to dispatch Section 16(2)(aa) statutory notice via direct WhatsApp API."
        ],
        [
            "MISSING IN BOOKS (Unclaimed Credit)",
            "Invoice auto-drafted on GSTR-2B portal, but unrecorded in internal accounting purchase ledgers.",
            "Represents genuine unclaimed ITC. Operators click 'Book Inward' (#btn-force-row-{idx}) to generate inward purchase vouchers without manual re-keying."
        ]
    ]
    style_table(recon_matrix_table, [1.8, 2.5, 2.7], recon_matrix_headers, recon_matrix_data)
    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    add_h2("31.3 Visual Photographic Evidence: Scorecards, Dunning Modal, Ingest & Workbench")
    add_p("The automated Selenium test suite (test_gstr2b_reconciliation_selenium.py) verifies all 13 stages with 100% Exit Code 0:")

    add_screenshot(
        "verified_gstr2b_telemetry_scorecards.png",
        "Figure 31.1: Telemetry 4 Scorecards showing Total ITC in GSTR-2B (₹25,06,165.98), Safe & Claimable ITC (₹17,55,898.96, 61.1% Matched ratio), At-Risk Blocked ITC (₹5,34,539.49), and Unclaimed Credit in 2B (₹37,782.00)."
    )

    add_screenshot(
        "verified_supplier_dunning_modal.png",
        "Figure 31.2: Section 16(2)(aa) Supplier Dunning Notice Modal (#modal-supplier-dunning) for Torrent Pharma Distributors showing blocked tax exposure of ₹22,449.98, pre-filled legal notice body, copy action, and direct WhatsApp sharing button."
    )

    add_screenshot(
        "verified_gstr2b_ingest_modal.png",
        "Figure 31.3: Government Portal GSTR-2B JSON Ingestion Modal (#modal-ingest-portal-2b) accepting official docdata.b2b payloads for immediate normalization and compliance synchronization."
    )

    add_screenshot(
        "verified_gstr2b_reconciliation_workbench.png",
        "Figure 31.4: Dual-Ledger GSTR-2B Reconciliation Workbench (/gst) displaying category filter pills, tolerance switcher (±₹1, ±₹5, ±₹10), multi-state dropdown, and side-by-side comparative table with audit actions."
    )

    # =========================================================================
    # CHAPTER 32: ENTERPRISE CLOUD AUTHENTICATION, MULTI-TENANT SESSION RECOVERY & PRODUCTION CLIENT ONBOARDING DESK (DOC-44)
    # =========================================================================
    doc.add_page_break()
    add_h1("Chapter 32: Enterprise Cloud Authentication, Multi-Tenant Session Recovery & Production Client Onboarding Desk (DOC-44)")

    add_h2("32.1 Architectural Overview & Root-Cause Diagnosis")
    add_p(
        "In enterprise multi-tenant cloud deployments, secure authentication bridges the client Single Page Application (hosted on the Vercel Edge Network at https://erp-rho-three.vercel.app) "
        "and the high-concurrency FastAPI core service (hosted on Render at https://erp-backend-liaw.onrender.com), backed by Neon Serverless PostgreSQL. "
        "During production operations, client registration and administrative tenant onboarding require cryptographically verified JWT bearer tokens with active database sessions."
    )
    add_p(
        "A critical regression was identified during live Vercel operations: the '1-Click Demo Access' shortcut previously assigned a client-side mock string ('demo-preview-jwt-token') "
        "in browser localStorage. While adequate for offline navigational simulation, this synthetic string lacked a corresponding cryptographic session in PostgreSQL. Consequently, attempting "
        "to register new client companies via POST /api/organizations/register resulted in HTTP 401 Unauthorized errors from the live cloud backend."
    )

    add_h2("32.2 Dual-Layered Architectural Resolution: Live JWT Acquisition & Session Self-Healing")
    add_p(
        "To achieve 100% production resilience without compromising the rapid 1-click evaluation workflow, a dual-layered architectural solution was implemented:"
    )

    auth_arch_table = doc.add_table(rows=1, cols=3)
    auth_arch_headers = ["Layer / Subsystem", "Technical Implementation", "Operational Benefit"]
    auth_arch_data = [
        [
            "Live Cloud Demo Authentication (Login.tsx)",
            "handleDemoLogin() upgraded to execute an asynchronous REST call to POST /api/auth/token against the live Render gateway using verified cloud credentials ('AM-0001' / 'admin' / 'Admin@123'). On success, an authentic 8-hour JWT Bearer token and full tenant profile are committed to localStorage.",
            "Eliminates mock tokens entirely during live cloud sessions; enables instant access to production features while preserving full database authorization."
        ],
        [
            "Transparent Session Self-Healing (RegisterClientModal & ClientManagement)",
            "Embedded proactive session guard (ensureLiveCloudAuthSession) that inspects the active token prior to modal launch and payload submission. If a legacy mock token is detected, it automatically exchanges credentials for a fresh cloud JWT without interrupting user workflow.",
            "Zero operational friction for operators; protects onboarding workflows against stale tokens, session timeouts, and cold-start authentication lapses."
        ],
        [
            "1-Click Credential Quick-Fill Presets (Login.tsx)",
            "Rendered interactive quick-fill chips on the login card: '#btn-quick-fill-admin' (pre-populating AM-0001 / admin / Admin@123) and '#btn-quick-fill-client' (pre-populating CM-0001 / manager / Pass@123).",
            "Permits instant manual credential verification and automated Selenium UI test targeting with zero keyboard typing overhead."
        ],
        [
            "Pydantic Validation & Normalization (backend/routers/organizations.py)",
            "Normalized organization code extraction, added default boolean fallback for is_admin_company: bool = False in schema models, and extended Axios network timeout from 30s to 60s in src/lib/api.ts to absorb Render cold-starts.",
            "Prevents schema parsing exceptions and handles cloud container spin-up delays gracefully."
        ]
    ]
    style_table(auth_arch_table, [1.8, 2.7, 2.5], auth_arch_headers, auth_arch_data)
    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    add_h2("32.3 Multi-Tenant Client Registration Modal & DOM Inventory")
    add_p(
        "The Client Management console (/admin/clients) provides enterprise administrators with complete lifecycle control over tenant organizations. "
        "The registration drawer (#btn-register-new-client) presents an exhaustive input specification backed by unique semantic DOM identifiers:"
    )

    dom_client_table = doc.add_table(rows=1, cols=4)
    dom_client_headers = ["DOM Element ID", "Element Type", "Field Label / Role", "Validation & Business Logic"]
    dom_client_data = [
        ["#btn-register-new-client", "Button", "Register Client Trigger", "Opens modal, initializes auto-generated tenant code, and verifies cloud session."],
        ["#input-client-org-name", "HTML Input (text)", "Organization Name", "Legal corporate or pharmacy entity name; minimum 3 characters."],
        ["#input-client-org-code", "HTML Input (text)", "Organization Code", "Unique 4-10 character tenant prefix (e.g. 'AMC-F5BA'); auto-uppercased."],
        ["#input-client-admin-name", "HTML Input (text)", "Admin Full Name", "Primary tenant administrator full name; auto-creates user record."],
        ["#input-client-admin-username", "HTML Input (text)", "Admin Username", "System login handle for tenant administrator; checked for global uniqueness."],
        ["#input-client-admin-password", "HTML Input (password)", "Admin Password", "Initial login secret; minimum 6 characters with secure masking."],
        ["#btn-submit-register-client", "Button", "Submit Registration", "Dispatches POST /api/organizations/register with active JWT Bearer header."],
        ["#btn-quick-fill-admin", "Button / Chip", "Admin Preset", "Quick-fills Head Office credentials on Login screen."],
        ["#btn-quick-fill-client", "Button / Chip", "Client Preset", "Quick-fills Branch Client credentials on Login screen."]
    ]
    style_table(dom_client_table, [1.8, 1.3, 1.8, 2.1], dom_client_headers, dom_client_data)
    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    add_h2("32.4 Automated Selenium Verification Suite & Live Production Evidence")
    add_p(
        "Verification of the cloud client registration and authentication pipeline is fully automated via verify_live_vercel_client_creation.py (Suite 19). "
        "The test executes against the live production environment (https://erp-rho-three.vercel.app), validating login presets, session acquisition, "
        "modal invocation, dynamic client generation, and database grid rendering:"
    )

    add_screenshot(
        "verified_live_vercel_login_chips.png",
        "Figure 32.1: Production Login Screen on Vercel (https://erp-rho-three.vercel.app) displaying 1-Click Credential Quick-Fill Presets (#btn-quick-fill-admin and #btn-quick-fill-client) and Live Asynchronous Demo Access button."
    )

    add_screenshot(
        "verified_live_vercel_client_registered.png",
        "Figure 32.2: Live Client Registration Modal (#btn-register-new-client) populated with dynamic tenant metadata (Apex MedCorp F5BA / AMC-F5BA) and administrator credentials, submitting to live Render FastAPI gateway."
    )

    add_screenshot(
        "verified_live_vercel_clients_grid.png",
        "Figure 32.3: Live Neon PostgreSQL Multi-Tenant Client Directory Grid (/admin/clients) displaying the newly created client 'Apex MedCorp F5BA (AMC-F5BA)' in Active status with tenant impersonation and operations controls."
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

