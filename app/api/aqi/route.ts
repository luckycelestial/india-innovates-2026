import { NextResponse } from 'next/server'
import { pool, initDb } from '@/lib/mysql'

export const dynamic = 'force-dynamic'

// Standard stations in Karnataka with AQICN names
const AQI_STATIONS = [
  { name: 'Bengaluru Urban', feedKey: 'bangalore', stationId: 'AQI-BLR' },
  { name: 'Mysuru', feedKey: 'mysore', stationId: 'AQI-MYS' },
  { name: 'Mangaluru', feedKey: 'mangalore', stationId: 'AQI-MLR' },
  { name: 'Belagavi', feedKey: 'belgaum', stationId: 'AQI-BEL' },
  { name: 'Kalaburagi', feedKey: 'gulbarga', stationId: 'AQI-KLB' },
  { name: 'Bagalkot', feedKey: 'bagalkot', stationId: 'AQI-BGK' },
  { name: 'Ramanagara', feedKey: 'ramanagara', stationId: 'AQI-RAM' },
  { name: 'Ballari', feedKey: 'bellary', stationId: 'AQI-BLY' },
  { name: 'Bidar', feedKey: 'bidar', stationId: 'AQI-BDR' },
  { name: 'Vijayapura', feedKey: 'bijapur', stationId: 'AQI-VJP' },
  { name: 'Chamarajanagar', feedKey: 'chamrajnagar', stationId: 'AQI-CHM' },
  { name: 'Chikkamagaluru', feedKey: 'chikmagalur', stationId: 'AQI-CKM' },
  { name: 'Chitradurga', feedKey: 'chitradurga', stationId: 'AQI-CTA' },
  { name: 'Davanagere', feedKey: 'davanagere', stationId: 'AQI-DVG' },
  { name: 'Dharwad', feedKey: 'dharwad', stationId: 'AQI-DWD' },
  { name: 'Gadag', feedKey: 'gadag', stationId: 'AQI-GDG' },
  { name: 'Hassan', feedKey: 'hassan', stationId: 'AQI-HSN' },
  { name: 'Haveri', feedKey: 'haveri', stationId: 'AQI-HVR' },
  { name: 'Kodagu', feedKey: 'kodagu', stationId: 'AQI-KDG' },
  { name: 'Chikkaballapura', feedKey: 'chikkaballapura', stationId: 'AQI-CBP' },
  { name: 'Koppal', feedKey: 'koppal', stationId: 'AQI-KPL' },
  { name: 'Mandya', feedKey: 'mandya', stationId: 'AQI-MDY' },
  { name: 'Raichur', feedKey: 'raichur', stationId: 'AQI-RCR' },
  { name: 'Shivamogga', feedKey: 'shimoga', stationId: 'AQI-SMG' },
  { name: 'Tumakuru', feedKey: 'tumkur', stationId: 'AQI-TMK' },
  { name: 'Udupi', feedKey: 'udupi', stationId: 'AQI-UDP' },
  { name: 'Uttara Kannada', feedKey: 'uttarakannada', stationId: 'AQI-UKN' },
  { name: 'Bengaluru Rural', feedKey: 'bangalorerural', stationId: 'AQI-BLR-R' },
  { name: 'Kolar', feedKey: 'kolar', stationId: 'AQI-KLR' },
  { name: 'Yadgir', feedKey: 'yadgir', stationId: 'AQI-YDG' }
]

