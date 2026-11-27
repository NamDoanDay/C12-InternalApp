'use strict';
names.tasks = 'Quản lý công việc';
names.catalog = 'Danh mục văn bản';

const M = C12Model,
  WF = { init: 'Khởi tạo', processing: 'Đang xử lý', number: 'Đang lấy số', signing: 'Đang trình ký', done: 'Đã hoàn thành' },
  BUCKET = { done: 'Đã hoàn thành', processing: 'Đang xử lý', late: 'Chậm muộn' };

const originalRender = render,
  originalView = view,
  originalAction = action,
  originalSave = save,
  workspaceBaseBind = bind,
  originalPersonForm = personForm,
  originalImportForm = importForm;

// Multi-select task filters: OR within same filter, AND across different filters
let taskSearch = '';
let activeTaskFilter = { groups: [], documents: [], types: [], bucket: '' },
  openDropdownKey = '',
  taskTab = 'mine',
  resourceFilters = { documents: [], groups: [], levels: [], month: '', self: false },
  resourceLegacy = false,
  formTask = null,
  taskCatalogKind = '',
  openTaskId = '',
  shownRevision = '',
  selectedResourceSystem = '',
  selectedResourceDoc = '',
  themeOpen = false;

// Preserve the seeded or browser-saved V7 workspace. M.migrate is reserved for legacy V5 imports.
seedTaskDemo();

const persist = () => {
  return save();
};
window.C12SaveV5 = persist;

