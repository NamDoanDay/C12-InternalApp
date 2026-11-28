import { Server } from 'socket.io';
import { verifyAccessToken } from '../modules/auth/tokens.js';

export function attachRealtime(httpServer, { pool, config, intervalMs = 500 }) {
  const io = new Server(httpServer, { path: '/socket.io', serveClient: true, transports: ['websocket', 'polling'] });
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      const claims = typeof token === 'string' ? verifyAccessToken(token, config.JWT_SECRET) : null;
      if (!claims) return next(new Error('AUTH_REQUIRED'));
      const [rows] = await pool.execute(`SELECT id, status, archived_at, must_change_password FROM app_users WHERE id = ? LIMIT 1`, [claims.userId]);
      const user = rows[0];
      if (!user || user.status !== 'active' || user.archived_at || user.must_change_password) return next(new Error('AUTH_REQUIRED'));
      socket.data.userId = user.id;
      next();
    } catch { next(new Error('AUTH_UNAVAILABLE')); }
  });
  io.on('connection', socket => socket.join(`user:${socket.data.userId}`));

  let running = false;
  const timer = setInterval(() => { void relayOutbox(io, pool, () => running, value => { running = value; }); }, intervalMs);
  timer.unref?.();

  return {
    io,
    async close() {
      clearInterval(timer);
      await new Promise(resolve => io.close(resolve));
    }
  };
}

async function relayOutbox(io, pool, isRunning, setRunning) {
  if (isRunning()) return;
  setRunning(true);
  const connection = await pool.getConnection().catch(error => {
    logRelayError(error); setRunning(false); return null;
  });
  if (!connection) return;
  try {
    await connection.beginTransaction();
    const [events] = await connection.execute(`SELECT id, event_type, aggregate_type, aggregate_id, aggregate_version, payload_json, request_id, occurred_at
      FROM outbox_events WHERE published_at IS NULL AND attempts < 20 ORDER BY occurred_at LIMIT 50 FOR UPDATE SKIP LOCKED`);
    for (const event of events) {
      const [recipients] = await connection.execute('SELECT user_id FROM outbox_recipients WHERE event_id = ?', [event.id]);
      const envelope = {
        eventId: event.id, type: event.event_type,
        entity: { type: event.aggregate_type, id: event.aggregate_id, version: event.aggregate_version == null ? null : Number(event.aggregate_version) },
        occurredAt: new Date(event.occurred_at).toISOString(), requestId: event.request_id,
        payload: event.payload_json || {}
      };
      for (const { user_id: userId } of recipients) io.to(`user:${userId}`).emit(event.event_type, envelope);
      await connection.execute('UPDATE outbox_events SET published_at = CURRENT_TIMESTAMP(3), attempts = attempts + 1 WHERE id = ? AND published_at IS NULL', [event.id]);
    }
    await connection.commit();
  } catch (error) {
    await connection.rollback().catch(() => {});
    logRelayError(error);
  } finally {
    connection.release(); setRunning(false);
  }
}

function logRelayError(error) {
  console.error(JSON.stringify({ level: 'error', event: 'socket.outbox_relay_failed', code: error.code || 'RELAY_FAILED' }));
}
