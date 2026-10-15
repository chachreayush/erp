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
    add_p("DOC-35 defines the centralized freight calculation, rate resolution, cost allocation, commercial recovery, and three-way transporter reconciliation engine for the enterprise ERP.")

    add_callout(
        "DOC-35 ARCHITECTURAL INVARIANTS & CORE DESIGN PRINCIPLES:\n"
        "1. Strict Separation of Cost, Recovery, and Logistics Margin: Transporter cost incurred is never conflated with or silently offset by customer/principal recoveries.\n"
        "2. First-Class Cost Bearer Policy: When Platform Admin is configured as cost bearer for client company dispatches, the accounting expense posts exclusively to Account 5200 in the Platform Admin General Ledger; the Client Company General Ledger maintains zero auto-debits.\n"
        "3. Deterministic Explainability Snapshots: Every calculation generates an immutable JSON snapshot with inputs, formula traces, and rule versions.\n"
        "4. Three-Way Transporter Billing & Reconciliation: Transporter invoices are audited against system-expected costs with automated variance status tagging (MATCHED, TOLERABLE, UNAPPROVED_EXCESS, DISPUTED) and 1-click GL posting.",
        prefix="DOC-35 CORE MANDATE: "
    )

    add_h2("21.1 Implemented Relational Schema & Backend Services")
    add_p("DOC-35 introduces 11 relational entities mapped via SQLAlchemy 2.0 and mounted under /api/freight:")
    add_p("• FreightContract & FreightLane: Transporter contract master with priority, vehicle classes, and origin-destination distance matrices.")
    add_p("• FreightRateRule & FreightAncillaryRule: Tiered weight slabs, base rates, minimum charges, and ancillary surcharges (Loading ₹300, Toll ₹450, Hamali ₹15/pkg, Transit Cover 0.5%, Demurrage ₹500).")
    add_p("• FreightCostEvent & FreightCalculationSnapshot: Atomic cost facts linked to DOC-34 consignments with complete formula explainability traces.")
    add_p("• FreightAllocation & FreightRecovery: Multi-document proportional splitting (Weight, Value, Packages, Equal) and commercial customer/principal recovery accounting.")
    add_p("• FreightReconciliation: Three-way match workbench for auditing transporter statements against expected dispatches.")

    add_h2("21.2 Interactive UI Cockpits & Verification Proof")
    add_p("The frontend delivers two dedicated luxury Marg-themed cockpits:")
    add_p("1. Freight Rate Master (/freight/contracts): 4 Top KPI cards, rate card matrix, and an interactive Calculation Sandbox with live parameter inputs and formula trace rendering.")
    add_p("2. Transporter Billing & Reconciliation Desk (/freight/reconciliation): Complete statement audit grid with variance thresholds, dispute logging, and 1-click GL posting to Account 5200.")
    add_p("3. Zero-Mouse Operational Guarantee: 100% keyboard navigable with [F6] New Contract/Bill modal, [F4] Sandbox toggle, [Esc] hierarchical dismissal, and [Ctrl+2] Counter Workbench hotkey.")

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

