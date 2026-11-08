// Monta o desenho de um instante do exercício: corpo, músculos em verde, equipamento e cenário.
// Sai como uma lista de formas simples, que o app (react-native-svg) e a galeria desenham igual.
import type { Muscle } from '../exercises-import.ts';
import { add, blend, dir, evaluate, GROUND, sub, type Joints, type V } from './skeleton.ts';
import { framesOf, stageOf, TEMPLATES, type Cable, type Shape, type Template } from './templates.ts';

export type Layer = 'far' | 'back' | 'body' | 'front';
export type Prim =
  | { k: 'line'; a: V; b: V; w: number; layer: Layer; prop?: boolean; thin?: boolean }
  | { k: 'circle'; c: V; r: number; layer: Layer; prop?: boolean; ring?: boolean }
  | { k: 'poly'; pts: V[]; layer: Layer; prop?: boolean };
export type Glow = { c: V; rx: number; ry: number; rot: number; role: 'p' | 's'; op: number; muscle: Muscle };
export type Scene = { prims: Prim[]; glows: Glow[]; ground: boolean };

export type Equipment = 'barbell' | 'dumbbell' | 'kettlebell' | 'cable' | 'bands' | 'machine' | 'ball' | 'medicineBall' | 'roller' | null;

export const MUSCLE_NAMES: Record<Muscle, string> = {
  abdominals: 'Abdômen', abductors: 'Abdutores', adductors: 'Adutores', biceps: 'Bíceps', calves: 'Panturrilha',
  chest: 'Peitoral', forearms: 'Antebraço', glutes: 'Glúteos', hamstrings: 'Posterior de coxa', lats: 'Dorsal',
  'lower back': 'Lombar', 'middle back': 'Meio das costas', neck: 'Pescoço', quadriceps: 'Quadríceps',
  shoulders: 'Ombro', traps: 'Trapézio', triceps: 'Tríceps',
};

type Seg = 'torso' | 'neck' | 'upper' | 'fore' | 'thigh' | 'shin';
const SEGS: Record<Seg, [keyof Joints, keyof Joints]> = {
  torso: ['hip', 'sh'], neck: ['sh', 'head'], upper: ['sh', 'el'], fore: ['el', 'ha'], thigh: ['hip', 'kn'], shin: ['kn', 'an'],
};

/** Onde cada músculo fica no boneco: segmento, posição ao longo dele, desvio (+ = frente no tronco,
 *  + = trás nos membros), comprimento (fração do segmento) e espessura. */
export const MUSCLE_SHAPES: Record<Muscle, { seg: Seg; t: number; o: number; l: number; w: number }> = {
  abdominals: { seg: 'torso', t: 0.32, o: 8, l: 0.5, w: 4.5 },
  chest: { seg: 'torso', t: 0.78, o: 8, l: 0.32, w: 5.5 },
  'lower back': { seg: 'torso', t: 0.24, o: -8, l: 0.4, w: 4 },
  'middle back': { seg: 'torso', t: 0.58, o: -9, l: 0.32, w: 4 },
  lats: { seg: 'torso', t: 0.6, o: -3, l: 0.42, w: 5.5 },
  traps: { seg: 'torso', t: 0.95, o: -7, l: 0.26, w: 4.5 },
  neck: { seg: 'neck', t: 0.35, o: 0, l: 0.6, w: 3.5 },
  shoulders: { seg: 'upper', t: 0.12, o: 0, l: 0.45, w: 6.5 },
  biceps: { seg: 'upper', t: 0.56, o: -3.5, l: 0.62, w: 3.5 },
  triceps: { seg: 'upper', t: 0.55, o: 3.5, l: 0.7, w: 3.5 },
  forearms: { seg: 'fore', t: 0.35, o: 0, l: 0.6, w: 4 },
  glutes: { seg: 'thigh', t: 0.05, o: 6, l: 0.5, w: 8 },
  hamstrings: { seg: 'thigh', t: 0.55, o: 4, l: 0.72, w: 4 },
  quadriceps: { seg: 'thigh', t: 0.52, o: -4, l: 0.8, w: 5 },
  adductors: { seg: 'thigh', t: 0.3, o: 0, l: 0.45, w: 4 },
  abductors: { seg: 'thigh', t: 0.12, o: 1, l: 0.32, w: 5.5 },
  calves: { seg: 'shin', t: 0.3, o: 4, l: 0.5, w: 4.5 },
};

