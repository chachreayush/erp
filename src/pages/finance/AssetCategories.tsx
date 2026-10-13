import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient, { Ledger, AssetCategory, apiGetAssetCategories, apiCreateAssetCategory } from '../../lib/api';
import { useReturnNavigation } from '../../hooks/useReturnNavigation';
import { Settings2, Plus, Save, ArrowLeft, Layers, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';

export default function AssetCategories() {
  useReturnNavigation();
  const navigate = useNavigate();

  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [ledgers, setLedgers] = useState<Ledger[]>([]);

  const [name, setName] = useState('');
  const [rate, setRate] = useState('');
  const [method, setMethod] = useState<'WDV' | 'SLM'>('WDV');
  const [assetLedger, setAssetLedger] = useState('');
  const [accDepLedger, setAccDepLedger] = useState('');
  const [expLedger, setExpLedger] = useState('');

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [catRes, ledRes] = await Promise.all([
        apiGetAssetCategories().catch(() => []),
        apiClient.get('/api/master/ledgers').then(r => r.data).catch(() => [])
      ]);
      setCategories(catRes || []);
      setLedgers(ledRes || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !rate || !assetLedger || !accDepLedger || !expLedger) {
      setNotification({ type: 'error', message: 'Please fill all mandatory fields.' });
      return;
    }
    try {
      await apiCreateAssetCategory({
        name,
        depreciation_method: method,
        depreciation_rate: parseFloat(rate),
        asset_ledger_id: assetLedger,
        acc_depreciation_ledger_id: accDepLedger,
        depreciation_expense_ledger_id: expLedger
      });
      setName('');
      setRate('');
      setAssetLedger('');
      setAccDepLedger('');
      setExpLedger('');
      setNotification({ type: 'success', message: `✓ Asset Category '${name}' created successfully!` });
      fetchData();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.response?.data?.detail || 'Failed to save asset category.' });
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#eef2ef', padding: '24px 32px', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", color: '#1b4332' }}>
      
      {/* ── TOP HEADER CARD ── */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #d8e2dc', padding: '20px 24px', marginBottom: '20px', boxShadow: '0 2px 12px rgba(0,0,0,0.03)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#40916c', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
              Finance Hub / Fixed Assets Configuration
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#1b4332', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff' }}>
                <Settings2 size={22} />
              </div>
              <div>
                <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: '#1b4332', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  Asset Categories & GL Mappings
                  <span style={{ fontSize: '11px', fontWeight: 700, backgroundColor: '#d8f3dc', color: '#1b4332', padding: '3px 8px', borderRadius: '6px', border: '1px solid #b7e4c7' }}>
                    DOC-27 CONFIG
                  </span>
                </h1>
                <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: '#52796f' }}>
                  Map statutory asset types to General Ledger accounts (Gross Block, Contra-Asset & P&L Expense)
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={() => navigate('/finance/fixed-assets')}
            style={{ backgroundColor: '#ffffff', color: '#2d6a4f', border: '1px solid #b7e4c7', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <ArrowLeft size={15} /> Back to Asset Register
          </button>
        </div>
      </div>

      {/* ── NOTIFICATION ── */}
      {notification && (
        <div style={{
          backgroundColor: notification.type === 'success' ? '#d8f3dc' : '#fee2e2',
          border: `1px solid ${notification.type === 'success' ? '#74c69d' : '#f87171'}`,
          borderRadius: '10px',
          padding: '12px 18px',
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          color: notification.type === 'success' ? '#1b4332' : '#991b1b',
          fontSize: '13.5px',
          fontWeight: 600
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {notification.type === 'success' ? <CheckCircle2 size={18} color="#2d6a4f" /> : <AlertCircle size={18} color="#dc2626" />}
            {notification.message}
          </div>
          <button onClick={() => setNotification(null)} style={{ background: 'none', border: 'none', fontSize: '16px', cursor: 'pointer', color: 'inherit' }}>×</button>
        </div>
      )}

      {/* ── 2-COLUMN LAYOUT ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) 2fr', gap: '20px' }}>
        
        {/* Form Card */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #d8e2dc', padding: '24px', boxShadow: '0 2px 12px rgba(0,0,0,0.03)' }}>
          <h2 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 800, color: '#1b4332', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={18} color="#2d6a4f" /> Add New Asset Category
          </h2>

          <form onSubmit={handleSave}>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#1b4332', marginBottom: '6px' }}>Category Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Laboratory Equipment"
                value={name}
                onChange={e => setName(e.target.value)}
                style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: '6px', border: '1px solid #d8e2dc', fontSize: '13px', outline: 'none' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#1b4332', marginBottom: '6px' }}>Rate (%) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.1"
                  required
                  placeholder="e.g. 15.0"
                  value={rate}
                  onChange={e => setRate(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: '6px', border: '1px solid #d8e2dc', fontSize: '13px', outline: 'none' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#1b4332', marginBottom: '6px' }}>Method *</label>
                <select
                  value={method}
                  onChange={e => setMethod(e.target.value as any)}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: '6px', border: '1px solid #d8e2dc', fontSize: '13px', outline: 'none' }}
                >
                  <option value="WDV">WDV (Reducing)</option>
                  <option value="SLM">SLM (Straight Line)</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#1b4332', marginBottom: '6px' }}>Gross Block Asset Ledger (Balance Sheet) *</label>
              <select
                required
                value={assetLedger}
                onChange={e => setAssetLedger(e.target.value)}
                style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: '6px', border: '1px solid #d8e2dc', fontSize: '13px', outline: 'none' }}
              >
                <option value="">-- Select Asset Ledger --</option>
                {ledgers.map(l => (
                  <option key={l.id} value={l.id}>{l.name} ({l.group_name})</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#1b4332', marginBottom: '6px' }}>Accumulated Depreciation Ledger (Contra-Asset) *</label>
              <select
                required
                value={accDepLedger}
                onChange={e => setAccDepLedger(e.target.value)}
                style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: '6px', border: '1px solid #d8e2dc', fontSize: '13px', outline: 'none' }}
              >
                <option value="">-- Select Acc. Dep. Ledger --</option>
                {ledgers.map(l => (
                  <option key={l.id} value={l.id}>{l.name} ({l.group_name})</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#1b4332', marginBottom: '6px' }}>Depreciation Expense Ledger (P&L Indirect Exp) *</label>
              <select
                required
                value={expLedger}
                onChange={e => setExpLedger(e.target.value)}
                style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: '6px', border: '1px solid #d8e2dc', fontSize: '13px', outline: 'none' }}
              >
                <option value="">-- Select P&L Expense Ledger --</option>
                {ledgers.map(l => (
                  <option key={l.id} value={l.id}>{l.name} ({l.group_name})</option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              style={{
                width: '100%',
                backgroundColor: '#1b4332',
                color: '#ffffff',
                border: 'none',
                padding: '10px',
                borderRadius: '8px',
                fontSize: '13.5px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Save size={16} /> Save Category Configuration
            </button>
          </form>
        </div>

        {/* Existing Categories Table */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #d8e2dc', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.03)' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2ece9', backgroundColor: '#fcfdfc' }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#1b4332' }}>
              Configured Asset Categories ({categories.length})
            </h3>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: 'linear-gradient(90deg, #1b4332 0%, #2d6a4f 100%)', color: '#ffffff' }}>
                <th style={{ padding: '12px 18px', fontWeight: 700 }}>CATEGORY NAME</th>
                <th style={{ padding: '12px 18px', fontWeight: 700 }}>METHOD & RATE</th>
                <th style={{ padding: '12px 18px', fontWeight: 700 }}>GENERAL LEDGERS MAPPED</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((c, idx) => (
                <tr key={c.id} style={{ backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8faf9', borderBottom: '1px solid #e2ece9' }}>
                  <td style={{ padding: '14px 18px', fontWeight: 700, color: '#1b4332' }}>
                    {c.name}
                  </td>
                  <td style={{ padding: '14px 18px' }}>
                    <span style={{ backgroundColor: '#d8f3dc', color: '#1b4332', padding: '3px 8px', borderRadius: '6px', fontWeight: 700, fontSize: '12px' }}>
                      {c.depreciation_rate}% {c.depreciation_method}
                    </span>
                  </td>
                  <td style={{ padding: '14px 18px', fontSize: '12px', color: '#52796f' }}>
                    <div><b>Asset:</b> {ledgers.find(l => l.id === c.asset_ledger_id)?.name || 'Fixed Assets (Gross Block) A/c'}</div>
                    <div style={{ marginTop: '2px' }}><b>Acc Dep:</b> {ledgers.find(l => l.id === c.acc_depreciation_ledger_id)?.name || 'Accumulated Depreciation A/c'}</div>
                    <div style={{ marginTop: '2px' }}><b>P&L Exp:</b> {ledgers.find(l => l.id === c.depreciation_expense_ledger_id)?.name || 'Depreciation Expense A/c'}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>

    </div>
  );
}
