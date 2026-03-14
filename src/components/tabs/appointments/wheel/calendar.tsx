'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { YearWheel } from './wheel'
import {
  DateSlots, emptyDateSlots, dateSlotsToDisplay, dateSlotsToISO,
  pushDateDigit, popDateDigit,
} from '../parsers'
import { useAnchorPos } from './hooks'

// ── Keyframe injection ────────────────────────────────────────────────────────
const _injected = new Set<string>()
function injectKeyframes(id: string, css: string) {
  if (_injected.has(id) || typeof document === 'undefined') return
  _injected.add(id)
  const el = document.createElement('style')
  el.textContent = css
  document.head.appendChild(el)
}

// ── Constants ─────────────────────────────────────────────────────────────────
const YEAR_MIN = 1980
const YEAR_MAX = 2100

const MONTHS_LONG = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]
const DAYS_SHORT = ['Mo','Tu','We','Th','Fr','Sa','Su']

// ── Pure helpers ──────────────────────────────────────────────────────────────

function isoToSlots(iso: string): DateSlots {
  if (!iso) return emptyDateSlots()
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return emptyDateSlots()
  const [, y, mo, d] = m
  return [d[0], d[1], mo[0], mo[1], y[0], y[1], y[2], y[3]]
}

function yearToSlots(y: number): [string, string, string, string] {
  const s = String(y).padStart(4, '0')
  return [s[0], s[1], s[2], s[3]]
}

function autocorrectYear(s: DateSlots): DateSlots {
  if (s[4] === null || s[5] === null || s[6] === null || s[7] === null) return s
  const y = parseInt(s[4] + s[5] + s[6] + s[7])
  if (y < YEAR_MIN) {
    const min = String(YEAR_MIN)
    return [s[0], s[1], s[2], s[3], min[0], min[1], min[2], min[3]] as DateSlots
  }
  return s
}

/**
 * Progressive year snapping — ascending order:
 *   0–2 digits → no snap (return null)
 *   3 digits   → prefix + '0'  (e.g. "201" → 2010, "202" → 2020)
 *   4 digits   → exact, clamped to [YEAR_MIN, YEAR_MAX]
 */
function resolveViewYear(s: DateSlots): number | null {
  const filled = [s[4], s[5], s[6], s[7]].filter(v => v !== null).length
  if (filled < 3) return null
  if (filled === 3) {
    const lo = parseInt(s[4]! + s[5]! + s[6]! + '0')
    return Math.max(YEAR_MIN, lo)
  }
  const exact = parseInt(s[4]! + s[5]! + s[6]! + s[7]!)
  return Math.max(YEAR_MIN, Math.min(YEAR_MAX, exact))
}

function resolveViewMonth(s: DateSlots): number | null {
  if (s[2] === null || s[3] === null) return null
  const mo = parseInt(s[2] + s[3])
  return mo >= 1 && mo <= 12 ? mo - 1 : null
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  value:        string
  textValue:    string
  onDateSelect: (iso: string, display: string) => void
  onTextChange: (raw: string) => void
}

