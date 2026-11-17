'use strict';
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)], esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])), uid = () => crypto.randomUUID();

const paths = {
  menu: 'M4 6h16M4 12h16M4 18h16',
  search: 'm21 21-5-5M19 10a9 9 0 1 1-18 0 9 9 0 0 1 18 0',
  home: 'm3 10 9-7 9 7v11h-6v-7H9v7H3z',
  folder: 'M3 7h7l2-3h9v16H3z',
  book: 'M4 3h14v18H4zM8 7h6M8 11h6M8 15h4',
  tree: 'M9 3h6v5H9zM3 16h6v5H3zM15 16h6v5h-6zM12 8v4M6 16v-4h12v4',
  users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  chevron: 'm6 9 6 6 6-6',
  sun: 'M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10z',
  moon: 'M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z',
  palette: 'M12 2C6.49 2 2 6.49 2 12c0 4.41 3.59 8 8 8 1.1 0 2-.9 2-2 0-.46-.16-.89-.42-1.24-.25-.33-.42-.76-.42-1.26 0-1.1.9-2 2-2h2.34c3.6 0 6.5-2.9 6.5-6.5C22 5.5 17.5 2 12 2zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 8 6.5 8 8 8.67 8 9.5 7.33 11 6.5 11zm3-4C8.67 7 8 6.33 8 5.5S8.67 4 9.5 4s1.5.67 1.5 1.5S10.33 7 9.5 7zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 4 14.5 4s1.5.67 1.5 1.5S15.33 7 14.5 7zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 8 17.5 8s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z',
  bell: 'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0',
  checkCircle: 'M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4 12 14.01l-3-3',
  clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2',
  alertTriangle: 'm21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3zM12 9v4M12 17h.01',
  eye: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  check: 'M20 6 9 17l-5-5',
  plus: 'M12 5v14M5 12h14',
  upload: 'M12 16V3m-5 5 5-5 5 5M3 15v6h18v-6',
  close: 'm6 6 12 12M6 18 18 6',
  expand: 'M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5',
  filter: 'M3 5h18M6 12h12M10 19h4',
  arrow: 'M5 12h14m-6-6 6 6-6 6',
  edit: 'm15 3 6 6-12 12H3v-6zM12 6l6 6',
  trash: 'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7',
  file: 'M5 2h9l5 5v15H5zM14 2v6h5M8 12h8M8 16h8',
  chart: 'M4 3v18h17M8 16v-4M13 16V8M18 16V5',
  settings: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M4 4l16 16M4 20 20 4'
};

