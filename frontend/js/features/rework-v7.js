'use strict';

const V7 = C12Model;
let catalogTypeFilter = 'all', catalogSearchV7 = '', resourceSearchV7 = '', resourceDraftV7, resourceTimelineV7 = '';
const catalogTypesV7 = V7.DOCUMENT_TYPES;
const normV7 = value => String(value || '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('vi');
const resourceRowsV7 = record => record.hardwareRows?.length ? record.hardwareRows : [{ STT: '1' }];
const resourceDisplayRowsV7 = (record, docIds) => {
  const sharedCount=Math.max(resourceRowsV7(record).length,record.sharedHardwareRowCount||0,...docIds.map(id=>record.documentAppendices?.[id]?.rows?.length||0),1);
  return [...Array.from({length:sharedCount},(_,i)=>({i,kind:'shared'})),...docIds.flatMap(id=>(record.documentAppendices?.[id]?.privateRows||[]).map((_,i)=>({i,kind:'private',docId:id})))];
};
const canEditResourceV7 = record => admin() || record.createdBy === session || (record.editors || []).includes(session);
const cleanExcelV7 = value => String(value ?? '').trim().replace(/^—$/, '');

// The prior task-linked projection is replaced by records owned by the resource workspace.
resourcesWorkspace = function () {
  state.resourceRecords ||= [];
  const docs = state.documents.filter(doc => !doc.archived);
  let records = state.resourceRecords.filter(record => {
    if (resourceFilters.self && record.createdBy !== session && !(record.editors || []).includes(session)) return false;
    if (resourceFilters.documents?.length && !resourceFilters.documents.some(id => [...(record.registeredDocumentIds || []), ...(record.exchangeDocumentIds || [])].includes(id))) return false;
    return !resourceSearchV7 || `${record.unit} ${record.agency} ${record.system}`.toLocaleLowerCase('vi').includes(resourceSearchV7.toLocaleLowerCase('vi'));
  }).sort((a,b)=>a.unit.localeCompare(b.unit,'vi')||a.agency.localeCompare(b.agency,'vi')||a.system.localeCompare(b.system,'vi'));
  const docIds = [...new Set(records.flatMap(r => r.registeredDocumentIds || []))];
  const docCols = Object.fromEntries(docIds.map(id => [id, [...new Set(records.flatMap(r => r.documentAppendices?.[id]?.columns || []))]]));
  const columns = [...new Set(records.flatMap(r => r.hardwareColumns || []))].filter(c => c !== 'STT');
  const flatRows = records.flatMap((record, ri) => resourceDisplayRowsV7(record,docIds).map(entry=>({record,ri,...entry,row:entry.kind==='private'?record.documentAppendices?.[entry.docId]?.privateRows?.[entry.i]||{}:resourceRowsV7(record)[entry.i]||{}})));
  const rowspan = (at, predicate = () => true) => {
    const first = flatRows[at]; if (at && flatRows[at-1].kind==='shared' && first.kind==='shared' && predicate(flatRows[at - 1].record, first.record)) return 0;
    let n = 1; while (at + n < flatRows.length && flatRows[at+n].kind==='shared' && first.kind==='shared' && predicate(first.record, flatRows[at + n].record)) n++; return n;
  };
  return head('Quản lý tài nguyên', '', btn('Tạo tài nguyên', 'new-resource', 'plus', 'primary')) +
    `<section class="surface resource-v7-panel" id="resourcePanel">
      <div class="toolbar"><strong>Dữ liệu tài nguyên</strong><span class="badge-count">${records.length} hệ thống</span><span class="grow"></span><button class="btn" id="exportResourceExcelV7" ${records.length ? '' : 'disabled'}>${icon('download')} Xuất Excel</button>${ib('expand', 'fullscreen', 'Phóng to hoặc thu nhỏ bảng')}</div>
      <div class="resource-v7-filters">
        <label class="task-search">${icon('search')}<input id="resourceSearchV7" value="${esc(resourceSearchV7)}" placeholder="Tìm đơn vị, cơ quan quản lý hoặc hệ thống..."></label>
        <label class="field"><span>Văn bản</span><select id="resourceDocumentFilterV7"><option value="">Tất cả</option>${docs.map(d => `<option value="${d.id}" ${resourceFilters.documents?.includes(d.id) ? 'selected' : ''}>${esc(d.documentType)} · ${esc(d.no || 'Chưa có số')}</option>`).join('')}</select></label>
        <label class="checkbox-field"><input id="resourceSelfV7" type="checkbox" ${resourceFilters.self ? 'checked' : ''}> Tài nguyên của tôi</label>
        ${resourceSearchV7 || resourceFilters.documents?.length || resourceFilters.self ? '<button class="btn text" id="clearResourceV7">Xóa bộ lọc</button>' : ''}
      </div>
      <div class="table-scroll"><table class="data-table resource-v7-table"><thead><tr><th rowspan="2">STT</th><th rowspan="2">Tên đơn vị</th><th rowspan="2">Cơ quan quản lý</th><th rowspan="2">Hệ thống</th><th rowspan="2">Công văn đăng ký</th><th rowspan="2">Văn bản trao đổi</th>${docIds.map(id => { const d=state.documents.find(x=>x.id===id); return `<th colspan="${Math.max(1,docCols[id].length)}">${esc(d?.no || d?.documentType || 'Văn bản')}</th>` }).join('')}${columns.length ? `<th colspan="${columns.length}">Phụ lục riêng</th>` : ''}<th rowspan="2"></th></tr><tr>${docIds.map(id => (docCols[id].length ? docCols[id] : ['—']).map(c=>`<th>${esc(c)}</th>`).join('')).join('')}${columns.map(c=>`<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>
        ${flatRows.map(({record,i,row,kind,docId}, at) => { const docsCell=(ids,cls='')=>(ids||[]).map(id=>{let d=state.documents.find(x=>x.id===id);return d?`<span class="chip ${cls}">${esc(d.no||d.documentType)}</span>`:''}).join('')||'—'; const unitSpan=kind==='shared'?rowspan(at,(a,b)=>normV7(a.unit)===normV7(b.unit)):1; const agencySpan=kind==='shared'?rowspan(at,(a,b)=>normV7(a.unit)===normV7(b.unit)&&normV7(a.agency)===normV7(b.agency)):1; const systemSpan=kind==='shared'?rowspan(at,(a,b)=>a.id===b.id):0; return `<tr data-resource-v7="${record.id}" tabindex="0"><td>${at+1}</td>${unitSpan?`<td rowspan="${unitSpan}">${esc(row.unit||record.unit)}</td>`:''}${agencySpan?`<td rowspan="${agencySpan}">${esc(row.agency||record.agency)}</td>`:''}${systemSpan?`<td rowspan="${systemSpan}"><strong>${esc(record.system)}</strong></td>`:`<td><strong>${esc(row.system||'')}</strong></td>`}${kind==='private'?`<td>${docsCell([docId],'active')}</td><td>—</td>`:systemSpan?`<td rowspan="${systemSpan}">${docsCell(record.registeredDocumentIds,'active')}</td><td rowspan="${systemSpan}">${docsCell(record.exchangeDocumentIds)}</td>`:''}${docIds.flatMap(id=>{const app=record.documentAppendices?.[id]||{};const cols=docCols[id].length?docCols[id]:['—'];const vals=kind==='private'?(docId===id?app.privateRows?.[i]||{}:{}):app.rows?.[i]||{};return cols.map(c=>`<td>${esc(vals[c]??'—')}</td>`) }).join('')}${columns.map(c=>`<td>${esc(kind==='shared'?row[c]??'—':'—')}</td>`).join('')}<td><button class="icon-btn-sm" type="button" data-resource-v7-detail="${record.id}" aria-label="Xem chi tiết">${icon('eye')}</button></td></tr>` }).join('')}
      </tbody></table>${records.length ? '' : '<div class="empty">Chưa có tài nguyên phù hợp. Tạo tài nguyên để bắt đầu.</div>'}</div>
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

function exportResourceExcelV7(records, docIds, docCols, privateCols) {
  if (!records.length) return toast('Không có dữ liệu để xuất.');
  if (!window.XLSX?.utils?.aoa_to_sheet) return toast('Thư viện xuất Excel chưa tải được. Vui lòng tải lại trang rồi thử lại.');
  const fixed=['STT','Tên đơn vị','Cơ quan quản lý','Hệ thống','Công văn đăng ký','Văn bản trao đổi'];
  const groups=docIds.map(id=>({id,label:state.documents.find(d=>d.id===id)?.no||state.documents.find(d=>d.id===id)?.documentType||'Văn bản',cols:docCols[id].length?docCols[id]:['—']}));
  const head1=[...fixed,...groups.flatMap(g=>g.cols.map((_,i)=>i===0?g.label:'')),...privateCols.map((_,i)=>i===0?'Phụ lục riêng':'' )];
  const head2=[...fixed.map(()=>''),...groups.flatMap(g=>g.cols),...privateCols];
  const data=[head1,head2], merges=[];
  const flat=records.flatMap(record=>resourceDisplayRowsV7(record,docIds).map(entry=>({record,...entry})));
  flat.forEach(({record,i,kind,docId},idx)=>{
    const nums=(ids)=>(ids||[]).map(id=>state.documents.find(d=>d.id===id)?.no||state.documents.find(d=>d.id===id)?.documentType||'').filter(Boolean).join(', ');
    const identity=kind==='private'?record.documentAppendices?.[docId]?.privateRows?.[i]||{}:record;
    data.push([idx+1,identity.unit||record.unit,identity.agency||record.agency,kind==='private'?identity.system||'':record.system,nums(kind==='private'?[docId]:record.registeredDocumentIds),kind==='private'?'':nums(record.exchangeDocumentIds),...groups.flatMap(g=>g.cols.map(c=>kind==='private'?(g.id===docId?record.documentAppendices?.[g.id]?.privateRows?.[i]?.[c]||'':''):record.documentAppendices?.[g.id]?.rows?.[i]?.[c]||'')),...privateCols.map(c=>kind==='shared'?resourceRowsV7(record)[i]?.[c]||'':'')].map(cleanExcelV7));
  });
  const firstData=2;
  for(let i=0;i<flat.length;){let j=i+1;while(j<flat.length&&flat[j].kind==='shared'&&flat[i].kind==='shared'&&flat[j].record.id===flat[i].record.id)j++;if(j-i>1){[4,5].forEach(col=>merges.push({s:{r:firstData+i,c:col},e:{r:firstData+j-1,c:col}}))}i=j}
  for(let start=0;start<flat.length;){let end=start+1;while(end<flat.length&&flat[end].kind==='shared'&&flat[start].kind==='shared'&&normV7(flat[end].record.unit)===normV7(flat[start].record.unit))end++;if(end-start>1)merges.push({s:{r:firstData+start,c:1},e:{r:firstData+end-1,c:1}});let a=start;while(a<end){let b=a+1;while(b<end&&normV7(flat[b].record.agency)===normV7(flat[a].record.agency))b++;if(b-a>1)merges.push({s:{r:firstData+a,c:2},e:{r:firstData+b-1,c:2}});let c=a;while(c<b){let d=c+1;while(d<b&&flat[d].kind==='shared'&&flat[c].kind==='shared'&&flat[d].record.id===flat[c].record.id)d++;if(d-c>1)merges.push({s:{r:firstData+c,c:3},e:{r:firstData+d-1,c:3}});c=d}a=b}start=end}
  let c=fixed.length;groups.forEach(g=>{if(g.cols.length>1)merges.push({s:{r:0,c},e:{r:0,c:c+g.cols.length-1}});c+=g.cols.length});if(privateCols.length>1)merges.push({s:{r:0,c},e:{r:0,c:c+privateCols.length-1}});
  const ws=window.XLSX.utils.aoa_to_sheet(data);ws['!merges']=merges;ws['!cols']=Array.from({length:head2.length},(_,col)=>({wch:Math.min(48,Math.max(12,...data.map(row=>String(row[col]||'').length+2)))}));
  fixed.forEach((_,col)=>merges.push({s:{r:0,c:col},e:{r:1,c:col}}));ws['!merges']=merges;
  for(let col=0;col<head2.length;col++)for(let row=0;row<2;row++){const cell=ws[window.XLSX.utils.encode_cell({r:row,c:col})];if(cell)cell.s={font:{bold:true},alignment:{vertical:'center',wrapText:true}}}
  try{const wb=window.XLSX.utils.book_new();window.XLSX.utils.book_append_sheet(wb,ws,'Du lieu tai nguyen');const now=new Date(),date=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;window.XLSX.writeFile(wb,`Du_lieu_tai_nguyen_${date}.xlsx`);toast(`Đã xuất ${flat.length} dòng tài nguyên.`)}catch(error){toast('Không thể tạo tệp Excel. Vui lòng thử tải lại trang.')}
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
  drawer(`${d.documentType || d.type} ${d.no || ''}`, d.summary || 'Thông tin văn bản', `<div class="drawer-body"><dl class="task-meta">${[['Loại văn bản', d.documentType || d.type], ['Số', d.no || '—'], ['Ngày phát hành', day(d.date)], ['Trích yếu', d.summary || '—'], ['Cơ quan ban hành', d.agency || '—'], ['Ghi chú', d.note || '—']].map(([k,v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>${fileLinks(d.files || [])}<div class="detail-actions"><button class="btn primary" id="editCatalogV7">Chỉnh sửa</button><button class="btn danger" id="removeCatalogV7">Xóa</button></div><h3>Task liên quan (${linked.length})</h3>${taskList(linked)}</div>`);
  $('#editCatalogV7').onclick = () => catalogFormV7(id);
  $('#removeCatalogV7').onclick = () => { $('#editForm')?.remove(); catalogFormV7(id); $('#deleteCatalogV7')?.click() };
  $$('#overlay [data-task]').forEach(row => row.onclick = () => taskDrawer(row.dataset.task));
}

function resourceFormV7(id = '') {
  const current = state.resourceRecords.find(r => r.id === id);
  if (current && !canEditResourceV7(current)) return toast('Bạn chỉ được sửa tài nguyên do mình quản lý.');
  resourceDraftV7 = V7.clone(current || { id: '', unit: '', agency: '', system: '', level: 'Địa phương', registeredDocumentIds: [], exchangeDocumentIds: [], attachments: [], hardwareColumns: ['STT', 'Tên tài nguyên'], hardwareRows: [{ STT: '1', 'Tên tài nguyên': '' }], sharedHardwareRowCount: 1, documentAppendices: {}, customFields: [], revisions: [], createdBy: '', editors: [], createdAt: '', updatedAt: '' });
  resourceDraftV7.sharedHardwareRowCount ||= Math.max(resourceDraftV7.hardwareRows?.length || 1, 1);
  resourceDraftV7.documentAppendices ||= {};
  (resourceDraftV7.registeredDocumentIds || []).forEach(docId => resourceDraftV7.documentAppendices[docId] ||= {columns:[],rows:Array.from({length:resourceDraftV7.sharedHardwareRowCount},()=>({})),privateRows:[]});
  drawResourceFormV7();
}

function drawResourceFormV7() {
  const r = resourceDraftV7, docs = state.documents.filter(d => !d.archived);
  drawer(r.id ? 'Chỉnh sửa tài nguyên' : 'Tạo tài nguyên', 'Tài nguyên được lưu độc lập với công việc.', `<form id="resourceFormV7" class="resource-v7-form">
    <section class="surface"><h3>Thông tin hệ thống</h3><div class="form-grid">${field('Tên đơn vị *', 'unit', r.unit, 'text', true)}${field('Cơ quan quản lý *', 'agency', r.agency, 'text', true)}${field('Hệ thống *', 'system', r.system, 'text', true)}<label class="field"><span>Cấp quản lý</span><select name="level"><option ${r.level === 'Địa phương' ? 'selected' : ''}>Địa phương</option><option ${r.level === 'Bộ ngành' ? 'selected' : ''}>Bộ ngành</option></select></label></div></section>
    <section class="surface"><h3>Công văn đăng ký</h3>${docs.map(d => `<label class="resource-doc-choice"><input type="checkbox" data-resource-doc="registeredDocumentIds" value="${d.id}" ${(r.registeredDocumentIds || []).includes(d.id) ? 'checked' : ''}> ${esc(d.documentType)} · ${esc(d.no || 'Chưa có số')}</label>`).join('') || '<p class="muted">Chưa có văn bản trong danh mục.</p>'}</section>
    <section class="surface"><h3>Văn bản trao đổi</h3>${docs.map(d => `<label class="resource-doc-choice"><input type="checkbox" data-resource-doc="exchangeDocumentIds" value="${d.id}" ${(r.exchangeDocumentIds || []).includes(d.id) ? 'checked' : ''}> ${esc(d.documentType)} · ${esc(d.no || 'Chưa có số')}</label>`).join('') || '<p class="muted">Chưa có văn bản trong danh mục.</p>'}</section>
    <section class="surface"><div class="toolbar"><h3>Tệp đính kèm tài nguyên</h3><span class="grow"></span><label class="btn">${icon('upload')} Tải tệp lên<input id="resourceFilesV7" type="file" multiple hidden></label></div>${fileLinks(r.attachments || []) || '<p class="muted">Chưa có tệp đính kèm.</p>'}</section>
    <section class="surface"><div class="toolbar"><h3>Phụ lục theo văn bản</h3><span class="grow"></span><select id="resourceAppendixDocV7" aria-label="Chọn văn bản">${(r.registeredDocumentIds||[]).map(id=>{const d=docs.find(x=>x.id===id);return d?`<option value="${id}">${esc(d.no||d.documentType)}</option>`:''}).join('')}</select><button class="btn" type="button" id="resourceCommonColV7">+ Cột cho văn bản</button><button class="btn" type="button" id="resourceCommonRowV7">+ Dòng chung</button><button class="btn" type="button" id="resourcePrivateRowV7">+ Dòng riêng</button></div><p class="small muted">Cột thuộc văn bản đang chọn và áp dụng cho các dòng của văn bản đó. Dòng chung chia sẻ hệ thống giữa các văn bản; dòng riêng chỉ thuộc văn bản đang chọn.</p>${(r.registeredDocumentIds||[]).map(id=>{const d=docs.find(x=>x.id===id);const app=r.documentAppendices[id]||{columns:[],rows:[],privateRows:[]};const cols=app.columns;const rows=Array.from({length:r.sharedHardwareRowCount},(_,i)=>({kind:'shared',i,data:app.rows?.[i]||{}})).concat((app.privateRows||[]).map((data,i)=>({kind:'private',i,data})));return `<div class="resource-doc-appendix"><h4>${esc(d?.documentType||'Văn bản')} ${esc(d?.no||'')}</h4><div class="table-scroll"><table class="dynamic-data-table"><thead><tr><th>Phạm vi dòng / Thông tin hệ thống riêng</th>${cols.map(c=>`<th>${esc(c)} · Văn bản</th>`).join('')}</tr></thead><tbody>${rows.map(({kind,i,data})=>`<tr><td>${kind==='shared'?'Chung':`<div class="resource-private-identity"><input data-appendix-meta-v7="${id}" data-appendix-row-v7="${i}" data-appendix-key-v7="unit" value="${esc(data.unit||r.unit)}" placeholder="Tên đơn vị"><input data-appendix-meta-v7="${id}" data-appendix-row-v7="${i}" data-appendix-key-v7="agency" value="${esc(data.agency||r.agency)}" placeholder="Cơ quan quản lý"><input data-appendix-meta-v7="${id}" data-appendix-row-v7="${i}" data-appendix-key-v7="system" value="${esc(data.system||'')}" placeholder="Hệ thống"></div>`}</td>${cols.map(c=>`<td><input data-appendix-doc-v7="${id}" data-appendix-kind-v7="${kind}" data-appendix-row-v7="${i}" data-appendix-col-v7="${esc(c)}" value="${esc(data[c]??'')}"></td>`).join('')}</tr>`).join('')}</tbody></table></div></div>`}).join('')||'<p class="muted">Chọn ít nhất một công văn đăng ký để khai báo phụ lục theo văn bản.</p>'}</section>
    <section class="surface"><div class="toolbar"><h3>Phụ lục riêng (dữ liệu cũ)</h3><span class="grow"></span><button class="btn" type="button" id="resourceAddColV7">+ Thêm cột</button><button class="btn" type="button" id="resourceAddRowV7">+ Thêm dòng</button></div><div class="table-scroll"><table class="dynamic-data-table"><thead><tr>${r.hardwareColumns.map((c,i) => `<th>${i ? `<input data-resource-col-v7="${i}" value="${esc(c)}">` : esc(c)}</th>`).join('')}<th></th></tr></thead><tbody>${r.hardwareRows.map((row,ri) => `<tr>${r.hardwareColumns.map((c,ci) => `<td><input data-resource-cell-v7="${ri}" data-col-v7="${ci}" value="${esc(row[c] ?? '')}"></td>`).join('')}<td><button type="button" class="icon-btn-sm" data-resource-row-del-v7="${ri}">×</button></td></tr>`).join('')}</tbody></table></div></section>
    <section class="surface"><div class="toolbar"><h3>Trường tùy chỉnh</h3><span class="grow"></span><button class="btn" type="button" id="resourceAddFieldV7">+ Thêm trường</button></div>${r.customFields.map((f,i) => `<div class="custom-row"><input data-resource-custom-name-v7="${i}" placeholder="Tên trường" value="${esc(f.name)}"><input data-resource-custom-value-v7="${i}" placeholder="Giá trị" value="${esc(f.value)}"><button type="button" data-resource-custom-del-v7="${i}">×</button></div>`).join('')}</section>
    <p class="error" id="resourceErrorV7" role="alert"></p><div class="modal-foot"><button type="button" class="btn" id="resourceCancelV7">Hủy</button><button type="submit" class="btn primary">Lưu tài nguyên</button></div></form>`, true);
  const form = $('#resourceFormV7');
  const capture = () => {
    for (const key of ['unit','agency','system','level']) if (form.elements[key]) r[key] = form.elements[key].value;
    $$('[data-resource-doc]').forEach(c => { const key=c.dataset.resourceDoc; r[key] ||= []; r[key] = r[key].filter(x => x !== c.value); if (c.checked) r[key].push(c.value) });
    r.documentAppendices ||= {}; r.sharedHardwareRowCount ||= 1;
    (r.registeredDocumentIds||[]).forEach(id=>{const app=r.documentAppendices[id]||={columns:[],rows:[],privateRows:[]};app.rows||=[];while(app.rows.length<r.sharedHardwareRowCount)app.rows.push({});app.privateRows||=[]});
    $$('[data-resource-cell-v7]').forEach(input => { let row=r.hardwareRows[+input.dataset.resourceCellV7], col=r.hardwareColumns[+input.dataset.colV7]; if(row) row[col]=input.value });
    $$('[data-appendix-doc-v7]').forEach(input=>{const app=r.documentAppendices[input.dataset.appendixDocV7];if(!app)return;const rows=input.dataset.appendixKindV7==='shared'?app.rows:app.privateRows;rows[+input.dataset.appendixRowV7] ||= {};rows[+input.dataset.appendixRowV7][input.dataset.appendixColV7]=input.value});
    $$('[data-appendix-meta-v7]').forEach(input=>{const row=r.documentAppendices[input.dataset.appendixMetaV7]?.privateRows?.[+input.dataset.appendixRowV7];if(row)row[input.dataset.appendixKeyV7]=input.value});
    $$('[data-resource-col-v7]').forEach(input => { const i=+input.dataset.resourceColV7, old=r.hardwareColumns[i], next=input.value.trim(); if(next && old!==next){r.hardwareColumns[i]=next;r.hardwareRows.forEach(row=>{row[next]=row[old]??'';if(old!=='STT')delete row[old]})} });
    $$('[data-resource-custom-name-v7]').forEach(e => r.customFields[+e.dataset.resourceCustomNameV7].name=e.value);
    $$('[data-resource-custom-value-v7]').forEach(e => r.customFields[+e.dataset.resourceCustomValueV7].value=e.value);
  };

  form.oninput = capture; form.onchange = e => {capture(); if(e.target.matches('[data-resource-doc]'))drawResourceFormV7()};
  form.onsubmit = e => { e.preventDefault(); capture(); try { saveResourceV7(r) } catch(err) { $('#resourceErrorV7').textContent=err.message } };
  $('#resourceCancelV7').onclick = closeOverlay;
  $('#resourceFilesV7')?.addEventListener('change',async e=>{try{r.attachments.push(...await storeFiles(e.target.files));drawResourceFormV7()}catch(err){$('#resourceErrorV7').textContent=err.message}});
  $('#resourceAddColV7').onclick = () => { capture(); const name=prompt('Tên cột mới:'); if(name?.trim() && !r.hardwareColumns.includes(name.trim())){r.hardwareColumns.push(name.trim());r.hardwareRows.forEach(row=>row[name.trim()]='');drawResourceFormV7()} };
  $('#resourceCommonColV7').onclick=()=>{capture();const id=$('#resourceAppendixDocV7')?.value;if(!id)return toast('Chọn văn bản trước.');const app=r.documentAppendices[id]||={columns:[],rows:Array.from({length:r.sharedHardwareRowCount},()=>({})),privateRows:[]};const name=prompt('Tên cột cho văn bản đang chọn:');if(name?.trim()&&!app.columns.includes(name.trim())&&!r.hardwareColumns.includes(name.trim())){app.columns.push(name.trim());drawResourceFormV7()}};
  $('#resourceCommonRowV7').onclick=()=>{capture();r.sharedHardwareRowCount++;(r.registeredDocumentIds||[]).forEach(id=>{const app=r.documentAppendices[id]||={columns:[],rows:[],privateRows:[]};app.rows||=[];app.rows.push({})});drawResourceFormV7()};
  $('#resourcePrivateRowV7').onclick=()=>{capture();const id=$('#resourceAppendixDocV7')?.value;if(!id)return toast('Chọn văn bản trước.');const app=r.documentAppendices[id]||={columns:[],rows:Array.from({length:r.sharedHardwareRowCount},()=>({})),privateRows:[]};app.privateRows||=[];app.privateRows.push({unit:r.unit,agency:r.agency,system:''});drawResourceFormV7()};
  $('#resourceAddRowV7').onclick = () => { capture(); const row={};r.hardwareColumns.forEach((c,i)=>row[c]=i===0?String(r.hardwareRows.length+1):'');r.hardwareRows.push(row);drawResourceFormV7() };
  $$('[data-resource-row-del-v7]').forEach(b=>b.onclick=()=>{capture();r.hardwareRows.splice(+b.dataset.resourceRowDelV7,1);drawResourceFormV7()});
  $('#resourceAddFieldV7').onclick = () => {capture();r.customFields.push({name:'',value:''});drawResourceFormV7()};
  $$('[data-resource-custom-del-v7]').forEach(b=>b.onclick=()=>{capture();r.customFields.splice(+b.dataset.resourceCustomDelV7,1);drawResourceFormV7()});
}

function saveResourceV7(draft) {
  if (!draft.unit.trim() || !draft.agency.trim() || !draft.system.trim()) throw Error('Nhập tên đơn vị, cơ quan quản lý và hệ thống.');
  if(Object.values(draft.documentAppendices||{}).some(app=>(app.privateRows||[]).some(row=>!row.unit?.trim()||!row.agency?.trim()||!row.system?.trim())))throw Error('Nhập đủ tên đơn vị, cơ quan quản lý và hệ thống cho từng dòng riêng.');
  const key = [draft.unit,draft.agency,draft.system].map(normV7).join('|');
  const existing = state.resourceRecords.find(item => item.id !== draft.id && [item.unit,item.agency,item.system].map(normV7).join('|') === key);
  const current = state.resourceRecords.find(item => item.id === draft.id);
  const target = current || existing;
  const old = target ? V7.clone(target) : null;
  if (target && !canEditResourceV7(target)) throw Error('Bạn không có quyền sửa tài nguyên này.');
  const at=V7.now(), actor=session;
  if (target) {
    const revisions=target.revisions||[], createdBy=target.createdBy||actor, createdAt=target.createdAt||at;
    const appendices=current?draft.documentAppendices:{...(target.documentAppendices||{})};
    if(!current)for(const [docId,app] of Object.entries(draft.documentAppendices||{})){const prior=appendices[docId]||{columns:[],rows:[],privateRows:[]};appendices[docId]={columns:[...new Set([...(prior.columns||[]),...(app.columns||[])])],rows:Array.from({length:Math.max(prior.rows?.length||0,app.rows?.length||0)},(_,i)=>({...prior.rows?.[i],...app.rows?.[i]})),privateRows:[...(prior.privateRows||[]),...(app.privateRows||[])]}}
    Object.assign(target, draft, { id: target.id, createdBy, createdAt, revisions, registeredDocumentIds:current?draft.registeredDocumentIds:[...new Set([...(target.registeredDocumentIds||[]),...draft.registeredDocumentIds])], exchangeDocumentIds:current?draft.exchangeDocumentIds:[...new Set([...(target.exchangeDocumentIds||[]),...draft.exchangeDocumentIds])], attachments:current?draft.attachments:[...new Map([...(target.attachments||[]),...draft.attachments].map(file=>[file.id,file])).values()], hardwareRows:current?draft.hardwareRows:[...(target.hardwareRows||[]),...draft.hardwareRows], hardwareColumns:[...new Set([...(target.hardwareColumns||[]),...draft.hardwareColumns])], sharedHardwareRowCount:Math.max(target.sharedHardwareRowCount||0,draft.sharedHardwareRowCount||0), documentAppendices:appendices, customFields:current?draft.customFields:[...(target.customFields||[]),...draft.customFields], updatedAt:at });
    target.editors=[...new Set([...(target.editors||[]),actor])];
    target.revisions ||= [];
    const snapshot=V7.clone(target);delete snapshot.revisions;
    const changes=Object.keys(target).filter(key=>key!=='revisions'&&JSON.stringify(old?.[key])!==JSON.stringify(target[key])).map(field=>({field,old:old?.[field],new:target[field]}));
    target.revisions.push({id:V7.id(),at,actorId:actor,action:'Cập nhật tài nguyên',changes,data:snapshot});
  } else {
    Object.assign(draft,{id:V7.id(),createdBy:actor,editors:[actor],createdAt:at,updatedAt:at,revisions:[{id:V7.id(),at,actorId:actor,action:'Tạo tài nguyên',changes:[],data:V7.clone(draft)}]});
    state.resourceRecords.push(draft);
  }
  persist(); resourceDraftV7=null;closeOverlay();render();toast(existing?'Đã gộp thông tin vào hệ thống cùng đơn vị và cơ quan quản lý.':'Đã lưu tài nguyên.');
}

function resourceDetailV7(id, revisionId = '') {
  const r=state.resourceRecords.find(item=>item.id===id);if(!r)return;
  const history=[...(r.revisions||[])].sort((a,b)=>b.at.localeCompare(a.at));
  const selected=history.find(item=>item.id===revisionId)||history[0];
  const snap=selected?.data||r;
  const docAppendices=(snap.registeredDocumentIds||[]).map(docId=>{const d=state.documents.find(x=>x.id===docId);const app=snap.documentAppendices?.[docId];if(!d||!app)return '';const cols=app.columns||[];const rows=[...(app.rows||[]).map((row,i)=>({scope:`Dòng chung ${i+1}`,row})),...(app.privateRows||[]).map((row,i)=>({scope:`Dòng riêng ${i+1} · ${row.unit||''} / ${row.agency||''} / ${row.system||''}`,row}))];return `<h3>Phụ lục · ${esc(d.no||d.documentType)}</h3><div class="table-scroll"><table class="data-table"><thead><tr><th>Phạm vi / hệ thống</th>${cols.map(c=>`<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${rows.map(({scope,row})=>`<tr><td>${esc(scope)}</td>${cols.map(c=>`<td>${esc(row[c]||'—')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`}).join('');
  const values=[['Tên đơn vị',snap.unit],['Cơ quan quản lý',snap.agency],['Hệ thống',snap.system],['Cấp quản lý',snap.level],['Công văn đăng ký',(snap.registeredDocumentIds||[]).map(id=>state.documents.find(d=>d.id===id)?.no||'').filter(Boolean).join(', ')||'—'],['Văn bản trao đổi',(snap.exchangeDocumentIds||[]).map(id=>state.documents.find(d=>d.id===id)?.no||'').filter(Boolean).join(', ')||'—']];
  drawer(`${r.unit} / ${r.agency}`, 'Thông tin tài nguyên', `<div class="resource-v7-detail"><aside class="resource-v7-timeline"><h3>Lịch sử cập nhật</h3>${history.map(h=>`<button class="timeline-btn ${selected?.id===h.id?'selected':''}" data-resource-history-v7="${h.id}"><strong>${esc(h.action)}</strong><small>${fmt(h.at)} · ${esc(userName(h.actorId))}</small></button>`).join('')||'<p class="muted">Chưa có lịch sử.</p>'}</aside><section class="resource-v7-snapshot"><h2>${esc(snap.system)}</h2><dl class="task-meta">${values.map(([k,v])=>`<div><dt>${k}</dt><dd>${esc(v||'—')}</dd></div>`).join('')}</dl>${docAppendices}<h3>Phụ lục riêng</h3><div class="table-scroll"><table class="data-table"><thead><tr>${(snap.hardwareColumns||[]).map(c=>`<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${(snap.hardwareRows||[]).map(row=>`<tr>${snap.hardwareColumns.map(c=>`<td>${esc(row[c]||'—')}</td>`).join('')}</tr>`).join('')}</tbody></table></div><h3>Tệp đính kèm</h3>${fileLinks(snap.attachments||[])}<h3>Thông tin bổ sung</h3>${(snap.customFields||[]).map(f=>`<div class="detail-pair"><span>${esc(f.name||'Trường')}</span><strong>${esc(f.value||'—')}</strong></div>`).join('')||'<p class="muted">Chưa có trường bổ sung.</p>'}<p class="small muted">${selected?`${esc(selected.action)} bởi ${esc(userName(selected.actorId))} · ${fmt(selected.at)}`:''}</p><div class="detail-actions">${canEditResourceV7(r)?'<button class="btn primary" id="editResourceV7">Chỉnh sửa</button><button class="btn danger" id="deleteResourceV7">Xóa tài nguyên</button>':''}</div></section></div>`,true);
  $('#overlay .drawer')?.classList.add('resource-v7-drawer');
  $$('[data-resource-history-v7]').forEach(b=>b.onclick=()=>resourceDetailV7(id,b.dataset.resourceHistoryV7));
  $('#editResourceV7')?.addEventListener('click',()=>resourceFormV7(id));
  $('#deleteResourceV7')?.addEventListener('click',()=>{state.resourceRecords=state.resourceRecords.filter(x=>x.id!==id);persist();render();toast('Đã xóa tài nguyên')});
}

function bindV7() {
  $$('[data-kanban-tab]').forEach(btn=>btn.onclick=()=>{activeTaskFilter.bucket=btn.dataset.kanbanTab==='all'?'':btn.dataset.kanbanTab;render()});
  $$('[data-bucket]').forEach(btn=>btn.onclick=()=>{activeTaskFilter.bucket=btn.dataset.bucket;page='tasks';render()});
  $$('[data-catalog-type-v7]').forEach(btn=>btn.onclick=()=>{catalogTypeFilter=btn.dataset.catalogTypeV7;render()});
  $('#catalogSearchV7')?.addEventListener('input',e=>{catalogSearchV7=e.target.value;$('#catalogTableV7').innerHTML=catalogTableV7();bindCatalogV7()});
  $$('[data-catalog-v7-new]').forEach(btn=>btn.onclick=()=>catalogFormV7());
  $('#resourceSearchV7')?.addEventListener('input',e=>{resourceSearchV7=e.target.value;render()});
  $('#resourceDocumentFilterV7')?.addEventListener('change',e=>{resourceFilters.documents=e.target.value?[e.target.value]:[];render()});
  $('#resourceSelfV7')?.addEventListener('change',e=>{resourceFilters.self=e.target.checked;render()});
  $('#exportResourceExcelV7')?.addEventListener('click',()=>{const recs=state.resourceRecords.filter(record=>{if(resourceFilters.self&&record.createdBy!==session&&!(record.editors||[]).includes(session))return false;if(resourceFilters.documents?.length&&!resourceFilters.documents.some(id=>[...(record.registeredDocumentIds||[]),...(record.exchangeDocumentIds||[])].includes(id)))return false;return !resourceSearchV7||`${record.unit} ${record.agency} ${record.system}`.toLocaleLowerCase('vi').includes(resourceSearchV7.toLocaleLowerCase('vi'))}).sort((a,b)=>a.unit.localeCompare(b.unit,'vi')||a.agency.localeCompare(b.agency,'vi')||a.system.localeCompare(b.system,'vi'));const ids=[...new Set(recs.flatMap(r=>r.registeredDocumentIds||[]))];const dc=Object.fromEntries(ids.map(id=>[id,[...new Set(recs.flatMap(r=>r.documentAppendices?.[id]?.columns||[]))]]));const pc=[...new Set(recs.flatMap(r=>(r.hardwareColumns||[]).filter(c=>c!=='STT')))];exportResourceExcelV7(recs,ids,dc,pc)});
  $('#clearResourceV7')?.addEventListener('click',()=>{resourceSearchV7='';resourceFilters={documents:[],groups:[],levels:[],month:'',self:false};render()});
  $$('[data-resource-v7]').forEach(row=>{
    row.onclick=e=>{if(!e.target.closest('button'))resourceDetailV7(row.dataset.resourceV7)};
    row.onkeydown=e=>{if((e.key==='Enter'||e.key===' ')&&!e.target.closest('button')){e.preventDefault();resourceDetailV7(row.dataset.resourceV7)}};
  });
  $$('[data-resource-v7-detail]').forEach(btn=>btn.onclick=e=>{e.stopPropagation();resourceDetailV7(btn.dataset.resourceV7Detail)});
}

function bindCatalogV7() {
  $$('[data-catalog-v7-row]').forEach(row=>{
    row.onclick=e=>{if(!e.target.closest('button'))catalogDetailV7(row.dataset.catalogV7Row)};
    row.onkeydown=e=>{if((e.key==='Enter'||e.key===' ')&&!e.target.closest('button')){e.preventDefault();catalogDetailV7(row.dataset.catalogV7Row)}};
  });
  $$('[data-catalog-v7-detail]').forEach(btn=>btn.onclick=e=>{e.stopPropagation();catalogDetailV7(btn.dataset.catalogV7Detail)});
}

const bindBeforeV7 = bindWorkspace;
bindWorkspace = function () { bindBeforeV7(); bindV7(); bindCatalogV7(); };
const actionBeforeV7 = action;
action = function (name) {
  if (name === 'new-resource' || name === 'add-row') return resourceFormV7();
  if (name === 'new-catalog-v7') return catalogFormV7();
  if (name === 'new-task') return taskForm();
  return actionBeforeV7(name);
};

// Load any stored v6 prototype once, preserving the old data while switching to the decoupled resource model.
const persistedV7Snapshot = localStorage.getItem('c12-prototype-v7');
if (persistedV7Snapshot) { try { const current=JSON.parse(persistedV7Snapshot); if(current?.version===7) state=current } catch {} }
render();
