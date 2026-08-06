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
import { useAuthStore } from '../store/authStore'

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
    // Read the token directly from the global Zustand store.
    // This perfectly bypasses the need to guess if it's in localStorage
    // or sessionStorage, and it guarantees we have the exact token
    // that the app is currently using for this session.
    const token = useAuthStore.getState().token

    if (token) {
      // Add the Authorization header in the format the backend expects:
      // "Bearer eyJhbGciOiJIUzI1NiIs..."
      config.headers.Authorization = `Bearer ${token}`
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
  org_code?: string       // Optional — only required for remote mode
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
    id:              string
    name:            string
    username:        string
    email:           string | null
    role:            string
    organization_id: string
    org_name:        string
    org_code:        string
    is_am_user:      boolean
    permissions:     AuthUser['permissions']
    avatar_url:      string | null
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

// ── COMPANIES API ───────────────────────────────────────────────
export const api = {
  auth: {
    login: apiLogin,
    logout: apiLogout,
    getMe: apiGetMe,
  },
  companies: {
    getAll: () => apiClient.get('/api/companies/'),
    register: (data: any) => apiClient.post('/api/companies/register', data),
  },
  bulletins: {
    getAll: () => apiClient.get('/api/bulletins/'),
    create: (data: any) => apiClient.post('/api/bulletins/', data),
    update: (id: string, data: any) => apiClient.put(`/api/bulletins/${id}`, data),
    delete: (id: string) => apiClient.delete(`/api/bulletins/${id}`)
  }
}

// ── INVENTORY MODULE API ──────────────────────────────────────

export interface Product {
  id: string
  company_id: string
  created_at: string
  
  // ── Marg Profile Fields ──
  status: 'continue' | 'close'
  hide: 'yes' | 'no'
  code: string
  name: string
  packing: string
  unit: string
  colour_type: 'normal' | 'red' | 'blue' | 'green'
  item_type: 'normal' | 'cold storage' | 'costly'
  company_name: string
  salt: string
  hsn_applicable: 'yes' | 'no'
  hsn_code?: string
  local_tax: 'taxable' | 'tax paid' | 'exempted'
  central_tax: 'taxable' | 'tax paid' | 'exempted'
  sgst_percent: number
  cgst_percent: number
  igst_percent: number
  mrp: number
  p_rate: number
  pts_rate: number
  rate_a: number
  ptr_rate: number
  item_discount_percent: number
  discount_type: 'applicable' | 'no discount' | 'no sch discount' | 'no schem'
  category: 'na' | 'schedule h' | 'schedule h1' | 'narcotics'
}

export type ProductCreatePayload = Omit<Product, 'id' | 'company_id' | 'created_at'>

export async function apiGetProducts(): Promise<Product[]> {
  const response = await apiClient.get<Product[]>('/products/')
  return response.data
}

export async function apiCreateProduct(payload: ProductCreatePayload): Promise<Product> {
  const response = await apiClient.post<Product>('/products/', payload)
  return response.data
}

// ── SALES MODULE API ──────────────────────────────────────────

export interface InvoiceItem {
  id?: string
  invoice_id?: string
  product_id?: string
  product_name: string
  quantity: number
  rate: number
  igst_percent: number
  line_total: number
}

export interface Invoice {
  id?: string
  company_id?: string
  created_at?: string
  date?: string
  
  invoice_type?: string
  customer_name: string
  invoice_number: string
  
  subtotal: number
  tax_total: number
  grand_total: number
  
  items: InvoiceItem[]
}

export type InvoiceCreatePayload = Omit<Invoice, 'id' | 'company_id' | 'created_at' | 'date'>

export async function apiGetInvoices(invoiceType?: string): Promise<Invoice[]> {
  const url = invoiceType ? `/api/sales/invoices?invoice_type=${encodeURIComponent(invoiceType)}` : '/api/sales/invoices'
  const response = await apiClient.get<Invoice[]>(url)
  return response.data
}

export async function apiCreateInvoice(payload: InvoiceCreatePayload): Promise<Invoice> {
  const response = await apiClient.post<Invoice>('/api/sales/invoices', payload)
  return response.data
}

// ── MASTER DATA API ──────────────────────────────────────────

export interface Station {
  id?: string
  name: string
}

export interface Ledger {
  id?: string
  name: string
  group_name: string
  mobile?: string
  state?: string
  opening_balance: number
  op_type: string
  closing_balance: number
  cl_type: string
  
  station?: string
  plot_no?: string
  locality?: string
  road_street?: string
  city?: string
  district?: string
  pincode?: string
  email?: string
  website?: string
  contact_person?: string
  phone_number?: string
  freeze_upto?: number
  dl_no?: string
  restrict_item?: string
  ledger_type?: string
  gstin?: string
  tax_type?: string
  pan_no?: string
  ledger_date?: string
  colour?: string
}

// ── STATIONS ──────────────────────────────────────────────────
export async function apiGetStations(): Promise<Station[]> {
  const response = await apiClient.get<Station[]>('/api/master/stations')
  return response.data
}
export async function apiCreateStation(payload: Station): Promise<Station> {
  const response = await apiClient.post<Station>('/api/master/stations', payload)
  return response.data
}
export async function apiUpdateStation(id: string, payload: Station): Promise<Station> {
  const response = await apiClient.put<Station>(`/api/master/stations/${id}`, payload)
  return response.data
}
export async function apiDeleteStation(id: string): Promise<void> {
  await apiClient.delete(`/api/master/stations/${id}`)
}

// ── LEDGERS ──────────────────────────────────────────────────
export async function apiGetLedgers(): Promise<Ledger[]> {
  const response = await apiClient.get<Ledger[]>('/api/master/ledgers')
  return response.data
}
export async function apiCreateLedger(payload: Ledger): Promise<Ledger> {
  const response = await apiClient.post<Ledger>('/api/master/ledgers', payload)
  return response.data
}
export async function apiUpdateLedger(id: string, payload: Ledger): Promise<Ledger> {
  const response = await apiClient.put<Ledger>(`/api/master/ledgers/${id}`, payload)
  return response.data
}
export async function apiDeleteLedger(id: string): Promise<void> {
  await apiClient.delete(`/api/master/ledgers/${id}`)
}

export interface Salt {
  id?: string
  formula: string
  indications?: string
  dosage?: string
  side_effects?: string
  precautions?: string
  labels?: string
}

export async function apiGetSalts(): Promise<Salt[]> {
  const response = await apiClient.get<Salt[]>('/api/master/salts')
  return response.data
}
export async function apiCreateSalt(payload: Salt): Promise<Salt> {
  const response = await apiClient.post<Salt>('/api/master/salts', payload)
  return response.data
}
export async function apiUpdateSalt(id: string, payload: Salt): Promise<Salt> {
  const response = await apiClient.put<Salt>(`/api/master/salts/${id}`, payload)
  return response.data
}
export async function apiDeleteSalt(id: string): Promise<void> {
  await apiClient.delete(`/api/master/salts/${id}`)
}

export interface Manufacturer {
  id: string;
  name: string;
  short_code?: string;
  status: string;
  prohibited: boolean;
  default_discount: number;
  room_no?: string;
  floor?: string;
  rack_no?: string;
  rack_row_no?: string;
  dump_days?: number;
  is_supplier: boolean;
  supplier_ledger_id?: string;
  email?: string;
  cc?: string;
  bcc?: string;
  website?: string;
  contact_number?: string;
  field_staff_name?: string;
  field_staff_contact?: string;
  address?: string;
}

export interface ManufacturerCreate {
  name: string;
  short_code?: string;
  status: string;
  prohibited: boolean;
  default_discount: number;
  room_no?: string;
  floor?: string;
  rack_no?: string;
  rack_row_no?: string;
  dump_days?: number;
  is_supplier: boolean;
  supplier_ledger_id?: string;
  email?: string;
  cc?: string;
  bcc?: string;
  website?: string;
  contact_number?: string;
  field_staff_name?: string;
  field_staff_contact?: string;
  address?: string;
}

export async function apiGetManufacturers(): Promise<Manufacturer[]> {
  const response = await apiClient.get<Manufacturer[]>('/api/master/manufacturers')
  return response.data
}
export async function apiCreateManufacturer(payload: ManufacturerCreate): Promise<Manufacturer> {
  const response = await apiClient.post<Manufacturer>('/api/master/manufacturers', payload)
  return response.data
}
export async function apiUpdateManufacturer(id: string, payload: Manufacturer): Promise<Manufacturer> {
  const response = await apiClient.put<Manufacturer>(`/api/master/manufacturers/${id}`, payload)
  return response.data
}
export async function apiDeleteManufacturer(id: string): Promise<void> {
  await apiClient.delete(`/api/master/manufacturers/${id}`)
}

export interface HSNCode {
  id?: string
  code: string
  description?: string
  igst: number
  cgst: number
  sgst: number
  type: string
}

export async function apiGetHSNCodes(): Promise<HSNCode[]> {
  const response = await apiClient.get<HSNCode[]>('/api/master/hsn')
  return response.data
}
export async function apiCreateHSNCode(payload: HSNCode): Promise<HSNCode> {
  const response = await apiClient.post<HSNCode>('/api/master/hsn', payload)
  return response.data
}
export async function apiUpdateHSNCode(id: string, payload: HSNCode): Promise<HSNCode> {
  const response = await apiClient.put<HSNCode>(`/api/master/hsn/${id}`, payload)
  return response.data
}
export async function apiDeleteHSNCode(id: string): Promise<void> {
  await apiClient.delete(`/api/master/hsn/${id}`)
}

export interface StateCode {
  id?: string
  name: string
  gst_code?: string
  capital?: string
}

export async function apiGetStateCodes(): Promise<StateCode[]> {
  const response = await apiClient.get<StateCode[]>('/api/master/states')
  return response.data
}
export async function apiCreateStateCode(payload: StateCode): Promise<StateCode> {
  const response = await apiClient.post<StateCode>('/api/master/states', payload)
  return response.data
}
export async function apiUpdateStateCode(id: string, payload: StateCode): Promise<StateCode> {
  const response = await apiClient.put<StateCode>(`/api/master/states/${id}`, payload)
  return response.data
}
export async function apiDeleteStateCode(id: string): Promise<void> {
  await apiClient.delete(`/api/master/states/${id}`)
}

// ── ORGANIZATIONS API ────────────────────────────────────────

export interface Organization {
  id: string
  name: string
  org_code: string
  is_am: boolean
}

export interface ClientRegistrationRequest {
  org_name: string
  org_code: string
  admin_name: string
  admin_username: string
  admin_password: string
}

export async function apiGetOrganizations(): Promise<Organization[]> {
  const response = await apiClient.get<Organization[]>('/api/organizations/')
  return response.data
}

export async function apiRegisterOrganization(payload: ClientRegistrationRequest): Promise<Organization> {
  const response = await apiClient.post<Organization>('/api/organizations/register', payload)
  return response.data
}

export default apiClient
