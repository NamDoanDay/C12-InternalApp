const pool = require('./pool');
const tableMap = {
  groups: ['task_groups', 'taskGroups'], people: ['people', 'people'], tasks: ['tasks', 'tasks'],
  resources: ['resources', 'resourceRecords'], documents: ['documents', 'documents'], knowledge: ['knowledge_items', 'knowledge']
};

async function ensureSeed(seedState) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.query('SELECT id FROM workspace_state WHERE id = 1 FOR UPDATE');
    if (!rows.length) {
      await connection.execute('INSERT INTO workspace_state (id, revision, payload) VALUES (1, 1, ?)', [JSON.stringify(seedState)]);
      await replaceMirrors(connection, seedState);
    }
    await connection.commit();
  } catch (error) { await connection.rollback(); throw error; }
  finally { connection.release(); }
}

async function replaceMirrors(connection, state) {
  await connection.query('DELETE FROM resource_task_links');
  await connection.query('DELETE FROM resource_document_links');
  for (const [table, key] of Object.values(tableMap)) {
    const entries = Array.isArray(state[key]) ? state[key] : [];
    await connection.query(`DELETE FROM ${table}`);
    for (const item of entries) {
      await connection.execute(`INSERT INTO ${table} (id, payload) VALUES (?, ?)`, [String(item.id), JSON.stringify(item)]);
    }
  }
  const resources = state.resourceRecords || [], tasks = state.tasks || [], docs = state.documents || [];
  const taskIds = new Set(tasks.map(task => task.id)), resourceIds = new Set(resources.map(resource => resource.id)), documentIds = new Set(docs.map(doc => doc.id));
  const taskLinks = new Map();
  for (const task of tasks) if (task.resourceId && resourceIds.has(task.resourceId)) taskLinks.set(task.id, task.resourceId);
  for (const resource of resources) for (const taskId of resource.taskIds || []) if (taskIds.has(taskId)) taskLinks.set(taskId, resource.id);
  for (const [taskId, resourceId] of taskLinks) await connection.execute('INSERT INTO resource_task_links (resource_id, task_id) VALUES (?, ?)', [resourceId, taskId]);
  for (const resource of resources) {
    for (const documentId of resource.registeredDocumentIds || []) if (documentIds.has(documentId)) await connection.execute('INSERT IGNORE INTO resource_document_links (resource_id, document_id, relation_type) VALUES (?, ?, \'registered\')', [resource.id, documentId]);
    for (const documentId of resource.assetDocumentIds || resource.exchangeDocumentIds || []) if (documentIds.has(documentId)) await connection.execute('INSERT IGNORE INTO resource_document_links (resource_id, document_id, relation_type) VALUES (?, ?, \'asset\')', [resource.id, documentId]);
  }
}

async function syncAccounts(connection, users = []) {
  const present = new Set(users.map(user => user.id));
  for (const user of users) {
    await connection.execute('UPDATE accounts SET role = ?, status = ? WHERE user_id = ?', [user.role === 'admin' ? 'admin' : 'user', user.status === 'approved' ? 'approved' : ['disabled', 'rejected'].includes(user.status) ? 'disabled' : 'pending', user.id]);
  }
  const [rows] = await connection.query('SELECT user_id FROM accounts');
  for (const account of rows) if (!present.has(account.user_id)) await connection.execute('UPDATE accounts SET status = \'disabled\' WHERE user_id = ?', [account.user_id]);
}

async function readWorkspace() {
  const [rows] = await pool.query('SELECT revision, payload FROM workspace_state WHERE id = 1');
  if (!rows.length) throw new Error('Workspace seed is not initialized.');
  const payload = typeof rows[0].payload === 'string' ? JSON.parse(rows[0].payload) : rows[0].payload;
  return { revision: rows[0].revision, state: payload };
}

async function writeWorkspace(state, actor, expectedRevision) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.query('SELECT revision, payload FROM workspace_state WHERE id = 1 FOR UPDATE');
    if (!rows.length) throw new Error('Workspace seed is not initialized.');
    if (Number(rows[0].revision) !== Number(expectedRevision)) {
      const error = new Error('Dữ liệu vừa được người khác cập nhật. Hãy tải lại trang rồi thử lại.');
      error.status = 409;
      throw error;
    }
    const revision = Number(rows[0].revision) + 1;
    await connection.execute('UPDATE workspace_state SET revision = ?, payload = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1', [revision, JSON.stringify(state), actor.id]);
    await replaceMirrors(connection, state);
    await syncAccounts(connection, state.users);
    await connection.execute('INSERT INTO audit_events (actor_id, event_type, payload) VALUES (?, ?, ?)', [actor.id, 'workspace.updated', JSON.stringify({ revision })]);
    await connection.commit();
    return revision;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally { connection.release(); }
}

async function resetWorkspace(seedState) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.query('SELECT revision FROM workspace_state WHERE id = 1 FOR UPDATE');
    const revision = Number(rows[0]?.revision || 0) + 1;
    await connection.query('UPDATE accounts SET status = \'disabled\'');
    await connection.execute('UPDATE workspace_state SET revision = ?, payload = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1', [revision, JSON.stringify(seedState)]);
    await replaceMirrors(connection, seedState);
    for (const user of seedState.users || []) await connection.execute('UPDATE accounts SET status = ?, role = ? WHERE user_id = ?', [user.status === 'approved' ? 'approved' : 'pending', user.role === 'admin' ? 'admin' : 'user', user.id]);
    await connection.commit();
    return revision;
  } catch (error) { await connection.rollback(); throw error; }
  finally { connection.release(); }
}

module.exports = { pool, ensureSeed, readWorkspace, writeWorkspace, resetWorkspace };
