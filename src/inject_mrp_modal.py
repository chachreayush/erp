
import os
path = "C:/Users/DELL/OneDrive/Desktop/erp2/src/pages/inventory/Products.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Add import
if "SmartMRPModal" not in content:
    lines = content.split("\n")
    for i, line in enumerate(lines):
        if "from '../../components/ui/SaltMasterModal'" in line or "SaltMasterModal" in line:
            lines.insert(i + 1, "import { SmartMRPModal } from '../../components/ui/SmartMRPModal'")
            break
            
    # Add state
    for i, line in enumerate(lines):
        if "const [isSaltMasterOpen" in line:
            lines.insert(i + 1, "  const [isSmartMRPOpen, setIsSmartMRPOpen] = useState(false)")
            break
            
    content = "\n".join(lines)
    
    # Add button next to "Add Product"
    target_btn = "<Button variant=\"primary\" leftIcon={<Plus size={16} />} onClick={() => setIsAdding(true)}>"
    if target_btn in content:
        new_btns = """<Button variant="secondary" leftIcon={<TrendingUp size={16} />} onClick={() => setIsSmartMRPOpen(true)}>
            Smart MRP
          </Button>
          """ + target_btn
        content = content.replace(target_btn, new_btns)
        
    # Add Modal at the end
    if "<SmartMRPModal" not in content:
        modal_code = """
      <SmartMRPModal 
        isOpen={isSmartMRPOpen} 
        onClose={() => setIsSmartMRPOpen(false)} 
        onApplied={() => {
          fetchProducts() // Refresh the table
        }}
      />
    </div>
  )
}
"""
        content = content.replace("    </div>\n  )\n}", modal_code)

    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Injected SmartMRPModal into Products.tsx")
else:
    print("Already exists")

