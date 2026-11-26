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
const resourceRowsV7 = record => record.hardwareRows?.length ? record.hardwareRows : [{ STT: '1' }];
const resourceDisplayRowsV7 = (record, docIds) => {
  const sharedCount = Math.max(resourceRowsV7(record).length, record.sharedHardwareRowCount || 0, ...docIds.map(id => record.documentAppendices?.[id]?.rows?.length || 0), 1);
  return [...Array.from({ length: sharedCount }, (_, i) => ({ i, kind: 'shared' })), ...docIds.flatMap(id => (record.documentAppendices?.[id]?.privateRows || []).map((_, i) => ({ i, kind: 'private', docId: id })))];
};
const canEditResourceV7 = record => admin() || record.createdBy === session || (record.editors || []).includes(session);
const cleanExcelV7 = value => String(value ?? '').trim().replace(/^—$/, '');
const isResourceDirectColumnV7 = column => !['STT', 'Tên tài nguyên', 'Văn bản nguồn'].includes(column);
const resourceDocNumberV7 = id => state.documents.find(doc => doc.id === id)?.no || '';
const defaultResourceDocColumnsV7 = id => {
  const no = resourceDocNumberV7(id);
  if (no === '952' && typeof LOCAL_DEMAND_COLUMNS_952 !== 'undefined') return LOCAL_DEMAND_COLUMNS_952;
  if (no === '4651' && typeof LOCAL_DEMAND_COLUMNS_4651 !== 'undefined') return LOCAL_DEMAND_COLUMNS_4651;
  return state.resourceAppendixSchemas?.[id] || state.schemas?.[no] || schemas?.[no] || [];
};
const resourceDocColumnsV7 = (id, records = state.resourceRecords || []) => [...new Set([...defaultResourceDocColumnsV7(id), ...records.flatMap(r => r.documentAppendices?.[id]?.columns || [])])];

function migrateResourceColumnsV7() {
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
  }
  let doc4651 = state.documents.find(d => normV7(d.no) === '4651');
  if (!doc4651) {
    doc4651 = { id: uid(), no: '4651', date: '2025-09-20', summary: 'Rà soát, bổ sung nhu cầu tài nguyên và phương án bảo đảm an toàn thông tin', documentType: 'Công văn', type: 'Công văn', agency: 'Cục C12', files: [] };
    state.documents.push(doc4651);
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

  // Seed full dataset from LOCAL_DEMAND_DATA if resourceRecords has <= 5 mock items
  if (typeof LOCAL_DEMAND_DATA !== 'undefined' && LOCAL_DEMAND_DATA.length && (!state.resourceRecords || state.resourceRecords.length <= 5)) {
    const byKey = new Map();
    (state.resourceRecords || []).forEach(r => byKey.set([r.unit, r.agency, r.system].map(normV7).join('|'), r));
    state.resourceRecords = LOCAL_DEMAND_DATA.map((item, idx) => {
      const key = [item.unit, item.agency, item.system].map(normV7).join('|');
      const existing = byKey.get(key);
      const regDocs = [];
      if (item.has952) regDocs.push(doc952.id);
      if (item.has4651) regDocs.push(doc4651.id);
      const appendices = {};
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
        registeredDocumentIds: regDocs,
        exchangeDocumentIds: [],
        hardwareColumns: ['STT', 'Tên tài nguyên', 'Văn bản nguồn'],
        hardwareRows: [{ STT: '1', 'Tên tài nguyên': item.system }],
        sharedHardwareRowCount: 1,
        documentAppendices: appendices,
        customFields: existing?.customFields || [],
        revisions: existing?.revisions || [],
        createdBy: existing?.createdBy || session,
        editors: existing?.editors || [],
        createdAt: existing?.createdAt || V7.now?.() || new Date().toISOString(),
        updatedAt: existing?.updatedAt || V7.now?.() || new Date().toISOString()
      };
    });
  }

  // Sanitize any remaining records
  for (const r of state.resourceRecords) {
    if (r.documentAppendices) {
      for (const did of Object.keys(r.documentAppendices)) {
        const doc = state.documents.find(d => d.id === did);
        if (!doc || doc.no === '4267' || doc.no === 'CV-DEMO-01') delete r.documentAppendices[did];
      }
    }
    if (r.hardwareColumns) {
      r.hardwareColumns = r.hardwareColumns.filter(c => !c.includes('4267') && !c.includes('CV-DEMO-01') && !c.includes('Ô nguồn') && !c.includes('Ghi chú trích xuất'));
    }
    r.registeredDocumentIds = (r.registeredDocumentIds || []).filter(did => {
      const doc = state.documents.find(d => d.id === did);
      return doc && doc.no !== '4267' && doc.no !== 'CV-DEMO-01';
    });
  }
}

