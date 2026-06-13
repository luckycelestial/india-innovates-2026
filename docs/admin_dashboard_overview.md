# Admin Dashboard Overview — PRAJA

## Purpose
This screen is the main oversight dashboard for admin users. It should give a fast, high-level view of system health, complaint volume, department performance, and overdue items so the admin can monitor the whole PRAJA workflow at a glance.[cite:3][cite:10][cite:17]

## Screen goal
The goal is to make administrative oversight simple and actionable. The admin should immediately see where complaints are concentrated, which departments are underperforming, and what needs escalation.[cite:10][cite:17][cite:20]

## Tech context
Build this screen using Next.js, Tailwind CSS, and TypeScript so it matches the rest of PRAJA.[cite:2][cite:11] The dashboard should read from Supabase and can render live or near-real-time metrics without needing external BI tooling for the demo.[cite:2][cite:7][cite:10]

## Core dashboard metrics
Show these top-level metrics prominently:

- Total complaints.
- Open complaints.
- Resolved complaints.
- Overdue complaints.
- Complaints escalated.
- Department response rate.
- Average resolution time.

These values provide the admin with an immediate summary of platform performance.[cite:10][cite:17]

## Recommended layout
The dashboard should be organized into clear sections:

### 1. KPI cards
At the top, show compact summary cards for the most important counts.

Suggested cards:

- Total complaints.
- Open complaints.
- Resolved complaints.
- Overdue items.

### 2. Department performance section
Show how each department is performing on resolution speed, volume, and overdue cases.

This can be a table, bar chart, or card grid depending on time.

### 3. Trend or volume chart
Add a simple chart showing complaints over time, by category, or by ward.

Earlier PRAJA planning supported building analytics directly in the frontend instead of relying on Power BI embeds, which keeps the experience faster and more controllable.[cite:10]

### 4. Overdue / escalation panel
Show a focused list of the complaints that need immediate attention.

This should highlight:

- Overdue complaints.
- Repeated escalations.
- Departments with slow response.

### 5. Quick actions panel
Allow the admin to jump to important system actions:

- View complaint queue.
- Review escalations.
- Manage departments.
- Inspect analytics.

## Visual hierarchy
The admin should be able to answer these questions in under 10 seconds:

- How many complaints are in the system?
- What is still open?
- Who is lagging?
- What is overdue?

The dashboard should prioritize clarity over decoration.

## Data sections to include
A useful admin view can include:

- Complaint volume by day or week.
- Complaint status breakdown.
- Department-wise workload.
- Ward-wise complaint concentration.
- Escalation count.
- Resolution percentage.

These sections align well with PRAJA’s analytics and accountability goals.[cite:10][cite:17]

## Suggested chart types
If you add charts, use simple and readable visuals:

- Bar chart for complaints by department.
- Line chart for complaint trend over time.
- Pie or donut chart for complaint status split.
- Heatmap or ward concentration view if time permits.

## Visual style
The design should feel official, serious, and information-dense without becoming cluttered.

Suggested style direction:

- White cards on a light background.
- Navy or teal primary accents.
- Soft chart colors.
- Strong spacing between sections.
- Clear labels and tooltips.

This should feel like a civic operations center, not a consumer app dashboard.[cite:13][cite:17]

## Mobile guidance
On smaller screens:

- Stack KPI cards into a 2-column or 1-column layout.
- Collapse charts into a vertical flow.
- Keep the overdue panel near the top.
- Make charts horizontally scrollable if needed.

## Component breakdown
Suggested reusable components:

- `AdminDashboardHeader`
- `KpiCardGrid`
- `ComplaintTrendChart`
- `DepartmentPerformanceTable`
- `OverdueComplaintsPanel`
- `EscalationSummaryCard`
- `QuickActionsPanel`

This keeps the implementation modular and easier to expand later.[cite:11]

## Tailwind structure suggestion

```tsx
export default function AdminDashboardPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="space-y-6">
          {/* header, KPIs, charts, panels */}
        </div>
      </section>
    </main>
  )
}
```

Useful classes:

- `space-y-6`
- `grid gap-4 sm:grid-cols-2 xl:grid-cols-4`
- `rounded-2xl border border-slate-200 bg-white shadow-sm`
- `overflow-hidden`
- `sticky top-4`

## Data behavior
The dashboard should query Supabase for complaint summaries, department metrics, and overdue counts.[cite:2][cite:7] If you later add realtime updates, the admin can watch the system change as new complaints come in or get resolved.[cite:2][cite:7]

Likely fields:

- `status`
- `department`
- `ward`
- `priority`
- `created_at`
- `updated_at`
- `resolved_at`
- `escalated_at`

## Demo-ready scope
For the presentation, the dashboard only needs enough data to show the platform is actively monitoring complaints. A few KPI cards, one table, one chart, and one overdue panel are enough to communicate the value.

## Route and file suggestion
Suggested route:

- `app/admin/dashboard/page.tsx`

Suggested related components:

- `components/admin/kpi-card-grid.tsx`
- `components/admin/complaint-trend-chart.tsx`
- `components/admin/department-performance-table.tsx`
- `components/admin/overdue-complaints-panel.tsx`
- `components/admin/quick-actions-panel.tsx`

## Acceptance criteria
This screen is complete when:

- The admin can see overall complaint health at a glance.[cite:10][cite:17]
- Department performance is visible.
- Overdue items are easy to identify.
- The dashboard feels authoritative and presentation-ready.
- The layout stays readable on desktop and mobile.
