'use strict';
state.tableColumns ||= (state.columns || []).map(c => ({ ...c, docId: c.doc ? (state.officials || state.documents || []).find(d => d.no === c.doc)?.id || 'legacy-' + c.doc : '' }));
state.tableCellValues ||= {};
state.resourceDisplayOrder ||= {};

function sourceChoicesForRow(row) {
  return row.tasks.map(taskBy).filter(t => t && (admin() || t.assigneeIds.includes(session)));
}

function allSourceSelect(row) {
  return `<label class="field"><span>Task nguồn được cập nhật</span><select name="sourceTaskId">${sourceChoicesForRow(row).map(t => `<option value="${t.id}">${esc(t.code)} · ${esc(t.title)}</option>`).join('')}</select></label>`;
}

function identityCellEditor(row, field) {
  let choices = sourceChoicesForRow(row);
  if (!choices.length) return toast('Bạn chỉ sửa ô của task đang giao cho mình.');
  let link = field === 'officialIds' || field === 'documentIds',
    kind = field === 'officialIds' ? 'officials' : 'documents',
    label = { stt: 'STT hiển thị', unit: 'Tên đơn vị', agency: 'Cơ quan quản lý', system: 'Hệ thống', officialIds: 'Công văn đăng ký', documentIds: 'Văn bản' }[field],
    value = field === 'stt' ? state.resourceDisplayOrder[row.key] || '' : row[field] || '';

  modal('Sửa ô: ' + label, `<div class="notice">Dòng có thể gộp từ nhiều task. Chọn task nguồn để cập nhật; các nguồn khác và bản lịch sử được giữ.</div>${allSourceSelect(row)}${link ? `<label class="field"><span>${label}</span><select name="linkedIds" multiple size="7">${state[kind].filter(d => !d.archived).map(d => `<option value="${d.id}" ${row[field].includes(d.id) ? 'selected' : ''}>${esc(d.no)} · ${esc(d.summary)}</option>`).join('')}</select></label>` : field === 'stt' ? fieldInput(label, 'value', value, 'number') : fieldInput(label, 'value', value)}`, (_data, f) => {
    let t = taskBy(f.elements.sourceTaskId.value);
    if (!M.canEditCell(state, me(), t)) throw Error('Bạn không có quyền sửa task nguồn.');
    let changes = [];
    if (link) {
      let next = [...f.elements.linkedIds.selectedOptions].map(o => o.value);
      if (field === 'officialIds' && !next.length) throw Error('Task theo công văn cần ít nhất một công văn.');
      if (field === 'officialIds' && next.some(id => { let d = docBy(kind, id); return !d.date || !d.summary?.trim() })) throw Error('Công văn được chọn cần đủ ngày phát hành và trích yếu.');
      changes.push({ field: label, old: t[field], new: next });
      t[field] = next;
    } else if (field === 'stt') {
      let next = Number(f.elements.value.value);
      if (!Number.isInteger(next) || next < 1) throw Error('STT phải là số nguyên dương.');
      changes.push({ field: label, old: state.resourceDisplayOrder[row.key], new: next });
      state.resourceDisplayOrder[row.key] = next;
    } else if (field === 'system') {
      let next = f.elements.value.value.trim();
      if (!next) throw Error('Tên hệ thống không được trống.');
      for (let item of t.resources.filter(r => r.system === row.system)) {
        changes.push({ field: 'Hệ thống', old: item.system, new: next });
        item.system = next;
      }
    } else {
      let next = f.elements.value.value.trim();
      if (!next) throw Error('Thông tin không được trống.');
      changes.push({ field: label, old: t[field], new: next });
      t[field] = next;
    }
    M.revision(t, session, 'Sửa ô thông tin tài nguyên', changes);
    done('Đã cập nhật task nguồn và ghi lịch sử');
  });
}

const fieldInput = (label, name, value, type = 'text') => `<label class="field"><span>${esc(label)}</span><input name="${name}" value="${esc(value)}" type="${type}" required></label>`;

