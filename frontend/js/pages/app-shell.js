
function navigate(p) {
  page = p;
  location.hash = p;
  q = '';
  account = false;
  render();
}

// =========================================================
// YÊU CẦU 1: HEADER LAYOUT 3 CỤM
// =========================================================
function renderHeader() {
  let isDark = document.documentElement.classList.contains('dark');
  let unreadNotifications = state.notifications ? state.notifications.filter(n => n.recipientId === session && !n.read).length : 0;
  return `<header class="header">
    <div class="header-left">
      ${ib('menu', 'nav', 'Đóng mở điều hướng')}
      <span class="brand-mark">C12</span>
      <span class="brand">P4.T1 - Internal App</span>
    </div>
    <div class="header-center">
      <div class="global-search">
        ${icon('search')}
        <input id="globalSearch" placeholder="Tìm kiếm công việc, số công văn, hệ thống, tài nguyên..." aria-label="Tìm kiếm toàn ứng dụng" value="${esc(q)}">
        <kbd>/</kbd>
      </div>
    </div>
    <div class="header-right">
      <button type="button" class="theme-pill-toggle" data-action="theme" aria-label="Chuyển chế độ sáng / tối" aria-pressed="${isDark}" title="Chuyển chế độ Sáng / Tối">
        <span class="pill-track">
          <span class="pill-thumb"></span>
          <span class="pill-icon sun">${icon('sun')}</span>
          <span class="pill-icon moon">${icon('moon')}</span>
        </span>
        <span class="pill-label">${isDark ? 'DARK' : 'LIGHT'}</span>
      </button>
      <button type="button" class="icon-btn" data-action="themes" aria-label="Đổi chủ đề không gian làm việc" title="Đổi chủ đề giao diện">
        <span style="font-size:20px">🎨</span>
      </button>
      <button type="button" class="icon-btn notification-trigger" data-action="notifications" aria-label="Thông báo" title="Thông báo hệ thống">
        ${icon('bell')}
        ${unreadNotifications > 0 ? `<span class="badge-red">${unreadNotifications}</span>` : ''}
      </button>
      <button type="button" class="icon-btn" data-action="account" aria-label="Cài đặt tài khoản" aria-expanded="${account}" title="${esc(me()?.name || '')}">
        <span class="avatar">${esc(me()?.name?.[0] || 'U')}</span>
      </button>
    </div>
  </header>`;
}

function render() {
  if (!me()) return auth();
  if (['personnel', 'accounts'].includes(page) && !admin()) page = 'home';
  applyContrastEngine();

  $('#app').className = collapsed ? 'collapsed' : '';
  $('#app').innerHTML = `${renderHeader()}
  <aside class="sidebar">
    <div class="nav-intro">
      <div class="small muted"></div>
      <strong style="color:var(--text-contrast-primary)">Không gian điều hướng</strong>
    </div>
    ${nav('home', 'Trang chính', 'home')}
    <button class="nav-group" data-group="resource" aria-expanded="${groups.resource}">
      ${icon('folder')}
      <span class="nav-group-label">For you (Công việc của bạn)</span>
      <span class="chevron-wrap ${groups.resource ? 'expanded' : ''}">${icon('chevron')}</span>
    </button>
    ${groups.resource ? nav('stats', 'Thống kê', '', true) + nav('resources', 'Quản lý tài nguyên', '', true) + nav('catalog', 'Danh mục văn bản', '', true) : ''}
    <button class="nav-group" data-group="team" aria-expanded="${groups.team}">
      ${icon('book')}
      <span class="nav-group-label">Chuyên môn tổ</span>
      <span class="chevron-wrap ${groups.team ? 'expanded' : ''}">${icon('chevron')}</span>
    </button>
    ${groups.team ? nav('knowledge', 'Kiến thức tổ', '', true) + nav('org', 'Cây sơ đồ tổ', '', true) : ''}
    ${admin() ? `<div class="divider"></div>${nav('personnel', 'Quản lý nhân sự', 'users')}` : ''}
    <div class="nav-foot">
      <span class="chip active">Cloud Console · ${admin() ? 'Admin' : 'User'}</span>
      <p class="small muted" style="margin-top:10px">Hệ thống quản trị nội bộ Phòng 4 Tổ 1</p>
    </div>
  </aside>
  <main class="main" id="main">
    ${view()}
  </main>
  ${account ? `<div class="account-backdrop" data-action="account"></div>
  <div class="account-menu">
    <div class="account-menu-header">
      <div class="account-menu-avatar">${esc(me()?.name?.[0] || 'U')}</div>
      <div class="account-menu-info">
        <strong>${esc(me()?.name || 'Người dùng')}</strong>
        <span>${esc(me()?.email || 'user@c12.demo')}</span>
        <span class="chip active" style="margin-top:4px;width:fit-content">${admin() ? 'Quản trị viên' : 'Thành viên'} · Demo</span>
      </div>
    </div>
    <div class="account-menu-actions">
      <button data-action="settings">${icon('settings')} Cài đặt tài khoản</button>
      <button data-action="switch">${icon('refresh')} Chuyển sang vai trò ${admin() ? 'User' : 'Admin'} demo</button>
      ${admin() ? `<button data-action="reset">${icon('reload')} Khôi phục dữ liệu mẫu</button>` : ''}
      <button data-action="logout" style="color:#ef4444">${icon('logout')} Đăng xuất</button>
    </div>
  </div>`: ''}`;

  bind();
}

