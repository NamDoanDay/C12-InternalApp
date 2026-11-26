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
  if (table && !table.classList.contains('resource-v7-table')) {
    let th = table.querySelector('thead');
    if (th) th.outerHTML = groupedHeader(Object.keys(state.schemas));
  }
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

