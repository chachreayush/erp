/* ============================================================
   main.tsx — React Application Entry Point
   ============================================================
   This is the very first file that runs when the app starts.
   It mounts the React application into the HTML page (index.html)
   and wraps it with global providers that the entire app needs:

   1. QueryClientProvider — Gives every component access to
      TanStack Query for server data fetching and caching.

   2. BrowserRouter — Enables client-side URL routing so we
      can navigate between modules (Finance, Inventory, etc.)
      without reloading the page.
   ============================================================ */

// React core — must be imported before any JSX is used
import React from 'react'

// ReactDOM — renders our React component tree into the real HTML DOM
import ReactDOM from 'react-dom/client'

// TanStack Query — manages all server data fetching, caching, sync
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// React Router — enables navigation between ERP modules
import { BrowserRouter } from 'react-router-dom'

// Root App component — the top of our component tree
import App from './App'

// Global styles — must be imported here so they apply to everything
import './index.css'

// ── CREATE THE QUERY CLIENT ───────────────────────────────────
// QueryClient is the central cache for all server data.
// Configuration:
//   - staleTime: How long data is considered fresh before refetching.
//     5 minutes (300000ms) is good for ERP data that doesn't change
//     every second (e.g., product lists, customer records).
//   - retry: If a request fails, try again 1 time before showing error.
//   - refetchOnWindowFocus: false — don't refetch just because the user
//     clicked on the window. ERP users work with stable data.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,                  // Retry failed requests once
      refetchOnWindowFocus: false // Don't refetch on window focus
    }
  }
})

// ── MOUNT THE APP ─────────────────────────────────────────────
// document.getElementById('root') finds the <div id="root"> in index.html
// ReactDOM.createRoot() creates a React root and attaches our app to it.
// This is the standard React 18+ mounting pattern.
ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  // StrictMode: Enables extra runtime warnings during development.
  // Has no effect in production builds. Helps catch bugs early.
  <React.StrictMode>
    {/* QueryClientProvider: Makes the query cache available to all components */}
    <QueryClientProvider client={queryClient}>
      {/* BrowserRouter: Enables URL-based routing throughout the app */}
      <BrowserRouter>
        {/* App: The root component that handles routing and layout */}
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
)
