// Moldes de movimento: cada um é um par de poses (início e fim). O app vai e volta entre elas.
import type { Frame, V } from './skeleton.ts';

export type Stage =
  | 'bench' | 'seat' | 'lowSeat' | 'bar' | 'bars' | 'sled' | 'pad' | 'proneBench' | 'bike'
  | 'rower' | 'roller' | 'thrustBench' | 'machine';
export type Cable = 'high' | 'low' | 'front' | 'over';

export type Template = {
  frames: [Frame, Frame];
  stage?: Stage;
  /** Sem chão (pendurado na barra). */
  noGround?: boolean;
  /** Postura mantida: só respira, o esforço fica alto o tempo todo. */
  still?: boolean;
  cable?: Cable;
  /** Os braços vêm da pegada (barra nas costas, halter ao lado...). */
  hold?: boolean;
  /** Só a parte de cima se mexe; pode ser feito em pé ou sentado. */
  upper?: boolean;
};

export type Hold = 'side' | 'front' | 'back' | 'frontRack' | 'chest' | 'overhead' | 'hips' | 'head' | 'cross' | 'push';

export const HOLDS: Record<Hold, Partial<Frame>> = {
  side: { arm: 90, fore: 90 },
  front: { arm: 0, fore: 0 },
  back: { handT: [-5, 4] },
  frontRack: { handT: [11, 3] },
  chest: { handT: [15, -12] },
  overhead: { handT: [1, 52] },
  hips: { handT: [4, -42] },
  head: { handT: [-2, 20] },
  cross: { handT: [10, -8] },
  push: { handT: [45, -2] },
};

const STAND: Frame = { anchor: 'feet', at: [112, 185], torso: -90, thigh: 90, shin: 90, foot: 0 };
const SEAT: Frame = { anchor: 'hip', at: [110, 146], torso: -90, thigh: -2, shin: 92, foot: 0 };
const BENT: Frame = { anchor: 'feet', at: [120, 185], torso: -15, thigh: 75, shin: 95, foot: 0 };
const LIE_BENCH: Frame = { anchor: 'feet', at: [150, 185], torso: 180, thigh: 10, shin: 100, foot: 0 };
const LIE_FLOOR: Frame = { anchor: 'hip', at: [120, 178], torso: 180, thigh: -60, shin: 82, foot: 0, arm: 5, fore: 0 };
const HANG: Frame = { anchor: 'hip', at: [110, 112], torso: -90, thigh: 80, shin: 110, foot: 60, hand: [113, 10] };
const QUAD: Frame = { anchor: 'hip', at: [115, 140], torso: 0, thigh: 90, shin: 180, foot: 180, thighB: 90, shinB: 180, footB: 180, hand: [167, 186] };
const PLANK: Frame = { anchor: 'toe', at: [40, 189], torso: -18, thigh: 162, shin: 162, foot: 120, hand: [172, 186] };

const f = (base: Frame, over: Partial<Frame> = {}): Frame => ({ ...base, ...over });
const pair = (base: Frame, a: Partial<Frame>, b: Partial<Frame>): [Frame, Frame] => [f(base, a), f(base, b)];

export const POSTURES = { stand: STAND, seat: SEAT };

