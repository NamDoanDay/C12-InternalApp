const jwt = require('jsonwebtoken');
const env = require('../config/env');
const pool = require('../db/pool');

async function requireAuth(req, res, next) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: 'Cần đăng nhập để tiếp tục.' });
  let claims;
  try { claims = jwt.verify(token, env.jwtSecret); }
  catch { return res.status(401).json({ error: 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.' }); }
  try {
    const [accounts] = await pool.execute('SELECT a.role FROM accounts a JOIN auth_sessions s ON s.user_id = a.user_id WHERE s.token_id = ? AND s.expires_at > CURRENT_TIMESTAMP AND a.user_id = ? AND a.status = \'approved\'', [claims.jti, claims.id]);
    if (!accounts[0]) return res.status(401).json({ error: 'Tài khoản chưa được duyệt hoặc phiên đã kết thúc.' });
    req.user = { ...claims, role: accounts[0].role };
    next();
  } catch (error) { next(error); }
}
const requireAdmin = (req, res, next) => req.user?.role === 'admin' ? next() : res.status(403).json({ error: 'Chỉ quản trị viên được thực hiện thao tác này.' });
module.exports = { requireAuth, requireAdmin };
