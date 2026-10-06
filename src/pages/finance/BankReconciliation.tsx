import { useReturnNavigation } from '../../hooks/useReturnNavigation';
import React, { useState, useEffect, useRef } from 'react';
import apiClient, { Ledger } from '../../lib/api';
import { Upload, Check, RefreshCw, AlertCircle, FileSpreadsheet } from 'lucide-react';

export default function BankReconciliation() {
  useReturnNavigation();
  const [ledgers, setLedgers] = useState<Ledger[]>([]);
  const [selectedLedger, setSelectedLedger] = useState<string>('');
  
  const [bankRows, setBankRows] = useState<any[]>([]);
  const [vouchers, setVouchers] = useState<any[]>([]);
  
  const [selectedBankRowId, setSelectedBankRowId] = useState<string | null>(null);
  const [selectedVoucherId, setSelectedVoucherId] = useState<string | null>(null);
  
  // Modal states
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<string>('');
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  
  // New Profile Form
  const [newProfileName, setNewProfileName] = useState('');
  const [colDate, setColDate] = useState('Transaction Date');
  const [colDesc, setColDesc] = useState('Narration');
  const [colRef, setColRef] = useState('Cheque No.');
  const [colWithdrawal, setColWithdrawal] = useState('Withdrawal');
  const [colDeposit, setColDeposit] = useState('Deposit');
  const [colBal, setColBal] = useState('Balance');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const ledgersData = await apiClient.get('/api/master/ledgers');
        const banks = ledgersData.data.filter((l: any) => l.group_name?.toLowerCase().includes('bank'));
        setLedgers(banks);
        if (banks.length > 0) setSelectedLedger(banks[0].id);
        
        const profileData = await apiClient.get('/api/finance/bank-profiles');
        setProfiles(profileData.data);
      } catch (e) {
        console.error(e);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (selectedLedger) {
      fetchData();
    }
  }, [selectedLedger]);

  const fetchData = async () => {
    try {
      const bRows = await apiClient.get(`/api/finance/bank-statements/unreconciled/${selectedLedger}`);
      setBankRows(bRows.data);
      
      const vRows = await apiClient.get(`/api/finance/vouchers/unreconciled/${selectedLedger}`);
      setVouchers(vRows.data);
    } catch(e) {
      console.error(e);
    }
  };

  const handleUpload = async () => {
    if (!fileInputRef.current?.files?.[0]) {
      alert("Please select a file.");
      return;
    }
    
    setUploading(true);
    let activeProfileId = selectedProfile;
    
    if (isCreatingProfile) {
      try {
        const newProf = await apiClient.post('/api/finance/bank-profiles', {
          name: newProfileName,
          column_mapping: {
            date: colDate,
            description: colDesc,
            reference: colRef,
            withdrawal: colWithdrawal,
            deposit: colDeposit,
            balance: colBal
          }
        });
        activeProfileId = newProf.data.id;
      } catch(e) {
        alert("Failed to create profile.");
        setUploading(false);
        return;
      }
    }
    
    const formData = new FormData();
    formData.append('ledger_id', selectedLedger);
    if (activeProfileId) {
      formData.append('profile_id', activeProfileId);
    }
    formData.append('file', fileInputRef.current.files[0]);
    
    try {
      await apiClient.post('/api/finance/bank-statements/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setShowUploadModal(false);
      fetchData();
    } catch(e) {
      alert("Upload failed. Please check the columns and format.");
    } finally {
      setUploading(false);
    }
  };

  const handleManualMatch = async () => {
    if (!selectedBankRowId || !selectedVoucherId) return;
    
    try {
      await apiClient.post('/api/finance/bank-reconciliation/match', {
        statement_row_id: selectedBankRowId,
        voucher_id: selectedVoucherId
      });
      setSelectedBankRowId(null);
      setSelectedVoucherId(null);
      fetchData();
    } catch(e: any) {
      alert(e.response?.data?.detail || "Match failed");
    }
  };

  const styles = {
    pane: { flex: 1, backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', overflow: 'hidden', display: 'flex', flexDirection: 'column' as const },
    paneHeader: { backgroundColor: '#0f172a', padding: '12px 16px', fontWeight: 'bold' as const, color: '#38bdf8', borderBottom: '1px solid #334155' },
    tableHeader: { padding: '8px 12px', textAlign: 'left' as const, color: '#94a3b8', fontSize: '11px', textTransform: 'uppercase' as const, borderBottom: '1px solid #334155' },
    cell: { padding: '8px 12px', fontSize: '12px', color: '#f8fafc', borderBottom: '1px solid #334155', whiteSpace: 'nowrap' as const, overflow: 'hidden' as const, textOverflow: 'ellipsis' as const },
    btnMatch: { backgroundColor: '#3b82f6', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', fontWeight: 'bold' as const, cursor: 'pointer', opacity: (selectedBankRowId && selectedVoucherId) ? 1 : 0.5 }
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#0f172a', color: 'white' }}>
      {/* Top Bar */}
      <div style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <h2 style={{ margin: 0, fontSize: '18px' }}>Bank Reconciliation</h2>
          <select 
            value={selectedLedger} 
            onChange={e => setSelectedLedger(e.target.value)}
            style={{ padding: '6px 12px', backgroundColor: '#1e293b', color: 'white', border: '1px solid #334155', borderRadius: '4px' }}
          >
            {ledgers.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={() => setShowUploadModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
            <Upload size={16} /> Import Statement
          </button>
          <button style={{ ...styles.btnMatch }} disabled={!selectedBankRowId || !selectedVoucherId} onClick={handleManualMatch}>
            <Check size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }}/> Match Selected
          </button>
        </div>
      </div>

      {/* Split Pane */}
      <div style={{ flex: 1, display: 'flex', gap: '16px', padding: '16px', overflow: 'hidden' }}>
        
        {/* Left Pane - Bank Statement */}
        <div style={styles.pane}>
          <div style={styles.paneHeader}>1. Bank Statement (Unreconciled)</div>
          <div style={{ flex: 1, overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={styles.tableHeader}>Date</th>
                  <th style={styles.tableHeader}>Description</th>
                  <th style={{ ...styles.tableHeader, textAlign: 'right' }}>Withdrawal</th>
                  <th style={{ ...styles.tableHeader, textAlign: 'right' }}>Deposit</th>
                </tr>
              </thead>
              <tbody>
                {bankRows.map(r => (
                  <tr 
                    key={r.id} 
                    onClick={() => setSelectedBankRowId(r.id)}
                    style={{ backgroundColor: selectedBankRowId === r.id ? 'rgba(59, 130, 246, 0.2)' : 'transparent', cursor: 'pointer' }}
                  >
                    <td style={styles.cell}>{r.transaction_date}</td>
                    <td style={{ ...styles.cell, maxWidth: '200px' }}>
                      {r.description}
                      {r.reference_no && <div style={{ fontSize: '10px', color: '#94a3b8' }}>Ref: {r.reference_no}</div>}
                    </td>
                    <td style={{ ...styles.cell, textAlign: 'right', color: '#fca5a5' }}>{r.withdrawal > 0 ? r.withdrawal : ''}</td>
                    <td style={{ ...styles.cell, textAlign: 'right', color: '#6ee7b7' }}>{r.deposit > 0 ? r.deposit : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Pane - ERP Vouchers */}
        <div style={styles.pane}>
          <div style={{ ...styles.paneHeader, color: '#f59e0b' }}>2. ERP Vouchers (Unreconciled)</div>
          <div style={{ flex: 1, overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={styles.tableHeader}>Date</th>
                  <th style={styles.tableHeader}>Voucher No</th>
                  <th style={{ ...styles.tableHeader, textAlign: 'right' }}>Payment (Cr)</th>
                  <th style={{ ...styles.tableHeader, textAlign: 'right' }}>Receipt (Dr)</th>
                </tr>
              </thead>
              <tbody>
                {vouchers.map(v => (
                  <tr 
                    key={v.id} 
                    onClick={() => setSelectedVoucherId(v.id)}
                    style={{ backgroundColor: selectedVoucherId === v.id ? 'rgba(245, 158, 11, 0.2)' : 'transparent', cursor: 'pointer' }}
                  >
                    <td style={styles.cell}>{new Date(v.date).toISOString().split('T')[0]}</td>
                    <td style={{ ...styles.cell, maxWidth: '200px' }}>
                      <span style={{ fontWeight: 'bold' }}>{v.voucher_number}</span>
                      <div style={{ fontSize: '10px', color: '#94a3b8', whiteSpace: 'normal' }}>{v.narration}</div>
                    </td>
                    <td style={{ ...styles.cell, textAlign: 'right', color: '#fca5a5' }}>{v.type === 'Cr' ? v.amount : ''}</td>
                    <td style={{ ...styles.cell, textAlign: 'right', color: '#6ee7b7' }}>{v.type === 'Dr' ? v.amount : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#1e293b', padding: '24px', borderRadius: '8px', width: '500px', border: '1px solid #334155' }}>
            <h3 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}><FileSpreadsheet size={20} color="#38bdf8"/> Import Bank Statement</h3>
            
            <input type="file" accept=".csv" ref={fileInputRef} style={{ marginBottom: '24px', display: 'block', color: '#94a3b8' }} />
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '8px' }}>Column Mapping Profile</label>
              <select 
                value={isCreatingProfile ? 'new' : selectedProfile}
                onChange={e => {
                  if (e.target.value === 'new') setIsCreatingProfile(true);
                  else { setIsCreatingProfile(false); setSelectedProfile(e.target.value); }
                }}
                style={{ width: '100%', padding: '8px', backgroundColor: '#0f172a', color: 'white', border: '1px solid #334155', borderRadius: '4px' }}
              >
                <option value="">-- Select Profile --</option>
                {profiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                <option value="new">+ Create New Mapping Profile</option>
              </select>
            </div>

            {isCreatingProfile && (
              <div style={{ backgroundColor: '#0f172a', padding: '16px', borderRadius: '4px', border: '1px dashed #475569', marginBottom: '16px' }}>
                <input placeholder="Profile Name (e.g. HDFC Format)" value={newProfileName} onChange={e => setNewProfileName(e.target.value)} style={{ width: '100%', padding: '8px', marginBottom: '12px', backgroundColor: '#1e293b', border: '1px solid #334155', color: 'white' }}/>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <input placeholder="Date Column Name" value={colDate} onChange={e => setColDate(e.target.value)} style={{ padding: '6px', backgroundColor: '#1e293b', border: '1px solid #334155', color: 'white' }}/>
                  <input placeholder="Description Column" value={colDesc} onChange={e => setColDesc(e.target.value)} style={{ padding: '6px', backgroundColor: '#1e293b', border: '1px solid #334155', color: 'white' }}/>
                  <input placeholder="Withdrawal Column" value={colWithdrawal} onChange={e => setColWithdrawal(e.target.value)} style={{ padding: '6px', backgroundColor: '#1e293b', border: '1px solid #334155', color: 'white' }}/>
                  <input placeholder="Deposit Column" value={colDeposit} onChange={e => setColDeposit(e.target.value)} style={{ padding: '6px', backgroundColor: '#1e293b', border: '1px solid #334155', color: 'white' }}/>
                  <input placeholder="Reference Column" value={colRef} onChange={e => setColRef(e.target.value)} style={{ padding: '6px', backgroundColor: '#1e293b', border: '1px solid #334155', color: 'white' }}/>
                  <input placeholder="Balance Column" value={colBal} onChange={e => setColBal(e.target.value)} style={{ padding: '6px', backgroundColor: '#1e293b', border: '1px solid #334155', color: 'white' }}/>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button onClick={() => setShowUploadModal(false)} style={{ padding: '8px 16px', backgroundColor: 'transparent', border: '1px solid #475569', color: 'white', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleUpload} disabled={uploading} style={{ padding: '8px 16px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                {uploading ? 'Processing...' : 'Upload & Process'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
