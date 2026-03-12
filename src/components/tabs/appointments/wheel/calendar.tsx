'use client'

// ─── CalendarPicker.tsx ───────────────────────────────────────────────────────

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { YearWheel } from './wheel'
import { smartParseDate } from '../parsers'
import { useAnchorPos } from './hooks'

const MONTHS_LONG = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]
const DAYS_SHORT = ['Mo','Tu','We','Th','Fr','Sa','Su']

interface Props {
  value:        string   // ISO yyyy-mm-dd or ''
  textValue:    string   // what the input shows
  onDateSelect: (iso: string, display: string) => void
  onTextChange: (raw: string) => void
}

export function CalendarPicker({ value, textValue, onDateSelect, onTextChange }: Props) {
  const [open, setOpen]         = useState(false)
  const anchorRef               = useRef<HTMLDivElement>(null)
  const dropRef                 = useRef<HTMLDivElement>(null)
  const pos                     = useAnchorPos(open, anchorRef)

  const today     = new Date()
  const initDate  = value ? new Date(value + 'T00:00:00') : today
  const [viewMonth, setViewMonth] = useState(initDate.getMonth())
  const [viewYear,  setViewYear]  = useState(initDate.getFullYear())

  // Sync view when value changes externally
  useEffect(() => {
    if (value) {
      const d = new Date(value + 'T00:00:00')
      setViewMonth(d.getMonth())
      setViewYear(d.getFullYear())
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

  function selectDay(day: number) {
    const mm = String(viewMonth + 1).padStart(2, '0')
    const dd = String(day).padStart(2, '0')
    onDateSelect(`${viewYear}-${mm}-${dd}`, `${dd}/${mm}/${viewYear}`)
    setOpen(false)
  }

  function handleText(raw: string) {
    onTextChange(raw)
    const iso = smartParseDate(raw)
    if (iso) {
      const d = new Date(iso + 'T00:00:00')
      setViewMonth(d.getMonth())
      setViewYear(d.getFullYear())
      onDateSelect(iso, raw)
    }
  }

  const prevMonth = () => viewMonth === 0 ? (setViewMonth(11), setViewYear(y => y - 1)) : setViewMonth(m => m - 1)
  const nextMonth = () => viewMonth === 11 ? (setViewMonth(0), setViewYear(y => y + 1)) : setViewMonth(m => m + 1)

  // Build calendar grid (Monday-first)
  const firstDay    = new Date(viewYear, viewMonth, 1).getDay()
  const offset      = firstDay === 0 ? 6 : firstDay - 1
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const cells: (number | null)[] = [
    ...Array(offset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  const selD = value ? new Date(value + 'T00:00:00').getDate()     : null
  const selM = value ? new Date(value + 'T00:00:00').getMonth()    : null
  const selY = value ? new Date(value + 'T00:00:00').getFullYear() : null

  return (
    <div ref={anchorRef}>
      <div style={{ position: 'relative' }}>
        <input
          value={textValue}
          onChange={e => handleText(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="DD/MM/YYYY or d/m/yy"
          style={inputStyle}
        />
        <span onClick={() => setOpen(o => !o)} style={iconStyle}>📅</span>
      </div>

      {open && createPortal(
        <div ref={dropRef} style={{
          position: 'fixed', zIndex: 9999,
          top:    pos.flipUp ? undefined : pos.top,
          bottom: pos.flipUp ? pos.bottom : undefined,
          left: pos.left, width: Math.max(pos.width, 300),
          background: '#16161C', border: '1px solid #2A2A35',
          borderRadius: 14, boxShadow: '0 20px 60px rgba(0,0,0,0.85)', padding: 14,
        }}>

          {/* Month / Year nav */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <button onClick={prevMonth} style={navBtnStyle}>‹</button>
            <select
              value={viewMonth}
              onChange={e => setViewMonth(Number(e.target.value))}
              style={selectStyle}
            >
              {MONTHS_LONG.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
            <YearWheel year={viewYear} onChange={setViewYear} />
            <button onClick={nextMonth} style={navBtnStyle}>›</button>
          </div>

          {/* Day headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, marginBottom: 4 }}>
            {DAYS_SHORT.map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: '#6B6B80' }}>{d}</div>
            ))}
          </div>

          {/* Day cells */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
            {cells.map((day, i) => {
              if (!day) return <div key={i} />
              const isSel   = day === selD && viewMonth === selM && viewYear === selY
              const isToday = day === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear()
              return (
                <button key={i} onClick={() => selectDay(day)} style={{
                  width: '100%', aspectRatio: '1', borderRadius: 6, cursor: 'pointer',
                  border:      isToday && !isSel ? '1px solid rgba(34,197,94,0.4)' : 'none',
                  background:  isSel ? '#22C55E' : 'transparent',
                  color:       isSel ? '#000' : isToday ? '#22C55E' : '#ECECF1',
                  fontSize: 12, fontWeight: isSel || isToday ? 700 : 400,
                  fontFamily: 'inherit',
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

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 36px 9px 12px',
  background: '#0D0D10', border: '1px solid #2A2A35', borderRadius: 8,
  fontSize: 13, color: '#ECECF1', outline: 'none', fontFamily: 'inherit',
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
