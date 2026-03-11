'use client'

import { useState, useEffect, useCallback } from 'react'
import { applyWeekFilter, fmtDate, fmtTime, parseInputDate } from '@/lib/utils'
import type { Appointment, WeekFilter } from '@/types'

const WEEK_FILTERS: WeekFilter[] = ['All', 'This Week', 'Next Week', 'Past']

interface DialogState {
  open: boolean; mode: 'add' | 'edit'; id?: number
  name: string; treatment: string; date: string; time: string; error: string
}
const EMPTY_DLG: DialogState = { open: false, mode: 'add', name: '', treatment: '', date: '', time: '', error: '' }

interface Props {
  weekFilter: WeekFilter
  onWeekFilterChange: (f: WeekFilter) => void
}

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
    const date = parseInputDate(dlg.date.trim())
    const time = dlg.time.trim()
    if (!name || !date || !time) { setDlg(d => ({ ...d, error: 'Name, date and time are required.' })); return }
    if (!/^\d{2}:\d{2}$/.test(time)) { setDlg(d => ({ ...d, error: 'Time must be HH:MM (24-hr).' })); return }
    const body = { client_name: name, treatment: dlg.treatment.trim() || null, appt_date: date, appt_time: time }
    if (dlg.mode === 'add') {
      await fetch('/api/appointments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    } else {
      await fetch(`/api/appointments/${dlg.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    }
    setDlg(EMPTY_DLG); fetchRows()
  }

  function openEdit(r: Appointment) {
    const [y, m, d] = r.appt_date.split('-')
    setDlg({ open: true, mode: 'edit', id: r.id, name: r.client_name, treatment: r.treatment ?? '', date: `${d}/${m}/${y}`, time: r.appt_time, error: '' })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '20px 28px 0', gap: 14 }}>

      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', flexShrink: 0 }}>
        {/* Search */}
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

        {/* Week filter */}
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

        {/* Count badge */}
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
        {/* Table head */}
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

        {/* Table body */}
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

        {/* Footer */}
        <div style={{ borderTop: '1px solid #1E1E26', padding: '8px 24px', display: 'flex', justifyContent: 'space-between', flexShrink: 0 }}>
          <span style={{ fontSize: 11, color: '#6B6B80' }}>{visible.length} appointment{visible.length !== 1 ? 's' : ''}</span>
          <span style={{ fontSize: 11, color: '#6B6B80' }}>Double-click a row to edit</span>
        </div>
      </div>

      {/* ── Add/Edit Dialog ───────────────────────────────────────────────── */}
      {dlg.open && (
        <Modal title={dlg.mode === 'add' ? '+ New Appointment' : 'Edit Appointment'} onClose={() => setDlg(EMPTY_DLG)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Field label="Client Name"         value={dlg.name}      onChange={v => setDlg(d => ({ ...d, name: v }))}      placeholder="e.g. Siti Aminah" />
            <Field label="Treatment / Service" value={dlg.treatment} onChange={v => setDlg(d => ({ ...d, treatment: v }))} placeholder="e.g. IV Drip, Blood Test" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Date (DD/MM/YYYY)"    value={dlg.date} onChange={v => setDlg(d => ({ ...d, date: v }))} placeholder="05/03/2025" />
              <Field label="Time (HH:MM, 24-hr)"  value={dlg.time} onChange={v => setDlg(d => ({ ...d, time: v }))} placeholder="09:30" />
            </div>
            {dlg.error && <p style={{ color: '#F87171', fontSize: 13 }}>{dlg.error}</p>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 6 }}>
              <Btn variant="ghost" onClick={() => setDlg(EMPTY_DLG)}>Cancel</Btn>
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
            <Btn variant="ghost" onClick={() => setDelId(null)}>Cancel</Btn>
            <Btn variant="danger" onClick={() => deleteRow(delId)}>Delete</Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ── Row ───────────────────────────────────────────────────────────────────────
function Row({ r, onEdit, onToggle, onDelete }: { r: Appointment; onEdit: () => void; onToggle: () => void; onDelete: () => void }) {
  const [hovered, setHovered] = useState(false)
  const rowBg = hovered
    ? (r.confirmed ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.08)')
    : (r.confirmed ? 'rgba(34,197,94,0.04)' : 'rgba(245,158,11,0.03)')

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
      <Cell>
        <StatusBadge confirmed={!!r.confirmed} />
      </Cell>
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

function IconBtn({ color, title, onClick, children }: { color: string; title: string; onClick: (e: React.MouseEvent) => void; children: React.ReactNode }) {
  const [h, setH] = useState(false)
  return (
    <button title={title} onClick={onClick}
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{
        width: 28, height: 28, borderRadius: 6, border: 'none',
        background: h ? `${color}22` : 'transparent',
        color, cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'background 0.1s', fontFamily: 'inherit',
      }}>
      {children}
    </button>
  )
}

// ── Shared UI ─────────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#16161C', border: '1px solid #2A2A35', borderRadius: 16,
        width: '100%', maxWidth: 460, boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
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

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: '#6B6B80', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</label>
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

function Btn({ variant, onClick, children }: { variant: 'primary' | 'ghost' | 'danger'; onClick: () => void; children: React.ReactNode }) {
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
