'use strict';
const legacyUpgradeHeader = upgradeHeader;
upgradeHeader = function () { if (state.version < 7) legacyUpgradeHeader() };

function taskDetailContent(t, current, readonly = false, docContext = '') {
  const resourceData = t.type === 'resource' ? t.resourceData : null;
  const resourceDocValues = (ids = []) => ids.map(id => state.documents.find(doc => doc.id === id)).filter(Boolean).map(doc => `${doc.documentType || doc.type} ${doc.no || ''}`.trim()).join(', ') || '—';
  const resourceAppendices = resourceData ? (resourceData.registeredDocumentIds || []).map(id => {
    const doc = state.documents.find(item => item.id === id), appendix = resourceData.documentAppendices?.[id];
    if (!doc || !appendix) return '';
    const columns = typeof resourceDocColumnsV7 === 'function' ? resourceDocColumnsV7(id, [resourceData]) : appendix.columns || [];
    return `<section class="surface task-detail-section task-detail-appendix"><h3>${esc(doc.documentType || doc.type)} ${esc(doc.no || '')}</h3><div class="table-scroll"><table class="data-table"><thead><tr>${columns.map(column => `<th>${esc(column)}</th>`).join('')}</tr></thead><tbody>${(appendix.rows || []).map(row => `<tr>${columns.map(column => `<td>${esc(row[column] || '—')}</td>`).join('')}</tr>`).join('')}</tbody></table></div></section>`;
  }).join('') : '';
  return `<section class="surface task-detail-title task-detail-section task-detail-summary-surface">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
      <span class="chip active">${esc(t.code)}</span>
      ${badge(t)}
    </div>
    <h2 style="font-size:20px;font-weight:700;margin-bottom:6px">${esc(t.title)}</h2>
    <p class="muted" style="line-height:1.6">${esc(t.description || 'Chưa có mô tả công việc')}</p>
  </section>

  <section class="surface task-detail-section task-detail-meta-surface">
  <dl class="task-meta">
    ${[
      ['Loại công việc', t.type === 'resource' ? 'Quản lý tài nguyên' : t.type === 'document' ? 'Xử lý văn bản' : 'Task thường'],
      ['Trạng thái công việc', WF[t.status]],
      ['Nhóm quản lý', groupName(t.managementGroupId)],
      ['Người được giao', t.assigneeIds.map(userName).join(', ')],
      ['Ngày bắt đầu', fmt(t.start)],
      ['Hạn hoàn thành', fmt(t.due)],
      ['Người tạo phiếu', userName(t.creatorId)]
    ].map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}
  </dl>

  ${Date.now() < Date.parse(t.start) ? '<p class="notice">Chưa đến ngày bắt đầu công việc.</p>' : ''}
  ${readonly ? '<p class="notice">Bản lịch sử chỉ đọc. Chọn bản hiện tại để cập nhật dữ liệu.</p>' : ''}
  </section>

  ${resourceData ? `<section class="surface task-resource-summary"><h3>Thông tin tài nguyên liên kết</h3><dl class="task-meta">${[['Tên đơn vị', resourceData.unit], ['Cơ quan quản lý', resourceData.agency], ['Hệ thống', resourceData.system], ['Công văn đăng ký', resourceDocValues(resourceData.registeredDocumentIds)], ['Văn bản cấp tài nguyên', resourceDocValues(resourceData.assetDocumentIds || resourceData.exchangeDocumentIds)]].map(([label, value]) => `<div><dt>${esc(label)}</dt><dd>${esc(value || '—')}</dd></div>`).join('')}</dl>${resourceAppendices}</section>` : ''}

  <!-- Custom Table cho Task thường nếu có -->
  ${t.customTable ? `
    <section class="surface task-detail-section task-detail-custom-table">
    <div class="section-title"><h3>${esc(t.customTable.name || 'Bảng dữ liệu tùy chỉnh')}</h3></div>
    <div class="table-scroll compact-scroll">
      <table class="data-table">
        <thead><tr>${(t.customTable.columns || []).map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead>
        <tbody>
          ${(t.customTable.rows || []).map(r => `<tr>${(t.customTable.columns || []).map(c => `<td>${esc(r[c] ?? '—')}</td>`).join('')}</tr>`).join('')}
        </tbody>
      </table>
    </div>
    </section>
  `: ''}

  ${t.type === 'document' ? `<section class="surface task-document-summary"><h3>Văn bản xử lý</h3><dl class="task-meta">${[['Loại văn bản',t.documentType],['Số văn bản',t.documentNumber||'—'],['Trích yếu',t.documentSummary||'—']].map(([k,v])=>`<div><dt>${k}</dt><dd>${esc(v||'—')}</dd></div>`).join('')}</dl></section>` : ''}

  <!-- Tệp đính kèm -->
  ${t.attachments?.length ? `
    <section class="surface task-detail-section task-detail-attachments">
      <div class="section-title"><h3>${t.type === 'resource' ? 'Tệp đính kèm tài nguyên' : 'Tệp đính kèm khác'}</h3></div>
      <div>${fileLinks(t.attachments)}</div>
    </section>
  `: ''}

  <!-- Thông tin bổ sung -->
  ${t.customFields?.length ? `
    <section class="surface task-detail-section task-detail-custom-fields">
      <div class="section-title"><h3>Thông tin bổ sung</h3></div>
      <dl class="task-meta">${t.customFields.map(c => `<div><dt>${esc(c.name)}</dt><dd>${esc(c.value)}</dd></div>`).join('')}</dl>
    </section>
  `: ''}

  <!-- Bình luận trao đổi -->
  <section class="surface task-detail-section task-detail-comments-surface">
  <div class="section-title"><h3>Bình luận & Trao đổi</h3></div>
  <div class="comment-list">
    ${(t.comments || []).map(c => `<article style="padding:10px 0;border-bottom:1px solid var(--border)">
      <strong>${esc(userName(c.userId))}</strong>
      <small style="color:var(--muted);display:block;margin:2px 0 6px">${fmt(c.at)}</small>
      <p style="margin:0">${esc(c.text)}</p>
    </article>`).join('') || '<p class="muted">Chưa có bình luận.</p>'}
  </div>

  ${!readonly && M.canEdit(state, me(), current) ? `
    <form id="commentForm" style="margin-top:14px">
      <label class="field">
        <span>Thêm bình luận</span>
        <textarea id="commentText" required placeholder="Nhập nội dung cập nhật tiến độ, trao đổi công việc..."></textarea>
      </label>
      <button class="btn primary" type="submit" style="margin-top:8px">Gửi bình luận</button>
    </form>
    <div class="detail-actions" style="margin-top:16px;display:flex;gap:10px">
      <button class="btn primary" id="editTaskDetail">${icon('edit')} Chỉnh sửa công việc</button>
      ${admin() || current.creatorId === session ? '<button class="btn danger" id="archiveTaskDetail">Lưu trữ công việc</button>' : ''}
    </div>
  `: ''}
  </section>

  <!-- Nhật ký thay đổi -->
  <section class="surface task-detail-section task-detail-revisions-surface">
  <div class="section-title"><h3>Nhật ký thay đổi</h3></div>
  <div class="change-log">
    ${current.revisions.slice().reverse().map(r => `<div style="padding:8px 0 8px 12px;border-left:2px solid var(--action);margin-bottom:8px">
      <strong>${esc(r.action)}</strong>
      <small style="color:var(--muted);display:block">${fmt(r.at)} · ${esc(userName(r.actorId))}</small>
      ${r.changes.map(c => `<p class="small" style="margin:3px 0">${esc(c.field)}: <span style="text-decoration:line-through;color:var(--muted)">${esc(shortValue(c.old))}</span> → <strong>${esc(shortValue(c.new))}</strong></p>`).join('')}
    </div>`).join('')}
  </div></section>`;
}

function shortValue(v) {
  let x = typeof v === 'object' ? JSON.stringify(v) : String(v ?? '—');
  return x.length > 140 ? x.slice(0, 140) + '…' : x;
}

function bindTaskDetails(current, readonly = false) {
  $('#editTaskDetail')?.addEventListener('click', () => taskForm(current.id));
  $('#archiveTaskDetail')?.addEventListener('click', async () => {
    if (!(admin() || current.creatorId === session)) return;
    if (confirm('Lưu trữ công việc? Lịch sử vẫn được giữ.')) {
      const backup = M.clone(state);
      current.archived = true;
      M.revision(current, session, 'Lưu trữ công việc');
      if (!await persist()) { state = backup; return; }
      closeOverlay();
      render();
    }
  });
  $('#commentForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    if (!M.canEdit(state, me(), current)) return;
    let text = $('#commentText').value.trim();
    if (!text) return;
    const backup = M.clone(state);
    current.comments.push({ id: M.id(), userId: session, at: M.now(), text });
    M.revision(current, session, 'Bình luận', [{ field: 'Bình luận', new: text }]);
    if (!await persist()) { state = backup; return; }
    taskDrawer(current.id);
  });
}

