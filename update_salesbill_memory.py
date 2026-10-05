import os

path = 'src/pages/sales/SalesBill.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

target = """        const filtered = data.filter((s: any) => s.invoice_type === targetType);
        setAvailableSeries(filtered);
        if (filtered.length > 0) {
          setSelectedSeriesId(filtered[0].id);
        }"""

replacement = """        const filtered = data.filter((s: any) => s.invoice_type === targetType);
        setAvailableSeries(filtered);
        if (filtered.length > 0) {
          // Restore last selected series if it exists in the filtered list
          const lastSeries = localStorage.getItem(`lastSeriesId_${targetType}`);
          if (lastSeries && filtered.some((s:any) => s.id === lastSeries)) {
            setSelectedSeriesId(lastSeries);
          } else {
            setSelectedSeriesId(filtered[0].id);
          }
        }"""

if "localStorage.getItem(`lastSeriesId_${targetType}`)" not in content:
    content = content.replace(target, replacement)

select_target = """            <select
              value={selectedSeriesId}
              onChange={e => setSelectedSeriesId(e.target.value)}"""

select_replacement = """            <select
              value={selectedSeriesId}
              onChange={e => {
                setSelectedSeriesId(e.target.value);
                let targetType = "sales_invoice";
                if (type.includes('challan')) targetType = "sales_challan";
                localStorage.setItem(`lastSeriesId_${targetType}`, e.target.value);
              }}"""

if "localStorage.setItem(`lastSeriesId_${targetType}`" not in content:
    content = content.replace(select_target, select_replacement)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated SalesBill.tsx with localStorage memory for Series")
