import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function DELETE(req: NextRequest) {
  const scope = req.nextUrl.searchParams.get('scope')
  const db    = getDb()
  let   count = 0

  if (scope === 'past') {
    const today = new Date().toISOString().slice(0, 10)
    count = db.prepare('DELETE FROM appointments WHERE appt_date < ?').run(today).changes
  } else if (scope === 'all') {
    count = db.prepare('DELETE FROM appointments').run().changes
  } else {
    return NextResponse.json({ error: 'Invalid scope' }, { status: 400 })
  }

  return NextResponse.json({ count })
}
