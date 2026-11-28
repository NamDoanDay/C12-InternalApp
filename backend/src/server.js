import { createServer } from 'node:http';
import { readConfig } from './config/env.js';
import { createPool } from './db/pool.js';
import { runMigrations } from './db/migrate.js';
import { createApp } from './app.js';
import { attachRealtime } from './realtime/socket.js';

const config = readConfig();
const pool = createPool(config);
let server;
let realtime;

try {
  await runMigrations(pool);
  const app = createApp({ pool, config });
  server = createServer(app);
  realtime = attachRealtime(server, { pool, config });
  server.listen(config.API_PORT, '0.0.0.0', () => {
    console.log(JSON.stringify({ level: 'info', event: 'server.ready', port: config.API_PORT }));
  });
} catch (error) {
  console.error(JSON.stringify({ level: 'error', event: 'startup.failed', message: error.message }));
  await pool.end();
  process.exitCode = 1;
}

async function shutdown(signal) {
  console.log(JSON.stringify({ level: 'info', event: 'server.shutdown', signal }));
  if (realtime) await realtime.close();
  else if (server) await new Promise(resolve => server.close(resolve));
  await pool.end();
  process.exit(0);
}

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));
