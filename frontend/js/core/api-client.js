'use strict';

// The API is the source of truth for business data. Tokens live in memory;
// only the server-managed refresh cookie survives a page reload.
window.C12Api = (() => {
  const base = '/api/v1';
  let accessToken = '', currentUser = null, csrfToken = '', socket = null, baseline = null, saveInFlight = null;
  let refreshInFlight = null;
  const apiError = (message, scope = 'Frontend', code = 'CLIENT_ERROR', details = null) => Object.assign(new Error(message), { scope, code, details });
  const readCookie = name => document.cookie.split(';').map(x => x.trim()).find(x => x.startsWith(`${name}=`))?.slice(name.length + 1) || '';

  function report(error) {
    const scope = error?.scope || 'Frontend', code = error?.code || 'CLIENT_ERROR';
    const message = error?.message || 'Đã xảy ra lỗi không xác định.';
    const requestId = error?.requestId ? ` · Mã yêu cầu ${error.requestId}` : '';
      if (typeof toast === 'function') toast(`${scope} · ${code}: ${message}${requestId}`);
  }

  window.addEventListener('error', event => report(apiError(event.message || 'Lỗi JavaScript trong giao diện.', 'Frontend', 'RUNTIME_ERROR')));
  window.addEventListener('unhandledrejection', event => {
    const reason = event.reason;
    report(reason?.scope ? reason : apiError(reason?.message || 'Lỗi JavaScript chưa được xử lý.', 'Frontend', 'UNHANDLED_REJECTION'));
  });
  document.addEventListener('click', event => {
    const link = event.target.closest('[data-api-file]');
    if (!link) return;
    event.preventDefault(); event.stopPropagation();
    downloadFile(link.dataset.apiFile, link.dataset.apiFileName).catch(report);
  });

  async function request(path, options = {}, retry = true) {
    const headers = new Headers(options.headers || {});
    if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
    if (options.body && !(options.body instanceof Blob) && !(options.body instanceof ArrayBuffer)) headers.set('Content-Type', 'application/json');
    const method = (options.method || 'GET').toUpperCase();
    if (!['GET', 'HEAD', 'OPTIONS'].includes(method) && path.startsWith('/auth/')) {
      csrfToken ||= decodeURIComponent(readCookie('csrf_token'));
      if (csrfToken) headers.set('X-CSRF-Token', csrfToken);
    }
    let response;
    try { response = await fetch(base + path, { ...options, method, headers, credentials: 'same-origin' }); }
    catch (cause) { throw apiError('Không kết nối được API. Kiểm tra dịch vụ backend và tải lại trang.', 'Backend', 'NETWORK_UNAVAILABLE', cause?.message); }
    if (response.status === 401 && retry && path !== '/auth/login' && path !== '/auth/refresh') {
      if (await refresh()) return request(path, options, false);
      accessToken = ''; currentUser = null;
    }
    if (!response.ok) {
      const body = await response.json().catch(() => null), error = body?.error || {};
      throw Object.assign(apiError(error.message || `Yêu cầu thất bại (${response.status}).`, error.scope || 'Backend', error.code || `HTTP_${response.status}`, error.details || null), { requestId: body?.requestId || error.requestId || '' });
    }
    if (response.status === 204) return null;
    if (/application\/json/i.test(response.headers.get('content-type') || '')) return response.json();
    return response;
  }

  async function refresh() {
    if (refreshInFlight) return refreshInFlight;
    refreshInFlight = (async () => {
      csrfToken = decodeURIComponent(readCookie('csrf_token'));
      if (!csrfToken) return false;
      try {
        const result = await request('/auth/refresh', { method: 'POST', headers: { 'X-CSRF-Token': csrfToken } }, false);
        acceptSession(result.data); return true;
      } catch { accessToken = ''; currentUser = null; return false; }
      finally { refreshInFlight = null; }
    })();
    return refreshInFlight;
  }

  function acceptSession(data) {
    accessToken = data.accessToken;
    csrfToken = data.csrfToken || decodeURIComponent(readCookie('csrf_token'));
    currentUser = data.user;
    return currentUser;
  }

  async function login(identifier, password) {
    const result = await request('/auth/login', { method: 'POST', body: JSON.stringify({ identifier, password }) }, false);
    acceptSession(result.data); return currentUser;
  }
  async function logout() {
    try { await request('/auth/logout', { method: 'POST', body: '{}' }, false); }
    finally { accessToken = ''; currentUser = null; csrfToken = ''; socket?.disconnect(); socket = null; }
  }
  async function changePassword(currentPassword, newPassword) {
    await request('/auth/password', { method: 'PUT', body: JSON.stringify({ currentPassword, newPassword }) }, false);
    accessToken = ''; currentUser = null;
  }
  async function uploadFile(file) {
    const result = await request('/files', { method: 'POST', headers: { 'Content-Type': 'application/octet-stream', 'X-File-Name': encodeURIComponent(file.name), 'X-File-Media-Type': file.type || 'application/octet-stream' }, body: file });
    return result.data;
  }
  async function downloadFile(id, name) {
    const path = String(id).startsWith('/') ? id : `/files/${encodeURIComponent(id)}/content`;
    const response = await request(path);
    const url = URL.createObjectURL(await response.blob()), link = document.createElement('a');
    link.href = url; link.download = name || 'tai-lieu'; document.body.append(link); link.click(); link.remove(); URL.revokeObjectURL(url);
  }
  const toIsoDateTime = value => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toISOString();
  };
  function taskPayload(task) {
    const documentId = task.documentId || (task.type === 'document' ? task.officialIds?.[0] || task.documentIds?.[0] : undefined);
    const payload = { type: task.type, title: task.title, description: task.description || null, workflowStatus: task.status || 'init', managementGroupId: task.managementGroupId, assigneeIds: task.assigneeIds || [], startAt: toIsoDateTime(task.start), dueAt: toIsoDateTime(task.due), customTable: task.customTable || { columns: [], rows: [] }, customFields: (task.customFields || []).map(field => ({ id: field.id, label: field.label || field.name, value: field.value })), fileIds: (task.attachments || []).map(file => file.id).filter(Boolean) };
    if (documentId) payload.documentId = documentId;
    else if (task.type === 'document') payload.document = { documentType: task.documentType || 'Công văn', documentNumber: task.documentNumber || null, issueDate: task.documentDate || null, summary: task.documentSummary || null };
    if (task.type === 'resource') {
      const resource = task.resourceData || {};
      payload.resource = { resourceId: task.resourceId || undefined, unitName: resource.unit || task.unit || undefined, managingAgency: resource.agency || task.agency || undefined, systemName: resource.system || undefined, levelName: resource.level || task.level || null, directColumns: resource.directColumns || [], directRows: resource.directRows || [], customFields: payload.customFields, registeredDocumentIds: resource.registeredDocumentIds || [], assetDocumentIds: resource.assetDocumentIds || resource.exchangeDocumentIds || [] };
    }
    return payload;
  }
  const get = async path => (await request(path)).data;
  const post = async (path, data) => (await request(path, { method: 'POST', body: JSON.stringify(data) })).data;
  const patch = async (path, data) => (await request(path, { method: 'PATCH', body: JSON.stringify(data) })).data;
  async function all(path) {
    const pageSize = 200, result = [];
    let offset = 0, total = Infinity;
    while (offset < total) {
      const separator = path.includes('?') ? '&' : '?', response = await request(`${path}${separator}limit=${pageSize}&offset=${offset}`);
      result.push(...(response.data || [])); total = Number(response.page?.total ?? result.length); offset += pageSize;
      if (!response.page) break;
    }
    return result;
  }

  function mapDocument(item) {
    return { ...item, no: item.documentNumber || '', date: item.issueDate || '', agency: item.issuingAgency || '', summary: item.summary || '', type: item.documentType, files: item.files || [] };
  }
  function mapResource(item) {
    const appendices = Object.fromEntries(Object.entries(item.appendices || {}).map(([id, appendix]) => [id, { ...appendix, rows: appendix.sharedRows || [], privateRows: appendix.privateRows || [] }]));
    const files = item.files || [];
    return { ...item, unit: item.unitName, agency: item.managingAgency, system: item.systemName, level: item.levelName || '',
      registeredDocumentIds: (item.registeredDocuments || []).map(doc => doc.id), assetDocumentIds: (item.assetDocuments || []).map(doc => doc.id), exchangeDocumentIds: (item.assetDocuments || []).map(doc => doc.id),
      taskIds: (item.tasks || []).map(task => task.id), attachments: files, documentAppendices: appendices, sharedHardwareRowCount: Math.max(1, ...Object.values(appendices).map(appendix => appendix.sharedHardwareRowCount || 0)),
      customFields: (item.customFields || []).map(field => ({ ...field, name: field.label })),
      hardwareColumns: ['STT', ...new Set(item.directColumns || [])],
      hardwareRows: (item.directRows || []).map((row, index) => ({ STT: String(index + 1), ...row })) };
  }
  function mapTask(item) {
    const status = ({ initialized: 'init', processing: 'processing', getting_number: 'number', signing: 'signing', completed: 'done' })[item.workflowStatus] || item.workflowStatus;
    return { ...item, code: item.code, status, start: item.startAt, due: item.dueAt, creatorId: item.createdBy,
      assigneeIds: (item.assignees || []).map(person => person.id), documentType: '', documentNumber: '', documentSummary: '', documentIds: [], officialIds: [],
      attachments: item.files || [], comments: [], revisions: [], aliases: [], resourceData: null };
  }

  async function loadWorkspace() {
    if (!currentUser) throw apiError('Đăng nhập để tải dữ liệu.', 'Backend', 'AUTH_REQUIRED');
    const [documents, tasks, resources, groups, people, knowledge, notifications] = await Promise.all([
      all('/documents'), all('/tasks'), all('/resources'), get('/organization/groups'), get('/organization/people'), all('/knowledge'), all('/notifications')
    ]);
    let users = [{ ...currentUser, name: currentUser.displayName, status: 'approved', personId: currentUser.personId || '' }];
    let registrations = [];
    if (currentUser.role === 'admin') {
      const [accountResponse, pendingResponse] = await Promise.all([request('/admin/users'), request('/admin/registrations')]);
      users = accountResponse.data.map(user => ({ ...user, name: user.displayName, status: user.status === 'active' ? 'approved' : user.status === 'pending' ? 'pending' : user.status, personId: user.personId || '' }));
      registrations = pendingResponse.data || [];
    }
    const mappedDocs = documents.map(mapDocument), mappedResources = resources.map(mapResource), mappedTasks = tasks.map(mapTask);
    for (const task of mappedTasks) {
      const doc = mappedDocs.find(item => item.id === task.documentId);
      if (doc) { task.documentType = doc.documentType; task.documentNumber = doc.no; task.documentSummary = doc.summary; task.officialIds = doc.documentType === 'Công văn' ? [doc.id] : []; task.documentIds = [doc.id]; }
      if (task.resourceId) { const resource = mappedResources.find(item => item.id === task.resourceId); if (resource) task.resourceData = resource; }
    }
    const currentUserPerson = people.find(person => person.email && currentUser.email && person.email.toLowerCase() === currentUser.email.toLowerCase());
    if (currentUserPerson && !users.find(user => user.id === currentUser.id)?.personId) users.find(user => user.id === currentUser.id).personId = currentUserPerson.id;
    const resourceAppendixSchemas = {};
    for (const resource of mappedResources) for (const [documentId, appendix] of Object.entries(resource.documentAppendices)) resourceAppendixSchemas[documentId] = [...new Set([...(resourceAppendixSchemas[documentId] || []), ...(appendix.columns || [])])];
    const workspace = {
      version: 7, users, people: people.map(person => ({ ...person, position: person.positionTitle || '', rank: Number(person.graphLevel) || 3, type: person.personnelType || 'Cán bộ' })),
      taskGroups: groups.map(group => ({ ...group, archived: false })), tasks: mappedTasks,
      documents: mappedDocs, docs: mappedDocs, officials: mappedDocs, resourceRecords: mappedResources,
      resourceAppendixSchemas, resourcePrivateColumns: [...new Set(mappedResources.flatMap(resource => resource.hardwareColumns.slice(1)))], tableColumns: [], rows: [], schemas: {}, knowledge: knowledge.map(item => ({ ...item, no: item.documentNumber || '', type: item.documentType || '', level: item.issuingLevel || '', agency: item.issuingAgency || '', date: item.issueDate || '', content: item.body || '', relatedDocumentIds: item.relatedDocumentIds || [], related: item.relatedDocumentIds || [], files: item.files || [] })),
      notifications: notifications.map(item => ({ ...item, recipientId: currentUser.id, read: Boolean(item.readAt), title: item.type || 'Thông báo', body: item.message || '' })), files: {}, counters: {}, orgAudit: [], accountRegistrations: registrations
    };
    baseline = structuredClone(workspace);
    return workspace;
  }

  const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const resourcePayload = (item, idMap = new Map()) => ({
    unitName: item.unit, managingAgency: item.agency, systemName: item.system, levelName: item.level || null,
    directColumns: (item.hardwareColumns || []).filter(column => column !== 'STT'),
    directRows: (item.hardwareRows || []).map(row => Object.fromEntries((item.hardwareColumns || []).filter(column => column !== 'STT').map(column => [column, row[column] ?? '']))),
    customFields: (item.customFields || []).map(field => ({ id: field.id, label: field.label || field.name, value: field.value })),
    registeredDocumentIds: (item.registeredDocumentIds || []).map(id => idMap.get(id) || id),
    assetDocumentIds: (item.assetDocumentIds || item.exchangeDocumentIds || []).map(id => idMap.get(id) || id),
    taskIds: item.taskIds || [], fileIds: (item.attachments || []).map(file => file.id).filter(Boolean),
    appendices: Object.fromEntries(Object.entries(item.documentAppendices || {}).map(([documentId, app]) => [idMap.get(documentId) || documentId, {
      columns: app.columns || [], sharedHardwareRowCount: item.sharedHardwareRowCount || app.rows?.length || 0,
      sharedRows: app.rows || [], privateRows: app.privateRows || []
    }]))
  });
  async function persistWorkspace(next) {
    if (!accessToken || !currentUser) throw apiError('Phiên đăng nhập đã hết hạn.', 'Backend', 'AUTH_REQUIRED');
    if (saveInFlight) await saveInFlight;
    saveInFlight = (async () => {
      if (!baseline) baseline = structuredClone(await loadWorkspace());
      const before = baseline, ids = new Map();
      const pendingGroupLeads = [];
      const byId = (list, id) => (list || []).find(item => String(item.id) === String(id));
      const changed = (a, b) => !equal(a, b);
      // Reference catalogs first so newly created links receive server IDs.
      for (const item of next.documents || []) {
        const old = byId(before.documents, item.id);
        if (old && !changed(old, item)) continue;
        const payload = { documentType: item.documentType || item.type, documentNumber: item.no || null, issueDate: item.date || null, issuingAgency: item.agency || null, summary: item.summary || null, note: item.note || null, fileIds: (item.files || []).map(file => file.id).filter(Boolean) };
        if (!old) { const result = await post('/documents', payload); ids.set(item.id, result.id); }
        else if (item.archived && !old.archived) await post(`/documents/${encodeURIComponent(item.id)}/archive`, {});
        else await patch(`/documents/${encodeURIComponent(item.id)}`, { ...payload, version: old.version });
      }
      for (const item of next.taskGroups || []) {
        const old = byId(before.taskGroups, item.id), isNewLead = item.leadPersonId && !ids.has(item.leadPersonId) && !byId(before.people, item.leadPersonId);
        const payload = { name: item.name, code: item.code, groupType: item.groupType || 'specialty', leadPersonId: ids.get(item.leadPersonId) || (byId(before.people, item.leadPersonId) ? item.leadPersonId : null) };
        if (isNewLead && old) delete payload.leadPersonId;
        if (old && !changed(old, item)) continue;
        let savedId = ids.get(item.id) || item.id, savedVersion = old?.version || 1;
        if (!old) { const result = await post('/organization/groups', payload); ids.set(item.id, result.id); savedId = result.id; savedVersion = result.version || 1; }
        else if (item.archived && !old.archived) await post(`/organization/groups/${encodeURIComponent(item.id)}/archive`, {});
        else { await patch(`/organization/groups/${encodeURIComponent(item.id)}`, { ...payload, version: old.version }); savedVersion = Number(old.version) + 1; }
        if (isNewLead && !item.archived) pendingGroupLeads.push({ id: savedId, leadPersonId: item.leadPersonId, version: savedVersion });
      }
      for (const item of next.people || []) {
        const old = byId(before.people, item.id), payload = { name: item.name, positionTitle: item.positionTitle || item.position || '', graphLevel: String(item.graphLevel || item.rank || ''), personnelType: item.personnelType || item.type || '', email: item.email || '', phone: item.phone || '', note: item.note || '' };
        if (old && !changed(old, item)) continue;
        if (!old) {
          const created = await post('/organization/people', payload); ids.set(item.id, created.id);
          if (item.groupId) await post(`/organization/people/${encodeURIComponent(created.id)}/group`, { groupId: ids.get(item.groupId) || item.groupId });
        }
        else if (item.archived && !old.archived) await post(`/organization/people/${encodeURIComponent(item.id)}/archive`, {});
        else {
          await patch(`/organization/people/${encodeURIComponent(item.id)}`, { ...payload, version: old.version });
          if ((item.groupId || null) !== (old.groupId || null)) await post(`/organization/people/${encodeURIComponent(item.id)}/group`, { groupId: ids.get(item.groupId) || item.groupId || null });
        }
      }
      for (const group of pendingGroupLeads) {
        await patch(`/organization/groups/${encodeURIComponent(group.id)}`, { leadPersonId: ids.get(group.leadPersonId) || group.leadPersonId, version: group.version });
      }
      for (const item of next.knowledge || []) {
        const old = byId(before.knowledge, item.id), payload = { title: item.title, documentNumber: item.no || null, documentType: item.type || null, issuingLevel: item.level || null, issuingAgency: item.agency || null, issueDate: item.date || null, effectiveDate: item.effectiveDate || null, summary: item.summary || null, body: item.content || null, relatedDocumentIds: (item.relatedDocumentIds || []).map(id => ids.get(id) || id), customFields: item.customFields || [], fileIds: (item.files || []).map(file => file.id).filter(Boolean) };
        if (old && !changed(old, item)) continue;
        if (!old) { const result = await post('/knowledge', payload); ids.set(item.id, result.id); }
        else if (item.archived && !old.archived) await post(`/knowledge/${encodeURIComponent(item.id)}/archive`, {});
        else await patch(`/knowledge/${encodeURIComponent(item.id)}`, { ...payload, version: old.version });
      }
      for (const item of next.resourceRecords || []) {
        const old = byId(before.resourceRecords, item.id); if (old && !changed(old, item)) continue;
        const payload = resourcePayload(item, ids);
        if (!old) { const result = await post('/resources', payload); ids.set(item.id, result.id); }
        else if (item.archived && !old.archived) await post(`/resources/${encodeURIComponent(item.id)}/archive`, {});
        else await patch(`/resources/${encodeURIComponent(item.id)}`, { ...payload, version: old.version });
      }
      for (const item of next.tasks || []) {
        const old = byId(before.tasks, item.id); if (old && !changed(old, item)) continue;
        const payload = taskPayload({ ...item, managementGroupId: ids.get(item.managementGroupId) || item.managementGroupId, assigneeIds: (item.assigneeIds || []).map(id => ids.get(id) || id), resourceId: ids.get(item.resourceId) || item.resourceId, documentId: ids.get(item.documentId) || item.documentId });
        if (!old) { const result = await post('/tasks', payload); ids.set(item.id, result.id); }
        else if (item.archived && !old.archived) await post(`/tasks/${encodeURIComponent(item.id)}/archive`, {});
        else {
          delete payload.type; delete payload.resource; delete payload.document;
          await patch(`/tasks/${encodeURIComponent(item.id)}`, { ...payload, version: old.version });
          const oldComments = new Set(old.comments || []);
          for (const comment of (item.comments || []).filter(row => !oldComments.has(row) && !oldComments.has(row.id))) {
            const body = typeof comment === 'string' ? comment : comment.text || comment.body;
            if (body) await post(`/tasks/${encodeURIComponent(item.id)}/comments`, { body });
          }
        }
      }
      // Legacy delete controls become soft-archive API operations; relationships stay intact.
      for (const [key, route] of [['tasks', '/tasks'], ['resourceRecords', '/resources'], ['documents', '/documents'], ['people', '/organization/people'], ['taskGroups', '/organization/groups'], ['knowledge', '/knowledge'], ['users', '/admin/users']]) {
        for (const old of before[key] || []) if (!byId(next[key], old.id) && !old.archived) await post(`${route}/${encodeURIComponent(old.id)}/archive`, {});
      }
      for (const item of next.users || []) {
        const old = byId(before.users, item.id); if (old && !changed(old, item)) continue;
        if (item.archived && old) await post(`/admin/users/${encodeURIComponent(item.id)}/archive`, {});
        else if (old) await patch(`/admin/users/${encodeURIComponent(item.id)}`, { displayName: item.name || item.displayName, email: item.email || null, personId: item.personId || null, role: item.role });
      }
      const readIds = (next.notifications || []).filter(item => item.read && !byId(before.notifications, item.id)?.read).map(item => item.id);
      if (readIds.length) await post('/notifications/read', { notificationIds: readIds });
      return await loadWorkspace();
    })();
    try { return await saveInFlight; } finally { saveInFlight = null; }
  }

  function connectSocket(onEvent) {
    if (!accessToken || typeof window.io !== 'function') return;
    socket?.disconnect();
    socket = window.io({ auth: { token: accessToken }, transports: ['websocket', 'polling'] });
    const events = ['task.created','task.updated','task.archived','task.restored','task.comment.created','resource.created','resource.updated','resource.archived','resource.restored','document.created','document.updated','document.archived','document.restored','group.created','group.updated','group.archived','group.restored','person.created','person.updated','person.archived','person.restored','knowledge.created','knowledge.updated','knowledge.archived','knowledge.restored','notification.created','notification.read'];
    events.forEach(name => socket.on(name, payload => onEvent?.(name, payload)));
    socket.on('connect_error', () => {});
  }

  return { request, get, post, patch, all, login, logout, changePassword, uploadFile, downloadFile, taskPayload, refresh, loadWorkspace, persistWorkspace, connectSocket,
    get user() { return currentUser; }, get authenticated() { return Boolean(accessToken && currentUser); }, report,
    setSession(data) { acceptSession(data); } };
})();
