import os
import re

lib_api_path = 'src/lib/api.ts'
with open(lib_api_path, 'r', encoding='utf-8') as f:
    content = f.read()

if "series_id?: string;" not in content.split("export interface Invoice")[1].split("}")[0]:
    content = content.replace(
        "organization_id?: string;",
        "organization_id?: string;\n  series_id?: string;"
    )
    with open(lib_api_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Fixed Invoice in lib/api.ts")

