const { scrypt: derive, randomBytes, timingSafeEqual } = require('node:crypto');
const { promisify } = require('node:util');
const { isIP } = require('node:net');
const scrypt = promisify(derive);
function emailKey(value) {
  const email = String(value || '').trim().toLowerCase();
  if (!/^[^\s/@]+@[^\s/@]+\.[^\s/@]+$/.test(email) || email.length > 254) throw new Error('Enter a valid email.');
  return email;
}
function blockKey(kind, value) {
  if (kind === 'email') return emailKey(value);
  const ip = String(value || '').trim();
  if (kind !== 'ip' || !isIP(ip)) throw new Error('Enter an exact IPv4 or IPv6 address, not a range.');
  // URL canonicalizes equivalent IPv6 representations.
  return isIP(ip) === 6 ? new URL('http://[' + ip + ']').hostname.slice(1, -1) : ip;
}
async function hashPassword(password) {
  if (typeof password !== 'string' || password.length < 8 || password.length > 128) throw new Error('Use 8–128 characters.');
  const salt = randomBytes(16).toString('hex');
  return { salt, hash: (await scrypt(password, salt, 64)).toString('hex') };
}
async function checkPassword(password, record) {
  if (!record || typeof password !== 'string' || password.length > 128) return false;
  const actual = await scrypt(password, record.salt, 64);
  const expected = Buffer.from(record.hash, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
function defaultRoom(uid, name) {
  return { uid, name: String(name || 'Golden Guest').slice(0, 40), story: '', accent: '#f5c542', bg: '#0b0805', panel: '#17110a', text: '#f3e6c4', border: '#c8921b', btn: '#f5c542', gs: 'sparkle', gc: '#ffd24a', ps: 'paws', pc: '#e8b230', song: '', songTitle: '', ts: Date.now() };
}
module.exports = { emailKey, blockKey, hashPassword, checkPassword, defaultRoom };
