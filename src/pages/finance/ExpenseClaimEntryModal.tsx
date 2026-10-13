import React, { useState, useEffect } from 'react';
import apiClient, {
  apiGetLedgers,
  apiGetExpenseCategories,
  apiGetEmployeeAdvances,
  apiCreateExpenseClaim,
  Ledger,
  ExpenseCategory,
  EmployeeAdvance
} from '../../lib/api';
import { X, Plus, Trash2, Save, Receipt, Calendar, FileText, AlertCircle, IndianRupee, CreditCard } from 'lucide-react';

interface ClaimLineInput {
  id: string;
  category_id: string;
  amount: string;
  bill_number: string;
  bill_date: string;
  note: string;
}

interface ExpenseClaimEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ExpenseClaimEntryModal({ isOpen, onClose, onSuccess }: ExpenseClaimEntryModalProps) {
  const [employees, setEmployees] = useState<Ledger[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [advances, setAdvances] = useState<EmployeeAdvance[]>([]);

  const [employeeId, setEmployeeId] = useState('');
  const [selectedAdvanceId, setSelectedAdvanceId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [claimNumber, setClaimNumber] = useState('');
  const [remarks, setRemarks] = useState('');

  const [lines, setLines] = useState<ClaimLineInput[]>([
    {
      id: 'line-1',
      category_id: '',
      amount: '',
      bill_number: '',
      bill_date: new Date().toISOString().split('T')[0],
      note: ''
    }
  ]);

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setErrorMsg('');
      setEmployeeId('');
      setSelectedAdvanceId('');
      setDate(new Date().toISOString().split('T')[0]);
      setClaimNumber(`EXP-${Date.now().toString().slice(-4)}`);
      setRemarks('');
      setLines([
        {
          id: 'line-1',
          category_id: '',
          amount: '',
          bill_number: '',
          bill_date: new Date().toISOString().split('T')[0],
          note: ''
        }
      ]);

      Promise.all([
        apiGetLedgers(),
        apiGetExpenseCategories(),
        apiGetEmployeeAdvances()
      ])
        .then(([ledgersRes, catsRes, advRes]) => {
          setEmployees(ledgersRes || []);
          setCategories(catsRes || []);
          setAdvances(advRes || []);
        })
        .catch(err => {
          console.error('Failed to load dropdowns:', err);
          setErrorMsg('Failed to load employee ledgers or expense categories.');
        });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Filter active advances for selected employee
  const employeeActiveAdvances = advances.filter(
    a => a.employee_ledger_id === employeeId && a.status === 'Active'
  );

  const totalAmount = lines.reduce((sum, line) => sum + (parseFloat(line.amount) || 0), 0);

  const handleAddLine = () => {
    setLines(prev => [
      ...prev,
      {
        id: `line-${Date.now()}`,
        category_id: '',
        amount: '',
        bill_number: '',
        bill_date: date,
        note: ''
      }
    ]);
  };

  const handleRemoveLine = (index: number) => {
    if (lines.length <= 1) return;
    setLines(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleLineChange = (index: number, field: keyof ClaimLineInput, val: string) => {
    setErrorMsg('');
    setLines(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: val };
      return next;
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!employeeId) {
      setErrorMsg('Please select an employee / claimant ledger.');
      return;
    }
    if (lines.length === 0) {
      setErrorMsg('At least one expense line is required.');
      return;
    }
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (!l.category_id) {
        setErrorMsg(`Line #${i + 1} requires an expense category.`);
        return;
      }
      const amt = parseFloat(l.amount);
      if (!amt || amt <= 0) {
        setErrorMsg(`Line #${i + 1} requires a valid positive amount.`);
        return;
      }
    }

    setSaving(true);
    try {
      // Build remarks with advance reference if linked
      let formattedRemarks = remarks.trim();
      if (selectedAdvanceId) {
        formattedRemarks = `[Advance: ${selectedAdvanceId}] ${formattedRemarks}`.trim();
      }

      await apiCreateExpenseClaim({
        claim_number: claimNumber.trim() || undefined,
        employee_ledger_id: employeeId,
        date: new Date(date).toISOString(),
        total_amount: totalAmount,
        remarks: formattedRemarks || undefined,
        lines: lines.map(l => ({
          category_id: l.category_id,
          amount: parseFloat(l.amount),
          bill_number: l.bill_number.trim() || undefined,
          bill_date: l.bill_date ? new Date(l.bill_date).toISOString() : undefined,
          note: l.note.trim() || undefined
        }))
      });

      onSuccess();
    } catch (err: any) {
      console.error('Error creating expense claim:', err);
      setErrorMsg(err.response?.data?.detail || err.message || 'Failed to submit expense claim.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in" data-testid="expense-claim-modal">
      <div className="bg-zinc-900 rounded-2xl border border-zinc-750 shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-zinc-800 bg-zinc-950">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Record Operational Expense Claim</h2>
              <p className="text-xs text-zinc-400">DOC-26: Multi-line expense claim with bill metadata and advance settlement</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition"
            data-testid="btn-close-modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs flex items-start space-x-2.5" data-testid="claim-modal-error">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">Validation Error: </span>
                {errorMsg}
              </div>
            </div>
          )}

          {/* Master Claim Info */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded-xl bg-zinc-950 border border-zinc-800">
            {/* Claimant Employee */}
            <div className="md:col-span-2 space-y-1.5">
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                Claimant / Employee Ledger *
              </label>
              <select
                value={employeeId}
                onChange={e => {
                  setEmployeeId(e.target.value);
                  setSelectedAdvanceId('');
                }}
                className="w-full bg-zinc-900 border border-zinc-700 focus:border-emerald-500 rounded-lg p-2 text-xs text-zinc-100 outline-none transition"
                data-testid="select-employee"
              >
                <option value="">-- Select Employee Account --</option>
                {employees.map(e => (
                  <option key={e.id} value={e.id}>
                    {e.name} ({e.group_name || 'Staff'})
                  </option>
                ))}
              </select>
            </div>

            {/* Claim Date */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                Claim Date *
              </label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 focus:border-emerald-500 rounded-lg p-2 text-xs text-zinc-100 outline-none font-mono"
                data-testid="input-claim-date"
              />
            </div>

            {/* Claim Number */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                Claim No #
              </label>
              <input
                type="text"
                value={claimNumber}
                onChange={e => setClaimNumber(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 focus:border-emerald-500 rounded-lg p-2 text-xs text-emerald-400 font-bold font-mono outline-none"
                data-testid="input-claim-number"
              />
            </div>

            {/* Advance Linkage (If employee has active advances) */}
            <div className="md:col-span-2 space-y-1.5">
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center space-x-1.5">
                <CreditCard className="w-3.5 h-3.5 text-amber-400" />
                <span>Link Active Advance (Settlement)</span>
              </label>
              <select
                value={selectedAdvanceId}
                onChange={e => setSelectedAdvanceId(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 focus:border-emerald-500 rounded-lg p-2 text-xs text-zinc-100 outline-none transition"
                data-testid="select-advance"
              >
                <option value="">-- No Advance Linked (Direct Reimbursement) --</option>
                {employeeActiveAdvances.map(a => (
                  <option key={a.id} value={a.id}>
                    ₹{Number(a.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })} - {a.reason || 'General Advance'} ({new Date(a.date).toLocaleDateString('en-IN')})
                  </option>
                ))}
              </select>
            </div>

            {/* Remarks */}
            <div className="md:col-span-2 space-y-1.5">
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                Audit Notes / Business Reason
              </label>
              <input
                type="text"
                placeholder="e.g. Area sales representative tour travel expenses"
                value={remarks}
                onChange={e => setRemarks(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 focus:border-emerald-500 rounded-lg p-2 text-xs text-zinc-200 outline-none"
                data-testid="input-claim-remarks"
              />
            </div>
          </div>

          {/* Multi-Line Items Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <span>Expense Lines Breakdown</span>
                <span className="text-xs font-normal text-zinc-400">({lines.length} items)</span>
              </h3>
              <button
                type="button"
                onClick={handleAddLine}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition"
                data-testid="btn-add-line"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-400" />
                <span>Add Line</span>
              </button>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden shadow-inner">
              <table className="w-full text-left text-xs" data-testid="claim-lines-table">
                <thead className="bg-zinc-900 text-zinc-400 uppercase font-mono border-b border-zinc-800">
                  <tr>
                    <th className="py-2.5 px-3 w-10 text-center">#</th>
                    <th className="py-2.5 px-3 w-48">Expense Category *</th>
                    <th className="py-2.5 px-3 w-32">Bill / Rec. #</th>
                    <th className="py-2.5 px-3 w-32">Bill Date</th>
                    <th className="py-2.5 px-3 w-36 text-right">Amount (₹) *</th>
                    <th className="py-2.5 px-3 min-w-[160px]">Line Description / Purpose</th>
                    <th className="py-2.5 px-3 w-12 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-850">
                  {lines.map((line, idx) => (
                    <tr key={line.id} className="hover:bg-zinc-900/60 transition-colors">
                      <td className="py-2.5 px-3 text-center font-mono text-zinc-500">
                        {idx + 1}
                      </td>

                      {/* Category */}
                      <td className="py-2.5 px-3">
                        <select
                          value={line.category_id}
                          onChange={e => handleLineChange(idx, 'category_id', e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-700 focus:border-emerald-500 rounded p-1.5 text-xs text-zinc-100 outline-none"
                          data-testid={`select-category-${idx}`}
                        >
                          <option value="">-- Category --</option>
                          {categories.map(c => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Bill No */}
                      <td className="py-2.5 px-3">
                        <input
                          type="text"
                          placeholder="Bill/Receipt #"
                          value={line.bill_number}
                          onChange={e => handleLineChange(idx, 'bill_number', e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-700 rounded p-1.5 text-xs text-zinc-200 outline-none font-mono"
                          data-testid={`input-bill-number-${idx}`}
                        />
                      </td>

                      {/* Bill Date */}
                      <td className="py-2.5 px-3">
                        <input
                          type="date"
                          value={line.bill_date}
                          onChange={e => handleLineChange(idx, 'bill_date', e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-700 rounded p-1.5 text-xs text-zinc-200 outline-none font-mono"
                          data-testid={`input-bill-date-${idx}`}
                        />
                      </td>

                      {/* Amount */}
                      <td className="py-2.5 px-3 text-right">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={line.amount}
                          onChange={e => handleLineChange(idx, 'amount', e.target.value)}
                          className="w-full text-right bg-zinc-900 border border-zinc-700 focus:border-emerald-500 rounded p-1.5 text-xs text-emerald-400 font-bold font-mono outline-none"
                          data-testid={`input-amount-${idx}`}
                        />
                      </td>

                      {/* Line Note */}
                      <td className="py-2.5 px-3">
                        <input
                          type="text"
                          placeholder="Line details..."
                          value={line.note}
                          onChange={e => handleLineChange(idx, 'note', e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-700 rounded p-1.5 text-xs text-zinc-300 outline-none"
                          data-testid={`input-note-${idx}`}
                        />
                      </td>

                      {/* Remove Action */}
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveLine(idx)}
                          disabled={lines.length <= 1}
                          className={`p-1 rounded transition ${
                            lines.length <= 1
                              ? 'text-zinc-700 cursor-not-allowed'
                              : 'text-zinc-400 hover:text-rose-400 hover:bg-rose-950/40'
                          }`}
                          title="Remove row"
                          data-testid={`btn-remove-line-${idx}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between p-4 bg-zinc-950 border border-zinc-800 rounded-xl gap-4">
            <div className="flex items-center space-x-4 font-mono">
              <span className="text-xs text-zinc-400 uppercase">Total Claim Amount:</span>
              <span className="text-xl font-bold text-emerald-400" data-testid="total-claim-amount">
                ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            <div className="flex items-center space-x-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition"
                data-testid="btn-cancel-claim"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || totalAmount <= 0}
                className={`flex-1 sm:flex-initial px-6 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 ${
                  saving || totalAmount <= 0
                    ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white shadow-lg shadow-emerald-950/40 cursor-pointer'
                }`}
                data-testid="btn-submit-claim"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Submitting...' : 'Submit Claim'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
