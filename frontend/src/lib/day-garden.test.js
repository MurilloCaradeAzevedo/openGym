import { describe, it, expect } from 'vitest'
import { gardenWeek, greetingFor } from './day-garden.js'

// Saturday 7 November 2026; with Monday weeks the week runs 2 to 8 November.
const sat = new Date(2026, 10, 7, 10)

describe('gardenWeek', () => {
  it('counts a day once for any of: a workout, a meal, a weigh-in', () => {
    const S = {
      workouts: [{ d: '2026-11-02' }, { d: '2026-11-02' }],
      food: [{ d: '2026-11-03', kcal: 300 }],
      bodyweight: [{ d: '2026-11-05', w: 80 }],
    }
    const g = gardenWeek(S, sat)
    expect(g.days.map(x => x.d)).toEqual(['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06', '2026-11-07', '2026-11-08'])
    expect(g.grown).toBe(3)
    expect(g.days[0]).toMatchObject({ trained: true, ate: false, grew: true })
    expect(g.days[1]).toMatchObject({ trained: false, ate: true, grew: true })
    expect(g.days[3].grew).toBe(true)
  })

  it('leaves out days of other weeks and marks the days still to come', () => {
    const S = { workouts: [{ d: '2026-11-01' }, { d: '2026-11-09' }], food: [], bodyweight: [] }
    const g = gardenWeek(S, sat)
    expect(g.grown).toBe(0)
    expect(g.days[5].today).toBe(true)
    expect(g.days[6].future).toBe(true)
    expect(g.days[4].future).toBe(false)
  })

  it('follows a Sunday week start', () => {
    const g = gardenWeek({ weekStart: 0, workouts: [], food: [], bodyweight: [] }, sat)
    expect(g.days[0].d).toBe('2026-11-01')
  })

  it('reads a profile with no food or body weight yet', () => {
    expect(gardenWeek({ workouts: [{ d: '2026-11-04' }] }, sat).grown).toBe(1)
  })
})

describe('greetingFor', () => {
  it('picks morning, afternoon or evening by the hour', () => {
    expect(greetingFor(new Date(2026, 0, 1, 5))).toBe('morning')
    expect(greetingFor(new Date(2026, 0, 1, 11, 59))).toBe('morning')
    expect(greetingFor(new Date(2026, 0, 1, 12))).toBe('afternoon')
    expect(greetingFor(new Date(2026, 0, 1, 18))).toBe('evening')
    expect(greetingFor(new Date(2026, 0, 1, 2))).toBe('evening')
  })
})
