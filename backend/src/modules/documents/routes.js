import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { AppError } from '../../http/errors.js';
import { enqueueOutbox, recordRevision } from '../../db/write-helpers.js';
import { DOCUMENT_TYPES, normalizeDocumentNumber } from './types.js';
import { requireAdmin } from '../../middleware/auth.js';
import { ensureDefaultAppendixSchema } from '../resources/appendix-schema.js';

const optionalText = max => z.string().trim().max(max).nullable().optional();
const documentInput = z.object({
  documentType: z.enum(DOCUMENT_TYPES), documentNumber: optionalText(180), issueDate: z.string().date().nullable().optional(),
  effectiveDate: z.string().date().nullable().optional(), issuingAgency: optionalText(255), summary: optionalText(5000), note: optionalText(5000),
  fileIds: z.array(z.string().uuid()).max(100).default([])
}).strict();

export function createDocumentsRouter({ pool }) {
  const router = Router();

  router.get('/', async (req, res, next) => {
    try {
      const { q = '', type = '', limit = '50', offset = '0' } = req.query;
      const paging = parsePage(limit, offset);
      if (type && !DOCUMENT_TYPES.includes(type)) throw new AppError(400, 'BAD_REQUEST', 'Loại văn bản không hợp lệ.');
      const values = [];
      const where = ['archived_at IS NULL'];
      if (type) { where.push('document_type = ?'); values.push(type); }
      if (q) { where.push('(document_number LIKE ? OR summary LIKE ? OR issuing_agency LIKE ?)'); values.push(...Array(3).fill(`%${String(q).slice(0, 180)}%`)); }
      const whereSql = where.join(' AND ');
      const [[countRows], [rows]] = await Promise.all([
        pool.execute(`SELECT COUNT(*) AS total FROM documents WHERE ${whereSql}`, values),
        pool.execute(`SELECT id, document_type, document_number, issue_date, effective_date, issuing_agency, summary, note, version, created_at, updated_at
          FROM documents WHERE ${whereSql} ORDER BY issue_date DESC, created_at DESC LIMIT ? OFFSET ?`, [...values, paging.limit, paging.offset])
      ]);
      const files = await loadDocumentFiles(pool, rows.map(row => row.id));
      res.json({ data: rows.map(row => ({ ...mapDocument(row), files: files.get(row.id) || [] })), page: { ...paging, total: Number(countRows[0].total) } });
    } catch (error) { next(error); }
  });

  router.get('/:id', async (req, res, next) => {
    try {
      const id = uuid(req.params.id);
      const [rows] = await pool.execute(
        `SELECT id, document_type, document_number, issue_date, effective_date, issuing_agency, summary, note, version, created_at, updated_at, archived_at
         FROM documents WHERE id = ? LIMIT 1`, [id]
      );
      if (!rows[0]) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy văn bản.');
      const [tasks] = await pool.execute(`SELECT id, task_code, title FROM tasks WHERE primary_document_id = ? AND archived_at IS NULL ORDER BY created_at DESC`, [id]);
      const [resources] = await pool.execute(
        `SELECT DISTINCT r.id, r.unit_name, r.managing_agency, r.system_name FROM resources r
         JOIN resource_document_links l ON l.resource_id = r.id AND l.ended_at IS NULL
         WHERE l.document_id = ? AND r.archived_at IS NULL`, [id]
      );
      res.json({ data: { ...mapDocument(rows[0]), archivedAt: rows[0].archived_at, relatedTasks: tasks, relatedResources: resources } });
    } catch (error) { next(error); }
  });

  router.get('/:id/history', async (req, res, next) => {
    try {
      const id = uuid(req.params.id);
      const [rows] = await pool.execute(
        `SELECT r.id, r.action, r.changes_json, r.snapshot_json, r.created_at, u.display_name AS actor_name
         FROM entity_revisions r JOIN app_users u ON u.id = r.actor_id
         WHERE r.entity_type = 'document' AND r.entity_id = ? ORDER BY r.created_at DESC`, [id]
      );
      res.json({ data: rows.map(row => ({ id: row.id, action: row.action, changes: row.changes_json, snapshot: row.snapshot_json, createdAt: row.created_at, actorName: row.actor_name })) });
    } catch (error) { next(error); }
  });

  router.post('/', requireAdmin, async (req, res, next) => {
    const connection = await pool.getConnection();
    try {
      const input = parse(documentInput, req.body);
      const id = randomUUID();
      await connection.beginTransaction();
      const existing = await findDuplicate(connection, input);
      if (existing) throw new AppError(409, 'DUPLICATE_DOCUMENT', 'Văn bản cùng loại và số đã tồn tại.', 'Backend', [{ id: existing.id }]);
      await connection.execute(
        `INSERT INTO documents (id, document_type, document_number, normalized_number, issue_date, effective_date, issuing_agency, summary, note, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, input.documentType, blankNull(input.documentNumber), normalizeDocumentNumber(input.documentNumber), input.issueDate || null,
          input.effectiveDate || null, blankNull(input.issuingAgency), blankNull(input.summary), blankNull(input.note), req.auth.userId]
      );
      await replaceDocumentFiles(connection, id, [], input.fileIds, req.auth.userId);
      if (input.documentType === 'Công văn') await ensureDefaultAppendixSchema(connection, id, input.documentNumber, req.auth.userId);
      await recordRevision(connection, { entityType: 'document', entityId: id, actorId: req.auth.userId, action: 'created', changes: Object.keys(input), snapshot: input });
      const recipients = await activeUserIds(connection);
      await enqueueOutbox(connection, { eventType: 'document.created', aggregateType: 'document', aggregateId: id, version: 1, payload: { id }, requestId: req.id, recipients });
      await connection.commit();
      res.status(201).json({ data: { id, ...input, version: 1 } });
    } catch (error) { await connection.rollback(); next(mapDatabaseConflict(error) || validationError(error)); }
    finally { connection.release(); }
  });

  router.patch('/:id', requireAdmin, async (req, res, next) => {
    const connection = await pool.getConnection();
    try {
      const id = uuid(req.params.id);
      const version = positiveVersion(req.body?.version);
      const { version: _version, ...editable } = req.body || {};
      const input = parse(documentInput.partial(), editable);
      if (!Object.keys(input).length) throw new AppError(422, 'VALIDATION_ERROR', 'Cần ít nhất một trường cần cập nhật.');
      await connection.beginTransaction();
      const [currentRows] = await connection.execute(`SELECT * FROM documents WHERE id = ? AND archived_at IS NULL FOR UPDATE`, [id]);
      const current = currentRows[0];
      if (!current) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy văn bản đang hoạt động.');
      if (Number(current.version) !== version) throw new AppError(409, 'STALE_VERSION', 'Văn bản đã thay đổi. Hãy tải lại trước khi lưu.');
      const merged = {
        documentType: input.documentType ?? current.document_type,
        documentNumber: Object.hasOwn(input, 'documentNumber') ? input.documentNumber : current.document_number
      };
      if (input.documentType || Object.hasOwn(input, 'documentNumber')) {
        const duplicate = await findDuplicate(connection, merged, id);
        if (duplicate) throw new AppError(409, 'DUPLICATE_DOCUMENT', 'Văn bản cùng loại và số đã tồn tại.', 'Backend', [{ id: duplicate.id }]);
      }
      const fields = {
        documentType: ['document_type', input.documentType], documentNumber: ['document_number', input.documentNumber],
        issueDate: ['issue_date', input.issueDate], effectiveDate: ['effective_date', input.effectiveDate],
        issuingAgency: ['issuing_agency', input.issuingAgency], summary: ['summary', input.summary], note: ['note', input.note]
      };
      const set = []; const values = [];
      for (const [key, [column, value]] of Object.entries(fields)) if (key in input) {
        set.push(`${column} = ?`);
        values.push(['documentNumber', 'issuingAgency', 'summary', 'note'].includes(key) ? blankNull(value) : value || null);
      }
      if (Object.hasOwn(input, 'documentNumber') || 'documentType' in input) {
        set.push('normalized_number = ?'); values.push(normalizeDocumentNumber(merged.documentNumber));
      }
      set.push('version = version + 1', 'updated_at = CURRENT_TIMESTAMP(3)');
      values.push(id, version);
      const [result] = await connection.execute(`UPDATE documents SET ${set.join(', ')} WHERE id = ? AND version = ?`, values);
      if (!result.affectedRows) throw new AppError(409, 'STALE_VERSION', 'Văn bản đã thay đổi. Hãy tải lại trước khi lưu.');
      if (input.fileIds) {
        const [oldFiles] = await connection.execute('SELECT file_id FROM document_file_links WHERE document_id = ? AND ended_at IS NULL', [id]);
        await replaceDocumentFiles(connection, id, oldFiles.map(row => row.file_id), input.fileIds, req.auth.userId);
      }
      await recordRevision(connection, { entityType: 'document', entityId: id, actorId: req.auth.userId, action: 'updated', changes: Object.keys(input), snapshot: input });
      await enqueueOutbox(connection, { eventType: 'document.updated', aggregateType: 'document', aggregateId: id, version: version + 1, payload: { id }, requestId: req.id, recipients: await activeUserIds(connection) });
      await connection.commit();
      res.json({ data: { id, ...merged, ...input, version: version + 1 } });
    } catch (error) { await connection.rollback(); next(mapDatabaseConflict(error) || validationError(error)); }
    finally { connection.release(); }
  });

  router.post('/:id/archive', requireAdmin, archiveDocument(pool, true));
  router.post('/:id/restore', requireAdmin, archiveDocument(pool, false));
  return router;
}

function archiveDocument(pool, archived) {
  return async (req, res, next) => {
    const connection = await pool.getConnection();
    try {
      const id = uuid(req.params.id);
      await connection.beginTransaction();
      const [result] = await connection.execute(
        archived
          ? `UPDATE documents SET archived_at = CURRENT_TIMESTAMP(3), version = version + 1, updated_at = CURRENT_TIMESTAMP(3) WHERE id = ? AND archived_at IS NULL`
          : `UPDATE documents SET archived_at = NULL, version = version + 1, updated_at = CURRENT_TIMESTAMP(3) WHERE id = ? AND archived_at IS NOT NULL`, [id]
      );
      if (!result.affectedRows) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy văn bản phù hợp.');
      await recordRevision(connection, { entityType: 'document', entityId: id, actorId: req.auth.userId, action: archived ? 'archived' : 'restored' });
      await enqueueOutbox(connection, { eventType: archived ? 'document.archived' : 'document.restored', aggregateType: 'document', aggregateId: id, payload: { id, archived }, requestId: req.id, recipients: await activeUserIds(connection) });
      await connection.commit();
      res.json({ data: { id, archived } });
    } catch (error) { await connection.rollback(); next(error); }
    finally { connection.release(); }
  };
}

async function findDuplicate(connection, input, exceptId = '') {
  const number = normalizeDocumentNumber(input.documentNumber);
  if (!number) return null;
  const [rows] = await connection.execute(
    `SELECT id FROM documents WHERE document_type = ? AND normalized_number = ? AND id <> ? LIMIT 1`, [input.documentType, number, exceptId]
  );
  return rows[0] || null;
}
async function activeUserIds(connection) {
  const [rows] = await connection.execute(`SELECT id FROM app_users WHERE status = 'active' AND archived_at IS NULL`);
  return rows.map(row => row.id);
}
function mapDocument(row) {
  return { id: row.id, documentType: row.document_type, documentNumber: row.document_number, issueDate: row.issue_date, effectiveDate: row.effective_date, issuingAgency: row.issuing_agency, summary: row.summary, note: row.note, version: Number(row.version), createdAt: row.created_at, updatedAt: row.updated_at };
}
async function replaceDocumentFiles(connection, documentId, current, next, actorId) {
  const desired = [...new Set(next || [])];
  const [valid] = desired.length ? await connection.execute(`SELECT id FROM stored_files WHERE id IN (${desired.map(() => '?').join(',')}) AND archived_at IS NULL`, desired) : [[]];
  if (valid.length !== desired.length) throw new AppError(422, 'VALIDATION_ERROR', 'Một hoặc nhiều tệp đính kèm không hợp lệ.');
  for (const id of current.filter(id => !desired.includes(id))) await connection.execute('UPDATE document_file_links SET ended_at = CURRENT_TIMESTAMP(3) WHERE document_id = ? AND file_id = ? AND ended_at IS NULL', [documentId, id]);
  for (const id of desired.filter(id => !current.includes(id))) await connection.execute('INSERT INTO document_file_links (id, document_id, file_id, linked_by) VALUES (?, ?, ?, ?)', [randomUUID(), documentId, id, actorId]);
}
async function loadDocumentFiles(executor, documentIds) {
  if (!documentIds.length) return new Map();
  const [rows] = await executor.execute(`SELECT l.document_id, f.id, f.original_name, f.media_type, f.byte_size FROM document_file_links l JOIN stored_files f ON f.id = l.file_id WHERE l.document_id IN (${documentIds.map(() => '?').join(',')}) AND l.ended_at IS NULL AND f.archived_at IS NULL ORDER BY l.linked_at`, documentIds);
  const result = new Map();
  for (const row of rows) result.set(row.document_id, [...(result.get(row.document_id) || []), { id: row.id, name: row.original_name, mediaType: row.media_type, size: Number(row.byte_size) }]);
  return result;
}
function parse(schema, value) {
  const result = schema.safeParse(value);
  if (!result.success) throw new AppError(422, 'VALIDATION_ERROR', 'Dữ liệu gửi lên chưa hợp lệ.', 'Backend', result.error.issues.map(issue => ({ field: issue.path.join('.'), code: issue.code, message: issue.message })));
  return result.data;
}
function validationError(error) { return error instanceof z.ZodError ? new AppError(422, 'VALIDATION_ERROR', 'Dữ liệu gửi lên chưa hợp lệ.', 'Backend', error.issues) : error; }
function mapDatabaseConflict(error) { return error.code === 'ER_DUP_ENTRY' ? new AppError(409, 'DUPLICATE_DOCUMENT', 'Văn bản cùng loại và số đã tồn tại.') : null; }
function blankNull(value) { return value == null || value.trim() === '' ? null : value.trim(); }
function positiveVersion(value) {
  const parsed = z.number().int().positive().safeParse(Number(value));
  if (!parsed.success) throw new AppError(400, 'BAD_REQUEST', 'Thiếu hoặc sai version của văn bản.');
  return parsed.data;
}
function parsePage(limit, offset) {
  const l = Number(limit); const o = Number(offset);
  if (!Number.isInteger(l) || l < 1 || l > 200 || !Number.isInteger(o) || o < 0) throw new AppError(400, 'BAD_REQUEST', 'Tham số phân trang không hợp lệ.');
  return { limit: l, offset: o };
}
function uuid(value) {
  const result = z.string().uuid().safeParse(value);
  if (!result.success) throw new AppError(400, 'BAD_REQUEST', 'Mã văn bản không hợp lệ.');
  return result.data;
}
