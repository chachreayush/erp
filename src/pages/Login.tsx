/* ============================================================
   Login.tsx — ERP Login Page
   ============================================================
   This is the entry point for ALL users of the ERP system.
   It handles two different login scenarios automatically:

   SCENARIO A — LAN MODE (User is inside the office network):
   - App detects the server on the local network via UDP broadcast
   - Shows a 2-field form: Username + Password
   - Connects directly to the FastAPI server on LAN for authentication

   SCENARIO B — REMOTE MODE (User is outside the office):
   - App finds no server on LAN (timeout after 3 seconds)
   - Shows a 3-field form: Company ID + Username + Password
   - Connects to Supabase cloud for authentication
   
   DESIGN: Clean, centered, dark mode login card with the
   ERP brand. Premium feel with subtle animations.
   ============================================================ */

import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore, AuthUser, UserPermissions, ModulePermission } from '../store/authStore'
import { Wifi, Globe, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react'

// ── HELPER: Create a full permission object ───────────────────
// Creates a permission object granting ALL permissions.
// Used temporarily for development/demo login.
// In production, permissions come from the database.
const fullPermissions = (): UserPermissions => {
  const full: ModulePermission = { view: true, create: true, edit: true, delete: true, approve: true }
  return {
    finance: full, inventory: full, sales: full,
    crm: full, hr: full, reports: full, settings: full
  }
}

// ── LOGIN PAGE COMPONENT ──────────────────────────────────────
function LoginPage() {
  // ── STATE ─────────────────────────────────────────────────────
  // The three form fields
  const [companyId, setCompanyId] = useState('')    // Only used in remote mode
  const [username, setUsername]   = useState('')
  const [password, setPassword]   = useState('')

  // UI state
  const [showPassword, setShowPassword]     = useState(false)  // Toggle password visibility
  const [isDetecting, setIsDetecting]       = useState(true)   // true while scanning LAN
  const [isSubmitting, setIsSubmitting]     = useState(false)  // true while login API call runs

  // ── GLOBAL AUTH STORE ─────────────────────────────────────────
  const { appMode, error, setAppMode, login, setLoading, setError } = useAuthStore()

  // ── NAVIGATION ────────────────────────────────────────────────
  const navigate = useNavigate()

  // ── REFS for keyboard focus management ────────────────────────
  // After the page loads, auto-focus the first input field so
  // the user can immediately start typing (keyboard-first UX)
  const firstInputRef = useRef<HTMLInputElement>(null)

  // ── LAN SERVER DISCOVERY ──────────────────────────────────────
  // When the login page first loads, simulate LAN discovery.
  // In production, this will use Tauri's shell plugin to send
  // a UDP broadcast and listen for the server's response beacon.
  //
  // For now (Sprint 1), we use a 2-second timeout to simulate
  // the discovery process and default to 'remote' mode.
  // The actual UDP implementation will be added in Sprint 2.
  useEffect(() => {
    // If appMode is already set (e.g., user refreshed the page),
    // skip the detection step
    if (appMode) {
      setIsDetecting(false)
      return
    }

    setIsDetecting(true)

    // Simulate LAN scan (replace with real UDP broadcast in Sprint 2)
    const discoveryTimeout = setTimeout(() => {
      // TODO: Replace with real Tauri UDP broadcast discovery
      // For development: default to 'remote' mode
      setAppMode('remote')
      setIsDetecting(false)
    }, 2000) // 2 second scan timeout

    // Cleanup: cancel timeout if component unmounts before it fires
    return () => clearTimeout(discoveryTimeout)
  }, []) // Empty deps = run once on component mount

  // ── AUTO-FOCUS FIRST INPUT ────────────────────────────────────
  // Once detection is done, focus the first input so the user
  // can immediately start typing without clicking
  useEffect(() => {
    if (!isDetecting && firstInputRef.current) {
      firstInputRef.current.focus()
    }
  }, [isDetecting])

  // ── KEYBOARD SHORTCUT: Enter to submit ───────────────────────
  // Allow submitting the form by pressing Enter from any field
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit()
  }

  // ── FORM SUBMIT HANDLER ───────────────────────────────────────
  // Called when the user clicks "Login" or presses Enter.
  // Validates inputs, calls the appropriate auth endpoint,
  // and redirects to the dashboard on success.
  const handleSubmit = async () => {
    // ── VALIDATION ──────────────────────────────────────────────
    // Check that required fields are filled based on current mode
    if (appMode === 'remote' && !companyId.trim()) {
      setError('Please enter your Company ID')
      return
    }
    if (!username.trim()) {
      setError('Please enter your username')
      return
    }
    if (!password.trim()) {
      setError('Please enter your password')
      return
    }

    // Clear any previous error and show loading state
    setError(null)
    setIsSubmitting(true)
    setLoading(true)

    try {
      // ── TODO: REPLACE WITH REAL API CALL ─────────────────────
      // In production, this will call:
      //   - LAN mode:    POST http://{serverUrl}/auth/login
      //   - Remote mode: Supabase auth with company_id validation
      //
      // For Sprint 1 (development only), we accept a hardcoded
      // admin credential so we can test the UI and navigation.
      await new Promise(resolve => setTimeout(resolve, 800)) // Simulate network delay

      // Demo credentials check (REMOVE IN PRODUCTION)
      // Any username/password works for now to test navigation
      if (username && password) {
        // Simulate a successful login response from the server
        const mockUser: AuthUser = {
          id:          'user-001',
          name:        'Admin User',
          username:    username,
          email:       `${username}@erp.local`,
          role:        'am_admin',
          companyId:   appMode === 'remote' ? companyId : 'LOCAL-0001',
          companyName: appMode === 'remote' ? `Company (${companyId})` : 'Main Office (LAN)',
          isAmUser:    true,
          permissions: fullPermissions() // Grant all permissions for demo
        }

        // Store the user in the auth store — triggers redirect via ProtectedRoute
        login(mockUser, 'demo-token-' + Date.now())

        // Navigate to the dashboard
        navigate('/')
      } else {
        setError('Invalid username or password')
      }
    } catch (err) {
      // Handle unexpected errors (network failure, server down, etc.)
      setError('Connection failed. Please check your network and try again.')
    } finally {
      setIsSubmitting(false)
      setLoading(false)
    }
  }

  // ── RENDER ────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--color-bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      // Subtle grid background pattern for depth
      backgroundImage: `
        radial-gradient(circle at 25% 25%, rgba(79,70,229,0.08) 0%, transparent 50%),
        radial-gradient(circle at 75% 75%, rgba(124,58,237,0.06) 0%, transparent 50%)
      `
    }}>

      {/* ── LOGIN CARD ──────────────────────────────────────── */}
      <div style={{
        width: '100%',
        maxWidth: '400px',
        backgroundColor: 'var(--color-bg-surface)',
        borderRadius: 'var(--radius-xl)',
        border: '1px solid var(--color-border)',
        padding: '40px',
        boxShadow: 'var(--shadow-lg)'
      }}>

        {/* ── LOGO & TITLE ──────────────────────────────────── */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          {/* App logo */}
          <div style={{
            width: '52px', height: '52px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, var(--color-primary), #7c3aed)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
            fontSize: '22px', fontWeight: 800, color: 'white',
            boxShadow: '0 8px 24px rgba(79,70,229,0.35)'
          }}>
            E
          </div>

          <h1 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '6px' }}>
            ERP
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
            Sign in to your account
          </p>
        </div>

        {/* ── SERVER DETECTION STATUS ───────────────────────── */}
        {/* Shows a scanning animation while looking for the LAN server */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '8px 12px',
          borderRadius: 'var(--radius-md)',
          marginBottom: '24px',
          fontSize: '12px',
          backgroundColor: isDetecting
            ? 'rgba(245,158,11,0.1)'          // Amber while detecting
            : appMode === 'remote'
              ? 'rgba(59,130,246,0.1)'         // Blue for remote
              : 'rgba(34,197,94,0.1)',          // Green for LAN
          color: isDetecting
            ? 'var(--color-warning)'
            : appMode === 'remote'
              ? 'var(--color-info)'
              : 'var(--color-success)'
        }}>
          {isDetecting ? (
            // Spinning loader while scanning
            <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
            Searching for server on local network...</>
          ) : appMode === 'remote' ? (
            // Remote mode indicator
            <><Globe size={13} /> Remote login — connecting via cloud</>
          ) : (
            // LAN mode indicator
            <><Wifi size={13} /> Server found on local network</>
          )}
        </div>

        {/* ── LOGIN FORM ────────────────────────────────────── */}
        {/* Only render the form once detection is complete */}
        {!isDetecting && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* COMPANY ID FIELD — only shown in remote mode
                In LAN mode, the server is already identified by its network address.
                In remote mode, the Company ID tells the system which company's
                cloud database to connect to. */}
            {appMode === 'remote' && (
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600,
                  color: 'var(--color-text-secondary)', marginBottom: '6px', textTransform: 'uppercase',
                  letterSpacing: '0.5px' }}>
                  Company ID
                </label>
                <input
                  ref={firstInputRef}    // Auto-focused on load
                  type="text"
                  value={companyId}
                  onChange={e => setCompanyId(e.target.value.toUpperCase())} // Auto-uppercase
                  onKeyDown={handleKeyDown}
                  placeholder="e.g. MUM-6135"
                  autoComplete="organization"
                  style={inputStyle}
                />
                <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                  Provided by your company administrator
                </p>
              </div>
            )}

            {/* USERNAME FIELD */}
            <div>
              <label style={labelStyle}>Username</label>
              <input
                // Only auto-focus if in LAN mode (Company ID handles it in remote)
                ref={appMode !== 'remote' ? firstInputRef : undefined}
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter your username"
                autoComplete="username"
                style={inputStyle}
              />
            </div>

            {/* PASSWORD FIELD with show/hide toggle */}
            <div>
              <label style={labelStyle}>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'} // Toggle text/password type
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  style={{ ...inputStyle, paddingRight: '44px' }} // Extra right padding for the eye icon
                />
                {/* Show/hide password toggle button */}
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute', right: '12px', top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--color-text-muted)',
                    display: 'flex', alignItems: 'center', padding: '2px'
                  }}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1} // Don't focus this with Tab — it's a helper button
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* ── ERROR MESSAGE ────────────────────────────── */}
            {/* Shows in red below the form fields when login fails */}
            {error && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '10px 12px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.2)',
                color: 'var(--color-danger)',
                fontSize: '13px'
              }}>
                <AlertCircle size={14} style={{ flexShrink: 0 }} />
                {error}
              </div>
            )}

            {/* ── SUBMIT BUTTON ────────────────────────────── */}
            <button
              onClick={handleSubmit}
              disabled={isSubmitting} // Disable while request is in progress
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: 'var(--radius-md)',
                border: 'none',
                backgroundColor: isSubmitting
                  ? 'var(--color-border-strong)'   // Greyed out while loading
                  : 'var(--color-primary)',          // Primary brand color normally
                color: 'white',
                fontSize: '14px',
                fontWeight: 600,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                transition: 'background-color var(--transition-fast)',
                marginTop: '4px'
              }}
            >
              {/* Show spinner icon while submitting */}
              {isSubmitting && <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />}
              {isSubmitting ? 'Signing in...' : 'Sign In'}
            </button>

          </div>
        )}

        {/* ── FOOTER NOTE ───────────────────────────────────── */}
        <p style={{
          marginTop: '24px', textAlign: 'center',
          fontSize: '11px', color: 'var(--color-text-muted)'
        }}>
          Having trouble? Contact your system administrator.
        </p>
      </div>

      {/* CSS Keyframe animation for spinner — injected inline */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        input:hover {
          border-color: var(--color-border-strong) !important;
        }
        input:focus {
          border-color: var(--color-primary) !important;
          box-shadow: 0 0 0 3px rgba(79,70,229,0.15) !important;
        }
      `}</style>
    </div>
  )
}

// ── SHARED INPUT STYLE ─────────────────────────────────────────
// Defined once and reused across all input fields for consistency
const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--color-border-strong)',
  backgroundColor: 'var(--color-bg-elevated)',
  color: 'var(--color-text-primary)',
  fontSize: '14px',
  outline: 'none',
  transition: 'border-color var(--transition-fast), box-shadow var(--transition-fast)',
  fontFamily: 'var(--font-family)'
}

// ── SHARED LABEL STYLE ─────────────────────────────────────────
const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '12px',
  fontWeight: 600,
  color: 'var(--color-text-secondary)',
  marginBottom: '6px',
  textTransform: 'uppercase',
  letterSpacing: '0.5px'
}

export default LoginPage
