// Liga cada exercício da base a um molde de movimento, uma pegada e um equipamento.
// Regras pelo nome primeiro; sem nome conhecido, pelo músculo principal e pela categoria.
import type { DbExercise, Muscle } from '../exercises-import.ts';
import type { Equipment, Figure } from './scene.ts';
import type { Hold, Shape, TemplateId } from './templates.ts';

type Rule = [RegExp, TemplateId | ((e: DbExercise, n: string) => TemplateId)];

const has = (e: DbExercise, ...m: Muscle[]) => m.includes(e.primary[0]);

const RULES: Rule[] = [
  [/calf|calves|heel raise|tibialis|ankle/, 'calfRaise'],
  [/hanging.*(knee|tuck)|knee raise|knee tuck/, 'hangKneeRaise'],
  [/hanging.*leg|hanging|toes.to.bar/, 'hangLegRaise'],
  [/pull[- ]?ups?\b|chin[- ]?ups?|chins?\b|muscle.up|rope climb|bar hang/, 'pullup'],
  [/\bdips?\b/, 'dip'],
  [/push-?up|pushup|push up|plyo push/, 'pushup'],
  [/mountain climber/, 'climber'],
  [/plank|ab roll|rollout|roll-?out|bear crawl/, 'plank'],
  [/leg press|sled.*press/, 'legPress'],
  [/hip thrust/, 'hipThrust'],
  [/bridge|hip lift|butt lift|glute lift|pelvic tilt/, 'bridge'],
  [/superman|swimmer|prone (arm|leg|y|t) raise/, 'superman'],
  [/hyperextension|back extension|reverse hyper/, 'hyper'],
  [/leg curl|hamstring curl|glute.ham|nordic|natural ham|hamstring slide|manual hamstring/, 'legCurl'],
  [/hip raise|bottoms up|knee.hip raise/, 'legRaise'],
  [/butt-?ups|spider crawl|fallout/, 'plank'],
  [/otis|elbow to knee|heel touch|pull-in|figure 8|pass between/, 'crunch'],
  [/chest pass|chest push|heavy bag|drop push|return push|jammer|cross over/, 'standPress'],
  [/slam/, 'swing'],
  [/log lift|circus bell|sandbag|rack delivery/, 'clean'],
  [/raise|scaption|pull apart|crucifix|halo|pirate|car drivers|around the world|battling rope|arm drill|power partials/, (_e, n) => (/leg|knee|glute/.test(n) ? 'legRaise' : 'raise')],
  [/leg extension/, 'legExt'],
  [/abduct|adduct|hip adduction|hip abduction|thigh (ab|ad)/, 'hipMachine'],
  [/kickback|kick back|donkey|bird dog|quadruped|fire hydrant|glute kick/, (e) => (has(e, 'triceps') ? 'kickback' : 'quadKick')],
  [/skull|lying triceps|french press|lying.*extension|lying.*tricep/, 'skull'],
  [/pullover|pull-over/, 'pullover'],
  [/push-?down|pressdown|press-down/, 'pushdown'],
  [/triceps? extension|tricep|overhead.*extension/, 'triExt'],
  [/wrist|finger|forearm|gripper|plate pinch|reverse curl/, 'wrist'],
  [/curl/, 'curl'],
  [/snatch/, 'snatch'],
  [/clean|high pull/, 'clean'],
  [/swing/, 'swing'],
  [/jump|hop|bound|skip|leap|burpee|box|tuck|plyo|split jump|star/, 'jump'],
  [/lunge|split squat|step-?up|step up|stepup|bulgarian/, 'lunge'],
  [/squat|sissy|pistol|wall sit|thruster/, 'squat'],
  [/(single|one).leg(ged)? (deadlift|rdl|romanian)/, 'hingeOneLeg'],
  [/romanian|rdl|stiff|good morning|pull through/, 'hinge'],
  [/deadlift|rack pull|atlas|tire flip|keg/, 'deadlift'],
  [/shrug/, 'shrug'],
  [/upright row/, 'uprightRow'],
  [/pulldown|pull-down|lat pull|straight.arm/, 'pulldown'],
  [/rowing|rower/, 'rower'],
  [/seated.*row|cable row|low row/, 'seatedRow'],
  [/face pull|reverse fly|reverse flye|rear delt|reverse.*raise|bent.over.*raise/, 'reverseFly'],
  [/row/, 'row'],
  [/crossover|cable.*fly|cable.*flye|pec deck|butterfly|standing.*press.*cable|cable chest press/, 'standPress'],
  [/fly|flye/, 'fly'],
  [/bench press|floor press|chest press|incline.*press|decline.*press|close.grip.*press|board press|pin press|guillotine/, 'benchPress'],
  [/lateral raise|side raise|front raise|front.*raise|lateral|y raise|iron cross/, 'raise'],
  [/press|jerk|arnold|handstand/, (e) => (has(e, 'chest') ? 'benchPress' : 'press')],
  [/sit-?up|situp|jackknife|v-up|toe touch|janda/, 'situp'],
  [/crunch|oblique|cocoons|ab.*bicycle|air bike|dead bug/, 'crunch'],
  [/leg raise|leg lift|flutter|scissor|reverse crunch|knee.*chest|leg pull/, 'legRaise'],
  [/russian twist|woodchop|wood chop|chop|rotation|twist|windmill|landmine|side bend|saxon/, 'twist'],
  [/neck|harness/, 'neck'],
  [/bike|bicycl|cycling|recumbent/, 'bike'],
  [/carry|farmer|yoke|walk|sled|prowler|stairmaster|stair|step mill|drag|car (drag|push)|conan|suitcase/, 'walk'],
  [/run|sprint|jog|march|treadmill|elliptical|skating|butt kick|high knee|rope jump/, 'run'],
];

