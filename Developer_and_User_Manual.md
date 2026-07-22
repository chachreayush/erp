# ERP — Developer & User Manual
### A Complete, Plain-English Guide to Every File, Function & Variable

**Document Type:** Living Document (updated after every sprint)
**Owner:** chachreayush
**Repository:** https://github.com/chachreayush/erp
**Current Sprint:** Sprint 1 — Foundation & UI Shell
**Last Updated:** 2026-07-19

---

## How to Read This Document

This manual is written so that:
- A **developer** can understand the exact logic, variable names, and code flows.
- A **non-developer** (like the business owner) can understand what each screen does, why each button behaves the way it does, and how data moves through the system.

Each section covers one file. Every file section explains:
1. **Purpose** — What is this file for?
2. **Variables** — What are the named pieces of data it holds and why?
3. **Functions** — What does each function do, step by step?
4. **UI Flow** — What does the user actually see and do?

---

---

# PART 1: THE ENTRY POINT
---

## File: `src/main.tsx`
**Location in Project:** `C:\Users\DELL\OneDrive\Desktop\erp\src\main.tsx`

### Purpose
This is the very first file that runs when the ERP application launches. It is like the front door of the entire app. Nothing else can run until this file runs first. It has one job: set up the core services and attach the visual app to the web page.

---

### Variable: `queryClient`
```
const queryClient = new QueryClient({ ... })
```
**What it is:** A central data cache manager for the entire application. Think of it as a smart filing cabinet that remembers every piece of data ever fetched from the server, so the app doesn't need to ask the server for the same data twice unnecessarily.

**Its settings explained:**
| Setting | Value | What it means in plain English |
|---|---|---|
| `staleTime` | `5 * 60 * 1000` (5 minutes) | Data fetched from the server is considered "fresh" for 5 minutes. The app will NOT go back to the server within those 5 minutes even if you switch pages. Good for ERP data like product lists. |
| `retry` | `1` | If a server request fails due to a network hiccup, try one more time automatically before showing an error to the user. |
| `refetchOnWindowFocus` | `false` | If the user clicks on another window (like WhatsApp) and comes back, do NOT re-run all server requests. ERP data is stable; it doesn't change every second. |

---

### What happens when the app launches (Step-by-step):
1. React is imported so the app can build visual screens.
2. `ReactDOM` is imported, which is the tool that injects the app into the actual HTML web page.
3. `QueryClient` is created (the filing cabinet for server data).
4. The code finds the `<div id="root">` element inside `index.html` and uses it as the mounting point.
5. Inside that mounting point, it places 3 wrappers in layers, then the App itself:
   - **Layer 1 (`StrictMode`):** Only active during development. Runs every function twice to catch bugs and show extra warnings. Has zero effect on the final production software.
   - **Layer 2 (`QueryClientProvider`):** Passes the `queryClient` filing cabinet down to every single component in the app, so any component can access cached data.
   - **Layer 3 (`BrowserRouter`):** Enables URL-based navigation. Without this, clicking "Finance" would not change what is displayed—it would do nothing. This makes the app behave like a multi-page website.
   - **Inside: `<App />`** — The entire application.

---
---

# PART 2: GLOBAL MEMORY (STORES)
---

## File: `src/store/authStore.ts`
**Location in Project:** `C:\Users\DELL\OneDrive\Desktop\erp\src\store\authStore.ts`

### Purpose
This file is the **global memory** of the ERP for everything related to who is logged in. It uses a library called **Zustand** which is simply a way to store data so that ANY component in the app — no matter how far away — can read or update the same data without passing it manually.

**Real-world analogy:** Think of this like a whiteboard in the office. Any employee (any component) can walk up, read what's on it, or write on it. When someone updates the whiteboard, every employee who was looking at it sees the change instantly.

This store is also **persistent** — it saves its data to the computer's `localStorage` (a small built-in browser storage). So when the user closes and reopens the app, they are still logged in without needing to type their password again.

---

### Type Definitions (The Blueprints)

Before explaining the actual data, the file defines "blueprints" (called TypeScript types/interfaces). These are descriptions of what shape the data must be in. They are not data themselves — they are the rules.

#### Type: `AppMode`
```
type AppMode = 'lan' | 'remote' | 'server' | null
```
This describes the 4 possible connection states of the app at any given moment:
| Value | Meaning |
|---|---|
| `'lan'` | The app found the main server on the local office network. It talks directly to it. |
| `'remote'` | No server was found on the LAN. The app is connected to the cloud (Supabase). |
| `'server'` | This specific computer IS the main server. The user has full admin capabilities. |
| `null` | The app just started and hasn't finished scanning the network yet. |

#### Type: `UserRole`
```
type UserRole = 'am_admin' | 'cm_admin' | 'manager' | 'area_manager' | 'staff' | 'field_staff' | 'viewer'
```
This defines the 7 levels of authority in the system. Every user has exactly one role:
| Role | Authority Level | What they can do |
|---|---|---|
| `am_admin` | Highest | God mode. Sees everything across all companies. Only the system owner. |
| `cm_admin` | Very High | Full control within their own company only. Cannot see other companies. |
| `manager` | High | Can approve transactions, view all team activity, run reports. |
| `area_manager` | Medium-High | Regional view — sees their geographic area's sales and field team. |
| `staff` | Medium | Day-to-day ERP operations — billing, inventory, customer management. |
| `field_staff` | Medium-Low | Primarily for field visits and sales. Mobile-focused, limited screens. |
| `viewer` | Lowest | Read-only. Can see everything, but cannot create, edit, or delete anything. |

