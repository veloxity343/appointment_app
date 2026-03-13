'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { YearWheel } from './wheel'
import {
  DateSlots, emptyDateSlots, dateSlotsToDisplay, dateSlotsToISO,
  dateSlotsToPartialISO, pushDateDigit, popDateDigit, smartParseDate,
} from '../parsers'
import { useAnchorPos } from './hooks'

const MONTHS_LONG = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]
const DAYS_SHORT = ['Mo','Tu','We','Th','Fr','Sa','Su']

interface Props {
  value:        string            // ISO yyyy-mm-dd (empty if unset)
  textValue:    string            // display string (kept in parent for persistence)
  onDateSelect: (iso: string, display: string) => void
  onTextChange: (raw: string) => void
}

// Parse ISO to slots for initialising when editing an existing record
function isoToSlots(iso: string): DateSlots {
  if (!iso) return emptyDateSlots()
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return emptyDateSlots()
  const [, y, mo, d] = m
  return [d[0], d[1], mo[0], mo[1], y[0], y[1], y[2], y[3]]
}

export function CalendarPicker({ value, textValue, onDateSelect, onTextChange }: Props) {
  const [open, setOpen]     = useState(false)
  const [slots, setSlots]   = useState<DateSlots>(() => isoToSlots(value))
  const anchorRef           = useRef<HTMLDivElement>(null)
  const dropRef             = useRef<HTMLDivElement>(null)
  const inputRef            = useRef<HTMLInputElement>(null)
  const pos                 = useAnchorPos(open, anchorRef)

  const today    = new Date()
  const initDate = value ? new Date(value + 'T00:00:00') : today
  const [viewMonth, setViewMonth] = useState(initDate.getMonth())
  const [viewYear,  setViewYear]  = useState(initDate.getFullYear())

  // When value changes externally (e.g. clicking calendar day), sync slots
  useEffect(() => {
    if (value) {
      const newSlots = isoToSlots(value)
      setSlots(newSlots)
      const d = new Date(value + 'T00:00:00')
      if (!isNaN(d.getTime())) {
        setViewMonth(d.getMonth())
        setViewYear(d.getFullYear())
      }
    }
  }, [value])

  // Close on outside click
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

  // After updating slots, push display + ISO to parent and sync calendar view
  const commitSlots = useCallback((newSlots: DateSlots) => {
    const display = dateSlotsToDisplay(newSlots)
    onTextChange(display)

    // Try partial parse first for calendar snapping
    const partial = dateSlotsToPartialISO(newSlots)
    if (partial) {
      const d = new Date(partial + 'T00:00:00')
      if (!isNaN(d.getTime())) {
        setViewMonth(d.getMonth())
        setViewYear(d.getFullYear())
      }
    }

    // Full parse for confirming the date
    const iso = dateSlotsToISO(newSlots)
    if (iso) {
      onDateSelect(iso, display)
    }
  }, [onTextChange, onDateSelect])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    e.preventDefault() // block all native text editing

    if (e.key === 'Backspace' || e.key === 'Delete') {
      const next = popDateDigit(slots)
      setSlots(next)
      commitSlots(next)
      return
    }

    if (/^\d$/.test(e.key)) {
      const next = pushDateDigit(slots, e.key)
      setSlots(next)
      commitSlots(next)
      return
    }
    // Ignore everything else (arrows, letters, etc.)
  }, [slots, commitSlots])

  function selectDay(day: number) {
    const mm    = String(viewMonth + 1).padStart(2, '0')
    const dd    = String(day).padStart(2, '0')
    const iso   = `${viewYear}-${mm}-${dd}`
    const disp  = `${dd}/${mm}/${viewYear}`
    const newSlots = isoToSlots(iso)
    setSlots(newSlots)
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

  // Build display with colour-coded placeholder chars
  const display = dateSlotsToDisplay(slots)
  const ph = ['d','d','m','m','y','y','y','y']
  const filled = slots.every(s => s !== null)

  return (
    <div ref={anchorRef}>
      <div
        style={{ position: 'relative' }}
        onClick={() => { setOpen(true); inputRef.current?.focus() }}
      >
        {/* Custom display div styled like an input */}
        <div style={{
          ...inputStyle,
          display: 'flex', alignItems: 'center', gap: 0,
          cursor: 'text', userSelect: 'none',
        }}>
          {/* dd */}
          <SlotChar c={slots[0]} ph="d" />
          <SlotChar c={slots[1]} ph="d" />
          <Sep>/</Sep>
          {/* mm */}
          <SlotChar c={slots[2]} ph="m" />
          <SlotChar c={slots[3]} ph="m" />
          <Sep>/</Sep>
          {/* yyyy */}
          <SlotChar c={slots[4]} ph="y" />
          <SlotChar c={slots[5]} ph="y" />
          <SlotChar c={slots[6]} ph="y" />
          <SlotChar c={slots[7]} ph="y" />
          {/* Cursor blink on the next empty slot */}
          {!filled && <Cursor />}
        </div>
        {/* Hidden input to capture keystrokes */}
        <input
          ref={inputRef}
          onKeyDown={handleKeyDown}
          onFocus={() => setOpen(true)}
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
            <YearWheel year={viewYear} onChange={setViewYear} />
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
              const isToday = day === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear()
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

// ── Sub-components ────────────────────────────────────────────────────────────
function SlotChar({ c, ph }: { c: string | null; ph: string }) {
  return (
    <span style={{
      fontFamily: "'DM Mono', monospace",
      fontSize: 13,
      color: c ? '#ECECF1' : '#3A3A50',
      minWidth: '0.65em',
      textAlign: 'center',
    }}>
      {c ?? ph}
    </span>
  )
}

function Sep({ children }: { children: string }) {
  return <span style={{ color: '#4A4A62', fontFamily: "'DM Mono', monospace", fontSize: 13, margin: '0 1px' }}>{children}</span>
}

function Cursor() {
  return (
    <span style={{
      display: 'inline-block', width: 1, height: '1em',
      background: '#22C55E', marginLeft: 1,
      animation: 'blink 1s step-end infinite',
    }}>
      <style>{`@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }`}</style>
    </span>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 36px 9px 12px',
  background: '#0D0D10', border: '1px solid #2A2A35', borderRadius: 8,
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
