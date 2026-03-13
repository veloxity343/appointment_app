// ─── parsers.ts ───────────────────────────────────────────────────────────────

// ── Validation ────────────────────────────────────────────────────────────────

// Accepts only fully-formed dd/mm/yyyy
export function smartParseDate(raw: string): string | null {
  const m = raw.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!m) return null
  const d = parseInt(m[1]), mo = parseInt(m[2]), y = parseInt(m[3])
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null
  const iso = `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  const dt  = new Date(iso + 'T00:00:00')
  if (isNaN(dt.getTime()) || dt.getDate() !== d) return null
  return iso
}

// Accepts fully-formed "h:mm AM" or "h:mm PM" (case-insensitive).
// Returns 24-hr h and minute snapped to nearest 5.
export function smartParseTime(raw: string): { h: number; m: number; ampm: 'AM' | 'PM' } | null {
  const s    = raw.trim().toLowerCase().replace(/\s/g, '')
  const isAm = s.endsWith('am')
  const isPm = s.endsWith('pm')
  if (!isAm && !isPm) return null
  const ap = isAm ? 'AM' as const : 'PM' as const
  const t  = s.slice(0, -2)
  const co = t.match(/^(\d{1,2}):(\d{2})$/)
  if (!co) return null
  let h = parseInt(co[1]), m = parseInt(co[2])
  if (h < 1 || h > 12 || m < 0 || m > 59) return null
  const h24      = ap === 'PM' ? (h === 12 ? 12 : h + 12) : (h === 12 ? 0 : h)
  const snappedM = Math.round(m / 5) * 5 % 60
  return { h: h24, m: snappedM, ampm: ap }
}

// ── Auto-format on every keystroke ────────────────────────────────────────────

// Strips non-digits, keeps max 8 digits, inserts slashes → dd/mm/yyyy
export function autoFormatDate(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
}

// Inserts colon after first digit, appends AM/PM when user types a/p.
// Output format: h:mm AM or h:mm PM
export function autoFormatTime(raw: string): string {
  const lower  = raw.toLowerCase()
  const isAm   = lower.includes('a')
  const isPm   = lower.includes('p')
  const ap     = isPm ? ' PM' : isAm ? ' AM' : ''

  const digits = raw.replace(/\D/g, '').slice(0, 3) // h + mm = max 3 digits
  if (digits.length === 0) return ap.trim()
  if (digits.length === 1) return digits + ap
  const formatted = `${digits.slice(0, 1)}:${digits.slice(1, 3)}`
  return formatted + ap
}
