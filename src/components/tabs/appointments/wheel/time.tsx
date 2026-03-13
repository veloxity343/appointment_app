'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { CyclicWheel, BoundedWheel } from './wheel'
import { useAnchorPos } from './hooks'

// ── Keyframe injection (once, no JSX style tags) ───────────────────────────────
const _injected = new Set<string>()
function injectKeyframes(id: string, css: string) {
  if (_injected.has(id) || typeof document === 'undefined') return
  _injected.add(id)
  const el = document.createElement('style')
  el.textContent = css
  document.head.appendChild(el)
}

// ── Slot type ──────────────────────────────────────────────────────────────────
// Display: hh:mm AM  (2-digit hour, e.g. "09:30 AM")
// Slots:   h0  h1  :  m0  m1  [space]  ampm

interface TimeSlots {
  h0:   string | null   // '0' or '1'
  h1:   string | null   // units of hour (clamped by h0)
  m0:   string | null   // '0'–'5'
  m1:   string | null   // '0'–'9'
  ampm: 'AM' | 'PM' | null
}

function emptySlots(): TimeSlots {
  return { h0: null, h1: null, m0: null, m1: null, ampm: null }
}

function isComplete(s: TimeSlots): boolean {
  return s.h0 !== null && s.h1 !== null && s.m0 !== null && s.m1 !== null && s.ampm !== null
}

function hhmmToSlots(value: string): TimeSlots {
  if (!value) return emptySlots()
  const [hStr, mStr] = value.split(':')
  const h24 = parseInt(hStr, 10)
  const m   = parseInt(mStr, 10)
  if (isNaN(h24) || isNaN(m)) return emptySlots()
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12
  const ap  = h24 >= 12 ? 'PM' : 'AM'
  const hh  = String(h12).padStart(2, '0')
  const mm  = String(m).padStart(2, '0')
  return { h0: hh[0], h1: hh[1], m0: mm[0], m1: mm[1], ampm: ap }
}

