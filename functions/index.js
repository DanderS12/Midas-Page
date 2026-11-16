const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { beforeUserSignedIn, beforeUserCreated } = require('firebase-functions/v2/identity');
const { createHash } = require('node:crypto');
const { emailKey, blockKey, hashPassword, checkPassword, defaultRoom } = require('./policy');
initializeApp();
const db = getFirestore();
const ADMIN_EMAIL = 'david.d.rodriguez0804@gmail.com';
function admin(req) {
  if (req.auth?.token.email?.toLowerCase() !== ADMIN_EMAIL) throw new HttpsError('permission-denied', 'Admin access required.');
}
function invalid(error) { throw new HttpsError('invalid-argument', error.message); }
async function enforceBlocks(email, ip) {
  if (email?.toLowerCase() === ADMIN_EMAIL) return; // Do not allow accidental owner lockout.
  const checks = [];
  if (email) checks.push(db.collection('blockedEmails').doc(emailKey(email)).get());
  if (ip) checks.push(db.collection('blockedIPs').doc(blockKey('ip', ip)).get());
  if ((await Promise.all(checks)).some(s => s.exists)) throw new HttpsError('permission-denied', 'Access is blocked.');
}
async function checkIdentity(event) { await enforceBlocks(event.data.email, event.ipAddress); }
exports.checkNewAccount = beforeUserCreated(checkIdentity);
exports.checkSignIn = beforeUserSignedIn(async event => {
  await checkIdentity(event);
  return { sessionClaims: { signInIpAddress: event.ipAddress ? blockKey('ip', event.ipAddress) : 'unknown' } };
});

