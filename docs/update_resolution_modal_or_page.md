# Update Resolution Modal / Page — PRAJA

## Purpose
This screen lets an officer change the outcome or progress state of a complaint. It should support status updates such as in progress, resolved, rejected, and escalated in a quick, controlled way.[cite:3][cite:17][cite:20]

## Screen goal
The main goal is to let the officer update a complaint without losing context. The user should be able to confirm a decision, add a note, and save the update from one focused modal or page.[cite:17][cite:20]

## Tech context
Build this screen with Next.js, Tailwind CSS, and TypeScript so it stays consistent with the rest of PRAJA.[cite:2][cite:11] The update action should write back to Supabase and append a new event to the complaint timeline.[cite:2][cite:7]

## Recommended format
You can implement this either as:

- a modal, if you want quick updates from the queue or detail view.
- a dedicated page, if you want a fuller workflow with notes and escalation details.

For the demo, a modal is faster and cleaner. For production, a page may be better when the update flow becomes more complex.

## Core actions
The screen should support these complaint states:

- In progress.
- Resolved.
- Rejected.
- Escalated.

You can also optionally include pending review or reassigned if your workflow needs it later.[cite:20]

## Primary fields
The update form should include:

- New status.
- Status note or resolution note.
- Internal officer remark.
- Public update message.
- Reassignment target, if relevant.
- Escalation reason, if relevant.
- Resolution evidence attachment, if relevant.

These fields give the officer enough control to record what happened and why.

## Suggested behavior by status

### In progress
Use when the complaint has been accepted and is actively being handled.

Suggested required inputs:

- Short progress note.
- Optional expected completion date.

### Resolved
Use when the complaint has been fixed or completed.

Suggested required inputs:

- Final resolution note.
- Optional proof or attachment.
- Optional public message.

### Rejected
Use when the complaint cannot be accepted or is invalid.

Suggested required inputs:

- Rejection reason.
- Optional reference note.
- Optional public explanation.

### Escalated
Use when the complaint must be moved upward or sent to another department.

Suggested required inputs:

- Escalation reason.
- Target department or supervisor.
- Optional internal note.

## Suggested layout
A modal should be divided into clear sections:

1. Complaint summary at the top.
2. Status selector.
3. Notes or reason input.
4. Optional attachment or reassignment field.
5. Save / cancel actions.

If implemented as a page, the same structure can be shown in a wider layout with a persistent summary column.

## UX guidance
This screen should be very deliberate, because status updates directly affect citizen trust.

- Make the current status visible.
- Show the next status clearly before saving.
- Require a reason when rejecting or escalating.
- Confirm destructive actions.
- Keep the save action prominent.

The screen should never feel ambiguous, especially for rejection or escalation.[cite:17][cite:20]

## Visual style
The design should stay calm and functional.

Suggested style direction:

- White modal or page card.
- Clear status chips.
- Color coding for each action type.
- Distinct warning style for rejection and escalation.
- Simple confirmation controls.

## Status color guidance
You can use this visual map:

- In progress: blue or indigo.
- Resolved: green.
- Rejected: red or rose.
- Escalated: amber or orange.

This makes the current intent easy to understand at a glance.

## Validation rules
Suggested rules:

- Status selection required.
- Reason required for rejected or escalated.
- Resolution note required for resolved.
- Public note optional but recommended.
- Attachment optional.

These rules keep the workflow structured without slowing the officer down too much.

## Confirmation flow
Before applying a status change, show a final confirmation such as:

- Are you sure you want to mark this complaint as resolved?
- This will notify the citizen.

That extra step is useful because PRAJA is meant to be accountable and transparent.[cite:17][cite:20]

## Component breakdown
Suggested reusable components:

- `StatusUpdateTrigger`
- `StatusUpdateModal`
- `StatusSelect`
- `ReasonTextarea`
- `PublicNoteInput`
- `EscalationTargetSelect`
- `ResolutionAttachmentUploader`
- `ConfirmUpdateButton`

This will make the implementation easy to reuse from both the queue view and the complaint detail workspace.[cite:11]

## Tailwind structure suggestion

```tsx
export default function StatusUpdateModal() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
        {/* modal content */}
      </div>
    </div>
  )
}
```

Useful classes:

- `fixed inset-0`
- `max-w-2xl`
- `rounded-2xl`
- `space-y-5`
- `grid gap-4 sm:grid-cols-2`
- `justify-end`

## Data behavior
This action should update the complaint record in Supabase and insert a new timeline event.[cite:2][cite:7]

Likely fields to update:

- `status`
- `updated_at`
- `updated_by`
- `resolution_note`
- `public_update`
- `escalation_reason`
- `assigned_to`
- `timeline_events`

If the complaint is resolved or escalated, the citizen-facing tracking screen should reflect that immediately or near real time.[cite:2][cite:7][cite:20]

## Demo-ready scope
For the presentation, this screen only needs to prove that the officer can change status and save a meaningful update. You do not need advanced approval workflows, multi-level signing, or document uploads unless you have time.

## Route and file suggestion
Suggested routes:

- Modal: `components/officer/status-update-modal.tsx`
- Page: `app/officer/complaints/[id]/update/page.tsx`

Suggested related components:

- `components/officer/status-select.tsx`
- `components/officer/reason-textarea.tsx`
- `components/officer/public-note-input.tsx`
- `components/officer/confirm-update-button.tsx`

## Acceptance criteria
This screen is complete when:

- The officer can change the complaint status safely.[cite:17][cite:20]
- Rejection and escalation require a reason.
- The update is saved to the complaint timeline.
- The citizen-facing complaint tracking can reflect the change.
- The layout is simple enough for a fast demo but structured enough for production.
