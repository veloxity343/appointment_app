// ─── hooks.ts ─────────────────────────────────────────────────────────────────

import { useState, useEffect, RefObject } from 'react'

export interface AnchorPos {
  top?:    number
  bottom?: number
  left:    number
  width:   number
}

export function useAnchorPos(open: boolean, ref: RefObject<HTMLElement | null>): AnchorPos {
  const [pos, setPos] = useState<AnchorPos>({ left: 0, width: 0 })

  useEffect(() => {
    if (!open) return

    function measure() {
      if (!ref.current) return
      const r      = ref.current.getBoundingClientRect()
      const vh     = window.innerHeight
      const vw     = window.innerWidth
      const dropW  = Math.max(r.width, 300)
      const flipUp = (vh - r.bottom - 8) < 340 && r.top > (vh - r.bottom)
      const left   = Math.min(r.left, vw - dropW - 8)

      setPos(flipUp
        ? { bottom: vh - r.top + 6, left, width: r.width }
        : { top: r.bottom + 6,      left, width: r.width }
      )
    }

    const raf = requestAnimationFrame(measure)
    window.addEventListener('scroll', measure, true)
    window.addEventListener('resize', measure)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', measure, true)
      window.removeEventListener('resize', measure)
    }
  }, [open])

  return pos
}
