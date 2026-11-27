const mysql = require('mysql2/promise');
const env = require('../config/env');

const pool = mysql.createPool({
  ...env.mysql,
  waitForConnections: true,
  connectionLimit: Number(process.env.MYSQL_POOL_SIZE || 10),
  queueLimit: 0,
  charset: 'utf8mb4'
});
module.exports = pool;
