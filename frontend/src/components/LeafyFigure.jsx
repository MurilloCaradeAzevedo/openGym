import { useEffect, useMemo, useRef, useState } from 'react'
import { fromExdb } from '../lib/leafy/catalogue-adapter.ts'
import { classify } from '../lib/leafy/figure/classify.ts'
import { defaultYaw, scene3At, VIEW3 } from '../lib/leafy/figure/three.ts'
import { t, exerciseNameFor } from '../lib/i18n.js'

// Leafy's own drawing of an exercise, in 3D: the body turns to the angle that shows the movement
// best, the muscles it works are lit in green (strong for the main ones, light for those that
// help), and it moves in a paced rhythm: go, hold, come back, breathe. In the big view it can be
// turned by dragging, and a short line says which part of the rhythm it is in. Drawn here from
// the exercise's data; nothing in it is a photo or an animation made by anyone else.
const PERIOD = 3800
const GLOW = { p: '#2E7D32', s: '#66BB6A' }
const CUES = ['Move slowly', 'Hold', 'Come back with control', 'Breathe']
const darkScheme = () => typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches
const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

function useCycle(still) {
  const [cycle, setCycle] = useState(0.45)
  useEffect(() => {
    if (still) return undefined
    let raf = 0
    let last = 0
    const t0 = Date.now()
    const tick = () => {
      const now = Date.now()
      if (now - last > 33) { last = now; setCycle(((now - t0) % PERIOD) / PERIOD) }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [still])
  return still ? 0.45 : cycle
}

function tone(k, dark) {
  const near = dark ? [150, 147, 140] : [150, 146, 138]
  const far = dark ? [78, 77, 73] : [218, 215, 208]
  return `rgb(${near.map((n, i) => Math.round(far[i] + (n - far[i]) * k)).join(',')})`
}

function Shape({ s, dark }) {
  const color = s.role === 'p' || s.role === 's' ? GLOW[s.role]
    : s.role === 'prop' ? (dark ? '#C9C6BD' : '#5F5E5A')
      : s.role === 'floor' ? 'var(--line, rgba(128,128,128,.25))'
        : tone(s.k, dark)
  const op = s.op ?? (s.role === 'floor' ? 0.6 : 1)
  if (s.t === 'line') return <line x1={s.a[0]} y1={s.a[1]} x2={s.b[0]} y2={s.b[1]} stroke={color} strokeWidth={s.w} strokeLinecap="round" opacity={op} />
  if (s.t === 'circle') return s.ring
    ? <circle cx={s.c[0]} cy={s.c[1]} r={s.r} fill="none" stroke={color} strokeWidth="3" opacity={op} />
    : <circle cx={s.c[0]} cy={s.c[1]} r={s.r} fill={color} opacity={op} />
  return <polygon points={s.pts.map(q => q.join(',')).join(' ')} fill={color} stroke={color} strokeWidth="5" strokeLinejoin="round" opacity={op} />
}

/** The drawing for an exercise: every one gets a pose, read from its name or, failing that, from
 *  the posture its name describes (lib/leafy/figure/classify.ts). Null only without data. */
export function leafyFigureFor(ex) {
  const d = fromExdb(ex)
  const fig = d && classify(d)
  return fig || null
}

export default function LeafyFigure({ ex, id, compact, paused }) {
  const figure = useMemo(() => leafyFigureFor(ex), [ex])
  const [yaw, setYaw] = useState(null)
  const drag = useRef(null)
  const cycle = useCycle(!!paused || reducedMotion())
  if (!figure) return null
  const angle = yaw ?? defaultYaw(figure)
  const scene = scene3At(figure, cycle, angle)
  const dark = darkScheme()
  const turnable = !compact
  const handlers = turnable ? {
    onPointerDown: e => { drag.current = e.clientX; e.currentTarget.setPointerCapture?.(e.pointerId) },
    onPointerMove: e => {
      if (drag.current == null) return
      const dx = e.clientX - drag.current
      drag.current = e.clientX
      setYaw(Math.max(-90, Math.min(90, angle + dx * 0.6)))
    },
    onPointerUp: () => { drag.current = null },
    onPointerCancel: () => { drag.current = null },
  } : {}
  return (
    <div className={'exmedia leafyfig' + (compact ? ' compact' : '') + (turnable ? ' turnable' : '')} id={id}>
      <svg viewBox={`0 0 ${VIEW3.w} ${VIEW3.h}`} role="img" aria-label={exerciseNameFor(ex)} {...handlers}>
        {scene.shapes.map((s, i) => <Shape key={i} s={s} dark={dark} />)}
      </svg>
      {turnable && <div className="leafyfig-cue" aria-live="polite">{t(CUES[scene.phase])}</div>}
    </div>
  )
}
