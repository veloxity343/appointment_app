// ─── parsers.ts ───────────────────────────────────────────────────────────────
// Smart date and time parsing for free-text input fields.
// ─────────────────────────────────────────────────────────────────────────────

// Date: accepts d/m, d/m/yy, d/m/yyyy, dd/mm/yy, dd/mm/yyyy
// Separators: / - . or space
export function smartParseDate(raw: string): string | null {
  const s  = raw.trim().replace(/[.\s]/g, '/')
  const cy = new Date().getFullYear()

  const patterns = [
    /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/,
    /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})$/,
    /^(\d{1,2})[\/\-](\d{1,2})$/,
  ]

  for (const re of patterns) {
    const m = s.match(re)
    if (!m) continue
    let d = parseInt(m[1]), mo = parseInt(m[2])
    let y = m[3] ? parseInt(m[3]) : cy
    if (y < 100) y += y >= 50 ? 1900 : 2000
    if (d < 1 || d > 31 || mo < 1 || mo > 12) continue
    const iso = `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const dt  = new Date(iso + 'T00:00:00')
    if (isNaN(dt.getTime()) || dt.getDate() !== d) continue
    return iso
  }
  return null
}

// Time: accepts 9  9:30  930  1430  9am  9:30pm  14:00
export function smartParseTime(raw: string): { h: number; m: number } | null {
  const s  = raw.trim().toLowerCase().replace(/\s/g, '')
  const ap = s.endsWith('am') ? 'am' : s.endsWith('pm') ? 'pm' : ''
  const t  = s.replace(/[ap]m$/, '')
  let h = -1, m = 0

  const colon   = t.match(/^(\d{1,2}):(\d{2})$/)
  const compact = !colon && t.match(/^(\d{3,4})$/)
  const hour    = !colon && !compact && t.match(/^(\d{1,2})$/)

  if (colon)   { h = parseInt(colon[1]);               m = parseInt(colon[2]) }
  if (compact) { const n = parseInt(compact[1]);        h = Math.floor(n / 100); m = n % 100 }
  if (hour)    { h = parseInt(hour[1]);                 m = 0 }

  if (h === -1) return null
  if (ap === 'pm' && h !== 12) h += 12
  if (ap === 'am' && h === 12) h = 0
  if (h < 0 || h > 23 || m < 0 || m > 59) return null
  return { h, m }
}
