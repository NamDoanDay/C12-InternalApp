const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('node:crypto');
const env = require('../config/env');
const { pool, readWorkspace } = require('../db/workspace-store');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();
async function issue(account) {
  const tokenId = crypto.randomUUID();
  const token = jwt.sign({ id: account.user_id, role: account.role, jti: tokenId }, env.jwtSecret, { expiresIn: env.jwtTtl });
  const expiresAt = new Date(jwt.decode(token).exp * 1000);
  await pool.execute('INSERT INTO auth_sessions (token_id, user_id, expires_at) VALUES (?, ?, ?)', [tokenId, account.user_id, expiresAt]);
  return { token, userId: account.user_id, role: account.role };
}

router.post('/login', async (req, res, next) => {
  try {
    const identity = String(req.body.identity || '').trim().toLocaleLowerCase('vi');
    const [rows] = await pool.execute('SELECT * FROM accounts WHERE LOWER(username) = ? OR LOWER(email) = ? LIMIT 1', [identity, identity]);
    const account = rows[0];
    if (!account || account.status !== 'approved' || !await bcrypt.compare(String(req.body.password || ''), account.password_hash)) {
      return res.status(401).json({ error: 'Tên đăng nhập, mật khẩu không đúng hoặc tài khoản chưa được duyệt.' });
    }
    res.json(await issue(account));
  } catch (error) { next(error); }
});

router.post('/demo-login', async (req, res, next) => {
  try {
    if (!env.demoLoginEnabled) return res.status(404).json({ error: 'Đăng nhập demo đã bị tắt.' });
    const role = req.body.role === 'admin' ? 'admin' : 'user';
    const [rows] = await pool.execute('SELECT * FROM accounts WHERE role = ? AND is_demo = 1 AND status = \'approved\' ORDER BY username LIMIT 1', [role]);
    if (!rows[0]) return res.status(404).json({ error: 'Tài khoản demo chưa được seed.' });
    res.json(await issue(rows[0]));
  } catch (error) { next(error); }
});

router.post('/register', async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    const name = String(req.body.name || '').trim(), email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    if (!name || !email || password.length < 8) return res.status(400).json({ error: 'Nhập họ tên, email và mật khẩu tối thiểu 8 ký tự.' });
    const [existing] = await connection.execute('SELECT user_id FROM accounts WHERE email = ?', [email]);
    if (existing.length) return res.status(409).json({ error: 'Email đã được đăng ký.' });
    const id = `usr-${crypto.randomUUID()}`;
    await connection.beginTransaction();
    await connection.execute('INSERT INTO accounts (user_id, username, email, password_hash, role, status, is_demo) VALUES (?, ?, ?, ?, \'user\', \'pending\', 0)', [id, email, email, await bcrypt.hash(password, 12)]);
    const [rows] = await connection.query('SELECT payload FROM workspace_state WHERE id = 1 FOR UPDATE');
    const state = typeof rows[0].payload === 'string' ? JSON.parse(rows[0].payload) : rows[0].payload;
    state.users ||= [];
    state.users.push({ id, name, email, role: 'user', status: 'pending', personId: '' });
    await connection.execute('UPDATE workspace_state SET revision = revision + 1, payload = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1', [JSON.stringify(state)]);
    await connection.commit();
    req.app.get('io')?.emit('workspace.updated', { actorId: id, registration: true, changedAt: new Date().toISOString() });
    res.status(201).json({ message: 'Đã gửi đăng ký. Chờ quản trị viên phê duyệt.' });
  } catch (error) { await connection.rollback(); next(error); }
  finally { connection.release(); }
});

router.post('/accounts', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const user = req.body.user || {}, password = String(req.body.password || '');
    if (!user.id || !user.email || password.length < 8) return res.status(400).json({ error: 'Tài khoản cần ID, email và mật khẩu tối thiểu 8 ký tự.' });
    await pool.execute('INSERT INTO accounts (user_id, username, email, password_hash, role, status, is_demo) VALUES (?, ?, ?, ?, ?, \'approved\', 0)', [user.id, user.email.toLowerCase(), user.email.toLowerCase(), await bcrypt.hash(password, 12), user.role === 'admin' ? 'admin' : 'user']);
    req.app.get('io')?.emit('account.created', { actorId: req.user.id, userId: user.id, changedAt: new Date().toISOString() });
    res.status(201).json({ message: 'Đã tạo tài khoản đăng nhập.' });
  } catch (error) { if (error.code === 'ER_DUP_ENTRY') error.status = 409; next(error); }
});

router.get('/session', requireAuth, async (req, res, next) => {
  try {
    const [rows] = await pool.execute('SELECT user_id, username, email, role, status FROM accounts WHERE user_id = ?', [req.user.id]);
    if (!rows[0] || rows[0].status !== 'approved') return res.status(401).json({ error: 'Tài khoản chưa được duyệt.' });
    const { state, revision } = await readWorkspace();
    const user = state.users.find(item => item.id === req.user.id);
    if (!user) return res.status(401).json({ error: 'Tài khoản không còn trong workspace.' });
    res.json({ account: rows[0], revision, user });
  } catch (error) { next(error); }
});

router.post('/logout', requireAuth, async (req, res, next) => {
  try { await pool.execute('DELETE FROM auth_sessions WHERE token_id = ?', [req.user.jti]); res.json({ ok: true }); }
  catch (error) { next(error); }
});

module.exports = router;