// The prior task-linked projection is replaced by records owned by the resource workspace.
resourcesWorkspace = function () {
  state.resourceRecords ||= [];
  migrateResourceColumnsV7();
  const docs = state.documents.filter(doc => !doc.archived && (doc.no === '952' || doc.no === '4651'));
  const doc952 = state.documents.find(d => normV7(d.no) === '952');
  const doc4651 = state.documents.find(d => normV7(d.no) === '4651');

  let records = state.resourceRecords.filter(record => {
    if (resourceFilters.self && record.createdBy !== session && !(record.editors || []).includes(session)) return false;
    if (resourceFilters.documents?.length && !resourceFilters.documents.some(id => (record.registeredDocumentIds || []).includes(id))) return false;
    if (!resourceSearchV7) return true;
    const q = resourceSearchV7.toLocaleLowerCase('vi');
    return `${record.unit} ${record.agency} ${record.system}`.toLocaleLowerCase('vi').includes(q);
  }).sort((a, b) => (a.order || 9999) - (b.order || 9999) || a.unit.localeCompare(b.unit, 'vi') || a.agency.localeCompare(b.agency, 'vi') || a.system.localeCompare(b.system, 'vi'));

  const show952 = !resourceFilters.documents?.length || (doc952 && resourceFilters.documents.includes(doc952.id));
  const show4651 = !resourceFilters.documents?.length || (doc4651 && resourceFilters.documents.includes(doc4651.id));

  const cols952 = show952 && doc952 ? resourceDocColumnsV7(doc952.id, records) : [];
  const cols4651 = show4651 && doc4651 ? resourceDocColumnsV7(doc4651.id, records) : [];

  const flatRows = records.flatMap((record, ri) => {
    const sharedCount = Math.max(record.sharedHardwareRowCount || 1, 1);
    return Array.from({ length: sharedCount }, (_, i) => ({ record, ri, i, kind: 'shared', unit: record.unit, agency: record.agency, system: record.system, stt: record.stt }));
  });

  const getUnitSpan = at => {
    const cur = flatRows[at];
    if (at > 0 && normV7(flatRows[at - 1].unit) === normV7(cur.unit)) return 0;
    let span = 1;
    while (at + span < flatRows.length && normV7(flatRows[at + span].unit) === normV7(cur.unit)) span++;
    return span;
  };

  const getAgencySpan = at => {
    const cur = flatRows[at];
    if (at > 0 && normV7(flatRows[at - 1].unit) === normV7(cur.unit) && normV7(flatRows[at - 1].agency) === normV7(cur.agency)) return 0;
    let span = 1;
    while (at + span < flatRows.length && normV7(flatRows[at + span].unit) === normV7(cur.unit) && normV7(flatRows[at + span].agency) === normV7(cur.agency)) span++;
    return span;
  };

  const getSystemSpan = at => {
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
      <div class="toolbar"><strong>Dữ liệu tài nguyên tổng hợp</strong><span class="badge-count">${records.length} hệ thống</span><span class="grow"></span><button class="btn" id="exportResourceExcelV7" ${records.length ? '' : 'disabled'}>${icon('download')} Xuất Excel</button><button class="btn text" id="addProjectionColumn">${icon('plus')} Thêm cột</button>${ib('expand', 'fullscreen', 'Phóng to hoặc thu nhỏ bảng')}</div>
      <div class="resource-v7-filters">
        <label class="task-search">${icon('search')}<input id="resourceSearchV7" value="${esc(resourceSearchV7)}" placeholder="Tìm tên đơn vị, cơ quan quản lý, hệ thống..."></label>
        <label class="field"><span>Công văn</span><select id="resourceDocumentFilterV7"><option value="">Tất cả</option>${docs.map(d => `<option value="${d.id}" ${resourceFilters.documents?.includes(d.id) ? 'selected' : ''}>Công văn ${esc(d.no || d.documentType)} · ${esc(d.summary || '')}</option>`).join('')}</select></label>
        <label class="checkbox-field"><input id="resourceSelfV7" type="checkbox" ${resourceFilters.self ? 'checked' : ''}> Được giao cho tôi</label>
        ${resourceSearchV7 || resourceFilters.documents?.length || resourceFilters.self ? '<button class="btn text" id="clearResourceV7">Xóa bộ lọc</button>' : ''}
      </div>
      <div class="table-scroll"><table class="data-table resource-v7-table"><thead><tr><th rowspan="2" class="col-stt">STT</th><th rowspan="2" class="col-unit">Tên đơn vị</th><th rowspan="2" class="col-agency">Cơ quan quản lý</th><th rowspan="2" class="col-system">Hệ thống</th><th rowspan="2" class="col-docs">Công văn đăng ký</th>${show952 && cols952.length ? `<th colspan="${cols952.length}" class="th-doc-group th-doc-952">Công văn 952</th>` : ''}${show4651 && cols4651.length ? `<th colspan="${cols4651.length}" class="th-doc-group th-doc-4651">Công văn 4651</th>` : ''}<th rowspan="2" class="col-action">Thao tác</th></tr><tr>${show952 ? cols952.map(c => `<th class="th-sub th-sub-952" title="${esc(c)}">${esc(formatShortHeader(c))}</th>`).join('') : ''}${show4651 ? cols4651.map(c => `<th class="th-sub th-sub-4651" title="${esc(c)}">${esc(formatShortHeader(c))}</th>`).join('') : ''}</tr></thead><tbody>
        ${flatRows.map((entry, at) => {
      const { record, ri, i, unit, agency, system, stt } = entry;
      const unitSpan = getUnitSpan(at);
      const agencySpan = getAgencySpan(at);
      const systemSpan = getSystemSpan(at);
      const docsBadge = (record.registeredDocumentIds || []).map(id => {
        const d = state.documents.find(x => x.id === id);
        return d ? `<span class="chip active">${esc(d.no || d.documentType)}</span>` : '';
      }).join('') || '—';

      let rowHtml = `<tr data-resource-v7="${record.id}" tabindex="0">`;
      if (unitSpan > 0) {
        rowHtml += `<td class="col-stt" rowspan="${unitSpan}">${esc(stt || (ri + 1))}</td>`;
        rowHtml += `<td class="col-unit" rowspan="${unitSpan}"><strong>${esc(unit)}</strong></td>`;
      }
      if (agencySpan > 0) {
        rowHtml += `<td class="col-agency" rowspan="${agencySpan}">${esc(agency)}</td>`;
      }
      if (systemSpan > 0) {
        rowHtml += `<td class="col-system" rowspan="${systemSpan}"><strong>${esc(system)}</strong></td>`;
        rowHtml += `<td class="col-docs" rowspan="${systemSpan}">${docsBadge}</td>`;
      }
      if (show952) {
        const app952 = record.documentAppendices?.[doc952?.id];
        const vals952 = app952?.rows?.[i] || {};
        rowHtml += cols952.map(c => {
          const val = vals952[c] ?? '';
          return `<td class="resource-edit-cell cell-952" tabindex="0" data-resource-cell-edit-v7="${record.id}" data-resource-row-edit-v7="${i}" data-resource-kind-edit-v7="shared" data-resource-doc-edit-v7="${doc952?.id || ''}" data-resource-column-edit-v7="${esc(c)}" title="${esc(c)}: ${esc(val)}">${esc(val || '—')}</td>`;
        }).join('');
      }
      if (show4651) {
        const app4651 = record.documentAppendices?.[doc4651?.id];
        const vals4651 = app4651?.rows?.[i] || {};
        rowHtml += cols4651.map(c => {
          const val = vals4651[c] ?? '';
          return `<td class="resource-edit-cell cell-4651" tabindex="0" data-resource-cell-edit-v7="${record.id}" data-resource-row-edit-v7="${i}" data-resource-kind-edit-v7="shared" data-resource-doc-edit-v7="${doc4651?.id || ''}" data-resource-column-edit-v7="${esc(c)}" title="${esc(c)}: ${esc(val)}">${esc(val || '—')}</td>`;
        }).join('');
      }
      if (systemSpan > 0) {
        rowHtml += `<td class="col-action" rowspan="${systemSpan}"><button class="icon-btn-sm" type="button" data-resource-v7-detail="${record.id}" aria-label="Xem chi tiết">${icon('eye')}</button></td>`;
      }
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
  const doc952 = state.documents.find(d => (d.no || '').includes('952'));
  const doc4651 = state.documents.find(d => (d.no || '').includes('4651'));
  const cols952 = (typeof LOCAL_DEMAND_COLUMNS_952 !== 'undefined' ? LOCAL_DEMAND_COLUMNS_952 : [
    'vCPU', 'RAM (GB)', 'Disk / Block (TB)', 'Disk / File Storage (TB)', 'Disk / Object (TB)',
    'License', 'Giải pháp ATTT', 'Kênh truyền'
  ]);
  const cols4651 = (typeof LOCAL_DEMAND_COLUMNS_4651 !== 'undefined' ? LOCAL_DEMAND_COLUMNS_4651 : [
    'vCPU', 'RAM (GB)', 'GPU (GB)', 'Disk / Block SSD (TB)', 'Disk / Block HDD (TB)',
    'Disk / File Storage SSD (TB)', 'Disk / File Storage HDD (TB)', 'Disk / Object (TB)',
    'Sizing 3 vùng', 'Sizing / DMZ', 'Sizing / DB', 'Sizing / APP',
    'License thương mại', 'Kênh truyền', 'Giải pháp ATTT', 'Kế hoạch',
    'Đặc thù', 'Hệ thống có trong danh mục theo QĐ 1690/QĐ-BCA-A05 ngày 15/3/2023 của Bộ Công an', 'Ghi chú'
  ]);
  const fixed = ['STT', 'Tên đơn vị', 'Cơ quan quản lý', 'Hệ thống', 'Công văn đăng ký'];
  const head1 = [...fixed, ...cols952.map((_, i) => i === 0 ? 'Công văn 952' : ''), ...cols4651.map((_, i) => i === 0 ? 'Công văn 4651' : '')];
  const head2 = [...fixed.map(() => ''), ...cols952, ...cols4651];
  const data = [head1, head2];
  const merges = [];

  fixed.forEach((_, c) => merges.push({ s: { r: 0, c }, e: { r: 1, c } }));
  if (cols952.length > 1) {
    merges.push({ s: { r: 0, c: fixed.length }, e: { r: 0, c: fixed.length + cols952.length - 1 } });
  }
  if (cols4651.length > 1) {
    const c4651 = fixed.length + cols952.length;
    merges.push({ s: { r: 0, c: c4651 }, e: { r: 0, c: c4651 + cols4651.length - 1 } });
  }

  records.forEach((record, idx) => {
    const app952 = record.documentAppendices?.[doc952?.id];
    const vals952 = app952?.rows?.[0] || {};
    const app4651 = record.documentAppendices?.[doc4651?.id];
    const vals4651 = app4651?.rows?.[0] || {};
    const docsStr = (record.registeredDocumentIds || [])
      .map(id => state.documents.find(d => d.id === id)?.no || '')
      .filter(Boolean).join(', ') || '952, 4651';

    data.push([
      idx + 1,
      record.unit || '',
      record.agency || '',
      record.system || '',
      docsStr,
      ...cols952.map(c => vals952[c] ?? ''),
      ...cols4651.map(c => vals4651[c] ?? '')
    ].map(cleanExcelV7));
  });

  const firstData = 2;
  for (let start = 0; start < records.length;) {
    let end = start + 1;
    while (end < records.length && normV7(records[end].unit) === normV7(records[start].unit)) {
      end++;
    }
    if (end - start > 1) {
      merges.push({ s: { r: firstData + start, c: 0 }, e: { r: firstData + end - 1, c: 0 } });
      merges.push({ s: { r: firstData + start, c: 1 }, e: { r: firstData + end - 1, c: 1 } });
    }
    let a = start;
    while (a < end) {
      let b = a + 1;
      while (b < end && normV7(records[b].agency) === normV7(records[a].agency)) {
        b++;
      }
      if (b - a > 1) {
        merges.push({ s: { r: firstData + a, c: 2 }, e: { r: firstData + b - 1, c: 2 } });
      }
      a = b;
    }
    start = end;
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
    toast(`Đã xuất ${records.length} hệ thống tài nguyên.`);
  } catch (error) {
    toast('Không thể tạo tệp Excel. Vui lòng thử tải lại trang.');
  }
}

function resourceTableActionV7(kind) {
  const editable = state.resourceRecords.filter(canEditResourceV7);
  const documents = [...new Set(state.resourceRecords.flatMap(r => r.registeredDocumentIds || []))].map(id => state.documents.find(d => d.id === id)).filter(Boolean);
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
      (draft.registeredDocumentIds || []).forEach(id => { const app = draft.documentAppendices[id] ||= { columns: [], rows: [], privateRows: [] }; app.rows ||= []; while (app.rows.length < count) app.rows.push({}) }); saveResourceV7(draft);
    }, false, 'Thêm hàng');
    const refreshSystems = () => { const unit = $('#resourceCommonUnitV7')?.value || '', agency = $('#resourceCommonAgencyV7')?.value || '', systemSelect = $('#resourceCommonSystemV7'); if (!systemSelect) return; const values = [...new Set(editable.filter(r => r.unit === unit && r.agency === agency).map(r => r.system))]; systemSelect.innerHTML = values.map(v => `<option>${esc(v)}</option>`).join('') };
    const refreshAgencies = () => { const unit = $('#resourceCommonUnitV7')?.value || '', agencySelect = $('#resourceCommonAgencyV7'); if (!agencySelect) return; const values = [...new Set(editable.filter(r => r.unit === unit).map(r => r.agency))]; agencySelect.innerHTML = values.map(v => `<option>${esc(v)}</option>`).join(''); refreshSystems() };
    $('#resourceCommonUnitV7')?.addEventListener('change', refreshAgencies); $('#resourceCommonAgencyV7')?.addEventListener('change', refreshSystems); return;
  }
  if (kind === 'private-row') {
    if (!documents.length) return toast('Chưa có văn bản đăng ký cho tài nguyên.');
    modal('Thêm hàng riêng', `<label class="field"><span>Tài nguyên cha <b class="required">*</b></span><select name="resourceId" id="resourcePrivateParentV7" required>${resourceOptions}</select></label><label class="field"><span>Nhóm văn bản <b class="required">*</b></span><select name="docId" id="resourcePrivateDocV7" required>${documentOptions}</select></label>${field('Tên đơn vị *', 'unit', '', 'text', true)}${field('Cơ quan quản lý *', 'agency', '', 'text', true)}${field('Hệ thống *', 'system', '', 'text', true)}<p class="small muted">Dòng này chỉ xuất hiện trong nhóm văn bản đã chọn, không gộp vào các dòng chung.</p>`, data => {
      const draft = V7.clone(state.resourceRecords.find(r => r.id === data.resourceId)); if (!draft) throw Error('Chọn tài nguyên có thể chỉnh sửa.'); if (!(draft.registeredDocumentIds || []).includes(data.docId)) throw Error('Văn bản này chưa được đăng ký cho tài nguyên đã chọn.');
      const app = draft.documentAppendices[data.docId] ||= { columns: [], rows: [], privateRows: [] }; app.privateRows ||= []; app.privateRows.push({ unit: data.unit.trim(), agency: data.agency.trim(), system: data.system.trim() }); saveResourceV7(draft);
    }, true, 'Thêm hàng riêng');
    $('#resourcePrivateParentV7')?.addEventListener('change', e => { const parent = state.resourceRecords.find(r => r.id === e.target.value); const select = $('#resourcePrivateDocV7'); if (!select) return; const ids = parent?.registeredDocumentIds || []; select.innerHTML = ids.map(id => state.documents.find(d => d.id === id)).filter(Boolean).map(d => `<option value="${esc(d.id)}">${esc(`${d.no || d.documentType} · ${d.documentType}`)}</option>`).join('') });
    $('#resourcePrivateParentV7')?.dispatchEvent(new Event('change'));
    return;
  }
}

function resourceCellEditV7(recordId, rowIndex, kind, docId, column) {
  if (column === '—') return;
  const current = state.resourceRecords.find(r => r.id === recordId); if (!current) return;
  if (!canEditResourceV7(current)) return toast('Bạn chỉ được sửa tài nguyên do mình quản lý.');
  const draft = V7.clone(current), app = docId ? (draft.documentAppendices[docId] ||= { columns: [], rows: [], privateRows: [] }) : null;
  if (app) { app.rows ||= []; app.privateRows ||= [] } else draft.hardwareRows ||= [];
  const rows = docId ? (kind === 'private' ? app.privateRows : app.rows) : draft.hardwareRows;
  rows[rowIndex] ||= {};
  const initial = rows[rowIndex][column] ?? '';
  modal(`Sửa ${column}`, `${field('Giá trị', 'value', initial)}`, data => { rows[rowIndex][column] = data.value; saveResourceV7(draft) }, false, 'Lưu giá trị');
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
      persist();
      done('Đã lưu văn bản vào danh mục');
    });
  $('#deleteCatalogV7')?.addEventListener('click', () => {
    const linked = state.tasks.some(t => t.documentId === id || (t.documentIds || []).includes(id) || (t.officialIds || []).includes(id));
    if (linked) doc.archived = true; else state.documents = state.documents.filter(d => d.id !== id);
    state.officials = state.documents; state.docs = state.documents; persist(); render();
    toast(linked ? 'Văn bản đã được lưu trữ; liên kết task được giữ.' : 'Đã xóa văn bản.');
  });
}

