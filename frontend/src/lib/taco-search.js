// Search over the TACO table (taco-data.js), kept apart from nutrition.js so only the screens
// that search load the table.
import { TACO } from './taco-data.js'

const fold = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const FOLDED = TACO.map(r => fold(r[0]))

/** TACO foods whose name holds every word of `query`, accents ignored: [{ name, kcal, p, c, f }] per 100 g. */
export function searchFoods(query, limit = 40) {
  const words = fold(query).split(/[\s,]+/).filter(Boolean)
  if (!words.length) return []
  const out = []
  for (let i = 0; i < TACO.length && out.length < limit; i++) {
    if (words.every(w => FOLDED[i].includes(w))) {
      const [name, kcal, p, c, f] = TACO[i]
      out.push({ name, kcal, p, c, f })
    }
  }
  return out
}
