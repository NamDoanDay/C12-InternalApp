import { AppError } from '../http/errors.js';
import { verifyAccessToken } from '../modules/auth/tokens.js';

export function authRequired({ pool, config }) {
  return async (req, _res, next) => {
    try {
      const token = req.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
      const claims = token && verifyAccessToken(token, config.JWT_SECRET);
      if (!claims) throw new AppError(401, 'AUTH_REQUIRED', 'Vui lòng đăng nhập lại.');
      const [rows] = await pool.execute(
        `SELECT id, username, display_name, email, role, status, must_change_password, person_id
         FROM app_users WHERE id = ? AND archived_at IS NULL LIMIT 1`, [claims.userId]
      );
      const user = rows[0];
      if (!user || user.status !== 'active') throw new AppError(401, 'AUTH_REQUIRED', 'Tài khoản không còn hoạt động.');
      req.auth = { userId: user.id, role: user.role, personId: user.person_id, mustChangePassword: Boolean(user.must_change_password), user };
      next();
    } catch (error) { next(error); }
  };
}

export function requirePasswordChanged(req, _res, next) {
  if (req.auth?.mustChangePassword && !['/me', '/password'].includes(req.path)) {
    return next(new AppError(403, 'PASSWORD_CHANGE_REQUIRED', 'Vui lòng đổi mật khẩu trước khi tiếp tục.'));
  }
  next();
}

export function requireAdmin(req, _res, next) {
  if (req.auth?.role !== 'admin') return next(new AppError(403, 'FORBIDDEN', 'Bạn không có quyền thực hiện thao tác này.'));
  next();
}
