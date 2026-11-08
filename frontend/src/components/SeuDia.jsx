// Leafy's "Seu Dia" at the top of Home: did you eat, did you train, and the week as a garden
// (lib/day-garden.js). Calm on purpose: no score, a day grows for anything you did for yourself.
import { t } from '../lib/i18n.js'
import { fmtNum, todayISO } from '../lib/format.js'
import { dayTotals } from '../lib/nutrition.js'
import { gardenWeek } from '../lib/day-garden.js'
import Icon from './Icon.jsx'

function DayCard({ icon, title, sub, done, onClick }) {
  return <button type="button" className={'dia-card' + (done ? ' is-done' : '')} onClick={onClick}>
    <span className="dia-i"><Icon name={done ? 'check' : icon} /></span>
    <span className="dia-t">{title}</span>
    <span className="dia-s">{sub}</span>
  </button>
}

export default function SeuDia({ S, trainedToday, onTrain, onEat }) {
  const food = dayTotals(S.food, todayISO())
  const { days, grown } = gardenWeek(S)
  return <>
    <div className="dia-row">
      <DayCard icon="fork" title={t('Ate')} done={food.items > 0} onClick={onEat}
        sub={food.items > 0 ? fmtNum(food.kcal) + ' kcal' : t('Add food')} />
      <DayCard icon="dumbbell" title={t('Worked out')} done={trainedToday} onClick={onTrain}
        sub={trainedToday ? t('Done') : t('Start')} />
    </div>
    <div className="card garden">
      <div className="row between" style={{ marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>{t('Your garden this week')}</h2>
        <span className="small muted">{t('{0} of 7 days', grown)}</span>
      </div>
      <div className="garden-days" aria-hidden="true">
        {days.map(d => <span key={d.d} className={'garden-day' + (d.grew ? ' grew' : '') + (d.today ? ' today' : '') + (d.future ? ' future' : '')}>
          <Icon name={d.grew ? 'leaf' : 'dot'} />
        </span>)}
      </div>
      <div className="small muted" style={{ marginTop: 12 }}>{t('Every day you show up counts.')}</div>
    </div>
  </>
}
