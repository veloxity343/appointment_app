'use client'

// ─── Wheel.tsx ────────────────────────────────────────────────────────────────

import { useRef, useEffect, useCallback, useState } from 'react'

const ITEM_H      = 40
const VISIBLE     = 5
const WINDOW_SIZE = 41
const HALF_WIN    = Math.floor(WINDOW_SIZE / 2)

const Y_ITEM_H  = 28
const Y_VISIBLE = 3
const Y_WIN     = 21
const Y_HALF    = Math.floor(Y_WIN / 2)
export const YEAR_MIN = 1980

// ─────────────────────────────────────────────────────────────────────────────
// CyclicWheel
// ─────────────────────────────────────────────────────────────────────────────
export interface CyclicWheelProps {
  items:    number[]
  selected: number
  onSelect: (v: number) => void
  fmt:      (v: number) => string
  label:    string
}

export function CyclicWheel({ items, selected, onSelect, fmt, label }: CyclicWheelProps) {
  const el         = useRef<HTMLDivElement>(null)
  const offsetRef  = useRef(0)
  const snapTimer  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isSnapping = useRef(false)   // true while our own smooth-scroll runs
  const isProg     = useRef(false)   // true during programmatic scroll (external select)
  const [, redraw] = useState(0)

  const len = items.length

  const viToValue = useCallback((vi: number) => items[((vi % len) + len) % len], [items, len])

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
    isSnapping.current = true
    div.scrollTo({ top: scrollForVI(centreVI), behavior: 'smooth' })
    onSelect(value)
    setTimeout(() => { isSnapping.current = false }, 400)
  }, [viToValue, onSelect])

  const onScroll = useCallback(() => {
    if (isProg.current) return
    correctIfNeeded()
    if (snapTimer.current) clearTimeout(snapTimer.current)
    snapTimer.current = setTimeout(snapToCentre, 120)
  }, [correctIfNeeded, snapToCentre])

  // Mount
  useEffect(() => {
    const div = el.current; if (!div) return
    const vi          = valueToVI(selected)
    offsetRef.current = vi - HALF_WIN
    div.scrollTop     = scrollForVI(vi)
    redraw(t => t + 1)
  }, []) // eslint-disable-line

  // External change → programmatic scroll
  useEffect(() => {
    if (isSnapping.current) return
    const div = el.current; if (!div) return
    const vi = valueToVI(selected)
    isProg.current = true
    div.scrollTo({ top: scrollForVI(vi), behavior: 'smooth' })
    setTimeout(() => { isProg.current = false }, 400)
  }, [selected, valueToVI]) // eslint-disable-line

  const nodes = Array.from({ length: WINDOW_SIZE }, (_, i) => ({
    vi: offsetRef.current + i,
    value: viToValue(offsetRef.current + i),
  }))

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
// BoundedWheel — fixed list, no infinite scroll (AM / PM)
// ─────────────────────────────────────────────────────────────────────────────
export interface BoundedWheelProps {
  items:    string[]
  selected: string
  onSelect: (v: string) => void
  label:    string
}

