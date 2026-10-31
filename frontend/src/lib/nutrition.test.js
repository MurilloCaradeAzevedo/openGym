import { describe, expect, it } from 'vitest'
import { entryFromFood, dayTotals, dailySeries } from './nutrition.js'
import { searchFoods } from './taco-search.js'

describe('searchFoods', () => {
  it('finds TACO foods by every word, ignoring accents and case', () => {
    const hits = searchFoods('FEIJAO carioca cozido')
    expect(hits.length).toBeGreaterThan(0)
    expect(hits[0].name).toMatch(/Feijão, carioca, cozido/)
    expect(hits[0].kcal).toBeGreaterThan(0)
  })
  it('returns nothing for an empty query', () => {
    expect(searchFoods('  ')).toEqual([])
  })
})

describe('entryFromFood', () => {
  it('scales a per-100 g food to the portion', () => {
    const e = entryFromFood({ name: 'X', kcal: 128, p: 2.5, c: 28.1, f: 0.2 }, 150, { meal: 'lunch' })
    expect(e).toEqual({ meal: 'lunch', name: 'X', g: 150, kcal: 192, p: 3.8, c: 42.2, f: 0.3 })
  })
})

describe('dayTotals and dailySeries', () => {
  const food = [
    { d: '2026-10-29', kcal: 500, p: 30, c: 50, f: 10 },
    { d: '2026-10-30', kcal: 300.4, p: 20.05, c: 10, f: 5 },
    { d: '2026-10-30', kcal: 200, p: 10, c: 40, f: 2 },
    null,
  ]
  it('sums one day', () => {
    expect(dayTotals(food, '2026-10-30')).toEqual({ kcal: 500, p: 30.1, c: 50, f: 7, items: 2 })
  })
  it('lists logged days from a date, oldest first', () => {
    expect(dailySeries(food, '2026-10-30').map(x => x.d)).toEqual(['2026-10-30'])
    expect(dailySeries(food).map(x => x.d)).toEqual(['2026-10-29', '2026-10-30'])
  })
})
