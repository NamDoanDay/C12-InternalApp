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
  download: 'M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4',
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
  '952': ['vCPU', 'RAM (GB)', 'Disk / Block (TB)', 'Disk / File Storage (TB)', 'Disk / Object (TB)', 'License', 'Giải pháp ATTT', 'Kênh truyền'],
  '4651': ['vCPU', 'RAM (GB)', 'GPU (GB)', 'Disk / Block SSD (TB)', 'Disk / Block HDD (TB)', 'Disk / File Storage SSD (TB)', 'Disk / File Storage HDD (TB)', 'Disk / Object (TB)', 'Sizing 3 vùng', 'Sizing / DMZ', 'Sizing / DB', 'Sizing / APP', 'License thương mại', 'Kênh truyền', 'Giải pháp ATTT', 'Kế hoạch', 'Đặc thù', 'Hệ thống có trong danh mục theo các văn bản 278/2025/NĐ-CP; Nghị quyết 214/NQ-CP và Quyết định số 1132/QĐ-TTg', 'Ghi chú']
};

const workbookSeed = { "A1": "STT", "B1": "Tên đơn vị", "C1": "Cơ quan quản lý", "D1": "Hệ thống", "E1": "Công văn đăng ký", "F1": "952", "N1": "4651", "F2": "vCPU", "G2": "RAM (GB)", "H2": "Disk (TB)", "K2": "License", "L2": "Giải pháp ATTT", "M2": "Kênh truyền", "N2": "vCPU", "O2": "RAM (GB)", "P2": "GPU (GB)", "Q2": "Disk (TB)", "V2": "Sizing 3 vùng", "W2": "Đã chia sizing 3 vùng", "Z2": "License thương mại", "AA2": "Kênh truyền ", "AB2": "Giải pháp ATTT", "AC2": "Kế hoạch", "AD2": "Thời gian đề nghị cấp tài nguyên theo 4267", "AE2": "Đặc thù", "AF2": "Hệ thống có trong danh mục theo các văn bản 278/2025/NĐ-CP; Nghị quyết 214/NQ-CP và Quyết định số 1132/QĐ-TTg", "AG2": "Ghi chú", "Q3": "Block Storage ", "S3": "File Storage", "U3": "Object Storage", "W3": "DMZ", "X3": "DB", "Y3": "APP", "H4": "Block Storage \t", "I4": "File Storage", "J4": "Object Storage", "Q4": "SSD", "R4": "HDD", "S4": "SSD", "T4": "HDD", "A5": "1", "B5": "Cà Mau\n(01 hệ thống)", "C5": "Trung tâm giải quyết TTHC", "D5": "HTTT giải quyết thủ tục hành chính", "E5": "952 và 4651", "F5": "272", "G5": "384", "H5": "0", "I5": "8", "J5": "0", "K5": "Linux; Oracle Database; Kaspersky Enpoint Security, License, 10 License, hết hạn ngày 04/4/2026; DLP, thời hạn License 08/10/2027; WAF; Imperva SecureSphere DBF (VM), số lượng: 04 license\nLicense giám sát Oracle & MS SQL, hạn 31/8/2027 ", "L5": "Giải pháp log tập trung hiện tại: Splunk\nGiải pháp giám sát hiện tại: SOC\nNguồn log thu thập: Firewall; Anti-DDoS; IPS; Ứng dụng", "M5": "- Internet trong nước 200 Mbps\n- Internet quốc tế 10Mbps\n- Băng thông WAN: 200Mbps", "N5": "608", "O5": "740", "Q5": "23", "T5": "0", "U5": "0", "V5": "x", "W5": "-", "X5": "x", "Y5": "x", "Z5": "Linux; Oracle; DLP, Imperva", "AB5": "Có đăng ký license về: Firewall; DLP; IDS/IPS", "AC5": "Theo lộ trình C12", "AG5": "Rút", "A6": "2", "B6": "Cà Mau\n(01 hệ thống)", "C6": "VP UBND tỉnh", "D6": "Hệ thống quản lý văn bản và điều hành", "E6": "952 và 4651", "F6": "900", "G6": "1600", "H6": "0", "I6": "8", "J6": "0", "K6": "Windows Server 2019; MySQL; Kaspersky Enpoint Security, License, 3 License, hết hạn ngày 04/4/2026; DLP, thời hạn License 08/10/2027; WAF; Imperva SecureSphere DBF (VM), số lượng: 02 license\nLicense giám sát Oracle & MS SQL, hạn 30/09/2026", "L6": "Giải pháp log tập trung hiện tại: Splunk\nGiải pháp giám sát hiện tại: SOC\nNguồn log thu thập: Firewall; Anti-DDoS; IPS; Ứng dụng", "M6": "- Internet trong nước 200 Mbps\n- Internet quốc tế 10Mbps\n- Băng thông WAN: 200Mbps", "N6": "576", "O6": "1536", "Q6": "24", "T6": "0", "U6": "0", "V6": "x", "W6": "-", "X6": "x", "Y6": "x", "Z6": "Window; Orcle; PostgreSQL; DLP; Imperva", "AB6": "Có đăng ký license về: Firewall; DLP; IDS/IPS", "AC6": "Theo lộ trình C12", "AG6": "Tạm rút", "A7": "3", "B7": "Cà Mau\n(01 hệ thống)", "C7": "Sở KHCN", "D7": "Hệ thống thư điện tử công vụ tỉnh Cà Mau", "E7": "952 và 4651 rút", "F7": "112", "G7": "192", "H7": "0", "I7": "8", "J7": "0", "K7": "Windows Server 2019; MySQL; Kaspersky Enpoint Security, License, 3 License, hết hạn ngày 04/4/2026; DLP, thời hạn License 08/10/2027; WAF; Imperva SecureSphere DBF (VM), số lượng: 02 license\nLicense giám sát Oracle & MS SQL, hạn 30/09/2026", "L7": "Giải pháp log tập trung hiện tại: Splunk\nGiải pháp giám sát hiện tại: SOC\nNguồn log thu thập: Firewall; Anti-DDoS; IPS; Ứng dụng", "M7": "- Internet trong nước 200 Mbps\n- Internet quốc tế 10Mbps\n- Băng thông WAN: 200Mbps", "AG7": "Xin rút", "A8": "4", "B8": "Cà Mau\n(01 hệ thống)", "C8": "Trung tâm CĐS", "D8": "Hệ thống thông tin báo cáo cấp tỉnh   ", "E8": "952 và 4651", "F8": "48", "G8": "96", "H8": "0", "I8": "8", "J8": "0", "K8": "Linux; Microsoft SQL Server Standard; Kaspersky Enpoint Security, License, 5 License, hết hạn ngày 04/4/2026; DLP, thời hạn License 08/10/2027; WAF; Imperva SecureSphere DBF (VM), số lượng: 02 license\nLicense giám sát Oracle & MS SQL, hạn 30/09/2026", "L8": "Giải pháp log tập trung hiện tại: Splunk\nGiải pháp giám sát hiện tại: SOC\nNguồn log thu thập: Firewall; Anti-DDoS; IPS; Ứng dụng", "M8": "- Internet trong nước 200 Mbps\n- Internet quốc tế 10Mbps\n- Băng thông WAN: 200Mbps", "N8": "48", "O8": "96", "Q8": "1.5", "T8": "0", "U8": "0", "V8": "x", "W8": "-", "X8": "x", "Y8": "x", "Z8": "Window; PostgreSQL; DLP; Imperva", "AB8": "Có đăng ký license về: Firewall; DLP; IDS/IPS", "AC8": "Theo lộ trình C12", "AG8": "Tạm rút", "A9": "5", "B9": "Cà Mau\n(01 hệ thống)", "C9": "UBND", "D9": "Hệ thống iCaMau", "E9": "4267", "N9": "128", "O9": "256", "Q9": "1", "AD9": "Quý II/2027" };

