
import os
import datetime
today = datetime.datetime.now().strftime('%Y-%m-%d')
def append(fn, content):
    with open(fn, 'a', encoding='utf-8') as f:
        f.write('\n\n### [Update: ' + today + ']\n')
        f.write(content)

append('PROJECT_MEMORY.md', '- **Smart MRP Integration**: Added an AI-powered Smart MRP modal to calculate min_stock_level and reorder_quantity based on a 30-day sales velocity algorithm. Injected into the Products page and integrated with the Dashboard Low Stock Alerts.\n- **Global Search**: Implemented a Marg/Odoo-style Ctrl+K search bar in the header for quick navigation between modules and products.\n- **UI & Layout Fixes**: Fixed AppShell padding to allow edge-to-edge layouts. Centered the Finance & Accounting page layout. Restored dropdown text legibility in the Minimal White/Green theme.\n- **Sales Bill Remaster**: Restructured SalesBill.tsx to an edge-to-edge layout, compressed the Product column width, and added a Live Intelligence right-side panel containing Party Details, Active Product metrics, and Keyboard shortcuts.\n- **Document Cancellation**: Added POST /api/sales/invoices/{id}/cancel endpoint (SAP-style reversal) to create negative quantity records without deleting original audit trails.\n')
append('DEVELOPER_MANUAL.md', '#### New Architecture Additions\n- **Auto-MRP Calculation API**: Located in backend/api/stock.py, calculates 30-day velocity for min stock, and avg_daily * 30 for reorder quantities.\n- **SAP-Style Document Reversal**: The cancellation endpoint copies the target invoice and reverses the quantity and line_total amounts to restore stock and maintain an immutable financial ledger.\n- **Responsive Edge-to-Edge Layout**: AppShell.tsx now has padding: 0px on its content wrapper to allow the SalesBill.tsx component to span fully across monitors. Nested components must define their own max-width and margin: 0 auto if they wish to remain centered.\n')
append('USER_WORKFLOW_MANUAL.md', '#### New Workflows & Features\n1. **Smart MRP Configuration**\n   - **Access**: Navigate to Inventory > Products, click the Smart MRP button.\n   - **Workflow**: The system scans past sales and suggests new Minimum Stock and Reorder quantities.\n2. **Global Search**\n   - **Access**: Click the Search bar in the top navigation or press Ctrl + K.\n   - **Workflow**: Type any module name (e.g., Sale, Ledger) to instantly navigate to it.\n3. **Enhanced Sales Bill Workspace**\n   - The billing screen now utilizes the full monitor width.\n   - A **Live Intelligence Panel** on the right side provides instant details on the selected party balance and the currently highlighted product MRP, Stock, and Margins.\n')
print('Docs updated')

