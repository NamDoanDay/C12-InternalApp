import { Router } from 'express';
import { randomUUID, randomBytes } from 'node:crypto';
import { z } from 'zod';
import argon2 from 'argon2';
import { AppError } from '../../http/errors.js';

const createUserSchema = z.object({
  username: z.string().trim().min(3).max(120), displayName: z.string().trim().min(1).max(180),
  email: z.string().trim().email().max(254).optional().or(z.literal('')),
  personId: z.string().uuid().nullable().optional(), role: z.enum(['admin', 'user']).default('user')
}).strict();
const patchUserSchema = z.object({
  displayName: z.string().trim().min(1).max(180).optional(),
  email: z.string().trim().email().max(254).nullable().optional(),
  personId: z.string().uuid().nullable().optional(),
  role: z.enum(['admin', 'user']).optional()
}).strict().refine(value => Object.keys(value).length > 0);
const registrationSchema = z.object({
  username: z.string().trim().min(3).max(120), displayName: z.string().trim().min(1).max(180),
  email: z.string().trim().email().max(254).optional().or(z.literal('')),
  password: z.string().min(12).max(256)
}).strict();
const approveSchema = z.object({
  personId: z.string().uuid().optional(),
  person: z.object({ name: z.string().trim().min(1).max(180), positionTitle: z.string().trim().max(180).optional() }).optional()
}).strict().refine(value => Boolean(value.personId || value.person));

export function createUsersRouter({ pool }) {
  const router = Router();

  router.get('/users', async (_req, res, next) => {
    try {
      const [users] = await pool.execute(
        `SELECT u.id, u.username, u.display_name, u.email, u.role, u.status, u.person_id,
          u.must_change_password, u.created_at, u.archived_at, p.name AS person_name
         FROM app_users u LEFT JOIN people p ON p.id = u.person_id ORDER BY u.created_at DESC`
      );
      res.json({ data: users.map(publicUser) });
    } catch (error) { next(error); }
  });

  router.post('/users', async (req, res, next) => {
    try {
      const input = parse(createUserSchema, req.body);
      const temporaryPassword = randomBytes(24).toString('base64url');
      const id = randomUUID();
      const hash = await argon2.hash(temporaryPassword, { type: argon2.argon2id });
      await pool.execute(
        `INSERT INTO app_users (id, username, normalized_username, display_name, email, normalized_email, password_hash, role, status, must_change_password, person_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', TRUE, ?)`,
        [id, input.username, normalize(input.username), input.displayName, input.email || null, input.email ? normalize(input.email) : null, hash, input.role, input.personId || null]
      );
      res.status(201).json({ data: { id, username: input.username, temporaryPassword, mustChangePassword: true } });
    } catch (error) { next(mapUnique(error) || validation(error)); }
  });

  router.patch('/users/:id', async (req, res, next) => {
    try {
      const input = parse(patchUserSchema, req.body);
      const id = uuid(req.params.id);
      const fields = [];
      const values = [];
      for (const [key, column] of [['displayName', 'display_name'], ['email', 'email'], ['personId', 'person_id'], ['role', 'role']]) {
        if (!(key in input)) continue;
        fields.push(`${column} = ?`);
        values.push(key === 'email' ? (input.email ? normalize(input.email) : null) : input[key]);
      }
      if ('email' in input) {
        fields.push('normalized_email = ?');
        values.push(input.email ? normalize(input.email) : null);
      }
      fields.push('updated_at = CURRENT_TIMESTAMP(3)');
      values.push(id);
      const [result] = await pool.execute(`UPDATE app_users SET ${fields.join(', ')} WHERE id = ? AND archived_at IS NULL`, values);
      if (!result.affectedRows) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy tài khoản đang hoạt động.');
      res.json({ data: { id, updated: true } });
    } catch (error) { next(mapUnique(error) || validation(error)); }
  });

  router.post('/users/:id/archive', changeArchive(pool, true));
  router.post('/users/:id/restore', changeArchive(pool, false));

  router.post('/users/:id/reset-password', async (req, res, next) => {
    try {
      const id = uuid(req.params.id);
      const temporaryPassword = randomBytes(24).toString('base64url');
      const hash = await argon2.hash(temporaryPassword, { type: argon2.argon2id });
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        const [result] = await connection.execute(
          `UPDATE app_users SET password_hash = ?, must_change_password = TRUE, updated_at = CURRENT_TIMESTAMP(3)
           WHERE id = ? AND archived_at IS NULL`, [hash, id]
        );
        if (!result.affectedRows) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy tài khoản đang hoạt động.');
        await connection.execute('UPDATE refresh_tokens SET revoked_at = COALESCE(revoked_at, CURRENT_TIMESTAMP(3)) WHERE user_id = ? AND revoked_at IS NULL', [id]);
        await connection.commit();
      } catch (error) { await connection.rollback(); throw error; }
      finally { connection.release(); }
      res.json({ data: { id, temporaryPassword, mustChangePassword: true } });
    } catch (error) { next(error); }
  });

  router.get('/registrations', async (_req, res, next) => {
    try {
      const [rows] = await pool.execute(`SELECT id, username, display_name, email, created_at FROM app_users WHERE status = 'pending' AND archived_at IS NULL ORDER BY created_at`);
      res.json({ data: rows });
    } catch (error) { next(error); }
  });

  router.post('/registrations/:id/approve', async (req, res, next) => {
    const connection = await pool.getConnection();
    try {
      const id = uuid(req.params.id);
      const input = parse(approveSchema, req.body);
      await connection.beginTransaction();
      const [rows] = await connection.execute(`SELECT id, status FROM app_users WHERE id = ? AND archived_at IS NULL FOR UPDATE`, [id]);
      if (!rows[0] || rows[0].status !== 'pending') throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy yêu cầu đăng ký đang chờ.');
      let personId = input.personId;
      if (input.person) {
        personId = randomUUID();
        await connection.execute('INSERT INTO people (id, name, position_title, created_by) VALUES (?, ?, ?, ?)', [personId, input.person.name, input.person.positionTitle || null, req.auth.userId]);
      }
      await connection.execute(`UPDATE app_users SET status = 'active', person_id = ?, updated_at = CURRENT_TIMESTAMP(3) WHERE id = ?`, [personId, id]);
      await connection.commit();
      res.json({ data: { id, status: 'active', personId } });
    } catch (error) { await connection.rollback(); next(mapUnique(error) || validation(error)); }
    finally { connection.release(); }
  });

  router.post('/registrations/:id/reject', async (req, res, next) => {
    try {
      const id = uuid(req.params.id);
      const [result] = await pool.execute(`UPDATE app_users SET status = 'rejected', updated_at = CURRENT_TIMESTAMP(3) WHERE id = ? AND status = 'pending' AND archived_at IS NULL`, [id]);
      if (!result.affectedRows) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy yêu cầu đăng ký đang chờ.');
      res.json({ data: { id, status: 'rejected' } });
    } catch (error) { next(error); }
  });

  return router;
}

