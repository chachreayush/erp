with open("src/pages/finance/AssetCategories.tsx", "r", encoding="utf-8") as f:
    code = f.read()

# Make the save button Indigo to match the theme of Fixed Assets
code = code.replace('bg-blue-600 hover:bg-blue-700', 'bg-indigo-600 hover:bg-indigo-700')
code = code.replace('text-blue-400', 'text-indigo-400')

with open("src/pages/finance/AssetCategories.tsx", "w", encoding="utf-8") as f:
    f.write(code)
