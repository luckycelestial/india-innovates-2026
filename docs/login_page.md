# Nagaragupta – Login Screen

Welcome back to **Nagaragupta**, the unified civic intelligence platform that connects citizens and city officials through data, dashboards, and complaints.

This screen is the shared entry point for **Citizens** and **Officials**, with clearly separated flows.

---

## 1. Primary goals of this screen

- Let users **choose their role** (Citizen / Official) up front.
- Provide **simple, India-first authentication**:
  - OTP-based for citizens.
  - Email/password (or SSO) for officials.
- Route each user to the correct **home experience**:
  - Citizen Portal
  - Operations Dashboard

---

## 2. Layout structure (Next.js + Tailwind)

### Desktop layout

- **Left panel**
  - Nagaragupta logo and wordmark.
  - Tagline: `See the whole city. Act with clarity.`
  - 1–2 line explanation:
    > Nagaragupta brings together live city data, open datasets, and citizen complaints into a single operational view.

- **Right panel**
  - Role toggle (Citizen / Official).
  - Context text for the selected role.
  - Login form that switches dynamically based on selection.

### Mobile layout

- Stack vertically:
  - Branding and description on top.
  - Role toggle + form below.
  - Keep primary CTA always visible above the fold.

---

## 3. Role selection UI

At the top of the right panel:

- Two pill buttons / tabs:
  - `Citizen`
  - `Official`
- The active pill is highlighted; switching pills swaps the form.

Example copy:

- For Citizen tab:
  > File civic complaints and track their status.

- For Official tab:
  > Monitor complaints and city data for your ward or department.

---

## 4. Citizen login flow

### Use case

- File a new complaint.
- Track existing complaints.
- View a limited public dashboard (AQI, weather, basic civic indicators).

### Authentication pattern

- **Primary:** Mobile + OTP (no password).
- **Optional (later):** Email + magic link.

### Form fields

1. `Mobile number` (10-digit, India)
2. `Get OTP` button
3. `OTP` field (4–6 digits) – shown after OTP is requested
4. `Verify & Continue` button

### Flow

1. Citizen enters mobile number → clicks `Get OTP`.
2. Show “Enter OTP” step with timer and “Resend OTP”.
3. On success:
   - If no deep link, redirect to `/citizen/home`.
   - If they came from “File a complaint”, redirect to `/citizen/complaints/new`.

### UX notes

- Show helper text:
  > No password required. We use OTP to verify your identity.
- For demo mode, you can auto-fill or auto-verify a fixed OTP (like `0000`) and explain this to judges.

---

## 5. Official login flow

### Use case

- View **Operations Dashboard** with:
  - Live API feeds (AQI, weather, etc.).
  - Open datasets (accidents, transport, electricity).
  - Citizen complaints and internal workflows.
- Manage and assign complaints.
- Monitor KPIs and SLA performance.

### Authentication pattern

- **Primary:** Email + password (demo-ready).
- Optional future: SSO with city’s identity provider.

### Form fields

1. `Official email / username`
2. `Password`
3. Optional `Role` dropdown:
   - Ward Officer
   - Department Officer (e.g., Solid Waste, Roads, Water)
   - Admin / Super Admin
4. `Sign in` button

### Flow

1. Official enters credentials → clicks `Sign in`.
2. On success:
   - Ward Officer → `/official/dashboard/ward`.
   - Department Officer → `/official/dashboard/department`.
   - Admin → `/official/dashboard/city`.

### RBAC / security notes

- Enforce HTTPS and secure cookies.
- Store passwords hashed (or use an auth provider).
- Use role-based access control:
  - Citizens can access only their complaints and public indicators.
  - Officials see only data for their wards/departments unless Admin.

---

## 6. Demo accounts (for hackathon)

Add a small card at the bottom or side:

**Demo Mode**

- Citizen (OTP auto-verified):
  - Mobile: `99999 99999`
  - OTP: `0000`
- Ward Officer:
  - Email: `ward.officer@nagaragupta.dev`
  - Password: `demo123`
- Department Officer:
  - Email: `swm.officer@nagaragupta.dev`
  - Password: `demo123`
- Admin:
  - Email: `admin@nagaragupta.dev`
  - Password: `demo123`

You can guard this behind a simple `DEMO_MODE` flag in env.

---

## 7. Suggested route and file structure

- Route: `/login`
- Components:
  - `app/login/page.tsx`
  - `components/login/RoleToggle.tsx`
  - `components/login/CitizenLoginForm.tsx`
  - `components/login/OfficialLoginForm.tsx`
  - `components/layout/AuthShell.tsx`

---

## 8. Completion checklist

The `login_page.md` screen is “done” when:

- Users clearly see **Citizen vs Official** as separate options.
- Citizen login via OTP works end-to-end (or demo OTP for judges).
- Official login redirects by role to the correct dashboard.
- The page visually matches Nagaragupta’s branding and can be demoed cleanly on localhost.