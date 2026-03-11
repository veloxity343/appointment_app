import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

type Ctx = { params: { id: string } }

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const db   = getDb()
  const id   = parseInt(params.id, 10)
  const body = await req.json()

  if (body.toggle_confirmed) {
    db.prepare('UPDATE appointments SET confirmed = 1 - confirmed WHERE id = ?').run(id)
  } else {
    const { client_name, treatment, appt_date, appt_time } = body
    db.prepare(
      'UPDATE appointments SET client_name=?, treatment=?, appt_date=?, appt_time=? WHERE id=?'
    ).run(client_name, treatment ?? null, appt_date, appt_time, id)
  }

  const row = db.prepare('SELECT * FROM appointments WHERE id = ?').get(id)
  return NextResponse.json(row)
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  getDb().prepare('DELETE FROM appointments WHERE id = ?').run(parseInt(params.id, 10))
  return NextResponse.json({ ok: true })
}