// =========================================================
// YÊU CẦU 3: TIÊU ĐỀ TRANG TỐI GIẢN (LOẠI BỎ PHỤ ĐỀ)
// =========================================================
const head = (t, s = '', a = '', extra = '', extraClass = '') => {
  let actionHtml = a || (typeof s === 'string' && (s.includes('<button') || s.includes('class="btn') || s.includes('data-action') || s.includes('<span class="chip')) ? s : '');
  return `<section class="surface page-heading-surface ${extraClass}"><div class="page-header">
    <h1 class="page-title">${esc(t)}</h1>
    ${actionHtml ? `<div class="flex gap">${actionHtml}</div>` : ''}
  </div>${extra ? `<div class="page-heading-extra">${extra}</div>` : ''}</section>`;
};

function view() {
  if (q) return searchView();
  return ({
    home: homeView,
    resources: resourceView,
    catalog: catalogView,
    knowledge: knowledgeView,
    org: orgView,
    personnel: personnelView,
    accounts: accountsView,
    stats: () => head('Thống kê', '', '') + `<div class="surface empty"><h3 style="color:var(--text-contrast-primary)">Chưa cấu hình thống kê</h3><p class="muted">Số liệu được tổng hợp theo từng mốc công văn.</p></div>`
  }[page] || homeView)();
}

function homeView() {
  return head('Trang chính') + `<section class="surface home-quick-surface"><div class="section-title"><h2>Truy cập nhanh</h2></div>
  <div class="quick-grid">
    ${[
      ['resources', 'folder', 'Quản lý tài nguyên', 'Đối chiếu công văn và cập nhật nhu cầu hạ tầng.'],
      ['catalog', 'file', 'Danh mục văn bản', 'Tìm số, ngày ban hành và trích yếu văn bản.'],
      ['knowledge', 'book', 'Kiến thức tổ', 'Tài liệu chuyên môn, hướng dẫn và tham khảo.'],
      ['org', 'tree', 'Cây sơ đồ tổ', 'Thành viên, vai trò và thông tin liên hệ.']
    ].map(([p, i, t, d]) => `<button class="quick-card" data-page="${p}"><span class="quick-icon">${icon(i)}</span><div><h3>${t}</h3><p>${d}</p></div>${icon('arrow')}</button>`).join('')}
  </div></section>
  <section class="surface home-recent-surface"><div class="section-title"><h2>Công văn gần đây</h2></div>${docTable(state.docs)}</section>`;
}

function visibleRows() {
  return state.rows.filter(r =>
    (!filters.level || r.level === filters.level) &&
    (!filters.doc || r.snapshots.some(s => s.doc === filters.doc.trim())) &&
    (!filters.month || r.snapshots.some(s => s.uploadedAt.slice(0, 7) === filters.month))
  ).sort((a, b) => a.unit.localeCompare(b.unit, 'vi') || a.agency.localeCompare(b.agency, 'vi'));
}

