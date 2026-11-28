import test from 'node:test';
import assert from 'node:assert/strict';
import { readConfig } from '../config/env.js';

test('backend config rejects an empty database password', () => {
  assert.throws(() => readConfig({ MYSQL_PASSWORD: '' }), /MYSQL_PASSWORD/);
});

test('backend config uses safe local defaults when a password is provided', () => {
  const config = readConfig({ MYSQL_PASSWORD: 'test-only-password' });
  assert.equal(config.API_PORT, 3000);
  assert.equal(config.MYSQL_DATABASE, 'c12_internalapp');
  assert.equal(config.MYSQL_POOL_SIZE, 10);
});
