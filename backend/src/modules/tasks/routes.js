import { Router } from 'express';
import { randomUUID, createHash } from 'node:crypto';
import { z } from 'zod';
import { AppError } from '../../http/errors.js';
import { enqueueOutbox, recordRevision } from '../../db/write-helpers.js';
import { DOCUMENT_TYPES, normalizeDocumentNumber } from '../documents/types.js';
import { AGGREGATE_STATUSES, aggregateSql, TASK_TYPES, WORKFLOW_STATUSES, taskScopeSql } from './domain.js';
import { ensureDefaultAppendixSchema } from '../resources/appendix-schema.js';

const customTableSchema = z.object({
  name: z.string().trim().max(160).default('Bảng dữ liệu tùy chỉnh'),
  columns: z.array(z.string().trim().min(1).max(120)).max(100).default([]),
  rows: z.array(z.record(z.string(), z.unknown())).max(500).default([])
}).strict();
const customFieldsSchema = z.array(z.object({ id: z.string().max(80).optional(), label: z.string().trim().min(1).max(120), value: z.unknown().optional() }).strict()).max(100);
const resourceSchema = z.object({
  resourceId: z.string().uuid().optional(), unitName: z.string().trim().min(1).max(255).optional(),
  managingAgency: z.string().trim().min(1).max(255).optional(), systemName: z.string().trim().min(1).max(255).optional(),
  levelName: z.string().trim().max(80).nullable().optional(), directColumns: z.array(z.string().max(120)).max(100).default([]),
  directRows: z.array(z.record(z.string(), z.unknown())).max(500).default([]), customFields: customFieldsSchema.default([]),
  registeredDocumentIds: z.array(z.string().uuid()).max(100).default([]), assetDocumentIds: z.array(z.string().uuid()).max(100).default([])
}).strict();
const taskInputBase = z.object({
  type: z.enum(TASK_TYPES), title: z.string().trim().min(1).max(500), description: z.string().max(10000).nullable().optional(),
  workflowStatus: z.enum(WORKFLOW_STATUSES), managementGroupId: z.string().uuid(), assigneeIds: z.array(z.string().uuid()).min(1).max(50),
  startAt: z.string().datetime({ offset: true }).nullable().optional(), dueAt: z.string().datetime({ offset: true }).nullable().optional(),
  documentId: z.string().uuid().optional(), document: z.object({ documentType: z.enum(DOCUMENT_TYPES), documentNumber: z.string().trim().max(180).nullable().optional(), issueDate: z.string().date().nullable().optional(), summary: z.string().trim().max(5000).nullable().optional() }).strict().optional(),
  resource: resourceSchema.optional(), customTable: customTableSchema.default({ columns: [], rows: [] }), customFields: customFieldsSchema.default([]),
  fileIds: z.array(z.string().uuid()).max(100).default([])
}).strict();
const taskInput = taskInputBase.refine(value => !value.startAt || !value.dueAt || new Date(value.dueAt) >= new Date(value.startAt), { path: ['dueAt'], message: 'Ngày kết thúc phải sau ngày bắt đầu.' })
  .refine(value => value.type !== 'document' || value.documentId || value.document, { path: ['document'], message: 'Task xử lý văn bản cần chọn hoặc nhập văn bản.' })
  .refine(value => value.type !== 'resource' || value.resource, { path: ['resource'], message: 'Task quản lý tài nguyên cần có thông tin tài nguyên.' });
const taskPatchSchema = taskInputBase.partial().omit({ type: true, resource: true }).strict();

