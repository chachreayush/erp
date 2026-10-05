import os

path = 'src/pages/sales/SalesBill.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. State Injection
state_injection = """
  // --- F9 Sales Order Load State ---
  const [showSOModal, setShowSOModal] = useState(false);
  const [pendingSOs, setPendingSOs] = useState<any[]>([]);
  const [soSelectedIndex, setSoSelectedIndex] = useState(0);
  const [sourceOrderId, setSourceOrderId] = useState<string | null>(null);

  const fetchPendingSOs = async () => {
    try {
      const { data } = await apiClient.get('/api/orders');
      setPendingSOs(data.filter((o: any) => o.status === 'APPROVED'));
    } catch (e) {}
  };
  // -----------------------------------
"""
if 'showSOModal' not in content:
    content = content.replace(
        'const [f3SelectedIndex, setF3SelectedIndex] = useState(0)',
        'const [f3SelectedIndex, setF3SelectedIndex] = useState(0)\n' + state_injection
    )

# 2. Keydown Injection
keydown_injection = """      if (e.key === 'F9' && type.includes('challan')) {
        e.preventDefault();
        fetchPendingSOs();
        setShowSOModal(true);
      } else if (e.key === 'End') {"""
content = content.replace(
    "if (e.key === 'End') {",
    keydown_injection
)

# 3. Payload Injection for source_order_id
if 'source_order_id: sourceOrderId' not in content:
    content = content.replace(
        "bill_discount: parseFloat(billDiscount) || 0,",
        "bill_discount: parseFloat(billDiscount) || 0,\n      source_order_id: sourceOrderId,"
    )
    content = content.replace(
        "igst_percent: row.igst ? parseFloat(row.igst) : 0,",
        "igst_percent: row.igst ? parseFloat(row.igst) : 0,\n        source_order_item_id: (row as any).source_order_item_id || null,"
    )

# 4. Ribbon UI Injection
if '[F9] Load Order' not in content:
    content = content.replace(
        '<span className="mr-4"><kbd className="bg-[var(--color-bg-muted)] px-1 rounded border border-[var(--color-border-strong)] text-[var(--color-text-dim)]">F3</kbd> History</span>',
        '<span className="mr-4"><kbd className="bg-[var(--color-bg-muted)] px-1 rounded border border-[var(--color-border-strong)] text-[var(--color-text-dim)]">F3</kbd> History</span>\n            {type.includes(\'challan\') && <span className="mr-4 text-emerald-400 font-medium"><kbd className="bg-[var(--color-bg-muted)] px-1 rounded border border-emerald-500/50 text-emerald-300">F9</kbd> Load Order</span>}'
    )

# 5. Modal Injection
so_modal = """
      {/* F9 LOAD SALES ORDER MODAL */}
      {showSOModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center"
             onClick={() => setShowSOModal(false)}>
             <div className="bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-lg w-[700px] shadow-2xl flex flex-col"
                  onClick={e => e.stopPropagation()}>
                <div className="p-3 border-b border-[var(--color-border)] flex justify-between items-center bg-[var(--color-bg-subtle)] rounded-t-lg">
                  <h3 className="font-bold text-[var(--color-text)]">Select Approved Sales Order</h3>
                  <div className="text-[var(--color-text-dim)] text-xs">Use <kbd className="border border-[var(--color-border)] px-1 rounded">UP</kbd> <kbd className="border border-[var(--color-border)] px-1 rounded">DOWN</kbd> to navigate, <kbd className="border border-[var(--color-border)] px-1 rounded">Enter</kbd> to load, <kbd className="border border-[var(--color-border)] px-1 rounded">Esc</kbd> to close</div>
                </div>
                <div className="p-2 max-h-[400px] overflow-y-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[var(--color-border-strong)] text-[var(--color-text-dim)] text-xs uppercase">
                        <th className="p-2">Order No</th>
                        <th className="p-2">Date</th>
                        <th className="p-2">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingSOs.length === 0 ? (
                        <tr><td colSpan={3} className="p-4 text-center text-[var(--color-text-dim)]">No approved orders found.</td></tr>
                      ) : (
                        pendingSOs.map((so, idx) => (
                          <tr key={so.id} 
                              className={`border-b border-[var(--color-border-strong)] cursor-pointer ${idx === soSelectedIndex ? 'bg-emerald-900/30' : 'hover:bg-[var(--color-bg-subtle)]'}`}
                              onClick={() => {
                                setSourceOrderId(so.id);
                                if (so.party_id) {
                                  setPartyName(so.party_id);
                                }
                                // Auto-fill grid
                                const newRows = so.items.map((item: any) => ({
                                  id: Math.random().toString(36).substring(7),
                                  product: item.product_name,
                                  batch: '',
                                  expiry: '',
                                  qty: String(item.quantity - item.allocated_qty),
                                  free: '',
                                  mrp: '',
                                  rate: String(item.rate),
                                  dis: '',
                                  source_order_item_id: item.id
                                })).filter((r: any) => parseFloat(r.qty) > 0);
                                
                                while (newRows.length < 8) {
                                  newRows.push({
                                    id: Math.random().toString(36).substring(7),
                                    product: '', batch: '', expiry: '', qty: '', free: '', mrp: '', rate: '', dis: ''
                                  });
                                }
                                setGridRows(newRows);
                                setShowSOModal(false);
                              }}>
                            <td className="p-2">{so.order_number}</td>
                            <td className="p-2">{new Date(so.date).toLocaleDateString()}</td>
                            <td className="p-2 font-mono">₹{parseFloat(so.total_amount).toFixed(2)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                <input 
                  autoFocus
                  className="opacity-0 w-0 h-0 absolute"
                  onKeyDown={e => {
                    if (e.key === 'Escape') setShowSOModal(false);
                    if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      setSoSelectedIndex(prev => Math.min(prev + 1, pendingSOs.length - 1));
                    }
                    if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      setSoSelectedIndex(prev => Math.max(prev - 1, 0));
                    }
                    if (e.key === 'Enter' && pendingSOs[soSelectedIndex]) {
                      e.preventDefault();
                      const so = pendingSOs[soSelectedIndex];
                      setSourceOrderId(so.id);
                      if (so.party_id) setPartyName(so.party_id);
                      const newRows = so.items.map((item: any) => ({
                        id: Math.random().toString(36).substring(7),
                        product: item.product_name,
                        batch: '', expiry: '',
                        qty: String(item.quantity - item.allocated_qty),
                        free: '', mrp: '',
                        rate: String(item.rate), dis: '',
                        source_order_item_id: item.id
                      })).filter((r: any) => parseFloat(r.qty) > 0);
                      while (newRows.length < 8) {
                        newRows.push({
                          id: Math.random().toString(36).substring(7),
                          product: '', batch: '', expiry: '', qty: '', free: '', mrp: '', rate: '', dis: ''
                        });
                      }
                      setGridRows(newRows);
                      setShowSOModal(false);
                    }
                  }}
                />
             </div>
        </div>
      )}
"""
if 'F9 LOAD SALES ORDER MODAL' not in content:
    content = content.replace(
        "{/* F3 HISTORY MODAL */}",
        so_modal + "\n      {/* F3 HISTORY MODAL */}"
    )

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("F9 Hook Injected Successfully!")
