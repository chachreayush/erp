import React, { useState, useEffect } from 'react';
import { Save, AlertCircle, Search, User } from 'lucide-react';
import apiClient from '../../lib/api';
import { useReturnNavigation } from '../../hooks/useReturnNavigation';

export default function VendorComplaints() {

  const [complaints, setComplaints] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  
  // New Complaint Form
  const [showForm, setShowForm] = useState(false);
  const [complaintNumber, setComplaintNumber] = useState('VC-0001');
  const [vendorId, setVendorId] = useState('');
  const [category, setCategory] = useState('SHORTAGE');
  const [severity, setSeverity] = useState('MEDIUM');
  const [description, setDescription] = useState('');

  useReturnNavigation(showForm);

  const fetchComplaints = async () => {
    try {
      const res = await apiClient.get('/api/procurement/complaints');
      setComplaints(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        const partiesRes = await apiClient.get('/api/master/parties?type=vendor');
        setVendors(partiesRes.data);
      } catch (err) {
        console.error('Failed to load master data', err);
      }
    };
    fetchMasterData();
    fetchComplaints();
  }, []);

  const handleSave = async () => {
    if (!vendorId || !description) {
      alert('Please select a vendor and provide a description.');
      return;
    }
    
    try {
      await apiClient.post('/api/procurement/complaints', {
        complaint_number: complaintNumber,
        vendor_id: vendorId,
        category,
        severity,
        description
      });
      alert('Vendor Complaint logged successfully!');
      setShowForm(false);
      setDescription('');
      setComplaintNumber(`VC-${parseInt(complaintNumber.split('-')[1]) + 1}`);
      fetchComplaints();
    } catch (err) {
      console.error(err);
      alert('Failed to log complaint.');
    }
  };

  return (
    <div style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)', padding: '20px', display: 'flex', flexDirection: 'column', height: '100%', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={24} color="var(--color-danger)" /> Vendor Complaints Engine
        </h1>
        <button onClick={() => setShowForm(!showForm)} style={{ backgroundColor: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '4px', padding: '8px 16px', fontSize: '14px', fontWeight: '500', cursor: 'pointer' }}>
          {showForm ? 'Close Form' : '+ Log New Complaint'}
        </button>
      </div>

      {showForm && (
        <div style={{ backgroundColor: 'var(--color-bg-subtle)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '16px', marginBottom: '24px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 200px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Complaint No.</label>
            <input type="text" value={complaintNumber} onChange={e => setComplaintNumber(e.target.value)} style={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)', padding: '8px', fontSize: '13px', width: '100%', borderRadius: '4px' }} />
          </div>
          <div style={{ flex: '1 1 200px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Vendor</label>
            <select value={vendorId} onChange={e => setVendorId(e.target.value)} style={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)', padding: '8px', fontSize: '13px', width: '100%', borderRadius: '4px' }}>
              <option value="">-- Select Vendor --</option>
              {vendors.map(v => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </div>
          <div style={{ flex: '1 1 200px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Category</label>
            <select value={category} onChange={e => setCategory(e.target.value)} style={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)', padding: '8px', fontSize: '13px', width: '100%', borderRadius: '4px' }}>
              <option value="SHORTAGE">Shortage</option>
              <option value="DAMAGE">Damage in Transit</option>
              <option value="QUALITY">Quality Defect</option>
              <option value="PRICING">Pricing / Rate Difference</option>
            </select>
          </div>
          <div style={{ flex: '1 1 200px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Severity</label>
            <select value={severity} onChange={e => setSeverity(e.target.value)} style={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)', padding: '8px', fontSize: '13px', width: '100%', borderRadius: '4px' }}>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical (Stop Payment)</option>
            </select>
          </div>
          <div style={{ flex: '1 1 100%' }}>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Description & Evidence Note</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} style={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)', padding: '8px', fontSize: '13px', width: '100%', borderRadius: '4px', resize: 'vertical' }} />
          </div>
          <div style={{ flex: '1 1 100%', textAlign: 'right' }}>
            <button onClick={handleSave} style={{ backgroundColor: 'var(--color-success)', color: 'white', border: 'none', borderRadius: '4px', padding: '8px 16px', fontSize: '14px', fontWeight: '500', cursor: 'pointer' }}>
              Submit Complaint
            </button>
          </div>
        </div>
      )}

      <div style={{ flex: 1, backgroundColor: 'var(--color-bg-subtle)', border: '1px solid var(--color-border)', borderRadius: '8px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead style={{ backgroundColor: 'var(--color-table-header)', position: 'sticky', top: 0, zIndex: 10 }}>
              <tr>
                <th style={{ padding: '10px 16px', textAlign: 'left', color: 'var(--color-text)', borderBottom: '1px solid var(--color-border)' }}>Complaint No</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', color: 'var(--color-text)', borderBottom: '1px solid var(--color-border)' }}>Date</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', color: 'var(--color-text)', borderBottom: '1px solid var(--color-border)' }}>Category</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', color: 'var(--color-text)', borderBottom: '1px solid var(--color-border)' }}>Severity</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', color: 'var(--color-text)', borderBottom: '1px solid var(--color-border)' }}>Status</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', color: 'var(--color-text)', borderBottom: '1px solid var(--color-border)' }}>Description</th>
              </tr>
            </thead>
            <tbody>
              {complaints.map(c => (
                <tr key={c.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '12px 16px', fontWeight: '500' }}>{c.complaint_number}</td>
                  <td style={{ padding: '12px 16px' }}>{new Date(c.created_at).toLocaleDateString()}</td>
                  <td style={{ padding: '12px 16px' }}>{c.category}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ 
                      padding: '2px 6px', 
                      borderRadius: '4px', 
                      fontSize: '11px',
                      backgroundColor: c.severity === 'CRITICAL' ? 'var(--color-danger)' : c.severity === 'HIGH' ? 'var(--color-warning)' : 'var(--color-bg)',
                      color: c.severity === 'CRITICAL' || c.severity === 'HIGH' ? 'white' : 'var(--color-text)'
                    }}>
                      {c.severity}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ color: c.status === 'OPEN' ? 'var(--color-danger)' : 'var(--color-success)' }}>{c.status}</span>
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--color-text-muted)' }}>{c.description}</td>
                </tr>
              ))}
              {complaints.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    No vendor complaints found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
