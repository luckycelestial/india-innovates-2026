# Nagaragupta

**Smart City Logistics & Fleet Management Dashboard**

Nagaragupta is a state-of-the-art logistics and fleet management dashboard designed for municipal dispatch officers and city operations teams. The platform provides real-time operational awareness by integrating live map tracking, order dispatching, fuel analytics, and revenue metrics in a unified, high-density dashboard.

---

## 1. Core Visual Design System (per Design Guidelines)

### Color Palette

| Role                  | Hex       | Usage                                      |
|-----------------------|-----------|--------------------------------------------|
| Background / Surface  | `#E7E6E6` | Page background, card surfaces             |
| Muted / Border        | `#C4BEC6` | Dividers, subtle borders, inactive states  |
| Text / Dark           | `#040406` | Primary text, headings                     |
| Primary Accent        | `#0820A6` | CTA buttons, active nav, status chips, map pins |
| Teal / Map Tone       | `#6D9998` | Map background tones, secondary highlights |
| Sage / Chart Accent   | `#7B8F65` | Secondary chart bars, label backgrounds    |
| Deep Navy / Header    | `#36375D` | Navbar, sidebar, dark UI panels            |

### Typography
- **Font Style:** Clean, modern sans-serif (Inter/system sans-serif)
- **Weights & Sizes:**
  - Hero Metrics: `28–32px` | Bold (`700`)
  - Section Headings: `14–16px` | Semi-bold (`600`)
  - Body & Table rows: `12–13px` | Regular (`400`)
  - Navigation labels: `13px` | Regular (`400`)

---

## 2. Layout & Structure

### Top Navigation Bar
- **Branding (Left):** Logo + Brand name ("Nagaragupta." with bold wordmark)
- **Navigation (Center):** Horizontal navigation links: Overview · Orders · Drivers · Documents · Finance · Analytics
- **User Actions (Right):** Search icon · Notification bell · User avatar with name and role ("Jacob Jones, Dispatch Officer") and dropdown chevron
- **Styling:** Deep Navy (`#36375D`) background with white (`#FFFFFF`) text

### Main Dashboard Workspace (2-Column Grid)

#### Left Column (~60% Width)
1. **Interactive Fleet Map**
   - Light-themed map layout with search bar overlay ("South Bronx, New York")
   - Filter dropdown ("Sort by: In Transit")
   - Controls: Zoom in/out (+ / −)
   - Map pin markers: Custom square pins with truck icons
   - Tooltip popup: Displays Order ID, cargo category, and cargo weight with a blue accent background
2. **Orders & Deliveries Table**
   - Tab Filters: All · Pending · Responded · **Assigned** (active tab) · Completed
   - Tab styling: Active tab uses a dark filled pill (`#040406`) with white text; inactive tabs use plain text
   - Columns: Order ID (clickable blue link) | Customer | Route (From → To city stack) | Weight | ETA | Status
   - Status labels: plain text ("In Transit", "Picked Up", "Delivered") without heavy pill containers

#### Right Column (~40% Width)
1. **Status Performance Overview Card**
   - Bar chart showing distribution: Loading (42%), In Transit (14%), Unloading (25%), Delivered (19%)
   - Pattern fills (hatching/striping) used to ensure color-blind accessibility
2. **Fuel Usage & Cost Card**
   - Primary metric: `7.4 L` (average efficiency)
   - Sub-metrics: 78% Diesel | 62% Gasoline
   - Total Cost: `$21.4k` (with `+6%` MoM sparkline chart)
3. **Revenue Over Time Card**
   - Deep blue gradient background (`#0820A6` → `#36375D`) with white text
   - Hero metric: `$281,161.00` with `+12.2% this month` growth indicator
   - Area line chart (white trend line on dark gradient)
   - Footer metrics: 178 New Clients | $35,810.00 Peak Revenue Week

---

## 3. Interaction & States
- **Hover States:** Table rows have a subtle background highlight; links change opacity.
- **Active Navigation:** Currently selected nav link has a bold text style and underline.
- **Card Actions:** Each analytics card has an expand icon (↗) on the top-right to open a detailed modal view.