function globalColumnForm(id) {
  let c = state.tableColumns.find(x => x.id === id) || {};
  modal(id ? 'Sửa cột bảng' : 'Thêm cột bảng', `${fieldInput('Tên cột', 'name', c.name || '')}<label class="field"><span>Vị trí</span><select name="docId"><option value="">Cột chung</option>${state.officials.filter(d => !d.archived).map(d => `<option value="${d.id}" ${c.docId === d.id ? 'selected' : ''}>Nhóm công văn ${esc(d.no)}</option>`).join('')}</select></label><p class="notice">Cấu trúc cột dùng chung mọi dòng/người dùng. Giá trị từng dòng gắn task nguồn.</p>${id ? '<button class="btn danger" type="button" id="deleteGlobalColumn">Xóa cột</button>' : ''}`, d => {
    if (state.tableColumns.some(x => x.id !== id && x.name.trim() === d.name.trim() && x.docId === d.docId)) throw Error('Cột đã tồn tại trong vị trí này.');
    if (id) Object.assign(c, d); else state.tableColumns.push({ ...d, id: M.id() });
    done('Đã lưu cột chung của bảng');
  });
  $('#deleteGlobalColumn')?.addEventListener('click', () => {
    if (confirm('Xóa cột khỏi bảng hiện tại? Các mốc lịch sử task vẫn giữ.')) {
      state.tableColumns = state.tableColumns.filter(x => x.id !== id);
      done('Đã xóa cột khỏi bảng');
    }
  });
}

function globalCellSource(row, columnId) {
  let options = [];
  for (let tid of row.tasks) {
    let t = taskBy(tid);
    for (let item of t.resources.filter(i => i.system === row.system)) {
      let v = item.tableValues?.[columnId];
      if (v) options.push({ ...v, taskId: t.id, itemId: item.id });
    }
  }
  return options.sort((a, b) => b.at.localeCompare(a.at) || (b.seq || 0) - (a.seq || 0))[0];
}

function globalCellEditor(row, c) {
  let source = globalCellSource(row, c.id), t = source ? taskBy(source.taskId) : null;
  if (t && !M.canEditCell(state, me(), t)) return toast('Ô này thuộc task không được giao cho bạn.');
  if (!sourceChoicesForRow(row).length) return toast('Bạn không có task nguồn được phép cập nhật.');
  modal('Sửa ô: ' + c.name, `${source ? `<p class="notice">Nguồn: ${esc(t.code)}</p>` : allSourceSelect(row)}${fieldInput(c.name, 'value', source?.value ?? '')}`, d => {
    let target = source ? taskBy(source.taskId) : taskBy(d.sourceTaskId);
    if (!M.canEditCell(state, me(), target)) throw Error('Bạn không có quyền sửa ô.');
    let item = source ? target.resources.find(i => i.id === source.itemId) : target.resources.find(i => i.system === row.system);
    item.tableValues ||= {};
    let old = item.tableValues[c.id]?.value;
    item.tableValues[c.id] = { value: d.value, at: M.now(), seq: state.saveSeq = (state.saveSeq || 0) + 1 };
    M.revision(target, session, 'Sửa ô cột bổ sung', [{ field: c.name, old, new: d.value }]);
    done('Đã cập nhật ô và lịch sử task');
  });
}

