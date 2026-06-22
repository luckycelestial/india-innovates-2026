import { KspIncident } from './mockData'

// Haversine formula for distance between two coordinates in kilometers
export function getHaversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export interface StDbscanPoint {
  id: string
  latitude: number
  longitude: number
  timeMs: number
  originalIndex: number
}


export interface StDbscanCluster {
  clusterId: number
  points: StDbscanPoint[]
  centerLat: number
  centerLon: number
  radiusKm: number
  startTime: string
  endTime: string
}

// ST-DBSCAN Algorithm
export function runStDbscan(
  points: StDbscanPoint[],
  spatialEpsKm: number, // Spatial search radius in km (e.g. 5km)
  temporalEpsMs: number, // Temporal search window in ms (e.g. 7 days in ms)
  minPts: number // Minimum points to form a cluster
): StDbscanCluster[] {
  const processed = new Set<string>()
  const clusterAssignments = new Map<string, number>()
  let currentClusterId = 0

  function getNeighbors(point: StDbscanPoint): StDbscanPoint[] {
    return points.filter(p => {
      if (p.id === point.id) return false
      const spatialDist = getHaversineDistanceKm(point.latitude, point.longitude, p.latitude, p.longitude)
      const temporalDist = Math.abs(point.timeMs - p.timeMs)
      return spatialDist <= spatialEpsKm && temporalDist <= temporalEpsMs
    })
  }

  for (const p of points) {
    if (processed.has(p.id)) continue
    processed.add(p.id)

    const neighbors = getNeighbors(p)
    if (neighbors.length < minPts - 1) {
      // Noise
      continue
    }

    // New Cluster
    currentClusterId++
    clusterAssignments.set(p.id, currentClusterId)

    const seeds = [...neighbors]
    for (let i = 0; i < seeds.length; i++) {
      const currentSeed = seeds[i]

      if (!processed.has(currentSeed.id)) {
        processed.add(currentSeed.id)
        const seedNeighbors = getNeighbors(currentSeed)
        if (seedNeighbors.length >= minPts - 1) {
          // Add unique neighbors to seeds queue
          for (const sn of seedNeighbors) {
            if (!seeds.some(s => s.id === sn.id)) {
              seeds.push(sn)
            }
          }
        }
      }

      if (!clusterAssignments.has(currentSeed.id)) {
        clusterAssignments.set(currentSeed.id, currentClusterId)
      }
    }
  }

  // Format clusters output
  const clusterMap = new Map<number, StDbscanPoint[]>()
  clusterAssignments.forEach((cId, pId) => {
    const pt = points.find(p => p.id === pId)
    if (pt) {
      if (!clusterMap.has(cId)) {
        clusterMap.set(cId, [])
      }
      clusterMap.get(cId)!.push(pt)
    }
  })

  const results: StDbscanCluster[] = []
  clusterMap.forEach((pts, cId) => {
    // Calculate cluster metadata
    const centerLat = pts.reduce((sum, p) => sum + p.latitude, 0) / pts.length
    const centerLon = pts.reduce((sum, p) => sum + p.longitude, 0) / pts.length

    // Max distance from center defines the radius (ensure a minimum visible radius of 0.2km)
    const maxDist = pts.reduce((max, p) => {
      const dist = getHaversineDistanceKm(centerLat, centerLon, p.latitude, p.longitude)
      return Math.max(max, dist)
    }, 0.2)

    const times = pts.map(p => p.timeMs)
    const minTime = new Date(Math.min(...times)).toISOString()
    const maxTime = new Date(Math.max(...times)).toISOString()

    results.push({
      clusterId: cId,
      points: pts,
      centerLat,
      centerLon,
      radiusKm: maxDist,
      startTime: minTime,
      endTime: maxTime
    })
  })

  return results
}

export interface MoFeatures {
  targets: string[]
  tools: string[]
  methods: string[]
}

