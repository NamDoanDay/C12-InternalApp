'use strict';
names.tasks = 'Quản lý công việc';
names.catalog = 'Danh mục Công văn / Văn bản';

const M = C12Model,
  WF = { processing: 'Đang xử lý', number: 'Đang lấy số', signing: 'Đang trình ký', done: 'Đã hoàn thành' },
  BUCKET = { done: 'Đã hoàn thành', processing: 'Đang xử lý', late: 'Chậm muộn' };

const originalRender = render,
  originalView = view,
  originalAction = action,
  originalSave = save,
  workspaceBaseBind = bind,
  originalPersonForm = personForm,
  originalImportForm = importForm;

// Multi-select task filters: OR within same filter, AND across different filters
let activeTaskFilter = { groups: [], officials: [], documents: [], bucket: '' },
  openDropdownKey = '',
  taskTab = 'mine',
  resourceFilters = { officials: [], documents: [], groups: [], levels: [], month: '', self: false },
  resourceLegacy = false,
  formTask = null,
  taskCatalogKind = '',
  openTaskId = '',
  shownRevision = '',
  selectedResourceSystem = '',
  selectedResourceDoc = '',
  themeOpen = false;

let v5;
try { v5 = JSON.parse(localStorage.getItem('c12-prototype-v5')) } catch { }
if (v5?.version === 5) state = v5;
else {
  localStorage.setItem('c12-backup-v4', JSON.stringify(state));
  state = M.migrate(state);
  seedTaskDemo();
  localStorage.setItem('c12-prototype-v5', JSON.stringify(state));
}

session = sessionStorage.getItem('c12-v5-session') !== null ? sessionStorage.getItem('c12-v5-session') : (session || 'admin');

const persist = () => {
  try {
    localStorage.setItem('c12-prototype-v5', JSON.stringify(state));
    syncChannel?.postMessage({ at: Date.now() });
  } catch {
    throw Error('Bộ nhớ trình duyệt đã đầy. Hãy giảm tệp; phiếu chưa được lưu.');
  }
};
window.C12SaveV5 = persist;

let syncChannel;
try { syncChannel = new BroadcastChannel('c12-v5') } catch { }

function incoming() {
  let next;
  try { next = JSON.parse(localStorage.getItem('c12-prototype-v5')) } catch { }
  if (next?.version === 5) {
    state = next;
    if ($('#notifyAll')) {
      render();
      notificationsDialog($('#notifyUnread')?.classList.contains('primary') ? 'unread' : 'all');
    } else if (!$('#editForm') && !$('#taskEditor')) render();
    else toast('Có cập nhật mới. Đóng phiếu để tải dữ liệu mới nhất.');
  }
}
syncChannel && (syncChannel.onmessage = incoming);
window.addEventListener('storage', e => { if (e.key === 'c12-prototype-v5') incoming() });

