import os
import re

path = 'src/lib/api.ts'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add UOM and Batch tracking to Product interface
if 'base_uom?: string' not in content:
    content = content.replace(
        'unit: string',
        "unit: string\n  base_uom?: string\n  purchase_uom?: string\n  sales_uom?: string\n  pack_size?: number\n  track_batch?: boolean"
    )
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Added UOM fields to Product interface in api.ts")