export function parseModusOperandi(mo: string): MoFeatures {
  const text = mo.toLowerCase()
  const targets: string[] = []
  const tools: string[] = []
  const methods: string[] = []

  // Target keywords
  const targetMap: Record<string, string[]> = {
    'retail/commercial': ['gold', 'jewelry', 'store', 'shop', 'bank', 'atm', 'warehouse', 'cargo'],
    'vehicle': ['car', 'vehicle', 'truck', 'key fob', 'fob'],
    'individual/financial': ['pension', 'pensioner', 'elderly', 'retired', 'student', 'victim'],
    'telecom/network': ['sim', 'telecom', 'otp', 'network', 'phone'],
    'residential': ['house', 'villa', 'home', 'residential', 'apartment']
  }

  // Tool keywords
  const toolMap: Record<string, string[]> = {
    'gas/cutting': ['gas cutter', 'cutter', 'welding', 'torch'],
    'digital/links': ['link', 'phishing', 'sms', 'email', 'otp', 'phish'],
    'physical/weapons': ['knife', 'wooden log', 'iron rod', 'rod', 'blunt object', 'stick'],
    'logistics/vehicles': ['logistics', 'courier', 'speedboat', 'boat', 'car', 'vehicle'],
    'rf/electronic': ['spoofer', 'signal grabber', 'scanner', 'electronic', 'signal'],
    'mechanical/lockpick': ['lockpick', 'toolset', 'latch', 'pick']
  }

  // Method keywords
  const methodMap: Record<string, string[]> = {
    'phishing/spoofing': ['impersonating', 'phishing', 'spoofing', 'spoof', 'sms swap', 'sim swap', 'fake'],
    'bypass/tampering': ['spray-painted', 'disconnected', 'cut', 'alarm', 'cctv'],
    'physical/coercion': ['physical', 'coercion', 'knife point', 'threat', 'hit', 'assault'],
    'luring/pretext': ['pretext', 'lured', 'enticed'],
    'stealth/clandestine': ['night-time', 'afternoon', 'vacant', 'disguised', 'transfer at sea']
  }

  for (const [category, words] of Object.entries(targetMap)) {
    if (words.some(word => text.includes(word))) {
      targets.push(category)
    }
  }
  for (const [category, words] of Object.entries(toolMap)) {
    if (words.some(word => text.includes(word))) {
      tools.push(category)
    }
  }
  for (const [category, words] of Object.entries(methodMap)) {
    if (words.some(word => text.includes(word))) {
      methods.push(category)
    }
  }

  // Fallback: tokenize general words
  if (targets.length === 0) targets.push('general')
  if (tools.length === 0) tools.push('opportunistic')
  if (methods.length === 0) methods.push('standard')

  return { targets, tools, methods }
}

export function computeJaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
  if (setA.size === 0 && setB.size === 0) return 1.0
  const unionSize = new Set([...setA, ...setB]).size
  if (unionSize === 0) return 0.0
  const intersectionSize = [...setA].filter(x => setB.has(x)).length
  return intersectionSize / unionSize
}

export function computeMoSimilarity(mo1: string, mo2: string): number {
  const f1 = parseModusOperandi(mo1)
  const f2 = parseModusOperandi(mo2)

  const setA = new Set([...f1.targets, ...f1.tools, ...f1.methods])
  const setB = new Set([...f2.targets, ...f2.tools, ...f2.methods])

  return computeJaccardSimilarity(setA, setB)
}

export interface MoSeries {
  seriesId: number
  points: StDbscanPoint[]
  averageSimilarity: number
  commonPattern: string
}