export function BoundedWheel({ items, selected, onSelect, label }: BoundedWheelProps) {
  const el        = useRef<HTMLDivElement>(null)
  const snapTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Track whether the current scroll was triggered programmatically
  const isProg    = useRef(false)
  const isBusy    = useRef(false)

  const pad    = Math.floor(VISIBLE / 2)  // 2 padding items each side
  const idxOf  = (v: string) => items.indexOf(v)

  // scrollTop = 0 means first real item is centred
  const scrollForIdx = (idx: number) => idx * ITEM_H

  function snapToNearest() {
    const div = el.current; if (!div) return
    const idx  = Math.min(items.length - 1, Math.max(0, Math.round(div.scrollTop / ITEM_H)))
    isBusy.current = true
    div.scrollTo({ top: scrollForIdx(idx), behavior: 'smooth' })
    onSelect(items[idx])
    setTimeout(() => { isBusy.current = false }, 400)
  }

  const onScroll = useCallback(() => {
    if (isProg.current) return
    if (snapTimer.current) clearTimeout(snapTimer.current)
    snapTimer.current = setTimeout(snapToNearest, 120)
  }, []) // eslint-disable-line

  // Mount: scroll to selected
  useEffect(() => {
    const div = el.current; if (!div) return
    div.scrollTop = scrollForIdx(idxOf(selected))
  }, []) // eslint-disable-line

  // External change
  useEffect(() => {
    if (isBusy.current) return
    const div = el.current; if (!div) return
    isProg.current = true
    div.scrollTo({ top: scrollForIdx(idxOf(selected)), behavior: 'smooth' })
    setTimeout(() => { isProg.current = false }, 400)
  }, [selected]) // eslint-disable-line

  // Render: pad items top and bottom so selection band is always centred
  const paddedItems: (string | null)[] = [
    ...Array(pad).fill(null),
    ...items,
    ...Array(pad).fill(null),
  ]

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={colLabelStyle}>{label}</div>
      <div style={{ position: 'relative', width: '100%' }}>
        <Fade dir="top"    h={ITEM_H * 1.8} />
        <SelectionBand     h={ITEM_H} />
        <Fade dir="bottom" h={ITEM_H * 1.8} />
        {/*
          The scroll container height = VISIBLE * ITEM_H.
          Internal height = paddedItems.length * ITEM_H.
          Scrollable range = (items.length - 1) * ITEM_H  (from idx 0 to last real item).
        */}
        <div ref={el} onScroll={onScroll}
          style={{ height: ITEM_H * VISIBLE, overflowY: 'scroll', scrollbarWidth: 'none', cursor: 'pointer' }}>
          <div style={{ height: paddedItems.length * ITEM_H, position: 'relative' }}>
            {paddedItems.map((item, i) => (
              item === null
                ? <div key={`pad-${i}`} style={{ position: 'absolute', top: i * ITEM_H, height: ITEM_H, width: '100%' }} />
                : <WheelItem
                    key={item}
                    top={i * ITEM_H}
                    text={item}
                    selected={item === selected}
                    h={ITEM_H}
                    onClick={() => {
                      isBusy.current = false
                      isProg.current = false
                      onSelect(item)
                    }}
                  />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// YearWheel
// ─────────────────────────────────────────────────────────────────────────────
export interface YearWheelProps {
  year:     number
  onChange: (y: number) => void
}

export function YearWheel({ year, onChange }: YearWheelProps) {
  const el        = useRef<HTMLDivElement>(null)
  const offsetRef = useRef(0)
  const snapTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isProg    = useRef(false)
  const isBusy    = useRef(false)
  const [, redraw] = useState(0)

  const viToYear    = (vi: number) => Math.max(YEAR_MIN, YEAR_MIN + vi)
  const yearToVI    = (y: number)  => Math.max(0, y - YEAR_MIN)
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
    isBusy.current = true
    div.scrollTo({ top: scrollForVI(centreVI), behavior: 'smooth' })
    onChange(viToYear(centreVI))
    setTimeout(() => { isBusy.current = false }, 400)
  }, [onChange])

  const onScroll = useCallback(() => {
    if (isProg.current) return
    correctIfNeeded()
    if (snapTimer.current) clearTimeout(snapTimer.current)
    snapTimer.current = setTimeout(snapToCentre, 120)
  }, [correctIfNeeded, snapToCentre])

  useEffect(() => {
    const div = el.current; if (!div) return
    const vi          = yearToVI(year)
    offsetRef.current = Math.max(0, vi - Y_HALF)
    div.scrollTop     = scrollForVI(vi)
    redraw(t => t + 1)
  }, []) // eslint-disable-line

  useEffect(() => {
    if (isBusy.current) return
    const div = el.current; if (!div) return
    isProg.current = true
    div.scrollTo({ top: scrollForVI(yearToVI(year)), behavior: 'smooth' })
    setTimeout(() => { isProg.current = false }, 400)
  }, [year]) // eslint-disable-line

  const nodes = Array.from({ length: Y_WIN }, (_, i) => ({
    vi: offsetRef.current + i,
    y:  viToYear(offsetRef.current + i),
  }))

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
              smallFont onClick={() => { isBusy.current = false; onChange(y) }} />
          ))}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared primitives
// ─────────────────────────────────────────────────────────────────────────────
export function Fade({ dir, h, bg = '#16161C' }: { dir: 'top' | 'bottom'; h: number; bg?: string }) {
  return (
    <div style={{
      position: 'absolute', [dir]: 0, left: 0, right: 0, height: h,
      background: `linear-gradient(to ${dir === 'top' ? 'bottom' : 'top'}, ${bg} 20%, transparent)`,
      pointerEvents: 'none', zIndex: 2,
    }} />
  )
}

export function SelectionBand({ h, inset = 4, radius = 8 }: { h: number; inset?: number; radius?: number }) {
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
    <div onClick={onClick} style={{
      position: 'absolute', top, left: 0, right: 0, height: h,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize:   selected ? (smallFont ? 13 : 20) : (smallFont ? 11 : 13),
      fontWeight: selected ? 700 : 400,
      color:      selected ? '#22C55E' : '#4A4A62',
      fontFamily: "'DM Mono', monospace",
      transition: 'font-size 0.1s, color 0.1s',
      userSelect: 'none',
      cursor:     onClick ? 'pointer' : 'default',
    }}>
      {text}
    </div>
  )
}

const colLabelStyle: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, color: '#6B6B80',
  textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6,
}
