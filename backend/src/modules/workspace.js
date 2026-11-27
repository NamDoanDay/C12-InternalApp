const express = require('express');
const store = require('../db/workspace-store');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { validateWorkspaceUpdate } = require('./permissions');
const { makeWorkspace } = require('../../../database/seeds/seed-workspace');
const { canView } = require('./tasks');

const router = express.Router();
router.use(requireAuth);
router.get('/', async (req, res, next) => {
  try {
    const payload = await store.readWorkspace();
    if (req.user.role !== 'admin') {
      payload.state.tasks = (payload.state.tasks || []).filter(task => canView(payload.state, req.user, task));
      payload.state.notifications = (payload.state.notifications || []).filter(item => item.recipientId === req.user.id);
    }
    res.json(payload);
  } catch (error) { next(error); }
});
router.put('/', async (req, res, next) => {
  try {
    const current = await store.readWorkspace();
    const nextState = req.body.state;
    if (req.user.role !== 'admin') {
      const visibleIds = new Set((current.state.tasks || []).filter(task => canView(current.state, req.user, task)).map(task => task.id));
      const submittedIds = new Set((nextState.tasks || []).map(task => task.id));
      nextState.tasks ||= [];
      for (const task of current.state.tasks || []) if (!visibleIds.has(task.id) && !submittedIds.has(task.id)) nextState.tasks.push(task);
      const ownSubmitted = (nextState.notifications || []).filter(item => item.recipientId === req.user.id);
      const privateNotifications = (current.state.notifications || []).filter(item => item.recipientId !== req.user.id);
      nextState.notifications = [...privateNotifications, ...ownSubmitted];
    }
    validateWorkspaceUpdate(current.state, nextState, req.user);
    const revision = await store.writeWorkspace(nextState, req.user, req.body.revision);
    req.app.get('io').emit('workspace.updated', { revision, actorId: req.user.id, changedAt: new Date().toISOString() });
    res.json({ revision });
  } catch (error) { next(error); }
});
router.post('/reset', requireAdmin, async (req, res, next) => {
  try {
    const state = makeWorkspace();
    const revision = await store.resetWorkspace(state);
    req.app.get('io').emit('workspace.updated', { revision, actorId: req.user.id, reset: true, changedAt: new Date().toISOString() });
    res.json({ revision });
  } catch (error) { next(error); }
});
module.exports = router;
