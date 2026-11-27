const express = require('express');
const { readWorkspace } = require('../../db/workspace-store');
const { canView } = require('../tasks');
const router = express.Router();
router.get('/', async (req, res, next) => {
  try {
    const state = (await readWorkspace()).state, tasks = (state.tasks || []).filter(task => !task.archived && canView(state, req.user, task));
    const counts = { processing: 0, done: 0, late: 0 };
    for (const task of tasks) {
      if (task.status === 'done') counts.done++;
      else if (Date.parse(task.due) < Date.now()) counts.late++;
      else counts.processing++;
    }
    res.json({ total: tasks.length, counts });
  } catch (error) { next(error); }
});
module.exports = router;
