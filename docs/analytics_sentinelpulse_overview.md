# Analytics / SentinelPulse Overview — PRAJA

## Purpose
This screen gives admins a high-level analytics view of PRAJA through trends, hotspot counts, resolution rates, and other operational insights. It represents the SentinelPulse-style intelligence layer that turns complaint data into actionable governance information.[cite:3][cite:10][cite:17]

## Screen goal
The screen should help the admin understand what is happening across the system, where complaints are clustering, and how effectively complaints are being resolved. It should answer questions about volume, geography, speed, and trend direction in one place.[cite:10][cite:17][cite:20]

## Tech context
Build this screen using Next.js, Tailwind CSS, and TypeScript so it matches the rest of PRAJA.[cite:2][cite:11] The charts and tables can be powered by Supabase aggregation views, keeping the analytics fully embedded in the frontend instead of relying on external BI tools.[cite:2][cite:7][cite:10]

## Core analytics to show
The dashboard should include:

- Complaint trend over time.
- Hotspot counts by ward or zone.
- Resolution rate.
- Average resolution time.
- Complaint mix by category.
- Escalation rate.
- Open vs resolved split.
- Department performance.

These metrics reflect the central operational questions in PRAJA’s analytics story.[cite:10][cite:17]

## Recommended layout
A strong analytics overview can be divided into these sections:

### 1. KPI cards
Show the top-level numbers at the top of the page:

- Total complaints.
- Open complaints.
- Resolved complaints.
- Average resolution time.
- Hotspot wards.
- Escalated items.

### 2. Trend charts
Include a line or area chart that shows how complaints are changing over time.

This can be broken down by day, week, or month depending on the demo dataset.

### 3. Hotspot section
Show wards or zones with the highest complaint concentration.

A heatmap, ranked list, or bar chart can work here.

### 4. Resolution performance section
Display how fast complaints are being resolved and how resolution changes by department or ward.

### 5. Category distribution section
Show what types of complaints are most common.

This helps the admin understand whether the platform is seeing more road, water, sanitation, or electricity issues.

## SentinelPulse angle
If you want the screen to feel branded, label this analytics layer as SentinelPulse.

Possible framing:

- SentinelPulse Overview.
- Live civic intelligence.
- Complaint heat and resolution monitor.

This gives PRAJA a unique identity beyond a standard dashboard and reinforces the platform’s public-value story.[cite:17][cite:20]

## Visual style
The design should feel sharp, data-rich, and civic-focused.

Suggested style direction:

- Light background with white cards.
- Navy or teal highlights.
- Warm red or amber for hotspots.
- Clear chart legends.
- Minimal clutter.
- Strong spacing between sections.

## Suggested chart types
Use simple, readable charts:

- Line chart for complaint trends.
- Bar chart for hotspot counts.
- Donut chart for category split.
- Heatmap for ward concentration.
- Table for resolution performance.

Earlier PRAJA discussions supported building analytics directly in the frontend instead of using Power BI, which keeps the UI faster and more customizable.[cite:10]

## Filters
The screen should allow filtering by:

- Date range.
- Ward.
- Department.
- Category.
- Status.
- Priority.

This makes it useful both for quick presentation views and deeper operational checks.

## Component breakdown
Suggested reusable components:

- `SentinelPulseHeader`
- `AnalyticsKpiGrid`
- `ComplaintTrendChart`
- `HotspotHeatmap`
- `ResolutionPerformanceTable`
- `CategoryDistributionChart`
- `AnalyticsFilterBar`

This component structure works well in a Next.js + TypeScript frontend.[cite:11]

## Tailwind structure suggestion

```tsx
export default function AnalyticsOverviewPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="space-y-6">
          {/* header, KPI cards, charts, heatmaps */}
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
This screen should read aggregated complaint metrics from Supabase.[cite:2][cite:7] Likely fields include:

- `status`
- `category`
- `ward`
- `department`
- `created_at`
- `resolved_at`
- `escalated_at`
- `priority`

If you later add realtime updates, the analytics can refresh as new complaints arrive and existing ones are resolved.[cite:2][cite:7]

## Demo-ready scope
For the presentation, it is enough to show a clean set of KPI cards, one trend chart, one hotspot section, and one resolution table. That will make SentinelPulse feel real without overbuilding the dashboard.

## Route and file suggestion
Suggested route:

- `app/admin/analytics/page.tsx`

Suggested related components:

- `components/admin/sentinelpulse-header.tsx`
- `components/admin/analytics-kpi-grid.tsx`
- `components/admin/complaint-trend-chart.tsx`
- `components/admin/hotspot-heatmap.tsx`
- `components/admin/resolution-performance-table.tsx`
- `components/admin/category-distribution-chart.tsx`

## Acceptance criteria
This screen is complete when:

- Trends are visible and easy to understand.[cite:10][cite:17]
- Hotspot wards or zones stand out clearly.
- Resolution performance is easy to compare.
- The dashboard feels like a live civic intelligence tool.
- The layout is responsive and demo-ready.
