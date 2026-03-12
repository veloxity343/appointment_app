'use client'

// ─── AppointmentsTable.tsx ────────────────────────────────────────────────────

import { useState } from 'react'
import { fmtDate, fmtTime } from '@/lib/utils'
import type { Appointment } from '@/types'

interface Props {
  rows:     Appointment[]
  loading:  boolean
  onEdit:   (r: Appointment) => void
  onToggle: (id: number) => void
  onDelete: (id: number) => void
}

export function AppointmentsTable({ rows, loading, onEdit, onToggle, onDelete }: Props) {
  return (
    <div style={{
      flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column',
      background: '#111116', border: '1px solid #1E1E26', borderRadius: '12px 12px 0 0',
    }}>
      {/* Header */}
      <div style={{
        display: 'grid', gridTemplateColumns: '200px 100px 1fr 1fr 130px 110px',
        background: '#0D0D10', borderBottom: '1px solid #1E1E26',
        padding: '0 16px', flexShrink: 0,
      }}>
        {['Date','Time','Client Name','Treatment','Status','Actions'].map(h => (
          <div key={h} style={{
            padding: '11px 8px', fontSize: 11, fontWeight: 700,
            color: '#22C55E', textTransform: 'uppercase', letterSpacing: '0.07em',
          }}>{h}</div>
        ))}
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: 60, color: '#6B6B80' }}>Loading…</div>
        )}
        {!loading && rows.length === 0 && (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📭</div>
            <p style={{ color: '#6B6B80', fontWeight: 500 }}>No appointments found.</p>
          </div>
        )}
        {!loading && rows.map(r => (
          <TableRow
            key={r.id} r={r}
            onEdit={()   => onEdit(r)}
            onToggle={()  => onToggle(r.id)}
            onDelete={()  => onDelete(r.id)}
          />
        ))}
      </div>

      {/* Footer */}
      <div style={{
        borderTop: '1px solid #1E1E26', padding: '8px 24px',
        display: 'flex', justifyContent: 'space-between', flexShrink: 0,
      }}>
        <span style={{ fontSize: 11, color: '#6B6B80' }}>
          {rows.length} appointment{rows.length !== 1 ? 's' : ''}
        </span>
        <span style={{ fontSize: 11, color: '#6B6B80' }}>Double-click a row to edit</span>
      </div>
    </div>
  )
}

// ─── TableRow ─────────────────────────────────────────────────────────────────
function TableRow({ r, onEdit, onToggle, onDelete }: {
  r: Appointment; onEdit: () => void; onToggle: () => void; onDelete: () => void
}) {
  const [hov, setHov] = useState(false)
  const bg = hov
    ? (r.confirmed ? 'rgba(34,197,94,0.1)'  : 'rgba(245,158,11,0.08)')
    : (r.confirmed ? 'rgba(34,197,94,0.04)' : 'rgba(245,158,11,0.03)')

  return (
    <div
      onDoubleClick={onEdit}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'grid', gridTemplateColumns: '200px 100px 1fr 1fr 130px 110px',
        padding: '0 16px', borderBottom: '1px solid #1A1A22',
        background: bg, transition: 'background 0.1s', cursor: 'default',
      }}
    >
      <Cell mono>{fmtDate(r.appt_date)}</Cell>
      <Cell mono>{fmtTime(r.appt_time)}</Cell>
      <Cell bold>{r.client_name}</Cell>
      <Cell muted>{r.treatment || '—'}</Cell>
      <Cell><StatusBadge confirmed={!!r.confirmed} /></Cell>
      <Cell>
        <div style={{ display: 'flex', gap: 4, opacity: hov ? 1 : 0, transition: 'opacity 0.15s' }}>
          <IBtn color="#3B82F6" title="Edit"   onClick={e => { e.stopPropagation(); onEdit() }}>✏</IBtn>
          <IBtn color="#8B5CF6" title="Toggle" onClick={e => { e.stopPropagation(); onToggle() }}>✓</IBtn>
          <IBtn color="#EF4444" title="Delete" onClick={e => { e.stopPropagation(); onDelete() }}>🗑</IBtn>
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
      color:      confirmed ? '#4ADE80' : '#FCD34D',
      border: `1px solid ${confirmed ? 'rgba(34,197,94,0.25)' : 'rgba(245,158,11,0.25)'}`,
    }}>
      {confirmed ? '✓ Confirmed' : '⏳ Pending'}
    </span>
  )
}

function IBtn({ color, title, onClick, children }: {
  color: string; title: string
  onClick: (e: React.MouseEvent) => void
  children: React.ReactNode
}) {
  const [h, setH] = useState(false)
  return (
    <button
      title={title} onClick={onClick}
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{
        width: 28, height: 28, borderRadius: 6, border: 'none',
        background: h ? `${color}22` : 'transparent',
        color, cursor: 'pointer', fontSize: 12,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'background 0.1s', fontFamily: 'inherit',
      }}
    >
      {children}
    </button>
  )
}