// Fallback mock data in case AQICN API is offline/rate-limited
const MOCK_AQI = [
  { stationId: 'AQI-BLR', name: 'Bengaluru Urban', aqi: 142, pm25: 42, pm10: 84 },
  { stationId: 'AQI-MYS', name: 'Mysuru', aqi: 58, pm25: 18, pm10: 35 },
  { stationId: 'AQI-MLR', name: 'Mangaluru', aqi: 35, pm25: 10, pm10: 22 },
  { stationId: 'AQI-BEL', name: 'Belagavi', aqi: 110, pm25: 31, pm10: 62 },
  { stationId: 'AQI-KLB', name: 'Kalaburagi', aqi: 165, pm25: 55, pm10: 110 },
  { stationId: 'AQI-BGK', name: 'Bagalkot', aqi: 75, pm25: 22, pm10: 45 },
  { stationId: 'AQI-RAM', name: 'Ramanagara', aqi: 82, pm25: 25, pm10: 50 },
  { stationId: 'AQI-BLY', name: 'Ballari', aqi: 155, pm25: 52, pm10: 105 },
  { stationId: 'AQI-BDR', name: 'Bidar', aqi: 62, pm25: 19, pm10: 38 },
  { stationId: 'AQI-VJP', name: 'Vijayapura', aqi: 88, pm25: 28, pm10: 56 },
  { stationId: 'AQI-CHM', name: 'Chamarajanagar', aqi: 48, pm25: 14, pm10: 28 },
  { stationId: 'AQI-CKM', name: 'Chikkamagaluru', aqi: 42, pm25: 12, pm10: 24 },
  { stationId: 'AQI-CTA', name: 'Chitradurga', aqi: 95, pm25: 30, pm10: 60 },
  { stationId: 'AQI-DVG', name: 'Davanagere', aqi: 102, pm25: 32, pm10: 64 },
  { stationId: 'AQI-DWD', name: 'Dharwad', aqi: 88, pm25: 27, pm10: 54 },
  { stationId: 'AQI-GDG', name: 'Gadag', aqi: 70, pm25: 21, pm10: 42 },
  { stationId: 'AQI-HSN', name: 'Hassan', aqi: 52, pm25: 15, pm10: 30 },
  { stationId: 'AQI-HVR', name: 'Haveri', aqi: 66, pm25: 20, pm10: 40 },
  { stationId: 'AQI-KDG', name: 'Kodagu', aqi: 30, pm25: 9, pm10: 18 },
  { stationId: 'AQI-CBP', name: 'Chikkaballapura', aqi: 78, pm25: 23, pm10: 46 },
  { stationId: 'AQI-KPL', name: 'Koppal', aqi: 85, pm25: 26, pm10: 52 },
  { stationId: 'AQI-MDY', name: 'Mandya', aqi: 50, pm25: 15, pm10: 30 },
  { stationId: 'AQI-RCR', name: 'Raichur', aqi: 120, pm25: 38, pm10: 76 },
  { stationId: 'AQI-SMG', name: 'Shivamogga', aqi: 55, pm25: 16, pm10: 32 },
  { stationId: 'AQI-TMK', name: 'Tumakuru', aqi: 92, pm25: 29, pm10: 58 },
  { stationId: 'AQI-UDP', name: 'Udupi', aqi: 38, pm25: 11, pm10: 22 },
  { stationId: 'AQI-UKN', name: 'Uttara Kannada', aqi: 32, pm25: 9, pm10: 20 },
  { stationId: 'AQI-BLR-R', name: 'Bengaluru Rural', aqi: 80, pm25: 24, pm10: 48 },
  { stationId: 'AQI-KLR', name: 'Kolar', aqi: 98, pm25: 30, pm10: 60 },
  { stationId: 'AQI-YDG', name: 'Yadgir', aqi: 72, pm25: 21, pm10: 43 }
]

// Fetch live AQI from AQICN API
async function fetchStationAqi(feedKey: string) {
  try {
    // WAQI / AQICN API using the public 'demo' token
    const res = await fetch(`https://api.waqi.info/feed/${feedKey}/?token=demo`, {
      next: { revalidate: 60 } // Cache for 1 min
    })
    const json = await res.json()
    if (json.status === 'ok' && json.data) {
      const aqi = json.data.aqi
      const pm25 = json.data.iaqi?.pm25?.v || 0
      const pm10 = json.data.iaqi?.pm10?.v || 0
      return { aqi, pm25, pm10 }
    }
  } catch (err) {
    console.error(`Failed to fetch AQI for ${feedKey}:`, err)
  }
  return null
}

export async function GET() {
  await initDb()

  try {
    // Read the unique stations from MySQL
    const [rows]: any = await pool.query(`
      SELECT * FROM aqi_readings
      ORDER BY timestamp DESC
    `)

    // If MySQL is empty, seed it with initial values
    if (rows.length === 0) {
      console.log('AQI table empty. Seeding initial records...')
      for (const item of MOCK_AQI) {
        await pool.query(`
          INSERT INTO aqi_readings (station_id, ward_name, aqi, pm25, pm10)
          VALUES (?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            aqi = VALUES(aqi),
            pm25 = VALUES(pm25),
            pm10 = VALUES(pm10)
        `, [item.stationId, item.name, item.aqi, item.pm25, item.pm10])
      }
      return NextResponse.json(MOCK_AQI)
    }

    // Map rows to clean objects
    const readings = rows.map((r: any) => ({
      stationId: r.station_id,
      name: r.ward_name,
      aqi: r.aqi,
      pm25: r.pm25,
      pm10: r.pm10,
      timestamp: r.timestamp
    }))

    return NextResponse.json(readings)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST() {
  await initDb()

  try {
    const updatedList = []

    for (const station of AQI_STATIONS) {
      let live = await fetchStationAqi(station.feedKey)
      
      // Fallback if API is offline
      if (!live) {
        console.log(`Using mock fallback for ${station.name}`)
        const mock = MOCK_AQI.find(m => m.stationId === station.stationId)
        live = {
          aqi: mock ? mock.aqi : 100,
          pm25: mock ? mock.pm25 : 30,
          pm10: mock ? mock.pm10 : 60
        }
      }

      // Insert new reading or overwrite existing unique record
      await pool.query(`
        INSERT INTO aqi_readings (station_id, ward_name, aqi, pm25, pm10)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          aqi = VALUES(aqi),
          pm25 = VALUES(pm25),
          pm10 = VALUES(pm10)
      `, [station.stationId, station.name, live.aqi, live.pm25, live.pm10])

      updatedList.push({
        stationId: station.stationId,
        name: station.name,
        aqi: live.aqi,
        pm25: live.pm25,
        pm10: live.pm10
      })
    }

    return NextResponse.json({ success: true, data: updatedList })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
