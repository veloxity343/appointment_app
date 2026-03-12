import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { id } = await params
  const body   = await req.json()
  const db     = getDb()
  const idNum  = parseInt(id, 10)

  if (body.toggle_confirmed) {
    db.prepare('UPDATE appointments SET confirmed = 1 - confirmed WHERE id = ?').run(idNum)
  } else {
    const { client_name, treatment, appt_date, appt_time, companions } = body
    db.prepare(
      'UPDATE appointments SET client_name=?, treatment=?, appt_date=?, appt_time=?, companions=? WHERE id=?'
    ).run(client_name, treatment ?? null, appt_date, appt_time, companions ?? null, idNum)
  }

  const row = db.prepare('SELECT * FROM appointments WHERE id = ?').get(idNum)
  return NextResponse.json(row)
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { id } = await params
  getDb().prepare('DELETE FROM appointments WHERE id = ?').run(parseInt(id, 10))
  return NextResponse.json({ ok: true })
}
