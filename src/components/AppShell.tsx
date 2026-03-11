'use client'

import { useState, useCallback } from 'react'
import { setCookie } from 'cookies-next'
import { AppointmentsTab } from './tabs/AppointmentsTab'
import { RemindersTab }    from './tabs/RemindersTab'
import { DataTab }         from './tabs/DataTab'
import type { TabId, WeekFilter } from '@/types'

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'appointments', label: 'Appointments', icon: '📋' },
  { id: 'reminders',   label: 'Reminders',    icon: '💬' },
  { id: 'data',        label: 'Data & Storage', icon: '🗄️' },
]

interface Props {
  initialTab:        TabId
  initialWeekFilter: WeekFilter
}

export function AppShell({ initialTab, initialWeekFilter }: Props) {
  const [activeTab,  setActiveTab]  = useState<TabId>(initialTab)
  const [weekFilter, setWeekFilter] = useState<WeekFilter>(initialWeekFilter)

  const handleTabChange = useCallback((tab: TabId) => {
    setActiveTab(tab)
    setCookie('activeTab', tab, { maxAge: 60 * 60 * 24 * 365 })
  }, [])

  const handleWeekFilterChange = useCallback((f: WeekFilter) => {
    setWeekFilter(f)
    setCookie('weekFilter', f, { maxAge: 60 * 60 * 24 * 365 })
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header style={{
        background: 'linear-gradient(180deg, #111116 0%, #0D0D10 100%)',
        borderBottom: '1px solid #1E1E26',
        flexShrink: 0,
      }}>
        {/* Green top stripe */}
        <div style={{ height: 3, background: 'linear-gradient(90deg, #22C55E, #16A34A)' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: 'rgba(34,197,94,0.12)',
              border: '1px solid rgba(34,197,94,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20,
            }}>📅</div>
            <div>
              <h1 style={{ fontSize: 18, fontWeight: 700, color: '#ECECF1', letterSpacing: '-0.3px' }}>
                Appointment Reminder
              </h1>
              <p style={{ fontSize: 12, color: '#6B6B80', marginTop: 1 }}>Cell Genesis Sdn. Bhd.</p>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#22C55E', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Cell Genesis
            </p>
            <p style={{ fontSize: 11, color: '#6B6B80', marginTop: 2 }}>Appointment Management System</p>
          </div>
        </div>
      </header>

      {/* ── Tab Bar ────────────────────────────────────────────────────────── */}
      <nav style={{
        background: '#111116',
        borderBottom: '1px solid #1E1E26',
        display: 'flex',
        padding: '0 28px',
        gap: 4,
        flexShrink: 0,
      }}>
        {TABS.map(tab => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '12px 18px',
                fontSize: 13, fontWeight: 600,
                color: isActive ? '#22C55E' : '#6B6B80',
                background: isActive ? 'rgba(34,197,94,0.07)' : 'transparent',
                border: 'none',
                borderBottom: isActive ? '2px solid #22C55E' : '2px solid transparent',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                marginBottom: -1,
                fontFamily: 'inherit',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.color = '#ECECF1' }}
              onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.color = '#6B6B80' }}
            >
              <span style={{ fontSize: 15 }}>{tab.icon}</span>
              {tab.label}
            </button>
          )
        })}
      </nav>

      {/* ── Content ────────────────────────────────────────────────────────── */}
      <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {activeTab === 'appointments' && (
          <AppointmentsTab weekFilter={weekFilter} onWeekFilterChange={handleWeekFilterChange} />
        )}
        {activeTab === 'reminders' && <RemindersTab />}
        {activeTab === 'data'      && <DataTab />}
      </main>
    </div>
  )
}
