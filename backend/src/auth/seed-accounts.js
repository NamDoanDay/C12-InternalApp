const bcrypt = require('bcryptjs');
const pool = require('../db/pool');

async function seedAccounts(state) {
  const [rows] = await pool.query('SELECT COUNT(*) AS total FROM accounts');
  if (Number(rows[0].total)) return;
  for (const user of state.users) {
    const demoAdmin = user.id === 'admin';
    if (user.id === 'demo-u-g-HT') user.email = 'user@c12.demo';
    const password = demoAdmin ? (process.env.DEMO_ADMIN_PASSWORD || 'AdminDemo2026!') : (process.env.DEMO_USER_PASSWORD || 'UserDemo2026!');
    await pool.execute('INSERT INTO accounts (user_id, username, email, password_hash, role, status, is_demo) VALUES (?, ?, ?, ?, ?, ?, ?)', [user.id, user.email.toLowerCase(), user.email.toLowerCase(), await bcrypt.hash(password, 12), user.role, user.status === 'pending' ? 'pending' : 'approved', demoAdmin || user.id === 'demo-u-g-HT' ? 1 : 0]);
  }
}
module.exports = seedAccounts;
