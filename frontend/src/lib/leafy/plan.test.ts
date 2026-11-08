import { describe, it, expect } from 'vitest';
import { can, FEATURES } from './plan';

describe('plano por pessoa', () => {
  it('Seu Dia, jardim e lembrete são sempre grátis', () => {
    for (const f of ['seu-dia', 'jardim', 'lembrete'] as const) {
      expect(can('gratis', f)).toBe(true);
      expect(can('premium', f)).toBe(true);
    }
  });

  it('na v1, amigos, exercícios e sugestão também ficam liberados no grátis', () => {
    for (const f of ['amigos', 'exercicios', 'sugestao'] as const) expect(can('gratis', f)).toBe(true);
  });

  it('o coach de IA é só do premium', () => {
    expect(can('gratis', 'coach')).toBe(false);
    expect(can('premium', 'coach')).toBe(true);
  });

  it('um plano desconhecido vale como grátis', () => {
    expect(can('qualquer' as never, 'jardim')).toBe(true);
    expect(can('qualquer' as never, 'coach')).toBe(false);
  });

  it('todo recurso tem regra', () => {
    for (const f of FEATURES) expect(typeof can('gratis', f)).toBe('boolean');
  });
});
