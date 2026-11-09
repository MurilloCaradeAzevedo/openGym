// Liga cada exercício da base a um molde de movimento, uma pegada e um equipamento.
// Regras pelo nome primeiro; sem nome conhecido, pelo músculo principal e pela categoria.
import type { DbExercise, Muscle } from '../exercises-import.ts';
import type { Equipment, Figure } from './scene.ts';
import type { Hold, Shape, TemplateId } from './templates.ts';

type Rule = [RegExp, TemplateId | ((e: DbExercise, n: string) => TemplateId)];

const has = (e: DbExercise, ...m: Muscle[]) => m.includes(e.primary[0]);

const RULES: Rule[] = [
  [/calf|calves|heel raise|tibialis|ankle/, 'calfRaise'],
  [/side.?lying/, 'sideLying'],
  [/russian twist/, 'situp'],
  [/dragon flag/, 'legRaise'],
  [/chaturanga/, 'plank'],
  [/fish pose|matsyasana/, 'bridge'],
  [/(hanging|dead hang|bar).*(scapular|scap)|scapular (pull|shrug)|scap pull/, 'deadHang'],
  [/(hanging|captain|parallel bar|bar).*(knee|tuck)/, 'hangKneeRaise'],
  [/hanging.*leg|hanging|toes.to.bar/, 'hangLegRaise'],
  [/inverted row|australian pull|body ?row/, 'invertedRow'],
  [/dead ?bug/, 'deadBug'],
  [/jumping jack|star jump|seal jack/, 'jack'],
  [/pull[- ]?ups?\b|chin[- ]?ups?|chins?\b|muscle.up|rope climb|bar hang/, 'pullup'],
  [/\bdips?\b/, 'dip'],
  [/push-?up|pushup|push up|plyo push/, 'pushup'],
  [/mountain climber/, 'climber'],
  [/side plank|side bridge/, 'sidePlank'],
  [/plank|ab roll|rollout|roll-?out|bear crawl/, 'plank'],
  [/leg press|sled.*press/, 'legPress'],
  [/hip thrust/, 'hipThrust'],
  [/bridge|hip lift|butt lift|glute lift|pelvic tilt/, 'bridge'],
  [/superman|swimmer|prone (arm|leg|y|t) raise/, 'superman'],
  [/hyperextension|back extension|reverse hyper/, 'hyper'],
  [/leg curl|hamstring curl|glute.ham|nordic|natural ham|hamstring slide|manual hamstring/, 'legCurl'],
  [/hip raise|bottoms up|knee.hip raise/, (e) => (e.equipment === 'kettlebells' ? 'clean' : 'legRaise')],
  [/butt-?ups|spider crawl|fallout/, 'plank'],
  [/otis|elbow to knee|heel touch|pull-in|figure 8|pass between/, 'crunch'],
  [/chest pass|chest push|heavy bag|drop push|return push|jammer|cross over/, 'standPress'],
  [/slam/, 'swing'],
  [/log lift|circus bell|sandbag|rack delivery/, 'clean'],
  [/raise|scaption|pull apart|crucifix|halo|pirate|car drivers|around the world|battling rope|arm drill|power partials/, (_e, n) => (/leg|knee|glute/.test(n) ? 'legRaise' : /front/.test(n) ? 'raise' : 'lateralRaise')],
  [/leg extension/, 'legExt'],
  [/adduct|thigh ad|groin squeeze/, 'hipAdduct'],
  [/abduct|thigh ab|clamshell|side.lying leg (raise|lift)/, 'hipMachine'],
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
  [/jump|hop|bound|skip|leap|burpee|box|plyo|split jump|star/, 'jump'],
  [/lunge|split squat|step-?up|step up|stepup|bulgarian/, 'lunge'],
  [/squat|sissy|pistol|wall sit|thruster/, 'squat'],
  [/(single|one).leg(ged)? (deadlift|rdl|romanian)/, 'hingeOneLeg'],
  [/romanian|rdl|stiff|good morning|pull through/, 'hinge'],
  [/deadlift|rack pull|atlas|tire flip|keg/, 'deadlift'],
  [/shrug/, 'shrug'],
  [/upright row/, 'uprightRow'],
  [/pulldown|pull-down|lat pull|straight.arm (pulldown|pull down|pushdown)/, 'pulldown'],
  [/rowing|rower/, 'rower'],
  [/seated.*row|cable row|low row/, 'seatedRow'],
  [/face pull|reverse fly|reverse flye|rear delt|reverse.*raise|bent.over.*raise/, 'reverseFly'],
  [/row/, 'row'],
  [/crossover|cable.*fly|cable.*flye|pec deck|butterfly|standing.*press.*cable|cable chest press/, 'standPress'],
  [/fly|flye/, 'fly'],
  [/bench press|floor press|chest press|incline.*press|decline.*press|close.grip.*press|board press|pin press|guillotine/, 'benchPress'],
  [/front raise|front.*raise/, 'raise'],
  [/lateral raise|side raise|lateral|y raise|iron cross/, 'lateralRaise'],
  [/press|jerk|arnold|handstand/, (e) => (has(e, 'chest') ? 'benchPress' : 'press')],
  [/sit-?up|situp|jackknife|v-up|toe touch|janda/, 'situp'],
  [/crunch|oblique|cocoons|ab.*bicycle|air bike|dead bug/, 'crunch'],
  [/leg raise|leg lift|flutter|scissor|reverse crunch|knee.*chest|leg pull/, 'legRaise'],
  [/russian twist|woodchop|wood chop|chop|rotation|twist|windmill|landmine|side bend|saxon/, 'twist'],
  [/neck|harness/, 'neck'],
  [/bike|bicycl|cycling|recumbent/, 'bike'],
  [/carry|farmer|yoke|walk|sled|prowler|stairmaster|stair|step mill|\bdrag\b|car (drag|push)|conan|suitcase/, 'walk'],
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

const legs = (e: DbExercise) => has(e, 'quadriceps', 'hamstrings', 'glutes', 'calves', 'adductors', 'abductors');
const seatedName = (n: string) => /seated|sitting|\bsit\b|chair|floor|straddle/.test(n);

/** Stretches, yoga and mobility: the pose the name describes, before the muscle it is filed under. */
const POSES: Rule[] = [
  [/foam|smr|roller|massage ball/, 'roll'],
  [/child/, 'childPose'],
  [/walk\b|walking|march|skip|jog|high knee/, 'walk'],
  [/downward|\bdog\b|down dog|downdog|pike|inchworm|walkout/, 'downDog'],
  [/mountain pose|tadasana|tree pose|standing pose/, 'armStretchUp'],
  [/side lunge|lateral lunge|cossack/, 'wideSquat'],
  [/wide angle|straddle/, 'butterfly'],
  [/cobra|sphinx|upward dog|up dog|\bseal\b|prone press|press up/, 'cobra'],
  [/\bcat\b|\bcow\b/, 'catCow'],
  [/butterfly|bound angle|cobbler|groin|adductor/, (_e, n) => (/kneeling/.test(n) ? 'kneelingLunge' : 'butterfly')],
  [/frog|sumo|horse|malasana|garland|deep squat|squat/, 'wideSquat'],
  [/pigeon|hip flexor|kneeling|couch|lunge|warrior|crescent|runner|psoas|iliopsoas/, 'kneelingLunge'],
  [/calf|calves|achilles|soleus|gastroc|tibialis/, 'staggerStretch'],
  [/corpse|savasana|relax/, 'lyingStretch'],
  [/meditation|easy pose|sukhasana|lotus/, 'butterfly'],
  [/chair pose|utkatasana/, 'squat'],
  [/hip hinge/, 'hinge'],
  [/side split/, 'wideSquat'],
  [/bridge|wheel|camel/, 'bridge'],
  [/\bboat\b|v sit/, 'situp'],
  [/plank/, 'plank'],
  [/side lying|side-lying|clam|mermaid/, 'sideLying'],
  [/happy baby|knees? to chest|supine|lying|on back|pretzel|figure (4|four)|piriformis|reclin|windshield/, 'lyingStretch'],
  [/twist|rotation|rotate|windmill|thread the needle|spinal/, 'twist'],
  [/neck|chin tuck|levator|scalene|trap(ezius)? stretch/, 'neck'],
  [/wrist|forearm|finger|\bhand/, 'wrist'],
  [/circle|swing/, (e) => (legs(e) ? 'legSwing' : 'armCircle')],
  [/fold|toe touch|forward bend|hamstring|uttanasana|jefferson/, (_e, n) => (seatedName(n) ? 'seatedFold' : 'fold')],
  [/quad|thigh|heel to (butt|glute)/, 'quadStretch'],
  [/chest|pec|doorway|biceps|shoulder|deltoid|arm (back|behind)|wall/, 'armStretchBack'],
  [/triceps|lat\b|lats|overhead|side bend|side reach|triangle|banana|reach/, 'armStretchUp'],
];

/** Any other movement the rules did not name: what the body does, read from the words that say it. */
const POSTURE: Rule[] = [
  [/roller ?out|rollerout|wheel/, 'plank'],
  [/21s|biceps clutch/, 'curl'],
  [/thor lift|side bent|side bend|stand up|standing lift|pendulum|smash|overhead hit/, 'twist'],
  [/scapular retraction/, 'seatedRow'],
  [/empty can|full can|archer|shoulder flexion|alternate shoulder|round arm|arm ups/, 'raise'],
  [/pronation|supination|torsion|axle|wrestling/, 'wrist'],
  [/femoral/, 'legCurl'],
  [/deltoid rear/, 'reverseFly'],
  [/elbow-to-knee|toe tap|v-?sit|hundred|boomerang|\bseal\b|roll ?overs?|rocker|spell caster|bottoms-up|abdominal \d|breathing|pelvic floor|control balance|in out/, 'crunch'],
  [/inchworm|\bpike\b|headstand/, 'downDog'],
  [/maltese|\bflag\b|back lever|body-up|parallel bars/, 'plank'],
  [/wall slide|serratus/, 'armStretchUp'],
  [/climb|arm over arm/, 'pullup'],
  [/truck pull|car flip|stones|loading|weight for height/, 'deadlift'],
  [/cluster|wall ball|\bquads\b/, 'squat'],
  [/skater|shuttle|quick feet|half knee bend/, 'run'],
  [/single leg thrust/, 'hipThrust'],
  [/leg slide|platform slide|split/, 'lunge'],
  [/elevator/, 'shrug'],
  [/triangle/, 'butterfly'],
  [/spine stretch forward|long spine/, 'seatedFold'],
  [/hip hinge/, 'hinge'],
  [/kick/, (_e, n) => (/lying|supine|floor|flutter/.test(n) ? 'legRaise' : /back|rear|donkey|kneeling/.test(n) ? 'quadKick' : /side/.test(n) ? 'sideLying' : 'kick')],
  [/cross trainer|elliptical|ergometer|stepper|\bcycle\b/, 'run'],
  [/punch|jab|uppercut|\bhook\b|boxing|shadow/, 'punch'],
  [/hang|monkey bar|handboard|one handed/, 'deadHang'],
  [/hip extension|reverse extension|glute kick|rear leg/, (_e, n) => (/kneeling|quadruped|bench|prone|lying/.test(n) ? 'quadKick' : 'hipExtStand')],
  [/hip flexion|knee raise|knee up|knee drive|\bmarch/, (_e, n) => (/lying|supine|floor/.test(n) ? 'legRaise' : 'kneeRaiseStand')],
  [/knee extension|leg extension/, 'legExt'],
  [/knee flexion|heel slide/, 'legCurl'],
  [/foot|ankle|toe raise|inversion|eversion|plantar|dorsi|balance board/, 'calfRaise'],
  [/sit ?up|v ?up|roll ?up|jack ?knife|hollow|\bdish\b|l sit|corkscrew|wiper|teaser|\bsaw\b|rolling|rocking|draw in|vacuum|air cycle|criss cross|6 inch|figure eight|leg stretch/, (_e, n) => (/sit ?up|v ?up|roll ?up|teaser|l sit/.test(n) ? 'situp' : /leg|6 inch|criss|air cycle|wiper|corkscrew|figure eight/.test(n) ? 'legRaise' : 'crunch')],
  [/planche|front lever|shoulder tap|crawl|\bbear\b|crab|plank/, 'plank'],
  [/side lying|side-lying|clam|mermaid|leg circle|sideways lift/, 'sideLying'],
  [/prone|swimming|swan|superman|snow angel|\b(y|w|t|a) (raise|lift)|lying prone (y|w|t|a)\b/, 'superman'],
  [/jack|shuffle|drill|\bstep|trot|prancing|skip|agility|cone|ladder|frogger|cycle|stepper|ergometer|cross trainer|elliptical|run/, 'run'],
  [/toss|throw|slam|chop|slingshot/, 'swing'],
  [/skier|\bski\b|pullapart|pull apart|rear drive|power pull/, 'reverseFly'],
  [/circle|rotation|rotate|twist|judo|driver|halo|complex|around/, 'twist'],
  [/get ?up|prisoner|deep knee bend|\bsit \(wall\)|wall sit|pulse/, 'squat'],
  [/pelvic lift|glute squeeze|frog pump|hip lift|lifting \(on hip\)|lift \(on hip\)/, 'bridge'],
  [/pec dec|cross ?over|breeding|squeeze|chest expansion|push pull|plate push|push/, 'standPress'],
  [/extension/, (e) => (has(e, 'triceps') ? 'triExt' : has(e, 'lower back') ? 'hyper' : legs(e) ? 'legExt' : 'triExt')],
  [/hold|iso|static|stand(ing)? pose|single leg stand/, (e) => (has(e, 'abdominals', 'lower back') ? 'plank' : legs(e) ? 'squat' : 'curl')],
];

export type Classified = Figure & { reason: 'name' | 'posture' | 'muscle' };

const firstRule = (rules: Rule[], e: DbExercise, n: string): TemplateId | undefined => {
  for (const [re, to] of rules) if (re.test(n)) return typeof to === 'function' ? to(e, n) : to;
  return undefined;
};

export function classify(e: DbExercise): Classified {
  const n = e.name.toLowerCase();
  let tpl: TemplateId | undefined;
  let reason: Classified['reason'] = 'name';
  if (e.category === 'stretching') {
    tpl = firstRule(POSES, e, n);
    if (!tpl) {
      tpl = STRETCH.find(([ms]) => ms.includes(e.primary[0]))?.[1] ?? 'armStretchBack';
      if (tpl === 'lyingStretch' && /standing|stand\b|wall/.test(n)) tpl = has(e, 'abdominals') ? 'armStretchUp' : 'staggerStretch';
      reason = 'posture';
    }
  } else {
    tpl = firstRule(RULES, e, n);
    if (!tpl) {
      tpl = firstRule(POSTURE, e, n);
      reason = 'posture';
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
