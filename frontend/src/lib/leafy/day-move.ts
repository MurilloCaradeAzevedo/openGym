// "Movimento do dia" on Home (Leafy design 3.5): three movements, 10 to 15 minutes, picked from a
// short list of well-known exercises of the catalogue, chosen by hand so the suggestion never lands
// on something odd. The account's own history (workouts, food) stands in for Leafy's day records.
import { suggestFor, levelFor, type Exercise, type Place, type Suggestion } from './suggestion';
import type { DayRecord } from './garden';

type Group = 'pernas' | 'peito' | 'costas' | 'ombros' | 'bracos' | 'abdomen' | 'corpo';
const ALL: Place[] = ['casa', 'academia', 'ar-livre'];
const HOME_OUT: Place[] = ['casa', 'ar-livre'];
const GYM: Place[] = ['academia'];
const m = (id: string, group: Group, kind: Exercise['kind'], places: Place[], level: 1 | 2 | 3 = 1): Exercise =>
  ({ id, name: id, group, kind, places, level });

/** Catalogue ids (catalogue/exercises/<id>.json). */
export const DAY_MOVES: Exercise[] = [
  m('3948', 'pernas', 'forca', ALL), // air squat
  m('0612', 'pernas', 'forca', ALL), // lunge
  m('1460', 'pernas', 'forca', ALL, 2), // walking lunge
  m('7557', 'pernas', 'forca', ['casa']), // wall sit
  m('0662', 'peito', 'forca', ALL, 2), // push-up
  m('0493', 'peito', 'forca', ALL), // incline push-up
  m('0129', 'bracos', 'forca', ['casa', 'academia']), // bench dip, knees bent
  m('0499', 'costas', 'forca', ['ar-livre', 'academia'], 2), // inverted row
  m('0652', 'costas', 'forca', ['ar-livre', 'academia'], 3), // pull-up
  m('3436', 'costas', 'forca', ['casa']), // superman
  m('1241', 'abdomen', 'forca', ['casa']), // bird dog
  m('0276', 'abdomen', 'forca', ['casa', 'academia']), // dead bug
  m('0715', 'abdomen', 'forca', ALL, 2), // side plank
  m('6211', 'abdomen', 'forca', ['casa', 'academia']), // bicycle crunch
  m('0549', 'pernas', 'forca', GYM, 2), // kettlebell swing
  m('0043', 'pernas', 'forca', GYM, 2), // barbell full squat
  m('1459', 'pernas', 'forca', GYM, 2), // dumbbell romanian deadlift
  m('1060', 'pernas', 'forca', GYM, 2), // barbell hip thrust
  m('0289', 'peito', 'forca', GYM), // dumbbell bench press
  m('0025', 'peito', 'forca', GYM, 2), // barbell bench press
  m('0861', 'costas', 'forca', GYM), // cable seated row
  m('0293', 'costas', 'forca', GYM), // dumbbell bent over row
  m('0334', 'ombros', 'forca', GYM), // dumbbell lateral raise
  m('0294', 'bracos', 'forca', GYM), // dumbbell biceps curl
  m('2249', 'bracos', 'forca', GYM), // cable triceps pushdown
  m('3094', 'corpo', 'cardio', HOME_OUT), // jumping jack
  m('0630', 'corpo', 'cardio', ALL, 2), // mountain climber
  m('1160', 'corpo', 'cardio', HOME_OUT, 3), // burpee
  m('3037', 'corpo', 'cardio', HOME_OUT), // butt kicks
  m('2612', 'corpo', 'cardio', ALL, 2), // jump rope
  m('1161', 'corpo', 'cardio', GYM), // rowing machine
  m('0798', 'corpo', 'cardio', GYM), // stationary bike
  m('0945', 'costas', 'alongamento', ALL), // child pose
  m('4580', 'costas', 'alongamento', ALL), // cat cow
  m('1511', 'pernas', 'alongamento', ALL), // hamstring stretch
  m('4300', 'pernas', 'alongamento', ALL), // quadriceps stretch
  m('1980', 'ombros', 'alongamento', ALL), // across chest shoulder stretch
  m('0817', 'bracos', 'alongamento', ALL), // triceps stretch
  m('1377', 'pernas', 'alongamento', ALL), // calf stretch against a wall
  m('1943', 'pernas', 'alongamento', ALL), // pigeon hip stretch
  m('1491', 'costas', 'alongamento', ALL), // supine spinal twist
];

type Dated = { d?: unknown };
const day = (x: Dated) => (typeof x?.d === 'string' && /^\d{4}-\d{2}-\d{2}/.test(x.d) ? x.d.slice(0, 10) : null);

/** The account's days in Leafy's shape: a meal for each day with food, a movement for each workout. */
export function recordsOf(S: { workouts?: Dated[]; food?: Dated[] } | null | undefined): Record<string, DayRecord> {
  const out: Record<string, DayRecord> = {};
  const at = (d: string) => (out[d] ??= { meals: [] });
  for (const f of Array.isArray(S?.food) ? S!.food! : []) {
    const d = day(f);
    if (d && !at(d).meals.length) at(d).meals.push({ rating: 'bem', at: 0 });
  }
  for (const w of Array.isArray(S?.workouts) ? S!.workouts! : []) {
    const d = day(w);
    if (d) at(d).moved = { kind: 'treino', source: 'manual' };
  }
  return out;
}

export function moveOfDay(
  S: { workouts?: Dated[]; food?: Dated[]; leafyPlace?: unknown } | null | undefined,
  now: Date = new Date(),
  variant = 0,
): Suggestion {
  const records = recordsOf(S);
  const place: Place = (ALL as unknown[]).includes(S?.leafyPlace) ? (S!.leafyPlace as Place) : 'casa';
  return suggestFor(DAY_MOVES, { place, cares: ['mexer'], level: levelFor(records, now) }, records, now, variant);
}
