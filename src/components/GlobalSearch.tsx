import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface SearchableOption {
  title: string;
  path: string;
  breadcrumb: string;
  keywords: string[];
}

const SEARCH_OPTIONS: SearchableOption[] = [
  { title: "Dashboard", path: "/", breadcrumb: "Home > Dashboard", keywords: ["home", "main"] },
  { title: "Settings", path: "/settings", breadcrumb: "Home > Settings", keywords: ["config", "theme", "preferences"] },
  { title: "Master Options", path: "/master", breadcrumb: "Master", keywords: ["ledgers", "accounts", "hsn", "stations"] },
  { title: "Products (Inventory)", path: "/inventory", breadcrumb: "Master > Inventory Master > Item Master", keywords: ["items", "products", "materials"] },
  
  // Sale
  { title: "Sales Bill", path: "/sales?type=bill", breadcrumb: "Transactions > Sale > Bill", keywords: ["invoice", "sale", "billing"] },
  { title: "Sales Challan", path: "/sales?type=challan", breadcrumb: "Transactions > Sale > Challan", keywords: ["delivery", "challan"] },
  { title: "Modify Sales Bill", path: "/sales?type=modify-bill", breadcrumb: "Transactions > Sale > Modify Bill", keywords: ["edit", "update", "change"] },
  
  // Purchase
  { title: "Purchase Bill", path: "/purchase?type=bill", breadcrumb: "Transactions > Purchase > Purchase Bill", keywords: ["buy", "vendor", "bill"] },
  { title: "Purchase Challan", path: "/purchase?type=challan", breadcrumb: "Transactions > Purchase > Purchase Challan", keywords: ["delivery", "receipt"] },
  
  // Returns
  { title: "Sales Return (Credit Note)", path: "/sales-return?type=credit", breadcrumb: "Transactions > Sale Return > Credit Note", keywords: ["return", "credit", "refund"] },
  { title: "Purchase Return (Debit Note)", path: "/purchase-return?type=debit", breadcrumb: "Transactions > Purchase Return > Debit Note", keywords: ["return", "debit"] },
  
  // Brk Exp
  { title: "Breakage/Expiry Receive", path: "/brk-receive?type=entry", breadcrumb: "Transactions > Brk/Exp Receive > Receive Entry", keywords: ["damage", "expiry", "receive"] },
  { title: "Breakage/Expiry Issue", path: "/brk-issue?type=entry", breadcrumb: "Transactions > Brk/Exp Issue > Issue Entry", keywords: ["damage", "expiry", "issue"] },
  
  // GST
  { title: "GST Inward (Expenses)", path: "/gst-inward?type=entry", breadcrumb: "Transactions > GST Inward > Inward Entry", keywords: ["expense", "gst"] },
  { title: "GST Outward (Services)", path: "/gst-outward?type=entry", breadcrumb: "Transactions > GST Outward > Outward Entry", keywords: ["service", "gst"] },
  
  // Stock
  { title: "Current Stock", path: "/stock", breadcrumb: "Stocks > Current Stock", keywords: ["inventory", "available", "balance"] },
  { title: "Brk/Exp Stock", path: "/brk-exp-stock", breadcrumb: "Stocks > Brk/Exp Stock", keywords: ["damage", "expired", "balance"] },
  
  // Finance
  { title: "Finance Dashboard", path: "/finance", breadcrumb: "Accounts > Finance & Accounting", keywords: ["ledger", "money", "accounting"] },
  
  // Bulletin
  { title: "Bulletin Board", path: "/bulletin", breadcrumb: "Home > Bulletin Board", keywords: ["notice", "announcement", "news"] }
];

export default function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Ctrl+K to focus search
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const filteredOptions = useMemo(() => {
    if (!query.trim()) return [];
    const lowerQuery = query.toLowerCase();
    return SEARCH_OPTIONS.filter(opt => 
      opt.title.toLowerCase().includes(lowerQuery) || 
      opt.breadcrumb.toLowerCase().includes(lowerQuery) ||
      opt.keywords.some(k => k.toLowerCase().includes(lowerQuery))
    ).slice(0, 8); // Show max 8 results
  }, [query]);

  const handleSelect = (path: string) => {
    navigate(path);
    setQuery('');
    setIsOpen(false);
    inputRef.current?.blur();
  };

  return (
    <div ref={wrapperRef} style={{ position: 'relative', width: '280px', margin: '0 16px' }}>
      <div style={{ position: 'relative' }}>
        <input 
          ref={inputRef}
          type="text"
          placeholder="Search... (Ctrl+K)"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          style={{
            width: '100%',
            padding: '6px 12px 6px 32px',
            borderRadius: '16px',
            border: '1px solid var(--color-border)',
            outline: 'none',
            fontSize: '13px',
            backgroundColor: 'var(--color-bg)',
            color: 'var(--color-text-primary)',
            transition: 'all 0.2s',
          }}
        />
        <Search 
          size={14} 
          style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-secondary)' }} 
        />
      </div>

      {isOpen && query.trim().length > 0 && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          marginTop: '6px',
          backgroundColor: 'var(--color-bg-elevated)',
          borderRadius: '8px',
          boxShadow: 'var(--shadow-lg)',
          zIndex: 9999,
          maxHeight: '350px',
          overflowY: 'auto',
          border: '1px solid var(--color-border-strong)'
        }}>
          {filteredOptions.length > 0 ? (
            <ul style={{ listStyle: 'none', padding: '4px 0', margin: 0 }}>
              {filteredOptions.map((opt, idx) => (
                <li 
                  key={idx}
                  onClick={() => handleSelect(opt.path)}
                  style={{
                    padding: '8px 12px',
                    borderBottom: idx < filteredOptions.length - 1 ? '1px solid var(--color-border)' : 'none',
                    cursor: 'pointer',
                    transition: 'background-color 0.1s',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-bg-subtle)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, color: 'var(--color-text-primary)', fontSize: '13px' }}>{opt.title}</span>
                    <ChevronRight size={12} color="var(--color-text-muted)" />
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                    {opt.breadcrumb}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div style={{ padding: '12px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '12px' }}>
              No options found for "{query}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}
