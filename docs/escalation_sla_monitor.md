# Escalation / SLA Monitor — PRAJA

## Purpose
This screen shows complaints that are stuck too long, approaching their SLA limit, or already overdue. It helps admins and supervisors identify where action is needed before delays become visible to citizens.[cite:3][cite:17][cite:20]

## Screen goal
The goal is to make delays impossible to ignore. The admin should instantly see which complaints need escalation, which departments are slow, and how much time is left before a case becomes overdue.[cite:17][cite:20]

## Tech context
Build this screen using Next.js, Tailwind CSS, and TypeScript so it stays consistent with the rest of PRAJA.[cite:2][cite:11] The dashboard can read SLA data from Supabase and update whenever complaint status or time thresholds change.[cite:2][cite:7]

## Main monitoring focus
This screen should show:

- Complaints nearing SLA deadline.
- Overdue complaints.
- Stuck complaints with no update.
- Escalated complaints.
- Department-wise delay counts.
- Average time spent per stage.

This keeps PRAJA focused on accountability, not just intake and tracking.[cite:17][cite:20]

## Recommended layout
A strong layout is a monitoring dashboard with clear priority sections:

### 1. SLA summary cards
At the top, show cards like:

- Due in 1 hour.
- Due today.
- Overdue.
- Escalated.
- No update for 24 hours.

### 2. Stuck complaints table
Show a table or card list of the most delayed complaints.

Suggested columns:

- Complaint ID.
- Title.
- Department.
- Current status.
- Time since last update.
- SLA due time.
- Escalation level.

### 3. Department delay panel
Show which departments have the most delay or the highest overdue count.

### 4. SLA trend chart
A simple chart can show overdue trend or average response time over time.

### 5. Escalation log
Show the latest escalations so the admin can see what was automatically or manually escalated.

## Key rules
The monitor should classify complaints into states like:

- On track.
- Warning.
- At risk.
- Overdue.
- Escalated.

A complaint can move from warning to at risk if it gets close to the SLA threshold, especially for high-weight issues.[cite:20]

## Timing behavior
Because PRAJA’s SLA logic is based on weightage and importance, the screen should display both:

- elapsed time, and
- remaining time.

This makes it clear why a complaint is being flagged. A high-priority complaint should show a shorter tolerance window than a low-priority one.[cite:20]

## Visual style
The dashboard should feel urgent but still calm and readable.

Suggested style direction:

- White cards on a light slate background.
- Red or amber for overdue and warning states.
- Green for on-track items.
- Clear badges for elapsed time.
- Strong contrast for high-risk rows.

## Suggested alert behavior
You can show alerts in several ways:

- Top banner for critical overdue items.
- Color badges on table rows.
- Department cards with delay counts.
- Optional sound or toast alert in demo mode.

## Useful filters
The screen should allow filtering by:

- Department.
- Status.
- Priority.
- Time overdue.
- Escalation level.
- Ward.

This helps admins focus on the most urgent operational issues.

## Component breakdown
Suggested reusable components:

- `SlaSummaryCards`
- `StuckComplaintsTable`
- `DepartmentDelayPanel`
- `SlaTrendChart`
- `EscalationLogPanel`
- `RiskBadge`
- `OverdueFilterBar`

This modular structure fits cleanly into Next.js + TypeScript.[cite:11]

## Tailwind structure suggestion

```tsx
export default function EscalationSlaMonitorPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="space-y-6">
          {/* summary, tables, alerts, charts */}
        </div>
      </section>
    </main>
  )
}
```

Useful classes:

- `space-y-6`
- `grid gap-4 sm:grid-cols-2 xl:grid-cols-5`
- `rounded-2xl border border-slate-200 bg-white shadow-sm`
- `overflow-x-auto`
- `sticky top-4`

## Data behavior
The screen should read complaint timestamps and SLA fields from Supabase.[cite:2][cite:7] Likely fields include:

- `status`
- `priority`
- `department`
- `assigned_to`
- `submitted_at`
- `updated_at`
- `sla_due_at`
- `escalation_level`
- `last_note_at`

If a complaint has not been updated for too long, it should automatically appear in the stuck list.

## Demo-ready scope
For the presentation, the dashboard only needs a small set of mocked or seeded complaints so the overdue logic is visible. One warning card, one overdue table, and one escalation log are enough to communicate the idea.

## Route and file suggestion
Suggested route:

- `app/admin/escalations/page.tsx`

Suggested related components:

- `components/admin/sla-summary-cards.tsx`
- `components/admin/stuck-complaints-table.tsx`
- `components/admin/department-delay-panel.tsx`
- `components/admin/escalation-log-panel.tsx`
- `components/admin/sla-trend-chart.tsx`

## Acceptance criteria
This screen is complete when:

- Delayed complaints are easy to identify.[cite:17][cite:20]
- Overdue and near-due items stand out clearly.
- Department delays are visible.
- Escalation history is readable.
- The dashboard is responsive and ready for demo use.
