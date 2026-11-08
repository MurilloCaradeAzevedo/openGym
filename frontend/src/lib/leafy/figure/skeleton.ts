// Esqueleto do boneco do Leafy, visto de lado e virado para a direita (design 3.5).
// Ângulos em graus no sistema do SVG: 0 = frente (direita), 90 = para baixo, -90 = para cima.
// Desenho próprio: nada aqui vem de imagem de terceiros.

export type V = [number, number];

export const LEN = { torso: 50, neck: 19, upper: 28, fore: 25, thigh: 42, shin: 40, foot: 15 };
export const GROUND = 190;
export const VIEW = { w: 240, h: 212, top: -12 };
/** O lado de trás (braço e perna do outro lado) aparece deslocado, para dar profundidade. */
export const DEPTH: V = [-5, -3];

const rad = (d: number) => (d * Math.PI) / 180;
export const dir = (deg: number): V => [Math.cos(rad(deg)), Math.sin(rad(deg))];
export const add = (a: V, b: V, k = 1): V => [a[0] + b[0] * k, a[1] + b[1] * k];
export const sub = (a: V, b: V): V => [a[0] - b[0], a[1] - b[1]];
export const dist = (a: V, b: V) => Math.hypot(a[0] - b[0], a[1] - b[1]);

export type Anchor = 'feet' | 'toe' | 'hip' | 'sh';

/** Uma pose. Braços e pernas vêm por ângulo ou por alvo (a mão ou o tornozelo vai até um ponto). */
export type Frame = {
  anchor: Anchor;
  /** Onde o ponto de apoio fica: tornozelo (feet), ponta do pé (toe), quadril (hip) ou ombro (sh). */
  at: V;
  torso: number;
  neck?: number;
  thigh: number;
  shin: number;
  foot: number;
  thighB?: number;
  shinB?: number;
  footB?: number;
  arm?: number;
  fore?: number;
  armB?: number;
  foreB?: number;
  /** Mão no referencial do tronco: [para a frente do peito, ao longo do tronco rumo à cabeça]. */
  handT?: V;
  /** Mão num ponto fixo da cena. */
  hand?: V;
  handB?: V;
  /** Tornozelo num ponto fixo (só com apoio no quadril ou no ombro). */
  ankle?: V;
  ankleB?: V;
  /** Encolher os ombros (rumo à cabeça). */
  lift?: number;
  bendArm?: 1 | -1;
  bendLeg?: 1 | -1;
};

export type Joints = {
  hip: V; sh: V; head: V; el: V; ha: V; kn: V; an: V; toe: V;
  hipB: V; shB: V; elB: V; haB: V; knB: V; anB: V; toeB: V;
};

/** Dois ossos (braço ou perna) indo de `root` até `target`. Devolve [articulação do meio, ponta]. */
export function ik(root: V, target: V, a: number, b: number, bend: 1 | -1): [V, V] {
  const d = sub(target, root);
  const reach = Math.min(a + b - 0.001, Math.max(Math.abs(a - b) + 0.001, Math.hypot(d[0], d[1])));
  const base = Math.atan2(d[1], d[0]);
  const cos = (a * a + reach * reach - b * b) / (2 * a * reach);
  const ang = base + bend * Math.acos(Math.max(-1, Math.min(1, cos)));
  const mid: V = [root[0] + a * Math.cos(ang), root[1] + a * Math.sin(ang)];
  return [mid, [root[0] + reach * Math.cos(base), root[1] + reach * Math.sin(base)]];
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Mistura duas poses. Campo que só existe numa delas vale como está. */
export function blend(a: Frame, b: Frame, t: number): Frame {
  const out: Record<string, unknown> = { ...a };
  for (const k of Object.keys(b) as (keyof Frame)[]) {
    const x = a[k] as unknown;
    const y = b[k] as unknown;
    if (typeof x === 'number' && typeof y === 'number') out[k] = lerp(x, y, t);
    else if (Array.isArray(x) && Array.isArray(y)) out[k] = [lerp(x[0], y[0], t), lerp(x[1], y[1], t)];
    else if (x === undefined) out[k] = y;
  }
  return out as Frame;
}

function arm(sh: V, torsoDir: V, f: Frame, far: boolean): [V, V] {
  const bend = f.bendArm ?? 1;
  const hand = far ? f.handB ?? (f.hand && add(f.hand, DEPTH)) : f.hand;
  if (hand) return ik(sh, hand, LEN.upper, LEN.fore, bend);
  if (f.handT) {
    const front: V = [-torsoDir[1], torsoDir[0]];
    const base = far ? sub(sh, DEPTH) : sh;
    let target = add(add(base, front, f.handT[0]), torsoDir, f.handT[1]);
    if (far) target = add(target, DEPTH);
    return ik(sh, target, LEN.upper, LEN.fore, bend);
  }
  const ua = (far ? f.armB : undefined) ?? f.arm ?? 90;
  const fa = (far ? f.foreB : undefined) ?? f.fore ?? 90;
  const el = add(sh, dir(ua), LEN.upper);
  return [el, add(el, dir(fa), LEN.fore)];
}

function legFK(hip: V, thigh: number, shin: number, foot: number): [V, V, V] {
  const kn = add(hip, dir(thigh), LEN.thigh);
  const an = add(kn, dir(shin), LEN.shin);
  return [kn, an, add(an, dir(foot), LEN.foot)];
}

/** Posição de todas as articulações numa pose. */
export function evaluate(f: Frame): Joints {
  const up = dir(f.torso);
  let hip: V;
  let kn: V, an: V, toe: V;
  if (f.anchor === 'feet' || f.anchor === 'toe') {
    [kn, an, toe] = legFK([0, 0], f.thigh, f.shin, f.foot);
    const shift = sub(f.at, f.anchor === 'feet' ? an : toe);
    hip = shift;
    kn = add(kn, shift);
    an = add(an, shift);
    toe = add(toe, shift);
  } else {
    hip = f.anchor === 'hip' ? f.at : add(f.at, up, -LEN.torso);
    if (f.ankle) {
      [kn, an] = ik(hip, f.ankle, LEN.thigh, LEN.shin, f.bendLeg ?? -1);
      toe = add(an, dir(f.foot), LEN.foot);
    } else [kn, an, toe] = legFK(hip, f.thigh, f.shin, f.foot);
  }
  const shBase = add(hip, up, LEN.torso);
  const head = add(shBase, dir(f.neck ?? f.torso), LEN.neck);
  const sh = add(shBase, up, f.lift ?? 0);
  const [el, ha] = arm(sh, up, f, false);

  const hipB = add(hip, DEPTH);
  const shB = add(sh, DEPTH);
  const [elB, haB] = arm(shB, up, f, true);
  let knB: V, anB: V, toeB: V;
  const farAnkle = f.ankleB ?? (f.ankle && f.thighB === undefined ? f.ankle : undefined);
  if (farAnkle) {
    [knB, anB] = ik(hipB, add(farAnkle, DEPTH), LEN.thigh, LEN.shin, f.bendLeg ?? -1);
    toeB = add(anB, dir(f.footB ?? f.foot), LEN.foot);
  } else if (f.thighB === undefined && f.shinB === undefined && f.footB === undefined) {
    knB = add(kn, DEPTH);
    anB = add(an, DEPTH);
    toeB = add(toe, DEPTH);
  } else [knB, anB, toeB] = legFK(hipB, f.thighB ?? f.thigh, f.shinB ?? f.shin, f.footB ?? f.foot);

  return { hip, sh, head, el, ha, kn, an, toe, hipB, shB, elB, haB, knB, anB, toeB };
}