#### Interface: `ModulePermission`
```
interface ModulePermission {
  view:    boolean  // Can the user see this module at all?
  create:  boolean  // Can the user create new records?
  edit:    boolean  // Can the user edit existing records?
  delete:  boolean  // Can the user delete records?
  approve: boolean  // Can the user approve pending actions?
}
```
This is the permission template for a SINGLE module (e.g., Finance). Each of the 5 flags is either `true` (allowed) or `false` (blocked).

**Example — A "Staff" user for Finance:**
```
finance: { view: true, create: true, edit: true, delete: false, approve: false }
```
This means: The staff member can see finance, create invoices, and edit them — but CANNOT delete records or approve pending transactions.

#### Interface: `UserPermissions`
```
interface UserPermissions {
  finance, inventory, sales, crm, hr, reports, settings
}
```
This is simply a container that holds one `ModulePermission` block for EVERY ERP module. So a complete user's permission set would look like:
```
{
  finance:    { view: true,  create: true,  edit: true,  delete: false, approve: false },
  inventory:  { view: true,  create: true,  edit: true,  delete: false, approve: false },
  sales:      { view: true,  create: true,  edit: true,  delete: false, approve: false },
  crm:        { view: true,  create: false, edit: false, delete: false, approve: false },
  hr:         { view: false, create: false, edit: false, delete: false, approve: false },
  reports:    { view: true,  create: false, edit: false, delete: false, approve: false },
  settings:   { view: false, create: false, edit: false, delete: false, approve: false }
}
```
HR shows `view: false` — this means the "HR Management" link is completely hidden from their sidebar. They don't even know it exists.

#### Interface: `AuthUser`
This is the complete profile of the person logged in. When login succeeds, the server sends back all of this information:
| Field | Type | Example | What it means |
|---|---|---|---|
| `id` | string | `"user-001"` | Unique database ID for this user (used to look them up in the database) |
| `name` | string | `"Rahul Sharma"` | Full display name shown in the header and sidebar |
| `username` | string | `"rahul.sharma"` | The username they type in the login box |
| `email` | string | `"rahul@company.com"` | Email address for notifications |
| `role` | UserRole | `"manager"` | Their authority level (see UserRole table above) |
| `companyId` | string | `"MUM-6135"` | Their company's unique code — links them to the correct isolated database |
| `companyName` | string | `"Mumbai Traders"` | The readable company name shown in the sidebar header |
| `isAmUser` | boolean | `false` | If `true`, they belong to the AM (owner) company. If `false`, they belong to a client company. |
| `permissions` | UserPermissions | `{ finance: {...}, ... }` | Their full detailed permissions for every module |
| `avatarUrl` | string (optional) | `"https://..."` | Optional profile photo URL. If not set, the app shows their initials instead. |

---

### State Variables (The Data on the Whiteboard)
These are the actual pieces of data that the store holds at runtime:

| Variable | Type | Initial Value | What changes it |
|---|---|---|---|
| `user` | `AuthUser \| null` | `null` | Set by `login()`, cleared by `logout()` |
| `token` | `string \| null` | `null` | Set by `login()`, cleared by `logout()`. Used in every API call. |
| `appMode` | `AppMode` | `null` | Set by `setAppMode()` after LAN scan completes |
| `serverUrl` | `string \| null` | `null` | Set by `setAppMode()` if a LAN server is found (e.g., `"http://192.168.1.5:8000"`) |
| `isLoading` | `boolean` | `false` | Set to `true` when login starts, `false` when it finishes |
| `error` | `string \| null` | `null` | Set by `setError()` to display error text under the login form |

---

### Functions (Actions)

#### Function: `setAppMode(mode, serverUrl?)`
**Called by:** The Login page's LAN discovery timer.
**What it does:** Updates the `appMode` and optionally the `serverUrl` in the store.

**Step-by-step:**
1. Receives the mode (e.g., `'remote'`) and optionally a server URL.
2. Calls Zustand's `set()` function to update the whiteboard.
3. If `serverUrl` is not provided, it stores `null` (`??` is the "null coalescing operator" — it means "use this value, OR null if it's missing").
4. Every component reading `appMode` from the store will instantly re-render.

#### Function: `login(user, token)`
**Called by:** The Login page after a successful authentication response from the server.
**What it does:** Stores the logged-in user's profile and their security token.

**Step-by-step:**
1. Receives the `user` object (full profile) and `token` (the secret key for API calls).
2. Writes both to the store.
3. Also sets `isLoading: false` (hides the loading spinner) and `error: null` (clears any old error message).
4. Because `persist` middleware is active, these values are also automatically saved to `localStorage` on the computer's hard drive.

#### Function: `logout()`
**Called by:** The Header component when the user clicks "Logout".
**What it does:** Clears the user and token from memory, effectively logging them out.

**Step-by-step:**
1. Sets `user` to `null` and `token` to `null`.
2. **Intentionally keeps `appMode` and `serverUrl`** — so when the user logs in again on the same computer, the app doesn't need to scan the network again.
3. The `persist` middleware automatically removes the saved user data from `localStorage`.
4. The `ProtectedRoute` in `App.tsx` detects that `user` is `null` and instantly redirects to `/login`.

#### Function: `setLoading(loading: boolean)`
**Called by:** The Login page's `handleSubmit` function.
**What it does:** Simply sets `isLoading` to `true` or `false`. This controls whether the loading spinner shows on the login button.

