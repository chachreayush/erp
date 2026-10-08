import React, { useState } from 'react';

interface Props {
  partyId: string;
  partyName: string;
  amountExceeding: number;
  onClose: () => void;
  onSelectMode: (mode: 'AUTOMATIC' | 'MANUAL' | 'DEFER') => void;
}

export default function TdsTcsAlertModal({ partyId, partyName, amountExceeding, onClose, onSelectMode }: Props) {
  const [loading, setLoading] = useState(false);

  const handleSelect = async (mode: 'AUTOMATIC' | 'MANUAL' | 'DEFER') => {
    setLoading(true);
    try {
      await fetch(`/api/tds_tcs/mode/${partyId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ mode })
      });
      onSelectMode(mode);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
        <div className="px-6 py-4 border-b">
          <h2 className="text-xl font-bold text-red-600 flex items-center gap-2">
            ⚠️ TDS/TCS Threshold Breached
          </h2>
        </div>
        <div className="p-6">
          <p className="text-gray-700 mb-4">
            Cumulative transactions with <strong>{partyName}</strong> have crossed the ₹50,00,000 threshold for this Financial Year.
            The current transaction exceeds the limit by <strong>₹{amountExceeding.toFixed(2)}</strong>.
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Under Section 194Q / 206C(1H), TDS/TCS is now applicable. How would you like the system to handle this?
          </p>

          <div className="space-y-3">
            <button
              onClick={() => handleSelect('AUTOMATIC')}
              disabled={loading}
              className="w-full text-left p-4 border rounded hover:bg-blue-50 hover:border-blue-500 focus:outline-none transition-colors"
            >
              <div className="font-bold text-blue-800">Option A — AUTOMATIC MODE</div>
              <div className="text-sm text-gray-600 mt-1">
                Enable automatic TDS/TCS deduction on all future bills to this party for the remainder of this financial year.
              </div>
            </button>

            <button
              onClick={() => handleSelect('MANUAL')}
              disabled={loading}
              className="w-full text-left p-4 border rounded hover:bg-orange-50 hover:border-orange-500 focus:outline-none transition-colors"
            >
              <div className="font-bold text-orange-800">Option B — MANUAL MODE</div>
              <div className="text-sm text-gray-600 mt-1">
                I will handle TDS/TCS deduction manually. Show reminders but do NOT auto-deduct.
              </div>
            </button>

            <button
              onClick={() => handleSelect('DEFER')}
              disabled={loading}
              className="w-full text-left p-4 border rounded hover:bg-gray-100 focus:outline-none transition-colors"
            >
              <div className="font-bold text-gray-800">Option C — DEFER</div>
              <div className="text-sm text-gray-600 mt-1">
                Remind me later. I need to consult my CA/accountant.
              </div>
            </button>
          </div>
        </div>
        <div className="px-6 py-4 border-t bg-gray-50 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium">
            Cancel Document
          </button>
        </div>
      </div>
    </div>
  );
}
