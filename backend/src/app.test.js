import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from './app.js';
import { readConfig } from './config/env.js';

const testConfig = readConfig({ MYSQL_PASSWORD: 'test-only-password' });

async function withServer(app, callback) {
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  try {
    const { port } = server.address();
    await callback(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
}

test('live health endpoint is available without database access', async () => {
  const app = createApp({ pool: { query: async () => { throw new Error('should not query'); } }, config: testConfig });
  await withServer(app, async origin => {
    const response = await fetch(`${origin}/health/live`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: 'ok' });
    assert.ok(response.headers.get('x-request-id'));
  });
});

test('ready health endpoint reports database scope and request id', async () => {
  const app = createApp({ pool: { query: async () => { throw new Error('connection refused'); } }, config: testConfig });
  await withServer(app, async origin => {
    const response = await fetch(`${origin}/health/ready`);
    const body = await response.json();
    assert.equal(response.status, 503);
    assert.equal(body.error.scope, 'Database');
    assert.equal(body.error.code, 'DATABASE_UNAVAILABLE');
    assert.equal(body.error.requestId, response.headers.get('x-request-id'));
    assert.equal(JSON.stringify(body).includes('connection refused'), false);
  });
});

test('unknown routes use the public error envelope', async () => {
  const app = createApp({ pool: {}, config: testConfig });
  await withServer(app, async origin => {
    const response = await fetch(`${origin}/missing`);
    const body = await response.json();
    assert.equal(response.status, 404);
    assert.equal(body.error.code, 'NOT_FOUND');
    assert.equal(body.error.scope, 'Backend');
  });
});

test('malformed JSON is a client error, not a server error', async () => {
  const app = createApp({ pool: {}, config: testConfig });
  await withServer(app, async origin => {
    const response = await fetch(`${origin}/missing`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{' });
    const body = await response.json();
    assert.equal(response.status, 400);
    assert.equal(body.error.code, 'BAD_REQUEST');
    assert.equal(body.error.scope, 'Backend');
  });
});

test('private API rejects requests without an access token', async () => {
  const app = createApp({ pool: {}, config: testConfig });
  await withServer(app, async origin => {
    const response = await fetch(`${origin}/api/v1/tasks`);
    const body = await response.json();
    assert.equal(response.status, 401);
    assert.equal(body.error.code, 'AUTH_REQUIRED');
  });
});
