import { describe, it, expect } from 'vitest';
import { dayGrew, gardenOf, type DayRecord } from './garden';

const sat = new Date(2026, 10, 7, 10);
const meal = (rating: 'bem' | 'mais-ou-menos' | 'nao-muito') => ({ rating, at: '2026-11-07T12:00:00' });

describe('dayGrew', () => {
  it('cresce com qualquer registro: comer ou se mexer', () => {
    expect(dayGrew({ meals: [meal('nao-muito')] })).toBe(true);
    expect(dayGrew({ meals: [], moved: { kind: 'caminhada', source: 'manual' } })).toBe(true);
  });

  it('não cresce sem registro, ou depois de desfazer tudo', () => {
    expect(dayGrew(undefined)).toBe(false);
    expect(dayGrew({ meals: [] })).toBe(false);
  });

  it('água sozinha não conta como cuidado do dia', () => {
    expect(dayGrew({ meals: [], waterCups: 5 })).toBe(false);
  });
});

describe('gardenOf', () => {
  const records: Record<string, DayRecord> = {
    '2026-11-02': { meals: [meal('bem')] },
    '2026-11-04': { meals: [], moved: { kind: 'academia', minutes: 40, source: 'manual' } },
    '2026-11-07': { meals: [meal('mais-ou-menos')] },
    '2026-10-31': { meals: [meal('bem')] },
  };

  it('marca os dias da semana que cresceram, hoje e o futuro', () => {
    const g = gardenOf(records, 'week', sat);
    expect(g.days.map(d => d.day)).toEqual([
      '2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06', '2026-11-07', '2026-11-08',
    ]);
    expect(g.days.map(d => d.grew)).toEqual([true, false, true, false, false, true, false]);
    expect(g.grown).toBe(3);
    expect(g.days[5].today).toBe(true);
    expect(g.days[6].future).toBe(true);
    expect(g.days[4].future).toBe(false);
  });

  it('no mês conta só os dias daquele mês', () => {
    const g = gardenOf(records, 'month', sat);
    expect(g.days).toHaveLength(30);
    expect(g.grown).toBe(3);
  });

  it('dias passados sem registro ficam vazios, nunca mortos', () => {
    const g = gardenOf({}, 'week', sat);
    expect(g.days.every(d => d.grew === false)).toBe(true);
    expect(Object.keys(g.days[0]).sort()).toEqual(['day', 'future', 'grew', 'today']);
  });
});
