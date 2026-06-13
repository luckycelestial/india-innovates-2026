# Complaint Tracking Screen — PRAJA

## Purpose
This screen lets a citizen follow the progress of a submitted complaint after the success screen. It should show the current status, timeline, updates, and next expected action in a clear, reassuring way.[cite:3][cite:17][cite:20]

## Screen goal
The screen should answer the citizen’s main question: “What happened to my complaint?” It should make the workflow visible and reduce uncertainty by showing progress, updates, and resolution state.[cite:17][cite:20]

## Tech context
Build this screen using Next.js, Tailwind CSS, and TypeScript so it stays aligned with the rest of PRAJA.[cite:2][cite:11] The data can be fetched from Supabase using the complaint ID and rendered in real time or near real time.[cite:2][cite:7]

## Core information to show
The screen should include:

- Complaint ID.
- Current status.
- Complaint title.
- Submission date.
- Last updated time.
- Assigned department or officer.
- Timeline of status changes.
- Public notes or progress updates.
- Attachment preview, if relevant.
- Action buttons for refresh or share.

This directly supports PRAJA’s real-time tracking promise.[cite:17][cite:20]

## Recommended layout
A good tracking screen can be structured into three major sections:

### 1. Summary header
At the top, show the complaint title, ID, and current status badge.

This area should be immediately readable so the user knows whether the complaint is just submitted, in progress, or resolved.

### 2. Progress timeline
Use a vertical or horizontal stepper that shows each major stage:

- Submitted.
- Assigned.
- In progress.
- Pending review.
- Resolved.
- Reopened, if needed.

This gives the citizen a simple visual sense of movement through the workflow.[cite:17][cite:20]

### 3. Update feed
Show public updates in chronological order.

Each update can include:

- Time.
- Status label.
- Short message.
- Officer or department name.

This is important because the user should not have to interpret backend jargon.

## Suggested user actions
The citizen should be able to:

- Refresh status.
- Copy complaint ID.
- Share complaint reference.
- View complaint details.
- Return to home.

If you want, a “raise another complaint” link can also be added as a secondary action.

## Visual style
The screen should stay calm, transparent, and civic-oriented, consistent with PRAJA’s overall design direction.[cite:13][cite:17]

Suggested style direction:

- White cards on a light slate background.
- Clear status chips.
- Strong visual hierarchy for the latest update.
- Soft accent colors for progress states.
- Minimal but useful icons.

## Status design
A simple badge system works well for the demo:

- Submitted: gray or blue.
- Assigned: indigo.
- In progress: amber.
- Resolved: green.
- Escalated: red.

You can later connect this to the weighted SLA and escalation logic already discussed for PRAJA.[cite:20]

## Mobile guidance
This screen should be very mobile-friendly because citizens may check updates on their phone.

- Keep the complaint ID visible.
- Use stacked cards.
- Make badges readable.
- Keep the timeline compact.
- Make the main update easy to scan.

## Component breakdown
Suggested reusable components:

- `TrackingHeader`
- `StatusBadge`
- `ProgressTimeline`
- `UpdateFeed`
- `ComplaintSummaryCard`
- `ShareButtonGroup`
- `RefreshStatusButton`

This structure fits well with a modular Next.js + TypeScript codebase.[cite:11]

## Tailwind structure suggestion

```tsx
export default function ComplaintTrackingScreen() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="space-y-6">
          {/* header, timeline, updates */}
        </div>
      </section>
    </main>
  )
}
```

Useful classes:

- `space-y-6`
- `rounded-2xl border border-slate-200 bg-white shadow-sm`
- `flex items-center justify-between`
- `grid gap-4`
- `sticky top-4`

## Data behavior
The tracking screen can be powered by complaint ID lookup and Supabase data fetch.

Suggested data pieces:

- `id`
- `status`
- `category`
- `title`
- `submitted_at`
- `updated_at`
- `timeline_events`
- `public_updates`
- `assigned_department`
- `assigned_officer`

If realtime is available, the timeline can update automatically whenever the officer changes the complaint status.[cite:2][cite:7]

## Demo-ready scope
For the presentation, the screen only needs to show one sample complaint being tracked successfully. A refresh control or real-time update animation is enough to demonstrate the concept.

No advanced search or multi-complaint management is needed yet.

## Route and file suggestion
Suggested route:

- `app/track/page.tsx`

Suggested related components:

- `components/tracking/tracking-header.tsx`
- `components/tracking/progress-timeline.tsx`
- `components/tracking/update-feed.tsx`
- `components/tracking/share-button-group.tsx`
- `components/tracking/complaint-summary-card.tsx`

## Acceptance criteria
This screen is complete when:

- The citizen can clearly see the complaint status.[cite:17]
- The timeline shows how the complaint has progressed.
- Updates are easy to read.
- The layout feels trustworthy and calm.
- The page works well on mobile and desktop.
