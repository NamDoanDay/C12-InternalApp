export class AppError extends Error {
  constructor(status, code, message, scope = 'Backend', details = undefined) {
    super(message);
    this.status = status;
    this.code = code;
    this.scope = scope;
    this.details = details;
  }
}

export function errorHandler(error, req, res, _next) {
  const known = error instanceof AppError;
  const parseError = error.type === 'entity.parse.failed';
  const sizeError = error.type === 'entity.too.large';
  const status = known ? error.status : parseError ? 400 : sizeError ? 413 : 500;
  const databaseError = !known && (String(error.code || '').startsWith('ER_') || ['ECONNREFUSED', 'ETIMEDOUT', 'PROTOCOL_CONNECTION_LOST'].includes(error.code));
  const requestId = req.id || 'unavailable';
  if (status >= 500) console.error(JSON.stringify({ level: 'error', requestId, name: error.name, code: error.code || 'UNEXPECTED_ERROR' }));
  res.status(status).json({ error: {
    code: known ? error.code : parseError ? 'BAD_REQUEST' : sizeError ? 'PAYLOAD_TOO_LARGE' : 'INTERNAL_ERROR',
    message: known ? error.message : parseError ? 'Nội dung JSON không hợp lệ.' : sizeError ? 'Nội dung gửi lên vượt giới hạn.' : 'Đã xảy ra lỗi phía máy chủ.',
    scope: known ? error.scope : databaseError ? 'Database' : 'Backend',
    ...(known && error.details ? { details: error.details } : {}),
    requestId
  } });
}
