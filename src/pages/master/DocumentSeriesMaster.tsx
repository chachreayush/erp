import React, { useState, useEffect } from 'react';
import apiClient from '../../lib/api';
import { Plus, Edit2, Archive, Save, X, Hash } from 'lucide-react';
import { useReturnNavigation } from '../../hooks/useReturnNavigation';

export default function DocumentSeriesMaster() {
  useReturnNavigation();
  const [series, setSeries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    series_code: '',
    invoice_type: 'sales_invoice',
    prefix: '',
    suffix: '',
    next_number: 1,
    is_active: true
  });

  const fetchSeries = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/api/billing/series');
      setSeries(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSeries();
  }, []);

  const handleSave = async () => {
    if (!formData.series_code) return alert("Series Code is required");
    try {
      await apiClient.post('/api/billing/series', formData);
      setShowModal(false);
      fetchSeries();
    } catch (e: any) {
      alert(e.response?.data?.detail || "Failed to save series");
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto h-screen flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)] flex items-center">
            <Hash className="w-6 h-6 mr-2 text-indigo-400" />
            Document Series Master
          </h1>
          <p className="text-[var(--color-text-dim)] mt-1">
            Create and manage auto-incrementing document series numbers for your billing forms.
          </p>
        </div>
        <button 
          onClick={() => {
            setFormData({ series_code: '', invoice_type: 'sales_invoice', prefix: '', suffix: '', next_number: 1, is_active: true });
            setShowModal(true);
          }}
          className="flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded"
        >
          <Plus size={16} className="mr-2" /> New Series
        </button>
      </div>

      <div className="bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-lg flex-1 overflow-hidden shadow-xl">
        <table className="w-full text-left">
          <thead className="bg-[var(--color-bg-subtle)] border-b border-[var(--color-border-strong)] text-xs uppercase tracking-wider text-[var(--color-text-dim)]">
            <tr>
              <th className="p-4">Series Code</th>
              <th className="p-4">Document Type</th>
              <th className="p-4">Prefix</th>
              <th className="p-4">Next No</th>
              <th className="p-4">Suffix</th>
              <th className="p-4 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {loading ? (
              <tr><td colSpan={6} className="p-8 text-center text-[var(--color-text-dim)]">Loading...</td></tr>
            ) : series.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-[var(--color-text-dim)]">No document series created yet.</td></tr>
            ) : (
              series.map(s => (
                <tr key={s.id} className="hover:bg-[var(--color-bg-subtle)] transition-colors">
                  <td className="p-4 font-bold text-indigo-400">{s.series_code}</td>
                  <td className="p-4 text-sm text-[var(--color-text)]">{s.invoice_type}</td>
                  <td className="p-4 font-mono text-emerald-400">{s.prefix || '-'}</td>
                  <td className="p-4 font-mono font-bold text-white text-lg">{s.next_number}</td>
                  <td className="p-4 font-mono text-emerald-400">{s.suffix || '-'}</td>
                  <td className="p-4 text-center">
                    <span className={`px-2 py-1 rounded text-xs ${s.is_active ? 'bg-emerald-900/30 text-emerald-400' : 'bg-red-900/30 text-red-400'}`}>
                      {s.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[var(--color-bg-surface)] w-[500px] border border-[var(--color-border)] rounded-lg shadow-2xl flex flex-col">
            <div className="p-4 border-b border-[var(--color-border)] flex justify-between items-center bg-[var(--color-bg-subtle)] rounded-t-lg">
              <h2 className="font-bold text-lg">Create New Series</h2>
              <button onClick={() => setShowModal(false)} className="text-[var(--color-text-dim)] hover:text-white"><X size={20}/></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-[var(--color-text-muted)] uppercase mb-1">Series Name / Code</label>
                <input 
                  autoFocus
                  value={formData.series_code} 
                  onChange={e => setFormData({...formData, series_code: e.target.value.toUpperCase()})}
                  placeholder="e.g. MUM-SALE"
                  className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded p-2 text-white" 
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-[var(--color-text-muted)] uppercase mb-1">Document Type</label>
                <select 
                  value={formData.invoice_type}
                  onChange={e => setFormData({...formData, invoice_type: e.target.value})}
                  className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded p-2 text-white"
                >
                  <option value="sales_invoice">Sales Invoice</option>
                  <option value="sales_challan">Delivery Challan</option>
                  <option value="purchase_invoice">Purchase Invoice</option>
                  <option value="purchase_challan">Purchase Challan</option>
                </select>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[var(--color-text-muted)] uppercase mb-1">Prefix</label>
                  <input 
                    value={formData.prefix} 
                    onChange={e => setFormData({...formData, prefix: e.target.value})}
                    placeholder="e.g. INV-"
                    className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded p-2 text-white font-mono" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-indigo-400 uppercase mb-1">Start No.</label>
                  <input 
                    type="number"
                    value={formData.next_number} 
                    onChange={e => setFormData({...formData, next_number: parseInt(e.target.value) || 1})}
                    className="w-full bg-indigo-900/20 border border-indigo-500/50 rounded p-2 text-white font-mono font-bold" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--color-text-muted)] uppercase mb-1">Suffix</label>
                  <input 
                    value={formData.suffix} 
                    onChange={e => setFormData({...formData, suffix: e.target.value})}
                    placeholder="e.g. /26"
                    className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded p-2 text-white font-mono" 
                  />
                </div>
              </div>
              
              <div className="mt-2 text-center text-sm text-[var(--color-text-dim)] bg-slate-900/50 p-3 rounded border border-slate-700">
                Preview: <span className="font-bold text-white tracking-widest">{formData.prefix}{formData.next_number}{formData.suffix}</span>
              </div>
            </div>
            
            <div className="p-4 border-t border-[var(--color-border)] bg-[var(--color-bg-subtle)] rounded-b-lg flex justify-end">
              <button 
                onClick={handleSave}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded flex items-center"
              >
                <Save size={16} className="mr-2"/> Save Series
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