const groupName = id => state.taskGroups.find(g => g.id === id)?.name || 'Chưa phân nhóm';
const userName = id => state.users.find(u => u.id === id)?.name || 'Người dùng';
const docBy = (kind, id) => state[kind].find(d => d.id === id);
const taskBy = id => state.tasks.find(t => t.id === id);
const visibleTasks = () => state.tasks.filter(t => !t.archived && M.canView(state, me(), t));
const badge = t => `<span class="task-status ${M.bucket(t)}">${BUCKET[M.bucket(t)]}${M.bucket(t) === 'late' ? ' ' + M.overdueDays(t) + ' ngày' : ''}</span>`;
const localTime = v => v ? new Date(new Date(v).getTime() - new Date(v).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '';

function seedTaskDemo() {
  let u = state.users.find(x => x.id === 'admin') || state.users[0];
  if (!u) return;
  for (let [i, g] of state.taskGroups.entries()) {
    if (!state.people.some(p => p.groupId === g.id && Number(p.rank) === 3)) {
      state.people.push({
        id: 'demo-p-' + g.id,
        name: ['Nguyễn Văn An', 'Trần Minh Bình', 'Lê Ngọc Chi', 'Phạm Quốc Dũng', 'Vũ Hoàng Hà', 'Đỗ Gia Khôi'][i],
        position: 'Thành viên tổ',
        rank: 3,
        type: 'Cán bộ',
        groupId: g.id,
        email: '', phone: '', note: 'Dữ liệu mẫu'
      });
    }
    let p = state.people.find(p => p.groupId === g.id && Number(p.rank) === 3);
    if (!state.users.some(x => x.personId === p.id)) {
      state.users.push({
        id: 'demo-u-' + g.id,
        name: p.name,
        email: g.code.toLowerCase() + '@c12.demo',
        role: 'user',
        status: 'approved',
        personId: p.id
      });
    }
  }

  let existing = { id: M.id(), no: 'CV-DEMO-01', date: '2026-11-10', summary: 'Đăng ký tài nguyên hạ tầng đám mây', note: 'Mục dùng chung' };
  state.officials.push(existing);

  let a = state.users.find(x => x.role === 'user' && x.status === 'approved') || u,
    b = state.users.find(x => x.id !== a.id && x.role === 'user' && x.status === 'approved') || a;

  for (let i = 0; i < 3; i++) {
    let at = new Date(),
      start = new Date(at.getTime() - 86400000),
      due = new Date(at.getTime() + (i === 1 ? -86400000 : 86400000 * 3));
    M.saveTask(state, u, {
      type: i === 2 ? 'daily' : 'document',
      title: ['Rà soát tài nguyên hệ thống văn bản', 'Đối chiếu phương án hạ tầng', 'Kiểm tra vận hành trực nhật'][i] + ' (mẫu)',
      description: 'Công việc minh họa để trải nghiệm phân công và lịch sử.',
      managementGroupId: 'g-HT',
      unit: 'Cà Mau',
      agency: 'VP UBND tỉnh',
      assigneeIds: i === 0 ? [a.id, b.id] : [a.id],
      start: start.toISOString(),
      due: due.toISOString(),
      status: i === 2 ? 'done' : 'processing',
      officialIds: i === 2 ? [] : [existing.id],
      documentIds: [],
      resources: i === 2 ? [] : [{ id: M.id(), system: 'Hệ thống quản lý văn bản và điều hành', name: 'Máy chủ ứng dụng', values: { vCPU: i ? 32 : 16, 'RAM (GB)': i ? 64 : 32 }, files: [] }],
      resourceColumns: ['vCPU', 'RAM (GB)'],
      customFields: [],
      attachments: [],
      customTable: { name: 'Bảng theo dõi trực nhật', columns: ['STT', 'Hạng mục công việc', 'Người phụ trách', 'Kết quả kiểm tra'], rows: [{ STT: '1', 'Hạng mục công việc': 'Kiểm tra phòng máy chủ', 'Người phụ trách': 'Nguyễn Văn An', 'Kết quả kiểm tra': 'Hoạt động bình thường' }] }
    });
  }
}

// =========================================================
// RENDER OVERRIDE
// =========================================================
render = function () {
  if (!me()) return originalRender();
  originalRender();

  // Navigation menu: "For you (Công việc)"
  let navGroup = $('[data-group=resource]');
  if (navGroup) {
    navGroup.innerHTML = `${icon('folder')}
      <span class="nav-group-label">For you (Công việc)</span>
      <span class="chevron-wrap ${groups.resource ? 'expanded' : ''}">${icon('chevron')}</span>`;
  }
  if (groups.resource) {
    let link = $('[data-page=resources]');
    link?.insertAdjacentHTML('beforebegin', nav('tasks', 'Quản lý công việc', '', true));
    let catalog = $('[data-page=catalog]');
    if (catalog) catalog.innerHTML = `<span>Danh mục Công văn / Văn bản</span>`;
  }

  // Ensure personal theme applied
  applyPersonalTheme();
  bindWorkspace();
  syncNav();
};

view = function () {
  if (q) return workspaceSearch();
  if (page === 'tasks') return tasksView();
  if (page === 'resources') return resourcesWorkspace();
  if (page === 'catalog') return catalogsWorkspace();
  if (page === 'org') return orgWorkspace();
  if (page === 'stats') return statsWorkspace();
  if (page === 'home') return homeWorkspace();
  return originalView();
};

action = function (a) {
  if (a === 'switch') {
    let next = admin() ? state.users.find(u => u.role === 'user' && u.status === 'approved') : state.users.find(u => u.role === 'admin' && u.status === 'approved');
    session = next.id;
    sessionStorage.setItem('c12-v5-session', session);
    account = false;
    return render();
  }
  if (a === 'logout') {
    sessionStorage.setItem('c12-v5-session', '');
    return originalAction(a);
  }
  if (a === 'reset') {
    if (confirm('Khôi phục dữ liệu mẫu v5.1?')) {
      state = M.migrate(JSON.parse(localStorage.getItem('c12-backup-v4')) || seed());
      seedTaskDemo();
      persist();
      render();
    }
    return;
  }
  if (a === 'new-task') return taskForm();
  if (a === 'themes') return themesDialog();
  if (a === 'notifications') return notificationsDialog();
  if (a === 'add-row') return taskForm();
  if (a === 'import') return toast('Nhập tài nguyên trong phiếu công việc.');
  if (a === 'add-group') return groupForm();
  return originalAction(a);
};

done = function (message) {
  persist();
  $('#overlay').innerHTML = '';
  render();
  if (message) toast(message);
};

login = function (id) {
  let u = state.users.find(x => x.id === id);
  if (!u || u.status !== 'approved') return toast('Tài khoản chưa được duyệt.');
  session = id;
  sessionStorage.setItem('c12-v5-session', id);
  account = false;
  $('#overlay').innerHTML = '';
  render();
};

// =========================================================
// YÊU CẦU 2: TRANG CHÍNH GOOGLE CLOUD CONSOLE STYLE
// =========================================================
function homeWorkspace() {
  let ts = visibleTasks(),
    userGroup = M.personGroup(state, session),
    unreadCount = state.notifications.filter(n => n.recipientId === session && !n.read).length,
    lateCount = ts.filter(t => M.bucket(t) === 'late').length;

  return `
  <!-- Welcome Banner Google Cloud Console -->
  <div class="welcome-banner">
    <div class="welcome-main">
      <div class="welcome-title-row">
        <span class="welcome-icon-badge">${icon('checkCircle')}</span>
        <h1 class="welcome-title">Welcome, ${esc(me().name)}</h1>
      </div>
      <div class="welcome-subtitle">
        You're working in <strong>Phòng 4 · Tổ 1</strong> (Không gian Quản trị & Điều hành Nội bộ C12)
      </div>
      <div class="welcome-metadata">
        <span class="meta-pill">Mã phiên: <strong>SES-${session.toUpperCase()}</strong></span>
        <span class="meta-pill" >Người dùng: <strong>${esc(me().name)} (${admin() ? 'Admin' : 'User'})</strong></span>
        <span class="meta-pill">Nhóm công tác: <strong>${esc(groupName(userGroup))}</strong></span>
        <span class="meta-pill">Thời gian: <strong>${new Date().toLocaleDateString('vi-VN')}</strong></span>
      </div>
      <div class="welcome-actions">
        <button type="button" class="quick-chip primary" data-action="new-task">${icon('plus')} Tạo công việc mới</button>
        <button type="button" class="quick-chip" data-page="resources">${icon('folder')} Tra cứu tài nguyên</button>
        <button type="button" class="quick-chip" data-page="org">${icon('tree')} Sơ đồ tổ</button>
        <button type="button" class="quick-chip" data-page="catalog">${icon('file')} Danh mục công văn</button>
        <button type="button" class="quick-chip" data-page="stats">${icon('chart')} Báo cáo tiến độ</button>
      </div>
    </div>
    <div class="welcome-side-card">
      <div class="welcome-side-head">
        <span>THÔNG TIN NỘI BỘ TỔ 1</span>
        ${icon('bell')}
      </div>
      <div class="welcome-side-content">
        Hệ thống đang vận hành phiên bản Cloud Console <strong>Version 1.0</strong>.
        Hiện có <strong>${ts.length}</strong> công việc trong phạm vi theo dõi.
        ${lateCount > 0 ? `<span style="color:#ef4444;display:block;margin-top:4px">⚠️ <strong>${lateCount}</strong> công việc chậm muộn cần xử lý.</span>` : ''}
        ${unreadCount > 0 ? `<span style="color:var(--action);display:block;margin-top:2px">📬 Bạn có <strong>${unreadCount}</strong> thông báo mới.</span>` : ''}
      </div>
    </div>
  </div>

  <!-- Thẻ Task Summaries Compact -->
  ${summaryCards(ts)}

  <!-- Khu vực Quick access: Lưới thẻ thoáng đãng (gap 20-24px) -->
  <div class="section-title">
    <h2>Truy cập nhanh</h2>
  </div>
  <div class="quick-grid">
    ${[
      ['tasks', 'folder', 'Quản lý công việc', 'Phân công nhiệm vụ, cập nhật tiến độ và theo dõi trạng thái chung.'],
      ['resources', 'folder', 'Dữ liệu tài nguyên', 'Đối chiếu thông số kỹ thuật vCPU, RAM, Disk theo từng công văn.'],
      ['catalog', 'file', 'Danh mục công văn / văn bản', 'Tra cứu thông tin ban hành, trích yếu và tệp đính kèm.'],
      ['org', 'tree', 'Cây sơ đồ tổ', 'Cơ cấu lãnh đạo phòng, chỉ huy tổ và các nhóm chuyên môn nghiệp vụ.'],
      ['knowledge', 'book', 'Kiến thức tổ', 'Kho tài liệu chuyên môn, căn cứ pháp lý và hướng dẫn kỹ thuật.'],
      ['stats', 'chart', 'Thống kê tiến độ', 'Báo cáo tổng hợp số liệu công việc hoàn thành và quá hạn theo nhóm.']
    ].map(([p, i, t, d]) => `<button class="quick-card" data-page="${p}">
      <span class="quick-icon">${icon(i)}</span>
      <div>
        <h3>${t}</h3>
        <p>${d}</p>
      </div>
      ${icon('arrow')}
    </button>`).join('')}
  </div>

  <div class="section-title">
    <h2>Công văn gần đây</h2>
    ${btn('Xem toàn bộ danh mục', 'go-catalog', '', 'text')}
  </div>
  <div class="surface">${docTable(state.docs)}</div>
  `;
}

// =========================================================
// YÊU CẦU 2: THẺ TASK SUMMARIES COMPACT VỚI ICON TRẠNG THÁI RIÊNG
// =========================================================
function summaryCards(ts) {
  let doneCount = ts.filter(t => M.bucket(t) === 'done').length,
    procCount = ts.filter(t => M.bucket(t) === 'processing').length,
    lateCount = ts.filter(t => M.bucket(t) === 'late').length,
    totalCount = ts.length;

  return `<div class="task-summaries">
    <button type="button" class="summary-card done" data-bucket="done">
      <div class="summary-icon-wrap">${icon('checkCircle')}</div>
      <div class="summary-content">
        <strong>${doneCount}</strong>
        <span>Đã hoàn thành</span>
      </div>
    </button>
    <button type="button" class="summary-card processing" data-bucket="processing">
      <div class="summary-icon-wrap">${icon('clock')}</div>
      <div class="summary-content">
        <strong>${procCount}</strong>
        <span>Đang xử lý</span>
      </div>
    </button>
    <button type="button" class="summary-card late" data-bucket="late">
      <div class="summary-icon-wrap">${icon('alertTriangle')}</div>
      <div class="summary-content">
        <strong>${lateCount}</strong>
        <span>Chậm muộn</span>
      </div>
    </button>
    <button type="button" class="summary-card total" data-bucket="">
      <div class="summary-icon-wrap">${icon('folder')}</div>
      <div class="summary-content">
        <strong>${totalCount}</strong>
        <span>Tổng công việc</span>
      </div>
    </button>
  </div>`;
}

function taskList(ts) {
  return ts.length ? `<div class="task-list">
    ${ts.map(t => `<button class="task-row" data-task="${t.id}">
      <span class="task-dot"></span>
      <span class="task-title">
        <strong>${esc(t.title)}</strong>
        <small>${esc(t.assigneeIds.map(userName).join(', '))}</small>
      </span>
      <span class="task-code">${esc(t.code)}</span>
      ${badge(t)}
      <span class="small muted">${fmt(t.due)}</span>
    </button>`).join('')}
  </div>`: '<div class="empty">Chưa có công việc phù hợp với bộ lọc.</div>';
}

// =========================================================
// YÊU CẦU 4: BỘ LỌC ĐA CHỌN (MULTI-SELECT DROPDOWN)
// =========================================================
function renderMultiSelect(label, filterKey, options, selectedArray) {
  let count = selectedArray.length;
  let isOpen = openDropdownKey === filterKey;
  let summaryText = count === 0 ? 'Tất cả' : count === options.length ? 'Tất cả' : `Đã chọn (${count})`;

  return `<div class="filter-multi-dropdown" data-multi-wrap="${filterKey}">
    <button type="button" class="filter-trigger-btn ${count > 0 ? 'has-value' : ''}" data-multi-toggle="${filterKey}">
      <span>${label}:</span>
      <strong>${summaryText}</strong>
      ${count > 0 ? `<span class="filter-badge">${count}</span>` : ''}
      <span class="chevron-wrap ${isOpen ? 'expanded' : ''}">${icon('chevron')}</span>
    </button>
    <div class="filter-dropdown-menu ${isOpen ? 'show' : ''}" id="menu-${filterKey}">
      ${options.length > 5 ? `<input type="text" class="filter-search-box" placeholder="Tìm kiếm nhanh..." data-multi-search="${filterKey}">` : ''}
      <div class="filter-actions-bar">
        <button type="button" data-multi-all="${filterKey}">Chọn tất cả</button>
        <button type="button" data-multi-clear="${filterKey}">Bỏ chọn</button>
      </div>
      <div class="filter-options-scroll" id="options-${filterKey}">
        ${options.map(([val, title]) => `<label class="filter-checkbox-row" data-search-item="${esc(title.toLowerCase())}">
          <input type="checkbox" data-multi-item="${filterKey}" value="${esc(val)}" ${selectedArray.includes(val) ? 'checked' : ''}>
          <span>${esc(title)}</span>
        </label>`).join('')}
      </div>
    </div>
  </div>`;
}

function taskMatchesFilters(t) {
  // 1. Nhóm quản lý / tham gia: logic OR nội bộ
  if (activeTaskFilter.groups.length > 0) {
    let groupsOfTask = M.participatingGroups(state, t);
    let match = activeTaskFilter.groups.some(gid => groupsOfTask.includes(gid) || t.managementGroupId === gid);
    if (!match) return false;
  }
  // 2. Công văn: logic OR nội bộ
  if (activeTaskFilter.officials.length > 0) {
    let match = activeTaskFilter.officials.some(oid => t.officialIds.includes(oid));
    if (!match) return false;
  }
  // 3. Văn bản: logic OR nội bộ
  if (activeTaskFilter.documents.length > 0) {
    let match = activeTaskFilter.documents.some(did => t.documentIds.includes(did));
    if (!match) return false;
  }
  // 4. Trạng thái bucket
  if (activeTaskFilter.bucket && M.bucket(t) !== activeTaskFilter.bucket) {
    return false;
  }
  return true;
}

function tasksView() {
  let all = visibleTasks(),
    filtered = all.filter(taskMatchesFilters);

  let filtersHtml = `<div class="filters task-filters" style="gap:12px;display:flex;align-items:center;flex-wrap:wrap">
    ${renderMultiSelect('Nhóm quản lý', 'groups', state.taskGroups.filter(g => !g.archived).map(g => [g.id, g.name]), activeTaskFilter.groups)}
    ${renderMultiSelect('Công văn', 'officials', state.officials.filter(d => !d.archived).map(d => [d.id, d.no]), activeTaskFilter.officials)}
    ${renderMultiSelect('Văn bản', 'documents', state.documents.filter(d => !d.archived).map(d => [d.id, d.no]), activeTaskFilter.documents)}
    ${(activeTaskFilter.groups.length || activeTaskFilter.officials.length || activeTaskFilter.documents.length || activeTaskFilter.bucket) ?
      `<button class="btn text" id="clearTaskFilters">${icon('close')} Xóa bộ lọc (${filtered.length}/${all.length})</button>` : ''}
  </div>`;

  return head('Quản lý công việc', '', btn('Tạo công việc mới', 'new-task', 'plus', 'primary')) +
    summaryCards(all) +
    filtersHtml +
    (admin() ?
      `<div class="surface">${taskList(filtered)}</div>` :
      `<div class="task-two-panels">
      <section class="surface">
        <h2>Nhiệm vụ cá nhân (${filtered.filter(t => t.creatorId === session).length})</h2>
        ${taskList(filtered.filter(t => t.creatorId === session))}
      </section>
      <section class="surface">
        <h2>Được giao cho tôi (${filtered.filter(t => t.creatorId !== session && t.assigneeIds.includes(session)).length})</h2>
        ${taskList(filtered.filter(t => t.creatorId !== session && t.assigneeIds.includes(session)))}
      </section>
    </div>
    <section class="surface group-task-panel">
      <h2>Công việc cùng nhóm (${filtered.filter(t => t.creatorId !== session && !t.assigneeIds.includes(session)).length})</h2>
      ${taskList(filtered.filter(t => t.creatorId !== session && !t.assigneeIds.includes(session)))}
    </section>`
    );
}

function statsWorkspace() {
  let ts = visibleTasks();
  return head('Thống kê công việc') +
    summaryCards(ts) +
    `<section class="surface panel-pad">
    <h2>Theo nhóm quản lý</h2>
    <div class="stats-groups" style="margin-top:16px">
      ${state.taskGroups.filter(g => !g.archived).map(g => {
      let list = ts.filter(t => t.managementGroupId === g.id);
      return `<div style="display:grid;grid-template-columns:1.5fr repeat(3,1fr);padding:14px 0;border-bottom:1px solid var(--border)">
          <strong>${esc(g.name)} (${esc(g.code)})</strong>
          <span>${list.length} task</span>
          <span style="color:#059669">${list.filter(t => M.bucket(t) === 'done').length} hoàn thành</span>
          <span style="color:#dc2626">${list.filter(t => M.bucket(t) === 'late').length} chậm muộn</span>
        </div>`;
    }).join('')}
    </div>
  </section>`;
}

function workspaceSearch() {
  let term = q.toLocaleLowerCase('vi'),
    ts = visibleTasks().filter(t => [t.title, t.code, t.description, ...t.aliases].join(' ').toLocaleLowerCase('vi').includes(term));
  return head('Kết quả tìm kiếm') + `<section class="surface">${taskList(ts)}</section>`;
}

// =========================================================
// EVENT BINDINGS
// =========================================================
function bindWorkspace() {
  document.documentElement.dataset.theme = 'cloud';

  // Task click to view detail drawer
  $$('[data-task]').forEach(e => e.onclick = () => taskDrawer(e.dataset.task));

  // Summary card filter bucket click
  $$('[data-bucket]').forEach(e => e.onclick = () => {
    activeTaskFilter.bucket = activeTaskFilter.bucket === e.dataset.bucket ? '' : e.dataset.bucket;
    page = 'tasks';
    render();
  });

  // Multi-select dropdown toggle
  $$('[data-multi-toggle]').forEach(btn => {
    btn.onclick = e => {
      e.stopPropagation();
      let key = btn.dataset.multiToggle;
      openDropdownKey = openDropdownKey === key ? '' : key;
      render();
    };
  });

  // Close multi-select on outside click
  document.addEventListener('click', e => {
    if (openDropdownKey && !e.target.closest('.filter-multi-dropdown')) {
      openDropdownKey = '';
      render();
    }
  }, { once: true });

  // Multi-select item change
  $$('[data-multi-item]').forEach(cb => {
    cb.onchange = () => {
      let key = cb.dataset.multiItem, val = cb.value;
      let arr = activeTaskFilter[key];
      if (cb.checked) {
        if (!arr.includes(val)) arr.push(val);
      } else {
        activeTaskFilter[key] = arr.filter(x => x !== val);
      }
      render();
    };
  });

  // Select all / Clear in multi-select
  $$('[data-multi-all]').forEach(btn => {
    btn.onclick = e => {
      e.stopPropagation();
      let key = btn.dataset.multiAll;
      if (key === 'groups') activeTaskFilter.groups = state.taskGroups.filter(g => !g.archived).map(g => g.id);
      if (key === 'officials') activeTaskFilter.officials = state.officials.filter(d => !d.archived).map(d => d.id);
      if (key === 'documents') activeTaskFilter.documents = state.documents.filter(d => !d.archived).map(d => d.id);
      render();
    };
  });

  $$('[data-multi-clear]').forEach(btn => {
    btn.onclick = e => {
      e.stopPropagation();
      let key = btn.dataset.multiClear;
      activeTaskFilter[key] = [];
      render();
    };
  });

  // Quick search inside dropdown
  $$('[data-multi-search]').forEach(input => {
    input.oninput = e => {
      let key = input.dataset.multiSearch,
        query = e.target.value.toLowerCase(),
        container = $('#options-' + key);
      if (!container) return;
      container.querySelectorAll('.filter-checkbox-row').forEach(row => {
        let text = row.dataset.searchItem || '';
        row.style.display = text.includes(query) ? 'flex' : 'none';
      });
    };
  });

  $('#clearTaskFilters')?.addEventListener('click', () => {
    activeTaskFilter = { groups: [], officials: [], documents: [], bucket: '' };
    openDropdownKey = '';
    render();
  });

  if ($('#globalSearch') && !$('#globalSearch').dataset.workspaceSearchBound) {
    $('#globalSearch').dataset.workspaceSearchBound = '1';
    $('#globalSearch').addEventListener('input', () => bindWorkspace());
  }

  $$('[data-catalog-edit]').forEach(e => e.onclick = () => catalogEdit(e.dataset.kind, e.dataset.catalogEdit));
  $$('[data-catalog-new]').forEach(e => e.onclick = () => catalogEdit(e.dataset.catalogNew));
  $$('[data-person-drag]').forEach(e => { e.ondragstart = ev => ev.dataTransfer.setData('text/plain', e.dataset.personDrag) });
  $$('[data-group-drop]').forEach(e => {
    e.ondragover = ev => { if (admin()) ev.preventDefault() };
    e.ondrop = ev => {
      ev.preventDefault();
      try {
        M.movePerson(state, me(), ev.dataTransfer.getData('text/plain'), e.dataset.groupDrop);
        persist(); render(); toast('Đã chuyển nhóm và cập nhật task');
      } catch (err) { toast(err.message) }
    };
  });
  $$('[data-group-edit]').forEach(e => e.onclick = () => groupForm(e.dataset.groupEdit));
  $$('[data-person-move]').forEach(e => e.onclick = () => movePersonDialog(e.dataset.personMove));
  $$('[data-resource-key]').forEach(e => e.onclick = () => resourceWorkspaceDrawer(e.dataset.resourceKey));
  $$('[data-resource-detail]').forEach(e => e.onclick = () => resourceWorkspaceDrawer(e.dataset.resourceDetail));
  $$('[data-cell]').forEach(e => { e.onclick = ev => { ev.stopPropagation(); editWorkspaceCell(e) } });
  $$('[data-legacy]').forEach(e => e.onclick = () => legacyDrawer(e.dataset.legacy));
  $('#legacyToggle')?.addEventListener('click', () => { resourceLegacy = !resourceLegacy; render() });
}

