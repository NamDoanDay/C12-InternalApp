import express from 'express';
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import { Router } from 'express';
import { z } from 'zod';
import { AppError } from '../../http/errors.js';
import { enqueueOutbox, recordRevision } from '../../db/write-helpers.js';
import { requireAdmin } from '../../middleware/auth.js';
import { taskScopeSql } from '../tasks/domain.js';

const MAX_BYTES = 2 * 1024 * 1024;
const SAFE_MEDIA = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'text/plain', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']);

export function createFilesRouter({ pool, config }) {
  const router = Router();
  router.post('/', express.raw({ type: 'application/octet-stream', limit: MAX_BYTES }), async (req, res, next) => {
    let diskPath;
    const connection = await pool.getConnection();
    try {
      if (!Buffer.isBuffer(req.body) || req.body.length === 0) throw new AppError(422, 'EMPTY_FILE', 'Tệp tải lên đang trống.');
      const originalName = safeFileName(req.get('x-file-name'));
      const mediaType = String(req.get('x-file-media-type') || req.get('content-type') || 'application/octet-stream').split(';')[0].toLowerCase();
      if (req.body.length > MAX_BYTES) throw new AppError(413, 'FILE_TOO_LARGE', 'Mỗi tệp tối đa 2 MiB.');
      if (!SAFE_MEDIA.has(mediaType)) throw new AppError(415, 'UNSUPPORTED_FILE_TYPE', 'Định dạng tệp này chưa được hỗ trợ.');
      const id = randomUUID(), storageKey = `${id}.bin`, root = resolve(config.FILE_STORAGE_DIR);
      await mkdir(root, { recursive: true }); diskPath = join(root, storageKey);
      await writeFile(diskPath, req.body, { flag: 'wx', mode: 0o600 });
      await connection.beginTransaction();
      await connection.execute(`INSERT INTO stored_files (id, storage_key, original_name, media_type, byte_size, sha256, uploaded_by) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, storageKey, originalName, mediaType, req.body.length, createHash('sha256').update(req.body).digest('hex'), req.auth.userId]);
      await recordRevision(connection, { entityType: 'file', entityId: id, actorId: req.auth.userId, action: 'uploaded', changes: ['originalName', 'mediaType', 'byteSize'], snapshot: { originalName, mediaType, byteSize: req.body.length } });
      await enqueueOutbox(connection, { eventType: 'file.uploaded', aggregateType: 'file', aggregateId: id, payload: { id }, requestId: req.id, recipients: [req.auth.userId] });
      await connection.commit();
      res.status(201).json({ data: { id, name: originalName, mediaType, size: req.body.length, sha256: createHash('sha256').update(req.body).digest('hex') } });
    } catch (error) {
      await connection.rollback(); if (diskPath) await rm(diskPath, { force: true }).catch(() => {});
      next(error.type === 'entity.too.large' ? new AppError(413, 'FILE_TOO_LARGE', 'Mỗi tệp tối đa 2 MiB.') : error);
    } finally { connection.release(); }
  });

  router.get('/:id/content', async (req, res, next) => {
    try {
      const id = uuid(req.params.id), file = await authorizedFile(pool, req.auth, id);
      const path = join(resolve(config.FILE_STORAGE_DIR), basename(file.storage_key));
      const content = await readFile(path);
      res.setHeader('content-type', file.media_type); res.setHeader('content-length', String(content.length));
      res.setHeader('content-disposition', `attachment; filename*=UTF-8''${encodeURIComponent(file.original_name)}`);
      res.setHeader('x-content-type-options', 'nosniff'); res.send(content);
    } catch (error) { next(error.code === 'ENOENT' ? new AppError(404, 'FILE_MISSING', 'Không tìm thấy nội dung tệp trên bộ lưu trữ.') : error); }
  });
  router.post('/:id/archive', archiveFile(pool, false));
  router.post('/:id/restore', requireAdmin, archiveFile(pool, true));
  return router;
}

async function authorizedFile(pool, auth, id) {
  const [rows] = await pool.execute('SELECT * FROM stored_files WHERE id = ? AND archived_at IS NULL', [id]);
  const file = rows[0]; if (!file) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy tệp đang hoạt động.');
  if (auth.role === 'admin' || file.uploaded_by === auth.userId) return file;
  const scope = taskScopeSql(auth.role, auth.userId, auth.personId);
  const [links] = await pool.execute(`SELECT 1 FROM resource_file_links rf WHERE rf.file_id = ? AND rf.ended_at IS NULL
    UNION ALL SELECT 1 FROM document_file_links df WHERE df.file_id = ? AND df.ended_at IS NULL
    UNION ALL SELECT 1 FROM knowledge_file_links kf WHERE kf.file_id = ? AND kf.ended_at IS NULL
    UNION ALL SELECT 1 FROM task_file_links tf JOIN tasks t ON t.id = tf.task_id WHERE tf.file_id = ? AND tf.ended_at IS NULL AND t.archived_at IS NULL AND (${scope.sql}) LIMIT 1`,
    [id, id, id, id, ...scope.values]);
  if (!links.length) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy tệp hoặc bạn không có quyền xem.');
  return file;
}
function archiveFile(pool, restore) { return async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    const id = uuid(req.params.id); await connection.beginTransaction();
    const [rows] = await connection.execute('SELECT uploaded_by, archived_at FROM stored_files WHERE id = ? FOR UPDATE', [id]);
    if (!rows[0] || (restore ? !rows[0].archived_at : Boolean(rows[0].archived_at))) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy tệp phù hợp.');
    if (restore && req.auth.role !== 'admin') throw new AppError(403, 'FORBIDDEN', 'Chỉ admin được khôi phục tệp.');
    if (!restore && req.auth.role !== 'admin' && rows[0].uploaded_by !== req.auth.userId) throw new AppError(403, 'FORBIDDEN', 'Chỉ người tải lên hoặc admin được lưu trữ tệp.');
    await connection.execute(restore ? 'UPDATE stored_files SET archived_at = NULL WHERE id = ?' : 'UPDATE stored_files SET archived_at = CURRENT_TIMESTAMP(3) WHERE id = ?', [id]);
    await recordRevision(connection, { entityType: 'file', entityId: id, actorId: req.auth.userId, action: restore ? 'restored' : 'archived' });
    await enqueueOutbox(connection, { eventType: restore ? 'file.restored' : 'file.archived', aggregateType: 'file', aggregateId: id, payload: { id }, requestId: req.id, recipients: [rows[0].uploaded_by] });
    await connection.commit(); res.json({ data: { id, archived: !restore } });
  } catch (error) { await connection.rollback(); next(error); } finally { connection.release(); }
}; }
function safeFileName(value) {
  let decoded = '';
  try { decoded = decodeURIComponent(String(value || 'tai-lieu').slice(0, 500)); } catch { decoded = 'tai-lieu'; }
  const name = basename(decoded).replace(/[\u0000-\u001f\u007f<>:"/\\|?*]/g, '_').trim().slice(0, 255);
  return name || 'tai-lieu';
}
function uuid(value) { const result = z.string().uuid().safeParse(value); if (!result.success) throw new AppError(400, 'BAD_REQUEST', 'Mã tệp không hợp lệ.'); return result.data; }
