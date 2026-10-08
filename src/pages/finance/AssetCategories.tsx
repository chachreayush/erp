import React, { useState, useEffect } from 'react';
import apiClient, { Ledger } from '../../lib/api';
import { useReturnNavigation } from '../../hooks/useReturnNavigation';
import { Plus, Save, Settings2 } from 'lucide-react';

export default function AssetCategories() {
  useReturnNavigation();
  const [categories, setCategories] = useState<any[]>([]);
  const [ledgers, setLedgers] = useState<Ledger[]>([]);
  
  const [name, setName] = useState('');
  const [rate, setRate] = useState('');
  const [assetLedger, setAssetLedger] = useState('');
  const [accDepLedger, setAccDepLedger] = useState('');
  const [expLedger, setExpLedger] = useState('');
  
  useEffect(() => {
    fetchData();
  }, []);
  
  const fetchData = async () => {
    const catRes = await apiClient.get('/api/assets/categories');
    setCategories(catRes.data);
    const ledRes = await apiClient.get('/api/master/ledgers');
    setLedgers(ledRes.data);
  };
  
  const handleSave = async () => {
    if (!name || !rate || !assetLedger || !accDepLedger || !expLedger) {
        alert("Please fill all fields");
        return;
    }
    try {
        await apiClient.post('/api/assets/categories', {
            name,
            depreciation_method: 'WDV',
            depreciation_rate: parseFloat(rate),
            asset_ledger_id: assetLedger,
            acc_depreciation_ledger_id: accDepLedger,
            depreciation_expense_ledger_id: expLedger
        });
        setName(''); setRate(''); setAssetLedger(''); setAccDepLedger(''); setExpLedger('');
        fetchData();
    } catch(e) {
        alert("Error saving category");
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto text-slate-200">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Settings2 className="w-6 h-6 text-indigo-400" />
            Asset Categories (Config)
          </h1>
          <p className="text-sm text-slate-400">Map Fixed Asset types to General Ledgers</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 bg-slate-800/50 p-6 rounded-xl border border-slate-700/50">
            <h3 className="text-lg font-bold mb-4">New Category</h3>
            <div className="space-y-4">
                <div>
                    <label className="block text-xs text-slate-400 mb-1">Category Name</label>
                    <input className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white" value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Computers"/>
                </div>
                <div>
                    <label className="block text-xs text-slate-400 mb-1">Depreciation Rate (%)</label>
                    <input type="number" className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white" value={rate} onChange={e=>setRate(e.target.value)} placeholder="e.g. 33.33"/>
                </div>
                <div>
                    <label className="block text-xs text-slate-400 mb-1">Asset Ledger (Balance Sheet)</label>
                    <select className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white" value={assetLedger} onChange={e=>setAssetLedger(e.target.value)}>
                        <option value="">-- Select Ledger --</option>
                        {ledgers.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs text-slate-400 mb-1">Accumulated Dep. Ledger</label>
                    <select className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white" value={accDepLedger} onChange={e=>setAccDepLedger(e.target.value)}>
                        <option value="">-- Select Ledger --</option>
                        {ledgers.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs text-slate-400 mb-1">Depreciation Expense Ledger (P&L)</label>
                    <select className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white" value={expLedger} onChange={e=>setExpLedger(e.target.value)}>
                        <option value="">-- Select Ledger --</option>
                        {ledgers.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                </div>
                <button onClick={handleSave} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded flex justify-center items-center gap-2">
                    <Save className="w-4 h-4"/> Save Category
                </button>
            </div>
        </div>
        
        <div className="md:col-span-2 bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
            <table className="w-full text-left">
                <thead className="bg-slate-900/50 text-xs uppercase text-slate-400">
                    <tr>
                        <th className="p-4">Category</th>
                        <th className="p-4">Rate</th>
                        <th className="p-4">Ledgers Mapped</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                    {categories.map(c => (
                        <tr key={c.id}>
                            <td className="p-4 font-medium text-white">{c.name}</td>
                            <td className="p-4 text-indigo-400">{c.depreciation_rate}% {c.depreciation_method}</td>
                            <td className="p-4 text-xs text-slate-400">
                                <div>Asset: {ledgers.find(l=>l.id===c.asset_ledger_id)?.name}</div>
                                <div>Acc Dep: {ledgers.find(l=>l.id===c.acc_depreciation_ledger_id)?.name}</div>
                                <div>Exp: {ledgers.find(l=>l.id===c.depreciation_expense_ledger_id)?.name}</div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
}
