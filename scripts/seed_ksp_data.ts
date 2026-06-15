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

function getUuidForMockId(mockId: string): string {
  if (!mockId || !mockId.includes('-')) return mockId
  const [prefix, numStr] = mockId.split('-')
  const num = parseInt(numStr, 10)
  if (isNaN(num)) return mockId
  const typeMap: Record<string, string> = { inc: 'a0000000', per: 'b0000000', con: 'c0000000' }
  const prefixHex = typeMap[prefix] || 'e0000000'
  const pad = num.toString().padStart(12, '0')
  return `${prefixHex}-0000-0000-0000-${pad}`
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

  console.log("0. Clearing existing KSP data...")
  await supabase.from('ksp_connections').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('ksp_incidents').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('ksp_people').delete().neq('id', '00000000-0000-0000-0000-000000000000')

  console.log("1. Seeding KSP Incidents...")
  for (const inc of MOCK_INCIDENTS) {
    const mappedId = getUuidForMockId(inc.id)
    const { error } = await supabase.from('ksp_incidents').upsert({
      id: mappedId,
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
    const mappedId = getUuidForMockId(p.id)
    const { error } = await supabase.from('ksp_people').upsert({
      id: mappedId,
      name: p.name,
      classification: p.classification,
      demographics: p.demographics
    })
    if (error) {
      console.warn(`Could not seed person ${p.name}:`, error.message)
    }
  }

  console.log("3. Seeding KSP Connections...")
  for (const c of MOCK_CONNECTIONS) {
    const mappedId = getUuidForMockId(c.id)
    const mappedIncidentId = getUuidForMockId(c.incident_id)
    const mappedPersonId = getUuidForMockId(c.person_id)
    const { error } = await supabase.from('ksp_connections').upsert({
      id: mappedId,
      incident_id: mappedIncidentId,
      person_id: mappedPersonId,
      role: c.role
    })
    if (error) {
      console.warn(`Could not seed connection ${c.id}:`, error.message)
    }
  }

  console.log("Seeding complete! Mapped and resolved reference UUIDs successfully.")
}

seed().catch(err => console.error("Error seeding:", err))