const groupName = id => state.taskGroups.find(g => g.id === id)?.name || 'Chưa phân nhóm';
const userName = id => state.users.find(u => u.id === id)?.name || 'Người dùng';
const docBy = (kind, id) => state[kind].find(d => d.id === id);
const taskBy = id => state.tasks.find(t => t.id === id);
const visibleTasks = () => state.tasks.filter(t => !t.archived && M.canView(state, me(), t));
const badge = t => `<span class="task-status ${M.bucket(t)}">${BUCKET[M.bucket(t)]}${M.bucket(t) === 'late' ? ' ' + M.overdueDays(t) + ' ngày' : ''}</span>`;
const localTime = v => v ? new Date(new Date(v).getTime() - new Date(v).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '';

function seedTaskDemo() {
  if (state.demoSeedVersion >= 2) return;
  let adminUser = state.users.find(x => x.id === 'admin' && x.status === 'approved') || state.users.find(x => x.role === 'admin' && x.status === 'approved');
  if (!adminUser) return;

  const groups = state.taskGroups.filter(group => !group.archived),
    namesByGroup = [
      ['Nguyễn Văn An', 'Trần Minh Bình'], ['Lê Hoàng Chi', 'Phạm Quốc Dũng'],
      ['Vũ Hoàng Hà', 'Đỗ Gia Khôi'], ['Hoàng Thu Trang', 'Bùi Đức Long'],
      ['Nguyễn Hải Yến', 'Phan Anh Tuấn'], ['Đặng Minh Phúc', 'Lý Thanh Tâm']
    ],
    docTypes = ['Công văn', 'Thông tư', 'Nghị định', 'Quyết định', 'Luật', 'Nghị quyết'],
    now = Date.now(), days = value => new Date(now + value * 86400000).toISOString(),
    makeDoc = (documentType, no, summary, index) => ({
      id: `demo-doc-${index + 1}`, documentType, type: documentType, no,
      date: new Date(now - (index + 5) * 86400000).toISOString().slice(0, 10),
      summary, agency: ['Cục C12', 'Bộ Công an', 'Chính phủ'][index % 3], note: 'Dữ liệu demo', files: [], createdAt: days(-30)
    });

  // A compact but representative catalog: every supported type has a record.
  let docs = [
    makeDoc('Công văn', '952', 'Đăng ký nhu cầu tài nguyên hạ tầng điện toán đám mây', 0),
    makeDoc('Công văn', '4651', 'Rà soát nhu cầu tài nguyên và phương án an toàn thông tin', 1),
    makeDoc('Công văn', 'CV-HTM-2026-07', 'Đề xuất kết nối hạ tầng mạng', 2),
    makeDoc('Công văn', 'CV-DN-2026-04', 'Rà soát phương án cấp điện dự phòng', 3),
    ...[
      ['Thông tư', '18/2026/TT-BCA', 'Quy định quy trình quản lý hệ thống thông tin'],
      ['Nghị định', '42/2026/NĐ-CP', 'Quy định về dữ liệu và dịch vụ số'],
      ['Quyết định', '2439/QĐ-TTg', 'Ban hành Khung kiến trúc dữ liệu quốc gia'],
      ['Luật', '12/2026/QH16', 'Luật chuyển đổi số'],
      ['Nghị quyết', '28/NQ-CP', 'Nhiệm vụ bảo đảm an toàn thông tin'],
      ['Báo cáo', 'BC-C12-2026-11', 'Báo cáo hiện trạng tài nguyên'],
      ['Văn bản cấp tài nguyên', 'VTN-2026-015', 'Phê duyệt cấp tài nguyên dùng chung'],
      ['Các loại văn bản khác', 'TB-C12-2026-09', 'Thông báo phối hợp triển khai']
    ].map(([type, no, summary], i) => makeDoc(type, no, summary, i + 4))
  ];
  const currentDocs = state.documents || [];
  const catalog = docs.map(doc => currentDocs.find(current =>
    String(current.documentType || current.type || '').trim().toLocaleLowerCase('vi') === doc.documentType.toLocaleLowerCase('vi') &&
    String(current.no || '').trim().toLocaleLowerCase('vi') === doc.no.toLocaleLowerCase('vi')
  ) || doc);
  docs = catalog;
  state.documents = [...currentDocs.filter(current => !catalog.some(doc => doc.id === current.id)), ...catalog];
  state.officials = state.documents;
  state.docs = state.documents;

  const peopleByGroup = new Map();
  groups.forEach((group, index) => {
    const deputyId = `demo-deputy-${group.code}`;
    if (!state.people.some(person => person.id === deputyId)) state.people.push({
      id: deputyId, name: `Phụ trách ${group.name}`, position: 'Tổ phó, phụ trách nhóm', rank: 2,
      type: 'Cán bộ', groupId: group.id, email: `${group.code.toLowerCase()}.lead@c12.demo`, phone: '', note: 'Dữ liệu demo'
    });
    const members = namesByGroup[index] || [`Thành viên ${group.code} 1`, `Thành viên ${group.code} 2`];
    const users = members.map((name, memberIndex) => {
      const personId = `demo-member-${group.code}-${memberIndex + 1}`;
      let person = state.people.find(item => item.id === personId);
      if (!person) {
        person = { id: personId, name, position: memberIndex ? 'Cán bộ' : 'Cán bộ phụ trách', rank: 3, type: memberIndex ? 'Cán bộ' : 'Tạm tuyển', groupId: group.id, email: `${group.code.toLowerCase()}${memberIndex + 1}@c12.demo`, phone: '', note: 'Dữ liệu demo' };
        state.people.push(person);
      }
      let user = state.users.find(item => item.personId === person.id);
      if (!user) {
        const preferredId = group.code === 'HT' && memberIndex === 0 ? 'demo-u-g-HT' : `demo-user-${group.code}-${memberIndex + 1}`;
        user = { id: state.users.some(item => item.id === preferredId) ? `demo-seed-user-${group.code}-${memberIndex + 1}` : preferredId, name: person.name, email: person.email, role: 'user', status: 'approved', personId: person.id };
        state.users.push(user);
      }
      return user;
    });
    let deputy = state.users.find(item => item.personId === deputyId);
    if (!deputy) state.users.push({ id: `demo-user-deputy-${group.code}`, name: `Phụ trách ${group.name}`, email: `${group.code.toLowerCase()}.lead@c12.demo`, role: 'user', status: 'approved', personId: deputyId });
    peopleByGroup.set(group.id, users);
  });

  state.resourceRecords ||= [];
  const resourceDocs = docs.filter(doc => doc.documentType === 'Công văn'),
    assetDoc = docs.find(doc => doc.documentType === 'Văn bản cấp tài nguyên');
  const appendicesFor = (doc, seed) => ({
    columns: doc.no === '952' ? ['vCPU', 'RAM (GB)', 'Disk / Block (TB)', 'Disk / File Storage (TB)', 'Disk / Object (TB)', 'License', 'Giải pháp ATTT', 'Kênh truyền'] :
      doc.no === '4651' ? ['vCPU', 'RAM (GB)', 'GPU (GB)', 'Disk / Block SSD (TB)', 'Disk / Block HDD (TB)', 'Disk / File Storage SSD (TB)', 'Disk / File Storage HDD (TB)', 'Disk / Object (TB)', 'Sizing 3 vùng', 'Sizing / DMZ', 'Sizing / DB', 'Sizing / APP', 'License thương mại', 'Kênh truyền', 'Giải pháp ATTT', 'Kế hoạch'] :
        ['vGPU', 'RAM (GB)', 'Disk / Block (TB)', 'Disk / File Storage (TB)', 'Disk / Object (TB)', 'License'],
    rows: [{ 'vCPU': String(8 + seed * 4), 'vGPU': String(seed), 'RAM (GB)': String(32 * (seed + 1)), 'GPU (GB)': String(seed * 8), 'Disk / Block (TB)': String(seed + 1), 'Disk / Block SSD (TB)': String(seed + 1), 'Disk / Block HDD (TB)': '0', 'Disk / File Storage (TB)': String(seed + 2), 'Disk / File Storage SSD (TB)': '1', 'Disk / File Storage HDD (TB)': String(seed + 1), 'Disk / Object (TB)': '0', 'License': 'Linux; PostgreSQL', 'License thương mại': 'Microsoft SQL Server', 'Giải pháp ATTT': 'Giải pháp giám sát tập trung', 'Kênh truyền': 'Mạng nội bộ', 'Sizing 3 vùng': 'Đã khai báo', 'Sizing / DMZ': 'Có', 'Sizing / DB': 'Có', 'Sizing / APP': 'Có', 'Kế hoạch': 'Theo lộ trình C12' }], privateRows: []
  });

  groups.forEach((group, index) => {
    const people = peopleByGroup.get(group.id), registered = [resourceDocs[index % resourceDocs.length]],
      resource = {
        id: `demo-resource-${group.code}`, unit: 'Cà Mau', agency: `Đơn vị phụ trách ${group.name}`, system: `Hệ thống demo ${group.code}`,
        level: 'Địa phương', registeredDocumentIds: registered.map(doc => doc.id), assetDocumentIds: [assetDoc.id], exchangeDocumentIds: [assetDoc.id],
        sharedHardwareRowCount: 1, documentAppendices: Object.fromEntries(registered.map(doc => [doc.id, appendicesFor(doc, index + 1)])),
        attachments: [], customFields: [{ id: `demo-field-${group.code}`, name: 'Môi trường', value: index % 2 ? 'Dự phòng' : 'Chính' }], taskIds: [],
        hardwareColumns: ['STT', 'Tên tài nguyên', 'Văn bản nguồn'], hardwareRows: [{ STT: '1', 'Tên tài nguyên': `Hệ thống demo ${group.code}` }],
        revisions: [], createdBy: 'admin', editors: people.map(user => user.id), createdAt: days(-20), updatedAt: days(-1)
      };
    state.resourceRecords = state.resourceRecords.filter(item => item.id !== resource.id);
    state.resourceRecords.push(resource);

    const groupDocs = docs.filter(doc => doc.documentType !== 'Công văn' && doc.documentType !== 'Văn bản cấp tài nguyên'),
      doc = groupDocs[index % groupDocs.length];
    [
      { type: 'document', status: ['init', 'processing', 'number', 'signing', 'processing', 'init'][index], due: 7, title: `Xử lý ${doc.documentType.toLocaleLowerCase('vi')} ${doc.no}` },
      { type: 'resource', status: 'done', due: -2, title: `Cập nhật tài nguyên ${group.name}` },
      { type: 'daily', status: 'processing', due: -2, title: `Rà soát định kỳ ${group.name}` }
    ].forEach((spec, taskIndex) => {
      const task = M.saveTask(state, adminUser, {
        type: spec.type, title: `${spec.title} (demo)`, description: `Nhiệm vụ minh họa thuộc nhóm ${group.name}.`,
        managementGroupId: group.id, assigneeIds: [people[taskIndex % people.length].id],
        start: days(-5), due: days(spec.due), status: spec.status, documentType: spec.type === 'document' ? doc.documentType : '',
        documentNumber: spec.type === 'document' ? doc.no : '', documentSummary: spec.type === 'document' ? doc.summary : '',
        documentId: spec.type === 'document' ? doc.id : '', documentIds: [], officialIds: [],
        customFields: spec.type === 'resource' ? M.clone(resource.customFields) : [], attachments: spec.type === 'resource' ? M.clone(resource.attachments) : [],
        customTable: { name: 'Bảng dữ liệu tùy chỉnh', columns: ['STT', 'Hạng mục', 'Trạng thái'], rows: [{ STT: '1', 'Hạng mục': 'Rà soát và cập nhật', 'Trạng thái': spec.status === 'done' ? 'Hoàn thành' : 'Đang thực hiện' }] }
      });
      if (spec.type === 'resource') {
        task.resourceId = resource.id;
        resource.taskIds.push(task.id);
        task.resourceData = M.clone(resource);
        M.revision(task, adminUser.id, 'Liên kết tài nguyên demo', [{ field: 'Tài nguyên', old: '—', new: resource.id }], task.createdAt);
        resource.revisions.push({ id: `demo-resource-rev-${group.code}`, at: task.createdAt, actorId: 'admin', action: 'Tạo dữ liệu demo', changes: [], data: M.clone(resource) });
      }
    });
  });

  state.knowledge ||= [];
  const knowledgeSeed = [
    ['Cấp ban hành', 'Trung ương', 'Bộ Công an'], ['Cấp ban hành', 'Trung ương', 'Chính phủ'],
    ['Cấp ban hành', 'Địa phương', 'UBND tỉnh Cà Mau']
  ];
  knowledgeSeed.forEach(([type, level, agency], index) => {
    const id = `demo-knowledge-${index + 1}`;
    if (!state.knowledge.some(item => item.id === id)) state.knowledge.push({
      id, title: ['Quy trình rà soát an toàn hệ thống', 'Hướng dẫn quản lý dữ liệu dùng chung', 'Quy trình phối hợp xử lý sự cố'][index],
      no: ['HD-C12-2026-01', 'QT-C12-2026-02', 'QT-C12-2026-03'][index],
      type: ['Hướng dẫn', 'Quy định', 'Quy trình'][index], docType: docTypes[index], level, agency,
      date: new Date(now - (index + 1) * 86400000).toISOString().slice(0, 10), effectiveDate: '',
      summary: 'Tài liệu mẫu phục vụ kiểm tra danh mục, bộ lọc và thẻ kiến thức.', content: 'Nội dung minh họa về quy trình phối hợp và quản lý hệ thống.',
      related: '', note: 'Dữ liệu demo', files: []
    });
  });
  state.demoSeedVersion = 2;
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
    if (catalog) catalog.innerHTML = `<span>Danh mục văn bản</span>`;
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
    const target = admin() ? state.users.find(u => u.id === 'demo-u-g-HT') || state.users.find(u => u.role === 'user') : state.users.find(u => u.role === 'admin');
    return target && login(target.id);
  }
  if (a === 'logout') {
    setLocalSession(''); auth(); return;
  }
  if (a === 'reset') {
    if (confirm('Khôi phục bộ dữ liệu mẫu? Các thay đổi đã lưu trong trình duyệt sẽ bị thay thế.')) {
      state = seed(); save(); setLocalSession(state.users.find(u => u.id === 'demo-u-g-HT')?.id || ''); page = 'home'; render();
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

done = async function (message) {
  const saved = await persist();
  if (saved === false) {
    const error = $('#formError');
    if (error) error.textContent = 'Không lưu được thay đổi. Hãy kiểm tra kết nối rồi thử lưu lại.';
    return false;
  }
  closeOverlay();
  render();
  if (message) toast(message);
  return true;
};

login = function (id) {
  setLocalSession(id);
  page = 'home';
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

  return head('Trang chính') + `<section class="surface home-overview-surface">` + `
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
        <button type="button" class="quick-chip" data-page="catalog">${icon('file')} Danh mục văn bản</button>
        <button type="button" class="quick-chip" data-page="stats">${icon('chart')} Báo cáo tiến độ</button>
      </div>
    </div>
    <div class="welcome-side-card">
      <div class="welcome-side-head">
        <span style="font-weight:700; font-size:16px;">THÔNG TIN NỘI BỘ TỔ 1</span>
        ${icon('bell')}
      </div>
      <div class="welcome-side-content">
        <h4>Phòng 4. Tổ 1 HPC-AI</h4>
        <div class="team-counts"><span><strong>👮‍♂️ ${state.people.length}</strong> cán bộ</span><span>💼 <strong>${state.taskGroups.filter(g => !g.archived).length}</strong> nhóm</span></div>
        Hệ thống đang vận hành phiên bản Cloud Console <strong>Version 1.0</strong>.
        Hiện có <strong>${ts.length}</strong> công việc trong phạm vi theo dõi.
        <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 16px 0;">
        ${lateCount > 0 ? `<span style="color:#ef4444;display:block;margin-top:12px">⚠️ <strong>${lateCount}</strong> công việc chậm muộn cần xử lý.</span>` : ''}
        ${unreadCount > 0 ? `<span style="color:var(--action);display:block;margin-top:4px">📬 Bạn có <strong>${unreadCount}</strong> thông báo mới.</span>` : ''}
      </div>
    </div>
  </div>

  <!-- Thẻ Task Summaries Compact -->
  ${summaryCards(ts)}
  </section>

  <!-- Khu vực Quick access: Lưới thẻ thoáng đãng (gap 20-24px) -->
  <section class="surface home-quick-surface"><div class="section-title">
    <h2>Truy cập nhanh</h2>
  </div>
  <div class="quick-grid">
    ${[
      ['tasks', 'folder', 'Quản lý công việc', 'Phân công nhiệm vụ, cập nhật tiến độ và theo dõi trạng thái chung.'],
      ['resources', 'folder', 'Dữ liệu tài nguyên', 'Đối chiếu thông số kỹ thuật vCPU, RAM, Disk theo từng công văn.'],
      ['catalog', 'file', 'Danh mục văn bản', 'Tra cứu thông tin ban hành, trích yếu và tệp đính kèm.'],
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
  </div></section>

  <section class="surface home-recent-surface"><div class="section-title">
    <h2>Văn bản gần đây</h2>

  </div>
  ${docTable(state.docs)}</section>
  `;
}

// =========================================================
// YÊU CẦU 2: THẺ TASK SUMMARIES COMPACT VỚI ICON TRẠNG THÁI RIÊNG
// =========================================================
function summaryCards(ts, includeTotal = true, totalFirst = false) {
  let doneCount = ts.filter(t => M.bucket(t) === 'done').length,
    procCount = ts.filter(t => M.bucket(t) === 'processing').length,
    lateCount = ts.filter(t => M.bucket(t) === 'late').length,
    totalCount = ts.length;
  const totalCard = `<button type="button" class="summary-card total" data-bucket="">
      <div class="summary-icon-wrap">${icon('folder')}</div>
      <div class="summary-content">
        <strong>${totalCount}</strong>
        <span>Tổng công việc</span>
      </div>
    </button>`;

  const doneCard = `<button type="button" class="summary-card done" data-bucket="done">
      <div class="summary-icon-wrap">${icon('checkCircle')}</div>
      <div class="summary-content">
        <strong>${doneCount}</strong>
        <span>Đã hoàn thành</span>
      </div>
    </button>`;
  const processingCard = `<button type="button" class="summary-card processing" data-bucket="processing">
      <div class="summary-icon-wrap">${icon('clock')}</div>
      <div class="summary-content">
        <strong>${procCount}</strong>
        <span>Đang xử lý</span>
      </div>
    </button>`;
  const lateCard = `<button type="button" class="summary-card late" data-bucket="late">
      <div class="summary-icon-wrap">${icon('alertTriangle')}</div>
      <div class="summary-content">
        <strong>${lateCount}</strong>
        <span>Chậm muộn</span>
      </div>
    </button>`;
  const statusCards = totalFirst ? `${processingCard}${doneCard}${lateCard}` : `${doneCard}${processingCard}${lateCard}`;

  return `<div class="task-summaries">
    ${includeTotal && totalFirst ? totalCard : ''}${statusCards}${includeTotal && !totalFirst ? totalCard : ''}
  </div>`;
}

function taskList(ts) {
  return `<div class="table-scroll task-table-wrap"><table class="data-table task-data-table"><thead><tr><th>STT</th><th>Title</th><th>Mã công việc (Task)</th><th>Trạng thái</th><th>Ngày bắt đầu</th><th>Ngày kết thúc</th></tr></thead><tbody>${ts.map((t, i) => `<tr data-task="${t.id}" tabindex="0"><td>${i + 1}</td><td><strong>${esc(t.title)}</strong><small class="task-assignees">${esc(t.assigneeIds.map(userName).join(', '))}</small></td><td>${esc(t.code)}</td><td>${badge(t)}</td><td>${fmt(t.start)}</td><td>${fmt(t.due)}</td></tr>`).join('') || '<tr><td colspan="6" class="empty">Chưa có công việc phù hợp.</td></tr>'}</tbody></table></div>`;
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
  // Primary and related documents use the same catalog.
  if (activeTaskFilter.documents.length > 0) {
    let ids = [t.documentId, ...(t.documentIds || []), ...(t.officialIds || []), ...(t.resourceData?.registeredDocumentIds || []), ...(t.resourceData?.assetDocumentIds || t.resourceData?.exchangeDocumentIds || [])].filter(Boolean);
    let match = activeTaskFilter.documents.some(did => ids.includes(did));
    if (!match) return false;
  }
  if (activeTaskFilter.types.length > 0 && !activeTaskFilter.types.includes(t.type)) return false;
  // 4. Trạng thái bucket
  if (activeTaskFilter.bucket && M.bucket(t) !== activeTaskFilter.bucket) {
    return false;
  }
  return true;
}

let taskViewMode = 'board';
let statsActiveGroup = '';
let calSelectedDate = '2026-11-18';
let calMonth = 10, calYear = 2026;

function tasksView() {
  let all = visibleTasks(),
    bucketFilter = activeTaskFilter.bucket;
  activeTaskFilter.bucket = '';
  let base = all.filter(taskMatchesFilters).filter(t => [t.title, t.code, fmt(t.start), fmt(t.due), t.start, t.due].join(' ').toLocaleLowerCase('vi').includes(taskSearch.toLocaleLowerCase('vi')));
  activeTaskFilter.bucket = bucketFilter;
  let counts = { processing: 0, done: 0, late: 0 };
  base.forEach(t => counts[M.bucket(t)]++);
  let filtered = bucketFilter ? base.filter(t => M.bucket(t) === bucketFilter) : base;

  let filtersHtml = `<div class="filters task-filters" style="gap:12px;display:flex;align-items:center;flex-wrap:wrap">
    ${renderMultiSelect('Nhóm quản lý', 'groups', state.taskGroups.filter(g => !g.archived).map(g => [g.id, g.name]), activeTaskFilter.groups)}
    ${renderMultiSelect('Văn bản', 'documents', state.documents.filter(d => !d.archived).map(d => [d.id, `${d.documentType || d.type} · ${d.no || 'Chưa có số'}`]), activeTaskFilter.documents)}
    ${renderMultiSelect('Loại công việc', 'types', [['document', 'Xử lý văn bản'], ['resource', 'Quản lý tài nguyên'], ['daily', 'Task thường']], activeTaskFilter.types)}
    ${(activeTaskFilter.groups.length || activeTaskFilter.documents.length || activeTaskFilter.types.length || activeTaskFilter.bucket) ?
      `<button class="btn text" id="clearTaskFilters">${icon('close')} Xóa bộ lọc (${filtered.length}/${all.length})</button>` : ''}
  </div>`;

  let lists = { processing: base.filter(t => M.bucket(t) === 'processing'), done: base.filter(t => M.bucket(t) === 'done'), late: base.filter(t => M.bucket(t) === 'late') };
  let tabs = [['all', '', 'Tổng công việc', base.length], ['processing', 'processing', 'Đang xử lý', counts.processing], ['done', 'done', 'Đã hoàn thành', counts.done], ['late', 'late', 'Chậm muộn', counts.late]];
  let chartCounts = { processing: 0, done: 0, late: 0 };
  filtered.forEach(t => chartCounts[M.bucket(t)]++);
  let chartTotal = filtered.length,
    donePct = chartTotal ? chartCounts.done / chartTotal * 100 : 0,
    processingPct = chartTotal ? chartCounts.processing / chartTotal * 100 : 0;
  let chart = `<div class="task-status-chart" aria-labelledby="taskStatusChartTitle">
    <div class="task-status-pie ${chartTotal ? '' : 'is-empty'}" style="--done-pct:${donePct}%;--processing-pct:${processingPct}%" role="img" aria-label="${chartTotal} tổng công việc; ${chartCounts.processing} đang xử lý, ${chartCounts.done} đã hoàn thành, ${chartCounts.late} chậm muộn">
      <span class="task-status-total" aria-hidden="true"><strong>${chartTotal}</strong><small>Tổng công việc</small></span>
    </div>
    <div class="task-status-legend"><strong id="taskStatusChartTitle">Trạng thái trong phạm vi lọc</strong><span class="status-legend-row"><i class="processing"></i><span>Đang xử lý</span><b>${chartCounts.processing}</b></span><span class="status-legend-row"><i class="done"></i><span>Đã hoàn thành</span><b>${chartCounts.done}</b></span><span class="status-legend-row"><i class="late"></i><span>Chậm muộn</span><b>${chartCounts.late}</b></span></div>
  </div>`;

  return head('Quản lý công việc', '', btn('Tạo công việc mới', 'new-task', 'plus', 'primary'), '', 'task-page-heading') +
    `<section class="surface task-filters-surface">
      <div class="controls-container">
        <label class="task-search">
          ${icon('search')}
          <input id="taskSearch" value="${esc(taskSearch)}" placeholder="Tìm title, mã task, ngày bắt đầu hoặc ngày kết thúc..." aria-label="Tìm công việc">
        </label>
        ${filtersHtml}
      </div>
      <div class="task-filter-divider" aria-hidden="true"></div>
      ${chart}
    </section>
    <section class="surface task-workspace-surface">
    <div class="kanban-header-bar">
      <div class="kanban-tabs">
        ${tabs.map(([id, bucket, title, count]) => `<button type="button" class="kanban-tab-btn ${bucketFilter === bucket ? 'active' : ''}" data-kanban-tab="${id}">${title} (${count})</button>`).join('')}
      </div>
      <div class="view-toggle-btns">
        <button type="button" class="view-toggle-btn ${taskViewMode === 'board' ? 'active' : ''}" data-task-view-mode="board">
          ${icon('folder')} Bảng Kanban
        </button>
        <button type="button" class="view-toggle-btn ${taskViewMode === 'table' ? 'active' : ''}" data-task-view-mode="table">
          ${icon('file')} Danh sách Table
        </button>
      </div>
    </div>` +
    (taskViewMode === 'board' ?
      renderKanbanBoard(filtered, { processing: lists.processing.filter(t => !bucketFilter || bucketFilter === 'processing'), done: lists.done.filter(t => !bucketFilter || bucketFilter === 'done'), late: lists.late.filter(t => !bucketFilter || bucketFilter === 'late') }) :
      renderTableTasks(filtered)
    ) + `</section>`;
}

function renderKanbanBoard(allFiltered, { processing, done, late }) {
  return `<div class="kanban-board">
    <div class="kanban-column">
      <div class="kanban-col-head">
        <div class="kanban-col-title"><span class="col-dot blue"></span> Đang xử lý</div>
        <span class="kanban-col-count">${processing.length}</span>
      </div>
      ${processing.map(renderKanbanCard).join('') || '<p class="small muted" style="text-align:center;padding:20px">Không có task nào</p>'}
    </div>

    <div class="kanban-column">
      <div class="kanban-col-head">
        <div class="kanban-col-title"><span class="col-dot green"></span> Đã hoàn thành</div>
        <span class="kanban-col-count">${done.length}</span>
      </div>
      ${done.map(renderKanbanCard).join('') || '<p class="small muted" style="text-align:center;padding:20px">Không có task nào</p>'}
    </div>

    <div class="kanban-column">
      <div class="kanban-col-head">
        <div class="kanban-col-title"><span class="col-dot red"></span> Chậm muộn</div>
        <span class="kanban-col-count">${late.length}</span>
      </div>
      ${late.map(renderKanbanCard).join('') || '<p class="small muted" style="text-align:center;padding:20px">Không có task nào</p>'}
    </div>
  </div>`;
}

function renderKanbanCard(t) {
  let isLate = M.bucket(t) === 'late',
    isDone = M.bucket(t) === 'done',
    pct = isDone ? 100 : t.status === 'init' ? 25 : isLate ? 40 : 75;

  return `<div class="kanban-card" data-task="${t.id}" tabindex="0">
    <div class="kanban-card-head">
      <strong>${esc(t.title)}</strong>
      <button type="button" class="icon-btn-sm" style="color:var(--muted)">···</button>
    </div>
    <div class="kanban-card-desc">${esc(t.description || 'Nội dung và phân công chi tiết công việc.')}</div>
    <div class="kanban-card-tags">
      <span class="kanban-tag">${esc(groupName(t.managementGroupId))}</span>
      <span class="kanban-tag ${isLate ? 'high' : 'med'}">${isLate ? 'High' : 'Normal'}</span>
      <span class="kanban-tag" style="background:rgba(59,130,246,0.12);color:#2563eb">${esc(t.code)}</span>
    </div>
    <div class="kanban-card-meta">
      <span>📅 ${fmt(t.due)}</span>
      <span>@ ${esc(t.unit || 'Phòng 4 · Tổ 1')}</span>
    </div>
    <div class="kanban-progress-bar-wrap">
      <div class="kanban-progress-bar">
        <div class="kanban-progress-fill" style="width:${pct}%"></div>
      </div>
      <span class="kanban-progress-text">${pct}%</span>
    </div>
    <div class="kanban-card-foot">
      <div class="kanban-card-assignees">
        ${t.assigneeIds.slice(0, 3).map(uid => `<span class="kanban-avatar-overlap" title="${esc(userName(uid))}">${esc(userName(uid)[0])}</span>`).join('')}
      </div>
      <span class="kanban-attachment-badge">${icon('paperclip')} ${t.attachments?.length || 1}</span>
    </div>
  </div>`;
}

function renderTableTasks(filtered) {
  if (admin()) {
    return `<div class="surface">${taskList(filtered)}</div>`;
  }
  return `<div class="task-two-panels">
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
  </section>`;
}

function statsWorkspace() {
  let ts = visibleTasks();
  const savedBucket = activeTaskFilter.bucket;
  activeTaskFilter.bucket = '';
  const summaryTasks = ts.filter(taskMatchesFilters).filter(t => [t.title, t.code, fmt(t.start), fmt(t.due), t.start, t.due].join(' ').toLocaleLowerCase('vi').includes(taskSearch.toLocaleLowerCase('vi')));
  activeTaskFilter.bucket = savedBucket;

  // Activities
  let activities = [
    { actor: 'Nguyễn Minh An', initials: 'MA', color: '#3b82f6', action: 'Tạo công việc Task-HT-01', time: '18/11/2026 | 08:30', date: '2026-11-18' },
    { actor: 'Trần Minh Bình', initials: 'MB', color: '#8b5cf6', action: 'Cập nhật tài nguyên hệ thống Cà Mau', time: '18/11/2026 | 09:15', date: '2026-11-18' },
    { actor: 'Lê Ngọc Chi', initials: 'NC', color: '#10b981', action: 'Hoàn thành nhiệm vụ kiểm tra vận hành', time: '18/11/2026 | 11:20', date: '2026-11-18' },
    { actor: 'Phạm Quốc Dũng', initials: 'QD', color: '#f59e0b', action: 'Thêm tài liệu kiến thức mới', time: '17/11/2026 | 14:00', date: '2026-11-17' },
    { actor: 'Vũ Hoàng Hà', initials: 'HH', color: '#ef4444', action: 'Điều chuyển nhân sự sang nhóm Mạng', time: '16/11/2026 | 16:45', date: '2026-11-16' },
  ];

  let filteredActivities = calSelectedDate ? activities.filter(a => a.date === calSelectedDate) : activities;

  return head('Thống kê công việc') +
    `<section class="surface stats-summary-surface"><div class="section-title"><h2>Tổng quan công việc</h2></div>${summaryCards(summaryTasks, true, true)}</section>` +
    `<div class="stats-grid-layout">
      <!-- CỘT TRÁI: THEO NHÓM QUẢN LÝ (ACCORDION) -->
      <section class="surface panel-pad">
        <h2 style="margin:0 0 16px">Theo nhóm quản lý</h2>
        <p class="small muted" style="margin:0 0 16px">Click vào một nhóm để mở rộng xem các công việc chi tiết thuộc nhóm đó.</p>
        <div class="stats-groups">
          ${state.taskGroups.filter(g => !g.archived).map(g => {
            let list = ts.filter(t => t.managementGroupId === g.id);
            let isExpanded = statsActiveGroup === g.id;
            return `
            <div style="border-bottom:1px solid var(--border)">
              <div class="stats-group-row" data-stats-group="${g.id}" style="display:grid;grid-template-columns:1.5fr repeat(3,1fr) 30px;padding:14px 10px;align-items:center;cursor:pointer;border-radius:8px;background:${isExpanded ? 'var(--tint)' : 'transparent'};transition:background 0.15s">
                <strong>${esc(g.name)} (${esc(g.code)})</strong>
                <span>${list.length} task</span>
                <span style="color:#059669">${list.filter(t => M.bucket(t) === 'done').length} hoàn thành</span>
                <span style="color:#dc2626">${list.filter(t => M.bucket(t) === 'late').length} chậm muộn</span>
                <span class="chevron-wrap ${isExpanded ? 'expanded' : ''}" style="display:flex;justify-content:center">${icon('chevron')}</span>
              </div>
              ${isExpanded ? `
                <div style="padding:12px 16px 16px;background:rgba(0,0,0,0.02);border-radius:8px;margin:6px 0 10px">
                  <h4 style="margin:0 0 10px;font-size:13px;color:var(--text-contrast-secondary)">Danh sách công việc thuộc ${esc(g.name)} (${list.length}):</h4>
                  ${list.length ? `
                    <div class="table-scroll">
                      <table class="data-table" style="font-size:13px">
                        <thead><tr><th>Mã task</th><th>Tiêu đề</th><th>Trạng thái</th><th>Người nhận</th><th>Hạn</th></tr></thead>
                        <tbody>
                          ${list.map(t => `<tr data-task="${t.id}" tabindex="0" style="cursor:pointer">
                            <td><strong>${esc(t.code)}</strong></td>
                            <td>${esc(t.title)}</td>
                            <td>${badge(t)}</td>
                            <td>${esc(t.assigneeIds.map(userName).join(', '))}</td>
                            <td>${fmt(t.due)}</td>
                          </tr>`).join('')}
                        </tbody>
                      </table>
                    </div>
                  ` : '<p class="small muted" style="margin:0">Chưa có công việc nào thuộc nhóm này.</p>'}
                </div>
              ` : ''}
            </div>`;
          }).join('')}
        </div>
      </section>

      <!-- CỘT PHẢI: CALENDAR & ACTIVITY WIDGET -->
      <aside>
        <div class="calendar-widget">
          <div class="calendar-head">
            <span>Calender</span>
            <span style="color:var(--muted)">${icon('chevron')}</span>
          </div>
          <div class="calendar-month-nav">
            <span style="font-weight:600;font-size:14px">Tháng 11 · 2026</span>
            <div style="display:flex;gap:6px">
              <button type="button" class="icon-btn-sm" id="calPrevMonth">‹</button>
              <button type="button" class="icon-btn-sm" id="calNextMonth">›</button>
            </div>
          </div>
          <div class="calendar-days-grid">
            ${['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(d => `<span class="calendar-day-label">${d}</span>`).join('')}
            ${/* Empty slots for Nov 1, 2026 (Sunday starts at 0) */ ''}
            ${Array.from({ length: 30 }, (_, i) => {
              let dayNum = i + 1;
              let dateStr = `2026-11-${String(dayNum).padStart(2, '0')}`;
              let isSelected = calSelectedDate === dateStr;
              let isToday = dayNum === 18;
              return `<button type="button" class="calendar-day-btn ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}" data-cal-day="${dateStr}">
                ${dayNum}
              </button>`;
            }).join('')}
          </div>
        </div>

        <div class="activity-widget">
          <div class="activity-head">
            <h3>Activity</h3>
            <button type="button" class="link-button" id="activityViewAll" style="font-size:12px;font-weight:600;color:var(--action)">View All</button>
          </div>
          <div class="activity-list">
            ${filteredActivities.map(a => `
              <div class="activity-item">
                <div class="activity-avatar" style="background:${a.color}">${a.initials}</div>
                <div class="activity-content">
                  <strong>${esc(a.action)}</strong>
                  <small>${a.actor} · ${a.time}</small>
                </div>
              </div>
            `).join('') || '<p class="small muted" style="padding:10px 0;text-align:center">Không có hoạt động nào trong ngày đã chọn.</p>'}
          </div>
        </div>
      </aside>
    </div>`;
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
  document.documentElement.dataset.theme = localStorage.getItem('c12-style') || 'glassmorphism';

  // Kanban tabs
  $$('[data-kanban-tab]').forEach(btn => btn.onclick = () => {
    activeTaskFilter.bucket = btn.dataset.kanbanTab === 'all' ? '' : btn.dataset.kanbanTab;
    render();
  });

  // Task view mode toggle (Kanban vs Table)
  $$('[data-task-view-mode]').forEach(btn => btn.onclick = () => {
    taskViewMode = btn.dataset.taskViewMode;
    render();
  });

  // Stats group accordion toggle
  $$('[data-stats-group]').forEach(row => row.onclick = () => {
    let gid = row.dataset.statsGroup;
    statsActiveGroup = statsActiveGroup === gid ? '' : gid;
    render();
  });

  // Stats calendar day click
  $$('[data-cal-day]').forEach(btn => btn.onclick = () => {
    calSelectedDate = calSelectedDate === btn.dataset.calDay ? '' : btn.dataset.calDay;
    render();
  });

  $('#activityViewAll')?.addEventListener('click', () => {
    calSelectedDate = '';
    render();
  });

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
      if (key === 'documents') activeTaskFilter.documents = state.documents.filter(d => !d.archived).map(d => d.id);
      if (key === 'types') activeTaskFilter.types = ['document', 'resource', 'daily'];
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
    activeTaskFilter = { groups: [], documents: [], types: [], bucket: '' };
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
    e.ondrop = async ev => {
      ev.preventDefault();
      const backup = M.clone(state);
      try {
        M.movePerson(state, me(), ev.dataTransfer.getData('text/plain'), e.dataset.groupDrop);
        if (!await persist()) { state = backup; return; }
        render(); toast('Đã chuyển nhóm và cập nhật task');
      } catch (err) { toast(err.message) }
    };
  });
  $$('[data-group-edit]').forEach(e => e.onclick = () => groupForm(e.dataset.groupEdit));
  $$('[data-person-move]').forEach(e => e.onclick = () => movePersonDialog(e.dataset.personMove));
  $$('[data-resource-key]').forEach(e => e.onclick = () => resourceWorkspaceDrawer(e.dataset.resourceKey));
  $$('[data-resource-detail]').forEach(e => e.onclick = () => resourceWorkspaceDrawer(e.dataset.resourceDetail));
  $$('[data-cell]').forEach(e => { e.onclick = ev => { ev.stopPropagation(); editWorkspaceCell(e) } });
  $$('[data-legacy]').forEach(e => e.onclick = () => legacyDrawer(e.dataset.legacy));
  $('#resourceSearchInput')?.addEventListener('input', e => {
    resourceSearch = e.target.value;
    render();
  });
  $('#clearResourceFilters')?.addEventListener('click', () => {
    resourceFilters = { officials: [], documents: [], groups: [], levels: [], month: '', self: false };
    resourceSearch = '';
    render();
  });
  $('#legacyToggle')?.addEventListener('click', () => { resourceLegacy = !resourceLegacy; render() });
}

