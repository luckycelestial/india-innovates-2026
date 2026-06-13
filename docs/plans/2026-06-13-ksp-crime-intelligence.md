# Karnataka State Police (KSP) Crime Intelligence & Analytical Platform Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a state-of-the-art Crime Intelligence & Analytical Platform for KSP with geospatial hotspotting, criminological node link analysis, repeat offender profiling, and predictive socio-economic risk dashboards.

**Architecture:** Implement three dedicated administrative intelligence modules under Next.js App Router: `/admin/crime-intelligence` (Geospatial & drilldowns), `/admin/link-analysis` (SVG relationship graph), and `/admin/predictive-insights` (correlation metrics). The backend retrieves spatiotemporal data from structured Supabase schemas and renders lightweight client-side SVG visualizations.

**Tech Stack:** Next.js, Supabase, TypeScript, TailwindCSS v4, Lucide React, OpenStreetMap Leaflet.

---

### Task 1: Database Schema Migration
**Files:**
- Create: `supabase/migrations/20260613000000_ksp_schema.sql`
- Create: `scripts/seed_ksp_data.ts`

**Step 1: Write SQL Schema migration**
Create tables for KSP database:
- `ksp_incidents`: ID, case number, category, description, location, district, police_station, lat, lng, date_time, priority, modus_operandi, risk_score.
- `ksp_people`: ID, name, classification (suspect, victim, association), demographics.
- `ksp_connections`: ID, incident_id, person_id, role.

**Step 2: Commit Schema & Seed Script**
Verify setup.

---

### Task 2: Geospatial & Hotspotting Dashboard
**Files:**
- Create: `app/admin/crime-intelligence/page.tsx`
- Create: `components/ksp/crime-map.tsx`
- Modify: `components/shared/sidebar.tsx`

**Step 1: Build Drilldown and Hotspotting view**
Geospatial map with spatiotemporal filters (Night/Day, category, district) and pulsing alert indicators for category spikes.

**Step 2: Verify compile status**
Test routes.

---

### Task 3: Criminological Network & Link Analysis
**Files:**
- Create: `app/admin/link-analysis/page.tsx`
- Create: `components/ksp/network-graph.tsx`

**Step 1: Write interactive relationship node-link diagram**
SVG-based force-directed or interactive network graph linking suspects, victims, and incidents with profiling tools.

**Step 2: Verify compilation**
Check visual responsiveness.

---

### Task 4: Sociological Predictive Dashboard
**Files:**
- Create: `app/admin/predictive-insights/page.tsx`
- Create: `components/ksp/predictive-charts.tsx`

**Step 1: Write correlation, scoring, and anomaly detection views**
Charts matching urbanization levels, density, socio-economic factors with crime rates. Show forecasted high-risk zones.

**Step 2: Commit and verify**
Verify complete build.
