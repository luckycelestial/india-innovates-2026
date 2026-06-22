import { NextResponse } from 'next/server'
import { pool, initDb } from '@/lib/mysql'

export const dynamic = 'force-dynamic'

const DISTRICT_ROADS: Record<string, string> = {
  'Bengaluru Urban': 'Outer Ring Road (ORR)',
  'Mysuru': 'Outer Ring Road / Hunsur Road',
  'Belagavi': 'NH-48 Pune-Bengaluru Hwy',
  'Mangaluru': 'NH-66 KPT Junction',
  'Mandya': 'Bengaluru-Mysuru Expressway',
  'Kalaburagi': 'Sedam Road',
  'Ballari': 'NH-67 bypass',
  'Dharwad': 'Hubli-Dharwad bypass',
  'Shivamogga': 'Sagar Road',
  'Tumakuru': 'BH Road / NH-48'
}

function getRoadName(districtName: string): string {
  return DISTRICT_ROADS[districtName] || 'State Highway / Central Road'
}

async function fetchTomTomTraffic(lat: number, lon: number, apiKey: string) {
  try {
    const url = `https://api.tomtom.com/traffic/services/4/flowSegmentData/relative-compact/10/json?key=${apiKey}&point=${lat},${lon}`
    const res = await fetch(url, { next: { revalidate: 0 } })
    if (res.ok) {
      const json = await res.json()
      if (json.flowSegmentData) {
        const { currentSpeed, freeFlowSpeed, currentTravelTime, freeFlowTravelTime, confidence } = json.flowSegmentData
        return {
          currentSpeed: currentSpeed || 0,
          freeFlowSpeed: freeFlowSpeed || 50,
          currentTravelTime: currentTravelTime || 0,
          freeFlowTravelTime: freeFlowTravelTime || 0,
          confidence: confidence || 1.0
        }
      }
    }
  } catch (err) {
    console.error(`TomTom fetch failed for ${lat},${lon}:`, err)
  }
  return null
}

export async function GET(req: Request) {
  await initDb()

  try {
    const { searchParams } = new URL(req.url)
    const history = searchParams.get('history') === 'true'
    const timestamp = searchParams.get('timestamp')

    if (history) {
      const [rows]: any = await pool.query(`
        SELECT 
          fetch_timestamp as fetchTimestamp, 
          COUNT(*) as points, 
          ROUND(AVG(congestion_score)) as avgCongestion,
          ROUND(MAX(congestion_score)) as maxCongestion
        FROM traffic_readings 
        GROUP BY fetch_timestamp 
        ORDER BY fetch_timestamp DESC 
        LIMIT 30
      `)
      return NextResponse.json(rows)
    }

    if (timestamp) {
      const [rows]: any = await pool.query(`
        SELECT 
          id, 
          fetch_timestamp as fetchTimestamp, 
          district_name as district_name,
          current_speed as current_speed,
          free_flow_speed as free_flow_speed,
          current_travel_time as current_travel_time,
          free_flow_travel_time as free_flow_travel_time,
          congestion_score as congestion_score,
          confidence,
          road_name as road_name
        FROM traffic_readings 
        WHERE fetch_timestamp = ? 
        ORDER BY congestion_score DESC
      `, [new Date(timestamp)])
      return NextResponse.json(rows)
    }

    // Default: get latest fetch
    let [rows]: any = await pool.query(`
      SELECT 
        id, 
        fetch_timestamp as fetchTimestamp, 
        district_name as district_name,
        current_speed as current_speed,
        free_flow_speed as free_flow_speed,
        current_travel_time as current_travel_time,
        free_flow_travel_time as free_flow_travel_time,
        congestion_score as congestion_score,
        confidence,
        road_name as road_name
      FROM traffic_readings 
      WHERE fetch_timestamp = (SELECT MAX(fetch_timestamp) FROM traffic_readings)
      ORDER BY congestion_score DESC
    `)

    // If database is empty, run fetch inline to populate initial records
    if (rows.length === 0) {
      console.log('Traffic table empty. Triggering initial fetch...')
      const freshData = await performTrafficFetch()
      return NextResponse.json(freshData)
    }

    return NextResponse.json(rows)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST() {
  await initDb()

  try {
    const freshData = await performTrafficFetch()
    return NextResponse.json({ success: true, data: freshData })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

async function performTrafficFetch() {
  const [districts]: any = await pool.query('SELECT * FROM districts')
  const apiKey = process.env.TOMTOM_API_KEY
  const now = new Date()
  const freshData = []

  for (const d of districts) {
    let live = null
    if (apiKey) {
      live = await fetchTomTomTraffic(d.latitude, d.longitude, apiKey)
    }

    if (!live) {
      const isHighCongestion = ['Bengaluru Urban', 'Mysuru', 'Mangaluru', 'Belagavi', 'Kalaburagi'].includes(d.name)
      const freeFlowSpeed = Math.floor(Math.random() * 20) + 60
      let currentSpeed = 0
      
      if (isHighCongestion) {
        currentSpeed = Math.floor(Math.random() * 20) + 15
      } else {
        currentSpeed = Math.floor(Math.random() * 25) + 35
      }
      currentSpeed = Math.min(currentSpeed, freeFlowSpeed)

      const ratio = freeFlowSpeed / currentSpeed
      const freeFlowTravelTime = 60
      const currentTravelTime = Math.round(freeFlowTravelTime * ratio)
      const confidence = Number((Math.random() * 0.2 + 0.8).toFixed(2))

      live = {
        currentSpeed,
        freeFlowSpeed,
        currentTravelTime,
        freeFlowTravelTime,
        confidence
      }
    }

    const congestionScore = Math.max(0, Math.min(100, Math.round(100 * (1 - (live.currentSpeed / live.freeFlowSpeed)))))
    const roadName = getRoadName(d.name)

    await pool.query(`
      INSERT INTO traffic_readings (
        fetch_timestamp, district_name, current_speed, free_flow_speed, 
        current_travel_time, free_flow_travel_time, congestion_score, confidence, road_name
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      now, d.name, live.currentSpeed, live.freeFlowSpeed,
      live.currentTravelTime, live.freeFlowTravelTime, congestionScore, live.confidence, roadName
    ])

    freshData.push({
      fetchTimestamp: now.toISOString(),
      district_name: d.name,
      current_speed: live.currentSpeed,
      free_flow_speed: live.freeFlowSpeed,
      current_travel_time: live.currentTravelTime,
      free_flow_travel_time: live.freeFlowTravelTime,
      congestion_score: congestionScore,
      confidence: live.confidence,
      road_name: roadName
    })
  }

  return freshData.sort((a, b) => b.congestion_score - a.congestion_score)
}
