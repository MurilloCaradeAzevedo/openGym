import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build, nutrition, DATA_CATEGORIES } from '../coach/core/payload.js';

const today = new Date().toISOString().slice(0, 10);
const S = {
  workouts: [], routines: [],
  foodTargets: { kcal: 2500, p: 160, c: null, f: 70, extra: 'dropped' },
  food: [
    { id: 'a', d: today, meal: 'lunch', name: 'Arroz, tipo 1, cozido', g: 150, kcal: 192, p: 3.8, c: 42.2, f: 0.3, secret: 'x' },
    { id: 'b', d: today, meal: 'lunch', name: 'Frango, peito, grelhado', g: 120, kcal: 191, p: 38.4, c: 0, f: 3 },
    { id: 'c', d: '2001-01-01', kcal: 9999 },
    { d: 'not a date', kcal: 1 },
  ]
};

test('nutrition is a named data category', () => {
  assert.ok(DATA_CATEGORIES.includes('nutrition'));
});

test('sums each logged day, keeps only the target fields, and leaves old days out', () => {
  const n = nutrition(S, '2020-01-01', true);
  assert.deepEqual(n.targets, { kcal: 2500, p: 160, c: null, f: 70 });
  assert.deepEqual(n.days, [{ d: today, kcal: 383, p: 42.2, c: 42.2, f: 3.3, items: 2 }]);
  assert.equal(n.lastDayFoods.length, 2);
  assert.equal(n.lastDayFoods[0].secret, undefined);
});

test('ask carries the foods of the day, review only the totals, and no diary means no field', () => {
  assert.equal(build(S, { handle: 'h', kind: 'ask', note: 'o que comer?' }).nutrition.lastDayFoods.length, 2);
  assert.equal(build(S, { handle: 'h', kind: 'review' }).nutrition.lastDayFoods, undefined);
  assert.equal(build({ workouts: [], routines: [] }, { handle: 'h', kind: 'review' }).nutrition, undefined);
});
