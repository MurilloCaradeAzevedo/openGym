// Plano por pessoa e checagem central de recursos (design, seção 8, monetização).
// Na v1 todo mundo é "gratis"; quando o premium existir, só esta tabela muda.

export type Plan = 'gratis' | 'premium';

export const FEATURES = ['seu-dia', 'jardim', 'lembrete', 'amigos', 'exercicios', 'sugestao', 'coach'] as const;
export type Feature = (typeof FEATURES)[number];

// Recursos que exigem premium. Seu Dia, jardim e lembrete nunca entram aqui.
const PREMIUM_ONLY: ReadonlySet<Feature> = new Set<Feature>(['coach']);

export function can(plan: Plan, feature: Feature): boolean {
  return plan === 'premium' || !PREMIUM_ONLY.has(feature);
}
