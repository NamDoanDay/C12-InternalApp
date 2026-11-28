import { Router } from 'express';
import { createHash, randomUUID } from 'node:crypto';
import ExcelJS from 'exceljs';
import { z } from 'zod';
import { AppError } from '../../http/errors.js';
import { enqueueOutbox, recordRevision } from '../../db/write-helpers.js';
import { createTaskInTransaction, validateTaskInput } from '../tasks/routes.js';
import { defaultAppendixColumns, ensureDefaultAppendixSchema } from './appendix-schema.js';
import { taskScopeSql } from '../tasks/domain.js';

const jsonRecord = z.record(z.string().max(120), z.unknown());
const appendixSchema = z.object({
  columns: z.array(z.string().trim().min(1).max(120)).max(100),
  sharedHardwareRowCount: z.number().int().min(0).max(500).optional(),
  sharedRows: z.array(jsonRecord).max(500), privateRows: z.array(jsonRecord).max(500)
}).strict();
const appendixSchemaInput = z.object({ columns: z.array(z.string().trim().min(1).max(120)).max(100) }).strict();
const resourceInput = z.object({
  unitName: z.string().trim().min(1).max(255), managingAgency: z.string().trim().min(1).max(255), systemName: z.string().trim().min(1).max(255),
  levelName: z.string().trim().max(80).nullable().optional(), directColumns: z.array(z.string().trim().min(1).max(120)).max(100).default([]),
  directRows: z.array(jsonRecord).max(500).default([]), customFields: z.array(z.object({ id: z.string().max(80).optional(), label: z.string().trim().min(1).max(120), value: z.unknown().optional() }).strict()).max(100).default([]),
  registeredDocumentIds: z.array(z.string().uuid()).max(100).default([]), assetDocumentIds: z.array(z.string().uuid()).max(100).default([]),
  createTask: z.boolean().default(false), task: z.unknown().optional(), taskIds: z.array(z.string().uuid()).max(100).default([]),
  appendices: z.record(z.string().uuid(), appendixSchema).default({}), fileIds: z.array(z.string().uuid()).max(100).default([])
}).strict().superRefine((value, context) => {
  if (value.createTask && !value.task) context.addIssue({ code: 'custom', path: ['task'], message: 'Cần nhập thông tin công việc đi kèm.' });
  if (!value.createTask && value.task) context.addIssue({ code: 'custom', path: ['task'], message: 'Chỉ gửi công việc khi bật tạo kèm công việc.' });
});

