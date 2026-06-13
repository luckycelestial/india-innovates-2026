# Complaint Submission Form — PRAJA

## Purpose
This is the main citizen action screen where a user files a new grievance into PRAJA. The form should be fast, clear, and trustworthy, because the entire citizen workflow begins here.[cite:3][cite:13][cite:17]

## Screen goal
The screen should let a citizen submit a complaint in under one minute on mobile or desktop, while still collecting enough information for routing, tracking, and escalation.[cite:17][cite:20]

## Tech context
Build this screen with Next.js, Tailwind CSS, and TypeScript so it matches the rest of the PRAJA frontend.[cite:2][cite:11] The form should be ready to connect to Supabase for persistence, file uploads, and later workflow handling.[cite:2][cite:7]

## Core fields
Use these fields in the first version:

- Complaint title.
- Complaint category.
- Complaint description.
- Location or ward.
- Landmark or nearest reference.
- Optional photo or file upload.
- Priority or urgency.
- Anonymous submission toggle.
- Consent checkbox for terms or declaration.

These fields support the core PRAJA flow of categorising, routing, tracking, and escalating civic complaints.[cite:17][cite:20]

## Recommended field behavior

### Complaint title
Short, clear summary of the issue.

### Complaint category
Dropdown with values like road, water, electricity, sanitation, streetlight, drainage, waste, and other.

### Complaint description
Larger multiline box for the citizen to explain the problem in detail.

### Location or ward
Should help route the complaint to the right department or area.

### Landmark
Useful when the exact address is unclear.

### Attachment upload
Allow one or more images so the officer can verify the issue visually.

### Priority
Keep this simple in the demo: low, medium, high, urgent. In the real system, this can later map to the weighted SLA logic already discussed for PRAJA.[cite:20]

### Anonymous mode
If enabled, hide personal identity from the public-facing view while still storing the report securely.

### Consent
Required checkbox to confirm the report is genuine and submitted in good faith.

## Suggested layout
A good layout is a single centered card with clear section spacing:

1. Complaint details.
2. Location details.
3. Evidence upload.
4. Review and submit.

The screen should feel straightforward, not bureaucratic. The user should not need to think hard about where to click next.

## UX guidance

- Keep labels short.
- Use placeholder text that explains what to enter.
- Show inline validation.
- Keep the submit button fixed or always visible near the bottom on mobile.
- Add a small progress indicator if the form is split into sections.

For a presentation demo, a single-page form is probably the best choice unless the layout becomes too long.

## Visual style
The design should stay consistent with PRAJA’s civic-tech identity: calm, modern, and official.[cite:13][cite:17]

Suggested style direction:

- White card on soft slate background.
- Navy or teal primary buttons.
- Clear field borders.
- Subtle helper text.
- Clean upload dropzone.

## Component breakdown
Suggested reusable components:

- `ComplaintFormShell`
- `FormSection`
- `CategorySelect`
- `LocationInput`
- `AttachmentUploader`
- `PriorityToggle`
- `AnonymousSwitch`
- `SubmitBar`

This structure will make the form easier to maintain in a Next.js + TypeScript codebase.[cite:11]

## Tailwind structure suggestion

```tsx
export default function ComplaintSubmissionPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          {/* form content */}
        </div>
      </section>
    </main>
  )
}
```

Useful classes:

- `space-y-6`
- `grid gap-4 sm:grid-cols-2`
- `rounded-xl border border-slate-200`
- `focus-visible:ring-2 focus-visible:ring-teal-600`
- `w-full px-4 py-3`

## Form flow
The user journey should be:

1. Open complaint form.
2. Enter title and category.
3. Add details and location.
4. Upload evidence if available.
5. Review summary.
6. Submit complaint.
7. Show success state with complaint ID.

The success state should route the citizen toward complaint tracking immediately.

## Success state
After submission, show:

- Complaint ID
- Current status: Submitted
- Estimated next step
- Button to track complaint
- Button to go back home

This matters because PRAJA’s main promise is visibility and accountability, not just intake.[cite:17][cite:20]

## Validation rules
Keep validation light but useful:

- Title required.
- Category required.
- Description required.
- Location required.
- Attachment optional.
- Priority optional for demo.
- Anonymous toggle optional.
- Consent required.

## Mobile guidance
This screen must be mobile-first:

- One-column layout.
- Large inputs.
- Large submit button.
- Upload area should be touch-friendly.
- Avoid too many fields on one row.

## Demo-ready scope
For the presentation, the form only needs to submit into a working local or Supabase-backed flow. Advanced features such as auto-translation, AI classification, and omnichannel intake can be shown later as platform capabilities, not necessarily in the first live form demo.[cite:17][cite:20]

## Route and file suggestion
Suggested route:

- `app/complaint/new/page.tsx`

Suggested related components:

- `components/complaints/complaint-form.tsx`
- `components/complaints/attachment-uploader.tsx`
- `components/complaints/priority-toggle.tsx`
- `components/complaints/submit-bar.tsx`

## Acceptance criteria
This screen is complete when:

- A citizen can submit a complaint clearly and quickly.[cite:17]
- The form captures the minimum data needed for routing and tracking.[cite:17][cite:20]
- The UI looks polished and consistent with PRAJA.
- The success state clearly confirms submission.
- The form is easy to use on mobile.