const icon = n => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[n] || paths.file}"/></svg>`;
const btn = (t, a, i = '', k = '') => `<button type="button" class="btn ${k}" data-action="${a}">${i ? icon(i) : ''}${t}</button>`;
const ib = (n, a, l) => `<button type="button" class="icon-btn" data-action="${a}" aria-label="${l}" title="${l}">${icon(n)}</button>`;
const field = (l, n, v = '', t = 'text', req = false) => `<label class="field"><span>${esc(l)}</span><input name="${n}" type="${t}" value="${esc(v)}" ${req ? 'required' : ''}></label>`;
const fmt = v => { if (!v) return '—'; let d = new Date(v), pad = n => String(n).padStart(2, '0'); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}` };
const day = v => v ? new Date(v + 'T12:00:00').toLocaleDateString('vi-VN') : '—';

const schemas = {
  '952': ['vCPU', 'RAM (GB)', 'Disk / Block (TB)', 'Disk / File Storage (TB)', 'Disk / Object (TB)', 'License', 'ATTT', 'Kênh'],
  '4651': ['vCPU', 'RAM (GB)', 'GPU (GB)', 'Disk / Block SSD (TB)', 'Disk / Block HDD (TB)', 'Disk / File Storage SSD (TB)', 'Disk / File Storage HDD (TB)', 'Disk / Object (TB)', 'Sizing 3 vùng', 'Sizing / DMZ', 'Sizing / DB', 'Sizing / APP', 'License thương mại', 'Kênh', 'ATTT', 'Kế hoạch', 'Thời gian đề nghị theo 4267', 'Đặc thù', 'Danh mục', 'Ghi chú']
};

const workbookSeed = { "A1": "STT", "B1": "Tên đơn vị", "C1": "Cơ quan quản lý", "D1": "Hệ thống", "E1": "Công văn đăng ký", "F1": "952", "N1": "4651", "F2": "vCPU", "G2": "RAM (GB)", "H2": "Disk (TB)", "K2": "License", "L2": "Giải pháp ATTT", "M2": "Kênh truyền", "N2": "vCPU", "O2": "RAM (GB)", "P2": "GPU (GB)", "Q2": "Disk (TB)", "V2": "Sizing 3 vùng", "W2": "Đã chia sizing 3 vùng", "Z2": "License thương mại", "AA2": "Kênh truyền ", "AB2": "Giải pháp ATTT", "AC2": "Kế hoạch", "AD2": "Thời gian đề nghị cấp tài nguyên theo 4267", "AE2": "Đặc thù", "AF2": "Hệ thống có trong danh mục theo các văn bản 278/2025/NĐ-CP; Nghị quyết 214/NQ-CP và Quyết định số 1132/QĐ-TTg", "AG2": "Ghi chú", "Q3": "Block Storage ", "S3": "File Storage", "U3": "Object Storage", "W3": "DMZ", "X3": "DB", "Y3": "APP", "H4": "Block Storage \t", "I4": "File Storage", "J4": "Object Storage", "Q4": "SSD", "R4": "HDD", "S4": "SSD", "T4": "HDD", "A5": "1", "B5": "Cà Mau\n(01 hệ thống)", "C5": "Trung tâm giải quyết TTHC", "D5": "HTTT giải quyết thủ tục hành chính", "E5": "952 và 4651", "F5": "272", "G5": "384", "H5": "0", "I5": "8", "J5": "0", "K5": "Linux; Oracle Database; Kaspersky Enpoint Security, License, 10 License, hết hạn ngày 04/4/2026; DLP, thời hạn License 08/10/2027; WAF; Imperva SecureSphere DBF (VM), số lượng: 04 license\nLicense giám sát Oracle & MS SQL, hạn 31/8/2027 ", "L5": "Giải pháp log tập trung hiện tại: Splunk\nGiải pháp giám sát hiện tại: SOC\nNguồn log thu thập: Firewall; Anti-DDoS; IPS; Ứng dụng", "M5": "- Internet trong nước 200 Mbps\n- Internet quốc tế 10Mbps\n- Băng thông WAN: 200Mbps", "N5": "608", "O5": "740", "Q5": "23", "T5": "0", "U5": "0", "V5": "x", "W5": "-", "X5": "x", "Y5": "x", "Z5": "Linux; Oracle; DLP, Imperva", "AB5": "Có đăng ký license về: Firewall; DLP; IDS/IPS", "AC5": "Theo lộ trình C12", "AG5": "Rút", "A6": "2", "B6": "Cà Mau\n(01 hệ thống)", "C6": "VP UBND tỉnh", "D6": "Hệ thống quản lý văn bản và điều hành", "E6": "952 và 4651", "F6": "900", "G6": "1600", "H6": "0", "I6": "8", "J6": "0", "K6": "Windows Server 2019; MySQL; Kaspersky Enpoint Security, License, 3 License, hết hạn ngày 04/4/2026; DLP, thời hạn License 08/10/2027; WAF; Imperva SecureSphere DBF (VM), số lượng: 02 license\nLicense giám sát Oracle & MS SQL, hạn 30/09/2026", "L6": "Giải pháp log tập trung hiện tại: Splunk\nGiải pháp giám sát hiện tại: SOC\nNguồn log thu thập: Firewall; Anti-DDoS; IPS; Ứng dụng", "M6": "- Internet trong nước 200 Mbps\n- Internet quốc tế 10Mbps\n- Băng thông WAN: 200Mbps", "N6": "576", "O6": "1536", "Q6": "24", "T6": "0", "U6": "0", "V6": "x", "W6": "-", "X6": "x", "Y6": "x", "Z6": "Window; Orcle; PostgreSQL; DLP; Imperva", "AB6": "Có đăng ký license về: Firewall; DLP; IDS/IPS", "AC6": "Theo lộ trình C12", "AG6": "Tạm rút", "A7": "3", "B7": "Cà Mau\n(01 hệ thống)", "C7": "Sở KHCN", "D7": "Hệ thống thư điện tử công vụ tỉnh Cà Mau", "E7": "952 và 4651 rút", "F7": "112", "G7": "192", "H7": "0", "I7": "8", "J7": "0", "K7": "Windows Server 2019; MySQL; Kaspersky Enpoint Security, License, 3 License, hết hạn ngày 04/4/2026; DLP, thời hạn License 08/10/2027; WAF; Imperva SecureSphere DBF (VM), số lượng: 02 license\nLicense giám sát Oracle & MS SQL, hạn 30/09/2026", "L7": "Giải pháp log tập trung hiện tại: Splunk\nGiải pháp giám sát hiện tại: SOC\nNguồn log thu thập: Firewall; Anti-DDoS; IPS; Ứng dụng", "M7": "- Internet trong nước 200 Mbps\n- Internet quốc tế 10Mbps\n- Băng thông WAN: 200Mbps", "AG7": "Xin rút", "A8": "4", "B8": "Cà Mau\n(01 hệ thống)", "C8": "Trung tâm CĐS", "D8": "Hệ thống thông tin báo cáo cấp tỉnh   ", "E8": "952 và 4651", "F8": "48", "G8": "96", "H8": "0", "I8": "8", "J8": "0", "K8": "Linux; Microsoft SQL Server Standard; Kaspersky Enpoint Security, License, 5 License, hết hạn ngày 04/4/2026; DLP, thời hạn License 08/10/2027; WAF; Imperva SecureSphere DBF (VM), số lượng: 02 license\nLicense giám sát Oracle & MS SQL, hạn 30/09/2026", "L8": "Giải pháp log tập trung hiện tại: Splunk\nGiải pháp giám sát hiện tại: SOC\nNguồn log thu thập: Firewall; Anti-DDoS; IPS; Ứng dụng", "M8": "- Internet trong nước 200 Mbps\n- Internet quốc tế 10Mbps\n- Băng thông WAN: 200Mbps", "N8": "48", "O8": "96", "Q8": "1.5", "T8": "0", "U8": "0", "V8": "x", "W8": "-", "X8": "x", "Y8": "x", "Z8": "Window; PostgreSQL; DLP; Imperva", "AB8": "Có đăng ký license về: Firewall; DLP; IDS/IPS", "AC8": "Theo lộ trình C12", "AG8": "Tạm rút", "A9": "5", "B9": "Cà Mau\n(01 hệ thống)", "C9": "UBND", "D9": "Hệ thống iCaMau", "E9": "4267", "N9": "128", "O9": "256", "Q9": "1", "AD9": "Quý II/2027" };

function seedWorkbookRows(stamp) {
  let result = [];
  for (let n = 5; n <= 9; n++) {
    let get = c => workbookSeed[c + n] ?? '',
      unit = String(get('B')).replace(/\s*\([^)]*hệ thống[^)]*\)/i, '').trim(),
      agency = get('C'),
      system = String(get('D')).trim(),
      docs = String(get('E')).match(/\d+/g) || [],
      snapshots = [];
    for (let doc of docs) {
      let values = {}, start = doc === '952' ? 5 : doc === '4651' ? 13 : null, labels = schemas[doc];
      if (start !== null) {
        labels.forEach((label, j) => {
          let idx = start + j + 1, col = '';
          while (idx) { let c = (idx - 1) % 26; col = String.fromCharCode(65 + c) + col; idx = Math.floor((idx - 1) / 26) }
          let v = get(col); if (v !== '') values[label] = v
        });
      } else {
        values['Ghi chú trích xuất'] = 'Chưa có nhóm cột 4267; giữ dữ liệu theo tọa độ nguồn.';
        for (let col of ['N', 'O', 'Q', 'AD']) if (get(col) !== '') values['Ô nguồn ' + col + n] = get(col);
      }
      snapshots.push({ id: uid(), doc, documentDate: doc === '952' ? '2025-03-15' : '', uploadedAt: stamp(doc === '952' ? 5 : 1), confirmedAt: stamp(doc === '952' ? 5 : 1), filename: 'test.xlsx', values, fields: [] });
    }
    result.push({ id: uid(), unit, agency, system, level: 'Địa phương', custom: {}, snapshots });
  }
  return result;
}

function seed() {
  let now = new Date(), stamp = n => new Date(now.getFullYear(), now.getMonth(), Math.max(1, now.getDate() - n), 9, 30, 20).toISOString();
  return {
    version: 4,
    schemas: { ...structuredClone(schemas), '4267': ['Ghi chú trích xuất', 'Ô nguồn N9', 'Ô nguồn O9', 'Ô nguồn Q9', 'Ô nguồn AD9'] },
    columns: [],
    rows: seedWorkbookRows(stamp),
    docs: [
      { id: uid(), no: '952', date: '2025-03-15', summary: 'Đăng ký nhu cầu tài nguyên hạ tầng điện toán đám mây', agency: 'Cục C12', note: '' },
      { id: uid(), no: '4651', date: '2025-09-20', summary: 'Rà soát, bổ sung nhu cầu tài nguyên và phương án bảo đảm an toàn thông tin', agency: 'Cục C12', note: '' }
    ],
    knowledge: [
      { id: uid(), title: 'Luật Chuyển đổi số 148/2025/QH15', type: 'Luật', summary: 'Quy định nguyên tắc, chính sách, điều phối quốc gia, biện pháp bảo đảm chuyển đổi số.', note: 'Tài liệu tham khảo', files: [] },
      { id: uid(), title: 'Hướng dẫn quản lý nhu cầu tài nguyên', type: 'Hướng dẫn', summary: 'Quy trình đăng ký, rà soát và đối chiếu nhu cầu hạ tầng cho các hệ thống thông tin.', note: 'Tài liệu nghiệp vụ', files: [] },
      { id: uid(), title: 'Quy trình phối hợp chuyên môn tổ', type: 'Quy trình', summary: 'Tiếp nhận hồ sơ, phân công xử lý và cập nhật kết quả trong không gian làm việc của tổ.', note: 'Quy trình nội bộ', files: [] }
    ],
    people: [
      ['Nguyễn Minh An', 'Lãnh đạo quản lý, phụ trách', 0],
      ['Trần Quốc Bình', 'Chỉ huy tổ', 1],
      ['Lê Hoàng Chi', 'Phó chỉ huy', 2],
      ['Phạm Gia Dũng', 'Phó chỉ huy', 2],
      ['Vũ Thanh Hà', 'Cán bộ', 3],
      ['Đỗ Minh Khôi', 'Hợp đồng', 3]
    ].map((p, i) => ({ id: 'p' + i, name: p[0], position: p[1], rank: p[2], email: '', phone: '', type: i === 5 ? 'Hợp đồng' : 'Cán bộ', note: 'Hồ sơ minh họa' })),
    users: [
      { id: 'admin', name: 'Quản trị viên', email: 'admin@c12.demo', role: 'admin', status: 'approved', personId: '' },
      { id: 'user', name: 'Thành viên tổ', email: 'user@c12.demo', role: 'user', status: 'approved', personId: '' },
      { id: uid(), name: 'Người đăng ký mẫu', email: 'new@c12.demo', role: 'user', status: 'pending', personId: '' }
    ]
  };
}

let state;
try { state = JSON.parse(localStorage.getItem('c12-prototype-v4')) } catch { }
if (state?.version !== 4) state = seed();

let session = localStorage.getItem('c12-session') ?? 'admin',
  page = location.hash.slice(1) || 'home',
  q = '',
  collapsed = false,
  account = false,
  groups = { resource: true, team: true },
  filters = { month: '', doc: '', level: '' },
  draft = null,
  drawerState = null,
  returnFocus = null;

const save = () => {
  if (window.C12SaveV5) return window.C12SaveV5();
  try { localStorage.setItem('c12-prototype-v4', JSON.stringify(state)) } catch { toast('Bộ nhớ đã đầy. Hãy giảm tệp đính kèm.') }
};

const me = () => state.users.find(u => u.id === session);
const admin = () => me()?.role === 'admin';
const key = r => [r.unit, r.agency, r.system].map(x => String(x).trim().toLocaleLowerCase('vi')).join('|');
const latest = (r, d) => r.snapshots.filter(s => s.doc === d).sort((a, b) => new Date(b.confirmedAt) - new Date(a.confirmedAt))[0];

function toast(t) {
  $('#toast').textContent = t;
  $('#toast').classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => $('#toast').classList.remove('show'), 4000);
}

const names = {
  home: 'Trang chính',
  resources: 'Quản lý văn bản, tài nguyên',
  catalog: 'Danh mục văn bản / công văn',
  knowledge: 'Kiến thức tổ',
  org: 'Cây sơ đồ tổ',
  personnel: 'Quản lý nhân sự',
  accounts: 'Tài khoản & duyệt đăng ký',
  stats: 'Thống kê'
};

document.documentElement.dataset.theme = 'cloud';
document.documentElement.classList.toggle('dark', localStorage.getItem('c12-dark') === 'true');

// =========================================================
// YÊU CẦU 9: TỰ ĐỘNG ĐIỀU CHỈNH ĐỘ TƯƠNG PHẢN (CONTRAST ENGINE)
// =========================================================
function applyContrastEngine() {
  let isDark = document.documentElement.classList.contains('dark');
  let root = document.documentElement;
  if (isDark) {
    root.style.setProperty('--text-contrast-primary', '#f8fafc');
    root.style.setProperty('--text-contrast-secondary', '#cbd5e1');
    root.style.setProperty('--table-row-hover', '#1e293b');
    root.style.setProperty('--table-cell-hover', '#2d3d54');
  } else {
    root.style.setProperty('--text-contrast-primary', '#0f172a');
    root.style.setProperty('--text-contrast-secondary', '#475569');
    root.style.setProperty('--table-row-hover', '#f1f5f9');
    root.style.setProperty('--table-cell-hover', '#dbeafe');
  }
}

const nav = (p, t, i, child = false) => `<button class="nav-link ${child ? 'child' : ''} ${page === p ? 'active' : ''}" data-page="${p}" ${page === p ? 'aria-current="page"' : ''}>${child ? '' : icon(i)}<span>${t}</span></button>`;

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
      <button type="button" class="theme-pill-toggle" data-action="theme" aria-label="Chuyển chế độ sáng / tối" title="Chuyển chế độ Sáng / Tối">
        <span class="pill-track">
          <span class="pill-thumb"></span>
          <span class="pill-icon sun">${icon('sun')}</span>
          <span class="pill-icon moon">${icon('moon')}</span>
        </span>
        <span class="pill-label">${isDark ? 'DARK' : 'LIGHT'}</span>
      </button>
      <button type="button" class="icon-btn" data-action="themes" aria-label="Đổi chủ đề không gian làm việc" title="Đổi chủ đề giao diện">
        ${icon('palette')}
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
    <button class="nav-group ${groups.resource ? 'open' : ''}" data-group="resource" aria-expanded="${groups.resource}">
      ${icon('folder')}
      <span class="nav-group-label">For you (Công việc của bạn)</span>
      <span class="chevron-wrap ${groups.resource ? 'expanded' : ''}">${icon('chevron')}</span>
    </button>
    ${groups.resource ? nav('stats', 'Thống kê', '', true) + nav('resources', 'Quản lý tài nguyên', '', true) + nav('catalog', 'Danh mục công văn', '', true) : ''}
    <button class="nav-group ${groups.team ? 'open' : ''}" data-group="team" aria-expanded="${groups.team}">
      ${icon('book')}
      <span class="nav-group-label">Chuyên môn tổ</span>
      <span class="chevron-wrap ${groups.team ? 'expanded' : ''}">${icon('chevron')}</span>
    </button>
    ${groups.team ? nav('knowledge', 'Kiến thức tổ', '', true) + nav('org', 'Cây sơ đồ tổ', '', true) : ''}
    ${admin() ? `<div class="divider"></div>${nav('personnel', 'Quản lý nhân sự', 'users')}` : ''}
    <div class="nav-foot">
      <span class="chip active">Cloud Console · ${admin() ? 'Admin' : 'User'}</span>
      <p class="small muted" style="margin-top:10px">Hệ thống quản trị nội bộ P4/T1 · V5.1</p>
    </div>
  </aside>
  <main class="main" id="main">
    ${view()}
  </main>
  ${account ? `<div class="account-menu">
    <strong style="color:var(--text-contrast-primary)">${esc(me().name)}</strong>
    <span class="small muted">${esc(me().email)}</span>
    <span class="chip active">${admin() ? 'Admin' : 'User'} · Phiên đăng nhập</span>
    <div class="divider"></div>
    <button data-action="settings">Cài đặt tài khoản</button>
    <button data-action="switch">Chuyển sang vai trò ${admin() ? 'User' : 'Admin'} demo</button>
    <button data-action="reset">Khôi phục dữ liệu mẫu</button>
    <button data-action="logout">Đăng xuất</button>
  </div>`: ''}`;

  bind();
}