#### Function: `setError(error: string | null)`
**Called by:** The Login page's `handleSubmit` and `handleKeyDown` functions.
**What it does:** Sets the error message text shown in the red box below the login form. Passing `null` clears the error.

#### Function: `hasPermission(module, action)` → returns `true` or `false`
**Called by:** The Sidebar to decide which nav buttons to show, and later by any page component to decide if a button should be visible.

**Step-by-step:**
1. Reads the current `user` from the store using `get()` (a special Zustand function that reads without subscribing to changes).
2. If `user` is `null` (nobody logged in), immediately returns `false`. No access to anything.
3. If a user IS logged in, it looks up `user.permissions[module][action]`.
   - Example: `hasPermission('finance', 'delete')` looks up `user.permissions.finance.delete` and returns its `true` or `false` value.
4. The `?.` (optional chaining) means "if this exists, go deeper; if not, don't crash — just return undefined." And `?? false` means "if the result is undefined, treat it as false."

---

## File: `src/store/themeStore.ts`
**Location:** `C:\Users\DELL\OneDrive\Desktop\erp\src\store\themeStore.ts`

### Purpose
A small, focused store that holds the user's chosen visual theme for the application. Works exactly like `authStore` but only manages one piece of data: the active theme name.

---

### Type: `ThemeOption`
```
type ThemeOption = 'default' | 'glass' | 'minimal' | 'enterprise'
```
The 4 valid theme names. Using a type like this means the code cannot accidentally set the theme to something invalid like `'purple'` — TypeScript would show an error.

| Value | What it activates |
|---|---|
| `'default'` | Dark indigo enterprise theme (the starting theme) |
| `'glass'` | Dark purple glassmorphism theme with frosted panels |
| `'minimal'` | Clean white light mode, maximum readability |
| `'enterprise'` | Deep navy blue professional theme |

### Variable: `activeTheme`
```
activeTheme: 'default'
```
Holds the currently selected theme name. Initial value is `'default'`. Saved to `localStorage` under the key `'merge-erp-theme'`.

### Function: `setTheme(theme)`
**Called by:** The Settings page when the user clicks a theme option.
**What it does:** Updates `activeTheme` to the new theme name.
**Side effect:** The `ThemeProvider` component is watching this variable. The moment it changes, `ThemeProvider` updates the CSS class on the HTML body, instantly changing every color in the app.

---
---

# PART 3: THE LAYOUT SHELL
---

## File: `src/App.tsx`
**Location:** `C:\Users\DELL\OneDrive\Desktop\erp\src\App.tsx`

### Purpose
Defines the "road map" of the entire application — which URL path shows which page. It also contains the security gate (`ProtectedRoute`) that prevents non-logged-in users from seeing any page other than Login.

---

### Component: `ProtectedRoute`
**What it does:** Acts as a security guard. Before showing any protected page, it checks if the user is logged in.

**Step-by-step logic:**
1. It reads `user` from `authStore`.
2. If `user` is `null` → Redirects to `/login`. The `replace` option means the login page replaces the current page in history, so pressing the browser's Back button won't bring them to a protected page.
3. If `user` exists → Renders the actual requested page (`{children}`).

### Component: `App()`
**What it does:** The main routing configuration. It defines the map:
| URL Path | Component Shown | Protected? |
|---|---|---|
| `/login` | `LoginPage` | No — anyone can see this |
| `/` (root) | `DashboardPage` inside `AppShell` | Yes — must be logged in |
| `/settings` | `SettingsPage` inside `AppShell` | Yes |
| Any unknown URL | Redirects to `/` | — |

The entire app is also wrapped in `<ThemeProvider>` — the outermost layer — so themes affect every page including the Login page.

---

## File: `src/components/Layout/AppShell.tsx`
**Location:** `C:\Users\DELL\OneDrive\Desktop\erp\src\components\Layout\AppShell.tsx`

### Purpose
The master frame that holds the persistent layout for all logged-in pages. It is like a picture frame: the frame (sidebar + header) stays the same, but the picture inside (the page content) changes when you click different modules.

**Visual Layout:**
```
┌────────────────────────────────────────────┐
│              HEADER (56px tall)            │
├────────────┬───────────────────────────────┤
│            │                               │
│  SIDEBAR   │       PAGE CONTENT            │
│  (240px)   │    <Outlet /> renders here    │
│            │                               │
└────────────┴───────────────────────────────┘
```

**What is `<Outlet />`?** It is a React Router placeholder. When the user is on `/settings`, the Settings page component is automatically placed inside the Outlet. When they navigate to `/`, the Dashboard component appears there. The Sidebar and Header never change — only the Outlet content does.

---

## File: `src/components/Layout/ThemeProvider.tsx`
**Location:** `C:\Users\DELL\OneDrive\Desktop\erp\src\components\Layout\ThemeProvider.tsx`

### Purpose
A "silent" component — it renders no visible UI. Its only job is to listen to the `themeStore` and update the CSS classes on the HTML body element whenever the theme changes.

### `useEffect` hook — The core logic
```javascript
useEffect(() => {
  document.body.classList.remove('theme-default', 'theme-glass', 'theme-minimal', 'theme-enterprise')
  document.body.classList.add(`theme-${activeTheme}`)
}, [activeTheme])
```
**Step-by-step:**
1. `[activeTheme]` — This effect runs every time `activeTheme` changes.
2. First, it REMOVES all 4 possible theme classes from the `<body>` tag. This ensures only one theme is ever active at a time — no conflicts.
3. Then, it ADDS the new theme class. For example, if `activeTheme = 'minimal'`, it adds `class="theme-minimal"` to the body.
4. Because all the CSS color variables are defined inside `.theme-minimal { }` in `index.css`, every single element in the entire app that uses `var(--color-bg)` (or any other CSS variable) instantly gets the new color.

