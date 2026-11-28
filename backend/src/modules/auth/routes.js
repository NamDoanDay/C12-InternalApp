import { Router } from 'express';
import { z } from 'zod';
import { AppError } from '../../http/errors.js';
import { authRequired } from '../../middleware/auth.js';
import { createLoginLimiter } from './rate-limit.js';
import { createAuthService, publicUser } from './service.js';

const loginSchema = z.object({ identifier: z.string().trim().min(1).max(254), password: z.string().min(1).max(256) }).strict();
const passwordSchema = z.object({ currentPassword: z.string().min(1).max(256), newPassword: z.string().min(12).max(256) }).strict();

export function createAuthRouter({ pool, config }) {
  const router = Router();
  const service = createAuthService(pool, config);
  const authenticate = authRequired({ pool, config });
  const loginLimit = createLoginLimiter();

  router.post('/login', loginLimit, async (req, res, next) => {
    try {
      const input = loginSchema.parse(req.body);
      const session = await service.login(input.identifier, input.password);
      setCookies(res, session, config);
      res.json({ data: { user: session.user, accessToken: session.accessToken, expiresIn: session.expiresIn, csrfToken: session.csrfToken } });
    } catch (error) { next(validationError(error)); }
  });

  router.post('/refresh', async (req, res, next) => {
    try {
      const cookies = readCookies(req);
      const session = await service.rotate(cookies.refresh_token, cookies.csrf_token, req.get('x-csrf-token'));
      setCookies(res, session, config);
      res.json({ data: { user: session.user, accessToken: session.accessToken, expiresIn: session.expiresIn, csrfToken: session.csrfToken } });
    } catch (error) { next(error); }
  });

  router.post('/logout', async (req, res, next) => {
    try {
      const cookies = readCookies(req);
      await service.logout(cookies.refresh_token, cookies.csrf_token, req.get('x-csrf-token'));
      clearCookies(res, config);
      res.json({ data: { loggedOut: true } });
    } catch (error) { next(error); }
  });

  router.get('/me', authenticate, async (req, res) => {
    res.json({ data: { user: publicUser(req.auth.user) } });
  });

  router.put('/password', authenticate, async (req, res, next) => {
    try {
      const input = passwordSchema.parse(req.body);
      await service.changePassword(req.auth.userId, input.currentPassword, input.newPassword);
      clearCookies(res, config);
      res.json({ data: { passwordChanged: true, reauthenticationRequired: true } });
    } catch (error) { next(validationError(error)); }
  });

  return router;
}

function setCookies(res, session, config) {
  const secure = config.COOKIE_SECURE === 'true' ? '; Secure' : '';
  const maxAge = Math.max(0, session.expiresAt.getTime() - Date.now());
  res.append('Set-Cookie', `refresh_token=${session.refreshToken}; Path=/api/v1/auth; HttpOnly; SameSite=Strict; Max-Age=${Math.floor(maxAge / 1000)}${secure}`);
  res.append('Set-Cookie', `csrf_token=${session.csrfToken}; Path=/api/v1/auth; SameSite=Strict; Max-Age=${Math.floor(maxAge / 1000)}${secure}`);
}

function clearCookies(res, config) {
  const secure = config.COOKIE_SECURE === 'true' ? '; Secure' : '';
  res.append('Set-Cookie', `refresh_token=; Path=/api/v1/auth; HttpOnly; SameSite=Strict; Max-Age=0${secure}`);
  res.append('Set-Cookie', `csrf_token=; Path=/api/v1/auth; SameSite=Strict; Max-Age=0${secure}`);
}

function readCookies(req) {
  return Object.fromEntries((req.headers.cookie || '').split(';').map(value => {
    const index = value.indexOf('=');
    return index < 0 ? ['', ''] : [value.slice(0, index).trim(), decodeURIComponent(value.slice(index + 1).trim())];
  }).filter(([key]) => key));
}

function validationError(error) {
  if (!(error instanceof z.ZodError)) return error;
  return new AppError(422, 'VALIDATION_ERROR', 'Dữ liệu gửi lên chưa hợp lệ.', 'Backend', error.issues.map(issue => ({ field: issue.path.join('.'), code: issue.code, message: issue.message })));
}