// =========================================================
// YÊU CẦU 3: TIÊU ĐỀ TRANG TỐI GIẢN (LOẠI BỎ PHỤ ĐỀ)
// =========================================================
const head = (t, s = '', a = '') => {
  let actionHtml = a || (typeof s === 'string' && (s.includes('<button') || s.includes('class="btn') || s.includes('data-action') || s.includes('<span class="chip')) ? s : '');
  return `<div class="page-header">
    <h1 class="page-title">${esc(t)}</h1>
    ${actionHtml ? `<div class="flex gap">${actionHtml}</div>` : ''}
  </div>`;
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
  return `<div class="section-title"><h2>Truy cập nhanh</h2></div>
  <div class="quick-grid">
    ${[
      ['resources', 'folder', 'Quản lý tài nguyên', 'Đối chiếu công văn và cập nhật nhu cầu hạ tầng.'],
      ['catalog', 'file', 'Danh mục công văn', 'Tìm số, ngày ban hành và trích yếu văn bản.'],
      ['knowledge', 'book', 'Kiến thức tổ', 'Tài liệu chuyên môn, hướng dẫn và tham khảo.'],
      ['org', 'tree', 'Cây sơ đồ tổ', 'Thành viên, vai trò và thông tin liên hệ.']
    ].map(([p, i, t, d]) => `<button class="quick-card" data-page="${p}"><span class="quick-icon">${icon(i)}</span><div><h3>${t}</h3><p>${d}</p></div>${icon('arrow')}</button>`).join('')}
  </div>
  <div class="section-title"><h2>Công văn gần đây</h2>${btn('Xem danh mục', 'go-catalog', '', 'text')}</div>
  <div class="surface">${docTable(state.docs)}</div>`;
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

function knowledgeView() {
  return head('Kiến thức tổ', '', btn('Thêm kiến thức', 'add-knowledge', 'plus', 'primary')) +
    `<div class="knowledge-grid">
    ${state.knowledge.map(k => `<button class="surface knowledge-card" data-knowledge="${k.id}">
      <span class="chip active">${esc(k.type)}</span>
      <h3 style="color:var(--text-contrast-primary)">${esc(k.title)}</h3>
      <p class="muted">${esc(k.summary)}</p>
      <span class="grow"></span>
      <span class="flex between small muted">${k.files.length} tệp đính kèm ${icon('arrow')}</span>
    </button>`).join('')}
  </div>`;
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
  return `<div class="toolbar">${btn('Hồ sơ nhân sự', 'go-personnel', '', 'text')}${btn('Tài khoản & duyệt đăng ký (' + state.users.filter(u => u.status === 'pending').length + ')', 'go-accounts', '', 'text')}</div>` +
    head('Quản lý nhân sự', '', btn('Thêm nhân sự', 'add-person', 'plus', 'primary')) +
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
  return `<div class="toolbar">${btn('Hồ sơ nhân sự', 'go-personnel', '', 'text')}${btn('Tài khoản & duyệt đăng ký', 'go-accounts', '', 'text')}</div>` +
    head('Tài khoản & duyệt đăng ký', '', btn('Thêm tài khoản', 'add-user', 'plus', 'primary')) +
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

function action(a) {
  if (a.startsWith('go-')) return navigate(a.slice(3));
  if (a.startsWith('login-')) return login(a.slice(6));
  if (a.startsWith('approve:')) return approve(a.split(':')[1]);
  if (a.startsWith('delete-user:')) {
    if (admin() && confirm('Xóa tài khoản? Hồ sơ nhân sự vẫn được giữ.')) {
      state.users = state.users.filter(u => u.id !== a.split(':')[1]);
      save(); render();
    }
    return;
  }
  switch (a) {
    case 'nav': collapsed = !collapsed; render(); break;
    case 'theme':
      document.documentElement.classList.toggle('dark');
      localStorage.setItem('c12-dark', document.documentElement.classList.contains('dark'));
      applyContrastEngine();
      render();
      break;
    case 'account': account = !account; render(); break;
    case 'switch': login(admin() ? 'user' : 'admin'); toast('Đã chuyển vai trò demo'); break;
    case 'logout': session = ''; localStorage.setItem('c12-session', ''); auth(); break;
    case 'reset':
      if (confirm('Xóa thay đổi cục bộ và khôi phục dữ liệu mẫu?')) {
        state = seed(); save(); $('#overlay').innerHTML = ''; login('admin');
      }
      break;
    case 'settings':
      modal('Cài đặt tài khoản', field('Tên hiển thị', 'name', me().name, 'text', true) + '<div class="notice">Phiên demo không có mật khẩu máy chủ.</div>', d => {
        me().name = d.name; done('Đã lưu tên hiển thị');
      });
      break;
    case 'clear-filter': filters = { month: '', doc: '', level: '' }; render(); break;
    case 'fullscreen': $('#resourcePanel')?.classList.toggle('fullscreen'); break;
    case 'add-column': columnForm(); break;
    case 'add-row': rowForm(); break;
    case 'import': importForm(); break;
    case 'add-doc': docForm(); break;
    case 'add-knowledge': knowledgeForm(); break;
    case 'add-person': if (admin()) personForm(); break;
    case 'add-user': if (admin()) userForm(); break;
    case 'close': closeOverlay(); break;
  }
}

function closeOverlay() {
  if ($('#editForm')?.dataset.dirty === 'true' && !confirm('Bỏ các thay đổi chưa lưu?')) return;
  $('#overlay').innerHTML = '';
  drawerState = null;
  returnFocus?.focus?.();
}

function done(message) {
  save();
  $('#overlay').innerHTML = '';
  render();
  if (message) toast(message);
}

// =========================================================
// YÊU CẦU 8: QUY CHUẨN MODAL & DRAWER THÀNH RIGHT SIDEBAR DRAWER
// =========================================================
function modal(title, body, onSave, wide = false, saveText = 'Lưu thay đổi') {
  returnFocus = document.activeElement;
  $('#overlay').innerHTML = `<div class="scrim" id="modalScrim">
    <section class="drawer ${wide ? 'wide-drawer' : 'small-drawer'}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <form class="drawer-inner-form" id="editForm" style="display:flex;flex-direction:column;height:100%">
        <div class="drawer-head">
          <h2>${esc(title)}</h2>
          ${ib('close', 'close', 'Đóng')}
        </div>
        <div class="drawer-body">
          ${body}
          <p class="error" id="formError" role="alert"></p>
        </div>
        <div class="modal-foot">
          ${btn('Hủy', 'close')}
          <button type="submit" class="btn primary" id="saveForm">${saveText}</button>
        </div>
      </form>
    </section>
  </div>`;

  let scrim = $('#modalScrim');
  if (scrim) scrim.onclick = e => { if (e.target === scrim) closeOverlay() };

  let f = $('#editForm');
  f.oninput = () => f.dataset.dirty = 'true';
  f.onsubmit = async e => {
    e.preventDefault();
    try { await onSave(Object.fromEntries(new FormData(f)), f) }
    catch (err) { $('#formError').textContent = err.message }
  };
  setTimeout(() => $('#overlay input,#overlay select,#overlay textarea,#overlay button')?.focus(), 20);
}

function drawer(title, subtitle, body, large = false) {
  returnFocus = document.activeElement;
  $('#overlay').innerHTML = `<div class="scrim" id="drawerScrim">
    <section class="drawer ${large ? 'wide-drawer' : 'small-drawer'}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <div class="drawer-head">
        <div>
          <span class="small muted" style="text-transform:uppercase;letter-spacing:0.5px">Thông tin chi tiết</span>
          <h2 style="margin-top:4px">${esc(title)}</h2>
        </div>
        ${ib('close', 'close', 'Đóng chi tiết')}
      </div>
      <div class="drawer-body" style="padding:0;overflow:hidden;display:flex;flex-direction:column;flex:1">
        ${body}
      </div>
    </section>
  </div>`;

  let scrim = $('#drawerScrim');
  if (scrim) scrim.onclick = e => { if (e.target === scrim) closeOverlay() };
  setTimeout(() => $('#overlay button')?.focus(), 20);
}

function auth(register = false) {
  $('#app').className = '';
  $('#app').innerHTML = `<div class="auth-page">
    <section class="auth-intro">
      <div class="flex gap"><span class="brand-mark">C12</span><strong style="color:var(--text-contrast-primary)">C12 / P4 - T1 Internal App</strong></div>
      <div>
        <span class="chip active">Cloud Console Nội Bộ</span>
        <h1 style="margin:20px 0 16px;color:var(--text-contrast-primary)">Không gian làm việc<br>Phòng 4 · Tổ 1</h1>
        <p class="muted">Văn bản, công việc, tài nguyên và kiến thức nghiệp vụ trong cùng một hệ thống duy nhất.</p>
      </div>
      <footer class="small muted">Hệ thống C12 Console V5.1</footer>
    </section>
    <section class="auth-card">
      <form id="authForm">
        <div>
          <h2 style="color:var(--text-contrast-primary)">${register ? 'Đăng ký tài khoản' : 'Chào mừng trở lại'}</h2>
          <p class="muted" style="margin-top:6px">${register ? 'Tài khoản cần admin phê duyệt.' : 'Đăng nhập để vào không gian làm việc.'}</p>
        </div>
        ${register ? field('Họ và tên', 'name', '', 'text', true) : ''}
        ${field('Email', 'email', '', 'email', true)}
        ${field('Mật khẩu demo', 'password', '', 'password', true)}
        <p class="error" id="authError" role="alert"></p>
        <button type="submit" class="btn primary" style="min-height:42px">${register ? 'Gửi yêu cầu đăng ký' : 'Đăng nhập'}</button>
        ${register ? btn('Quay lại đăng nhập', 'auth-login', '', 'text') : `
        <div class="demo-options">
          ${btn('Đăng nhập Admin demo', 'login-admin', '', 'primary')}
          ${btn('Đăng nhập User demo', 'login-user')}
        </div>
        ${btn('Chưa có tài khoản? Đăng ký', 'auth-register', '', 'text')}`}
      </form>
    </section>
  </div>`;

  document.onclick = e => {
    let a = e.target.closest('[data-action]')?.dataset.action;
    if (a === 'auth-register') auth(true);
    else if (a === 'auth-login') auth();
    else if (a) action(a);
  };

  $('#authForm').onsubmit = e => {
    e.preventDefault();
    let d = Object.fromEntries(new FormData(e.target));
    if (register) {
      if (state.users.some(u => u.email.toLowerCase() === d.email.toLowerCase())) return $('#authError').textContent = 'Email đã tồn tại.';
      state.users.push({ id: uid(), name: d.name, email: d.email, role: 'user', status: 'pending', personId: '' });
      save(); auth(); toast('Đã gửi đăng ký. Chờ admin phê duyệt.');
    } else {
      let u = state.users.find(u => u.email.toLowerCase() === d.email.toLowerCase());
      if (!u || u.status !== 'approved') return $('#authError').textContent = 'Tài khoản không có hoặc chưa được duyệt.';
      login(u.id);
    }
  };
}

function login(id) {
  session = id;
  localStorage.setItem('c12-session', id);
  page = 'home';
  render();
}

function resourceDrawer(id, snapshotId) {
  let r = state.rows.find(x => x.id === id);
  if (!r) return;
  let same = state.rows.filter(x => x.unit === r.unit && x.agency === r.agency),
    snaps = [...r.snapshots].sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt)),
    s = snaps.find(x => x.id === snapshotId) || snaps[0];
  drawerState = { rowId: id, snapshotId: s?.id };
  drawer(`${r.unit} / ${r.agency}`, 'Chi tiết tài nguyên', `<div class="drawer-triple">
    <div class="drawer-col">
      <h3>Hệ thống <span class="badge-count">${same.length}</span></h3>
      ${same.map(x => `<button class="system-btn ${x.id === id ? 'active' : ''}" data-system-select="${x.id}" aria-pressed="${x.id === id}">
        <strong>${esc(x.system)}</strong>
        <p>${x.snapshots.length} mốc cập nhật</p>
      </button>`).join('')}
    </div>
    <div class="drawer-col">
      <h3>Lịch sử cập nhật</h3>
      ${snaps.map(x => `<button class="timeline-btn ${x.id === s?.id ? 'active' : ''}" data-snapshot="${x.id}" aria-pressed="${x.id === s?.id}">
        <strong>Công văn ${esc(x.doc)}</strong>
        <p>${fmt(x.uploadedAt)}</p>
        <span class="small">${latest(r, x.doc)?.id === x.id ? 'Bản mới nhất' : 'Bản lịch sử'}</span>
      </button>`).join('')}
    </div>
    <div class="drawer-col">
      <h3>${esc(r.system)}</h3>
      ${s ? `<span class="chip active">Công văn ${esc(s.doc)}</span>
      <div class="detail-list">
        ${[['Thời điểm tải lên', fmt(s.uploadedAt)], ['Xác nhận nhập', fmt(s.confirmedAt)], ['Ngày ban hành', day(s.documentDate)], ['Tệp nguồn', s.filename || 'Nhập thủ công'], ...Object.entries(s.values)].map(([k, v]) => `<div class="detail-pair"><span>${esc(k)}</span><span>${esc(v ?? '—')}</span></div>`).join('')}
      </div>
      <div class="section-title"><h3>Thông tin bổ sung</h3></div>
      ${s.fields.map(f => `<div class="detail-pair"><span>${esc(f.name)}</span><span>${esc(f.value)} <button data-edit-field="${f.id}" aria-label="Sửa trường">${icon('edit')}</button><button data-delete-field="${f.id}" aria-label="Xóa trường">${icon('trash')}</button></span></div>`).join('')}
      <button class="btn text" id="addSnapshotField">${icon('plus')}Thêm trường thông tin</button>
      <div class="divider"></div>
      <button class="btn text" id="editResource">${icon('edit')}Sửa dòng / cột tùy biến</button>
      <button class="btn danger" id="deleteResource">${icon('trash')}Xóa hệ thống</button>` : '<p>Chưa có mốc cập nhật.</p>'}
    </div>
  </div>`, true);

  $$('[data-system-select]').forEach(e => e.onclick = () => resourceDrawer(e.dataset.systemSelect));
  $$('[data-snapshot]').forEach(e => e.onclick = () => resourceDrawer(id, e.dataset.snapshot));
  $('#addSnapshotField')?.addEventListener('click', () => snapshotFieldForm(id, s.id));
  $('#editResource')?.addEventListener('click', () => rowForm(id));
  $('#deleteResource')?.addEventListener('click', () => {
    if (confirm('Xóa hệ thống và toàn bộ lịch sử khỏi prototype?')) {
      state.rows = state.rows.filter(x => x.id !== id); done('Đã xóa hệ thống');
    }
  });
  $$('[data-edit-field]').forEach(e => e.onclick = () => snapshotFieldForm(id, s.id, e.dataset.editField));
  $$('[data-delete-field]').forEach(e => e.onclick = () => {
    if (confirm('Xóa trường tại mốc này?')) {
      s.fields = s.fields.filter(f => f.id !== e.dataset.deleteField); save(); resourceDrawer(id, s.id);
    }
  });
}

