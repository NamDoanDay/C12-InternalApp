const http = require('node:http');
const env = require('./config/env');
const app = require('./app');
const pool = require('./db/pool');
const migrate = require('./db/migrate');
const { ensureSeed } = require('./db/workspace-store');
const seedAccounts = require('./auth/seed-accounts');
const { makeWorkspace } = require('../../database/seeds/seed-workspace');
const createSocketServer = require('./sockets');

async function start() {
  await migrate();
  const seed = makeWorkspace();
  await seedAccounts(seed);
  await ensureSeed(seed);
  const server = http.createServer(app);
  const io = createSocketServer(server);
  app.set('io', io);
  server.listen(env.port, '0.0.0.0', () => console.log(`C12 API listening on ${env.port}`));
  const shutdown = async () => { server.close(); await pool.end(); process.exit(0); };
  process.on('SIGTERM', shutdown); process.on('SIGINT', shutdown);
}
start().catch(error => { console.error('Startup failed:', error); process.exit(1); });
