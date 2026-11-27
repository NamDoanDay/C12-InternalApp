const fs = require('node:fs/promises');
const path = require('node:path');
const pool = require('./pool');

async function migrate() {
  const folder = path.resolve(__dirname, '../../../database/migrations');
  const files = (await fs.readdir(folder)).filter(name => name.endsWith('.sql')).sort();
  for (const name of files) {
    const [applied] = await pool.execute('SELECT name FROM schema_migrations WHERE name = ?', [name]).catch(async () => {
      // The initial migration creates this table; it is absent only on a blank database.
      return [[]];
    });
    if (applied?.length) continue;
    const sql = await fs.readFile(path.join(folder, name), 'utf8');
    for (const statement of sql.split(';').map(part => part.trim()).filter(Boolean)) await pool.query(statement);
    await pool.execute('INSERT INTO schema_migrations (name) VALUES (?)', [name]);
  }
}
module.exports = migrate;
