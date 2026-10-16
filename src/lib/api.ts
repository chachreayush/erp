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

// Navigation function - will be initialized by a React component
let navigateFn: ((path: string) => void) | null = null;

export const setNavigateFn = (fn: (path: string) => void) => {
  navigateFn = fn;
};

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
  timeout: 30000, // 30 seconds for complete GL posting and cloud DB latency

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
    // Read the token and serverUrl directly from the global Zustand store.
    const authState = useAuthStore.getState();
    const token = authState.token;
    const effectiveBase = authState.serverUrl || API_BASE_URL || 'http://localhost:8000';
    config.baseURL = effectiveBase;

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
      const authState = useAuthStore.getState();
      if (authState.token === 'demo-preview-jwt-token') {
        // In demo preview mode, allow components to catch 401 and display fallback data without forcing logout
        return Promise.reject(error);
      }

      // Token expired or invalid — clear local auth state and redirect to login
      localStorage.removeItem('erp-auth')
      sessionStorage.removeItem('erp-auth')

      // Redirect to login page using React Router if available,
      // otherwise fall back to window.location
      if (navigateFn) {
        navigateFn('/login');
      } else if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login';
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
  base_uom?: string
  purchase_uom?: string
  sales_uom?: string
  pack_size?: number | string
  track_batch?: boolean
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
  min_stock_level: number
  reorder_quantity: number
  is_active?: boolean
}

export type ProductCreatePayload = Omit<Product, 'id' | 'company_id' | 'created_at'>

export async function apiGetProducts(): Promise<Product[]> {
  const response = await apiClient.get<Product[]>('/api/products/')
  return response.data
}

export async function apiCreateProduct(payload: ProductCreatePayload): Promise<Product> {
  const response = await apiClient.post<Product>('/api/products/', payload)
  return response.data
}

export async function apiUpdateProduct(id: string, payload: ProductCreatePayload): Promise<Product> {
  const response = await apiClient.put<Product>(`/api/products/${id}`, payload)
  return response.data
}

export async function apiDeleteProduct(id: string): Promise<void> {
  await apiClient.delete(`/api/products/${id}`)
}

export interface Batch {
  id: string
  product_id: string
  batch_number: string
  expiry: string | null
  mrp: number
  rate: number
  rate_a: number
  rate_b: number
  rate_c: number
  cost: number
  current_stock: number
  brk_exp_stock?: number
  is_near_expiry?: boolean
  is_expired?: boolean
  is_active?: boolean
}

export async function apiGetBatches(productId?: string): Promise<Batch[]> {
  const params = productId ? { product_id: productId } : {}
  const response = await apiClient.get<Batch[]>('/api/batches/', { params })
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
  
  // Advanced ERP Fields
  batch?: string
  expiry?: string
  mrp?: number
  discount_percent?: number
  margin_percent?: string
  free_quantity?: number
  disposition?: string
  source_invoice_item_id?: string
}

export interface Invoice {
  id?: string
  company_id?: string
  created_at?: string
  date?: string
  
  invoice_type?: string
  customer_name: string
  party_id?: string
  invoice_number: string
  
  // Advanced ERP Fields
  party_inv_no?: string
  party_inv_date?: string
  due_date?: string
  remarks?: string
  dispatch_through?: string
  destination?: string
  bill_discount?: number
  
  ledger1_name?: string
  ledger1_amt?: number
  ledger2_name?: string
  ledger2_amt?: number
  ledger3_name?: string
  ledger3_amt?: number
  
  subtotal: number
  tax_total: number
  grand_total: number
  
  series_id?: string
  items: InvoiceItem[]
}

export type InvoiceCreatePayload = Omit<Invoice, 'id' | 'company_id' | 'created_at' | 'date'>

export interface InvoiceFilters {
  partySearch?: string;
  billNoSearch?: string;
  fromDate?: string;
  toDate?: string;
}

export async function apiGetInvoices(invoiceType?: string, filters?: InvoiceFilters): Promise<Invoice[]> {
  const params = new URLSearchParams();
  if (invoiceType) params.append('invoice_type', invoiceType);
  if (filters?.partySearch) params.append('party_search', filters.partySearch);
  if (filters?.billNoSearch) params.append('bill_no_search', filters.billNoSearch);
  if (filters?.fromDate) params.append('from_date', filters.fromDate);
  if (filters?.toDate) params.append('to_date', filters.toDate);
  
  const url = `/api/sales/invoices?${params.toString()}`;
  const response = await apiClient.get<Invoice[]>(url);
  return response.data;
}

export async function apiGetInvoice(invoiceNumber: string, invoiceType?: string): Promise<Invoice> {
  const url = invoiceType 
    ? `/api/sales/invoices/${encodeURIComponent(invoiceNumber)}?invoice_type=${encodeURIComponent(invoiceType)}` 
    : `/api/sales/invoices/${encodeURIComponent(invoiceNumber)}`
  const response = await apiClient.get<Invoice>(url)
  return response.data
}

export async function apiCreateInvoice(payload: InvoiceCreatePayload): Promise<Invoice> {
  const response = await apiClient.post<Invoice>('/api/sales/invoices', payload)
  return response.data
}

export async function apiCancelInvoice(invoiceId: string): Promise<{message: string, reversal_id: string, reversal_number: string}> {
  const response = await apiClient.post(`/api/sales/invoices/${encodeURIComponent(invoiceId)}/cancel`)
  return response.data
}


// ── MASTER DATA API ──────────────────────────────────────────

export interface Station {
  id?: string
  name: string
  is_active?: boolean
}