export function detectMoSeriesInCluster(
  points: StDbscanPoint[],
  incidents: KspIncident[],
  threshold: number = 0.35
): MoSeries[] {
  // Map points to their incidents
  const incidentMap = new Map<string, KspIncident>()
  incidents.forEach(inc => incidentMap.set(inc.id, inc))

  // Build adj list for similarity graph
  const adjList = new Map<string, string[]>()
  points.forEach(p => adjList.set(p.id, []))

  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const p1 = points[i]
      const p2 = points[j]
      const inc1 = incidentMap.get(p1.id)
      const inc2 = incidentMap.get(p2.id)

      if (inc1 && inc2) {
        const sim = computeMoSimilarity(inc1.modus_operandi, inc2.modus_operandi)
        if (sim >= threshold) {
          adjList.get(p1.id)!.push(p2.id)
          adjList.get(p2.id)!.push(p1.id)
        }
      }
    }
  }

  // Find connected components (DFS)
  const visited = new Set<string>()
  const components: string[][] = []

  points.forEach(p => {
    if (!visited.has(p.id)) {
      const component: string[] = []
      const queue = [p.id]
      visited.add(p.id)

      while (queue.length > 0) {
        const curr = queue.shift()!
        component.push(curr)

        const neighbors = adjList.get(curr) || []
        neighbors.forEach(n => {
          if (!visited.has(n)) {
            visited.add(n)
            queue.push(n)
          }
        })
      }
      components.push(component)
    }
  })

  // Format detected series
  const seriesList: MoSeries[] = []
  let seriesIdCounter = 1

  components.forEach(compIds => {
    // We only classify as a "series" if there are 2 or more similar cases
    if (compIds.length < 2) return

    const compPoints = points.filter(p => compIds.includes(p.id))

    // Calculate average pairwise similarity
    let totalSim = 0
    let comparisons = 0
    for (let i = 0; i < compIds.length; i++) {
      for (let j = i + 1; j < compIds.length; j++) {
        const inc1 = incidentMap.get(compIds[i])
        const inc2 = incidentMap.get(compIds[j])
        if (inc1 && inc2) {
          totalSim += computeMoSimilarity(inc1.modus_operandi, inc2.modus_operandi)
          comparisons++
        }
      }
    }
    const averageSimilarity = comparisons > 0 ? totalSim / comparisons : 1.0

    // Extract common pattern tags
    const allTargets = new Set<string>()
    const allTools = new Set<string>()
    const allMethods = new Set<string>()

    compIds.forEach(id => {
      const inc = incidentMap.get(id)
      if (inc) {
        const features = parseModusOperandi(inc.modus_operandi)
        features.targets.forEach(t => allTargets.add(t))
        features.tools.forEach(t => allTools.add(t))
        features.methods.forEach(m => allMethods.add(m))
      }
    })

    const commonPattern = `Targets: ${Array.from(allTargets).join(', ')}; Tools: ${Array.from(allTools).join(', ')}; Methods: ${Array.from(allMethods).join(', ')}`

    seriesList.push({
      seriesId: seriesIdCounter++,
      points: compPoints,
      averageSimilarity,
      commonPattern
    })
  })

  return seriesList
}

export interface TemporalTrends {
  weeklyPattern: string
  diurnalPattern: string
  cyclicalRhythms: string[]
}

export function analyzeTemporalTrends(incidents: KspIncident[]): TemporalTrends {
  if (incidents.length === 0) {
    return {
      weeklyPattern: 'Insufficient data',
      diurnalPattern: 'Insufficient data',
      cyclicalRhythms: ['No patterns detected']
    }
  }

  // Days of week counts (0 = Sunday, ..., 6 = Saturday)
  const dayCounts = Array(7).fill(0)
  // Diurnal blocks
  // 0: Morning (6AM-12PM), 1: Afternoon (12PM-6PM), 2: Evening (6PM-12AM), 3: Night (12AM-6AM)
  const timeBlockCounts = Array(4).fill(0)

  incidents.forEach(inc => {
    const d = new Date(inc.date_time)
    const day = d.getDay()
    const hour = d.getHours()

    dayCounts[day]++

    if (hour >= 6 && hour < 12) timeBlockCounts[0]++
    else if (hour >= 12 && hour < 18) timeBlockCounts[1]++
    else if (hour >= 18 && hour < 24) timeBlockCounts[2]++
    else timeBlockCounts[3]++
  })

  // Determine dominant day
  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const maxDayIndex = dayCounts.indexOf(Math.max(...dayCounts))
  const maxDayCount = dayCounts[maxDayIndex]
  const avgDayCount = incidents.length / 7
  let weeklyPattern = 'Evenly distributed across the week'
  if (maxDayCount > avgDayCount * 1.5 && maxDayCount >= 2) {
    weeklyPattern = `Spike pattern detected on ${DAYS[maxDayIndex]}s (${maxDayCount} cases)`
  }

  // Determine dominant time block
  const BLOCKS = ['Morning (6AM - 12PM)', 'Afternoon (12PM - 6PM)', 'Evening (6PM - 12AM)', 'Night (12AM - 6AM)']
  const maxBlockIndex = timeBlockCounts.indexOf(Math.max(...timeBlockCounts))
  const maxBlockCount = timeBlockCounts[maxBlockIndex]
  const pct = Math.round((maxBlockCount / incidents.length) * 100)
  let diurnalPattern = `${BLOCKS[maxBlockIndex]} dominates (${pct}%)`

  // Cyclical checks (weekly/bi-weekly repeats)
  const cyclicalRhythms: string[] = []
  let weeklyCycleCount = 0
  let biWeeklyCycleCount = 0

  for (let i = 0; i < incidents.length; i++) {
    for (let j = i + 1; j < incidents.length; j++) {
      const t1 = new Date(incidents[i].date_time).getTime()
      const t2 = new Date(incidents[j].date_time).getTime()
      const diffMs = Math.abs(t1 - t2)
      const diffDays = diffMs / (1000 * 60 * 60 * 24)

      // Check weekly recurrence (7 days ± 12 hours)
      if (Math.abs(diffDays - 7) <= 0.5) {
        weeklyCycleCount++
      }
      // Check bi-weekly recurrence (14 days ± 12 hours)
      if (Math.abs(diffDays - 14) <= 0.5) {
        biWeeklyCycleCount++
      }
    }
  }

  if (weeklyCycleCount > 0) {
    cyclicalRhythms.push(`Weekly recurrence: ${weeklyCycleCount} cycles separated by 7 days`)
  }
  if (biWeeklyCycleCount > 0) {
    cyclicalRhythms.push(`Bi-weekly recurrence: ${biWeeklyCycleCount} cycles separated by 14 days`)
  }
  if (cyclicalRhythms.length === 0) {
    cyclicalRhythms.push('No repeating cyclical rhythms found')
  }

  return {
    weeklyPattern,
    diurnalPattern,
    cyclicalRhythms
  }
}