function snapshotFieldForm(rid, sid, fid) {
  let s = state.rows.find(x => x.id === rid).snapshots.find(x => x.id === sid), f = s.fields.find(x => x.id === fid) || {};
  modal(fid ? 'Sửa trường bổ sung' : 'Thêm trường bổ sung', `<div class="notice">Chỉ thuộc mốc công văn ${esc(s.doc)} lúc ${fmt(s.uploadedAt)}.</div>${field('Tên trường', 'name', f.name, 'text', true)}${field('Giá trị', 'value', f.value)}`, d => {
    if (fid) Object.assign(f, d); else s.fields.push({ id: uid(), ...d });
    save(); resourceDrawer(rid, sid); toast('Đã lưu trường bổ sung');
  });
}

function columnForm(id) {
  let c = state.columns.find(x => x.id === id) || {};
  modal(id ? 'Quản lý cột tùy biến' : 'Thêm cột bảng', `<div class="notice">Schema dùng chung mọi dòng và người dùng.</div>${field('Tên cột', 'name', c.name, 'text', true)}<label class="field"><span>Phạm vi cột</span><select name="doc"><option value="">Cột chung</option>${Object.keys(state.schemas).map(d => `<option value="${esc(d)}" ${c.doc === d ? 'selected' : ''}>Nhóm công văn ${esc(d)}</option>`).join('')}</select></label><label class="field"><span>Kiểu dữ liệu</span><select name="type">${['text', 'number', 'date'].map(t => `<option value="${t}" ${c.type === t ? 'selected' : ''}>${{ text: 'Văn bản', number: 'Số', date: 'Ngày' }[t]}</option>`).join('')}</select></label>${id ? '<button class="btn danger" type="button" id="deleteColumn">Xóa cột và dữ liệu của cột</button>' : ''}`, d => {
    if (state.columns.some(x => x.id !== id && x.name === d.name && x.doc === d.doc)) throw Error('Tên cột đã tồn tại trong phạm vi này.');
    if (id) Object.assign(c, d); else state.columns.push({ id: uid(), ...d });
    done('Đã lưu cột bảng');
  });
  $('#deleteColumn')?.addEventListener('click', () => {
    if (confirm('Xóa cột và toàn bộ giá trị của cột?')) {
      state.columns = state.columns.filter(c => c.id !== id);
      state.rows.forEach(r => delete r.custom[id]);
      done('Đã xóa cột');
    }
  });
}

