'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { CyclicWheel } from './wheel'
import { smartParseTime, autoFormatTime } from '../parsers'
import { useAnchorPos } from './hooks'

const HOURS_12 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
const MINUTES  = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]
const AMPM     = [0, 1] // 0 = AM, 1 = PM

function h24to12(h24: number): { h12: number; ampm: 0 | 1 } {
  const ampm = h24 >= 12 ? 1 : 0
  const h12  = h24 % 12 === 0 ? 12 : h24 % 12
  return { h12, ampm }
}
function h12to24(h12: number, ampm: 0 | 1): number {
  if (ampm === 0) return h12 === 12 ? 0  : h12
  else            return h12 === 12 ? 12 : h12 + 12
}

interface Props {
  value:        string   // HH:MM 24-hr stored internally
  textValue:    string
  onTimeSelect: (hhmm: string) => void
  onTextChange: (raw: string) => void
}

export function TimeWheelPicker({ value, textValue, onTimeSelect, onTextChange }: Props) {
  const [open, setOpen] = useState(false)
  const anchorRef       = useRef<HTMLDivElement>(null)
  const dropRef         = useRef<HTMLDivElement>(null)
  const pos             = useAnchorPos(open, anchorRef)

  function parseValue(v: string) {
    const [hStr, mStr] = v.split(':')
    const h24 = isNaN(parseInt(hStr)) ? 9 : parseInt(hStr)
    const m   = isNaN(parseInt(mStr)) ? 0 : parseInt(mStr)
    return { ...h24to12(h24), m }
  }

  const init = parseValue(value)
  const [selH,    setSelH]    = useState(init.h12)
  const [selM,    setSelM]    = useState(init.m)
  const [selAmpm, setSelAmpm] = useState<0|1>(init.ampm)

  useEffect(() => {
    const { h12, ampm, m } = parseValue(value)
    setSelH(h12); setSelM(m); setSelAmpm(ampm)
  }, [value])

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

  function commit(h12: number, m: number, ampm: 0 | 1) {
    const h24 = h12to24(h12, ampm)
    onTimeSelect(`${String(h24).padStart(2,'0')}:${String(m).padStart(2,'0')}`)
    onTextChange(`${h12}:${String(m).padStart(2,'0')} ${ampm === 0 ? 'AM' : 'PM'}`)
  }

  function handleText(raw: string) {
    const formatted = autoFormatTime(raw)
    onTextChange(formatted)
    const p = smartParseTime(formatted)
    if (p) {
      const { h12, ampm } = h24to12(p.h)
      setSelH(h12); setSelM(p.m); setSelAmpm(ampm)
      commit(h12, p.m, ampm)
    }
  }

  return (
    <div ref={anchorRef}>
      <div style={{ position: 'relative' }}>
        <input
          value={textValue}
          onChange={e => handleText(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="h:mm AM/PM"
          maxLength={8}
          style={inputStyle}
        />
        <span onClick={() => setOpen(o => !o)} style={iconStyle}>🕐</span>
      </div>

      {open && createPortal(
        <div ref={dropRef} style={{
          position: 'fixed', zIndex: 9999,
          top: pos.top, bottom: pos.bottom, left: pos.left,
          width: Math.max(pos.width, 250),
          background: '#16161C', border: '1px solid #2A2A35',
          borderRadius: 14, boxShadow: '0 20px 60px rgba(0,0,0,0.85)',
          padding: '14px 18px 18px',
        }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'stretch' }}>
            {/* Hour */}
            <CyclicWheel
              items={HOURS_12}
              selected={selH}
              fmt={v => String(v)}
              label="Hour"
              onSelect={h => { setSelH(h); commit(h, selM, selAmpm) }}
            />
            <div style={{ width: 1, background: '#2A2A35', margin: '20px 0' }} />
            {/* Minute */}
            <CyclicWheel
              items={MINUTES}
              selected={selM}
              fmt={v => String(v).padStart(2, '0')}
              label="Min"
              onSelect={m => { setSelM(m); commit(selH, m, selAmpm) }}
            />
            <div style={{ width: 1, background: '#2A2A35', margin: '20px 0' }} />
            {/* AM / PM */}
            <CyclicWheel
              items={AMPM}
              selected={selAmpm}
              fmt={v => v === 0 ? 'AM' : 'PM'}
              label="AM/PM"
              onSelect={ap => { setSelAmpm(ap as 0|1); commit(selH, selM, ap as 0|1) }}
            />
          </div>
          <div style={{
            textAlign: 'center', marginTop: 12, fontSize: 14, fontWeight: 700,
            color: '#22C55E', fontFamily: "'DM Mono', monospace",
          }}>
            {selH}:{String(selM).padStart(2,'0')} {selAmpm === 0 ? 'AM' : 'PM'}
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
