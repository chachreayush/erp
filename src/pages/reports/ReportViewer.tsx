import React, { useState, useEffect } from "react";
import { api } from "../../lib/api";

const ReportViewer: React.FC = () => {
  const [subject, setSubject] = useState("Sales");
  const [useExclusions, setUseExclusions] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await api.post(`/reports_v2/execute/${subject}`, {
        use_exclusions: useExclusions,
      });
      setData(res.data.data);
    } catch (e) {
      console.error(e);
      alert("Failed to load report");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [subject, useExclusions]);

  const handleExport = () => {
    if (data.length === 0) {
      alert("No data to export");
      return;
    }
    const headers = Object.keys(data[0]).join(",");
    const rows = data.map((d) => Object.values(d).join(",")).join("\\n");
    const csv = `${headers}\\n${rows}`;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${subject}_Report.csv`;
    a.click();
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Financial & Management Reporting (DOC-30)</h1>
      <div className="flex space-x-4 mb-4">
        <div>
          <label className="block text-sm font-medium mb-1">Subject</label>
          <select
            className="border rounded p-2"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          >
            <option value="Sales">Sales Vouchers</option>
            <option value="Ledger">Ledger Balances</option>
            <option value="Inventory">Inventory Stock</option>
          </select>
        </div>
        <div className="flex items-center mt-6">
          <input
            type="checkbox"
            id="use_exclusions"
            className="mr-2"
            checked={useExclusions}
            onChange={(e) => setUseExclusions(e.target.checked)}
          />
          <label htmlFor="use_exclusions" className="text-sm font-medium">
            Apply Dashboard Exclusions (Hide disputed items)
          </label>
        </div>
        <div className="mt-6">
          <button
            onClick={fetchReport}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            Refresh
          </button>
          <button
            onClick={handleExport}
            className="ml-2 bg-green-600 text-white px-4 py-2 rounded"
          >
            Export to CSV
          </button>
        </div>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="overflow-x-auto bg-white shadow rounded-lg border">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {data.length > 0 &&
                  Object.keys(data[0]).map((key) => (
                    <th
                      key={key}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {key}
                    </th>
                  ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.map((row, i) => (
                <tr key={i}>
                  {Object.values(row).map((val: any, j) => (
                    <td key={j} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {val}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {data.length === 0 && <p className="p-4 text-gray-500">No data found.</p>}
        </div>
      )}
    </div>
  );
};

export default ReportViewer;
