import { NextResponse } from 'next/server'
import { pool, initDb } from '@/lib/mysql'

export const dynamic = 'force-dynamic'

export async function GET() {
  await initDb()

  try {
    const [rows]: any = await pool.query('SELECT * FROM districts ORDER BY name ASC')
    return NextResponse.json(rows)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
