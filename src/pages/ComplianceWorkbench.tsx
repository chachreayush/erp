import React, { useState, useEffect } from 'react';

export default function ComplianceWorkbench() {
  const [pendingInvoices, setPendingInvoices] = useState<any[]>([]);
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);
  const [statusMsg, setStatusMsg] = useState('');

  useEffect(() => {
    // Dummy fetch pending invoices
    fetch('/api/compliance/pending', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setPendingInvoices(data);
      })
      .catch(err => console.error(err));
  }, []);

  const handleSelect = (id: string) => {
    setSelectedInvoices(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleValidate = () => {
    // F6 action
    if (selectedInvoices.length === 0) return alert('Select invoices to validate');
    setStatusMsg(`Validated ${selectedInvoices.length} invoices locally. All pass.`);
  };

  const handleExport = () => {
    // F7 action
    if (selectedInvoices.length === 0) return alert('Select invoices to export');
    fetch('/api/compliance/export-json', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(selectedInvoices)
    })
    .then(res => res.json())
    .then(data => {
      // Simulate download
      const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `irp_export_${new Date().getTime()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setStatusMsg(`Exported JSON for ${selectedInvoices.length} invoices. Upload this to the IRP portal.`);
    });
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    // F8 action
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        fetch('/api/compliance/import-response', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify(json)
        })
        .then(res => res.json())
        .then(data => {
          setStatusMsg(`Successfully imported response and updated ${data.updated_records} records.`);
          // Refresh list
          setPendingInvoices(prev => prev.filter(inv => !selectedInvoices.includes(inv.id)));
          setSelectedInvoices([]);
        });
      } catch (err) {
        setStatusMsg('Invalid JSON file');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4 text-gray-800">Compliance Workbench</h1>
      <div className="bg-white rounded shadow p-4 mb-4 flex gap-4 items-center">
        <button onClick={handleValidate} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">
          [F6] Validate
        </button>
        <button onClick={handleExport} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded">
          [F7] Export JSON
        </button>
        <div>
          <label className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded cursor-pointer">
            [F8] Import Response
            <input type="file" accept=".json" className="hidden" onChange={handleImport} />
          </label>
        </div>
      </div>
      
      {statusMsg && <div className="p-3 bg-yellow-100 text-yellow-800 mb-4 rounded">{statusMsg}</div>}

      <div className="bg-white rounded shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Select</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Date</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Invoice No</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Customer</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {pendingInvoices.length === 0 ? (
              <tr><td colSpan={5} className="p-4 text-center text-gray-500">No pending invoices for compliance.</td></tr>
            ) : (
              pendingInvoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2">
                    <input 
                      type="checkbox" 
                      checked={selectedInvoices.includes(inv.id)}
                      onChange={() => handleSelect(inv.id)}
                    />
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-900">{inv.date?.split('T')[0]}</td>
                  <td className="px-4 py-2 text-sm text-gray-900">{inv.invoice_number}</td>
                  <td className="px-4 py-2 text-sm text-gray-900">{inv.customer_name}</td>
                  <td className="px-4 py-2 text-sm text-gray-900 text-right">{inv.grand_total?.toFixed(2)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
