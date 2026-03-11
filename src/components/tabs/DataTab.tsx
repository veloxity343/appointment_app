'use client'

import { useState, useEffect } from 'react'
import type { Appointment } from '@/types'

interface Stats { total: number; upcoming: number; past: number; confirmed: number }

export function DataTab() {
  const [stats,   setStats]   = useState<Stats | null>(null)
  const [confirm, setConfirm] = useState<'past' | 'all' | null>(null)
  const [toast,   setToast]   = useState<string | null>(null)

  useEffect(() => { fetchStats() }, [])

  async function fetchStats() {
    const rows = await fetch('/api/appointments').then(r => r.json()) as Appointment[]
    const today = new Date().toISOString().slice(0, 10)
    setStats({
      total:     rows.length,
      upcoming:  rows.filter(r => r.appt_date >= today).length,
      past:      rows.filter(r => r.appt_date <  today).length,
      confirmed: rows.filter(r => r.confirmed).length,
    })
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  async function clearScope(scope: 'past' | 'all') {
    const data = await fetch(`/api/clear?scope=${scope}`, { method: 'DELETE' }).then(r => r.json())
    setConfirm(null); fetchStats()
    showToast(`${data.count} appointment${data.count !== 1 ? 's' : ''} removed.`)
  }

  return (
    <div style={{ height: '100%', overflowY: 'auto', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '40px 28px' }}>
      <div style={{ width: '100%', maxWidth: 680, display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* ── Page heading ───────────────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 3, height: 28, borderRadius: 99, background: '#22C55E' }} />
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#ECECF1' }}>Data & Storage</h2>
            <p style={{ fontSize: 13, color: '#6B6B80', marginTop: 2 }}>Export records or clean up old appointments.</p>
          </div>
        </div>

        {/* ── Stats grid ─────────────────────────────────────────────────── */}
        <div style={{ background: '#111116', border: '1px solid #1E1E26', borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ padding: '12px 20px', borderBottom: '1px solid #1E1E26', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#22C55E', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Database Summary</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }}>
            {stats ? (
              <>
                <StatCell label="Total"     value={stats.total}     />
                <StatCell label="Upcoming"  value={stats.upcoming}  accent />
                <StatCell label="Past"      value={stats.past}      />
                <StatCell label="Confirmed" value={stats.confirmed} accent />
              </>
            ) : (
              <div style={{ gridColumn: '1/-1', padding: '32px', textAlign: 'center', color: '#6B6B80', fontSize: 13 }}>Loading…</div>
            )}
          </div>
        </div>

        {/* ── Actions ────────────────────────────────────────────────────── */}
        <div style={{ background: '#111116', border: '1px solid #1E1E26', borderRadius: 14, overflow: 'hidden' }}>
          <ActionRow
            icon="📥" label="Export All to CSV"
            desc="Download a complete CSV export of all appointments"
            btnLabel="Export" btnBg="#3B82F6" btnColor="#fff"
            onClick={() => window.location.href = '/api/export'}
          />
          <div style={{ height: 1, background: '#1E1E26' }} />
          <ActionRow
            icon="🗑" label="Clear Past Appointments"
            desc="Remove all appointments scheduled before today"
            btnLabel="Clear Past" btnBg="#F59E0B" btnColor="#000"
            onClick={() => setConfirm('past')}
          />
          <div style={{ height: 1, background: '#1E1E26' }} />
          <ActionRow
            icon="⚠️" label="Clear ALL Appointments"
            desc="Permanently delete every record — cannot be undone"
            btnLabel="Clear All" btnBg="#EF4444" btnColor="#fff"
            onClick={() => setConfirm('all')}
          />
        </div>

        {/* ── DB path ────────────────────────────────────────────────────── */}
        <div style={{ background: '#111116', border: '1px solid #1E1E26', borderRadius: 14, padding: '14px 20px' }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#6B6B80', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
            Database Path
          </p>
          <p style={{ fontSize: 12, color: '#22C55E', fontFamily: "'DM Mono', monospace", wordBreak: 'break-all' }}>
            ./data/appointments.db
          </p>
        </div>
      </div>

      {/* ── Confirm modal ──────────────────────────────────────────────────── */}
      {confirm && (
        <div onClick={() => setConfirm(null)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16,
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: '#16161C', border: '1px solid #2A2A35', borderRadius: 16,
            width: '100%', maxWidth: 400, overflow: 'hidden', boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
          }}>
            <div style={{ background: '#111116', padding: '16px 20px', borderBottom: '1px solid #1E1E26' }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#ECECF1' }}>
                {confirm === 'past' ? 'Clear Past Appointments' : '⚠️ Clear ALL Appointments'}
              </h3>
            </div>
            <div style={{ padding: 20 }}>
              <p style={{ color: '#9A9AB0', fontSize: 14, marginBottom: 24 }}>
                {confirm === 'past'
                  ? 'All appointments before today will be permanently deleted.'
                  : 'Every single appointment will be deleted. This cannot be undone.'}
              </p>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button onClick={() => setConfirm(null)} style={{ padding: '9px 18px', borderRadius: 8, fontSize: 13, fontWeight: 700, background: 'transparent', color: '#9A9AB0', border: '1px solid #2A2A35', cursor: 'pointer', fontFamily: 'inherit' }}>
                  Cancel
                </button>
                <button onClick={() => clearScope(confirm)} style={{ padding: '9px 18px', borderRadius: 8, fontSize: 13, fontWeight: 700, background: confirm === 'past' ? '#F59E0B' : '#EF4444', color: confirm === 'past' ? '#000' : '#fff', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ──────────────────────────────────────────────────────────── */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 28, right: 28, zIndex: 100,
          background: '#16161C', border: '1px solid #2A2A35', borderRadius: 12,
          padding: '12px 20px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ color: '#22C55E', fontSize: 16 }}>✓</span>
          <span style={{ color: '#ECECF1', fontSize: 13, fontWeight: 500 }}>{toast}</span>
        </div>
      )}
    </div>
  )
}

function StatCell({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div style={{ padding: '20px 24px', borderRight: '1px solid #1E1E26' }}>
      <p style={{ fontSize: 11, color: '#6B6B80', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700, marginBottom: 6 }}>{label}</p>
      <p style={{ fontSize: 32, fontWeight: 700, color: accent ? '#22C55E' : '#ECECF1', lineHeight: 1 }}>{value}</p>
    </div>
  )
}

function ActionRow({ icon, label, desc, btnLabel, btnBg, btnColor, onClick }: {
  icon: string; label: string; desc: string
  btnLabel: string; btnBg: string; btnColor: string; onClick: () => void
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ fontSize: 22, width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1A1A22', borderRadius: 10, border: '1px solid #2A2A35' }}>
          {icon}
        </div>
        <div>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#ECECF1' }}>{label}</p>
          <p style={{ fontSize: 12, color: '#6B6B80', marginTop: 2 }}>{desc}</p>
        </div>
      </div>
      <button onClick={onClick} style={{
        padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 700,
        background: btnBg, color: btnColor, border: 'none', cursor: 'pointer',
        fontFamily: 'inherit', whiteSpace: 'nowrap', flexShrink: 0,
      }}>
        {btnLabel}
      </button>
    </div>
  )
}