export function createRegistrationRouter({ pool }) {
  const router = Router();
  router.post('/', async (req, res, next) => {
    try {
      const input = parse(registrationSchema, req.body);
      const id = randomUUID();
      const hash = await argon2.hash(input.password, { type: argon2.argon2id });
      await pool.execute(
        `INSERT INTO app_users (id, username, normalized_username, display_name, email, normalized_email, password_hash, role, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'user', 'pending')`,
        [id, input.username, normalize(input.username), input.displayName, input.email || null, input.email ? normalize(input.email) : null, hash]
      );
      res.status(201).json({ data: { id, status: 'pending' } });
    } catch (error) { next(mapUnique(error) || validation(error)); }
  });
  return router;
}

function changeArchive(pool, archived) {
  return async (req, res, next) => {
    try {
      const id = uuid(req.params.id);
      const [result] = await pool.execute(
        archived
          ? `UPDATE app_users SET archived_at = CURRENT_TIMESTAMP(3), status = 'inactive', updated_at = CURRENT_TIMESTAMP(3) WHERE id = ? AND archived_at IS NULL`
          : `UPDATE app_users SET archived_at = NULL, status = 'active', updated_at = CURRENT_TIMESTAMP(3) WHERE id = ? AND archived_at IS NOT NULL`, [id]
      );
      if (!result.affectedRows) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy tài khoản phù hợp.');
      if (archived) await pool.execute('UPDATE refresh_tokens SET revoked_at = COALESCE(revoked_at, CURRENT_TIMESTAMP(3)) WHERE user_id = ? AND revoked_at IS NULL', [id]);
      res.json({ data: { id, archived } });
    } catch (error) { next(error); }
  };
}

function publicUser(row) {
  return { id: row.id, username: row.username, displayName: row.display_name, email: row.email, role: row.role, status: row.status, personId: row.person_id, personName: row.person_name, mustChangePassword: Boolean(row.must_change_password), createdAt: row.created_at, archivedAt: row.archived_at };
}

function normalize(value) { return value.trim().toLocaleLowerCase('en-US'); }
function parse(schema, value) {
  const parsed = schema.safeParse(value);
  if (!parsed.success) throw new AppError(422, 'VALIDATION_ERROR', 'Dữ liệu gửi lên chưa hợp lệ.', 'Backend', parsed.error.issues.map(issue => ({ field: issue.path.join('.'), code: issue.code, message: issue.message })));
  return parsed.data;
}
function validation(error) { return error instanceof z.ZodError ? new AppError(422, 'VALIDATION_ERROR', 'Dữ liệu gửi lên chưa hợp lệ.', 'Backend', error.issues) : error; }
function mapUnique(error) {
  if (error.code !== 'ER_DUP_ENTRY') return null;
  return new AppError(409, 'DUPLICATE_ACCOUNT', 'Tên đăng nhập, email hoặc hồ sơ nhân sự đã được sử dụng.');
}
function uuid(value) {
  const parsed = z.string().uuid().safeParse(value);
  if (!parsed.success) throw new AppError(400, 'BAD_REQUEST', 'Mã tài khoản không hợp lệ.');
  return parsed.data;
}