function catalogDetailV7(id) {
  const d = state.documents.find(item => item.id === id); if (!d) return;
  const linked = visibleTasks().filter(t => t.documentId === id || (t.documentIds || []).includes(id) || (t.officialIds || []).includes(id));
  drawer(`${d.documentType || d.type} ${d.no || ''}`, d.summary || 'Thông tin văn bản', `<div class="drawer-body"><dl class="task-meta">${[['Loại văn bản', d.documentType || d.type], ['Số', d.no || '—'], ['Ngày phát hành', day(d.date)], ['Trích yếu', d.summary || '—'], ['Cơ quan ban hành', d.agency || '—'], ['Ghi chú', d.note || '—']].map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>${fileLinks(d.files || [])}<div class="detail-actions"><button class="btn primary" id="editCatalogV7">Chỉnh sửa</button><button class="btn danger" id="removeCatalogV7">Xóa</button></div><h3>Task liên quan (${linked.length})</h3>${taskList(linked)}</div>`);
  $('#editCatalogV7').onclick = () => catalogFormV7(id);
  $('#removeCatalogV7').onclick = () => { $('#editForm')?.remove(); catalogFormV7(id); $('#deleteCatalogV7')?.click() };
  $$('#overlay [data-task]').forEach(row => row.onclick = () => taskDrawer(row.dataset.task));
}