export interface Ledger {
  id?: string
  name: string
  group_name: string
  group_id?: string
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
  is_active?: boolean
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

// ── PARTIES (BUSINESS PARTNERS) ──────────────────────────────
export interface PartyAddress {
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

export interface PartyContact {
  contact_name?: string;
  phone?: string;
  email?: string;
}

export interface CustomerProfile {
  party_id?: string;
  ledger_id?: string;
  credit_limit?: number;
  credit_days?: number;
  price_list?: string;
  route_id?: string;
}

export interface Party {
  id: string;
  legal_name: string;
  trade_name?: string;
  gstin?: string;
  gst?: string;
  pan?: string;
  party_type?: string;
  is_active?: boolean;
  addresses?: PartyAddress[];
  contacts?: PartyContact[];
  customer_profile?: CustomerProfile;
  supplier_profile?: any;
}

export async function apiGetParties(type?: string): Promise<Party[]> {
  const response = await apiClient.get<Party[]>('/api/master/parties', {
    params: type ? { type } : {}
  });
  return response.data;
}

// ── PROCUREMENT & PO APIS ────────────────────────────────────
export interface PurchaseOrderItem {
  id?: string;
  po_id?: string;
  product_id?: string;
  product_name: string;
  quantity: number;
  received_qty?: number;
  rate: number;
  line_total: number;
}

export interface PurchaseOrder {
  id: string;
  po_number: string;
  date: string;
  vendor_id: string;
  status: string;
  expected_delivery?: string;
  supply_classification?: string;
  total_amount: number;
  items?: PurchaseOrderItem[];
}

export async function apiGetPurchaseOrders(params?: { vendor_id?: string; status?: string }): Promise<PurchaseOrder[]> {
  const response = await apiClient.get<PurchaseOrder[]>('/api/procurement/orders', { params });
  return response.data;
}

export async function apiGetPurchaseOrderById(poId: string): Promise<PurchaseOrder> {
  const response = await apiClient.get<PurchaseOrder>(`/api/procurement/orders/${poId}`);
  return response.data;
}

export interface SalesOrderItem {
  id?: string;
  order_id?: string;
  product_id?: string;
  product_name: string;
  quantity: number;
  rate: number;
  igst_percent?: number;
  line_total: number;
}

export interface SalesOrder {
  id: string;
  order_number: string;
  date: string;
  party_id: string;
  status: string;
  total_amount: number;
  items?: SalesOrderItem[];
}

export async function apiGetSalesOrders(params?: { party_id?: string; status?: string }): Promise<SalesOrder[]> {
  const response = await apiClient.get<SalesOrder[]>('/api/orders/', { params });
  return response.data;
}

export interface VendorComplaintCreatePayload {
  complaint_number: string;
  vendor_id: string;
  category: string;
  status?: string;
  severity?: string;
  description?: string;
  related_document_id?: string;
}

export async function apiCreateVendorComplaint(payload: VendorComplaintCreatePayload): Promise<any> {
  const response = await apiClient.post('/api/procurement/complaints', payload);
  return response.data;
}

export interface Salt {
  id?: string
  formula: string
  indications?: string
  dosage?: string
  side_effects?: string
  precautions?: string
  labels?: string
  is_active?: boolean
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
  sales_ledger_id?: string;
  supplier_ledger_name?: string;
  sales_ledger_name?: string;
  division?: string;
  gstin?: string;
  state_code?: string;
  products_count?: number;
  email?: string;
  cc?: string;
  bcc?: string;
  website?: string;
  contact_number?: string;
  field_staff_name?: string;
  field_staff_contact?: string;
  address?: string;
  is_active?: boolean;
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
  sales_ledger_id?: string;
  division?: string;
  gstin?: string;
  state_code?: string;
  email?: string;
  cc?: string;
  bcc?: string;
  website?: string;
  contact_number?: string;
  field_staff_name?: string;
  field_staff_contact?: string;
  address?: string;
}

export async function apiGetManufacturers(params?: { search?: string; limit?: number; skip?: number }): Promise<Manufacturer[]> {
  const response = await apiClient.get<Manufacturer[]>('/api/master/manufacturers', { params })
  return response.data
}
export async function apiCreateManufacturer(payload: ManufacturerCreate): Promise<Manufacturer> {
  const response = await apiClient.post<Manufacturer>('/api/master/manufacturers', payload)
  return response.data
}
export async function apiUpdateManufacturer(id: string, payload: Partial<Manufacturer>): Promise<Manufacturer> {
  const response = await apiClient.put<Manufacturer>(`/api/master/manufacturers/${id}`, payload)
  return response.data
}
export async function apiDeleteManufacturer(id: string): Promise<void> {
  await apiClient.delete(`/api/master/manufacturers/${id}`)
}

// ── PRODUCT COMPANY ANALYTICS & MULTI-CLIENT MAPPING ──────────

export interface CompanyMasterSummary {
  total_companies: number;
  active_companies: number;
  total_products: number;
  mapped_clients_count: number;
}

export interface ProductTurnoverItem {
  product_id: string;
  product_name: string;
  code: string;
  quantity_sold: number;
  turnover_amount: number;
}

export interface CustomerTurnoverItem {
  party_id?: string;
  customer_name: string;
  invoices_count: number;
  total_purchased: number;
}

export interface CompanyTurnoverBreakdown {
  company_id: string;
  company_name: string;
  short_code?: string;
  gross_turnover: number;
  net_turnover: number;
  total_quantity_sold: number;
  invoices_count: number;
  unique_products_sold: number;
  top_products: ProductTurnoverItem[];
  top_customers: CustomerTurnoverItem[];
}

export interface CompanyTurnoverResponse {
  period_from?: string;
  period_to?: string;
  total_gross_turnover: number;
  total_quantity_sold: number;
  total_invoices_count: number;
  companies_count: number;
  companies: CompanyTurnoverBreakdown[];
}

export interface OrgCompanyMappingItem {
  id: string;
  organization_id: string;
  manufacturer_id: string;
  manufacturer_name: string;
  short_code?: string;
  is_primary: boolean;
  commission_rate_override?: number;
  notes?: string;
  created_at: string;
}

export async function apiGetCompanyMasterSummary(): Promise<CompanyMasterSummary> {
  const res = await apiClient.get<CompanyMasterSummary>('/api/companies/summary');
  return res.data;
}

export async function apiGetCompanyTurnover(params?: {
  company_id?: string;
  period_from?: string;
  period_to?: string;
}): Promise<CompanyTurnoverResponse> {
  const res = await apiClient.get<CompanyTurnoverResponse>('/api/companies/turnover', { params });
  return res.data;
}

export async function apiGetOrgCompanyMappings(orgId: string): Promise<OrgCompanyMappingItem[]> {
  const res = await apiClient.get<OrgCompanyMappingItem[]>(`/api/companies/organizations/${orgId}/mappings`);
  return res.data;
}

export interface OrgCompanyMappingInput {
  manufacturer_id: string;
  is_primary?: boolean;
  commission_rate_override?: number;
  notes?: string;
}

export async function apiSetOrgCompanyMappings(
  orgId: string,
  payload: {
    manufacturer_ids?: string[];
    items?: OrgCompanyMappingInput[];
    commission_rate_override?: number;
    notes?: string;
  }
): Promise<{ success: boolean; message: string; mapped_count: number }> {
  const res = await apiClient.post(`/api/companies/organizations/${orgId}/mappings`, payload);
  return res.data;
}

export interface HSNCode {
  id?: string
  code: string
  description?: string
  igst: number
  cgst: number
  sgst: number
  type: string
  is_active?: boolean
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
  is_active?: boolean
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
  is_active?: boolean
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

// ── CRM PERMISSIONS API ──────────────────────────────────────

export interface OrganizationPermissionsResponse {
  org_id: string
  org_name: string
  role_permissions: Record<string, string[]> | null
}

export interface OrganizationPermissionsUpdate {
  role_permissions: Record<string, string[]>
}

export async function apiGetOrganizationPermissions(orgId: string): Promise<OrganizationPermissionsResponse> {
  const response = await apiClient.get<OrganizationPermissionsResponse>(`/api/organizations/${orgId}/permissions`)
  return response.data
}

export async function apiUpdateOrganizationPermissions(orgId: string, payload: OrganizationPermissionsUpdate): Promise<OrganizationPermissionsResponse> {
  const response = await apiClient.put<OrganizationPermissionsResponse>(`/api/organizations/${orgId}/permissions`, payload)
  return response.data
}

export default apiClient

export interface RegisterEntry {
  date: string
  invoice_number: string
  party_name: string
  invoice_type: string
  inward: number
  outward: number
  running_balance: number
}

export interface RegisterResponse {
  product_name: string
  total_inward: number
  total_outward: number
  total_value: number
  entries: RegisterEntry[]
}

export const apiGetProductRegister = async (productId: string, stockType: "main" | "brk-exp" = "main"): Promise<RegisterResponse> => {
  const res = await apiClient.get<RegisterResponse>(`/api/stock/${productId}/register?stock_type=${stockType}`)
  return res.data
}




export interface LowStockAlert {
  product_id: string;
  code: string;
  name: string;
  current_stock: number;
  min_stock_level: number;
  reorder_quantity: number;
  suggested_order: number;
}

export async function apiGetLowStockAlerts(): Promise<{alerts: LowStockAlert[]}> {
  const response = await apiClient.get<{alerts: LowStockAlert[]}>("/api/stock/alerts/low-stock")
  return response.data
}



export interface MRPSuggestion {
  product_id: string;
  code: string;
  name: string;
  thirty_day_sales: number;
  avg_daily_sales: number;
  current_min_stock: number;
  suggested_min_stock: number;
  current_reorder_qty: number;
  suggested_reorder_qty: number;
}

export async function apiGetMRPSuggestions(): Promise<{suggestions: MRPSuggestion[]}> {
  const response = await apiClient.get<{suggestions: MRPSuggestion[]}>("/api/stock/mrp/suggestions")
  return response.data
}

export async function apiApplyMRPSuggestions(productIds: string[]): Promise<{message: string}> {
  const response = await apiClient.post<{message: string}>("/api/stock/mrp/apply", { product_ids: productIds })
  return response.data
}

// ==========================================
// FINANCE & ACCOUNTING APIS (V2 — Complete Rebuild)
// ==========================================

export interface LedgerGroup {
  id: string;
  name: string;
  parent_id?: string | null;
  is_active: boolean;
  class_type?: string;
  is_system?: boolean;
}

export interface VoucherEntry {
  id?: string;
  ledger_id: string;
  cr_dr: 'Cr' | 'Dr';
  amount: number;
  ledger_name?: string;
}

export interface Voucher {
  id?: string;
  voucher_type: string;
  voucher_number?: string;
  date: string;
  narration?: string;
  total_amount: number;
  status?: string;
  fiscal_year_id?: string;
  ref_invoice_id?: string;
  cancelled_at?: string;
  reversal_voucher_id?: string;
  series_id?: string;
  entries: VoucherEntry[];
}

export interface FiscalYear {
  id: string;
  organization_id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  is_locked: boolean;
  created_at: string;
}

export interface NextVoucherNumber {
  voucher_type: string;
  next_number: string;
  prefix: string;
}

export interface DayBookResponse {
  from_date: string;
  to_date: string;
  vouchers: any[];
  total_dr: string;
  total_cr: string;
}

export interface LedgerStatementResponse {
  ledger_id: string;
  ledger_name: string;
  from_date: string;
  to_date: string;
  opening_balance: string;
  opening_type: string;
  entries: any[];
  closing_balance: string;
  closing_type: string;
  total_dr: string;
  total_cr: string;
}

export interface TrialBalanceResponse {
  as_of_date: string;
  fiscal_year_name?: string;
  rows: any[];
  grand_dr_total: string;
  grand_cr_total: string;
}

export interface PLResponse {
  from_date: string;
  to_date: string;
  income_items: any[];
  expense_items: any[];
  total_income: string;
  total_expense: string;
  net_profit_or_loss: string;
  result_type: string;
}

export interface BalanceSheetResponse {
  as_of_date: string;
  liabilities: any[];
  assets: any[];
  total_liabilities: string;
  total_assets: string;
}

// ── Ledger Group APIs ──
export async function apiGetLedgerGroups(): Promise<LedgerGroup[]> {
  const response = await apiClient.get<LedgerGroup[]>("/api/finance/groups");
  return response.data;
}

export async function apiCreateLedgerGroup(data: { name: string; parent_id?: string | null; is_active?: boolean }): Promise<LedgerGroup> {
  const response = await apiClient.post<LedgerGroup>("/api/finance/groups", data);
  return response.data;
}

// ── Fiscal Year APIs ──
export async function apiGetFiscalYears(): Promise<FiscalYear[]> {
  const response = await apiClient.get<FiscalYear[]>("/api/finance/fiscal-years");
  return response.data;
}

export async function apiCreateFiscalYear(data: { name: string; start_date: string; end_date: string; is_active?: boolean }): Promise<FiscalYear> {
  const response = await apiClient.post<FiscalYear>("/api/finance/fiscal-years", data);
  return response.data;
}

export async function apiActivateFiscalYear(fyId: string): Promise<{ message: string }> {
  const response = await apiClient.put<{ message: string }>(`/api/finance/fiscal-years/${fyId}/activate`);
  return response.data;
}

export async function apiLockFiscalYear(fyId: string): Promise<{ message: string }> {
  const response = await apiClient.put<{ message: string }>(`/api/finance/fiscal-years/${fyId}/lock`);
  return response.data;
}

// ── Voucher APIs ──
export async function apiCreateVoucher(voucher: Voucher): Promise<Voucher> {
  const response = await apiClient.post<Voucher>("/api/finance/vouchers", voucher);
  return response.data;
}

export async function apiListVouchers(params?: {
  voucher_type?: string;
  from_date?: string;
  to_date?: string;
  status?: string;
  search?: string;
  fiscal_year_id?: string;
  skip?: number;
  limit?: number;
}): Promise<Voucher[]> {
  const response = await apiClient.get<Voucher[]>("/api/finance/vouchers", { params });
  return response.data;
}

export async function apiGetVoucher(voucherId: string): Promise<Voucher> {
  const response = await apiClient.get<Voucher>(`/api/finance/vouchers/${voucherId}`);
  return response.data;
}

export async function apiCancelVoucher(voucherId: string): Promise<{ message: string }> {
  const response = await apiClient.post<{ message: string }>(`/api/finance/vouchers/${voucherId}/cancel`);
  return response.data;
}

export async function apiGetNextVoucherNumber(voucherType: string, fiscalYearId?: string): Promise<NextVoucherNumber> {
  const response = await apiClient.get<NextVoucherNumber>(`/api/finance/next-voucher-number/${voucherType}`, {
    params: fiscalYearId ? { fiscal_year_id: fiscalYearId } : {}
  });
  return response.data;
}

// ── Chart of Accounts ──
export async function apiSeedChartOfAccounts(): Promise<{ groups_created: number; message: string }> {
  const response = await apiClient.post<{ groups_created: number; message: string }>("/api/finance/seed-chart-of-accounts");
  return response.data;
}

// ── Carry Forward ──
export async function apiCarryForward(sourceFyId: string, targetFyId: string): Promise<{ ledgers_carried: number; message: string }> {
  const response = await apiClient.post<{ ledgers_carried: number; message: string }>("/api/finance/carry-forward", {
    source_fiscal_year_id: sourceFyId,
    target_fiscal_year_id: targetFyId
  });
  return response.data;
}

// ── Reporting APIs ──
export async function apiGetDayBook(fromDate: string, toDate: string, fiscalYearId?: string): Promise<DayBookResponse> {
  const response = await apiClient.get<DayBookResponse>("/api/finance/daybook", {
    params: { from_date: fromDate, to_date: toDate, ...(fiscalYearId ? { fiscal_year_id: fiscalYearId } : {}) }
  });
  return response.data;
}

export async function apiGetLedgerStatement(ledgerId: string, fromDate: string, toDate: string, fiscalYearId?: string): Promise<LedgerStatementResponse> {
  const response = await apiClient.get<LedgerStatementResponse>(`/api/finance/ledger-statement/${ledgerId}`, {
    params: { from_date: fromDate, to_date: toDate, ...(fiscalYearId ? { fiscal_year_id: fiscalYearId } : {}) }
  });
  return response.data;
}

export async function apiGetTrialBalance(asOfDate?: string, fiscalYearId?: string): Promise<TrialBalanceResponse> {
  const response = await apiClient.get<TrialBalanceResponse>("/api/finance/trial-balance", {
    params: { ...(asOfDate ? { as_of_date: asOfDate } : {}), ...(fiscalYearId ? { fiscal_year_id: fiscalYearId } : {}) }
  });
  return response.data;
}

export async function apiGetProfitLoss(fromDate: string, toDate: string, fiscalYearId?: string): Promise<PLResponse> {
  const response = await apiClient.get<PLResponse>("/api/finance/profit-loss", {
    params: { from_date: fromDate, to_date: toDate, ...(fiscalYearId ? { fiscal_year_id: fiscalYearId } : {}) }
  });
  return response.data;
}

export async function apiGetBalanceSheet(asOfDate?: string, fiscalYearId?: string): Promise<BalanceSheetResponse> {
  const response = await apiClient.get<BalanceSheetResponse>("/api/finance/balance-sheet", {
    params: { ...(asOfDate ? { as_of_date: asOfDate } : {}), ...(fiscalYearId ? { fiscal_year_id: fiscalYearId } : {}) }
  });
  return response.data;
}

// ==========================================
// SYSTEM CRASH RECOVERY APIS
// ==========================================

export interface ErrorEntry {
  id: string;
  module_name: string;
  json_payload: string;
  created_at: string;
  restart_count_at_creation: number;
}

export async function apiGetDrafts(): Promise<ErrorEntry[]> {
  const response = await apiClient.get<ErrorEntry[]>("/api/system/drafts");
  return response.data;
}

export async function apiSaveDraft(module_name: string, json_payload: string): Promise<ErrorEntry> {
  const response = await apiClient.post<ErrorEntry>("/api/system/drafts", { module_name, json_payload });
  return response.data;
}

export async function apiDeleteDraft(draft_id: string): Promise<{message: string}> {
  const response = await apiClient.delete<{message: string}>(`/api/system/drafts/${draft_id}`);
  return response.data;
}

// ==========================================
// STATUTORY GST COMPLIANCE & FILING APIS (DOC-30 & DOC-42)
// ==========================================

export interface GstSummaryResponse {
  period: {
    from_date: string;
    to_date: string;
  };
  metrics: {
    outward_taxable: number;
    outward_tax: number;
    outward_gross: number;
    inward_taxable: number;
    inward_itc_tax: number;
    inward_gross: number;
    net_gst_payable: number;
    itc_credit_balance: number;
    counts: {
      sales_invoices: number;
      purchase_bills: number;
      credit_notes: number;
      debit_notes: number;
    };
  };
}

export interface Gstr1InvoiceRow {
  invoice_no: string;
  date: string;
  customer: string;
  gstin: string;
  place_of_supply: string;
  taxable_amount: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
  status: string;
  note_type?: string;
  note_number?: string;
  original_invoice?: string;
}

export interface Gstr1HsnRow {
  hsn_code: string;
  description: string;
  uqc: string;
  total_quantity: number;
  total_value: number;
  taxable_value: number;
  integrated_tax: number;
  central_tax: number;
  state_tax: number;
  cess: number;
}

export interface Gstr1DocIssueRow {
  doc_num: number;
  doc_type: string;
  from_serial: string;
  to_serial: string;
  total_count: number;
  cancelled: number;
  net_issued: number;
}

export interface Gstr1Response {
  period: {
    from_date: string;
    to_date: string;
  };
  b2b: Gstr1InvoiceRow[];
  b2cl: Gstr1InvoiceRow[];
  b2cs: Gstr1InvoiceRow[];
  cdnr: Gstr1InvoiceRow[];
  hsn_summary: Gstr1HsnRow[];
  doc_issues: Gstr1DocIssueRow[];
  totals: {
    b2b_taxable: number;
    b2b_tax: number;
    b2cl_taxable: number;
    b2cl_tax: number;
    b2cs_taxable: number;
    b2cs_tax: number;
    cdnr_taxable: number;
    cdnr_tax: number;
    total_outward_taxable: number;
    total_outward_tax: number;
  };
}

export interface Gstr2InwardRow {
  invoice_no: string;
  internal_voucher_no: string;
  date: string;
  supplier: string;
  gstin: string;
  taxable_amount: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
  itc_eligibility: string;
}

export interface Gstr2Response {
  period: {
    from_date: string;
    to_date: string;
  };
  inward_supplies: Gstr2InwardRow[];
  itc_reversals: Gstr2InwardRow[];
  summary: {
    total_purchases_count: number;
    total_inward_taxable: number;
    gross_itc_available: number;
    itc_reversed_debit_notes: number;
    net_eligible_itc: number;
  };
}

export interface Gstr3bSupplyRow {
  nature_of_supplies: string;
  taxable_value: number;
  igst: number;
  cgst: number;
  sgst: number;
  cess: number;
}

export interface Gstr3bItcRow {
  details: string;
  igst: number;
  cgst: number;
  sgst: number;
  cess: number;
}

export interface Gstr3bPaymentRow {
  description: string;
  tax_payable: number;
  paid_through_itc: number;
  tax_paid_in_cash: number;
}

export interface Gstr3bResponse {
  period: {
    from_date: string;
    to_date: string;
  };
  table_3_1_outward: Gstr3bSupplyRow[];
  table_4_itc: Gstr3bItcRow[];
  table_5_1_payment: Gstr3bPaymentRow[];
  net_cash_liability: number;
}

export async function apiGetGstSummary(fromDate?: string, toDate?: string): Promise<GstSummaryResponse> {
  const response = await apiClient.get<GstSummaryResponse>("/api/gst/summary", {
    params: { ...(fromDate ? { from_date: fromDate } : {}), ...(toDate ? { to_date: toDate } : {}) }
  });
  return response.data;
}

export async function apiGetGstr1(fromDate?: string, toDate?: string): Promise<Gstr1Response> {
  const response = await apiClient.get<Gstr1Response>("/api/gst/gstr1", {
    params: { ...(fromDate ? { from_date: fromDate } : {}), ...(toDate ? { to_date: toDate } : {}) }
  });
  return response.data;
}

export async function apiGetGstr2(fromDate?: string, toDate?: string): Promise<Gstr2Response> {
  const response = await apiClient.get<Gstr2Response>("/api/gst/gstr2", {
    params: { ...(fromDate ? { from_date: fromDate } : {}), ...(toDate ? { to_date: toDate } : {}) }
  });
  return response.data;
}

export async function apiGetGstr3b(fromDate?: string, toDate?: string): Promise<Gstr3bResponse> {
  const response = await apiClient.get<Gstr3bResponse>("/api/gst/gstr3b", {
    params: { ...(fromDate ? { from_date: fromDate } : {}), ...(toDate ? { to_date: toDate } : {}) }
  });
  return response.data;
}

export async function apiGetGstr1Json(fromDate?: string, toDate?: string): Promise<any> {
  const response = await apiClient.get<any>("/api/gst/gstr1/json", {
    params: { ...(fromDate ? { from_date: fromDate } : {}), ...(toDate ? { to_date: toDate } : {}) }
  });
  return response.data;
}

// ==========================================
// BILL-BY-BILL SETTLEMENT & RECEIPT/PAYMENT APIS (DOC-24 & DOC-07)
// ==========================================

export interface PendingAllocationItem {
  id: string;
  voucher_number?: string;
  invoice_number?: string;
  date?: string;
  total_amount: number;
  allocated_total: number;
  outstanding: number;
  document_type: string;
  party_id?: string;
  party_name?: string;
  days_overdue?: number;
}

export interface AllocationLineItemPayload {
  target_invoice_id?: string;
  target_cn_dn_id?: string;
  allocated_amount: number;
  narration?: string;
}

export interface ReceiptPaymentPayload {
  voucher_type: 'Receipt' | 'Payment';
  voucher_number?: string;
  series_id?: string;
  date?: string;
  party_id: string;
  cash_bank_ledger_id: string;
  amount: number;
  payment_mode?: 'Cash' | 'Cheque' | 'NEFT/RTGS' | 'UPI';
  reference_number?: string;
  bank_name?: string;
  instrument_date?: string;
  narration?: string;
  allocations?: AllocationLineItemPayload[];
  auto_allocate_fifo?: boolean;
}

export interface ReceiptPaymentResponse {
  voucher_id: string;
  voucher_number: string;
  voucher_type: string;
  date: string;
  party_id: string;
  party_name: string;
  total_amount: number;
  allocated_total: number;
  floating_balance: number;
  allocations_count: number;
  narration?: string;
}

export interface OutstandingBillItem {
  invoice_id: string;
  invoice_number: string;
  date: string;
  total_amount: number;
  allocated_amount: number;
  outstanding_amount: number;
  days_overdue: number;
  ageing_bucket: string;
  document_type: string;
}

export interface OutstandingPartySummary {
  party_id: string;
  party_name: string;
  party_type: 'customer' | 'vendor';
  gstin?: string;
  credit_limit?: number;
  total_invoiced: number;
  total_settled: number;
  total_outstanding: number;
  bucket_0_30: number;
  bucket_31_60: number;
  bucket_61_90: number;
  bucket_90_plus: number;
  bills: OutstandingBillItem[];
}

export interface OutstandingReportResponse {
  report_type: 'receivables' | 'payables';
  as_of_date: string;
  total_parties: number;
  total_outstanding: number;
  total_bucket_0_30: number;
  total_bucket_31_60: number;
  total_bucket_61_90: number;
  total_bucket_90_plus: number;
  parties: OutstandingPartySummary[];
}

export async function apiGetPendingAllocations(params?: {
  party_id?: string;
  party_type?: 'customer' | 'vendor';
  direction?: 'receivable' | 'payable';
}): Promise<PendingAllocationItem[]> {
  const response = await apiClient.get<PendingAllocationItem[]>("/api/finance/allocations/pending", {
    params
  });
  return response.data;
}

export async function apiCreateReceiptPayment(
  payload: ReceiptPaymentPayload
): Promise<ReceiptPaymentResponse> {
  const response = await apiClient.post<ReceiptPaymentResponse>("/api/finance/receipt-payment", payload);
  return response.data;
}

export async function apiGetOutstandingReport(params?: {
  type?: 'receivables' | 'payables';
  search?: string;
  as_of?: string;
}): Promise<OutstandingReportResponse> {
  const response = await apiClient.get<OutstandingReportResponse>("/api/finance/outstanding", {
    params
  });
  return response.data;
}

// =====================================================================
// DOC-25: JOURNAL VOUCHER & ACCRUAL ENGINE INTERFACES & CALLERS
// =====================================================================

export interface JournalLinePayload {
  ledger_id: string;
  ledger_name?: string;
  cr_dr: 'Dr' | 'Cr';
  amount: number;
  narration?: string;
}

export interface JournalVoucherPayload {
  voucher_number?: string;
  date: string;
  journal_type: string;
  narration?: string;
  reference_number?: string;
  scheduled_reversal_date?: string | null;
  fiscal_year_id?: string;
  series_id?: string;
  entries: JournalLinePayload[];
}

export interface JournalLineResponse {
  id: string;
  voucher_id: string;
  ledger_id: string;
  ledger_name?: string;
  cr_dr: 'Dr' | 'Cr';
  amount: number;
}

export interface JournalVoucherResponse {
  id: string;
  organization_id: string;
  created_at: string;
  voucher_type: string;
  voucher_number: string;
  date: string;
  narration?: string;
  total_amount: number;
  journal_type?: string;
  reference_number?: string;
  scheduled_reversal_date?: string | null;
  status: string;
  fiscal_year_id?: string;
  reversal_voucher_id?: string | null;
  reversal_voucher_number?: string | null;
  entries: JournalLineResponse[];
}

export interface JournalReversePayload {
  reversal_date?: string;
  reason?: string;
}

export async function apiCreateJournal(
  payload: JournalVoucherPayload
): Promise<JournalVoucherResponse> {
  const response = await apiClient.post<JournalVoucherResponse>("/api/finance/journal", payload);
  return response.data;
}

export async function apiGetJournals(params?: {
  journal_type?: string;
  start_date?: string;
  end_date?: string;
  status?: string;
  search?: string;
}): Promise<JournalVoucherResponse[]> {
  const response = await apiClient.get<JournalVoucherResponse[]>("/api/finance/journals", {
    params
  });
  return response.data;
}

export async function apiReverseJournal(
  id: string,
  payload?: JournalReversePayload
): Promise<JournalVoucherResponse> {
  const response = await apiClient.post<JournalVoucherResponse>(`/api/finance/journal/${id}/reverse`, payload || {});
  return response.data;
}

// =====================================================================
// DOC-26: EXPENSE, PETTY CASH & EMPLOYEE REIMBURSEMENT INTERFACES & CALLERS
// =====================================================================

export interface ExpenseCategory {
  id: string;
  name: string;
  description?: string;
  ledger_id: string;
  is_active: boolean;
}

export interface EmployeeAdvance {
  id: string;
  employee_ledger_id: string;
  date: string;
  amount: number;
  reason?: string;
  status: 'Active' | 'Settled';
  voucher_id?: string;
}

export interface ExpenseLine {
  id?: string;
  category_id: string;
  amount: number;
  bill_number?: string;
  bill_date?: string;
  note?: string;
}

export interface ExpenseClaim {
  id: string;
  claim_number: string;
  employee_ledger_id: string;
  date: string;
  total_amount: number;
  status: 'Draft' | 'Approved' | 'Paid' | 'Rejected';
  approved_by?: string;
  payment_voucher_id?: string;
  remarks?: string;
  lines: ExpenseLine[];
}

export interface ExpenseSummaryResponse {
  total_expenses: number;
  pending_claims_count: number;
  active_advances_amount: number;
  settled_advances_count: number;
  categories_count: number;
  today_cash_expenses?: number;
  cash_in_hand_balance?: number;
}

export async function apiGetExpenseSummary(): Promise<ExpenseSummaryResponse> {
  const response = await apiClient.get<ExpenseSummaryResponse>('/api/expenses/summary');
  return response.data;
}

export async function apiGetExpenseCategories(): Promise<ExpenseCategory[]> {
  const response = await apiClient.get<ExpenseCategory[]>('/api/expenses/categories');
  return response.data;
}

export async function apiCreateExpenseCategory(payload: {
  name: string;
  description?: string;
  ledger_id: string;
}): Promise<ExpenseCategory> {
  const response = await apiClient.post<ExpenseCategory>('/api/expenses/categories', payload);
  return response.data;
}

export async function apiGetEmployeeAdvances(): Promise<EmployeeAdvance[]> {
  const response = await apiClient.get<EmployeeAdvance[]>('/api/expenses/advances');
  return response.data;
}

export async function apiCreateEmployeeAdvance(payload: {
  employee_ledger_id: string;
  date: string;
  amount: number;
  reason?: string;
}): Promise<EmployeeAdvance> {
  const response = await apiClient.post<EmployeeAdvance>('/api/expenses/advances', payload);
  return response.data;
}

export async function apiSettleEmployeeAdvance(id: string): Promise<{ message: string }> {
  const response = await apiClient.put<{ message: string }>(`/api/expenses/advances/${id}/settle`);
  return response.data;
}

export async function apiGetExpenseClaims(): Promise<ExpenseClaim[]> {
  const response = await apiClient.get<ExpenseClaim[]>('/api/expenses/claims');
  return response.data;
}

export async function apiCreateExpenseClaim(payload: {
  claim_number?: string;
  employee_ledger_id: string;
  date: string;
  total_amount: number;
  remarks?: string;
  lines: {
    category_id: string;
    amount: number;
    bill_number?: string;
    bill_date?: string;
    note?: string;
  }[];
}): Promise<ExpenseClaim> {
  const response = await apiClient.post<ExpenseClaim>('/api/expenses/claims', payload);
  return response.data;
}

export async function apiApproveExpenseClaim(id: string): Promise<{ message: string; voucher_id: string }> {
  const response = await apiClient.post<{ message: string; voucher_id: string }>(`/api/expenses/claims/${id}/approve`);
  return response.data;
}

export interface DirectExpenseInput {
  date: string;
  expense_ledger_id: string;
  paid_from_ledger_id: string;
  amount: number;
  paid_to?: string;
  payment_mode: string;
  reference_no?: string;
  narration?: string;
}

export interface DirectExpenseResponse {
  message: string;
  voucher_id: string;
  voucher_number: string;
  amount: number;
  expense_ledger_name: string;
  paid_from_ledger_name: string;
  claim_id?: string;
}

export async function apiCreateDirectExpense(payload: DirectExpenseInput): Promise<DirectExpenseResponse> {
  const response = await apiClient.post<DirectExpenseResponse>('/api/expenses/direct', payload);
  return response.data;
}

// ==========================================
// DOC-27 FIXED ASSETS & DEPRECIATION APIS
// ==========================================

export interface AssetCategory {
  id: string;
  name: string;
  depreciation_method: string;
  depreciation_rate: number;
  asset_ledger_id: string;
  acc_depreciation_ledger_id: string;
  depreciation_expense_ledger_id: string;
  created_at?: string;
}

export interface FixedAsset {
  id: string;
  category_id: string;
  name: string;
  description?: string;
  serial_number?: string;
  location?: string;
  purchase_date: string;
  purchase_value: number;
  salvage_value: number;
  current_net_block: number;
  status: 'Active' | 'Disposed';
  created_at?: string;
}

export interface DepreciationLog {
  id: string;
  asset_id: string;
  voucher_id?: string;
  run_date: string;
  depreciation_amount: number;
  closing_net_block: number;
  notes?: string;
  created_at?: string;
}

export interface AssetSummaryResponse {
  total_gross_block: number;
  total_accumulated_depreciation: number;
  total_net_block: number;
  active_assets_count: number;
  disposed_assets_count: number;
  categories_count: number;
}

export interface BulkDepreciationResponse {
  message: string;
  total_depreciation: number;
  assets_processed: number;
  voucher_number?: string;
  voucher_id?: string;
}

export interface AssetDisposalResponse {
  asset_id: string;
  sale_proceeds: number;
  net_block_at_disposal: number;
  gain_or_loss: number;
  voucher_number?: string;
  voucher_id?: string;
  message: string;
}

export async function apiGetAssetSummary(): Promise<AssetSummaryResponse> {
  const response = await apiClient.get<AssetSummaryResponse>('/api/assets/summary');
  return response.data;
}

export async function apiGetAssetCategories(): Promise<AssetCategory[]> {
  const response = await apiClient.get<AssetCategory[]>('/api/assets/categories');
  return response.data;
}

export async function apiCreateAssetCategory(payload: {
  name: string;
  depreciation_method: string;
  depreciation_rate: number;
  asset_ledger_id: string;
  acc_depreciation_ledger_id: string;
  depreciation_expense_ledger_id: string;
}): Promise<AssetCategory> {
  const response = await apiClient.post<AssetCategory>('/api/assets/categories', payload);
  return response.data;
}

export async function apiGetFixedAssets(): Promise<FixedAsset[]> {
  const response = await apiClient.get<FixedAsset[]>('/api/assets');
  return response.data;
}

export async function apiRegisterFixedAsset(payload: {
  category_id: string;
  name: string;
  description?: string;
  serial_number?: string;
  location?: string;
  purchase_date: string;
  purchase_value: number;
  salvage_value: number;
}): Promise<FixedAsset> {
  const response = await apiClient.post<FixedAsset>('/api/assets', payload);
  return response.data;
}

export async function apiGetAssetDepreciationLogs(assetId: string): Promise<DepreciationLog[]> {
  const response = await apiClient.get<DepreciationLog[]>(`/api/assets/${assetId}/depreciation-logs`);
  return response.data;
}

export async function apiRunAssetDepreciation(assetId: string, runDate: string, notes?: string): Promise<DepreciationLog> {
  const response = await apiClient.post<DepreciationLog>(`/api/assets/${assetId}/depreciate`, {
    run_date: runDate,
    notes
  });
  return response.data;
}

export async function apiBulkDepreciateAssets(runDate: string, notes?: string): Promise<BulkDepreciationResponse> {
  const response = await apiClient.post<BulkDepreciationResponse>('/api/assets/bulk-depreciate', {
    run_date: runDate,
    notes
  });
  return response.data;
}

export async function apiDisposeAsset(assetId: string, payload: {
  disposal_date: string;
  sale_proceeds: number;
  settlement_ledger_id?: string;
  notes?: string;
}): Promise<AssetDisposalResponse> {
  const response = await apiClient.post<AssetDisposalResponse>(`/api/assets/${assetId}/dispose`, payload);
  return response.data;
}

// ==========================================
// DOC-28 BANK RECONCILIATION & CASH CONTROL
// ==========================================

export interface BankReconciliationSummary {
  ledger_id: string;
  ledger_name: string;
  book_balance: number;
  unreconciled_statement_count: number;
  unreconciled_statement_withdrawal: number;
  unreconciled_statement_deposit: number;
  unreconciled_voucher_count: number;
  unreconciled_voucher_cr: number;
  unreconciled_voucher_dr: number;
  reconciled_bank_balance: number;
  difference: number;
}

export interface BankAutoMatchResponse {
  matches_count: number;
  matched_amount: number;
  unmatched_statements_count: number;
  unmatched_vouchers_count: number;
  message: string;
}

export interface CashVerification {
  id: string;
  organization_id: string;
  ledger_id: string;
  ledger_name?: string;
  verification_date: string;
  denominations: Record<string, number>;
  system_balance: number;
  counted_balance: number;
  variance: number;
  status: 'BALANCED' | 'SURPLUS' | 'SHORTAGE';
  remarks?: string;
  created_at: string;
}

export interface CashVerificationPayload {
  ledger_id: string;
  verification_date?: string;
  denominations: Record<string, number>;
  counted_balance: number;
  remarks?: string;
}

export async function apiGetBankReconciliationSummary(ledgerId: string): Promise<BankReconciliationSummary> {
  const response = await apiClient.get<BankReconciliationSummary>(`/api/finance/bank-reconciliation/summary/${ledgerId}`);
  return response.data;
}

export async function apiRunBankAutoMatch(ledgerId: string): Promise<BankAutoMatchResponse> {
  const response = await apiClient.post<BankAutoMatchResponse>(`/api/finance/bank-reconciliation/auto-match/${ledgerId}`);
  return response.data;
}

export async function apiMatchBankReconciliation(statementRowId: string, voucherId: string): Promise<{ message: string }> {
  const response = await apiClient.post<{ message: string }>('/api/finance/bank-reconciliation/match', {
    statement_row_id: statementRowId,
    voucher_id: voucherId
  });
  return response.data;
}

export async function apiGetUnreconciledStatementRows(ledgerId: string): Promise<any[]> {
  const response = await apiClient.get<any[]>(`/api/finance/bank-statements/unreconciled/${ledgerId}`);
  return response.data;
}

export async function apiGetUnreconciledVouchers(ledgerId: string): Promise<any[]> {
  const response = await apiClient.get<any[]>(`/api/finance/vouchers/unreconciled/${ledgerId}`);
  return response.data;
}

export async function apiGetCashVerifications(): Promise<CashVerification[]> {
  const response = await apiClient.get<CashVerification[]>('/api/finance/cash-verifications');
  return response.data;
}

export async function apiCreateCashVerification(payload: CashVerificationPayload): Promise<CashVerification> {
  const response = await apiClient.post<CashVerification>('/api/finance/cash-verifications', payload);
  return response.data;
}

// ============================================================
// DOC-31: DASHBOARD, KPI, BI & CONTROL CENTRE API
// ============================================================

export interface DashboardSummary {
  as_of: string;
  today_sales: {
    amount: number;
    invoice_count: number;
    cash_share: number;
    credit_share: number;
  };
  mtd_sales: {
    amount: number;
    invoice_count: number;
    target: number;
    attainment_percent: number;
    growth_yoy: number;
  };
  procurement_volume: {
    amount: number;
    inward_count: number;
    cogs_ratio_percent: number;
    growth_yoy: number;
  };
  gross_operating_margin: {
    amount: number;
    margin_percent: number;
    net_profit_est: number;
    health_status: string;
  };
  consolidated_liquidity: {
    cash_balance: number;
    bank_balance: number;
    total_liquidity: number;
    quick_ratio: number;
    working_capital_status: string;
  };
  actionable_receivables: {
    amount: number;
    total_debtors: number;
    overdue_percent: number;
  };
  payables_exposure: {
    amount: number;
    total_creditors: number;
    due_this_week: number;
  };
  inventory_health: {
    active_skus: number;
    low_stock_alerts: number;
    near_expiry_alerts: number;
  };
  exclusions_applied: number;
}

export interface SalesTerritory {
  id: string;
  name: string;
  short_name: string;
  turnover: number;
  share_percent: number;
  retail_chemists: number;
  quota_target: number;
  attainment_percent: number;
  growth_yoy: number;
  top_molecule: string;
  status: string;
}

export interface SalesTerritoriesResponse {
  period: string;
  total_regional_turnover: number;
  total_retail_chemists: number;
  territories: SalesTerritory[];
}

export interface DashboardTrendsResponse {
  monthly_performance: { name: string; sales: number; purchase: number }[];
  operating_expenses: {
    total_opex: number;
    breakdown: { name: string; short_name: string; percentage: number; amount: number; color: string }[];
  };
  top_products: { rank: number; product_name: string; manufacturer: string; turnover: number; quantity_packs: number; share_pct: number }[];
  receivables_ageing: {
    total_outstanding: number;
    buckets: { bucket: string; label: string; amount: number; percentage: number; severity: string }[];
  };
}

export interface PredictiveIntelligenceResponse {
  cash_flow_forecast: {
    projection_window_days: number;
    projected_collections: number;
    scheduled_supplier_payments: number;
    estimated_operating_expenses: number;
    net_projected_cash_position: number;
    confidence_score_percent: number;
    summary: string;
  };
  stockout_velocity: {
    product_name: string;
    current_stock_packs: number;
    daily_run_rate_packs: number;
    days_to_stockout: number;
    risk_level: string;
    recommended_order_qty: number;
    action: string;
  }[];
  customer_churn_risk: {
    customer_name: string;
    historical_order_interval_days: number;
    days_since_last_order: number;
    avg_monthly_billing: number;
    risk_score: string;
    suggested_action: string;
  }[];
  near_expiry_exposure: {
    batches_expiring_30_days_val: number;
    batches_expiring_60_days_val: number;
    batches_expiring_90_days_val: number;
    total_at_risk_value: number;
    recommended_salvage_action: string;
  };
}

export interface DashboardAlertsResponse {
  urgent_exceptions: {
    id: string;
    category: string;
    severity: string;
    title: string;
    subtitle: string;
    action_label: string;
    action_route: string;
  }[];
  counter_ticker: {
    id: string;
    type: string;
    number: string;
    party: string;
    amount: number;
    timestamp: string;
    status: string;
  }[];
}

export async function apiGetDashboardSummary(useExclusions = true): Promise<DashboardSummary> {
  const response = await apiClient.get<DashboardSummary>('/api/dashboard/summary', {
    params: { use_exclusions: useExclusions }
  });
  return response.data;
}

export async function apiGetSalesTerritories(period = 'quarter'): Promise<SalesTerritoriesResponse> {
  const response = await apiClient.get<SalesTerritoriesResponse>('/api/dashboard/sales-territories', {
    params: { period }
  });
  return response.data;
}

export async function apiGetDashboardTrends(): Promise<DashboardTrendsResponse> {
  const response = await apiClient.get<DashboardTrendsResponse>('/api/dashboard/trends');
  return response.data;
}

export async function apiGetPredictiveIntelligence(): Promise<PredictiveIntelligenceResponse> {
  const response = await apiClient.get<PredictiveIntelligenceResponse>('/api/dashboard/predictive');
  return response.data;
}

export async function apiGetDashboardAlerts(): Promise<DashboardAlertsResponse> {
  const response = await apiClient.get<DashboardAlertsResponse>('/api/dashboard/alerts');
  return response.data;
}

// ============================================================
// DOC-32: Workflow, Approval, Alert & Business Automation Engine
// ============================================================

export interface WorkflowTaskItem {
  task_id: string;
  instance_id: string;
  stage_order: number;
  assigned_role: string;
  priority: 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW';
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'DELEGATED' | 'ESCALATED' | 'BYPASSED';
  module: string;
  document_number: string;
  party_name: string;
  amount: number;
  initiator_name: string;
  definition_code: string;
  definition_name: string;
  sla_deadline: string | null;
  sla_hours_remaining: number;
  sla_badge: 'ON_TRACK' | 'WARNING' | 'BREACHED';
  maker_checker_blocked: boolean;
  comments: string | null;
  created_at: string;
}

export interface WorkflowInboxResponse {
  count: number;
  tasks: WorkflowTaskItem[];
  current_user: {
    name: string;
    role: string;
    id: string;
  };
}

export interface WorkflowDefinitionItem {
  id: string;
  code: string;
  name: string;
  module: string;
  trigger_event: string;
  status: string;
  version: number;
  is_maker_checker_enforced: boolean;
  config_json: {
    tiers?: {
      tier: number;
      min_amount?: number;
      max_amount?: number;
      approver_role: string;
      sla_hours: number;
    }[];
    on_approved_action?: string;
    on_rejected_action?: string;
    [key: string]: any;
  };
  created_at: string;
}

export interface WorkflowInstanceItem {
  instance_id: string;
  document_number: string;
  source_module: string;
  party_name: string | null;
  amount: number;
  current_stage: number;
  status: string;
  idempotency_key: string;
  initiator_name: string;
  created_at: string;
  tasks: {
    task_id: string;
    stage: number;
    role: string;
    status: string;
    action: string | null;
    comments: string | null;
  }[];
}

export interface WorkflowAnalyticsResponse {
  summary: {
    total_tasks: number;
    pending_approvals: number;
    approved_count: number;
    rejected_count: number;
    sla_adherence_rate: number;
    avg_turnaround_hours: number;
  };
  department_distribution: {
    department: string;
    count: number;
    pct: number;
  }[];
  bottlenecks: {
    role: string;
    pending: number;
    avg_delay_hours: number;
  }[];
}

export async function apiGetWorkflowInbox(filterStatus = 'PENDING'): Promise<WorkflowInboxResponse> {
  const response = await apiClient.get<WorkflowInboxResponse>('/api/workflow/inbox', {
    params: { filter_status: filterStatus }
  });
  return response.data;
}

export async function apiPerformWorkflowAction(
  taskId: string,
  payload: { action: string; comments?: string; delegate_to_user_id?: string }
): Promise<{ success: boolean; action: string; message: string; instance_status: string }> {
  const response = await apiClient.post(`/api/workflow/tasks/${taskId}/action`, payload);
  return response.data;
}

export async function apiGetWorkflowDefinitions(): Promise<WorkflowDefinitionItem[]> {
  const response = await apiClient.get<WorkflowDefinitionItem[]>('/api/workflow/definitions');
  return response.data;
}

export async function apiCreateWorkflowDefinition(payload: any): Promise<{ success: boolean; message: string; id: string; version: number }> {
  const response = await apiClient.post('/api/workflow/definitions', payload);
  return response.data;
}

export async function apiGetWorkflowInstances(statusFilter?: string, moduleFilter?: string): Promise<WorkflowInstanceItem[]> {
  const response = await apiClient.get<WorkflowInstanceItem[]>('/api/workflow/instances', {
    params: { status_filter: statusFilter, module_filter: moduleFilter }
  });
  return response.data;
}

export async function apiRetryWorkflowInstance(instanceId: string): Promise<{ success: boolean; message: string }> {
  const response = await apiClient.post(`/api/workflow/instances/${instanceId}/retry`);
  return response.data;
}

export async function apiGetWorkflowAnalytics(): Promise<WorkflowAnalyticsResponse> {
  const response = await apiClient.get<WorkflowAnalyticsResponse>('/api/workflow/analytics');
  return response.data;
}

// ── DOC-33: AUDIT TRAIL, DATA GOVERNANCE & COMPLIANCE CONTROL ENGINE ──
export interface AuditEventItem {
  id: string;
  actor_name: string;
  event_type: string;
  object_type: string;
  object_id: string | null;
  document_number: string;
  event_time: string;
  reason: string;
  prev_hash: string | null;
  event_hash: string;
  correlation_id: string | null;
  is_verified: boolean;
}

export interface AuditEventsResponse {
  total: number;
  offset: number;
  limit: number;
  latest_hash: string;
  chain_verified: boolean;
  events: AuditEventItem[];
}

export interface AuditDiffItem {
  field: string;
  old_value: any;
  new_value: any;
  status: 'ADDED' | 'REMOVED' | 'MODIFIED' | 'UNCHANGED';
}

export interface AuditDiffResponse {
  event_id: string;
  document_number: string;
  actor_name: string;
  event_type: string;
  object_type: string;
  event_time: string;
  reason: string | null;
  prev_hash: string | null;
  event_hash: string;
  is_hash_intact: boolean;
  diff_items: AuditDiffItem[];
  before_payload: Record<string, any> | null;
  after_payload: Record<string, any> | null;
}

export interface ChainVerificationResponse {
  is_valid: boolean;
  total_verified: number;
  genesis_hash: string;
  latest_hash: string;
  broken_link_id: string | null;
  verified_at: string;
  status_badge: string;
  message?: string;
}

export interface RetentionPolicyItem {
  id: string;
  object_type: string;
  retention_days: number;
  retention_years: number;
  legal_hold_allowed: boolean;
  effective_from: string | null;
  created_at: string;
}

export interface LegalHoldItem {
  id: string;
  scope_type: string;
  scope_description: string;
  reason: string;
  is_active: boolean;
  created_at: string;
  released_at: string | null;
  release_reason: string;
}

export interface AuditAnomaliesResponse {
  signals: {
    code: string;
    title: string;
    severity: 'NORMAL' | 'INFO' | 'WARNING' | 'CRITICAL' | 'SECURE';
    metric: string;
    description: string;
  }[];
  total_active_holds: number;
  recent_24h_volume: number;
}

export interface EvidencePackResponse {
  status: string;
  manifest: {
    pack_id: string;
    exported_by: string;
    exported_at: string;
    purpose: string;
    total_records: number;
    genesis_hash: string;
    terminal_hash: string;
    compliance_standard: string;
  };
  export_audit_event_id: string;
  records_count: number;
}

export async function apiGetAuditEvents(params?: {
  search?: string;
  module?: string;
  event_type?: string;
  limit?: number;
  offset?: number;
}): Promise<AuditEventsResponse> {
  const response = await apiClient.get<AuditEventsResponse>('/api/audit/events', { params });
  return response.data;
}

export async function apiGetAuditDiff(eventId: string): Promise<AuditDiffResponse> {
  const response = await apiClient.get<AuditDiffResponse>(`/api/audit/diff/${eventId}`);
  return response.data;
}

export async function apiVerifyAuditChain(): Promise<ChainVerificationResponse> {
  const response = await apiClient.post<ChainVerificationResponse>('/api/audit/verify-chain');
  return response.data;
}

export async function apiGetRetentionPolicies(): Promise<RetentionPolicyItem[]> {
  const response = await apiClient.get<RetentionPolicyItem[]>('/api/audit/retention/policies');
  return response.data;
}

export async function apiUpsertRetentionPolicy(payload: {
  object_type: string;
  retention_days: number;
  legal_hold_allowed?: boolean;
  effective_from?: string;
}): Promise<{ status: string; policy_id: string; audit_event_id: string }> {
  const response = await apiClient.post('/api/audit/retention/policies', payload);
  return response.data;
}

export async function apiGetLegalHolds(): Promise<LegalHoldItem[]> {
  const response = await apiClient.get<LegalHoldItem[]>('/api/audit/legal-holds');
  return response.data;
}

export async function apiCreateLegalHold(payload: {
  scope_type: string;
  scope_description: string;
  reason: string;
}): Promise<{ status: string; hold_id: string; audit_event_id: string }> {
  const response = await apiClient.post('/api/audit/legal-holds', payload);
  return response.data;
}

export async function apiReleaseLegalHold(
  holdId: string,
  releaseReason: string
): Promise<{ status: string; hold_id: string; audit_event_id: string }> {
  const response = await apiClient.post(`/api/audit/legal-holds/${holdId}/release`, {
    release_reason: releaseReason
  });
  return response.data;
}

export async function apiGetAuditAnomalies(): Promise<AuditAnomaliesResponse> {
  const response = await apiClient.get<AuditAnomaliesResponse>('/api/audit/anomalies');
  return response.data;
}

export async function apiExportEvidencePack(payload: {
  purpose: string;
  module?: string;
}): Promise<EvidencePackResponse> {
  const response = await apiClient.post<EvidencePackResponse>('/api/audit/evidence-pack', payload);
  return response.data;
}

// ==========================================
// DOC-34: CARGO & CONSIGNMENT MANAGEMENT APIS
// ==========================================

export interface CargoSummaryKPI {
  total_consignments: number;
  active_in_transit: number;
  delivered_count: number;
  exceptions_count: number;
  total_cbm: number;
  admin_borne_cost: number;
  pending_pod_count: number;
}

export interface CargoPackageItem {
  id?: string;
  package_type: string;
  barcode: string;
  gross_weight: number;
  tare_weight: number;
  net_weight: number;
  length_cm: number;
  width_cm: number;
  height_cm: number;
  cbm: number;
  is_fragile: boolean;
  status?: string;
}

export interface CargoCostItem {
  id?: string;
  consignment_number?: string;
  lr_no?: string;
  transporter_name?: string;
  beneficiary_name?: string;
  cost_type: string;
  gross_cost: number;
  recovery_amount: number;
  net_bearer_cost: number;
  is_admin_borne: boolean;
  is_recoverable: boolean;
  recovery_status: string;
  created_at?: string;
}

export interface PodRecordItem {
  id?: string;
  received_by: string;
  received_at: string;
  accepted_qty: number;
  short_qty: number;
  damage_qty: number;
  status: string;
  remarks?: string;
  signature_token?: string;
}

export interface ConsignmentItem {
  id: string;
  consignment_number: string;
  document_number?: string;
  lr_no?: string;
  transporter_name: string;
  vehicle_no?: string;
  driver_name?: string;
  driver_phone?: string;
  origin_hub: string;
  destination_hub: string;
  status: 'PLANNED' | 'READY_FOR_LOADING' | 'LOADING' | 'DISPATCHED' | 'IN_TRANSIT' | 'DELIVERED' | 'EXCEPTION' | 'CLOSED';
  dispatch_at?: string | null;
  delivered_at?: string | null;
  is_admin_funded: boolean;
  package_count: number;
  total_cbm: number;
  total_gross_weight: number;
  total_cost: number;
  admin_borne_cost: number;
  has_pod: boolean;
  notes?: string;
  created_at: string;
}

export interface ConsignmentDetailResponse extends ConsignmentItem {
  packages: CargoPackageItem[];
  costs: CargoCostItem[];
  pod?: PodRecordItem | null;
}

export interface CargoCostsResponse {
  summary: {
    total_gross: number;
    total_recovered: number;
    total_net_admin: number;
    combined_mode: boolean;
  };
  costs: CargoCostItem[];
}

export interface PodExceptionsResponse {
  pending_pods: {
    id: string;
    consignment_number: string;
    document_number?: string;
    lr_no?: string;
    transporter_name: string;
    destination_hub: string;
    driver_name?: string;
    driver_phone?: string;
    package_count: number;
    dispatch_at?: string | null;
    status: string;
  }[];
  exceptions: {
    id: string;
    consignment_number: string;
    lr_no?: string;
    transporter_name: string;
    destination_hub: string;
    short_qty: number;
    damage_qty: number;
    remarks: string;
    created_at: string;
  }[];
}

export async function apiGetCargoSummary(): Promise<CargoSummaryKPI> {
  const response = await apiClient.get<CargoSummaryKPI>('/api/cargo/summary');
  return response.data;
}

export async function apiGetConsignments(params?: {
  search?: string;
  status?: string;
  transporter?: string;
  cost_bearer?: string;
  limit?: number;
  offset?: number;
}): Promise<{ total: number; consignments: ConsignmentItem[] }> {
  const response = await apiClient.get('/api/cargo/consignments', { params });
  return response.data;
}

export async function apiCreateConsignment(payload: {
  consignment_number?: string;
  document_number?: string;
  transporter_name: string;
  vehicle_no?: string;
  driver_name?: string;
  driver_phone?: string;
  origin_hub: string;
  destination_hub: string;
  lr_no?: string;
  is_admin_funded?: boolean;
  notes?: string;
  packages?: {
    package_type: string;
    barcode?: string;
    gross_weight: number;
    tare_weight: number;
    net_weight: number;
    length_cm: number;
    width_cm: number;
    height_cm: number;
    is_fragile: boolean;
  }[];
  costs?: {
    cost_type: string;
    gross_cost: number;
    recovery_amount: number;
    is_admin_borne: boolean;
    is_recoverable: boolean;
  }[];
}): Promise<{ status: string; consignment_id: string; consignment_number: string; message: string }> {
  const response = await apiClient.post('/api/cargo/consignments', payload);
  return response.data;
}

export async function apiGetConsignmentDetail(id: string): Promise<ConsignmentDetailResponse> {
  const response = await apiClient.get<ConsignmentDetailResponse>(`/api/cargo/consignments/${id}`);
  return response.data;
}

export async function apiUpdateConsignmentStatus(
  id: string,
  status: string,
  reason?: string
): Promise<{ status: string; consignment_id: string; previous_status: string; current_status: string; message: string }> {
  const response = await apiClient.put(`/api/cargo/consignments/${id}/status`, { status, reason });
  return response.data;
}

export const apiUpdateCargoStatus = apiUpdateConsignmentStatus;


export async function apiGetCargoCosts(params?: {
  include_clients?: boolean;
  cost_type?: string;
  limit?: number;
  offset?: number;
}): Promise<CargoCostsResponse> {
  const response = await apiClient.get<CargoCostsResponse>('/api/cargo/costs', { params });
  return response.data;
}

export async function apiGetPodExceptions(): Promise<PodExceptionsResponse> {
  const response = await apiClient.get<PodExceptionsResponse>('/api/cargo/pod-exceptions');
  return response.data;
}

export async function apiSubmitPod(
  consignmentId: string,
  payload: {
    received_by: string;
    accepted_qty: number;
    short_qty?: number;
    damage_qty?: number;
    remarks?: string;
    signature_token?: string;
  }
): Promise<{ status: string; pod_id: string; consignment_status: string; message: string }> {
  const response = await apiClient.post(`/api/cargo/consignments/${consignmentId}/pod`, payload);
  return response.data;
}

export async function apiResolveCargoException(
  consignmentId: string,
  payload: {
    resolution_action: string;
    resolution_remarks: string;
  }
): Promise<{ status: string; consignment_id: string; current_status: string; message: string }> {
  const response = await apiClient.post(`/api/cargo/consignments/${consignmentId}/resolve-exception`, payload);
  return response.data;
}

// ==========================================
// DOC-35: FREIGHT & LOGISTICS COST RECOVERY APIS
// ==========================================

export interface FreightSummaryKPI {
  total_freight_spend: number;
  admin_funded_spend: number;
  total_recoveries: number;
  total_subsidies: number;
  net_logistics_margin: number;
  active_contracts_count: number;
  cost_events_count: number;
  pending_reconciliations: number;
  currency: string;
}

export interface FreightLaneItem {
  id: string;
  origin_zone: string;
  destination_zone: string;
  distance_km: number;
  distance_source: string;
  transit_days: number;
  priority: number;
}

export interface FreightRateRuleItem {
  id: string;
  lane_id?: string | null;
  charge_basis: string;
  base_rate: number;
  min_charge: number;
  max_cap?: number | null;
  slab_config?: { min_kg: number; max_kg: number; rate: number }[];
  rounding_rule: string;
}

export interface FreightAncillaryRuleItem {
  id: string;
  ancillary_type: string;
  charge_basis: string;
  rate: number;
  is_mandatory: boolean;
  condition_text?: string;
}

export interface FreightContractItem {
  id: string;
  contract_number: string;
  transporter_name: string;
  vehicle_class: string;
  status: string;
  priority: number;
  notes?: string;
  effective_from?: string;
  lanes: FreightLaneItem[];
  rate_rules: FreightRateRuleItem[];
  ancillary_rules: FreightAncillaryRuleItem[];
}

export interface FreightCalculationResult {
  contract_id: string;
  contract_number: string;
  transporter_name: string;
  chargeable_weight_kg: number;
  base_freight: number;
  ancillary_charges: {
    type: string;
    basis: string;
    rate: number;
    amount: number;
    condition?: string;
  }[];
  total_ancillary: number;
  gross_freight_cost: number;
  recovery_type: string;
  recovery_amount: number;
  subsidy_amount: number;
  logistics_margin: number;
  formula_text: string;
  is_admin_funded: boolean;
  cost_bearer: string;
  beneficiary: string;
  currency: string;
}

export interface FreightCostEventItem {
  id: string;
  event_number: string;
  consignment_id?: string | null;
  cost_type: string;
  estimated_amount: number;
  actual_amount: number;
  variance_amount: number;
  currency: string;
  status: string;
  is_admin_funded: boolean;
  created_at: string;
  allocations: {
    id: string;
    target_type: string;
    target_number?: string;
    allocation_method: string;
    allocated_amount: number;
  }[];
  recoveries: {
    id: string;
    recovery_type: string;
    recovery_party_type: string;
    recovery_party_name?: string;
    recovery_amount: number;
    subsidy_amount: number;
    logistics_margin: number;
    status: string;
  }[];
}

export interface FreightReconciliationItem {
  id: string;
  recon_number: string;
  transporter_name: string;
  transporter_invoice_no: string;
  transporter_invoice_date?: string;
  expected_amount: number;
  billed_amount: number;
  approved_amount: number;
  variance_amount: number;
  variance_status: 'MATCHED' | 'TOLERABLE' | 'UNAPPROVED_EXCESS' | 'DISPUTED' | 'RESOLVED';
  dispute_reason?: string;
  status: string;
  created_at: string;
}

export async function apiGetFreightSummary(): Promise<{ success: boolean; summary: FreightSummaryKPI }> {
  const response = await apiClient.get('/api/freight/summary');
  return response.data;
}

export async function apiGetFreightContracts(): Promise<{ success: boolean; contracts: FreightContractItem[] }> {
  const response = await apiClient.get('/api/freight/contracts');
  return response.data;
}

export async function apiCreateFreightContract(payload: {
  contract_number?: string;
  transporter_name: string;
  vehicle_class?: string;
  priority?: number;
  notes?: string;
  lanes?: {
    origin_zone: string;
    destination_zone: string;
    distance_km: number;
    distance_source?: string;
    transit_days?: number;
    priority?: number;
  }[];
  rate_rules?: {
    charge_basis: string;
    base_rate: number;
    min_charge: number;
    max_cap?: number;
    slab_config?: { min_kg: number; max_kg: number; rate: number }[];
    rounding_rule?: string;
  }[];
  ancillary_rules?: {
    ancillary_type: string;
    charge_basis: string;
    rate: number;
    is_mandatory: boolean;
    condition_text?: string;
  }[];
}): Promise<{ success: boolean; contract_id: string; contract_number: string }> {
  const response = await apiClient.post('/api/freight/contracts', payload);
  return response.data;
}

export async function apiCalculateFreight(payload: {
  contract_id?: string;
  transporter_name?: string;
  origin_zone: string;
  destination_zone: string;
  gross_weight_kg: number;
  volumetric_weight_kg?: number;
  package_count: number;
  distance_km?: number;
  declared_value?: number;
  ancillaries_requested?: string[];
  recovery_type?: string;
  recovery_amount?: number;
}): Promise<{ success: boolean; calculation: FreightCalculationResult }> {
  const response = await apiClient.post('/api/freight/calculate', payload);
  return response.data;
}

export async function apiGetFreightEvents(params?: {
  status?: string;
  consignment_id?: string;
}): Promise<{ success: boolean; events: FreightCostEventItem[] }> {
  const response = await apiClient.get('/api/freight/events', { params });
  return response.data;
}

export async function apiCreateFreightEvent(payload: {
  consignment_id?: string;
  contract_id?: string;
  cost_type: string;
  estimated_amount: number;
  actual_amount?: number;
  currency?: string;
  is_admin_funded?: boolean;
  calculation_inputs?: any;
  calculation_outputs?: any;
  formula_text?: string;
  allocation_targets?: any[];
  recovery_data?: any;
}): Promise<{ success: boolean; event_id: string; event_number: string }> {
  const response = await apiClient.post('/api/freight/events', payload);
  return response.data;
}

export async function apiAllocateFreightCost(payload: {
  cost_event_id: string;
  allocation_method: string;
  targets: {
    target_type: string;
    target_id?: string;
    target_number: string;
    weight?: number;
    value?: number;
    package_count?: number;
  }[];
}): Promise<{ success: boolean; message: string; allocations: any[] }> {
  const response = await apiClient.post('/api/freight/allocate', payload);
  return response.data;
}

export async function apiGetFreightReconciliations(): Promise<{ success: boolean; reconciliations: FreightReconciliationItem[] }> {
  const response = await apiClient.get('/api/freight/reconciliation');
  return response.data;
}

export async function apiCreateFreightReconciliation(payload: {
  transporter_name: string;
  transporter_invoice_no: string;
  transporter_invoice_date?: string;
  expected_amount: number;
  billed_amount: number;
  dispute_reason?: string;
}): Promise<{ success: boolean; message: string; recon_number: string; variance_status: string }> {
  const response = await apiClient.post('/api/freight/reconciliation', payload);
  return response.data;
}

export async function apiActionFreightReconciliation(
  reconId: string,
  payload: {
    action: string;
    approved_amount?: number;
    dispute_reason?: string;
  }
): Promise<{ success: boolean; message: string; status: string }> {
  const response = await apiClient.post(`/api/freight/reconciliation/${reconId}/action`, payload);
  return response.data;
}

export async function apiGetFreightPolicies(): Promise<{ success: boolean; policy: any }> {
  const response = await apiClient.get('/api/freight/policies');
  return response.data;
}

// ─────────────────────────────────────────────────────────────
// DOC-36: Principal & C&F Operations Management Interfaces
// ─────────────────────────────────────────────────────────────

export interface PrincipalSummaryKPI {
  active_principals_count: number;
  total_stock_value: number;
  total_stock_quantity: number;
  pending_claims_count: number;
  pending_claims_value: number;
  approved_claims_value: number;
  total_reconciliations_count: number;
  approved_reconciliations_count: number;
  total_freight_attributed: number;
  admin_funded_freight: number;
  currency: string;
}

export interface PrincipalListItem {
  id: string;
  context_id: string;
  principal_code: string;
  principal_name: string;
  status: string;
  agreement_number: string;
  agreement_version: string;
  commission_rate_pct: number;
  freight_bearer: string;
  total_stock_qty: number;
  total_stock_value: number;
  pending_claims_count: number;
  created_at: string;
}

export interface PrincipalStockLine {
  id: string;
  product_id: string;
  product_name: string;
  batch_no: string;
  warehouse_name: string;
  qty_on_hand: number;
  qty_reserved: number;
  qty_damage_breakage: number;
  unit_cost: number;
  total_valuation: number;
  as_of: string;
}

export interface PrincipalClaimItem {
  id: string;
  claim_number: string;
  claim_type: string;
  source_doc_id: string;
  product_name: string;
  batch_no: string;
  claimed_qty: number;
  claimed_amount: number;
  approved_amount: number;
  reason?: string;
  status: string;
  created_at: string;
}

export interface PrincipalCostAttributionItem {
  id: string;
  source_cost_id: string;
  bearer: string;
  recovery_target: string;
  amount: number;
  status: string;
}

export interface PrincipalReconciliationItem {
  id: string;
  recon_number: string;
  principal_id?: string;
  principal_name: string;
  period_from: string;
  period_to: string;
  system_closing_val: number;
  external_closing_val: number;
  net_variance_val: number;
  matched_lines_count: number;
  variance_lines_count: number;
  status: string;
  variance_status?: string;
  created_at?: string;
}

export interface PrincipalPosition {
  principal_id: string;
  principal_code: string;
  principal_name: string;
  status: string;
  agreement: {
    agreement_number: string;
    version_no: string;
    valid_from: string;
    valid_to: string;
    terms: Record<string, any>;
  };
  stock_summary: {
    total_quantity: number;
    total_valuation: number;
    lot_count: number;
  };
  stock_lines: PrincipalStockLine[];
  product_rules: {
    id: string;
    product_name: string;
    sku_code: string;
    is_exclusive: boolean;
    status: string;
  }[];
  claims: PrincipalClaimItem[];
  cost_attributions: PrincipalCostAttributionItem[];
  reconciliations: PrincipalReconciliationItem[];
}

export interface PrincipalStatement {
  principal_id: string;
  principal_code: string;
  principal_name: string;
  agreement_number: string;
  period: string;
  currency: string;
  figures: {
    opening_stock_qty: number;
    opening_stock_val: number;
    inward_qty: number;
    inward_val: number;
    sales_qty: number;
    sales_val: number;
    returns_qty: number;
    returns_val: number;
    closing_stock_qty: number;
    closing_stock_val: number;
    pending_claims_val: number;
    settled_claims_val: number;
    freight_cost_val: number;
    admin_borne_freight: number;
    commission_accrued: number;
  };
  lines: {
    date: string;
    category: string;
    source_doc: string;
    product_name: string;
    batch_no: string;
    qty: number;
    amount: number;
    status: string;
  }[];
}

// API functions
export async function apiGetPrincipalSummary(): Promise<{ success: boolean; summary: PrincipalSummaryKPI }> {
  const response = await apiClient.get('/api/principal/summary');
  return response.data;
}

export async function apiGetPrincipals(search?: string): Promise<{ success: boolean; principals: PrincipalListItem[]; count: number }> {
  const response = await apiClient.get('/api/principal/list', { params: search ? { search } : {} });
  return response.data;
}

export async function apiGetPrincipalPosition(principalId: string): Promise<{ success: boolean; position: PrincipalPosition }> {
  const response = await apiClient.get(`/api/principal/${principalId}/position`);
  return response.data;
}

export async function apiGetPrincipalStatement(principalId: string, params?: { period_from?: string; period_to?: string }): Promise<{ success: boolean; statement: PrincipalStatement }> {
  const response = await apiClient.get(`/api/principal/${principalId}/statement`, { params });
  return response.data;
}

export async function apiCreatePrincipalClaim(payload: {
  principal_id: string;
  claim_type: string;
  source_doc_type?: string;
  source_doc_id: string;
  product_id?: string;
  product_name?: string;
  batch_no?: string;
  claimed_qty: number;
  rate: number;
  claimed_amount?: number;
  reason?: string;
  evidence_url?: string;
}): Promise<{ success: boolean; message: string; claim: any }> {
  const response = await apiClient.post('/api/principal/claims', payload);
  return response.data;
}

export async function apiTakePrincipalClaimAction(
  claimId: string,
  payload: {
    action: string;
    approved_amount?: number;
    resolution_notes?: string;
  }
): Promise<{ success: boolean; message: string; claim: any }> {
  const response = await apiClient.post(`/api/principal/claims/${claimId}/action`, payload);
  return response.data;
}

export async function apiGetPrincipalReconciliations(principalId?: string): Promise<{ success: boolean; reconciliations: PrincipalReconciliationItem[]; count: number }> {
  const response = await apiClient.get('/api/principal/reconciliations', { params: principalId ? { principal_id: principalId } : {} });
  return response.data;
}

export async function apiRunPrincipalReconciliation(payload: {
  principal_id: string;
  period_from?: string;
  period_to?: string;
  external_closing_val?: number;
  discrepancy_reason?: string;
}): Promise<{ success: boolean; message: string; reconciliation: any }> {
  const response = await apiClient.post('/api/principal/reconciliation/run', payload);
  return response.data;
}

// ==========================================
// DOC-37: PRINCIPAL COMMISSION & RECOVERY ENGINE APIS
// ==========================================

export interface CommissionSummaryKPI {
  total_earned_commission: number;
  total_recoverable_expenses: number;
  net_commercial_total: number;
  open_claims_count: number;
  open_claims_amount: number;
  approved_claims_count: number;
  approved_claims_amount: number;
  total_disputed_amount: number;
  active_agreements_count: number;
  open_exceptions_count: number;
  total_settled: number;
  total_outstanding: number;
  as_of?: string;
}

export interface CommissionRuleItem {
  id: string;
  rule_code: string;
  rule_name: string;
  priority: number;
  rule_type: string;
  rate_pct: number;
  unit_rate: number;
  fixed_amount: number;
  min_guarantee_amount: number;
  formula_config?: any;
  status: string;
  scopes?: {
    id: string;
    product_scope: string;
    customer_scope: string;
    territory_scope: string;
  }[];
}

export interface CommissionAgreementItem {
  id: string;
  principal_id: string;
  principal_code: string;
  principal_name: string;
  agreement_code: string;
  version_no: string;
  valid_from: string;
  valid_to: string;
  status: string;
  terms_json?: any;
  rules: CommissionRuleItem[];
}

export interface CommissionCalculationItem {
  id: string;
  calculation_number: string;
  principal_id: string;
  principal_name: string;
  category: 'EARNED_COMMISSION' | 'RECOVERABLE_EXPENSE' | 'SERVICE_FEE';
  event_type?: string;
  client_id?: string;
  client_name?: string;
  base_value: number;
  rate_applied: number;
  calculated_amount: number;
  currency: string;
  formula_trace: string;
  state: 'CALCULATED' | 'REVIEW_REQUIRED' | 'APPROVED' | 'BATCHED' | 'RECOVERY_CREATED' | 'DISPUTED' | 'SETTLED' | 'CANCELLED';
  sha256_hash: string;
  created_at: string;
}

export interface RecoveryClaimLineItem {
  id: string;
  calc_id?: string;
  source_doc_type: string;
  source_doc_id: string;
  line_description: string;
  requested_amount: number;
  approved_amount: number;
  disputed_amount: number;
  status: string;
}

export interface RecoveryClaimItem {
  id: string;
  claim_number: string;
  principal_id: string;
  principal_name: string;
  period_from: string;
  period_to: string;
  total_earned_commission: number;
  total_recoverable_expenses: number;
  total_claimed_amount: number;
  approved_amount: number;
  disputed_amount: number;
  status: 'DRAFT' | 'READY' | 'SUBMITTED' | 'ACKNOWLEDGED' | 'APPROVED' | 'PARTIALLY_APPROVED' | 'DISPUTED' | 'RECOVERY_CREATED' | 'SETTLED' | 'REJECTED';
  submitted_at?: string;
  approved_at?: string;
  created_at: string;
  lines: RecoveryClaimLineItem[];
  linked_documents?: {
    id: string;
    document_type: string;
    document_number: string;
    amount: number;
    linked_at: string;
  }[];
}

export interface RecoveryStatementLineItem {
  id: string;
  category: string;
  reference_doc_id: string;
  description: string;
  amount: number;
}

export interface RecoveryStatementItem {
  id: string;
  statement_number: string;
  principal_id: string;
  principal_name: string;
  period_from: string;
  period_to: string;
  earned_commission: number;
  service_fees: number;
  expense_recovery: number;
  adjustments: number;
  approved_commercial: number;
  invoiced_total: number;
  settled_total: number;
  outstanding_balance: number;
  disputed_total: number;
  statement_hash: string;
  status: string;
  created_at: string;
  lines: RecoveryStatementLineItem[];
}

export async function apiGetCommissionSummary(): Promise<{ status: string; data: CommissionSummaryKPI }> {
  const response = await apiClient.get('/api/commission/summary');
  return response.data;
}

export async function apiGetCommissionAgreements(params?: { principal_id?: string; status?: string }): Promise<{ status: string; count: number; data: CommissionAgreementItem[] }> {
  const response = await apiClient.get('/api/commission/agreements', { params });
  return response.data;
}

export async function apiExecuteCommissionCalculation(payload: {
  principal_id: string;
  event_type?: string;
  source_doc_type?: string;
  source_doc_id: string;
  base_value: number;
  quantity?: number;
  category?: string;
  custom_rate?: number;
  rule_id?: string;
  description?: string;
  client_id?: string;
  client_name?: string;
  custom_salary_amount?: number;
  custom_rent_amount?: number;
}): Promise<{ status: string; message: string; data: CommissionCalculationItem }> {
  const response = await apiClient.post('/api/commission/calculate', payload);
  return response.data;
}

export async function apiUpdateAgreementDealTerms(
  agreementId: string,
  payload: {
    agreement_type?: string;
    cargo_expense_borne_by?: string;
    staff_salary_borne_by?: string;
    godown_storage_borne_by?: string;
    default_monthly_staff_salary?: number;
    default_monthly_godown_rent?: number;
    sales_commission_rate?: number;
  }
): Promise<{ status: string; message: string; data: any }> {
  const response = await apiClient.put(`/api/commission/agreements/${agreementId}/deal-terms`, payload);
  return response.data;
}

export async function apiGetClientsByCompany(companyId: string): Promise<{ status: string; count: number; data: any[] }> {
  const response = await apiClient.get(`/api/parties/clients-by-company/${companyId}`);
  return response.data;
}

export async function apiGetCommissionCalculations(params?: {
  principal_id?: string;
  category?: string;
  state?: string;
  limit?: number;
}): Promise<{ status: string; count: number; data: CommissionCalculationItem[] }> {
  const response = await apiClient.get('/api/commission/calculations', { params });
  return response.data;
}

export async function apiTakeCalculationAction(
  calcId: string,
  payload: { action: string; delta_amount?: number; reason?: string }
): Promise<{ status: string; message: string; data: any }> {
  const response = await apiClient.post(`/api/commission/calculations/${calcId}/action`, payload);
  return response.data;
}

export async function apiGetRecoveryClaims(params?: {
  principal_id?: string;
  status?: string;
}): Promise<{ status: string; count: number; data: RecoveryClaimItem[] }> {
  const response = await apiClient.get('/api/commission/claims', { params });
  return response.data;
}

export async function apiCreateRecoveryClaim(payload: {
  principal_id: string;
  period_from?: string;
  period_to?: string;
  calc_ids?: string[];
  lines?: any[];
  notes?: string;
}): Promise<{ status: string; message: string; data: any }> {
  const response = await apiClient.post('/api/commission/claims', payload);
  return response.data;
}

export async function apiTakeRecoveryClaimAction(
  claimId: string,
  payload: {
    action: string;
    approved_amount?: number;
    disputed_amount?: number;
    document_type?: string;
    notes?: string;
  }
): Promise<{ status: string; message: string; data: any }> {
  const response = await apiClient.post(`/api/commission/claims/${claimId}/action`, payload);
  return response.data;
}

export async function apiGetRecoveryStatements(principalId?: string): Promise<{ status: string; count: number; data: RecoveryStatementItem[] }> {
  const response = await apiClient.get('/api/commission/statements', { params: principalId ? { principal_id: principalId } : {} });
  return response.data;
}

export async function apiGenerateRecoveryStatement(payload: {
  principal_id: string;
  period_from?: string;
  period_to?: string;
}): Promise<{ status: string; message: string; data: any }> {
  const response = await apiClient.post('/api/commission/statements/generate', payload);
  return response.data;
}

export async function apiGetCommissionExceptions(state?: string): Promise<{ status: string; count: number; data: any[] }> {
  const response = await apiClient.get('/api/commission/exceptions', { params: state ? { state } : {} });
  return response.data;
}

export async function apiResolveCommissionException(exId: string): Promise<{ status: string; message: string }> {
  const response = await apiClient.post(`/api/commission/exceptions/${exId}/resolve`);
  return response.data;
}

export async function apiGetCommissionAudits(limit?: number): Promise<{ status: string; count: number; data: any[] }> {
  const response = await apiClient.get('/api/commission/audits', { params: limit ? { limit } : {} });
  return response.data;
}

// ─────────────────────────────────────────────────────────────
// C&F Client Management Commission & Expense Billing
// ─────────────────────────────────────────────────────────────

export interface ClientCommissionTelemetry {
  client_org_id: string;
  client_name: string;
  client_code: string;
  sales_turnover: number;
  invoices_count: number;
  default_commission_rate: number;
  suggested_commission: number;
  default_godown_rent: number;
  default_staff_salary: number;
  default_freight_cost: number;
  default_handling_charges: number;
  tax_rate_percent: number;
}

export interface GenerateClientBillPayload {
  client_org_id: string;
  period_from?: string;
  period_to?: string;
  sales_turnover: number;
  commission_rate_percent: number;
  commission_amount: number;
  godown_rent_amount?: number;
  staff_salary_amount?: number;
  freight_reimbursement_amount?: number;
  handling_charges_amount?: number;
  other_expenses_amount?: number;
  tax_rate_percent?: number;
  remarks?: string;
  due_days?: number;
  auto_post_client_purchase?: boolean;
}

export interface ClientCommissionBillItem {
  id: string;
  invoice_number: string;
  date: string;
  customer_name: string;
  subtotal: number;
  tax_total: number;
  grand_total: number;
  due_date?: string;
  remarks?: string;
  inward_bill_no?: string;
  items_count: number;
}

export async function apiGetClientCommissionTelemetry(clientOrgId: string): Promise<{ status: string; data: ClientCommissionTelemetry }> {
  const response = await apiClient.get(`/api/commission/clients/${clientOrgId}/telemetry`);
  return response.data;
}

export async function apiGenerateClientCommissionBill(payload: GenerateClientBillPayload): Promise<{ status: string; message: string; data: any }> {
  const response = await apiClient.post('/api/commission/generate-client-bill', payload);
  return response.data;
}

export async function apiGetClientCommissionBills(): Promise<{ status: string; count: number; data: ClientCommissionBillItem[] }> {
  const response = await apiClient.get('/api/commission/client-bills');
  return response.data;
}

// ─────────────────────────────────────────────────────────────
// Enterprise Admin Multi-Client Tracking Engine (Main Admin Company)
// ─────────────────────────────────────────────────────────────

export interface AdminTrackingSummary {
  total_clients_count: number;
  total_sales_turnover: number;
  total_sales_invoices_count: number;
  total_expenses_amount: number;
  total_cargo_consignments: number;
  active_in_transit_cargo: number;
  delivered_cargo_count: number;
  exceptions_cargo_count: number;
  total_cargo_freight_cost: number;
  total_product_companies_count: number;
}

export interface ClientScorecardItem {
  organization_id: string;
  organization_name: string;
  org_code: string;
  is_am: boolean;
  total_sales_turnover: number;
  sales_invoices_count: number;
  total_expenses: number;
  active_consignments_count: number;
  total_consignments_count: number;
  mapped_product_companies_count: number;
  mapped_companies: {
    manufacturer_id: string;
    name: string;
    short_code?: string;
    is_primary: boolean;
    commission_rate_override?: number | null;
  }[];
}

export interface AdminSalesInvoiceItem {
  id: string;
  invoice_number: string;
  date: string;
  client_org_id: string;
  client_name: string;
  client_code: string;
  customer_name?: string | null;
  grand_total: number;
  invoice_type: string;
  items_count: number;
}

export interface AdminSalesTrackingResponse {
  total_gross_turnover: number;
  total_invoices_count: number;
  client_breakdown: {
    client_org_id: string;
    client_name: string;
    client_code: string;
    turnover: number;
    invoices_count: number;
  }[];
  invoices: AdminSalesInvoiceItem[];
}

export interface AdminExpenseItem {
  id: string;
  claim_number: string;
  date: string;
  client_org_id: string;
  client_name: string;
  client_code: string;
  total_amount: number;
  status: string;
  remarks?: string | null;
}

export interface AdminExpenseTrackingResponse {
  total_expenses_amount: number;
  category_breakdown: {
    category_name: string;
    total_amount: number;
  }[];
  client_breakdown: {
    client_org_id: string;
    client_name: string;
    client_code: string;
    total_amount: number;
    claims_count: number;
  }[];
  items: AdminExpenseItem[];
}

export interface AdminCargoItem {
  id: string;
  consignment_number: string;
  document_number?: string | null;
  client_org_id: string;
  client_name: string;
  client_code: string;
  transporter_name: string;
  vehicle_no?: string | null;
  driver_name?: string | null;
  driver_phone?: string | null;
  origin_hub: string;
  destination_hub: string;
  lr_no?: string | null;
  status: string;
  is_admin_funded: boolean;
  gross_cost: number;
  created_at: string;
}

export interface AdminCargoTrackingResponse {
  total_consignments: number;
  in_transit_count: number;
  delivered_count: number;
  exceptions_count: number;
  total_freight_cost: number;
  client_breakdown: {
    client_org_id: string;
    client_name: string;
    client_code: string;
    consignments_count: number;
  }[];
  consignments: AdminCargoItem[];
}

export async function apiGetAdminTrackingSummary(): Promise<AdminTrackingSummary> {
  const res = await apiClient.get<AdminTrackingSummary>('/api/admin/tracking/summary');
  return res.data;
}

export async function apiGetAdminClientScorecards(): Promise<ClientScorecardItem[]> {
  const res = await apiClient.get<ClientScorecardItem[]>('/api/admin/tracking/clients');
  return res.data;
}

export async function apiGetAdminSalesTracking(params?: {
  client_org_id?: string;
  company_id?: string;
  from_date?: string;
  to_date?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<AdminSalesTrackingResponse> {
  const res = await apiClient.get<AdminSalesTrackingResponse>('/api/admin/tracking/sales', { params });
  return res.data;
}

export async function apiGetAdminExpenseTracking(params?: {
  client_org_id?: string;
  status?: string;
  from_date?: string;
  to_date?: string;
  limit?: number;
  offset?: number;
}): Promise<AdminExpenseTrackingResponse> {
  const res = await apiClient.get<AdminExpenseTrackingResponse>('/api/admin/tracking/expenses', { params });
  return res.data;
}

export async function apiGetAdminCargoTracking(params?: {
  client_org_id?: string;
  status?: string;
  transporter?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<AdminCargoTrackingResponse> {
  const res = await apiClient.get<AdminCargoTrackingResponse>('/api/admin/tracking/cargo', { params });
  return res.data;
}







