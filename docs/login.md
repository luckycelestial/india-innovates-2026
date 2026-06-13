# Login Screen — PRAJA Demo Access

## Purpose
This screen is the shared login entry point for the three PRAJA user types: Citizen, Officer, and Admin. PRAJA already centers these three personas in its product structure, with separate needs for complaint filing, resolution workflow, and system oversight.[cite:3][cite:12][cite:17]

## Demo intent
For the presentation build, this screen should support **demo login** rather than full production authentication complexity. The goal is to let the presenter quickly enter each portal and show the end-to-end PRAJA workflow across citizen, officer, and admin experiences.[cite:3][cite:17]

## Tech context
This screen should be built using Next.js, Tailwind CSS, and TypeScript, matching the frontend direction already chosen for PRAJA.[cite:11] It should be simple to wire into Supabase later, but for the demo it can use role-based shortcut access such as preset demo users or a role selector with mock credentials.[cite:7][cite:11]

## Screen goal
The login screen should do four things:

- Clearly present the three user types.
- Make it fast to enter each demo portal.
- Maintain a trustworthy, civic-tech visual style.
- Avoid confusion between public citizen access and internal officer/admin access.[cite:3][cite:17]

## User roles shown on screen
The screen should show these three options prominently:

| User Type | Purpose |
|---|---|
| Citizen | File complaints, track complaint history, receive updates.[cite:3][cite:17] |
| Officer | View assigned complaints, update status, and manage resolutions.[cite:3][cite:12] |
| Admin | Monitor analytics, oversee departments, and manage the system.[cite:3][cite:10] |

## Recommended screen structure

### 1. Header area
Include:

- PRAJA logo or wordmark
- Title: `Demo Login`
- Subtitle explaining this is a role-based access point for the presentation

Example subtitle:

> Choose a role to explore the PRAJA workflow.

This makes the demo feel intentional instead of looking like a temporary shortcut page.

### 2. Role selection cards
The center of the page should contain three cards:

- Citizen
- Officer
- Admin

Each card should include:

- Role icon
- Role title
- One-line explanation
- Demo credentials preview or a `Continue as Demo User` button

Example card copy:

- Citizen — Submit and track public grievances
- Officer — Resolve assigned complaints and update status
- Admin — Monitor performance and system activity

### 3. Demo credential block
Because this is for presentation, the screen can include a small panel with demo credentials such as:

- Citizen demo
- Officer demo
- Admin demo

You can present them as read-only sample credentials or hide them behind a quick-fill button.

Example:

- `citizen@praja.demo`
- `officer@praja.demo`
- `admin@praja.demo`
- Password: shared demo password

For the actual demo, quick access buttons are better than expecting manual typing.

### 4. Optional login form area
You can choose one of two patterns:

- **Option A:** Only role cards with direct demo access buttons.
- **Option B:** Role cards + email/password form that auto-fills based on selected role.

For a 7-hour build, Option B is stronger visually because it still feels like a real app login screen while remaining demo-friendly.

### 5. Footer note
Add a subtle note such as:

> Demo environment for presentation purposes.

This clarifies why multiple role entries are openly visible.

## UX recommendation
The best experience for the presentation is:

1. User opens `/login`
2. Sees three role cards
3. Clicks one card
4. Form auto-fills the demo account
5. Clicks `Sign In`
6. Gets routed to the correct dashboard or portal

This approach looks polished and avoids wasting time during the live demo.

## Visual style
The login page should feel official, calm, and modern, consistent with PRAJA’s civic-tech positioning.[cite:13][cite:17]

Suggested visual direction:

- Centered card layout
- Soft slate or off-white background
- White login panel
- Navy or teal accent color
- Clean typography
- Minimal icons
- Strong visual separation between public and internal roles

Avoid making the screen look like a generic SaaS login page. It should feel like a public service platform with structured access.

## Layout suggestion
A strong layout would be:

- Full-screen centered container
- Left section or top section: PRAJA branding + short value statement
- Right section or main card: role cards + form

Desktop:

- Two-column or centered wide card

Mobile:

- Single-column stacked layout
- Role cards first, form below

## Suggested content hierarchy
- H1: Demo Login
- Supporting text: choose a role to continue
- Role cards
- Login form
- Sign in button
- Demo note

The page should make sense in under 3 seconds.

## Component breakdown
Suggested reusable components:

- `LoginPageShell`
- `RoleCard`
- `RoleSelector`
- `DemoCredentialsPanel`
- `LoginForm`
- `LoginFooterNote`

This will keep the implementation clean and easy to extend when real Supabase auth and role-based redirects are added later.[cite:7][cite:11]

## Tailwind + Next.js structure suggestion

```tsx
export default function LoginPage() {
  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <section className="mx-auto flex min-h-screen max-w-6xl items-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid w-full gap-8 lg:grid-cols-2">
          <div>{/* Branding / intro */}</div>
          <div>{/* Role cards + login form */}</div>
        </div>
      </section>
    </main>
  )
}
```

Useful utility classes:

- `max-w-md w-full mx-auto`
- `rounded-2xl border border-slate-200 bg-white shadow-sm`
- `grid gap-4 sm:grid-cols-3`
- `transition hover:border-slate-400 hover:shadow-md`
- `focus-visible:ring-2 focus-visible:ring-teal-600`

## Behavior rules

### Role selection
When a role card is selected:

- Highlight the selected card
- Update the form label or helper text
- Optionally auto-fill email and password
- Set the redirect target for successful login

Suggested redirect mapping:

- Citizen → `/citizen/home`
- Officer → `/officer/dashboard`
- Admin → `/admin/dashboard`

### Validation
For the demo build, validation can be minimal:

- Ensure a role is selected
- Ensure email and password fields are not empty, if using the form
- Show lightweight error state if login fails

### Demo shortcut
A `Continue as Demo User` button on each card is highly recommended. This makes live presentation flow much smoother than manual entry.

## Mobile guidance
This screen should work cleanly on mobile as well:

- Stack role cards vertically or in a 1-column layout
- Keep login form immediately below the selected role
- Use large buttons and inputs
- Keep all critical elements above unnecessary explanatory text

## Accessibility notes
Include:

- Clear role labels
- Keyboard-focusable role cards or buttons
- Proper form labels
- Visible focus states
- Clear error messaging

This matters because PRAJA is positioned as a public-facing service platform and should feel inclusive and easy to navigate.[cite:13][cite:17]

## Demo-ready scope
For today’s implementation, the screen only needs to support:

- Selecting one of three roles
- Demo login with mock or preset credentials
- Routing to the relevant portal

Real password recovery, account creation, OTP, or full auth edge cases can be deferred.

## Route and file suggestion
Suggested route:

- `app/login/page.tsx`

Suggested related components:

- `components/auth/role-card.tsx`
- `components/auth/login-form.tsx`
- `components/auth/demo-credentials-panel.tsx`
- `components/auth/login-page-shell.tsx`

## Acceptance criteria
This screen is complete when:

- The user can clearly see Citizen, Officer, and Admin as separate login options.[cite:3]
- Demo access into each portal is fast and presentation-friendly.
- The UI feels like part of the PRAJA system, not a generic placeholder.
- The selected role determines the correct post-login route.
- The layout is polished on both desktop and mobile.
