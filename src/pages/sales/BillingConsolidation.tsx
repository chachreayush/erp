import React, { useState, useEffect } from 'react';
import { useReturnNavigation } from '../../hooks/useReturnNavigation';
import apiClient from '../../lib/api';
import { FileText, CheckSquare, Square, ChevronRight } from 'lucide-react';

export default function BillingConsolidation() {
  useReturnNavigation();
  const [challans, setChallans] = useState<any[]>([]);
  const [selectedChallanIds, setSelectedChallanIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUnbilledChallans();
  }, []);

  const fetchUnbilledChallans = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/api/billing/unbilled-challans');
      setChallans(res.data || []);
    } catch (e) {
      console.error("Failed to fetch challans", e);
    } finally {
      setLoading(false);
    }
  };

  const toggleChallan = (id: string) => {
    const next = new Set(selectedChallanIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedChallanIds(next);
  };

  const handleConsolidate = () => {
    if (selectedChallanIds.size === 0) return alert('Select at least one challan');
    
    // Get selected challan objects
    const selected = challans.filter(c => selectedChallanIds.has(c.id));
    
    // Check compatibility (must be same customer)
    const customer = selected[0].customer_name;
    const isCompatible = selected.every(c => c.customer_name === customer);
    
    if (!isCompatible) {
      return alert('Compatibility Check Failed: Selected challans must belong to the same customer.');
    }

    // Merge items
    let mergedItems: any[] = [];
    selected.forEach(c => {
      c.items.forEach((item: any) => {
        const unbilledQty = item.quantity - (item.billed_qty || 0);
        if (unbilledQty > 0) {
          mergedItems.push({
            id: Math.random().toString(36).substring(7),
            product: item.product_name,
            batch: item.batch,
            expiry: item.expiry,
            qty: String(unbilledQty),
            free: '',
            mrp: String(item.mrp || 0),
            rate: String(item.rate),
            dis: String(item.discount_percent || 0),
            source_challan_item_id: item.id
          });
        }
      });
    });

    // Store in session storage to pass to SalesBill
    sessionStorage.setItem('consolidation_data', JSON.stringify({
      party: customer,
      items: mergedItems
    }));
    
    window.location.href = '/sales?type=sales_invoice&from_consolidation=true';
  };

  return (
    <div className="p-6 h-screen flex flex-col bg-[var(--color-bg)]">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)] flex items-center">
            <FileText className="w-6 h-6 mr-2 text-indigo-400" />
            Billing Consolidation Workbench
          </h1>
          <p className="text-[var(--color-text-dim)] mt-1">Select unbilled delivery challans to consolidate into a single Sales Invoice.</p>
        </div>
        <button 
          onClick={handleConsolidate}
          className={`px-6 py-2 rounded font-bold ${selectedChallanIds.size > 0 ? 'bg-indigo-600 hover:bg-indigo-500 text-white' : 'bg-slate-700 text-slate-400 cursor-not-allowed'}`}
        >
          Consolidate & Bill {selectedChallanIds.size > 0 ? `(${selectedChallanIds.size})` : ''} <ChevronRight className="inline w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-lg overflow-hidden flex flex-col shadow-xl">
        <div className="grid grid-cols-12 gap-4 p-4 border-b border-[var(--color-border-strong)] font-bold text-sm text-[var(--color-text-muted)] bg-[var(--color-bg-subtle)] uppercase tracking-wider">
          <div className="col-span-1">Select</div>
          <div className="col-span-2">Challan No</div>
          <div className="col-span-2">Date</div>
          <div className="col-span-4">Customer</div>
          <div className="col-span-3 text-right">Items (Unbilled)</div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {loading ? (
            <div className="p-8 text-center text-[var(--color-text-dim)]">Loading unbilled challans...</div>
          ) : challans.length === 0 ? (
            <div className="p-8 text-center text-[var(--color-text-dim)]">No unbilled challans found.</div>
          ) : (
            challans.map(c => {
              const isSelected = selectedChallanIds.has(c.id);
              return (
                <div 
                  key={c.id} 
                  onClick={() => toggleChallan(c.id)}
                  className={`grid grid-cols-12 gap-4 p-4 border rounded cursor-pointer transition-colors ${
                    isSelected ? 'border-indigo-500 bg-indigo-500/10' : 'border-[var(--color-border)] hover:bg-[var(--color-bg-subtle)]'
                  }`}
                >
                  <div className="col-span-1 flex items-center">
                    {isSelected ? <CheckSquare className="text-indigo-400 w-5 h-5" /> : <Square className="text-[var(--color-text-dim)] w-5 h-5" />}
                  </div>
                  <div className="col-span-2 font-mono">{c.invoice_number}</div>
                  <div className="col-span-2">{new Date(c.date).toLocaleDateString()}</div>
                  <div className="col-span-4 font-bold text-blue-400">{c.customer_name}</div>
                  <div className="col-span-3 text-right text-sm">
                    {c.items.filter((i:any) => i.quantity > (i.billed_qty || 0)).length} line(s) remaining
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
