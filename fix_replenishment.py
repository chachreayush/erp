import os

file_path = 'src/pages/inventory/Replenishment.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add imports for API client
if 'import apiClient' not in content:
    content = content.replace("import React, { useEffect, useState } from 'react';", "import React, { useEffect, useState } from 'react';\nimport apiClient from '../../lib/api';")

# Add state and function
if 'const [proposals, setProposals]' not in content:
    state_and_func = """
  const [proposals, setProposals] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const generateProposals = async () => {
    try {
      setIsGenerating(true);
      const res = await apiClient.post('/replenishment/proposals/generate');
      if (res.data && res.data.proposals) {
        setProposals(res.data.proposals);
      }
    } catch (error) {
      console.error('Failed to generate proposals', error);
      alert('Failed to generate proposals. Please check server connection.');
    } finally {
      setIsGenerating(false);
    }
  };
"""
    content = content.replace("const [activeTab, setActiveTab] = useState('proposals');", "const [activeTab, setActiveTab] = useState('proposals');" + state_and_func)

# Attach onClick
if 'onClick={generateProposals}' not in content:
    content = content.replace("<button style={{ backgroundColor: '#3b82f6'", "<button onClick={generateProposals} disabled={isGenerating} style={{ backgroundColor: isGenerating ? '#94a3b8' : '#3b82f6'")
    content = content.replace("<Calculator size={16} /> Generate Proposals", "<Calculator size={16} /> {isGenerating ? 'Generating...' : 'Generate Proposals'}")

# Map over proposals
table_empty_state = """<tr>
                  <td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                    <List size={32} style={{ opacity: 0.5, marginBottom: '12px', display: 'block', margin: '0 auto' }} />
                    No proposals generated yet. Click "Generate Proposals" to run the engine.
                  </td>
                </tr>"""

new_table_body = """{proposals.length > 0 ? (
                  proposals.map((p, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #334155' }}>
                      <td style={{ padding: '12px 16px', color: '#f8fafc' }}>{p.product}</td>
                      <td style={{ padding: '12px 16px', color: '#94a3b8' }}>
                        <span style={{ backgroundColor: '#1e293b', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontFamily: 'monospace' }}>{p.explanation}</span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', color: '#f8fafc' }}>100</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', color: '#34d399', fontWeight: 'bold' }}>{p.suggested_qty}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <button style={{ backgroundColor: 'transparent', color: '#38bdf8', border: '1px solid #334155', borderRadius: '4px', padding: '4px 8px', fontSize: '12px', cursor: 'pointer' }}>
                          Approve
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                      <List size={32} style={{ opacity: 0.5, marginBottom: '12px', display: 'block', margin: '0 auto' }} />
                      No proposals generated yet. Click "Generate Proposals" to run the engine.
                    </td>
                  </tr>
                )}"""

if 'proposals.map' not in content:
    content = content.replace(table_empty_state, new_table_body)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Updated Replenishment.tsx')
