const express = require('express');
const { readWorkspace } = require('../../db/workspace-store');
const router = express.Router();
router.get('/', async (_req, res, next) => { try { res.json({ items: (await readWorkspace()).state.documents || [] }); } catch (error) { next(error); } });
module.exports = router;
