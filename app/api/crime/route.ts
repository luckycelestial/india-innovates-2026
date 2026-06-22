import { NextResponse } from 'next/server'
import { pool, initDb } from '@/lib/mysql'

export const dynamic = 'force-dynamic'

export async function GET() {
  await initDb()

  try {
    const [incidents]: any = await pool.query('SELECT * FROM ksp_incidents')
    const [people]: any = await pool.query('SELECT * FROM ksp_people')
    const [connections]: any = await pool.query('SELECT * FROM ksp_connections')

    const parsedIncidents = incidents.map((inc: any) => ({
      ...inc,
      socio_economic_factors: typeof inc.socio_economic_factors === 'string'
        ? JSON.parse(inc.socio_economic_factors)
        : inc.socio_economic_factors
    }))

    const parsedPeople = people.map((p: any) => ({
      ...p,
      demographics: typeof p.demographics === 'string'
        ? JSON.parse(p.demographics)
        : p.demographics
    }))

    return NextResponse.json({
      incidents: parsedIncidents,
      people: parsedPeople,
      connections
    })
  } catch (err: any) {
    console.error('Error fetching crime data:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
