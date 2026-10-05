import os

path = 'src/pages/sales/SalesBill.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update Title and Target Type
if "type === 'challan' ? 'Sales Challan' : 'Sales Bill'" in content:
    content = content.replace(
        "{type === 'challan' ? 'Sales Challan' : 'Sales Bill'}",
        "{type === 'credit_note' ? 'Sales Return' : type === 'challan' ? 'Sales Challan' : 'Sales Bill'}"
    )

if "let targetType = \"sales_invoice\";" in content:
    content = content.replace(
        "if (type.includes('challan')) targetType = \"sales_challan\";",
        "if (type.includes('challan')) targetType = \"sales_challan\";\n        if (type.includes('credit_note')) targetType = \"credit_note\";"
    )

# 2. Add F8 State and load logic
state_injection = """  // --- DOC-21 Sales Return Engine (F8 Load Invoice) ---
  const [showF8Modal, setShowF8Modal] = useState(false);
  const [f8InvoiceNumber, setF8InvoiceNumber] = useState('');
  
  const fetchOriginalInvoice = async () => {
    if (!f8InvoiceNumber.trim()) return;
    try {
      const res = await apiClient.get(`/api/sales/invoice/by-number/${f8InvoiceNumber}`);
      const inv = res.data;
      if (inv) {
        setPartyName(inv.customer_name);
        
        // Populate items with remaining returnable quantity
        const newRows = inv.items
          .filter((item: any) => item.quantity - (item.returned_qty || 0) > 0)
          .map((item: any) => ({
             id: Math.random().toString(36).substring(7),
             product: item.product_name,
             batch: item.batch || '',
             expiry: item.expiry || '',
             qty: String(item.quantity - (item.returned_qty || 0)),
             free: '',
             mrp: String(item.mrp || 0),
             rate: String(item.rate || 0),
             dis: String(item.discount_percent || 0),
             source_invoice_item_id: item.id
          }));
          
        while (newRows.length < 8) {
          newRows.push({
            id: Math.random().toString(36).substring(7),
            product: '', batch: '', expiry: '', qty: '', free: '', mrp: '', rate: '', dis: ''
          });
        }
        setGridRows(newRows);
        setShowF8Modal(false);
      }
    } catch (e: any) {
      alert("Invoice not found or no returnable items left.");
    }
  };
"""

if "const [showF8Modal, setShowF8Modal]" not in content:
    content = content.replace(
        "const [showSOModal, setShowSOModal] = useState(false)",
        state_injection + "\n  const [showSOModal, setShowSOModal] = useState(false)"
    )

# 3. Add F8 keyboard hook
hook_injection = """        } else if (e.key === 'F8' && type === 'credit_note') {
          e.preventDefault();
          setShowF8Modal(true);"""

if "e.key === 'F8'" not in content:
    content = content.replace(
        "if (e.key === 'F9') {",
        "if (e.key === 'F9') {\n" + "          e.preventDefault();\n          fetchPendingSOs();\n          setShowSOModal(true);\n" + hook_injection
    )

# 4. Add the F8 Modal JSX and Shortcut Button
jsx_f8_modal = """
      {/* "?"? F8 LOAD INVOICE MODAL (DOC-21) "?"? */}
      {showF8Modal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '24px', width: '400px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 'bold' }}>Load Original Invoice</h3>
            <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '16px' }}>Enter the Sales Invoice number you want to process a return against.</p>
            <input
              autoFocus
              value={f8InvoiceNumber}
              onChange={e => setF8InvoiceNumber(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && fetchOriginalInvoice()}
              placeholder="e.g. MUM-1001"
              style={{ width: '100%', padding: '8px', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '4px', color: 'white', marginBottom: '16px' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button onClick={() => setShowF8Modal(false)} style={{ padding: '8px 16px', backgroundColor: 'transparent', border: '1px solid #475569', borderRadius: '4px', color: '#94a3b8', cursor: 'pointer' }}>Cancel</button>
              <button onClick={fetchOriginalInvoice} style={{ padding: '8px 16px', backgroundColor: '#3b82f6', border: 'none', borderRadius: '4px', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>Load Items</button>
            </div>
          </div>
        </div>
      )}
"""

if "F8 LOAD INVOICE MODAL" not in content:
    content = content.replace(
        "{/* "?"? F9 LOAD SALES ORDER MODAL (DOC-19) "?"? */}",
        jsx_f8_modal + "\n      {/* "?"? F9 LOAD SALES ORDER MODAL (DOC-19) "?"? */}"
    )

shortcut_btn = """              {type === 'credit_note' ? (
                <button 
                  onClick={() => setShowF8Modal(true)}
                  style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#fca5a5', padding: '6px 0', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', transition: 'background-color 0.2s' }}
                >
                  F8 - Load Inv
                </button>
              ) : (
                <button 
                  onClick={() => { fetchPendingSOs(); setShowSOModal(true); }}
                  style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#34d399', padding: '6px 0', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', transition: 'background-color 0.2s' }}
                >
                  F9 - Load SO
                </button>
              )}"""

if "F8 - Load Inv" not in content:
    content = content.replace(
        """              <button 
                onClick={() => { fetchPendingSOs(); setShowSOModal(true); }}
                style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#34d399', padding: '6px 0', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', transition: 'background-color 0.2s' }}
              >
                F9 - Load SO
              </button>""",
        shortcut_btn
    )

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated SalesBill.tsx for DOC-21 successfully")
