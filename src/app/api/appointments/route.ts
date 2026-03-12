import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function GET(req: NextRequest) {
  const db     = getDb()
  const search = req.nextUrl.searchParams.get('search') ?? ''
  let rows

  if (search) {
    const q = `%${search}%`
    rows = db.prepare(
      'SELECT * FROM appointments WHERE client_name LIKE ? OR treatment LIKE ? ORDER BY appt_date, appt_time'
    ).all(q, q)
  } else {
    rows = db.prepare('SELECT * FROM appointments ORDER BY appt_date, appt_time').all()
  }

  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const { client_name, treatment, appt_date, appt_time, companions } = await req.json()

  if (!client_name || !appt_date || !appt_time)
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })

  const db     = getDb()
  const result = db.prepare(
    'INSERT INTO appointments (client_name, treatment, appt_date, appt_time, companions) VALUES (?, ?, ?, ?, ?)'
  ).run(client_name, treatment ?? null, appt_date, appt_time, companions ?? null)
  const row = db.prepare('SELECT * FROM appointments WHERE id = ?').get(result.lastInsertRowid)

  return NextResponse.json(row, { status: 201 })
}
