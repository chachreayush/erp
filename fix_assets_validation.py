with open("src/pages/finance/FixedAssets.tsx", "r", encoding="utf-8") as f:
    code = f.read()

target = """  const handleRegister = async () => {
    try {
        await apiClient.post('/api/assets', {"""

replacement = """  const handleRegister = async () => {
    if (!categoryId) {
        alert("Please select a Category first.");
        return;
    }
    if (!name || !purchaseValue) {
        alert("Please enter Asset Name and Purchase Value.");
        return;
    }
    try {
        await apiClient.post('/api/assets', {"""
code = code.replace(target, replacement)

# Add text-white to inputs to ensure they don't appear black-on-dark if system colors bleed in
code = code.replace('bg-slate-900 border border-slate-700 rounded p-2', 'bg-slate-900 border border-slate-700 rounded p-2 text-white')

with open("src/pages/finance/FixedAssets.tsx", "w", encoding="utf-8") as f:
    f.write(code)
