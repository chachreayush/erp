import os

files_to_fix = [
    'src/pages/brk/BrkIssueBill.tsx',
    'src/pages/brk/BrkReceiveBill.tsx',
    'src/pages/purchase/PurchaseBill.tsx',
    'src/pages/returns/PurchaseReturnBill.tsx',
    'src/pages/returns/SalesReturnBill.tsx',
    'src/pages/sales/SalesBill.tsx',
]

for file in files_to_fix:
    filepath = os.path.join(r'C:\Users\DELL\OneDrive\Desktop\erp2', file)
    if not os.path.exists(filepath):
        print(f"Skipping {file}")
        continue
        
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    start_str_sales = 'const getAvailableBatchesForProduct = (productName: string, currentGridRows: any[] = [], activeRowId: number = -1): SalesHistoryRecord[] => {'
    start_str_purch = 'const getAvailableBatchesForProduct = (productName: string, currentGridRows: any[] = [], activeRowId: number = -1): PurchaseHistoryRecord[] => {'
    
    start_str = start_str_sales if start_str_sales in content else start_str_purch
    
    if start_str not in content:
        print(f"Could not find start string in {file}")
        continue
        
    start_idx = content.find(start_str)
    
    end_str = 'const lookupRegisteredBatch ='
    end_idx = content.find(end_str, start_idx)
    
    if end_idx == -1:
        print(f"Could not find end string in {file}")
        continue
        
    original_block = content[start_idx:end_idx]
    
    new_block = start_str + """
  if (!productName || !productName.trim()) return [];
  const name = productName.trim().toLowerCase();
  
  // 1. Get base historical batches
  const pastHistory = getProductHistory(productName);
  
  // Deep clone to avoid mutating the original mock data
  const results = pastHistory.map(rec => ({ ...rec }));
  
  // 2. Subtract quantities drafted in the current bill (excluding the active row)
  if (Array.isArray(currentGridRows)) {
    currentGridRows.forEach(row => {
      if (row.id !== activeRowId && row.product?.trim().toLowerCase() === name && row.batch?.trim()) {
        const draftedQty = parseFloat(row.qty) || 0;
        const draftedFree = parseFloat(row.free) || 0;
        const totalDrafted = draftedQty + draftedFree;
        
        if (totalDrafted > 0) {
          const bCode = row.batch.trim().toLowerCase();
          const existingBatch = results.find(r => r.batch.toLowerCase() === bCode);
          if (existingBatch) {
            existingBatch.qty = Math.max(0, existingBatch.qty - totalDrafted);
          }
        }
      }
    });
  }

  return results;
};

"""
    
    new_content = content.replace(original_block, new_block)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)
        
    print(f"Fixed {file}")