---

## File: `src/components/Layout/Header.tsx`
**Location:** `C:\Users\DELL\OneDrive\Desktop\erp\src\components\Layout\Header.tsx`

### Purpose
The top bar of the application. Fixed in position — always visible regardless of page content below.

---

### Variables

| Variable | What it holds | Where it comes from |
|---|---|---|
| `user` | The full `AuthUser` profile of the logged-in person | Read from `authStore` |
| `logout` | The logout function from the store | Read from `authStore` |
| `userMenuOpen` | `true` or `false` — whether the user dropdown is currently open | Local state (`useState`) |
| `navigate` | A function to programmatically change the page URL | React Router's `useNavigate` hook |

### Function: `handleLogout()`
**Triggered by:** Clicking the "Logout" button inside the user dropdown menu.
**What it does:**
1. Calls `logout()` from the auth store — wipes the user and token from memory AND from `localStorage`.
2. Calls `navigate('/login')` — immediately redirects the browser to the login page.

### UI Elements & Interactions

| Element | What happens when clicked/triggered |
|---|---|
| Notification Bell button | Shows a pulsing red dot badge. Currently does nothing when clicked (wired in Epic 9). |
| User Avatar button | Toggles `userMenuOpen` state. When `true`, the dropdown appears. |
| User Initials display | Extracts the first letter of each word in the user's name (e.g., "Rahul Sharma" → "RS") using `.split(' ').map(n => n[0]).slice(0,2).join('')` |
| ChevronDown icon | Rotates 180° using CSS `transform: rotate(180deg)` when `userMenuOpen` is `true`. |
| Logout button (inside dropdown) | Calls `handleLogout()`. Styled in red to signal a destructive/important action. |

---

## File: `src/components/Layout/Sidebar.tsx`
**Location:** `C:\Users\DELL\OneDrive\Desktop\erp\src\components\Layout\Sidebar.tsx`

### Purpose
The left navigation panel. Shows the user all the ERP modules they can access. Crucially, it **hides modules the user does not have permission to see** — they never see a greyed-out button, they simply don't see it at all.

---

### Constant: `NAV_ITEMS`
```
const NAV_ITEMS: NavItem[] = [ ... ]
```
A static, hardcoded list of all possible navigation items. Each item has:
| Field | Example | What it does |
|---|---|---|
| `label` | `'Finance & Accounting'` | The text displayed on the button |
| `path` | `'/finance'` | The URL the browser goes to when clicked |
| `icon` | `<Receipt size={18} />` | The visual icon shown to the left of the label |
| `module` | `'finance'` | The key used to check `hasPermission` — if `undefined`, always shown |

### Variables in the Component

| Variable | What it holds | How it's used |
|---|---|---|
| `location` | The current URL path (e.g., `"/settings"`) | Used by `isActive()` to highlight the current page |
| `navigate` | Function to change the URL | Called `onClick` for each nav button |
| `user` | The logged-in user's profile | Used to display name and company at the bottom of sidebar |
| `hasPermission` | The permission-checking function from authStore | Used to filter `NAV_ITEMS` |
| `appMode` | The current connection mode | Used to show "LAN Connected" or "Remote" badge |
| `visibleNavItems` | The filtered list of nav items the user is allowed to see | This is what gets rendered in the sidebar |

### Function: `isActive(path)` → returns `true` or `false`
**Purpose:** Determines whether a given navigation item should be highlighted as the "current page".

**Logic:**
- For the Dashboard (`path === '/'`): only returns `true` if the URL is EXACTLY `/`. This prevents Dashboard from being highlighted when you're on `/finance`.
- For all other pages: returns `true` if the current URL **starts with** the given path. This means `/finance/invoices` would correctly highlight the Finance nav item.

### How Permission Filtering Works (Step-by-step)
```javascript
const visibleNavItems = NAV_ITEMS.filter(item => {
  if (!item.module) return true
  return hasPermission(item.module, 'view')
})
```
1. `NAV_ITEMS.filter()` goes through every item in the list one by one.
2. For each item, if `item.module` is `undefined` (like Dashboard), it always includes it (`return true`).
3. Otherwise, it asks `hasPermission('finance', 'view')` — which checks the logged-in user's `permissions.finance.view` flag.
4. If that flag is `false`, the item is **excluded** from the list entirely.
5. Only the filtered `visibleNavItems` array is rendered — so buttons for blocked modules don't even exist in the HTML.

---
---

# PART 4: THE PAGES
---

## File: `src/pages/Login.tsx`
**Location:** `C:\Users\DELL\OneDrive\Desktop\erp\src\pages\Login.tsx`

### Purpose
The Login page is the first screen every user sees. It handles two very different login scenarios automatically, without any input from the user.

---

### Helper Function: `fullPermissions()`
**Called by:** `handleSubmit` during demo/development login.
**What it does:** Creates and returns a `UserPermissions` object where every single permission flag is set to `true`. This grants the demo user full access to everything — all modules, create, edit, delete, and approve.

**Why it exists:** In production, permissions will come from the database. During development, we need a way to test all screens without a real backend, so this function creates a fake "superuser" permission set.

---

### State Variables in `LoginPage`

These are the "pieces of paper" the component holds in memory while the user is on this screen:

