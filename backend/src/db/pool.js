import mysql from 'mysql2/promise';
import { readConfig } from '../config/env.js';

export function createPool(config = readConfig()) {
  return mysql.createPool({
    host: config.MYSQL_HOST,
    port: config.MYSQL_PORT,
    database: config.MYSQL_DATABASE,
    user: config.MYSQL_USER,
    password: config.MYSQL_PASSWORD,
    connectionLimit: config.MYSQL_POOL_SIZE,
    waitForConnections: true,
    queueLimit: 0,
    timezone: 'Z',
    charset: 'utf8mb4'
  });
}
