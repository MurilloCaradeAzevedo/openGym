// O jardim: cada dia em que a pessoa cuidou de si (comeu ou se mexeu) ganha uma folha.
// Nada murcha com o tempo; desfazer os registros de um dia só tira a folha daquele dia.
import { dayKey, monthDays, weekDays, type DayKey } from './dates';

export type MealRating = 'bem' | 'mais-ou-menos' | 'nao-muito';
export type Source = 'manual' | 'automatico';

export type DayRecord = {
  meals: { rating: MealRating; at: string; photo?: string }[];
  moved?: { kind: string; minutes?: number; source: Source; suggestionId?: string };
  waterCups?: number;
};

export type GardenDay = { day: DayKey; grew: boolean; today: boolean; future: boolean };

/** Se o dia ganhou folha. Água sozinha não conta (é meta opcional, não cuidado do dia). */
export function dayGrew(record: DayRecord | undefined): boolean {
  return !!record && (record.meals.length > 0 || !!record.moved);
}

/** A semana ou o mês de `now`, dia a dia, e quantos dias cresceram. */
export function gardenOf(
  records: Record<DayKey, DayRecord>,
  span: 'week' | 'month',
  now: Date = new Date(),
): { days: GardenDay[]; grown: number } {
  const today = dayKey(now);
  const keys = span === 'week' ? weekDays(now) : monthDays(now);
  const days = keys.map(day => ({ day, grew: dayGrew(records[day]), today: day === today, future: day > today }));
  return { days, grown: days.filter(d => d.grew).length };
}
