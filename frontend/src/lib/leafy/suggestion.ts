// Sugestão do dia (design 3.5 e seção 8): 3 movimentos, 10 a 15 minutos, só do local escolhido,
// sem repetir o grupo principal de ontem, leve para quem quer descansar ou ficou parado.
// Determinística: o mesmo dia mostra a mesma sugestão; "Outra ideia" pede a variante seguinte.
import { addDays, dayKey, weekDays, type DayKey } from './dates';
import type { DayRecord } from './garden';

export type Place = 'casa' | 'academia' | 'ar-livre';
export type Care = 'comer' | 'mexer' | 'descansar';
export type Level = 1 | 2 | 3;

export type Exercise = {
  id: string;
  name: string;
  group: string;
  kind: 'forca' | 'cardio' | 'alongamento';
  places: Place[];
  level: Level;
};

export type Profile = { place: Place; cares: Care[]; level: Level };

export type Suggestion = {
  id: string;
  mainGroup: string;
  light: boolean;
  minutes: number;
  items: { exercise: Exercise; dose: string; minutes: number }[];
};

const REPS: Record<Level, number> = { 1: 10, 2: 12, 3: 15 };
const MINUTES = { forca: 4, cardio: 5, alongamento: 4 } as const;

const doseOf = (e: Exercise, level: Level) =>
  e.kind === 'forca' ? `3 x ${REPS[level]} repetições` : e.kind === 'cardio' ? '5 min' : '2 x 45 s';

// Um número estável a partir de um texto, para escolher sem sorteio.
const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
const pick = <T,>(list: T[], seed: number): T | undefined => list[seed % Math.max(1, list.length)];

const groupOfId = (id: string | undefined) => id?.split('|')[0];

/** Se a pessoa ficou 2 dias ou mais sem se mexer, depois de já ter se mexido nas últimas 2 semanas. */
function stalled(records: Record<DayKey, DayRecord>, today: DayKey): boolean {
  const moved = (d: DayKey) => !!records[d]?.moved;
  if (moved(addDays(today, -1)) || moved(addDays(today, -2))) return false;
  for (let i = 3; i <= 14; i++) if (moved(addDays(today, -i))) return true;
  return false;
}

export function suggestFor(
  catalogue: Exercise[],
  profile: Profile,
  records: Record<DayKey, DayRecord>,
  now: Date = new Date(),
  variant = 0,
): Suggestion {
  const today = dayKey(now);
  const seed = hash(`${today}#${variant}`);
  const usable = catalogue.filter(e => e.places.includes(profile.place) && e.level <= profile.level);
  const light = profile.cares.includes('descansar') || stalled(records, today);
  const yesterdayGroup = groupOfId(records[addDays(today, -1)]?.moved?.suggestionId);

  const chosen: Exercise[] = [];
  const take = (pool: Exercise[], s: number) => {
    const e = pick(pool.filter(x => !chosen.includes(x)), s);
    if (e) chosen.push(e);
    return e;
  };

  let mainGroup: string;
  if (light) {
    const stretches = usable.filter(e => e.kind === 'alongamento');
    for (let i = 0; i < 3; i++) take(stretches, seed + i);
    mainGroup = 'leve';
  } else {
    const strength = usable.filter(e => e.kind === 'forca');
    const groups = [...new Set(strength.map(e => e.group))].filter(g => g !== yesterdayGroup);
    mainGroup = pick(groups, seed) ?? 'corpo';
    take(strength.filter(e => e.group === mainGroup), seed);
    take(strength.filter(e => e.group !== mainGroup), seed >> 3);
    take(usable.filter(e => e.kind === 'cardio'), seed >> 5) ?? take(usable.filter(e => e.kind === 'alongamento'), seed >> 5);
  }
  // Base pequena num local: completa com o que houver, para sempre sair com 3.
  while (chosen.length < 3 && take(usable, seed + chosen.length)) {}

  const items = chosen.map(exercise => ({
    exercise,
    dose: doseOf(exercise, profile.level),
    minutes: MINUTES[exercise.kind],
  }));
  return {
    id: `${mainGroup}|${today}|${variant}`,
    mainGroup,
    light,
    minutes: items.reduce((t, i) => t + i.minutes, 0),
    items,
  };
}

/**
 * O nível sobe devagar: um nível a cada 3 semanas seguidas (já terminadas) com 3 dias ou mais
 * de movimento, até 3. `adjust` é o "mais leve" da pessoa (-1), nunca abaixo de 1.
 */
export function levelFor(records: Record<DayKey, DayRecord>, now: Date = new Date(), adjust = 0): Level {
  let monday = weekDays(now)[0];
  let streak = 0;
  for (let w = 0; w < 9; w++) {
    monday = addDays(monday, -7);
    const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
    if (days.filter(d => records[d]?.moved).length >= 3) streak++;
    else break;
  }
  const level = 1 + Math.floor(streak / 3) + adjust;
  return Math.min(3, Math.max(1, level)) as Level;
}