| Variable | Initial Value | What changes it | What it controls |
|---|---|---|---|
| `companyId` | `''` (empty) | User typing in the Company ID box | The value shown in the Company ID input |
| `username` | `''` (empty) | User typing in the Username box | The value shown in the Username input |
| `password` | `''` (empty) | User typing in the Password box | The value shown in the Password input |
| `showPassword` | `false` | Clicking the eye icon button | `true` = password visible as text, `false` = shown as dots |
| `isDetecting` | `true` | LAN discovery `useEffect` | `true` = scanning animation shows, form is hidden |
| `isSubmitting` | `false` | `handleSubmit` function | `true` = button shows spinner and is disabled |

### Global Store Variables Used

| Variable | Comes from | What it does in this component |
|---|---|---|
| `appMode` | `authStore` | If `'remote'`, shows the extra Company ID input field |
| `error` | `authStore` | If not `null`, shows the red error box below the form |
| `setAppMode` | `authStore` | Called by the LAN discovery timer to set `'remote'` mode |
| `login` | `authStore` | Called on successful sign-in to save user profile to global memory |
| `setLoading` | `authStore` | Called to show/hide the global loading state |
| `setError` | `authStore` | Called to set or clear the error message |
| `navigate` | React Router | Called to redirect to `/` (Dashboard) after successful login |
| `firstInputRef` | `useRef` | Points to the first input box — used for auto-focus |

---

### Functions in `LoginPage`

#### `useEffect` #1 — LAN Server Discovery
**When it runs:** Once, the moment the Login page appears on screen (because the dependency array `[]` is empty).

**Step-by-step:**
1. First, it checks: does `appMode` already have a value (e.g., the user refreshed the page and the mode was saved in `localStorage`)? If yes, skip the scan, set `isDetecting` to `false`, and stop.
2. If `appMode` is null (first-ever launch), it sets `isDetecting: true` to show the scanning animation.
3. It creates a `discoveryTimeout` using `setTimeout` — a timer that fires after 2000 milliseconds (2 seconds).
4. When the timer fires, it calls `setAppMode('remote')` — telling the whole app we're in remote mode.
5. Sets `isDetecting: false` — hides the scanning animation and reveals the login form.
6. **Cleanup:** The function returns `() => clearTimeout(discoveryTimeout)`. This is a cleanup function — if the user navigates away from the Login page before 2 seconds, the timer is cancelled so it doesn't fire and cause errors on an unmounted component.

> 📌 **For Sprint 2:** This 2-second timer will be replaced with a real UDP broadcast using Tauri's shell plugin to genuinely scan the local network for the server.

#### `useEffect` #2 — Auto-Focus the First Input
**When it runs:** Every time `isDetecting` changes.

**Step-by-step:**
1. It checks: is `isDetecting` now `false` (scan is done) AND does `firstInputRef.current` exist (the input box is rendered)?
2. If both are true, it calls `.focus()` on the input element.
3. This moves the cursor directly into the first text field, so the user can start typing their Company ID or Username immediately without clicking.

#### `handleKeyDown(e)` — Keyboard Submit
**Called by:** Each input field's `onKeyDown` event (fires when the user presses any key while typing in a field).
**What it does:** Checks if the pressed key is `Enter`. If it is, calls `handleSubmit()`. This means the user can submit the form without clicking the button — just press Enter from any field.

#### `handleSubmit()` — The Main Login Logic
**Called by:** The "Sign In" button's `onClick` and `handleKeyDown`.
**Is async:** Yes — because it needs to wait for the server response (a network request takes time).

**Complete step-by-step flow:**
1. **Validation — Company ID check:** If mode is `'remote'` AND the Company ID box is empty (`!companyId.trim()` — `.trim()` removes spaces), call `setError('Please enter your Company ID')` and `return` (stop). The error message appears below the form.
2. **Validation — Username check:** If username is empty, show error and stop.
3. **Validation — Password check:** If password is empty, show error and stop.
4. **Clear errors:** Call `setError(null)` to remove any old error message.
5. **Start loading:** Set `isSubmitting: true` (disables the button, shows spinner) and `setLoading(true)` (updates global store).
6. **API Call (currently simulated):** `await new Promise(resolve => setTimeout(resolve, 800))` — waits 800ms to simulate a real network request. In production, this will be replaced with a `fetch` or `axios` call to the FastAPI server.
7. **Demo success check:** If `username` and `password` are not empty strings (any values work during development), create a fake `mockUser` object with the values the user typed.
8. **Store the session:** Call `login(mockUser, 'demo-token-...')` to save the user to global memory and `localStorage`.
9. **Redirect:** Call `navigate('/')` to go to the Dashboard.
10. **`catch` block:** If ANY unexpected error occurs (like a JavaScript runtime error), show a generic connection failure message.
11. **`finally` block:** This ALWAYS runs whether the login succeeded or failed. It resets `isSubmitting: false` and `setLoading(false)` to hide the spinner.

---

### Shared Style Objects

#### `inputStyle`
A single CSS style object applied to every text input on the login form. Defined once to keep all inputs looking identical. Changing this object changes the look of ALL inputs at once.

**Key properties:**
| Property | Value | What it does |
|---|---|---|
| `width: '100%'` | Full width | Input stretches to fill its container |
| `padding: '10px 14px'` | Comfortable click area | Makes the input box easy to click/tap |
| `backgroundColor` | `var(--color-bg-elevated)` | Uses the theme variable — auto-updates when theme changes |
| `outline: 'none'` | Removes browser default outline | We define our own focus ring via CSS for consistency |
| `transition` | Border and shadow | Smooth animation when the input gets focus |

