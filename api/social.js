/* Friends: a friend code per profile, requests both ways, a feed of friends' workouts, a weekly
 * ranking and a nudge for a friend who has been away.
 *
 *   db.social = { codes: { <uid>: <code> }, requests: [{ from, to, at }],
 *                 friends: [{ a, b, at }], nudges: [{ from, to, at, seen }],
 *                 fires: [{ from, to, wid, at }] }   (a 🔥 on friend `to`'s workout `wid`)
 *
 * What a friend sees of you is the summary of each workout (day, routine name, minutes, sets,
 * volume, records) and your streak. Never a set, a note, a weigh-in, a photo or the food diary.
 * Friendship is mutual: it exists only once the other person accepts, and either side ends it.
 * Handed the server's helpers rather than importing them, like coach/routes.js. */
import crypto from 'node:crypto';
import { createWindow } from './rate-limit.js';

export const CODE_LEN = 8;
export const FEED_DAYS = 30;
export const FEED_MAX = 60;
export const MAX_FRIENDS = 200;
export const NUDGE_AFTER_DAYS = 3;
// Asking is rationed per person, so codes cannot be guessed in bulk and the file cannot be grown;
// the same person is pushed about the same person at most once a day, however often they ask.
export const ASK_PER_HOUR = 60;
export const MAX_PENDING_OUT = 50;
const DAY = 86400000;
// No 0/O, 1/I/L: read aloud or typed from a screenshot.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function newCode() {
  const bytes = crypto.randomBytes(CODE_LEN);
  return [...bytes].map(b => ALPHABET[b % ALPHABET.length]).join('');
}
export const cleanCode = v => (typeof v === 'string' ? v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, CODE_LEN) : '');

// The Coach's reading of a warm-up set (coach/core/payload.js isWarmupSet).
const isWarmup = s => {
  const ph = typeof s?.phase === 'string' ? s.phase.trim().toLowerCase() : '';
  return ph ? ph === 'warmup' || ph === 'warm-up' || ph === 'warm_up' : s?.warmup === true;
};

/** Everything social a deleted profile leaves behind, removed from `db`. */
export function dropSocial(db, uid) {
  const s = db.social;
  if (!s || typeof s !== 'object') return;
  if (s.codes) delete s.codes[uid];
  if (Array.isArray(s.requests)) s.requests = s.requests.filter(r => r.from !== uid && r.to !== uid);
  if (Array.isArray(s.friends)) s.friends = s.friends.filter(f => f.a !== uid && f.b !== uid);
  if (Array.isArray(s.nudges)) s.nudges = s.nudges.filter(n => n.from !== uid && n.to !== uid);
  if (Array.isArray(s.fires)) s.fires = s.fires.filter(f => f.from !== uid && f.to !== uid);
  if (s.asked && typeof s.asked === 'object') for (const k of Object.keys(s.asked)) if (k.split('>').includes(uid)) delete s.asked[k];
}
const iso = ms => new Date(ms).toISOString().slice(0, 10);

/** What a friend sees of one workout. */
export function workoutSummary(w) {
  let sets = 0, vol = 0;
  for (const en of Array.isArray(w.entries) ? w.entries : []) {
    for (const s of Array.isArray(en?.sets) ? en.sets : []) {
      if (!s?.done || isWarmup(s)) continue;
      sets++;
      vol += (+s.w || 0) * (+s.r || 0);
    }
  }
  return {
    wid: typeof w.id === 'string' ? w.id.slice(0, 64) : null,
    d: w.d.slice(0, 10), title: typeof w.name === 'string' ? w.name.slice(0, 60) : null,
    minutes: w.end && w.start ? Math.max(0, Math.round((w.end - w.start) / 60000)) : null,
    sets, vol: Math.min(1e9, Math.max(0, Math.round(Number.isFinite(w.vol) ? w.vol : vol))),
    prs: Array.isArray(w.prs) ? w.prs.length : 0
  };
}

const workoutsOf = S => (Array.isArray(S?.workouts) ? S.workouts : []).filter(w => w && typeof w.d === 'string' && /^\d{4}-\d{2}-\d{2}/.test(w.d));