function body(J: Joints, out: Prim[]) {
  const far: Layer = 'far';
  out.push(
    { k: 'line', a: J.anB, b: J.toeB, w: 8, layer: far },
    { k: 'line', a: J.knB, b: J.anB, w: 12, layer: far },
    { k: 'line', a: J.hipB, b: J.knB, w: 17, layer: far },
    { k: 'line', a: J.shB, b: J.elB, w: 11, layer: far },
    { k: 'line', a: J.elB, b: J.haB, w: 9, layer: far },
    { k: 'circle', c: J.haB, r: 4.5, layer: far },
  );
  const up = sub(J.sh, J.hip);
  const l = Math.hypot(up[0], up[1]);
  const front: V = [-up[1] / l, up[0] / l];
  const L: Layer = 'body';
  out.push(
    { k: 'line', a: J.an, b: J.toe, w: 8, layer: L },
    { k: 'line', a: J.kn, b: J.an, w: 12, layer: L },
    { k: 'line', a: J.hip, b: J.kn, w: 17, layer: L },
    { k: 'poly', layer: L, pts: [add(J.sh, front, 13), add(J.hip, front, 9), add(J.hip, front, -11), add(J.sh, front, -12)] },
    { k: 'line', a: J.sh, b: [J.sh[0] + (J.head[0] - J.sh[0]) * 0.55, J.sh[1] + (J.head[1] - J.sh[1]) * 0.55], w: 9, layer: L },
    { k: 'circle', c: J.head, r: 11, layer: L },
    { k: 'line', a: J.sh, b: J.el, w: 11, layer: L },
    { k: 'line', a: J.el, b: J.ha, w: 9, layer: L },
    { k: 'circle', c: J.ha, r: 4.5, layer: L },
  );
}

function glow(J: Joints, m: Muscle, role: 'p' | 's', op: number): Glow {
  const s = MUSCLE_SHAPES[m];
  const [ka, kb] = SEGS[s.seg];
  const a = J[ka], b = J[kb];
  const d = sub(b, a);
  const len = Math.hypot(d[0], d[1]) || 1;
  const p: V = [-d[1] / len, d[0] / len];
  return {
    c: [a[0] + d[0] * s.t + p[0] * s.o, a[1] + d[1] * s.t + p[1] * s.o],
    rx: (len * s.l) / 2,
    ry: s.w,
    rot: (Math.atan2(d[1], d[0]) * 180) / Math.PI,
    role,
    op,
    muscle: m,
  };
}

const CABLE_FROM: Record<Cable, (h: V) => V> = {
  high: h => [h[0] + 70, 22],
  low: h => [h[0] + 80, 186],
  front: h => [228, h[1]],
  over: h => [h[0], 6],
};

function props(J: Joints, eq: Equipment, t: Template, out: Prim[]) {
  const hands: [V, Layer][] = [[J.haB, 'far'], [J.ha, 'front']];
  if (eq === 'barbell') {
    out.push({ k: 'circle', c: J.haB, r: 12, layer: 'far', prop: true, ring: true }, { k: 'circle', c: J.ha, r: 3, layer: 'front', prop: true });
  } else if (eq === 'dumbbell') {
    for (const [h, layer] of hands) out.push({ k: 'circle', c: h, r: 5.5, layer, prop: true });
  } else if (eq === 'kettlebell') {
    for (const [h, layer] of hands) out.push({ k: 'circle', c: add(h, [0, 8]), r: 7, layer, prop: true });
  } else if (eq === 'medicineBall') {
    out.push({ k: 'circle', c: J.ha, r: 9, layer: 'front', prop: true });
  } else if (eq === 'cable' || eq === 'bands') {
    const from = CABLE_FROM[t.cable ?? (eq === 'bands' ? 'low' : 'front')](J.ha);
    out.push({ k: 'line', a: J.ha, b: from, w: 1.5, layer: 'back', prop: true, thin: true });
  } else if (eq === 'ball') {
    out.push({ k: 'circle', c: [J.hip[0], GROUND - 24], r: 24, layer: 'back', prop: true, ring: true });
  } else if (eq === 'roller') {
    out.push({ k: 'circle', c: [J.hip[0] + 18, GROUND - 8], r: 8, layer: 'back', prop: true, ring: true });
  } else if (eq === 'machine' && !t.stage) {
    out.push({ k: 'poly', pts: [[196, 30], [214, 30], [214, 190], [196, 190]], layer: 'back', prop: true });
  }
}

