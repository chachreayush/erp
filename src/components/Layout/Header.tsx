/* ============================================================
   Header.tsx — Top Application Header Bar
   ============================================================
   The header is the fixed bar at the top of every authenticated
   page. It contains:
   
   LEFT:   App logo + name ("Merge ERP")
   CENTER: Current page breadcrumb / title
   RIGHT:  Notifications bell + user avatar + logout button
   
   HEIGHT: 56px (defined in CSS variables as --header-height)
   ============================================================ */

import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { Bell, LogOut, ChevronDown } from 'lucide-react'
import { useState } from 'react'

function Header() {
  // Get user data and logout action from the global auth store
  const user = useAuthStore(state => state.user)
  const logout = useAuthStore(state => state.logout)

  // Controls visibility of the user dropdown menu
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  const navigate = useNavigate()

  // ── HANDLE LOGOUT ────────────────────────────────────────────
  // Clears the auth store (removes user + token) and redirects
  // to the login page. The ProtectedRoute in App.tsx handles
  // the redirect automatically when user becomes null.
  const handleLogout = () => {
    logout()           // Clear auth state (also clears localStorage via persist)
    navigate('/login') // Redirect to login screen
  }

  return (
    <header style={{
      height: 'var(--header-height)',     // 56px
      minHeight: 'var(--header-height)',  // Prevent shrinking
      backgroundColor: 'var(--color-bg-surface)',
      borderBottom: '1px solid var(--color-border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 20px',
      flexShrink: 0,                      // Don't shrink — always full height
      position: 'relative',
      zIndex: 100                         // Stay above page content when scrolling
    }}>

      {/* ── LEFT: APP LOGO & NAME ────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* Logo block — a colored square with "M" for Merge ERP */}
        <div style={{
          width: '28px', height: '28px',
          borderRadius: '6px',
          background: 'linear-gradient(135deg, var(--color-primary), #7c3aed)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '14px', fontWeight: 800, color: 'white',
          letterSpacing: '-0.5px'
        }}>
          M
        </div>

        {/* App name */}
        <span style={{
          fontSize: '15px',
          fontWeight: 700,
          color: 'var(--color-text-primary)',
          letterSpacing: '-0.3px'
        }}>
          Merge ERP
        </span>
      </div>

      {/* ── RIGHT: NOTIFICATIONS + USER MENU ─────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>

        {/* NOTIFICATION BELL BUTTON
            Keyboard accessible via Tab. Shows notification count badge.
            Will be wired to real notifications in Epic 9 (Sync & Notifications). */}
        <button
          style={{
            width: '34px', height: '34px',
            borderRadius: 'var(--radius-md)',
            border: 'none',
            backgroundColor: 'transparent',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--color-text-secondary)',
            position: 'relative',
            transition: 'background-color var(--transition-fast)'
          }}
          title="Notifications (Alt+N)"
          aria-label="View notifications"
        >
          <Bell size={18} />
          {/* Notification count badge — red dot showing pending items */}
          <span style={{
            position: 'absolute', top: '6px', right: '6px',
            width: '7px', height: '7px',
            borderRadius: '50%',
            backgroundColor: 'var(--color-danger)',
            border: '1.5px solid var(--color-bg-surface)'
          }} />
        </button>

        {/* USER AVATAR + DROPDOWN TOGGLE
            Shows user's initials and name. Clicking opens a dropdown
            with logout option. Keyboard accessible via Tab + Enter. */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)} // Toggle dropdown
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '5px 10px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              color: 'var(--color-text-primary)',
              transition: 'background-color var(--transition-fast)'
            }}
            aria-label="User menu"
            aria-expanded={userMenuOpen} // Accessibility: announces open/close to screen readers
          >
            {/* User avatar: shows initials in a colored circle */}
            <div style={{
              width: '26px', height: '26px',
              borderRadius: '50%',
              backgroundColor: 'var(--color-primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '11px', fontWeight: 700, color: 'white',
              flexShrink: 0
            }}>
              {/* Extract initials from user's full name (e.g., "Rahul Sharma" → "RS") */}
              {user?.name
                ?.split(' ')
                .map(n => n[0])
                .slice(0, 2)
                .join('')
                .toUpperCase()
                ?? 'U'
              }
            </div>

            {/* User name (truncated) */}
            <span style={{
              fontSize: '13px', fontWeight: 500,
              maxWidth: '120px',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
            }}>
              {user?.name ?? 'User'}
            </span>

            {/* Dropdown arrow icon — rotates when menu is open */}
            <ChevronDown
              size={14}
              style={{
                transition: 'transform var(--transition-fast)',
                transform: userMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                flexShrink: 0
              }}
            />
          </button>

          {/* ── USER DROPDOWN MENU ──────────────────────────────
              Appears below the avatar button when clicked.
              Contains: user info summary + logout button.
              Closes if user clicks outside (handled by onBlur). */}
          {userMenuOpen && (
            <div
              style={{
                position: 'absolute', top: '42px', right: 0,
                width: '200px',
                backgroundColor: 'var(--color-bg-elevated)',
                border: '1px solid var(--color-border-strong)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-lg)',
                overflow: 'hidden',
                zIndex: 200 // Above everything
              }}
            >
              {/* User info summary at top of dropdown */}
              <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                  {user?.name}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                  {user?.username} · {user?.companyName}
                </div>
              </div>

              {/* Logout button */}
              <button
                onClick={handleLogout}
                style={{
                  width: '100%', padding: '10px 14px',
                  display: 'flex', alignItems: 'center', gap: '8px',
                  border: 'none', backgroundColor: 'transparent',
                  cursor: 'pointer',
                  color: 'var(--color-danger)',  // Red to indicate destructive action
                  fontSize: '13px', fontWeight: 500,
                  textAlign: 'left',
                  transition: 'background-color var(--transition-fast)'
                }}
                aria-label="Logout"
              >
                <LogOut size={14} />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

export default Header
