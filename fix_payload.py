with open("src/pages/finance/VoucherEntry.tsx", "r", encoding="utf-8") as f:
    code = f.read()

code = code.replace("series_id: selectedSeriesId,", "series_id: selectedSeriesId || undefined,")

with open("src/pages/finance/VoucherEntry.tsx", "w", encoding="utf-8") as f:
    f.write(code)
