// ─── hooks.ts ─────────────────────────────────────────────────────────────────

import { useState, useEffect, RefObject } from 'react'

// Returns the fixed position for a portal dropdown anchored to an element.
// Automatically flips upward if the dropdown would overflow the viewport bottom.
export function useAnchorPos(open: boolean, ref: RefObject<HTMLElement | null>) {
  const [pos, setPos] = useState({ top: 0, bottom: 0, left: 0, width: 0, flipUp: false })

  useEffect(() => {
    if (!open || !ref.current) return
    const r  = ref.current.getBoundingClientRect()
    const vh = window.innerHeight
    setPos({
      top:    r.bottom + 6,
      bottom: vh - r.top + 6,
      left:   r.left,
      width:  r.width,
      flipUp: r.bottom + 360 > vh - 16,
    })
  }, [open])

  return pos
}
