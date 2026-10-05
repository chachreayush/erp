import React, { useState, useEffect } from 'react';
import { Truck, Check, X, Eye, FileText, Search, User } from 'lucide-react';
import apiClient from '../../lib/api';
import { useReturnNavigation } from '../../hooks/useReturnNavigation';

export default function DispatchManager() {
  useReturnNavigation();
  const [challans, setChallans] = useState<any[]>([]);
  const [dispatches, setDispatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [selectedChallanId, setSelectedChallanId] = useState('');
  const [vehicleNo, setVehicleNo] = useState('');
  const [driverName, setDriverName] = useState('');
  
  const [showPODModal, setShowPODModal] = useState(false);
  const [selectedDispatchId, setSelectedDispatchId] = useState('');
  const [podRemarks, setPodRemarks] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [cRes, dRes] = await Promise.all([
        apiClient.get('/api/dispatch/challans'),
        apiClient.get('/api/dispatch/')
      ]);
      setChallans(cRes.data || []);
      setDispatches(dRes.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateDispatch = async () => {
    if (!vehicleNo) return alert('Vehicle number is required');
    try {
      await apiClient.post('/api/dispatch/', {
        challan_id: selectedChallanId,
        vehicle_number: vehicleNo,
        driver_name: driverName,
        status: 'IN_TRANSIT'
      });
      setShowDispatchModal(false);
      fetchData();
    } catch (e) {
      alert("Failed to create dispatch");
    }
  };

  const handlePOD = async () => {
    try {
      await apiClient.post(`/api/dispatch/${selectedDispatchId}/pod?remarks=${encodeURIComponent(podRemarks)}`);
      setShowPODModal(false);
      fetchData();
    } catch (e) {
      alert("Failed to record POD");
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)] flex items-center">
            <Truck className="w-6 h-6 mr-2 text-[var(--color-primary)]" />
            Dispatch & Delivery Manager
          </h1>
          <p className="text-[var(--color-text-dim)] mt-1">
            Manage delivery challans, vehicle dispatch, and proof of delivery (POD).
          </p>
        </div>
        <button onClick={fetchData} className="px-4 py-2 bg-[var(--color-bg-subtle)] border border-[var(--color-border)] rounded hover:bg-[var(--color-border)]">
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Pending Challans */}
        <div className="bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-lg p-4 shadow-sm">
          <h2 className="text-lg font-bold mb-4 flex items-center">
            <FileText className="w-5 h-5 mr-2 text-blue-400" /> Pending Challans
          </h2>
          <div className="overflow-y-auto max-h-[500px]">
            {loading ? <p>Loading...</p> : challans.length === 0 ? <p className="text-[var(--color-text-dim)]">No pending challans.</p> : (
              <div className="space-y-3">
                {challans.map(c => {
                  const isDispatched = dispatches.some(d => d.challan_id === c.id);
                  if (isDispatched) return null; // Hide if already dispatched
                  return (
                    <div key={c.id} className="p-3 border border-[var(--color-border)] rounded bg-[var(--color-bg-subtle)] flex justify-between items-center">
                      <div>
                        <div className="font-bold">{c.invoice_number}</div>
                        <div className="text-xs text-[var(--color-text-dim)]">{c.customer_name} • {new Date(c.date).toLocaleDateString()}</div>
                      </div>
                      <button onClick={() => {
                        setSelectedChallanId(c.id);
                        setVehicleNo('');
                        setDriverName('');
                        setShowDispatchModal(true);
                      }} className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-sm rounded">
                        Dispatch
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Active Dispatches */}
        <div className="bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-lg p-4 shadow-sm">
          <h2 className="text-lg font-bold mb-4 flex items-center">
            <Truck className="w-5 h-5 mr-2 text-amber-400" /> Active Dispatches
          </h2>
          <div className="overflow-y-auto max-h-[500px]">
            {loading ? <p>Loading...</p> : dispatches.length === 0 ? <p className="text-[var(--color-text-dim)]">No active dispatches.</p> : (
              <div className="space-y-3">
                {dispatches.map(d => (
                  <div key={d.id} className="p-3 border border-[var(--color-border)] rounded bg-[var(--color-bg-subtle)] flex flex-col">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-bold flex items-center">
                          Vehicle: {d.vehicle_number}
                          <span className={`ml-2 px-2 py-0.5 text-[10px] rounded ${d.status === 'DELIVERED' ? 'bg-emerald-900/50 text-emerald-400' : 'bg-amber-900/50 text-amber-400'}`}>
                            {d.status}
                          </span>
                        </div>
                        <div className="text-xs text-[var(--color-text-dim)]">Driver: {d.driver_name || 'N/A'}</div>
                      </div>
                      {d.status === 'IN_TRANSIT' && (
                        <button onClick={() => {
                          setSelectedDispatchId(d.id);
                          setPodRemarks('');
                          setShowPODModal(true);
                        }} className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded">
                          Mark POD
                        </button>
                      )}
                    </div>
                    {d.pod_captured && (
                      <div className="mt-2 text-xs text-emerald-400 border-t border-[var(--color-border)] pt-2">
                        POD Date: {new Date(d.pod_date).toLocaleString()} <br/>
                        Remarks: {d.pod_remarks || 'None'}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showDispatchModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
          <div className="bg-[var(--color-bg-surface)] p-6 rounded-lg w-[400px]">
            <h3 className="font-bold text-lg mb-4">Assign Vehicle to Challan</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs mb-1">Vehicle Number</label>
                <input autoFocus value={vehicleNo} onChange={e=>setVehicleNo(e.target.value)} className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] p-2 rounded" />
              </div>
              <div>
                <label className="block text-xs mb-1">Driver Name (Optional)</label>
                <input value={driverName} onChange={e=>setDriverName(e.target.value)} className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] p-2 rounded" />
              </div>
              <div className="flex justify-end space-x-2 mt-4">
                <button onClick={()=>setShowDispatchModal(false)} className="px-4 py-2 border border-[var(--color-border)] rounded text-sm hover:bg-[var(--color-bg-subtle)]">Cancel</button>
                <button onClick={handleCreateDispatch} className="px-4 py-2 bg-[var(--color-primary)] text-white rounded text-sm hover:opacity-90">Dispatch Vehicle</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showPODModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
          <div className="bg-[var(--color-bg-surface)] p-6 rounded-lg w-[400px]">
            <h3 className="font-bold text-lg mb-4">Record Proof of Delivery</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs mb-1">Delivery Remarks (Exceptions/Damages)</label>
                <textarea autoFocus value={podRemarks} onChange={e=>setPodRemarks(e.target.value)} className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] p-2 rounded h-24" placeholder="Received in good condition..." />
              </div>
              <div className="flex justify-end space-x-2 mt-4">
                <button onClick={()=>setShowPODModal(false)} className="px-4 py-2 border border-[var(--color-border)] rounded text-sm hover:bg-[var(--color-bg-subtle)]">Cancel</button>
                <button onClick={handlePOD} className="px-4 py-2 bg-emerald-600 text-white rounded text-sm hover:bg-emerald-500">Confirm POD</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