// Isolation Forest for Contextual Anomaly Detection
export interface AnomalyResult {
  id: string
  score: number // 0 to 1
  reasons: string[]
  isAnomaly: boolean
}

interface ForestItem {
  id: string
  district: string
  category: string
  dayOfWeek: number
  hour: number
}

// Average path length helper c(n)
function getAveragePathLengthOfUnsuccessfulSearch(n: number): number {
  if (n <= 1) return 0
  if (n === 2) return 1
  const EulerConstant = 0.5772156649
  return 2 * (Math.log(n - 1) + EulerConstant) - (2 * (n - 1) / n)
}

class IsolationTreeNode {
  feature?: 'district' | 'category' | 'dayOfWeek' | 'hour'
  splitValue?: any
  left?: IsolationTreeNode
  right?: IsolationTreeNode
  size: number
  depth: number

  constructor(size: number, depth: number) {
    this.size = size
    this.depth = depth
  }
}

function buildIsolationTree(items: ForestItem[], depth: number, maxDepth: number): IsolationTreeNode {
  const node = new IsolationTreeNode(items.length, depth)
  if (items.length <= 1 || depth >= maxDepth) {
    return node
  }

  // Check if all items are identical
  const first = items[0]
  const allIdentical = items.every(item => 
    item.district === first.district &&
    item.category === first.category &&
    item.dayOfWeek === first.dayOfWeek &&
    item.hour === first.hour
  )
  if (allIdentical) return node

  // Choose a random feature to split on
  const features: ('district' | 'category' | 'dayOfWeek' | 'hour')[] = ['district', 'category', 'dayOfWeek', 'hour']
  const feature = features[Math.floor(Math.random() * features.length)]
  node.feature = feature

  let leftItems: ForestItem[] = []
  let rightItems: ForestItem[] = []

  if (feature === 'district' || feature === 'category') {
    // Categorical split: pick a random item's value
    const uniqueValues = Array.from(new Set(items.map(item => item[feature])))
    const splitVal = uniqueValues[Math.floor(Math.random() * uniqueValues.length)]
    node.splitValue = splitVal

    leftItems = items.filter(item => item[feature] === splitVal)
    rightItems = items.filter(item => item[feature] !== splitVal)
  } else {
    // Numerical split (dayOfWeek: 0-6, hour: 0-23)
    const values = items.map(item => item[feature])
    const min = Math.min(...values)
    const max = Math.max(...values)

    if (min === max) {
      // Try another feature
      return buildIsolationTree(items, depth, maxDepth)
    }

    const splitVal = min + Math.random() * (max - min)
    node.splitValue = splitVal

    leftItems = items.filter(item => item[feature] <= splitVal)
    rightItems = items.filter(item => item[feature] > splitVal)
  }

  // Handle case where split doesn't partition
  if (leftItems.length === 0 || rightItems.length === 0) {
    return node
  }

  node.left = buildIsolationTree(leftItems, depth + 1, maxDepth)
  node.right = buildIsolationTree(rightItems, depth + 1, maxDepth)

  return node
}

