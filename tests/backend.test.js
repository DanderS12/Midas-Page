const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const { emailKey, blockKey, hashPassword, checkPassword, defaultRoom } = require('../functions/policy');
test('email keys normalize and cannot inject Firestore paths', () => {
  assert.equal(emailKey(' Person@Example.COM '), 'person@example.com');
  for (const invalid of ['bad', 'name/path@example.com', '', 'a b@example.com']) assert.throws(() => emailKey(invalid));
});
test('IP blacklist validates and canonicalizes exact addresses', () => {
  assert.equal(blockKey('ip', '127.0.0.1'), '127.0.0.1');
  assert.equal(blockKey('ip', '2001:0db8:0000::1'), '2001:db8::1');
  assert.throws(() => blockKey('ip', '127.0.0.0/8'));
  assert.throws(() => blockKey('other', '127.0.0.1'));
});
test('entrance passwords are salted and compared safely', async () => {
  const password = randomBytes(24).toString('hex');
  const record = await hashPassword(password);
  assert.notEqual(record.hash, (await hashPassword(password)).hash);
  assert.equal(await checkPassword(password, record), true);
  assert.equal(await checkPassword(randomBytes(24).toString('hex'), record), false);
  assert.equal(await checkPassword('x'.repeat(129), record), false);
  await assert.rejects(hashPassword('x'));
});
test('room recreation has valid defaults without exposing account email', () => {
  const room = defaultRoom('member', 'A'.repeat(60));
  assert.equal(room.uid, 'member');assert.equal(room.name.length, 40);assert.equal(room.email, undefined);
  assert.equal(room.story, '');assert.match(room.accent, /^#[a-f0-9]{6}$/);
});
test('all privileged callables reject non-admins before touching the database', async () => {
  const functions = require('../functions');
  for (const name of ['manageBlock','restoreRoom','deleteRoom','assignCreator','setCreatorPassword','setMemberStyle','setEntrancePassword']) {
    await assert.rejects(functions[name].run({ auth: null, data: {} }), { code: 'permission-denied' });
    await assert.rejects(functions[name].run({ auth: { uid: 'stranger', token: { email: 'stranger@example.com' } }, data: {} }), { code: 'permission-denied' });
  }
  await assert.rejects(functions.recordSession.run({ auth: null }), { code: 'unauthenticated' });
});
