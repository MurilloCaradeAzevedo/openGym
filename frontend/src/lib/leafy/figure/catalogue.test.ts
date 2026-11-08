import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { fromCatalogue } from '../catalogue-adapter';
import { MUSCLES } from '../exercises-import';
import { classify } from './classify';
import { sceneAt } from './scene';

const dir = new URL('../../../../../catalogue/exercises/', import.meta.url);
const entries = readdirSync(dir).filter(f => f.endsWith('.json')).map(f => JSON.parse(readFileSync(new URL(f, dir), 'utf8')));
const all = entries.map(fromCatalogue).filter((e): e is NonNullable<typeof e> => !!e);

describe('catálogo do openGym com o boneco', () => {
  it('cobre os 5.632 exercícios com dados (as variantes ficam de fora)', () => {
    expect(all.length).toBe(5632);
  });

  it('todo músculo traduzido é um dos 17 do boneco', () => {
    for (const e of all) for (const m of [...e.primary, ...e.secondary]) expect(MUSCLES).toContain(m);
  });

  it('todo exercício ganha molde e um desenho completo', () => {
    for (const e of all) {
      const fig = classify(e);
      const s = sceneAt(fig, 0.5);
      expect([e.name, s.prims.length > 10]).toEqual([e.name, true]);
    }
  });

  it('a maioria é reconhecida pelo nome', () => {
    const guessed = all.filter(e => classify(e).reason === 'muscle').length;
    expect(guessed / all.length).toBeLessThan(0.25);
  });
});
