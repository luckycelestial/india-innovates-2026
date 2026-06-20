import { NextResponse } from 'next/server'
import { pool, initDb } from '@/lib/mysql'

export async function POST(req: Request) {
  try {
    await initDb()
    const body = await req.json()
    const { action, table, payload, selects, filters, limit, single, orderColumn, orderAscending } = body

    if (action === 'select') {
      let query = `SELECT * FROM \`${table}\``
      const params: any[] = []
      
      if (filters && filters.length > 0) {
        const filterClauses = filters.map((f: any) => {
          if (f.type === 'eq') {
            params.push(f.value)
            return `\`${f.column}\` = ?`
          } else if (f.type === 'neq') {
            params.push(f.value)
            return `\`${f.column}\` != ?`
          } else if (f.type === 'in') {
            if (f.value.length === 0) return '1=0'
            const placeholders = f.value.map(() => '?').join(', ')
            params.push(...f.value)
            return `\`${f.column}\` IN (${placeholders})`
          }
          return '1=1'
        })
        query += ' WHERE ' + filterClauses.join(' AND ')
      }

      if (orderColumn) {
        query += ` ORDER BY \`${orderColumn}\` ${orderAscending ? 'ASC' : 'DESC'}`
      }

      if (limit) {
        query += ` LIMIT ${limit}`
      }

      const [rows]: any = await pool.query(query, params)
      if (single) {
        return NextResponse.json({ data: rows[0] || null })
      }
      return NextResponse.json({ data: rows })
    }

    if (action === 'insert') {
      const items = Array.isArray(payload) ? payload : [payload]
      const insertedRows: any[] = []

      for (const item of items) {
        if (!item.id) {
          item.id = Math.random().toString(36).substring(2, 11) + '-' + Date.now().toString(36)
        }
        if (table === 'complaints' && !item.complaint_number) {
          item.complaint_number = 'PRJ-' + Math.floor(100000 + Math.random() * 900000)
        }

        const keys = Object.keys(item)
        const placeholders = keys.map(() => '?').join(', ')
        const values = Object.values(item)

        const query = `INSERT INTO \`${table}\` (${keys.map(k => `\`${k}\``).join(', ')}) VALUES (${placeholders})`
        await pool.query(query, values)

        const [inserted]: any = await pool.query(`SELECT * FROM \`${table}\` WHERE id = ?`, [item.id])
        insertedRows.push(inserted[0])
      }

      if (single) {
        return NextResponse.json({ data: insertedRows[0] || null })
      }
      return NextResponse.json({ data: Array.isArray(payload) ? insertedRows : insertedRows[0] })
    }

    if (action === 'update') {
      const keys = Object.keys(payload)
      const values = Object.values(payload)
      const setClause = keys.map(k => `\`${k}\` = ?`).join(', ')
      const params = [...values]

      let query = `UPDATE \`${table}\` SET ${setClause}`
      
      if (filters && filters.length > 0) {
        const filterClauses = filters.map((f: any) => {
          if (f.type === 'eq') {
            params.push(f.value)
            return `\`${f.column}\` = ?`
          } else if (f.type === 'neq') {
            params.push(f.value)
            return `\`${f.column}\` != ?`
          }
          return '1=1'
        })
        query += ' WHERE ' + filterClauses.join(' AND ')
      }

      await pool.query(query, params)

      let selectQuery = `SELECT * FROM \`${table}\``
      const selectParams: any[] = []
      if (filters && filters.length > 0) {
        const filterClauses = filters.map((f: any) => {
          if (f.type === 'eq') {
            selectParams.push(f.value)
            return `\`${f.column}\` = ?`
          } else if (f.type === 'neq') {
            selectParams.push(f.value)
            return `\`${f.column}\` != ?`
          }
          return '1=1'
        })
        selectQuery += ' WHERE ' + filterClauses.join(' AND ')
      }
      const [updatedRows]: any = await pool.query(selectQuery, selectParams)

      if (single) {
        return NextResponse.json({ data: updatedRows[0] || null })
      }
      return NextResponse.json({ data: updatedRows })
    }

    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 })
  } catch (err: any) {
    console.error('Database API route error:', err)
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 })
  }
}
