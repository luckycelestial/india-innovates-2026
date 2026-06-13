# Officer Queue / List View — PRAJA

## Purpose
This screen shows the list of complaints assigned to a specific officer. It should act as the main working queue where the officer can quickly scan, filter, open, and process complaints.[cite:3][cite:17][cite:20]

## Screen goal
The screen should help the officer answer three questions immediately:

- What is assigned to me?
- What needs attention first?
- Which complaint should I open now?

For PRAJA, this queue is one of the most operationally important screens because it turns the complaint intake flow into a visible work pipeline.[cite:17][cite:20]

## Tech context
Build this screen using Next.js, Tailwind CSS, and TypeScript so it stays consistent with the rest of the PRAJA app.[cite:2][cite:11] The queue can read from Supabase and optionally update in near real time when new complaints are assigned or statuses change.[cite:2][cite:7]

## Core functions
The officer queue should support:

- Search by complaint ID, name, category, or location.
- Filter by status.
- Filter by priority.
- Sort by newest, oldest, urgent, or overdue.
- Open complaint details.
- Bulk scan of complaint state.

This screen should be optimized for speed and clarity, not decoration.

## Recommended layout
A strong layout is:

### 1. Queue header
Show:

- Page title: `Assigned Complaints`
- Short summary counts
- Search bar
- Filter controls
- Sort control

The summary counts can show things like:

- Total assigned.
- Pending.
- In progress.
- Overdue.
- Resolved today.

### 2. Complaint list area
Use either:

- a searchable table, or
- responsive cards for mobile-first viewing.

For desktop, a table is ideal because it allows fast scanning. For mobile, cards are easier to read.

### 3. Empty / loading states
Include a friendly empty state when no complaints are assigned. Show a loading skeleton while fetching from Supabase.

## Table columns
If you choose a table, these columns are useful:

- Complaint ID.
- Title.
- Category.
- Ward or location.
- Priority.
- Status.
- Submitted time.
- SLA / due indicator.
- Action button.

This set gives the officer enough context to decide what to open without leaving the list.

## Card list alternative
If you choose cards, each card should show:

- Complaint title.
- Short description snippet.
- Status chip.
- Priority chip.
- Ward / location.
- Last updated time.
- Open button.

Cards work well when the demo needs to feel more visual and less spreadsheet-like.

## Visual hierarchy
The screen should make urgent items obvious.

Suggested emphasis order:

1. Overdue complaints.
2. High-priority complaints.
3. Newly assigned complaints.
4. Recently updated complaints.

This is important because PRAJA is not just about storing complaints — it is about helping officers act on them efficiently.[cite:17][cite:20]

## Status and badges
Use compact chips for status and urgency:

- Submitted.
- Assigned.
- In progress.
- Pending review.
- Resolved.
- Escalated.

Priority chips can be:

- Low.
- Medium.
- High.
- Urgent.

These should be color-coded but still readable in low-light or low-bandwidth conditions.

## Actions per row or card
Each complaint entry should allow the officer to:

- Open detail workspace.
- Update status.
- Add note.
- Reassign.
- Mark resolved.

For the demo, the main action is `Open` because the full edit workflow will happen in the detail workspace.

## Suggested filters
Useful filter groups include:

- Status.
- Category.
- Priority.
- Ward.
- Date range.
- Overdue only.

You can keep the filter UI compact so the page stays easy to understand.

## Visual style
The design should feel efficient and official, matching PRAJA’s civic-tech identity.[cite:13][cite:17]

Suggested style direction:

- White or light slate background.
- Clean data table or card grid.
- Subtle borders.
- Strong row spacing.
- Clear hover states.
- Minimal icon usage.

## Mobile guidance
On mobile, switch from table to card layout.

- One complaint per card.
- Search stays at the top.
- Filters collapse into a drawer or dropdown.
- The open button should be easy to tap.

## Component breakdown
Suggested components:

- `QueueHeader`
- `ComplaintSearchBar`
- `QueueFilters`
- `QueueStatsCards`
- `ComplaintTable`
- `ComplaintCardList`
- `QueueRowActions`
- `EmptyQueueState`

This modular approach fits well with Next.js + TypeScript and keeps the screen maintainable.[cite:11]

## Tailwind structure suggestion

```tsx
export default function OfficerQueuePage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="space-y-6">
          {/* header, stats, filters, list */}
        </div>
      </section>
    </main>
  )
}
```

Useful classes:

- `space-y-6`
- `rounded-2xl border border-slate-200 bg-white shadow-sm`
- `grid gap-4 sm:grid-cols-2 xl:grid-cols-4`
- `overflow-x-auto`
- `sticky top-4`

## Data behavior
The queue should read assigned complaints using officer identity or role-based filtering from Supabase.[cite:2][cite:7]

Likely fields:

- `id`
- `title`
- `category`
- `ward`
- `priority`
- `status`
- `assigned_to`
- `submitted_at`
- `updated_at`
- `sla_due_at`

If realtime is available, the list should refresh automatically when assignment or status changes occur.[cite:2][cite:7]

## Demo-ready scope
For the presentation, this screen only needs to show a handful of assigned complaints and allow opening one complaint detail page.

That is enough to demonstrate the officer workflow clearly without building the entire back-office system.

## Route and file suggestion
Suggested route:

- `app/officer/dashboard/page.tsx`

Suggested related components:

- `components/officer/queue-header.tsx`
- `components/officer/complaint-table.tsx`
- `components/officer/queue-filters.tsx`
- `components/officer/queue-stats-cards.tsx`
- `components/officer/complaint-card-list.tsx`

## Acceptance criteria
This screen is complete when:

- The officer can see all assigned complaints at a glance.[cite:3][cite:17]
- Search and filtering work clearly.
- Urgent and overdue items stand out.
- The officer can open a complaint quickly.
- The screen is responsive and presentation-ready.
