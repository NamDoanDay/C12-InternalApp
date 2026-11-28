import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { AppError } from '../../http/errors.js';
import { enqueueOutbox, recordRevision } from '../../db/write-helpers.js';
import { requireAdmin } from '../../middleware/auth.js';

const personInput = z.object({ name: z.string().trim().min(1).max(180), positionTitle: text(180), graphLevel: text(80), personnelType: text(80), email: text(254), phone: text(80), note: text(5000) }).strict();
const groupInput = z.object({ name: z.string().trim().min(1).max(180), code: z.string().trim().min(1).max(32).regex(/^[A-Za-z0-9_-]+$/), groupType: z.string().trim().min(1).max(48).default('specialty'), leadPersonId: z.string().uuid().nullable().optional() }).strict();

export function createOrganizationRouter({ pool }) {
  const router = Router();
  router.get('/groups', async (req, res, next) => {
    try {
      const [rows] = await pool.execute(`SELECT g.id, g.name, g.code, g.group_type, g.lead_person_id, g.version,
        (SELECT COUNT(*) FROM person_group_memberships m WHERE m.group_id = g.id AND m.valid_to IS NULL) member_count
        FROM org_groups g WHERE g.archived_at IS NULL ORDER BY g.name`);
      res.json({ data: rows.map(row => ({ id: row.id, name: row.name, code: row.code, groupType: row.group_type, leadPersonId: row.lead_person_id, memberCount: Number(row.member_count), version: Number(row.version) })) });
    } catch (error) { next(error); }
  });
  router.get('/people', async (req, res, next) => {
    try {
      const q = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 150) : '';
      const values = q ? [`%${q}%`, `%${q}%`, `%${q}%`] : [];
      const where = `p.archived_at IS NULL${q ? ' AND (p.name LIKE ? OR p.email LIKE ? OR p.position_title LIKE ?)' : ''}`;
      const [rows] = await pool.execute(`SELECT p.id, p.name, p.position_title, p.graph_level, p.personnel_type, p.email, p.phone, p.note, p.version, m.group_id, g.name group_name
        FROM people p LEFT JOIN person_group_memberships m ON m.person_id = p.id AND m.valid_to IS NULL LEFT JOIN org_groups g ON g.id = m.group_id
        WHERE ${where} ORDER BY p.name`, values);
      res.json({ data: rows.map(row => ({ id: row.id, name: row.name, positionTitle: row.position_title, graphLevel: row.graph_level, personnelType: row.personnel_type, email: row.email, phone: row.phone, note: row.note, groupId: row.group_id, groupName: row.group_name, version: Number(row.version) })) });
    } catch (error) { next(error); }
  });

  router.post('/groups', requireAdmin, async (req, res, next) => {
    const connection = await pool.getConnection();
    try {
      const input = parse(groupInput, req.body), id = randomUUID();
      await connection.beginTransaction();
      if (input.leadPersonId) await requirePerson(connection, input.leadPersonId);
      await connection.execute('INSERT INTO org_groups (id, name, code, group_type, lead_person_id, created_by) VALUES (?, ?, ?, ?, ?, ?)', [id, input.name, input.code, input.groupType, input.leadPersonId || null, req.auth.userId]);
      await recordRevision(connection, { entityType: 'group', entityId: id, actorId: req.auth.userId, action: 'created', changes: Object.keys(input), snapshot: input });
      await enqueueEvent(connection, 'group.created', 'group', id, req.id);
      await connection.commit(); res.status(201).json({ data: { id, ...input, version: 1 } });
    } catch (error) { await connection.rollback(); next(mapConflict(error) || error); }
    finally { connection.release(); }
  });
  router.patch('/groups/:id', requireAdmin, async (req, res, next) => {
    const connection = await pool.getConnection();
    try {
      const id = uuid(req.params.id), version = positiveVersion(req.body?.version), { version: _version, ...body } = req.body || {}, input = parse(groupInput.partial(), body);
      if (!Object.keys(input).length) throw new AppError(422, 'VALIDATION_ERROR', 'Cần ít nhất một trường cập nhật.');
      await connection.beginTransaction();
      const [rows] = await connection.execute('SELECT * FROM org_groups WHERE id = ? AND archived_at IS NULL FOR UPDATE', [id]);
      if (!rows[0]) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy nhóm.');
      if (Number(rows[0].version) !== version) throw new AppError(409, 'STALE_VERSION', 'Nhóm đã thay đổi.');
      if (input.leadPersonId) await requirePerson(connection, input.leadPersonId);
      const mapping = { name: 'name', code: 'code', groupType: 'group_type', leadPersonId: 'lead_person_id' }, set = [], values = [];
      for (const [key, column] of Object.entries(mapping)) if (key in input) { set.push(`${column} = ?`); values.push(input[key] || null); }
      set.push('version = version + 1'); values.push(id, version);
      await connection.execute(`UPDATE org_groups SET ${set.join(', ')} WHERE id = ? AND version = ?`, values);
      await recordRevision(connection, { entityType: 'group', entityId: id, actorId: req.auth.userId, action: 'updated', changes: Object.keys(input), snapshot: input });
      await enqueueEvent(connection, 'group.updated', 'group', id, req.id); await connection.commit(); res.json({ data: { id, version: version + 1 } });
    } catch (error) { await connection.rollback(); next(mapConflict(error) || error); }
    finally { connection.release(); }
  });
  router.post('/groups/:id/archive', requireAdmin, archiveEntity(pool, 'group'));
  router.post('/groups/:id/restore', requireAdmin, restoreEntity(pool, 'group'));

  router.post('/people', requireAdmin, async (req, res, next) => {
    const connection = await pool.getConnection();
    try {
      const input = parse(personInput, req.body), id = randomUUID(); await connection.beginTransaction();
      await connection.execute('INSERT INTO people (id, name, position_title, graph_level, personnel_type, email, phone, note, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [id, input.name, input.positionTitle || null, input.graphLevel || null, input.personnelType || null, input.email || null, input.phone || null, input.note || null, req.auth.userId]);
      await recordRevision(connection, { entityType: 'person', entityId: id, actorId: req.auth.userId, action: 'created', changes: Object.keys(input), snapshot: input });
      await enqueueEvent(connection, 'person.created', 'person', id, req.id); await connection.commit(); res.status(201).json({ data: { id, ...input, version: 1 } });
    } catch (error) { await connection.rollback(); next(error); }
    finally { connection.release(); }
  });
  router.patch('/people/:id', requireAdmin, async (req, res, next) => {
    const connection = await pool.getConnection();
    try {
      const id = uuid(req.params.id), version = positiveVersion(req.body?.version), { version: _version, ...body } = req.body || {}, input = parse(personInput.partial(), body);
      if (!Object.keys(input).length) throw new AppError(422, 'VALIDATION_ERROR', 'Cần ít nhất một trường cập nhật.');
      await connection.beginTransaction();
      const [rows] = await connection.execute('SELECT * FROM people WHERE id = ? AND archived_at IS NULL FOR UPDATE', [id]);
      if (!rows[0]) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy hồ sơ nhân sự.');
      if (Number(rows[0].version) !== version) throw new AppError(409, 'STALE_VERSION', 'Hồ sơ nhân sự đã thay đổi.');
      const mapping = { name: 'name', positionTitle: 'position_title', graphLevel: 'graph_level', personnelType: 'personnel_type', email: 'email', phone: 'phone', note: 'note' }, set = [], values = [];
      for (const [key, column] of Object.entries(mapping)) if (key in input) { set.push(`${column} = ?`); values.push(input[key] || null); }
      set.push('version = version + 1'); values.push(id, version);
      await connection.execute(`UPDATE people SET ${set.join(', ')} WHERE id = ? AND version = ?`, values);
      await recordRevision(connection, { entityType: 'person', entityId: id, actorId: req.auth.userId, action: 'updated', changes: Object.keys(input), snapshot: input });
      await enqueueEvent(connection, 'person.updated', 'person', id, req.id); await connection.commit(); res.json({ data: { id, version: version + 1 } });
    } catch (error) { await connection.rollback(); next(error); }
    finally { connection.release(); }
  });
  router.post('/people/:id/archive', requireAdmin, archiveEntity(pool, 'person'));
  router.post('/people/:id/restore', requireAdmin, restoreEntity(pool, 'person'));
  router.post('/people/:id/group', requireAdmin, async (req, res, next) => {
    const connection = await pool.getConnection();
    try {
      const personId = uuid(req.params.id), input = parse(z.object({ groupId: z.string().uuid().nullable() }).strict(), req.body);
      await connection.beginTransaction(); await requirePerson(connection, personId);
      if (input.groupId) await requireGroup(connection, input.groupId);
      const [old] = await connection.execute('SELECT group_id FROM person_group_memberships WHERE person_id = ? AND valid_to IS NULL FOR UPDATE', [personId]);
      if (old[0]?.group_id !== input.groupId) {
        await connection.execute('UPDATE person_group_memberships SET valid_to = CURRENT_TIMESTAMP(3) WHERE person_id = ? AND valid_to IS NULL', [personId]);
        if (input.groupId) await connection.execute('INSERT INTO person_group_memberships (id, person_id, group_id, valid_from, changed_by) VALUES (?, ?, ?, CURRENT_TIMESTAMP(3), ?)', [randomUUID(), personId, input.groupId, req.auth.userId]);
        await recordRevision(connection, { entityType: 'person', entityId: personId, actorId: req.auth.userId, action: 'group_changed', changes: ['groupId'], snapshot: { from: old[0]?.group_id || null, to: input.groupId } });
        await enqueueEvent(connection, 'person.updated', 'person', personId, req.id);
      }
      await connection.commit(); res.json({ data: { personId, groupId: input.groupId } });
    } catch (error) { await connection.rollback(); next(error); }
    finally { connection.release(); }
  });
  return router;
}

