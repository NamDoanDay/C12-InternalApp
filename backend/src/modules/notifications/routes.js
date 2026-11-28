import { Router } from 'express';
import { z } from 'zod';
import { AppError } from '../../http/errors.js';
import { enqueueOutbox } from '../../db/write-helpers.js';

const readInput = z.object({ notificationIds: z.array(z.string().uuid()).max(100).optional(), all: z.boolean().default(false) }).strict()
  .refine(value => value.all || (value.notificationIds?.length ?? 0) > 0, { message: 'Chọn thông báo cần đánh dấu đã đọc.' });

export function createNotificationsRouter({ pool }) {
  const router = Router();
  router.get('/', async (req, res, next) => {
    try {
      const limit = pageNumber(req.query.limit ?? 50, 1, 200), offset = pageNumber(req.query.offset ?? 0, 0, Number.MAX_SAFE_INTEGER);
      const unreadOnly = req.query.unread === 'true';
      const where = `user_id = ?${unreadOnly ? ' AND read_at IS NULL' : ''}`;
      const [countResult, listResult] = await Promise.all([
        pool.execute(`SELECT COUNT(*) AS total FROM notifications WHERE ${where}`, [req.auth.userId]),
        pool.execute(`SELECT id, notification_type, entity_type, entity_id, message, read_at, created_at FROM notifications WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`, [req.auth.userId, limit, offset])
      ]);
      const [unreadRows] = await pool.execute('SELECT COUNT(*) AS total FROM notifications WHERE user_id = ? AND read_at IS NULL', [req.auth.userId]);
      res.json({ data: listResult[0].map(mapNotification), page: { limit, offset, total: Number(countResult[0][0].total) }, unreadCount: Number(unreadRows[0].total) });
    } catch (error) { next(error); }
  });

  router.post('/read', async (req, res, next) => {
    const connection = await pool.getConnection();
    try {
      const parsed = readInput.safeParse(req.body);
      if (!parsed.success) throw new AppError(422, 'VALIDATION_ERROR', 'Chọn thông báo cần đánh dấu đã đọc.', 'Backend', parsed.error.issues);
      const { notificationIds = [], all } = parsed.data;
      await connection.beginTransaction();
      let result;
      if (all) {
        [result] = await connection.execute('UPDATE notifications SET read_at = CURRENT_TIMESTAMP(3) WHERE user_id = ? AND read_at IS NULL', [req.auth.userId]);
      } else {
        const ids = [...new Set(notificationIds)];
        [result] = await connection.execute(`UPDATE notifications SET read_at = CURRENT_TIMESTAMP(3) WHERE user_id = ? AND read_at IS NULL AND id IN (${ids.map(() => '?').join(',')})`, [req.auth.userId, ...ids]);
      }
      if (result.affectedRows) {
        await enqueueOutbox(connection, { eventType: 'notification.read', aggregateType: 'notification', aggregateId: req.auth.userId, payload: { userId: req.auth.userId, count: result.affectedRows }, requestId: req.id, recipients: [req.auth.userId] });
      }
      await connection.commit();
      res.json({ data: { updated: result.affectedRows } });
    } catch (error) { await connection.rollback().catch(() => {}); next(error); }
    finally { connection.release(); }
  });
  return router;
}

function mapNotification(row) {
  return { id: row.id, type: row.notification_type, entityType: row.entity_type, entityId: row.entity_id, message: row.message, readAt: row.read_at, createdAt: row.created_at };
}
function pageNumber(value, min, max) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max) throw new AppError(400, 'BAD_REQUEST', 'Tham số phân trang không hợp lệ.');
  return parsed;
}
