const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });

const env = {
  port: Number(process.env.API_PORT || 3000),
  jwtSecret: process.env.JWT_SECRET || 'development-only-change-this-secret',
  jwtTtl: process.env.JWT_TTL || '12h',
  demoLoginEnabled: process.env.DEMO_LOGIN_ENABLED !== 'false',
  mysql: {
    host: process.env.MYSQL_HOST || '127.0.0.1',
    port: Number(process.env.MYSQL_PORT || 3306),
    database: process.env.MYSQL_DATABASE || 'c12_internalapp',
    user: process.env.MYSQL_USER || 'c12_app',
    password: process.env.MYSQL_PASSWORD || 'change-me'
  }
};

if (process.env.NODE_ENV === 'production') {
  if (env.jwtSecret.length < 32 || /development-only|replace-with/i.test(env.jwtSecret)) throw new Error('JWT_SECRET must be a unique secret of at least 32 characters in production.');
  if (!env.mysql.password || /change-me|replace-with/i.test(env.mysql.password)) throw new Error('MYSQL_PASSWORD must be set to a non-placeholder value in production.');
  if (/change-root-me|replace-with/i.test(process.env.MYSQL_ROOT_PASSWORD || '')) throw new Error('MYSQL_ROOT_PASSWORD must be set to a non-placeholder value in production.');
}
module.exports = env;
