import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { AppError } from '../../http/errors.js';
import { enqueueOutbox, recordRevision } from '../../db/write-helpers.js';
import { requireAdmin } from '../../middleware/auth.js';
import { DOCUMENT_TYPES } from '../documents/types.js';

const inputSchema = z.object({ title: z.string().trim().min(1).max(500), documentNumber: nullable(180), documentType: z.enum(DOCUMENT_TYPES).nullable().optional(), issuingLevel: z.string().trim().max(80).nullable().optional(), issuingAgency: nullable(255), issueDate: z.string().date().nullable().optional(), effectiveDate: z.string().date().nullable().optional(), summary: nullable(5000), body: z.string().max(50000).nullable().optional(), relatedDocumentIds: z.array(z.string().uuid()).max(100).default([]), customFields: z.array(z.record(z.string().max(120), z.unknown())).max(100).default([]), fileIds: z.array(z.string().uuid()).max(100).default([]) }).strict();

export function createKnowledgeRouter({ pool }) {
  const router = Router();
  router.get('/', async (req, res, next) => {
    try {
      const filters = buildFilters(req), limit = page(req.query.limit ?? 50, 1, 200), offset = page(req.query.offset ?? 0, 0, Number.MAX_SAFE_INTEGER);
      const [countResult, listResult] = await Promise.all([
        pool.execute(`SELECT COUNT(*) total FROM knowledge_articles k WHERE ${filters.sql}`, filters.values),
        pool.execute(`SELECT k.* FROM knowledge_articles k WHERE ${filters.sql} ORDER BY k.issue_date DESC, k.updated_at DESC LIMIT ? OFFSET ?`, [...filters.values, limit, offset])
      ]);
      const count = countResult[0][0], rows = listResult[0], files = await loadKnowledgeFiles(pool, rows.map(row => row.id));
      res.json({ data: rows.map(row => ({ ...mapKnowledge(row), files: files.get(row.id) || [] })), page: { limit, offset, total: Number(count.total) } });
    } catch (error) { next(error); }
  });
  router.post('/', requireAdmin, async (req, res, next) => {
    const connection = await pool.getConnection();
    try {
      const input = parse(inputSchema, req.body), id = randomUUID(); await connection.beginTransaction();
      await assertRelatedDocuments(connection, input.relatedDocumentIds);
      await insertKnowledge(connection, id, input, req.auth.userId);
      await replaceKnowledgeFiles(connection, id, [], input.fileIds, req.auth.userId);
      await recordRevision(connection, { entityType: 'knowledge', entityId: id, actorId: req.auth.userId, action: 'created', changes: Object.keys(input), snapshot: input });
      await event(connection, 'knowledge.created', id, req.id); await connection.commit(); res.status(201).json({ data: { id, ...input, version: 1 } });
    } catch (error) { await connection.rollback(); next(error); } finally { connection.release(); }
  });
  router.get('/:id', async (req, res, next) => {
    try { const id = uuid(req.params.id); const [rows] = await pool.execute('SELECT * FROM knowledge_articles WHERE id = ? AND archived_at IS NULL', [id]); if (!rows[0]) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy kiến thức.'); res.json({ data: mapKnowledge(rows[0]) }); }
    catch (error) { next(error); }
  });
  router.get('/:id/history', async (req, res, next) => {
    try {
      const id = uuid(req.params.id), [rows] = await pool.execute(`SELECT r.id, r.action, r.changes_json, r.snapshot_json, r.created_at, u.display_name actor_name FROM entity_revisions r JOIN app_users u ON u.id = r.actor_id WHERE r.entity_type = 'knowledge' AND r.entity_id = ? ORDER BY r.created_at DESC`, [id]);
      res.json({ data: rows.map(row => ({ id: row.id, action: row.action, changes: row.changes_json, snapshot: row.snapshot_json, createdAt: row.created_at, actorName: row.actor_name })) });
    } catch (error) { next(error); }
  });
  router.patch('/:id', requireAdmin, async (req, res, next) => {
    const connection = await pool.getConnection();
    try {
      const id = uuid(req.params.id), version = positiveVersion(req.body?.version), { version: _version, ...body } = req.body || {}, input = parse(inputSchema.partial(), body);
      if (!Object.keys(input).length) throw new AppError(422, 'VALIDATION_ERROR', 'Cần ít nhất một trường cập nhật.');
      await connection.beginTransaction();
      const [rows] = await connection.execute('SELECT * FROM knowledge_articles WHERE id = ? AND archived_at IS NULL FOR UPDATE', [id]);
      if (!rows[0]) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy kiến thức.');
      if (Number(rows[0].version) !== version) throw new AppError(409, 'STALE_VERSION', 'Kiến thức đã thay đổi.');
      if (input.relatedDocumentIds) await assertRelatedDocuments(connection, input.relatedDocumentIds);
      if (input.fileIds) {
        const [oldFiles] = await connection.execute('SELECT file_id FROM knowledge_file_links WHERE knowledge_id = ? AND ended_at IS NULL', [id]);
        await replaceKnowledgeFiles(connection, id, oldFiles.map(row => row.file_id), input.fileIds, req.auth.userId);
      }
      const fields = { title: 'title', documentNumber: 'document_number', documentType: 'document_type', issuingLevel: 'issuing_level', issuingAgency: 'issuing_agency', issueDate: 'issue_date', effectiveDate: 'effective_date', summary: 'summary', body: 'body', relatedDocumentIds: 'related_document_ids', customFields: 'custom_fields' };
      const set = [], values = [];
      for (const [key, column] of Object.entries(fields)) if (key in input) { set.push(`${column} = ?`); values.push(['relatedDocumentIds', 'customFields'].includes(key) ? JSON.stringify(input[key]) : input[key] || null); }
      set.push('version = version + 1', 'updated_at = CURRENT_TIMESTAMP(3)'); values.push(id, version);
      await connection.execute(`UPDATE knowledge_articles SET ${set.join(', ')} WHERE id = ? AND version = ?`, values);
      await recordRevision(connection, { entityType: 'knowledge', entityId: id, actorId: req.auth.userId, action: 'updated', changes: Object.keys(input), snapshot: input });
      await event(connection, 'knowledge.updated', id, req.id); await connection.commit(); res.json({ data: { id, version: version + 1 } });
    } catch (error) { await connection.rollback(); next(error); } finally { connection.release(); }
  });
  router.post('/:id/archive', requireAdmin, archive(pool, true)); router.post('/:id/restore', requireAdmin, archive(pool, false));
  return router;
}

function buildFilters(req) {
  const where = ['k.archived_at IS NULL'], values = [];
  for (const [query, column] of [['issuingLevel', 'k.issuing_level'], ['issuingAgency', 'k.issuing_agency'], ['documentType', 'k.document_type']]) if (req.query[query]) { where.push(`${column} = ?`); values.push(String(req.query[query]).slice(0, 255)); }
  if (req.query.q) { where.push('(k.title LIKE ? OR k.document_number LIKE ? OR k.summary LIKE ?)'); values.push(...Array(3).fill(`%${String(req.query.q).slice(0, 180)}%`)); }
  return { sql: where.join(' AND '), values };
}
async function insertKnowledge(connection, id, input, actorId) {
  await connection.execute(`INSERT INTO knowledge_articles (id, title, document_number, document_type, issuing_level, issuing_agency, issue_date, effective_date, summary, body, related_document_ids, custom_fields, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, input.title, input.documentNumber || null, input.documentType || null, input.issuingLevel || null, input.issuingAgency || null, input.issueDate || null, input.effectiveDate || null, input.summary || null, input.body || null, JSON.stringify(input.relatedDocumentIds), JSON.stringify(input.customFields), actorId]);
}
async function assertRelatedDocuments(connection, ids) { if (!ids.length) return; const unique = [...new Set(ids)], [rows] = await connection.execute(`SELECT id FROM documents WHERE id IN (${unique.map(() => '?').join(',')}) AND archived_at IS NULL`, unique); if (rows.length !== unique.length) throw new AppError(422, 'VALIDATION_ERROR', 'Một hoặc nhiều văn bản liên quan không hợp lệ.'); }
async function replaceKnowledgeFiles(connection, knowledgeId, current, next, actorId) {
  const desired = [...new Set(next || [])];
  const [valid] = desired.length ? await connection.execute(`SELECT id FROM stored_files WHERE id IN (${desired.map(() => '?').join(',')}) AND archived_at IS NULL`, desired) : [[]];
  if (valid.length !== desired.length) throw new AppError(422, 'VALIDATION_ERROR', 'Một hoặc nhiều tệp đính kèm không hợp lệ.');
  for (const id of current.filter(id => !desired.includes(id))) await connection.execute('UPDATE knowledge_file_links SET ended_at = CURRENT_TIMESTAMP(3) WHERE knowledge_id = ? AND file_id = ? AND ended_at IS NULL', [knowledgeId, id]);
  for (const id of desired.filter(id => !current.includes(id))) await connection.execute('INSERT INTO knowledge_file_links (id, knowledge_id, file_id, linked_by) VALUES (?, ?, ?, ?)', [randomUUID(), knowledgeId, id, actorId]);
}
async function loadKnowledgeFiles(executor, ids) {
  if (!ids.length) return new Map();
  const [rows] = await executor.execute(`SELECT l.knowledge_id, f.id, f.original_name, f.media_type, f.byte_size FROM knowledge_file_links l JOIN stored_files f ON f.id = l.file_id WHERE l.knowledge_id IN (${ids.map(() => '?').join(',')}) AND l.ended_at IS NULL AND f.archived_at IS NULL ORDER BY l.linked_at`, ids);
  const result = new Map();
  for (const row of rows) result.set(row.knowledge_id, [...(result.get(row.knowledge_id) || []), { id: row.id, name: row.original_name, mediaType: row.media_type, size: Number(row.byte_size) }]);
  return result;
}
async function event(connection, eventType, id, requestId) { const [rows] = await connection.execute(`SELECT id FROM app_users WHERE status = 'active' AND archived_at IS NULL`); await enqueueOutbox(connection, { eventType, aggregateType: 'knowledge', aggregateId: id, version: null, payload: { id }, requestId, recipients: rows.map(row => row.id) }); }
function mapKnowledge(row) { return { id: row.id, title: row.title, documentNumber: row.document_number, documentType: row.document_type, issuingLevel: row.issuing_level, issuingAgency: row.issuing_agency, issueDate: row.issue_date, effectiveDate: row.effective_date, summary: row.summary, body: row.body, relatedDocumentIds: row.related_document_ids || [], customFields: row.custom_fields || [], createdBy: row.created_by, createdAt: row.created_at, updatedAt: row.updated_at, version: Number(row.version) }; }
function archive(pool, archived) { return async (req, res, next) => { const connection = await pool.getConnection(); try { const id = uuid(req.params.id); await connection.beginTransaction(); const [result] = await connection.execute(archived ? 'UPDATE knowledge_articles SET archived_at = CURRENT_TIMESTAMP(3), version = version + 1 WHERE id = ? AND archived_at IS NULL' : 'UPDATE knowledge_articles SET archived_at = NULL, version = version + 1 WHERE id = ? AND archived_at IS NOT NULL', [id]); if (!result.affectedRows) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy bản ghi phù hợp.'); await recordRevision(connection, { entityType: 'knowledge', entityId: id, actorId: req.auth.userId, action: archived ? 'archived' : 'restored' }); await event(connection, archived ? 'knowledge.archived' : 'knowledge.restored', id, req.id); await connection.commit(); res.json({ data: { id, archived } }); } catch (error) { await connection.rollback(); next(error); } finally { connection.release(); } }; }
function nullable(max) { return z.string().trim().max(max).nullable().optional(); }
function page(value, min, max) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max) throw new AppError(400, 'BAD_REQUEST', 'Tham số phân trang không hợp lệ.');
  return parsed;
}
function parse(schema, value) { const result = schema.safeParse(value); if (!result.success) throw new AppError(422, 'VALIDATION_ERROR', 'Dữ liệu gửi lên chưa hợp lệ.', 'Backend', result.error.issues); return result.data; }
function uuid(value) { const result = z.string().uuid().safeParse(value); if (!result.success) throw new AppError(400, 'BAD_REQUEST', 'Mã kiến thức không hợp lệ.'); return result.data; }
function positiveVersion(value) { const result = z.coerce.number().int().positive().safeParse(value); if (!result.success) throw new AppError(400, 'BAD_REQUEST', 'Thiếu hoặc sai version.'); return result.data; }