// =========================================================
// YÊU CẦU 6: BẢNG DỮ LIỆU TÀI NGUYÊN (CỘT CHI TIẾT & HOVER 2 TẦNG)
// =========================================================
function decorateResourceTable() {
  if (page !== 'resources' || resourceLegacy || !$('#resourcePanel table')) return;
  let table = $('#resourcePanel table');
  if (table.classList.contains('resource-v7-table')) return;
  let top = table.tHead?.rows?.[0],
    sub = table.tHead?.rows?.[1],
    allRows = M.projectCells(state, me()),
    common = (state.tableColumns || []).filter(c => !c.docId),
    docs = [...(top?.querySelectorAll('th.group') || [])].map(th => (state.officials || state.documents || []).find(d => th.textContent.trim() === 'Công văn ' + d.no)?.id).filter(Boolean);
  if (!top || !sub) return;

  // Insert common columns into thead
  for (let c of common) {
    let th = document.createElement('th');
    th.rowSpan = 2;
    th.innerHTML = esc(c.name) + ` <button data-global-column="${c.id}" aria-label="Sửa cột ${esc(c.name)}">${icon('edit')}</button>`;
    top.insertBefore(th, top.querySelector('th.group'));
  }

  // Insert document-specific columns into subhead
  let offset = 0;
  for (let did of docs) {
    let th = [...top.querySelectorAll('th.group')].find(h => h.textContent.trim() === 'Công văn ' + docBy('officials', did).no),
      baseSpan = th.colSpan,
      extra = state.tableColumns.filter(c => c.docId === did);
    offset += baseSpan;
    for (let c of extra) {
      let cell = document.createElement('th');
      cell.innerHTML = esc(c.name) + ` <button data-global-column="${c.id}" aria-label="Sửa cột ${esc(c.name)}">${icon('edit')}</button>`;
      sub.insertBefore(cell, sub.children[offset] || null);
      offset++;
    }
    th.colSpan += extra.length;
  }

  // Decorate table rows
  for (let tr of table.tBodies[0].rows) {
    // tr.cells[0] is Chi tiết column
    // tr.cells[1] is STT with dataset.resourceKey
    let key = tr.cells[1]?.dataset.resourceKey || tr.cells[0]?.querySelector('[data-resource-detail]')?.dataset.resourceDetail,
      row = allRows.find(r => r.key === key);
    if (!row) continue;

    // Base cells: STT, Unit, Agency, System, OfficialIds, DocumentIds
    let base = [...tr.cells].slice(1, 7);
    base.forEach((td, i) => {
      td.removeAttribute('data-resource-key');
      td.classList.add('metadata-editable');
      td.title = 'Click để sửa thông tin';
      td.onclick = e => {
        if (e.target.closest('[data-resource-detail]')) return;
        e.stopPropagation();
        identityCellEditor(row, ['stt', 'unit', 'agency', 'system', 'officialIds', 'documentIds'][i]);
      };
    });

    if (state.resourceDisplayOrder[key]) base[0].textContent = state.resourceDisplayOrder[key];

    // Insert common custom columns into tbody
    for (let c of common) {
      let td = customTd(row, c);
      tr.insertBefore(td, tr.cells[7 + common.indexOf(c)] || null);
    }

    let bodyOffset = 7 + common.length;
    for (let did of docs) {
      let originalCount = [...table.tHead.rows[0].querySelectorAll('th.group')].find(h => h.textContent.trim() === 'Công văn ' + docBy('officials', did).no).colSpan - state.tableColumns.filter(c => c.docId === did).length;
      bodyOffset += originalCount;
      for (let c of state.tableColumns.filter(c => c.docId === did)) {
        tr.insertBefore(customTd(row, c), tr.cells[bodyOffset] || null);
        bodyOffset++;
      }
    }
  }

  $$('[data-global-column]').forEach(b => b.onclick = () => globalColumnForm(b.dataset.globalColumn));
  $('#addProjectionColumn')?.addEventListener('click', () => globalColumnForm());
  $('#addProjectionColumnBottom')?.addEventListener('click', () => globalColumnForm());
}

function customTd(row, c) {
  let source = globalCellSource(row, c.id),
    td = document.createElement('td'),
    b = document.createElement('button');
  b.className = 'cell-value editable';
  b.textContent = source?.value ?? '—';
  b.onclick = e => {
    e.stopPropagation();
    globalCellEditor(row, c);
  };
  td.append(b);
  return td;
}

const workspaceBindTable = bindWorkspace;
bindWorkspace = function () {
  workspaceBindTable();
  decorateResourceTable();
};

