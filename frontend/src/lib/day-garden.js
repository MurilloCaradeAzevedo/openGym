// Leafy's "Seu Dia": the week drawn as a garden. A day grows when you did anything for yourself
// that day (trained, logged a meal, weighed in), not only when you hit a goal: a good day is one
// you did not give up on.
import { isoOf, weekStartOf, weekDayOffset } from './format.js'

const datesOf = list => new Set((list || []).map(x => x?.d).filter(d => typeof d === 'string'))

/** The seven days of the week `now` falls in, each with what was done, and how many grew. */
export function gardenWeek(S, now = new Date()) {
  const trained = datesOf(S?.workouts), ate = datesOf(S?.food), weighed = datesOf(S?.bodyweight)
  const today = isoOf(now)
  // Noon, so a DST change cannot move a day.
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12)
  start.setDate(start.getDate() - weekDayOffset(now.getDay(), weekStartOf(S)))
  const days = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(start)
    day.setDate(start.getDate() + i)
    const d = isoOf(day)
    const t = trained.has(d), a = ate.has(d)
    return { d, trained: t, ate: a, grew: t || a || weighed.has(d), today: d === today, future: d > today }
  })
  return { days, grown: days.filter(x => x.grew).length }
}

/** 'morning' from 5:00, 'afternoon' from 12:00, 'evening' from 18:00 until 5:00. */
export function greetingFor(now = new Date()) {
  const h = now.getHours()
  return h >= 5 && h < 12 ? 'morning' : h >= 12 && h < 18 ? 'afternoon' : 'evening'
}
