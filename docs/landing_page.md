# Citizen Screen 1 — PRAJA Landing / Home

## Purpose
This is the first citizen-facing screen of PRAJA and acts as the public entry point for the platform. The screen should immediately communicate trust, clarity, and action: what PRAJA is, why a citizen should use it, and the fastest way to raise or track a complaint.[cite:3][cite:13]

## Tech context
This screen is intended to be built using Next.js with TypeScript and Tailwind CSS, matching the frontend direction already chosen for PRAJA.[cite:11] It should be optimized for a localhost demo first, while staying production-ready in structure and component design.[cite:2][cite:11]

## Screen goal
The landing screen should do four things:

- Explain PRAJA in one glance as a civic grievance platform for the public.[cite:13]
- Build confidence through clean government-tech presentation and transparent language.[cite:13]
- Push the user toward the main primary action: filing a complaint.[cite:3]
- Offer a secondary action to track an existing complaint without friction.[cite:3]

## Primary user actions
The screen should expose the following actions clearly above the fold:

- Raise a complaint
- Track complaint
- Sign in
- Change language, if multilingual support is added later[cie:3]

For the demo, the most important CTA is **Raise a Complaint**, followed by **Track Complaint**. Earlier PRAJA planning centered the citizen journey around complaint filing and status visibility, so the landing page should reflect that priority.[cite:3][cite:12]

## Layout structure
The screen can be divided into these sections:

### 1. Top navigation
Include:

- PRAJA wordmark / logo
- Home
- Track Complaint
- Sign In
- Language selector placeholder

The navigation should be minimal and official-looking. Avoid startup-style marketing clutter; the tone should feel civic, reliable, and easy to understand.[cite:13]

### 2. Hero section
This is the main above-the-fold area.

Include:

- Headline: short and trust-building
- One-line supporting description
- Primary CTA: Raise a Complaint
- Secondary CTA: Track Existing Complaint
- Optional illustration or civic-themed graphic

Example content direction:

> Raise civic issues quickly. Track every complaint transparently.

The copy should focus on transparency, speed, and citizen-first access, because those were core themes in the earlier PRAJA definition.[cite:13]

### 3. Quick trust indicators
A short strip below the hero can show credibility markers such as:

- Real-time complaint tracking
- Department routing
- Multilingual-ready support
- Transparent updates

These reflect the previously defined PRAJA value proposition of modern complaint filing, automated routing, and status tracking.[cite:13]

### 4. How it works
Show a simple 3-step flow:

1. Submit your issue
2. PRAJA routes it to the right department
3. Track status until resolution

This section is important for first-time citizens who need immediate clarity on the process.[cite:3][cite:13]

### 5. Public value section
This section should explain why PRAJA matters.

Suggested points:

- No running between offices
- One digital place for complaints
- Better visibility into complaint status
- Faster coordination between citizens and local bodies

The screen should avoid sounding overly technical. It should feel like a public service platform, not a software dashboard.[cite:13]

### 6. Footer
Include:

- About PRAJA
- Help / Support
- Privacy
- Contact
- Copyright line

For the demo, footer links can be placeholders if needed.

## Visual style
The design direction should be clean, institutional, and modern rather than flashy. Earlier planning positioned PRAJA as a serious civic-tech platform, so the landing page should look trustworthy and accessible instead of startup-like or experimental.[cite:3][cite:13]

Suggested style direction:

- White or very light background
- Navy, teal, or government-trust blue accents
- Clear spacing and rounded but restrained components
- Large readable headline
- Strong CTA buttons
- Light icon usage only where necessary

## Suggested component list
The page can be composed from these reusable components:

- `Navbar`
- `HeroSection`
- `ActionButtons`
- `TrustStrip`
- `HowItWorks`
- `PublicValueSection`
- `Footer`

This componentization fits well with a Next.js + TypeScript codebase and will make later screens easier to build consistently.[cite:11]

## Tailwind structure suggestion
Recommended page wrapper structure:

```tsx
export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar />
      <HeroSection />
      <TrustStrip />
      <HowItWorks />
      <PublicValueSection />
      <Footer />
    </main>
  );
}
```

Recommended layout utilities:

- `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`
- `py-16 sm:py-20 lg:py-24`
- `grid lg:grid-cols-2 gap-10 items-center`
- `rounded-2xl border border-slate-200 bg-white`

## Content hierarchy
Use this hierarchy for the screen:

- H1: What PRAJA helps the citizen do
- Supporting text: one short explanation
- Primary CTA: Raise a Complaint
- Secondary CTA: Track Complaint
- Supporting sections: trust, process, public value

The user should understand the screen in under 5 seconds. If the page feels too content-heavy, remove text before removing action clarity.

## Mobile behavior
This screen must work well on mobile because many citizens may access PRAJA from phones. Earlier PRAJA planning emphasized accessibility and public usability, which makes mobile-first design especially important.[cite:13]

Mobile guidance:

- Stack hero content vertically
- Keep CTAs full width on small screens
- Make nav simple, possibly collapsible later
- Use large tap targets
- Keep the top section short enough that the main CTA appears quickly

## Demo-ready scope
For today’s build, this screen only needs to be visually polished and functionally wired enough to navigate to:

- `/complaint/new`
- `/track`
- `/login`

There is no need to build complex backend logic on this page itself. Its job is to frame the product and route the user into the complaint flow.

## Route and file suggestion
Suggested Next.js route:

- `app/page.tsx`

Suggested related component files:

- `components/layout/navbar.tsx`
- `components/home/hero-section.tsx`
- `components/home/trust-strip.tsx`
- `components/home/how-it-works.tsx`
- `components/layout/footer.tsx`

## Acceptance criteria
This screen is complete when:

- The page clearly introduces PRAJA as a citizen grievance platform.[cite:13]
- The citizen can immediately see how to raise or track a complaint.[cite:3]
- The layout looks presentation-ready on desktop and mobile.
- The design is calm, modern, and credible.
- Navigation to the next key screens is in place.
