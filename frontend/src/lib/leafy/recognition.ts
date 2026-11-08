// Reconhecimento gentil (design 3.4 e seção 8): uma frase curta depois que o dia de hoje cresceu.
// Voz de amigo calmo, sem culpa, emoji só em ocasiões raras.
import { dayKey, daysBetween, weekDays, type DayKey } from './dates';
import { dayGrew, type DayRecord } from './garden';

export type Recognition = { id: 'first-leaf' | 'welcome-back' | 'three-this-week' | 'daily'; text: string; n?: number };

const DAILY = [
  'Dia cuidado. Até amanhã.',
  'Mais uma folha no seu jardim.',
  'Pouco a pouco também é caminho.',
  'Que bom que você passou por aqui.',
];

export function recognitionFor(
  records: Record<DayKey, DayRecord>,
  nickname: string,
  now: Date = new Date(),
): Recognition | null {
  const today = dayKey(now);
  if (!dayGrew(records[today])) return null;

  const grownBefore = Object.keys(records).filter(d => d < today && dayGrew(records[d])).sort();
  if (grownBefore.length === 0) return { id: 'first-leaf', text: `Sua primeira folha, ${nickname}. Que bom começar.` };

  const last = grownBefore[grownBefore.length - 1];
  if (daysBetween(last, today) >= 4) return { id: 'welcome-back', text: `Que bom te ver de novo, ${nickname}.` };

  const thisWeek = weekDays(now).filter(d => dayGrew(records[d])).length;
  if (thisWeek === 3) return { id: 'three-this-week', text: '3 dias cuidando de você esta semana.' };

  // A frase muda a cada dia, sem sorteio: o mesmo dia mostra sempre a mesma.
  const n = Number(today.replace(/-/g, '')) % DAILY.length;
  return { id: 'daily', text: DAILY[n], n };
}