/** Monday of the week `d` (YYYY-MM-DD) falls in. */
export function weekStart(d) {
  const x = new Date(d + 'T12:00:00Z');
  x.setUTCDate(x.getUTCDate() - ((x.getUTCDay() + 6) % 7));
  return iso(x.getTime());
}

/** Whole days since the newest workout, or null for a profile that never trained. */
export function daysAway(S, today) {
  const last = workoutsOf(S).map(w => w.d.slice(0, 10)).sort().pop();
  return last ? Math.round((Date.parse(today + 'T12:00:00Z') - Date.parse(last + 'T12:00:00Z')) / DAY) : null;
}

/** Consecutive weeks, up to this one, with at least one workout (this week may still be empty). */
export function streakWeeks(S, today) {
  const weeks = new Set(workoutsOf(S).map(w => weekStart(w.d.slice(0, 10))));
  let wk = weekStart(today);
  if (!weeks.has(wk)) wk = weekStart(iso(Date.parse(wk + 'T12:00:00Z') - 7 * DAY));
  let n = 0;
  while (weeks.has(wk)) { n++; wk = weekStart(iso(Date.parse(wk + 'T12:00:00Z') - 7 * DAY)); }
  return n;
}

/** This week's workouts and volume per person, best first. `people` is [{ id, name, S }]. */
export function ranking(people, today) {
  const from = weekStart(today);
  return people.map(p => {
    const week = workoutsOf(p.S).filter(w => w.d.slice(0, 10) >= from && w.d.slice(0, 10) <= today).map(workoutSummary);
    return { id: p.id, name: p.name, workouts: week.length, vol: week.reduce((a, w) => a + w.vol, 0), streak: streakWeeks(p.S, today) };
  }).sort((a, b) => b.workouts - a.workouts || b.vol - a.vol || String(a.name).localeCompare(String(b.name)));
}

/** Friends' workouts from the last FEED_DAYS days, newest first. */
export function feed(people, today) {
  const from = iso(Date.parse(today + 'T12:00:00Z') - FEED_DAYS * DAY);
  return people.flatMap(p => workoutsOf(p.S).filter(w => w.d.slice(0, 10) >= from).map(w => ({ who: p.id, name: p.name, ...workoutSummary(w) })))
    .sort((a, b) => (a.d < b.d ? 1 : a.d > b.d ? -1 : 0))
    .slice(0, FEED_MAX);
}

