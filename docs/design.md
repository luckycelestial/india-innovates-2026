# design.md — Logistics Web Fleet Dashboard
**Source:** [Dribbble – Ronas IT | UI/UX Team](https://dribbble.com/shots/27459316-Logistics-Web-Fleet-Dashboard)  
**Product Name (in design):** Routeon

---

## 1. Overview

A logistics/fleet management web dashboard designed for dispatch officers and logistics teams. The UI is optimized for real-time operational awareness — live map tracking, order management, fuel analytics, and revenue reporting — all in one interface.

---

## 2. Color Palette

| Role                  | Hex       | Usage                                      |
|-----------------------|-----------|--------------------------------------------|
| Background / Surface  | `#E7E6E6` | Page background, card surfaces             |
| Muted / Border        | `#C4BEC6` | Dividers, subtle borders, inactive states  |
| Text / Dark           | `#040406` | Primary text, headings                     |
| Primary Accent        | `#0820A6` | CTA buttons, active nav, status chips, map pins |
| Teal / Map Tone       | `#6D9998` | Map background tones, secondary highlights |
| Sage / Chart Accent   | `#7B8F65` | Secondary chart bars, label backgrounds    |
| Deep Navy / Header    | `#36375D` | Navbar, sidebar, dark UI panels            |

### Color Usage Notes
- Light, neutral base palette with **bold blue (`#0820A6`)** as the dominant accent
- Status indicators use hatching/pattern fills (Loading = solid blue, In Transit = blue hatch, Unloading = black, Delivered = grey hatch)
- Revenue card uses a dark blue gradient (`#0820A6` → deep navy) for contrast

---

## 3. Typography

- **Font Style:** Clean, modern sans-serif (Inter or similar system sans-serif)
- **Weights used:**
  - `700` / Bold — Card metrics, revenue figures (e.g., `$281,161.00`)
  - `600` / Semi-bold — Section headings (e.g., "Status Performance Overview")
  - `400` / Regular — Table rows, labels, nav items
- **Sizes (approximate):**
  - Hero metric: `28–32px`
  - Card heading: `14–16px`
  - Table body: `12–13px`
  - Nav labels: `13px`
- **Text colors:** `#040406` on light surfaces; `#FFFFFF` on dark panels/cards

---

## 4. Layout & Structure

### Top Navigation Bar
- **Left:** Logo + Brand name ("Routeon." with wordmark)
- **Center:** Horizontal nav links — Overview · Orders · Drivers · Documents · Finance · Analytics
- **Right:** Search icon · Notification bell · User avatar + name + role ("Jacob Jones, Dispatch Officer") · Dropdown chevron
- Background: Dark navy (`#36375D`), white text

### Main Content Area (2-column grid)
**Left Column (~60% width):**
- Interactive map (full-width) with:
  - Search bar overlay ("South Bronx, New York")
  - Sort by filter dropdown ("In Transit")
  - Zoom controls (+ / −)
  - Map pin markers with tooltip card (Order ID + cargo type + weight)
- Orders table below the map:
  - Tab filter: All · Pending · Responded · **Assigned** (active) · Completed
  - Columns: Order ID | Customer | Route (From → To) | Weight | ETA | Status
  - Status badges: "In Transit", "Picked Up", "Delivered"

**Right Column (~40% width):**
- **Status Performance Overview card**
  - Bar chart with 4 status categories: Loading (42%), In Transit (14%), Unloading (25%), Delivered (19%)
  - Uses pattern fills (hatching) to differentiate without color-only reliance
- **Fuel Usage & Cost card**
  - Key metric: `7.4 L` (average fuel efficiency)
  - Sub-metrics: 78% Diesel | 62% Gasoline
  - Total cost: `$21.4k` | Month-over-month: `+6%`
  - Sparkline bar chart (Sep → Oct)
- **Revenue Over Time card** (dark blue gradient background)
  - Hero metric: `$281,161.00`
  - Growth: `+12.2% this month`
  - Area line chart (white line on dark)
  - Footer: 178 New Clients | $35,810.00 Peak Revenue Week

---

## 5. Components

### Cards
- Rounded corners (`border-radius: ~12px`)
- Subtle shadow or border on light cards
- Dark card for Revenue (inverted — white text on dark blue gradient)
- Expand icon (↗) on top-right of analytics cards

### Map
- Light map style (OpenStreetMap/Mapbox light theme)
- Custom square pin markers (dark background, truck icon)
- Tooltip popup: Order ID + cargo category + weight (blue accent background)

### Table
- Clean, borderless rows with subtle row hover
- Order ID in accent blue (clickable link)
- Route shown as two-line stacked (From / To city)
- Status column uses plain text labels (no badge pill)

### Tab Filter Bar
- Pill-style tabs; active tab = dark filled pill (`#040406`), inactive = plain text
- Accompanied by calendar icon + filter icon on right

### Buttons
- Primary: Rounded pill, `#0820A6` fill, white text ("Get in touch")
- Icon buttons: Ghost/outline style (search, bell, bookmark, calendar)

### Dropdowns / Selects
- Light border, rounded, with chevron icon
- e.g., "Sort by: In Transit"

---

## 6. Iconography

- Style: Outlined, minimal, monochrome icons
- Used for: Search, Notifications (bell), Bookmark, Calendar, Zoom controls, Truck/vehicle pins on map, Expand arrows on cards

---

## 7. Spacing & Grid

- **Container padding:** ~24–32px
- **Card gap:** ~16px
- **Inner card padding:** ~20px
- **Table row height:** ~48px
- **Grid:** 2-column split (~60/40) for main dashboard layout
- **Nav height:** ~56–64px

---

## 8. States & Interactions

- Active nav item: Visually distinct (likely underline or bold)
- Active tab filter: Dark filled pill
- Map pin hover: Tooltip card with order details
- Cards with expand icon (↗): Imply drill-down/modal behavior
- Order rows: Clickable (link-style Order ID)

---

## 9. Device / Viewport

- Designed for **tablet + desktop** (shown on iPad mockup in the Dribbble preview)
- Optimized for ~1280px+ desktop viewport
- Responsive-ready layout (grid-based)

---

## 10. Design Personality

| Attribute     | Value                        |
|---------------|------------------------------|
| Tone          | Professional, data-dense, clean |
| Aesthetic     | Modern SaaS dashboard        |
| Complexity    | High — multiple data modules |
| Accessibility | Pattern fills for status (color-blind friendly) |
| Target User   | Dispatch officers, logistics managers |