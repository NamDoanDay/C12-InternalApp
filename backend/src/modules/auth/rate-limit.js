import { AppError } from '../../http/errors.js';

export function createLoginLimiter({ windowMs = 15 * 60_000, max = 10, now = Date.now } = {}) {
  const attempts = new Map();
  return (req, _res, next) => {
    const key = `${req.ip}:${String(req.body?.username || req.body?.email || '').trim().toLowerCase()}`;
    const current = attempts.get(key);
    if (!current || current.until <= now()) {
      attempts.set(key, { count: 1, until: now() + windowMs });
      return next();
    }
    current.count += 1;
    if (current.count > max) return next(new AppError(429, 'RATE_LIMITED', 'Bạn thử đăng nhập quá nhiều lần. Vui lòng thử lại sau.'));
    if (attempts.size > 5000) {
      for (const [attemptKey, value] of attempts) if (value.until <= now()) attempts.delete(attemptKey);
      while (attempts.size > 5000) attempts.delete(attempts.keys().next().value);
    }
    next();
  };
}