function stage(J: Joints, s: string | undefined, out: Prim[]) {
  const P = (pts: V[]) => out.push({ k: 'poly', pts, layer: 'back', prop: true });
  const Ln = (a: V, b: V, w = 4) => out.push({ k: 'line', a, b, w, layer: 'back', prop: true });
  if (s === 'bench' || s === 'proneBench') {
    const d = sub(J.sh, J.hip);
    const l = Math.hypot(d[0], d[1]);
    const u: V = [d[0] / l, d[1] / l];
    const down: V = s === 'bench' ? [u[1], -u[0]] : [-u[1], u[0]];
    const side = down[1] < 0 ? -1 : 1;
    const n: V = [down[0] * side, down[1] * side];
    const a = add(add(J.hip, n, 11), u, s === 'bench' ? -12 : -40);
    const b = add(add(J.sh, n, 11), u, 8);
    P([a, b, add(b, n, 6), add(a, n, 6)]);
    const mid: V = [(a[0] + b[0]) / 2, Math.max(a[1], b[1]) + 6];
    Ln(mid, [mid[0], GROUND]);
  } else if (s === 'seat' || s === 'machine') {
    const y = J.hip[1] + 10;
    P([[J.hip[0] - 22, y], [J.hip[0] + 24, y], [J.hip[0] + 24, y + 6], [J.hip[0] - 22, y + 6]]);
    Ln([J.hip[0], y + 6], [J.hip[0], GROUND]);
    if (s === 'machine') P([[196, 40], [214, 40], [214, 190], [196, 190]]);
  } else if (s === 'lowSeat') {
    P([[J.hip[0] - 22, J.hip[1] + 10], [J.hip[0] + 22, J.hip[1] + 10], [J.hip[0] + 22, GROUND], [J.hip[0] - 22, GROUND]]);
  } else if (s === 'bar') {
    Ln([60, J.ha[1] + 1], [170, J.ha[1] + 1], 4);
  } else if (s === 'bars') {
    Ln([70, J.ha[1] + 3], [170, J.ha[1] + 3], 4);
  } else if (s === 'sled') {
    const n = dir(-40 + 90);
    Ln(add(J.an, n, -18), add(J.an, n, 18), 5);
    const u = sub(J.sh, J.hip);
    const l = Math.hypot(u[0], u[1]);
    const back: V = [u[1] / l, -u[0] / l];
    const seatA = add(add(J.hip, back, 13), u, -0.2);
    Ln(seatA, add(add(J.sh, back, 13), u, 0.1), 5);
    Ln(add(seatA, [0, 4]), [seatA[0] + 20, GROUND], 4);
  } else if (s === 'pad') {
    P([[J.hip[0] - 8, J.hip[1] + 6], [J.hip[0] + 14, J.hip[1] + 6], [J.hip[0] + 14, J.hip[1] + 14], [J.hip[0] - 8, J.hip[1] + 14]]);
    Ln([J.hip[0], J.hip[1] + 14], [J.hip[0] - 40, GROUND]);
  } else if (s === 'thrustBench') {
    P([[40, 158], [82, 158], [82, GROUND], [40, GROUND]]);
  } else if (s === 'bike') {
    Ln([J.hip[0], J.hip[1] + 8], [140, 155], 4);
    Ln([140, 155], [165, 104], 4);
    out.push({ k: 'circle', c: [140, 155], r: 12, layer: 'back', prop: true, ring: true });
    Ln([120, GROUND], [175, GROUND], 5);
  } else if (s === 'rower') {
    Ln([40, 180], [205, 180], 4);
    out.push({ k: 'circle', c: [212, 168], r: 12, layer: 'back', prop: true, ring: true });
  } else if (s === 'roller') {
    out.push({ k: 'circle', c: [118, GROUND - 9], r: 9, layer: 'back', prop: true, ring: true });
  }
}

/** Ida e volta suave: 0 no início, 1 no fim do movimento, 0 de novo. */
export const motion = (cycle: number) => {
  const t = 0.5 - 0.5 * Math.cos(2 * Math.PI * cycle);
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
};

export type Figure = { shape: Shape; equipment: Equipment; primary: Muscle[]; secondary: Muscle[] };

/** O desenho num ponto do ciclo (0 a 1). `focus` deixa só um músculo aceso. */
export function sceneAt(fig: Figure, cycle: number, focus?: Muscle): Scene {
  const t = TEMPLATES[fig.shape.tpl] as Template;
  const [a, b] = framesOf(fig.shape);
  const u = motion(cycle);
  const J = evaluate(blend(a, b, u));
  const prims: Prim[] = [];
  stage(J, stageOf(fig.shape), prims);
  body(J, prims);
  props(J, fig.equipment, t, prims);
  const effort = t.still ? 0.85 + 0.15 * Math.sin(2 * Math.PI * cycle) : 0.25 + 0.75 * u;
  const dim = (m: Muscle) => (focus && focus !== m ? 0.12 : 1);
  const glows = [
    ...fig.secondary.filter(m => !fig.primary.includes(m)).map(m => glow(J, m, 's', (0.3 + 0.45 * effort) * dim(m))),
    ...fig.primary.map(m => glow(J, m, 'p', (0.4 + 0.6 * effort) * dim(m))),
  ];
  return { prims, glows, ground: !t.noGround };
}

export { evaluate, blend, framesOf };
