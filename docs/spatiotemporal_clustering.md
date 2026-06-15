# Spatiotemporal Clustering Design

Design for implementing advanced spatiotemporal clustering, MO similarity analysis, and anomaly detection in the KSP Crime platform.

## Architecture Steps

### Step 1: Spatiotemporal Binning & Custom ST-DBSCAN (First Step)
- Group raw incidents based on spatial distance (coordinates) and temporal distance (hours/days).
- Implement a custom JavaScript/TypeScript ST-DBSCAN clustering algorithm to group dense points.
- Output cluster lists with spatial center, radius, and time-frame.

### Step 2: Modus Operandi (MO) Similarity Filtering
- Parse categorical MO fields (e.g., target, tool, entry method).
- Compute Jaccard/Cosine similarity between crimes in the same spatial cluster to detect series.

### Step 3: Auto-correlation & Temporal Trends
- Detect repeating crime rhythms per zone (e.g. weekly or bi-weekly patterns).

### Step 4: Isolation Forest Anomaly Detection
- Flag contextual anomalies (e.g. unusual crime counts for specific weekdays/areas).

---

## Step 1 Implementation Detail: TypeScript ST-DBSCAN

```typescript
export interface ClusterPoint {
  id: string;
  latitude: number;
  longitude: number;
  timeMs: number;
  processed: boolean;
  clusterId: number | null;
}

// ST-DBSCAN implementation
export function runStDbscan(
  points: ClusterPoint[],
  spatialEpsKm: number,
  temporalEpsMs: number,
  minPts: number
): Map<number, ClusterPoint[]> {
  // ... custom algorithm ...
}
```
