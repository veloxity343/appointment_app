'use client'

// ─── AppointmentsTab.tsx ──────────────────────────────────────────────────────
// Orchestrates data fetching and state; delegates all rendering to sub-components.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react'
import { applyWeekFilter } from '@/lib/utils'
import type { Appointment, WeekFilter } from '@/types'

import { AppointmentsTable }  from './table'
import { AppointmentDialog }  from './dialog'
import { Modal, Btn }         from './dialog'
import { smartParseDate }     from './parsers'
import { EMPTY_DIALOG }       from './types'
import type { DialogState }   from './types'

const WEEK_FILTERS: WeekFilter[] = ['All', 'This Week', 'Next Week', 'Past']

interface Props {
  weekFilter:         WeekFilter
  onWeekFilterChange: (f: WeekFilter) => void
}

export function AppointmentsTab({ weekFilter, onWeekFilterChange }: Props) {
  const [rows,    setRows]    = useState<Appointment[]>([])
  const [search,  setSearch]  = useState('')
  const [loading, setLoading] = useState(true)
  const [dlg,     setDlg]     = useState<DialogState>(EMPTY_DIALOG)
  const [delId,   setDelId]   = useState<number | null>(null)

  // ── Data fetching ──────────────────────────────────────────────────────────
  const fetchRows = useCallback(async () => {
    setLoading(true)
    const url = search
      ? `/api/appointments?search=${encodeURIComponent(search)}`
      : '/api/appointments'
    setRows(await fetch(url).then(r => r.json()))
    setLoading(false)
  }, [search])

  useEffect(() => { fetchRows() }, [fetchRows])

  const visible = applyWeekFilter(rows, weekFilter)

  // ── Actions ────────────────────────────────────────────────────────────────
  async function toggleConfirmed(id: number) {
    await fetch(`/api/appointments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ toggle_confirmed: true }),
    })
    fetchRows()
  }

  async function deleteRow(id: number) {
    await fetch(`/api/appointments/${id}`, { method: 'DELETE' })
    setDelId(null)
    fetchRows()
  }

  async function saveDialog() {
    const name = dlg.name.trim()
    const date = dlg.date || smartParseDate(dlg.dateInput.trim())
    const time = dlg.time.trim()

    if (!name || !date || !time) {
      setDlg(d => ({ ...d, error: 'Name, date and time are required.' }))
      return
    }
    if (!/^\d{2}:\d{2}$/.test(time)) {
      setDlg(d => ({ ...d, error: 'Time must be HH:MM.' }))
      return
    }

    const body = {
      client_name: name,
      treatment:   dlg.treatment.trim() || null,
      appt_date:   date,
      appt_time:   time,
      companions:  dlg.companions.trim() || null,
    }
    await fetch(
      dlg.mode === 'add' ? '/api/appointments' : `/api/appointments/${dlg.id}`,
      { method: dlg.mode === 'add' ? 'POST' : 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
    )
    setDlg(EMPTY_DIALOG)
    fetchRows()
  }

  function openEdit(r: Appointment) {
    const [y, m, d]     = r.appt_date.split('-')
    const [hStr, mStr]  = r.appt_time.split(':')
    const h             = parseInt(hStr, 10)
    setDlg({
      open: true, mode: 'edit', id: r.id,
      name:       r.client_name,
      treatment:  r.treatment ?? '',
      date:       r.appt_date,
      dateInput:  `${d}/${m}/${y}`,
      time:       r.appt_time,
      timeInput:  `${h % 12 || 12}:${mStr} ${h >= 12 ? 'PM' : 'AM'}`,
      companions: r.companions ?? '',
      error: '',
    })
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '20px 28px 0', gap: 14 }}>

      {/* Toolbar */}
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
              color:      weekFilter === f ? '#000' : '#6B6B80',
              border: 'none', cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit',
            }}>{f}</button>
          ))}
        </div>

        <span style={{ fontSize: 12, color: '#6B6B80', background: '#16161C', border: '1px solid #2A2A35', borderRadius: 99, padding: '4px 10px' }}>
          {visible.length} shown
        </span>

        <button
          onClick={() => setDlg({ ...EMPTY_DIALOG, open: true, mode: 'add' })}
          style={{
            marginLeft: 'auto', background: '#22C55E', color: '#000', fontWeight: 700,
            border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13,
            cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> New Appointment
        </button>
      </div>

      {/* Table */}
      <AppointmentsTable
        rows={visible} loading={loading}
        onEdit={openEdit}
        onToggle={toggleConfirmed}
        onDelete={id => setDelId(id)}
      />

      {/* Add / Edit dialog */}
      {dlg.open && (
        <AppointmentDialog
          dlg={dlg} setDlg={setDlg}
          onSave={saveDialog}
          onClose={() => setDlg(EMPTY_DIALOG)}
        />
      )}

      {/* Delete confirm */}
      {delId !== null && (
        <Modal title="Delete Appointment" onClose={() => setDelId(null)}>
          <p style={{ color: '#9A9AB0', fontSize: 14, marginBottom: 24 }}>
            This will be permanently removed and cannot be undone.
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <Btn variant="ghost"  onClick={() => setDelId(null)}>Cancel</Btn>
            <Btn variant="danger" onClick={() => deleteRow(delId)}>Delete</Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}