export const TEMPLATES = {
  squat: { hold: true, frames: pair(STAND, {}, { torso: -48, thigh: 0, shin: 105 }) },
  deadlift: { hold: true, frames: pair(STAND, {}, { torso: -30, thigh: 25, shin: 108 }) },
  hinge: { hold: true, frames: pair(STAND, {}, { torso: -8, thigh: 72, shin: 95 }) },
  hingeOneLeg: {
    hold: true,
    frames: pair(STAND, { thighB: 90, shinB: 90, footB: 0 }, { torso: -8, thigh: 80, shin: 92, thighB: 172, shinB: 176, footB: 90 }),
  },
  swing: { frames: pair(STAND, { arm: -5, fore: -5 }, { torso: -25, thigh: 60, shin: 100, arm: 115, fore: 110 }) },
  calfRaise: { hold: true, frames: pair(f(STAND, { anchor: 'toe', at: [127, 185] }), { foot: 0 }, { foot: 35 }) },
  lunge: {
    hold: true,
    frames: pair(STAND, { thigh: 80, shin: 95, ankleB: [80, 182], footB: 30 }, { thigh: 12, shin: 96, ankleB: [42, 181], footB: 30 }),
  },
  bridge: {
    frames: pair({ anchor: 'sh', at: [62, 178], torso: 180, neck: 180, thigh: 0, shin: 0, foot: 0, ankle: [150, 183], arm: 5, fore: 0 }, {}, { torso: 158 }),
  },
  hipThrust: {
    stage: 'thrustBench',
    frames: pair({ anchor: 'sh', at: [70, 150], torso: 210, thigh: 0, shin: 0, foot: 0, ankle: [158, 184], handT: [6, -20] }, {}, { torso: 180 }),
  },
  hyper: {
    stage: 'pad',
    frames: pair({ anchor: 'hip', at: [118, 110], torso: 55, thigh: 160, shin: 150, foot: 60, handT: [10, -8] }, {}, { torso: -5 }),
  },
  legCurl: {
    stage: 'proneBench',
    frames: pair({ anchor: 'hip', at: [110, 140], torso: 0, thigh: 180, shin: 180, foot: 90, arm: 100, fore: 60 }, {}, { shin: -80, foot: 0 }),
  },
  legExt: { stage: 'seat', frames: pair(SEAT, { shin: 100, arm: 95, fore: 60 }, { shin: 5, foot: -80, arm: 95, fore: 60 }) },
  legPress: {
    stage: 'sled',
    frames: pair({ anchor: 'hip', at: [86, 150], torso: -140, thigh: 0, shin: 0, foot: -40, arm: 60, fore: 30 }, { ankle: [118, 112] }, { ankle: [146, 90] }),
  },
  hipMachine: { stage: 'machine', frames: pair(SEAT, { thighB: -2, shinB: 92, arm: 95, fore: 60 }, { thighB: 15, shinB: 100, arm: 95, fore: 60 }) },
  pulldown: { stage: 'seat', cable: 'over', frames: pair(f(SEAT, { torso: -95 }), { handT: [4, 50] }, { handT: [12, 2] }) },
  seatedRow: {
    stage: 'lowSeat',
    cable: 'front',
    frames: pair({ anchor: 'hip', at: [80, 170], torso: -60, thigh: -15, shin: 10, foot: -80 }, { handT: [50, 4] }, { torso: -100, handT: [16, -28] }),
  },
  row: { frames: pair(BENT, { handT: [50, 2] }, { handT: [10, -30] }) },
  reverseFly: { frames: pair(BENT, { arm: 90, fore: 90 }, { arm: 175, fore: 175 }) },
  uprightRow: { frames: pair(STAND, { handT: [6, -50], bendArm: -1 }, { handT: [12, -2], bendArm: -1 }) },
  shrug: { upper: true, frames: pair(STAND, { arm: 90, fore: 90 }, { arm: 90, fore: 90, lift: 5 }) },
  raise: { upper: true, frames: pair(STAND, { arm: 88, fore: 88 }, { arm: -2, fore: -6 }) },
  press: { upper: true, frames: pair(STAND, { handT: [11, 3], bendArm: -1 }, { handT: [2, 52], bendArm: -1 }) },
  curl: { upper: true, cable: 'low', frames: pair(STAND, { arm: 92, fore: 92 }, { arm: 85, fore: -70 }) },
  wrist: { upper: true, frames: pair(SEAT, { arm: 90, fore: -12 }, { arm: 90, fore: 12 }) },
  triExt: { upper: true, frames: pair(STAND, { arm: -80, fore: -80 }, { arm: -80, fore: 100 }) },
  pushdown: { cable: 'high', frames: pair(STAND, { arm: 95, fore: -20 }, { arm: 95, fore: 90 }) },
  kickback: { frames: pair(BENT, { arm: 180, fore: 90 }, { arm: 180, fore: 180 }) },
  standPress: { cable: 'front', frames: pair(f(STAND, { torso: -80 }), { handT: [16, 0] }, { handT: [50, -4] }) },
  benchPress: { stage: 'bench', frames: pair(LIE_BENCH, { handT: [52, 1] }, { handT: [12, -2] }) },
  fly: { stage: 'bench', frames: pair(LIE_BENCH, { handT: [52, 1] }, { handT: [20, 6], bendArm: -1 }) },
  skull: { stage: 'bench', frames: pair(LIE_BENCH, { handT: [52, 2] }, { handT: [28, 20], bendArm: -1 }) },
  pullover: { stage: 'bench', frames: pair(LIE_BENCH, { handT: [50, 8] }, { handT: [8, 50] }) },
  crunch: { hold: true, frames: pair(LIE_FLOOR, {}, { torso: 210 }) },
  situp: { hold: true, frames: pair(LIE_FLOOR, {}, { torso: 245 }) },
  legRaise: {
    frames: pair(f(LIE_FLOOR, { at: [110, 178] }), { thigh: 0, shin: 0, foot: -80 }, { thigh: -85, shin: -85, foot: -170 }),
  },
  pullup: { stage: 'bar', noGround: true, frames: pair(HANG, {}, { at: [110, 80] }) },
  hangLegRaise: { stage: 'bar', noGround: true, frames: pair(HANG, { thigh: 90, shin: 90, foot: 0 }, { thigh: -5, shin: -5, foot: -80 }) },
  hangKneeRaise: { stage: 'bar', noGround: true, frames: pair(HANG, { thigh: 90, shin: 90, foot: 0 }, { thigh: -10, shin: 80, foot: 0 }) },
  dip: {
    stage: 'bars',
    noGround: true,
    frames: pair({ anchor: 'hip', at: [110, 100], torso: -86, thigh: 75, shin: 160, foot: 60, hand: [116, 104] }, {}, { at: [110, 124], torso: -80 }),
  },
  pushup: { frames: pair(PLANK, {}, { torso: -5, thigh: 175, shin: 175 }) },
  plank: {
    still: true,
    frames: pair(f(PLANK, { torso: -8, thigh: 172, shin: 172, foot: 115, hand: [198, 186] }), {}, { torso: -10, thigh: 170 }),
  },
  climber: {
    frames: pair(
      { anchor: 'hip', at: [125, 151], torso: -18, thigh: 162, shin: 162, foot: 120, ankle: [50, 177], thighB: 162, shinB: 162, footB: 120, hand: [172, 186] },
      {},
      { ankle: [140, 170], bendLeg: 1 },
    ),
  },
  quadKick: { frames: pair(QUAD, {}, { thigh: 175, shin: 170 }) },
  jump: {
    frames: pair(STAND, { torso: -55, thigh: 10, shin: 105, arm: 150, fore: 150 }, { at: [112, 158], arm: -30, fore: -30, foot: 30 }),
  },
  run: {
    frames: pair(
      { anchor: 'hip', at: [112, 100], torso: -84, thigh: 55, shin: 125, foot: 10, thighB: 120, shinB: 150, footB: 60 },
      { arm: 120, fore: 60, armB: 60, foreB: -20 },
      { thigh: 120, shin: 150, foot: 60, thighB: 55, shinB: 125, footB: 10, arm: 60, fore: -20, armB: 120, foreB: 60 },
    ),
  },
  walk: {
    hold: true,
    frames: pair(
      { anchor: 'hip', at: [112, 103], torso: -90, thigh: 75, shin: 95, foot: 0, thighB: 105, shinB: 100, footB: 20 },
      {},
      { thigh: 105, shin: 100, foot: 20, thighB: 75, shinB: 95, footB: 0 },
    ),
  },
  bike: {
    stage: 'bike',
    frames: pair(
      { anchor: 'hip', at: [100, 120], torso: -60, thigh: 0, shin: 0, foot: 10, hand: [160, 108] },
      { ankle: [130, 165], ankleB: [150, 145] },
      { ankle: [150, 145], ankleB: [130, 165] },
    ),
  },
  rower: {
    stage: 'rower',
    cable: 'front',
    frames: pair(
      { anchor: 'hip', at: [110, 168], torso: -45, thigh: 0, shin: 0, foot: -70, ankle: [165, 172] },
      { handT: [48, 2] },
      { at: [80, 168], torso: -110, handT: [12, -30] },
    ),
  },
  twist: { frames: pair(f(STAND, { torso: -85 }), { handT: [30, 40] }, { handT: [32, -45] }) },
  neck: { upper: true, still: false, frames: pair(STAND, { neck: -90 }, { neck: -55 }) },
  superman: {
    frames: pair(
      { anchor: 'hip', at: [118, 176], torso: 0, thigh: 180, shin: 180, foot: 120, arm: 0, fore: 0 },
      {},
      { torso: -12, thigh: 192, shin: 192, arm: -15, fore: -15 },
    ),
  },
  roll: {
    stage: 'roller',
    frames: pair(
      { anchor: 'hip', at: [100, 166], torso: -165, thigh: 0, shin: 5, foot: -80, hand: [35, 186] },
      {},
      { at: [125, 166], hand: [60, 186] },
    ),
  },
  fold: { frames: pair(STAND, { torso: -85, hand: [116, 110] }, { torso: 75, hand: [126, 182] }) },
  seatedFold: {
    frames: pair(
      { anchor: 'hip', at: [80, 178], torso: -90, thigh: 0, shin: 0, foot: -80 },
      { hand: [84, 76] },
      { torso: -25, hand: [163, 172] },
    ),
  },
  quadStretch: {
    still: true,
    frames: pair(
      { anchor: 'hip', at: [112, 103], torso: -90, thigh: 92, shin: -105, foot: -100, thighB: 90, shinB: 90, footB: 0, hand: [100, 112] },
      {},
      { shin: -115, hand: [99, 108] },
    ),
  },
  lyingStretch: {
    still: true,
    frames: pair(
      f(LIE_FLOOR, { thighB: 0, shinB: 0, footB: -80 }),
      { thigh: -110, shin: -10, hand: [104, 145] },
      { thigh: -125, shin: -20, hand: [102, 138] },
    ),
  },
  armStretchBack: { still: true, frames: pair(STAND, { arm: 150, fore: 170 }, { arm: 165, fore: 180 }) },
  armStretchUp: { still: true, frames: pair(STAND, { handT: [1, 52] }, { handT: [-14, 40] }) },
  clean: { frames: pair(STAND, { torso: -30, thigh: 25, shin: 108, arm: 90, fore: 90 }, { handT: [11, 3], bendArm: -1 }) },
  snatch: { frames: pair(STAND, { torso: -30, thigh: 25, shin: 108, handT: [45, -40] }, { thigh: 30, shin: 105, torso: -80, handT: [1, 52] }) },
} satisfies Record<string, Template>;

