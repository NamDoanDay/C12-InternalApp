import test from 'node:test';
import assert from 'node:assert/strict';
import mysql from 'mysql2/promise';
import argon2 from 'argon2';
import { runMigrations } from './migrate.js';
import { createApp } from '../app.js';
import { readConfig } from '../config/env.js';
import { attachRealtime } from '../realtime/socket.js';
import { io as createSocketClient } from 'socket.io-client';

const enabled = Boolean(
  process.env.MYSQL_TEST_HOST && process.env.MYSQL_TEST_DATABASE && process.env.MYSQL_TEST_USER &&
  process.env.MYSQL_TEST_PASSWORD && process.env.ADMIN_PASSWORD_FILE
);

test('fresh MySQL migration creates only one admin and reruns without reseeding', { skip: !enabled, timeout: 60_000 }, async () => {
  const pool = mysql.createPool({
    host: process.env.MYSQL_TEST_HOST,
    port: Number(process.env.MYSQL_TEST_PORT || 3306),
    database: process.env.MYSQL_TEST_DATABASE,
    user: process.env.MYSQL_TEST_USER,
    password: process.env.MYSQL_TEST_PASSWORD,
    connectionLimit: 2
  });

  try {
    await runMigrations(pool);
    const [users] = await pool.execute('SELECT username, role, status, must_change_password, password_hash FROM app_users');
    assert.equal(users.length, 1);
    assert.equal(users[0].username, 'admin');
    assert.equal(users[0].role, 'admin');
    assert.equal(users[0].status, 'active');
    assert.equal(Number(users[0].must_change_password), 1);
    assert.match(users[0].password_hash, /^\$argon2id\$/);
    const initialPassword = (await import('node:fs/promises')).readFile(process.env.ADMIN_PASSWORD_FILE, 'utf8').then(value => value.trim());
    assert.equal(await argon2.verify(users[0].password_hash, await initialPassword), true);

    const businessTables = [
      'org_groups', 'people', 'person_group_memberships', 'documents', 'resources',
      'resource_document_links', 'resource_appendix_schemas', 'resource_appendices',
      'tasks', 'task_assignees', 'task_resource_links', 'task_comments',
      'knowledge_articles', 'entity_revisions', 'stored_files', 'task_file_links',
      'resource_file_links', 'document_file_links', 'knowledge_file_links',
      'notifications', 'refresh_tokens', 'outbox_events', 'outbox_recipients'
    ];
    for (const table of businessTables) {
      const [rows] = await pool.query(`SELECT COUNT(*) AS count FROM \`${table}\``);
      assert.equal(Number(rows[0].count), 0, `${table} should be empty after fresh install`);
    }

    const config = readConfig({
      MYSQL_PASSWORD: process.env.MYSQL_TEST_PASSWORD,
      JWT_SECRET: 'integration-test-secret-with-more-than-32-characters',
      NODE_ENV: 'test'
    });
    const app = createApp({ pool, config });
    const server = app.listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    const realtime = attachRealtime(server, { pool, config, intervalMs: 100 });
    let adminSocket;
    try {
      const origin = `http://127.0.0.1:${server.address().port}`;
      const login = await fetch(`${origin}/api/v1/auth/login`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ identifier: 'admin', password: await initialPassword })
      });
      assert.equal(login.status, 200);
      const loginBody = await login.json();
      assert.equal(loginBody.data.user.mustChangePassword, true);
      const loginCookies = login.headers.getSetCookie().map(value => value.split(';')[0]).join('; ');

      const blocked = await fetch(`${origin}/api/v1/tasks`, { headers: { authorization: `Bearer ${loginBody.data.accessToken}` } });
      assert.equal(blocked.status, 403);
      assert.equal((await blocked.json()).error.code, 'PASSWORD_CHANGE_REQUIRED');

      const rotated = await fetch(`${origin}/api/v1/auth/refresh`, {
        method: 'POST', headers: { cookie: loginCookies, 'x-csrf-token': loginBody.data.csrfToken }
      });
      assert.equal(rotated.status, 200);
      const rotatedBody = await rotated.json();
      const rotatedCookies = rotated.headers.getSetCookie().map(value => value.split(';')[0]).join('; ');

      const loggedOut = await fetch(`${origin}/api/v1/auth/logout`, {
        method: 'POST', headers: { cookie: rotatedCookies, 'x-csrf-token': rotatedBody.data.csrfToken }
      });
      assert.equal(loggedOut.status, 200);
      const replay = await fetch(`${origin}/api/v1/auth/refresh`, {
        method: 'POST', headers: { cookie: rotatedCookies, 'x-csrf-token': rotatedBody.data.csrfToken }
      });
      assert.equal(replay.status, 401);

      const freshLogin = await fetch(`${origin}/api/v1/auth/login`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ identifier: 'admin', password: await initialPassword })
      });
      const freshBody = await freshLogin.json();
      const socketOrigin = `http://127.0.0.1:${server.address().port}`;
      const mustChangeSocket = createSocketClient(socketOrigin, { path: '/socket.io', transports: ['websocket'], auth: { token: freshBody.data.accessToken } });
      const mustChangeDenied = await new Promise(resolve => {
        const timer = setTimeout(() => resolve(false), 2000);
        mustChangeSocket.once('connect_error', () => { clearTimeout(timer); resolve(true); });
        mustChangeSocket.once('connect', () => { clearTimeout(timer); resolve(false); });
      });
      mustChangeSocket.disconnect();
      assert.equal(mustChangeDenied, true);
      const deniedSocket = createSocketClient(socketOrigin, { path: '/socket.io', transports: ['websocket'], auth: {} });
      const deniedConnection = await new Promise(resolve => {
        const timer = setTimeout(() => resolve(false), 2000);
        deniedSocket.once('connect_error', () => { clearTimeout(timer); resolve(true); });
        deniedSocket.once('connect', () => { clearTimeout(timer); resolve(false); });
      });
      deniedSocket.disconnect();
      assert.equal(deniedConnection, true);
      const changed = await fetch(`${origin}/api/v1/auth/password`, {
        method: 'PUT',
        headers: { authorization: `Bearer ${freshBody.data.accessToken}`, 'content-type': 'application/json' },
        body: JSON.stringify({ currentPassword: await initialPassword, newPassword: 'NewDisposablePassword_2026!' })
      });
      assert.equal(changed.status, 200);
      assert.equal((await changed.json()).data.reauthenticationRequired, true);
      const socketLogin = await fetch(`${origin}/api/v1/auth/login`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ identifier: 'admin', password: 'NewDisposablePassword_2026!' })
      });
      assert.equal(socketLogin.status, 200);
      const socketLoginBody = await socketLogin.json();
      adminSocket = createSocketClient(socketOrigin, { path: '/socket.io', transports: ['websocket'], auth: { token: socketLoginBody.data.accessToken } });
      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Authenticated Socket.IO connection timed out')), 3000);
        adminSocket.once('connect', () => { clearTimeout(timer); resolve(); });
        adminSocket.once('connect_error', error => { clearTimeout(timer); reject(error); });
      });

      const registration = await fetch(`${origin}/api/v1/registrations`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username: 'user.pending', displayName: 'Người dùng mới', email: 'user.pending@example.test', password: 'PendingUserPassword_2026!' })
      });
      assert.equal(registration.status, 201);
      const registrationBody = await registration.json();
      const pendingLogin = await fetch(`${origin}/api/v1/auth/login`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ identifier: 'user.pending', password: 'PendingUserPassword_2026!' })
      });
      assert.equal(pendingLogin.status, 401);

      const approved = await fetch(`${origin}/api/v1/admin/registrations/${registrationBody.data.id}/approve`, {
        method: 'POST', headers: { authorization: `Bearer ${freshBody.data.accessToken}`, 'content-type': 'application/json' },
        body: JSON.stringify({ person: { name: 'Người dùng mới' } })
      });
      assert.equal(approved.status, 200);
      const approvedBody = await approved.json();
      assert.ok(approvedBody.data.personId);
      const approvedLogin = await fetch(`${origin}/api/v1/auth/login`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ identifier: 'user.pending', password: 'PendingUserPassword_2026!' })
      });
      assert.equal(approvedLogin.status, 200);
      const approvedLoginBody = await approvedLogin.json();
      const createdUser = await fetch(`${origin}/api/v1/admin/users`, {
        method: 'POST', headers: { authorization: `Bearer ${freshBody.data.accessToken}`, 'content-type': 'application/json' },
        body: JSON.stringify({ username: 'user.created', displayName: 'Tài khoản được tạo' })
      });
      assert.equal(createdUser.status, 201);
      const createdUserBody = await createdUser.json();
      assert.ok(createdUserBody.data.temporaryPassword);
      assert.equal(createdUserBody.data.mustChangePassword, true);

      const document = await fetch(`${origin}/api/v1/documents`, {
        method: 'POST', headers: { authorization: `Bearer ${freshBody.data.accessToken}`, 'content-type': 'application/json' },
        body: JSON.stringify({ documentType: 'Công văn', documentNumber: 'CV-TEST-01', issueDate: '2026-11-28', summary: 'Văn bản kiểm thử' })
      });
      assert.equal(document.status, 201);
      const documentBody = await document.json();
      const duplicateDocument = await fetch(`${origin}/api/v1/documents`, {
        method: 'POST', headers: { authorization: `Bearer ${freshBody.data.accessToken}`, 'content-type': 'application/json' },
        body: JSON.stringify({ documentType: 'Công văn', documentNumber: 'cv-test-01', issueDate: '2026-11-28', summary: 'Bản trùng' })
      });
      assert.equal(duplicateDocument.status, 409);
      const documentList = await fetch(`${origin}/api/v1/documents?q=CV-TEST-01`, { headers: { authorization: `Bearer ${freshBody.data.accessToken}` } });
      assert.equal((await documentList.json()).data.length, 1);
      const updatedDocument = await fetch(`${origin}/api/v1/documents/${documentBody.data.id}`, {
        method: 'PATCH', headers: { authorization: `Bearer ${freshBody.data.accessToken}`, 'content-type': 'application/json' },
        body: JSON.stringify({ version: 1, summary: 'Đã cập nhật' })
      });
      assert.equal(updatedDocument.status, 200);
      const staleDocument = await fetch(`${origin}/api/v1/documents/${documentBody.data.id}`, {
        method: 'PATCH', headers: { authorization: `Bearer ${freshBody.data.accessToken}`, 'content-type': 'application/json' },
        body: JSON.stringify({ version: 1, summary: 'Ghi đè cũ' })
      });
      assert.equal(staleDocument.status, 409);
      const archivedDocument = await fetch(`${origin}/api/v1/documents/${documentBody.data.id}/archive`, {
        method: 'POST', headers: { authorization: `Bearer ${freshBody.data.accessToken}` }
      });
      assert.equal(archivedDocument.status, 200);
      const restoredDocument = await fetch(`${origin}/api/v1/documents/${documentBody.data.id}/restore`, {
        method: 'POST', headers: { authorization: `Bearer ${freshBody.data.accessToken}` }
      });
      assert.equal(restoredDocument.status, 200);

      const [adminRows] = await pool.execute('SELECT id FROM app_users WHERE username = ?', ['admin']);
      const groupResponse = await fetch(`${origin}/api/v1/organization/groups`, {
        method: 'POST', headers: { authorization: `Bearer ${freshBody.data.accessToken}`, 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'Nhóm kiểm thử', code: 'TEST' })
      });
      assert.equal(groupResponse.status, 201);
      const groupId = (await groupResponse.json()).data.id;
      const assignedPersonGroup = await fetch(`${origin}/api/v1/organization/people/${approvedBody.data.personId}/group`, {
        method: 'POST', headers: { authorization: `Bearer ${freshBody.data.accessToken}`, 'content-type': 'application/json' },
        body: JSON.stringify({ groupId })
      });
      assert.equal(assignedPersonGroup.status, 200);
      const peopleList = await fetch(`${origin}/api/v1/organization/people?q=Người+dùng+mới`, { headers: { authorization: `Bearer ${freshBody.data.accessToken}` } });
      assert.equal((await peopleList.json()).data[0].groupId, groupId);

      const knowledgeResponse = await fetch(`${origin}/api/v1/knowledge`, {
        method: 'POST', headers: { authorization: `Bearer ${freshBody.data.accessToken}`, 'content-type': 'application/json' },
        body: JSON.stringify({ title: 'Kiến thức kiểm thử', documentType: 'Công văn', relatedDocumentIds: [documentBody.data.id] })
      });
      assert.equal(knowledgeResponse.status, 201);
      const knowledgeBody = await knowledgeResponse.json();
      const knowledgeList = await fetch(`${origin}/api/v1/knowledge?q=Kiến+thức+kiểm+thử&documentType=Công+văn`, { headers: { authorization: `Bearer ${freshBody.data.accessToken}` } });
      assert.equal((await knowledgeList.json()).page.total, 1);

      const uploadedFileResponse = await fetch(`${origin}/api/v1/files`, {
        method: 'POST', headers: { authorization: `Bearer ${freshBody.data.accessToken}`, 'content-type': 'application/octet-stream', 'x-file-media-type': 'text/plain', 'x-file-name': 'ghi-chu.txt' },
        body: Buffer.from('Nội dung tệp dùng chung', 'utf8')
      });
      assert.equal(uploadedFileResponse.status, 201, await uploadedFileResponse.clone().text());
      const uploadedFileId = (await uploadedFileResponse.json()).data.id;

      const realtimeResourceEvent = new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('resource.created Socket.IO event timed out')), 4000);
        adminSocket.once('resource.created', async event => {
          clearTimeout(timer);
          const [committed] = await pool.execute('SELECT id FROM resources WHERE id = ?', [event.entity.id]);
          resolve({ event, committed: committed.length === 1 });
        });
      });

      const createTask = async payload => fetch(`${origin}/api/v1/tasks`, {
        method: 'POST', headers: { authorization: `Bearer ${freshBody.data.accessToken}`, 'content-type': 'application/json' }, body: JSON.stringify(payload)
      });
      const baseTask = { managementGroupId: groupId, assigneeIds: [adminRows[0].id], startAt: '2019-01-01T00:00:00Z' };
      const doneTaskResponse = await createTask({ ...baseTask, type: 'document', title: 'Đã hoàn thành', workflowStatus: 'done', dueAt: '2020-01-01T00:00:00Z', documentId: documentBody.data.id });
      assert.equal(doneTaskResponse.status, 201);
      const doneTask = await doneTaskResponse.json();
      const processingTaskResponse = await createTask({ ...baseTask, type: 'daily', title: 'Đang xử lý', workflowStatus: 'processing', dueAt: '2099-01-01T00:00:00Z' });
      assert.equal(processingTaskResponse.status, 201);
      const lateTaskResponse = await createTask({ ...baseTask, type: 'daily', title: 'Chậm muộn', workflowStatus: 'init', dueAt: '2020-01-01T00:00:00Z' });
      assert.equal(lateTaskResponse.status, 201);
      const assignedTaskResponse = await createTask({ ...baseTask, assigneeIds: [registrationBody.data.id], fileIds: [uploadedFileId], type: 'daily', title: 'Task giao cho user', workflowStatus: 'processing', dueAt: '2099-01-01T00:00:00Z' });
      assert.equal(assignedTaskResponse.status, 201);
      const assignedTask = await assignedTaskResponse.json();
      const userNotifications = await fetch(`${origin}/api/v1/notifications?unread=true`, { headers: { authorization: `Bearer ${approvedLoginBody.data.accessToken}` } });
      assert.equal(userNotifications.status, 200);
      const userNotificationsBody = await userNotifications.json();
      assert.ok(userNotificationsBody.data.some(item => item.type === 'task.assigned' && item.message.includes('Task giao cho user')));
      assert.equal(userNotificationsBody.unreadCount, 1);
      const adminNotifications = await fetch(`${origin}/api/v1/notifications?unread=true`, { headers: { authorization: `Bearer ${freshBody.data.accessToken}` } });
      assert.equal((await adminNotifications.json()).unreadCount, 0);
      const readNotifications = await fetch(`${origin}/api/v1/notifications/read`, {
        method: 'POST', headers: { authorization: `Bearer ${approvedLoginBody.data.accessToken}`, 'content-type': 'application/json' },
        body: JSON.stringify({ notificationIds: userNotificationsBody.data.map(item => item.id) })
      });
      assert.equal(readNotifications.status, 200);
      assert.equal((await readNotifications.json()).data.updated, 1);
      const resourceTaskResponse = await createTask({
        ...baseTask, type: 'resource', title: 'Task tài nguyên', workflowStatus: 'processing', dueAt: '2099-01-01T00:00:00Z',
        resource: { unitName: 'Đơn vị thử', managingAgency: 'Cơ quan thử', systemName: 'Hệ thống thử' }
      });
      assert.equal(resourceTaskResponse.status, 201);
      const resourceTask = await resourceTaskResponse.json();
      assert.ok(resourceTask.data.resourceId);

      const linkedResourceResponse = await fetch(`${origin}/api/v1/resources`, {
        method: 'POST', headers: { authorization: `Bearer ${freshBody.data.accessToken}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          unitName: 'Đơn vị tạo resource-task', managingAgency: 'Cơ quan thử nghiệm', systemName: 'Hệ thống resource-task',
          registeredDocumentIds: [documentBody.data.id], assetDocumentIds: [], directColumns: ['vCPU'], directRows: [{ vCPU: '4' }],
          customFields: [{ label: 'Khu vực', value: 'Cà Mau' }], fileIds: [uploadedFileId], taskIds: [],
          appendices: { [documentBody.data.id]: { columns: ['vGPU'], sharedHardwareRowCount: 1, sharedRows: [{ vGPU: '8' }], privateRows: [] } },
          createTask: true, task: { title: 'Công việc tạo cùng resource', workflowStatus: 'processing', managementGroupId: groupId, assigneeIds: [adminRows[0].id], startAt: '2026-01-01T00:00:00Z', dueAt: '2099-01-01T00:00:00Z' }
        })
      });
      assert.equal(linkedResourceResponse.status, 201, await linkedResourceResponse.clone().text());
      const linkedResourceBody = await linkedResourceResponse.json();
      const realtimeResult = await realtimeResourceEvent;
      assert.equal(realtimeResult.event.type, 'resource.created');
      assert.equal(realtimeResult.committed, true);
      assert.ok(linkedResourceBody.data.taskId);
      const loadedResourceResponse = await fetch(`${origin}/api/v1/resources/${linkedResourceBody.data.id}`, { headers: { authorization: `Bearer ${freshBody.data.accessToken}` } });
      assert.equal(loadedResourceResponse.status, 200);
      const loadedResource = (await loadedResourceResponse.json()).data;
      assert.equal(loadedResource.registeredDocuments[0].id, documentBody.data.id);
      assert.equal(loadedResource.tasks[0].id, linkedResourceBody.data.taskId);
      assert.deepEqual(loadedResource.appendices[documentBody.data.id].sharedRows, [{ vGPU: '8', 'RAM (GB)': '', 'Disk / Block (TB)': '', 'Disk / File Storage (TB)': '', 'Disk / Object (TB)': '', License: '' }]);
      const mergedResourceResponse = await fetch(`${origin}/api/v1/resources`, {
        method: 'POST', headers: { authorization: `Bearer ${freshBody.data.accessToken}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          unitName: 'Đơn vị tạo resource-task', managingAgency: 'Cơ quan thử nghiệm', systemName: 'Hệ thống resource-task',
          directColumns: ['vCPU', 'RAM'], directRows: [{ vCPU: '16', RAM: '64' }],
          customFields: [{ label: 'Người phụ trách', value: 'Nguyễn An' }],
          createTask: true,
          task: { title: 'Task thứ hai cùng tài nguyên', workflowStatus: 'init', managementGroupId: groupId, assigneeIds: [adminRows[0].id], startAt: '2026-01-01T00:00:00Z', dueAt: '2099-01-01T00:00:00Z' }
        })
      });
      assert.equal(mergedResourceResponse.status, 200, await mergedResourceResponse.clone().text());
      const mergedResource = (await mergedResourceResponse.json()).data;
      assert.equal(mergedResource.id, linkedResourceBody.data.id);
      assert.equal(mergedResource.merged, true);
      assert.ok(mergedResource.taskId);
      const reloadedMergedResourceResponse = await fetch(`${origin}/api/v1/resources/${mergedResource.id}`, { headers: { authorization: `Bearer ${freshBody.data.accessToken}` } });
      const reloadedMergedResource = (await reloadedMergedResourceResponse.json()).data;
      assert.equal(reloadedMergedResource.tasks.length, 2);
      assert.equal(reloadedMergedResource.registeredDocuments[0].id, documentBody.data.id);
      assert.equal(reloadedMergedResource.files[0].id, uploadedFileId);
      assert.equal(reloadedMergedResource.directRows[0].vCPU, '16');
      assert.equal(reloadedMergedResource.directRows[0].vGPU, undefined);
      assert.equal(reloadedMergedResource.appendices[documentBody.data.id].sharedRows[0].vGPU, '8');
      const sharedFileDownload = await fetch(`${origin}/api/v1/files/${uploadedFileId}/content`, { headers: { authorization: `Bearer ${approvedLoginBody.data.accessToken}` } });
      assert.equal(sharedFileDownload.status, 200);
      assert.equal(await sharedFileDownload.text(), 'Nội dung tệp dùng chung');
      const taskFileLinks = await pool.execute('SELECT COUNT(*) total FROM task_file_links WHERE task_id = ? AND file_id = ? AND ended_at IS NULL', [linkedResourceBody.data.taskId, uploadedFileId]);
      assert.equal(Number(taskFileLinks[0][0].total), 1);
      const resourceHistory = await fetch(`${origin}/api/v1/resources/${linkedResourceBody.data.id}/history`, { headers: { authorization: `Bearer ${freshBody.data.accessToken}` } });
      assert.equal((await resourceHistory.json()).data.some(entry => entry.entityType === 'task' && entry.entityId === linkedResourceBody.data.taskId), true);
      const mineResources = await fetch(`${origin}/api/v1/resources?assignedToMe=mine`, { headers: { authorization: `Bearer ${freshBody.data.accessToken}` } });
      assert.equal((await mineResources.json()).page.total, 2);
      const exportResponse = await fetch(`${origin}/api/v1/resources/export.xlsx?q=resource-task`, { headers: { authorization: `Bearer ${freshBody.data.accessToken}` } });
      assert.equal(exportResponse.status, 200);
      assert.match(exportResponse.headers.get('content-type'), /spreadsheetml/);
      assert.ok((await exportResponse.arrayBuffer()).byteLength > 1000);

      const unlinkedOnlyResource = await fetch(`${origin}/api/v1/resources`, {
        method: 'POST', headers: { authorization: `Bearer ${freshBody.data.accessToken}`, 'content-type': 'application/json' },
        body: JSON.stringify({ unitName: 'Đơn vị không task', managingAgency: 'Cơ quan không task', systemName: 'Hệ thống không task' })
      });
      assert.equal(unlinkedOnlyResource.status, 201);
      assert.equal((await unlinkedOnlyResource.json()).data.taskId, null);

      const summary = await fetch(`${origin}/api/v1/tasks/summary`, { headers: { authorization: `Bearer ${freshBody.data.accessToken}` } });
      assert.deepEqual((await summary.json()).data, { total: 7, processing: 5, done: 1, late: 1 });
      const visibleTasks = await fetch(`${origin}/api/v1/tasks?managementGroupId=${groupId}`, { headers: { authorization: `Bearer ${approvedLoginBody.data.accessToken}` } });
      assert.equal((await visibleTasks.json()).page.total, 7);
      const forbiddenTaskUpdate = await fetch(`${origin}/api/v1/tasks/${doneTask.data.id}`, {
        method: 'PATCH', headers: { authorization: `Bearer ${approvedLoginBody.data.accessToken}`, 'content-type': 'application/json' },
        body: JSON.stringify({ version: 1, workflowStatus: 'processing' })
      });
      assert.equal(forbiddenTaskUpdate.status, 403);
      const allowedAssignedUpdate = await fetch(`${origin}/api/v1/tasks/${assignedTask.data.id}`, {
        method: 'PATCH', headers: { authorization: `Bearer ${approvedLoginBody.data.accessToken}`, 'content-type': 'application/json' },
        body: JSON.stringify({ version: 1, workflowStatus: 'done' })
      });
      assert.equal(allowedAssignedUpdate.status, 200);
      const retainedTaskFile = await pool.execute('SELECT COUNT(*) AS total FROM task_file_links WHERE task_id = ? AND file_id = ? AND ended_at IS NULL', [assignedTask.data.id, uploadedFileId]);
      assert.equal(Number(retainedTaskFile[0][0].total), 1, 'status-only PATCH must retain omitted task file links');
      const linkedResource = await pool.execute('SELECT COUNT(*) AS total FROM task_resource_links WHERE task_id = ? AND resource_id = ? AND ended_at IS NULL', [resourceTask.data.id, resourceTask.data.resourceId]);
      assert.equal(Number(linkedResource[0][0].total), 1);

      const archived = await fetch(`${origin}/api/v1/admin/users/${registrationBody.data.id}/archive`, {
        method: 'POST', headers: { authorization: `Bearer ${freshBody.data.accessToken}` }
      });
      assert.equal(archived.status, 200);
      const [retainedAssignments] = await pool.execute('SELECT COUNT(*) AS total FROM task_assignees WHERE user_id = ?', [registrationBody.data.id]);
      assert.equal(Number(retainedAssignments[0].total), 1);
      const archivedLogin = await fetch(`${origin}/api/v1/auth/login`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ identifier: 'user.pending', password: 'PendingUserPassword_2026!' })
      });
      assert.equal(archivedLogin.status, 401);
    } finally {
      adminSocket?.disconnect();
      await realtime.close();
    }

    await pool.execute(
      `UPDATE app_users SET display_name = 'Preserved admin', status = 'inactive'
       WHERE username = 'admin'`
    );
    await runMigrations(pool);
    const [afterRerun] = await pool.execute('SELECT display_name, password_hash, status, must_change_password FROM app_users WHERE username = ?', ['admin']);
    assert.equal(afterRerun.length, 1);
    assert.equal(afterRerun[0].display_name, 'Preserved admin');
    assert.match(afterRerun[0].password_hash, /^\$argon2id\$/);
    assert.equal(await argon2.verify(afterRerun[0].password_hash, 'NewDisposablePassword_2026!'), true);
    assert.equal(afterRerun[0].status, 'inactive');
    assert.equal(Number(afterRerun[0].must_change_password), 0);
  } finally {
    await pool.end();
  }
});
