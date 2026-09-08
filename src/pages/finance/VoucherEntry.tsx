import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useReturnNavigation } from '../../hooks/useReturnNavigation';
import { apiGetLedgers, apiCreateVoucher, apiGetNextVoucherNumber, Ledger } from '../../lib/api';
import { Trash, Plus, Save, ArrowLeft } from 'lucide-react';

interface Entry {
  id: number;
  ledgerId: string;
  isDr: boolean;
  amount: string;
}

export default function VoucherEntry() {
  const { type } = useParams<{ type: string }>();
  const navigate = useNavigate();
  
  const [isDirty, setIsDirty] = useState(false);
  useReturnNavigation(isDirty);

  const [ledgers, setLedgers] = useState<Ledger[]>([]);
  const [voucherNumber, setVoucherNumber] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [narration, setNarration] = useState('');
  const [entries, setEntries] = useState<Entry[]>([
    { id: Date.now(), ledgerId: '', isDr: type !== 'payment', amount: '' },
    { id: Date.now() + 1, ledgerId: '', isDr: type === 'payment', amount: '' }
  ]);

  useEffect(() => {
    apiGetLedgers().then(setLedgers).catch(console.error);
    fetchNextVoucherNo();
  }, [type]);

  const fetchNextVoucherNo = () => {
    if (type) {
      apiGetNextVoucherNumber(type).then(res => setVoucherNumber(res.next_number)).catch(console.error);
    }
  };

  const handleAddRow = () => {
    setEntries([...entries, { id: Date.now(), ledgerId: '', isDr: type === 'payment', amount: '' }]);
    setIsDirty(true);
  };

  const handleRemoveRow = (id: number) => {
    if (entries.length > 2) {
      setEntries(entries.filter(e => e.id !== id));
      setIsDirty(true);
    }
  };

  const updateEntry = (id: number, field: keyof Entry, value: any) => {
    setEntries(entries.map(e => e.id === id ? { ...e, [field]: value } : e));
    setIsDirty(true);
  };

  const totalDr = entries.filter(e => e.isDr).reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
  const totalCr = entries.filter(e => !e.isDr).reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
  const diff = Math.abs(totalDr - totalCr);
  const isValid = totalDr === totalCr && totalDr > 0 && entries.every(e => e.ledgerId && e.amount);

  const handleSave = async () => {
    if (!isValid) return;
    try {
      await apiCreateVoucher({
        voucher_type: type || 'Payment',
        voucher_number: voucherNumber,
        date,
        narration,
        total_amount: totalDr,
        entries: entries.map(e => ({
          ledger_id: e.ledgerId,
          cr_dr: e.isDr ? 'Dr' as const : 'Cr' as const,
          amount: parseFloat(e.amount)
        }))
      });
      alert('Voucher saved successfully');
      setIsDirty(false);
      setEntries([
        { id: Date.now(), ledgerId: '', isDr: type !== 'payment', amount: '' },
        { id: Date.now() + 1, ledgerId: '', isDr: type === 'payment', amount: '' }
      ]);
      setNarration('');
      fetchNextVoucherNo();
    } catch (err) {
      console.error(err);
      alert('Error saving voucher');
    }
  };

  const styles: Record<string, React.CSSProperties> = {
    container: { backgroundColor: '#020617', color: '#e2e8f0', minHeight: '100vh', padding: '24px', fontFamily: 'sans-serif' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
    title: { fontSize: '24px', fontWeight: 'bold', margin: 0, textTransform: 'capitalize' },
    escButton: { position: 'absolute', right: '24px', top: '24px', padding: '6px 12px', background: '#334155', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' },
    topBar: { display: 'flex', gap: '16px', marginBottom: '24px' },
    input: { background: '#0f172a', color: '#e2e8f0', border: '1px solid #1e293b', padding: '8px', borderRadius: '4px', outline: 'none' },
    grid: { display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' },
    row: { display: 'flex', gap: '12px', alignItems: 'center' },
    select: { flex: 1, background: '#0f172a', color: '#e2e8f0', border: '1px solid #1e293b', padding: '8px', borderRadius: '4px' },
    drCrSelect: { width: '80px', background: '#0f172a', color: '#e2e8f0', border: '1px solid #1e293b', padding: '8px', borderRadius: '4px' },
    amountInput: { width: '150px', background: '#0f172a', color: '#e2e8f0', border: '1px solid #1e293b', padding: '8px', borderRadius: '4px', textAlign: 'right' },
    iconBtn: { background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '8px' },
    addBtn: { display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: '1px dashed #334155', color: '#94a3b8', padding: '12px', borderRadius: '4px', cursor: 'pointer', width: '100%', justifyContent: 'center' },
    footer: { marginTop: '24px', borderTop: '1px solid #1e293b', paddingTop: '24px' },
    textarea: { width: '100%', background: '#0f172a', color: '#e2e8f0', border: '1px solid #1e293b', padding: '12px', borderRadius: '4px', minHeight: '80px', marginBottom: '16px' },
    totals: { display: 'flex', justifyContent: 'flex-end', gap: '24px', fontSize: '16px', marginBottom: '16px' },
    saveBtn: { display: 'flex', alignItems: 'center', gap: '8px', background: isValid ? '#2563eb' : '#334155', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '4px', cursor: isValid ? 'pointer' : 'not-allowed', marginLeft: 'auto' }
  };

  return (
    <div style={styles.container}>
      <button style={styles.escButton} onClick={() => navigate(-1)}><ArrowLeft size={16} /> [ESC] Exit</button>
      
      <div style={styles.header}>
        <h1 style={styles.title}>{type} Voucher</h1>
      </div>

      <div style={styles.topBar}>
        <div>
          <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Voucher No</label>
          <input style={styles.input} value={voucherNumber} readOnly />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Date</label>
          <input style={styles.input} type="date" value={date} onChange={e => { setDate(e.target.value); setIsDirty(true); }} />
        </div>
      </div>

      <div style={styles.grid}>
        {entries.map((entry, index) => (
          <div key={entry.id} style={styles.row}>
            <select style={styles.drCrSelect} value={entry.isDr ? 'Dr' : 'Cr'} onChange={e => updateEntry(entry.id, 'isDr', e.target.value === 'Dr')}>
              <option value="Dr">Dr</option>
              <option value="Cr">Cr</option>
            </select>
            <select style={styles.select} value={entry.ledgerId} onChange={e => updateEntry(entry.id, 'ledgerId', e.target.value)}>
              <option value="">Select Ledger...</option>
              {ledgers.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
            <input 
              style={styles.amountInput} 
              type="number" 
              placeholder="0.00" 
              value={entry.amount} 
              onChange={e => updateEntry(entry.id, 'amount', e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && index === entries.length - 1) handleAddRow();
              }}
            />
            <button style={{...styles.iconBtn, visibility: entries.length > 2 ? 'visible' : 'hidden'}} onClick={() => handleRemoveRow(entry.id)}>
              <Trash size={18} />
            </button>
          </div>
        ))}
      </div>

      <button style={styles.addBtn} onClick={handleAddRow}><Plus size={18} /> Add Row</button>

      <div style={styles.footer}>
        <textarea 
          style={styles.textarea} 
          placeholder="Narration..." 
          value={narration}
          onChange={e => { setNarration(e.target.value); setIsDirty(true); }}
        />
        
        <div style={styles.totals}>
          <div>Total Dr: <span style={{ fontWeight: 'bold' }}>${totalDr.toFixed(2)}</span></div>
          <div>Total Cr: <span style={{ fontWeight: 'bold' }}>${totalCr.toFixed(2)}</span></div>
          <div style={{ color: diff > 0 ? '#ef4444' : '#4ade80' }}>
            Difference: ${diff.toFixed(2)}
          </div>
        </div>

        <button style={styles.saveBtn} disabled={!isValid} onClick={handleSave}>
          <Save size={18} /> Save Voucher
        </button>
      </div>
    </div>
  );
}
