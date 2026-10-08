import React, { useState, useEffect } from 'react';

export default function SignedLedger() {
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
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4 text-gray-800">Signed Evidence Ledger</h1>
      <div className="bg-white rounded shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Date/Time</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Invoice No</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Type</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Status</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">IRN</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Ack No</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {logs.length === 0 ? (
              <tr><td colSpan={6} className="p-4 text-center text-gray-500">No compliance logs found.</td></tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-sm text-gray-900">{new Date(log.created_at).toLocaleString()}</td>
                  <td className="px-4 py-2 text-sm font-medium text-indigo-600">{log.invoice_number}</td>
                  <td className="px-4 py-2 text-sm text-gray-900">{log.log_type}</td>
                  <td className="px-4 py-2 text-sm">
                    <span className={`px-2 py-1 text-xs font-bold rounded ${log.status === 'SUCCESS' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {log.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-900">{log.irn || '-'}</td>
                  <td className="px-4 py-2 text-sm text-gray-900">{log.ack_no || '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