const STRETCH: [Muscle[], TemplateId][] = [
  [['quadriceps'], 'quadStretch'],
  [['hamstrings', 'calves', 'lower back'], 'fold'],
  [['glutes', 'adductors', 'abductors', 'abdominals'], 'lyingStretch'],
  [['triceps', 'lats', 'middle back', 'traps'], 'armStretchUp'],
  [['chest', 'shoulders', 'biceps', 'forearms', 'neck'], 'armStretchBack'],
];

const BY_MUSCLE: Record<Muscle, TemplateId> = {
  quadriceps: 'squat', glutes: 'squat', hamstrings: 'hinge', calves: 'calfRaise', chest: 'benchPress',
  shoulders: 'press', triceps: 'pushdown', biceps: 'curl', lats: 'row', 'middle back': 'row', traps: 'shrug',
  'lower back': 'hyper', abdominals: 'crunch', forearms: 'wrist', neck: 'neck', adductors: 'hipMachine', abductors: 'hipMachine',
};

function equipmentOf(e: DbExercise, n: string): Equipment {
  if (/foam|roll(er)?\b|smr/.test(n) && e.category === 'stretching') return 'roller';
  switch (e.equipment) {
    case 'barbell': case 'e-z curl bar': return 'barbell';
    case 'dumbbell': return 'dumbbell';
    case 'kettlebells': return 'kettlebell';
    case 'cable': return 'cable';
    case 'bands': return 'bands';
    case 'machine': return 'machine';
    case 'exercise ball': return 'ball';
    case 'medicine ball': return 'medicineBall';
    case 'foam roll': return 'roller';
    default: return null;
  }
}

function holdOf(tpl: TemplateId, n: string, eq: Equipment): Hold | undefined {
  if (tpl === 'crunch' || tpl === 'situp') return /cross|arms crossed/.test(n) ? 'cross' : eq === 'medicineBall' ? 'chest' : 'head';
  if (tpl === 'walk') return /sled|prowler|push|car/.test(n) ? 'push' : 'side';
  if (/overhead/.test(n)) return 'overhead';
  if (/front|zercher/.test(n)) return 'frontRack';
  if (/goblet/.test(n) || eq === 'medicineBall') return 'chest';
  if (tpl === 'hinge' && /good morning/.test(n)) return 'back';
  if (eq === 'barbell' || eq === 'machine') return tpl === 'deadlift' || tpl === 'hinge' || tpl === 'hingeOneLeg' ? 'side' : 'back';
  if (eq === 'dumbbell' || eq === 'kettlebell' || eq === 'cable' || eq === 'bands') return 'side';
  if (tpl === 'lunge' || tpl === 'calfRaise') return 'hips';
  if (tpl === 'squat') return 'front';
  return undefined;
}

export type Classified = Figure & { reason: 'name' | 'stretch' | 'muscle' };

export function classify(e: DbExercise): Classified {
  const n = e.name.toLowerCase();
  let tpl: TemplateId | undefined;
  let reason: Classified['reason'] = 'name';
  if (e.category === 'stretching') {
    if (/foam|smr|roll/.test(n) || e.equipment === 'foam roll') tpl = 'roll';
    else if (/seated|sitting|floor|butterfly|straddle|pike/.test(n) && has(e, 'hamstrings', 'calves', 'lower back', 'adductors')) tpl = 'seatedFold';
    else if (/lying|supine|on back|knee to chest|pretzel|piriformis/.test(n)) tpl = 'lyingStretch';
    else {
      tpl = STRETCH.find(([ms]) => ms.includes(e.primary[0]))?.[1] ?? 'armStretchBack';
      reason = 'stretch';
    }
  } else {
    for (const [re, to] of RULES) {
      if (re.test(n)) {
        tpl = typeof to === 'function' ? to(e, n) : to;
        break;
      }
    }
    if (!tpl) {
      tpl = e.category === 'cardio' ? 'run' : BY_MUSCLE[e.primary[0]] ?? 'squat';
      reason = 'muscle';
    }
  }
  const equipment = equipmentOf(e, n);
  const shape: Shape = {
    tpl,
    hold: holdOf(tpl, n, equipment),
    seated: /seated|sitting|preacher|concentration/.test(n),
    incline: /incline/.test(n),
  };
  return { shape, equipment, primary: e.primary, secondary: e.secondary, reason };
}
