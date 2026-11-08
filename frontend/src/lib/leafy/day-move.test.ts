import { describe, expect, it } from 'vitest';
import { EXIDX } from '../exercises.js';
import { DAY_MOVES, moveOfDay, recordsOf } from './day-move';

const sat = new Date(2026, 10, 7, 10);

describe('movimento do dia', () => {
  it('every movement on the list is a real exercise of the catalogue', () => {
    for (const e of DAY_MOVES) expect([e.id, !!EXIDX[e.id]]).toEqual([e.id, true]);
  });

  it('suggests three movements of 10 to 15 minutes, for a new account at home', () => {
    const s = moveOfDay({}, sat);
    expect(s.items).toHaveLength(3);
    expect(s.minutes).toBeGreaterThanOrEqual(10);
    expect(s.minutes).toBeLessThanOrEqual(15);
    for (const i of s.items) expect(i.exercise.places).toContain('casa');
  });

  it('follows the place the person chose, and ignores one it does not know', () => {
    for (const i of moveOfDay({ leafyPlace: 'academia' }, sat).items) expect(i.exercise.places).toContain('academia');
    for (const i of moveOfDay({ leafyPlace: 'lua' }, sat).items) expect(i.exercise.places).toContain('casa');
  });

  it('"another idea" gives a different set', () => {
    expect(moveOfDay({}, sat, 1).id).not.toBe(moveOfDay({}, sat, 0).id);
  });

  it('turns light after a stop, reading the workouts the person logged', () => {
    const s = moveOfDay({ workouts: [{ d: '2026-11-03' }] }, sat);
    expect(s.light).toBe(true);
    for (const i of s.items) expect(i.exercise.kind).toBe('alongamento');
  });

  it('reads workouts and food as days, and skips entries without a usable date', () => {
    const r = recordsOf({ workouts: [{ d: '2026-11-07T08:00' }, { d: 42 }, {}], food: [{ d: '2026-11-06' }, { d: '2026-11-06' }] });
    expect(Object.keys(r).sort()).toEqual(['2026-11-06', '2026-11-07']);
    expect(r['2026-11-07'].moved).toBeTruthy();
    expect(r['2026-11-06'].meals).toHaveLength(1);
    expect(recordsOf(null)).toEqual({});
  });
});
