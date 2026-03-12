'use client'

import { useState, useEffect } from 'react'
import { EXECUTION_MAP } from '@/types'
import { buildReminder, dayOfWeek, fmtDate, fmtTime } from '@/lib/utils'
import type { Appointment, RunDay } from '@/types'

export function RemindersTab() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [runDay,       setRunDay]       = useState<RunDay>('Monday')
  const [copied,       setCopied]       = useState<number | null>(null)
  const [loading,      setLoading]      = useState(true)

  useEffect(() => {
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' })
    if (today === 'Monday' || today === 'Thursday') setRunDay(today as RunDay)
    fetch('/api/appointments')
      .then(r => r.json())
      .then(data => { setAppointments(data); setLoading(false) })
  }, [])

  const targets  = EXECUTION_MAP[runDay]
  const matching = appointments.filter(a => targets.includes(dayOfWeek(a.appt_date)))

  function copyMessage(id: number, text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(id)
      setTimeout(() => setCopied(null), 2000)
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '20px 28px 0' }}>

      {/* ── Controls ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16, flexShrink: 0, flexWrap: 'wrap' }}>
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#6B6B80', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
            Sending reminders on
          </p>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['Monday', 'Thursday'] as RunDay[]).map(day => (
              <button key={day} onClick={() => setRunDay(day)} style={{
                padding: '7px 18px', borderRadius: 8, fontSize: 13, fontWeight: 700,
                background: runDay === day ? '#22C55E' : '#16161C',
                color: runDay === day ? '#000' : '#6B6B80',
                border: `1px solid ${runDay === day ? '#22C55E' : '#2A2A35'}`,
                cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
              }}>
                {day}
              </button>
            ))}
          </div>
        </div>

        <div style={{
          marginLeft: 'auto', background: '#16161C', border: '1px solid #2A2A35',
          borderRadius: 10, padding: '10px 18px', display: 'flex', gap: 20,
        }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 11, color: '#6B6B80', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Covering</p>
            <p style={{ fontSize: 13, color: '#ECECF1', fontWeight: 600, marginTop: 2 }}>{targets.join(', ')}</p>
          </div>
          <div style={{ width: 1, background: '#2A2A35' }} />
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 11, color: '#6B6B80', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Reminders</p>
            <p style={{ fontSize: 22, color: '#22C55E', fontWeight: 700, lineHeight: 1.2 }}>{matching.length}</p>
          </div>
        </div>
      </div>

      <div style={{ height: 1, background: '#1E1E26', marginBottom: 16, flexShrink: 0 }} />

      {/* ── Cards ────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 24 }}>
        {loading && <div style={{ textAlign: 'center', padding: 60, color: '#6B6B80' }}>Loading…</div>}
        {!loading && matching.length === 0 && (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <div style={{ fontSize: 44, marginBottom: 16 }}>📭</div>
            <p style={{ color: '#ECECF1', fontWeight: 600, fontSize: 15 }}>No reminders for these days.</p>
            <p style={{ color: '#6B6B80', fontSize: 13, marginTop: 6 }}>
              Add appointments on {targets.join(', ')} to see them here.
            </p>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(440px, 1fr))', gap: 14 }}>
          {matching.map(r => {
            const msg = buildReminder(r.client_name, r.treatment, r.appt_date, r.appt_time, r.companions)
            const isCopied = copied === r.id
            return (
              <div key={r.id} style={{
                background: '#111116', border: '1px solid #1E1E26', borderRadius: 14,
                overflow: 'hidden', display: 'flex',
              }}>
                {/* Accent stripe */}
                <div style={{ width: 4, flexShrink: 0, background: r.confirmed ? '#22C55E' : '#F59E0B' }} />

                <div style={{ flex: 1, padding: '16px 18px' }}>
                  {/* Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                    <div>
                      <h3 style={{ fontSize: 15, fontWeight: 700, color: '#ECECF1' }}>{r.client_name}</h3>
                      {r.treatment && <p style={{ fontSize: 12, color: '#6B6B80', marginTop: 2 }}>{r.treatment}</p>}
                    </div>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99,
                      background: r.confirmed ? 'rgba(34,197,94,0.12)' : 'rgba(245,158,11,0.12)',
                      color: r.confirmed ? '#4ADE80' : '#FCD34D',
                      border: `1px solid ${r.confirmed ? 'rgba(34,197,94,0.25)' : 'rgba(245,158,11,0.25)'}`,
                      whiteSpace: 'nowrap', marginLeft: 8,
                    }}>
                      {r.confirmed ? '✓ Confirmed' : '⏳ Pending'}
                    </span>
                  </div>

                  <p style={{ fontSize: 12, color: '#6B6B80', marginBottom: 14 }}>
                    {fmtDate(r.appt_date)} · {fmtTime(r.appt_time)}
                  </p>

                  <div style={{ height: 1, background: '#1E1E26', marginBottom: 14 }} />

                  {/* Message bubble */}
                  <div style={{
                    background: '#09160F', border: '1px solid #163A23',
                    borderRadius: 10, padding: '12px 14px', marginBottom: 14,
                  }}>
                    <p style={{
                      fontSize: 12.5, color: '#86EFAC', lineHeight: 1.65,
                      whiteSpace: 'pre-line', fontFamily: "'DM Mono', monospace",
                    }}>
                      {msg}
                    </p>
                  </div>

                  {/* Copy button */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button onClick={() => copyMessage(r.id, msg)} style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '7px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                      background: isCopied ? 'rgba(34,197,94,0.15)' : '#22C55E',
                      color: isCopied ? '#4ADE80' : '#000',
                      border: isCopied ? '1px solid rgba(34,197,94,0.4)' : 'none',
                      cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'inherit',
                    }}>
                      {isCopied ? '✓ Copied!' : '📋 Copy Message'}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
