with open("src/pages/finance/FixedAssets.tsx", "r", encoding="utf-8") as f:
    code = f.read()

# 1. Add state for History Modal and logs
target_state = "const [runDate, setRunDate] = useState(new Date().toISOString().split('T')[0]);"
replacement_state = target_state + """
  // History Modal
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyLogs, setHistoryLogs] = useState<any[]>([]);
  const [historyAsset, setHistoryAsset] = useState<any>(null);

  const handleViewHistory = async (asset: any) => {
    setHistoryAsset(asset);
    try {
        const res = await apiClient.get(`/api/assets/${asset.id}/depreciation-logs`);
        setHistoryLogs(res.data);
        setShowHistoryModal(true);
    } catch(e) {
        alert("Failed to load history");
    }
  };
"""
code = code.replace(target_state, replacement_state)

# 2. Add History Button to Table Actions
target_actions = """                            <button 
                                onClick={() => { setDepAsset(a); setShowDepModal(true); }}
                                className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded text-sm inline-flex items-center gap-1"
                            >
                                <Calculator className="w-3 h-3"/> Depreciate
                            </button>"""
replacement_actions = """                            <div className="flex justify-end gap-2">
                                <button 
                                    onClick={() => handleViewHistory(a)}
                                    className="px-3 py-1.5 bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300 rounded text-xs inline-flex items-center gap-1 transition-colors"
                                >
                                    History
                                </button>
                                <button 
                                    onClick={() => { setDepAsset(a); setShowDepModal(true); }}
                                    className="px-3 py-1.5 bg-indigo-600/20 border border-indigo-500/30 hover:bg-indigo-600/40 text-indigo-300 rounded text-xs inline-flex items-center gap-1 transition-colors"
                                >
                                    <Calculator className="w-3 h-3"/> Depreciate
                                </button>
                            </div>"""
code = code.replace(target_actions, replacement_actions)

# 3. Format Currency
code = code.replace("? {a.purchase_value.toFixed(2)}", "? {Number(a.purchase_value).toLocaleString('en-IN', {minimumFractionDigits: 2})}")
code = code.replace("? {a.current_net_block.toFixed(2)}", "? {Number(a.current_net_block).toLocaleString('en-IN', {minimumFractionDigits: 2})}")

# 4. Widen Modals
code = code.replace('className="bg-slate-800 p-6 rounded-xl border border-slate-700 w-96"', 'className="bg-slate-800 p-6 rounded-xl border border-slate-700 w-full max-w-md shadow-2xl shadow-black/50"')

# 5. Inject History Modal at the bottom
target_end = "    </div>\n  );\n}"
history_modal = """
      {/* History Modal */}
      {showHistoryModal && historyAsset && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 w-full max-w-2xl shadow-2xl shadow-black/50">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-lg font-bold text-white">{historyAsset.name}</h3>
                        <p className="text-sm text-slate-400">Depreciation & Value History</p>
                    </div>
                    <button onClick={()=>setShowHistoryModal(false)} className="text-slate-400 hover:text-white">?</button>
                </div>
                
                <div className="max-h-[400px] overflow-y-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-900/50 text-slate-400">
                            <tr>
                                <th className="p-3">Run Date</th>
                                <th className="p-3">Notes</th>
                                <th className="p-3 text-right">Depreciation</th>
                                <th className="p-3 text-right">Closing Net Block</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/50">
                            {historyLogs.length === 0 ? (
                                <tr><td colSpan={4} className="p-4 text-center text-slate-500">No depreciation runs yet.</td></tr>
                            ) : historyLogs.map(log => (
                                <tr key={log.id} className="hover:bg-slate-700/20">
                                    <td className="p-3 text-slate-300">{new Date(log.run_date).toLocaleDateString()}</td>
                                    <td className="p-3 text-slate-400">{log.notes || '-'}</td>
                                    <td className="p-3 text-right text-rose-400 font-medium">- ?{Number(log.depreciation_amount).toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                                    <td className="p-3 text-right text-emerald-400 font-medium">?{Number(log.closing_net_block).toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
      )}
"""
code = code.replace(target_end, history_modal + target_end)

with open("src/pages/finance/FixedAssets.tsx", "w", encoding="utf-8") as f:
    f.write(code)
