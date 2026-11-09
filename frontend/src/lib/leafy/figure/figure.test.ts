import { describe, expect, it } from 'vitest';
import { fromCatalogue } from '../catalogue-adapter';
import { MUSCLES } from '../exercises-import';
import { classify } from './classify';
import { MUSCLE_SHAPES, sceneAt } from './scene';
import { dist, evaluate, blend, GROUND, ik, LEN, VIEW } from './skeleton';
import { framesOf, TEMPLATES, type Template, type TemplateId } from './templates';

const byName = (name: string, target = 'abs', equipment = 'body weight', category = 'strength') => {
  const e = fromCatalogue({ id: 'x', name, target, equipment, category });
  if (!e) throw new Error(name);
  return classify(e).shape.tpl;
};

describe('ik', () => {
  it('mantém o tamanho dos ossos e alcança o alvo quando dá', () => {
    const [mid, end] = ik([0, 0], [30, 30], 28, 25, 1);
    expect(dist([0, 0], mid)).toBeCloseTo(28, 3);
    expect(dist(mid, end)).toBeCloseTo(25, 3);
    expect(end[0]).toBeCloseTo(30, 2);
  });

  it('estica sem quebrar quando o alvo está longe demais', () => {
    const [mid, end] = ik([0, 0], [200, 0], 28, 25, 1);
    expect(dist(mid, end)).toBeCloseTo(25, 2);
    expect(end[0]).toBeLessThanOrEqual(53);
  });
});

describe('moldes', () => {
  const ids = Object.keys(TEMPLATES) as TemplateId[];
  const holds = [undefined, 'side', 'back', 'overhead'] as const;

  it.each(ids)('%s: poses válidas, ossos do tamanho certo, dentro da tela e acima do chão', id => {
    const t = TEMPLATES[id] as Template;
    const lying = id === 'crunch' || id === 'situp';
    for (const hold of lying ? (['head', 'cross', 'chest'] as const) : holds) {
      for (const seated of [false, true]) {
        const [a, b] = framesOf({ tpl: id, hold, seated });
        for (const u of [0, 0.25, 0.5, 0.75, 1]) {
          const J = evaluate(blend(a, b, u));
          for (const [k, p] of Object.entries(J)) {
            expect([k, Number.isFinite(p[0]) && Number.isFinite(p[1])]).toEqual([k, true]);
            expect(p[0]).toBeGreaterThanOrEqual(0);
            expect(p[0]).toBeLessThanOrEqual(VIEW.w);
            expect(p[1]).toBeGreaterThanOrEqual(VIEW.top);
          }
          expect(dist(J.hip, J.kn)).toBeCloseTo(LEN.thigh, 1);
          expect(dist(J.kn, J.an)).toBeCloseTo(LEN.shin, 1);
          expect(dist(J.el, J.ha)).toBeCloseTo(LEN.fore, 1);
          if (!t.noGround) {
            for (const k of ['hip', 'kn', 'an', 'toe', 'ha', 'el'] as const) expect([id, k, J[k][1] <= GROUND + 1]).toEqual([id, k, true]);
            expect(J.head[1] + 11).toBeLessThanOrEqual(GROUND + 2);
          }
        }
      }
    }
  });
});

describe('classificador', () => {
  it.each([
    ['Barbell Squat', 'squat'],
    ['Barbell Deadlift', 'deadlift'],
    ['Romanian Deadlift', 'hinge'],
    ['Pushups', 'pushup'],
    ['Pullups', 'pullup'],
    ['Barbell Bench Press - Medium Grip', 'benchPress'],
    ['Dumbbell Bicep Curl', 'curl'],
    ['Standing Military Press', 'press'],
    ['Side Lateral Raise', 'lateralRaise'],
    ['Bent Over Barbell Row', 'row'],
    ['Seated Cable Rows', 'seatedRow'],
    ['Wide-Grip Lat Pulldown', 'pulldown'],
    ['Leg Press', 'legPress'],
    ['Lying Leg Curls', 'legCurl'],
    ['Leg Extensions', 'legExt'],
    ['Standing Calf Raises', 'calfRaise'],
    ['Crunches', 'crunch'],
    ['Plank', 'plank'],
    ['Dumbbell Lunges', 'lunge'],
    ['Kettlebell One-Legged Deadlift', 'hingeOneLeg'],
    ['Triceps Pushdown', 'pushdown'],
    ['Barbell Hip Thrust', 'hipThrust'],
    ['Butt Lift (Bridge)', 'bridge'],
    ['Hanging Leg Raise', 'hangLegRaise'],
    ['Dips - Triceps Version', 'dip'],
    ['Mountain Climbers', 'climber'],
    ['Barbell Shrug', 'shrug'],
    ['Power Clean', 'clean'],
  ])('%s vira %s', (name, tpl) => {
    expect(byName(name)).toBe(tpl);
  });
});

it('todo músculo da base tem lugar no boneco', () => {
  for (const m of MUSCLES) expect(MUSCLE_SHAPES[m]).toBeDefined();
});