function resourceView() {
  let rows = visibleRows(), docs = Object.keys(state.schemas);
  return head(names.resources, '', btn('Tải lên tài liệu', 'import', 'upload', 'primary')) +
    `<section class="surface" id="resourcePanel">
    <div class="toolbar">
      ${icon('folder')}
      <strong style="color:var(--text-contrast-primary)">Dữ liệu tài nguyên</strong>
      <span class="badge-count">${rows.length} hệ thống</span>
      <span class="grow"></span>
      ${btn('Thêm cột', 'add-column', 'plus', 'text')}
      ${ib('expand', 'fullscreen', 'Phóng to hoặc thu nhỏ bảng')}
    </div>
    <div class="filters">
      <span class="flex gap" style="padding-bottom:9px;color:var(--text-contrast-primary);font-weight:600">${icon('filter')}Lọc</span>
      <label class="field"><span>Tháng tải lên</span><input id="fMonth" type="month" value="${filters.month}"></label>
      <label class="field"><span>Số công văn</span><input id="fDoc" placeholder="Tất cả công văn" value="${esc(filters.doc)}"></label>
      <label class="field"><span>Cấp quản lý</span>
        <select id="fLevel">
          <option value="">Tất cả cấp</option>
          ${['Bộ ngành', 'Địa phương'].map(x => `<option ${filters.level === x ? 'selected' : ''}>${x}</option>`).join('')}
        </select>
      </label>
      ${btn('Xóa bộ lọc', 'clear-filter', '', 'text')}
    </div>
    <div class="table-scroll">
      <table class="data-table">
        <thead>
          <tr>
            <th rowspan="2">Chi tiết</th>
            <th rowspan="2">STT</th>
            <th rowspan="2">Tên đơn vị</th>
            <th rowspan="2">Cơ quan quản lý</th>
            <th rowspan="2">Hệ thống</th>
            <th rowspan="2">Công văn đăng ký</th>
            ${state.columns.filter(c => !c.doc).map(c => colHead(c, true)).join('')}
            ${docs.map(d => `<th class="group" colspan="${state.schemas[d].length + state.columns.filter(c => c.doc === d).length}">Công văn ${esc(d)}</th>`).join('')}
          </tr>
          <tr class="subhead">
            ${docs.map(d => state.schemas[d].map(c => `<th>${esc(c)}</th>`).join('') + state.columns.filter(c => c.doc === d).map(c => colHead(c)).join('')).join('')}
          </tr>
        </thead>
        <tbody>
          ${rows.map((r, i) => `<tr data-row="${r.id}" tabindex="0">
            <td class="cell-detail-trigger"><button type="button" class="icon-btn-sm" data-row="${r.id}" title="Xem chi tiết">${icon('eye')}</button></td>
            <td class="muted">${i + 1}</td>
            <td class="cell-title">${esc(r.unit)}</td>
            <td>${esc(r.agency)}</td>
            <td class="cell-title" title="${esc(r.system)}">${esc(r.system)}</td>
            <td><span class="chip active">${[...new Set(r.snapshots.map(s => s.doc))].map(esc).join(' · ')}</span></td>
            ${state.columns.filter(c => !c.doc).map(c => `<td>${esc(r.custom[c.id] || '—')}</td>`).join('')}
            ${docs.map(d => { let s = latest(r, d); return state.schemas[d].map(c => `<td class="${typeof s?.values[c] === 'number' ? 'number' : ''}" title="${esc(s?.values[c] ?? '')}">${esc(s?.values[c] ?? '—')}</td>`).join('') + state.columns.filter(c => c.doc === d).map(c => `<td>${esc(r.custom[c.id] || '—')}</td>`).join('') }).join('')}
          </tr>`).join('')}
        </tbody>
      </table>
      ${rows.length ? '' : '<div class="empty">Không có hệ thống phù hợp. Thử xóa bộ lọc.</div>'}
    </div>
    <div class="table-footer">
      <div class="flex gap">
        ${btn('Thêm cột', 'add-column', 'plus', 'text')}
        ${btn('Thêm hàng', 'add-row', 'plus', 'text')}
      </div>
      <span class="small muted">${rows.length} / ${state.rows.length} hệ thống</span>
    </div>
  </section>`;
}

const colHead = (c, row = false) => `<th ${row ? 'rowspan="2"' : ''}>${esc(c.name)} <button data-column="${c.id}" aria-label="Quản lý cột ${esc(c.name)}">${icon('edit')}</button></th>`;