function taskDrawer(id, revisionId = '') {
  let current = taskBy(id);
  if (!current || !M.canView(state, me(), current)) return toast('Bạn không có quyền xem công việc này.');
  let rev = current.revisions.find(r => r.id === revisionId),
    shown = rev ? rev.data : current,
    readonly = !!rev && rev.id !== current.revisions.at(-1).id;

  drawer(current.code, current.title, `
    <div class="task-drawer-layout">
      <aside class="surface task-version-list">
        <h3 style="margin-bottom:12px">Lịch sử công việc</h3>
        <button class="quick-chip btn primary" id="currentTaskVersion" style="width:100%;text-align:left;margin-bottom:8px">Bản hiện tại</button>
        ${current.revisions.slice().reverse().map(r => `
          <button class="timeline-btn ${r.id === revisionId ? 'selected' : ''}" data-task-revision="${r.id}" style="width:100%;text-align:left">
            <strong>${esc(r.action)}</strong>
            <small style="display:block;color:var(--muted)">${fmt(r.at)}</small>
            <span style="font-size:11px">${esc(userName(r.actorId))}</span>
          </button>
        `).join('')}
      </aside>
      <div class="task-detail-body">
        ${taskDetailContent(shown, current, readonly)}
      </div>
    </div>
  `, true);
  $('#overlay .drawer')?.classList.add('task-detail-drawer');

  $$('[data-task-revision]').forEach(e => e.onclick = () => taskDrawer(id, e.dataset.taskRevision));
  $('#currentTaskVersion').onclick = () => taskDrawer(id);
  bindTaskDetails(current, readonly);
}

