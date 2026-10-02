import os

files = [
    'src/pages/inventory/InventoryDashboard.tsx',
    'src/pages/inventory/CustomerClaims.tsx',
    'src/pages/inventory/VendorClaims.tsx',
    'src/pages/inventory/Replenishment.tsx'
]

escape_hook = """
  const navigate = useNavigate();
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        navigate('/dashboard');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);
"""

for file_path in files:
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
        
    # Ensure useNavigate is imported
    if 'useNavigate' not in content:
        content = "import { useNavigate } from 'react-router-dom';\n" + content
        
    # Ensure useEffect is available
    if 'useEffect' not in content:
        content = content.replace("import React,", "import React, { useEffect,")
        if "useEffect" not in content:  # If it was just "import React from"
            content = content.replace("import React from", "import React, { useEffect } from")
            
    # Inject hook
    if "e.key === 'Escape'" not in content:
        func_def = "export default function " + file_path.split('/')[-1].replace('.tsx', '') + "() {"
        idx = content.find(func_def)
        if idx != -1:
            insert_pos = idx + len(func_def)
            content = content[:insert_pos] + "\n" + escape_hook + content[insert_pos:]
            
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f'Updated {file_path}')