function resourceFormV7(id = '') {
  const current = state.resourceRecords.find(r => r.id === id);
  if (current && !canEditResourceV7(current)) return toast('Bạn chỉ được sửa tài nguyên do mình quản lý.');
  const directColumns = (state.resourcePrivateColumns || []).filter(isResourceDirectColumnV7);
  resourceDraftV7 = V7.clone(current || { id: '', unit: '', agency: '', system: '', level: 'Địa phương', registeredDocumentIds: [], exchangeDocumentIds: [], attachments: [], hardwareColumns: ['STT', ...directColumns], hardwareRows: [{ STT: '1', ...Object.fromEntries(directColumns.map(c => [c, ''])) }], sharedHardwareRowCount: 1, documentAppendices: {}, customFields: [], revisions: [], createdBy: '', editors: [], createdAt: '', updatedAt: '' });
  resourceDraftV7.sharedHardwareRowCount ||= Math.max(resourceDraftV7.hardwareRows?.length || 1, 1);
  resourceDraftV7.documentAppendices ||= {};
  (resourceDraftV7.registeredDocumentIds || []).forEach(docId => resourceDraftV7.documentAppendices[docId] ||= { columns: [], rows: Array.from({ length: resourceDraftV7.sharedHardwareRowCount }, () => ({})), privateRows: [] });
  drawResourceFormV7();
}

