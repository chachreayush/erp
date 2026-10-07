with open("src/pages/finance/VoucherEntry.tsx", "r", encoding="utf-8") as f:
    code = f.read()

target1 = "  const { type } = useParams<{ type: string }>();"
replacement1 = "  const { type, id } = useParams<{ type: string, id: string }>();\n  const [isEditMode, setIsEditMode] = useState(false);"
code = code.replace(target1, replacement1)

# Now inject the useEffect for fetching the voucher
target2 = """    useEffect(() => {
      apiGetLedgers().then(setLedgers).catch(console.error);
      // fetchNextVoucherNo();
      setEntries([
        { id: Date.now(), ledgerId: '', isDr: type !== 'payment', amount: '' },
        { id: Date.now() + 1, ledgerId: '', isDr: type === 'payment', amount: '' }
      ]);
      setIsDirty(false);
    }, [type]);"""

replacement2 = """    useEffect(() => {
      apiGetLedgers().then(setLedgers).catch(console.error);
      if (id) {
        setIsEditMode(true);
        apiClient.get(`/api/finance/vouchers/${id}`).then(res => {
          const v = res.data;
          setVoucherNumber(v.voucher_number);
          setDate(v.date.split('T')[0]);
          setNarration(v.narration || '');
          setEntries(v.entries.map((e: any, idx: number) => ({
             id: Date.now() + idx,
             ledgerId: e.ledger_id,
             isDr: e.cr_dr === 'Dr',
             amount: e.amount.toString()
          })));
        }).catch(err => {
          alert("Error loading voucher: " + err.message);
        });
      } else {
        setIsEditMode(false);
        setEntries([
          { id: Date.now(), ledgerId: '', isDr: type !== 'payment', amount: '' },
          { id: Date.now() + 1, ledgerId: '', isDr: type === 'payment', amount: '' }
        ]);
      }
      setIsDirty(false);
    }, [type, id]);"""
code = code.replace(target2, replacement2)

target_btn = "<Save size={18} /> Save Voucher\n        </button>"
replacement_btn = "<Save size={18} /> {isEditMode ? 'Update Voucher' : 'Save Voucher'}\n        </button>"
code = code.replace(target_btn, replacement_btn)

with open("src/pages/finance/VoucherEntry.tsx", "w", encoding="utf-8") as f:
    f.write(code)
