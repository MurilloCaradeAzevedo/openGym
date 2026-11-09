// The Leafy figure in 3D: the 2D poses (skeleton.ts, templates.ts) become a body with a left and a
// right side, limbs that open to the sides where the movement asks for it, and a camera that turns
// around it. Drawn with a plain projection into SVG shapes, sorted back to front: no 3D library.
import type { Muscle } from '../exercises-import.ts';
import { blend, DEPTH, evaluate, GROUND, type Joints, type V } from './skeleton.ts';
import { framesOf, stageOf, TEMPLATES, type Template } from './templates.ts';
import { CABLE_FROM, MUSCLE_SHAPES, stage, type Equipment, type Figure, type Prim as Prim2 } from './scene.ts';

export type V3 = [number, number, number];
type Side = 'L' | 'R';
type Limb = 'sh' | 'el' | 'ha' | 'hip' | 'kn' | 'an' | 'toe';
type Body3 = Record<Side, Record<Limb, V3>> & { neck: V3; head: V3 };

/** What the renderer draws, already projected and in drawing order. `k` is 0 far .. 1 near. */
export type Shape3 =
  | { t: 'line'; a: V; b: V; w: number; role: Role; k: number; op?: number }
  | { t: 'poly'; pts: V[]; role: Role; k: number; op?: number }
  | { t: 'circle'; c: V; r: number; role: Role; k: number; ring?: boolean };
export type Role = 'body' | 'prop' | 'floor' | 'p' | 's';
export type Scene3 = { shapes: Shape3[]; phase: number };

export const VIEW3 = { w: 240, h: 210 };
const HALF: Record<Limb, number> = { sh: 17, el: 19, ha: 19, hip: 9, kn: 10, an: 10, toe: 11 };
const CX = 120;
const PITCH = (12 * Math.PI) / 180;
const SCALE = 0.85;

const to3 = (p: V, z: number): V3 => [p[0] - CX, GROUND - p[1], z];
const undo = (p: V): V => [p[0] - DEPTH[0], p[1] - DEPTH[1]];
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const sub3 = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add3 = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mid3 = (a: V3, b: V3, t = 0.5): V3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

/** Rodrigues: `p` turned by `ang` radians around the unit axis `k` through `o`. */
function turn(p: V3, o: V3, k: V3, ang: number): V3 {
  const v = sub3(p, o);
  const c = Math.cos(ang), s = Math.sin(ang);
  const kv = k[0] * v[0] + k[1] * v[1] + k[2] * v[2];
  const x: V3 = [k[1] * v[2] - k[2] * v[1], k[2] * v[0] - k[0] * v[2], k[0] * v[1] - k[1] * v[0]];
  return add3(o, [v[0] * c + x[0] * s + k[0] * kv * (1 - c), v[1] * c + x[1] * s + k[1] * kv * (1 - c), v[2] * c + x[2] * s + k[2] * kv * (1 - c)]);
}

/** A turn that opens a limb outwards: around the axis lying in the body's side plane, across the limb. */
function opener(root: V3, first: V3, side: Side, deg: number) {
  const d = sub3(first, root);
  const l = Math.hypot(d[0], d[1]) || 1;
  const k: V3 = [-d[1] / l, d[0] / l, 0];
  const out = side === 'R' ? 1 : -1;
  let ang = (deg * Math.PI) / 180;
  if ((turn(first, root, k, ang)[2] - first[2]) * out < 0) ang = -ang;
  return (p: V3) => (deg ? turn(p, root, k, ang) : p);
}

type Spread = { arm: number; leg: number };