function rowForm(id) {
  let r = state.rows.find(x => x.id === id) || {};
  modal(id ? 'Sửa thông tin dòng' : 'Thêm hệ thống', `<div class="form-grid">
    ${field('Tên đơn vị', 'unit', r.unit, 'text', true)}
    ${field('Cơ quan quản lý', 'agency', r.agency, 'text', true)}
    <div class="span2">${field('Hệ thống', 'system', r.system, 'text', true)}</div>
    <label class="field"><span>Cấp quản lý</span><select name="level"><option ${r.level === 'Địa phương' ? 'selected' : ''}>Địa phương</option><option ${r.level === 'Bộ ngành' ? 'selected' : ''}>Bộ ngành</option></select></label>
    ${!id ? field('Công văn đăng ký', 'doc', '', 'text', true) : ''}
    ${state.columns.map(c => field(`${c.name}${c.doc ? ' · CV ' + c.doc : ''}`, 'c_' + c.id, r.custom?.[c.id] || '', c.type)).join('')}
  </div>`, d => {
    if (state.rows.some(x => x.id !== id && key(x) === key(d))) throw Error('Hệ thống đã có trong đơn vị và cơ quan này.');
    let custom = Object.fromEntries(state.columns.map(c => [c.id, d['c_' + c.id] || '']));
    if (id) Object.assign(r, { unit: d.unit, agency: d.agency, system: d.system, level: d.level, custom });
    else {
      let ts = new Date().toISOString();
      state.schemas[d.doc] ??= ['vCPU', 'RAM (GB)'];
      state.rows.push({ id: uid(), unit: d.unit, agency: d.agency, system: d.system, level: d.level, custom, snapshots: [{ id: uid(), doc: d.doc, documentDate: '', uploadedAt: ts, confirmedAt: ts, filename: 'Nhập thủ công', values: {}, fields: [] }] });
    }
    done('Đã lưu hệ thống');
  });
}

