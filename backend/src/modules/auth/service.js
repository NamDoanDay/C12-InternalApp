import { randomUUID, timingSafeEqual } from 'node:crypto';
import argon2 from 'argon2';
import { AppError } from '../../http/errors.js';
import { createAccessToken, durationSeconds, newOpaqueToken, tokenHash } from './tokens.js';

const normalize = value => value.trim().toLocaleLowerCase('en-US');

export function createAuthService(pool, config) {
  const refreshSeconds = durationSeconds(config.JWT_REFRESH_TTL);

  function issueAccess(user) {
    return { accessToken: createAccessToken(user, config.JWT_SECRET, config.JWT_ACCESS_TTL), expiresIn: durationSeconds(config.JWT_ACCESS_TTL) };
  }

  async function createRefresh(connection, userId, rotatedFrom = null) {
    const refreshToken = newOpaqueToken();
    const csrfToken = newOpaqueToken();
    const expiresAt = new Date(Date.now() + refreshSeconds * 1000);
    await connection.execute(
      `INSERT INTO refresh_tokens (id, user_id, token_hash, csrf_hash, expires_at, rotated_from)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [randomUUID(), userId, tokenHash(refreshToken), tokenHash(csrfToken), expiresAt, rotatedFrom]
    );
    return { refreshToken, csrfToken, expiresAt };
  }

  async function login(identifier, password) {
    const key = normalize(identifier);
    const [rows] = await pool.execute(
      `SELECT id, username, display_name, email, role, status, password_hash, must_change_password
       FROM app_users WHERE archived_at IS NULL AND (normalized_username = ? OR normalized_email = ?) LIMIT 1`, [key, key]
    );
    const user = rows[0];
    let valid = false;
    if (user?.status === 'active') {
      try { valid = await argon2.verify(user.password_hash, password); } catch { valid = false; }
    }
    if (!valid) throw new AppError(401, 'INVALID_CREDENTIALS', 'Tên đăng nhập hoặc mật khẩu không đúng.');
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const session = await createRefresh(connection, user.id);
      await connection.commit();
      return { user: publicUser(user), ...issueAccess(user), ...session };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally { connection.release(); }
  }

  async function rotate(refreshToken, csrfCookie, csrfHeader) {
    const connection = await pool.getConnection();
    let nextSession;
    let user;
    let rejected = false;
    try {
      await connection.beginTransaction();
      const [sessions] = await connection.execute(
        `SELECT id, user_id, csrf_hash, expires_at, revoked_at FROM refresh_tokens WHERE token_hash = ? FOR UPDATE`,
        [tokenHash(refreshToken)]
      );
      const session = sessions[0];
      if (!session) throw new AppError(401, 'AUTH_REQUIRED', 'Phiên đăng nhập đã hết hạn.');
      const suppliedCsrf = csrfCookie && csrfHeader && safeEqual(csrfCookie, csrfHeader) && safeEqual(session.csrf_hash || '', tokenHash(csrfHeader));
      if (!suppliedCsrf) throw new AppError(403, 'CSRF_INVALID', 'Yêu cầu bảo mật không hợp lệ. Hãy tải lại trang.');
      if (session.revoked_at) {
        await connection.execute('UPDATE refresh_tokens SET revoked_at = COALESCE(revoked_at, CURRENT_TIMESTAMP(3)) WHERE user_id = ? AND revoked_at IS NULL', [session.user_id]);
        rejected = true;
      } else if (new Date(session.expires_at).getTime() <= Date.now()) {
        await connection.execute('UPDATE refresh_tokens SET revoked_at = CURRENT_TIMESTAMP(3) WHERE id = ?', [session.id]);
        rejected = true;
      } else {
        const [users] = await connection.execute(
          `SELECT id, username, display_name, email, role, status, must_change_password FROM app_users
           WHERE id = ? AND archived_at IS NULL LIMIT 1`, [session.user_id]
        );
        user = users[0];
        if (!user || user.status !== 'active') rejected = true;
        await connection.execute('UPDATE refresh_tokens SET revoked_at = CURRENT_TIMESTAMP(3) WHERE id = ?', [session.id]);
        if (!rejected) nextSession = await createRefresh(connection, user.id, session.id);
      }
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally { connection.release(); }
    if (rejected) throw new AppError(401, 'AUTH_REQUIRED', 'Phiên đăng nhập không còn hợp lệ.');
    return { user: publicUser(user), ...issueAccess(user), ...nextSession };
  }

  async function logout(refreshToken, csrfCookie, csrfHeader) {
    if (!refreshToken) return;
    const [rows] = await pool.execute('SELECT id, csrf_hash FROM refresh_tokens WHERE token_hash = ? LIMIT 1', [tokenHash(refreshToken)]);
    const session = rows[0];
    if (!session) return;
    const valid = csrfCookie && csrfHeader && safeEqual(csrfCookie, csrfHeader) && safeEqual(session.csrf_hash || '', tokenHash(csrfHeader));
    if (!valid) throw new AppError(403, 'CSRF_INVALID', 'Yêu cầu bảo mật không hợp lệ. Hãy tải lại trang.');
    await pool.execute('UPDATE refresh_tokens SET revoked_at = COALESCE(revoked_at, CURRENT_TIMESTAMP(3)) WHERE id = ?', [session.id]);
  }

  async function changePassword(userId, currentPassword, newPassword) {
    const [rows] = await pool.execute('SELECT password_hash FROM app_users WHERE id = ? AND archived_at IS NULL LIMIT 1', [userId]);
    const user = rows[0];
    if (!user || !await argon2.verify(user.password_hash, currentPassword)) {
      throw new AppError(400, 'CURRENT_PASSWORD_INVALID', 'Mật khẩu hiện tại không đúng.');
    }
    const passwordHash = await argon2.hash(newPassword, { type: argon2.argon2id });
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [result] = await connection.execute(
        `UPDATE app_users SET password_hash = ?, must_change_password = FALSE, updated_at = CURRENT_TIMESTAMP(3)
         WHERE id = ? AND archived_at IS NULL`, [passwordHash, userId]
      );
      if (!result.affectedRows) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy tài khoản.');
      await connection.execute('UPDATE refresh_tokens SET revoked_at = COALESCE(revoked_at, CURRENT_TIMESTAMP(3)) WHERE user_id = ? AND revoked_at IS NULL', [userId]);
      await connection.commit();
    } catch (error) { await connection.rollback(); throw error; }
    finally { connection.release(); }
  }

  return { login, rotate, logout, changePassword };
}

export function publicUser(user) {
  return { id: user.id, username: user.username, displayName: user.display_name, email: user.email, role: user.role, mustChangePassword: Boolean(user.must_change_password) };
}

function safeEqual(left, right) {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  return a.length === b.length && timingSafeEqual(a, b);
}