export function socialRoutes({ db, saveDb, json, readBody, readSession, readState, sendPush, now = () => Date.now() }) {
  const social = () => {
    db.social = db.social && typeof db.social === 'object' ? db.social : {};
    const s = db.social;
    s.codes = s.codes && typeof s.codes === 'object' ? s.codes : {};
    for (const k of ['requests', 'friends', 'nudges', 'fires']) s[k] = Array.isArray(s[k]) ? s[k] : [];
    s.asked = s.asked && typeof s.asked === 'object' && !Array.isArray(s.asked) ? s.asked : {};
    return s;
  };
  const asking = createWindow({ max: ASK_PER_HOUR, windowMs: 3600000, now });
  const codeOf = uid => {
    const s = social();
    if (!s.codes[uid]) {
      const taken = new Set(Object.values(s.codes));
      let c; do c = newCode(); while (taken.has(c));
      s.codes[uid] = c;
      saveDb();
    }
    return s.codes[uid];
  };
  const live = id => db.users.find(u => u.id === id && !u.disabled) || null;
  const friendIds = uid => social().friends.flatMap(f => (f.a === uid ? [f.b] : f.b === uid ? [f.a] : [])).filter(live);
  const areFriends = (a, b) => social().friends.some(f => (f.a === a && f.b === b) || (f.a === b && f.b === a));
  const nameOf = id => (live(id)?.name || '').slice(0, 60) || null;
  // shortcut: the server's UTC date, so near midnight a week or "days away" can be a day off for
  // someone far from UTC; take the caller's local date as a query parameter if that matters.
  const today = () => iso(now());
  const people = ids => ids.map(id => ({ id, name: nameOf(id), S: readState(id) || {} }));
  const signedIn = (req, res) => {
    const user = readSession(req);
    if (!user) json(res, 401, { error: 'not signed in' });
    return user;
  };
  const target = async (req, res) => {
    const body = await readBody(req);
    const id = typeof body.id === 'string' ? body.id : '';
    return { body, id };
  };

  return {
    'GET /api/social': async (req, res) => {
      const user = signedIn(req, res); if (!user) return;
      const s = social();
      const day = today();
      const friends = friendIds(user.id).map(id => {
        const S = readState(id) || {};
        return { id, name: nameOf(id), daysAway: daysAway(S, day), streak: streakWeeks(S, day) };
      });
      json(res, 200, {
        code: codeOf(user.id),
        friends,
        incoming: s.requests.filter(r => r.to === user.id && live(r.from)).map(r => ({ id: r.from, name: nameOf(r.from), at: r.at })),
        outgoing: s.requests.filter(r => r.from === user.id && live(r.to)).map(r => ({ id: r.to, name: nameOf(r.to), at: r.at })),
        nudges: s.nudges.filter(n => n.to === user.id && !n.seen && live(n.from)).map(n => ({ from: n.from, name: nameOf(n.from), at: n.at }))
      });
    },

    // By friend code. If they already asked you, this accepts instead.
    'POST /api/social/request': async (req, res) => {
      const user = signedIn(req, res); if (!user) return;
      const body = await readBody(req);
      const wait = asking.take(user.id);
      if (wait) return json(res, 429, { error: 'too many requests, try again later', code: 'locked', retryAfter: wait }, { 'Retry-After': String(wait) });
      const code = cleanCode(body.code);
      const s = social();
      const to = Object.keys(s.codes).find(uid => s.codes[uid] === code);
      if (!code || !to || !live(to)) return json(res, 404, { error: 'no profile with that code', code: 'unknown-code' });
      if (to === user.id) return json(res, 400, { error: 'that is your own code', code: 'self' });
      if (areFriends(user.id, to)) return json(res, 200, { ok: true, status: 'friends' });
      if (friendIds(user.id).length >= MAX_FRIENDS) return json(res, 400, { error: 'too many friends', code: 'limit' });
      const back = s.requests.find(r => r.from === to && r.to === user.id);
      if (back) {
        s.requests = s.requests.filter(r => r !== back);
        s.friends.push({ a: to, b: user.id, at: now() });
        saveDb();
        return json(res, 200, { ok: true, status: 'friends' });
      }
      if (!s.requests.some(r => r.from === user.id && r.to === to)) {
        if (s.requests.filter(r => r.from === user.id).length >= MAX_PENDING_OUT) return json(res, 400, { error: 'too many requests waiting', code: 'limit' });
        s.requests.push({ from: user.id, to, at: now() });
        // One push per pair per day, even if the request is withdrawn and made again.
        const key = `${user.id}>${to}`;
        const push = !(s.asked[key] > now() - DAY);
        for (const k of Object.keys(s.asked)) if (s.asked[k] <= now() - DAY) delete s.asked[k];
        if (push) s.asked[key] = now();
        saveDb();
        if (push) sendPush(to, { title: 'openGym', body: `${nameOf(user.id) || 'Someone'} wants to be your gym friend`, tag: 'social-request', url: '#/friends' });
      }
      json(res, 200, { ok: true, status: 'requested' });
    },

    'POST /api/social/accept': async (req, res) => {
      const user = signedIn(req, res); if (!user) return;
      const { id } = await target(req, res);
      const s = social();
      const r = s.requests.find(x => x.from === id && x.to === user.id);
      if (!r || !live(id)) return json(res, 404, { error: 'no such request', code: 'no-request' });
      if (friendIds(user.id).length >= MAX_FRIENDS || friendIds(id).length >= MAX_FRIENDS) return json(res, 400, { error: 'too many friends', code: 'limit' });
      s.requests = s.requests.filter(x => x !== r);
      if (!areFriends(id, user.id)) s.friends.push({ a: id, b: user.id, at: now() });
      saveDb();
      json(res, 200, { ok: true });
    },

    // Declines an incoming request, withdraws an outgoing one, or ends a friendship.
    'POST /api/social/remove': async (req, res) => {
      const user = signedIn(req, res); if (!user) return;
      const { id } = await target(req, res);
      const s = social();
      const pair = (a, b) => (a === user.id && b === id) || (a === id && b === user.id);
      s.requests = s.requests.filter(r => !pair(r.from, r.to));
      s.friends = s.friends.filter(f => !pair(f.a, f.b));
      s.nudges = s.nudges.filter(n => !pair(n.from, n.to));
      s.fires = s.fires.filter(f => !pair(f.from, f.to));
      saveDb();
      json(res, 200, { ok: true });
    },

    'GET /api/social/feed': async (req, res) => {
      const user = signedIn(req, res); if (!user) return;
      const day = today();
      const friends = people(friendIds(user.id));
      const me = { id: user.id, name: nameOf(user.id), S: readState(user.id) || {} };
      const fires = social().fires;
      const items = feed(friends, day).map(w => {
        const on = fires.filter(f => f.to === w.who && f.wid === w.wid);
        return { ...w, fires: on.length, fired: on.some(f => f.from === user.id) };
      });
      json(res, 200, { feed: items, ranking: ranking([me, ...friends], day), week: weekStart(day) });
    },

    // A 🔥 on a friend's workout, or taken back when it is already there.
    'POST /api/social/fire': async (req, res) => {
      const user = signedIn(req, res); if (!user) return;
      const body = await readBody(req);
      const to = typeof body.id === 'string' ? body.id : '';
      const wid = typeof body.wid === 'string' ? body.wid.slice(0, 64) : '';
      if (!areFriends(user.id, to) || !live(to)) return json(res, 404, { error: 'not a friend', code: 'not-friend' });
      if (!wid || !workoutsOf(readState(to)).some(w => w.id === wid)) return json(res, 404, { error: 'no such workout', code: 'no-workout' });
      const s = social();
      const had = s.fires.find(f => f.from === user.id && f.to === to && f.wid === wid);
      if (had) s.fires = s.fires.filter(f => f !== had);
      else s.fires.push({ from: user.id, to, wid, at: now() });
      // Only the last FEED_DAYS matter; older ones would only grow the file.
      s.fires = s.fires.filter(f => now() - f.at < (FEED_DAYS + 7) * DAY);
      saveDb();
      json(res, 200, { ok: true, fired: !had });
    },

    // Once a day per friend, and only to a friend who has been away NUDGE_AFTER_DAYS or more.
    'POST /api/social/nudge': async (req, res) => {
      const user = signedIn(req, res); if (!user) return;
      const { id } = await target(req, res);
      if (!areFriends(user.id, id) || !live(id)) return json(res, 404, { error: 'not a friend', code: 'not-friend' });
      const away = daysAway(readState(id) || {}, today());
      if (away !== null && away < NUDGE_AFTER_DAYS) return json(res, 400, { error: 'they trained recently', code: 'recent' });
      const s = social();
      if (s.nudges.some(n => n.from === user.id && n.to === id && now() - n.at < DAY)) return json(res, 429, { error: 'already nudged today', code: 'again' });
      s.nudges = s.nudges.filter(n => !(n.from === user.id && n.to === id));
      s.nudges.push({ from: user.id, to: id, at: now(), seen: false });
      saveDb();
      sendPush(id, { title: 'openGym', body: `${nameOf(user.id) || 'A friend'} misses you at the gym 🔥`, tag: 'social-nudge', url: '#/friends' });
      json(res, 200, { ok: true });
    },

    'POST /api/social/nudges/seen': async (req, res) => {
      const user = signedIn(req, res); if (!user) return;
      const s = social();
      let changed = false;
      for (const n of s.nudges) if (n.to === user.id && !n.seen) { n.seen = true; changed = true; }
      if (changed) saveDb();
      json(res, 200, { ok: true });
    }
  };
}
