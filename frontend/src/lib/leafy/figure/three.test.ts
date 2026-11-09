import { describe, expect, it } from 'vitest';
import { lift3, rhythm, scene3At, VIEW3 } from './three';
import { evaluate, blend, LEN } from './skeleton';
import { framesOf, TEMPLATES, type TemplateId } from './templates';
import type { Figure } from './scene';

const ids = Object.keys(TEMPLATES) as TemplateId[];
const fig = (tpl: TemplateId, extra: Partial<Figure> = {}): Figure =>
  ({ shape: { tpl }, equipment: null, primary: ['quadriceps', 'chest'], secondary: ['triceps', 'abdominals'], ...extra });
const dist3 = (a: number[], b: number[]) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

describe('figure 3D', () => {
  it('keeps every bone its length on both sides, opened or not', () => {
    for (const id of ids) {
      const [a, b] = framesOf({ tpl: id });
      const J = evaluate(blend(a, b, 0.5));
      for (const spread of [{ arm: 0, leg: 0 }, { arm: 80, leg: 30 }]) {
        const B = lift3(J, spread);
        for (const s of ['L', 'R'] as const) {
          expect(dist3(B[s].kn, B[s].an)).toBeCloseTo(LEN.shin, 0);
          expect(dist3(B[s].el, B[s].ha)).toBeCloseTo(LEN.fore, 0);
        }
      }
    }
  });

  it('opens a lateral raise to the sides, not to the front', () => {
    const [a, b] = framesOf({ tpl: 'lateralRaise' });
    const top = lift3(evaluate(blend(a, b, 1)), { arm: 86, leg: 0 });
    expect(top.R.ha[2]).toBeGreaterThan(50);
    expect(top.L.ha[2]).toBeLessThan(-50);
    expect(Math.abs(top.R.ha[0])).toBeLessThan(20);
  });

  it.each(ids)('%s draws on screen from the side, at three quarters and from the front', id => {
    for (const yaw of [0, 35, 90]) for (const c of [0, 0.3, 0.6]) {
      const s = scene3At(fig(id, { equipment: 'dumbbell' }), c, yaw);
      expect(s.shapes.length).toBeGreaterThan(12);
      for (const sh of s.shapes) {
        const pts = sh.t === 'line' ? [sh.a, sh.b] : sh.t === 'poly' ? sh.pts : [sh.c];
        for (const p of pts) {
          expect(Number.isFinite(p[0]) && Number.isFinite(p[1])).toBe(true);
          expect(p[0]).toBeGreaterThan(-40);
          expect(p[0]).toBeLessThan(VIEW3.w + 40);
          expect(p[1]).toBeGreaterThan(-40);
          expect(p[1]).toBeLessThan(VIEW3.h + 10);
        }
      }
    }
  });

  it('paces the movement: down, hold, back, rest', () => {
    expect(rhythm(0).phase).toBe(0);
    expect(rhythm(0.4)).toEqual({ u: 1, phase: 1 });
    expect(rhythm(0.6).phase).toBe(2);
    expect(rhythm(0.95)).toEqual({ u: 0, phase: 3 });
  });
});