export function createTasksRouter({ pool }) {
  const router = Router();

  router.get('/', async (req, res, next) => {
    try {
      const { whereSql, values } = buildFilters(req);
      const limit = pageNumber(req.query.limit ?? 50, 1, 200);
      const offset = pageNumber(req.query.offset ?? 0, 0, Number.MAX_SAFE_INTEGER);
      const [[countRows], [rows]] = await Promise.all([
        pool.execute(`SELECT COUNT(*) AS total FROM tasks t WHERE ${whereSql}`, values),
        pool.execute(
          `SELECT t.id, t.task_code, t.task_type, t.title, t.description, t.workflow_status, t.management_group_id,
            t.primary_document_id, (SELECT tr.resource_id FROM task_resource_links tr WHERE tr.task_id = t.id AND tr.ended_at IS NULL LIMIT 1) AS resource_id,
            t.start_at, t.due_at, t.custom_table, t.custom_fields, t.created_by,
            t.created_at, t.updated_at, t.version, g.name AS group_name, ${aggregateSql} AS aggregate_status
           FROM tasks t LEFT JOIN org_groups g ON g.id = t.management_group_id
           WHERE ${whereSql} ORDER BY t.created_at DESC LIMIT ? OFFSET ?`, [...values, limit, offset]
        )
      ]);
      const ids = rows.map(row => row.id);
      const assignees = await loadAssignees(pool, ids);
      const files = await loadTaskFiles(pool, ids);
      res.json({ data: rows.map(row => mapTask(row, assignees.get(row.id) || [], files.get(row.id) || [])), page: { limit, offset, total: Number(countRows[0].total) } });
    } catch (error) { next(error); }
  });

  router.get('/summary', async (req, res, next) => {
    try {
      const filters = buildFilters(req);
      const [rows] = await pool.execute(
        `SELECT ${aggregateSql} AS status, COUNT(*) AS total FROM tasks t WHERE ${filters.whereSql} GROUP BY status`, filters.values
      );
      const counts = Object.fromEntries(AGGREGATE_STATUSES.filter(status => status !== 'all').map(status => [status, 0]));
      for (const row of rows) counts[row.status] = Number(row.total);
      res.json({ data: { total: Object.values(counts).reduce((sum, count) => sum + count, 0), ...counts } });
    } catch (error) { next(error); }
  });

  router.get('/group-summary', async (req, res, next) => {
    try {
      const filters = buildFilters(req);
      const [rows] = await pool.execute(
        `SELECT t.management_group_id AS group_id, g.name AS group_name, ${aggregateSql} AS status, COUNT(*) AS total
         FROM tasks t LEFT JOIN org_groups g ON g.id = t.management_group_id WHERE ${filters.whereSql}
         GROUP BY t.management_group_id, g.name, status ORDER BY g.name`, filters.values
      );
      const groups = new Map();
      for (const row of rows) {
        const group = groups.get(row.group_id) || { groupId: row.group_id, groupName: row.group_name, total: 0, processing: 0, done: 0, late: 0 };
        group[row.status] = Number(row.total);
        group.total += Number(row.total);
        groups.set(row.group_id, group);
      }
      res.json({ data: [...groups.values()] });
    } catch (error) { next(error); }
  });

  router.post('/', async (req, res, next) => {
    const connection = await pool.getConnection();
    try {
      const input = validateTaskInput(req.body);
      await connection.beginTransaction();
      const snapshot = await createTaskInTransaction(connection, input, req.auth, req.id);
      await connection.commit();
      res.status(201).json({ data: snapshot });
    } catch (error) { await connection.rollback(); next(mapConflict(error) || validationError(error)); }
    finally { connection.release(); }
  });

  router.get('/:id', async (req, res, next) => {
    try {
      const id = uuid(req.params.id);
      const [rows] = await pool.execute(
        `SELECT t.*, g.name AS group_name,
          (SELECT tr.resource_id FROM task_resource_links tr WHERE tr.task_id = t.id AND tr.ended_at IS NULL LIMIT 1) AS resource_id,
          ${aggregateSql} AS aggregate_status FROM tasks t
         LEFT JOIN org_groups g ON g.id = t.management_group_id WHERE t.id = ? AND t.archived_at IS NULL`, [id]
      );
      if (!rows[0]) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy công việc.');
      await assertTaskVisible(pool, req.auth, id);
      const assignees = await loadAssignees(pool, [id]);
      const files = await loadTaskFiles(pool, [id]);
      res.json({ data: mapTask(rows[0], assignees.get(id) || [], files.get(id) || []) });
    } catch (error) { next(error); }
  });

  router.get('/:id/history', async (req, res, next) => {
    try {
      const id = uuid(req.params.id);
      await assertTaskVisible(pool, req.auth, id);
      const [rows] = await pool.execute(
        `SELECT r.id, r.action, r.changes_json, r.snapshot_json, r.created_at, u.display_name AS actor_name
         FROM entity_revisions r JOIN app_users u ON u.id = r.actor_id WHERE r.entity_type = 'task' AND r.entity_id = ? ORDER BY r.created_at DESC`, [id]
      );
      res.json({ data: rows.map(row => ({ id: row.id, action: row.action, changes: row.changes_json, snapshot: row.snapshot_json, createdAt: row.created_at, actorName: row.actor_name })) });
    } catch (error) { next(error); }
  });

  router.get('/:id/comments', async (req, res, next) => {
    try {
      const id = uuid(req.params.id);
      await assertTaskVisible(pool, req.auth, id);
      const [rows] = await pool.execute(
        `SELECT c.id, c.body, c.created_at, u.display_name AS author_name FROM task_comments c
         JOIN app_users u ON u.id = c.author_id WHERE c.task_id = ? AND c.archived_at IS NULL ORDER BY c.created_at`, [id]
      );
      res.json({ data: rows.map(row => ({ id: row.id, body: row.body, createdAt: row.created_at, authorName: row.author_name })) });
    } catch (error) { next(error); }
  });

  router.post('/:id/comments', async (req, res, next) => {
    const connection = await pool.getConnection();
    try {
      const id = uuid(req.params.id);
      const input = parse(z.object({ body: z.string().trim().min(1).max(5000) }).strict(), req.body);
      await connection.beginTransaction();
      const task = await getTaskMutationAccess(connection, req.auth, id);
      if (req.auth.role !== 'admin' && task.created_by !== req.auth.userId && !task.is_assignee) throw new AppError(403, 'FORBIDDEN', 'Bạn không có quyền bình luận công việc này.');
      const commentId = randomUUID();
      await connection.execute('INSERT INTO task_comments (id, task_id, author_id, body) VALUES (?, ?, ?, ?)', [commentId, id, req.auth.userId, input.body]);
      await enqueueOutbox(connection, { eventType: 'task.comment.created', aggregateType: 'task', aggregateId: id, payload: { taskId: id, commentId }, requestId: req.id, recipients: await taskAudience(connection, id, req.auth.userId) });
      await connection.commit();
      res.status(201).json({ data: { id: commentId, taskId: id, body: input.body } });
    } catch (error) { await connection.rollback(); next(validationError(error)); }
    finally { connection.release(); }
  });

  router.patch('/:id', async (req, res, next) => {
    const connection = await pool.getConnection();
    try {
      const id = uuid(req.params.id);
      const version = positiveVersion(req.body?.version);
      const { version: _version, ...editable } = req.body || {};
      const input = parse(taskPatchSchema, editable);
      // Create-schema defaults must not turn an omitted PATCH field into a destructive update.
      for (const key of ['customTable', 'customFields', 'fileIds']) if (!(key in editable)) delete input[key];
      if (!Object.keys(input).length) throw new AppError(422, 'VALIDATION_ERROR', 'Cần ít nhất một trường cần cập nhật.');
      await connection.beginTransaction();
      const current = await lockTask(connection, id, req.auth);
      if (Number(current.version) !== version) throw new AppError(409, 'STALE_VERSION', 'Công việc đã thay đổi. Hãy tải lại trước khi lưu.');
      const [assigneeRows] = await connection.execute('SELECT user_id FROM task_assignees WHERE task_id = ? AND ended_at IS NULL', [id]);
      const currentAssignees = assigneeRows.map(row => row.user_id);
      const isCreator = current.created_by === req.auth.userId;
      const isAssignee = Boolean(current.is_assignee);
      const onlyAssigneeFields = Object.keys(input).every(key => ['workflowStatus', 'customTable', 'customFields'].includes(key));
      if (req.auth.role !== 'admin' && !isCreator && !isAssignee) throw new AppError(403, 'FORBIDDEN', 'Bạn không có quyền cập nhật công việc này.');
      if (req.auth.role !== 'admin' && !isCreator && !onlyAssigneeFields) throw new AppError(403, 'FORBIDDEN', 'Bạn chỉ được cập nhật trạng thái, bảng tùy chỉnh và trường tùy chỉnh của công việc được giao.');
      if (input.assigneeIds) {
        validateAssignmentScope(req.auth, input.assigneeIds);
        await validateAssignees(connection, input.assigneeIds);
      }
      const changes = [];
      if (input.fileIds) {
        const [fileRows] = await connection.execute('SELECT file_id FROM task_file_links WHERE task_id = ? AND ended_at IS NULL', [id]);
        await replaceTaskFiles(connection, id, fileRows.map(row => row.file_id), input.fileIds, req.auth.userId);
        changes.push('fileIds');
      }
      const columns = { title: 'title', description: 'description', workflowStatus: 'workflow_status', managementGroupId: 'management_group_id', startAt: 'start_at', dueAt: 'due_at', customTable: 'custom_table', customFields: 'custom_fields' };
      const sets = []; const values = [];
      for (const [key, column] of Object.entries(columns)) if (key in input) {
        changes.push(key); sets.push(`${column} = ?`);
        const value = input[key];
        values.push(['customTable', 'customFields'].includes(key) ? JSON.stringify(value) : ['startAt', 'dueAt'].includes(key) ? (value ? new Date(value) : null) : value || null);
      }
      if (input.managementGroupId) await getActiveGroup(connection, input.managementGroupId);
      if (input.assigneeIds) {
        const next = [...new Set(input.assigneeIds)];
        await replaceAssignees(connection, id, currentAssignees, next, req.auth.userId);
        changes.push('assigneeIds');
      }
      if ('documentId' in input || 'document' in input) {
        if (current.task_type !== 'document') throw new AppError(422, 'VALIDATION_ERROR', 'Chỉ task xử lý văn bản được liên kết văn bản chính.');
        const documentId = await resolveDocument(connection, input.document, input.documentId, req.auth.userId, req.id);
        sets.push('primary_document_id = ?'); values.push(documentId); changes.push('documentId');
      }
      if (!sets.length) sets.push('version = version');
      sets.push('version = version + 1', 'updated_at = CURRENT_TIMESTAMP(3)');
      values.push(id, version);
      await connection.execute(`UPDATE tasks SET ${sets.join(', ')} WHERE id = ? AND version = ?`, values);
      await recordRevision(connection, { entityType: 'task', entityId: id, actorId: req.auth.userId, action: 'updated', changes, snapshot: input });
      await enqueueOutbox(connection, { eventType: 'task.updated', aggregateType: 'task', aggregateId: id, version: version + 1, payload: { id }, requestId: req.id, recipients: await taskAudience(connection, id, req.auth.userId) });
      await connection.commit();
      res.json({ data: { id, changes, version: version + 1 } });
    } catch (error) { await connection.rollback(); next(mapConflict(error) || validationError(error)); }
    finally { connection.release(); }
  });

  router.post('/:id/archive', archiveTask(pool, true));
  router.post('/:id/restore', archiveTask(pool, false));
  return router;
}

