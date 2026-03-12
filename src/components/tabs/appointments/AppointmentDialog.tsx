'use client'

// ─── AppointmentDialog.tsx ────────────────────────────────────────────────────

import { CalendarPicker }   from './CalendarPicker'
import { TimeWheelPicker }  from './TimeWheelPicker'
import { smartParseDate }   from './parsers'
import type { DialogState } from './types'

interface Props {
  dlg:     DialogState
  setDlg:  React.Dispatch<React.SetStateAction<DialogState>>
  onSave:  () => void
  onClose: () => void
}

export function AppointmentDialog({ dlg, setDlg, onSave, onClose }: Props) {
  return (
    <Modal
      title={dlg.mode === 'add' ? '+ New Appointment' : 'Edit Appointment'}
      onClose={onClose}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

        <Field
          label="Client Name" required
          value={dlg.name}
          onChange={v => setDlg(d => ({ ...d, name: v }))}
          placeholder="e.g. Dato Sri Ong"
        />

        {/* Date & Time */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={labelStyle}>Date <Req /></label>
            <CalendarPicker
              value={dlg.date} textValue={dlg.dateInput}
              onDateSelect={(iso, disp) => setDlg(d => ({ ...d, date: iso, dateInput: disp }))}
              onTextChange={raw => setDlg(d => ({ ...d, dateInput: raw, date: smartParseDate(raw) ?? '' }))}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={labelStyle}>Time <Req /></label>
            <TimeWheelPicker
              value={dlg.time} textValue={dlg.timeInput}
              onTimeSelect={hhmm => setDlg(d => ({ ...d, time: hhmm }))}
              onTextChange={raw  => setDlg(d => ({ ...d, timeInput: raw }))}
            />
          </div>
        </div>

        {/* Treatment — optional */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={labelStyle}>Treatment / Service <Opt /></label>
          <input
            value={dlg.treatment}
            onChange={e => setDlg(d => ({ ...d, treatment: e.target.value }))}
            placeholder="e.g. IV Drip, Blood Panel"
            style={inputStyle}
          />
          <Hint>Adds "for your … session" to the reminder when filled.</Hint>
        </div>

        {/* Companions — optional */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={labelStyle}>Additional Guests <Opt /></label>
          <input
            value={dlg.companions}
            onChange={e => setDlg(d => ({ ...d, companions: e.target.value }))}
            placeholder="e.g. Mr. Lee and Ms. Tan"
            style={inputStyle}
          />
          <Hint>Adds "together with …" to the reminder when filled.</Hint>
        </div>

        {dlg.error && <p style={{ color: '#F87171', fontSize: 13 }}>{dlg.error}</p>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 6 }}>
          <Btn variant="ghost"   onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" onClick={onSave}>Save Appointment</Btn>
        </div>
      </div>
    </Modal>
  )
}

// ─── Shared UI atoms ──────────────────────────────────────────────────────────
export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
        justifyContent: 'center', zIndex: 50, padding: 16,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#16161C', border: '1px solid #2A2A35', borderRadius: 16,
          width: '100%', maxWidth: 480, boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
          overflow: 'hidden',
        }}
      >
        <div style={{
          background: '#111116', padding: '16px 20px', borderBottom: '1px solid #1E1E26',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#ECECF1' }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#6B6B80', fontSize: 20, cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: 20 }}>{children}</div>
      </div>
    </div>
  )
}

export function Btn({ variant, onClick, children }: { variant: 'primary' | 'ghost' | 'danger'; onClick: () => void; children: React.ReactNode }) {
  const s = {
    primary: { background: '#22C55E', color: '#000',    border: 'none' },
    ghost:   { background: 'transparent', color: '#9A9AB0', border: '1px solid #2A2A35' },
    danger:  { background: '#EF4444', color: '#fff',    border: 'none' },
  }[variant]
  return (
    <button onClick={onClick} style={{ ...s, padding: '9px 18px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
      {children}
    </button>
  )
}

function Field({ label, value, onChange, placeholder, required }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; required?: boolean
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={labelStyle}>{label}{required && <Req />}</label>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={inputStyle} />
    </div>
  )
}

const Req  = () => <span style={{ color: '#EF4444', marginLeft: 2 }}>*</span>
const Opt  = () => <span style={{ color: '#4A5070', fontWeight: 400, textTransform: 'none', letterSpacing: 0, marginLeft: 4 }}>(optional)</span>
const Hint = ({ children }: { children: React.ReactNode }) => <span style={{ fontSize: 11, color: '#4A5070' }}>{children}</span>

const inputStyle: React.CSSProperties = {
  background: '#0D0D10', border: '1px solid #2A2A35', borderRadius: 8,
  padding: '9px 12px', fontSize: 13, color: '#ECECF1', outline: 'none', fontFamily: 'inherit',
}
const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: '#6B6B80', textTransform: 'uppercase', letterSpacing: '0.07em',
}
