// Importação do free-exercise-db (Unlicense) para o formato do app (design 3.5).
// Só os dados entram: as fotos da origem não são seguras e ficam de fora.

export const MUSCLES = [
  'abdominals', 'abductors', 'adductors', 'biceps', 'calves', 'chest', 'forearms', 'glutes',
  'hamstrings', 'lats', 'lower back', 'middle back', 'neck', 'quadriceps', 'shoulders', 'traps',
  'triceps',
] as const;
export type Muscle = (typeof MUSCLES)[number];

export type DbExercise = {
  id: string;
  name: string;
  force: 'push' | 'pull' | 'static' | null;
  level: 1 | 2 | 3;
  mechanic: 'compound' | 'isolation' | null;
  equipment: string | null;
  primary: Muscle[];
  secondary: Muscle[];
  category: string;
  steps: string[];
};

const LEVEL: Record<string, 1 | 2 | 3> = { beginner: 1, intermediate: 2, expert: 3 };

const muscles = (list: unknown, id: string): Muscle[] =>
  (Array.isArray(list) ? list : []).map(m => {
    if (!(MUSCLES as readonly string[]).includes(m)) throw new Error(`Músculo desconhecido "${m}" em ${id}`);
    return m as Muscle;
  });

export function normalize(raw: Record<string, any>[]): DbExercise[] {
  const seen = new Set<string>();
  const out: DbExercise[] = [];
  for (const r of raw) {
    if (!r.id || !r.name || seen.has(r.id)) continue;
    seen.add(r.id);
    out.push({
      id: r.id,
      name: r.name,
      force: r.force ?? null,
      level: LEVEL[r.level] ?? 1,
      mechanic: r.mechanic ?? null,
      equipment: r.equipment ?? null,
      primary: muscles(r.primaryMuscles, r.id),
      secondary: muscles(r.secondaryMuscles, r.id),
      category: r.category ?? 'strength',
      steps: Array.isArray(r.instructions) ? r.instructions : [],
    });
  }
  return out;
}