export type TemplateId = keyof typeof TEMPLATES;

export type Shape = { tpl: TemplateId; hold?: Hold; seated?: boolean; incline?: boolean };

/** As duas poses de um exercício, já com pegada, postura e inclinação. */
export function framesOf(shape: Shape): [Frame, Frame] {
  const t: Template = TEMPLATES[shape.tpl];
  let [a, b] = t.frames;
  if (t.upper && shape.seated) {
    const legs = { anchor: SEAT.anchor, at: SEAT.at, thigh: SEAT.thigh, shin: SEAT.shin, foot: SEAT.foot };
    a = { ...a, ...legs };
    b = { ...b, ...legs };
  }
  if (t.hold && shape.hold) {
    const h = HOLDS[shape.hold];
    const clean = (x: Frame): Frame => {
      const { arm, fore, handT, hand, ...rest } = x;
      return { ...rest, ...h } as Frame;
    };
    a = clean(a);
    b = clean(b);
  }
  if (shape.incline && t.stage === 'bench') {
    a = { ...a, torso: -150 };
    b = { ...b, torso: -150 };
  }
  return [a, b];
}

export const stageOf = (shape: Shape): Stage | undefined =>
  (TEMPLATES[shape.tpl] as Template).stage ?? (shape.seated && (TEMPLATES[shape.tpl] as Template).upper ? 'seat' : undefined);

export type { V };
