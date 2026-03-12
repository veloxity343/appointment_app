'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { applyWeekFilter, fmtDate, fmtTime, parseInputDate } from '@/lib/utils'
import type { Appointment, WeekFilter } from '@/types'

const WEEK_FILTERS: WeekFilter[] = ['All', 'This Week', 'Next Week', 'Past']

const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December']
const DAYS_SHORT = ['Mo','Tu','We','Th','Fr','Sa','Su']

// ── Types ─────────────────────────────────────────────────────────────────────
interface DialogState {
  open: boolean; mode: 'add' | 'edit'; id?: number
  name: string; treatment: string
  date: string
  dateInput: string
  time: string
  timeInput: string
  companions: string
  error: string
}
const EMPTY_DLG: DialogState = {
  open: false, mode: 'add',
  name: '', treatment: '', date: '', dateInput: '', time: '', timeInput: '', companions: '', error: '',
}

interface Props {
  weekFilter: WeekFilter
  onWeekFilterChange: (f: WeekFilter) => void
}

// ── CalendarPicker ────────────────────────────────────────────────────────────
function CalendarPicker({
  value, textValue, onDateSelect, onTextChange,
}: {
  value: string
  textValue: string
  onDateSelect: (iso: string, display: string) => void
  onTextChange: (raw: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const today = new Date()
  const initDate = value ? new Date(value + 'T00:00:00') : today
  const [viewYear,  setViewYear]  = useState(initDate.getFullYear())
  const [viewMonth, setViewMonth] = useState(initDate.getMonth())

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (value) {
      const d = new Date(value + 'T00:00:00')
      setViewYear(d.getFullYear()); setViewMonth(d.getMonth())
    }
  }, [value])

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  // Build grid: Monday-first
  const firstDay = new Date(viewYear, viewMonth, 1).getDay() // 0=Sun
  const offset   = firstDay === 0 ? 6 : firstDay - 1
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const cells: (number | null)[] = [
    ...Array(offset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  function selectDay(day: number) {
    const mm   = String(viewMonth + 1).padStart(2, '0')
    const dd   = String(day).padStart(2, '0')
    const iso  = `${viewYear}-${mm}-${dd}`
    const disp = `${dd}/${mm}/${viewYear}`
    onDateSelect(iso, disp)
    setOpen(false)
  }

  const selectedDay = value
    ? new Date(value + 'T00:00:00').getDate()
    : null
  const selectedMonth = value ? new Date(value + 'T00:00:00').getMonth() : null
  const selectedYear  = value ? new Date(value + 'T00:00:00').getFullYear() : null

  const todayD = today.getDate()
  const todayM = today.getMonth()
  const todayY = today.getFullYear()

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Text input */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <input
          value={textValue}
          onChange={e => onTextChange(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="DD/MM/YYYY"
          style={{
            width: '100%', padding: '9px 36px 9px 12px',
            background: '#0D0D10', border: '1px solid #2A2A35', borderRadius: 8,
            fontSize: 13, color: '#ECECF1', outline: 'none', fontFamily: 'inherit',
          }}
        />
        <span
          onClick={() => setOpen(o => !o)}
          style={{
            position: 'absolute', right: 10, cursor: 'pointer',
            fontSize: 15, color: '#6B6B80', userSelect: 'none',
          }}
        >📅</span>
      </div>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 200,
          background: '#16161C', border: '1px solid #2A2A35', borderRadius: 12,
          boxShadow: '0 16px 48px rgba(0,0,0,0.6)', padding: 14, width: 260,
        }}>
          {/* Month/year nav */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <button onClick={prevMonth} style={navBtnStyle}>‹</button>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#ECECF1' }}>
              {MONTHS[viewMonth]} {viewYear}
            </span>
            <button onClick={nextMonth} style={navBtnStyle}>›</button>
          </div>

          {/* Day headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
            {DAYS_SHORT.map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: '#6B6B80', padding: '2px 0' }}>
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
            {cells.map((day, i) => {
              if (!day) return <div key={i} />
              const isSelected = day === selectedDay && viewMonth === selectedMonth && viewYear === selectedYear
              const isToday    = day === todayD && viewMonth === todayM && viewYear === todayY
              return (
                <button
                  key={i}
                  onClick={() => selectDay(day)}
                  style={{
                    width: '100%', aspectRatio: '1', borderRadius: 6,
                    border: isToday && !isSelected ? '1px solid rgba(34,197,94,0.4)' : 'none',
                    background: isSelected ? '#22C55E' : 'transparent',
                    color: isSelected ? '#000' : isToday ? '#22C55E' : '#ECECF1',
                    fontSize: 12, fontWeight: isSelected || isToday ? 700 : 400,
                    cursor: 'pointer', fontFamily: 'inherit',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = '#1E1E26' }}
                  onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                >
                  {day}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

const navBtnStyle: React.CSSProperties = {
  background: 'none', border: 'none', color: '#6B6B80', fontSize: 18,
  cursor: 'pointer', width: 28, height: 28, display: 'flex',
  alignItems: 'center', justifyContent: 'center', borderRadius: 6,
  fontFamily: 'inherit',
}

// ── TimeWheel ─────────────────────────────────────────────────────────────────
function TimeWheel({
  value, textValue, onTimeSelect, onTextChange,
}: {
  value: string
  textValue: string
  onTimeSelect: (hhmm: string) => void
  onTextChange: (raw: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const parseValue = (v: string) => {
    const [h, m] = v.split(':').map(Number)
    return { h: isNaN(h) ? 9 : h, m: isNaN(m) ? 0 : m }
  }
  const { h: initH, m: initM } = parseValue(value)
  const [selH, setSelH] = useState(initH)
  const [selM, setSelM] = useState(initM)

  useEffect(() => {
    const { h, m } = parseValue(value)
    setSelH(h); setSelM(m)
  }, [value])

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function commit(h: number, m: number) {
    const hh = String(h).padStart(2, '0')
    const mm = String(m).padStart(2, '0')
    const v  = `${hh}:${mm}`
    const ampm = h >= 12 ? 'PM' : 'AM'
    const h12  = h % 12 || 12
    onTimeSelect(v)
    onTextChange(`${h12}:${mm} ${ampm}`)
  }

  const hours   = Array.from({ length: 24 }, (_, i) => i)
  const minutes = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]

  const ITEM_H = 36

  function WheelCol({
    items, selected, onSelect, fmt,
  }: {
    items: number[]; selected: number
    onSelect: (v: number) => void; fmt: (v: number) => string
  }) {
    const listRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
      const idx = items.indexOf(selected)
      if (listRef.current && idx >= 0) {
        listRef.current.scrollTop = idx * ITEM_H - ITEM_H * 2
      }
    }, [selected, items])

    return (
      <div style={{ position: 'relative', flex: 1 }}>
        {/* Selection highlight */}
        <div style={{
          position: 'absolute', top: '50%', left: 0, right: 0,
          height: ITEM_H, transform: 'translateY(-50%)',
          background: 'rgba(34,197,94,0.1)', borderRadius: 6,
          border: '1px solid rgba(34,197,94,0.2)', pointerEvents: 'none', zIndex: 1,
        }} />
        <div
          ref={listRef}
          style={{
            height: ITEM_H * 5, overflowY: 'scroll',
            scrollbarWidth: 'none', position: 'relative',
          }}
        >
          {/* Padding top/bottom so selected can centre */}
          {[null, null].map((_, i) => <div key={`t${i}`} style={{ height: ITEM_H }} />)}
          {items.map(v => (
            <div
              key={v}
              onClick={() => onSelect(v)}
              style={{
                height: ITEM_H, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 15, fontWeight: v === selected ? 700 : 400,
                color: v === selected ? '#22C55E' : '#9A9AB0',
                cursor: 'pointer', transition: 'color 0.1s', userSelect: 'none',
                fontFamily: "'DM Mono', monospace",
              }}
            >
              {fmt(v)}
            </div>
          ))}
          {[null, null].map((_, i) => <div key={`b${i}`} style={{ height: ITEM_H }} />)}
        </div>
      </div>
    )
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <input
          value={textValue}
          onChange={e => onTextChange(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="HH:MM or 9:30 AM"
          style={{
            width: '100%', padding: '9px 36px 9px 12px',
            background: '#0D0D10', border: '1px solid #2A2A35', borderRadius: 8,
            fontSize: 13, color: '#ECECF1', outline: 'none', fontFamily: 'inherit',
          }}
        />
        <span
          onClick={() => setOpen(o => !o)}
          style={{ position: 'absolute', right: 10, cursor: 'pointer', fontSize: 15, color: '#6B6B80', userSelect: 'none' }}
        >🕐</span>
      </div>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 200,
          background: '#16161C', border: '1px solid #2A2A35', borderRadius: 12,
          boxShadow: '0 16px 48px rgba(0,0,0,0.6)', padding: 16, width: 220,
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#6B6B80', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12, textAlign: 'center' }}>
            Scroll to select
          </div>

          {/* Column headers */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 4 }}>
            <div style={{ flex: 1, textAlign: 'center', fontSize: 11, color: '#6B6B80', fontWeight: 700 }}>Hour</div>
            <div style={{ flex: 1, textAlign: 'center', fontSize: 11, color: '#6B6B80', fontWeight: 700 }}>Min</div>
          </div>

          <div style={{ display: 'flex', gap: 12, overflow: 'hidden' }}>
            <WheelCol
              items={hours} selected={selH}
              onSelect={h => { setSelH(h); commit(h, selM) }}
              fmt={v => String(v).padStart(2, '0')}
            />
            <WheelCol
              items={minutes} selected={selM}
              onSelect={m => { setSelM(m); commit(selH, m) }}
              fmt={v => String(v).padStart(2, '0')}
            />
          </div>

          {/* AM/PM display */}
          <div style={{ textAlign: 'center', marginTop: 10, fontSize: 12, color: '#6B6B80' }}>
            {selH >= 12 ? 'PM' : 'AM'} · {String(selH % 12 || 12).padStart(2,'0')}:{String(selM).padStart(2,'0')} {selH >= 12 ? 'PM' : 'AM'}
          </div>
        </div>
      )}
    </div>
  )
}