#### `labelStyle`
Style for all form labels (the small text above each input like "USERNAME"). Uppercase letters and spaced-out characters give it a professional form appearance.

---

## File: `src/pages/Dashboard.tsx`
**Location:** `C:\Users\DELL\OneDrive\Desktop\erp\src\pages\Dashboard.tsx`

### Purpose
The home page of the ERP — the first thing the user sees after logging in.

### Sub-component: `StatCard`
A reusable card that displays a single KPI (Key Performance Indicator) metric. Accepts these props:
| Prop | What it shows |
|---|---|
| `label` | The metric name (e.g., "Today's Revenue") |
| `value` | The metric value (e.g., "₹4,28,500") |
| `change` | Optional percentage change text (e.g., "+12% vs last month") |
| `positive` | Whether the change is good (green) or bad (red) |
| `icon` | The icon to display in the colored badge |
| `color` | The background color of the icon badge |

**Why it's a separate component:** The Dashboard shows 4 of these cards in a row. By making it a component, we define the style once and reuse it 4 times, keeping the code DRY (Don't Repeat Yourself).

### Variables in `DashboardPage`

| Variable | What it holds | How it's used |
|---|---|---|
| `user` | The logged-in user's profile from `authStore` | Used for the greeting: "Good morning, Rahul 👋" |
| `hour` | `new Date().getHours()` — the current hour (0-23) | Used to determine the greeting |
| `greeting` | `'Good morning'`, `'Good afternoon'`, or `'Good evening'` | Displayed in the H1 heading |

**Greeting logic:**
- `hour < 12` → "Good morning" (midnight to 11:59 AM)
- `hour < 17` → "Good afternoon" (12:00 PM to 4:59 PM)
- else → "Good evening" (5:00 PM onwards)

**First name extraction:** `user?.name?.split(' ')[0]` — splits "Rahul Sharma" by spaces into `["Rahul", "Sharma"]` and takes index `[0]` to get just "Rahul".

---

## File: `src/pages/Settings.tsx`
**Location:** `C:\Users\DELL\OneDrive\Desktop\erp\src\pages\Settings.tsx`

### Purpose
The Settings module. Currently contains the Theme & Appearance section. More settings sections will be added in future sprints.

### Constant: `THEME_OPTIONS`
An array of objects describing each available theme. Each object has:
| Field | What it's for |
|---|---|
| `id` | The ThemeOption string value (e.g., `'minimal'`) — passed to `setTheme()` |
| `name` | The readable label shown on the card (e.g., `'Neumorphic Minimalist'`) |
| `description` | A one-line description of the theme's style |
| `colors` | An array of 3 hex colors shown as preview swatches in the card |

### Variables in `SettingsPage`

| Variable | What it holds | Where it comes from |
|---|---|---|
| `activeTheme` | The currently selected theme name | `themeStore` |
| `setTheme` | The function to change the theme | `themeStore` |

### Theme Card UI Flow (What happens when user clicks a theme):
1. User clicks a theme card button.
2. `onClick={() => setTheme(theme.id)}` fires, calling `setTheme('minimal')` for example.
3. `themeStore` updates `activeTheme` to `'minimal'` and saves it to `localStorage`.
4. `ThemeProvider` detects the change and swaps the CSS class on `<body>` to `theme-minimal`.
5. All CSS variables across the entire app instantly take on new values.
6. The clicked card now shows a blue border and a ✓ checkmark because `isActive` is `true` for it.

---

## File: `src/index.css`
**Location:** `C:\Users\DELL\OneDrive\Desktop\erp\src\index.css`

### Purpose
The global stylesheet. Defines the entire visual language of the ERP using **CSS Custom Properties** (also called CSS Variables). Every color, font size, spacing value, and border radius is defined here once, and every component across the app references these variables — never hardcoded values.

### How Theme Switching Works in CSS
The file defines multiple blocks, one per theme. Each block redefines the same set of variable names with different values:

```css
:root, .theme-default {
  --color-primary: #4f46e5;   /* Indigo */
  --color-bg: #0f0f11;        /* Very dark */
  ...
}

.theme-minimal {
  --color-primary: #2563eb;   /* Blue */
  --color-bg: #f8fafc;        /* Nearly white */
  ...
}
```

When `ThemeProvider` adds `class="theme-minimal"` to the `<body>`, every element inside it now uses the `.theme-minimal` variable values. This is how the entire color scheme of the app changes with a single class swap.

### Key CSS Variable Groups

| Variable Group | Variables | Purpose |
|---|---|---|
| Brand Colors | `--color-primary`, `--color-primary-hover`, `--color-primary-light` | Main action color — buttons, links, active states |
| Background Layers | `--color-bg`, `--color-bg-surface`, `--color-bg-elevated`, `--color-bg-hover` | Creates depth — different layers look slightly different |
| Borders | `--color-border`, `--color-border-strong` | Subtle lines separating sections |
| Text | `--color-text-primary`, `--color-text-secondary`, `--color-text-muted` | Three levels of text importance |
| Semantic | `--color-success` (green), `--color-warning` (amber), `--color-danger` (red), `--color-info` (blue) | Status colors — same in every theme |
| Dimensions | `--sidebar-width` (240px), `--header-height` (56px) | Layout measurements — change once to resize everywhere |
| Typography | `--font-family`, `--font-size-xs` to `--font-size-2xl` | Font consistency |
| Spacing | `--space-1` to `--space-8` | Consistent padding/margin scale |
| Radius | `--radius-sm` to `--radius-full` | Corner rounding |
| Shadows | `--shadow-sm`, `--shadow-md`, `--shadow-lg` | Depth and elevation |
| Transitions | `--transition-fast` (0.1s), `--transition-normal` (0.2s), `--transition-slow` (0.3s) | Smooth animations |

