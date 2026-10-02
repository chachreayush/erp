import re

with open('src/lib/api.ts', 'r', encoding='utf-8') as f:
    content = f.read()

old_product = """export interface Product {
  id: string
  company_id: string
  created_at: string
  
  // 🏷️ Marg Profile Fields 🏷️
  status: 'continue' | 'close'
  hide: 'yes' | 'no'"""

new_product = """export interface Product {
  id: string
  company_id: string
  created_at: string
  
  // DOC-11 Fields
  base_uom?: string
  purchase_uom?: string
  sales_uom?: string
  pack_size?: string
  track_batch?: boolean
  tax_rule_id?: string
  
  // 🏷️ Marg Profile Fields 🏷️
  status: 'continue' | 'close'
  hide: 'yes' | 'no'"""

content = content.replace(old_product, new_product)

old_create = """export interface ProductCreatePayload {
  // Base
  status: string
  hide: string
  code: string"""

new_create = """export interface ProductCreatePayload {
  // DOC-11 Fields
  base_uom?: string
  purchase_uom?: string
  sales_uom?: string
  pack_size?: string
  track_batch?: boolean
  tax_rule_id?: string

  // Base
  status: string
  hide: string
  code: string"""

content = content.replace(old_create, new_create)

with open('src/lib/api.ts', 'w', encoding='utf-8') as f:
    f.write(content)