function getPathLength(item: ForestItem, node: IsolationTreeNode): number {
  if (!node.left || !node.right) {
    return node.depth + getAveragePathLengthOfUnsuccessfulSearch(node.size)
  }

  const feature = node.feature!
  if (feature === 'district' || feature === 'category') {
    if (item[feature] === node.splitValue) {
      return getPathLength(item, node.left)
    } else {
      return getPathLength(item, node.right)
    }
  } else {
    if (item[feature] <= node.splitValue) {
      return getPathLength(item, node.left)
    } else {
      return getPathLength(item, node.right)
    }
  }
}

export function detectContextualAnomalies(
  incidents: KspIncident[],
  numTrees: number = 20,
  threshold: number = 0.58
): AnomalyResult[] {
  if (incidents.length === 0) return []

  const forestItems: ForestItem[] = incidents.map(inc => {
    const d = new Date(inc.date_time)
    return {
      id: inc.id,
      district: inc.district,
      category: inc.category,
      dayOfWeek: d.getDay(),
      hour: d.getHours()
    }
  })

  const n = forestItems.length
  const maxDepth = Math.ceil(Math.log2(Math.max(n, 2)))
  const trees: IsolationTreeNode[] = []

  for (let i = 0; i < numTrees; i++) {
    trees.push(buildIsolationTree(forestItems, 0, maxDepth))
  }

  const cN = getAveragePathLengthOfUnsuccessfulSearch(n)

  // Compute overall probability baselines for descriptive reasons
  const districtCounts: Record<string, number> = {}
  const categoryCounts: Record<string, number> = {}
  const weekdayCounts: Record<number, number> = {}
  const hourCounts: Record<number, number> = {}

  forestItems.forEach(item => {
    districtCounts[item.district] = (districtCounts[item.district] || 0) + 1
    categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1
    weekdayCounts[item.dayOfWeek] = (weekdayCounts[item.dayOfWeek] || 0) + 1
    hourCounts[item.hour] = (hourCounts[item.hour] || 0) + 1
  })

  const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

  return forestItems.map((item, idx) => {
    // Average path length across the forest
    let totalPathLength = 0
    trees.forEach(tree => {
      totalPathLength += getPathLength(item, tree)
    })
    const avgPathLength = totalPathLength / numTrees

    // s = 2 ^ (- avgPathLength / c(n))
    const score = cN > 0 ? Math.pow(2, -(avgPathLength / cN)) : 0.0

    // Compute contextual explanations
    const reasons: string[] = []

    const distPct = districtCounts[item.district] / n
    const catPct = categoryCounts[item.category] / n
    const dayPct = weekdayCounts[item.dayOfWeek] / n
    
    // Check if the combinations are rare
    if (distPct < 0.15) {
      reasons.push(`Rare location context for district: ${item.district}`)
    }
    if (catPct < 0.10) {
      reasons.push(`Highly infrequent crime category: ${item.category}`)
    }
    if (dayPct < 0.10) {
      reasons.push(`Unusual day-of-week occurrence: ${DAYS_OF_WEEK[item.dayOfWeek]}`)
    }
    
    // Joint probability checker for weekday/district anomaly
    const jointCount = forestItems.filter(f => f.district === item.district && f.dayOfWeek === item.dayOfWeek).length
    if (jointCount === 1) {
      reasons.push(`Unique event: only crime reported in ${item.district} on a ${DAYS_OF_WEEK[item.dayOfWeek]}`)
    }

    // Joint probability checker for category/hour anomaly
    const timeBlock = item.hour >= 6 && item.hour < 18 ? 'daytime' : 'nighttime'
    const categoryTimeCount = forestItems.filter(f => {
      const isDay = f.hour >= 6 && f.hour < 18
      const block = isDay ? 'daytime' : 'nighttime'
      return f.category === item.category && block === timeBlock
    }).length
    if (categoryTimeCount === 1) {
      reasons.push(`Atypical temporal correlation: ${item.category} reported during ${timeBlock} hours`)
    }

    if (reasons.length === 0) {
      reasons.push('Standard crime profile context')
    }

    return {
      id: item.id,
      score: Number(score.toFixed(3)),
      reasons: reasons.slice(0, 2), // Top 2 reasons
      isAnomaly: score >= threshold
    }
  })
}