function docTable(ds) {
  return `<div class="table-scroll" style="max-height:60vh">
    <table class="data-table">
      <thead>
        <tr><th>STT</th><th>Số</th><th>Ngày ban hành</th><th>Trích yếu</th><th></th></tr>
      </thead>
      <tbody>
        ${ds.map((d, i) => `<tr data-doc="${d.id}" tabindex="0">
          <td class="muted">${i + 1}</td>
          <td><span class="chip active">${esc(d.no)}</span></td>
          <td>${day(d.date)}</td>
          <td style="max-width:none;white-space:normal;min-width:300px">${esc(d.summary)}</td>
          <td>${icon('arrow')}</td>
        </tr>`).join('')}
      </tbody>
    </table>
    ${ds.length ? '' : '<div class="empty">Không tìm thấy văn bản.</div>'}
  </div>`;
}

function catalogView() {
  return head(names.catalog, '', btn('Thêm công văn', 'add-doc', 'plus', 'primary')) +
    `<div class="surface">
    <div class="toolbar">
      ${icon('search')}
      <input id="catalogSearch" placeholder="Tìm theo số, ngày, trích yếu..." aria-label="Tìm công văn" style="width:min(460px,100%)">
      <span class="grow"></span>
      <span class="muted small">${state.docs.length} văn bản</span>
    </div>
    <div id="catalogResult">${docTable(state.docs)}</div>
  </div>`;
}

let knowledgeFilters = { level: '', agency: '', type: '', q: '' };

function knowledgeView() {
  let list = state.knowledge.filter(k => {
    if (knowledgeFilters.level && (k.level || 'Trung ương') !== knowledgeFilters.level) return false;
    if (knowledgeFilters.agency && (k.agency || 'Bộ Công an') !== knowledgeFilters.agency) return false;
    if (knowledgeFilters.type && (k.docType || k.type) !== knowledgeFilters.type) return false;
    if (knowledgeFilters.q && !`${k.title} ${k.no} ${k.summary}`.toLowerCase().includes(knowledgeFilters.q.toLowerCase())) return false;
    return true;
  });

  return head('Kiến thức tổ', '', btn('Thêm kiến thức mới', 'add-knowledge', 'plus', 'primary')) +
    `<section class="surface knowledge-content-surface"><div class="filters knowledge-filter-bar">
      <label class="field" style="margin:0"><span>Cấp ban hành</span>
        <select id="kfLevel">
          <option value="">Tất cả cấp</option>
          ${['Trung ương', 'Địa phương'].map(x => `<option value="${x}" ${knowledgeFilters.level === x ? 'selected' : ''}>${x}</option>`).join('')}
        </select>
      </label>
      <label class="field" style="margin:0"><span>Cơ quan ban hành</span>
        <select id="kfAgency">
          <option value="">Tất cả cơ quan</option>
          ${['Bộ Công an', 'Chính phủ', 'Quốc hội', 'Thủ tướng Chính phủ', 'Chủ tịch nước', 'Bộ Thông tin và Truyền thông', 'Bộ Khoa học và Công nghệ'].map(x => `<option value="${x}" ${knowledgeFilters.agency === x ? 'selected' : ''}>${x}</option>`).join('')}
        </select>
      </label>
      <label class="field" style="margin:0"><span>Loại văn bản</span>
        <select id="kfType">
          <option value="">Tất cả loại</option>
          ${['Thông tư', 'Nghị định', 'Quyết định', 'Luật', 'Nghị quyết', 'Hướng dẫn', 'Quy định'].map(x => `<option value="${x}" ${knowledgeFilters.type === x ? 'selected' : ''}>${x}</option>`).join('')}
        </select>
      </label>
      ${(knowledgeFilters.level || knowledgeFilters.agency || knowledgeFilters.type) ? `<button class="btn text" id="kfClear">Xóa bộ lọc (${list.length}/${state.knowledge.length})</button>` : ''}
    </div>
    <div class="knowledge-grid-modern">
      ${list.map(k => `
        <article class="knowledge-card-modern">
          <div class="knowledge-badges-row">
            <span class="k-badge-type">${esc(k.docType || k.type || 'Thông tư')}</span>
            <span class="k-badge-no">Số ${esc(k.no || '183/2026/TT-BCA')}</span>
            <span class="k-badge-level">${esc(k.level || 'Trung ương')}</span>
          </div>
          <div class="knowledge-card-title">${esc(k.title)}</div>
          <p class="muted" style="margin:0;font-size:13px;line-height:1.4">${esc(k.summary)}</p>
          <div class="knowledge-meta-text">
            <div>Cơ quan ban hành: <strong>${esc(k.agency || 'Bộ Công an')}</strong></div>
            <div>Ngày ban hành: <strong>${esc(k.issueDate || '30/10/2026')}</strong> - Ngày hiệu lực: <strong>${esc(k.effectiveDate || '30/04/2027')}</strong></div>
          </div>
          <div class="knowledge-actions-bar">
            <button type="button" class="knowledge-action-link" data-knowledge="${k.id}">${icon('eye')} Xem toàn văn</button>
            <button type="button" class="knowledge-action-link" data-knowledge="${k.id}">⭐ Thuộc tính</button>
            <button type="button" class="knowledge-action-link" data-knowledge="${k.id}">📄 Văn bản liên quan</button>
            <button type="button" class="knowledge-action-link" data-knowledge="${k.id}">${icon('paperclip')} File đính kèm (${k.files.length})</button>
          </div>
        </article>
      `).join('')}
      ${list.length ? '' : '<div class="empty span2">Không có tài liệu phù hợp bộ lọc.</div>'}
    </div></section>`;
}

