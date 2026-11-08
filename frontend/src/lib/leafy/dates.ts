// Datas do Leafy: um dia é a data local da pessoa, guardada como 'AAAA-MM-DD'.
// A conta é feita ao meio-dia UTC, para o horário de verão nunca mudar o dia.

export type DayKey = string;

const pad = (n: number) => String(n).padStart(2, '0');

/** O dia local de `date`, como 'AAAA-MM-DD'. */
export function dayKey(date: Date = new Date()): DayKey {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

const toUtcNoon = (key: DayKey) => {
  const [y, m, d] = key.split('-').map(Number);
  return Date.UTC(y, m - 1, d, 12);
};

const fromUtc = (ms: number): DayKey => {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
};

const DAY = 24 * 60 * 60 * 1000;

/** `key` mais `n` dias (n pode ser negativo). */
export function addDays(key: DayKey, n: number): DayKey {
  return fromUtc(toUtcNoon(key) + n * DAY);
}

/** Quantos dias de `a` até `b` (negativo se `b` vem antes). */
export function daysBetween(a: DayKey, b: DayKey): number {
  return Math.round((toUtcNoon(b) - toUtcNoon(a)) / DAY);
}

/** Os 7 dias da semana de `date`, de segunda a domingo. */
export function weekDays(date: Date = new Date()): DayKey[] {
  const fromMonday = (date.getDay() + 6) % 7;
  const monday = addDays(dayKey(date), -fromMonday);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

/** Todos os dias do mês de `date`. */
export function monthDays(date: Date = new Date()): DayKey[] {
  const total = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const first = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-01`;
  return Array.from({ length: total }, (_, i) => addDays(first, i));
}

/** Hoje e os 2 dias anteriores podem ser editados; o futuro não (design 3.2). */
export function isEditable(key: DayKey, now: Date = new Date()): boolean {
  const ago = daysBetween(key, dayKey(now));
  return ago >= 0 && ago <= 2;
}