/** The body in 3D for one 2D pose. The near side of the 2D drawing is the right side (+z). */
export function lift3(J: Joints, spread: Spread = { arm: 0, leg: 0 }): Body3 {
  const R: Record<Limb, V3> = {
    sh: to3(J.sh, HALF.sh), el: to3(J.el, HALF.el), ha: to3(J.ha, HALF.ha),
    hip: to3(J.hip, HALF.hip), kn: to3(J.kn, HALF.kn), an: to3(J.an, HALF.an), toe: to3(J.toe, HALF.toe),
  };
  const L: Record<Limb, V3> = {
    sh: to3(undo(J.shB), -HALF.sh), el: to3(undo(J.elB), -HALF.el), ha: to3(undo(J.haB), -HALF.ha),
    hip: to3(undo(J.hipB), -HALF.hip), kn: to3(undo(J.knB), -HALF.kn), an: to3(undo(J.anB), -HALF.an), toe: to3(undo(J.toeB), -HALF.toe),
  };
  for (const [side, S] of [['R', R], ['L', L]] as const) {
    const arm = opener(S.sh, S.el, side, spread.arm);
    S.el = arm(S.el); S.ha = arm(S.ha);
    const leg = opener(S.hip, S.kn, side, spread.leg);
    S.kn = leg(S.kn); S.an = leg(S.an); S.toe = leg(S.toe);
  }
  const shC = mid3(R.sh, L.sh);
  const head = to3(J.head, 0);
  return { R, L, head, neck: mid3(shC, head, 0.55) };
}

/** Desce, segura, volta, respira: the share of the cycle each phase takes, and the pose (0..1) in it. */
export function rhythm(cycle: number): { u: number; phase: number } {
  const parts = [0.36, 0.14, 0.32, 0.18];
  const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  let acc = 0;
  for (let i = 0; i < parts.length; i++) {
    if (cycle < acc + parts[i]) {
      const f = (cycle - acc) / parts[i];
      return { u: i === 0 ? ease(f) : i === 1 ? 1 : i === 2 ? 1 - ease(f) : 0, phase: i };
    }
    acc += parts[i];
  }
  return { u: 0, phase: 3 };
}

export const defaultYaw = (fig: Figure) => (TEMPLATES[fig.shape.tpl] as Template).yaw ?? 35;

function camera(yaw: number) {
  const th = (yaw * Math.PI) / 180;
  const cs = Math.cos(th), sn = Math.sin(th);
  const depth = (p: V3) => p[0] * sn + p[2] * cs;
  const proj = (p: V3): V => {
    const d = depth(p);
    return [CX + (p[0] * cs - p[2] * sn) * SCALE, 198 - (p[1] * Math.cos(PITCH) - d * Math.sin(PITCH)) * SCALE];
  };
  /** Whether a surface whose outward normal is `n` faces the camera (or is seen edge-on). */
  const faces = (n: V3) => n[0] * sn + n[2] * cs > -0.3;
  return { proj, depth, faces };
}

/** Convex hull of projected points (monotone chain). */
function hull(pts: V[]): V[] {
  const p = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: V, a: V, b: V) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo: V[] = [], hi: V[] = [];
  for (const q of p) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (const q of p.reverse()) { while (hi.length >= 2 && cross(hi[hi.length - 2], hi[hi.length - 1], q) <= 0) hi.pop(); hi.push(q); }
  return lo.slice(0, -1).concat(hi.slice(0, -1));
}

const SEG_ENDS: Record<string, [Limb, Limb]> = { upper: ['sh', 'el'], fore: ['el', 'ha'], thigh: ['hip', 'kn'], shin: ['kn', 'an'] };
const SEG_2D: Record<string, [keyof Joints, keyof Joints, keyof Joints, keyof Joints]> = {
  upper: ['sh', 'el', 'shB', 'elB'], fore: ['el', 'ha', 'elB', 'haB'], thigh: ['hip', 'kn', 'hipB', 'knB'], shin: ['kn', 'an', 'knB', 'anB'],
  torso: ['hip', 'sh', 'hipB', 'shB'], neck: ['sh', 'head', 'shB', 'head'],
};

