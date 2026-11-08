/* Friends (social.js) limits from the security review: one request push per pair per day that
   removing and asking again cannot reset, a cap on pending requests, the friend limit on both
   sides of an accept, and client-written workout fields cut to size before a friend sees them.
   The routes are driven directly with fake server helpers. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { socialRoutes, workoutSummary, MAX_PENDING, MAX_FRIENDS, MAX_VOL, MAX_MINUTES } from '../social.js';

const DAY = 86400000;
function setup(n) {
  const users = Array.from({ length: n }, (_, i) => ({ id: 'u' + i, name: 'U' + i }));
  const db = { users };
  const pushes = [];
  let t = Date.UTC(2026, 10, 6);
  const routes = socialRoutes({
    db, saveDb() {},
    json: (res, code, body) => { res.code = code; res.body = body; },
    readBody: async req => req.body || {},
    readSession: req => req.user,
    readState: () => ({}),
    sendPush: to => pushes.push(to),
    now: () => t
  });
  const call = async (key, uid, body) => {
    const res = {};
    await routes[key]({ user: users.find(u => u.id === uid), body }, res);
    return res;
  };
  const code = async uid => (await call('GET /api/social', uid)).body.code;
  return { db, pushes, call, code, tick: ms => { t += ms; } };
}

test('asking, withdrawing and asking again sends one notification a day, not one per ask', async () => {
  const h = setup(2);
  const c = await h.code('u1');
  for (let i = 0; i < 5; i++) {
    assert.equal((await h.call('POST /api/social/request', 'u0', { code: c })).body.status, 'requested');
    await h.call('POST /api/social/remove', 'u0', { id: 'u1' });
  }
  assert.deepEqual(h.pushes, ['u1']);
  h.tick(DAY);
  await h.call('POST /api/social/request', 'u0', { code: c });
  assert.deepEqual(h.pushes, ['u1', 'u1'], 'a day later the ask notifies again');
});

test('a profile cannot keep more than MAX_PENDING requests open', async () => {
  const h = setup(MAX_PENDING + 2);
  for (let i = 1; i <= MAX_PENDING; i++) {
    const r = await h.call('POST /api/social/request', 'u0', { code: await h.code('u' + i) });
    assert.equal(r.body.status, 'requested', 'request ' + i);
  }
  const over = await h.call('POST /api/social/request', 'u0', { code: await h.code('u' + (MAX_PENDING + 1)) });
  assert.equal(over.code, 400);
  assert.equal(over.body.code, 'limit');
});

test('accepting checks the friend limit of both people', async () => {
  const h = setup(2);
  await h.call('POST /api/social/request', 'u0', { code: await h.code('u1') });
  // u1 fills up meanwhile (the list holds ids of live users only, so reuse u1's own pairs).
  h.db.users.push(...Array.from({ length: MAX_FRIENDS }, (_, i) => ({ id: 'f' + i, name: 'F' + i })));
  h.db.social.friends.push(...Array.from({ length: MAX_FRIENDS }, (_, i) => ({ a: 'u1', b: 'f' + i, at: 0 })));
  const r = await h.call('POST /api/social/accept', 'u1', { id: 'u0' });
  assert.equal(r.code, 400);
  assert.equal(r.body.code, 'limit');
  assert.equal(h.db.social.requests.length, 1, 'the request stays for later');
});

test('a friend sees the workout date, minutes and volume cut to sane values', () => {
  const w = workoutSummary({ d: '2026-11-06T23:59:59' + 'x'.repeat(5000), vol: 1e15, start: 1, end: 1e12, entries: [] });
  assert.equal(w.d, '2026-11-06');
  assert.equal(w.vol, MAX_VOL);
  assert.equal(w.minutes, MAX_MINUTES);
  assert.equal(workoutSummary({ d: '2026-11-06', vol: -50, entries: [] }).vol, 0);
});
