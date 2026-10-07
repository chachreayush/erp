import React, { useState, useEffect } from 'react';
import apiClient from '../../lib/api';
import { X, Plus, Trash, Save, IndianRupee } from 'lucide-react';

export default function ExpenseClaimEntryModal({ isOpen, onClose, onSuccess }: any) {
  const [employees, setEmployees] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  
  const [employeeId, setEmployeeId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [remarks, setRemarks] = useState('');
  
  const [lines, setLines] = useState<any[]>([{ id: Date.now(), categoryId: '', amount: '', note: '' }]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchDropdowns();
      setEmployeeId('');
      setDate(new Date().toISOString().split('T')[0]);
      setRemarks('');
      setLines([{ id: Date.now(), categoryId: '', amount: '', note: '' }]);
    }
  }, [isOpen]);

  const fetchDropdowns = async () => {
    try {
      const empRes = await apiClient.get('/api/master/ledgers');
      setEmployees(empRes.data.filter((l: any) => l.is_active)); // In reality filter by group "Employees"
      const catRes = await apiClient.get('/api/expenses/categories');
      setCategories(catRes.data);
    } catch (e) {
      console.error("Failed to fetch dropdowns", e);
    }
  };

  if (!isOpen) return null;

  const totalAmount = lines.reduce((sum, line) => sum + (parseFloat(line.amount) || 0), 0);

  const handleSave = async () => {
    if (!employeeId) return alert("Select an employee");
    if (lines.some(l => !l.categoryId || !l.amount)) return alert("Fill all line details");
    
    setSaving(true);
    try {
      await apiClient.post('/api/expenses/claims', {
        employee_ledger_id: employeeId,
        date,
        remarks,
        total_amount: totalAmount,
        lines: lines.map(l => ({
          category_id: l.categoryId,
          amount: parseFloat(l.amount),
          note: l.note
        }))
      });
      onSuccess();
    } catch (err: any) {
      alert("Error saving: " + (err.response?.data?.detail || err.message));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
      <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-700 bg-slate-900/50 rounded-t-xl">
          <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
            New Expense Claim
          </h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 overflow-y-auto space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Employee / Claimant</label>
              <select 
                value={employeeId} 
                onChange={e => setEmployeeId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-slate-200"
              >
                <option value="">-- Select Employee --</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Date</label>
              <input 
                type="date" 
                value={date} 
                onChange={e => setDate(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-slate-200"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Expense Lines</label>
            <div className="border border-slate-700 rounded-lg overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-900/50 text-slate-400 text-xs">
                  <tr>
                    <th className="p-2 w-1/3">Category</th>
                    <th className="p-2">Note/Description</th>
                    <th className="p-2 w-32 text-right">Amount</th>
                    <th className="p-2 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50 bg-slate-800">
                  {lines.map((line, idx) => (
                    <tr key={line.id}>
                      <td className="p-2">
                        <select 
                          value={line.categoryId}
                          onChange={e => {
                            const newLines = [...lines];
                            newLines[idx].categoryId = e.target.value;
                            setLines(newLines);
                          }}
                          className="w-full bg-transparent border-none text-slate-200 text-sm focus:ring-0 p-1"
                        >
                          <option value="">- Select Category -</option>
                          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </td>
                      <td className="p-2">
                        <input 
                          type="text"
                          value={line.note}
                          placeholder="Taxi, lunch, etc."
                          onChange={e => {
                            const newLines = [...lines];
                            newLines[idx].note = e.target.value;
                            setLines(newLines);
                          }}
                          className="w-full bg-transparent border-none text-slate-200 text-sm focus:ring-0 p-1"
                        />
                      </td>
                      <td className="p-2">
                        <input 
                          type="number"
                          value={line.amount}
                          onChange={e => {
                            const newLines = [...lines];
                            newLines[idx].amount = e.target.value;
                            setLines(newLines);
                          }}
                          className="w-full bg-transparent border-none text-slate-200 text-sm text-right focus:ring-0 p-1"
                        />
                      </td>
                      <td className="p-2 text-center">
                        <button 
                          onClick={() => setLines(lines.filter(l => l.id !== line.id))}
                          className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-red-400/10"
                        >
                          <Trash className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="p-2 bg-slate-800 border-t border-slate-700 flex justify-between items-center">
                <button 
                  onClick={() => setLines([...lines, { id: Date.now(), categoryId: '', amount: '', note: '' }])}
                  className="flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300 p-1"
                >
                  <Plus className="w-4 h-4" /> Add Line
                </button>
                <div className="font-semibold text-slate-200 flex items-center gap-2 pr-12">
                  <span className="text-sm text-slate-400">Total:</span>
                  <IndianRupee className="w-4 h-4" />
                  {totalAmount.toFixed(2)}
                </div>
              </div>
            </div>
          </div>
          
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Remarks</label>
            <input 
              type="text" 
              value={remarks} 
              onChange={e => setRemarks(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-slate-200"
            />
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700 bg-slate-900/50 rounded-b-xl flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-slate-300 hover:text-white transition-colors">
            Cancel
          </button>
          <button 
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-lg shadow-blue-500/20 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Draft Claim'}
          </button>
        </div>
      </div>
    </div>
  );
}
