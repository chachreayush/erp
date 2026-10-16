import React, { useState, useEffect, useMemo } from 'react';
import { Layers, X, Save, Search, Check, AlertCircle, Building2, Percent, CheckCircle2 } from 'lucide-react';
import {
  apiGetManufacturers,
  apiGetOrgCompanyMappings,
  apiSetOrgCompanyMappings,
  Manufacturer,
  OrgCompanyMappingItem
} from '../../lib/api';

export interface ClientCompanyDraft {
  id?: string;
  organization_id?: string;
  manufacturer_id: string;
  manufacturer_name?: string;
  short_code?: string;
  is_primary: boolean;
  commission_rate_override?: number;
  notes?: string;
  created_at?: string;
}

interface ClientCompanyMappingModalProps {
  isOpen: boolean;
  onClose: () => void;
  orgId: string;
  orgName: string;
}

export default function ClientCompanyMappingModal({
  isOpen,
  onClose,
  orgId,
  orgName
}: ClientCompanyMappingModalProps) {
  const [allCompanies, setAllCompanies] = useState<Manufacturer[]>([]);
  const [mappings, setMappings] = useState<ClientCompanyDraft[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (isOpen && orgId) {
      loadData();
    }
  }, [isOpen, orgId]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.altKey && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, mappings]);

  const loadData = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const [companies, currentMappings] = await Promise.all([
        apiGetManufacturers(),
        apiGetOrgCompanyMappings(orgId)
      ]);
      setAllCompanies(companies);
      setMappings(currentMappings);
    } catch (err: any) {
      console.error('Failed to load client company mappings', err);
      setMessage({ type: 'error', text: 'Failed to load mappings: ' + (err.message || 'Unknown error') });
    } finally {
      setLoading(false);
    }
  };

  const isCompanyMapped = (companyId: string) => {
    return mappings.some(m => m.manufacturer_id === companyId);
  };

  const getMapping = (companyId: string): ClientCompanyDraft | undefined => {
    return mappings.find(m => m.manufacturer_id === companyId);
  };

  const toggleCompany = (companyId: string) => {
    if (isCompanyMapped(companyId)) {
      setMappings(prev => prev.filter(m => m.manufacturer_id !== companyId));
    } else {
      const isFirst = mappings.length === 0;
      setMappings(prev => [
        ...prev,
        {
          manufacturer_id: companyId,
          is_primary: isFirst,
          commission_rate_override: undefined,
          notes: ''
        }
      ]);
    }
  };

  const updateCommissionOverride = (companyId: string, val: string) => {
    const num = val === '' ? undefined : parseFloat(val);
    setMappings(prev =>
      prev.map(m =>
        m.manufacturer_id === companyId
          ? { ...m, commission_rate_override: isNaN(num as number) ? undefined : num }
          : m
      )
    );
  };

  const updateNotes = (companyId: string, notes: string) => {
    setMappings(prev =>
      prev.map(m => (m.manufacturer_id === companyId ? { ...m, notes } : m))
    );
  };

  const setPrimary = (companyId: string) => {
    setMappings(prev =>
      prev.map(m => ({
        ...m,
        is_primary: m.manufacturer_id === companyId
      }))
    );
  };

  const handleSelectAll = () => {
    const newMappings: ClientCompanyDraft[] = allCompanies.map((c, idx) => {
      const existing = mappings.find(m => m.manufacturer_id === c.id);
      return (
        existing || {
          manufacturer_id: c.id,
          is_primary: idx === 0,
          commission_rate_override: undefined,
          notes: ''
        }
      );
    });
    setMappings(newMappings);
  };

  const handleClearAll = () => {
    setMappings([]);
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await apiSetOrgCompanyMappings(orgId, {
        items: mappings.map(m => ({
          manufacturer_id: m.manufacturer_id,
          is_primary: m.is_primary,
          commission_rate_override: m.commission_rate_override,
          notes: m.notes
        }))
      });
      setMessage({ type: 'success', text: `Successfully updated ${mappings.length} authorized company mappings!` });
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      console.error('Failed to save mappings', err);
      setMessage({ type: 'error', text: 'Error saving mappings: ' + (err.response?.data?.detail || err.message) });
    } finally {
      setSaving(false);
    }
  };

  const filteredCompanies = useMemo(() => {
    if (!search.trim()) return allCompanies;
    const q = search.toLowerCase();
    return allCompanies.filter(
      c =>
        c.name.toLowerCase().includes(q) ||
        (c.short_code && c.short_code.toLowerCase().includes(q)) ||
        (c.division && c.division.toLowerCase().includes(q))
    );
  }, [allCompanies, search]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
    >
      <div
        id="client-company-mapping-modal"
        style={{
          width: '100%',
          maxWidth: '920px',
          maxHeight: '90vh',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'fadeIn 0.2s ease-out'
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            backgroundColor: '#1b4332',
            color: '#ffffff',
            padding: '20px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '2px solid #2d6a4f'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                backgroundColor: 'rgba(255, 255, 255, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Layers size={22} color="#74c69d" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, letterSpacing: '-0.01em' }}>
                Authorized Product Companies
              </h2>
              <div style={{ fontSize: '12px', color: '#b7e4c7', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>Client:</span>
                <strong style={{ color: '#ffffff' }}>{orgName}</strong>
                <span>•</span>
                <span>{mappings.length} assigned</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            id="close-company-mapping-modal-btn"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#d8f3dc',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Controls / Search */}
        <div
          style={{
            padding: '16px 24px',
            backgroundColor: '#f8faf9',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px'
          }}
        >
          <div
            style={{
              position: 'relative',
              flex: 1,
              maxWidth: '400px'
            }}
          >
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#64748b'
              }}
            />
            <input
              type="text"
              id="company-mapping-search-input"
              placeholder="Search product companies by name, code, division..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px 8px 36px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              id="btn-select-all-companies"
              onClick={handleSelectAll}
              style={{
                padding: '6px 12px',
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                color: '#1b4332',
                cursor: 'pointer'
              }}
            >
              Select All
            </button>
            <button
              type="button"
              id="btn-clear-all-companies"
              onClick={handleClearAll}
              style={{
                padding: '6px 12px',
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                color: '#dc2626',
                cursor: 'pointer'
              }}
            >
              Clear All
            </button>
          </div>
        </div>

        {/* Message Banner */}
        {message && (
          <div
            style={{
              padding: '10px 24px',
              backgroundColor: message.type === 'success' ? '#dcfce7' : '#fee2e2',
              color: message.type === 'success' ? '#15803d' : '#b91c1c',
              fontSize: '13px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              borderBottom: '1px solid rgba(0,0,0,0.05)'
            }}
          >
            {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{message.text}</span>
          </div>
        )}

        {/* Companies List */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px 24px',
            maxHeight: '480px'
          }}
        >
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
              Loading product companies and client authorizations...
            </div>
          ) : filteredCompanies.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
              No product companies found matching "{search}".
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {filteredCompanies.map(c => {
                const mapped = isCompanyMapped(c.id);
                const mapping = getMapping(c.id);

                return (
                  <div
                    key={c.id}
                    id={`company-row-${c.id}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      borderRadius: '10px',
                      border: mapped ? '1.5px solid #2d6a4f' : '1px solid #e2e8f0',
                      backgroundColor: mapped ? '#f0fdf4' : '#ffffff',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {/* Left: Checkbox & Company Details */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '14px',
                        cursor: 'pointer',
                        flex: 1
                      }}
                      onClick={() => toggleCompany(c.id)}
                    >
                      <input
                        type="checkbox"
                        checked={mapped}
                        onChange={() => toggleCompany(c.id)}
                        id={`company-check-${c.id}`}
                        style={{
                          width: '18px',
                          height: '18px',
                          cursor: 'pointer',
                          accentColor: '#1b4332'
                        }}
                      />
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 700, fontSize: '14px', color: '#1e293b' }}>
                            {c.name}
                          </span>
                          {c.short_code && (
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 700,
                                backgroundColor: '#e2e8f0',
                                color: '#475569',
                                padding: '1px 6px',
                                borderRadius: '4px'
                              }}
                            >
                              {c.short_code}
                            </span>
                          )}
                          {c.division && (
                            <span
                              style={{
                                fontSize: '11px',
                                backgroundColor: '#e0e7ff',
                                color: '#3730a3',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                fontWeight: 500
                              }}
                            >
                              {c.division}
                            </span>
                          )}
                          {mapped && mapping?.is_primary && (
                            <span
                              style={{
                                fontSize: '10px',
                                backgroundColor: '#1b4332',
                                color: '#ffffff',
                                padding: '2px 8px',
                                borderRadius: '12px',
                                fontWeight: 700,
                                letterSpacing: '0.05em',
                                textTransform: 'uppercase'
                              }}
                            >
                              Primary
                            </span>
                          )}
                        </div>

                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px', display: 'flex', gap: '12px' }}>
                          {c.supplier_ledger_name && (
                            <span>
                              Supplier: <strong style={{ color: '#334155' }}>{c.supplier_ledger_name}</strong>
                            </span>
                          )}
                          {c.sales_ledger_name && (
                            <span>
                              Sales: <strong style={{ color: '#334155' }}>{c.sales_ledger_name}</strong>
                            </span>
                          )}
                          {c.products_count !== undefined && (
                            <span>{c.products_count} Products</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Primary toggle, Commission Override, Notes */}
                    {mapped && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px'
                        }}
                      >
                        {/* Primary Company Toggle */}
                        <label
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '11px',
                            fontWeight: 600,
                            color: '#1b4332',
                            cursor: 'pointer'
                          }}
                        >
                          <input
                            type="radio"
                            name="primary_company"
                            checked={mapping?.is_primary || false}
                            onChange={() => setPrimary(c.id)}
                            style={{ accentColor: '#1b4332', cursor: 'pointer' }}
                          />
                          <span>Primary</span>
                        </label>

                        {/* Commission Override */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Percent size={13} color="#64748b" />
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="100"
                            placeholder="Comm %"
                            id={`company-comm-override-${c.id}`}
                            value={mapping?.commission_rate_override ?? ''}
                            onChange={e => updateCommissionOverride(c.id, e.target.value)}
                            title="Commission rate override for this client-company contract"
                            style={{
                              width: '74px',
                              padding: '4px 6px',
                              borderRadius: '6px',
                              border: '1px solid #cbd5e1',
                              fontSize: '12px',
                              textAlign: 'right'
                            }}
                          />
                        </div>

                        {/* Notes */}
                        <input
                          type="text"
                          placeholder="Contract notes..."
                          value={mapping?.notes || ''}
                          onChange={e => updateNotes(c.id, e.target.value)}
                          style={{
                            width: '130px',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            fontSize: '12px'
                          }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '16px 24px',
            backgroundColor: '#f8faf9',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ fontSize: '12px', color: '#64748b' }}>
            <span>Keyboard shortcuts: </span>
            <kbd style={{ backgroundColor: '#e2e8f0', padding: '2px 5px', borderRadius: '4px', fontWeight: 600 }}>Esc</kbd> Cancel
            <span style={{ margin: '0 6px' }}>•</span>
            <kbd style={{ backgroundColor: '#e2e8f0', padding: '2px 5px', borderRadius: '4px', fontWeight: 600 }}>Alt+S</kbd> Save Mappings
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#475569',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              id="save-company-mappings-btn"
              onClick={handleSave}
              disabled={saving}
              style={{
                padding: '8px 20px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#1b4332',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: 700,
                cursor: saving ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 2px 4px rgba(27, 67, 50, 0.2)'
              }}
            >
              <Save size={16} />
              <span>{saving ? 'Saving Mappings...' : 'Save Mappings [Alt+S]'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
