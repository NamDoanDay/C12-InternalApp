import { createHmac, randomBytes, timingSafeEqual, createHash } from 'node:crypto';

const encode = value => Buffer.from(value).toString('base64url');

export function durationSeconds(value) {
  const match = /^(\d+)(s|m|h|d)$/.exec(value);
  if (!match) throw new Error('Invalid token duration');
  const scale = { s: 1, m: 60, h: 3600, d: 86400 }[match[2]];
  const seconds = Number(match[1]) * scale;
  if (!Number.isSafeInteger(seconds) || seconds < 1 || seconds > 90 * 86400) throw new Error('Invalid token duration');
  return seconds;
}

export function createAccessToken(user, secret, ttl) {
  const now = Math.floor(Date.now() / 1000);
  const header = encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = encode(JSON.stringify({ sub: user.id, iat: now, exp: now + durationSeconds(ttl) }));
  const unsigned = `${header}.${payload}`;
  return `${unsigned}.${createHmac('sha256', secret).update(unsigned).digest('base64url')}`;
}

export function verifyAccessToken(token, secret) {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const unsigned = `${parts[0]}.${parts[1]}`;
  const expected = createHmac('sha256', secret).update(unsigned).digest();
  let actual;
  try { actual = Buffer.from(parts[2], 'base64url'); } catch { return null; }
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  try {
    const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    if (header.alg !== 'HS256' || typeof payload.sub !== 'string' || !Number.isInteger(payload.exp)) return null;
    if (payload.exp <= Math.floor(Date.now() / 1000)) return null;
    return { userId: payload.sub };
  } catch { return null; }
}

export function newOpaqueToken() {
  return randomBytes(32).toString('base64url');
}

export function tokenHash(value) {
  return createHash('sha256').update(value).digest('hex');
}