function docDrawer(id) {
  let d = state.docs.find(x => x.id === id);
  if (!d) return;
  drawer('Công văn ' + d.no, 'Chi tiết công văn', `<div class="drawer-body stack" style="padding:20px">
    <div class="detail-list">
      ${[['Số', d.no], ['Ngày ban hành', day(d.date)], ['Cơ quan ban hành', d.agency || '—'], ['Trích yếu', d.summary], ['Ghi chú', d.note || '—']].map(([k, v]) => `<div class="detail-pair"><span>${k}</span><span>${esc(v)}</span></div>`).join('')}
    </div>
    <div class="flex gap">
      <button class="btn" id="editDoc">${icon('edit')}Chỉnh sửa</button>
      <button class="btn danger" id="deleteDoc">${icon('trash')}Xóa</button>
    </div>
  </div>`);
  $('#editDoc').onclick = () => docForm(id);
  $('#deleteDoc').onclick = () => {
    if (confirm('Xóa khỏi danh mục? Snapshot tài nguyên được giữ.')) {
      state.docs = state.docs.filter(x => x.id !== id); done('Đã xóa công văn');
    }
  };
}

function docForm(id) {
  let d = state.docs.find(x => x.id === id) || {};
  modal(id ? 'Sửa công văn' : 'Thêm công văn', `<div class="form-grid">
    ${field('Số công văn', 'no', d.no, 'text', true)}
    ${field('Ngày ban hành', 'date', d.date, 'date', true)}
    <div class="span2">${field('Cơ quan ban hành', 'agency', d.agency)}</div>
    <label class="field span2"><span>Trích yếu</span><textarea name="summary" required>${esc(d.summary)}</textarea></label>
    <label class="field span2"><span>Ghi chú</span><textarea name="note">${esc(d.note)}</textarea></label>
  </div>`, v => {
    if (id) Object.assign(d, v); else state.docs.push({ id: uid(), ...v });
    done('Đã lưu công văn');
  });
}

function knowledgeDrawer(id) {
  let k = state.knowledge.find(x => x.id === id);
  if (!k) return;
  drawer(k.title, 'Chi tiết tài liệu', `<div class="drawer-body stack" style="padding:20px">
    <span class="chip active">${esc(k.type)}</span>
    <h3 style="color:var(--text-contrast-primary)">Trích yếu</h3>
    <p style="line-height:1.75;color:var(--text-contrast-primary)">${esc(k.summary)}</p>
    <div class="notice">${esc(k.note || 'Tài liệu chuyên môn nội bộ')}</div>
    <h3 style="color:var(--text-contrast-primary)">Tệp đính kèm</h3>
    ${k.files.map((f, i) => `<div class="flex between"><span class="flex gap">${icon('file')}<a href="${esc(f.data)}" download="${esc(f.name)}">${esc(f.name)}</a></span><button class="icon-btn" data-remove-file="${i}" aria-label="Xóa tệp">${icon('trash')}</button></div>`).join('') || '<p class="muted">Chưa có tệp đính kèm.</p>'}
    <label class="field"><span>Thêm tệp đính kèm (tối đa 2 MB / tệp)</span><input id="attachKnowledge" type="file" multiple></label>
    <div class="flex gap">
      <button class="btn" id="editKnowledge">${icon('edit')}Chỉnh sửa</button>
      <button class="btn danger" id="deleteKnowledge">${icon('trash')}Xóa bài</button>
    </div>
  </div>`);
  $('#editKnowledge').onclick = () => knowledgeForm(id);
  $('#deleteKnowledge').onclick = () => {
    if (confirm('Xóa bài kiến thức và tệp đính kèm?')) {
      state.knowledge = state.knowledge.filter(x => x.id !== id); done('Đã xóa kiến thức');
    }
  };
  $$('[data-remove-file]').forEach(e => e.onclick = () => {
    k.files.splice(Number(e.dataset.removeFile), 1); save(); knowledgeDrawer(id);
  });
  $('#attachKnowledge').onchange = async e => {
    try {
      for (let f of e.target.files) {
        if (f.size > 2 * 1024 * 1024) throw Error('Tệp vượt 2 MB. Chọn tệp nhỏ hơn cho prototype.');
        let data = await new Promise((resolve, reject) => {
          let fr = new FileReader();
          fr.onload = () => resolve(fr.result);
          fr.onerror = reject;
          fr.readAsDataURL(f);
        });
        k.files.push({ name: f.name, data });
      }
      save(); knowledgeDrawer(id); toast('Đã thêm tệp đính kèm');
    } catch (err) { toast(err.message) }
  };
}

function knowledgeForm(id) {
  let k = state.knowledge.find(x => x.id === id) || {};
  modal(id ? 'Sửa kiến thức' : 'Thêm kiến thức', `${field('Tiêu đề', 'title', k.title, 'text', true)}${field('Loại tài liệu', 'type', k.type || 'Tài liệu', 'text', true)}<label class="field"><span>Trích yếu</span><textarea name="summary" required>${esc(k.summary)}</textarea></label><label class="field"><span>Ghi chú / nguồn</span><textarea name="note">${esc(k.note)}</textarea></label>`, d => {
    if (id) Object.assign(k, d); else state.knowledge.push({ id: uid(), ...d, files: [] });
    done('Đã lưu kiến thức');
  });
}

function personDrawer(id) {
  let p = state.people.find(x => x.id === id);
  if (!p) return;
  drawer(p.name, 'Hồ sơ cán bộ', `<div class="drawer-body stack person-profile" style="padding:20px">
    <div class="avatar" style="width:64px;height:64px;font-size:24px">${esc(p.name[0])}</div>
    <div class="detail-list">
      ${[['Chức vụ', p.position], ['Loại nhân sự', p.type], ['Email', p.email || '—'], ['Điện thoại', p.phone || '—'], ['Ghi chú', p.note || '—']].map(([k, v]) => `<div class="detail-pair"><span>${k}</span><span>${esc(v)}</span></div>`).join('')}
    </div>
    ${admin() ? '<div class="flex gap"><button class="btn" id="editPerson">Chỉnh sửa hồ sơ</button><button class="btn danger" id="deletePerson">Xóa nhân sự</button></div>' : '<div class="notice">Chỉ admin được cập nhật nhân sự và cây tổ.</div>'}
  </div>`);
  $('#editPerson')?.addEventListener('click', () => personForm(id));
  $('#deletePerson')?.addEventListener('click', () => {
    if (!admin()) return;
    if (confirm('Xóa hồ sơ? Tài khoản được giữ và ngắt liên kết.')) {
      state.people = state.people.filter(x => x.id !== id);
      state.users.forEach(u => { if (u.personId === id) u.personId = '' });
      done('Đã xóa hồ sơ');
    }
  });
}