// =========================================================
// YÊU CẦU 3 & 4 & 6: TRANG QUẢN LÝ TÀI NGUYÊN
// =========================================================
let resourceSearch = '';

function resourcesWorkspace() {
  let allRows = M.projectCells(state, me());
  let rows = allRows.filter(r => {
    if (resourceFilters.officials?.length > 0 && !resourceFilters.officials.some(id => r.officialIds.includes(id))) return false;
    if (resourceFilters.documents?.length > 0 && !resourceFilters.documents.some(id => r.documentIds.includes(id))) return false;
    if (resourceFilters.self && !r.tasks.some(id => taskBy(id).assigneeIds.includes(session))) return false;
    if (resourceSearch) {
      let q = resourceSearch.toLowerCase().trim();
      if (!`${r.unit} ${r.agency} ${r.system}`.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  if (resourceLegacy && admin()) {
    return head('Dữ liệu tài nguyên cũ (v4)', '', `<button class="btn" id="legacyToggle">Về dữ liệu task v5</button>`) +
      `<section class="surface">
      <table class="data-table">
        <thead><tr><th>Đơn vị</th><th>Cơ quan</th><th>Hệ thống</th><th>Công văn</th></tr></thead>
        <tbody>
          ${state.legacyRows.map(r => `<tr data-legacy="${r.id}" tabindex="0">
            <td>${esc(r.unit)}</td><td>${esc(r.agency)}</td><td>${esc(r.system)}</td><td>${r.snapshots.map(s => esc(s.doc)).join(', ')}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </section>`;
  }

  let docs = [...new Set(rows.flatMap(r => r.officialIds))], fieldsBy = {};
  for (let did of docs) {
    fieldsBy[did] = [...new Set(rows.flatMap(r => Object.values(r.cells).filter(c => c.docId === did).map(c => c.field)))];
  }

  let multiFiltersHtml = `
    ${renderMultiSelect('Công văn', 'resourceOfficials', state.officials.filter(d => !d.archived).map(d => [d.id, d.no]), resourceFilters.officials || [])}
    ${renderMultiSelect('Văn bản', 'resourceDocuments', state.documents.filter(d => !d.archived).map(d => [d.id, d.no]), resourceFilters.documents || [])}
    <label class="checkbox-field" style="display:flex;align-items:center;gap:6px;cursor:pointer">
      <input type="checkbox" id="resourceSelf" ${resourceFilters.self ? 'checked' : ''}>
      <span>Được giao cho tôi</span>
    </label>
    <label class="task-search" style="max-width:320px;flex:1;min-width:200px">
      ${icon('search')}
      <input id="resourceSearchInput" value="${esc(resourceSearch)}" placeholder="Tìm đơn vị, cơ quan quản lý, hệ thống..." aria-label="Tìm kiếm tài nguyên">
    </label>
    ${(resourceFilters.officials?.length || resourceFilters.documents?.length || resourceFilters.self || resourceSearch) ?
      `<button class="btn text" id="clearResourceFilters">${icon('close')} Xóa bộ lọc</button>` : ''}
  `;

  return head('Quản lý tài nguyên', '', btn('Tạo công việc mới', 'new-task', 'plus', 'primary')) +
    `<section class="surface" id="resourcePanel">
    <div class="toolbar">
      ${icon('folder')}
      <strong style="color:var(--text-contrast-primary)">Dữ liệu tài nguyên tổng hợp</strong>
      <span class="badge-count">${rows.length} hệ thống</span>
      <span class="grow"></span>
      ${admin() ? '<button class="btn text" id="legacyToggle">Dữ liệu v4</button>' : ''}
      <button class="btn text" id="addProjectionColumn">${icon('plus')} Thêm cột</button>
      ${ib('expand', 'fullscreen', 'Phóng to hoặc thu nhỏ bảng')}
    </div>
    <div class="filters" style="gap:12px;display:flex;align-items:center;flex-wrap:wrap">
      ${multiFiltersHtml}
    </div>
    <div class="table-scroll">
      <table class="data-table">
        <thead>
          <tr>
            <th rowspan="2" style="width:50px;text-align:center">Chi tiết</th>
            <th rowspan="2">STT</th>
            <th rowspan="2">Tên đơn vị</th>
            <th rowspan="2">Cơ quan quản lý</th>
            <th rowspan="2">Hệ thống</th>
            <th rowspan="2">Công văn đăng ký</th>
            <th rowspan="2">Văn bản</th>
            ${docs.map(d => `<th class="group" colspan="${fieldsBy[d].length || 1}">Công văn ${esc(docBy('officials', d)?.no)}</th>`).join('')}
          </tr>
          <tr>
            ${docs.map(d => fieldsBy[d].length ? fieldsBy[d].map(f => `<th>${esc(f)}</th>`).join('') : '<th>Chưa có dữ liệu</th>').join('')}
          </tr>
        </thead>
        <tbody>
          ${rows.map((r, i) => `<tr>
            <td class="cell-detail-trigger">
              <button type="button" class="icon-btn-sm" data-resource-detail="${esc(r.key)}" title="Xem thông tin chi tiết hệ thống">
                ${icon('eye')}
              </button>
            </td>
            <td data-resource-key="${esc(r.key)}">${i + 1}</td>
            <td data-resource-key="${esc(r.key)}">${esc(r.unit)}</td>
            <td data-resource-key="${esc(r.key)}">${esc(r.agency)}</td>
            <td class="cell-title" data-resource-key="${esc(r.key)}" tabindex="0">${esc(r.system)}</td>
            <td data-resource-key="${esc(r.key)}">${r.officialIds.map(id => `<span class="chip active">${esc(docBy('officials', id)?.no)}</span>`).join('')}</td>
            <td data-resource-key="${esc(r.key)}">${r.documentIds.map(id => `<span class="chip">${esc(docBy('documents', id)?.no)}</span>`).join('') || '—'}</td>
            ${docs.map(d => fieldsBy[d].length ? fieldsBy[d].map(f => {
      let c = r.cells[d + '|' + f], t = c ? taskBy(c.taskId) : null;
      return `<td>${c ? `<button class="cell-value ${M.canEditCell(state, me(), t) ? 'editable' : ''}" data-cell="${esc(r.key)}" data-doc="${d}" data-field="${esc(f)}" title="${esc(t?.code || '')} · ${M.canEditCell(state, me(), t) ? 'Click để sửa' : 'Chỉ đọc'}">${esc(c.value ?? '—')}${M.canEditCell(state, me(), t) ? icon('edit') : ''}</button>` : '—'}</td>`;
    }).join('') : '<td>—</td>').join('')}
          </tr>`).join('')}
        </tbody>
      </table>
      ${rows.length ? '' : '<div class="empty">Chưa có tài nguyên phù hợp. Tạo task theo công văn và thêm phụ lục để bắt đầu.</div>'}
    </div>
    <div class="table-footer">
      <div class="flex gap">
        <button class="btn text" id="addProjectionColumnBottom">${icon('plus')} Thêm cột</button>
        ${btn('Thêm hàng mới', 'add-row', 'plus', 'text')}
      </div>
      <span class="small muted">${rows.length} hệ thống · Rê chuột để highlight hàng và ô</span>
    </div>
  </section>`;
}

function editWorkspaceCell(el) {
  let row = M.projectCells(state, me()).find(r => r.key === el.dataset.cell),
    cell = row?.cells[el.dataset.doc + '|' + el.dataset.field];
  if (!cell) return;
  let t = taskBy(cell.taskId);
  if (!M.canEditCell(state, me(), t)) return toast('Chỉ admin hoặc người được giao task nguồn được sửa ô này.');
  modal('Cập nhật ô tài nguyên', `<p class="notice">Nguồn: ${esc(t.code)} · ${esc(t.title)}. Thay đổi sẽ ghi nhật ký lịch sử.</p>${field(el.dataset.field, 'value', cell.value)}`, d => {
    M.editCell(state, me(), row, el.dataset.doc, el.dataset.field, d.value);
    done('Đã cập nhật task nguồn và ghi lịch sử');
  });
}

// =========================================================
// YÊU CẦU 6 & 8: RIGHT SIDEBAR THÔNG TIN CHI TIẾT TÀI NGUYÊN (4 VÙNG)
// =========================================================
function resourceWorkspaceDrawer(key, system = '', docId = '', taskId = '', revId = '') {
  let all = M.projectCells(state, me()),
    row = all.find(r => r.key === key);
  if (!row) return;

  let pair = all.filter(r => r.unit === row.unit && r.agency === row.agency);
  let currentRow = pair.find(r => r.system === system) || row;
  let latestTask = currentRow.tasks.map(taskBy).filter(Boolean).sort((a, b) => (b.updatedAt || b.createdAt).localeCompare(a.updatedAt || a.createdAt) || state.tasks.indexOf(b) - state.tasks.indexOf(a))[0];
  let preferredDoc = docId || (resourceFilters.officials?.[0]) || latestTask?.officialIds[0];
  let did = currentRow.officialIds.includes(preferredDoc) ? preferredDoc : currentRow.officialIds[0];

  let entries = [];
  for (let tid of currentRow.tasks) {
    let t = taskBy(tid);
    for (let rev of t.revisions) if (rev.data.officialIds.includes(did) && rev.data.resources.some(r => r.system === currentRow.system)) entries.push({ task: t, rev, revisionIndex: t.revisions.indexOf(rev) });
  }
  entries.sort((a, b) => b.rev.at.localeCompare(a.rev.at) || (a.task.id === b.task.id ? b.revisionIndex - a.revisionIndex : 0) || b.task.createdAt.localeCompare(a.task.createdAt));
  let chosen = entries.find(e => e.task.id === taskId && (!revId || e.rev.id === revId)) || entries[0];
  let d = docBy('officials', did),
    readonly = chosen && chosen.rev.id !== chosen.task.revisions.at(-1).id;

  drawer(row.unit + ' / ' + row.agency, 'Hồ sơ tài nguyên', `
    <div class="resource-four-zones">
      <aside>
        <h3>Hệ thống (${pair.length})</h3>
        ${pair.map(r => `<button class="system-btn ${r.key === currentRow.key ? 'selected' : ''}" data-system-key="${esc(r.key)}">
          <strong>${esc(r.system)}</strong>
          <small>${r.tasks.length} công việc</small>
        </button>`).join('')}
      </aside>
      <aside>
        <h3>Phân loại công văn</h3>
        ${currentRow.officialIds.map(id => `<button class="system-btn ${id === did ? 'selected' : ''}" data-classify="${id}">
          <strong>Công văn ${esc(docBy('officials', id)?.no)}</strong>
          <small>${esc(docBy('officials', id)?.summary)}</small>
        </button>`).join('')}
      </aside>
      <aside>
        <h3>Lịch sử cập nhật task</h3>
        ${entries.map(e => `<button class="timeline-btn ${chosen?.rev.id === e.rev.id ? 'selected' : ''}" data-resource-task="${e.task.id}" data-resource-rev="${e.rev.id}" aria-pressed="${chosen?.rev.id === e.rev.id}">
          <strong>${esc(e.rev.data.code)}</strong>
          <span style="display:block;margin:2px 0">${esc(e.rev.data.title)}</span>
          <small>${fmt(e.rev.at)}</small>
          <span>${esc(e.rev.action)}${e.rev.id === e.task.revisions.at(-1).id ? ' · Mới nhất' : ' · Lịch sử'}</span>
        </button>`).join('')}
      </aside>
      <div class="resource-task-content">
        <h2>${esc(currentRow.system)}</h2>
        <span class="chip active">Công văn ${esc(d?.no)}</span>
        <dl class="task-meta">
          ${[
      ['Thời điểm tải lên', d?.uploadedAt ? fmt(d.uploadedAt) : 'Chưa tải lên'],
      ['Xác nhận nhập', d?.confirmedAt ? fmt(d.confirmedAt) : 'Chưa xác nhận nhập'],
      ['Ngày phát hành', day(d?.date)],
      ['Tệp nguồn', d?.files?.length ? d.files.map(f => f.name).join(', ') : 'Chưa đính kèm tệp'],
      ['Trích yếu', d?.summary || '—'],
      ['Ghi chú', d?.note || '—']
    ].map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}
        </dl>
        <div class="divider"></div>
        ${chosen ? `<h3>Thông tin task tại mốc đã chọn</h3>${taskDetailContent(chosen.rev.data, chosen.task, readonly, did)}` : '<div class="empty">Chưa có lịch sử.</div>'}
      </div>
    </div>
  `, true);

  $('#overlay .drawer')?.classList.add('resource-detail-drawer');

  $$('[data-system-key]').forEach(e => e.onclick = () => resourceWorkspaceDrawer(e.dataset.systemKey));
  $$('[data-classify]').forEach(e => e.onclick = () => resourceWorkspaceDrawer(currentRow.key, currentRow.system, e.dataset.classify));
  $$('[data-resource-task]').forEach(e => e.onclick = () => resourceWorkspaceDrawer(currentRow.key, currentRow.system, did, e.dataset.resourceTask, e.dataset.resourceRev));
  chosen && bindTaskDetails(chosen.task, readonly);
}

function legacyDrawer(id) {
  if (!admin()) return;
  let r = state.legacyRows.find(x => x.id === id);
  if (!r) return;
  drawer(r.unit + ' / ' + r.agency, 'Dữ liệu v4 được giữ nguyên, chỉ đọc.', `<div class="drawer-body" style="padding:24px">
    <h2>${esc(r.system)}</h2>
    <p class="notice">Chưa có task nguồn, người nhận hoặc lịch hợp lệ.</p>
    ${r.snapshots.map(s => `<section class="surface panel-pad" style="margin-top:12px">
      <h3>Công văn ${esc(s.doc)}</h3>
      <p class="small muted">${fmt(s.uploadedAt)} · ${esc(s.filename)}</p>
      <dl class="task-meta">${Object.entries(s.values).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
      <button class="btn primary" data-convert-legacy="${s.id}">Chuyển bản này thành task</button>
    </section>`).join('')}
  </div>`);

  $$('[data-convert-legacy]').forEach(e => e.onclick = () => {
    let s = r.snapshots.find(x => x.id === e.dataset.convertLegacy), d = state.officials.find(d => d.no === s.doc);
    let data = {
      ...emptyTask(),
      unit: r.unit,
      agency: r.agency,
      title: 'Rà soát ' + r.system,
      officialIds: d ? [d.id] : [],
      resources: [{ id: M.id(), system: r.system, name: r.system, values: M.clone(s.values), files: [] }],
      resourceColumns: Object.keys(s.values),
      legacySource: { rowId: r.id, snapshotId: s.id }
    };
    taskForm(null, data);
  });
}
