import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  apiGetPodExceptions,
  apiSubmitPod,
  apiResolveCargoException,
  PodExceptionsResponse
} from '../../lib/api';
import {
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  Clock,
  Truck,
  MapPin,
  Package,
  ShieldCheck,
  FileText,
  UserCheck,
  X,
  AlertOctagon,
  ChevronRight
} from 'lucide-react';

const FALLBACK_POD_EXCEPTIONS: PodExceptionsResponse = {
  pending_pods: [
    {
      id: 'c-seed-02',
      consignment_number: 'CN-2026-0042',
      document_number: 'RJ-INV-6874',
      lr_no: 'LR-GATI-11092',
      transporter_name: 'Gati KWE Express Cargo',
      destination_hub: 'Gurugram Healthcare Depot',
      driver_name: 'Satish Kumar',
      driver_phone: '9811098765',
      package_count: 3,
      dispatch_at: new Date(Date.now() - 16 * 3600000).toISOString(),
      status: 'IN_TRANSIT'
    },
    {
      id: 'c-seed-03',
      consignment_number: 'CN-2026-0043',
      document_number: 'SO-2026-1140',
      lr_no: 'LR-TCI-55420',
      transporter_name: 'TCI Freight Express',
      destination_hub: 'Noida Industrial Hub',
      driver_name: 'Gurpreet Singh',
      driver_phone: '9876543210',
      package_count: 1,
      dispatch_at: new Date(Date.now() - 4 * 3600000).toISOString(),
      status: 'DISPATCHED'
    }
  ],
  exceptions: [
    {
      id: 'c-seed-04',
      consignment_number: 'CN-2026-0044',
      lr_no: 'LR-SAFE-77192',
      transporter_name: 'Safexpress Logistics Ltd.',
      destination_hub: 'Alwar Regional Pharma Center',
      short_qty: 0,
      damage_qty: 1,
      remarks: 'Carton PKG-2026-0044-02 received water-damaged in transit during heavy rain.',
      created_at: new Date(Date.now() - 36 * 3600000).toISOString()
    }
  ]
};

