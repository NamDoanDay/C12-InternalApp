const express = require('express');
const authRoutes = require('./auth/routes');
const workspaceRoutes = require('./modules/workspace');
const taskRoutes = require('./modules/tasks').router;
const resourceRoutes = require('./modules/resources');
const documentRoutes = require('./modules/documents');
const statsRoutes = require('./modules/stats');
const historyRoutes = require('./modules/history');
const env = require('./config/env');

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '80mb' }));
app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'c12-api', demoLoginEnabled: env.demoLoginEnabled }));
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/workspace', workspaceRoutes);
app.use('/api/v1/tasks', require('./middleware/auth').requireAuth, taskRoutes);
app.use('/api/v1/resources', require('./middleware/auth').requireAuth, resourceRoutes);
app.use('/api/v1/documents', require('./middleware/auth').requireAuth, documentRoutes);
app.use('/api/v1/stats', require('./middleware/auth').requireAuth, statsRoutes);
app.use('/api/v1/history', require('./middleware/auth').requireAuth, historyRoutes);
app.use((error, _req, res, _next) => {
  const status = error.status || 500;
  if (status >= 500) console.error('API request failed:', error.message);
  res.status(status).json({ error: status >= 500 ? 'Máy chủ không thể xử lý yêu cầu.' : error.message });
});
module.exports = app;
