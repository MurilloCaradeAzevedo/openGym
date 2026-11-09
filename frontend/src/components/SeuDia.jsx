// Leafy's "Seu Dia" at the top of Home: did you eat, did you train, and the week as a garden
// (lib/day-garden.js). Calm on purpose: no score, a day grows for anything you did for yourself.
import { t } from '../lib/i18n.js'
import { fmtNum, todayISO, DAYS } from '../lib/format.js'

const DAYS_SHORT = DAYS
import { dayTotals } from '../lib/nutrition.js'
import { gardenWeek } from '../lib/day-garden.js'
import Icon from './Icon.jsx'
import { recognitionFor } from '../lib/leafy/recognition.ts'
import { recordsOf } from '../lib/leafy/day-move.ts'

// The gentle line under the garden (Leafy design 3.4): the first leaf, a welcome back, three days
// this week, or one of four calm phrases that changes by the day. Nothing when today is still empty.
const DAILY = ['A day cared for. See you tomorrow.', 'One more leaf in your garden.', 'Little by little is still a way.', 'Glad you stopped by.']
function recognitionLine(S, name) {
  const r = recognitionFor(recordsOf(S), name || '')
  if (!r) return t('Every day you show up counts.')
  if (r.id === 'first-leaf') return name ? t('Your first leaf, {0}. A good start.', name) : t('Your first leaf. A good start.')
  if (r.id === 'welcome-back') return name ? t('Good to see you again, {0}.', name) : t('Good to see you again.')
  if (r.id === 'three-this-week') return t('3 days caring for yourself this week.')
  return t(DAILY[r.n ?? 0])
}

function DayCard({ icon, title, sub, done, onClick }) {
  return <button type="button" className={'dia-card' + (done ? ' is-done' : '')} onClick={onClick}>
    <span className="dia-i"><Icon name={done ? 'check' : icon} /></span>
    <span className="dia-t">{title}</span>
    <span className="dia-s">{sub}</span>
  </button>
}

export default function SeuDia({ S, name, trainedToday, onTrain, onEat }) {
  const food = dayTotals(S.food, todayISO())
  const { days, grown } = gardenWeek(S)
  return <>
    <div className="dia-row">
      <DayCard icon="fork" title={t('Ate')} done={food.items > 0} onClick={onEat}
        sub={food.items > 0 ? fmtNum(food.kcal) + ' kcal' : t('Add food')} />
      <DayCard icon="dumbbell" title={t('Worked out')} done={trainedToday} onClick={onTrain}
        sub={trainedToday ? t('Done') : t('Start')} />
    </div>
    <h4 className="sec row between"><span>{t('Your garden this week')}</span><span>{t('{0} of 7 days', grown)}</span></h4>
    <div className="card garden">
      <div className="garden-days" aria-hidden="true">
        {days.map(d => <span key={d.d} className={'garden-day' + (d.grew ? ' grew' : '') + (d.today ? ' today' : '') + (d.future ? ' future' : '')}>
          <Icon name="leaf" /><span className="garden-dn">{t(DAYS_SHORT[new Date(d.d + 'T12:00').getDay()])}</span>
        </span>)}
      </div>
      <div className="small muted" style={{ marginTop: 12 }}>{recognitionLine(S, name)}</div>
    </div>
  </>
}
