// ─── parsers.ts ───────────────────────────────────────────────────────────────

// ── Validation ────────────────────────────────────────────────────────────────

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

export function smartParseTime(raw: string): { h24: number; m: number } | null {
  // expects "hh:mm AM" or "hh:mm PM" with digits filled
  const upper = raw.trim().toUpperCase()
  const match = upper.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/)
  if (!match) return null
  let h = parseInt(match[1]), m = parseInt(match[2])
  const ap = match[3]
  if (h < 1 || h > 12 || m < 0 || m > 59) return null
  const h24 = ap === 'PM' ? (h === 12 ? 12 : h + 12) : (h === 12 ? 0 : h)
  return { h24, m }
}

// ── Slot-based date input ─────────────────────────────────────────────────────
// Internal state: 8 digit slots for ddmmyyyy, unfilled = null
// Display: "dd/mm/yyyy" with filled digits replacing placeholders

export type DateSlots = (string | null)[] // length 8: [d0,d1,m0,m1,y0,y1,y2,y3]

export function emptyDateSlots(): DateSlots {
  return Array(8).fill(null)
}

export function dateSlotsFull(slots: DateSlots): boolean {
  return slots.every(s => s !== null)
}

// Convert slots to display string "dd/mm/yyyy"
export function dateSlotsToDisplay(slots: DateSlots): string {
  const ph = ['d','d','m','m','y','y','y','y']
  const chars = slots.map((s, i) => s ?? ph[i])
  return `${chars[0]}${chars[1]}/${chars[2]}${chars[3]}/${chars[4]}${chars[5]}${chars[6]}${chars[7]}`
}

// Convert slots to ISO if complete
export function dateSlotsToISO(slots: DateSlots): string | null {
  if (!dateSlotsFull(slots)) return null
  const dd = slots[0]! + slots[1]!
  const mm = slots[2]! + slots[3]!
  const yy = slots[4]! + slots[5]! + slots[6]! + slots[7]!
  return smartParseDate(`${dd}/${mm}/${yy}`)
}

// Partial parse — best-effort ISO for calendar preview even with incomplete input
export function dateSlotsToPartialISO(slots: DateSlots): string | null {
  const dd = (slots[0] ?? '0') + (slots[1] ?? '1')
  const mm = (slots[2] ?? '0') + (slots[3] ?? '1')
  const yy = (slots[4] ?? '2') + (slots[5] ?? '0') + (slots[6] ?? '2') + (slots[7] ?? '5')
  const d  = parseInt(dd), mo = parseInt(mm), y = parseInt(yy)
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || y < 1980) return null
  const iso = `${y}-${String(mo).padStart(2,'0')}-${String(d).padStart(2,'0')}`
  const dt  = new Date(iso + 'T00:00:00')
  if (isNaN(dt.getTime())) return null
  return iso
}

/**
 * Push a digit into date slots.
 * Smart month clamping: if slot 2 (tens of month) > 1, insert 0 before it.
 * Smart day clamping: if slot 0 > 3, insert 0 before it.
 */
export function pushDateDigit(slots: DateSlots, digit: string): DateSlots {
  const next = [...slots] as DateSlots
  const firstEmpty = next.findIndex(s => s === null)
  if (firstEmpty === -1) return next // full, ignore

  // Slot 0 (day tens): if digit > 3, auto-fill slot 0 with '0' then slot 1 with digit
  if (firstEmpty === 0 && parseInt(digit) > 3) {
    next[0] = '0'
    next[1] = digit
    return next
  }
  // Slot 2 (month tens): if digit > 1, auto-fill slot 2 with '0' then slot 3 with digit
  if (firstEmpty === 2 && parseInt(digit) > 1) {
    next[2] = '0'
    next[3] = digit
    return next
  }
  // Slot 1 (day units): combined day validation
  if (firstEmpty === 1) {
    const combined = parseInt(next[0]! + digit)
    if (combined < 1) { next[1] = '1'; return next }
    if (combined > 31) { next[1] = '9'; return next }
  }
  // Slot 3 (month units): combined month validation
  if (firstEmpty === 3) {
    const combined = parseInt(next[2]! + digit)
    if (combined < 1) { next[3] = '1'; return next }
    if (combined > 12) { next[3] = '2'; return next }
  }

  next[firstEmpty] = digit
  return next
}

