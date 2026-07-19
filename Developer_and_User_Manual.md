# ERP Developer & User Manual

This document is written in plain English so that both developers and non-developers (owners, stakeholders) can completely understand how the software works, how data flows, and what every button does. 

It will be updated regularly throughout the development journey.

---

## 1. Introduction

This ERP software is a hybrid desktop application built to be extremely fast. It uses two modes:
1. **LAN Mode (Offline-First):** When you are in the office, the app automatically finds the server on the local network. It talks directly to the local server, making it lightning fast.
2. **Remote Mode (Cloud):** When you are out of the office, the app connects to a secure cloud database (Supabase) to pull and sync data. 

**Technologies Used:**
- **Tauri:** The shell that makes this run as a desktop `.exe` app.
- **React & TypeScript:** The technologies used to build all the visual screens, buttons, and layouts.
- **Zustand:** The "memory" of the app. It remembers if you are logged in and what theme you have selected.

---

## 2. Step-by-Step UI Flow & Code Explanations

### Step 1: Opening the App (The Login Screen)
**What the user sees:**
When the user double-clicks the ERP icon, a window opens showing the **Login Page**. 
- The app immediately shows a spinning icon saying "Searching for server on local network...".
- After 2 seconds, it decides whether to show the LAN Login (Username + Password) or the Remote Login (Company ID + Username + Password).

**What the code is doing:**
- *File:* `src/pages/Login.tsx`
- *Logic:* The code uses a React `useEffect` (a hook that runs automatically when the page opens) to start a 2-second timer. 
- *Data Flow:* If it doesn't find a local server, it switches a state variable (`appMode`) to `'remote'`. This triggers the UI to reveal the third input box for "Company ID".

### Step 2: Pressing "Sign In"
**What the user sees:**
The user types their details and presses Enter (or clicks Sign In). The button changes to "Signing in..." with a spinning icon. If successful, they are instantly taken to the Dashboard. If they type the wrong details, a red error box appears.

**What the code is doing:**
- *File:* `src/pages/Login.tsx`
- *Logic:* The `handleSubmit` function is triggered. It first checks if the boxes are empty. If they are, it stops and shows an error. 
- *Data Flow:* It sends the typed username and password to the server. Right now, it simulates a successful login by waiting for 0.8 seconds and creating a fake "Admin User" profile.
- *Memory Update:* It calls the `login` function from our `authStore` (the app's memory) to save the user's profile and a secret security token.
- *Routing:* It tells the React Router to navigate to the `/` (Dashboard) page.

### Step 3: The Main Dashboard
**What the user sees:**
The screen is split into three parts:
1. **Header (Top):** Shows the ERP logo on the left, and a notification bell and user profile menu on the right. Clicking the profile opens a menu to "Logout".
2. **Sidebar (Left):** A list of all available modules (Finance, Inventory, HR, Settings, etc.). The currently active page is highlighted.
3. **Main Content (Center):** Shows a greeting based on the time of day ("Good morning/afternoon") and four summary widgets (Revenue, Orders, Stock, Customers).

**What the code is doing:**
- *Files:* `src/components/Layout/AppShell.tsx`, `Header.tsx`, `Sidebar.tsx`, `src/pages/Dashboard.tsx`
- *Layout Logic:* `AppShell.tsx` acts as the master frame holding the Header and Sidebar in place while swapping out the middle content depending on what button the user clicks.
- *Sidebar Logic:* `Sidebar.tsx` looks at the user's profile in the `authStore`. If the user is just a standard staff member and doesn't have permission to see Finance, the Finance button is completely erased from the screen code—they can't even click it by accident.
- *Greeting Logic:* `Dashboard.tsx` uses `new Date().getHours()` to check the computer's clock and output the correct time-based greeting.

### Step 4: Changing the Theme (Settings Page)
**What the user sees:**
The user clicks "Settings" in the sidebar. They see a "Theme & Appearance" section with 4 options (Default Dark, Modern SaaS, Minimalist, Enterprise). Clicking an option instantly changes the colors of the entire software.

**What the code is doing:**
- *Files:* `src/pages/Settings.tsx`, `src/store/themeStore.ts`, `src/components/Layout/ThemeProvider.tsx`, `src/index.css`
- *Data Flow:* When the user clicks a theme button (e.g., "Minimalist"), the button tells the `themeStore` to change the `activeTheme` variable to `'minimal'`.
- *Saving:* The `themeStore` automatically saves this choice into the computer's local hard drive cache (`localStorage`). If the user restarts the PC, the app reads this cache and remembers the theme.
- *UI Update:* The `ThemeProvider.tsx` component is constantly watching the `themeStore`. The millisecond the theme changes, it forcibly injects a new CSS class (like `.theme-minimal`) into the root HTML body of the app. This instantly activates a whole new set of color variables defined in `index.css`, changing every button, background, and text color simultaneously.

---

## 3. Database Relations (Current State)

*Note: The actual PostgreSQL database is being set up in Epic 2. Below is the theoretical flow of the data we have modeled in the frontend so far.*

### The User Object
When a user logs in, the app holds this structure in memory:
- **`id`**: Unique identifier for the user.
- **`role`**: Defines what level they are (e.g., `am_admin`, `manager`, `staff`).
- **`companyId`**: Links the user to a specific company database. This ensures a user from Client A can NEVER see data from Client B.
- **`permissions`**: A detailed object listing exactly what they can do:
  - `finance: { view: true, create: false, edit: false, delete: false }` -> This means the user can *look* at finance records, but cannot make new ones or delete them.

---

*End of Sprint 1 Documentation. This manual will expand significantly in Sprint 2 as we build the Backend and Database.*
