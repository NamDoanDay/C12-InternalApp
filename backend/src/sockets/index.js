const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const pool = require('../db/pool');

function createSocketServer(server) {
  const io = new Server(server, { path: '/socket.io/', cors: { origin: false }, transports: ['websocket', 'polling'] });
  io.use(async (socket, next) => {
    try {
      const claims = jwt.verify(socket.handshake.auth?.token || '', env.jwtSecret);
      const [rows] = await pool.execute('SELECT a.role, a.status FROM accounts a JOIN auth_sessions s ON s.user_id = a.user_id WHERE s.token_id = ? AND s.expires_at > CURRENT_TIMESTAMP AND a.status = \'approved\'', [claims.jti]);
      if (!rows[0]) return next(new Error('unauthorized'));
      socket.user = { id: claims.id, role: rows[0].role };
      next();
    } catch (error) { next(error); }
  });
  io.on('connection', socket => { socket.join(`user:${socket.user.id}`); socket.join(`role:${socket.user.role}`); });
  return io;
}
module.exports = createSocketServer;
