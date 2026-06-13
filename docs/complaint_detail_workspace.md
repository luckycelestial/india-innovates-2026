# Complaint Detail Workspace — PRAJA

## Purpose
This screen is the main working area where a user, especially an officer or admin, opens a single complaint and handles every action related to it. It should combine complaint details, status history, actions, notes, and attachments in one focused workspace.[cite:3][cite:17]

## Screen goal
The workspace should make it easy to understand the complaint, decide what to do next, and update the record without jumping between multiple screens.[cite:17][cite:20] For the demo, this screen is one of the most important parts of PRAJA because it shows accountability, workflow, and resolution in a single place.[cite:3][cite:13]

## Tech context
Build this screen with Next.js, Tailwind CSS, and TypeScript so it stays consistent with the rest of the PRAJA frontend.[cite:2][cite:11] The data should come from Supabase, where the complaint record, timeline, notes, and attachment references can be stored and updated.[cite:2][cite:7]

## Who uses it
This workspace is primarily for officers, but admins may also need access for oversight or escalation.

| Role | Why they use it |
|---|---|
| Officer | Review assigned complaint and update status.[cite:3][cite:12] |
| Admin | Oversee resolution progress and escalation.[cite:3][cite:10] |
| Supervisor | Check unresolved or delayed cases, if added later.[cite:13][cite:20] |

## Primary content blocks
The workspace should be split into these main blocks:

### 1. Complaint summary panel
Show the most important details at the top:

- Complaint ID.
- Current status.
- Priority or urgency.
- Category.
- Location or ward.
- Submitted date.
- Assigned department.

This gives the officer instant context before opening the full timeline.

### 2. Citizen complaint details
Show the full complaint description in a readable card.

Include:

- Title.
- Description.
- Anonymous flag if applicable.
- Contact details if the complaint is not anonymous.
- Any structured metadata from the submission form.

### 3. Attachments section
Show uploaded images or files in a gallery or preview panel.

The officer should be able to open each image quickly to verify the issue. This is especially useful for road damage, drainage, waste, streetlight, and similar civic complaints.[cite:17][cite:20]

### 4. Status timeline
Show the full complaint history in chronological order:

- Submitted.
- Assigned.
- In progress.
- Pending review.
- Resolved.
- Reopened, if needed.

This timeline is one of the most important trust features in PRAJA because it shows the citizen and officer exactly what happened to the complaint.[cite:17][cite:20]

### 5. Action panel
Provide controls for the officer to act on the complaint:

- Change status.
- Add internal note.
- Add public update.
- Reassign to another department.
- Escalate.
- Mark resolved.

For the demo, keep these actions visible but simple. The most important actions are status change and resolution note.

### 6. Notes and communication panel
Separate internal notes from citizen-visible updates.

This makes the workspace feel more realistic and avoids mixing operational notes with public communication. Later, this can support more advanced workflow and audit logging.

## Suggested layout
A strong layout for this workspace is a two-column desktop design:

- Left column: complaint details, attachments, and timeline.
- Right column: actions, status controls, notes, and officer info.

On mobile, stack everything vertically and keep the action controls near the top or in a sticky bottom bar.

## Visual hierarchy
The top of the screen should immediately answer:

- What is the complaint?
- How urgent is it?
- Who owns it?
- What is the current status?
- What action should be taken next?

If those five questions are answered clearly, the screen is working well.

## Useful UI elements
Recommended UI pieces:

- Complaint ID badge.
- Priority badge.
- Status chip.
- Timeline dots and connectors.
- Attachment thumbnail grid.
- Action dropdown or buttons.
- Internal note editor.
- Public update input.

## Officer workflow
The officer should be able to do the following from one screen:

1. Read the complaint.
2. Inspect evidence.
3. Review current status.
4. Update the complaint.
5. Add notes or resolution.
6. Save the update.
7. Trigger the next visible state for the citizen.

That workflow reflects PRAJA’s core purpose of turning complaint handling into a structured, transparent process.[cite:17][cite:20]

## Status action rules
A simple status flow for the demo could be:

- Submitted.
- Assigned.
- In progress.
- Resolved.
- Reopened.
- Escalated.

The system can later enforce weighted SLA timers, as already discussed for PRAJA, but the demo only needs clear manual updates on the screen.[cite:20]

## Tailwind structure suggestion

```tsx
export default function ComplaintDetailWorkspace() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-8 lg:grid-cols-[1.6fr_1fr] lg:px-8">
        <div>{/* complaint summary, detail, attachments, timeline */}</div>
        <aside>{/* action panel, notes, status controls */}</aside>
      </section>
    </main>
  )
}
```

Useful classes:

- `rounded-2xl border border-slate-200 bg-white shadow-sm`
- `space-y-6`
- `grid gap-4 sm:grid-cols-2`
- `sticky top-6`
- `overflow-hidden`

## Component breakdown
Suggested components:

- `ComplaintSummaryCard`
- `ComplaintDetailCard`
- `AttachmentGallery`
- `ComplaintTimeline`
- `StatusActionPanel`
- `InternalNoteBox`
- `PublicUpdateBox`
- `EscalationButton`

This will keep the code modular and easier to extend as PRAJA grows.[cite:11]

## Data fields needed
The workspace will likely read and update these fields:

- `id`
- `title`
- `description`
- `category`
- `priority`
- `status`
- `ward`
- `department`
- `assigned_to`
- `submitted_by`
- `attachments`
- `internal_notes`
- `public_updates`
- `timeline_events`
- `created_at`
- `updated_at`

## Demo-ready scope
For the presentation, you only need the workspace to show one complaint in detail and allow a visible status update. That is enough to demonstrate the officer workflow clearly.

You do not need advanced automation, analytics, or full escalation logic in this screen yet unless time permits.

## Route and file suggestion
Suggested route:

- `app/officer/complaints/[id]/page.tsx`

Suggested related components:

- `components/officer/complaint-summary-card.tsx`
- `components/officer/complaint-timeline.tsx`
- `components/officer/status-action-panel.tsx`
- `components/officer/internal-note-box.tsx`
- `components/officer/attachment-gallery.tsx`

## Acceptance criteria
This screen is complete when:

- The officer can understand the complaint at a glance.[cite:3][cite:17]
- The status and timeline are visible and easy to read.
- The officer can update the complaint from the same screen.
- Attachments and notes are accessible.
- The layout feels clean, efficient, and demo-ready.