// ── AppointmentsTab ───────────────────────────────────────────────────────────
export function AppointmentsTab({ weekFilter, onWeekFilterChange }: Props) {
  const [rows,    setRows]    = useState<Appointment[]>([])
  const [search,  setSearch]  = useState('')
  const [loading, setLoading] = useState(true)
  const [dlg,     setDlg]     = useState<DialogState>(EMPTY_DLG)
  const [delId,   setDelId]   = useState<number | null>(null)

  const fetchRows = useCallback(async () => {
    setLoading(true)
    const url = search ? `/api/appointments?search=${encodeURIComponent(search)}` : '/api/appointments'
    const res = await fetch(url)
    setRows(await res.json())
    setLoading(false)
  }, [search])

  useEffect(() => { fetchRows() }, [fetchRows])

  const visible = applyWeekFilter(rows, weekFilter)

  async function toggleConfirmed(id: number) {
    await fetch(`/api/appointments/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ toggle_confirmed: true }),
    })
    fetchRows()
  }

  async function deleteRow(id: number) {
    await fetch(`/api/appointments/${id}`, { method: 'DELETE' })
    setDelId(null); fetchRows()
  }

  async function saveDialog() {
    const name = dlg.name.trim()
    const date = dlg.date || parseInputDate(dlg.dateInput.trim())
    const time = dlg.time.trim()
    if (!name || !date || !time) { setDlg(d => ({ ...d, error: 'Name, date and time are required.' })); return }
    if (!/^\d{2}:\d{2}$/.test(time)) { setDlg(d => ({ ...d, error: 'Time must be HH:MM (24-hr).' })); return }
    const body = {
      client_name: name,
      treatment:   dlg.treatment.trim() || null,
      appt_date:   date,
      appt_time:   time,
      companions:  dlg.companions.trim() || null,
    }
    if (dlg.mode === 'add') {
      await fetch('/api/appointments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    } else {
      await fetch(`/api/appointments/${dlg.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    }
    setDlg(EMPTY_DLG); fetchRows()
  }

  function openEdit(r: Appointment) {
    const [y, m, d] = r.appt_date.split('-')
    const [hStr, mStr] = r.appt_time.split(':')
    const h = parseInt(hStr, 10)
    const ampm = h >= 12 ? 'PM' : 'AM'
    const h12  = h % 12 || 12
    setDlg({
      open: true, mode: 'edit', id: r.id,
      name: r.client_name,
      treatment: r.treatment ?? '',
      date: r.appt_date,
      dateInput: `${d}/${m}/${y}`,
      time: r.appt_time,
      timeInput: `${h12}:${mStr} ${ampm}`,
      companions: (r as any).companions ?? '',
      error: '',
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '20px 28px 0', gap: 14 }}>

      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', flexShrink: 0 }}>
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#6B6B80', fontSize: 13 }}>🔍</span>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search client or treatment…"
            style={{
              background: '#16161C', border: '1px solid #2A2A35', borderRadius: 8,
              padding: '8px 14px 8px 32px', fontSize: 13, color: '#ECECF1',
              outline: 'none', width: 260, fontFamily: 'inherit',
            }}
          />
        </div>

        <div style={{ display: 'flex', background: '#16161C', border: '1px solid #2A2A35', borderRadius: 8, padding: 3, gap: 2 }}>
          {WEEK_FILTERS.map(f => (
            <button key={f} onClick={() => onWeekFilterChange(f)} style={{
              padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600,
              background: weekFilter === f ? '#22C55E' : 'transparent',
              color: weekFilter === f ? '#000' : '#6B6B80',
              border: 'none', cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit',
            }}>
              {f}
            </button>
          ))}
        </div>

        <span style={{ fontSize: 12, color: '#6B6B80', background: '#16161C', border: '1px solid #2A2A35', borderRadius: 99, padding: '4px 10px' }}>
          {visible.length} shown
        </span>

        <button
          onClick={() => setDlg({ ...EMPTY_DLG, open: true, mode: 'add' })}
          style={{
            marginLeft: 'auto',
            background: '#22C55E', color: '#000', fontWeight: 700,
            border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13,
            cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> New Appointment
        </button>
      </div>

      {/* ── Table ────────────────────────────────────────────────────────── */}
      <div style={{
        flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column',
        background: '#111116', border: '1px solid #1E1E26', borderRadius: '12px 12px 0 0',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '200px 100px 1fr 1fr 130px 110px',
          background: '#0D0D10', borderBottom: '1px solid #1E1E26',
          padding: '0 16px', flexShrink: 0,
        }}>
          {['Date', 'Time', 'Client Name', 'Treatment', 'Status', 'Actions'].map(h => (
            <div key={h} style={{ padding: '11px 8px', fontSize: 11, fontWeight: 700, color: '#22C55E', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              {h}
            </div>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading && <div style={{ textAlign: 'center', padding: 60, color: '#6B6B80' }}>Loading…</div>}
          {!loading && visible.length === 0 && (
            <div style={{ textAlign: 'center', padding: 60 }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>📭</div>
              <p style={{ color: '#6B6B80', fontWeight: 500 }}>No appointments found.</p>
            </div>
          )}
          {!loading && visible.map((r) => (
            <Row key={r.id} r={r} onEdit={() => openEdit(r)} onToggle={() => toggleConfirmed(r.id)} onDelete={() => setDelId(r.id)} />
          ))}
        </div>

        <div style={{ borderTop: '1px solid #1E1E26', padding: '8px 24px', display: 'flex', justifyContent: 'space-between', flexShrink: 0 }}>
          <span style={{ fontSize: 11, color: '#6B6B80' }}>{visible.length} appointment{visible.length !== 1 ? 's' : ''}</span>
          <span style={{ fontSize: 11, color: '#6B6B80' }}>Double-click a row to edit</span>
        </div>
      </div>

      {/* ── Add/Edit Dialog ───────────────────────────────────────────────── */}
      {dlg.open && (
        <Modal title={dlg.mode === 'add' ? '+ New Appointment' : 'Edit Appointment'} onClose={() => setDlg(EMPTY_DLG)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            <Field label="Client Name" value={dlg.name}
              onChange={v => setDlg(d => ({ ...d, name: v }))}
              placeholder="e.g. Dato Sri Ong" />

            <Field label="Treatment / Service" value={dlg.treatment}
              onChange={v => setDlg(d => ({ ...d, treatment: v }))}
              placeholder="e.g. IV Drip, Blood Test" />

            {/* Date & Time row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={labelStyle}>Date</label>
                <CalendarPicker
                  value={dlg.date}
                  textValue={dlg.dateInput}
                  onDateSelect={(iso, disp) => setDlg(d => ({ ...d, date: iso, dateInput: disp }))}
                  onTextChange={raw => {
                    const iso = parseInputDate(raw)
                    setDlg(d => ({ ...d, dateInput: raw, date: iso ?? '' }))
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={labelStyle}>Time</label>
                <TimeWheel
                  value={dlg.time}
                  textValue={dlg.timeInput}
                  onTimeSelect={hhmm => setDlg(d => ({ ...d, time: hhmm }))}
                  onTextChange={raw => {
                    // Try to parse typed time
                    setDlg(d => ({ ...d, timeInput: raw }))
                    const match24 = raw.match(/^(\d{1,2}):(\d{2})$/)
                    const match12 = raw.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
                    if (match24) {
                      const hh = String(parseInt(match24[1])).padStart(2,'0')
                      const mm = match24[2]
                      setDlg(d => ({ ...d, time: `${hh}:${mm}` }))
                    } else if (match12) {
                      let h = parseInt(match12[1])
                      const mm = match12[2]
                      const ampm = match12[3].toUpperCase()
                      if (ampm === 'PM' && h !== 12) h += 12
                      if (ampm === 'AM' && h === 12) h = 0
                      setDlg(d => ({ ...d, time: `${String(h).padStart(2,'0')}:${mm}` }))
                    }
                  }}
                />
              </div>
            </div>

            {/* Companions — optional */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={labelStyle}>
                Additional Guests{' '}
                <span style={{ color: '#4A5070', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
              </label>
              <input
                value={dlg.companions}
                onChange={e => setDlg(d => ({ ...d, companions: e.target.value }))}
                placeholder="e.g. Mr. Lee and Ms. Tan"
                style={{
                  background: '#0D0D10', border: '1px solid #2A2A35', borderRadius: 8,
                  padding: '9px 12px', fontSize: 13, color: '#ECECF1',
                  outline: 'none', fontFamily: 'inherit', width: '100%',
                }}
              />
              <span style={{ fontSize: 11, color: '#4A5070' }}>
                Appears as "together with …" in the reminder message.
              </span>
            </div>

            {dlg.error && <p style={{ color: '#F87171', fontSize: 13 }}>{dlg.error}</p>}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 6 }}>
              <Btn variant="ghost"   onClick={() => setDlg(EMPTY_DLG)}>Cancel</Btn>
              <Btn variant="primary" onClick={saveDialog}>Save Appointment</Btn>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Delete Confirm ────────────────────────────────────────────────── */}
      {delId !== null && (
        <Modal title="Delete Appointment" onClose={() => setDelId(null)}>
          <p style={{ color: '#9A9AB0', fontSize: 14, marginBottom: 24 }}>This appointment will be permanently removed. This action cannot be undone.</p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <Btn variant="ghost"  onClick={() => setDelId(null)}>Cancel</Btn>
            <Btn variant="danger" onClick={() => deleteRow(delId)}>Delete</Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ── Shared styles ─────────────────────────────────────────────────────────────
const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: '#6B6B80',
  textTransform: 'uppercase', letterSpacing: '0.07em',
}

// ── Row ───────────────────────────────────────────────────────────────────────
function Row({ r, onEdit, onToggle, onDelete }: {
  r: Appointment; onEdit: () => void; onToggle: () => void; onDelete: () => void
}) {
  const [hovered, setHovered] = useState(false)
  const rowBg = hovered
    ? (r.confirmed ? 'rgba(34,197,94,0.1)'   : 'rgba(245,158,11,0.08)')
    : (r.confirmed ? 'rgba(34,197,94,0.04)'  : 'rgba(245,158,11,0.03)')

  return (
    <div
      onDoubleClick={onEdit}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'grid', gridTemplateColumns: '200px 100px 1fr 1fr 130px 110px',
        padding: '0 16px', borderBottom: '1px solid #1A1A22',
        background: rowBg, transition: 'background 0.1s', cursor: 'default',
      }}
    >
      <Cell mono>{fmtDate(r.appt_date)}</Cell>
      <Cell mono>{fmtTime(r.appt_time)}</Cell>
      <Cell bold>{r.client_name}</Cell>
      <Cell muted>{r.treatment || '—'}</Cell>
      <Cell><StatusBadge confirmed={!!r.confirmed} /></Cell>
      <Cell>
        <div style={{ display: 'flex', gap: 4, opacity: hovered ? 1 : 0, transition: 'opacity 0.15s' }}>
          <IconBtn color="#3B82F6" title="Edit"   onClick={e => { e.stopPropagation(); onEdit() }}>✏</IconBtn>
          <IconBtn color="#8B5CF6" title="Toggle" onClick={e => { e.stopPropagation(); onToggle() }}>✓</IconBtn>
          <IconBtn color="#EF4444" title="Delete" onClick={e => { e.stopPropagation(); onDelete() }}>🗑</IconBtn>
        </div>
      </Cell>
    </div>
  )
}

function Cell({ children, mono, bold, muted }: { children: React.ReactNode; mono?: boolean; bold?: boolean; muted?: boolean }) {
  return (
    <div style={{
      padding: '13px 8px', fontSize: 13, display: 'flex', alignItems: 'center',
      color: muted ? '#6B6B80' : '#ECECF1',
      fontWeight: bold ? 600 : 400,
      fontFamily: mono ? "'DM Mono', monospace" : 'inherit',
      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
    }}>
      {children}
    </div>
  )
}

function StatusBadge({ confirmed }: { confirmed: boolean }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700,
      background: confirmed ? 'rgba(34,197,94,0.12)' : 'rgba(245,158,11,0.12)',
      color: confirmed ? '#4ADE80' : '#FCD34D',
      border: `1px solid ${confirmed ? 'rgba(34,197,94,0.25)' : 'rgba(245,158,11,0.25)'}`,
    }}>
      {confirmed ? '✓ Confirmed' : '⏳ Pending'}
    </span>
  )
}

function IconBtn({ color, title, onClick, children }: {
  color: string; title: string; onClick: (e: React.MouseEvent) => void; children: React.ReactNode
}) {
  const [h, setH] = useState(false)
  return (
    <button title={title} onClick={onClick}
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{
        width: 28, height: 28, borderRadius: 6, border: 'none',
        background: h ? `${color}22` : 'transparent',
        color, cursor: 'pointer', fontSize: 12,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'background 0.1s', fontFamily: 'inherit',
      }}>
      {children}
    </button>
  )
}

// ── Modal / Field / Btn ───────────────────────────────────────────────────────
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#16161C', border: '1px solid #2A2A35', borderRadius: 16,
        width: '100%', maxWidth: 480, boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
        overflow: 'hidden',
      }}>
        <div style={{ background: '#111116', padding: '16px 20px', borderBottom: '1px solid #1E1E26', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#ECECF1' }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#6B6B80', fontSize: 20, cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: 20 }}>{children}</div>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={labelStyle}>{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{
          background: '#0D0D10', border: '1px solid #2A2A35', borderRadius: 8,
          padding: '9px 12px', fontSize: 13, color: '#ECECF1',
          outline: 'none', fontFamily: 'inherit',
        }}
      />
    </div>
  )
}

function Btn({ variant, onClick, children }: {
  variant: 'primary' | 'ghost' | 'danger'; onClick: () => void; children: React.ReactNode
}) {
  const styles = {
    primary: { background: '#22C55E', color: '#000', border: 'none' },
    ghost:   { background: 'transparent', color: '#9A9AB0', border: '1px solid #2A2A35' },
    danger:  { background: '#EF4444', color: '#fff', border: 'none' },
  }[variant]
  return (
    <button onClick={onClick} style={{
      ...styles, padding: '9px 18px', borderRadius: 8, fontSize: 13,
      fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
    }}>
      {children}
    </button>
  )
}
