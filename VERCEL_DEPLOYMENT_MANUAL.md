# Enterprise ERP — Vercel Deployment & Production Operations Manual
*Comprehensive Cloud Hosting, Build Configuration, and CI/CD Guide*

This document provides complete instructions for deploying, configuring, and maintaining the Enterprise ERP web frontend on Vercel, integrating with the production FastAPI backend.

---

## 1. Architecture Overview for Cloud Deployment

```
+-----------------------------------------------------------------------------------+
|                                  CLIENT BROWSER                                   |
|                        https://erp-rho-three.vercel.app                         |
+-----------------------------------------------------------------------------------+
                                        |
                 +----------------------+----------------------+
                 | (Static Assets / HTML / JS)                 | (REST API Calls)
                 v                                             v
+-----------------------------------------------+ +---------------------------------+
|               VERCEL EDGE NETWORK             | |        FASTAPI BACKEND          |
|  - Global CDN Distribution                    | |  - Hosted on Render / Railway   |
|  - Vite SPA Rewrites (/.* -> /index.html)     | |  - CORS Enabled for Vercel      |
|  - HTTPS Automatic SSL Certificates           | |  - Port 8000 / Production Port  |
+-----------------------------------------------+ +---------------------------------+
                                                                       |
                                                                       v
                                                  +---------------------------------+
                                                  |     POSTGRESQL CLOUD (Neon)     |
                                                  |  - Multi-Tenant Isolation       |
                                                  +---------------------------------+
```

---

## 2. Vercel Project Configuration

### 2.1 Project Settings
* **Project Name**: `erp`
* **Framework Preset**: `Vite`
* **Root Directory**: `./` (Root of repository)
* **Build Command**: `npm run build`
* **Output Directory**: `dist`
* **Install Command**: `npm install`
* **Node.js Version**: `18.x` or `20.x`

### 2.2 SPA Rewrites Configuration (`vercel.json`)
Because the ERP is a React Single Page Application utilizing HTML5 client-side routing (`react-router-dom`), navigating directly to deep paths like `/sales`, `/purchase`, `/purchase/list`, `/sales-return`, `/purchase-return`, `/reports`, `/finance/expenses`, `/finance/assets`, `/finance/bank-reconciliation`, `/gst`, `/gst/compliance`, `/admin/tracking`, `/principal`, `/commission`, `/cargo`, `/freight/contracts`, `/freight/reconciliation`, `/inventory-dashboard`, or `/stock-shift` requires Vercel to route all non-static file requests to `index.html`.

The repository contains `vercel.json` configured as follows:

```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

> [!IMPORTANT]
> Without this rewrite rule, hard-refreshing (`F5`) on any subpage such as `/admin/tracking` or `/commission` would return an HTTP `404: NOT_FOUND` error from Vercel.

---

## 3. Environment Variables Configuration

Set these variables in your **Vercel Dashboard &rarr; Project Settings &rarr; Environment Variables**:

| Variable Name | Environment | Example Value | Description |
| :--- | :--- | :--- | :--- |
| `VITE_API_URL` | Production / Preview | `https://your-backend-api.onrender.com` | Base URL of your hosted FastAPI backend |
| `VITE_APP_MODE` | Production | `cloud` | Sets application mode to cloud database synchronization |
| `VITE_DEFAULT_THEME` | Production | `minimal` | Sets Neumorphic Minimalist as default system theme |

---

## 4. Backend CORS Configuration (FastAPI)

For the frontend on Vercel to communicate with the backend on Render/Cloud, CORS must allow the Vercel production domain.

In `backend/main.py`:

```python
origins = [
    "http://localhost:50005",
    "http://localhost:3000",
    "http://127.0.0.1:50005",
    "https://erp-rho-three.vercel.app",
    "https://*.vercel.app" # Allows Vercel preview branch deployments
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## 5. Deployment Step-by-Step

### 5.1 Automated Continuous Deployment (GitHub &rarr; Vercel)
1. Commit all verified changes to your Git repository on branch `main` (using PowerShell `;` chaining):
   ```powershell
   git add . ; git commit -m "Deploy latest ERP updates" ; git push origin main
   ```
2. Vercel automatically detects the push, runs `npm install`, executes `npm run build`, and deploys the generated bundle to production within 45 seconds.

### 5.2 Live Cloud Verification
Run the automated Selenium headless verification script to validate 100% production uptime:
```powershell
C:\Python313\python.exe verify_live_vercel_receipt_payment_audit.py
```

### 5.2 Manual Deployment via Vercel CLI
If deploying directly from your local terminal:
```powershell
# Install Vercel CLI globally
npm install -g vercel

# Authenticate & deploy to Preview
vercel

# Deploy directly to Production
vercel --prod
```

---

## 6. Pre-Flight Verification & Troubleshooting

### 6.1 Local Build Verification
Before deploying to Vercel, always verify that the TypeScript compiler and Vite production bundler pass cleanly:
```powershell
cd C:\Users\DELL\OneDrive\Desktop\erp2
npx tsc --noEmit
npm run build
```
If `npm run build` generates the `dist/` directory with zero errors, Vercel deployment will succeed.

### 6.2 Common Issues & Resolutions

| Issue | Root Cause | Solution |
| :--- | :--- | :--- |
| **Blank Page on Sub-route** | Missing `vercel.json` rewrite | Ensure `vercel.json` contains `rewrites: [{ source: "/(.*)", destination: "/index.html" }]` |
| **CORS Network Error on Login** | Backend rejects Vercel origin | Add your exact Vercel URL to `origins` in `backend/main.py` |
| **Failed to Fetch Master Data** | `VITE_API_URL` pointing to localhost | Update `VITE_API_URL` in Vercel environment variables to your live backend domain |
| **Build Timeout or Memory Error**| Unused large dependencies | Check `package.json` and remove unused packages; run `npm run build` locally to inspect bundle size |

---
*End of Vercel Deployment Manual.*
