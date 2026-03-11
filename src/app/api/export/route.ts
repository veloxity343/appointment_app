import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function GET() {
  const rows = getDb().prepare('SELECT * FROM appointments ORDER BY appt_date, appt_time').all() as any[]

  const header = 'ID,Client Name,Treatment,Date,Time,Confirmed,Created At\n'
  const body   = rows.map(r =>
    [r.id, `"${r.client_name}"`, `"${r.treatment ?? ''}"`,
     r.appt_date, r.appt_time, r.confirmed ? 'Yes' : 'No', r.created_at].join(',')
  ).join('\n')

  return new NextResponse(header + body, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="appointments_${new Date().toISOString().slice(0,10)}.csv"`,
    },
  })
}
