import { useEffect, useId, useMemo, useState } from 'react'
import { fromExdb } from '../lib/leafy/catalogue-adapter.ts'
import { classify } from '../lib/leafy/figure/classify.ts'
import { sceneAt } from '../lib/leafy/figure/scene.ts'
import { GROUND, VIEW } from '../lib/leafy/figure/skeleton.ts'
import { exerciseNameFor } from '../lib/i18n.js'

// Leafy's own drawing of an exercise: a side-view figure that moves between two poses, with the
// muscles it works lit in green (strong for the main ones, light for those that help). Drawn here
// from the exercise's data; nothing in it is a photo or an animation made by anyone else.
const TONE = { body: 'rgba(128,128,128,.55)', far: 'rgba(128,128,128,.28)', prop: 'rgba(128,128,128,.8)', line: 'rgba(128,128,128,.35)' }
const GLOW = { p: '#2E7D32', s: '#66BB6A' }
const PERIOD = 3200

function useCycle(still) {
  const [cycle, setCycle] = useState(0.5)
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
  return still ? 0.5 : cycle
}

const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

function Shape({ p, color }) {
  if (p.k === 'line') return <line x1={p.a[0]} y1={p.a[1]} x2={p.b[0]} y2={p.b[1]} stroke={color} strokeWidth={p.w} strokeLinecap="round" />
  if (p.k === 'circle') return p.ring
    ? <circle cx={p.c[0]} cy={p.c[1]} r={p.r} fill="none" stroke={color} strokeWidth="3" />
    : <circle cx={p.c[0]} cy={p.c[1]} r={p.r} fill={color} />
  return <polygon points={p.pts.map(q => q.join(',')).join(' ')} fill={color} stroke={color} strokeWidth="4" strokeLinejoin="round" />
}

export default function LeafyFigure({ ex, id, compact, paused }) {
  const figure = useMemo(() => { const d = fromExdb(ex); return d ? classify(d) : null }, [ex])
  const cycle = useCycle(!!paused || reducedMotion())
  const maskId = 'lf' + useId().replace(/:/g, '')
  if (!figure) return null
  const scene = sceneAt(figure, cycle)
  const tone = p => (p.prop ? TONE.prop : p.layer === 'far' ? TONE.far : TONE.body)
  return (
    <div className={'exmedia leafyfig' + (compact ? ' compact' : '')} id={id}>
      <svg viewBox={`0 ${VIEW.top} ${VIEW.w} ${VIEW.h}`} role="img" aria-label={exerciseNameFor(ex)}>
        <defs>
          <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y={VIEW.top} width={VIEW.w} height={VIEW.h}>
            {scene.prims.filter(p => p.layer === 'body' && !p.prop).map((p, i) => <Shape key={i} p={p} color="#fff" />)}
          </mask>
        </defs>
        {scene.ground && <line x1="0" y1={GROUND} x2={VIEW.w} y2={GROUND} stroke={TONE.line} strokeWidth="1.5" />}
        {scene.prims.filter(p => p.layer !== 'front').map((p, i) => <Shape key={i} p={p} color={tone(p)} />)}
        <g mask={`url(#${maskId})`}>
          {scene.glows.map(g => (
            <ellipse key={g.role + g.muscle} cx={g.c[0]} cy={g.c[1]} rx={g.rx} ry={g.ry}
              transform={`rotate(${g.rot} ${g.c[0]} ${g.c[1]})`} fill={GLOW[g.role]} opacity={g.op} />
          ))}
        </g>
        {scene.prims.filter(p => p.layer === 'front').map((p, i) => <Shape key={'f' + i} p={p} color={tone(p)} />)}
      </svg>
    </div>
  )
}