---
---

# PART 5: DATA FLOW DIAGRAMS
---

## Complete Login Flow (from double-click to Dashboard)

```
User double-clicks ERP.exe
         │
         ▼
  main.tsx runs first
  - Creates QueryClient (data cache)
  - Mounts the React app
  - Wraps in BrowserRouter + QueryClientProvider
         │
         ▼
  App.tsx checks the URL ("/login")
  - Renders <LoginPage />
  - Also wraps everything in <ThemeProvider>
  - ThemeProvider reads themeStore → applies CSS class to <body>
         │
         ▼
  LoginPage mounts on screen
  - isDetecting = true → shows "Searching for server..."
  - useEffect #1 starts 2-second timer
         │
         ▼ (2 seconds pass)
  Timer fires:
  - setAppMode('remote') → authStore updated
  - isDetecting = false → form appears
  - useEffect #2 detects isDetecting changed → auto-focuses Company ID input
         │
         ▼
  User types Company ID, Username, Password
  User presses Enter or clicks "Sign In"
         │
         ▼
  handleSubmit() runs:
  1. Validates fields → shows error if empty
  2. setIsSubmitting(true) → button shows spinner
  3. Waits 800ms (simulated API call)
  4. Creates mockUser object
  5. Calls login(mockUser, token) → authStore stores user
  6. navigate('/') → URL changes to "/"
         │
         ▼
  App.tsx detects URL is "/"
  - Checks ProtectedRoute → user IS in authStore ✓
  - Renders <AppShell />
         │
         ▼
  AppShell renders:
  ┌──────────────────────────────────────────┐
  │  <Header />     → reads user from store  │
  │  <Sidebar />    → filters nav by perms   │
  │  <Outlet />     → renders <Dashboard />  │
  └──────────────────────────────────────────┘
         │
         ▼
  Dashboard renders:
  - Reads user.name → shows "Good morning, Admin 👋"
  - Shows 4 KPI cards (Revenue, Orders, Stock, Customers)
  - Shows 3 status widgets (Approvals, Alerts, Activity)
```

## Theme Switching Flow

```
User navigates to /settings
User clicks "Neumorphic Minimalist" card
         │
         ▼
  Settings.tsx → onClick fires
  setTheme('minimal') called
         │
         ▼
  themeStore.activeTheme = 'minimal'
  Saved to localStorage automatically
         │
         ▼
  ThemeProvider.tsx detects change (useEffect)
  Removes: class="theme-default" from <body>
  Adds:    class="theme-minimal"  to <body>
         │
         ▼
  CSS kicks in:
  .theme-minimal { --color-bg: #f8fafc; ... }
  Every element using var(--color-bg) → instantly white
         │
         ▼
  Entire app repaints with new colors
  No page reload needed
         │
         ▼
  User closes and reopens app tomorrow
  localStorage still has 'merge-erp-theme': 'minimal'
  themeStore reads it on load → applies theme-minimal
  User sees their preferred theme immediately
```

## Permission Filtering Flow (Sidebar)

```
User logs in as "Staff" with limited permissions:
  hr: { view: false, ... }
  finance: { view: true, ... }
         │
         ▼
  Sidebar.tsx renders
  hasPermission read from authStore
         │
         ▼
  NAV_ITEMS.filter() runs:
  ✓ Dashboard   → module=undefined → always included
  ✓ Finance     → hasPermission('finance','view') = true  → included
  ✓ Inventory   → hasPermission('inventory','view') = true → included
  ✓ Sales       → hasPermission('sales','view') = true → included
  ✓ CRM         → hasPermission('crm','view') = true → included
  ✗ HR Mgmt     → hasPermission('hr','view') = FALSE  → EXCLUDED
  ✓ Reports     → hasPermission('reports','view') = true → included
  ✗ Settings    → hasPermission('settings','view') = false → excluded
         │
         ▼
  visibleNavItems = [Dashboard, Finance, Inventory, Sales, CRM, Reports]
  The "HR Management" and "Settings" buttons
  are never rendered in the HTML at all.
  The user cannot see them, click them, or
  navigate to them manually.
```

---
---

# PART 6: SPRINT HISTORY
---

## Sprint 1 — Foundation & UI Shell
**Date:** 2026-07-19
**Epic:** Epic 1

### What was built:
- Complete Tauri 2.0 + React + TypeScript project scaffold
- Global CSS design system with 4 switchable themes
- Zustand global stores (authStore + themeStore)
- Login page with auto LAN/Remote detection
- AppShell layout (Header + Sidebar + Content area)
- Role-based navigation (permission-filtered sidebar)
- Dashboard page with KPI cards
- Settings page with Theme Picker
- GitHub repository setup (private, branch: `feature/epic-1-foundation`)

### Files Created:
| File | Purpose |
|---|---|
| `src/main.tsx` | App entry point |
| `src/App.tsx` | Router and ProtectedRoute |
| `src/index.css` | Global design system |
| `src/store/authStore.ts` | Auth & session state |
| `src/store/themeStore.ts` | Theme selection state |
| `src/components/Layout/AppShell.tsx` | Master layout frame |
| `src/components/Layout/Header.tsx` | Top bar |
| `src/components/Layout/Sidebar.tsx` | Navigation sidebar |
| `src/components/Layout/ThemeProvider.tsx` | CSS theme injector |
| `src/pages/Login.tsx` | Login screen |
| `src/pages/Dashboard.tsx` | Main dashboard |
| `src/pages/Settings.tsx` | Settings & theme picker |
| `src-tauri/tauri.conf.json` | Tauri app configuration |