export function validateTaskInput(value) { return parse(taskInput, value); }

export async function createTaskInTransaction(connection, input, auth, requestId) {
  validateAssignmentScope(auth, input.assigneeIds);
  const id = randomUUID();
  const group = await getActiveGroup(connection, input.managementGroupId);
  await validateAssignees(connection, input.assigneeIds);
  let primaryDocumentId = input.documentId || null;
  let resourceId = null;
  if (input.type === 'document') primaryDocumentId = await resolveDocument(connection, input.document, input.documentId, auth.userId, requestId);
  if (input.type === 'resource') resourceId = await resolveResource(connection, input.resource, auth.userId, auth.role);
  const code = `${group.code}-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0, 4).toUpperCase()}`;
  await connection.execute(
    `INSERT INTO tasks (id, task_code, task_type, title, description, workflow_status, management_group_id, primary_document_id, start_at, due_at, custom_table, custom_fields, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, code, input.type, input.title, input.description || null, input.workflowStatus, input.managementGroupId, primaryDocumentId,
      input.startAt ? new Date(input.startAt) : null, input.dueAt ? new Date(input.dueAt) : null,
      JSON.stringify(input.customTable), JSON.stringify(input.customFields), auth.userId]
  );
  for (const userId of new Set(input.assigneeIds)) {
    await connection.execute('INSERT INTO task_assignees (id, task_id, user_id, assigned_by) VALUES (?, ?, ?, ?)', [randomUUID(), id, userId, auth.userId]);
  }
  if (resourceId) await connection.execute(
    'INSERT INTO task_resource_links (id, task_id, resource_id, linked_by) VALUES (?, ?, ?, ?)', [randomUUID(), id, resourceId, auth.userId]
  );
  await attachTaskFiles(connection, id, input.fileIds, auth.userId);
  const snapshot = { id, code, type: input.type, title: input.title, status: input.workflowStatus, managementGroupId: input.managementGroupId, assigneeIds: input.assigneeIds, primaryDocumentId, resourceId, fileIds: input.fileIds, startAt: input.startAt || null, dueAt: input.dueAt || null, version: 1 };
  await recordRevision(connection, { entityType: 'task', entityId: id, actorId: auth.userId, action: 'created', changes: Object.keys(snapshot), snapshot });
  const recipients = await taskAudience(connection, id, auth.userId, input.assigneeIds, input.managementGroupId);
  await enqueueOutbox(connection, { eventType: 'task.created', aggregateType: 'task', aggregateId: id, version: 1, payload: { id }, requestId, recipients });
  for (const userId of new Set(input.assigneeIds.filter(userId => userId !== auth.userId))) {
    const notificationId = randomUUID();
    await connection.execute(
      'INSERT INTO notifications (id, user_id, notification_type, entity_type, entity_id, message) VALUES (?, ?, ?, ?, ?, ?)',
      [notificationId, userId, 'task.assigned', 'task', id, `${code} · ${input.title}`]
    );
    await enqueueOutbox(connection, { eventType: 'notification.created', aggregateType: 'notification', aggregateId: notificationId, payload: { id: notificationId, taskId: id }, requestId, recipients: [userId] });
  }
  if (resourceId) await enqueueOutbox(connection, { eventType: 'resource.updated', aggregateType: 'resource', aggregateId: resourceId, payload: { id: resourceId, taskId: id }, requestId, recipients });
  return snapshot;
}

function buildFilters(req) {
  const scope = taskScopeSql(req.auth.role, req.auth.userId, req.auth.personId);
  const where = [`t.archived_at IS NULL`, `(${scope.sql})`];
  const values = [...scope.values];
  const q = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 180) : '';
  if (q) { where.push(`(t.title LIKE ? OR t.task_code LIKE ? OR DATE_FORMAT(t.start_at, '%Y-%m-%d') LIKE ? OR DATE_FORMAT(t.due_at, '%Y-%m-%d') LIKE ?)`); values.push(...Array(4).fill(`%${q}%`)); }
  for (const [param, column] of [['managementGroupId', 't.management_group_id'], ['taskType', 't.task_type'], ['workflowStatus', 't.workflow_status']]) {
    if (req.query[param]) {
      const allowed = param === 'taskType' ? TASK_TYPES : param === 'workflowStatus' ? WORKFLOW_STATUSES : null;
      const items = parseList(req.query[param], param === 'managementGroupId' ? 'uuid' : null, allowed);
      where.push(`${column} IN (${items.map(() => '?').join(',')})`); values.push(...items);
    }
  }
  if (req.query.documentId) {
    const ids = parseList(req.query.documentId, 'uuid');
    where.push(`(t.primary_document_id IN (${ids.map(() => '?').join(',')}) OR EXISTS (
      SELECT 1 FROM task_resource_links tr JOIN resource_document_links rd ON rd.resource_id = tr.resource_id AND rd.ended_at IS NULL
      WHERE tr.task_id = t.id AND tr.ended_at IS NULL AND rd.document_id IN (${ids.map(() => '?').join(',')})
    ))`); values.push(...ids, ...ids);
  }
  if (req.query.aggregateStatus) {
    if (!AGGREGATE_STATUSES.includes(req.query.aggregateStatus)) throw new AppError(400, 'BAD_REQUEST', 'Bộ lọc trạng thái không hợp lệ.');
    if (req.query.aggregateStatus !== 'all') { where.push(`${aggregateSql} = ?`); values.push(req.query.aggregateStatus); }
  }
  if (req.query.startFrom) { where.push('t.start_at >= ?'); values.push(validDate(req.query.startFrom)); }
  if (req.query.endTo) { where.push('t.due_at <= ?'); values.push(validDate(req.query.endTo)); }
  return { whereSql: where.join(' AND '), values };
}

async function loadAssignees(pool, taskIds) {
  if (!taskIds.length) return new Map();
  const [rows] = await pool.execute(
    `SELECT ta.task_id, u.id AS user_id, u.display_name, u.email FROM task_assignees ta JOIN app_users u ON u.id = ta.user_id
     WHERE ta.task_id IN (${taskIds.map(() => '?').join(',')}) AND ta.ended_at IS NULL ORDER BY u.display_name`, taskIds
  );
  const map = new Map();
  for (const row of rows) map.set(row.task_id, [...(map.get(row.task_id) || []), { id: row.user_id, displayName: row.display_name, email: row.email }]);
  return map;
}

function mapTask(row, assignees, files = []) {
  return {
    id: row.id, code: row.task_code, type: row.task_type, title: row.title, description: row.description,
    workflowStatus: row.workflow_status, aggregateStatus: row.aggregate_status, managementGroupId: row.management_group_id,
    managementGroupName: row.group_name, documentId: row.primary_document_id, resourceId: row.resource_id, startAt: row.start_at, dueAt: row.due_at,
    customTable: row.custom_table, customFields: row.custom_fields, assignees, files, createdBy: row.created_by,
    createdAt: row.created_at, updatedAt: row.updated_at, version: Number(row.version)
  };
}

async function assertTaskVisible(executor, auth, id) {
  const scope = taskScopeSql(auth.role, auth.userId, auth.personId);
  const [rows] = await executor.execute(`SELECT t.id FROM tasks t WHERE t.id = ? AND t.archived_at IS NULL AND (${scope.sql})`, [id, ...scope.values]);
  if (!rows[0]) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy công việc.');
}

async function getTaskMutationAccess(executor, auth, id) {
  const scope = taskScopeSql(auth.role, auth.userId, auth.personId);
  const [rows] = await executor.execute(
    `SELECT t.created_by, EXISTS(SELECT 1 FROM task_assignees ta WHERE ta.task_id = t.id AND ta.user_id = ? AND ta.ended_at IS NULL) AS is_assignee
     FROM tasks t WHERE t.id = ? AND t.archived_at IS NULL AND (${scope.sql})`, [auth.userId, id, ...scope.values]
  );
  if (!rows[0]) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy công việc.');
  return { ...rows[0], is_assignee: Boolean(rows[0].is_assignee) };
}

async function lockTask(connection, id, auth) {
  const scope = taskScopeSql(auth.role, auth.userId, auth.personId);
  const [rows] = await connection.execute(
    `SELECT t.*, EXISTS(SELECT 1 FROM task_assignees ta WHERE ta.task_id = t.id AND ta.user_id = ? AND ta.ended_at IS NULL) AS is_assignee
     FROM tasks t WHERE t.id = ? AND t.archived_at IS NULL AND (${scope.sql}) FOR UPDATE`, [auth.userId, id, ...scope.values]
  );
  if (!rows[0]) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy công việc đang hoạt động.');
  if (auth.role !== 'admin' && rows[0].created_by !== auth.userId && !Boolean(rows[0].is_assignee)) throw new AppError(403, 'FORBIDDEN', 'Bạn không có quyền cập nhật công việc này.');
  rows[0].is_assignee = Boolean(rows[0].is_assignee);
  return rows[0];
}

async function validateAssignees(connection, ids) {
  const unique = [...new Set(ids)];
  const [rows] = await connection.execute(
    `SELECT id FROM app_users WHERE id IN (${unique.map(() => '?').join(',')}) AND status = 'active' AND archived_at IS NULL`, unique
  );
  if (rows.length !== unique.length) throw new AppError(422, 'VALIDATION_ERROR', 'Một hoặc nhiều người được giao không còn hoạt động.');
}

function validateAssignmentScope(auth, ids) {
  if (auth.role !== 'admin' && (ids.length !== 1 || ids[0] !== auth.userId)) throw new AppError(403, 'FORBIDDEN', 'User chỉ được tự giao công việc cho mình.');
}

async function replaceAssignees(connection, taskId, current, next, actorId) {
  for (const userId of current.filter(id => !next.includes(id))) {
    await connection.execute(`UPDATE task_assignees SET ended_at = CURRENT_TIMESTAMP(3) WHERE task_id = ? AND user_id = ? AND ended_at IS NULL`, [taskId, userId]);
  }
  for (const userId of next.filter(id => !current.includes(id))) {
    await connection.execute('INSERT INTO task_assignees (id, task_id, user_id, assigned_by) VALUES (?, ?, ?, ?)', [randomUUID(), taskId, userId, actorId]);
  }
}

async function attachTaskFiles(connection, taskId, fileIds, actorId) {
  const ids = [...new Set(fileIds || [])]; if (!ids.length) return;
  const [files] = await connection.execute(`SELECT id FROM stored_files WHERE id IN (${ids.map(() => '?').join(',')}) AND archived_at IS NULL`, ids);
  if (files.length !== ids.length) throw new AppError(422, 'VALIDATION_ERROR', 'Một hoặc nhiều tệp đính kèm không hợp lệ.');
  for (const fileId of ids) await connection.execute('INSERT INTO task_file_links (id, task_id, file_id, linked_by) VALUES (?, ?, ?, ?)', [randomUUID(), taskId, fileId, actorId]);
}

async function replaceTaskFiles(connection, taskId, current, next, actorId) {
  const desired = [...new Set(next || [])];
  const [valid] = desired.length
    ? await connection.execute(`SELECT id FROM stored_files WHERE id IN (${desired.map(() => '?').join(',')}) AND archived_at IS NULL`, desired)
    : [[]];
  if (valid.length !== desired.length) throw new AppError(422, 'VALIDATION_ERROR', 'Một hoặc nhiều tệp đính kèm không hợp lệ.');
  for (const id of current.filter(id => !desired.includes(id))) await connection.execute('UPDATE task_file_links SET ended_at = CURRENT_TIMESTAMP(3) WHERE task_id = ? AND file_id = ? AND ended_at IS NULL', [taskId, id]);
  for (const id of desired.filter(id => !current.includes(id))) await connection.execute('INSERT INTO task_file_links (id, task_id, file_id, linked_by) VALUES (?, ?, ?, ?)', [randomUUID(), taskId, id, actorId]);
}

async function loadTaskFiles(executor, taskIds) {
  if (!taskIds.length) return new Map();
  const [rows] = await executor.execute(`SELECT l.task_id, f.id, f.original_name, f.media_type, f.byte_size FROM task_file_links l JOIN stored_files f ON f.id = l.file_id WHERE l.task_id IN (${taskIds.map(() => '?').join(',')}) AND l.ended_at IS NULL AND f.archived_at IS NULL ORDER BY l.linked_at`, taskIds);
  const result = new Map();
  for (const row of rows) result.set(row.task_id, [...(result.get(row.task_id) || []), { id: row.id, name: row.original_name, mediaType: row.media_type, size: Number(row.byte_size) }]);
  return result;
}

async function resolveDocument(connection, input, documentId, actorId, requestId) {
  if (documentId) {
    const [rows] = await connection.execute('SELECT id FROM documents WHERE id = ? AND archived_at IS NULL LIMIT 1', [documentId]);
    if (!rows[0]) throw new AppError(422, 'VALIDATION_ERROR', 'Văn bản đã chọn không tồn tại hoặc đã lưu trữ.');
    return documentId;
  }
  const number = normalizeDocumentNumber(input.documentNumber);
  if (number) {
    const [rows] = await connection.execute('SELECT id FROM documents WHERE document_type = ? AND normalized_number = ? LIMIT 1', [input.documentType, number]);
    if (rows[0]) return rows[0].id;
  }
  const id = randomUUID();
  await connection.execute(
    `INSERT INTO documents (id, document_type, document_number, normalized_number, issue_date, summary, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, input.documentType, blankNull(input.documentNumber), number, input.issueDate || null, blankNull(input.summary), actorId]
  );
  if (input.documentType === 'Công văn') await ensureDefaultAppendixSchema(connection, id, input.documentNumber, actorId);
  await recordRevision(connection, { entityType: 'document', entityId: id, actorId, action: 'created_from_task', changes: ['documentType', 'documentNumber', 'issueDate', 'summary'], snapshot: input });
  await enqueueOutbox(connection, { eventType: 'document.created', aggregateType: 'document', aggregateId: id, version: 1, payload: { id }, requestId, recipients: await activeUserIds(connection) });
  return id;
}