function seedWorkbookRows(stamp) {
  let result = [];
  for (let n = 5; n <= 8; n++) {
    let get = c => workbookSeed[c + n] ?? '',
      unit = String(get('B')).replace(/\s*\([^)]*hệ thống[^)]*\)/i, '').trim(),
      agency = get('C'),
      system = String(get('D')).trim(),
      docs = String(get('E')).match(/\d+/g) || [],
      snapshots = [];
    for (let doc of docs) {
      let values = {}, start = doc === '952' ? 5 : doc === '4651' ? 13 : null, labels = schemas[doc];
      if (start !== null && labels) {
        labels.forEach((label, j) => {
          let idx = start + j + 1, col = '';
          while (idx) { let c = (idx - 1) % 26; col = String.fromCharCode(65 + c) + col; idx = Math.floor((idx - 1) / 26) }
          let v = get(col); if (v !== '') values[label] = v
        });
      }
      snapshots.push({ id: uid(), doc, documentDate: doc === '952' ? '2025-03-15' : '2025-09-20', uploadedAt: stamp(doc === '952' ? 5 : 1), confirmedAt: stamp(doc === '952' ? 5 : 1), filename: 'test.xlsx', values, fields: [] });
    }
    result.push({ id: uid(), unit, agency, system, level: 'Địa phương', custom: {}, snapshots });
  }
  return result;
}

