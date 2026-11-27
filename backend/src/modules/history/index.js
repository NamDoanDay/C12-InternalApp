const express = require('express');
const { readWorkspace } = require('../../db/workspace-store');
const { canView } = require('../tasks');
const router = express.Router();
router.get('/', async (req, res, next) => {
  try {
    const state = (await readWorkspace()).state;
    const resource = state.resourceRecords?.find(item => item.id === req.query.resourceId);
    const task = state.tasks?.find(item => item.id === req.query.taskId && canView(state, req.user, item));
    res.json({ resource: resource?.revisions || [], task: task?.revisions || [] });
  } catch (error) { next(error); }
});
module.exports = router;
