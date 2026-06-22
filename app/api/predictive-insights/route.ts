import { NextResponse } from 'next/server'
import { pool, initDb } from '@/lib/mysql'
import { exec } from 'child_process'
import path from 'path'

export const dynamic = 'force-dynamic'

export async function GET() {
  await initDb()

  try {
    const [rows]: any = await pool.query(
      "SELECT * FROM ml_predictions ORDER BY predicted_value DESC"
    )
    
    const grouped: Record<string, any[]> = {
      district_risk: [],
      weather_forecast: [],
      traffic_congestion: [],
      aqi_forecast: [],
      complaint_escalation: []
    }

    rows.forEach((r: any) => {
      let details = {}
      try {
        details = typeof r.details === 'string' ? JSON.parse(r.details) : r.details
      } catch (e) {
        console.error(e)
      }
      
      const item = {
        id: r.id,
        district: r.target_name,
        predicted_value: r.predicted_value,
        confidence: r.confidence,
        ...details
      }

      if (grouped[r.prediction_type]) {
        grouped[r.prediction_type].push(item)
      } else {
        grouped[r.prediction_type] = [item]
      }
    })
    
    return NextResponse.json(grouped)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(): Promise<Response> {
  return new Promise<Response>((resolve) => {
    const scriptPath = path.join(process.cwd(), 'scripts', 'ml_predict.py')
    
    exec(`python "${scriptPath}"`, (error, stdout, stderr) => {
      if (error) {
        console.error(`ML execution error: ${error}`)
        resolve(NextResponse.json({ success: false, error: error.message, stderr }, { status: 500 }))
        return
      }
      
      resolve(NextResponse.json({ success: true, stdout }))
    })
  })
}

