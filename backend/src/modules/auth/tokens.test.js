import test from 'node:test';
import assert from 'node:assert/strict';
import { createAccessToken, durationSeconds, verifyAccessToken } from './tokens.js';

test('access JWT signs and verifies an opaque user id with expiry', () => {
  const secret = 'a-test-only-signing-secret-with-more-than-32-bytes';
  const token = createAccessToken({ id: 'user-id' }, secret, '15m');
  assert.deepEqual(verifyAccessToken(token, secret), { userId: 'user-id' });
  assert.equal(verifyAccessToken(`${token}x`, secret), null);
  assert.equal(verifyAccessToken(token, 'a-different-signing-secret-with-more-than-32-bytes'), null);
  assert.equal(durationSeconds('7d'), 604800);
  assert.throws(() => durationSeconds('15 minutes'), /duration/);
});
