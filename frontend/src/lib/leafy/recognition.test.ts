import { describe, it, expect } from 'vitest';
import { recognitionFor } from './recognition';
import type { DayRecord } from './garden';

const sat = new Date(2026, 10, 7, 10);
const grew: DayRecord = { meals: [{ rating: 'bem', at: 'x' }] };

describe('recognitionFor', () => {
  it('nada antes de a pessoa registrar o dia de hoje', () => {
    expect(recognitionFor({ '2026-11-06': grew }, 'Mu', sat)).toBeNull();
  });

  it('primeira folha de todas', () => {
    expect(recognitionFor({ '2026-11-07': grew }, 'Mu', sat)).toEqual({
      id: 'first-leaf', text: 'Sua primeira folha, Mu. Que bom começar.',
    });
  });

  it('acolhe quem voltou depois de 3 dias ou mais sem registrar', () => {
    const r = recognitionFor({ '2026-11-03': grew, '2026-11-07': grew }, 'Mu', sat);
    expect(r?.id).toBe('welcome-back');
    expect(r?.text).toBe('Que bom te ver de novo, Mu.');
  });

  it('celebra a terceira folha da semana', () => {
    const r = recognitionFor({ '2026-11-02': grew, '2026-11-05': grew, '2026-11-07': grew }, 'Mu', sat);
    expect(r?.id).toBe('three-this-week');
    expect(r?.text).toBe('3 dias cuidando de você esta semana.');
  });

  it('nos outros dias, uma frase calma de sempre', () => {
    const r = recognitionFor({ '2026-11-05': grew, '2026-11-06': grew, '2026-11-07': grew, '2026-11-02': grew }, 'Mu', sat);
    expect(r?.id).toBe('daily');
  });

  it('nunca usa culpa nem cobrança', () => {
    const texts = [
      recognitionFor({ '2026-11-07': grew }, 'Mu', sat),
      recognitionFor({ '2026-11-01': grew, '2026-11-07': grew }, 'Mu', sat),
      recognitionFor({ '2026-11-05': grew, '2026-11-06': grew, '2026-11-07': grew, '2026-11-02': grew }, 'Mu', sat),
    ].map(r => r?.text ?? '');
    for (const t of texts) expect(t).not.toMatch(/falhou|perdeu|não pode|precisa|deveria|—/i);
  });
});
