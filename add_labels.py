with open("src/pages/finance/FixedAssets.tsx", "r", encoding="utf-8") as f:
    code = f.read()

target = """                  <div className="space-y-4">
                      <select className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white" value={categoryId} onChange={e=>setCategoryId(e.target.value)}>
                          <option value="">Select Category</option>
                          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                      <input className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white" value={name} onChange={e=>setName(e.target.value)} placeholder="Asset Name (e.g. Dell XPS 15)"/>
                      <input type="date" className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white" value={purchaseDate} onChange={e=>setPurchaseDate(e.target.value)}/>
                      <input type="number" className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white" value={purchaseValue} onChange={e=>setPurchaseValue(e.target.value)} placeholder="Purchase Value"/>
                      <input type="number" className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white" value={salvageValue} onChange={e=>setSalvageValue(e.target.value)} placeholder="Salvage Value (Default 0)"/>"""

replacement = """                  <div className="space-y-4">
                      <div>
                          <label className="block text-xs font-medium text-slate-400 mb-1">Asset Category</label>
                          <select className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white" value={categoryId} onChange={e=>setCategoryId(e.target.value)}>
                              <option value="">Select Category</option>
                              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                      </div>
                      <div>
                          <label className="block text-xs font-medium text-slate-400 mb-1">Asset Name</label>
                          <input className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white" value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Dell XPS 15"/>
                      </div>
                      <div>
                          <label className="block text-xs font-medium text-slate-400 mb-1">Purchase Date</label>
                          <input type="date" className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white" value={purchaseDate} onChange={e=>setPurchaseDate(e.target.value)}/>
                      </div>
                      <div>
                          <label className="block text-xs font-medium text-slate-400 mb-1">Original Purchase Value (?)</label>
                          <input type="number" className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white" value={purchaseValue} onChange={e=>setPurchaseValue(e.target.value)} placeholder="0.00"/>
                      </div>
                      <div>
                          <label className="block text-xs font-medium text-slate-400 mb-1">Salvage Value / Residual Value (?)</label>
                          <input type="number" className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white" value={salvageValue} onChange={e=>setSalvageValue(e.target.value)} placeholder="0.00"/>
                      </div>"""

code = code.replace(target, replacement)

with open("src/pages/finance/FixedAssets.tsx", "w", encoding="utf-8") as f:
    f.write(code)