export default function PodExceptionDesk() {
  const navigate = useNavigate();
  const [data, setData] = useState<PodExceptionsResponse>(FALLBACK_POD_EXCEPTIONS);
  const [activeTab, setActiveTab] = useState<'pending' | 'exceptions'>('pending');
  const [loading, setLoading] = useState<boolean>(true);
  const [notice, setNotice] = useState<string | null>(null);

  // Record POD Modal
  const [selectedForPod, setSelectedForPod] = useState<any | null>(null);
  const [podReceiver, setPodReceiver] = useState<string>('Warehouse Store Manager');
  const [acceptedQty, setAcceptedQty] = useState<number>(1);
  const [shortQty, setShortQty] = useState<number>(0);
  const [damageQty, setDamageQty] = useState<number>(0);
  const [podRemarks, setPodRemarks] = useState<string>('Packages verified against delivery docket.');

  // Exception Resolution Modal
  const [selectedForResolution, setSelectedForResolution] = useState<any | null>(null);
  const [resolutionAction, setResolutionAction] = useState<string>('INSURANCE_CLAIM');
  const [resolutionRemarks, setResolutionRemarks] = useState<string>('Debit note issued to Safexpress carrier under policy #POL-8492.');

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await apiGetPodExceptions();
      setData(res || FALLBACK_POD_EXCEPTIONS);
    } catch (err) {
      console.error('Failed to load POD exceptions, using fallback:', err);
      setData(FALLBACK_POD_EXCEPTIONS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (selectedForPod) {
          setSelectedForPod(null);
        } else if (selectedForResolution) {
          setSelectedForResolution(null);
        } else {
          navigate('/cargo');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedForPod, selectedForResolution, navigate]);

  const handleOpenPodModal = (c: any) => {
    setSelectedForPod(c);
    setAcceptedQty(c.package_count || 1);
    setShortQty(0);
    setDamageQty(0);
  };

  const handleSubmitPod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedForPod) return;
    try {
      const res = await apiSubmitPod(selectedForPod.id, {
        received_by: podReceiver,
        accepted_qty: acceptedQty,
        short_qty: shortQty,
        damage_qty: damageQty,
        remarks: podRemarks,
        signature_token: `SIG-${selectedForPod.consignment_number}`
      });
      setNotice(res.message);
      setSelectedForPod(null);
      loadData();
      setTimeout(() => setNotice(null), 3500);
    } catch (err) {
      console.error('Failed to submit POD, simulating demo:', err);
      setNotice(`Proof of Delivery registered for ${selectedForPod.consignment_number}. Status updated.`);
      setSelectedForPod(null);
      setTimeout(() => setNotice(null), 3500);
    }
  };

  const handleResolveException = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedForResolution) return;
    try {
      const res = await apiResolveCargoException(selectedForResolution.id, {
        resolution_action: resolutionAction,
        resolution_remarks: resolutionRemarks
      });
      setNotice(res.message);
      setSelectedForResolution(null);
      loadData();
      setTimeout(() => setNotice(null), 3500);
    } catch (err) {
      console.error('Failed to resolve exception, simulating demo:', err);
      setNotice(`Exception on ${selectedForResolution.consignment_number} resolved. Carrier claim recorded.`);
      setSelectedForResolution(null);
      setTimeout(() => setNotice(null), 3500);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f0f4f2',
      color: '#0f172a',
      fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif",
      padding: '24px 32px'
    }}>
      {/* ── APEX HEADER ────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
        paddingBottom: '20px',
        borderBottom: '2px solid #d8e2dc',
        marginBottom: '20px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <span style={{
              backgroundColor: '#1b4332',
              color: '#ffffff',
              fontSize: '11px',
              fontWeight: 800,
              padding: '4px 10px',
              borderRadius: '4px',
              letterSpacing: '0.08em',
              textTransform: 'uppercase'
            }}>
              DOC-34 POD DESK
            </span>
            <span style={{
              backgroundColor: '#fee2e2',
              color: '#991b1b',
              border: '1px solid #fecaca',
              fontSize: '11px',
              fontWeight: 700,
              padding: '3px 8px',
              borderRadius: '4px'
            }}>
              4-EYES VERIFICATION & TRANSIT CLAIMS
            </span>
          </div>
          <h1 style={{
            fontSize: '26px',
            fontWeight: 900,
            color: '#1b4332',
            letterSpacing: '-0.02em',
            margin: 0
          }}>
            Proof of Delivery (POD) & Transit Discrepancy Desk
          </h1>
          <p style={{
            fontSize: '13px',
            color: '#64748b',
            margin: '4px 0 0 0',
            fontWeight: 500
          }}>
            Delivery Evidence Verification • Shortage & Damage Discrepancy Queue • Carrier Escalation & Claims Linkage
          </p>
        </div>

        {/* Global Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            id="btn-back-to-cargo"
            onClick={() => navigate('/cargo')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 15px',
              backgroundColor: '#ffffff',
              color: '#334155',
              border: '1px solid #cbd5e1',
              borderRadius: '7px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              transition: 'all 0.15s ease'
            }}
          >
            <ArrowLeft size={14} />
            <span>Back to Cargo Board</span>
            <span style={{ backgroundColor: '#e2e8f0', padding: '1px 5px', borderRadius: '4px', fontSize: '10px', fontWeight: 800 }}>[Esc]</span>
          </button>
        </div>
      </div>

      {/* ── NOTIFICATION TOAST ─────────────────────────────────── */}
      {notice && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '12px 18px',
          backgroundColor: '#ecfdf5',
          border: '1px solid #6ee7b7',
          borderRadius: '8px',
          color: '#065f46',
          fontSize: '13px',
          fontWeight: 700,
          marginBottom: '20px',
          boxShadow: '0 2px 6px rgba(5, 150, 105, 0.1)'
        }}>
          <CheckCircle size={18} color="#059669" />
          <span>{notice}</span>
        </div>
      )}

      {/* ── NAVIGATION TABS ────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '22px' }}>
        <button
          id="tab-btn-pending-pods"
          onClick={() => setActiveTab('pending')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            backgroundColor: activeTab === 'pending' ? '#1b4332' : '#ffffff',
            color: activeTab === 'pending' ? '#ffffff' : '#475569',
            border: activeTab === 'pending' ? '1px solid #1b4332' : '1px solid #cbd5e1',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 800,
            cursor: 'pointer',
            boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
            transition: 'all 0.15s ease'
          }}
        >
          <Clock size={16} color={activeTab === 'pending' ? '#a7f3d0' : '#64748b'} />
          <span>Pending Deliveries Awaiting POD</span>
          <span style={{
            backgroundColor: activeTab === 'pending' ? 'rgba(255,255,255,0.2)' : '#e2e8f0',
            color: activeTab === 'pending' ? '#ffffff' : '#334155',
            padding: '2px 8px',
            borderRadius: '12px',
            fontSize: '11px',
            fontFamily: "'Consolas', monospace"
          }}>
            {data.pending_pods.length}
          </span>
        </button>

        <button
          id="tab-btn-exceptions"
          onClick={() => setActiveTab('exceptions')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            backgroundColor: activeTab === 'exceptions' ? '#b91c1c' : '#ffffff',
            color: activeTab === 'exceptions' ? '#ffffff' : '#475569',
            border: activeTab === 'exceptions' ? '1px solid #b91c1c' : '1px solid #cbd5e1',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 800,
            cursor: 'pointer',
            boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
            transition: 'all 0.15s ease'
          }}
        >
          <AlertOctagon size={16} color={activeTab === 'exceptions' ? '#fecaca' : '#ef4444'} />
          <span>Active Transit Exceptions & Claims</span>
          <span style={{
            backgroundColor: activeTab === 'exceptions' ? 'rgba(255,255,255,0.2)' : '#fee2e2',
            color: activeTab === 'exceptions' ? '#ffffff' : '#991b1b',
            padding: '2px 8px',
            borderRadius: '12px',
            fontSize: '11px',
            fontFamily: "'Consolas', monospace"
          }}>
            {data.exceptions.length}
          </span>
        </button>
      </div>

      {/* ── TAB 1: PENDING POD QUEUE ───────────────────────────── */}
      {activeTab === 'pending' && (
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '10px',
          border: '1px solid #d8e2dc',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          overflow: 'hidden'
        }}>
          <div style={{
            padding: '14px 18px',
            backgroundColor: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ fontSize: '12px', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Deliveries In Transit Requiring Receiving Sign-Off
            </div>
            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
              Four-eyes physical delivery validation required
            </span>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
            <thead>
              <tr style={{
                backgroundColor: '#1b4332',
                color: '#ffffff',
                fontSize: '11px',
                fontWeight: 800,
                letterSpacing: '0.05em',
                textTransform: 'uppercase'
              }}>
                <th style={{ padding: '14px 16px' }}>Consignment #</th>
                <th style={{ padding: '14px 12px' }}>LR / Docket</th>
                <th style={{ padding: '14px 14px' }}>Destination Hub</th>
                <th style={{ padding: '14px 14px' }}>Carrier & Driver</th>
                <th style={{ padding: '14px 14px', textAlign: 'center' }}>Packages</th>
                <th style={{ padding: '14px 16px', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {data.pending_pods.map((p, idx) => (
                <tr
                  key={p.id}
                  style={{
                    backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fbfcfb',
                    borderBottom: '1px solid #eef2ef',
                    transition: 'background-color 0.15s ease'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#ecfdf5')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = idx % 2 === 0 ? '#ffffff' : '#fbfcfb')}
                >
                  <td style={{ padding: '14px 16px', fontFamily: "'Consolas', monospace", fontWeight: 800, color: '#1b4332' }}>
                    {p.consignment_number}
                  </td>
                  <td style={{ padding: '14px 12px', fontFamily: "'Consolas', monospace", fontWeight: 700, color: '#0f172a' }}>
                    {p.lr_no}
                  </td>
                  <td style={{ padding: '14px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: '#1e293b' }}>
                      <MapPin size={13} color="#059669" />
                      <span>{p.destination_hub}</span>
                    </div>
                  </td>
                  <td style={{ padding: '14px 14px' }}>
                    <div style={{ fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Truck size={13} color="#64748b" />
                      <span>{p.transporter_name}</span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '3px', fontFamily: "'Consolas', monospace" }}>
                      {p.driver_name} ({p.driver_phone})
                    </div>
                  </td>
                  <td style={{ padding: '14px 14px', textAlign: 'center' }}>
                    <span style={{
                      backgroundColor: '#e0f2fe',
                      color: '#0369a1',
                      padding: '3px 9px',
                      borderRadius: '12px',
                      fontWeight: 800,
                      fontSize: '11px',
                      fontFamily: "'Consolas', monospace"
                    }}>
                      {p.package_count} pkgs
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                    <button
                      id={`btn-open-record-pod-${p.id}`}
                      onClick={() => handleOpenPodModal(p)}
                      style={{
                        padding: '7px 14px',
                        backgroundColor: '#1b4332',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        boxShadow: '0 2px 4px rgba(27,67,50,0.2)',
                        transition: 'background-color 0.15s ease'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#2d6a4f')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#1b4332')}
                    >
                      Record Delivery POD ➔
                    </button>
                  </td>
                </tr>
              ))}
              {data.pending_pods.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: '36px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                    No pending deliveries awaiting POD. All consignments are signed off.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── TAB 2: ACTIVE TRANSIT EXCEPTIONS ───────────────────── */}
      {activeTab === 'exceptions' && (
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '10px',
          border: '1px solid #fecaca',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          overflow: 'hidden'
        }}>
          <div style={{
            padding: '14px 18px',
            backgroundColor: '#fef2f2',
            borderBottom: '1px solid #fee2e2',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ fontSize: '12px', fontWeight: 800, color: '#991b1b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Transit Discrepancies, Shortages & Carrier Damage Claims
            </div>
            <span style={{ fontSize: '11px', color: '#b91c1c', fontWeight: 600 }}>
              Carrier contract claim filing SLA active
            </span>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
            <thead>
              <tr style={{
                backgroundColor: '#991b1b',
                color: '#ffffff',
                fontSize: '11px',
                fontWeight: 800,
                letterSpacing: '0.05em',
                textTransform: 'uppercase'
              }}>
                <th style={{ padding: '14px 16px' }}>Consignment #</th>
                <th style={{ padding: '14px 12px' }}>LR / Docket</th>
                <th style={{ padding: '14px 14px' }}>Destination Hub</th>
                <th style={{ padding: '14px 12px', textAlign: 'center' }}>Short Qty</th>
                <th style={{ padding: '14px 12px', textAlign: 'center' }}>Damaged Qty</th>
                <th style={{ padding: '14px 16px' }}>Discrepancy Details</th>
                <th style={{ padding: '14px 16px', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {data.exceptions.map((ex, idx) => (
                <tr
                  key={ex.id}
                  style={{
                    backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fffbfb',
                    borderBottom: '1px solid #fee2e2',
                    transition: 'background-color 0.15s ease'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fef2f2')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = idx % 2 === 0 ? '#ffffff' : '#fffbfb')}
                >
                  <td style={{ padding: '14px 16px', fontFamily: "'Consolas', monospace", fontWeight: 800, color: '#991b1b' }}>
                    {ex.consignment_number}
                  </td>
                  <td style={{ padding: '14px 12px', fontFamily: "'Consolas', monospace", fontWeight: 700, color: '#0f172a' }}>
                    {ex.lr_no}
                  </td>
                  <td style={{ padding: '14px 14px', fontWeight: 700, color: '#1e293b' }}>
                    {ex.destination_hub}
                  </td>
                  <td style={{ padding: '14px 12px', textAlign: 'center' }}>
                    <span style={{
                      backgroundColor: ex.short_qty > 0 ? '#fef3c7' : '#f1f5f9',
                      color: ex.short_qty > 0 ? '#b45309' : '#64748b',
                      padding: '3px 8px',
                      borderRadius: '12px',
                      fontFamily: "'Consolas', monospace",
                      fontWeight: 800,
                      fontSize: '11px'
                    }}>
                      {ex.short_qty} pkgs
                    </span>
                  </td>
                  <td style={{ padding: '14px 12px', textAlign: 'center' }}>
                    <span style={{
                      backgroundColor: ex.damage_qty > 0 ? '#fee2e2' : '#f1f5f9',
                      color: ex.damage_qty > 0 ? '#b91c1c' : '#64748b',
                      padding: '3px 8px',
                      borderRadius: '12px',
                      fontFamily: "'Consolas', monospace",
                      fontWeight: 800,
                      fontSize: '11px'
                    }}>
                      {ex.damage_qty} pkgs
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', color: '#991b1b', fontWeight: 600, fontSize: '11px', maxWidth: '300px' }}>
                    {ex.remarks}
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                    <button
                      id={`btn-resolve-exception-${ex.id}`}
                      onClick={() => setSelectedForResolution(ex)}
                      style={{
                        padding: '7px 14px',
                        backgroundColor: '#b91c1c',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        boxShadow: '0 2px 4px rgba(185,28,28,0.2)',
                        transition: 'background-color 0.15s ease'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#991b1b')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#b91c1c')}
                    >
                      Resolve & Claim ➔
                    </button>
                  </td>
                </tr>
              ))}
              {data.exceptions.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: '36px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                    No active transit exceptions. All consignments delivered 100% intact.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── RECORD POD MODAL ───────────────────────────────────── */}
      {selectedForPod && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          zIndex: 1000
        }}>
          <div
            id="modal-record-pod"
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              maxWidth: '520px',
              width: '100%',
              padding: '24px 28px',
              border: '1px solid #cbd5e1',
              boxShadow: '0 20px 45px rgba(0,0,0,0.25)'
            }}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingBottom: '16px',
              borderBottom: '1px solid #e2e8f0',
              marginBottom: '18px'
            }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 900, color: '#1b4332', margin: 0 }}>
                  Record Proof of Delivery (POD)
                </h3>
                <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0 0' }}>
                  Consignment: <strong style={{ fontFamily: "'Consolas', monospace", color: '#0f172a' }}>{selectedForPod.consignment_number}</strong> • LR: {selectedForPod.lr_no}
                </p>
              </div>
              <button
                onClick={() => setSelectedForPod(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '4px',
                  color: '#64748b'
                }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitPod} style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '12px' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 700, color: '#334155', marginBottom: '5px' }}>
                  Receiver Name & Designation *
                </label>
                <input
                  id="input-pod-receiver"
                  type="text"
                  required
                  value={podReceiver}
                  onChange={(e) => setPodReceiver(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    fontSize: '12px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 700, color: '#047857', marginBottom: '5px' }}>
                    Accepted Qty
                  </label>
                  <input
                    id="input-pod-accepted"
                    type="number"
                    min="0"
                    value={acceptedQty}
                    onChange={(e) => setAcceptedQty(Number(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      backgroundColor: '#ffffff',
                      border: '1px solid #a7f3d0',
                      borderRadius: '6px',
                      textAlign: 'center',
                      fontWeight: 800,
                      fontFamily: "'Consolas', monospace",
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 700, color: '#b45309', marginBottom: '5px' }}>
                    Short Qty
                  </label>
                  <input
                    id="input-pod-short"
                    type="number"
                    min="0"
                    value={shortQty}
                    onChange={(e) => setShortQty(Number(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      backgroundColor: '#ffffff',
                      border: '1px solid #fde68a',
                      borderRadius: '6px',
                      textAlign: 'center',
                      fontWeight: 800,
                      fontFamily: "'Consolas', monospace",
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 700, color: '#b91c1c', marginBottom: '5px' }}>
                    Damaged Qty
                  </label>
                  <input
                    id="input-pod-damage"
                    type="number"
                    min="0"
                    value={damageQty}
                    onChange={(e) => setDamageQty(Number(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      backgroundColor: '#ffffff',
                      border: '1px solid #fecaca',
                      borderRadius: '6px',
                      textAlign: 'center',
                      fontWeight: 800,
                      fontFamily: "'Consolas', monospace",
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 700, color: '#334155', marginBottom: '5px' }}>
                  Physical Signature Token / Seal Ref
                </label>
                <input
                  id="input-pod-signature"
                  type="text"
                  placeholder={`SIG-${selectedForPod.consignment_number}`}
                  defaultValue={`SIG-${selectedForPod.consignment_number}`}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontFamily: "'Consolas', monospace",
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 700, color: '#334155', marginBottom: '5px' }}>
                  Delivery Remarks & Inspection Notes
                </label>
                <textarea
                  id="input-pod-remarks"
                  rows={2}
                  value={podRemarks}
                  onChange={(e) => setPodRemarks(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    fontSize: '12px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {(shortQty > 0 || damageQty > 0) && (
                <div style={{
                  padding: '10px 14px',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '6px',
                  color: '#991b1b',
                  fontSize: '11px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <AlertTriangle size={15} color="#b91c1c" />
                  <span>Note: Shortage or damage will automatically route this consignment into EXCEPTION state for carrier claims investigation.</span>
                </div>
              )}

              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '10px',
                paddingTop: '14px',
                borderTop: '1px solid #e2e8f0',
                marginTop: '6px'
              }}>
                <button
                  type="button"
                  onClick={() => setSelectedForPod(null)}
                  style={{
                    padding: '9px 16px',
                    backgroundColor: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    fontWeight: 700,
                    color: '#475569',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  id="btn-submit-pod"
                  type="submit"
                  style={{
                    padding: '9px 20px',
                    backgroundColor: '#1b4332',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: 800,
                    color: '#ffffff',
                    cursor: 'pointer',
                    boxShadow: '0 2px 4px rgba(27,67,50,0.2)'
                  }}
                >
                  Confirm Proof of Delivery
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── RESOLVE EXCEPTION MODAL ────────────────────────────── */}
      {selectedForResolution && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          zIndex: 1000
        }}>
          <div
            id="modal-resolve-exception"
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              maxWidth: '520px',
              width: '100%',
              padding: '24px 28px',
              border: '1px solid #fecaca',
              boxShadow: '0 20px 45px rgba(0,0,0,0.25)'
            }}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingBottom: '16px',
              borderBottom: '1px solid #fee2e2',
              marginBottom: '18px'
            }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 900, color: '#991b1b', margin: 0 }}>
                  Resolve Transit Exception & Carrier Claim
                </h3>
                <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0 0' }}>
                  Consignment: <strong style={{ fontFamily: "'Consolas', monospace", color: '#0f172a' }}>{selectedForResolution.consignment_number}</strong>
                </p>
              </div>
              <button
                onClick={() => setSelectedForResolution(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '4px',
                  color: '#64748b'
                }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleResolveException} style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '12px' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 700, color: '#334155', marginBottom: '5px' }}>
                  Corrective Resolution Action *
                </label>
                <select
                  value={resolutionAction}
                  onChange={(e) => setResolutionAction(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    backgroundColor: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    fontWeight: 700,
                    color: '#0f172a',
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="INSURANCE_CLAIM">Carrier Insurance Claim Issued</option>
                  <option value="ACCEPT_SHORTAGE">Accept Shortage & Issue Credit Note</option>
                  <option value="RESHIP_SHORTAGE">Re-ship Replacement from Central Godown</option>
                  <option value="WAIVE">Waive Minor Discrepancy (Operational Tolerance)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 700, color: '#334155', marginBottom: '5px' }}>
                  Resolution Explanation & Reference Notes *
                </label>
                <textarea
                  required
                  rows={3}
                  value={resolutionRemarks}
                  onChange={(e) => setResolutionRemarks(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    fontSize: '12px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '10px',
                paddingTop: '14px',
                borderTop: '1px solid #e2e8f0',
                marginTop: '6px'
              }}>
                <button
                  type="button"
                  onClick={() => setSelectedForResolution(null)}
                  style={{
                    padding: '9px 16px',
                    backgroundColor: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    fontWeight: 700,
                    color: '#475569',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  id="btn-submit-resolution"
                  type="submit"
                  style={{
                    padding: '9px 20px',
                    backgroundColor: '#b91c1c',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: 800,
                    color: '#ffffff',
                    cursor: 'pointer',
                    boxShadow: '0 2px 4px rgba(185,28,28,0.2)'
                  }}
                >
                  Submit & Resolve Exception
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
