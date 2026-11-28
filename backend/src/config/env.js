import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  MYSQL_HOST: z.string().min(1).default('127.0.0.1'),
  MYSQL_PORT: z.coerce.number().int().min(1).max(65535).default(3306),
  MYSQL_DATABASE: z.string().regex(/^[A-Za-z0-9_]+$/).default('c12_internalapp'),
  MYSQL_USER: z.string().min(1).default('c12_app'),
  MYSQL_PASSWORD: z.string().min(1),
  MYSQL_POOL_SIZE: z.coerce.number().int().min(1).max(50).default(10),
  JWT_SECRET: z.string().min(32).default('development-only-c12-secret-change-before-deploy'),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('7d'),
  COOKIE_SECURE: z.enum(['true', 'false']).default('false'),
  ADMIN_PASSWORD_FILE: z.string().min(1).default('../secrets/admin_password'),
  FILE_STORAGE_DIR: z.string().min(1).default('../storage/uploads'),
  TRUST_PROXY: z.enum(['true', 'false']).default('false')
});

export function readConfig(source = process.env) {
  const result = schema.safeParse(source);
  if (!result.success) {
    const fields = result.error.issues.map(issue => issue.path.join('.')).join(', ');
    throw new Error(`Invalid backend configuration: ${fields}`);
  }
  if (result.data.NODE_ENV === 'production' && result.data.JWT_SECRET.startsWith('development-only-')) {
    throw new Error('Invalid backend configuration: JWT_SECRET must be replaced in production');
  }
  return result.data;
}
