import urllib.request
import json
try:
    req = urllib.request.Request('http://localhost:8000/api/sales/invoices?invoice_type=brk-receive-bill')
    # we need token? The endpoint requires Depend(get_current_user).
    # Ah, get_current_user requires a token.
    # So I can't fetch it without auth.
except Exception as e:
    print(e)