/** The figure at one point of its cycle (0..1), seen from `yaw` degrees. */
export function scene3At(fig: Figure, cycle: number, yaw = defaultYaw(fig), focus?: Muscle): Scene3 {
  const t = TEMPLATES[fig.shape.tpl] as Template;
  const { u, phase } = t.still ? { u: 0.5 + 0.5 * Math.sin(2 * Math.PI * cycle), phase: 1 } : rhythm(cycle);
  const [fa, fb] = framesOf(fig.shape);
  const J = evaluate(blend(fa, fb, u));
  const spread = { arm: lerp(t.spread?.arm?.[0] ?? 0, t.spread?.arm?.[1] ?? 0, u), leg: lerp(t.spread?.leg?.[0] ?? 0, t.spread?.leg?.[1] ?? 0, u) };
  const B = lift3(J, spread);
  const view = camera(yaw);
  // A side-lying pose (side plank): everything turns around the body's long axis, at mid height.
  const rollAng = ((t.roll ?? 0) * Math.PI) / 180;
  const roll = (p: V3): V3 => (rollAng
    ? [p[0], 20 + (p[1] - 20) * Math.cos(rollAng) - p[2] * Math.sin(rollAng), (p[1] - 20) * Math.sin(rollAng) + p[2] * Math.cos(rollAng)]
    : p);
  const turnN = (n: V3): V3 => (rollAng
    ? [n[0], n[1] * Math.cos(rollAng) - n[2] * Math.sin(rollAng), n[1] * Math.sin(rollAng) + n[2] * Math.cos(rollAng)]
    : n);
  const cam = { proj: (p: V3) => view.proj(roll(p)), depth: (p: V3) => view.depth(roll(p)), faces: (n: V3) => view.faces(turnN(n)) };
  const items: { d: number; s: Shape3 }[] = [];
  const k = (d: number) => Math.max(0, Math.min(1, (d + 45) / 90));
  const line = (a: V3, b: V3, w: number, role: Role, bias = 0, op?: number) => {
    const d = (cam.depth(a) + cam.depth(b)) / 2;
    items.push({ d: d + bias, s: { t: 'line', a: cam.proj(a), b: cam.proj(b), w, role, k: k(d), op } });
    return d;
  };
  const solid = (pts: V3[], role: Role, bias = 0, op?: number) => {
    const d = pts.reduce((s, p) => s + cam.depth(p), 0) / pts.length;
    items.push({ d: d + bias, s: { t: 'poly', pts: hull(pts.map(cam.proj)), role, k: k(d), op } });
    return d;
  };
  const ball = (c: V3, r: number, role: Role, bias = 0, ring = false) => {
    const d = cam.depth(c);
    items.push({ d: d + bias, s: { t: 'circle', c: cam.proj(c), r, role, k: k(d), ring } });
  };

  // Floor grid, behind everything.
  const floor: Shape3[] = [];
  if (!t.noGround) {
    for (let x = -90; x <= 110; x += 40) floor.push({ t: 'line', a: view.proj([x, 0, -60]), b: view.proj([x, 0, 60]), w: 1, role: 'floor', k: 0 });
    for (let z = -60; z <= 60; z += 30) floor.push({ t: 'line', a: view.proj([-90, 0, z]), b: view.proj([110, 0, z]), w: 1, role: 'floor', k: 0 });
  }

  // Body.
  const limbs: [Limb, Limb, number][] = [['an', 'toe', 7], ['kn', 'an', 11], ['hip', 'kn', 15], ['sh', 'el', 10], ['el', 'ha', 8]];
  const limbDepth: Record<string, number> = {};
  for (const s of ['L', 'R'] as Side[]) {
    for (const [a, b, w] of limbs) limbDepth[s + a + b] = line(B[s][a], B[s][b], w, 'body');
    ball(B[s].ha, 4.5, 'body');
  }
  const up2 = [J.sh[0] - J.hip[0], J.sh[1] - J.hip[1]];
  const ul = Math.hypot(up2[0], up2[1]) || 1;
  const front2: V = [-up2[1] / ul, up2[0] / ul];
  const at = (p: V, f: number): V => [p[0] + front2[0] * f, p[1] + front2[1] * f];
  const torsoPts: V3[] = [];
  for (const z of [1, -1]) {
    const shP = z > 0 ? J.sh : undo(J.shB), hipP = z > 0 ? J.hip : undo(J.hipB);
    torsoPts.push(to3(at(shP, 11), z * HALF.sh), to3(at(shP, -10), z * HALF.sh), to3(at(hipP, 8), z * (HALF.hip + 3)), to3(at(hipP, -10), z * (HALF.hip + 3)));
  }
  const torsoDepth = solid(torsoPts, 'body');
  line(mid3(B.R.sh, B.L.sh), B.neck, 9, 'body');
  ball(B.head, 11, 'body');

  // Muscles: the 2D outline of each one, lifted to both sides and opened like its limb.
  const dim = (m: Muscle) => (focus && focus !== m ? 0.12 : 1);
  const effort = t.still ? 0.85 + 0.15 * Math.sin(2 * Math.PI * cycle) : 0.25 + 0.75 * u;
  const glow = (m: Muscle, role: 'p' | 's') => {
    const ms = MUSCLE_SHAPES[m];
    const op = (role === 'p' ? 0.4 + 0.6 * effort : 0.3 + 0.45 * effort) * dim(m);
    const t0 = Math.max(0, ms.t - ms.l / 2), t1 = Math.min(1, ms.t + ms.l / 2);
    const keys = SEG_2D[ms.seg];
    for (const side of ['R', 'L'] as Side[]) {
      const a2 = side === 'R' ? J[keys[0]] : undo(J[keys[2]]);
      const b2 = side === 'R' ? J[keys[1]] : undo(J[keys[3]]);
      const d2: V = [b2[0] - a2[0], b2[1] - a2[1]];
      const l2 = Math.hypot(d2[0], d2[1]) || 1;
      const p2: V = [-d2[1] / l2, d2[0] / l2];
      const pt = (tt: number): V => [a2[0] + d2[0] * tt + p2[0] * ms.o, a2[1] + d2[1] * tt + p2[1] * ms.o];
      const normal: V3 = [p2[0] * Math.sign(ms.o), -p2[1] * Math.sign(ms.o), 0];
      // Limbs are thin, so a muscle on the far face of one still reads; only the torso hides its back.
      if (ms.o !== 0 && (ms.seg === 'torso' || ms.seg === 'neck') && !cam.faces(normal)) continue;
      const z = side === 'R' ? 1 : -1;
      if (ms.seg === 'torso' || ms.seg === 'neck') {
        if (ms.seg === 'neck' && side === 'L') continue;
        const wz = (tt: number) => (ms.seg === 'neck' ? 4 : lerp(HALF.hip + 2, HALF.sh, tt) * 0.7);
        const A = pt(t0), Bp = pt(t1);
        const quad: V3[] = [to3(A, wz(t0)), to3(Bp, wz(t1)), to3(Bp, -wz(t1)), to3(A, -wz(t0))];
        const qd = quad.reduce((acc, p) => acc + cam.depth(p), 0) / 4;
        items.push({ d: (ms.seg === 'torso' ? torsoDepth : qd) + 0.02, s: { t: 'poly', pts: hull(quad.map(cam.proj)), role, k: 1, op } });
        break;
      }
      const [ra, rb] = SEG_ENDS[ms.seg];
      const half = HALF[ra] * z, halfB = HALF[rb] * z;
      let A3 = to3(pt(t0), lerp(half, halfB, t0)), B3 = to3(pt(t1), lerp(half, halfB, t1));
      // Follow the limb when it opens to the side: the same turn as its bones.
      const isArm = ra === 'sh' || ra === 'el';
      const open = opener(isArm ? to3(side === 'R' ? J.sh : undo(J.shB), HALF.sh * z) : to3(side === 'R' ? J.hip : undo(J.hipB), HALF.hip * z),
        isArm ? to3(side === 'R' ? J.el : undo(J.elB), HALF.el * z) : to3(side === 'R' ? J.kn : undo(J.knB), HALF.kn * z), side, isArm ? spread.arm : spread.leg);
      A3 = open(A3); B3 = open(B3);
      const d = limbDepth[side + ra + rb] ?? 0;
      items.push({ d: d + 0.02, s: { t: 'line', a: cam.proj(A3), b: cam.proj(B3), w: ms.w * 1.8, role, k: 1, op } });
    }
  };
  for (const m of fig.secondary.filter(m => !fig.primary.includes(m))) glow(m, 's');
  for (const m of fig.primary) glow(m, 'p');

  // Equipment in the hands.
  const eq: Equipment = fig.equipment;
  const hands = [B.L.ha, B.R.ha];
  if (eq === 'dumbbell') {
    for (const h of hands) {
      line([h[0], h[1], h[2] - 7], [h[0], h[1], h[2] + 7], 3.5, 'prop', 0.5);
      ball([h[0], h[1], h[2] - 7], 6, 'prop', 0.51);
      ball([h[0], h[1], h[2] + 7], 6, 'prop', 0.51);
    }
  } else if (eq === 'barbell') {
    const c = mid3(B.L.ha, B.R.ha);
    const e1: V3 = [c[0], c[1], B.L.ha[2] - 24], e2: V3 = [c[0], c[1], B.R.ha[2] + 24];
    line(e1, e2, 3, 'prop', 0.5);
    ball(e1, 13, 'prop', 0.51);
    ball(e2, 13, 'prop', 0.51);
  } else if (eq === 'kettlebell') {
    for (const h of hands) ball([h[0], h[1] - 8, h[2]], 7, 'prop', 0.5);
  } else if (eq === 'medicineBall') {
    ball(mid3(B.L.ha, B.R.ha), 9, 'prop', 0.5);
  } else if (eq === 'cable' || eq === 'bands') {
    const from2 = CABLE_FROM[t.cable ?? (eq === 'bands' ? 'low' : 'front')](J.ha);
    for (const h of hands) line(h, to3(from2, h[2]), 1.5, 'prop', 0.5);
  } else if (eq === 'ball') {
    ball([B.R.hip[0], 24, 0], 24, 'prop', -0.5, true);
  } else if (eq === 'roller' && !t.stage) {
    line([B.R.hip[0] + 18, 8, -30], [B.R.hip[0] + 18, 8, 30], 16, 'prop');
  } else if (eq === 'machine' && !t.stage) {
    solid([[-96, 0, -30], [-78, 0, -30], [-96, 150, -30], [-78, 150, -30], [-96, 0, 30], [-78, 0, 30], [-96, 150, 30], [-78, 150, 30]], 'prop');
  }

  // Stage: benches, bars, machines, from the 2D drawing pushed into depth.
  const st = stageOf(fig.shape);
  if (st === 'bar') {
    const h = mid3(B.L.ha, B.R.ha);
    line([h[0], h[1] + 1, -45], [h[0], h[1] + 1, 45], 4, 'prop', -0.5);
  } else if (st === 'bars') {
    for (const z of [-24, 24]) line([B.R.ha[0] - 50, B.R.ha[1] - 3, z], [B.R.ha[0] + 50, B.R.ha[1] - 3, z], 4, 'prop');
  } else if (st) {
    const out: Prim2[] = [];
    // A machine's frame would stand between the camera and the body in 3D: the seat is enough.
    stage(J, st === 'machine' ? 'seat' : st, out);
    const wide = st === 'machine' ? 30 : st === 'bike' || st === 'rower' ? 4 : 14;
    for (const p of out) {
      if (p.k === 'poly') solid(p.pts.flatMap(q => [to3(q, -wide), to3(q, wide)]), 'prop', -0.3);
      else if (p.k === 'line') line(to3(p.a, 0), to3(p.b, 0), p.w, 'prop', -0.3);
      else ball(to3(p.c, 0), p.r, 'prop', -0.3, p.ring);
    }
  }

  items.sort((a, b) => a.d - b.d);
  // Centre the whole movement (both poses, so nothing jumps) in the frame.
  const box = [fa, fb].flatMap((f, i) => {
    const b = lift3(evaluate(f), i ? { arm: t.spread?.arm?.[1] ?? 0, leg: t.spread?.leg?.[1] ?? 0 } : { arm: t.spread?.arm?.[0] ?? 0, leg: t.spread?.leg?.[0] ?? 0 });
    return [...Object.values(b.L), ...Object.values(b.R), b.head].map(cam.proj);
  });
  const xs = box.map(p => p[0]), ys = box.map(p => p[1]);
  const dx = VIEW3.w / 2 - (Math.min(...xs) + Math.max(...xs)) / 2;
  const dy = Math.min(VIEW3.h - 8 - Math.max(...ys), VIEW3.h / 2 + 6 - (Math.min(...ys) + Math.max(...ys)) / 2);
  const mv = (p: V): V => [p[0] + dx, p[1] + dy];
  const shapes = [...floor, ...items.map(i => i.s)].map(sh =>
    sh.t === 'line' ? { ...sh, a: mv(sh.a), b: mv(sh.b) } : sh.t === 'poly' ? { ...sh, pts: sh.pts.map(mv) } : { ...sh, c: mv(sh.c) });
  return { shapes, phase };
}