function personForm(id) {
  if (!admin()) return;
  let p = state.people.find(x => x.id === id) || {};
  modal(id ? 'Sửa hồ sơ nhân sự' : 'Thêm nhân sự', `<div class="form-grid">
    ${field('Họ và tên', 'name', p.name, 'text', true)}
    ${field('Chức vụ', 'position', p.position, 'text', true)}
    <label class="field"><span>Cấp trong cây tổ</span><select name="rank">${['Lãnh đạo quản lý / phụ trách', 'Chỉ huy tổ', 'Phó chỉ huy', 'Cán bộ / tạm tuyển / hợp đồng'].map((x, i) => `<option value="${i}" ${Number(p.rank) === i ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
    <label class="field"><span>Loại nhân sự</span><select name="type">${['Cán bộ', 'Tạm tuyển', 'Hợp đồng'].map(x => `<option ${p.type === x ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
    ${field('Email', 'email', p.email, 'email')}
    ${field('Điện thoại', 'phone', p.phone, 'tel')}
    <label class="field span2"><span>Ghi chú</span><textarea name="note">${esc(p.note)}</textarea></label>
  </div>`, d => {
    if (!admin()) throw Error('Chỉ admin được cập nhật nhân sự.');
    if (id) Object.assign(p, d); else state.people.push({ id: uid(), ...d });
    done('Đã lưu hồ sơ');
  });
}

function userForm() {
  if (!admin()) return;
  modal('Tạo tài khoản trực tiếp', `${field('Họ và tên', 'name', '', 'text', true)}${field('Email', 'email', '', 'email', true)}<label class="field"><span>Vai trò</span><select name="role"><option value="user">User</option><option value="admin">Admin</option></select></label><label class="field"><span>Liên kết hồ sơ</span><select name="personId"><option value="">Chưa liên kết</option>${state.people.filter(p => !state.users.some(u => u.personId === p.id)).map(p => `<option value="${p.id}">${esc(p.name)}</option>`).join('')}</select></label><div class="notice">Tài khoản demo không lưu mật khẩu.</div>`, d => {
    if (state.users.some(u => u.email.toLowerCase() === d.email.toLowerCase())) throw Error('Email đã tồn tại.');
    state.users.push({ id: uid(), ...d, status: 'approved' });
    done('Đã tạo tài khoản');
  });
}

function approve(id) {
  if (!admin()) return;
  let u = state.users.find(x => x.id === id);
  modal('Duyệt đăng ký', `<h3 style="color:var(--text-contrast-primary)">${esc(u.name)}</h3><p class="muted">${esc(u.email)}</p><label class="field"><span>Liên kết hồ sơ nhân sự</span><select name="personId"><option value="">Chưa liên kết</option><option value="new">Tạo hồ sơ mới theo thông tin đăng ký</option>${state.people.filter(p => !state.users.some(u => u.personId === p.id)).map(p => `<option value="${p.id}">${esc(p.name)} — ${esc(p.position)}</option>`).join('')}</select></label><button class="btn danger" type="button" id="rejectUser">Từ chối yêu cầu</button>`, d => {
    if (d.personId === 'new') {
      let p = { id: uid(), name: u.name, email: u.email, position: 'Cán bộ', rank: 3, type: 'Cán bộ', phone: '', note: 'Tạo khi duyệt đăng ký' };
      state.people.push(p); u.personId = p.id;
    } else u.personId = d.personId;
    u.status = 'approved'; done('Đã duyệt tài khoản');
  }, false, 'Duyệt tài khoản');
  $('#rejectUser').onclick = () => { u.status = 'rejected'; done('Đã từ chối yêu cầu') };
}

function importForm() {
  draft = null;
  modal('Tải lên và trích xuất tài liệu', `<div class="notice">Chọn DOCX hoặc XLSX. Dữ liệu chỉ được ghi sau khi xem trước và bấm Xác nhận nhập.</div>
  <div class="form-grid">
    ${field('Tên đơn vị (bắt buộc với DOCX)', 'unit')}
    ${field('Cơ quan quản lý (bắt buộc với DOCX)', 'agency')}
    ${field('Hệ thống (bắt buộc với DOCX)', 'system')}
    ${field('Công văn (bắt buộc với DOCX)', 'doc')}
    ${field('Ngày ban hành', 'documentDate', '', 'date')}
    <label class="field"><span>Cấp quản lý</span><select name="level"><option>Địa phương</option><option>Bộ ngành</option></select></label>
  </div>
  <label class="file-drop" style="margin-top:14px">
    <strong>Chọn tài liệu trên máy tính</strong>
    <span class="muted small">DOCX trích xuất nhãn / giá trị; XLSX theo cấu trúc mẫu 4 tầng.</span>
    <input id="importFile" type="file" accept=".docx,.xlsx,.xls">
  </label>
  <div class="flex gap" style="margin-top:14px">
    <button type="button" class="btn" id="readImport">${icon('search')}Trích xuất & xem trước</button>
    <a href="../reference/test.xlsx" download>Tải Excel mẫu</a>
  </div>
  <div id="importStatus" class="small muted" style="margin-top:10px" role="status"></div>
  <div id="importPreview" style="margin-top:14px"></div>`, commitImport, true, 'Xác nhận nhập');

  $('#saveForm').disabled = true;
  $('#importFile').onchange = () => {
    draft = null;
    $('#saveForm').disabled = true;
    $('#importPreview').innerHTML = '';
    $('#importFile').dataset.uploadedAt = new Date().toISOString();
  };
  $('#readImport').onclick = readImport;
}

async function readImport() {
  let form = $('#editForm'), f = $('#importFile').files[0], meta = Object.fromEntries(new FormData(form));
  if (!f) { $('#formError').textContent = 'Chọn tệp trước khi trích xuất.'; return }
  $('#formError').textContent = '';
  $('#importStatus').textContent = 'Đang đọc tài liệu...';
  $('#readImport').disabled = true;
  try {
    let array = await f.arrayBuffer(), uploadedAt = $('#importFile').dataset.uploadedAt || new Date().toISOString(), rows = [];
    if (/\.xlsx?$/i.test(f.name)) {
      if (!window.XLSX) throw Error('Chưa tải được thư viện SheetJS. Kiểm tra Internet rồi tải lại trang.');
      let wb = XLSX.read(array, { type: 'array' }), sheet = wb.Sheets[wb.SheetNames[0]];
      rows = parseWorkbook(sheet, meta);
    } else if (/\.docx$/i.test(f.name)) {
      if (!window.mammoth) throw Error('Chưa tải được thư viện Mammoth.');
      if (!meta.unit || !meta.agency || !meta.system || !meta.doc) throw Error('Điền đơn vị, cơ quan, hệ thống và công văn cho DOCX.');
      let result = await mammoth.extractRawText({ arrayBuffer: array }), text = result.value, values = {};
      text.split(/\r?\n/).map(x => x.trim()).filter(Boolean).forEach(line => {
        let m = line.match(/^(.{1,100}?)\s*[:：]\s*(.+)$/);
        if (m) values[m[1].trim()] = m[2].trim();
      });
      if (!Object.keys(values).length) values['Nội dung văn bản'] = text.trim();
      if (!text.trim()) throw Error('Không đọc được nội dung văn bản.');
      rows = [{ unit: meta.unit, agency: meta.agency, system: meta.system, level: meta.level, doc: meta.doc, documentDate: meta.documentDate, values }];
    } else throw Error('Chỉ hỗ trợ DOCX và XLSX/XLS.');
    if (!rows.length) throw Error('Không tìm thấy dòng dữ liệu.');
    draft = { filename: f.name, uploadedAt, rows };
    showImportPreview();
    $('#importStatus').textContent = `Đã đọc ${rows.length} snapshot dự kiến.`;
    $('#saveForm').disabled = false;
  } catch (err) {
    $('#formError').textContent = err.message;
    $('#importStatus').textContent = 'Chưa nhập dữ liệu.';
  } finally {
    $('#readImport').disabled = false;
  }
}

function parseWorkbook(sheet, meta = {}) {
  let cell = (r, c) => sheet[XLSX.utils.encode_cell({ r, c })]?.v ?? '', range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:A1');
  if (range.e.r < 4 || String(cell(0, 1)).toLowerCase().indexOf('đơn vị') < 0) throw Error('Excel chưa đúng cấu trúc mẫu 4 tầng.');
  let result = [], unit = '', agency = '';
  for (let r = 4; r <= range.e.r; r++) {
    if (cell(r, 1)) unit = String(cell(r, 1)).replace(/\s*\([^)]*hệ thống[^)]*\)/i, '').trim();
    if (cell(r, 2)) agency = String(cell(r, 2)).trim();
    let system = String(cell(r, 3)).trim(), registration = String(cell(r, 4));
    if (!system) continue;
    let docs = registration.match(/\d+/g) || [];
    for (let doc of docs) {
      let values = {}, columns = doc === '952' ? [5, 12] : doc === '4651' ? [13, 32] : null;
      if (columns) {
        let labels = schemas[doc];
        for (let c = columns[0]; c <= columns[1]; c++) {
          let v = cell(r, c);
          if (v !== '' && v != null) values[labels[c - columns[0]]] = v;
        }
      } else {
        values['Ghi chú trích xuất'] = 'Công văn có trong đăng ký nhưng chưa có nhóm cột ánh xạ.';
        for (let c = 5; c <= 32; c++) {
          let v = cell(r, c);
          if (v !== '' && v != null) values['Ô nguồn ' + XLSX.utils.encode_cell({ r, c })] = v;
        }
      }
      values['Đăng ký nguyên bản'] = registration;
      result.push({ unit, agency, system, level: meta.level || 'Địa phương', doc, documentDate: meta.documentDate || '', values });
    }
  }
  return result;
}

function showImportPreview() {
  if (!draft) return;
  $('#importPreview').innerHTML = `<h3 style="color:var(--text-contrast-primary)">Xem trước ${draft.rows.length} snapshot</h3>
  <p class="small muted" style="margin:6px 0 12px">Tệp: ${esc(draft.filename)} · Tải lên ${fmt(draft.uploadedAt)}</p>
  <div class="preview-table">
    <table class="data-table">
      <thead><tr><th>Đơn vị</th><th>Cơ quan</th><th>Hệ thống</th><th>Công văn</th><th>Ngày ban hành</th><th>Thông tin trích xuất</th><th></th></tr></thead>
      <tbody>
        ${draft.rows.map((r, i) => `<tr>
          <td><input data-preview="${i}:unit" value="${esc(r.unit)}" aria-label="Đơn vị dòng ${i + 1}"></td>
          <td><input data-preview="${i}:agency" value="${esc(r.agency)}" aria-label="Cơ quan dòng ${i + 1}"></td>
          <td><input data-preview="${i}:system" value="${esc(r.system)}" aria-label="Hệ thống dòng ${i + 1}"></td>
          <td><input data-preview="${i}:doc" value="${esc(r.doc)}" aria-label="Công văn dòng ${i + 1}"></td>
          <td><input type="date" data-preview="${i}:documentDate" value="${esc(r.documentDate)}" aria-label="Ngày ban hành dòng ${i + 1}"></td>
          <td><div style="display:grid;gap:6px;min-width:280px">${Object.entries(r.values).map(([k, v]) => `<label class="field"><span>${esc(k)}</span><input data-value-row="${i}" data-value-key="${esc(k)}" value="${esc(v)}"></label>`).join('')}</div></td>
          <td><button type="button" class="icon-btn" data-remove-preview="${i}" aria-label="Bỏ snapshot">${icon('trash')}</button></td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>`;
  $$('[data-preview]').forEach(e => e.oninput = () => { let [i, k] = e.dataset.preview.split(':'); draft.rows[i][k] = e.value });
  $$('[data-value-row]').forEach(e => e.oninput = () => { draft.rows[e.dataset.valueRow].values[e.dataset.valueKey] = e.value });
  $$('[data-remove-preview]').forEach(e => e.onclick = () => { draft.rows.splice(Number(e.dataset.removePreview), 1); showImportPreview(); $('#saveForm').disabled = !draft.rows.length });
}

function commitImport() {
  if (!draft?.rows.length) throw Error('Trích xuất và xem trước trước khi xác nhận.');
  let confirmedAt = new Date().toISOString();
  for (let item of draft.rows) {
    let r = state.rows.find(x => key(x) === key(item));
    if (!r) {
      r = { id: uid(), unit: item.unit.trim(), agency: item.agency.trim(), system: item.system.trim(), level: item.level, custom: {}, snapshots: [] };
      state.rows.push(r);
    }
    state.schemas[item.doc] ??= Object.keys(item.values);
    for (let label of Object.keys(item.values)) if (!state.schemas[item.doc].includes(label)) state.schemas[item.doc].push(label);
    r.snapshots.push({ id: uid(), doc: item.doc.trim(), documentDate: item.documentDate, uploadedAt: draft.uploadedAt, confirmedAt, filename: draft.filename, values: structuredClone(item.values), fields: [] });
  }
  let n = draft.rows.length;
  draft = null;
  done(`Đã xác nhận nhập ${n} snapshot.`);
}

function groupedHeader(docs) {
  const root = { children: [] };
  const add = (path, id) => {
    let node = root;
    for (let i = 0; i < path.length; i++) {
      let found = node.children.find(n => n.label === path[i] && (!id || i < path.length - 1));
      if (!found) {
        found = { label: path[i], children: [], id: i === path.length - 1 ? id : null };
        node.children.push(found);
      }
      node = found;
    }
  };
  for (let d of docs) {
    for (let label of state.schemas[d]) {
      let parts = label.split(' / ');
      if (parts[0] === 'Disk' && parts.length === 2) {
        let m = parts[1].match(/^(Block|File Storage) (SSD|HDD) \(TB\)$/);
        if (m) parts = ['Disk (TB)', m[1], m[2]];
      }
      if (parts[0] === 'Disk') {
        parts[0] = 'Disk (TB)';
        if (parts.length === 2) parts[1] = parts[1].replace(' (TB)', '');
      }
      if (parts[0] === 'Sizing 3 vùng') parts = ['Sizing 3 vùng'];
      add(['Công văn ' + d, ...parts]);
    }
    for (let c of state.columns.filter(c => c.doc === d)) add(['Công văn ' + d, c.name], c.id);
  }
  const count = n => n.children.length ? n.children.reduce((a, x) => a + count(x), 0) : 1;
  const depth = n => n.children.length ? 1 + Math.max(...n.children.map(depth)) : 1;
  let max = Math.max(4, ...root.children.map(depth)), rows = Array.from({ length: max }, () => []);
  function walk(n, level) {
    let leaf = !n.children.length;
    rows[level].push(`<th class="${level === 0 ? 'group' : ''}" colspan="${count(n)}" ${leaf ? `rowspan="${max - level}"` : ''}>${esc(n.label)}${n.id ? ` <button data-column="${n.id}" aria-label="Quản lý cột">${icon('edit')}</button>` : ''}</th>`);
    n.children.forEach(x => walk(x, level + 1));
  }
  root.children.forEach(n => walk(n, 0));
  let bases = ['Chi tiết', 'STT', 'Tên đơn vị', 'Cơ quan quản lý', 'Hệ thống', 'Công văn đăng ký'].map(t => `<th rowspan="${max}">${t}</th>`).join('') + state.columns.filter(c => !c.doc).map(c => `<th rowspan="${max}">${esc(c.name)} <button data-column="${c.id}" aria-label="Quản lý cột">${icon('edit')}</button></th>`).join('');
  return `<thead>${rows.map((r, i) => `<tr class="header-level-${i}" style="--head-top:${i * 39}px">${i === 0 ? bases : ''}${r.join('')}</tr>`).join('')}</thead>`;
}

function upgradeHeader() {
  let table = $('#resourcePanel table');
  if (table) table.querySelector('thead').outerHTML = groupedHeader(Object.keys(state.schemas));
}

const originalBind = bind;
bind = function () {
  originalBind();
  bindMain();
  upgradeHeader();
  syncNav();
  syncFilterInput();
};

function syncFilterInput() {
  if ($('#fDoc')) $('#fDoc').oninput = e => {
    let value = e.target.value, pos = e.target.selectionStart;
    filters.doc = value;
    render();
    $('#fDoc')?.focus();
    $('#fDoc')?.setSelectionRange(pos, pos);
  };
}

function syncNav() {
  let closed = matchMedia('(max-width:800px)').matches ? !collapsed : collapsed;
  let side = $('.sidebar');
  if (side) {
    side.inert = closed;
    side.setAttribute('aria-hidden', String(closed));
  }
  let toggle = $('[data-action=nav]');
  toggle?.setAttribute('aria-expanded', String(!closed));
}

window.addEventListener('resize', syncNav);

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if ($('#overlay').innerHTML) closeOverlay();
    else if ($('#resourcePanel')?.classList.contains('fullscreen')) $('#resourcePanel').classList.remove('fullscreen');
  }
  if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
    e.preventDefault();
    $('#globalSearch')?.focus();
  }
  if (e.key === 'Tab' && $('#overlay').innerHTML) {
    let focus = $$('button:not(:disabled),input:not(:disabled),select,textarea,a[href]', $('#overlay')).filter(x => x.offsetParent !== null);
    if (focus.length) {
      if (e.shiftKey && document.activeElement === focus[0]) { e.preventDefault(); focus.at(-1).focus() }
      else if (!e.shiftKey && document.activeElement === focus.at(-1)) { e.preventDefault(); focus[0].focus() }
    }
  }
});

window.addEventListener('hashchange', () => {
  let p = location.hash.slice(1);
  if (p && p !== page) { page = p; q = ''; render() }
});

render();

