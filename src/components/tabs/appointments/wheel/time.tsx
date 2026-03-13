'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { CyclicWheel, BoundedWheel } from './wheel'
import {
  TimeSlots, emptyTimeSlots, timeSlotsToDisplay, getTimePhase,
  pushTimeInput, popTimeInput, timeSlotsToH24,
} from '../parsers'
import { useAnchorPos } from './hooks'

const HOURS_12   = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
const MINUTES    = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]
const AMPM_ITEMS = ['AM', 'PM']

function h24to12(h24: number): { h12: number; ampm: 'AM' | 'PM' } {
  return {
    h12:  h24 % 12 === 0 ? 12 : h24 % 12,
    ampm: h24 >= 12 ? 'PM' : 'AM',
  }
}

// Parse stored "HH:MM" to TimeSlots
function hhmmToSlots(value: string): TimeSlots {
  if (!value) return emptyTimeSlots()
  const [hStr, mStr] = value.split(':')
  const h24 = parseInt(hStr)
  const m   = parseInt(mStr)
  if (isNaN(h24) || isNaN(m)) return emptyTimeSlots()
  const { h12, ampm } = h24to12(h24)
  const mStr2 = String(m).padStart(2, '0')
  return {
    h:    String(h12),
    m0:   mStr2[0],
    m1:   mStr2[1],
    ampm,
  }
}

// Wheel values derived from slots (best-effort)
function slotsToWheelValues(ts: TimeSlots): { h12: number; m: number; ampm: 'AM' | 'PM' } {
  const h12  = ts.h    ? parseInt(ts.h)              : 12
  const m0   = ts.m0   ?? '0'
  const m1   = ts.m1   ?? '0'
  const m    = parseInt(m0 + m1)
  const ampm = ts.ampm ?? 'AM'
  // Snap minute to nearest 5
  const snapped = Math.round(m / 5) * 5 % 60
  return { h12: isNaN(h12) ? 12 : h12, m: isNaN(snapped) ? 0 : snapped, ampm }
}

interface Props {
  value:        string
  textValue:    string
  onTimeSelect: (hhmm: string) => void
  onTextChange: (raw: string) => void
}

