/* ============================================================
   api.ts — Central Axios HTTP Client
   ============================================================
   This file creates a single, pre-configured Axios instance
   that is used for ALL API calls throughout the entire frontend.

   WHY A CENTRAL CLIENT?
   Instead of writing `axios.get('http://localhost:8000/...',
   { headers: { Authorization: 'Bearer ...' } })` in every
   single component, we configure it ONCE here and every
   component just imports and uses `apiClient`.

   FEATURES:
   1. BASE URL: Automatically prepends the server URL so we
      only need to write "/auth/login" instead of the full URL.
   2. AUTH INTERCEPTOR: Automatically attaches the JWT token
      to every outgoing request — no manual header setting.
   3. ERROR INTERCEPTOR: Globally handles 401 (unauthorized)
      responses — automatically logs the user out if the token
      has expired.
   ============================================================ */

import axios from 'axios'

// ── GET THE SERVER URL ─────────────────────────────────────────
// The server URL depends on the connection mode (LAN vs Remote):
// - LAN Mode:    http://<server-lan-ip>:8000
// - Remote Mode: the Supabase or cloud URL (Sprint 3+)
// - Development: always http://localhost:8000
//
// For Sprint 2, we default to localhost:8000.
// In Sprint 3, this will dynamically read from the authStore's serverUrl.
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// ── CREATE AXIOS INSTANCE ─────────────────────────────────────
// axios.create() builds a new Axios client with preset configuration.
// This is our "smart" HTTP client that knows how to talk to our backend.
export const apiClient = axios.create({
  // baseURL: Prefix for all requests. "/auth/login" becomes "http://localhost:8000/auth/login"
  baseURL: API_BASE_URL,

  // timeout: If the server doesn't respond in 10 seconds, fail with an error.
  // Prevents the UI from hanging indefinitely on network issues.
  timeout: 10000, // 10 seconds

  // headers: Default headers sent with every request.
  // "Content-Type: application/json" tells the server we're sending JSON.
  headers: {
    'Content-Type': 'application/json',
  },
})


// ── REQUEST INTERCEPTOR ────────────────────────────────────────
// An interceptor is a function that runs BEFORE every request is sent.
// This one reads the saved JWT token from localStorage and adds it
// to the Authorization header automatically.
//
// Without this, we'd need to manually add the token to every API call:
//   apiClient.get('/auth/me', { headers: { Authorization: `Bearer ${token}` } })
// With this interceptor, we just write:
//   apiClient.get('/auth/me')
// The token is added automatically.
apiClient.interceptors.request.use(
  (config) => {
    // Read the saved auth state from localStorage.
    // The Zustand persist middleware saves state as a JSON string
    // under the key 'erp-auth' (defined in authStore.ts).
    const savedAuth = localStorage.getItem('erp-auth')

    if (savedAuth) {
      try {
        // Parse the JSON string back to an object
        const authState = JSON.parse(savedAuth)

        // Extract the token from the saved state
        const token = authState?.state?.token

        if (token) {
          // Add the Authorization header in the format the backend expects:
          // "Bearer eyJhbGciOiJIUzI1NiIs..."
          config.headers.Authorization = `Bearer ${token}`
        }
      } catch (e) {
        // JSON parse error — corrupted localStorage. Ignore and continue.
        console.warn('Could not read auth token from localStorage:', e)
      }
    }

    return config // Return the modified config to proceed with the request
  },
  (error) => {
    // If the request setup itself fails (very rare), reject with the error
    return Promise.reject(error)
  }
)


// ── RESPONSE INTERCEPTOR ──────────────────────────────────────
// An interceptor that runs AFTER every response is received.
// This one handles global error cases — specifically 401 Unauthorized.
//
// When the server returns 401, it means the JWT token has expired
// or been invalidated. We automatically log the user out and redirect
// to the login page so they don't get stuck in a broken state.
apiClient.interceptors.response.use(
  (response) => {
    // Success response (2xx) — return it unchanged
    return response
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid — clear local auth state and redirect to login

      // Clear the saved auth state from localStorage
      localStorage.removeItem('erp-auth')

      // Redirect to login page.
      // We use window.location instead of React Router here because
      // this interceptor runs outside the React component tree.
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }

    // For all other errors, reject the promise so the calling code
    // can handle it with try/catch or .catch()
    return Promise.reject(error)
  }
)


// ── TYPED API FUNCTIONS ───────────────────────────────────────
// These are typed wrapper functions for each backend endpoint.
// Using these instead of raw apiClient calls gives TypeScript
// type checking on request and response data.

import type { AuthUser } from '../store/authStore'

// Shape of the login request body (mirrors backend LoginRequest schema)
export interface LoginRequestPayload {
  company_code?: string   // Optional — only required for remote mode
  username: string
  password: string
  is_lan: boolean
}

// Shape of the login API response (mirrors backend LoginResponse schema)
export interface LoginApiResponse {
  access_token: string
  token_type:   string
  expires_in:   number
  user: {
    id:           string
    name:         string
    username:     string
    email:        string | null
    role:         string
    company_id:   string
    company_name: string
    company_code: string
    is_am_user:   boolean
    permissions:  AuthUser['permissions']
    avatar_url:   string | null
  }
}

/**
 * Calls POST /auth/login with the user's credentials.
 * Returns the JWT token and user profile on success.
 * Throws an AxiosError with the server's error message on failure.
 */
export async function apiLogin(payload: LoginRequestPayload): Promise<LoginApiResponse> {
  const response = await apiClient.post<LoginApiResponse>('/auth/login', payload)
  return response.data
}

/**
 * Calls POST /auth/logout to invalidate the current session on the server.
 * The frontend should also clear the local authStore after calling this.
 */
export async function apiLogout(): Promise<void> {
  await apiClient.post('/auth/logout')
}

/**
 * Calls GET /auth/me to fetch the current user's profile.
 * Used on app startup to restore the session if a saved token exists.
 */
export async function apiGetMe(): Promise<LoginApiResponse['user']> {
  const response = await apiClient.get<LoginApiResponse['user']>('/auth/me')
  return response.data
}

/**
 * Calls GET /health to check if the backend server is reachable.
 * Returns true if the server is running and database is connected.
 * Used in LAN discovery to confirm server presence.
 */
export async function apiHealthCheck(): Promise<boolean> {
  try {
    const response = await apiClient.get('/health', { timeout: 2000 }) // 2s timeout for discovery
    return response.data?.status === 'ok'
  } catch {
    return false // Server not reachable
  }
}

export default apiClient
