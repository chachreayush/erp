import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, CheckCircle2 } from 'lucide-react';
import { useReturnNavigation } from '../hooks/useReturnNavigation';

export default function SignedLedger() {
  useReturnNavigation();
  const navigate = useNavigate();
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/compliance/logs', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setLogs(data);
      })
      .catch(err => console.error(err));
  }, []);

  return (
    <div style={{ backgroundColor: '#eef2ef', minHeight: '100vh', padding: '24px', color: '#111827', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button 
              onClick={() => navigate('/gst')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#2d6a4f', display: 'flex', alignItems: 'center' }}
              title="Return to GST Reports [ESC]"
            >
              <ArrowLeft size={20} />
            </button>
            <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#2d6a4f' }}>
              STATUTORY COMPLIANCE / AUDIT LOG
            </span>
            <span style={{ backgroundColor: '#d8e2dc', color: '#1b4332', fontSize: '11px', fontWeight: 800, padding: '2px 8px', borderRadius: '4px' }}>
              DOC-29
            </span>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#1b4332', margin: '4px 0 0 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileText size={26} color="#1b4332" />
            Signed Compliance Evidence Ledger
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#52796f' }}>
            Permanent Audit Trail for IRN Hashes, Acknowledgement Numbers & Signed QR Payloads
          </p>
        </div>
      </div>

      {/* Table Container */}
      <div style={{ backgroundColor: '#ffffff', border: '1px solid #d8e2dc', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8faf9', color: '#52796f', borderBottom: '1px solid #d8e2dc', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.04em' }}>
              <th style={{ padding: '10px 14px' }}>Date / Time</th>
              <th style={{ padding: '10px 14px' }}>Invoice No</th>
              <th style={{ padding: '10px 14px' }}>Type</th>
              <th style={{ padding: '10px 14px', textAlign: 'center' }}>Status</th>
              <th style={{ padding: '10px 14px' }}>IRN Hash</th>
              <th style={{ padding: '10px 14px' }}>Ack Number</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>
                  <CheckCircle2 size={36} color="#10b981" style={{ margin: '0 auto 8px auto', display: 'block' }} />
                  No compliance evidence records generated yet.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '10px 14px', color: '#374151' }}>{new Date(log.created_at).toLocaleString()}</td>
                  <td style={{ padding: '10px 14px', fontWeight: 700, color: '#1b4332' }}>{log.invoice_number}</td>
                  <td style={{ padding: '10px 14px', color: '#4b5563' }}>{log.log_type}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 800,
                      backgroundColor: log.status === 'SUCCESS' ? '#dcfce7' : '#f3f4f6',
                      color: log.status === 'SUCCESS' ? '#166534' : '#4b5563'
                    }}>
                      {log.status}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: '11px', color: '#1f2937' }}>{log.irn || '-'}</td>
                  <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: '11px', color: '#1f2937' }}>{log.ack_no || '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}