export function TimeWheelPicker({ value, textValue, onTimeSelect, onTextChange }: Props) {
  const [open, setOpen]   = useState(false)
  const [slots, setSlots] = useState<TimeSlots>(() => hhmmToSlots(value))
  const anchorRef         = useRef<HTMLDivElement>(null)
  const dropRef           = useRef<HTMLDivElement>(null)
  const inputRef          = useRef<HTMLInputElement>(null)
  const pos               = useAnchorPos(open, anchorRef)

  // Wheel display state — driven by slots
  const wv = slotsToWheelValues(slots)
  const [wheelH,    setWheelH]    = useState(wv.h12)
  const [wheelM,    setWheelM]    = useState(wv.m)
  const [wheelAmpm, setWheelAmpm] = useState<'AM' | 'PM'>(wv.ampm)

  // Sync slots when value prop changes externally
  useEffect(() => {
    if (value) {
      const s = hhmmToSlots(value)
      setSlots(s)
      const w = slotsToWheelValues(s)
      setWheelH(w.h12); setWheelM(w.m); setWheelAmpm(w.ampm)
    }
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

  const commitSlots = useCallback((s: TimeSlots) => {
    const display = timeSlotsToDisplay(s)
    onTextChange(display)
    // Update wheel positions from slots
    const w = slotsToWheelValues(s)
    setWheelH(w.h12); setWheelM(w.m); setWheelAmpm(w.ampm)
    // Emit time value if complete
    const t = timeSlotsToH24(s)
    if (t) {
      onTimeSelect(`${String(t.h24).padStart(2,'0')}:${String(t.m).padStart(2,'0')}`)
    }
  }, [onTextChange, onTimeSelect])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    e.preventDefault()

    if (e.key === 'Backspace' || e.key === 'Delete') {
      const next = popTimeInput(slots)
      setSlots(next)
      commitSlots(next)
      return
    }

    const ch = e.key
    if (/^\d$/.test(ch) || ch === 'a' || ch === 'A' || ch === 'p' || ch === 'P') {
      const next = pushTimeInput(slots, ch)
      setSlots(next)
      commitSlots(next)
    }
  }, [slots, commitSlots])

  // Wheel callbacks — wheel directly sets the stored value
  const onWheelH = useCallback((h: number) => {
    setWheelH(h)
    // Update slots & emit
    const s: TimeSlots = {
      h:    String(h),
      m0:   slots.m0,
      m1:   slots.m1,
      ampm: slots.ampm,
    }
    setSlots(s)
    onTextChange(timeSlotsToDisplay(s))
    const t = timeSlotsToH24(s)
    if (t) onTimeSelect(`${String(t.h24).padStart(2,'0')}:${String(t.m).padStart(2,'0')}`)
  }, [slots, onTextChange, onTimeSelect])

  const onWheelM = useCallback((m: number) => {
    setWheelM(m)
    const ms = String(m).padStart(2, '0')
    const s: TimeSlots = { h: slots.h, m0: ms[0], m1: ms[1], ampm: slots.ampm }
    setSlots(s)
    onTextChange(timeSlotsToDisplay(s))
    const t = timeSlotsToH24(s)
    if (t) onTimeSelect(`${String(t.h24).padStart(2,'0')}:${String(t.m).padStart(2,'0')}`)
  }, [slots, onTextChange, onTimeSelect])

  const onWheelAmpm = useCallback((ap: string) => {
    const ampm = ap as 'AM' | 'PM'
    setWheelAmpm(ampm)
    const s: TimeSlots = { h: slots.h, m0: slots.m0, m1: slots.m1, ampm }
    setSlots(s)
    onTextChange(timeSlotsToDisplay(s))
    const t = timeSlotsToH24(s)
    if (t) onTimeSelect(`${String(t.h24).padStart(2,'0')}:${String(t.m).padStart(2,'0')}`)
  }, [slots, onTextChange, onTimeSelect])

  const phase  = getTimePhase(slots)
  const isDone = phase === 'done'

  return (
    <div ref={anchorRef}>
      <div
        style={{ position: 'relative' }}
        onClick={() => { setOpen(true); inputRef.current?.focus() }}
      >
        {/* Custom slot display */}
        <div style={{
          ...inputStyle,
          display: 'flex', alignItems: 'center',
          cursor: 'text', userSelect: 'none',
        }}>
          {/* Hour */}
          <SlotSpan v={slots.h} ph={phase === 'h' ? '·' : 'h'} active={phase === 'h'} />
          <Sep>:</Sep>
          {/* Minute tens */}
          <SlotSpan v={slots.m0} ph="m" active={phase === 'm0'} />
          {/* Minute units */}
          <SlotSpan v={slots.m1} ph="m" active={phase === 'm1'} />
          <span style={{ color: '#4A4A62', fontSize: 13, margin: '0 4px' }}> </span>
          {/* AM/PM */}
          <SlotSpan v={slots.ampm} ph="AM" active={phase === 'ampm'} wide />
          {!isDone && <Cursor />}
        </div>
        <input
          ref={inputRef}
          onKeyDown={handleKeyDown}
          onFocus={() => setOpen(true)}
          readOnly
          style={{
            position: 'absolute', inset: 0, opacity: 0,
            width: '100%', height: '100%', cursor: 'text', zIndex: 1,
          }}
        />
        <span
          onClick={e => { e.stopPropagation(); setOpen(o => !o) }}
          style={{ ...iconStyle, zIndex: 2 }}
        >🕐</span>
      </div>

      {open && typeof window !== 'undefined' && createPortal(
        <div ref={dropRef} style={{
          position: 'fixed', zIndex: 9999,
          top: pos.top, bottom: pos.bottom, left: pos.left,
          width: Math.max(pos.width ?? 0, 260),
          background: '#16161C', border: '1px solid #2A2A35',
          borderRadius: 14, boxShadow: '0 20px 60px rgba(0,0,0,0.85)',
          padding: '14px 18px 18px',
        }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'stretch' }}>
            <CyclicWheel
              items={HOURS_12}
              selected={wheelH}
              fmt={v => String(v)}
              label="Hour"
              onSelect={onWheelH}
            />
            <Divider />
            <CyclicWheel
              items={MINUTES}
              selected={wheelM}
              fmt={v => String(v).padStart(2, '0')}
              label="Min"
              onSelect={onWheelM}
            />
            <Divider />
            <BoundedWheel
              items={AMPM_ITEMS}
              selected={wheelAmpm}
              label="AM/PM"
              onSelect={onWheelAmpm}
            />
          </div>
          <div style={{
            textAlign: 'center', marginTop: 12, fontSize: 14, fontWeight: 700,
            color: '#22C55E', fontFamily: "'DM Mono', monospace",
          }}>
            {wheelH}:{String(wheelM).padStart(2,'0')} {wheelAmpm}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

function SlotSpan({ v, ph, active, wide }: { v: string | null; ph: string; active: boolean; wide?: boolean }) {
  return (
    <span style={{
      fontFamily: "'DM Mono', monospace", fontSize: 13,
      color: v ? '#ECECF1' : active ? '#22C55E' : '#3A3A50',
      minWidth: wide ? '2em' : '0.65em',
      textAlign: 'center',
    }}>
      {v ?? ph}
    </span>
  )
}

function Sep({ children }: { children: string }) {
  return <span style={{ color: '#4A4A62', fontFamily: "'DM Mono', monospace", fontSize: 13 }}>{children}</span>
}

function Cursor() {
  return (
    <span style={{
      display: 'inline-block', width: 1, height: '1em',
      background: '#22C55E', marginLeft: 2,
      animation: 'blink 1s step-end infinite',
    }}>
      <style>{`@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }`}</style>
    </span>
  )
}

function Divider() {
  return <div style={{ width: 1, background: '#2A2A35', margin: '20px 0' }} />
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 36px 9px 12px',
  background: '#0D0D10', border: '1px solid #2A2A35', borderRadius: 8,
  fontSize: 13, color: '#ECECF1', outline: 'none', fontFamily: 'inherit',
  minHeight: 38,
}
const iconStyle: React.CSSProperties = {
  position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
  cursor: 'pointer', fontSize: 15, color: '#6B6B80', userSelect: 'none',
}
