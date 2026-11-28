import { readdir, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import argon2 from 'argon2';
import { createPool } from './pool.js';

const migrationDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '../../../database/migrations');

export async function runMigrations(pool) {
  const connection = await pool.getConnection();
  try {
    const [lockRows] = await connection.query("SELECT GET_LOCK('c12_internalapp_migrations', 30) AS acquired");
    if (Number(lockRows[0]?.acquired) !== 1) throw new Error('Could not acquire database migration lock');

    await connection.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      version VARCHAR(160) NOT NULL PRIMARY KEY,
      applied_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`);

    const files = (await readdir(migrationDirectory)).filter(name => /^\d+_.+\.(sql|mjs)$/.test(name)).sort();
    for (const file of files) {
      const version = file.replace(/\.(sql|mjs)$/, '');
      const [rows] = await connection.execute('SELECT version FROM schema_migrations WHERE version = ?', [version]);
      if (rows.length) continue;

      if (file.endsWith('.sql')) {
        const source = await readFile(resolve(migrationDirectory, file), 'utf8');
        for (const statement of source.split(';').map(value => value.trim()).filter(Boolean)) {
          try {
            await connection.query(statement);
          } catch (error) {
            // MySQL commits DDL implicitly. If a process stops after an ALTER
            // but before the version ledger insert, allow that same constraint
            // from this migration to be encountered again on the next start.
            if (!['ER_FK_DUP_NAME', 'ER_DUP_FIELDNAME', 'ER_DUP_KEYNAME'].includes(error.code)) throw error;
          }
        }
        await connection.execute('INSERT INTO schema_migrations (version) VALUES (?)', [version]);
      } else {
        const migration = await import(pathToFileURL(resolve(migrationDirectory, file)).href);
        await connection.beginTransaction();
        try {
          await migration.up(connection, {
            hashPassword: password => argon2.hash(password, { type: argon2.argon2id })
          });
          await connection.execute('INSERT INTO schema_migrations (version) VALUES (?)', [version]);
          await connection.commit();
        } catch (error) {
          await connection.rollback();
          throw error;
        }
      }
    }
    return files.map(name => name.replace(/\.(sql|mjs)$/, ''));
  } finally {
    try { await connection.query("SELECT RELEASE_LOCK('c12_internalapp_migrations')"); } catch {}
    connection.release();
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const pool = createPool();
  try {
    const applied = await runMigrations(pool);
    console.log(`Database schema ready; checked ${applied.length} versioned migrations.`);
  } catch (error) {
    console.error('Database migration failed:', error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}