### What is NOT built yet (comes in Sprint 2):
- Real FastAPI backend server ✅ (Completed in Sprint 2)
- Real PostgreSQL database ✅ (Completed in Sprint 2)
- Real UDP LAN discovery
- Real user authentication with JWT tokens ✅ (Completed in Sprint 2)
- Any data in the dashboard KPI cards

---

# PART 3: THE BACKEND & DATABASE (SPRINT 2 & 3)
---

## File: `backend/models.py`
**Location in Project:** `C:\Users\DELL\OneDrive\Desktop\erp\backend\models.py`

### Purpose
This file defines the structure of every table in the PostgreSQL database using Python classes (SQLAlchemy ORM).

### Key Tables Added:
1. **Company**: Stores Account Master (AM) and Client Module (CM) companies.
2. **User**: Stores all staff, managers, and admins.
3. **Session**: Tracks active JWT logins for security.
4. **Product (Sprint 3)**: Stores inventory items with `sku`, `price`, `stock`, and `status`.

---

## File: `backend/inventory/router.py`
**Location in Project:** `C:\Users\DELL\OneDrive\Desktop\erp\backend\inventory\router.py`

### Purpose
Handles the API requests for the Inventory module.

### Functions:
1. `GET /products`: Fetches all products that belong to the currently logged-in user's company.
2. `POST /products`: Creates a new product and saves it to the database under the user's company ID.

---

# PART 4: PREMIUM UI COMPONENTS (SPRINT 3)
---

## Files: `src/components/ui/Button.tsx`, `Card.tsx`, `Input.tsx`

### Purpose
To establish a stunning, cohesive, and premium design language, we created reusable building blocks.

### Key Features:
- **Button.tsx**: Supports multiple variants (`primary`, `secondary`, `ghost`, `danger`) and micro-animations on hover and click. Automatically shows a spinner when `isLoading` is true.
- **Card.tsx**: A beautiful container used for dashboard widgets and layout sections. Adapts to the Glassmorphism theme perfectly by using the `var(--color-bg-surface)` CSS variable.
- **Input.tsx**: A highly polished text field component that supports left/right icons and turns red with warning icons when there is an error.

---

*This document is a living manual. Every new function, variable, page, and database table will be added here as it is built. Last updated: Sprint 3.*


## Desktop App & Dense Workflows (Sprint Update)

### 1. Tauri Native Windows App
- The frontend is now wrapped in a Tauri container, compiling directly to a native Windows .exe.
- This allows it to run outside the browser, feeling exactly like a legacy desktop application while retaining modern UI elements.

### 2. Dense Product Creation Form
- The Products.tsx page has been redesigned to use a dense, two-column CSS grid.
- **Goal**: Allow all 25+ product properties to be entered without scrolling.
- **Keyboard Navigation**: A custom onKeyDown handler listens for the Enter key on form inputs. Upon pressing Enter, the cursor immediately jumps to the next logical input, allowing 100% mouse-free form entry.

### 3. Creation Lookups (Company & HSN)
- You can now create new records directly from the Lookup Modals.
- **Smart HSN Math**: When defining an HSN, entering CGST automatically mirrors to SGST and doubles for IGST. When selected in the Product form, these values automatically populate the product's tax fields.


---

# PART 5: MULTI-TENANT ARCHITECTURE & CLIENT PROVISIONING
---

## File: `src/pages/admin/ClientManagement.tsx` & `RegisterClientModal.tsx`
**Location in Project:** `C:\Users\DELL\OneDrive\Desktop\erp\src\pages\admin\ClientManagement.tsx`

### Purpose
Allows the Account Master (Admin) to view all client environments and create new isolated client databases on the fly. 

### Key Features
1. **Dynamic Provisioning**: Clicking "Register New Client" opens a modal. Submitting the form calls a backend endpoint that instantly provisions a new logical workspace for the client in the PostgreSQL database.
2. **Instant Impersonation**: Admins can click "Switch to ERP" on any client card. This immediately replaces their global token with a scoped `CM_ADMIN` token for that specific client, securely locking them into the client's isolated database space.
3. **Data Safety**: When returning a Pydantic Validation Error (e.g. for a too-short password), the React frontend catches the array of errors and parses them into a human-readable string to prevent React rendering crashes.

---

## File: `backend/api/companies.py`
**Location in Project:** `C:\Users\DELL\OneDrive\Desktop\erp\backend\api\companies.py`

### Purpose
Handles all company operations, specifically client provisioning.

### Functions:
1. `POST /register`: Registers a new client company.
   - Verifies the requester is an `AM_ADMIN`.
   - Creates the `Company` record in PostgreSQL (`is_am=False`).
   - Hashes the requested client admin password using `auth.utils.hash_password` (bcrypt).
   - Creates the `User` record mapped to the newly created `Company`.
   - Uses a database transaction (`db.flush()`) to ensure either both company and user are created, or neither is.

---

## File: `backend/auth/utils.py` & `authStore.ts`
### Purpose
Manages password security and session states.
- `hash_password`: Uses bcrypt to secure passwords before insertion.
- **Frontend Syncing**: The React `authStore.ts` explicitly maps the backend `is_am_user` (snake_case) to the frontend `isAmUser` (camelCase) to ensure the Dashboard conditional rendering logic correctly directs clients to the `ClientDashboard.tsx`.

---