function orgView() {
  return head('Cây sơ đồ tổ', '', admin() ? btn('Cập nhật nhân sự', 'go-personnel', 'edit') : '<span class="chip">Chế độ xem</span>') +
    `<div class="surface org-tree">
    ${[0, 1, 2, 3].map(rank => `<div class="org-level">
      ${state.people.filter(p => Number(p.rank) === rank).map(p => `<button class="person-card" data-person="${p.id}">
        <div class="flex gap"><span class="avatar">${esc(p.name.split(' ').at(-1)[0])}</span><span class="small muted">${esc(p.position)}</span></div>
        <h3 style="color:var(--text-contrast-primary)">${esc(p.name)}</h3>
        <span class="small muted">${esc(p.type)}</span>
      </button>`).join('') || '<span class="muted small">Chưa có nhân sự cấp này</span>'}
    </div>`).join('')}
  </div>`;
}

function personnelView() {
  let tabs = `<nav class="personnel-tabs" aria-label="Quản lý nhân sự">${btn('Hồ sơ nhân sự', 'go-personnel', '', 'text')}${btn('Tài khoản & duyệt đăng ký (' + state.users.filter(u => u.status === 'pending').length + ')', 'go-accounts', '', 'text')}</nav>`;
  return head('Quản lý nhân sự', '', btn('Thêm nhân sự', 'add-person', 'plus', 'primary'), tabs) +
    `<div class="surface table-scroll">
    <table class="data-table">
      <thead><tr><th>Họ và tên</th><th>Chức vụ</th><th>Loại nhân sự</th><th>Tài khoản</th></tr></thead>
      <tbody>
        ${state.people.map(p => `<tr data-person="${p.id}" tabindex="0">
          <td><span class="flex gap"><span class="avatar">${esc(p.name[0])}</span><strong>${esc(p.name)}</strong></span></td>
          <td>${esc(p.position)}</td>
          <td>${esc(p.type)}</td>
          <td>${esc(state.users.find(u => u.personId === p.id)?.email || 'Chưa liên kết')}</td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>`;
}

function accountsView() {
  let tabs = `<nav class="personnel-tabs" aria-label="Quản lý nhân sự">${btn('Hồ sơ nhân sự', 'go-personnel', '', 'text')}${btn('Tài khoản & duyệt đăng ký', 'go-accounts', '', 'text')}</nav>`;
  return head('Tài khoản & duyệt đăng ký', '', btn('Thêm tài khoản', 'add-user', 'plus', 'primary'), tabs) +
    `<div class="surface">
    ${state.users.filter(u => u.status === 'pending').map(u => `<div class="pending-banner">
      <div><strong>${esc(u.name)}</strong><p class="muted small">${esc(u.email)} · Đang chờ duyệt</p></div>
      ${btn('Xem & duyệt', 'approve:' + u.id, 'check', 'primary')}
    </div>`).join('')}
    <div class="table-scroll">
      <table class="data-table">
        <thead><tr><th>Tên</th><th>Email</th><th>Vai trò</th><th>Trạng thái</th><th>Hồ sơ</th><th></th></tr></thead>
        <tbody>
          ${state.users.map(u => `<tr>
            <td>${esc(u.name)}</td>
            <td>${esc(u.email)}</td>
            <td>${u.role}</td>
            <td><span class="chip ${u.status === 'approved' ? 'active' : ''}">${{ approved: 'Đã duyệt', pending: 'Chờ duyệt', rejected: 'Từ chối' }[u.status]}</span></td>
            <td>${esc(state.people.find(p => p.id === u.personId)?.name || 'Chưa liên kết')}</td>
            <td>${u.id !== session ? ib('trash', 'delete-user:' + u.id, 'Xóa tài khoản') : ''}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
  </div>`;
}

function searchView() {
  let t = q.toLowerCase(),
    rs = state.rows.filter(r => JSON.stringify(r).toLowerCase().includes(t)),
    ds = state.docs.filter(d => JSON.stringify(d).toLowerCase().includes(t)),
    ps = state.people.filter(p => JSON.stringify(p).toLowerCase().includes(t)),
    ks = state.knowledge.filter(k => JSON.stringify(k).toLowerCase().includes(t));
  return head('Kết quả tìm kiếm', '') +
    `<div class="stack">
    <section class="surface panel-pad">
      <h2>Hệ thống (${rs.length})</h2>
      ${rs.map(r => `<button class="nav-link" data-row="${r.id}">${icon('folder')}${esc(r.system)}<span class="small muted">${esc(r.unit)} / ${esc(r.agency)}</span></button>`).join('') || '<p class="muted">Không có kết quả</p>'}
    </section>
    <section class="surface">${docTable(ds)}</section>
    <section class="surface panel-pad">
      <h2>Kiến thức (${ks.length})</h2>
      ${ks.map(k => `<button class="nav-link" data-knowledge="${k.id}">${icon('book')}${esc(k.title)}</button>`).join('')}
    </section>
    <section class="surface panel-pad">
      <h2>Nhân sự (${ps.length})</h2>
      ${ps.map(p => `<button class="nav-link" data-person="${p.id}">${icon('users')}${esc(p.name)}</button>`).join('')}
    </section>
  </div>`;
}

function bindMain() {
  [['fMonth', 'month'], ['fDoc', 'doc'], ['fLevel', 'level']].forEach(([id, k]) => {
    if ($('#' + id)) $('#' + id).onchange = e => { filters[k] = e.target.value; render() }
  });
  $('#kfLevel')?.addEventListener('change', e => { knowledgeFilters.level = e.target.value; render() });
  $('#kfAgency')?.addEventListener('change', e => { knowledgeFilters.agency = e.target.value; render() });
  $('#kfType')?.addEventListener('change', e => { knowledgeFilters.type = e.target.value; render() });
  $('#kfClear')?.addEventListener('click', () => { knowledgeFilters = { level: '', agency: '', type: '', q: '' }; render() });
  $('#catalogSearch')?.addEventListener('input', e => $('#catalogResult').innerHTML = docTable(state.docs.filter(d => `${d.no} ${d.date} ${day(d.date)} ${d.summary}`.toLowerCase().includes(e.target.value.toLowerCase()))));
  $$('tr[tabindex]').forEach(e => e.onkeydown = k => { if (k.key === 'Enter') e.click() });
}

function bind() {
  document.onclick = e => {
    let el = e.target.closest('[data-action],[data-page],[data-group],[data-row],[data-doc],[data-person],[data-knowledge],[data-column]');
    if (!el) return;
    if (el.dataset.action) return action(el.dataset.action);
    if (el.dataset.page) return navigate(el.dataset.page);
    if (el.dataset.group) { groups[el.dataset.group] = !groups[el.dataset.group]; return render() }
    if (el.dataset.row) return resourceDrawer(el.dataset.row);
    if (el.dataset.doc) return docDrawer(el.dataset.doc);
    if (el.dataset.person) return personDrawer(el.dataset.person);
    if (el.dataset.knowledge) return knowledgeDrawer(el.dataset.knowledge);
    if (el.dataset.column) return columnForm(el.dataset.column);
  };
  $('#globalSearch').oninput = e => {
    q = e.target.value;
    $('#main').innerHTML = q ? searchView() : view();
    bindMain();
    upgradeHeader();
    syncFilterInput();
  };
  bindMain();
}

