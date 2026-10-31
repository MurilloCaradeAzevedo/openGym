/* Friends (social.js): codes, requests, the feed, the weekly ranking and nudges, against the real
   server.js in a child, the same harness as server-nudge-check.test.js. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { boundPort } from './helpers.mjs';
import { weekStart, streakWeeks, daysAway, ranking, workoutSummary, cleanCode } from '../social.js';

const API = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SECRET = crypto.randomBytes(32).toString('hex');
const mintSession = uid => {
  const payload = `${uid}:${Date.now() + 86400000}:0`;
  return payload + '.' + crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
};
const ANA = 'u_ana', BEA = 'u_bea', CAI = 'u_cai';
const today = new Date().toISOString().slice(0, 10);
const daysAgo = n => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
const set = (w, r, extra = {}) => ({ w, r, done: true, ...extra });

async function startServer(t) {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gym-social-'));
  fs.writeFileSync(path.join(dataDir, 'secret'), SECRET, { mode: 0o600 });
  const now = new Date().toISOString();
  fs.writeFileSync(path.join(dataDir, 'db.json'), JSON.stringify({
    users: [{ id: ANA, name: 'Ana', created: now }, { id: BEA, name: 'Bea', created: now }, { id: CAI, name: 'Cai', created: now }],
    creds: [], subs: [], invites: [],
  }));
  fs.writeFileSync(path.join(dataDir, `state-${ANA}.json`), JSON.stringify({
    workouts: [{ id: 'a1', d: today, name: 'Push', start: 1000, end: 3601000, entries: [{ id: 'bench', note: 'secret note', sets: [set(20, 10, { warmup: true }), set(100, 5), set(100, 5)] }], prs: ['bench'] }],
    bodyweight: [{ d: today, w: 80 }], food: [{ d: today, name: 'Pizza', kcal: 900 }],
  }));
  fs.writeFileSync(path.join(dataDir, `state-${BEA}.json`), JSON.stringify({
    workouts: [{ id: 'b1', d: daysAgo(10), name: 'Legs', entries: [{ id: 'squat', sets: [set(80, 5)] }] }],
  }));
  const child = spawn(process.execPath, ['server.js'], {
    cwd: API, stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, PORT: '0', DATA_DIR: dataDir, ORIGIN: 'http://localhost:8080', RP_ID: 'localhost' },
  });
  let log = '';
  child.stdout.on('data', d => log += d);
  child.stderr.on('data', d => log += d);
  t.after(() => { child.kill('SIGKILL'); fs.rmSync(dataDir, { recursive: true, force: true }); });
  const api = `http://127.0.0.1:${await boundPort(child, () => log)}`;
  const as = uid => async (method, route, body) => {
    const r = await fetch(api + route, {
      method, headers: { Authorization: `Bearer ${mintSession(uid)}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await r.text();
    return { status: r.status, text, body: JSON.parse(text) };
  };
  return { ana: as(ANA), bea: as(BEA), cai: as(CAI), api };
}

test('needs a session', async t => {
  const { api } = await startServer(t);
  assert.equal((await fetch(api + '/api/social')).status, 401);
  assert.equal((await fetch(api + '/api/social/feed')).status, 401);
});

test('a request by code becomes a friendship only when the other side accepts', async t => {
  const { ana, bea, cai } = await startServer(t);
  const code = (await bea('GET', '/api/social')).body.code;
  assert.match(code, /^[A-Z2-9]{8}$/);
  assert.equal((await ana('POST', '/api/social/request', { code: 'NOPE0000' })).body.code, 'unknown-code');
  assert.equal((await ana('POST', '/api/social/request', { code: (await ana('GET', '/api/social')).body.code })).body.code, 'self');

  assert.equal((await ana('POST', '/api/social/request', { code: code.toLowerCase() })).body.status, 'requested');
  // Not friends yet: Ana sees nothing of Bea, Bea sees the request.
  assert.deepEqual((await ana('GET', '/api/social/feed')).body.feed, []);
  const bs = (await bea('GET', '/api/social')).body;
  assert.deepEqual(bs.incoming.map(r => r.name), ['Ana']);
  assert.equal((await cai('POST', '/api/social/accept', { id: ANA })).status, 404, 'nobody asked Cai');

  assert.equal((await bea('POST', '/api/social/accept', { id: ANA })).status, 200);
  assert.deepEqual((await ana('GET', '/api/social')).body.friends.map(f => f.name), ['Bea']);
  assert.deepEqual((await bea('GET', '/api/social')).body.friends.map(f => f.name), ['Ana']);
  assert.deepEqual((await cai('GET', '/api/social')).body.friends, []);
});

test('the feed carries summaries only, and the ranking counts this week', async t => {
  const { ana, bea } = await startServer(t);
  await ana('POST', '/api/social/request', { code: (await bea('GET', '/api/social')).body.code });
  await bea('POST', '/api/social/accept', { id: ANA });
  const r = await bea('GET', '/api/social/feed');
  assert.equal(r.status, 200);
  assert.deepEqual(r.body.feed[0], { who: ANA, name: 'Ana', wid: 'a1', d: today, title: 'Push', minutes: 60, sets: 2, vol: 1000, prs: 1, fires: 0, fired: false });
  assert.doesNotMatch(r.text, /secret note|Pizza|bench|"w":80/);
  assert.equal(r.body.ranking[0].name, 'Ana');
  assert.equal(r.body.ranking[0].workouts, 1);
});

test('a 🔥 on a friend’s workout toggles, and only a friend can give one', async t => {
  const { ana, bea, cai } = await startServer(t);
  await ana('POST', '/api/social/request', { code: (await bea('GET', '/api/social')).body.code });
  await bea('POST', '/api/social/accept', { id: ANA });
  assert.equal((await cai('POST', '/api/social/fire', { id: ANA, wid: 'a1' })).body.code, 'not-friend');
  assert.equal((await bea('POST', '/api/social/fire', { id: ANA, wid: 'nope' })).body.code, 'no-workout');
  assert.equal((await bea('POST', '/api/social/fire', { id: ANA, wid: 'a1' })).body.fired, true);
  assert.deepEqual((({ fires, fired }) => ({ fires, fired }))((await bea('GET', '/api/social/feed')).body.feed[0]), { fires: 1, fired: true });
  assert.equal((await bea('POST', '/api/social/fire', { id: ANA, wid: 'a1' })).body.fired, false);
  assert.equal((await bea('GET', '/api/social/feed')).body.feed[0].fires, 0);
});

test('a nudge goes only to a friend who has been away, once a day', async t => {
  const { ana, bea, cai } = await startServer(t);
  assert.equal((await ana('POST', '/api/social/nudge', { id: BEA })).body.code, 'not-friend');
  await bea('POST', '/api/social/request', { code: (await ana('GET', '/api/social')).body.code });
  await ana('POST', '/api/social/accept', { id: BEA });
  assert.equal((await bea('POST', '/api/social/nudge', { id: ANA })).body.code, 'recent', 'Ana trained today');
  assert.equal((await ana('POST', '/api/social/nudge', { id: BEA })).status, 200, 'Bea is 10 days away');
  assert.equal((await ana('POST', '/api/social/nudge', { id: BEA })).status, 429);
  assert.deepEqual((await bea('GET', '/api/social')).body.nudges.map(n => n.name), ['Ana']);
  await bea('POST', '/api/social/nudges/seen');
  assert.deepEqual((await bea('GET', '/api/social')).body.nudges, []);
  // Removing the friendship ends it on both sides.
  await bea('POST', '/api/social/remove', { id: ANA });
  assert.deepEqual((await ana('GET', '/api/social')).body.friends, []);
  assert.equal((await cai('GET', '/api/social')).status, 200);
});

test('pure helpers', () => {
  assert.equal(weekStart('2026-10-30'), '2026-10-26');
  assert.equal(weekStart('2026-10-26'), '2026-10-26');
  assert.equal(cleanCode(' ab-cd 2345 x'), 'ABCD2345');
  const S = { workouts: [{ d: '2026-10-29' }, { d: '2026-10-20' }, { d: '2026-10-06' }] };
  assert.equal(streakWeeks(S, '2026-10-30'), 2);
  assert.equal(streakWeeks(S, '2026-11-02'), 2, 'an empty current week does not break it yet');
  assert.equal(daysAway(S, '2026-10-30'), 1);
  assert.equal(daysAway({}, '2026-10-30'), null);
  assert.deepEqual(workoutSummary({ d: '2026-10-29', entries: [{ sets: [set(10, 10, { phase: 'warmup' }), set(50, 10), { w: 99, r: 9 }] }] }),
    { wid: null, d: '2026-10-29', title: null, minutes: null, sets: 1, vol: 500, prs: 0 });
  assert.deepEqual(ranking([{ id: 'x', name: 'X', S: {} }, { id: 'y', name: 'Y', S }], '2026-10-30').map(p => p.id), ['y', 'x']);
});
