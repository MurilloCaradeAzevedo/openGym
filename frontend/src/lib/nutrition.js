// The food diary: entries in S.food, one per thing eaten, with daily targets in S.foodTargets.
//
//   S.food        = [{ id, d: 'YYYY-MM-DD', t, meal, name, g, kcal, p, c, f }]
//   S.foodTargets = { kcal, p, c, f } | null
//
// Macros are grams (p protein, c carbohydrate, f fat). `g` is the portion in grams for an entry
// from the TACO table and null for one typed in by hand. The TACO search is in taco-search.js, so
// the home screen can sum a day without loading the table.

export const MEALS = ['breakfast', 'lunch', 'snack', 'dinner']
export const MACROS = ['kcal', 'p', 'c', 'f']

const r1 = x => Math.round((+x || 0) * 10) / 10

/** A diary entry for `grams` of a per-100 g food. */
export function entryFromFood(food, grams, extra = {}) {
  const k = (+grams || 0) / 100
  return { ...extra, name: food.name, g: r1(grams), kcal: Math.round(food.kcal * k), p: r1(food.p * k), c: r1(food.c * k), f: r1(food.f * k) }
}

/** Kcal and macros summed over the entries of day `d`. */
export function dayTotals(food, d) {
  const out = { kcal: 0, p: 0, c: 0, f: 0, items: 0 }
  for (const e of food || []) {
    if (!e || e.d !== d) continue
    for (const m of MACROS) out[m] += +e[m] || 0
    out.items++
  }
  for (const m of MACROS) out[m] = m === 'kcal' ? Math.round(out[m]) : r1(out[m])
  return out
}

/** One line per logged day from `from` (inclusive), oldest first. */
export function dailySeries(food, from) {
  const days = [...new Set((food || []).filter(e => e && e.d && (!from || e.d >= from)).map(e => e.d))].sort()
  return days.map(d => ({ d, ...dayTotals(food, d) }))
}

/** The meal a new entry most likely belongs to at this hour. */
export const mealAt = (date = new Date()) => {
  const h = date.getHours()
  return h < 10 ? 'breakfast' : h < 15 ? 'lunch' : h < 19 ? 'snack' : 'dinner'
}