function archiveEntity(pool, type) { return async (req, res, next) => {
  const table = type === 'group' ? 'org_groups' : 'people', label = type === 'group' ? 'nhóm' : 'hồ sơ nhân sự';
  const connection = await pool.getConnection();
  try {
    const id = uuid(req.params.id); await connection.beginTransaction();
    const [rows] = await connection.execute(`SELECT id FROM ${table} WHERE id = ? AND archived_at IS NULL FOR UPDATE`, [id]);
    if (!rows[0]) throw new AppError(404, 'NOT_FOUND', `Không tìm thấy ${label}.`);
    await connection.execute(`UPDATE ${table} SET archived_at = CURRENT_TIMESTAMP(3), version = version + 1 WHERE id = ?`, [id]);
    if (type === 'group') await connection.execute('UPDATE person_group_memberships SET valid_to = CURRENT_TIMESTAMP(3) WHERE group_id = ? AND valid_to IS NULL', [id]);
    await recordRevision(connection, { entityType: type, entityId: id, actorId: req.auth.userId, action: 'archived' });
    await enqueueEvent(connection, `${type}.archived`, type, id, req.id); await connection.commit(); res.json({ data: { id, archived: true } });
  } catch (error) { await connection.rollback(); next(error); } finally { connection.release(); }
}; }
function restoreEntity(pool, type) { return async (req, res, next) => {
  const table = type === 'group' ? 'org_groups' : 'people';
  const connection = await pool.getConnection();
  try {
    const id = uuid(req.params.id); await connection.beginTransaction();
    const [result] = await connection.execute(`UPDATE ${table} SET archived_at = NULL, version = version + 1 WHERE id = ? AND archived_at IS NOT NULL`, [id]);
    if (!result.affectedRows) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy bản ghi đã lưu trữ.');
    await recordRevision(connection, { entityType: type, entityId: id, actorId: req.auth.userId, action: 'restored' });
    await enqueueEvent(connection, `${type}.restored`, type, id, req.id); await connection.commit(); res.json({ data: { id, archived: false } });
  } catch (error) { await connection.rollback(); next(error); } finally { connection.release(); }
}; }
async function enqueueEvent(connection, eventType, entityType, entityId, requestId) {
  const [rows] = await connection.execute(`SELECT id FROM app_users WHERE status = 'active' AND archived_at IS NULL`);
  await enqueueOutbox(connection, { eventType, aggregateType: entityType, aggregateId: entityId, payload: { id: entityId }, requestId, recipients: rows.map(row => row.id) });
}
async function requirePerson(connection, id) { const [rows] = await connection.execute('SELECT id FROM people WHERE id = ? AND archived_at IS NULL', [id]); if (!rows[0]) throw new AppError(422, 'VALIDATION_ERROR', 'Hồ sơ nhân sự không tồn tại hoặc đã lưu trữ.'); }
async function requireGroup(connection, id) { const [rows] = await connection.execute('SELECT id FROM org_groups WHERE id = ? AND archived_at IS NULL', [id]); if (!rows[0]) throw new AppError(422, 'VALIDATION_ERROR', 'Nhóm không tồn tại hoặc đã lưu trữ.'); }
function text(max) { return z.string().trim().max(max).nullable().optional(); }
function parse(schema, value) { const result = schema.safeParse(value); if (!result.success) throw new AppError(422, 'VALIDATION_ERROR', 'Dữ liệu gửi lên chưa hợp lệ.', 'Backend', result.error.issues); return result.data; }
function uuid(value) { const result = z.string().uuid().safeParse(value); if (!result.success) throw new AppError(400, 'BAD_REQUEST', 'Mã hồ sơ không hợp lệ.'); return result.data; }
function positiveVersion(value) { const result = z.coerce.number().int().positive().safeParse(value); if (!result.success) throw new AppError(400, 'BAD_REQUEST', 'Thiếu hoặc sai version.'); return result.data; }
function mapConflict(error) { return error.code === 'ER_DUP_ENTRY' ? new AppError(409, 'CONFLICT', 'Mã nhóm hoặc thông tin định danh đã tồn tại.') : error; }
