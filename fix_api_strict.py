import os

api_path = 'src/lib/api.ts'
with open(api_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if line.startswith("export interface Invoice {"):
        # We found the start of the interface.
        # insert it after the date field
        for j in range(i, i+15):
            if "date?: string" in lines[j]:
                if "series_id?: string" not in lines[j+1]:
                    lines.insert(j+1, "  series_id?: string;\n")
                break
        break

with open(api_path, 'w', encoding='utf-8') as f:
    f.writelines(lines)
print("api.ts strictly fixed")
