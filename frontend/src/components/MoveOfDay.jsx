import { useMemo, useState } from 'react'
import { t, exerciseNameFor, exerciseNameClass } from '../lib/i18n.js'
import { EXIDX } from '../lib/exercises.js'
import { moveOfDay } from '../lib/leafy/day-move.ts'
import LeafyFigure from './LeafyFigure.jsx'

// Leafy's "movement of the day" (design 3.5): three movements for about 10 to 15 minutes, each
// with its drawing and its dose. "Another idea" asks for the next set; a tap opens the exercise.
function dose(item) {
  const k = item.exercise.kind
  if (k === 'cardio') return t('{0} min', item.minutes)
  if (k === 'alongamento') return t('{0} × {1} s', 2, 45)
  return t('{0} × {1} reps', 3, Number(/x (\d+)/.exec(item.dose)?.[1] || 10))
}

export default function MoveOfDay({ S, onOpen }) {
  const [variant, setVariant] = useState(0)
  const s = useMemo(() => moveOfDay(S, new Date(), variant), [S.workouts, S.food, S.leafyPlace, variant])
  const items = s.items.filter(i => EXIDX[i.exercise.id])
  if (!items.length) return null
  return <div className="card move-day">
    <div className="row between" style={{ marginBottom: 8 }}>
      <h2 style={{ margin: 0 }}>{t('Movement of the day')}</h2>
      <span className="small muted">{t('{0} min', s.minutes)}</span>
    </div>
    {items.map(i => {
      const ex = EXIDX[i.exercise.id]
      return <button key={ex.id} type="button" className="move-row" onClick={() => onOpen?.(ex)}>
        <span className="move-fig"><LeafyFigure ex={ex} compact /></span>
        <span className="move-txt"><span className={'move-name ' + exerciseNameClass(ex)}>{exerciseNameFor(ex)}</span><span className="small muted">{dose(i)}</span></span>
      </button>
    })}
    <button type="button" className="btn move-next" onClick={() => setVariant(v => v + 1)}>{t('Another idea')}</button>
  </div>
}