function drawResourceFormV7() {
  const r = resourceDraftV7, docs = state.documents.filter(d => !d.archived);
  drawer(r.id ? 'Chỉnh sửa tài nguyên' : 'Tạo tài nguyên', 'Tài nguyên được lưu độc lập với công việc.', `<form id="resourceFormV7" class="resource-v7-form">
    <section class="surface"><h3>Thông tin hệ thống</h3><div class="form-grid">${field('Tên đơn vị *', 'unit', r.unit, 'text', true)}${field('Cơ quan quản lý *', 'agency', r.agency, 'text', true)}${field('Hệ thống *', 'system', r.system, 'text', true)}<label class="field"><span>Cấp quản lý</span><select name="level"><option ${r.level === 'Địa phương' ? 'selected' : ''}>Địa phương</option><option ${r.level === 'Bộ ngành' ? 'selected' : ''}>Bộ ngành</option></select></label></div></section>
    <section class="surface"><h3>Công văn đăng ký</h3>${docs.map(d => `<label class="resource-doc-choice"><input type="checkbox" data-resource-doc="registeredDocumentIds" value="${d.id}" ${(r.registeredDocumentIds || []).includes(d.id) ? 'checked' : ''}> ${esc(d.documentType)} · ${esc(d.no || 'Chưa có số')}</label>`).join('') || '<p class="muted">Chưa có văn bản trong danh mục.</p>'}</section>
    <section class="surface"><h3>Văn bản trao đổi</h3>${docs.map(d => `<label class="resource-doc-choice"><input type="checkbox" data-resource-doc="exchangeDocumentIds" value="${d.id}" ${(r.exchangeDocumentIds || []).includes(d.id) ? 'checked' : ''}> ${esc(d.documentType)} · ${esc(d.no || 'Chưa có số')}</label>`).join('') || '<p class="muted">Chưa có văn bản trong danh mục.</p>'}</section>
    <section class="surface"><div class="toolbar"><h3>Tệp đính kèm tài nguyên</h3><span class="grow"></span><label class="btn">${icon('upload')} Tải tệp lên<input id="resourceFilesV7" type="file" multiple hidden></label></div>${fileLinks(r.attachments || []) || '<p class="muted">Chưa có tệp đính kèm.</p>'}</section>
    <section class="surface"><div class="toolbar"><h3>Thông tin theo nhóm văn bản</h3><span class="small muted">Cột con chỉ hiển thị trong nhóm số văn bản tương ứng</span></div><p class="small muted">Dùng các nút Thêm cột / Thêm hàng tại bảng Dữ liệu tài nguyên để mở rộng cấu trúc dùng chung.</p>${(r.registeredDocumentIds || []).map(id => { const d = docs.find(x => x.id === id); const app = r.documentAppendices[id] || { columns: [], rows: [], privateRows: [] }; const cols = resourceDocColumnsV7(id); const rows = Array.from({ length: r.sharedHardwareRowCount }, (_, i) => ({ kind: 'shared', i, data: app.rows?.[i] || {} })).concat((app.privateRows || []).map((data, i) => ({ kind: 'private', i, data }))); return `<div class="resource-doc-appendix"><h4>${esc(d?.no || d?.documentType || 'Văn bản')}</h4><div class="table-scroll"><table class="dynamic-data-table"><thead><tr><th>Phạm vi dòng / Thông tin hệ thống riêng</th>${cols.map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${rows.map(({ kind, i, data }) => `<tr><td>${kind === 'shared' ? 'Chung' : `<div class="resource-private-identity"><input data-appendix-meta-v7="${id}" data-appendix-row-v7="${i}" data-appendix-key-v7="unit" value="${esc(data.unit || r.unit)}" placeholder="Tên đơn vị"><input data-appendix-meta-v7="${id}" data-appendix-row-v7="${i}" data-appendix-key-v7="agency" value="${esc(data.agency || r.agency)}" placeholder="Cơ quan quản lý"><input data-appendix-meta-v7="${id}" data-appendix-row-v7="${i}" data-appendix-key-v7="system" value="${esc(data.system || '')}" placeholder="Hệ thống"></div>`}</td>${cols.map(c => `<td><input data-appendix-doc-v7="${id}" data-appendix-kind-v7="${kind}" data-appendix-row-v7="${i}" data-appendix-col-v7="${esc(c)}" value="${esc(data[c] ?? '')}"></td>`).join('')}</tr>`).join('')}</tbody></table></div></div>` }).join('') || '<p class="muted">Chọn ít nhất một văn bản đăng ký để khai báo thông tin theo nhóm.</p>'}</section>
    <section class="surface"><div class="toolbar"><h3>Trường tùy chỉnh</h3><span class="grow"></span><button class="btn" type="button" id="resourceAddFieldV7">+ Thêm trường</button></div>${r.customFields.map((f, i) => `<div class="custom-row"><input data-resource-custom-name-v7="${i}" placeholder="Tên trường" value="${esc(f.name)}"><input data-resource-custom-value-v7="${i}" placeholder="Giá trị" value="${esc(f.value)}"><button type="button" data-resource-custom-del-v7="${i}">×</button></div>`).join('')}</section>
    <p class="error" id="resourceErrorV7" role="alert"></p><div class="modal-foot"><button type="button" class="btn" id="resourceCancelV7">Hủy</button><button type="submit" class="btn primary">Lưu tài nguyên</button></div></form>`, true);
  const form = $('#resourceFormV7');
  const capture = () => {
    for (const key of ['unit', 'agency', 'system', 'level']) if (form.elements[key]) r[key] = form.elements[key].value;
    $$('[data-resource-doc]').forEach(c => { const key = c.dataset.resourceDoc; r[key] ||= []; r[key] = r[key].filter(x => x !== c.value); if (c.checked) r[key].push(c.value) });
    r.documentAppendices ||= {}; r.sharedHardwareRowCount ||= 1;
    (r.registeredDocumentIds || []).forEach(id => { const app = r.documentAppendices[id] ||= { columns: [], rows: [], privateRows: [] }; app.rows ||= []; while (app.rows.length < r.sharedHardwareRowCount) app.rows.push({}); app.privateRows ||= [] });
    $$('[data-resource-cell-v7]').forEach(input => { let row = r.hardwareRows[+input.dataset.resourceCellV7], col = r.hardwareColumns[+input.dataset.colV7]; if (row) row[col] = input.value });
    $$('[data-appendix-doc-v7]').forEach(input => { const app = r.documentAppendices[input.dataset.appendixDocV7]; if (!app) return; const rows = input.dataset.appendixKindV7 === 'shared' ? app.rows : app.privateRows; rows[+input.dataset.appendixRowV7] ||= {}; rows[+input.dataset.appendixRowV7][input.dataset.appendixColV7] = input.value });
    $$('[data-appendix-meta-v7]').forEach(input => { const row = r.documentAppendices[input.dataset.appendixMetaV7]?.privateRows?.[+input.dataset.appendixRowV7]; if (row) row[input.dataset.appendixKeyV7] = input.value });
    $$('[data-resource-col-v7]').forEach(input => { const i = +input.dataset.resourceColV7, old = r.hardwareColumns[i], next = input.value.trim(); if (next && old !== next) { r.hardwareColumns[i] = next; r.hardwareRows.forEach(row => { row[next] = row[old] ?? ''; if (old !== 'STT') delete row[old] }) } });
    $$('[data-resource-custom-name-v7]').forEach(e => r.customFields[+e.dataset.resourceCustomNameV7].name = e.value);
    $$('[data-resource-custom-value-v7]').forEach(e => r.customFields[+e.dataset.resourceCustomValueV7].value = e.value);
  };

  form.oninput = capture; form.onchange = e => { capture(); if (e.target.matches('[data-resource-doc]')) drawResourceFormV7() };
  form.onsubmit = e => { e.preventDefault(); capture(); try { saveResourceV7(r) } catch (err) { $('#resourceErrorV7').textContent = err.message } };
  $('#resourceCancelV7').onclick = closeOverlay;
  $('#resourceFilesV7')?.addEventListener('change', async e => { try { r.attachments.push(...await storeFiles(e.target.files)); drawResourceFormV7() } catch (err) { $('#resourceErrorV7').textContent = err.message } });
  $('#resourceAddFieldV7').onclick = () => { capture(); r.customFields.push({ name: '', value: '' }); drawResourceFormV7() };
  $$('[data-resource-custom-del-v7]').forEach(b => b.onclick = () => { capture(); r.customFields.splice(+b.dataset.resourceCustomDelV7, 1); drawResourceFormV7() });
}

function saveResourceV7(draft) {
  if (!draft.unit.trim() || !draft.agency.trim() || !draft.system.trim()) throw Error('Nhập tên đơn vị, cơ quan quản lý và hệ thống.');
  if (Object.values(draft.documentAppendices || {}).some(app => (app.privateRows || []).some(row => !row.unit?.trim() || !row.agency?.trim() || !row.system?.trim()))) throw Error('Nhập đủ tên đơn vị, cơ quan quản lý và hệ thống cho từng dòng riêng.');
  const key = [draft.unit, draft.agency, draft.system].map(normV7).join('|');
  const existing = state.resourceRecords.find(item => item.id !== draft.id && [item.unit, item.agency, item.system].map(normV7).join('|') === key);
  const current = state.resourceRecords.find(item => item.id === draft.id);
  const target = current || existing;
  const old = target ? V7.clone(target) : null;
  if (target && !canEditResourceV7(target)) throw Error('Bạn không có quyền sửa tài nguyên này.');
  const at = V7.now(), actor = session;
  if (target) {
    const revisions = target.revisions || [], createdBy = target.createdBy || actor, createdAt = target.createdAt || at;
    const appendices = current ? draft.documentAppendices : { ...(target.documentAppendices || {}) };
    if (!current) for (const [docId, app] of Object.entries(draft.documentAppendices || {})) { const prior = appendices[docId] || { columns: [], rows: [], privateRows: [] }; appendices[docId] = { columns: [...new Set([...(prior.columns || []), ...(app.columns || [])])], rows: Array.from({ length: Math.max(prior.rows?.length || 0, app.rows?.length || 0) }, (_, i) => ({ ...prior.rows?.[i], ...app.rows?.[i] })), privateRows: [...(prior.privateRows || []), ...(app.privateRows || [])] } }
    Object.assign(target, draft, { id: target.id, createdBy, createdAt, revisions, registeredDocumentIds: current ? draft.registeredDocumentIds : [...new Set([...(target.registeredDocumentIds || []), ...draft.registeredDocumentIds])], exchangeDocumentIds: current ? draft.exchangeDocumentIds : [...new Set([...(target.exchangeDocumentIds || []), ...draft.exchangeDocumentIds])], attachments: current ? draft.attachments : [...new Map([...(target.attachments || []), ...draft.attachments].map(file => [file.id, file])).values()], hardwareRows: current ? draft.hardwareRows : [...(target.hardwareRows || []), ...draft.hardwareRows], hardwareColumns: [...new Set([...(target.hardwareColumns || []), ...draft.hardwareColumns])], sharedHardwareRowCount: Math.max(target.sharedHardwareRowCount || 0, draft.sharedHardwareRowCount || 0), documentAppendices: appendices, customFields: current ? draft.customFields : [...(target.customFields || []), ...draft.customFields], updatedAt: at });
    target.editors = [...new Set([...(target.editors || []), actor])];
    target.revisions ||= [];
    const snapshot = V7.clone(target); delete snapshot.revisions;
    const changes = Object.keys(target).filter(key => key !== 'revisions' && JSON.stringify(old?.[key]) !== JSON.stringify(target[key])).map(field => ({ field, old: old?.[field], new: target[field] }));
    target.revisions.push({ id: V7.id(), at, actorId: actor, action: 'Cập nhật tài nguyên', changes, data: snapshot });
  } else {
    Object.assign(draft, { id: V7.id(), createdBy: actor, editors: [actor], createdAt: at, updatedAt: at, revisions: [{ id: V7.id(), at, actorId: actor, action: 'Tạo tài nguyên', changes: [], data: V7.clone(draft) }] });
    state.resourceRecords.push(draft);
  }
  persist(); resourceDraftV7 = null; closeOverlay(); render(); toast(existing ? 'Đã gộp thông tin vào hệ thống cùng đơn vị và cơ quan quản lý.' : 'Đã lưu tài nguyên.');
}

function resourceDetailV7(id, revisionId = '') {
  const r = state.resourceRecords.find(item => item.id === id); if (!r) return;
  const history = [...(r.revisions || [])].sort((a, b) => b.at.localeCompare(a.at));
  const selected = history.find(item => item.id === revisionId) || history[0];
  const snap = selected?.data || r;
  const docAppendices = (snap.registeredDocumentIds || []).map(docId => { const d = state.documents.find(x => x.id === docId); const app = snap.documentAppendices?.[docId]; if (!d || !app) return ''; const cols = resourceDocColumnsV7(docId, [snap]); const rows = [...(app.rows || []).map((row, i) => ({ scope: `Dòng chung ${i + 1}`, row })), ...(app.privateRows || []).map((row, i) => ({ scope: `Dòng riêng ${i + 1} · ${row.unit || ''} / ${row.agency || ''} / ${row.system || ''}`, row }))]; return `<h3>${esc(d.no || d.documentType)}</h3><div class="table-scroll"><table class="data-table"><thead><tr><th>Phạm vi / hệ thống</th>${cols.map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${rows.map(({ scope, row }) => `<tr><td>${esc(scope)}</td>${cols.map(c => `<td>${esc(row[c] || '—')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>` }).join('');
  const values = [['Tên đơn vị', snap.unit], ['Cơ quan quản lý', snap.agency], ['Hệ thống', snap.system], ['Cấp quản lý', snap.level], ['Công văn đăng ký', (snap.registeredDocumentIds || []).map(id => state.documents.find(d => d.id === id)?.no || '').filter(Boolean).join(', ') || '—'], ['Văn bản trao đổi', (snap.exchangeDocumentIds || []).map(id => state.documents.find(d => d.id === id)?.no || '').filter(Boolean).join(', ') || '—']];
  drawer(`${r.unit} / ${r.agency}`, 'Thông tin tài nguyên', `<div class="resource-v7-detail"><aside class="resource-v7-timeline"><h3>Lịch sử cập nhật</h3>${history.map(h => `<button class="timeline-btn ${selected?.id === h.id ? 'selected' : ''}" data-resource-history-v7="${h.id}"><strong>${esc(h.action)}</strong><small>${fmt(h.at)} · ${esc(userName(h.actorId))}</small></button>`).join('') || '<p class="muted">Chưa có lịch sử.</p>'}</aside><section class="resource-v7-snapshot"><h2>${esc(snap.system)}</h2><dl class="task-meta">${values.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v || '—')}</dd></div>`).join('')}</dl>${docAppendices}<h3>Tệp đính kèm</h3>${fileLinks(snap.attachments || [])}<h3>Thông tin bổ sung</h3>${(snap.customFields || []).map(f => `<div class="detail-pair"><span>${esc(f.name || 'Trường')}</span><strong>${esc(f.value || '—')}</strong></div>`).join('') || '<p class="muted">Chưa có trường bổ sung.</p>'}<p class="small muted">${selected ? `${esc(selected.action)} bởi ${esc(userName(selected.actorId))} · ${fmt(selected.at)}` : ''}</p><div class="detail-actions">${canEditResourceV7(r) ? '<button class="btn primary" id="editResourceV7">Chỉnh sửa</button><button class="btn danger" id="deleteResourceV7">Xóa tài nguyên</button>' : ''}</div></section></div>`, true);
  $('#overlay .drawer')?.classList.add('resource-v7-drawer');
  $$('[data-resource-history-v7]').forEach(b => b.onclick = () => resourceDetailV7(id, b.dataset.resourceHistoryV7));
  $('#editResourceV7')?.addEventListener('click', () => resourceFormV7(id));
  $('#deleteResourceV7')?.addEventListener('click', () => { state.resourceRecords = state.resourceRecords.filter(x => x.id !== id); persist(); render(); toast('Đã xóa tài nguyên') });
}

function bindV7() {
  $$('[data-kanban-tab]').forEach(btn => btn.onclick = () => { activeTaskFilter.bucket = btn.dataset.kanbanTab === 'all' ? '' : btn.dataset.kanbanTab; render() });
  $$('[data-bucket]').forEach(btn => btn.onclick = () => { activeTaskFilter.bucket = btn.dataset.bucket; page = 'tasks'; render() });
  $$('[data-catalog-type-v7]').forEach(btn => btn.onclick = () => { catalogTypeFilter = btn.dataset.catalogTypeV7; render() });
  $('#catalogSearchV7')?.addEventListener('input', e => { catalogSearchV7 = e.target.value; $('#catalogTableV7').innerHTML = catalogTableV7(); bindCatalogV7() });
  $$('[data-catalog-v7-new]').forEach(btn => btn.onclick = () => catalogFormV7());
  $('#resourceSearchV7')?.addEventListener('input', e => { resourceSearchV7 = e.target.value; render() });
  $('#resourceDocumentFilterV7')?.addEventListener('change', e => { resourceFilters.documents = e.target.value ? [e.target.value] : []; render() });
  $('#resourceSelfV7')?.addEventListener('change', e => { resourceFilters.self = e.target.checked; render() });
  $('#resourceAddCommonColV7')?.addEventListener('click', () => resourceTableActionV7('common-column'));
  $('#resourceAddPrivateColV7')?.addEventListener('click', () => resourceTableActionV7('private-column'));
  $('#resourceAddCommonRowV7')?.addEventListener('click', () => resourceTableActionV7('common-row'));
  $('#resourceAddPrivateRowV7')?.addEventListener('click', () => resourceTableActionV7('private-row'));
  const addCol = () => resourceTableActionV7('common-column');
  $('#addProjectionColumn')?.addEventListener('click', addCol);
  $('#addProjectionColumnBottom')?.addEventListener('click', addCol);
  $('#exportResourceExcelV7')?.addEventListener('click', () => {
    const recs = state.resourceRecords.filter(record => {
      if (resourceFilters.self && record.createdBy !== session && !(record.editors || []).includes(session)) return false;
      if (resourceFilters.documents?.length && !resourceFilters.documents.some(id => [...(record.registeredDocumentIds || []), ...(record.exchangeDocumentIds || [])].includes(id))) return false;
      return !resourceSearchV7 || `${record.unit} ${record.agency} ${record.system}`.toLocaleLowerCase('vi').includes(resourceSearchV7.toLocaleLowerCase('vi'));
    }).sort((a, b) => a.unit.localeCompare(b.unit, 'vi') || a.agency.localeCompare(b.agency, 'vi') || a.system.localeCompare(b.system, 'vi'));
    exportResourceExcelV7(recs);
  });
  $('#clearResourceV7')?.addEventListener('click', () => { resourceSearchV7 = ''; resourceFilters = { documents: [], groups: [], levels: [], month: '', self: false }; render() });
  $$('[data-resource-v7]').forEach(row => {
    row.onclick = e => { if (!e.target.closest('button')) resourceDetailV7(row.dataset.resourceV7) };
    row.onkeydown = e => { if ((e.key === 'Enter' || e.key === ' ') && !e.target.closest('button')) { e.preventDefault(); resourceDetailV7(row.dataset.resourceV7) } };
  });
  $$('[data-resource-v7-detail]').forEach(btn => btn.onclick = e => { e.stopPropagation(); resourceDetailV7(btn.dataset.resourceV7Detail) });
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

// Load any stored v6 prototype once, preserving the old data while switching to the decoupled resource model.
const persistedV7Snapshot = localStorage.getItem('c12-prototype-v7');
if (persistedV7Snapshot) { try { const current = JSON.parse(persistedV7Snapshot); if (current?.version === 7) state = current } catch { } }
render();
