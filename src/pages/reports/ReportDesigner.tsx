import React, { useState, useEffect } from "react";
import { api } from "../../lib/api";

const ReportDesigner: React.FC = () => {
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("Sales");
  const [templates, setTemplates] = useState<any[]>([]);

  const fetchTemplates = async () => {
    try {
      const res = await api.get("/reports_v2/templates");
      setTemplates(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleSave = async () => {
    try {
      await api.post("/reports_v2/templates", {
        name,
        subject,
        config: { columns: ["id", "amount"], sort: "desc" },
        is_published: true,
      });
      alert("Report Template Published!");
      setName("");
      fetchTemplates();
    } catch (e) {
      console.error(e);
      alert("Failed to save template");
    }
  };

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-2xl font-bold mb-4">Advanced Report Designer</h1>
      <div className="bg-white shadow rounded-lg p-6 border mb-6">
        <h2 className="text-lg font-medium mb-4">Create New Report</h2>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1">Report Name</label>
            <input
              type="text"
              className="w-full border rounded p-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Actionable Outstanding Ledger"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Data Subject</label>
            <select
              className="w-full border rounded p-2"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            >
              <option value="Sales">Sales</option>
              <option value="Purchase">Purchase</option>
              <option value="Ledger">Ledgers</option>
              <option value="Inventory">Inventory</option>
            </select>
          </div>
        </div>
        
        <div className="mb-4">
          <p className="text-sm text-gray-500 mb-2">Drag and drop fields (Mock UI for Designer)</p>
          <div className="border border-dashed border-gray-300 p-8 text-center text-gray-400 bg-gray-50 rounded">
            Drop dimensions and measures here
          </div>
        </div>
        
        <button
          onClick={handleSave}
          className="bg-indigo-600 text-white px-4 py-2 rounded"
        >
          Publish Report
        </button>
      </div>

      <h2 className="text-lg font-medium mb-4">Published Reports</h2>
      <ul className="bg-white shadow rounded-lg border divide-y divide-gray-200">
        {templates.map((t) => (
          <li key={t.id} className="p-4 flex justify-between items-center">
            <div>
              <p className="font-medium text-gray-900">{t.name}</p>
              <p className="text-sm text-gray-500">Subject: {t.subject}</p>
            </div>
            <button className="text-blue-600 hover:underline">Run</button>
          </li>
        ))}
        {templates.length === 0 && <li className="p-4 text-gray-500">No templates published yet.</li>}
      </ul>
    </div>
  );
};

export default ReportDesigner;