async function resolveResource(connection, input, actorId, role) {
  let resourceId = input.resourceId;
  const identity = resourceIdentity(input);
  if (resourceId) {
    const [rows] = await connection.execute('SELECT * FROM resources WHERE id = ? AND archived_at IS NULL FOR UPDATE', [resourceId]);
    if (!rows[0]) throw new AppError(422, 'VALIDATION_ERROR', 'Tài nguyên đã chọn không tồn tại hoặc đã lưu trữ.');
    resourceId = rows[0].id;
  } else {
    if (!identity || !input.unitName || !input.managingAgency || !input.systemName) throw new AppError(422, 'VALIDATION_ERROR', 'Cần nhập đủ tên đơn vị, cơ quan quản lý và hệ thống.');
    const [rows] = await connection.execute('SELECT id FROM resources WHERE identity_key = ? AND archived_at IS NULL FOR UPDATE', [identity]);
    resourceId = rows[0]?.id;
    if (!resourceId) {
      resourceId = randomUUID();
      await connection.execute(
        `INSERT INTO resources (id, identity_key, unit_name, managing_agency, system_name, level_name, direct_columns, direct_rows, custom_fields, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [resourceId, identity, input.unitName, input.managingAgency, input.systemName, input.levelName || null, JSON.stringify(input.directColumns), JSON.stringify(input.directRows), JSON.stringify(input.customFields), actorId]
      );
      await recordRevision(connection, { entityType: 'resource', entityId: resourceId, actorId, action: 'created_with_task', changes: ['unitName', 'managingAgency', 'systemName'], snapshot: input });
    }
  }
  if (input.registeredDocumentIds?.length || input.assetDocumentIds?.length) {
    await linkResourceDocuments(connection, resourceId, input.registeredDocumentIds || [], 'registration', actorId);
    await linkResourceDocuments(connection, resourceId, input.assetDocumentIds || [], 'asset', actorId);
  }
  return resourceId;
}

async function linkResourceDocuments(connection, resourceId, documentIds, type, actorId) {
  if (!documentIds.length) return;
  const unique = [...new Set(documentIds)];
  const [documents] = await connection.execute(`SELECT id, document_type FROM documents WHERE id IN (${unique.map(() => '?').join(',')}) AND archived_at IS NULL`, unique);
  if (documents.length !== unique.length) throw new AppError(422, 'VALIDATION_ERROR', 'Một hoặc nhiều văn bản liên kết không hợp lệ.');
  if (type === 'registration' && documents.some(item => item.document_type !== 'Công văn')) throw new AppError(422, 'VALIDATION_ERROR', 'Công văn đăng ký chỉ nhận văn bản loại Công văn.');
  if (type === 'asset' && documents.some(item => item.document_type !== 'Văn bản cấp tài nguyên')) throw new AppError(422, 'VALIDATION_ERROR', 'Văn bản cấp tài nguyên chỉ nhận đúng loại văn bản này.');
  for (const documentId of unique) {
    await connection.execute(
      `INSERT INTO resource_document_links (id, resource_id, document_id, link_type, linked_by)
       SELECT ?, ?, ?, ?, ? WHERE NOT EXISTS (
         SELECT 1 FROM resource_document_links WHERE resource_id = ? AND document_id = ? AND link_type = ? AND ended_at IS NULL
       )`, [randomUUID(), resourceId, documentId, type, actorId, resourceId, documentId, type]
    );
  }
}

function resourceIdentity(input) {
  if (!input.unitName || !input.managingAgency || !input.systemName) return null;
  const canonical = [input.unitName, input.managingAgency, input.systemName].map(value => value.trim().toLocaleLowerCase('vi').replace(/\s+/g, ' ')).join('\u001f');
  return createHash('sha256').update(canonical).digest('hex');
}

async function taskAudience(connection, taskId, actorId, assignees = [], groupId = null) {
  const [rows] = await connection.execute(
    `SELECT DISTINCT u.id FROM app_users u LEFT JOIN people p ON p.id = u.person_id
     WHERE u.status = 'active' AND u.archived_at IS NULL AND (
       u.role = 'admin' OR u.id = ? OR u.id IN (${assignees.length ? assignees.map(() => '?').join(',') : "SELECT '' WHERE 1=0"})
       OR EXISTS (SELECT 1 FROM person_group_memberships m WHERE m.person_id = p.id AND m.valid_to IS NULL AND m.group_id = ?)
       OR EXISTS (SELECT 1 FROM task_assignees ta JOIN app_users au ON au.id = ta.user_id JOIN person_group_memberships am ON am.person_id = au.person_id AND am.valid_to IS NULL JOIN person_group_memberships um ON um.group_id = am.group_id AND um.person_id = p.id AND um.valid_to IS NULL WHERE ta.task_id = ? AND ta.ended_at IS NULL)
     )`, [actorId, ...assignees, groupId || '', taskId]
  );
  return rows.map(row => row.id);
}

async function getActiveGroup(connection, id) {
  const [rows] = await connection.execute('SELECT id, code FROM org_groups WHERE id = ? AND archived_at IS NULL LIMIT 1', [id]);
  if (!rows[0]) throw new AppError(422, 'VALIDATION_ERROR', 'Nhóm quản lý không tồn tại hoặc đã lưu trữ.');
  return rows[0];
}

function archiveTask(pool, archived) {
  return async (req, res, next) => {
    const connection = await pool.getConnection();
    try {
      const id = uuid(req.params.id);
      await connection.beginTransaction();
      const [rows] = await connection.execute('SELECT * FROM tasks WHERE id = ? FOR UPDATE', [id]);
      const task = rows[0];
      if (!task || (archived ? task.archived_at : !task.archived_at)) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy công việc phù hợp.');
      if (!archived && req.auth.role !== 'admin') throw new AppError(403, 'FORBIDDEN', 'Chỉ admin được khôi phục công việc.');
      if (archived && req.auth.role !== 'admin' && task.created_by !== req.auth.userId) throw new AppError(403, 'FORBIDDEN', 'Chỉ người tạo hoặc admin được lưu trữ công việc.');
      await connection.execute(
        archived ? 'UPDATE tasks SET archived_at = CURRENT_TIMESTAMP(3), version = version + 1 WHERE id = ?' : 'UPDATE tasks SET archived_at = NULL, version = version + 1 WHERE id = ?', [id]
      );
      await recordRevision(connection, { entityType: 'task', entityId: id, actorId: req.auth.userId, action: archived ? 'archived' : 'restored' });
      await enqueueOutbox(connection, { eventType: archived ? 'task.archived' : 'task.restored', aggregateType: 'task', aggregateId: id, payload: { id, archived }, requestId: req.id, recipients: await taskAudience(connection, id, req.auth.userId) });
      await connection.commit();
      res.json({ data: { id, archived } });
    } catch (error) { await connection.rollback(); next(error); }
    finally { connection.release(); }
  };
}

function parse(schema, value) {
  const result = schema.safeParse(value);
  if (!result.success) throw new AppError(422, 'VALIDATION_ERROR', 'Dữ liệu gửi lên chưa hợp lệ.', 'Backend', result.error.issues.map(issue => ({ field: issue.path.join('.'), code: issue.code, message: issue.message })));
  return result.data;
}
function validationError(error) { return error instanceof z.ZodError ? new AppError(422, 'VALIDATION_ERROR', 'Dữ liệu gửi lên chưa hợp lệ.', 'Backend', error.issues) : error; }
function mapConflict(error) { return error.code === 'ER_DUP_ENTRY' ? new AppError(409, 'CONFLICT', 'Dữ liệu bị trùng hoặc đã được liên kết.') : null; }
function blankNull(value) { return value == null || value.trim() === '' ? null : value.trim(); }
function uuid(value) { const result = z.string().uuid().safeParse(value); if (!result.success) throw new AppError(400, 'BAD_REQUEST', 'Mã công việc không hợp lệ.'); return result.data; }
function positiveVersion(value) { const result = z.number().int().positive().safeParse(Number(value)); if (!result.success) throw new AppError(400, 'BAD_REQUEST', 'Thiếu hoặc sai version của công việc.'); return result.data; }
function pageNumber(value, min, max) { const result = z.coerce.number().int().min(min).max(max).safeParse(value); if (!result.success) throw new AppError(400, 'BAD_REQUEST', 'Tham số phân trang không hợp lệ.'); return result.data; }
function parseList(value, type, allowed) {
  const values = Array.isArray(value) ? value : String(value).split(',');
  const normalized = [...new Set(values.map(item => String(item).trim()).filter(Boolean))];
  if (!normalized.length || normalized.length > 100) throw new AppError(400, 'BAD_REQUEST', 'Bộ lọc nhiều giá trị không hợp lệ.');
  if (type === 'uuid' && normalized.some(item => !z.string().uuid().safeParse(item).success)) throw new AppError(400, 'BAD_REQUEST', 'Mã bộ lọc không hợp lệ.');
  if (allowed && normalized.some(item => !allowed.includes(item))) throw new AppError(400, 'BAD_REQUEST', 'Giá trị bộ lọc không hợp lệ.');
  return normalized;
}
function validDate(value) { const date = new Date(String(value)); if (Number.isNaN(date.valueOf())) throw new AppError(400, 'BAD_REQUEST', 'Ngày lọc không hợp lệ.'); return date; }
