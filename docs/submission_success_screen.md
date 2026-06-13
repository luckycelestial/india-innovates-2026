# Submission Success Screen — PRAJA

## Purpose
This screen confirms that a citizen’s complaint has been successfully submitted. It is the immediate post-submit moment where the user receives reassurance, a complaint ID, and the next action to take.[cite:3][cite:17][cite:20]

## Screen goal
The screen should reduce anxiety after submission and clearly tell the user that the complaint is now in the PRAJA workflow.[cite:17][cite:20] It should also push the user toward tracking the complaint rather than leaving them at a dead end.

## Tech context
Build this screen with Next.js, Tailwind CSS, and TypeScript so it matches the rest of the PRAJA frontend.[cite:2][cite:11] The success state can be driven by the complaint record returned from Supabase after insert.[cite:2][cite:7]

## Main message
The page should display one primary confirmation message:

> Your complaint has been submitted successfully.

That line should appear very clearly, with supportive details underneath.

## Information to show
Include the following data:

- Complaint ID.
- Submission timestamp.
- Current status: Submitted.
- Complaint title.
- Category.
- Expected next step or estimated review note.
- Button to track complaint.
- Button to return home.

This makes the post-submit state useful and not just decorative.[cite:17][cite:20]

## Suggested layout
A strong success screen can use a centered card with a visual success icon and action buttons.

### Section order
1. Success icon or checkmark.
2. Confirmation headline.
3. Complaint ID card.
4. Short status explanation.
5. Primary action: Track Complaint.
6. Secondary action: Go to Home.

The page should feel calm and reassuring, not overly celebratory. PRAJA is a civic workflow, so the tone should be professional and trustworthy.[cite:13][cite:17]

## Recommended content blocks

### 1. Confirmation header
Use a bold but simple message such as:

- Complaint submitted successfully.
- We’ve recorded your grievance.

### 2. Complaint reference card
Show the complaint ID in a visually distinct card so the user can save or copy it.

Example fields:

- ID: PRAJA-2026-00124
- Status: Submitted
- Submitted on: Today, 11:42 AM

### 3. Next step explanation
Add one short line explaining that the complaint will now be routed for review and processing.

This is important because PRAJA’s promise is not just intake, but routing, tracking, and escalation.[cite:17][cite:20]

### 4. Actions
Provide two clear buttons:

- Track Complaint — primary button.
- Go to Home — secondary button.

Optionally add a smaller text link:

- Submit another complaint

## Visual style
The design should be consistent with PRAJA’s clean civic-tech look: calm, official, modern, and readable.[cite:13][cite:17]

Suggested style direction:

- Soft green or teal success icon.
- White card on light slate background.
- Rounded borders.
- Strong button hierarchy.
- Enough whitespace to let the confirmation breathe.

## Mobile guidance
The success screen should work especially well on mobile because citizens may be using phones immediately after submission.

- Keep the complaint ID visible without scrolling.
- Make the `Track Complaint` button large and easy to tap.
- Avoid clutter.
- Keep copy short.

## User experience notes
This screen should answer three questions immediately:

1. Did my complaint go through?
2. What is the complaint reference number?
3. What do I do next?

If the screen answers those clearly, it is doing its job.

## Component breakdown
Suggested components:

- `SuccessIcon`
- `ConfirmationHeader`
- `ComplaintReferenceCard`
- `NextStepMessage`
- `PrimaryActionButton`
- `SecondaryActionButton`

These components will make the screen easy to reuse for other flow confirmations later.[cite:11]

## Tailwind structure suggestion

```tsx
export default function SubmissionSuccessScreen() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <section className="mx-auto flex min-h-screen max-w-2xl items-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          {/* success content */}
        </div>
      </section>
    </main>
  )
}
```

Useful classes:

- `text-center`
- `space-y-4`
- `rounded-xl border border-slate-200`
- `inline-flex items-center justify-center`
- `w-full sm:w-auto`

## Demo-ready scope
For the presentation, this screen only needs to appear after a complaint is created successfully. It does not need complex backend logic beyond reading the returned complaint data and showing the confirmation state.

This screen is important because it closes the citizen flow with confidence and immediately moves the user to tracking.[cite:17][cite:20]

## Route and file suggestion
Suggested route:

- `app/complaint/success/page.tsx`

Suggested related components:

- `components/complaints/success-icon.tsx`
- `components/complaints/complaint-reference-card.tsx`
- `components/complaints/next-step-message.tsx`
- `components/complaints/success-actions.tsx`

## Acceptance criteria
This screen is complete when:

- The user clearly sees that the complaint was submitted.[cite:17]
- The complaint ID is easy to find and copy.
- The next action is obvious.
- The design feels calm, official, and trustworthy.
- The screen works well on mobile and desktop.
