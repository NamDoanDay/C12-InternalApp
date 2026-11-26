(function (root, factory) {
  const api = factory();
  root.C12Model = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const clone = value => JSON.parse(JSON.stringify(value));
  const id = () => globalThis.crypto?.randomUUID?.() || `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const now = () => new Date().toISOString();
  const GROUPS = [['HT', 'Hạ tầng'], ['HTM', 'Mạng / Hạ tầng mạng'], ['DN', 'Điện nước'], ['MC', 'Máy chủ'], ['HPCAI', 'HPC-AI đề án'], ['QLVB', 'Quản lý văn bản']];
  const DOCUMENT_TYPES = ['Công văn', 'Thông tư', 'Nghị định', 'Quyết định', 'Luật', 'Nghị quyết', 'Báo cáo', 'Các loại văn bản khác'];
  const norm = value => String(value ?? '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('vi');

  function bucket(task, time = Date.now()) {
    if (task.status === 'done') return 'done';
    if (Number.isFinite(Date.parse(task.due)) && time > Date.parse(task.due)) return 'late';
    return 'processing';
  }
  function overdueDays(task, time = Date.now()) {
    return bucket(task, time) === 'late' ? Math.max(1, Math.ceil((time - Date.parse(task.due)) / 86400000)) : 0;
  }
  const personGroup = (state, userId) => state.people.find(p => p.id === state.users.find(u => u.id === userId)?.personId)?.groupId || '';
  function participatingGroups(state, task) {
    return [...new Set([task.managementGroupId, ...(task.assigneeIds || []).map(userId => personGroup(state, userId))].filter(Boolean))];
  }
  function canView(state, user, task) {
    return !!user && (user.role === 'admin' || task.creatorId === user.id || task.assigneeIds?.includes(user.id) || participatingGroups(state, task).includes(personGroup(state, user.id)));
  }
  function canEdit(state, user, task) { return !!user && (user.role === 'admin' || task.creatorId === user.id || task.assigneeIds?.includes(user.id)); }
  function canEditDue(state, user, task) { return !!user && (user.role === 'admin' || task.creatorId === user.id); }
  function canEditCell(state, user, task) { return !!user && (user.role === 'admin' || task.assigneeIds?.includes(user.id)); }
  function nextCode(state, type, groupId) {
    const prefix = type === 'daily' ? 'DAILY' : state.taskGroups.find(group => group.id === groupId)?.code;
    if (!prefix) throw Error('Chọn nhóm quản lý task.');
    state.counters[prefix] = (state.counters[prefix] || 0) + 1;
    return `Task-${prefix}-${String(state.counters[prefix]).padStart(2, '0')}`;
  }
  function revision(task, actorId, action, changes = [], time = now()) {
    task.updatedAt = time;
    task.revisions ||= [];
    const data = clone(task);
    delete data.revisions;
    task.revisions.push({ id: id(), at: time, actorId, action, changes: clone(changes), data });
    return task;
  }
  function notify(state, task, actorId, ids, event = 'created') {
    const at = now(), eventId = id();
    for (const recipientId of new Set(ids)) state.notifications.push({ id: id(), eventId, recipientId, taskId: task.id, actorId, event, at, read: false, title: event === 'assigned' ? 'Bạn được giao công việc' : 'Công việc mới được tạo', body: `${task.code} · ${task.title}` });
  }

  function catalogDocumentForTask(state, task) {
    if (task.type !== 'document') return;
    const type = task.documentType;
    if (!DOCUMENT_TYPES.includes(type)) throw Error('Chọn loại văn bản hợp lệ cho task xử lý văn bản.');
    const number = String(task.documentNumber || '').trim();
    let found = state.documents.find(doc => !doc.archived && doc.id === task.documentId);
    if (found && (norm(found.documentType || found.type) !== norm(type) || norm(found.no) !== norm(number))) found = null;
    if (!found && number) found = state.documents.find(doc => !doc.archived && norm(doc.documentType || doc.type) === norm(type) && norm(doc.no) === norm(number));
    if (!found) {
      found = { id: id(), documentType: type, type, no: number, date: '', summary: String(task.documentSummary || '').trim(), agency: '', note: '', files: [], createdAt: now() };
      state.documents.push(found);
    }
    state.officials = state.documents;
    state.docs = state.documents;
    task.documentId = found.id;
  }

  function validateTask(state, user, task, checkAssignment = true) {
    if (!task.title?.trim()) throw Error('Nhập tiêu đề công việc.');
    if (!task.start || !task.due || !Number.isFinite(Date.parse(task.start)) || !Number.isFinite(Date.parse(task.due))) throw Error('Ngày bắt đầu và hạn hoàn thành là bắt buộc.');
    if (Date.parse(task.due) < Date.parse(task.start)) throw Error('Hạn hoàn thành không được trước ngày bắt đầu.');
    if (!task.assigneeIds?.length) throw Error('Chọn ít nhất một người nhận.');
    if (checkAssignment && user.role !== 'admin' && (task.assigneeIds.length !== 1 || task.assigneeIds[0] !== user.id)) throw Error('User chỉ được tự giao công việc.');
    if (task.type === 'document' && !DOCUMENT_TYPES.includes(task.documentType)) throw Error('Chọn loại văn bản cho task xử lý văn bản.');
  }

  function saveTask(state, user, input) {
    const old = state.tasks.find(task => task.id === input.id);
    const task = clone(input);
    task.assigneeIds ||= [];
    task.customFields ||= [];
    task.attachments ||= [];
    task.customTable ||= { name: 'Bảng dữ liệu tùy chỉnh', columns: ['STT', 'Nội dung'], rows: [] };
    if (old) {
      if (!canEdit(state, user, old)) throw Error('Bạn không có quyền sửa task.');
      const full = user.role === 'admin' || old.creatorId === user.id;
      if (!full) for (const key of ['title', 'description', 'start', 'due', 'managementGroupId', 'assigneeIds', 'type', 'documentType', 'documentNumber', 'documentSummary']) {
        if (JSON.stringify(task[key]) !== JSON.stringify(old[key])) throw Error('Bạn không được sửa thông tin phân công hoặc lịch của task này.');
      }
      if (task.due !== old.due && !canEditDue(state, user, old)) throw Error('Chỉ admin hoặc người tạo được sửa hạn.');
      if (user.role !== 'admin' && old.creatorId === user.id && JSON.stringify(task.assigneeIds) !== JSON.stringify(old.assigneeIds) && task.assigneeIds.some(value => value !== user.id)) throw Error('User chỉ được tự giao.');
      validateTask(state, user, task, false);
      task.revisions = old.revisions || [];
      task.id = old.id;
      task.code = old.code;
      task.creatorId = old.creatorId;
      task.createdAt = old.createdAt;
      task.aliases = old.aliases || [];
      if (task.type === 'document') catalogDocumentForTask(state, task);
      if (task.type !== old.type || task.managementGroupId !== old.managementGroupId) {
        task.aliases = [...task.aliases, old.code];
        task.code = nextCode(state, task.type, task.managementGroupId);
      }
      const changes = Object.keys(task).filter(key => !['revisions', 'updatedAt'].includes(key) && JSON.stringify(old[key]) !== JSON.stringify(task[key])).map(field => ({ field, old: old[field], new: task[field] }));
      revision(task, user.id, 'Cập nhật công việc', changes);
      state.tasks[state.tasks.indexOf(old)] = task;
      const added = task.assigneeIds.filter(value => !old.assigneeIds.includes(value));
      if (added.length) notify(state, task, user.id, added, 'assigned');
    } else {
      validateTask(state, user, task);
      if (!task.managementGroupId && user.role !== 'admin') task.managementGroupId = personGroup(state, user.id);
      if (task.type === 'document') catalogDocumentForTask(state, task);
      task.id = id();
      task.code = nextCode(state, task.type, task.managementGroupId);
      task.creatorId = user.id;
      task.createdAt = now();
      task.aliases = [];
      task.comments ||= [];
      revision(task, user.id, 'Tạo công việc');
      state.tasks.push(task);
      notify(state, task, user.id, [...state.users.filter(item => item.role === 'admin').map(item => item.id), ...task.assigneeIds, user.id]);
    }
    return task;
  }

  function movePerson(state, user, personId, groupId) {
    if (user.role !== 'admin') throw Error('Chỉ admin được chuyển nhóm.');
    const person = state.people.find(item => item.id === personId), group = state.taskGroups.find(item => item.id === groupId);
    if (!person || !group) throw Error('Không tìm thấy nhân sự hoặc nhóm.');
    const old = person.groupId;
    if (old === groupId) return;
    person.groupId = groupId;
    const time = now(), audit = { id: id(), actorId: user.id, personId, oldGroupId: old, newGroupId: groupId, at: time, taskChanges: [] };
    for (const task of state.tasks.filter(item => item.assigneeIds.some(uid => state.users.find(account => account.id === uid)?.personId === personId))) {
      const before = task.code;
      if (task.type === 'document' && task.assigneeIds.length === 1) {
        task.managementGroupId = groupId;
        task.aliases = [...(task.aliases || []), task.code];
        task.code = nextCode(state, task.type, groupId);
      }
      audit.taskChanges.push({ taskId: task.id, oldCode: before, newCode: task.code });
      revision(task, user.id, 'Chuyển nhóm thành viên', [{ field: 'Nhóm', old, new: groupId }, { field: 'Mã task', old: before, new: task.code }], time);
    }
    state.orgAudit.push(audit);
    return audit;
  }

  // Legacy APIs remain available to old revision data; new resources no longer use task projections.
  function stampCells(state, task, old) {
    const time = now();
    for (const item of task.resources || []) {
      const prior = old?.resources?.find(value => value.id === item.id);
      item.cellTimes = clone(prior?.cellTimes || item.cellTimes || {});
      item.cellSeqs = clone(prior?.cellSeqs || item.cellSeqs || {});
      for (const docId of task.officialIds || []) for (const [field, value] of Object.entries({ ...item.values, ...item.docValues?.[docId] })) {
        const key = `${docId}|${field}`, previous = prior ? ({ ...prior.values, ...prior.docValues?.[docId] })[field] : undefined;
        if (!prior || JSON.stringify(value) !== JSON.stringify(previous) || !item.cellTimes[key]) {
          item.cellTimes[key] = time;
          item.cellSeqs[key] = state.saveSeq = (state.saveSeq || 0) + 1;
        }
      }
    }
  }
  function projectCells(state, user) {
    const map = new Map();
    for (const task of state.tasks.filter(item => !item.archived && canView(state, user, item) && item.type === 'document')) for (const item of task.resources || []) {
      if (!item.system?.trim()) continue;
      const key = [task.unit, task.agency, item.system].map(value => value.trim().toLocaleLowerCase('vi')).join('|');
      let row = map.get(key);
      if (!row) { row = { key, unit: task.unit, agency: task.agency, system: item.system, tasks: [], officialIds: [], documentIds: [], cells: {} }; map.set(key, row); }
      if (!row.tasks.includes(task.id)) row.tasks.push(task.id);
      row.officialIds = [...new Set([...row.officialIds, ...(task.officialIds || [])])];
      row.documentIds = [...new Set([...row.documentIds, ...(task.documentIds || [])])];
      for (const docId of task.officialIds || []) for (const [field, value] of Object.entries({ ...item.values, ...item.docValues?.[docId] })) {
        const cellKey = `${docId}|${field}`, previous = row.cells[cellKey], time = item.cellTimes?.[cellKey] || task.createdAt || task.updatedAt, seq = item.cellSeqs?.[cellKey] || 0;
        if (!previous || time > previous.at || (time === previous.at && seq > previous.seq)) row.cells[cellKey] = { value, taskId: task.id, itemId: item.id, docId, field, at: time, seq };
      }
    }
    return [...map.values()].sort((a, b) => a.unit.localeCompare(b.unit, 'vi') || a.agency.localeCompare(b.agency, 'vi') || a.system.localeCompare(b.system, 'vi'));
  }
  function editCell(state, user, row, docId, field, value) {
    const cell = row.cells[`${docId}|${field}`];
    if (!cell) throw Error('Ô chưa có dữ liệu nguồn.');
    const task = state.tasks.find(item => item.id === cell.taskId);
    if (!canEditCell(state, user, task)) throw Error('Bạn chỉ sửa ô của task đang giao cho mình.');
    const item = task.resources.find(resource => resource.id === cell.itemId), old = cell.value;
    item.docValues ||= {}; item.docValues[docId] ||= {}; item.docValues[docId][field] = value;
    revision(task, user.id, 'Sửa ô tài nguyên', [{ field: `${item.system} / ${docId} / ${field}`, old, new: value }]);
    return task;
  }

  function blankResourceRows(rows) {
    const byKey = new Map();
    for (const source of rows || []) {
      const key = [source.unit, source.agency, source.system].map(norm).join('|');
      let record = byKey.get(key);
      if (!record) {
        record = { id: id(), unit: source.unit || '', agency: source.agency || '', system: source.system || '', level: source.level || '', registeredDocumentIds: [], exchangeDocumentIds: [], hardwareColumns: ['STT', 'Tên tài nguyên', 'Văn bản nguồn'], hardwareRows: [], customFields: [], revisions: [], createdBy: '', editors: [], createdAt: now(), updatedAt: now() };
        byKey.set(key, record);
      }
      for (const snapshot of source.snapshots || []) {
        const doc = snapshot.docId || null;
        if (doc && !record.registeredDocumentIds.includes(doc)) record.registeredDocumentIds.push(doc);
        const values = { STT: String(record.hardwareRows.length + 1), 'Tên tài nguyên': source.system || '', 'Văn bản nguồn': snapshot.doc || '' };
        for (const [field, value] of Object.entries(snapshot.values || {})) {
          const column = `${snapshot.doc || 'Thông tin'} · ${field}`;
          if (!record.hardwareColumns.includes(column)) record.hardwareColumns.push(column);
          values[column] = value;
        }
        record.hardwareRows.push(values);
      }
    }
    return [...byKey.values()];
  }

  function migrate(old) {
    const state = clone(old || {});
    state.version = 7;
    state.legacyRows = clone(state.rows || []);
    state.rows = [];
    state.taskGroups = GROUPS.map(([code, name]) => ({ id: `g-${code}`, code, name, archived: false }));
    state.tasks = [];
    state.notifications = [];
    state.orgAudit = [];
    state.counters = {};
    state.themeByUser = {};
    state.people ||= [];
    state.users ||= [];
    state.files ||= {};
    const documents = (state.docs || []).map(doc => ({ ...doc, documentType: doc.documentType || 'Công văn', type: doc.documentType || 'Công văn' }));
    for (const row of state.legacyRows) for (const snapshot of row.snapshots || []) if (snapshot.doc && !documents.some(doc => norm(doc.no) === norm(snapshot.doc) && doc.documentType === 'Công văn')) {
      documents.push({ id: id(), no: snapshot.doc, date: snapshot.documentDate || '', summary: '', documentType: 'Công văn', type: 'Công văn', files: [] });
    }
    state.documents = documents;
    state.officials = documents;
    state.docs = documents;
    state.resourceColumns = ['STT', 'Tên tài nguyên', 'Văn bản nguồn'];
    const linkLegacy = rows => rows.map(row => ({ ...row, snapshots: (row.snapshots || []).map(snapshot => ({ ...snapshot, docId: documents.find(doc => norm(doc.no) === norm(snapshot.doc))?.id })) }));
    state.resourceRecords = blankResourceRows(linkLegacy(state.legacyRows));
    state.tableColumns ||= [];
    state.saveSeq ||= 0;
    return state;
  }

  function upgradeV6(old) {
    const state = clone(old || {});
    const sourceDocs = state.documentCatalog || [...(state.officials || []), ...(state.documents || [])];
    const documents = [], seenIds = new Set();
    for (const doc of sourceDocs) {
      if (!doc || seenIds.has(doc.id)) continue;
      seenIds.add(doc.id);
      const documentType = DOCUMENT_TYPES.includes(doc.documentType || doc.type) ? (doc.documentType || doc.type) : (state.officials?.some(item => item.id === doc.id) ? 'Công văn' : 'Các loại văn bản khác');
      documents.push({ ...doc, documentType, type: documentType, files: doc.files || [] });
    }
    const oldOfficials = new Set((state.officials || []).map(doc => doc.id));
    for (const task of state.tasks || []) {
      task.assigneeIds ||= [];
      task.documentIds = [...new Set([...(task.documentIds || []), ...(task.officialIds || [])])];
      const primary = [...(task.officialIds || []), ...(task.documentIds || [])].map(id => documents.find(doc => doc.id === id)).find(Boolean);
      task.documentType ||= primary?.documentType || (task.type === 'document' ? 'Công văn' : '');
      task.documentNumber ??= primary?.no || '';
      task.documentSummary ??= primary?.summary || '';
      if (primary) task.documentId ||= primary.id;
      if (task.type === 'document' && oldOfficials.size && !primary) task.documentType ||= 'Công văn';
      task.resources ||= [];
      task.customFields ||= [];
      task.attachments ||= [];
      task.customTable ||= { name: 'Bảng dữ liệu tùy chỉnh', columns: ['STT', 'Nội dung'], rows: [] };
    }
    state.documents = documents;
    state.officials = documents;
    state.docs = documents;
    state.files ||= {};
    state.people ||= [];
    state.users ||= [];
    state.notifications ||= [];
    state.orgAudit ||= [];
    state.counters ||= {};
    state.taskGroups ||= GROUPS.map(([code, name]) => ({ id: `g-${code}`, code, name, archived: false }));
    state.resourceColumns ||= ['STT', 'Tên tài nguyên', 'Văn bản nguồn'];
    state.resourceRecords ||= blankResourceRows((state.legacyRows || []).map(row => ({ ...row, snapshots: (row.snapshots || []).map(snapshot => ({ ...snapshot, docId: documents.find(doc => norm(doc.no) === norm(snapshot.doc))?.id })) })));

    // Detach legacy hardware rows from tasks and preserve them as independent resource records.
    const recordsByKey = new Map(state.resourceRecords.map(record => [[record.unit, record.agency, record.system].map(norm).join('|'), record]));
    for (const task of state.tasks || []) for (const item of task.resources || []) {
      if (!item.system?.trim()) continue;
      const key = [task.unit, task.agency, item.system].map(norm).join('|');
      let record = recordsByKey.get(key);
      if (!record) {
        record = { id: id(), unit: task.unit || '', agency: task.agency || '', system: item.system, level: task.level || '', registeredDocumentIds: [], exchangeDocumentIds: [], hardwareColumns: ['STT', 'Tên tài nguyên', 'Văn bản nguồn'], hardwareRows: [], customFields: [], revisions: [], createdBy: task.creatorId || '', editors: task.assigneeIds || [], createdAt: task.createdAt || now(), updatedAt: task.updatedAt || task.createdAt || now() };
        recordsByKey.set(key, record);
        state.resourceRecords.push(record);
      }
      record.registeredDocumentIds = [...new Set([...record.registeredDocumentIds, ...(task.officialIds || [])])];
      record.exchangeDocumentIds = [...new Set([...record.exchangeDocumentIds, ...(task.documentIds || [])])];
      record.createdBy ||= task.creatorId || '';
      record.editors = [...new Set([...record.editors, ...(task.assigneeIds || [])])];
      const values = { STT: String(record.hardwareRows.length + 1), 'Tên tài nguyên': item.name || item.system, 'Văn bản nguồn': task.documentNumber || '' };
      for (const [field, value] of Object.entries(item.values || {})) {
        const column = `${task.documentNumber || 'Thông tin'} · ${field}`;
        if (!record.hardwareColumns.includes(column)) record.hardwareColumns.push(column);
        values[column] = value;
      }
      if (!record.hardwareRows.some(row => row['Tên tài nguyên'] === values['Tên tài nguyên'] && JSON.stringify(row) === JSON.stringify(values))) record.hardwareRows.push(values);
    }
    for (const task of state.tasks || []) { task.resources = []; task.resourceColumns = []; }

    state.version = 7;
    return state;
  }

  return { clone, id, now, GROUPS, DOCUMENT_TYPES, bucket, overdueDays, personGroup, participatingGroups, canView, canEdit, canEditDue, canEditCell, nextCode, revision, notify, catalogDocumentForTask, validateTask, saveTask, movePerson, stampCells, projectCells, editCell, migrate, upgradeV6 };
});