export function CalendarPicker({ value, textValue, onDateSelect, onTextChange }: Props) {
  const [open,    setOpen]    = useState(false)
  const [focused, setFocused] = useState(false)
  const [slots,   setSlots]   = useState<DateSlots>(() => isoToSlots(value))

  const slotsRef = useRef(slots)

  const anchorRef = useRef<HTMLDivElement>(null)
  const dropRef   = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLInputElement>(null)
  const pos       = useAnchorPos(open, anchorRef)

  const today = new Date()

  const initDate = value ? new Date(value + 'T00:00:00') : today
  const [viewMonth, setViewMonth] = useState(initDate.getMonth())
  const [viewYear,  setViewYear]  = useState(initDate.getFullYear())

  useEffect(() => {
    if (value) {
      const s = isoToSlots(value)
      slotsRef.current = s
      setSlots(s)
      const d = new Date(value + 'T00:00:00')
      if (!isNaN(d.getTime())) {
        setViewMonth(d.getMonth())
        setViewYear(d.getFullYear())
      }
    }
  }, [value])

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (
        !anchorRef.current?.contains(e.target as Node) &&
        !dropRef.current?.contains(e.target as Node)
      ) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // ── commitSlots ───────────────────────────────────────────────────────────
  // Plain function — always captures current render's callbacks.
  // Only called from event handlers, never inside a setState updater.
  function commitSlots(s: DateSlots) {
    slotsRef.current = s
    setSlots(s)
    onTextChange(dateSlotsToDisplay(s))

    const newMonth = resolveViewMonth(s)
    if (newMonth !== null) setViewMonth(newMonth)

    const newYear = resolveViewYear(s)
    if (newYear !== null) setViewYear(newYear)

    const iso = dateSlotsToISO(s)
    if (iso) onDateSelect(iso, dateSlotsToDisplay(s))
  }

  // ── handleKeyDown ─────────────────────────────────────────────────────────
  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    e.preventDefault()
    if (e.key === 'Backspace' || e.key === 'Delete') {
      commitSlots(popDateDigit(slotsRef.current))
      return
    }
    if (/^\d$/.test(e.key)) {
      commitSlots(autocorrectYear(pushDateDigit(slotsRef.current, e.key)))
    }
  }

  // ── Year wheel callback ───────────────────────────────────────────────────
  // When the user scrolls the year wheel, write the chosen year back into
  // slots[4..7] and update the input field display accordingly.
  function handleYearWheel(y: number) {
    const clamped = Math.max(YEAR_MIN, Math.min(YEAR_MAX, y))
    setViewYear(clamped)

    // Overwrite the four year slots with the scrolled year
    const [y0, y1, y2, y3] = yearToSlots(clamped)
    const next: DateSlots = [
      slotsRef.current[0], slotsRef.current[1],
      slotsRef.current[2], slotsRef.current[3],
      y0, y1, y2, y3,
    ]
    slotsRef.current = next
    setSlots(next)
    onTextChange(dateSlotsToDisplay(next))

    const iso = dateSlotsToISO(next)
    if (iso) onDateSelect(iso, dateSlotsToDisplay(next))
  }

  function selectDay(day: number) {
    const mm   = String(viewMonth + 1).padStart(2, '0')
    const dd   = String(day).padStart(2, '0')
    const iso  = `${viewYear}-${mm}-${dd}`
    const disp = `${dd}/${mm}/${viewYear}`
    const s    = isoToSlots(iso)
    slotsRef.current = s
    setSlots(s)
    onDateSelect(iso, disp)
    onTextChange(disp)
    setOpen(false)
  }

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  const firstDay    = new Date(viewYear, viewMonth, 1).getDay()
  const offset      = firstDay === 0 ? 6 : firstDay - 1
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const cells: (number | null)[] = [
    ...Array(offset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  const selDate = value ? new Date(value + 'T00:00:00') : null
  const selD    = selDate && !isNaN(selDate.getTime()) ? selDate.getDate()     : null
  const selM    = selDate && !isNaN(selDate.getTime()) ? selDate.getMonth()    : null
  const selY    = selDate && !isNaN(selDate.getTime()) ? selDate.getFullYear() : null

  const cursorAt = slots.findIndex(s => s === null)

  return (
    <div ref={anchorRef}>
      <div
        style={{ position: 'relative' }}
        onClick={() => { setOpen(true); inputRef.current?.focus() }}
      >
        <div style={{
          ...inputStyle,
          border: focused ? '1px solid rgba(34,197,94,0.5)' : '1px solid #2A2A35',
          display: 'flex', alignItems: 'center',
          cursor: 'text', userSelect: 'none',
        }}>
          <SlotChar c={slots[0]} ph="d" showCursor={focused && cursorAt === 0} />
          <SlotChar c={slots[1]} ph="d" showCursor={focused && cursorAt === 1} />
          <Sep>/</Sep>
          <SlotChar c={slots[2]} ph="m" showCursor={focused && cursorAt === 2} />
          <SlotChar c={slots[3]} ph="m" showCursor={focused && cursorAt === 3} />
          <Sep>/</Sep>
          <SlotChar c={slots[4]} ph="y" showCursor={focused && cursorAt === 4} />
          <SlotChar c={slots[5]} ph="y" showCursor={focused && cursorAt === 5} />
          <SlotChar c={slots[6]} ph="y" showCursor={focused && cursorAt === 6} />
          <SlotChar c={slots[7]} ph="y" showCursor={focused && cursorAt === 7} />
        </div>

        <input
          ref={inputRef}
          onKeyDown={handleKeyDown}
          onFocus={() => { setOpen(true); setFocused(true) }}
          onBlur={() => setFocused(false)}
          readOnly
          style={{
            position: 'absolute', inset: 0, opacity: 0,
            width: '100%', height: '100%', cursor: 'text', zIndex: 1,
          }}
        />
        <span
          onClick={e => { e.stopPropagation(); setOpen(o => !o) }}
          style={{ ...iconStyle, zIndex: 2 }}
        >📅</span>
      </div>

      {open && typeof window !== 'undefined' && createPortal(
        <div ref={dropRef} style={{
          position: 'fixed', zIndex: 9999,
          top: pos.top, bottom: pos.bottom, left: pos.left,
          width: Math.max(pos.width ?? 0, 300),
          background: '#16161C', border: '1px solid #2A2A35',
          borderRadius: 14, boxShadow: '0 20px 60px rgba(0,0,0,0.85)', padding: 14,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <button onClick={prevMonth} style={navBtnStyle}>‹</button>
            <select value={viewMonth} onChange={e => setViewMonth(Number(e.target.value))} style={selectStyle}>
              {MONTHS_LONG.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
            <YearWheel year={viewYear} onChange={handleYearWheel} />
            <button onClick={nextMonth} style={navBtnStyle}>›</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, marginBottom: 4 }}>
            {DAYS_SHORT.map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: '#6B6B80' }}>{d}</div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
            {cells.map((day, i) => {
              if (!day) return <div key={i} />
              const isSel   = day === selD && viewMonth === selM && viewYear === selY
              const isToday = (
                day === today.getDate() &&
                viewMonth === today.getMonth() &&
                viewYear  === today.getFullYear()
              )
              return (
                <button key={i} onClick={() => selectDay(day)} style={{
                  width: '100%', aspectRatio: '1', borderRadius: 6, cursor: 'pointer',
                  border:     isToday && !isSel ? '1px solid rgba(34,197,94,0.4)' : 'none',
                  background: isSel ? '#22C55E' : 'transparent',
                  color:      isSel ? '#000' : isToday ? '#22C55E' : '#ECECF1',
                  fontSize: 12, fontWeight: isSel || isToday ? 700 : 400, fontFamily: 'inherit',
                }}
                  onMouseEnter={e => { if (!isSel) (e.currentTarget as HTMLButtonElement).style.background = '#1E1E26' }}
                  onMouseLeave={e => { if (!isSel) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                >
                  {day}
                </button>
              )
            })}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

// ── Primitives ─────────────────────────────────────────────────────────────────

function SlotChar({ c, ph, showCursor }: { c: string | null; ph: string; showCursor: boolean }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center' }}>
      {showCursor && <BlinkCursor id="blink-cal" />}
      <span style={{
        fontFamily: "'DM Mono', monospace", fontSize: 13,
        color: c ? '#ECECF1' : '#3A3A50',
        minWidth: '0.65em', textAlign: 'center',
      }}>
        {c ?? ph}
      </span>
    </span>
  )
}

function Sep({ children }: { children: string }) {
  return (
    <span style={{ color: '#4A4A62', fontFamily: "'DM Mono', monospace", fontSize: 13, margin: '0 1px' }}>
      {children}
    </span>
  )
}

function BlinkCursor({ id }: { id: string }) {
  injectKeyframes(id, `@keyframes ${id}{0%,100%{opacity:1}50%{opacity:0}}`)
  return (
    <span style={{
      display: 'inline-block', width: 1.5, height: '1em',
      background: '#22C55E', marginRight: 1, borderRadius: 1,
      animation: `${id} 1s step-end infinite`,
    }} />
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 36px 9px 12px',
  background: '#0D0D10', borderRadius: 8,
  fontSize: 13, color: '#ECECF1', outline: 'none', fontFamily: 'inherit',
  minHeight: 38,
}
const iconStyle: React.CSSProperties = {
  position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
  cursor: 'pointer', fontSize: 15, color: '#6B6B80', userSelect: 'none',
}
const navBtnStyle: React.CSSProperties = {
  background: 'none', border: 'none', color: '#6B6B80', fontSize: 20,
  cursor: 'pointer', width: 28, height: 28, display: 'flex', alignItems: 'center',
  justifyContent: 'center', borderRadius: 6, fontFamily: 'inherit', flexShrink: 0,
}
const selectStyle: React.CSSProperties = {
  flex: 1, background: '#0D0D10', border: '1px solid #2A2A35', borderRadius: 6,
  color: '#ECECF1', fontSize: 13, padding: '4px 6px',
  fontFamily: 'inherit', cursor: 'pointer', outline: 'none',
}
