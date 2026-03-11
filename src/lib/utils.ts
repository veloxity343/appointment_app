import { Appointment, WeekFilter } from '@/types'

export function ordinal(n: number): string {
  const s: Record<number, string> = { 1: 'st', 2: 'nd', 3: 'rd' }
  const key = n < 20 ? n : n % 10
  return `${n}${s[key] ?? 'th'}`
}

export function fmtTime(t: string): string {
  const [hStr, mStr] = t.split(':')
  const h = parseInt(hStr, 10)
  const m = mStr
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12  = h % 12 || 12
  return `${h12}:${m} ${ampm}`
}

export function fmtDate(d: string): string {
  const date = new Date(d + 'T00:00:00')
  return date.toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', weekday: 'long',
  })
}

export function fmtDateShort(d: string): string {
  const date = new Date(d + 'T00:00:00')
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function dayOfWeek(d: string): string {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' })
}

export function buildReminder(
  name: string,
  treatment: string | null,
  apptDate: string,
  apptTime: string,
): string {
  const d = new Date(apptDate + 'T00:00:00')
  const dayName  = d.toLocaleDateString('en-US', { weekday: 'long' })
  const month    = d.toLocaleDateString('en-US', { month: 'long' })
  const dayNum   = ordinal(d.getDate())
  const timeStr  = fmtTime(apptTime)
  const tLine    = treatment?.trim() ? ` for your ${treatment} session` : ''
  return (
    `Good morning ${name},\n` +
    `We would like to remind you of your appointment with us${tLine} on ` +
    `${dayName} the ${dayNum} of ${month} @ ${timeStr}.\n` +
    `Is the above appointment confirmed?\n` +
    `Thank you and see you then! 😊`
  )
}

export function applyWeekFilter(rows: Appointment[], filter: WeekFilter): Appointment[] {
  if (filter === 'All') return rows

  const today = new Date(); today.setHours(0, 0, 0, 0)
  const dow   = today.getDay()
  const mon   = new Date(today)
  mon.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1))

  const thisEnd   = new Date(mon); thisEnd.setDate(mon.getDate() + 6)
  const nextStart = new Date(mon); nextStart.setDate(mon.getDate() + 7)
  const nextEnd   = new Date(mon); nextEnd.setDate(mon.getDate() + 13)

  return rows.filter(r => {
    const d = new Date(r.appt_date + 'T00:00:00')
    if (filter === 'This Week') return d >= mon && d <= thisEnd
    if (filter === 'Next Week') return d >= nextStart && d <= nextEnd
    if (filter === 'Past')      return d < today
    return true
  })
}

export function parseInputDate(raw: string): string | null {
  const formats = [
    { re: /^(\d{2})\/(\d{2})\/(\d{4})$/, fn: (m: RegExpMatchArray) => `${m[3]}-${m[2]}-${m[1]}` },
    { re: /^(\d{2})-(\d{2})-(\d{4})$/, fn: (m: RegExpMatchArray) => `${m[3]}-${m[2]}-${m[1]}` },
    { re: /^(\d{4})-(\d{2})-(\d{2})$/, fn: (m: RegExpMatchArray) => m[0] },
  ]
  for (const { re, fn } of formats) {
    const m = raw.trim().match(re)
    if (m) {
      const iso = fn(m)
      if (!isNaN(new Date(iso).getTime())) return iso
    }
  }
  return null
}
