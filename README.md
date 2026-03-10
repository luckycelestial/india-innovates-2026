# PRAJA — India Innovates 2026

AI-powered Citizen Grievance & Constituency Intelligence Platform.

---

## How the Heatmap is Displayed

The project has **two complementary heatmap views** — both rendered inside the **SentinelPulse** section of the Leader Dashboard (`src/pages/leader/LeaderDashboard.jsx`).

---

### 1. Score Grid Heatmap (`HeatMapGrid`)

**File:** `src/pages/leader/LeaderDashboard.jsx` (inline component `HeatMapGrid`)

This is a simple **4-column CSS grid** of clickable ward tiles. Each tile shows:

| Field | Description |
|---|---|
| Ward number | Identifier |
| Sentiment score (0–100) | Composite satisfaction/grievance score |
| Trending arrow | % change vs previous period |

**Color coding by score:**

| Score range | Color | Meaning |
|---|---|---|
| 70 – 100 | 🟢 Green (`#22c55e`) | Satisfied — no intervention needed |
| 45 – 69 | 🟡 Gold (`#f59e0b`) | Moderate — monitor closely |
| 25 – 44 | 🟠 Saffron (`#FF6B00`) | Tense — schedule engagement |
| 0 – 24 | 🔴 Red (`#ef4444`) | Crisis — immediate action required |

Clicking a tile opens a **drilldown panel** below the grid showing active issues, sentiment trend, and an AI-generated recommendation.

---

### 2. Leaflet Circle Map (`SentinelHeatmap`)

**File:** `src/components/SentinelHeatmap.jsx`

This is a full **interactive geographic map** powered by [React-Leaflet](https://react-leaflet.js.org/) on an **OpenStreetMap** tile layer.

#### How the data flows

```
Backend API  →  /nayakai/morning-brief
     ↓
totalOpen + criticalOpen counts
     ↓
distributeGrievances()  ← weighted distribution across 10 Delhi wards
     ↓
DELHI_WARDS array enriched with { count, critical }
     ↓
One <Circle> per ward rendered on the map
```

1. On mount, `loadHeatmapData()` calls `POST /nayakai/morning-brief` to get system-wide totals (`total_open`, `critical_open`, `sla_violations`).
2. `distributeGrievances(totalOpen, criticalOpen)` spreads those counts across **10 Delhi wards** using predefined weights (summing to 1), so high-density areas like Connaught Place receive proportionally more grievances.
3. Each ward in `DELHI_WARDS` is enriched with a `count` (open grievances) and a `critical` number.

#### Map rendering

- **Base layer:** OpenStreetMap tiles via `<TileLayer>`.
- **Ward markers:** A `<Circle>` component is drawn at each ward's real lat/lng coordinate with a fixed radius of **900 metres**.
- **Fill color** is determined by `getColor(count)`:

| Count | Color | Severity |
|---|---|---|
| 0 | `#22c55e` (green) | Normal |
| 1–2 | `#86efac` (light green) | Low |
| 3–4 | `#fde047` (yellow) | Moderate |
| 5–7 | `#fb923c` (orange) | High |
| 8–10 | `#f87171` (light red) | Critical |
| 11+ | `#dc2626` (red) | Critical |

- **Popup on click:** Shows ward name, constituency, open grievance count, critical count, and a color-coded severity badge.
- **`MapAutoFit`:** A small helper component that re-centres the map to Delhi (`[28.6139, 77.2090]`, zoom 11) whenever ward data changes.

#### Below the map

- **Stats row** — three KPI cards: Open Grievances / Critical / SLA Violations (only shown when the API call succeeds).
- **Legend** — five colour swatches matching the severity scale above.
- **Ward list** — all 10 wards sorted by grievance count (descending), each card highlighted with a red border when `count ≥ 8`.
- **Refresh button** — re-runs `loadHeatmapData()` on demand.

---

### Where it is rendered

```
LeaderDashboard  (activeModule === "sentinel")
  ├── HeatMapGrid            ← score-based tile grid
  └── SentinelHeatmap        ← Leaflet circle map
```

Both views are shown side-by-side on the Sentinel tab of the Leader Dashboard.
