with open("src/pages/finance/ExpenseManagement.tsx", "r", encoding="utf-8") as f:
    code = f.read()

# 1. Update interface
target_interface = """interface ExpenseClaim {
  id: string;
  claim_number: string;
  date: string;
  total_amount: number;
  status: string;
  employee_ledger: { name: string };
  remarks?: string;
}"""
replacement_interface = """interface ExpenseClaim {
  id: string;
  claim_number: string;
  date: string;
  total_amount: number;
  status: string;
  employee_ledger_id: string;
  employee_ledger?: { name: string };
  remarks?: string;
  lines: any[];
}"""
code = code.replace(target_interface, replacement_interface)

# 2. Add ledgers and categories states, and update fetch
target_state = """  const [claims, setClaims] = useState<ExpenseClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  useReturnNavigation(isModalOpen);

  const fetchClaims = async () => {
    try {
      const res = await apiClient.get('/api/expenses/claims');
      setClaims(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };"""

replacement_state = """  const [claims, setClaims] = useState<ExpenseClaim[]>([]);
  const [ledgers, setLedgers] = useState<any>({});
  const [categories, setCategories] = useState<any>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  useReturnNavigation(isModalOpen);

  const fetchClaims = async () => {
    try {
      const [claimRes, ledgRes, catRes] = await Promise.all([
        apiClient.get('/api/expenses/claims'),
        apiClient.get('/api/master/ledgers'),
        apiClient.get('/api/expenses/categories')
      ]);
      
      const lMap: any = {};
      ledgRes.data.forEach((l: any) => lMap[l.id] = l.name);
      setLedgers(lMap);
      
      const cMap: any = {};
      catRes.data.forEach((c: any) => cMap[c.id] = c.name);
      setCategories(cMap);

      setClaims(claimRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };"""
code = code.replace(target_state, replacement_state)

# 3. Update the Unknown to use lookup map, and add Chevron for expanding
target_row = """                      <td className="px-6 py-4 text-slate-300">
                        {claim.employee_ledger?.name || 'Unknown'}
                      </td>"""
replacement_row = """                      <td className="px-6 py-4 text-slate-300 font-medium">
                        {ledgers[claim.employee_ledger_id] || claim.employee_ledger?.name || 'Unknown'}
                      </td>"""
code = code.replace(target_row, replacement_row)

target_tr = """<tr key={claim.id} className="hover:bg-slate-700/20 transition-colors group">"""
replacement_tr = """<React.Fragment key={claim.id}>
                    <tr onClick={() => setExpandedId(expandedId === claim.id ? null : claim.id)} className="hover:bg-slate-700/30 transition-colors group cursor-pointer">"""
code = code.replace(target_tr, replacement_tr)

target_actions = """                          <button 
                            onClick={() => handleApprove(claim.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 rounded text-sm transition-colors"
                          >
                            <Check className="w-4 h-4" />
                            Approve
                          </button>
                        )}
                      </td>
                    </tr>"""
replacement_actions = """                          <button 
                            onClick={(e) => { e.stopPropagation(); handleApprove(claim.id); }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 rounded text-sm transition-colors"
                          >
                            <Check className="w-4 h-4" />
                            Approve
                          </button>
                        )}
                      </td>
                    </tr>
                    {expandedId === claim.id && (
                      <tr className="bg-slate-900/50">
                        <td colSpan={6} className="px-6 py-4 border-t border-slate-700/50">
                          <div className="text-sm font-semibold text-slate-300 mb-2">Expense Details</div>
                          <table className="w-full text-left max-w-3xl">
                            <thead>
                              <tr className="text-xs text-slate-500 uppercase">
                                <th className="pb-2 w-1/3">Category</th>
                                <th className="pb-2">Note</th>
                                <th className="pb-2 text-right">Amount</th>
                              </tr>
                            </thead>
                            <tbody>
                              {claim.lines?.map((line: any, i: number) => (
                                <tr key={i} className="border-t border-slate-800">
                                  <td className="py-2 text-slate-300">{categories[line.category_id] || 'Unknown Category'}</td>
                                  <td className="py-2 text-slate-400">{line.note || '-'}</td>
                                  <td className="py-2 text-slate-300 text-right">? {line.amount}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>"""
code = code.replace(target_actions, replacement_actions)

with open("src/pages/finance/ExpenseManagement.tsx", "w", encoding="utf-8") as f:
    f.write(code)