// Called once per Firebase authentication session, not on every page view. The token's
// auth_time is verified by Firebase, and clients cannot edit login history or the directory.
exports.recordSession = onCall(async req => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Log in first.');
  await enforceBlocks(req.auth.token.email, req.rawRequest.ip);
  const uid = req.auth.uid;
  if (req.auth.token.email?.toLowerCase() === ADMIN_EMAIL) await db.collection('siteRoles').doc(uid).set({ role: 'admin' });
  const email = emailKey(req.auth.token.email);
  await db.collection('memberDirectory').doc(uid).set({ email, uid }, { merge: true });
  const ref = db.collection('loginHistory').doc(uid + '_' + req.auth.token.auth_time);
  await db.runTransaction(async tx => {
    if (!(await tx.get(ref)).exists) tx.create(ref, { uid, email, ts: req.auth.token.auth_time * 1000, observedAt: FieldValue.serverTimestamp(), ip: req.auth.token.signInIpAddress || req.rawRequest.ip || '' });
  });
  return { ok: true };
});
exports.manageBlock = onCall(async req => {
  admin(req);
  const { kind, value, remove } = req.data || {};
  let key;
  try { key = blockKey(kind, value); } catch (e) { invalid(e); }
  if (kind === 'email' && key === ADMIN_EMAIL) throw new HttpsError('failed-precondition', 'The owner cannot be blocked.');
  const ref = db.collection(kind === 'email' ? 'blockedEmails' : 'blockedIPs').doc(key);
  // Keep a single compact Storage policy in sync atomically; Storage rules have
  // a two-document access limit, and the other lookup authorizes the DM itself.
  const batch = db.batch();
  if (remove) batch.delete(ref); else batch.set(ref, { value: key, ts: Date.now() });
  batch.set(db.doc('accessPolicy/blocks'), {
    [kind === 'email' ? 'emails' : 'ips']: remove ? FieldValue.arrayRemove(key) : FieldValue.arrayUnion(key)
  }, { merge: true });
  await batch.commit();
  if (!remove) {
    if (kind === 'email') {
      try { const u = await getAuth().getUserByEmail(key); await getAuth().revokeRefreshTokens(u.uid); }
      catch (e) { if (e.code !== 'auth/user-not-found') throw e; }
    }
  }
  return { ok: true };
});
exports.restoreRoom = onCall(async req => {
  admin(req);
  let email;
  try { email = emailKey(req.data?.email); } catch (e) { invalid(e); }
  let user;
  try { user = await getAuth().getUserByEmail(email); }
  catch (e) { if (e.code === 'auth/user-not-found') throw new HttpsError('not-found', 'No account has that email.'); throw e; }
  const ref = db.collection('users').doc(user.uid);
  const archive = db.collection('roomArchive').doc(user.uid);
  await db.runTransaction(async tx => {
    const [existing, saved] = await Promise.all([tx.get(ref), tx.get(archive)]);
    if (existing.exists) throw new HttpsError('already-exists', 'This member already has a room. Nothing was overwritten.');
    tx.create(ref, saved.exists ? saved.data().room : defaultRoom(user.uid, user.displayName || email.split('@')[0]));
    tx.set(db.collection('memberDirectory').doc(user.uid), { uid: user.uid, email });
  });
  return { ok: true };
});
exports.deleteRoom = onCall(async req => {
  admin(req);
  const uid = String(req.data?.uid || '');
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(uid)) throw new HttpsError('invalid-argument', 'Invalid member.');
  const ref = db.collection('users').doc(uid);
  await db.runTransaction(async tx => {
    const room = await tx.get(ref);
    if (!room.exists) throw new HttpsError('not-found', 'Room not found.');
    tx.set(db.collection('roomArchive').doc(uid), { room: room.data(), deletedAt: FieldValue.serverTimestamp() });
    tx.delete(ref);
  });
  return { ok: true };
});
exports.assignCreator = onCall(async req => {
  admin(req);
  let email;
  try { email = emailKey(req.data?.email); } catch (e) { invalid(e); }
  const id = String(req.data?.id || '');
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(id)) throw new HttpsError('invalid-argument', 'Invalid page.');
  let user;
  try { user = await getAuth().getUserByEmail(email); }
  catch (e) { if (e.code === 'auth/user-not-found') throw new HttpsError('not-found', 'Create this account first.'); throw e; }
  await db.runTransaction(async tx => {
    const page = db.collection('sponsors').doc(id);
    const saved = await tx.get(page);
    if (!saved.exists || saved.data().kind !== 'creator') throw new HttpsError('not-found', 'Creator page not found.');
    tx.update(page, { owner: user.uid });
    tx.set(db.collection('memberDirectory').doc(user.uid), { uid: user.uid, email });
  });
  return { ok: true };
});
exports.setCreatorPassword = onCall(async req => {
  admin(req);
  const id = String(req.data?.id || '');
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(id)) throw new HttpsError('invalid-argument', 'Invalid page.');
  const page = await db.collection('sponsors').doc(id).get();
  if (!page.exists || page.data().kind !== 'creator' || !page.data().owner) throw new HttpsError('not-found', 'Assign a creator account first.');
  const password = req.data?.password;
  if (typeof password !== 'string' || password.length < 8 || password.length > 128) throw new HttpsError('invalid-argument', 'Use 8–128 characters.');
  await getAuth().updateUser(page.data().owner, { password });
  await getAuth().revokeRefreshTokens(page.data().owner);
  return { ok: true };
});
exports.setMemberStyle = onCall(async req => {
  admin(req);
  let email;
  try { email = emailKey(req.data?.email); } catch (e) { invalid(e); }
  const role = req.data?.role;
  if (!['creator', 'sponsor', 'member'].includes(role)) throw new HttpsError('invalid-argument', 'Invalid style.');
  let user;
  try { user = await getAuth().getUserByEmail(email); }
  catch (e) { if (e.code === 'auth/user-not-found') throw new HttpsError('not-found', 'Account not found.'); throw e; }
  if (email === ADMIN_EMAIL) throw new HttpsError('failed-precondition', 'The owner keeps the admin style.');
  const ref = db.collection('siteRoles').doc(user.uid);
  if (role === 'member') await ref.delete(); else await ref.set({ role });
  return { ok: true };
});
exports.setEntrancePassword = onCall(async req => {
  admin(req);
  let record;
  try { record = await hashPassword(req.data?.password); } catch (e) { invalid(e); }
  await db.doc('serverSecrets/entrance').set(record);
  return { ok: true };
});
exports.verifyEntrance = onCall({ maxInstances: 5 }, async req => {
  await enforceBlocks(null, req.rawRequest.ip);
  const key = createHash('sha256').update(req.rawRequest.ip || 'unknown').digest('hex');
  const ref = db.collection('entranceAttempts').doc(key);
  const now = Date.now();
  const allowed = await db.runTransaction(async tx => {
    const data = (await tx.get(ref)).data() || {};
    const count = data.until > now ? data.count + 1 : 1;
    tx.set(ref, { count, until: data.until > now ? data.until : now + 60000, expiresAt: new Date(now + 86400000) });
    return count <= 10;
  });
  if (!allowed) throw new HttpsError('resource-exhausted', 'Too many attempts. Wait a minute.');
  const saved = await db.doc('serverSecrets/entrance').get();
  if (!saved.exists) throw new HttpsError('failed-precondition', 'The admin needs to configure the entrance password.');
  return { ok: await checkPassword(req.data?.password, saved.data()) };
});
