import { describe, it, expect } from 'vitest';
import { suggestFor, levelFor, type Exercise, type Profile } from './suggestion';
import type { DayRecord } from './garden';

const ex = (id: string, group: string, kind: Exercise['kind'], places: Exercise['places'], level: 1 | 2 | 3 = 1): Exercise =>
  ({ id, name: id, group, kind, places, level });

const catalogue: Exercise[] = [
  ex('agachamento', 'pernas', 'forca', ['casa', 'academia', 'ar-livre']),
  ex('afundo', 'pernas', 'forca', ['casa', 'ar-livre']),
  ex('flexao', 'peito', 'forca', ['casa', 'academia']),
  ex('supino', 'peito', 'forca', ['academia'], 2),
  ex('remada-elastico', 'costas', 'forca', ['casa']),
  ex('puxada', 'costas', 'forca', ['academia']),
  ex('prancha', 'abdomen', 'forca', ['casa', 'academia', 'ar-livre']),
  ex('polichinelo', 'corpo', 'cardio', ['casa', 'ar-livre']),
  ex('corrida-leve', 'corpo', 'cardio', ['ar-livre']),
  ex('esteira', 'corpo', 'cardio', ['academia']),
  ex('alongar-posterior', 'pernas', 'alongamento', ['casa', 'academia', 'ar-livre']),
  ex('alongar-ombro', 'ombros', 'alongamento', ['casa', 'academia', 'ar-livre']),
  ex('respiracao', 'corpo', 'alongamento', ['casa', 'academia', 'ar-livre']),
  ex('agachamento-salto', 'pernas', 'forca', ['casa', 'ar-livre'], 3),
];

const sat = new Date(2026, 10, 7, 10);
const base: Profile = { place: 'casa', cares: ['mexer'], level: 1 };

describe('suggestFor', () => {
  it('sugere 3 movimentos que somam de 10 a 15 minutos', () => {
    const s = suggestFor(catalogue, base, {}, sat);
    expect(s.items).toHaveLength(3);
    expect(s.minutes).toBeGreaterThanOrEqual(10);
    expect(s.minutes).toBeLessThanOrEqual(15);
    expect(new Set(s.items.map(i => i.exercise.id)).size).toBe(3);
  });

  it('usa só exercícios possíveis no local escolhido', () => {
    for (const place of ['casa', 'academia', 'ar-livre'] as const) {
      const s = suggestFor(catalogue, { ...base, place }, {}, sat);
      for (const i of s.items) expect(i.exercise.places).toContain(place);
    }
  });

  it('não passa do nível da pessoa', () => {
    const s = suggestFor(catalogue, { ...base, place: 'academia' }, {}, sat);
    for (const i of s.items) expect(i.exercise.level).toBeLessThanOrEqual(1);
  });

  it('é a mesma o dia todo, e "Outra ideia" traz outra', () => {
    const a = suggestFor(catalogue, base, {}, sat);
    expect(suggestFor(catalogue, base, {}, new Date(2026, 10, 7, 21)).id).toBe(a.id);
    const b = suggestFor(catalogue, base, {}, sat, 1);
    expect(b.id).not.toBe(a.id);
  });

  it('não repete o grupo principal de ontem', () => {
    const yesterday = suggestFor(catalogue, base, {}, new Date(2026, 10, 6, 10));
    const records: Record<string, DayRecord> = {
      '2026-11-06': { meals: [], moved: { kind: 'sugestao', source: 'manual', suggestionId: yesterday.id } },
    };
    const today = suggestFor(catalogue, base, records, sat);
    expect(today.mainGroup).not.toBe(yesterday.mainGroup);
  });

  it('é leve para quem quer descansar', () => {
    const s = suggestFor(catalogue, { ...base, cares: ['descansar'] }, {}, sat);
    expect(s.light).toBe(true);
    for (const i of s.items) expect(i.exercise.kind).toBe('alongamento');
  });

  it('é leve depois de 2 dias ou mais sem se mexer, quando já havia movimento antes', () => {
    const records: Record<string, DayRecord> = {
      '2026-11-04': { meals: [], moved: { kind: 'caminhada', source: 'manual' } },
    };
    expect(suggestFor(catalogue, base, records, sat).light).toBe(true);
  });

  it('a dose sobe com o nível', () => {
    const s1 = suggestFor(catalogue, base, {}, sat);
    const s3 = suggestFor(catalogue, { ...base, level: 3 }, {}, sat);
    const reps = (d: string) => Number(d.match(/x (\d+)/)?.[1] ?? 0);
    const f1 = s1.items.find(i => i.exercise.kind === 'forca');
    const f3 = s3.items.find(i => i.exercise.kind === 'forca');
    if (f1 && f3) expect(reps(f3.dose)).toBeGreaterThan(reps(f1.dose));
  });
});

describe('levelFor', () => {
  const moved = (d: string): [string, DayRecord] => [d, { meals: [], moved: { kind: 'x', source: 'manual' } }];

  it('começa no nível 1', () => {
    expect(levelFor({}, sat)).toBe(1);
  });

  it('sobe um nível depois de 3 semanas seguidas com 3 dias de movimento', () => {
    const weeks = ['2026-10-12', '2026-10-19', '2026-10-26'].flatMap(mon => {
      const [y, m, d] = mon.split('-').map(Number);
      return [0, 2, 4].map(k => new Date(y, m - 1, d + k)).map(x =>
        `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`);
    });
    expect(levelFor(Object.fromEntries(weeks.map(moved)), sat)).toBe(2);
  });

  it('pedir "mais leve" baixa um nível, nunca abaixo de 1', () => {
    expect(levelFor({}, sat, -1)).toBe(1);
  });
});
