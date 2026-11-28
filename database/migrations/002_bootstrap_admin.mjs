import { readFile } from 'node:fs/promises';
import { dirname, isAbsolute, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

export async function up(connection, { hashPassword }) {
  const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
  const configuredPath = process.env.ADMIN_PASSWORD_FILE || './secrets/admin_password';
  const secretPath = isAbsolute(configuredPath) ? configuredPath : resolve(repoRoot, configuredPath);
  const password = (await readFile(secretPath, 'utf8')).trim();
  if (!password) throw new Error('Admin bootstrap secret file is empty');

  const [existingUsers] = await connection.execute('SELECT id FROM app_users LIMIT 1 FOR UPDATE');
  if (existingUsers.length) throw new Error('Refusing admin bootstrap: app_users is not empty before the one-time seed');

  if (typeof hashPassword !== 'function') throw new Error('Password hasher is not configured');
  const passwordHash = await hashPassword(password);
  await connection.execute(
    `INSERT INTO app_users
      (id, username, normalized_username, display_name, password_hash, role, status, must_change_password)
     VALUES (?, 'admin', 'admin', 'Quản trị viên', ?, 'admin', 'active', TRUE)`,
    [randomUUID(), passwordHash]
  );
}
