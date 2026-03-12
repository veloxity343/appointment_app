'use client'

// ─── Wheel.tsx ────────────────────────────────────────────────────────────────
// Unified virtual-scroll wheel.  Only ever renders WINDOW_SIZE DOM nodes.
// Silently recentres the scroll anchor when the user approaches an edge,
// making the list appear infinite in both directions.
//
// Two modes:
//   cyclic    — value = items[vi mod items.length]   (hours, minutes)
//   monotonic — value = min + vi, clamped at min     (years: 1980 → ∞)
// ─────────────────────────────────────────────────────────────────────────────

import { useRef, useEffect, useCallback, useState } from 'react'

// ── Shared constants ──────────────────────────────────────────────────────────
const ITEM_H      = 40
const VISIBLE     = 5      // rows shown; must be odd
const WINDOW_SIZE = 41     // DOM nodes rendered; must be >> VISIBLE and odd
const HALF_WIN    = Math.floor(WINDOW_SIZE / 2)

// ── Year-wheel constants ──────────────────────────────────────────────────────
const Y_ITEM_H    = 28
const Y_VISIBLE   = 3
const Y_WIN       = 21
const Y_HALF      = Math.floor(Y_WIN / 2)
export const YEAR_MIN = 1980

// ─────────────────────────────────────────────────────────────────────────────
// Cyclic wheel  (hours / minutes)
// ─────────────────────────────────────────────────────────────────────────────
export interface CyclicWheelProps {
  items:    number[]
  selected: number
  onSelect: (v: number) => void
  fmt:      (v: number) => string
  label:    string
}

