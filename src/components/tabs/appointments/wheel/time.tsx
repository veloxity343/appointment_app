'use client'

// ─── TimeWheelPicker.tsx ──────────────────────────────────────────────────────

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { CyclicWheel } from './wheel'
import { smartParseTime } from '../parsers'
import { useAnchorPos } from './hooks'

const HOURS   = Array.from({ length: 24 }, (_, i) => i)
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]

interface Props {
  value:        string   // HH:MM 24-hr
  textValue:    string   // what the input shows
  onTimeSelect: (hhmm: string) => void
  onTextChange: (raw: string) => void
}

export function TimeWheelPicker({ value, textValue, onTimeSelect, onTextChange }: Props) {
  const [open, setOpen] = useState(false)
  const anchorRef       = useRef<HTMLDivElement>(null)
  const dropRef         = useRef<HTMLDivElement>(null)
  const pos             = useAnchorPos(open, anchorRef)

  const parse = (v: string) => {
    const [h, m] = v.split(':').map(Number)
    return { h: isNaN(h) ? 9 : h, m: isNaN(m) ? 0 : m }
  }
  const { h: initH, m: initM } = parse(value)
  const [selH, setSelH] = useState(initH)
  const [selM, setSelM] = useState(initM)

  useEffect(() => {
    const { h, m } = parse(value)
    setSelH(h); setSelM(m)
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

  function commit(h: number, m: number) {
    onTimeSelect(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    onTextChange(`${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`)
  }

  function handleText(raw: string) {
    onTextChange(raw)
    const p = smartParseTime(raw)
    if (p) {
      const snappedM = Math.round(p.m / 5) * 5 % 60
      setSelH(p.h); setSelM(snappedM)
      commit(p.h, snappedM)
    }
  }

  return (
    <div ref={anchorRef}>
      <div style={{ position: 'relative' }}>
        <input
          value={textValue}
          onChange={e => handleText(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="e.g. 9:30 AM or 1430"
          style={inputStyle}
        />
        <span onClick={() => setOpen(o => !o)} style={iconStyle}>🕐</span>
      </div>

      {open && createPortal(
        <div ref={dropRef} style={{
          position: 'fixed', zIndex: 9999,
          top:    pos.flipUp ? undefined : pos.top,
          bottom: pos.flipUp ? pos.bottom : undefined,
          left: pos.left, width: Math.max(pos.width, 230),
          background: '#16161C', border: '1px solid #2A2A35',
          borderRadius: 14, boxShadow: '0 20px 60px rgba(0,0,0,0.85)',
          padding: '14px 18px 18px',
        }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'stretch' }}>
            <CyclicWheel
              items={HOURS} selected={selH} fmt={v => String(v).padStart(2, '0')} label="Hour"
              onSelect={h => { setSelH(h); commit(h, selM) }}
            />
            <div style={{ width: 1, background: '#2A2A35', margin: '20px 0' }} />
            <CyclicWheel
              items={MINUTES} selected={selM} fmt={v => String(v).padStart(2, '0')} label="Min"
              onSelect={m => { setSelM(m); commit(selH, m) }}
            />
          </div>
          <div style={{
            textAlign: 'center', marginTop: 12, fontSize: 14, fontWeight: 700,
            color: '#22C55E', fontFamily: "'DM Mono', monospace",
          }}>
            {String(selH % 12 || 12).padStart(2, '0')}:{String(selM).padStart(2, '0')} {selH >= 12 ? 'PM' : 'AM'}
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
