import React, { useState, useEffect } from 'react';
import apiClient from '../../lib/api';
import { useReturnNavigation } from '../../hooks/useReturnNavigation';
import { Plus, MonitorPlay, Calculator } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function FixedAssets() {
  useReturnNavigation();
  const navigate = useNavigate();
  const [assets, setAssets] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [categoryId, setCategoryId] = useState('');
  const [name, setName] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [purchaseValue, setPurchaseValue] = useState('');
  const [salvageValue, setSalvageValue] = useState('0');
  
  // Dep modal
  const [showDepModal, setShowDepModal] = useState(false);
  const [depAsset, setDepAsset] = useState<any>(null);
  const [runDate, setRunDate] = useState(new Date().toISOString().split('T')[0]);
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


  useEffect(() => {
    fetchData();
  }, []);
  
  const fetchData = async () => {
    const aRes = await apiClient.get('/api/assets');
    setAssets(aRes.data);
    const cRes = await apiClient.get('/api/assets/categories');
    setCategories(cRes.data);
  };
  
  const handleRegister = async () => {
    if (!categoryId) {
        alert("Please select a Category first.");
        return;
    }
    if (!name || !purchaseValue) {
        alert("Please enter Asset Name and Purchase Value.");
        return;
    }
    try {
        await apiClient.post('/api/assets', {
            category_id: categoryId,
            name,
            purchase_date: purchaseDate,
            purchase_value: parseFloat(purchaseValue),
            salvage_value: parseFloat(salvageValue)
        });
        setShowModal(false);
        fetchData();
    } catch(e) {
        alert("Failed to register asset");
    }
  };
  
  const handleDepreciate = async () => {
    try {
        await apiClient.post(`/api/assets/${depAsset.id}/depreciate`, {
            run_date: runDate
        });
        setShowDepModal(false);
        alert("Depreciation journal voucher created successfully!");
        fetchData();
    } catch(e: any) {
        alert("Failed to run depreciation: " + (e.response?.data?.detail || e.message));
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto text-slate-200">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <MonitorPlay className="w-6 h-6 text-indigo-400" />
            Fixed Asset Registry
          </h1>
          <p className="text-sm text-slate-400">Track lifecycle and calculate depreciation</p>
        </div>
        <div className="flex gap-2">
            <button onClick={() => navigate('/finance/asset-categories')} className="px-4 py-2 bg-slate-800 text-slate-300 rounded hover:bg-slate-700 transition-colors">
                Categories
            </button>
            <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors">
                <Plus className="w-4 h-4" />
                Register Asset
            </button>
        </div>
      </div>
      
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
        <table className="w-full text-left">
            <thead className="bg-slate-900/50 text-xs uppercase text-slate-400">
                <tr>
                    <th className="p-4">Asset Name</th>
                    <th className="p-4">Purchase Date</th>
                    <th className="p-4 text-right">Original Value</th>
                    <th className="p-4 text-right">Current Net Block</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 text-right">Actions</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
                {assets.map(a => {
                    const cat = categories.find(c => c.id === a.category_id);
                    return (
                    <tr key={a.id} className="hover:bg-slate-700/20">
                        <td className="p-4">
                            <div className="font-medium text-white">{a.name}</div>
                            <div className="text-xs text-slate-400">{cat?.name} ({cat?.depreciation_rate}% {cat?.depreciation_method})</div>
                        </td>
                        <td className="p-4 text-slate-300">{new Date(a.purchase_date).toLocaleDateString()}</td>
                        <td className="p-4 text-right text-slate-300">? {Number(a.purchase_value).toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                        <td className="p-4 text-right font-bold text-emerald-400">? {Number(a.current_net_block).toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                        <td className="p-4 text-center">
                            <span className="px-2 py-1 bg-indigo-900/50 text-indigo-300 text-xs rounded-full border border-indigo-700/50">{a.status}</span>
                        </td>
                        <td className="p-4 text-right">
                            <div className="flex justify-end gap-2">
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
                            </div>
                        </td>
                    </tr>
                )})}
            </tbody>
        </table>
      </div>
      
      {/* Register Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 w-full max-w-md shadow-2xl shadow-black/50">
                <h3 className="text-lg font-bold text-white mb-4">Register Fixed Asset</h3>
                <div className="space-y-4">
                      <div>
                          <label className="block text-xs font-medium text-slate-400 mb-1">Asset Category</label>
                          <select className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white" value={categoryId} onChange={e=>setCategoryId(e.target.value)}>
                              <option value="">Select Category</option>
                              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                      </div>
                      <div>
                          <label className="block text-xs font-medium text-slate-400 mb-1">Asset Name</label>
                          <input className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white" value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Dell XPS 15"/>
                      </div>
                      <div>
                          <label className="block text-xs font-medium text-slate-400 mb-1">Purchase Date</label>
                          <input type="date" className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white" value={purchaseDate} onChange={e=>setPurchaseDate(e.target.value)}/>
                      </div>
                      <div>
                          <label className="block text-xs font-medium text-slate-400 mb-1">Original Purchase Value (?)</label>
                          <input type="number" className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white" value={purchaseValue} onChange={e=>setPurchaseValue(e.target.value)} placeholder="0.00"/>
                      </div>
                      <div>
                          <label className="block text-xs font-medium text-slate-400 mb-1">Salvage Value / Residual Value (?)</label>
                          <input type="number" className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white" value={salvageValue} onChange={e=>setSalvageValue(e.target.value)} placeholder="0.00"/>
                      </div>
                    
                    <div className="flex gap-2 pt-2">
                        <button onClick={()=>setShowModal(false)} className="flex-1 p-2 border border-slate-600 rounded text-slate-300">Cancel</button>
                        <button onClick={handleRegister} className="flex-1 p-2 bg-indigo-600 text-white rounded">Register</button>
                    </div>
                </div>
            </div>
        </div>
      )}
      
      {/* Depreciate Modal */}
      {showDepModal && depAsset && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 w-full max-w-md shadow-2xl shadow-black/50">
                <h3 className="text-lg font-bold text-white mb-4">Run Depreciation</h3>
                <p className="text-sm text-slate-400 mb-4">Calculate 1 month of depreciation for <strong>{depAsset.name}</strong> and post Journal Voucher.</p>
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs text-slate-400 mb-1">Voucher Date</label>
                        <input type="date" className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white" value={runDate} onChange={e=>setRunDate(e.target.value)}/>
                    </div>
                    
                    <div className="flex gap-2 pt-2">
                        <button onClick={()=>setShowDepModal(false)} className="flex-1 p-2 border border-slate-600 rounded text-slate-300">Cancel</button>
                        <button onClick={handleDepreciate} className="flex-1 p-2 bg-emerald-600 text-white rounded inline-flex justify-center items-center gap-2"><Calculator className="w-4 h-4"/> Calculate & Post</button>
                    </div>
                </div>
            </div>
        </div>
      )}

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
    </div>
  );
}