export function createResourcesRouter({ pool }) {
  const router = Router();

  router.get('/', async (req, res, next) => {
    try {
      const filters = buildResourceFilters(req);
      const limit = pageNumber(req.query.limit ?? 50, 1, 200), offset = pageNumber(req.query.offset ?? 0, 0, Number.MAX_SAFE_INTEGER);
      const [[counts], [rows]] = await Promise.all([
        pool.execute(`SELECT COUNT(*) total FROM resources r WHERE ${filters.sql}`, filters.values),
        pool.execute(`SELECT r.* FROM resources r WHERE ${filters.sql} ORDER BY r.unit_name, r.managing_agency, r.system_name LIMIT ? OFFSET ?`, [...filters.values, limit, offset])
      ]);
      const records = await hydrateResources(pool, rows);
      res.json({ data: records, page: { limit, offset, total: Number(counts[0].total) } });
    } catch (error) { next(error); }
  });

  router.get('/export.xlsx', async (req, res, next) => {
    try {
      const filters = buildResourceFilters(req);
      const [rows] = await pool.execute(`SELECT r.* FROM resources r WHERE ${filters.sql} ORDER BY r.unit_name, r.managing_agency, r.system_name`, filters.values);
      const records = await hydrateResources(pool, rows);
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Dữ liệu tài nguyên', { views: [{ state: 'frozen', ySplit: 1 }] });
      const appendixDocs = uniqueDocs(records);
      const directColumns = [...new Set(records.flatMap(record => record.directColumns || []))];
      const customFieldNames = [...new Set(records.flatMap(record => (record.customFields || []).map(field => field.label)))];
      const columns = [
        ['Tên đơn vị', 'unitName'], ['Cơ quan quản lý', 'managingAgency'], ['Hệ thống', 'systemName'], ['Công văn đăng ký', 'registeredDocuments'],
        ['Văn bản cấp tài nguyên', 'assetDocuments'], ['Công việc (Task)', 'taskCodes'],
        ...directColumns.map(name => [`Thông tin chung · ${name}`, `direct:${name}`]),
        ...appendixDocs.flatMap(doc => (doc.columns || []).map(name => [`${doc.documentNumber || doc.documentType} · ${name}`, `appendix:${doc.id}:${name}`])),
        ...customFieldNames.map(name => [`Trường tùy chỉnh · ${name}`, `custom:${name}`])
      ];
      sheet.columns = columns.map(([header, key]) => ({ header, key, width: Math.min(48, Math.max(14, header.length + 2)) }));
      for (const resource of records) {
        const line = {
          unitName: resource.unitName, managingAgency: resource.managingAgency, systemName: resource.systemName,
          registeredDocuments: resource.registeredDocuments.map(d => d.documentNumber || d.documentType).join(', '),
          assetDocuments: resource.assetDocuments.map(d => d.documentNumber || d.documentType).join(', '),
          taskCodes: resource.tasks.map(task => task.code).join(', ')
        };
        for (const name of directColumns) line[`direct:${name}`] = (resource.directRows || []).map(row => cleanCell(row[name])).filter(Boolean).join('\n');
        for (const doc of appendixDocs) {
          for (const name of doc.columns || []) {
            const appendix = resource.appendices[doc.id];
            line[`appendix:${doc.id}:${name}`] = [...(appendix?.sharedRows || []), ...(appendix?.privateRows || [])].map(row => cleanCell(row[name])).filter(Boolean).join('\n');
          }
        }
        for (const name of customFieldNames) line[`custom:${name}`] = cleanCell(resource.customFields.find(field => field.label === name)?.value);
        sheet.addRow(line);
      }
      sheet.getRow(1).font = { bold: true };
      sheet.columns.forEach((column, index) => {
        const values = [column.header, ...sheet.getColumn(index + 1).values.slice(2)].map(value => String(value ?? ''));
        column.width = Math.min(60, Math.max(12, ...values.map(value => Math.min(58, value.split('\n').reduce((max, part) => Math.max(max, part.length), 0) + 2))));
      });
      const buffer = await workbook.xlsx.writeBuffer();
      const date = new Date().toISOString().slice(0, 10);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''Du_lieu_tai_nguyen_${date}.xlsx`);
      res.send(Buffer.from(buffer));
    } catch (error) { next(error); }
  });

  router.post('/', async (req, res, next) => {
    const connection = await pool.getConnection();
    try {
      const input = parse(resourceInput, req.body);
      const taskInput = input.createTask ? validateTaskInput({ ...input.task, type: 'resource', resource: { unitName: input.unitName, managingAgency: input.managingAgency, systemName: input.systemName } }) : null;
      await connection.beginTransaction();
      const identity = identityKey(input), [matches] = await connection.execute('SELECT * FROM resources WHERE identity_key = ? AND archived_at IS NULL FOR UPDATE', [identity]);
      const existing = matches[0] || null;
      const id = existing?.id || randomUUID();
      const current = existing ? await mergeExistingResource(connection, existing, input, req.auth) : input;
      if (!existing) await insertResource(connection, id, identity, current, req.auth.userId);
      else await connection.execute(
        `UPDATE resources SET level_name = ?, direct_columns = ?, direct_rows = ?, custom_fields = ?, version = version + 1, updated_at = CURRENT_TIMESTAMP(3) WHERE id = ?`,
        [current.levelName || null, JSON.stringify(current.directColumns), JSON.stringify(current.directRows), JSON.stringify(current.customFields), id]
      );
      for (const [type, nextIds] of [['registration', current.registeredDocumentIds], ['asset', current.assetDocumentIds]]) {
        const [links] = await connection.execute('SELECT document_id FROM resource_document_links WHERE resource_id = ? AND link_type = ? AND ended_at IS NULL', [id, type]);
        await replaceDocumentLinks(connection, id, links.map(link => link.document_id), nextIds, type, req.auth.userId);
      }
      await saveAppendices(connection, id, current.appendices, req.auth.userId);
      const [fileLinks] = await connection.execute('SELECT file_id FROM resource_file_links WHERE resource_id = ? AND ended_at IS NULL', [id]);
      await replaceResourceFiles(connection, id, fileLinks.map(link => link.file_id), current.fileIds, req.auth.userId);
      let task = null;
      if (taskInput) {
        task = await createTaskInTransaction(connection, { ...taskInput, customFields: current.customFields, resource: { resourceId: id } }, req.auth, req.id);
        await replaceTaskFiles(connection, task.id, [], current.fileIds, req.auth.userId);
      }
      const [taskLinks] = await connection.execute('SELECT task_id FROM task_resource_links WHERE resource_id = ? AND ended_at IS NULL', [id]);
      const currentTaskIds = taskLinks.map(link => link.task_id);
      for (const taskId of current.taskIds) if (!currentTaskIds.includes(taskId)) await linkExistingTask(connection, id, taskId, req.auth.userId, req.auth);
      const version = existing ? Number(existing.version) + 1 : 1;
      const snapshot = { id, ...resourceSnapshot(current), taskId: task?.id || null, merged: Boolean(existing), version };
      await recordRevision(connection, { entityType: 'resource', entityId: id, actorId: req.auth.userId, action: existing ? 'merged_by_identity' : 'created', changes: Object.keys(resourceSnapshot(current)), snapshot });
      await enqueueResourceEvent(connection, { id, version, eventType: existing ? 'resource.updated' : 'resource.created', req, actorId: req.auth.userId });
      await connection.commit();
      res.status(existing ? 200 : 201).json({ data: snapshot });
    } catch (error) { await connection.rollback(); next(mapConflict(error) || validationError(error)); }
    finally { connection.release(); }
  });

  router.get('/appendix-defaults/:documentId', async (req, res, next) => {
    try {
      const docId = uuid(req.params.documentId);
      const [docs] = await pool.execute(`SELECT id, document_type, document_number FROM documents WHERE id = ? AND document_type = 'Công văn' AND archived_at IS NULL`, [docId]);
      if (!docs[0]) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy Công văn đăng ký.');
      const columns = await ensureDefaultAppendixSchema(pool, docId, docs[0].document_number, req.auth.userId);
      res.json({ data: { documentId: docId, columns } });
    } catch (error) { next(error); }
  });

  router.get('/:id', async (req, res, next) => {
    try {
      const id = uuid(req.params.id);
      await assertResourceVisible(pool, req.auth, id);
      const [rows] = await pool.execute('SELECT * FROM resources WHERE id = ? AND archived_at IS NULL', [id]);
      const [data] = await hydrateResources(pool, rows);
      res.json({ data });
    } catch (error) { next(error); }
  });

  router.get('/:id/history', async (req, res, next) => {
    try {
      const id = uuid(req.params.id);
      await assertResourceVisible(pool, req.auth, id);
      const scope = taskRevisionScope(req.auth);
      const [rows] = await pool.execute(
        `SELECT r.id, r.entity_type, r.entity_id, r.action, r.changes_json, r.snapshot_json, r.created_at, u.display_name actor_name
         FROM entity_revisions r JOIN app_users u ON u.id = r.actor_id
         WHERE (r.entity_type = 'resource' AND r.entity_id = ?) OR (r.entity_type = 'task' AND r.entity_id IN (
           SELECT tr.task_id FROM task_resource_links tr JOIN tasks t ON t.id = tr.task_id
           WHERE tr.resource_id = ? AND (${scope.sql})
         )) ORDER BY r.created_at DESC`, [id, id, ...scope.values]
      );
      res.json({ data: rows.map(row => ({ id: row.id, entityType: row.entity_type, entityId: row.entity_id, action: row.action, changes: row.changes_json, snapshot: row.snapshot_json, createdAt: row.created_at, actorName: row.actor_name })) });
    } catch (error) { next(error); }
  });

  router.patch('/:id/appendices/:documentId/schema', async (req, res, next) => {
    const connection = await pool.getConnection();
    try {
      const id = uuid(req.params.id), documentId = uuid(req.params.documentId), version = positiveVersion(req.body?.version);
      const { columns } = parse(appendixSchemaInput, { columns: req.body?.columns });
      if (new Set(columns).size !== columns.length) throw new AppError(422, 'VALIDATION_ERROR', 'Tên cột trong phụ lục không được trùng nhau.');
      await connection.beginTransaction();
      const resource = await lockResource(connection, id);
      if (Number(resource.version) !== version) throw new AppError(409, 'STALE_VERSION', 'Tài nguyên đã thay đổi. Hãy tải lại trước khi lưu.');
      await assertResourceEditable(connection, req.auth, id, resource.created_by);
      const [linked] = await connection.execute(`SELECT id FROM resource_document_links WHERE resource_id = ? AND document_id = ? AND link_type = 'registration' AND ended_at IS NULL`, [id, documentId]);
      if (!linked[0]) throw new AppError(422, 'VALIDATION_ERROR', 'Công văn chưa được liên kết với tài nguyên này.');
      const [schemaRows] = await connection.execute('SELECT columns_json, version FROM resource_appendix_schemas WHERE document_id = ? FOR UPDATE', [documentId]);
      if (!schemaRows[0]) throw new AppError(404, 'NOT_FOUND', 'Chưa có cấu trúc cột cho Công văn.');
      const schemaVersion = positiveVersion(req.body?.schemaVersion);
      if (Number(schemaRows[0].version) !== schemaVersion) throw new AppError(409, 'STALE_SCHEMA_VERSION', 'Cấu trúc cột đã được người khác thay đổi. Hãy tải lại bảng.');
      await connection.execute('UPDATE resource_appendix_schemas SET columns_json = ?, version = version + 1, updated_by = ? WHERE document_id = ? AND version = ?', [JSON.stringify(columns), req.auth.userId, documentId, schemaVersion]);
      await connection.execute('UPDATE resources SET version = version + 1 WHERE id = ? AND version = ?', [id, version]);
      await recordRevision(connection, { entityType: 'resource', entityId: id, actorId: req.auth.userId, action: 'appendix_schema_updated', changes: ['appendixColumns', documentId], snapshot: columns });
      await enqueueResourceEvent(connection, { id, version: version + 1, eventType: 'resource.updated', req, actorId: req.auth.userId });
      await connection.commit();
      res.json({ data: { id, documentId, columns, version: version + 1, schemaVersion: schemaVersion + 1 } });
    } catch (error) { await connection.rollback(); next(validationError(error)); }
    finally { connection.release(); }
  });

  router.patch('/:id', async (req, res, next) => {
    const connection = await pool.getConnection();
    try {
      const id = uuid(req.params.id), version = positiveVersion(req.body?.version);
      const { version: _version, createTask: _createTask, task: _task, ...body } = req.body || {};
      const input = parse(resourceInput.omit({ createTask: true, task: true }), body);
      await connection.beginTransaction();
      const current = await lockResource(connection, id);
      if (Number(current.version) !== version) throw new AppError(409, 'STALE_VERSION', 'Tài nguyên đã thay đổi. Hãy tải lại trước khi lưu.');
      await assertResourceEditable(connection, req.auth, id, current.created_by);
      const nextIdentity = identityKey(input);
      const [dupes] = await connection.execute('SELECT id FROM resources WHERE identity_key = ? AND id <> ? AND archived_at IS NULL', [nextIdentity, id]);
      if (dupes[0]) throw new AppError(409, 'RESOURCE_IDENTITY_EXISTS', 'Đơn vị, cơ quan quản lý và hệ thống này đã có trong danh mục tài nguyên.');
      await connection.execute(
        `UPDATE resources SET identity_key = ?, unit_name = ?, managing_agency = ?, system_name = ?, level_name = ?, direct_columns = ?, direct_rows = ?, custom_fields = ?, version = version + 1 WHERE id = ? AND version = ?`,
        [nextIdentity, input.unitName, input.managingAgency, input.systemName, input.levelName || null, JSON.stringify(input.directColumns), JSON.stringify(input.directRows), JSON.stringify(input.customFields), id, version]
      );
      const [oldLinks] = await connection.execute(`SELECT document_id, link_type FROM resource_document_links WHERE resource_id = ? AND ended_at IS NULL`, [id]);
      await replaceDocumentLinks(connection, id, oldLinks.filter(x => x.link_type === 'registration').map(x => x.document_id), input.registeredDocumentIds, 'registration', req.auth.userId);
      await replaceDocumentLinks(connection, id, oldLinks.filter(x => x.link_type === 'asset').map(x => x.document_id), input.assetDocumentIds, 'asset', req.auth.userId);
      await saveAppendices(connection, id, input.appendices, req.auth.userId);
      const [oldFiles] = await connection.execute(`SELECT file_id FROM resource_file_links WHERE resource_id = ? AND ended_at IS NULL`, [id]);
      await replaceResourceFiles(connection, id, oldFiles.map(x => x.file_id), input.fileIds, req.auth.userId);
      await replaceResourceTasks(connection, id, input.taskIds, req.auth.userId, req.auth);
      await syncSharedTaskData(connection, id, input, req.auth.userId, req.id);
      const changes = diffSnapshot(current, input);
      await recordRevision(connection, { entityType: 'resource', entityId: id, actorId: req.auth.userId, action: 'updated', changes, snapshot: resourceSnapshot(input) });
      const versionNext = version + 1;
      await enqueueResourceEvent(connection, { id, version: versionNext, eventType: 'resource.updated', req, actorId: req.auth.userId });
      await connection.commit();
      res.json({ data: { id, changes, version: versionNext } });
    } catch (error) { await connection.rollback(); next(mapConflict(error) || validationError(error)); }
    finally { connection.release(); }
  });

  router.patch('/:id/appendices/:documentId', async (req, res, next) => {
    const connection = await pool.getConnection();
    try {
      const id = uuid(req.params.id), documentId = uuid(req.params.documentId), version = positiveVersion(req.body?.version);
      const input = parse(appendixSchema, req.body);
      await connection.beginTransaction();
      const resource = await lockResource(connection, id);
      if (Number(resource.version) !== version) throw new AppError(409, 'STALE_VERSION', 'Tài nguyên đã thay đổi. Hãy tải lại trước khi lưu.');
      await assertResourceEditable(connection, req.auth, id, resource.created_by);
      const [docs] = await connection.execute(`SELECT id, document_number FROM documents WHERE id = ? AND document_type = 'Công văn' AND archived_at IS NULL`, [documentId]);
      if (!docs[0]) throw new AppError(422, 'VALIDATION_ERROR', 'Phụ lục chỉ được gắn với Công văn đăng ký đang hoạt động.');
      const [linked] = await connection.execute(`SELECT id FROM resource_document_links WHERE resource_id = ? AND document_id = ? AND link_type = 'registration' AND ended_at IS NULL`, [id, documentId]);
      if (!linked[0]) throw new AppError(422, 'VALIDATION_ERROR', 'Công văn này chưa được liên kết với tài nguyên.');
      await saveAppendix(connection, id, documentId, input);
      await connection.execute('UPDATE resources SET version = version + 1 WHERE id = ? AND version = ?', [id, version]);
      await recordRevision(connection, { entityType: 'resource', entityId: id, actorId: req.auth.userId, action: 'appendix_updated', changes: ['appendices', documentId], snapshot: input });
      await enqueueResourceEvent(connection, { id, version: version + 1, eventType: 'resource.updated', req, actorId: req.auth.userId });
      await connection.commit();
      res.json({ data: { id, documentId, version: version + 1 } });
    } catch (error) { await connection.rollback(); next(validationError(error)); }
    finally { connection.release(); }
  });

  router.post('/:id/archive', archiveResource(pool, true));
  router.post('/:id/restore', archiveResource(pool, false));
  return router;
}

function buildResourceFilters(req) {
  const where = ['r.archived_at IS NULL']; const values = [];
  const q = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 180) : '';
  if (q) { where.push('(r.unit_name LIKE ? OR r.managing_agency LIKE ? OR r.system_name LIKE ?)'); values.push(...Array(3).fill(`%${q}%`)); }
  if (req.query.documentId) {
    const ids = uuidList(req.query.documentId);
    where.push(`EXISTS (SELECT 1 FROM resource_document_links l WHERE l.resource_id = r.id AND l.ended_at IS NULL AND l.document_id IN (${ids.map(() => '?').join(',')}))`); values.push(...ids);
  }
  if (req.query.assignedToMe === 'true' || req.query.assignedToMe === 'mine') {
    where.push(`EXISTS (SELECT 1 FROM task_resource_links tr JOIN task_assignees ta ON ta.task_id = tr.task_id AND ta.ended_at IS NULL WHERE tr.resource_id = r.id AND tr.ended_at IS NULL AND ta.user_id = ?)`); values.push(req.auth.userId);
  } else if (req.query.assignedToMe && !['false', 'all'].includes(req.query.assignedToMe)) throw new AppError(400, 'BAD_REQUEST', 'Bộ lọc phạm vi không hợp lệ.');
  return { sql: where.join(' AND '), values };
}

async function hydrateResources(executor, rows) {
  if (!rows.length) return [];
  const ids = rows.map(row => row.id), placeholders = ids.map(() => '?').join(',');
  const [[docRows], [taskRows], [fileRows], [appendixRows]] = await Promise.all([
    executor.execute(`SELECT l.resource_id, l.document_id, l.link_type, d.document_type, d.document_number, d.issue_date, d.summary FROM resource_document_links l JOIN documents d ON d.id = l.document_id WHERE l.resource_id IN (${placeholders}) AND l.ended_at IS NULL AND d.archived_at IS NULL ORDER BY d.document_type, d.document_number`, ids),
    executor.execute(`SELECT l.resource_id, t.id, t.task_code, t.title, t.workflow_status, t.due_at, t.version FROM task_resource_links l JOIN tasks t ON t.id = l.task_id WHERE l.resource_id IN (${placeholders}) AND l.ended_at IS NULL AND t.archived_at IS NULL ORDER BY t.created_at DESC`, ids),
    executor.execute(`SELECT l.resource_id, f.id, f.original_name, f.media_type, f.byte_size FROM resource_file_links l JOIN stored_files f ON f.id = l.file_id WHERE l.resource_id IN (${placeholders}) AND l.ended_at IS NULL AND f.archived_at IS NULL`, ids),
    executor.execute(`SELECT l.resource_id, l.document_id, COALESCE(a.shared_hardware_row_count, 0) shared_hardware_row_count, a.shared_rows, a.private_rows, COALESCE(a.version, 1) version, s.columns_json
      FROM resource_document_links l JOIN documents d ON d.id = l.document_id AND d.archived_at IS NULL AND d.document_type = 'Công văn'
      LEFT JOIN resource_appendix_schemas s ON s.document_id = l.document_id
      LEFT JOIN resource_appendices a ON a.resource_id = l.resource_id AND a.document_id = l.document_id
      WHERE l.resource_id IN (${placeholders}) AND l.link_type = 'registration' AND l.ended_at IS NULL`, ids)
  ]);
  return rows.map(row => {
    const docs = docRows.filter(doc => doc.resource_id === row.id);
    const appendices = Object.fromEntries(appendixRows.filter(app => app.resource_id === row.id).map(app => [app.document_id, { columns: app.columns_json || [], sharedHardwareRowCount: app.shared_hardware_row_count, sharedRows: app.shared_rows || [], privateRows: app.private_rows || [], version: Number(app.version) }]));
    return {
      ...mapResource(row), registeredDocuments: docs.filter(doc => doc.link_type === 'registration').map(mapLinkedDocument), assetDocuments: docs.filter(doc => doc.link_type === 'asset').map(mapLinkedDocument),
      tasks: taskRows.filter(task => task.resource_id === row.id).map(task => ({ id: task.id, code: task.task_code, title: task.title, workflowStatus: task.workflow_status, dueAt: task.due_at, version: Number(task.version) })),
      files: fileRows.filter(file => file.resource_id === row.id).map(file => ({ id: file.id, name: file.original_name, mediaType: file.media_type, size: Number(file.byte_size) })), appendices
    };
  });
}

function mapResource(row) { return { id: row.id, identityKey: row.identity_key, unitName: row.unit_name, managingAgency: row.managing_agency, systemName: row.system_name, levelName: row.level_name, directColumns: row.direct_columns || [], directRows: row.direct_rows || [], customFields: row.custom_fields || [], createdBy: row.created_by, createdAt: row.created_at, updatedAt: row.updated_at, version: Number(row.version), archivedAt: row.archived_at }; }
function mapLinkedDocument(row) { return { id: row.document_id, documentType: row.document_type, documentNumber: row.document_number, issueDate: row.issue_date, summary: row.summary }; }

async function insertResource(connection, id, identity, input, actorId) {
  await connection.execute(`INSERT INTO resources (id, identity_key, unit_name, managing_agency, system_name, level_name, direct_columns, direct_rows, custom_fields, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, identity, input.unitName, input.managingAgency, input.systemName, input.levelName || null, JSON.stringify(input.directColumns), JSON.stringify(input.directRows), JSON.stringify(input.customFields), actorId]);
}
async function mergeExistingResource(connection, existing, input, auth) {
  await assertResourceEditable(connection, auth, existing.id, existing.created_by);
  const [registrations] = await connection.execute("SELECT document_id FROM resource_document_links WHERE resource_id = ? AND link_type = 'registration' AND ended_at IS NULL", [existing.id]);
  const [assets] = await connection.execute("SELECT document_id FROM resource_document_links WHERE resource_id = ? AND link_type = 'asset' AND ended_at IS NULL", [existing.id]);
  const [files] = await connection.execute('SELECT file_id FROM resource_file_links WHERE resource_id = ? AND ended_at IS NULL', [existing.id]);
  const [tasks] = await connection.execute('SELECT task_id FROM task_resource_links WHERE resource_id = ? AND ended_at IS NULL', [existing.id]);
  const current = {
    ...input,
    levelName: input.levelName || existing.level_name || null,
    directColumns: unique([...asArray(existing.direct_columns), ...input.directColumns]),
    directRows: mergeRowsByIndex(asArray(existing.direct_rows), input.directRows),
    customFields: mergeCustomFields(asArray(existing.custom_fields), input.customFields),
    registeredDocumentIds: unique([...registrations.map(row => row.document_id), ...input.registeredDocumentIds]),
    assetDocumentIds: unique([...assets.map(row => row.document_id), ...input.assetDocumentIds]),
    fileIds: unique([...files.map(row => row.file_id), ...input.fileIds]),
    taskIds: unique([...tasks.map(row => row.task_id), ...input.taskIds]),
    appendices: {}
  };
  for (const [documentId, appendix] of Object.entries(input.appendices)) {
    const [rows] = await connection.execute('SELECT shared_hardware_row_count, shared_rows, private_rows FROM resource_appendices WHERE resource_id = ? AND document_id = ?', [existing.id, documentId]);
    const [schemaRows] = await connection.execute('SELECT columns_json FROM resource_appendix_schemas WHERE document_id = ?', [documentId]);
    const previous = rows[0];
    current.appendices[documentId] = {
      columns: unique([...asArray(schemaRows[0]?.columns_json), ...appendix.columns]),
      sharedHardwareRowCount: Math.max(Number(previous?.shared_hardware_row_count || 0), appendix.sharedHardwareRowCount ?? appendix.sharedRows.length),
      sharedRows: mergeRowsByIndex(asArray(previous?.shared_rows), appendix.sharedRows),
      privateRows: mergeRowsByIndex(asArray(previous?.private_rows), appendix.privateRows)
    };
  }
  return current;
}
function asArray(value) { return Array.isArray(value) ? value : []; }
function unique(values) { return [...new Set(values.filter(value => value != null && value !== ''))]; }
function mergeRowsByIndex(existing, incoming) {
  const result = existing.map(row => ({ ...row }));
  incoming.forEach((row, index) => {
    if (!result[index]) result[index] = {};
    for (const [key, value] of Object.entries(row || {})) if (value != null && value !== '') result[index][key] = value;
  });
  return result;
}
function mergeCustomFields(existing, incoming) {
  const result = existing.map(field => ({ ...field }));
  for (const field of incoming) {
    const key = field.id ? `id:${field.id}` : `label:${String(field.label).trim().toLocaleLowerCase('vi')}`;
    const index = result.findIndex(item => (item.id ? `id:${item.id}` : `label:${String(item.label).trim().toLocaleLowerCase('vi')}`) === key);
    if (index < 0) result.push({ ...field });
    else if (field.value != null && field.value !== '') result[index] = { ...result[index], ...field };
  }
  return result;
}
function resourceSnapshot(input) { return { unitName: input.unitName, managingAgency: input.managingAgency, systemName: input.systemName, levelName: input.levelName || null, directColumns: input.directColumns, directRows: input.directRows, customFields: input.customFields, registeredDocumentIds: input.registeredDocumentIds, assetDocumentIds: input.assetDocumentIds, appendices: input.appendices }; }
function identityKey(input) { return createHash('sha256').update([input.unitName, input.managingAgency, input.systemName].map(value => value.trim().toLocaleLowerCase('vi').replace(/\s+/g, ' ')).join('\u001f')).digest('hex'); }

async function replaceDocumentLinks(connection, resourceId, currentIds, nextIds, type, actorId) {
  const current = new Set(currentIds), next = new Set(nextIds);
  const removed = [...current].filter(id => !next.has(id)), added = [...next].filter(id => !current.has(id));
  for (const id of removed) await connection.execute(`UPDATE resource_document_links SET ended_at = CURRENT_TIMESTAMP(3) WHERE resource_id = ? AND document_id = ? AND link_type = ? AND ended_at IS NULL`, [resourceId, id, type]);
  if (!next.size) return;
  const ids = [...next], [docs] = await connection.execute(`SELECT id, document_type FROM documents WHERE id IN (${ids.map(() => '?').join(',')}) AND archived_at IS NULL`, ids);
  if (docs.length !== ids.length) throw new AppError(422, 'VALIDATION_ERROR', 'Một hoặc nhiều văn bản liên kết không hợp lệ.');
  if (type === 'registration' && docs.some(doc => doc.document_type !== 'Công văn')) throw new AppError(422, 'VALIDATION_ERROR', 'Công văn đăng ký chỉ nhận loại Công văn.');
  if (type === 'asset' && docs.some(doc => doc.document_type !== 'Văn bản cấp tài nguyên')) throw new AppError(422, 'VALIDATION_ERROR', 'Văn bản cấp tài nguyên chỉ nhận đúng loại văn bản này.');
  for (const id of added) await connection.execute(`INSERT INTO resource_document_links (id, resource_id, document_id, link_type, linked_by) VALUES (?, ?, ?, ?, ?)`, [randomUUID(), resourceId, id, type, actorId]);
  if (type === 'registration') {
    for (const doc of docs) await ensureDefaultAppendixSchema(connection, doc.id, doc.document_number, actorId);
  }
}

async function saveAppendices(connection, resourceId, appendices, actorId) {
  for (const [documentId, input] of Object.entries(appendices)) {
    const [linked] = await connection.execute(`SELECT d.id, d.document_number FROM documents d JOIN resource_document_links l ON l.document_id = d.id AND l.resource_id = ? AND l.link_type = 'registration' AND l.ended_at IS NULL WHERE d.id = ? AND d.document_type = 'Công văn' AND d.archived_at IS NULL`, [resourceId, documentId]);
    if (!linked[0]) throw new AppError(422, 'VALIDATION_ERROR', 'Phụ lục phải thuộc Công văn đăng ký đã liên kết.');
    const schemaColumns = await ensureDefaultAppendixSchema(connection, documentId, linked[0].document_number, actorId);
    const mergedColumns = [...new Set([...schemaColumns, ...input.columns])];
    if (mergedColumns.length !== schemaColumns.length) await connection.execute('UPDATE resource_appendix_schemas SET columns_json = ?, version = version + 1, updated_by = ? WHERE document_id = ?', [JSON.stringify(mergedColumns), actorId, documentId]);
    await saveAppendix(connection, resourceId, documentId, { ...input, columns: mergedColumns });
  }
}

async function saveAppendix(connection, resourceId, documentId, input) {
  const normalizedRows = input.sharedRows.map(row => pickColumns(row, input.columns));
  const privateRows = input.privateRows.map(row => pickColumns(row, input.columns));
  await connection.execute(`INSERT INTO resource_appendices (resource_id, document_id, shared_hardware_row_count, shared_rows, private_rows) VALUES (?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE shared_hardware_row_count = VALUES(shared_hardware_row_count), shared_rows = VALUES(shared_rows), private_rows = VALUES(private_rows), version = version + 1`,
    [resourceId, documentId, input.sharedHardwareRowCount ?? normalizedRows.length, JSON.stringify(normalizedRows), JSON.stringify(privateRows)]);
}

async function replaceResourceFiles(connection, resourceId, currentIds, nextIds, actorId) {
  const current = new Set(currentIds), next = new Set(nextIds);
  for (const id of current) if (!next.has(id)) await connection.execute(`UPDATE resource_file_links SET ended_at = CURRENT_TIMESTAMP(3) WHERE resource_id = ? AND file_id = ? AND ended_at IS NULL`, [resourceId, id]);
  for (const id of next) if (!current.has(id)) {
    const [files] = await connection.execute(`SELECT id FROM stored_files WHERE id = ? AND archived_at IS NULL`, [id]);
    if (!files[0]) throw new AppError(422, 'VALIDATION_ERROR', 'Tệp đính kèm không tồn tại hoặc đã lưu trữ.');
    await connection.execute(`INSERT INTO resource_file_links (id, resource_id, file_id, linked_by) VALUES (?, ?, ?, ?)`, [randomUUID(), resourceId, id, actorId]);
  }
}

async function replaceTaskFiles(connection, taskId, currentIds, nextIds, actorId) {
  const current = new Set(currentIds), next = new Set(nextIds);
  for (const id of current) if (!next.has(id)) await connection.execute(`UPDATE task_file_links SET ended_at = CURRENT_TIMESTAMP(3) WHERE task_id = ? AND file_id = ? AND ended_at IS NULL`, [taskId, id]);
  for (const id of next) if (!current.has(id)) {
    const [files] = await connection.execute('SELECT id FROM stored_files WHERE id = ? AND archived_at IS NULL', [id]);
    if (!files[0]) throw new AppError(422, 'VALIDATION_ERROR', 'Tệp đính kèm không tồn tại hoặc đã lưu trữ.');
    await connection.execute(`INSERT INTO task_file_links (id, task_id, file_id, linked_by) VALUES (?, ?, ?, ?)`, [randomUUID(), taskId, id, actorId]);
  }
}

async function linkExistingTask(connection, resourceId, taskId, actorId, auth) {
  const [rows] = await connection.execute(`SELECT t.id, t.task_type FROM tasks t WHERE t.id = ? AND t.archived_at IS NULL FOR UPDATE`, [taskId]);
  if (!rows[0]) throw new AppError(422, 'VALIDATION_ERROR', 'Công việc liên kết không tồn tại hoặc đã lưu trữ.');
  if (rows[0].task_type !== 'resource') throw new AppError(422, 'VALIDATION_ERROR', 'Chỉ task loại Quản lý tài nguyên được liên kết với resource.');
  await assertTaskCreationAllowed(connection, auth, taskId);
  await connection.execute(`INSERT INTO task_resource_links (id, task_id, resource_id, linked_by) VALUES (?, ?, ?, ?)`, [randomUUID(), taskId, resourceId, actorId]);
}
async function replaceResourceTasks(connection, resourceId, nextIds, actorId, auth) {
  const [rows] = await connection.execute('SELECT task_id FROM task_resource_links WHERE resource_id = ? AND ended_at IS NULL FOR UPDATE', [resourceId]);
  const current = new Set(rows.map(row => row.task_id)), next = new Set(nextIds);
  for (const taskId of current) if (!next.has(taskId)) await connection.execute('UPDATE task_resource_links SET ended_at = CURRENT_TIMESTAMP(3) WHERE resource_id = ? AND task_id = ? AND ended_at IS NULL', [resourceId, taskId]);
  for (const taskId of next) if (!current.has(taskId)) await linkExistingTask(connection, resourceId, taskId, actorId, auth);
}
async function syncSharedTaskData(connection, resourceId, input, actorId, requestId) {
  const [rows] = await connection.execute(`SELECT t.id, t.version FROM task_resource_links l JOIN tasks t ON t.id = l.task_id WHERE l.resource_id = ? AND l.ended_at IS NULL AND t.archived_at IS NULL FOR UPDATE`, [resourceId]);
  for (const task of rows) {
    await connection.execute('UPDATE tasks SET custom_fields = ?, version = version + 1, updated_at = CURRENT_TIMESTAMP(3) WHERE id = ?', [JSON.stringify(input.customFields), task.id]);
    const [existingFiles] = await connection.execute('SELECT file_id FROM task_file_links WHERE task_id = ? AND ended_at IS NULL', [task.id]);
    await replaceTaskFiles(connection, task.id, existingFiles.map(row => row.file_id), input.fileIds, actorId);
    await recordRevision(connection, { entityType: 'task', entityId: task.id, actorId, action: 'resource_shared_data_updated', changes: ['customFields', 'fileIds'], snapshot: { customFields: input.customFields, fileIds: input.fileIds } });
    await enqueueOutbox(connection, { eventType: 'task.updated', aggregateType: 'task', aggregateId: task.id, version: Number(task.version) + 1, payload: { id: task.id }, requestId, recipients: await taskRecipients(connection, task.id, actorId) });
  }
}
async function taskRecipients(connection, taskId, actorId) {
  const [rows] = await connection.execute(`SELECT DISTINCT u.id FROM app_users u WHERE u.status = 'active' AND u.archived_at IS NULL AND (u.role = 'admin' OR u.id = ? OR EXISTS (SELECT 1 FROM task_assignees a WHERE a.task_id = ? AND a.user_id = u.id AND a.ended_at IS NULL))`, [actorId, taskId]);
  return rows.map(row => row.id);
}
async function assertTaskCreationAllowed(connection, auth, taskId) {
  if (auth.role === 'admin') return;
  const [rows] = await connection.execute(`SELECT id FROM tasks WHERE id = ? AND created_by = ?`, [taskId, auth.userId]);
  if (!rows[0]) throw new AppError(403, 'FORBIDDEN', 'Chỉ admin hoặc người tạo task được liên kết task này.');
}

async function assertResourceVisible(executor, auth, id) {
  const [rows] = await executor.execute(`SELECT r.id FROM resources r WHERE r.id = ? AND r.archived_at IS NULL`, [id]);
  if (!rows[0]) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy tài nguyên.');
}
function taskRevisionScope(auth) {
  return taskScopeSql(auth.role, auth.userId, auth.personId);
}
async function assertResourceEditable(executor, auth, id, createdBy) {
  if (auth.role === 'admin' || createdBy === auth.userId) return;
  const [rows] = await executor.execute(`SELECT id FROM task_resource_links l JOIN tasks t ON t.id = l.task_id WHERE l.resource_id = ? AND l.ended_at IS NULL AND (t.created_by = ? OR EXISTS (SELECT 1 FROM task_assignees a WHERE a.task_id = t.id AND a.user_id = ? AND a.ended_at IS NULL)) LIMIT 1`, [id, auth.userId, auth.userId]);
  if (!rows[0]) throw new AppError(403, 'FORBIDDEN', 'Bạn chỉ được sửa tài nguyên do mình tạo hoặc có task liên kết do mình tạo/được giao.');
}
async function lockResource(connection, id) {
  const [rows] = await connection.execute('SELECT * FROM resources WHERE id = ? AND archived_at IS NULL FOR UPDATE', [id]);
  if (!rows[0]) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy tài nguyên đang hoạt động.');
  return rows[0];
}

function archiveResource(pool, archived) {
  return async (req, res, next) => {
    const connection = await pool.getConnection();
    try {
      const id = uuid(req.params.id); await connection.beginTransaction();
      const current = await lockResource(connection, id); await assertResourceEditable(connection, req.auth, id, current.created_by);
      if (!archived && req.auth.role !== 'admin') throw new AppError(403, 'FORBIDDEN', 'Chỉ admin được khôi phục tài nguyên.');
      await connection.execute(archived ? `UPDATE resources SET archived_at = CURRENT_TIMESTAMP(3), version = version + 1 WHERE id = ?` : `UPDATE resources SET archived_at = NULL, version = version + 1 WHERE id = ?`, [id]);
      await recordRevision(connection, { entityType: 'resource', entityId: id, actorId: req.auth.userId, action: archived ? 'archived' : 'restored' });
      await enqueueResourceEvent(connection, { id, version: Number(current.version) + 1, eventType: archived ? 'resource.archived' : 'resource.restored', req, actorId: req.auth.userId });
      await connection.commit(); res.json({ data: { id, archived } });
    } catch (error) { await connection.rollback(); next(error); }
    finally { connection.release(); }
  };
}

async function enqueueResourceEvent(connection, { id, version, eventType, req, actorId }) {
  const [rows] = await connection.execute(`SELECT DISTINCT u.id FROM app_users u WHERE u.status = 'active' AND u.archived_at IS NULL AND (u.role = 'admin' OR u.id = ? OR EXISTS (SELECT 1 FROM task_resource_links l JOIN task_assignees a ON a.task_id = l.task_id AND a.ended_at IS NULL WHERE l.resource_id = ? AND l.ended_at IS NULL AND a.user_id = u.id) OR EXISTS (SELECT 1 FROM task_resource_links l JOIN tasks t ON t.id = l.task_id WHERE l.resource_id = ? AND l.ended_at IS NULL AND t.created_by = u.id))`, [actorId, id, id]);
  await enqueueOutbox(connection, { eventType, aggregateType: 'resource', aggregateId: id, version, payload: { id }, requestId: req.id, recipients: rows.map(row => row.id) });
}

function uniqueDocs(records) {
  const docs = new Map();
  for (const record of records) for (const linked of record.registeredDocuments) {
    const app = record.appendices[linked.id];
    const prior = docs.get(linked.id) || { ...linked, columns: [] };
    prior.columns = [...new Set([...prior.columns, ...(app?.columns || defaultExcelColumns(linked.documentNumber))])]; docs.set(linked.id, prior);
  }
  return [...docs.values()];
}
function defaultExcelColumns(number) { return defaultAppendixColumns(number); }
function pickColumns(row, columns) { return Object.fromEntries(columns.map(column => [column, row[column] ?? ''])); }
function cleanCell(value) { if (value == null || value === '—') return ''; if (typeof value === 'object') return JSON.stringify(value); return String(value).replace(/<[^>]*>/g, '').trim(); }
function diffSnapshot(current, next) { const before = { unitName: current.unit_name, managingAgency: current.managing_agency, systemName: current.system_name, levelName: current.level_name, directColumns: current.direct_columns, directRows: current.direct_rows, customFields: current.custom_fields }; return Object.keys(next).filter(key => !['registeredDocumentIds', 'assetDocumentIds', 'appendices', 'fileIds', 'taskIds'].includes(key) && JSON.stringify(before[key]) !== JSON.stringify(next[key])); }
function parse(schema, value) { const result = schema.safeParse(value); if (!result.success) throw new AppError(422, 'VALIDATION_ERROR', 'Dữ liệu gửi lên chưa hợp lệ.', 'Backend', result.error.issues.map(issue => ({ field: issue.path.join('.'), code: issue.code, message: issue.message }))); return result.data; }
function validationError(error) { return error instanceof z.ZodError ? new AppError(422, 'VALIDATION_ERROR', 'Dữ liệu gửi lên chưa hợp lệ.', 'Backend', error.issues) : error; }
function mapConflict(error) { return error.code === 'ER_DUP_ENTRY' ? new AppError(409, 'CONFLICT', 'Tài nguyên hoặc liên kết bị trùng.') : null; }
function uuid(value) { const parsed = z.string().uuid().safeParse(value); if (!parsed.success) throw new AppError(400, 'BAD_REQUEST', 'Mã tài nguyên hoặc văn bản không hợp lệ.'); return parsed.data; }
function uuidList(value) { const list = Array.isArray(value) ? value : String(value).split(','); const parsed = z.array(z.string().uuid()).max(100).safeParse(list); if (!parsed.success || !parsed.data.length) throw new AppError(400, 'BAD_REQUEST', 'Danh sách văn bản không hợp lệ.'); return [...new Set(parsed.data)]; }
function pageNumber(value, min, max) { const parsed = z.coerce.number().int().min(min).max(max).safeParse(value); if (!parsed.success) throw new AppError(400, 'BAD_REQUEST', 'Tham số phân trang không hợp lệ.'); return parsed.data; }
function positiveVersion(value) { const parsed = z.coerce.number().int().positive().safeParse(value); if (!parsed.success) throw new AppError(400, 'BAD_REQUEST', 'Thiếu hoặc sai version của tài nguyên.'); return parsed.data; }