function slotsToHHMM(s: TimeSlots): string | null {
  if (!isComplete(s)) return null
  const h12 = parseInt(s.h0! + s.h1!)
  const m   = parseInt(s.m0! + s.m1!)
  if (h12 < 1 || h12 > 12 || m < 0 || m > 59) return null
  const h24 = s.ampm === 'PM' ? (h12 === 12 ? 12 : h12 + 12) : (h12 === 12 ? 0 : h12)
  return `${String(h24).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function slotsToDisplay(s: TimeSlots): string {
  return `${s.h0 ?? 'h'}${s.h1 ?? 'h'}:${s.m0 ?? 'm'}${s.m1 ?? 'm'} ${s.ampm ?? 'AM'}`
}

type Phase = 'h0' | 'h1' | 'm0' | 'm1' | 'ampm' | 'done'
function getPhase(s: TimeSlots): Phase {
  if (s.h0   === null) return 'h0'
  if (s.h1   === null) return 'h1'
  if (s.m0   === null) return 'm0'
  if (s.m1   === null) return 'm1'
  if (s.ampm === null) return 'ampm'
  return 'done'
}

// ── Push / pop ────────────────────────────────────────────────────────────────

function pushChar(s: TimeSlots, char: string): TimeSlots {
  const n     = { ...s }
  const phase = getPhase(n)
  const upper = char.toUpperCase()

  if (phase === 'h0') {
    const d = parseInt(char)
    if (isNaN(d)) return n
    if (d === 0 || d === 1) { n.h0 = char }
    else { n.h0 = '0'; n.h1 = char }   // 2-9 → auto-pad "0X"
    return n
  }
  if (phase === 'h1') {
    const d = parseInt(char)
    if (isNaN(d)) return n
    n.h1 = n.h0 === '0'
      ? (d < 1 ? '1' : String(d))   // 01–09
      : (d > 2 ? '2' : String(d))   // 10–12
    return n
  }
  if (phase === 'm0') {
    const d = parseInt(char)
    if (isNaN(d)) return n
    n.m0 = d > 5 ? '5' : char
    return n
  }
  if (phase === 'm1') {
    if (isNaN(parseInt(char))) return n
    n.m1 = char
    return n
  }
  if (phase === 'ampm') {
    if (upper === 'A') { n.ampm = 'AM'; return n }
    if (upper === 'P') { n.ampm = 'PM'; return n }
    return n
  }
  return n
}

function popSlot(s: TimeSlots): TimeSlots {
  const n = { ...s }
  if (n.ampm !== null) { n.ampm = null; return n }
  if (n.m1   !== null) { n.m1   = null; return n }
  if (n.m0   !== null) { n.m0   = null; return n }
  if (n.h1   !== null) { n.h1   = null; return n }
  if (n.h0   !== null) { n.h0   = null; return n }
  return n
}

// ── Wheel helpers ─────────────────────────────────────────────────────────────

const HOURS_12   = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
const MINUTES    = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]
const AMPM_ITEMS = ['AM', 'PM']

function slotsToWheelVals(s: TimeSlots): { h12: number; m: number; ampm: 'AM' | 'PM' } {
  const h12raw  = (s.h0 !== null && s.h1 !== null) ? parseInt(s.h0 + s.h1) : 12
  const mRaw    = parseInt((s.m0 ?? '0') + (s.m1 ?? '0'))
  const snapped = Math.round(mRaw / 5) * 5 % 60
  return {
    h12:  (isNaN(h12raw) || h12raw < 1 || h12raw > 12) ? 12 : h12raw,
    m:    isNaN(snapped) ? 0 : snapped,
    ampm: s.ampm ?? 'AM',
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  value:        string
  textValue:    string
  onTimeSelect: (hhmm: string) => void
  onTextChange: (raw: string) => void
}

export function TimeWheelPicker({ value, textValue, onTimeSelect, onTextChange }: Props) {
  const initSlots = hhmmToSlots(value)
  const initWv    = slotsToWheelVals(initSlots)

  const [slots,     setSlots]     = useState<TimeSlots>(initSlots)
  const [wheelH,    setWheelH]    = useState(initWv.h12)
  const [wheelM,    setWheelM]    = useState(initWv.m)
  const [wheelAmpm, setWheelAmpm] = useState<'AM' | 'PM'>(initWv.ampm)
  const [open,      setOpen]      = useState(false)
  const [focused,   setFocused]   = useState(false)

  // Ref always reflects latest slots — lets event handlers read current
  // state synchronously without a stale closure, and prevents calling
  // onTextChange inside a setState updater (which React forbids).
  const slotsRef = useRef(initSlots)

  const anchorRef = useRef<HTMLDivElement>(null)
  const dropRef   = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLInputElement>(null)
  const pos       = useAnchorPos(open, anchorRef)

  useEffect(() => {
    if (value) {
      const s  = hhmmToSlots(value)
      const wv = slotsToWheelVals(s)
      slotsRef.current = s
      setSlots(s)
      setWheelH(wv.h12); setWheelM(wv.m); setWheelAmpm(wv.ampm)
    }
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

  /**
   * Commit freshly-computed slots.
   * Called from event handlers only — never from inside a setState updater.
   * Snap wheels only when all slots are complete (full time typed).
   */
  const commitSlots = useCallback((s: TimeSlots) => {
    slotsRef.current = s
    setSlots(s)
    onTextChange(slotsToDisplay(s))
    const hhmm = slotsToHHMM(s)
    if (hhmm) {
      onTimeSelect(hhmm)
      const wv = slotsToWheelVals(s)
      setWheelH(wv.h12); setWheelM(wv.m); setWheelAmpm(wv.ampm)
    }
  }, [onTextChange, onTimeSelect])

  // ── Keyboard ──────────────────────────────────────────────────────────────
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    if (e.key === 'Backspace' || e.key === 'Delete') {
      commitSlots(popSlot(slotsRef.current))
      return
    }
    const ch = e.key
    if (/^\d$/.test(ch) || /^[aApP]$/.test(ch)) {
      commitSlots(pushChar(slotsRef.current, ch))
    }
  }, [commitSlots])

  // ── Wheel callbacks — update only their own slot pair, emit immediately ───
  const onWheelH = useCallback((h12: number) => {
    setWheelH(h12)
    const hh   = String(h12).padStart(2, '0')
    const next = { ...slotsRef.current, h0: hh[0], h1: hh[1] }
    slotsRef.current = next
    setSlots(next)
    onTextChange(slotsToDisplay(next))
    const hhmm = slotsToHHMM(next)
    if (hhmm) onTimeSelect(hhmm)
  }, [onTextChange, onTimeSelect])

  const onWheelM = useCallback((m: number) => {
    setWheelM(m)
    const mm   = String(m).padStart(2, '0')
    const next = { ...slotsRef.current, m0: mm[0], m1: mm[1] }
    slotsRef.current = next
    setSlots(next)
    onTextChange(slotsToDisplay(next))
    const hhmm = slotsToHHMM(next)
    if (hhmm) onTimeSelect(hhmm)
  }, [onTextChange, onTimeSelect])

  const onWheelAmpm = useCallback((ap: string) => {
    const ampm = ap as 'AM' | 'PM'
    setWheelAmpm(ampm)
    const next = { ...slotsRef.current, ampm }
    slotsRef.current = next
    setSlots(next)
    onTextChange(slotsToDisplay(next))
    const hhmm = slotsToHHMM(next)
    if (hhmm) onTimeSelect(hhmm)
  }, [onTextChange, onTimeSelect])

  // ── Cursor ────────────────────────────────────────────────────────────────
  const phase   = getPhase(slots)
  const curH0   = focused && phase === 'h0'
  const curH1   = focused && phase === 'h1'
  const curM0   = focused && phase === 'm0'
  const curM1   = focused && phase === 'm1'
  const curAmpm = focused && phase === 'ampm'

  return (
    <div ref={anchorRef}>
      <div
        style={{ position: 'relative' }}
        onClick={() => { setOpen(true); inputRef.current?.focus() }}
      >
        <div style={{
          ...inputStyle,
          border: focused ? '1px solid rgba(34,197,94,0.5)' : '1px solid #2A2A35',
          display: 'flex', alignItems: 'center',
          cursor: 'text', userSelect: 'none',
        }}>
          <SlotChar c={slots.h0} ph="h" showCursor={curH0} />
          <SlotChar c={slots.h1} ph="h" showCursor={curH1} />
          <Sep>:</Sep>
          <SlotChar c={slots.m0} ph="m" showCursor={curM0} />
          <SlotChar c={slots.m1} ph="m" showCursor={curM1} />
          <span style={{ color: '#4A4A62', fontFamily: "'DM Mono', monospace", fontSize: 13, margin: '0 4px' }}> </span>
          <SlotChar c={slots.ampm} ph="AM" showCursor={curAmpm} wide />
        </div>

        <input
          ref={inputRef}
          onKeyDown={handleKeyDown}
          onFocus={() => { setOpen(true); setFocused(true) }}
          onBlur={() => setFocused(false)}
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
              fmt={v => String(v).padStart(2, '0')}
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
            {String(wheelH).padStart(2,'0')}:{String(wheelM).padStart(2,'0')} {wheelAmpm}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

// ── Primitives ─────────────────────────────────────────────────────────────────

function SlotChar({
  c, ph, showCursor, wide,
}: { c: string | null; ph: string; showCursor: boolean; wide?: boolean }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center' }}>
      {showCursor && <BlinkCursor id="blink-time" />}
      <span style={{
        fontFamily: "'DM Mono', monospace", fontSize: 13,
        color: c ? '#ECECF1' : '#3A3A50',
        minWidth: wide ? '2em' : '0.65em',
        textAlign: 'center',
      }}>
        {c ?? ph}
      </span>
    </span>
  )
}

function Sep({ children }: { children: string }) {
  return (
    <span style={{ color: '#4A4A62', fontFamily: "'DM Mono', monospace", fontSize: 13 }}>
      {children}
    </span>
  )
}

function BlinkCursor({ id }: { id: string }) {
  injectKeyframes(id, `@keyframes ${id}{0%,100%{opacity:1}50%{opacity:0}}`)
  return (
    <span style={{
      display: 'inline-block', width: 1.5, height: '1em',
      background: '#22C55E', marginRight: 1, borderRadius: 1,
      animation: `${id} 1s step-end infinite`,
    }} />
  )
}

function Divider() {
  return <div style={{ width: 1, background: '#2A2A35', margin: '20px 0' }} />
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 36px 9px 12px',
  background: '#0D0D10', borderRadius: 8,
  fontSize: 13, color: '#ECECF1', outline: 'none', fontFamily: 'inherit',
  minHeight: 38,
}
const iconStyle: React.CSSProperties = {
  position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
  cursor: 'pointer', fontSize: 15, color: '#6B6B80', userSelect: 'none',
}