export function CyclicWheel({ items, selected, onSelect, fmt, label }: CyclicWheelProps) {
  const el        = useRef<HTMLDivElement>(null)
  const offsetRef = useRef(0)
  const snapTimer = useRef<ReturnType<typeof setTimeout>>()
  const settling  = useRef(false)
  const [, redraw] = useState(0)

  const len = items.length

  const viToValue = useCallback((vi: number) => {
    return items[((vi % len) + len) % len]
  }, [items, len])

  const valueToVI = useCallback((value: number): number => {
    const idx    = items.indexOf(value)
    const centre = offsetRef.current + HALF_WIN
    const base   = Math.round(centre / len) * len + idx
    const cands  = [base - len, base, base + len]
    return cands.reduce((a, b) => Math.abs(a - centre) < Math.abs(b - centre) ? a : b)
  }, [items, len])

  const scrollForVI = (vi: number) =>
    (vi - Math.floor(VISIBLE / 2) - offsetRef.current) * ITEM_H

  const correctIfNeeded = useCallback(() => {
    const div = el.current; if (!div) return
    const centreVI = offsetRef.current + Math.round(div.scrollTop / ITEM_H) + Math.floor(VISIBLE / 2)
    if (centreVI - offsetRef.current < HALF_WIN || offsetRef.current + WINDOW_SIZE - 1 - centreVI < HALF_WIN) {
      const newOffset   = centreVI - HALF_WIN
      div.scrollTop    -= (newOffset - offsetRef.current) * ITEM_H
      offsetRef.current = newOffset
      redraw(t => t + 1)
    }
  }, [])

  const snapToCentre = useCallback(() => {
    const div = el.current; if (!div) return
    const centreVI = Math.round(offsetRef.current + div.scrollTop / ITEM_H) + Math.floor(VISIBLE / 2)
    const value    = viToValue(centreVI)
    settling.current = true
    div.scrollTo({ top: scrollForVI(centreVI), behavior: 'smooth' })
    onSelect(value)
    setTimeout(() => { settling.current = false }, 350)
  }, [viToValue, onSelect])

  const onScroll = useCallback(() => {
    correctIfNeeded()
    clearTimeout(snapTimer.current)
    snapTimer.current = setTimeout(snapToCentre, 120)
  }, [correctIfNeeded, snapToCentre])

  // Mount: position selected in centre
  useEffect(() => {
    const div = el.current; if (!div) return
    const vi          = valueToVI(selected)
    offsetRef.current = vi - HALF_WIN
    div.scrollTop     = scrollForVI(vi)
    redraw(1)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // External selected change
  useEffect(() => {
    if (settling.current) return
    const div = el.current; if (!div) return
    div.scrollTo({ top: scrollForVI(valueToVI(selected)), behavior: 'smooth' })
  }, [selected]) // eslint-disable-line react-hooks/exhaustive-deps

  // Build node list
  const nodes = Array.from({ length: WINDOW_SIZE }, (_, i) => {
    const vi = offsetRef.current + i
    return { vi, value: viToValue(vi) }
  })

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={colLabelStyle}>{label}</div>
      <div style={{ position: 'relative', width: '100%' }}>
        <Fade dir="top"    h={ITEM_H * 1.8} />
        <SelectionBand     h={ITEM_H} />
        <Fade dir="bottom" h={ITEM_H * 1.8} />
        <div ref={el} onScroll={onScroll}
          style={{ height: ITEM_H * VISIBLE, overflowY: 'scroll', scrollbarWidth: 'none', cursor: 'ns-resize' }}>
          <div style={{ height: WINDOW_SIZE * ITEM_H, position: 'relative' }}>
            {nodes.map(({ vi, value }) => (
              <WheelItem key={vi} top={(vi - offsetRef.current) * ITEM_H}
                text={fmt(value)} selected={value === selected} h={ITEM_H} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Year wheel  (monotonic, 1980 → ∞)
// ─────────────────────────────────────────────────────────────────────────────
export interface YearWheelProps {
  year:     number
  onChange: (y: number) => void
}

export function YearWheel({ year, onChange }: YearWheelProps) {
  const el        = useRef<HTMLDivElement>(null)
  const offsetRef = useRef(0)
  const snapTimer = useRef<ReturnType<typeof setTimeout>>()
  const settling  = useRef(false)
  const [, redraw] = useState(0)

  const viToYear  = (vi: number) => Math.max(YEAR_MIN, YEAR_MIN + vi)
  const yearToVI  = (y: number)  => Math.max(0, y - YEAR_MIN)
  const scrollForVI = (vi: number) =>
    (vi - Math.floor(Y_VISIBLE / 2) - offsetRef.current) * Y_ITEM_H

  const correctIfNeeded = useCallback(() => {
    const div = el.current; if (!div) return
    const centreVI = offsetRef.current + Math.round(div.scrollTop / Y_ITEM_H) + Math.floor(Y_VISIBLE / 2)
    if (centreVI - offsetRef.current < Y_HALF || offsetRef.current + Y_WIN - 1 - centreVI < Y_HALF) {
      const newOffset   = Math.max(0, centreVI - Y_HALF)
      div.scrollTop    -= (newOffset - offsetRef.current) * Y_ITEM_H
      offsetRef.current = newOffset
      redraw(t => t + 1)
    }
  }, [])

  const snapToCentre = useCallback(() => {
    const div = el.current; if (!div) return
    const centreVI = Math.max(0, Math.round(offsetRef.current + div.scrollTop / Y_ITEM_H) + Math.floor(Y_VISIBLE / 2))
    const value    = viToYear(centreVI)
    settling.current = true
    div.scrollTo({ top: scrollForVI(centreVI), behavior: 'smooth' })
    onChange(value)
    setTimeout(() => { settling.current = false }, 350)
  }, [onChange])

  const onScroll = useCallback(() => {
    correctIfNeeded()
    clearTimeout(snapTimer.current)
    snapTimer.current = setTimeout(snapToCentre, 120)
  }, [correctIfNeeded, snapToCentre])

  useEffect(() => {
    const div = el.current; if (!div) return
    const vi          = yearToVI(year)
    offsetRef.current = Math.max(0, vi - Y_HALF)
    div.scrollTop     = scrollForVI(vi)
    redraw(1)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (settling.current) return
    const div = el.current; if (!div) return
    div.scrollTo({ top: scrollForVI(yearToVI(year)), behavior: 'smooth' })
  }, [year]) // eslint-disable-line react-hooks/exhaustive-deps

  const nodes = Array.from({ length: Y_WIN }, (_, i) => {
    const vi = offsetRef.current + i
    return { vi, y: viToYear(vi) }
  })

  return (
    <div style={{
      position: 'relative', width: 62, height: Y_ITEM_H * Y_VISIBLE,
      borderRadius: 6, border: '1px solid rgba(34,197,94,0.2)',
      background: 'rgba(34,197,94,0.04)', overflow: 'hidden', cursor: 'ns-resize',
    }}>
      <Fade dir="top"    h={Y_ITEM_H} bg="#16161C" />
      <SelectionBand     h={Y_ITEM_H} inset={2} radius={4} />
      <Fade dir="bottom" h={Y_ITEM_H} bg="#16161C" />
      <div ref={el} onScroll={onScroll}
        style={{ height: '100%', overflowY: 'scroll', scrollbarWidth: 'none' }}>
        <div style={{ height: Y_WIN * Y_ITEM_H, position: 'relative' }}>
          {nodes.map(({ vi, y }) => (
            <WheelItem key={vi} top={(vi - offsetRef.current) * Y_ITEM_H}
              text={String(y)} selected={y === year} h={Y_ITEM_H}
              smallFont onClick={() => { settling.current = false; onChange(y) }} />
          ))}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared sub-components
// ─────────────────────────────────────────────────────────────────────────────
function Fade({ dir, h, bg = '#16161C' }: { dir: 'top' | 'bottom'; h: number; bg?: string }) {
  return (
    <div style={{
      position: 'absolute', [dir]: 0, left: 0, right: 0, height: h,
      background: `linear-gradient(to ${dir === 'top' ? 'bottom' : 'top'}, ${bg} 20%, transparent)`,
      pointerEvents: 'none', zIndex: 2,
    }} />
  )
}

function SelectionBand({ h, inset = 4, radius = 8 }: { h: number; inset?: number; radius?: number }) {
  return (
    <div style={{
      position: 'absolute', top: '50%', left: inset, right: inset,
      height: h, transform: 'translateY(-50%)',
      background: 'rgba(34,197,94,0.10)', border: '1px solid rgba(34,197,94,0.25)',
      borderRadius: radius, pointerEvents: 'none', zIndex: 1,
    }} />
  )
}

function WheelItem({ top, text, selected, h, smallFont, onClick }: {
  top: number; text: string; selected: boolean; h: number
  smallFont?: boolean; onClick?: () => void
}) {
  return (
    <div
      onClick={onClick}
      style={{
        position: 'absolute', top, left: 0, right: 0, height: h,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize:   selected ? (smallFont ? 13 : 20) : (smallFont ? 11 : 13),
        fontWeight: selected ? 700 : 400,
        color:      selected ? '#22C55E' : '#4A4A62',
        fontFamily: "'DM Mono', monospace",
        transition: 'font-size 0.1s, color 0.1s',
        userSelect: 'none',
        cursor:     onClick ? 'pointer' : 'default',
      }}
    >
      {text}
    </div>
  )
}

const colLabelStyle: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, color: '#6B6B80',
  textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6,
}
