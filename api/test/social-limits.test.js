/* Friends: the limits that keep the social routes from being used to spam, guess codes or grow the
   database. The routes get their helpers handed in, so they are driven here without a server. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { socialRoutes, workoutSummary, MAX_FRIENDS, MAX_PENDING_OUT, MAX_PENDING_IN, ASK_PER_HOUR } from '../social.js';

const HOUR = 3600000;
const DAY = 24 * HOUR;

function setup(userCount = 3) {
  const users = Array.from({ length: userCount }, (_, i) => ({ id: `u${i}`, name: `User ${i}` }));
  const codes = {};
  users.forEach((u, i) => { codes[u.id] = 'AAAA' + String(i).padStart(4, '0'); });
  const db = { users, social: { codes } };
  let clock = Date.UTC(2026, 10, 8, 12);
  const pushes = [];
  let session = users[0];
  const routes = socialRoutes({
    db, saveDb() {},
    json: (res, status, body) => { res.status = status; res.body = body; },
    readBody: async req => req.body,
    readSession: () => session,
    readState: () => ({}),
    sendPush: (to, msg) => pushes.push({ to, msg }),
    now: () => clock,
  });
  const call = async (route, body, as) => {
    if (as) session = users.find(u => u.id === as);
    const res = {};
    await routes[route]({ body }, res);
    return res;
  };
  return { db, users, codes, pushes, call, advance: ms => { clock += ms; }, as: id => { session = users.find(u => u.id === id); } };
}

test('asking again after a remove does not push again within a day', async () => {
  const { call, codes, pushes, advance } = setup();
  await call('POST /api/social/request', { code: codes.u1 }, 'u0');
  await call('POST /api/social/remove', { id: 'u1' }, 'u0');
  await call('POST /api/social/request', { code: codes.u1 }, 'u0');
  await call('POST /api/social/remove', { id: 'u1' }, 'u0');
  await call('POST /api/social/request', { code: codes.u1 }, 'u0');
  assert.equal(pushes.length, 1);
  advance(DAY + HOUR);
  await call('POST /api/social/remove', { id: 'u1' }, 'u0');
  await call('POST /api/social/request', { code: codes.u1 }, 'u0');
  assert.equal(pushes.length, 2);
});

test('requests are rationed per hour, whether or not the code exists', async () => {
  const { call, advance } = setup();
  let last;
  for (let i = 0; i < ASK_PER_HOUR; i++) last = await call('POST /api/social/request', { code: 'ZZZZZZZZ' }, 'u0');
  assert.equal(last.status, 404);
  const over = await call('POST /api/social/request', { code: 'ZZZZZZZZ' }, 'u0');
  assert.equal(over.status, 429);
  assert.equal(over.body.code, 'locked');
  advance(HOUR + 1000);
  assert.equal((await call('POST /api/social/request', { code: 'ZZZZZZZZ' }, 'u0')).status, 404);
});

test('the ration is per person: one person using it up does not stop another', async () => {
  const { call, codes } = setup();
  for (let i = 0; i <= ASK_PER_HOUR; i++) await call('POST /api/social/request', { code: 'ZZZZZZZZ' }, 'u0');
  assert.equal((await call('POST /api/social/request', { code: codes.u0 }, 'u1')).status, 200);
});

test('a person can have only so many requests waiting', async () => {
  const { call, codes } = setup(MAX_PENDING_OUT + 3);
  for (let i = 1; i <= MAX_PENDING_OUT; i++) {
    assert.equal((await call('POST /api/social/request', { code: codes[`u${i}`] }, 'u0')).status, 200);
  }
  const over = await call('POST /api/social/request', { code: codes[`u${MAX_PENDING_OUT + 1}`] }, 'u0');
  assert.equal(over.status, 400);
  assert.equal(over.body.code, 'limit');
});

test('a person can have only so many requests waiting for them; asking back still works', async () => {
  const { db, call, codes, pushes } = setup(3);
  const fill = to => Array.from({ length: MAX_PENDING_IN }, (_, i) => ({ from: `${to}x${i}`, to, at: 1 }));
  db.social.requests = [...fill('u1'), { from: 'u1', to: 'u0', at: 1 }, ...fill('u2')];
  db.users.push(...db.social.requests.filter(r => r.from.includes('x')).map(r => ({ id: r.from, name: r.from })));
  const before = db.social.requests.length;
  const over = await call('POST /api/social/request', { code: codes.u2 }, 'u0');
  assert.equal(over.status, 400);
  assert.equal(over.body.code, 'limit');
  assert.equal(db.social.requests.length, before);
  assert.equal(pushes.length, 0);
  const back = await call('POST /api/social/request', { code: codes.u1 }, 'u0');
  assert.equal(back.status, 200);
  assert.equal(back.body.status, 'friends');
});

test('accepting also stops at the friend limit, for either side', async () => {
  const { db, call, codes } = setup(4);
  await call('POST /api/social/request', { code: codes.u1 }, 'u0');
  db.social.friends = Array.from({ length: MAX_FRIENDS }, (_, i) => ({ a: 'u1', b: `x${i}`, at: 1 }));
  db.users.push(...db.social.friends.map(f => ({ id: f.b, name: f.b })));
  const res = await call('POST /api/social/accept', { id: 'u0' }, 'u1');
  assert.equal(res.status, 400);
  assert.equal(res.body.code, 'limit');
});

test('what a friend sees of a workout is bounded, whatever the sender put in it', () => {
  const s = workoutSummary({ id: 'x'.repeat(500), d: '2026-11-08' + 'A'.repeat(5000), name: 'N'.repeat(500), vol: 1e30, prs: [] });
  assert.equal(s.d, '2026-11-08');
  assert.ok(s.wid.length <= 64);
  assert.ok(s.title.length <= 60);
  assert.ok(s.vol <= 1e9);
  assert.equal(workoutSummary({ d: '2026-11-08', vol: -5 }).vol, 0);
});