function seed() {
  let now = new Date(), stamp = n => new Date(now.getFullYear(), now.getMonth(), Math.max(1, now.getDate() - n), 9, 30, 20).toISOString();
  return {
    version: 4,
    schemas: { ...structuredClone(schemas) },
    columns: [],
    rows: seedWorkbookRows(stamp),
    docs: [
      { id: uid(), no: '952', date: '2025-03-15', summary: 'Đăng ký nhu cầu tài nguyên hạ tầng điện toán đám mây', documentType: 'Công văn', type: 'Công văn', agency: 'Cục C12', note: '', files: [] },
      { id: uid(), no: '4651', date: '2025-09-20', summary: 'Rà soát, bổ sung nhu cầu tài nguyên và phương án bảo đảm an toàn thông tin', documentType: 'Công văn', type: 'Công văn', agency: 'Cục C12', note: '', files: [] }
    ],
    get documents() { return this.docs; },
    set documents(v) { this.docs = v; },
    get officials() { return this.docs; },
    set officials(v) { this.docs = v; },
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
if (state) {
  state.documents ||= state.docs || [];
  state.officials ||= state.documents;
  state.docs ||= state.documents;
}

let session = sessionStorage.getItem('c12-v5-session') || localStorage.getItem('c12-session') || 'demo-u-g-HT',
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

const me = () => state.users.find(u => u.id === session) || state.users.find(u => u.role === 'user') || state.users[0];
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
  let text = getTextColorState(isDark);
  root.style.setProperty('--text-primary', text.color);
  root.style.setProperty('--text-secondary', text.color);
  root.style.setProperty('--text-muted', text.color);
  root.style.setProperty('--text-icon', text.color);
  // Keep older inline styles and component CSS wired to the canonical tokens.
  root.style.setProperty('--text-contrast-primary', 'var(--text-primary)');
  root.style.setProperty('--text-contrast-secondary', 'var(--text-secondary)');
  root.style.setProperty('--muted', 'var(--text-muted)');
  root.style.setProperty('--table-row-hover', isDark ? '#1e293b' : '#f1f5f9');
  root.style.setProperty('--table-cell-hover', isDark ? '#2d3d54' : '#dbeafe');
}

const TEXT_PALETTE_KEY = 'c12-text-palette';
const TEXT_PALETTES = {
  auto: { label: 'Tự động theo theme', light: '#0f172a', dark: '#f8fafc' },
  ink: { label: 'Tối đậm', light: '#111827', dark: '#f9fafb' },
  navy: { label: 'Xanh than', light: '#17324d', dark: '#dbeafe' },
  bright: { label: 'Trắng sáng', light: '#1f2937', dark: '#ffffff' },
  violet: { label: 'Tím xanh', light: '#43308e', dark: '#e6ddff' }
};

function getTextPalettePreference() {
  let value = localStorage.getItem(TEXT_PALETTE_KEY) || 'auto';
  if (TEXT_PALETTES[value]) return value;
  if (/^custom:#[\da-f]{6}$/i.test(value)) return value.toLowerCase();
  return 'auto';
}

function setTextPalettePreference(value) {
  if (!TEXT_PALETTES[value] && !/^custom:#[\da-f]{6}$/i.test(value)) value = 'auto';
  if (value === 'auto') localStorage.removeItem(TEXT_PALETTE_KEY);
  else localStorage.setItem(TEXT_PALETTE_KEY, value.toLowerCase());
}

function colorLuminance(hex) {
  let value = hex.replace('#', ''), rgb = [0, 2, 4].map(i => parseInt(value.slice(i, i + 2), 16) / 255);
  let linear = rgb.map(c => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrastRatio(a, b) {
  let values = [colorLuminance(a), colorLuminance(b)].sort((x, y) => y - x);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

function hexRgb(hex) {
  let value = hex.slice(1);
  return [0, 2, 4].map(i => parseInt(value.slice(i, i + 2), 16));
}

function getTextColorState(isDark = document.documentElement.classList.contains('dark')) {
  let preference = getTextPalettePreference(), background = isDark ? '#0f172a' : '#f8fafc';
  if (TEXT_PALETTES[preference]) {
    let color = TEXT_PALETTES[preference][isDark ? 'dark' : 'light'];
    return { preference, color, adjusted: false, ratio: contrastRatio(color, background) };
  }

  let requested = preference.slice('custom:'.length), ratio = contrastRatio(requested, background);
  if (ratio >= 4.5) return { preference, color: requested, adjusted: false, ratio };

  // Preserve the chosen hue, moving it toward the mode's safest endpoint.
  let source = hexRgb(requested), target = hexRgb(isDark ? '#ffffff' : '#0b1220'), color = target;
  for (let step = 1; step <= 100; step++) {
    let amount = step / 100;
    color = source.map((channel, i) => Math.round(channel + (target[i] - channel) * amount));
    let candidate = '#' + color.map(c => c.toString(16).padStart(2, '0')).join('');
    ratio = contrastRatio(candidate, background);
    if (ratio >= 4.5) return { preference, color: candidate, adjusted: true, ratio };
  }
  return { preference, color: isDark ? '#ffffff' : '#0b1220', adjusted: true, ratio: contrastRatio(isDark ? '#ffffff' : '#0b1220', background) };
}

const nav = (p, t, i, child = false) => {
  let current = page === p;
  return `<button class="nav-link ${child ? 'child' : ''} ${current ? 'active' : ''}" data-page="${p}" aria-current="${current ? 'page' : 'false'}">${child ? '' : icon(i)}<span>${t}</span></button>`;
};
