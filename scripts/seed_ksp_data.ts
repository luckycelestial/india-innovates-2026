import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import { MOCK_INCIDENTS, MOCK_PEOPLE, MOCK_CONNECTIONS } from '../lib/ksp/mockData'

// Simple helper to load .env.local file properties
function loadEnv() {
  const envPath = path.join(process.cwd(), '.env.local')
  if (!fs.existsSync(envPath)) {
    console.error("Missing .env.local file")
    process.exit(1)
  }
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n')
  for (const line of lines) {
    if (line.includes('=') && !line.trim().startsWith('#')) {
      const [k, v] = line.split('=', 2)
      process.env[k.trim()] = v.trim().replace(/^["']|["']$/g, '')
    }
  }
}

async function seed() {
  loadEnv()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error("Supabase config not found in process environment")
    return
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  console.log("1. Seeding KSP Incidents...")
  for (const inc of MOCK_INCIDENTS) {
    const { error } = await supabase.from('ksp_incidents').upsert({
      id: inc.id.includes('-') && inc.id.length === 7 ? undefined : inc.id, // Generate UUID if format mismatch
      case_number: inc.case_number,
      category: inc.category,
      description: inc.description,
      location: inc.location,
      district: inc.district,
      police_station: inc.police_station,
      latitude: inc.latitude,
      longitude: inc.longitude,
      date_time: inc.date_time,
      priority: inc.priority,
      modus_operandi: inc.modus_operandi,
      socio_economic_factors: inc.socio_economic_factors,
      risk_score: inc.risk_score
    })
    if (error) {
      console.warn(`Could not seed incident ${inc.case_number}:`, error.message)
    }
  }

  console.log("2. Seeding KSP People...")
  for (const p of MOCK_PEOPLE) {
    const { error } = await supabase.from('ksp_people').upsert({
      id: p.id.includes('-') && p.id.length === 7 ? undefined : p.id,
      name: p.name,
      classification: p.classification,
      demographics: p.demographics
    })
    if (error) {
      console.warn(`Could not seed person ${p.name}:`, error.message)
    }
  }

  console.log("Seeding complete! Note: For connections, resolve references correctly based on generated UUIDs.")
}

seed().catch(err => console.error("Error seeding:", err))
