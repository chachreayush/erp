with open("src/pages/finance/AssetCategories.tsx", "r", encoding="utf-8") as f:
    code = f.read()

code = code.replace('bg-slate-900 border border-slate-700 rounded p-2', 'bg-slate-900 border border-slate-700 rounded p-2 text-white')

with open("src/pages/finance/AssetCategories.tsx", "w", encoding="utf-8") as f:
    f.write(code)