// =========================================================
// YÊU CẦU 4: BỘ LỌC ĐA CHỌN TRÊN BẢNG TÀI NGUYÊN
// =========================================================
const workspaceBindResourceFilters = bindWorkspace;
bindWorkspace = function () {
  workspaceBindResourceFilters();
  if (page === 'resources' && !resourceLegacy) {
    // Multi-select events for resource filters
    $$('[data-multi-toggle="resourceOfficials"]').forEach(b => {
      b.onclick = e => {
        e.stopPropagation();
        openDropdownKey = openDropdownKey === 'resourceOfficials' ? '' : 'resourceOfficials';
        render();
      };
    });

    $$('[data-multi-toggle="resourceDocuments"]').forEach(b => {
      b.onclick = e => {
        e.stopPropagation();
        openDropdownKey = openDropdownKey === 'resourceDocuments' ? '' : 'resourceDocuments';
        render();
      };
    });

    $$('[data-multi-item="resourceOfficials"]').forEach(cb => {
      cb.onchange = () => {
        let val = cb.value;
        resourceFilters.officials ||= [];
        if (cb.checked) {
          if (!resourceFilters.officials.includes(val)) resourceFilters.officials.push(val);
        } else {
          resourceFilters.officials = resourceFilters.officials.filter(x => x !== val);
        }
        render();
      };
    });

    $$('[data-multi-item="resourceDocuments"]').forEach(cb => {
      cb.onchange = () => {
        let val = cb.value;
        resourceFilters.documents ||= [];
        if (cb.checked) {
          if (!resourceFilters.documents.includes(val)) resourceFilters.documents.push(val);
        } else {
          resourceFilters.documents = resourceFilters.documents.filter(x => x !== val);
        }
        render();
      };
    });

    $$('[data-multi-all="resourceOfficials"]').forEach(btn => {
      btn.onclick = e => {
        e.stopPropagation();
        resourceFilters.officials = state.officials.filter(d => !d.archived).map(d => d.id);
        render();
      };
    });

    $$('[data-multi-clear="resourceOfficials"]').forEach(btn => {
      btn.onclick = e => {
        e.stopPropagation();
        resourceFilters.officials = [];
        render();
      };
    });

    $$('[data-multi-all="resourceDocuments"]').forEach(btn => {
      btn.onclick = e => {
        e.stopPropagation();
        resourceFilters.documents = state.documents.filter(d => !d.archived).map(d => d.id);
        render();
      };
    });

    $$('[data-multi-clear="resourceDocuments"]').forEach(btn => {
      btn.onclick = e => {
        e.stopPropagation();
        resourceFilters.documents = [];
        render();
      };
    });

    $('#resourceSelf')?.addEventListener('change', e => {
      resourceFilters.self = e.target.checked;
      render();
    });

    $('#clearResourceFilters')?.addEventListener('click', () => {
      resourceFilters = { officials: [], documents: [], groups: [], levels: [], month: '', self: false };
      openDropdownKey = '';
      render();
    });
  }
};

