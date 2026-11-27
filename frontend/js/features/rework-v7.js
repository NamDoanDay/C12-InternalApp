'use strict';

const V7 = C12Model;
if (typeof state !== 'undefined' && state) {
  state.documents ||= state.docs || [];
  state.officials ||= state.documents;
  state.docs ||= state.documents;
}
// Disable legacy table decorator and header upgrader in V7 to prevent collision or crashes
if (typeof decorateResourceTable !== 'undefined') decorateResourceTable = function () { };
if (typeof upgradeHeader !== 'undefined') upgradeHeader = function () { };

let catalogTypeFilter = 'all', catalogSearchV7 = '', resourceSearchV7 = '', resourceDraftV7, resourceTimelineV7 = '';
const catalogTypesV7 = V7.DOCUMENT_TYPES;
const normV7 = value => String(value || '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('vi');
const resourceCellV7 = (value, label = '') => `<span class="resource-cell-value"${label ? ` title="${esc(label)}"` : ''}>${esc(value || '—')}</span>`;
const resourceRowsV7 = record => record.hardwareRows?.length ? record.hardwareRows : [{ STT: '1' }];
const resourceSharedRowCountV7 = record => Math.max(resourceRowsV7(record).length, record.sharedHardwareRowCount || 0, ...(record.registeredDocumentIds || []).map(id => record.documentAppendices?.[id]?.rows?.length || 0), 1);
const resourceDisplayRowsV7 = (record, docIds) => [...Array.from({ length: resourceSharedRowCountV7(record) }, (_, i) => ({ i, kind: 'shared' })), ...docIds.flatMap(id => (record.documentAppendices?.[id]?.privateRows || []).map((data, privateIndex) => ({ i: privateIndex, privateIndex, data, kind: 'private', docId: id })))];
const linkedResourceTasksV7 = record => state.tasks.filter(task => (record.taskIds || []).includes(task.id) || task.resourceId === record.id);
const canEditResourceV7 = record => admin() || record.createdBy === session || linkedResourceTasksV7(record).some(task => task.creatorId === session || (task.assigneeIds || []).includes(session));
const resourceDocumentIdsV7 = record => record.assetDocumentIds || record.exchangeDocumentIds || [];
const resourceTaskIdsV7 = record => [...new Set([...(record.taskIds || []), ...state.tasks.filter(task => task.resourceId === record.id).map(task => task.id)])];
const cleanExcelV7 = value => String(value ?? '').trim().replace(/^—$/, '');
const isResourceDirectColumnV7 = column => !['STT', 'Tên tài nguyên', 'Văn bản nguồn'].includes(column);
const resourceDocNumberV7 = id => state.documents.find(doc => doc.id === id)?.no || '';
const DEFAULT_RESOURCE_DOC_COLUMNS_V7 = ['vGPU', 'RAM (GB)', 'Disk / Block (TB)', 'Disk / File Storage (TB)', 'Disk / Object (TB)', 'License'];
const defaultResourceDocColumnsV7 = id => {
  const managed = state.resourceAppendixSchemas?.[id];
  if (Array.isArray(managed)) return managed;
  const no = resourceDocNumberV7(id);
  if (no === '952' && typeof LOCAL_DEMAND_COLUMNS_952 !== 'undefined') return LOCAL_DEMAND_COLUMNS_952;
  if (no === '4651' && typeof LOCAL_DEMAND_COLUMNS_4651 !== 'undefined') return LOCAL_DEMAND_COLUMNS_4651;
  const legacy = state.schemas?.[no] || schemas?.[no] || [];
  return [...new Set([...DEFAULT_RESOURCE_DOC_COLUMNS_V7, ...legacy])];
};
const resourceDocColumnsV7 = (id, records = state.resourceRecords || []) => [...new Set([...defaultResourceDocColumnsV7(id), ...records.flatMap(r => r.documentAppendices?.[id]?.columns || [])])];

function prepareResourceTaskV7(task) {
  const resource = state.resourceRecords?.find(item => item.id === task.resourceId);
  task.resourceData = resource ? V7.clone(resource) : task.resourceData || { unit: '', agency: '', system: '', level: 'Địa phương', registeredDocumentIds: [], assetDocumentIds: [], documentAppendices: {}, sharedHardwareRowCount: 1 };
  task.resourceData.assetDocumentIds ||= task.resourceData.exchangeDocumentIds || [];
  task.resourceData.documentAppendices ||= {};
  task.attachments ||= [];
  task.customFields ||= [];
  if (resource) { task.attachments = V7.clone(resource.attachments || []); task.customFields = V7.clone(resource.customFields || []) }
}

function renderResourceTaskFieldsV7(task) {
  prepareResourceTaskV7(task);
  const r = task.resourceData;
  const registrationDocs = state.documents.filter(doc => !doc.archived && (doc.documentType || doc.type) === 'Công văn');
  const assetDocs = state.documents.filter(doc => !doc.archived && (doc.documentType || doc.type) === 'Văn bản cấp tài nguyên');
  return `<div class="task-resource-fields-v7">
    <section class="surface task-resource-system-v7"><h3>Thông tin hệ thống</h3><div class="form-grid">
      ${field('Tên đơn vị *', 'resourceUnitV7', r.unit, 'text', true)}${field('Cơ quan quản lý *', 'resourceAgencyV7', r.agency, 'text', true)}${field('Hệ thống *', 'resourceSystemV7', r.system, 'text', true)}
      <label class="field"><span>Cấp quản lý</span><select name="resourceLevelV7"><option ${r.level === 'Địa phương' ? 'selected' : ''}>Địa phương</option><option ${r.level === 'Bộ ngành' ? 'selected' : ''}>Bộ ngành</option></select></label>
    </div></section>
    <div class="task-resource-doc-grid"><section class="surface"><div class="toolbar"><h3>Công văn đăng ký</h3></div>${registrationDocs.map(doc => `<label class="resource-doc-choice"><input type="checkbox" data-task-resource-registered="${doc.id}" ${(r.registeredDocumentIds || []).includes(doc.id) ? 'checked' : ''}> Công văn · ${esc(doc.no || 'Chưa có số')}</label>`).join('') || '<p class="muted">Chưa có công văn trong danh mục.</p>'}</section>
      <section class="surface"><div class="toolbar"><h3>Văn bản cấp tài nguyên</h3></div>${assetDocs.map(doc => `<label class="resource-doc-choice"><input type="checkbox" data-task-resource-asset="${doc.id}" ${(r.assetDocumentIds || []).includes(doc.id) ? 'checked' : ''}> ${esc(doc.no || doc.documentType)}</label>`).join('') || '<p class="muted">Chưa có văn bản cấp tài nguyên trong danh mục.</p>'}</section></div>
    <section class="surface task-resource-appendices-v7"><h3>Thông tin theo nhóm văn bản</h3>${(r.registeredDocumentIds || []).map(docId => {
      const doc = state.documents.find(item => item.id === docId); if (!doc) return '';
      const appendix = r.documentAppendices[docId] ||= { columns: [], rows: [], privateRows: [] };
      const columns = resourceDocColumnsV7(docId, [r]);
      const rows = Array.from({ length: Math.max(1, r.sharedHardwareRowCount || 1) }, (_, rowIndex) => appendix.rows?.[rowIndex] || {});
      return `<div class="resource-doc-appendix"><h4>${esc(doc.no || 'Công văn')}</h4><div class="table-scroll"><table class="dynamic-data-table"><thead><tr>${columns.map(col => `<th>${esc(col)}</th>`).join('')}</tr></thead><tbody>${rows.map((row, rowIndex) => `<tr>${columns.map(col => `<td><input data-task-resource-cell="${docId}" data-task-resource-row="${rowIndex}" data-task-resource-column="${esc(col)}" value="${esc(row[col] ?? '')}" aria-label="${esc(`${doc.no} ${col} dòng ${rowIndex + 1}`)}"></td>`).join('')}</tr>`).join('')}</tbody></table></div></div>`;
    }).join('') || '<p class="muted">Chọn công văn đăng ký để khai báo thông tin theo nhóm văn bản.</p>'}</section>
  </div>`;
}

function captureResourceTaskV7(task) {
  if (task?.type !== 'resource') return;
  const form = $('#taskEditorForm'), r = task.resourceData; if (!form || !r) return;
  for (const [fieldName, key] of [['resourceUnitV7', 'unit'], ['resourceAgencyV7', 'agency'], ['resourceSystemV7', 'system'], ['resourceLevelV7', 'level']]) if (form.elements[fieldName]) r[key] = form.elements[fieldName].value;
  r.registeredDocumentIds = $$('[data-task-resource-registered]').filter(el => el.checked).map(el => el.dataset.taskResourceRegistered);
  r.assetDocumentIds = $$('[data-task-resource-asset]').filter(el => el.checked).map(el => el.dataset.taskResourceAsset);
  r.documentAppendices ||= {};
  r.registeredDocumentIds.forEach(id => { r.documentAppendices[id] ||= { columns: [], rows: [], privateRows: [] }; r.documentAppendices[id].rows ||= [{}] });
  $$('[data-task-resource-cell]').forEach(input => {
    const appendix = r.documentAppendices[input.dataset.taskResourceCell]; if (!appendix) return;
    const rowIndex = +input.dataset.taskResourceRow; appendix.rows[rowIndex] ||= {}; appendix.rows[rowIndex][input.dataset.taskResourceColumn] = input.value;
  });
}

function validateResourceTaskV7(task) {
  if (task.type !== 'resource') return;
  const r = task.resourceData || {};
  if (![r.unit, r.agency, r.system].every(value => String(value || '').trim())) throw Error('Nhập tên đơn vị, cơ quan quản lý và hệ thống cho tài nguyên.');
  if (!(task.attachments || []).length && (r.attachments || []).length) task.attachments = r.attachments;
  if (!(task.customFields || []).length && (r.customFields || []).length) task.customFields = r.customFields;
}

function saveTaskResourceV7(task) {
  if (task.type !== 'resource' && task.resourceId) {
    const linked = state.resourceRecords.find(record => record.id === task.resourceId);
    const at = V7.now();
    if (linked) {
      linked.taskIds = resourceTaskIdsV7(linked).filter(id => id !== task.id);
      linked.updatedAt = at;
      linked.revisions ||= [];
      linked.revisions.push({ id: V7.id(), at, actorId: session, action: 'Gỡ liên kết công việc', changes: [{ field: 'Công việc', old: task.code, new: '—' }], data: V7.clone(linked) });
    }
    M.revision(task, session, 'Gỡ liên kết tài nguyên', [{ field: 'Tài nguyên', old: task.resourceId, new: '—' }], at);
    delete task.resourceId; delete task.resourceData;
    return;
  }
  const previousId = task.resourceId || '', data = V7.clone(task.resourceData || {});
  validateResourceTaskV7(task);
  const key = [data.unit, data.agency, data.system].map(normV7).join('|');
  const current = state.resourceRecords.find(record => record.id === previousId);
  const target = current && [current.unit, current.agency, current.system].map(normV7).join('|') === key
    ? current
    : state.resourceRecords.find(record => [record.unit, record.agency, record.system].map(normV7).join('|') === key);
  if (current && current !== target && !canEditResourceV7(current)) throw Error('Bạn không có quyền chuyển task khỏi tài nguyên hiện tại.');
  if (target && !canEditResourceV7(target) && task.creatorId !== session && !(task.assigneeIds || []).includes(session)) throw Error('Bạn không có quyền liên kết task với tài nguyên này.');
  const actor = session, at = V7.now(), oldTarget = target ? V7.clone(target) : null;
  if (current && current !== target) {
    current.taskIds = resourceTaskIdsV7(current).filter(id => id !== task.id);
    current.revisions ||= [];
    current.revisions.push({ id: V7.id(), at, actorId: actor, action: 'Gỡ liên kết công việc', changes: [{ field: 'Công việc', old: task.code, new: '—' }], data: V7.clone(current) });
  }
  const appendices = target ? V7.clone(target.documentAppendices || {}) : {};
  for (const [docId, appendix] of Object.entries(data.documentAppendices || {})) {
    const old = appendices[docId] || { columns: [], rows: [], privateRows: [] };
    appendices[docId] = {
      columns: [...new Set([...(old.columns || []), ...(appendix.columns || [])])],
      rows: Array.from({ length: Math.max(old.rows?.length || 0, appendix.rows?.length || 0) }, (_, i) => ({ ...old.rows?.[i], ...appendix.rows?.[i] })),
      privateRows: [...(old.privateRows || []), ...(appendix.privateRows || [])]
    };
  }
  const attachments = V7.clone(!previousId && !task.attachments?.length ? (target?.attachments || []) : (task.attachments || []));
  const customFields = V7.clone(!previousId && !task.customFields?.length ? (target?.customFields || []) : (task.customFields || []));
  const resource = target || {
    id: V7.id(), unit: data.unit.trim(), agency: data.agency.trim(), system: data.system.trim(), level: data.level || 'Địa phương',
    registeredDocumentIds: [], assetDocumentIds: [], hardwareColumns: ['STT', 'Tên tài nguyên', 'Văn bản nguồn'], hardwareRows: [], sharedHardwareRowCount: Math.max(1, data.sharedHardwareRowCount || 1),
    documentAppendices: {}, attachments: [], customFields: [], taskIds: [], revisions: [], createdBy: actor, editors: [], createdAt: at
  };
  resource.unit = data.unit.trim(); resource.agency = data.agency.trim(); resource.system = data.system.trim(); resource.level = data.level || resource.level;
  resource.registeredDocumentIds = [...new Set([...(resource.registeredDocumentIds || []), ...(data.registeredDocumentIds || [])])];
  resource.assetDocumentIds = [...new Set([...resourceDocumentIdsV7(resource), ...(data.assetDocumentIds || [])])];
  resource.exchangeDocumentIds = resource.assetDocumentIds;
  resource.documentAppendices = appendices;
  resource.sharedHardwareRowCount = Math.max(resource.sharedHardwareRowCount || 1, data.sharedHardwareRowCount || 1);
  resource.attachments = attachments; resource.customFields = customFields;
  resource.taskIds = [...new Set([...resourceTaskIdsV7(resource), task.id])];
  resource.editors = [...new Set([...(resource.editors || []), actor])]; resource.updatedAt = at;
  resource.revisions ||= [];
  const changes = Object.keys(resource).filter(field => field !== 'revisions' && JSON.stringify(oldTarget?.[field]) !== JSON.stringify(resource[field])).map(field => ({ field, old: oldTarget?.[field], new: resource[field] }));
  resource.revisions.push({ id: V7.id(), at, actorId: actor, action: oldTarget ? 'Cập nhật tài nguyên từ công việc' : 'Tạo tài nguyên từ công việc', changes, data: V7.clone(resource) });
  if (!target) state.resourceRecords.push(resource);
  task.resourceId = resource.id;
  task.resourceData = V7.clone(resource);
  task.attachments = V7.clone(attachments);
  task.customFields = V7.clone(customFields);
  const lastTaskSnapshot = task.revisions?.at(-1)?.data || {};
  if (lastTaskSnapshot.resourceId !== resource.id || JSON.stringify(lastTaskSnapshot.resourceData) !== JSON.stringify(task.resourceData) || JSON.stringify(lastTaskSnapshot.attachments || []) !== JSON.stringify(task.attachments) || JSON.stringify(lastTaskSnapshot.customFields || []) !== JSON.stringify(task.customFields)) M.revision(task, actor, 'Cập nhật liên kết và thông tin tài nguyên', [{ field: 'Tài nguyên', old: previousId || '—', new: resource.id }], at);
  for (const linked of linkedResourceTasksV7(resource)) {
    if (linked.id === task.id) continue;
    const oldShared = JSON.stringify({ attachments: linked.attachments || [], customFields: linked.customFields || [], resourceData: linked.resourceData || {} });
    linked.attachments = V7.clone(attachments); linked.customFields = V7.clone(customFields); linked.resourceData = V7.clone(resource);
    const nextShared = { attachments: linked.attachments, customFields: linked.customFields, resourceData: linked.resourceData };
    if (oldShared !== JSON.stringify(nextShared)) M.revision(linked, actor, 'Cập nhật thông tin dùng chung tài nguyên', [{ field: 'Thông tin tài nguyên / tệp / trường tùy chỉnh', old: JSON.parse(oldShared), new: nextShared }], at);
  }
}

function migrateResourceColumnsV7() {
  let changed = false;
  if (typeof state !== 'undefined' && state) {
    state.documents ||= state.docs || [];
    state.officials ||= state.documents;
    state.docs ||= state.documents;
  }
  state.resourceRecords ||= [];
  state.resourceAppendixSchemas ||= {};
  state.resourcePrivateColumns ||= [];

  let doc952 = state.documents.find(d => normV7(d.no) === '952');
  if (!doc952) {
    doc952 = { id: uid(), no: '952', date: '2025-03-15', summary: 'Đăng ký nhu cầu tài nguyên hạ tầng điện toán đám mây', documentType: 'Công văn', type: 'Công văn', agency: 'Cục C12', files: [] };
    state.documents.push(doc952);
    changed = true;
  }
  let doc4651 = state.documents.find(d => normV7(d.no) === '4651');
  if (!doc4651) {
    doc4651 = { id: uid(), no: '4651', date: '2025-09-20', summary: 'Rà soát, bổ sung nhu cầu tài nguyên và phương án bảo đảm an toàn thông tin', documentType: 'Công văn', type: 'Công văn', agency: 'Cục C12', files: [] };
    state.documents.push(doc4651);
    changed = true;
  }

  delete state.schemas?.['4267'];
  state.schemas ||= {};
  if (typeof LOCAL_DEMAND_COLUMNS_952 !== 'undefined') state.schemas['952'] = [...LOCAL_DEMAND_COLUMNS_952];
  if (typeof LOCAL_DEMAND_COLUMNS_4651 !== 'undefined') state.schemas['4651'] = [...LOCAL_DEMAND_COLUMNS_4651];

  state.resourcePrivateColumns = (state.resourcePrivateColumns || []).filter(c =>
    !c.includes('CV-DEMO-01') &&
    !c.includes('4267') &&
    !c.includes('Ô nguồn') &&
    !c.includes('Ghi chú trích xuất') &&
    isResourceDirectColumnV7(c)
  );

  // Import the workbook seed once for fresh V7 demo scenarios as well as empty legacy state.
  if (typeof LOCAL_DEMAND_DATA !== 'undefined' && LOCAL_DEMAND_DATA.length && (!state.resourceRecords || state.resourceRecords.length <= 5 || (state.demoSeedVersion >= 2 && !state.localDemandSeeded))) {
    const priorRecords = state.resourceRecords || [];
    const byKey = new Map();
    priorRecords.forEach(r => byKey.set([r.unit, r.agency, r.system].map(normV7).join('|'), r));
    const seedKeys = new Set(LOCAL_DEMAND_DATA.map(item => [item.unit, item.agency, item.system].map(normV7).join('|')));
    state.resourceRecords = LOCAL_DEMAND_DATA.map((item, idx) => {
      const key = [item.unit, item.agency, item.system].map(normV7).join('|');
      const existing = byKey.get(key);
      const regDocs = [];
      if (item.has952) regDocs.push(doc952.id);
      if (item.has4651) regDocs.push(doc4651.id);
      const appendices = { ...(existing?.documentAppendices || {}) };
      if (item.has952) {
        appendices[doc952.id] = {
          columns: [...LOCAL_DEMAND_COLUMNS_952],
          rows: [{ ...item.data952, ...(existing?.documentAppendices?.[doc952.id]?.rows?.[0] || {}) }],
          privateRows: []
        };
      }
      if (item.has4651) {
        appendices[doc4651.id] = {
          columns: [...LOCAL_DEMAND_COLUMNS_4651],
          rows: [{ ...item.data4651, ...(existing?.documentAppendices?.[doc4651.id]?.rows?.[0] || {}) }],
          privateRows: []
        };
      }
      return {
        id: existing?.id || uid(),
        stt: item.stt,
        order: idx + 1,
        unit: item.unit,
        agency: item.agency,
        system: item.system,
        level: 'Địa phương',
        registeredDocumentIds: [...new Set([...(existing?.registeredDocumentIds || []), ...regDocs])],
        assetDocumentIds: existing?.assetDocumentIds || existing?.exchangeDocumentIds || [],
        exchangeDocumentIds: existing?.assetDocumentIds || existing?.exchangeDocumentIds || [],
        hardwareColumns: ['STT', 'Tên tài nguyên', 'Văn bản nguồn'],
        hardwareRows: [{ STT: '1', 'Tên tài nguyên': item.system }],
        sharedHardwareRowCount: 1,
        documentAppendices: appendices,
        attachments: existing?.attachments || [],
        taskIds: existing?.taskIds || [],
        customFields: existing?.customFields || [],
        revisions: existing?.revisions || [],
        createdBy: existing?.createdBy || session,
        editors: existing?.editors || [],
        createdAt: existing?.createdAt || V7.now?.() || new Date().toISOString(),
        updatedAt: existing?.updatedAt || V7.now?.() || new Date().toISOString()
      };
    }).concat(priorRecords.filter(record => !seedKeys.has([record.unit, record.agency, record.system].map(normV7).join('|'))));
    state.localDemandSeeded = true;
    changed = true;
  }

  // Sanitize any remaining records
  for (const r of state.resourceRecords) {
    r.assetDocumentIds ||= r.exchangeDocumentIds || [];
    r.taskIds ||= [];
    if (r.documentAppendices) {
      for (const did of Object.keys(r.documentAppendices)) {
        const doc = state.documents.find(d => d.id === did);
        if (!doc || doc.no === '4267' || doc.no === 'CV-DEMO-01') delete r.documentAppendices[did];
      }
    }
    if (r.hardwareColumns) {
      r.hardwareColumns = r.hardwareColumns.filter(c => !c.includes('4267') && !c.includes('CV-DEMO-01') && !c.includes('Ô nguồn') && !c.includes('Ghi chú trích xuất'));
    }
    r.registeredDocumentIds = [...new Set((r.registeredDocumentIds || []).filter(did => state.documents.some(doc => doc.id === did)))];
  }

  if (state.demoSeedVersion >= 2 && !state.resourceDemoDensityV2 && typeof LOCAL_DEMAND_DATA !== 'undefined') {
    const keyOf = item => [item.unit, item.agency, item.system].map(normV7).join('|'),
      demoRows = new Map(LOCAL_DEMAND_DATA.map(item => [keyOf(item), item])),
      keepKeys = new Set(LOCAL_DEMAND_DATA.slice(0, 12).map(keyOf)),
      hasUserChanges = record => (record.taskIds || []).length || (record.revisions || []).length || (record.attachments || []).length ||
        (record.customFields || []).length || (record.sharedHardwareRowCount || 1) > 1 ||
        Object.values(record.documentAppendices || {}).some(appendix => (appendix.privateRows || []).length > 0);
    state.resourceRecords = state.resourceRecords.filter(record => !demoRows.has(keyOf(record)) || keepKeys.has(keyOf(record)) || hasUserChanges(record));
    state.resourceDemoDensityV2 = true;
    changed = true;
  }
  return changed;
}

// The prior task-linked projection is replaced by records owned by the resource workspace.
resourcesWorkspace = function () {
  state.resourceRecords ||= [];
  if (migrateResourceColumnsV7()) window.C12SaveV5?.();
  const filterDocs = state.documents.filter(doc => !doc.archived && (doc.documentType || doc.type) === 'Công văn');

  let records = state.resourceRecords.filter(record => {
    if (resourceFilters.self && !linkedResourceTasksV7(record).some(task => (task.assigneeIds || []).includes(session))) return false;
    if (resourceFilters.documents?.length && !resourceFilters.documents.some(id => [...(record.registeredDocumentIds || []), ...resourceDocumentIdsV7(record)].includes(id))) return false;
    if (!resourceSearchV7) return true;
    const q = resourceSearchV7.toLocaleLowerCase('vi');
    return `${record.unit} ${record.agency} ${record.system}`.toLocaleLowerCase('vi').includes(q);
  }).sort((a, b) => (a.order || 9999) - (b.order || 9999) || a.unit.localeCompare(b.unit, 'vi') || a.agency.localeCompare(b.agency, 'vi') || a.system.localeCompare(b.system, 'vi'));

  const registrationFilterActive = !!resourceFilters.documents?.length;
  const appendixDocs = filterDocs.filter(doc => !registrationFilterActive || resourceFilters.documents.includes(doc.id));
  const appendixGroups = appendixDocs.map(doc => {
    const linkedRecords = state.resourceRecords.filter(record => (record.registeredDocumentIds || []).includes(doc.id));
    const canManageSchema = admin() || linkedRecords.every(canEditResourceV7);
    return { doc, columns: resourceDocColumnsV7(doc.id, records), canManageSchema };
  });

  const flatRows = records.flatMap((record, ri) => {
    const sharedCount = resourceSharedRowCountV7(record);
    const shared = Array.from({ length: sharedCount }, (_, i) => ({ record, ri, i, kind: 'shared', unit: record.unit, agency: record.agency, system: record.system, stt: record.stt }));
    const privateRows = appendixGroups.flatMap(({ doc }) => {
      if (!(record.registeredDocumentIds || []).includes(doc.id)) return [];
      return (record.documentAppendices?.[doc.id]?.privateRows || []).map((data, privateIndex) => ({
        record, ri, kind: 'private', docId: doc.id, privateIndex, data,
        unit: data.unit || '', agency: data.agency || '', system: data.system || '', stt: record.stt
      }));
    });
    return [...shared, ...privateRows];
  });

  const getUnitSpan = at => {
    const cur = flatRows[at];
    if (cur.kind === 'private') return 1;
    if (at > 0 && flatRows[at - 1].kind === 'shared' && normV7(flatRows[at - 1].unit) === normV7(cur.unit)) return 0;
    let span = 1;
    while (at + span < flatRows.length && flatRows[at + span].kind === 'shared' && normV7(flatRows[at + span].unit) === normV7(cur.unit)) span++;
    return span;
  };

  const getAgencySpan = at => {
    const cur = flatRows[at];
    if (cur.kind === 'private') return 1;
    if (at > 0 && flatRows[at - 1].kind === 'shared' && normV7(flatRows[at - 1].unit) === normV7(cur.unit) && normV7(flatRows[at - 1].agency) === normV7(cur.agency)) return 0;
    let span = 1;
    while (at + span < flatRows.length && flatRows[at + span].kind === 'shared' && normV7(flatRows[at + span].unit) === normV7(cur.unit) && normV7(flatRows[at + span].agency) === normV7(cur.agency)) span++;
    return span;
  };

  const getSystemSpan = at => {
    const cur = flatRows[at];
    if (cur.kind === 'private') return 1;
    if (at > 0 && flatRows[at - 1].record.id === cur.record.id) return 0;
    let span = 1;
    while (at + span < flatRows.length && flatRows[at + span].kind === 'shared' && flatRows[at + span].record.id === cur.record.id) span++;
    return span;
  };

  const getRecordSpan = at => {
    const cur = flatRows[at];
    if (at > 0 && flatRows[at - 1].record.id === cur.record.id) return 0;
    let span = 1;
    while (at + span < flatRows.length && flatRows[at + span].record.id === cur.record.id) span++;
    return span;
  };

  const formatShortHeader = col => {
    if (col.startsWith('Hệ thống có trong danh mục')) return 'Danh mục (278/214/1132)';
    return col;
  };

  return head('Quản lý tài nguyên', '', btn('Tạo tài nguyên', 'new-resource', 'plus', 'primary')) +
    `<section class="surface resource-v7-panel" id="resourcePanel">
      <div class="toolbar"><strong>Dữ liệu tài nguyên tổng hợp</strong><span class="badge-count">${records.length} hệ thống</span><span class="grow"></span><button class="btn" id="exportResourceExcelV7" ${records.length ? '' : 'disabled'}>${icon('download')} Xuất Excel</button>${ib('expand', 'fullscreen', 'Phóng to hoặc thu nhỏ bảng')}</div>
      <div class="resource-v7-filters">
        <label class="task-search">${icon('search')}<input id="resourceSearchV7" value="${esc(resourceSearchV7)}" placeholder="Tìm tên đơn vị, cơ quan quản lý, hệ thống..."></label>
        <label class="field resource-document-filter"><span>Văn bản</span><select id="resourceDocumentFilterV7"><option value="">Tất cả</option>${filterDocs.map(d => `<option value="${d.id}" ${resourceFilters.documents?.includes(d.id) ? 'selected' : ''}>${esc(d.documentType || d.type)} ${esc(d.no || '')} · ${esc(d.summary || '')}</option>`).join('')}</select></label>
        <label class="field resource-self-filter"><span>Phạm vi</span><select id="resourceSelfV7"><option value="all" ${resourceFilters.self ? '' : 'selected'}>Tất cả</option><option value="mine" ${resourceFilters.self ? 'selected' : ''}>Được giao cho tôi</option></select></label>
        ${resourceSearchV7 || resourceFilters.documents?.length || resourceFilters.self ? '<button class="btn text" id="clearResourceV7">Xóa bộ lọc</button>' : ''}
      </div>
      <div class="table-scroll"><table class="data-table resource-v7-table"><thead><tr><th rowspan="2" class="col-action">Thao tác</th><th rowspan="2" class="col-stt">STT</th><th rowspan="2" class="col-unit">Tên đơn vị</th><th rowspan="2" class="col-agency">Cơ quan quản lý</th><th rowspan="2" class="col-system">Hệ thống</th><th rowspan="2" class="col-docs">Công văn đăng ký</th><th rowspan="2" class="col-asset-docs">Văn bản cấp tài nguyên</th><th rowspan="2" class="col-task-links">Công việc (Task)</th>${appendixGroups.filter(group => group.columns.length).map(({ doc, columns }) => `<th colspan="${columns.length}" class="th-doc-group ${doc.no === '952' ? 'th-doc-952' : doc.no === '4651' ? 'th-doc-4651' : 'th-doc-other'}">${esc(doc.documentType || 'Văn bản')} ${esc(doc.no || '')}</th>`).join('')}</tr><tr>${appendixGroups.flatMap(({ doc, columns, canManageSchema }) => columns.map(c => `<th class="th-sub ${doc.no === '952' ? 'th-sub-952' : doc.no === '4651' ? 'th-sub-4651' : 'th-sub-other'}" title="${esc(c)}"><span class="resource-v7-column-heading">${esc(formatShortHeader(c))}${canManageSchema ? `<button type="button" class="resource-v7-delete-column" data-resource-delete-col-v7="${esc(doc.id)}" data-resource-delete-col-name-v7="${esc(c)}" aria-label="Xóa cột ${esc(c)} khỏi ${esc(doc.no || doc.documentType)}" title="Xóa cột này">${icon('close')}</button>` : ''}</span></th>`)).join('')}</tr></thead><tbody>
        ${flatRows.map((entry, at) => {
      const { record, ri, i, kind, docId, privateIndex, unit, agency, system, stt } = entry;
      const unitSpan = getUnitSpan(at);
      const agencySpan = getAgencySpan(at);
      const systemSpan = getSystemSpan(at);
      const recordSpan = getRecordSpan(at);
      const docsBadge = (record.registeredDocumentIds || []).map(id => {
        const d = state.documents.find(x => x.id === id);
        return d ? `<span class="chip active">${esc(d.no || d.documentType)}</span>` : '';
      }).join('') || '—';
      const assetDocuments = resourceDocumentIdsV7(record).map(resourceDocNumberV7).filter(Boolean).join(', ') || '—';
      const taskCodes = resourceTaskIdsV7(record).map(id => state.tasks.find(task => task.id === id)?.code).filter(Boolean).join(', ') || '—';

      let rowHtml = `<tr data-resource-v7="${record.id}">`;
      if (recordSpan > 0) rowHtml += `<td class="col-action" rowspan="${recordSpan}"><button class="icon-btn-sm" type="button" data-resource-v7-detail="${record.id}" aria-label="Xem chi tiết tài nguyên"><span class="sr-only">Xem chi tiết</span>${icon('eye')}</button></td>`;
      if (kind === 'private') {
        rowHtml += `<td class="col-stt">${esc(stt || (ri + 1))}</td><td class="col-unit"><strong>${resourceCellV7(unit)}</strong></td><td class="col-agency">${resourceCellV7(agency)}</td><td class="col-system"><strong>${resourceCellV7(system)}</strong></td>`;
      } else if (unitSpan > 0) {
        rowHtml += `<td class="col-stt" rowspan="${unitSpan}">${esc(stt || (ri + 1))}</td>`;
        rowHtml += `<td class="col-unit" rowspan="${unitSpan}"><strong>${resourceCellV7(unit)}</strong></td>`;
      }
      if (kind === 'shared' && agencySpan > 0) {
        rowHtml += `<td class="col-agency" rowspan="${agencySpan}">${resourceCellV7(agency)}</td>`;
      }
      if (kind === 'shared' && systemSpan > 0) {
        rowHtml += `<td class="col-system" rowspan="${systemSpan}"><strong>${resourceCellV7(system)}</strong></td>`;
      }
      if (recordSpan > 0) rowHtml += `<td class="col-docs" rowspan="${recordSpan}"><button type="button" class="link-button resource-editable-link" data-resource-link-edit-v7="registered" data-resource-link-record-v7="${record.id}">${docsBadge}<span class="resource-edit-indicator" aria-hidden="true">${icon('edit')}</span></button></td><td class="col-asset-docs" rowspan="${recordSpan}"><button type="button" class="link-button resource-editable-link" data-resource-link-edit-v7="asset" data-resource-link-record-v7="${record.id}">${resourceCellV7(assetDocuments)}<span class="resource-edit-indicator" aria-hidden="true">${icon('edit')}</span></button></td><td class="col-task-links" rowspan="${recordSpan}"><button type="button" class="link-button resource-editable-link" data-resource-link-edit-v7="tasks" data-resource-link-record-v7="${record.id}">${resourceCellV7(taskCodes)}<span class="resource-edit-indicator" aria-hidden="true">${icon('edit')}</span></button></td>`;
      rowHtml += appendixGroups.map(({ doc, columns }) => {
        if (!(record.registeredDocumentIds || []).includes(doc.id) || (kind === 'private' && doc.id !== docId)) return columns.map(() => '<td class="resource-doc-cell">—</td>').join('');
        const values = kind === 'private' ? (record.documentAppendices?.[doc.id]?.privateRows?.[privateIndex] || {}) : (record.documentAppendices?.[doc.id]?.rows?.[i] || {});
        const editKind = kind === 'private' ? 'private' : 'shared', editIndex = kind === 'private' ? privateIndex : i;
        return columns.map(c => { const val = values[c] ?? ''; const tone = doc.no === '952' ? 'cell-952' : doc.no === '4651' ? 'cell-4651' : 'cell-other'; return `<td class="resource-edit-cell resource-doc-cell ${tone}" tabindex="0" data-resource-cell-edit-v7="${record.id}" data-resource-row-edit-v7="${editIndex}" data-resource-kind-edit-v7="${editKind}" data-resource-doc-edit-v7="${doc.id}" data-resource-column-edit-v7="${esc(c)}" title="${esc(c)}: ${esc(val)}">${resourceCellV7(val, c)}<span class="resource-edit-indicator" aria-hidden="true">${icon('edit')}</span></td>` }).join('');
      }).join('');
      rowHtml += `</tr>`;
      return rowHtml;
    }).join('')}
      </tbody></table>${records.length ? '' : '<div class="empty">Chưa có tài nguyên phù hợp. Tạo tài nguyên để bắt đầu.</div>'}</div>
      <div class="table-footer">
        <div class="flex gap">
          <button class="btn text" id="addProjectionColumnBottom">${icon('plus')} Thêm cột</button>
          <button type="button" class="btn text" data-action="add-row"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14"></path></svg>Thêm hàng mới</button>
        </div>
        <span class="small muted">${records.length} hệ thống · Rê chuột để highlight hàng và ô</span>
      </div>
    </section>`;
};

catalogsWorkspace = function () {
  const counts = Object.fromEntries(catalogTypesV7.map(type => [type, state.documents.filter(d => !d.archived && (d.documentType || d.type) === type).length]));
  return head('Danh mục văn bản', '', btn('Thêm văn bản', 'new-catalog-v7', 'plus', 'primary')) +
    `<section class="surface catalog-v7-panel">
      <div class="kanban-tabs catalog-v7-tabs"><button class="kanban-tab-btn ${catalogTypeFilter === 'all' ? 'active' : ''}" data-catalog-type-v7="all">Tất cả (${state.documents.filter(d => !d.archived).length})</button>${catalogTypesV7.map(type => `<button class="kanban-tab-btn ${catalogTypeFilter === type ? 'active' : ''}" data-catalog-type-v7="${esc(type)}">${esc(type)} (${counts[type]})</button>`).join('')}</div>
      <label class="task-search catalog-v7-search">${icon('search')}<input id="catalogSearchV7" value="${esc(catalogSearchV7)}" placeholder="Tìm loại, số, ngày phát hành hoặc trích yếu..."></label>
      <div id="catalogTableV7">${catalogTableV7()}</div>
    </section>`;
};

function catalogTableV7() {
  const list = state.documents.filter(d => !d.archived && (catalogTypeFilter === 'all' || (d.documentType || d.type) === catalogTypeFilter) && `${d.documentType} ${d.no} ${d.date} ${d.summary}`.toLocaleLowerCase('vi').includes(catalogSearchV7.toLocaleLowerCase('vi')));
  return `<div class="table-scroll"><table class="data-table"><thead><tr><th>STT</th><th>Loại văn bản</th><th>Số</th><th>Ngày phát hành</th><th>Trích yếu</th><th></th></tr></thead><tbody>${list.map((d, i) => `<tr data-catalog-v7-row="${d.id}" tabindex="0"><td>${i + 1}</td><td>${esc(d.documentType || d.type)}</td><td><strong>${esc(d.no || '—')}</strong></td><td>${day(d.date)}</td><td>${esc(d.summary || '—')}</td><td><button type="button" class="icon-btn-sm" data-catalog-v7-detail="${d.id}" aria-label="Xem chi tiết">${icon('eye')}</button></td></tr>`).join('')}</tbody></table>${list.length ? '' : '<div class="empty">Chưa có văn bản trong loại này.</div>'}</div>`;
}

function exportResourceExcelV7(records) {
  if (!records.length) return toast('Không có dữ liệu để xuất.');
  if (!window.XLSX?.utils?.aoa_to_sheet) return toast('Thư viện xuất Excel chưa tải được. Vui lòng tải lại trang rồi thử lại.');
  const appendixDocs = state.documents.filter(doc => !doc.archived && (doc.documentType || doc.type) === 'Công văn' && (!resourceFilters.documents?.length || resourceFilters.documents.includes(doc.id)));
  const groups = appendixDocs.map(doc => ({ doc, columns: resourceDocColumnsV7(doc.id, records) }));
  const fixed = ['STT', 'Tên đơn vị', 'Cơ quan quản lý', 'Hệ thống', 'Công văn đăng ký', 'Văn bản cấp tài nguyên', 'Công việc (Task)'];
  const head1 = [...fixed, ...groups.flatMap(({ doc, columns }) => columns.map((_, i) => i === 0 ? `${doc.documentType || 'Văn bản'} ${doc.no || ''}` : ''))];
  const head2 = [...fixed.map(() => ''), ...groups.flatMap(group => group.columns)];
  const data = [head1, head2];
  const merges = [];

  fixed.forEach((_, c) => merges.push({ s: { r: 0, c }, e: { r: 1, c } }));
  let colOffset = fixed.length;
  for (const group of groups) { if (group.columns.length > 1) merges.push({ s: { r: 0, c: colOffset }, e: { r: 0, c: colOffset + group.columns.length - 1 } }); colOffset += group.columns.length }

  // Export one worksheet row for each row shown in the table, including private
  // appendix rows. A private row belongs only to its selected document group.
  const flatRows = records.flatMap((record, recordIndex) => {
    const shared = Array.from({ length: resourceSharedRowCountV7(record) }, (_, rowIndex) => ({ record, recordIndex, rowIndex, kind: 'shared' }));
    const privateRows = groups.flatMap(({ doc }) => (record.registeredDocumentIds || []).includes(doc.id)
      ? (record.documentAppendices?.[doc.id]?.privateRows || []).map((row, privateIndex) => ({ record, recordIndex, rowIndex: privateIndex, privateIndex, privateData: row, docId: doc.id, kind: 'private' }))
      : []);
    return [...shared, ...privateRows];
  });
  flatRows.forEach(({ record, recordIndex, rowIndex, kind, privateData, docId }, flatIndex) => {
    const previous = flatRows[flatIndex - 1];
    const firstForRecord = !previous || previous.record.id !== record.id;
    const firstForUnit = kind === 'private' || !previous || previous.kind !== 'shared' || normV7(previous.record.unit) !== normV7(record.unit);
    const firstForAgency = kind === 'private' || firstForUnit || normV7(previous.record.agency) !== normV7(record.agency);
    const docsStr = firstForRecord ? (record.registeredDocumentIds || [])
      .map(id => state.documents.find(d => d.id === id)?.no || '')
      .filter(Boolean).join(', ') : '';
    const assetDocsStr = firstForRecord ? resourceDocumentIdsV7(record).map(resourceDocNumberV7).filter(Boolean).join(', ') : '';
    const taskCodesStr = firstForRecord ? resourceTaskIdsV7(record).map(id => state.tasks.find(task => task.id === id)?.code).filter(Boolean).join(', ') : '';
    data.push([
      kind === 'private' ? (record.stt || recordIndex + 1) : firstForUnit ? (record.stt || recordIndex + 1) : '',
      kind === 'private' ? (privateData.unit || '') : firstForUnit ? (record.unit || '') : '',
      kind === 'private' ? (privateData.agency || '') : firstForAgency ? (record.agency || '') : '',
      kind === 'private' ? (privateData.system || '') : firstForRecord ? (record.system || '') : '',
      docsStr,
      assetDocsStr,
      taskCodesStr,
      ...groups.flatMap(({ doc, columns }) => {
        if (!(record.registeredDocumentIds || []).includes(doc.id) || (kind === 'private' && doc.id !== docId)) return columns.map(() => '');
        const values = kind === 'private' ? privateData : record.documentAppendices?.[doc.id]?.rows?.[rowIndex] || {};
        return columns.map(column => values[column] ?? '');
      })
    ].map(cleanExcelV7));
  });

  const firstData = 2;
  for (let start = 0; start < flatRows.length;) {
    let end = start + 1;
    while (flatRows[start].kind === 'shared' && end < flatRows.length && flatRows[end].kind === 'shared' && normV7(flatRows[end].record.unit) === normV7(flatRows[start].record.unit)) {
      end++;
    }
    if (end - start > 1) {
      merges.push({ s: { r: firstData + start, c: 0 }, e: { r: firstData + end - 1, c: 0 } });
      merges.push({ s: { r: firstData + start, c: 1 }, e: { r: firstData + end - 1, c: 1 } });
    }
    let a = start;
    while (a < end) {
      let b = a + 1;
      while (b < end && normV7(flatRows[b].record.agency) === normV7(flatRows[a].record.agency)) {
        b++;
      }
      if (b - a > 1) {
        merges.push({ s: { r: firstData + a, c: 2 }, e: { r: firstData + b - 1, c: 2 } });
      }
      a = b;
    }
    start = end;
  }
  for (let start = 0; start < flatRows.length;) {
    const record = flatRows[start].record;
    let recordEnd = start + 1;
    while (recordEnd < flatRows.length && flatRows[recordEnd].record.id === record.id) recordEnd++;
    let sharedEnd = start;
    while (sharedEnd < recordEnd && flatRows[sharedEnd].kind === 'shared') sharedEnd++;
    if (sharedEnd - start > 1) merges.push({ s: { r: firstData + start, c: 3 }, e: { r: firstData + sharedEnd - 1, c: 3 } });
    if (recordEnd - start > 1) {
      for (const col of [4, 5, 6]) merges.push({ s: { r: firstData + start, c: col }, e: { r: firstData + recordEnd - 1, c: col } });
    }
    start = recordEnd;
  }

  const ws = window.XLSX.utils.aoa_to_sheet(data);
  ws['!merges'] = merges;
  ws['!cols'] = Array.from({ length: head2.length }, (_, col) => ({
    wch: Math.min(48, Math.max(12, ...data.map(row => String(row[col] || '').length + 2)))
  }));
  for (let col = 0; col < head2.length; col++) {
    for (let row = 0; row < 2; row++) {
      const cell = ws[window.XLSX.utils.encode_cell({ r: row, c: col })];
      if (cell) cell.s = { font: { bold: true }, alignment: { vertical: 'center', wrapText: true } };
    }
  }
  try {
    const wb = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(wb, ws, 'Nhu cầu Địa phương');
    const now = new Date(), date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    window.XLSX.writeFile(wb, `Nhu_cau_Dia_phuong_${date}.xlsx`);
    toast(`Đã xuất ${flatRows.length} dòng từ ${records.length} hệ thống tài nguyên.`);
  } catch (error) {
    toast('Không thể tạo tệp Excel. Vui lòng thử tải lại trang.');
  }
}

function resourceTableActionV7(kind) {
  const editable = state.resourceRecords.filter(canEditResourceV7);
  const documents = state.documents.filter(doc => !doc.archived && (doc.documentType || doc.type) === 'Công văn');
  const resourceOptions = editable.map(r => `<option value="${esc(r.id)}">${esc(`${r.unit} / ${r.agency} / ${r.system}`)}</option>`).join('');
  const documentOptions = documents.map(d => `<option value="${esc(d.id)}">${esc(`${d.no || d.documentType} · ${d.documentType}`)}</option>`).join('');
  if (kind === 'common-column') return modal('Thêm cột chung', `<label class="field"><span>Nhóm văn bản <b class="required">*</b></span><select name="docId" required>${documentOptions}</select></label>${field('Tên cột *', 'name', '', 'text', true)}`, data => {
    const name = data.name.trim(), docId = data.docId; if (!name || !docId) throw Error('Chọn văn bản và nhập tên cột.');
    state.resourceAppendixSchemas ||= {}; const schema = state.resourceAppendixSchemas[docId] ||= resourceDocColumnsV7(docId); if (schema.includes(name)) throw Error('Cột này đã tồn tại trong nhóm văn bản.'); schema.push(name);
    state.resourceRecords.filter(r => (r.registeredDocumentIds || []).includes(docId)).forEach(r => { const app = r.documentAppendices?.[docId]; if (app) { app.columns ||= []; if (!app.columns.includes(name)) app.columns.push(name); (app.rows || []).forEach(row => row[name] ??= ''); (app.privateRows || []).forEach(row => row[name] ??= '') } });
    done('Đã thêm cột vào nhóm văn bản.');
  }, false, 'Thêm cột');
  if (kind === 'private-column') return modal('Thêm cột riêng', `${field('Tên cột *', 'name', '', 'text', true)}<p class="small muted">Cột hiển thị sau Công văn đăng ký và Văn bản trao đổi; mỗi dòng có giá trị riêng.</p>`, data => {
    const name = data.name.trim(); if (!name) throw Error('Nhập tên cột.'); if (!isResourceDirectColumnV7(name)) throw Error('Tên cột này đã có trong thông tin hệ thống.'); state.resourcePrivateColumns ||= []; if (state.resourcePrivateColumns.includes(name)) throw Error('Tên cột đã tồn tại.');
    state.resourcePrivateColumns.push(name); state.resourceRecords.forEach(r => { r.hardwareColumns ||= ['STT']; if (!r.hardwareColumns.includes(name)) r.hardwareColumns.push(name); (r.hardwareRows || []).forEach(row => row[name] ??= ''); Object.values(r.documentAppendices || {}).forEach(app => (app.privateRows || []).forEach(row => row[name] ??= '')) }); done('Đã thêm cột riêng.');
  }, false, 'Thêm cột');
  if (kind === 'common-row') {
    const units = [...new Set(editable.map(r => r.unit))], selectedUnit = units[0] || '';
    if (!units.length) return toast('Chưa có tài nguyên để thêm hàng chung.');
    const agencies = [...new Set(editable.filter(r => r.unit === selectedUnit).map(r => r.agency))], selectedAgency = agencies[0] || '';
    const systems = [...new Set(editable.filter(r => r.unit === selectedUnit && r.agency === selectedAgency).map(r => r.system))];
    modal('Thêm hàng chung', `<label class="field"><span>Tên đơn vị <b class="required">*</b></span><select name="unit" id="resourceCommonUnitV7" required>${units.map(v => `<option>${esc(v)}</option>`).join('')}</select></label><label class="field"><span>Cơ quan quản lý <b class="required">*</b></span><select name="agency" id="resourceCommonAgencyV7" required>${agencies.map(v => `<option>${esc(v)}</option>`).join('')}</select></label><label class="field"><span>Hệ thống <b class="required">*</b></span><select name="system" id="resourceCommonSystemV7" required>${systems.map(v => `<option>${esc(v)}</option>`).join('')}</select></label><p class="small muted">Thêm một dòng trống vào hệ thống đã chọn và căn hàng giữa các nhóm văn bản đang đăng ký.</p>`, data => {
      const source = editable.find(r => r.unit === data.unit && r.agency === data.agency && r.system === data.system); if (!source) throw Error('Chọn đơn vị, cơ quan quản lý và hệ thống hiện có.'); const draft = V7.clone(source); draft.documentAppendices ||= {}; const count = Math.max(draft.sharedHardwareRowCount || 0, draft.hardwareRows?.length || 0, ...Object.values(draft.documentAppendices).map(app => app.rows?.length || 0)) + 1; draft.sharedHardwareRowCount = count;
      const row = {}; (draft.hardwareColumns || []).forEach((c, i) => row[c] = i === 0 ? String(count) : ''); draft.hardwareRows ||= []; while (draft.hardwareRows.length < count - 1) draft.hardwareRows.push({}); draft.hardwareRows.push(row);
      (draft.registeredDocumentIds || []).forEach(id => { const app = draft.documentAppendices[id] ||= { columns: [], rows: [], privateRows: [] }; app.rows ||= []; while (app.rows.length < count) app.rows.push({}) }); return saveResourceV7(draft);
    }, false, 'Thêm hàng');
    const refreshSystems = () => { const unit = $('#resourceCommonUnitV7')?.value || '', agency = $('#resourceCommonAgencyV7')?.value || '', systemSelect = $('#resourceCommonSystemV7'); if (!systemSelect) return; const values = [...new Set(editable.filter(r => r.unit === unit && r.agency === agency).map(r => r.system))]; systemSelect.innerHTML = values.map(v => `<option>${esc(v)}</option>`).join('') };
    const refreshAgencies = () => { const unit = $('#resourceCommonUnitV7')?.value || '', agencySelect = $('#resourceCommonAgencyV7'); if (!agencySelect) return; const values = [...new Set(editable.filter(r => r.unit === unit).map(r => r.agency))]; agencySelect.innerHTML = values.map(v => `<option>${esc(v)}</option>`).join(''); refreshSystems() };
    $('#resourceCommonUnitV7')?.addEventListener('change', refreshAgencies); $('#resourceCommonAgencyV7')?.addEventListener('change', refreshSystems); return;
  }
  if (kind === 'private-row') {
    if (!documents.length) return toast('Chưa có văn bản đăng ký cho tài nguyên.');
    modal('Thêm hàng riêng', `<label class="field"><span>Tài nguyên cha <b class="required">*</b></span><select name="resourceId" id="resourcePrivateParentV7" required>${resourceOptions}</select></label><label class="field"><span>Nhóm văn bản <b class="required">*</b></span><select name="docId" id="resourcePrivateDocV7" required>${documentOptions}</select></label>${field('Tên đơn vị *', 'unit', '', 'text', true)}${field('Cơ quan quản lý *', 'agency', '', 'text', true)}${field('Hệ thống *', 'system', '', 'text', true)}<p class="small muted">Dòng này chỉ xuất hiện trong nhóm văn bản đã chọn, không gộp vào các dòng chung.</p>`, data => {
      const draft = V7.clone(state.resourceRecords.find(r => r.id === data.resourceId)); if (!draft) throw Error('Chọn tài nguyên có thể chỉnh sửa.'); if (!(draft.registeredDocumentIds || []).includes(data.docId)) throw Error('Văn bản này chưa được đăng ký cho tài nguyên đã chọn.');
      const app = draft.documentAppendices[data.docId] ||= { columns: [], rows: [], privateRows: [] }; app.privateRows ||= []; app.privateRows.push({ unit: data.unit.trim(), agency: data.agency.trim(), system: data.system.trim() }); return saveResourceV7(draft);
    }, true, 'Thêm hàng riêng');
    $('#resourcePrivateParentV7')?.addEventListener('change', e => { const parent = state.resourceRecords.find(r => r.id === e.target.value); const select = $('#resourcePrivateDocV7'); if (!select) return; const ids = parent?.registeredDocumentIds || []; select.innerHTML = ids.map(id => state.documents.find(d => d.id === id)).filter(Boolean).map(d => `<option value="${esc(d.id)}">${esc(`${d.no || d.documentType} · ${d.documentType}`)}</option>`).join('') });
    $('#resourcePrivateParentV7')?.dispatchEvent(new Event('change'));
    return;
  }
}

function resourceDeleteColumnV7(docId, column) {
  const doc = state.documents.find(item => item.id === docId);
  if (!doc || !resourceDocColumnsV7(docId).includes(column)) return;
  const linkedRecords = state.resourceRecords.filter(record => (record.registeredDocumentIds || []).includes(docId));
  if (!admin() && !linkedRecords.every(canEditResourceV7)) return toast('Bạn không có quyền quản lý cột của nhóm công văn này.');
  modal('Xóa cột trong nhóm công văn', `<p>Bạn có chắc muốn xóa cột <strong>${esc(column)}</strong> khỏi công văn <strong>${esc(doc.no || doc.documentType)}</strong>?</p><p class="small muted">Giá trị của cột này trong các dòng phụ lục thuộc công văn sẽ bị xóa. Các nhóm công văn khác không bị ảnh hưởng.</p>`, async () => {
    const backup = V7.clone(state);
    state.resourceAppendixSchemas ||= {};
    state.resourceAppendixSchemas[docId] = resourceDocColumnsV7(docId).filter(name => name !== column);
    state.resourceRecords.forEach(record => {
      const appendix = record.documentAppendices?.[docId];
      if (!appendix) return;
      appendix.columns = (appendix.columns || []).filter(name => name !== column);
      [...(appendix.rows || []), ...(appendix.privateRows || [])].forEach(row => { delete row[column] });
    });
    if (!await persist()) { state = backup; throw Error('Không lưu được cấu trúc cột. Hãy thử lại.'); }
    closeOverlay(); render(); toast(`Đã xóa cột “${column}” khỏi công văn ${doc.no || doc.documentType}.`);
  }, false, 'Xóa cột');
}

function resourceCellEditV7(recordId, rowIndex, kind, docId, column) {
  if (column === '—') return;
  const current = state.resourceRecords.find(r => r.id === recordId); if (!current) return;
  if (!canEditResourceV7(current)) return toast('Bạn không có quyền sửa tài nguyên này.');
  const draft = V7.clone(current), app = docId ? (draft.documentAppendices[docId] ||= { columns: [], rows: [], privateRows: [] }) : null;
  if (app) { app.rows ||= []; app.privateRows ||= [] } else draft.hardwareRows ||= [];
  const rows = docId ? (kind === 'private' ? app.privateRows : app.rows) : draft.hardwareRows;
  rows[rowIndex] ||= {};
  const initial = rows[rowIndex][column] ?? '';
  modal(`Sửa ${column}`, `${field('Giá trị', 'value', initial)}`, data => { rows[rowIndex][column] = data.value; return saveResourceV7(draft) }, false, 'Lưu giá trị');
}

function resourceLinksEditV7(recordId, kind) {
  const resource = state.resourceRecords.find(item => item.id === recordId); if (!resource || !canEditResourceV7(resource)) return toast('Bạn không có quyền sửa liên kết của tài nguyên này.');
  if (kind === 'asset' || kind === 'registered') {
    const type = kind === 'asset' ? 'Văn bản cấp tài nguyên' : 'Công văn', docs = state.documents.filter(doc => !doc.archived && (doc.documentType || doc.type) === type), currentIds = kind === 'asset' ? resourceDocumentIdsV7(resource) : resource.registeredDocumentIds || [];
    modal(`${type} liên kết`, docs.map(doc => `<label class="resource-doc-choice"><input type="checkbox" name="documentIds" value="${esc(doc.id)}" ${currentIds.includes(doc.id) ? 'checked' : ''}> ${esc(doc.no || 'Chưa có số')} · ${esc(doc.summary || '')}</label>`).join('') || `<p class="muted">Chưa có ${type.toLocaleLowerCase('vi')} trong danh mục.</p>`, () => {
      const current = state.resourceRecords.find(item => item.id === recordId); if (!current) throw Error('Không tìm thấy tài nguyên.');
      const draft = V7.clone(current), selected = [...new Set([...$('#editForm').querySelectorAll('[name="documentIds"]')].filter(input => input.checked).map(input => input.value))];
      if (kind === 'asset') { draft.assetDocumentIds = selected; draft.exchangeDocumentIds = selected } else draft.registeredDocumentIds = selected;
      return saveResourceV7(draft);
    });
    return;
  }
  const tasks = state.tasks.filter(task => task.type === 'resource');
  const linked = resourceTaskIdsV7(resource);
  modal('Công việc liên kết', tasks.map(task => `<label class="resource-doc-choice"><input type="checkbox" name="taskIds" value="${esc(task.id)}" ${linked.includes(task.id) ? 'checked' : ''}> <strong>${esc(task.code || 'Chưa có mã')}</strong> · ${esc(task.title)}</label>`).join('') || '<p class="muted">Chưa có task loại Quản lý tài nguyên.</p>', async () => {
    const backup = V7.clone(state);
    try {
    const current = state.resourceRecords.find(item => item.id === recordId); if (!current) throw Error('Không tìm thấy tài nguyên.');
    const selected = [...$('#editForm').querySelectorAll('[name="taskIds"]')].filter(input => input.checked).map(input => input.value), next = new Set(selected), at = V7.now(), currentLinks = resourceTaskIdsV7(current);
    for (const taskId of currentLinks.filter(id => !next.has(id))) { const task = state.tasks.find(item => item.id === taskId); if (task && !M.canEdit(state, me(), task)) throw Error(`Không có quyền bỏ liên kết ${task.code}.`); if (task) { delete task.resourceId; delete task.resourceData; M.revision(task, session, 'Gỡ liên kết tài nguyên', [{ field: 'Tài nguyên', old: current.id, new: '—' }], at) } }
    for (const taskId of selected.filter(id => !currentLinks.includes(id))) {
      const task = state.tasks.find(item => item.id === taskId);
      if (!task || !M.canEdit(state, me(), task)) throw Error(`Không có quyền liên kết ${task?.code || 'task này'}.`);
      const previousResource = state.resourceRecords.find(item => item.id === task.resourceId && item.id !== current.id);
      if (previousResource) {
        if (!canEditResourceV7(previousResource)) throw Error(`Không có quyền chuyển ${task.code} khỏi tài nguyên hiện tại.`);
        previousResource.taskIds = resourceTaskIdsV7(previousResource).filter(id => id !== task.id);
        previousResource.updatedAt = at;
        previousResource.revisions ||= [];
        previousResource.revisions.push({ id: V7.id(), at, actorId: session, action: 'Chuyển công việc sang tài nguyên khác', changes: [{ field: 'Công việc', old: task.code, new: '—' }], data: V7.clone(previousResource) });
        delete task.resourceId; delete task.resourceData;
      }
      task.resourceId = current.id; task.resourceData = V7.clone(current); task.attachments = V7.clone(current.attachments || []); task.customFields = V7.clone(current.customFields || []); saveTaskResourceV7(task);
    }
    current.taskIds = selected; current.revisions ||= []; current.revisions.push({ id: V7.id(), at, actorId: session, action: 'Cập nhật liên kết công việc', changes: [{ field: 'Công việc', old: currentLinks.map(id => state.tasks.find(task => task.id === id)?.code).join(', '), new: selected.map(id => state.tasks.find(task => task.id === id)?.code).join(', ') }], data: V7.clone(current) });
    if (!await persist()) { state = backup; throw Error('Không lưu được liên kết công việc. Hãy thử lại.'); }
    closeOverlay(); render(); toast('Đã cập nhật liên kết công việc.');
    } catch (error) { state = backup; throw error }
  });
}

function catalogFormV7(id = '') {
  const doc = state.documents.find(d => d.id === id) || { documentType: catalogTypeFilter === 'all' ? 'Công văn' : catalogTypeFilter, no: '', date: '', summary: '', agency: '', note: '', files: [] };
  modal(id ? 'Chỉnh sửa văn bản' : 'Thêm văn bản', `
    <label class="field"><span>Loại văn bản <span class="required">*</span></span><select name="documentType" required>${catalogTypesV7.map(t => `<option ${t === (doc.documentType || doc.type) ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></label>
    ${field('Số văn bản (không bắt buộc)', 'no', doc.no)}<label class="field"><span>Ngày phát hành</span><input name="date" type="date" value="${esc(doc.date || '')}"></label>
    <label class="field"><span>Trích yếu</span><textarea name="summary">${esc(doc.summary || '')}</textarea></label>${field('Cơ quan ban hành', 'agency', doc.agency)}
    <label class="field"><span>Ghi chú</span><textarea name="note">${esc(doc.note || '')}</textarea></label>
    <label class="field"><span>Tệp đính kèm</span><input type="file" name="catalogFile" multiple></label>
    ${id ? '<button class="btn danger" type="button" id="deleteCatalogV7">Xóa văn bản</button>' : ''}`,
    async (data, form) => {
      const no = data.no.trim(), type = data.documentType;
      if (no && state.documents.some(d => d.id !== id && !d.archived && (d.documentType || d.type) === type && normV7(d.no) === normV7(no))) throw Error('Đã có văn bản cùng loại và cùng số.');
      const files = [...(doc.files || [])];
      if (form.elements.catalogFile.files.length) files.push(...await storeFiles(form.elements.catalogFile.files));
      if (!form.isConnected) return;
      state.files ||= {}; Object.assign(state.files, taskDraftFiles); taskDraftFiles = {};
      const saved = { ...doc, ...data, no, documentType: type, type, files, id: id || V7.id(), updatedAt: V7.now() };
      delete saved.catalogFile;
      if (id) Object.assign(doc, saved); else state.documents.push(saved);
      state.officials = state.documents; state.docs = state.documents;
      await done('Đã lưu văn bản vào danh mục');
    });
  $('#deleteCatalogV7')?.addEventListener('click', async () => {
    const backup = V7.clone(state);
    const linkedToResource = state.resourceRecords.some(record => [...(record.registeredDocumentIds || []), ...resourceDocumentIdsV7(record)].includes(id));
    const linked = linkedToResource || state.tasks.some(t => t.documentId === id || (t.documentIds || []).includes(id) || (t.officialIds || []).includes(id) || (t.resourceData?.registeredDocumentIds || []).includes(id) || (t.resourceData?.assetDocumentIds || t.resourceData?.exchangeDocumentIds || []).includes(id));
    if (linked) doc.archived = true; else state.documents = state.documents.filter(d => d.id !== id);
    state.officials = state.documents; state.docs = state.documents;
    if (!await persist()) { state = backup; return; }
    closeOverlay(); render();
    toast(linked ? 'Văn bản đã được lưu trữ; liên kết task được giữ.' : 'Đã xóa văn bản.');
  });
}

function catalogDetailV7(id) {
  const d = state.documents.find(item => item.id === id); if (!d) return;
  const resourceTaskIds = state.resourceRecords.filter(record => [...(record.registeredDocumentIds || []), ...resourceDocumentIdsV7(record)].includes(id)).flatMap(resourceTaskIdsV7);
  const linked = visibleTasks().filter(t => resourceTaskIds.includes(t.id) || t.documentId === id || (t.documentIds || []).includes(id) || (t.officialIds || []).includes(id) || (t.resourceData?.registeredDocumentIds || []).includes(id) || (t.resourceData?.assetDocumentIds || t.resourceData?.exchangeDocumentIds || []).includes(id));
  drawer(`${d.documentType || d.type} ${d.no || ''}`, d.summary || 'Thông tin văn bản', `<div class="drawer-body"><dl class="task-meta">${[['Loại văn bản', d.documentType || d.type], ['Số', d.no || '—'], ['Ngày phát hành', day(d.date)], ['Trích yếu', d.summary || '—'], ['Cơ quan ban hành', d.agency || '—'], ['Ghi chú', d.note || '—']].map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>${fileLinks(d.files || [])}<div class="detail-actions"><button class="btn primary" id="editCatalogV7">Chỉnh sửa</button><button class="btn danger" id="removeCatalogV7">Xóa</button></div><h3>Task liên quan (${linked.length})</h3>${taskList(linked)}</div>`);
  $('#editCatalogV7').onclick = () => catalogFormV7(id);
  $('#removeCatalogV7').onclick = () => { $('#editForm')?.remove(); catalogFormV7(id); $('#deleteCatalogV7')?.click() };
  $$('#overlay [data-task]').forEach(row => row.onclick = () => taskDrawer(row.dataset.task));
}

function resourceFormV7(id = '') {
  const current = state.resourceRecords.find(r => r.id === id);
  if (current && !canEditResourceV7(current)) return toast('Bạn không có quyền sửa tài nguyên này.');
  const directColumns = (state.resourcePrivateColumns || []).filter(isResourceDirectColumnV7);
  resourceDraftV7 = V7.clone(current || { id: '', unit: '', agency: '', system: '', level: 'Địa phương', registeredDocumentIds: [], assetDocumentIds: [], exchangeDocumentIds: [], attachments: [], createTask: false, hardwareColumns: ['STT', ...directColumns], hardwareRows: [{ STT: '1', ...Object.fromEntries(directColumns.map(c => [c, ''])) }], sharedHardwareRowCount: 1, documentAppendices: {}, customFields: [], revisions: [], createdBy: '', editors: [], createdAt: '', updatedAt: '' });
  resourceDraftV7.assetDocumentIds ||= resourceDraftV7.exchangeDocumentIds || [];
  resourceDraftV7.sharedHardwareRowCount ||= Math.max(resourceDraftV7.hardwareRows?.length || 1, 1);
  resourceDraftV7.documentAppendices ||= {};
  (resourceDraftV7.registeredDocumentIds || []).forEach(docId => resourceDraftV7.documentAppendices[docId] ||= { columns: [], rows: Array.from({ length: resourceDraftV7.sharedHardwareRowCount }, () => ({})), privateRows: [] });
  drawResourceFormV7();
}

function resourceTaskCardV7(resource) {
  if (!resource.createTask) return '';
  const task = resource.taskDraft ||= { ...emptyTask(), type: 'resource', title: '', description: '', status: 'processing', managementGroupId: admin() ? '' : (M.personGroup(state, session) || ''), assigneeIds: admin() ? [] : [session] };
  task.customTable ||= { name: 'Bảng dữ liệu công việc', columns: ['STT', 'Nội dung'], rows: [] };
  return `<section class="surface resource-create-task-card" id="resourceTaskCardV7"><div class="toolbar"><div><h3>Tạo công việc kèm tài nguyên</h3><p class="small muted">Task và tài nguyên sẽ được lưu cùng lúc.</p></div></div>
    <label class="field"><span>Tiêu đề công việc <b class="required">*</b></span><input name="resourceTaskTitleV7" required value="${esc(task.title)}" placeholder="Nhập tên công việc..."></label>
    <label class="field"><span>Mô tả công việc</span><textarea name="resourceTaskDescriptionV7" rows="3" placeholder="Mô tả yêu cầu công việc...">${esc(task.description)}</textarea></label>
    <div class="form-grid"><label class="field"><span>Trạng thái</span><select name="resourceTaskStatusV7">${Object.entries(WF).map(([key, label]) => `<option value="${key}" ${task.status === key ? 'selected' : ''}>${esc(label)}</option>`).join('')}</select></label>
      <label class="field"><span>Nhóm quản lý <b class="required">*</b></span><select name="resourceTaskGroupV7" ${admin() ? '' : 'disabled'}><option value="">Chọn nhóm quản lý</option>${state.taskGroups.filter(g => !g.archived).map(g => `<option value="${g.id}" ${g.id === task.managementGroupId ? 'selected' : ''}>${esc(g.name)} (${esc(g.code)})</option>`).join('')}</select></label>
      <label class="field"><span>Ngày bắt đầu <b class="required">*</b></span><input type="datetime-local" name="resourceTaskStartV7" required value="${localTime(task.start)}"></label>
      <label class="field"><span>Hạn hoàn thành <b class="required">*</b></span><input type="datetime-local" name="resourceTaskDueV7" required value="${localTime(task.due)}"></label></div>
    <h3>Người được giao <b class="required">*</b></h3>${admin() ? `<div class="assignee-list-modern">${assigneeChoices(task)}</div>` : `<div class="chip active">${esc(me().name)} (Tự giao cho mình)</div>`}
    <div class="resource-task-custom-table"><div class="toolbar"><h3>Bảng dữ liệu tùy chỉnh</h3><div class="flex gap"><button type="button" class="btn" id="resourceTaskAddColV7">${icon('plus')} Thêm cột</button><button type="button" class="btn" id="resourceTaskAddRowV7">${icon('plus')} Thêm dòng</button></div></div><label class="field"><span>Tên bảng</span><input name="resourceTaskTableNameV7" value="${esc(task.customTable?.name || 'Bảng dữ liệu công việc')}"></label><div class="table-scroll">${renderCustomTableEditor(task)}</div></div>
  </section>`;
}

function captureEmbeddedResourceTaskV7(resource) {
  const form = $('#resourceFormV7'), task = resource.taskDraft;
  if (!form || !task || !resource.createTask) return;
  for (const [name, key] of [['resourceTaskTitleV7', 'title'], ['resourceTaskDescriptionV7', 'description'], ['resourceTaskStatusV7', 'status'], ['resourceTaskGroupV7', 'managementGroupId'], ['resourceTaskTableNameV7', 'tableName']]) if (form.elements[name]) {
    if (key === 'tableName') task.customTable.name = form.elements[name].value; else task[key] = form.elements[name].value;
  }
  for (const name of ['resourceTaskStartV7', 'resourceTaskDueV7']) if (form.elements[name]) task[name === 'resourceTaskStartV7' ? 'start' : 'due'] = form.elements[name].value ? new Date(form.elements[name].value).toISOString() : '';
  if (admin()) task.assigneeIds = $$('[data-assignee]').filter(input => input.checked).map(input => input.dataset.assignee);
  else task.assigneeIds = [session];
  $$('[data-custom-cell-row]').forEach(input => { const row = task.customTable.rows[+input.dataset.customCellRow]; if (row) row[input.dataset.customCellCol] = input.value });
}

function quickResourceDocumentV7(data, files = []) {
  const no = String(data.no || '').trim(), type = 'Văn bản cấp tài nguyên';
  const found = no && state.documents.find(doc => !doc.archived && (doc.documentType || doc.type) === type && normV7(doc.no) === normV7(no));
  if (found) { resourceDraftV7.assetDocumentIds = [...new Set([...resourceDocumentIdsV7(resourceDraftV7), found.id])]; return found; }
  const doc = { ...data, no, documentType: type, type, id: V7.id(), files, createdAt: V7.now(), updatedAt: V7.now() };
  resourceDraftV7.pendingAssetDocument = doc;
  resourceDraftV7.assetDocumentIds = [...new Set([...resourceDocumentIdsV7(resourceDraftV7), doc.id])];
  return doc;
}

function drawResourceFormV7() {
  const r = resourceDraftV7, registrationDocs = state.documents.filter(d => !d.archived && (d.documentType || d.type) === 'Công văn'), assetDocs = [...state.documents.filter(d => !d.archived && (d.documentType || d.type) === 'Văn bản cấp tài nguyên'), ...(r.pendingAssetDocument && !state.documents.some(d => d.id === r.pendingAssetDocument.id) ? [r.pendingAssetDocument] : [])];
  const appendixHtml = (r.registeredDocumentIds || []).map(id => {
    const doc = docs.find(item => item.id === id), appendix = r.documentAppendices[id] || { columns: [], rows: [], privateRows: [] };
    const columns = resourceDocColumnsV7(id), rows = Array.from({ length: r.sharedHardwareRowCount }, (_, i) => ({ kind: 'shared', i, data: appendix.rows?.[i] || {} })).concat((appendix.privateRows || []).map((data, i) => ({ kind: 'private', i, data })));
    const rowHtml = rows.map(({ kind, i, data }) => {
      const identity = kind === 'shared' ? 'Chung' : `<div class="resource-private-identity"><input data-appendix-meta-v7="${id}" data-appendix-row-v7="${i}" data-appendix-key-v7="unit" value="${esc(data.unit || r.unit)}" placeholder="Tên đơn vị"><input data-appendix-meta-v7="${id}" data-appendix-row-v7="${i}" data-appendix-key-v7="agency" value="${esc(data.agency || r.agency)}" placeholder="Cơ quan quản lý"><input data-appendix-meta-v7="${id}" data-appendix-row-v7="${i}" data-appendix-key-v7="system" value="${esc(data.system || '')}" placeholder="Hệ thống"></div>`;
      return `<tr><td>${identity}</td>${columns.map(column => `<td><input data-appendix-doc-v7="${id}" data-appendix-kind-v7="${kind}" data-appendix-row-v7="${i}" data-appendix-col-v7="${esc(column)}" value="${esc(data[column] ?? '')}"></td>`).join('')}</tr>`;
    }).join('');
    return `<div class="resource-doc-appendix"><h4>${esc(doc?.no || doc?.documentType || 'Văn bản')}</h4><div class="table-scroll"><table class="dynamic-data-table"><thead><tr><th>Phạm vi dòng / Thông tin hệ thống riêng</th>${columns.map(column => `<th>${esc(column)}</th>`).join('')}</tr></thead><tbody>${rowHtml}</tbody></table></div></div>`;
  }).join('') || '<p class="muted">Chọn ít nhất một văn bản đăng ký để khai báo thông tin theo nhóm.</p>';
  drawer(r.id ? 'Chỉnh sửa tài nguyên' : 'Tạo tài nguyên', 'Có thể lưu tài nguyên độc lập hoặc tạo kèm công việc.', `<form id="resourceFormV7" class="resource-v7-form">
    <section class="surface"><h3>Thông tin hệ thống</h3><div class="form-grid">${field('Tên đơn vị *', 'unit', r.unit, 'text', true)}${field('Cơ quan quản lý *', 'agency', r.agency, 'text', true)}${field('Hệ thống *', 'system', r.system, 'text', true)}<label class="field"><span>Cấp quản lý</span><select name="level"><option ${r.level === 'Địa phương' ? 'selected' : ''}>Địa phương</option><option ${r.level === 'Bộ ngành' ? 'selected' : ''}>Bộ ngành</option></select></label></div></section>
    <section class="surface"><h3>Công văn đăng ký</h3>${registrationDocs.map(d => `<label class="resource-doc-choice"><input type="checkbox" data-resource-doc="registeredDocumentIds" value="${d.id}" ${(r.registeredDocumentIds || []).includes(d.id) ? 'checked' : ''}> Công văn · ${esc(d.no || 'Chưa có số')}</label>`).join('') || '<p class="muted">Chưa có công văn trong danh mục.</p>'}</section>
    <section class="surface"><div class="toolbar"><h3>Văn bản cấp tài nguyên</h3><span class="grow"></span><button class="btn" type="button" id="resourceQuickDocumentToggleV7">${icon('plus')} Tạo nhanh</button></div>${assetDocs.map(d => `<label class="resource-doc-choice"><input type="checkbox" data-resource-doc="assetDocumentIds" value="${d.id}" ${(resourceDocumentIdsV7(r)).includes(d.id) ? 'checked' : ''}> ${esc(d.no || 'Chưa có số')} · ${esc(d.summary || 'Văn bản cấp tài nguyên')}</label>`).join('') || '<p class="muted">Chưa có văn bản cấp tài nguyên trong danh mục.</p>'}
      <div class="resource-quick-document-v7" id="resourceQuickDocumentV7" hidden><div class="form-grid"><label class="field"><span>Số văn bản</span><input name="quickDocNoV7"></label><label class="field"><span>Ngày phát hành</span><input name="quickDocDateV7" type="date"></label><label class="field"><span>Cơ quan ban hành</span><input name="quickDocAgencyV7"></label><label class="field"><span>Ghi chú</span><input name="quickDocNoteV7"></label></div><label class="field"><span>Trích yếu</span><textarea name="quickDocSummaryV7"></textarea></label><label class="field"><span>Tệp đính kèm</span><input type="file" id="quickDocFilesV7" multiple></label><button class="btn" type="button" id="resourceQuickDocumentSaveV7">Lưu văn bản vào danh mục và liên kết</button></div></section>
    <section class="surface"><div class="toolbar"><h3>Tệp đính kèm tài nguyên</h3><span class="grow"></span><label class="btn">${icon('upload')} Tải tệp lên<input id="resourceFilesV7" type="file" multiple hidden></label></div>${fileLinks(r.attachments || []) || '<p class="muted">Chưa có tệp đính kèm.</p>'}</section>
    <section class="surface"><div class="toolbar"><h3>Thông tin theo nhóm văn bản</h3><span class="small muted">Cột con chỉ hiển thị trong nhóm số văn bản tương ứng</span></div><p class="small muted">Dùng các nút Thêm cột / Thêm hàng tại bảng Dữ liệu tài nguyên để mở rộng cấu trúc dùng chung.</p>${appendixHtml}</section>
    <section class="surface"><div class="toolbar"><h3>Trường tùy chỉnh</h3><span class="grow"></span><button class="btn" type="button" id="resourceAddFieldV7">+ Thêm trường</button></div>${r.customFields.map((f, i) => `<div class="custom-row"><input data-resource-custom-name-v7="${i}" placeholder="Tên trường" value="${esc(f.name)}"><input data-resource-custom-value-v7="${i}" placeholder="Giá trị" value="${esc(f.value)}"><button type="button" data-resource-custom-del-v7="${i}">×</button></div>`).join('')}</section>
    <section class="surface"><label class="resource-create-task-toggle"><input type="checkbox" name="createTaskV7" ${r.createTask ? 'checked' : ''}> Tạo kèm công việc</label><p class="small muted">Khi bật, tài nguyên và task sẽ được lưu cùng lúc.</p>${resourceTaskCardV7(r)}</section>
    <p class="error" id="resourceErrorV7" role="alert"></p><div class="modal-foot"><button type="button" class="btn" id="resourceCancelV7">Hủy</button><button type="submit" class="btn primary">Lưu tài nguyên</button></div></form>`, true);
  const form = $('#resourceFormV7');
  const capture = () => {
    for (const key of ['unit', 'agency', 'system', 'level']) if (form.elements[key]) r[key] = form.elements[key].value;
    $$('[data-resource-doc]').forEach(c => { const key = c.dataset.resourceDoc; r[key] ||= []; r[key] = r[key].filter(x => x !== c.value); if (c.checked) r[key].push(c.value) });
    r.exchangeDocumentIds = r.assetDocumentIds || [];
    captureEmbeddedResourceTaskV7(r);
    r.documentAppendices ||= {}; r.sharedHardwareRowCount ||= 1;
    (r.registeredDocumentIds || []).forEach(id => { const app = r.documentAppendices[id] ||= { columns: [], rows: [], privateRows: [] }; app.rows ||= []; while (app.rows.length < r.sharedHardwareRowCount) app.rows.push({}); app.privateRows ||= [] });
    $$('[data-resource-cell-v7]').forEach(input => { let row = r.hardwareRows[+input.dataset.resourceCellV7], col = r.hardwareColumns[+input.dataset.colV7]; if (row) row[col] = input.value });
    $$('[data-appendix-doc-v7]').forEach(input => { const app = r.documentAppendices[input.dataset.appendixDocV7]; if (!app) return; const rows = input.dataset.appendixKindV7 === 'shared' ? app.rows : app.privateRows; rows[+input.dataset.appendixRowV7] ||= {}; rows[+input.dataset.appendixRowV7][input.dataset.appendixColV7] = input.value });
    $$('[data-appendix-meta-v7]').forEach(input => { const row = r.documentAppendices[input.dataset.appendixMetaV7]?.privateRows?.[+input.dataset.appendixRowV7]; if (row) row[input.dataset.appendixKeyV7] = input.value });
    $$('[data-resource-col-v7]').forEach(input => { const i = +input.dataset.resourceColV7, old = r.hardwareColumns[i], next = input.value.trim(); if (next && old !== next) { r.hardwareColumns[i] = next; r.hardwareRows.forEach(row => { row[next] = row[old] ?? ''; if (old !== 'STT') delete row[old] }) } });
    $$('[data-resource-custom-name-v7]').forEach(e => r.customFields[+e.dataset.resourceCustomNameV7].name = e.value);
    $$('[data-resource-custom-value-v7]').forEach(e => r.customFields[+e.dataset.resourceCustomValueV7].value = e.value);
  };

  form.oninput = capture; form.onchange = e => { capture(); if (e.target.matches('[data-resource-doc], [name="createTaskV7"]')) { if (e.target.name === 'createTaskV7') r.createTask = e.target.checked; drawResourceFormV7() } };
  form.onsubmit = async e => { e.preventDefault(); capture(); try { await saveResourceWithTaskV7(r) } catch (err) { $('#resourceErrorV7').textContent = err.message } };
  $('#resourceCancelV7').onclick = closeOverlay;
  $('#resourceFilesV7')?.addEventListener('change', async e => { try { r.attachments.push(...await storeFiles(e.target.files)); drawResourceFormV7() } catch (err) { $('#resourceErrorV7').textContent = err.message } });
  $('#resourceAddFieldV7').onclick = () => { capture(); r.customFields.push({ name: '', value: '' }); drawResourceFormV7() };
  $('#resourceTaskAddColV7')?.addEventListener('click', () => { capture(); const name = prompt('Nhập tên cột mới:'); if (name?.trim() && !r.taskDraft.customTable.columns.includes(name.trim())) { r.taskDraft.customTable.columns.push(name.trim()); r.taskDraft.customTable.rows.forEach(row => row[name.trim()] = ''); drawResourceFormV7() } });
  $('#resourceTaskAddRowV7')?.addEventListener('click', () => { capture(); const row = {}; r.taskDraft.customTable.columns.forEach((col, i) => row[col] = i ? '' : String(r.taskDraft.customTable.rows.length + 1)); r.taskDraft.customTable.rows.push(row); drawResourceFormV7() });
  $$('[data-del-custom-col]').forEach(button => button.onclick = () => { capture(); const index = +button.dataset.delCustomCol, column = r.taskDraft.customTable.columns[index]; r.taskDraft.customTable.columns.splice(index, 1); r.taskDraft.customTable.rows.forEach(row => delete row[column]); drawResourceFormV7() });
  $$('[data-del-custom-row]').forEach(button => button.onclick = () => { capture(); r.taskDraft.customTable.rows.splice(+button.dataset.delCustomRow, 1); drawResourceFormV7() });
  $('#resourceQuickDocumentToggleV7')?.addEventListener('click', () => { const panel = $('#resourceQuickDocumentV7'); panel.hidden = !panel.hidden });
  $('#resourceQuickDocumentSaveV7')?.addEventListener('click', async () => {
    try {
      capture(); const quick = $('#resourceFormV7'), files = quick.elements.quickDocFilesV7.files.length ? await storeFiles(quick.elements.quickDocFilesV7.files) : [];
      const doc = quickResourceDocumentV7({ no: quick.elements.quickDocNoV7.value, date: quick.elements.quickDocDateV7.value, summary: quick.elements.quickDocSummaryV7.value, agency: quick.elements.quickDocAgencyV7.value, note: quick.elements.quickDocNoteV7.value }, files);
      r.pendingAssetDocument = doc; drawResourceFormV7(); toast('Đã liên kết văn bản cấp tài nguyên. Văn bản sẽ được lưu cùng tài nguyên.');
    } catch (err) { $('#resourceErrorV7').textContent = err.message }
  });
  $$('[data-resource-custom-del-v7]').forEach(b => b.onclick = () => { capture(); r.customFields.splice(+b.dataset.resourceCustomDelV7, 1); drawResourceFormV7() });
}

async function saveResourceV7(draft, { defer = false, allowTaskCreator = false } = {}) {
  const stateBackup = defer ? null : V7.clone(state);
  const stagedFiles = { ...taskDraftFiles }, stagedDocuments = V7.clone(taskDraftDocuments);
  const pendingAssetDocument = draft.pendingAssetDocument;
  draft = V7.clone(draft);
  delete draft.createTask; delete draft.taskDraft; delete draft.pendingAssetDocument;
  draft.assetDocumentIds ||= draft.exchangeDocumentIds || [];
  if (!draft.unit.trim() || !draft.agency.trim() || !draft.system.trim()) throw Error('Nhập tên đơn vị, cơ quan quản lý và hệ thống.');
  if (Object.values(draft.documentAppendices || {}).some(app => (app.privateRows || []).some(row => !row.unit?.trim() || !row.agency?.trim() || !row.system?.trim()))) throw Error('Nhập đủ tên đơn vị, cơ quan quản lý và hệ thống cho từng dòng riêng.');
  const key = [draft.unit, draft.agency, draft.system].map(normV7).join('|');
  const existing = state.resourceRecords.find(item => item.id !== draft.id && [item.unit, item.agency, item.system].map(normV7).join('|') === key);
  const current = state.resourceRecords.find(item => item.id === draft.id);
  let target = current || existing;
  const old = target ? V7.clone(target) : null;
  if (target && !canEditResourceV7(target) && !allowTaskCreator) throw Error('Bạn không có quyền sửa tài nguyên này.');
  const at = V7.now(), actor = session;
  if (target) {
    const revisions = target.revisions || [], createdBy = target.createdBy || actor, createdAt = target.createdAt || at;
    const appendices = current ? draft.documentAppendices : { ...(target.documentAppendices || {}) };
    if (!current) for (const [docId, app] of Object.entries(draft.documentAppendices || {})) { const prior = appendices[docId] || { columns: [], rows: [], privateRows: [] }; appendices[docId] = { columns: [...new Set([...(prior.columns || []), ...(app.columns || [])])], rows: Array.from({ length: Math.max(prior.rows?.length || 0, app.rows?.length || 0) }, (_, i) => ({ ...prior.rows?.[i], ...app.rows?.[i] })), privateRows: [...(prior.privateRows || []), ...(app.privateRows || [])] } }
    Object.assign(target, draft, { id: target.id, createdBy, createdAt, revisions, registeredDocumentIds: current ? draft.registeredDocumentIds : [...new Set([...(target.registeredDocumentIds || []), ...draft.registeredDocumentIds])], assetDocumentIds: current ? (draft.assetDocumentIds || []) : [...new Set([...resourceDocumentIdsV7(target), ...(draft.assetDocumentIds || [])])], exchangeDocumentIds: current ? (draft.assetDocumentIds || []) : [...new Set([...resourceDocumentIdsV7(target), ...(draft.assetDocumentIds || [])])], taskIds: resourceTaskIdsV7(target), attachments: current ? draft.attachments : [...new Map([...(target.attachments || []), ...draft.attachments].map(file => [file.id, file])).values()], hardwareRows: current ? draft.hardwareRows : [...(target.hardwareRows || []), ...draft.hardwareRows], hardwareColumns: [...new Set([...(target.hardwareColumns || []), ...draft.hardwareColumns])], sharedHardwareRowCount: Math.max(target.sharedHardwareRowCount || 0, draft.sharedHardwareRowCount || 0), documentAppendices: appendices, customFields: current ? draft.customFields : [...(target.customFields || []), ...draft.customFields], updatedAt: at });
    target.editors = [...new Set([...(target.editors || []), actor])];
    target.revisions ||= [];
    const snapshot = V7.clone(target); delete snapshot.revisions;
    const changes = Object.keys(target).filter(key => key !== 'revisions' && JSON.stringify(old?.[key]) !== JSON.stringify(target[key])).map(field => ({ field, old: old?.[field], new: target[field] }));
    target.revisions.push({ id: V7.id(), at, actorId: actor, action: 'Cập nhật tài nguyên', changes, data: snapshot });
  } else {
    Object.assign(draft, { id: V7.id(), createdBy: actor, editors: [actor], createdAt: at, updatedAt: at, revisions: [{ id: V7.id(), at, actorId: actor, action: 'Tạo tài nguyên', changes: [], data: V7.clone(draft) }] });
    state.resourceRecords.push(draft);
    target = draft;
  }
  if (pendingAssetDocument && !state.documents.some(doc => doc.id === pendingAssetDocument.id)) {
    const pending = pendingAssetDocument, duplicate = pending.no && state.documents.find(doc => !doc.archived && (doc.documentType || doc.type) === pending.documentType && normV7(doc.no) === normV7(pending.no));
    if (duplicate) draft.assetDocumentIds = [...new Set([...(draft.assetDocumentIds || []), duplicate.id])];
    else state.documents.push(pending);
    target.assetDocumentIds = [...new Set([...(target.assetDocumentIds || []), duplicate?.id || pending.id])];
    target.exchangeDocumentIds = target.assetDocumentIds;
    state.officials = state.documents; state.docs = state.documents;
  }
  for (const linked of linkedResourceTasksV7(target)) {
    if (linked.type !== 'resource') continue;
    const previous = JSON.stringify({ attachments: linked.attachments || [], customFields: linked.customFields || [], resourceData: linked.resourceData || {} });
    linked.attachments = V7.clone(target.attachments || []); linked.customFields = V7.clone(target.customFields || []); linked.resourceData = V7.clone(target);
    if (previous !== JSON.stringify({ attachments: linked.attachments, customFields: linked.customFields, resourceData: linked.resourceData })) M.revision(linked, actor, 'Cập nhật thông tin dùng chung tài nguyên', [{ field: 'Thông tin tài nguyên / tệp / trường tùy chỉnh', old: JSON.parse(previous), new: { attachments: linked.attachments, customFields: linked.customFields, resourceData: linked.resourceData } }], at);
  }
  if (defer) return target;
  commitTaskAttachments();
  const saved = await persist();
  if (saved === false) {
    state = stateBackup;
    Object.assign(taskDraftFiles, stagedFiles);
    Object.assign(taskDraftDocuments, stagedDocuments);
    throw Error('Không lưu được tài nguyên. Hãy kiểm tra kết nối rồi thử lưu lại.');
  }
  resourceDraftV7 = null; closeOverlay(); render(); toast(existing ? 'Đã gộp thông tin vào hệ thống cùng đơn vị và cơ quan quản lý.' : 'Đã lưu tài nguyên.');
  return target;
}

async function saveResourceWithTaskV7(draft) {
  const backup = V7.clone(state);
  const stagedFiles = { ...taskDraftFiles }, stagedDocuments = V7.clone(taskDraftDocuments);
  try {
    if (!draft.createTask) return saveResourceV7(draft);
    captureEmbeddedResourceTaskV7(draft);
    const task = draft.taskDraft;
    if (!task?.title?.trim()) throw Error('Nhập tiêu đề công việc đi kèm.');
    if (!task.managementGroupId) throw Error('Chọn nhóm quản lý cho công việc đi kèm.');
    task.type = 'resource'; task.resourceData = V7.clone(draft); task.attachments = V7.clone(draft.attachments || []); task.customFields = V7.clone(draft.customFields || []);
    const resource = await saveResourceV7(draft, { defer: true, allowTaskCreator: true });
    task.resourceId = resource.id;
    task.resourceData = V7.clone(resource);
    const savedTask = M.saveTask(state, me(), task);
    saveTaskResourceV7(savedTask);
    if (draft.pendingAssetDocument && !state.documents.some(doc => doc.id === draft.pendingAssetDocument.id)) state.documents.push(draft.pendingAssetDocument);
    state.officials = state.documents; state.docs = state.documents;
    commitTaskAttachments();
    const saved = await persist();
    if (saved === false) { state = backup; throw Error('Không lưu được tài nguyên và công việc đi kèm. Hãy kiểm tra kết nối rồi thử lưu lại.'); }
    resourceDraftV7 = null; closeOverlay(); render(); toast('Đã lưu tài nguyên và công việc đi kèm.');
    return resource;
  } catch (error) {
    state = backup;
    Object.assign(taskDraftFiles, stagedFiles);
    Object.assign(taskDraftDocuments, stagedDocuments);
    throw error;
  }
}

function resourceDetailV7(id, revisionId = '') {
  const r = state.resourceRecords.find(item => String(item.id) === String(id));
  if (!r) return toast('Không tìm thấy tài nguyên để xem chi tiết.');
  const linkedTasks = linkedResourceTasksV7(r);
  const history = [
    ...(r.revisions || []).map(item => ({ ...item, kind: 'resource', key: `resource:${item.id}` })),
    ...linkedTasks.flatMap(task => (task.revisions || []).map(item => ({ ...item, kind: 'task', taskId: task.id, taskCode: task.code, key: `task:${task.id}:${item.id}` })))
  ].sort((a, b) => String(b.at).localeCompare(String(a.at)));
  const selected = history.find(item => item.key === revisionId || item.id === revisionId) || history[0];
  const snap = selected?.kind === 'task' ? selected.data : selected?.data || r;
  const docAppendices = (snap.registeredDocumentIds || []).map(docId => { const d = state.documents.find(x => x.id === docId); const app = snap.documentAppendices?.[docId]; if (!d || !app) return ''; const cols = resourceDocColumnsV7(docId, [snap]); const rows = [...(app.rows || []).map((row, i) => ({ scope: `Dòng chung ${i + 1}`, row })), ...(app.privateRows || []).map((row, i) => ({ scope: `Dòng riêng ${i + 1} · ${row.unit || ''} / ${row.agency || ''} / ${row.system || ''}`, row }))]; return `<section class="surface resource-v7-detail-section resource-v7-history-appendix"><h3>${esc(d.no || d.documentType)}</h3><div class="table-scroll"><table class="data-table"><thead><tr><th>Phạm vi / hệ thống</th>${cols.map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${rows.map(({ scope, row }) => `<tr><td>${esc(scope)}</td>${cols.map(c => `<td>${esc(row[c] || '—')}</td>`).join('')}</tr>`).join('')}</tbody></table></div></section>` }).join('');
  const values = selected?.kind === 'task'
    ? [['Mã task', snap.code], ['Tiêu đề', snap.title], ['Trạng thái', WF[snap.status] || snap.status], ['Người được giao', (snap.assigneeIds || []).map(userName).join(', ') || '—'], ['Ngày bắt đầu', snap.start ? fmt(snap.start) : '—'], ['Hạn hoàn thành', snap.due ? fmt(snap.due) : '—'], ['Mô tả', snap.description || '—']]
    : [['Tên đơn vị', snap.unit], ['Cơ quan quản lý', snap.agency], ['Hệ thống', snap.system], ['Cấp quản lý', snap.level], ['Công văn đăng ký', (snap.registeredDocumentIds || []).map(id => state.documents.find(d => d.id === id)?.no || '').filter(Boolean).join(', ') || '—'], ['Văn bản cấp tài nguyên', resourceDocumentIdsV7(snap).map(resourceDocNumberV7).filter(Boolean).join(', ') || '—']];
  drawer(`${r.unit} / ${r.agency}`, 'Thông tin tài nguyên', `<div class="resource-v7-detail"><aside class="surface resource-v7-timeline"><h3>Lịch sử cập nhật</h3>${history.map(h => `<button class="timeline-btn ${selected?.key === h.key ? 'selected' : ''}" data-resource-history-v7="${esc(h.key)}"><span class="small">${h.kind === 'task' ? 'Công việc' : 'Tài nguyên'}</span><strong>${esc(h.kind === 'task' ? `${h.taskCode} · ${h.action}` : h.action)}</strong><small>${fmt(h.at)} · ${esc(userName(h.actorId))}</small></button>`).join('') || '<p class="muted">Chưa có lịch sử.</p>'}</aside><section class="surface resource-v7-snapshot"><div class="resource-v7-detail-heading"><h2>${esc(selected?.kind === 'task' ? (snap.title || selected.taskCode) : snap.system)}</h2>${selected?.kind === 'task' ? `<button type="button" class="btn" data-resource-task-v7="${esc(selected.taskId)}">Mở chi tiết task</button>` : ''}</div><section class="surface resource-v7-detail-section"><dl class="task-meta">${values.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v || '—')}</dd></div>`).join('')}</dl></section>${selected?.kind === 'task' ? `<section class="surface resource-v7-detail-section"><h3>Thay đổi trong mốc này</h3>${(selected.changes || []).map(change => `<div class="detail-pair"><span>${esc(change.field)}</span><strong>${esc(JSON.stringify(change.new ?? '—'))}</strong></div>`).join('') || '<p class="muted">Không có chi tiết trường thay đổi.</p>'}</section>` : `${docAppendices}<section class="surface resource-v7-detail-section"><h3>Tệp đính kèm & thông tin bổ sung</h3><div class="resource-v7-attachments">${fileLinks(snap.attachments || []) || '<p class="muted">Chưa có tệp đính kèm.</p>'}</div><div class="resource-v7-custom-fields">${(snap.customFields || []).map(f => `<div class="detail-pair"><span>${esc(f.name || 'Trường')}</span><strong>${esc(f.value || '—')}</strong></div>`).join('') || '<p class="muted">Chưa có trường bổ sung.</p>'}</div></section>`}<section class="surface resource-v7-detail-section resource-v7-linked-tasks"><h3>Công việc liên kết (${linkedTasks.length})</h3>${linkedTasks.map(task => `<button type="button" class="timeline-btn" data-resource-task-v7="${esc(task.id)}"><strong>${esc(task.code || task.title)}</strong><small>${esc(task.title)} · ${esc(WF[task.status] || task.status)}</small></button>`).join('') || '<p class="muted">Chưa có công việc liên kết.</p>'}</section><p class="small muted">${selected ? `${esc(selected.action)} bởi ${esc(userName(selected.actorId))} · ${fmt(selected.at)}` : ''}</p><div class="detail-actions">${canEditResourceV7(r) ? '<button class="btn primary" id="editResourceV7">Chỉnh sửa</button><button class="btn danger" id="deleteResourceV7">Xóa tài nguyên</button>' : ''}</div></section></div>`, true);
  $('#overlay .drawer')?.classList.add('resource-v7-drawer');
  $$('[data-resource-history-v7]').forEach(b => b.onclick = () => resourceDetailV7(id, b.dataset.resourceHistoryV7));
  $('#editResourceV7')?.addEventListener('click', () => resourceFormV7(id));
  $('#deleteResourceV7')?.addEventListener('click', async () => {
    const backup = V7.clone(state), at = V7.now();
    linkedTasks.forEach(task => { if (task.resourceId === id) { delete task.resourceId; delete task.resourceData; M.revision(task, session, 'Gỡ liên kết do xóa tài nguyên', [{ field: 'Tài nguyên', old: id, new: '—' }], at) } });
    state.resourceRecords = state.resourceRecords.filter(x => x.id !== id);
    if (!await persist()) { state = backup; return; }
    closeOverlay(); render(); toast('Đã xóa tài nguyên và giữ nguyên các task liên quan.');
  });
}

function bindV7() {
  $$('[data-kanban-tab]').forEach(btn => btn.onclick = () => { activeTaskFilter.bucket = btn.dataset.kanbanTab === 'all' ? '' : btn.dataset.kanbanTab; render() });
  $$('[data-bucket]').forEach(btn => btn.onclick = () => { activeTaskFilter.bucket = btn.dataset.bucket; page = 'tasks'; render() });
  $$('[data-catalog-type-v7]').forEach(btn => btn.onclick = () => { catalogTypeFilter = btn.dataset.catalogTypeV7; render() });
  $('#catalogSearchV7')?.addEventListener('input', e => { catalogSearchV7 = e.target.value; $('#catalogTableV7').innerHTML = catalogTableV7(); bindCatalogV7() });
  $$('[data-catalog-v7-new]').forEach(btn => btn.onclick = () => catalogFormV7());
  $('#resourceSearchV7')?.addEventListener('input', e => { resourceSearchV7 = e.target.value; render() });
  $('#resourceDocumentFilterV7')?.addEventListener('change', e => { resourceFilters.documents = e.target.value ? [e.target.value] : []; render() });
  $('#resourceSelfV7')?.addEventListener('change', e => { resourceFilters.self = e.target.value === 'mine'; render() });
  $('#resourceAddCommonColV7')?.addEventListener('click', () => resourceTableActionV7('common-column'));
  $('#resourceAddPrivateColV7')?.addEventListener('click', () => resourceTableActionV7('private-column'));
  $('#resourceAddCommonRowV7')?.addEventListener('click', () => resourceTableActionV7('common-row'));
  $('#resourceAddPrivateRowV7')?.addEventListener('click', () => resourceTableActionV7('private-row'));
  const addCol = () => resourceTableActionV7('common-column');
  $('#addProjectionColumnBottom')?.addEventListener('click', addCol);
  $('#exportResourceExcelV7')?.addEventListener('click', () => {
    const recs = state.resourceRecords.filter(record => {
      if (resourceFilters.self && !linkedResourceTasksV7(record).some(task => (task.assigneeIds || []).includes(session))) return false;
      if (resourceFilters.documents?.length && !resourceFilters.documents.some(id => [...(record.registeredDocumentIds || []), ...resourceDocumentIdsV7(record)].includes(id))) return false;
      return !resourceSearchV7 || `${record.unit} ${record.agency} ${record.system}`.toLocaleLowerCase('vi').includes(resourceSearchV7.toLocaleLowerCase('vi'));
    }).sort((a, b) => a.unit.localeCompare(b.unit, 'vi') || a.agency.localeCompare(b.agency, 'vi') || a.system.localeCompare(b.system, 'vi'));
    exportResourceExcelV7(recs);
  });
  $('#clearResourceV7')?.addEventListener('click', () => { resourceSearchV7 = ''; resourceFilters = { documents: [], groups: [], levels: [], month: '', self: false }; render() });
  $$('[data-resource-delete-col-v7]').forEach(btn => btn.onclick = e => { e.stopPropagation(); resourceDeleteColumnV7(btn.dataset.resourceDeleteColV7, btn.dataset.resourceDeleteColNameV7) });
  $$('[data-resource-link-edit-v7]').forEach(btn => btn.onclick = e => { e.stopPropagation(); resourceLinksEditV7(btn.dataset.resourceLinkRecordV7, btn.dataset.resourceLinkEditV7) });
  $$('[data-resource-task-v7]').forEach(btn => btn.onclick = e => { e.stopPropagation(); taskDrawer(btn.dataset.resourceTaskV7) });
  $$('[data-resource-cell-edit-v7]').forEach(cell => {
    const edit = e => { e.stopPropagation(); resourceCellEditV7(cell.dataset.resourceCellEditV7, +cell.dataset.resourceRowEditV7, cell.dataset.resourceKindEditV7, cell.dataset.resourceDocEditV7 || '', cell.dataset.resourceColumnEditV7) };
    cell.onclick = edit; cell.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); edit(e) } };
  });
}

