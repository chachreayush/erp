import React, { useState, useEffect } from 'react';
import apiClient from '../../lib/api';
import { Plus, Check, Search, FileText, IndianRupee } from 'lucide-react';
import { useReturnNavigation } from '../../hooks/useReturnNavigation';
import ExpenseClaimEntryModal from './ExpenseClaimEntryModal';

interface ExpenseClaim {
  id: string;
  claim_number: string;
  date: string;
  total_amount: number;
  status: string;
  employee_ledger: { name: string };
  remarks?: string;
}

export default function ExpenseManagement() {
  const [claims, setClaims] = useState<ExpenseClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const { handleReturn } = useReturnNavigation();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchClaims = async () => {
    try {
      const res = await apiClient.get('/api/expenses/claims');
      setClaims(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClaims();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleReturn();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleApprove = async (id: string) => {
    try {
      await apiClient.post(`/api/expenses/claims/${id}/approve`);
      fetchClaims();
    } catch (err: any) {
      alert("Error approving claim: " + (err.response?.data?.detail || err.message));
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100 flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-400" />
            Expense Management
          </h1>
          <p className="text-sm text-slate-400 mt-1">Manage petty cash, employee advances, and reimbursements</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            onClick={() => setIsModalOpen(true)}
          >
            <Plus className="w-4 h-4" />
            New Claim
          </button>
        </div>
      </div>

      <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-xl overflow-hidden">
        <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-900/50">
          <h2 className="text-lg font-medium text-slate-200">Recent Claims</h2>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search claims..." 
              className="pl-9 pr-4 py-1.5 bg-slate-800 border border-slate-600 rounded text-sm text-slate-200 placeholder-slate-400 focus:outline-none focus:border-blue-500 w-64"
            />
          </div>
        </div>
        
        {loading ? (
          <div className="p-8 text-center text-slate-400">Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-800/80 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-700">
                  <th className="px-6 py-4 font-medium">Claim No</th>
                  <th className="px-6 py-4 font-medium">Date</th>
                  <th className="px-6 py-4 font-medium">Employee</th>
                  <th className="px-6 py-4 font-medium text-right">Amount</th>
                  <th className="px-6 py-4 font-medium text-center">Status</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {claims.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                      No expense claims found.
                    </td>
                  </tr>
                ) : (
                  claims.map(claim => (
                    <tr key={claim.id} className="hover:bg-slate-700/20 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-200">{claim.claim_number}</div>
                        {claim.remarks && <div className="text-xs text-slate-400 truncate max-w-[200px]">{claim.remarks}</div>}
                      </td>
                      <td className="px-6 py-4 text-slate-300">
                        {new Date(claim.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-slate-300">
                        {claim.employee_ledger?.name || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 text-slate-100 text-right font-medium">
                        <div className="flex items-center justify-end gap-1">
                          <IndianRupee className="w-3 h-3 text-slate-400" />
                          {claim.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          claim.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-400' :
                          claim.status === 'Draft' ? 'bg-amber-500/10 text-amber-400' :
                          'bg-slate-500/10 text-slate-400'
                        }`}>
                          {claim.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {claim.status === 'Draft' && (
                          <button 
                            onClick={() => handleApprove(claim.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 rounded text-sm transition-colors"
                          >
                            <Check className="w-4 h-4" />
                            Approve
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <ExpenseClaimEntryModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSuccess={() => { setIsModalOpen(false); fetchClaims(); }} />
    </div>
  );
}