function resourceTreeHeader() {
  let table = $('#resourcePanel table');
  if (page !== 'resources' || resourceLegacy || !table?.tHead?.rows[1]) return;
  let first = [...table.tHead.rows[0].cells],
    second = [...table.tHead.rows[1].cells],
    bases = first.filter(th => !th.classList.contains('group')),
    groups = first.filter(th => th.classList.contains('group')),
    root = { children: [] },
    index = 0;

  for (let group of groups) {
    let parent = { label: group.textContent.trim(), children: [] };
    root.children.push(parent);
    for (let i = 0; i < group.colSpan; i++) {
      let leaf = second[index++];
      if (!leaf) continue;
      let columnButton = leaf.querySelector('[data-global-column]'),
        label = leaf.textContent.trim(),
        parts = label.split(/\s*\/\s*/);
      if (parts[0] === 'Disk') {
        parts[0] = 'Disk (TB)';
        let m = parts[1]?.match(/^(Block|File Storage) (SSD|HDD)(?: \(TB\))?$/);
        if (m) parts = [parts[0], m[1], m[2]];
        else if (parts[1]) parts[1] = parts[1].replace(' (TB)', '');
      }
      let node = parent;
      for (let j = 0; j < parts.length; j++) {
        let last = node.children.at(-1),
          final = j === parts.length - 1;
        if (!final && last?.label === parts[j] && last.children.length) node = last;
        else {
          let next = { label: parts[j], children: [], columnId: final ? columnButton?.dataset.globalColumn : null };
          node.children.push(next);
          node = next;
        }
      }
    }
  }

  let depth = n => n.children.length ? 1 + Math.max(...n.children.map(depth)) : 1,
    count = n => n.children.length ? n.children.reduce((sum, n) => sum + count(n), 0) : 1,
    max = Math.max(2, ...root.children.map(depth)),
    rows = Array.from({ length: max }, () => []);

  for (let b of bases) {
    let clone = b.cloneNode(true);
    clone.rowSpan = max;
    rows[0].push(clone.outerHTML);
  }

  function add(n, level) {
    rows[level].push(`<th class="${level === 0 ? 'group' : ''}" colspan="${count(n)}" ${!n.children.length ? `rowspan="${max - level}"` : ''}>${esc(n.label)}${n.columnId ? ` <button data-global-column="${n.columnId}" aria-label="Sửa cột ${esc(n.label)}">${icon('edit')}</button>` : ''}</th>`);
    for (let child of n.children) add(child, level + 1);
  }

  for (let g of root.children) add(g, 0);
  table.tHead.outerHTML = '<thead>' + rows.map((r, i) => `<tr style="--head-top:${i * 39}px" class="header-level-${i}">${r.join('')}</tr>`).join('') + '</thead>';
  $$('[data-global-column]').forEach(b => b.onclick = () => globalColumnForm(b.dataset.globalColumn));
}

const workspaceBindTree = bindWorkspace;
bindWorkspace = function () {
  workspaceBindTree();
  resourceTreeHeader();
};

const catalogSearchFields = d => `${d.no} ${d.date} ${d.summary}`.toLocaleLowerCase('vi');

workspaceSearch = function () {
  let term = q.toLocaleLowerCase('vi'),
    tasks = visibleTasks().filter(t => [t.title, t.code, t.description, ...t.aliases].join(' ').toLocaleLowerCase('vi').includes(term)),
    resources = M.projectCells(state, me()).filter(r => [r.unit, r.agency, r.system, ...Object.values(r.cells).map(c => c.value)].join(' ').toLocaleLowerCase('vi').includes(term)),
    knowledge = state.knowledge.filter(k => `${k.title} ${k.summary}`.toLocaleLowerCase('vi').includes(term));

  return head('Kết quả tìm kiếm') +
    `<div class="stack">
    <section class="surface">
      <div class="toolbar"><h2>Công việc (${tasks.length})</h2></div>
      ${taskList(tasks)}
    </section>
    <section class="surface panel-pad">
      <h2>Tài nguyên (${resources.length})</h2>
      ${resources.map(r => `<button class="nav-link" data-resource-key="${esc(r.key)}">${icon('folder')}${esc(r.system)}<small style="color:var(--muted);margin-left:8px">${esc(r.unit)} / ${esc(r.agency)}</small></button>`).join('') || '<p class="muted">Không có kết quả.</p>'}
    </section>
    <div class="catalog-split">
      ${['officials', 'documents'].map(kind => `<section class="surface">
        <div class="toolbar"><h2>${kind === 'officials' ? 'Công văn' : 'Văn bản'}</h2></div>
        ${catalogWorkspaceTable(kind, q)}
      </section>`).join('')}
    </div>
    <section class="surface panel-pad">
      <h2>Kiến thức tổ (${knowledge.length})</h2>
      ${knowledge.map(k => `<button class="nav-link" data-knowledge="${k.id}">${icon('book')}${esc(k.title)}</button>`).join('') || '<p class="muted">Không có kết quả.</p>'}
    </section>
  </div>`;
};

searchView = workspaceSearch;
render();