function bindCatalogV7() {
  $$('[data-catalog-v7-row]').forEach(row => {
    row.onclick = e => { if (!e.target.closest('button')) catalogDetailV7(row.dataset.catalogV7Row) };
    row.onkeydown = e => { if ((e.key === 'Enter' || e.key === ' ') && !e.target.closest('button')) { e.preventDefault(); catalogDetailV7(row.dataset.catalogV7Row) } };
  });
  $$('[data-catalog-v7-detail]').forEach(btn => btn.onclick = e => { e.stopPropagation(); catalogDetailV7(btn.dataset.catalogV7Detail) });
}

const bindBeforeV7 = bindWorkspace;
bindWorkspace = function () {
  try {
    if (page !== 'resources' && page !== 'catalog' && typeof bindBeforeV7 === 'function') {
      bindBeforeV7();
    }
  } catch (err) {
    console.warn('Legacy bind warning:', err);
  }
  bindV7();
  bindCatalogV7();
};
const actionBeforeV7 = action;
action = function (name) {
  if (name === 'new-resource' || name === 'add-row') return resourceFormV7();
  if (name === 'new-catalog-v7') return catalogFormV7();
  if (name === 'new-task') return taskForm();
  return actionBeforeV7(name);
};

// Delegate this action so dynamic table rerenders/rowspans cannot leave an unbound eye button.
document.addEventListener('click', event => {
  const button = event.target.closest('[data-resource-v7-detail]');
  if (!button) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  resourceDetailV7(button.dataset.resourceV7Detail);
});

render();
