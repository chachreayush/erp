
import os
path = "C:/Users/DELL/OneDrive/Desktop/erp2/src/lib/api.ts"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

mrp_fe_code = """
export interface MRPSuggestion {
  product_id: string;
  code: string;
  name: string;
  thirty_day_sales: number;
  avg_daily_sales: number;
  current_min_stock: number;
  suggested_min_stock: number;
  current_reorder_qty: number;
  suggested_reorder_qty: number;
}

export async function apiGetMRPSuggestions(): Promise<{suggestions: MRPSuggestion[]}> {
  const response = await apiClient.get<{suggestions: MRPSuggestion[]}>("/api/stock/mrp/suggestions")
  return response.data
}

export async function apiApplyMRPSuggestions(productIds: string[]): Promise<{message: string}> {
  const response = await apiClient.post<{message: string}>("/api/stock/mrp/apply", { product_ids: productIds })
  return response.data
}
"""

if "apiGetMRPSuggestions" not in content:
    with open(path, "a", encoding="utf-8") as f:
        f.write("\n\n" + mrp_fe_code)
    print("Added Smart MRP to frontend API")
else:
    print("Already exists")

