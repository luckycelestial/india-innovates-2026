# Nagaragupta – Official Operations Dashboard

The **Official Operations Dashboard** is the primary workspace for ward officers, department users, and admins in Nagaragupta. It combines live feeds, open datasets, citizen complaints, and internal workflows into a single command view, similar in spirit to modern Integrated Command and Control Centre (ICCC) dashboards used in Indian smart cities. [web:152][web:154][web:161]

---

## 1. Purpose of this screen

- Give officials a **real-time picture** of the city: environment, mobility, and civic issues.
- Convert raw complaints into **prioritized, assignable work**.
- Present **historical trends and KPIs** for strategic planning.
- Support **role-based views** (ward officer vs department user vs admin), a pattern used in practical smart-city SLA dashboards. [web:152][web:217][web:265]

---

## 2. Layout overview

### Top bar

- Nagaragupta logo + product name.
- Current city and ward (with switcher for multi-city demos).
- Global search (complaint ID, location, citizen, asset).
- User avatar with role and quick links:
  - Profile
  - Switch Role (if multi-role)
  - Logout

### Main grid (desktop)

Divide into 3 bands:

1. **Band A – High-level KPIs and alerts (top row)**  
2. **Band B – Map + complaint queue (middle row)**  
3. **Band C – Analytics and trends (bottom row)**  

On mobile, stack these sections vertically with collapsible cards.

---

## 3. Band A – High-level KPIs & alerts

A row of 4–6 cards that change slightly by role.

### Example KPI cards

- **Open complaints (today / total)**
- **SLA breach risk (next 24 hours)** – count of complaints approaching SLA.
- **Resolved in last 24 hours**
- **AQI status for city** – current AQI + health band.
- **Rain / flood watch** – risk level for the day.
- **Traffic incidents (today)** – from datasets or mock feeds.

Each card should show:

- Value + small trend indicator (up/down vs previous period).
- Click to drill down into a filtered view.

Admins may see city-wide KPIs, while ward officers see ward-scoped numbers only; this follows how real SLA dashboards provide different role-based views. [web:152][web:217][web:265]

---

## 4. Band B – City map + complaint queue

This is the “live command” section.

### 4.1 Interactive city map (left side)

- Base layer: city map (Google Maps / OSM).
- Overlays (toggleable):
  - **Complaint heatmap**
  - Ward boundaries
  - Key civic layers (e.g., AQI stations, major roads, transit stops) from open datasets.
- Clicking on a ward:
  - Shows summary: open complaints, SLA breaches, top categories.
- Clicking on a complaint pin:
  - Opens a side panel with complaint details and quick actions.

Map behavior reflects how smart-city dashboards overlay multiple dynamic datasets at once to support integrated decisions. [web:266][web:267]

### 4.2 Priority complaint queue (right side)

A sortable, filterable table/list of complaints.

**Columns:**

- ID
- Category (Roads / Water / Waste / Streetlights / Etc.)
- Location (area / ward)
- Age (time since created)
- SLA status (On track / At risk / Breached)
- Priority score (High / Medium / Low)
- Assigned to (officer/contractor)
- Status (New / In Progress / Resolved / Reopened)

**Filters:**

- Ward
- Department
- Category
- SLA status
- Priority
- Date range

**Actions:**

- Open complaint detail workspace.
- Assign / reassign to officer or contractor.
- Change status (with mandatory notes).
- Add internal comments.

This mirrors real ICCC complaint-monitoring cells that track booked, attended, and pending complaints under various categories, often producing 24-hour reports. [web:168][web:238]

---

## 5. Band C – Analytics, trends, and datasets

### 5.1 Complaint analytics

Charts and tables for:

- **Category distribution** (pie/bar).
- **Ward-wise issue volume** (bar/heatmap).
- **SLA performance over time** (line graph).
- **Top recurring locations / streets** (list).

The goal is to move from just “counting complaints” to **pattern detection**, enabling preventive actions, similar to how integrated platforms use aggregated dashboards for day-to-day and strategic decisions. [web:154][web:266][web:215]

### 5.2 Environment & mobility panels

Use live APIs + open datasets to show:

- AQI trend for the last 24–72 hours.
- Weather / rainfall summary for the day.
- Selected mobility stats (e.g., accidents from OpenCity data, transit utilization from GTFS-based datasets) depending on what you load.

Each panel links to a detail view where officials can explore that data source further.

### 5.3 Dataset explorer (for admins / analysts)

Simple UI to:

- List available datasets (OpenCity, data.gov.in, smartcities portal, internal).
- Show metadata: source, fields, refresh schedule.
- Preview sample rows.
- Add dataset as a widget to the dashboard.

This aligns with the idea of smart-city dashboards that integrate multiple data sources (energy, weather, pollution, water meters, etc.) into a live interface. [web:267]

---

## 6. Role-based versions

### 6.1 Ward Officer view

- Default scoped to **their ward**.
- Map centered on their area.
- Complaint queue filtered to their ward.
- KPI cards focused on:
  - Open complaints in ward.
  - SLA risk in ward.
  - Category breakdown.

### 6.2 Department Officer view

- Scoped by **category** (Solid Waste, Roads, Water).
- Complaint queue filtered by department.
- Analytics show department performance across wards.
- Useful for contractor and field-team coordination, similar to implementations that route complaints to the right contractor and track SLA risk. [web:238][web:265]

### 6.3 Admin / City Leadership view

- City-wide numbers.
- Cross-department KPI snapshots.
- Ward-comparison views.
- More strategic indicators (e.g., monthly trend, recurring hotspots).

This hierarchy matches real-world smart-city dashboard practice where commissioners see aggregate SLA health and ward officers drill into zones. [web:265][web:271]

---

## 7. Actions from the dashboard

From this screen, an official should be able to:

- **Assign / reassign** complaints and create work orders.
- **Change statuses** with notes.
- **Trigger alerts** (e.g., notify contractor, escalate to admin).
- **Save / export reports** (24-hour report, ward report, category report).
- **Customize widgets** shown on their dashboard (admins only).

---

## 8. Navigation and routes

Suggested Next.js routes:

- `/official/dashboard` – auto-redirect to role-specific default.
- `/official/dashboard/ward` – ward officer view.
- `/official/dashboard/department` – department view.
- `/official/dashboard/admin` – city-wide view.
- `/official/complaints/[id]` – complaint detail workspace.
- `/official/datasets` – dataset explorer.
- `/official/reports` – exportable reports.

---

## 9. Done criteria for hackathon demo

The **Official Operations Dashboard** is demo-ready when:

- An official demo user can log in and see:
  - KPI strip
  - Map with overlays
  - Complaint queue
  - At least one analytics chart
- Filters work for ward / department.
- Clicking a complaint opens a detail pane or page.
- There is at least **one live-ish feed** (e.g., AQI or weather) and **one open dataset** powering the charts, alongside **mock complaints** stored in your DB.

This mirrors how ICCC and smart-city dashboards are described in practice: live, data-rich, role-based, and focused on converting information into action. [web:152][web:157][web:266]