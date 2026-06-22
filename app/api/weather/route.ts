import { NextResponse } from 'next/server'
import { pool, initDb } from '@/lib/mysql'

export const dynamic = 'force-dynamic'

// 30 Karnataka districts with lat/lon matching districts table seed
const DISTRICTS = [
  { name: 'Bengaluru Urban',    lat: 12.9716, lon: 77.5946 },
  { name: 'Mysuru',             lat: 12.2958, lon: 76.6394 },
  { name: 'Belagavi',           lat: 15.8497, lon: 74.4977 },
  { name: 'Mangaluru',          lat: 12.9141, lon: 74.8560 },
  { name: 'Mandya',             lat: 12.5218, lon: 76.8973 },
  { name: 'Kalaburagi',         lat: 17.3297, lon: 76.8343 },
  { name: 'Bagalkot',           lat: 16.1817, lon: 75.6958 },
  { name: 'Ramanagara',         lat: 12.7209, lon: 77.2784 },
  { name: 'Ballari',            lat: 15.1394, lon: 76.9214 },
  { name: 'Bidar',              lat: 17.9104, lon: 77.5199 },
  { name: 'Vijayapura',         lat: 16.8302, lon: 75.7100 },
  { name: 'Chamarajanagar',     lat: 11.9261, lon: 76.9402 },
  { name: 'Chikkamagaluru',     lat: 13.3161, lon: 75.7720 },
  { name: 'Chitradurga',        lat: 14.2251, lon: 76.3980 },
  { name: 'Davanagere',         lat: 14.4644, lon: 75.9218 },
  { name: 'Dharwad',            lat: 15.4589, lon: 75.0078 },
  { name: 'Gadag',              lat: 15.4292, lon: 75.6268 },
  { name: 'Hassan',             lat: 13.0072, lon: 76.1026 },
  { name: 'Haveri',             lat: 14.7937, lon: 75.4055 },
  { name: 'Kodagu',             lat: 12.3375, lon: 75.8069 },
  { name: 'Chikkaballapura',    lat: 13.4354, lon: 77.7277 },
  { name: 'Koppal',             lat: 15.3468, lon: 76.1554 },
  { name: 'Raichur',            lat: 16.2120, lon: 77.3556 },
  { name: 'Shivamogga',         lat: 13.9299, lon: 75.5681 },
  { name: 'Tumakuru',           lat: 13.3379, lon: 77.1173 },
  { name: 'Udupi',              lat: 13.3409, lon: 74.7421 },
  { name: 'Uttara Kannada',     lat: 14.6219, lon: 74.6738 },
  { name: 'Bengaluru Rural',    lat: 13.2284, lon: 77.5794 },
  { name: 'Kolar',              lat: 13.1367, lon: 78.1291 },
  { name: 'Yadgir',             lat: 16.7667, lon: 77.1377 },
]

// WMO weather code → label
function wmoLabel(code: number): string {
  if (code === 0) return 'Clear Sky'
  if (code <= 3) return 'Partly Cloudy'
  if (code <= 9) return 'Fog'
  if (code <= 19) return 'Drizzle'
  if (code <= 29) return 'Rain'
  if (code <= 39) return 'Snow'
  if (code <= 49) return 'Fog'
  if (code <= 59) return 'Drizzle'
  if (code <= 69) return 'Rain'
  if (code <= 79) return 'Snow'
  if (code <= 84) return 'Rain Showers'
  if (code <= 94) return 'Thunderstorm'
  return 'Thunderstorm'
}

export async function GET() {
  await initDb()
  try {
    const [rows]: any = await pool.query(
      'SELECT * FROM weather_readings ORDER BY district_name ASC'
    )
    return NextResponse.json(rows)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST() {
  await initDb()
  let conn;
  try {
    // Build batch request URL
    const lats = DISTRICTS.map(d => d.lat).join(',')
    const lons = DISTRICTS.map(d => d.lon).join(',')
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m&timezone=Asia/Kolkata`

    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) {
      return NextResponse.json({ error: `Open-Meteo responded ${res.status}` }, { status: 502 })
    }

    const data = await res.json()
    // API returns array when multiple locations requested
    const results: any[] = Array.isArray(data) ? data : [data]

    conn = await pool.getConnection()
    let synced = 0

    for (let i = 0; i < DISTRICTS.length; i++) {
      const district = DISTRICTS[i]
      const loc = results[i]
      if (!loc || !loc.current) continue

      const { temperature_2m, relative_humidity_2m, precipitation, weather_code, wind_speed_10m } = loc.current
      const label = wmoLabel(weather_code)

      await conn.query(
        `INSERT INTO weather_readings
          (district_name, latitude, longitude, temperature, humidity, precipitation, weather_code, wind_speed, condition_label)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           temperature = VALUES(temperature),
           humidity = VALUES(humidity),
           precipitation = VALUES(precipitation),
           weather_code = VALUES(weather_code),
           wind_speed = VALUES(wind_speed),
           condition_label = VALUES(condition_label),
           fetched_at = CURRENT_TIMESTAMP`,
        [
          district.name,
          district.lat,
          district.lon,
          temperature_2m,
          relative_humidity_2m,
          precipitation,
          weather_code,
          wind_speed_10m,
          label
        ]
      )
      synced++
    }

    const [rows]: any = await pool.query('SELECT * FROM weather_readings ORDER BY district_name ASC')
    return NextResponse.json({ success: true, synced, data: rows })
  } catch (err: any) {
    console.error('Weather sync error:', err)
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 })
  } finally {
    if (conn) conn.release()
  }
}
