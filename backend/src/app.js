import express from 'express';
import helmet from 'helmet';
import { randomUUID } from 'node:crypto';
import { AppError, errorHandler } from './http/errors.js';
import { authRequired, requirePasswordChanged } from './middleware/auth.js';
import { createAuthRouter } from './modules/auth/routes.js';
import { createRegistrationRouter, createUsersRouter } from './modules/users/routes.js';
import { requireAdmin } from './middleware/auth.js';
import { createDocumentsRouter } from './modules/documents/routes.js';
import { createTasksRouter } from './modules/tasks/routes.js';
import { createResourcesRouter } from './modules/resources/routes.js';
import { createOrganizationRouter } from './modules/organization/routes.js';
import { createKnowledgeRouter } from './modules/knowledge/routes.js';
import { createFilesRouter } from './modules/files/routes.js';
import { createNotificationsRouter } from './modules/notifications/routes.js';
import swaggerUi from 'swagger-ui-express';
import { openapi } from './openapi.js';

export function createApp({ pool, config }) {
  const app = express();
  app.disable('x-powered-by');
  if (config.TRUST_PROXY === 'true') app.set('trust proxy', 1);
  app.use(helmet());
  app.use((req, res, next) => {
    req.id = req.get('x-request-id')?.slice(0, 100) || `req_${randomUUID()}`;
    res.setHeader('x-request-id', req.id);
    next();
  });
  app.use(express.json({ limit: '1mb', strict: true }));

  app.get('/health/live', (_req, res) => res.json({ status: 'ok' }));
  app.get('/health/ready', async (_req, res, next) => {
    try {
      await pool.query('SELECT 1');
      res.json({ status: 'ready' });
    } catch (error) {
      next(new AppError(503, 'DATABASE_UNAVAILABLE', 'Cơ sở dữ liệu hiện chưa sẵn sàng.', 'Database'));
    }
  });

  const docsAccess = config.NODE_ENV === 'production' ? [authRequired({ pool, config }), requirePasswordChanged, requireAdmin] : [];
  app.get('/api/openapi.json', ...docsAccess, (_req, res) => res.json(openapi));
  app.use('/api/docs', ...docsAccess, (_req, res, next) => {
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:");
    next();
  }, swaggerUi.serve, swaggerUi.setup(openapi, { explorer: true }));

  app.use('/api/v1/auth', createAuthRouter({ pool, config }));
  app.use('/api/v1/registrations', createRegistrationRouter({ pool }));
  app.use('/api/v1', authRequired({ pool, config }), requirePasswordChanged);
  app.use('/api/v1/admin', requireAdmin, createUsersRouter({ pool }));
  app.use('/api/v1/documents', createDocumentsRouter({ pool }));
  app.use('/api/v1/tasks', createTasksRouter({ pool }));
  app.use('/api/v1/resources', createResourcesRouter({ pool }));
  app.use('/api/v1/organization', createOrganizationRouter({ pool }));
  app.use('/api/v1/knowledge', createKnowledgeRouter({ pool }));
  app.use('/api/v1/files', createFilesRouter({ pool, config }));
  app.use('/api/v1/notifications', createNotificationsRouter({ pool }));

  app.use((_req, _res, next) => next(new AppError(404, 'NOT_FOUND', 'Không tìm thấy API này.')));
  app.use(errorHandler);
  return app;
}
