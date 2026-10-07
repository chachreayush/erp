with open("src/pages/finance/VoucherEntry.tsx", "r", encoding="utf-8") as f:
    code = f.read()

target = """    const handleSave = async () => {
      if (!isValid) return;
      try {
        const res = await apiCreateVoucher({"""

replacement = """    const handleSave = async () => {
      if (!isValid) return;
      try {
        const payload = {
          voucher_type: type || 'Payment',
          voucher_number: voucherNumber,
          series_id: selectedSeriesId || undefined,
          date,
          narration,
          total_amount: totalDr,
          entries: entries.map(e => ({
            ledger_id: e.ledgerId,
            cr_dr: e.isDr ? 'Dr' as const : 'Cr' as const,
            amount: parseFloat(e.amount)
          }))
        };
        let res;
        if (isEditMode) {
            const resp = await apiClient.put(`/api/finance/vouchers/${id}`, payload);
            res = resp.data;
            alert('Voucher updated successfully');
        } else {
            res = await apiCreateVoucher(payload);
            alert('Voucher saved successfully');
        }"""

# Since I just replaced the payload creation, I need to remove the old payload creation.
old_payload = """        const res = await apiCreateVoucher({
          voucher_type: type || 'Payment',
          voucher_number: voucherNumber,
          series_id: selectedSeriesId || undefined,
          date,
          narration,
          total_amount: totalDr,
          entries: entries.map(e => ({
            ledger_id: e.ledgerId,
            cr_dr: e.isDr ? 'Dr' as const : 'Cr' as const,
            amount: parseFloat(e.amount)
          }))
        });
"""
code = code.replace(old_payload, "")
code = code.replace("    const handleSave = async () => {\n      if (!isValid) return;\n      try {", replacement)

# Remove the old alert success
code = code.replace("        alert('Voucher saved successfully');\n", "")

with open("src/pages/finance/VoucherEntry.tsx", "w", encoding="utf-8") as f:
    f.write(code)
