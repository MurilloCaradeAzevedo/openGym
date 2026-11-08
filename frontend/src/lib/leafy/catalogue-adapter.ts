// Traduz uma entrada do catálogo do openGym (catalogue/exercises/*.json) para o formato que o
// classificador do boneco entende. O catálogo usa o vocabulário do ExerciseDB; o boneco usa 17 músculos.
import type { DbExercise, Muscle } from './exercises-import';

const MUSCLE: Record<string, Muscle> = {
  abs: 'abdominals', core: 'abdominals', obliques: 'abdominals', 'lower abs': 'abdominals', abdominals: 'abdominals',
  glutes: 'glutes',
  quads: 'quadriceps', quadriceps: 'quadriceps', 'hip flexors': 'quadriceps',
  delts: 'shoulders', shoulders: 'shoulders', 'rear deltoids': 'shoulders', 'rotator cuff': 'shoulders', deltoids: 'shoulders',
  pectorals: 'chest', chest: 'chest', 'upper chest': 'chest', 'serratus anterior': 'chest',
  lats: 'lats', 'latissimus dorsi': 'lats',
  biceps: 'biceps', brachialis: 'biceps',
  triceps: 'triceps',
  calves: 'calves', soleus: 'calves', shins: 'calves', ankles: 'calves', feet: 'calves', 'ankle stabilizers': 'calves',
  'upper back': 'middle back', rhomboids: 'middle back', back: 'middle back',
  hamstrings: 'hamstrings',
  spine: 'lower back', 'lower back': 'lower back',
  forearms: 'forearms', 'grip muscles': 'forearms', 'wrist flexors': 'forearms', 'wrist extensors': 'forearms', hands: 'forearms', wrists: 'forearms',
  abductors: 'abductors',
  adductors: 'adductors', groin: 'adductors', 'inner thighs': 'adductors',
  traps: 'traps', trapezius: 'traps', 'levator scapulae': 'traps',
  sternocleidomastoid: 'neck',
};

const EQUIPMENT: Record<string, string | null> = {
  dumbbell: 'dumbbell', cable: 'cable', barbell: 'barbell', 'ez barbell': 'e-z curl bar', 'olympic barbell': 'barbell',
  'trap bar': 'barbell', landmine: 'barbell', 'leverage machine': 'machine', 'smith machine': 'machine',
  'sled machine': 'machine', assisted: 'machine', band: 'bands', 'resistance band': 'bands', kettlebell: 'kettlebells',
  'stability ball': 'exercise ball', 'bosu ball': 'exercise ball', 'medicine ball': 'medicine ball',
  roller: 'foam roll', 'wheel roller': 'foam roll', 'massage ball': 'foam roll',
};

const CATEGORY: Record<string, string> = {
  stretching: 'stretching', mobility: 'stretching', yoga: 'stretching', cardio: 'cardio', plyometrics: 'plyometrics',
};

const muscles = (list: unknown[]): Muscle[] => [...new Set(list.map(m => MUSCLE[String(m)]).filter(Boolean))] as Muscle[];

type Entry = { id: string; name: string; target?: string; secondaryMuscles?: string[]; equipment?: string; category?: string; instructions?: string[] };

/** Devolve null para as entradas sem dados (variantes femininas, que só apontam para o exercício base). */
export function fromCatalogue(e: Entry): DbExercise | null {
  if (!e.name || !e.target) return null;
  const primary = muscles([e.target]);
  const secondary = muscles(e.secondaryMuscles ?? []).filter(m => !primary.includes(m));
  return {
    id: e.id,
    name: e.name,
    force: null,
    level: 1,
    mechanic: null,
    equipment: EQUIPMENT[e.equipment ?? ''] ?? null,
    primary,
    secondary,
    category: CATEGORY[e.category ?? ''] ?? 'strength',
    steps: e.instructions ?? [],
  };
}

type Exdb = { id: string; n: string; tg?: string; sm?: string[]; eq?: string; cat?: string };

/** The same translation for a record of the app's own exercise list (lib/exercises-data.js). */
export function fromExdb(e: Exdb): DbExercise | null {
  return fromCatalogue({ id: e.id, name: e.n, target: e.tg, secondaryMuscles: e.sm, equipment: e.eq, category: e.cat });
}
