import React, { useState, useEffect } from 'react';
import { Shield, Check, X, AlertTriangle, Eye, User } from 'lucide-react';
import apiClient from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { useReturnNavigation } from '../../hooks/useReturnNavigation';

export default function OrderApprovalDashboard() {
  useReturnNavigation();
  const [holds, setHolds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const user = useAuthStore(state => state.user);
  const isAdmin = user?.role === 'am_admin' || user?.role === 'cm_admin' || user?.role === 'manager';

  const fetchHolds = async () => {
    try {
      setLoading(true);
      const { data } = await apiClient.get('/api/orders/holds/active');
      setHolds(data || []);
    } catch (err: any) {
      setError('Failed to load active order holds.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchHolds();
    }
  }, [isAdmin]);

  const approveOrder = async (orderId: string) => {
    if (!window.confirm("Are you sure you want to approve this order and override the hold?")) return;
    try {
      await apiClient.post(`/api/orders/${orderId}/approve`);
      fetchHolds();
    } catch (err) {
      alert("Failed to approve order.");
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-full p-8 text-[var(--color-text-dim)]">
        <AlertTriangle className="w-8 h-8 mr-3" />
        <h2 className="text-xl">Access Denied. Only Managers and Admins can approve orders on hold.</h2>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)] flex items-center">
            <Shield className="w-6 h-6 mr-2 text-[var(--color-primary)]" />
            Order Approval Dashboard
          </h1>
          <p className="text-[var(--color-text-dim)] mt-1">
            Review and clear orders blocked by credit limits or margin rules.
          </p>
        </div>
        <button onClick={fetchHolds} className="px-4 py-2 bg-[var(--color-bg-subtle)] border border-[var(--color-border)] rounded-md hover:bg-[var(--color-border)]">
          Refresh List
        </button>
      </div>

      {error && <div className="p-4 mb-4 text-red-400 bg-red-900/20 border border-red-900/50 rounded-md">{error}</div>}

      <div className="bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-lg overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[var(--color-bg-subtle)] border-b border-[var(--color-border)]">
              <th className="p-3 text-xs font-semibold text-[var(--color-text-dim)] uppercase">Hold ID</th>
              <th className="p-3 text-xs font-semibold text-[var(--color-text-dim)] uppercase">Date</th>
              <th className="p-3 text-xs font-semibold text-[var(--color-text-dim)] uppercase">Hold Reason</th>
              <th className="p-3 text-xs font-semibold text-[var(--color-text-dim)] uppercase">Placed By</th>
              <th className="p-3 text-xs font-semibold text-[var(--color-text-dim)] uppercase text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="p-6 text-center text-[var(--color-text-dim)]">Loading...</td></tr>
            ) : holds.length === 0 ? (
              <tr><td colSpan={5} className="p-6 text-center text-[var(--color-text-dim)]">No active holds pending approval.</td></tr>
            ) : (
              holds.map(h => (
                <tr key={h.id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-bg-subtle)]">
                  <td className="p-3 font-mono text-xs">{h.id.substring(0, 8)}...</td>
                  <td className="p-3 text-sm">{new Date(h.created_at).toLocaleDateString()}</td>
                  <td className="p-3 text-sm text-amber-400 flex items-center">
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    {h.hold_reason}
                  </td>
                  <td className="p-3 text-sm text-[var(--color-text-dim)]">
                    {/* User ID / Role would be mapped here */}
                    Admin (Override Required)
                  </td>
                  <td className="p-3 text-right space-x-2">
                    <button 
                      onClick={() => approveOrder(h.order_id)}
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-sm transition-colors"
                    >
                      Approve Order
                    </button>
                    <button 
                      className="px-3 py-1 bg-red-900/50 hover:bg-red-900 border border-red-800 text-red-200 rounded text-sm transition-colors"
                      onClick={() => alert("Rejection flow will notify the user.")}
                    >
                      Reject
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
