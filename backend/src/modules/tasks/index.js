const express = require('express');
const { readWorkspace } = require('../../db/workspace-store');
const router = express.Router();
const personGroup = (state, userId) => state.people?.find(person => person.id === state.users?.find(user => user.id === userId)?.personId)?.groupId || '';
const canView = (state, user, task) => user.role === 'admin' || task.creatorId === user.id || task.assigneeIds?.includes(user.id) || [task.managementGroupId, ...(task.assigneeIds || []).map(id => personGroup(state, id))].filter(Boolean).includes(personGroup(state, user.id));
router.get('/', async (req, res, next) => {
  try { const { state } = await readWorkspace(); res.json({ items: (state.tasks || []).filter(task => canView(state, req.user, task)) }); }
  catch (error) { next(error); }
});
module.exports = { router, canView };