export function popDateDigit(slots: DateSlots): DateSlots {
  const next = [...slots] as DateSlots
  // find last filled slot
  for (let i = 7; i >= 0; i--) {
    if (next[i] !== null) { next[i] = null; return next }
  }
  return next
}

// ── Slot-based time input ─────────────────────────────────────────────────────
// Slots: [h0, m0, m1, ampm]  where h0 = 1-12, m0m1 = 00-55, ampm = 'AM'|'PM'
// Display: "h:mm AM" with placeholder chars

export type TimeSlots = {
  h:    string | null   // '1'..'12'  (variable width, store as string)
  m0:   string | null   // tens of minute
  m1:   string | null   // units of minute
  ampm: 'AM' | 'PM' | null
}

export function emptyTimeSlots(): TimeSlots {
  return { h: null, m0: null, m1: null, ampm: null }
}

export function timeSlotsToDisplay(ts: TimeSlots): string {
  const h  = ts.h    ?? 'h'
  const m0 = ts.m0   ?? 'm'
  const m1 = ts.m1   ?? 'm'
  const ap = ts.ampm ?? 'AM'
  return `${h}:${m0}${m1} ${ap}`
}

// Phase of input
export type TimePhase = 'h' | 'm0' | 'm1' | 'ampm' | 'done'

export function getTimePhase(ts: TimeSlots): TimePhase {
  if (ts.h    === null) return 'h'
  if (ts.m0   === null) return 'm0'
  if (ts.m1   === null) return 'm1'
  if (ts.ampm === null) return 'ampm'
  return 'done'
}

/**
 * Push a digit or 'A'/'P' into time slots.
 */
export function pushTimeInput(ts: TimeSlots, char: string): TimeSlots {
  const next = { ...ts }
  const phase = getTimePhase(next)
  const upper = char.toUpperCase()

  if (phase === 'h') {
    const d = parseInt(char)
    if (isNaN(d)) return next
    // h can be 1-12.  If digit > 1, it must be a single-digit hour (auto advance)
    if (d === 0) { next.h = '12'; return next } // 0 → treat as 12
    if (d >= 2 && d <= 9) {
      // Single digit hour (2-9), auto-advance to minutes
      next.h = String(d)
      return next
    }
    // d === 1 — could be 1 or 10,11,12; wait for next digit
    next.h = String(d)
    return next
  }

  if (phase === 'm0') {
    // If still building hour (it was '1') and digit makes valid 2-digit hour
    if (ts.h === '1' && (char === '0' || char === '1' || char === '2')) {
      const twoDigit = parseInt('1' + char)
      if (twoDigit >= 10 && twoDigit <= 12) {
        next.h = String(twoDigit)
        return next // stay in m0 phase
      }
    }
    const d = parseInt(char)
    if (isNaN(d)) return next
    // minute tens: only 0-5 valid
    if (d > 5) { next.m0 = '5'; next.m1 = char; return next }
    next.m0 = char
    return next
  }

  if (phase === 'm1') {
    const d = parseInt(char)
    if (isNaN(d)) return next
    next.m1 = char
    return next
  }

  if (phase === 'ampm') {
    if (upper === 'A') { next.ampm = 'AM'; return next }
    if (upper === 'P') { next.ampm = 'PM'; return next }
    return next
  }

  return next
}

export function popTimeInput(ts: TimeSlots): TimeSlots {
  const next = { ...ts }
  if (next.ampm !== null) { next.ampm = null; return next }
  if (next.m1   !== null) { next.m1   = null; return next }
  if (next.m0   !== null) {
    // if h was two digits, reduce to one
    if (next.h && next.h.length === 2) { next.h = next.h[0]; return next }
    next.m0 = null
    return next
  }
  if (next.h !== null) { next.h = null; return next }
  return next
}

export function timeSlotsToH24(ts: TimeSlots): { h24: number; m: number } | null {
  if (!ts.h || !ts.m0 || !ts.m1 || !ts.ampm) return null
  const h12 = parseInt(ts.h)
  const m   = parseInt(ts.m0 + ts.m1)
  if (h12 < 1 || h12 > 12 || m < 0 || m > 59) return null
  const h24 = ts.ampm === 'PM' ? (h12 === 12 ? 12 : h12 + 12) : (h12 === 12 ? 0 : h12)
  return { h24, m }
}
