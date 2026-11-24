function auth(register = false) {
  $('#app').className = '';
  $('#app').innerHTML = `<div class="auth-page">
    <div class="auth-card-wrap">
      <section class="auth-card">
        <form id="authForm">
          <div>
            <h2>${register ? 'Tạo tài khoản' : 'Đăng nhập'}</h2>
            <p class="auth-subtitle">${register ? 'Gửi yêu cầu để quản trị viên phê duyệt.' : 'Chào mừng bạn trở lại không gian làm việc.'}</p>
          </div>
          <div class="auth-tabs">
            <button type="button" class="auth-tab-btn ${!register ? 'active' : ''}" data-action="auth-login">Đăng nhập</button>
            <button type="button" class="auth-tab-btn ${register ? 'active' : ''}" data-action="auth-register">Đăng ký</button>
          </div>
          ${register ? `<label class="auth-input-wrap"><span class="sr-only">Họ và tên</span>${icon('users')}<input name="name" type="text" autocomplete="name" placeholder="Họ và tên" aria-label="Họ và tên" required></label>` : ''}
          <label class="auth-input-wrap"><span class="sr-only">Email</span><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20 4H4a2 2 0 0 0-2 2v.4l10 6.25L22 6.4V6a2 2 0 0 0-2-2ZM2 8.75V18a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8.75l-9.47 5.92a1 1 0 0 1-1.06 0L2 8.75Z"/></svg><input name="email" type="email" autocomplete="username" placeholder="Email" aria-label="Email" required></label>
          <label class="auth-input-wrap"><span class="sr-only">Mật khẩu</span><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17 9V7a5 5 0 0 0-10 0v2a3 3 0 0 0-3 3v7a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-7a3 3 0 0 0-3-3ZM9 7a3 3 0 0 1 6 0v2H9V7Z"/></svg><input id="authPassword" name="password" type="password" autocomplete="current-password" placeholder="Mật khẩu" aria-label="Mật khẩu" required><button class="auth-password-toggle" id="toggleAuthPassword" type="button" aria-label="Hiện mật khẩu">${icon('eye')}</button></label>
          ${!register ? `<label class="auth-remember"><input type="checkbox" checked><span>Ghi nhớ đăng nhập</span></label>` : ''}
          <p class="error" id="authError" role="alert"></p>
          <button type="submit" class="btn primary auth-submit">${register ? 'Gửi yêu cầu đăng ký' : 'Đăng nhập'}</button>
          ${register ? btn('Quay lại đăng nhập', 'auth-login', '', 'text') : `
          <div class="demo-divider">Hoặc trải nghiệm nhanh</div>
            ${btn('Đăng nhập User demo', 'login-user', '', 'primary')}
            ${btn('Đăng nhập Admin demo', 'login-admin')}
          </div>`}
        </form>
        ${!register ? `<p class="auth-footer">Chưa có tài khoản? <button type="button" data-action="auth-register">Đăng ký</button></p>` : ''}
      </section>
    </div>
  </div>`;

  document.onclick = e => {
    let a = e.target.closest('[data-action]')?.dataset.action;
    if (a === 'auth-register') auth(true);
    else if (a === 'auth-login') auth();
    else if (a) action(a);
  };

  $('#toggleAuthPassword').onclick = () => {
    let input = $('#authPassword'), visible = input.type === 'password';
    input.type = visible ? 'text' : 'password';
    $('#toggleAuthPassword').setAttribute('aria-label', visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu');
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
  let d = state.docs?.find(x => x.id === id) || state.officials?.find(x => x.id === id) || state.documents?.find(x => x.id === id);
  if (!d) return;
  drawer('Thông tin chi tiết', d.no ? ('Công văn ' + d.no) : 'Chi tiết văn bản', `
    <div class="doc-detail-view">
      <div class="doc-detail-badge">${icon('fileText')} ${esc(d.no || 'Văn bản')}</div>
      <div class="doc-meta-card">
        <div class="doc-meta-row"><span>Số công văn / văn bản</span><strong>${esc(d.no || '—')}</strong></div>
        <div class="doc-meta-row"><span>Ngày ban hành</span><strong>${day(d.date) || '—'}</strong></div>
        <div class="doc-meta-row"><span>Cơ quan ban hành</span><strong>${esc(d.agency || '—')}</strong></div>
        <div class="doc-meta-row"><span>Trích yếu nội dung</span><strong>${esc(d.summary || '—')}</strong></div>
        <div class="doc-meta-row"><span>Ghi chú</span><p style="margin:0;color:var(--muted)">${esc(d.note || '—')}</p></div>
      </div>
      ${(d.files && d.files.length) ? `
      <div class="doc-meta-card">
        <span style="font-size:12px;font-weight:600;color:var(--muted);text-transform:uppercase">Tệp đính kèm (${d.files.length})</span>
        <div style="display:flex;flex-direction:column;gap:8px;margin-top:6px">
          ${d.files.map(f => `<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:var(--app);border-radius:8px">
            <span style="font-size:13px;font-weight:500">${icon('paperclip')} ${esc(f.name || 'Tệp đính kèm')}</span>
            <a href="${esc(f.url || f.data || '#')}" download="${esc(f.name || 'file')}" class="btn text" style="padding:4px 8px">${icon('download')} Tải về</a>
          </div>`).join('')}
        </div>
      </div>` : ''}
      <div class="flex gap" style="margin-top:8px">
        <button class="btn" id="editDoc">${icon('edit')} Chỉnh sửa</button>
        <button class="btn danger" id="deleteDoc">${icon('trash')} Xóa</button>
      </div>
    </div>`);
  $('#editDoc')?.addEventListener('click', () => {
    let kind = state.officials?.some(x => x.id === id) ? 'officials' : 'documents';
    if (typeof catalogEdit !== 'undefined') catalogEdit(kind, id);
    else docForm(id);
  });
  $('#deleteDoc')?.addEventListener('click', () => {
    if (typeof catalogEdit !== 'undefined') {
      let kind = state.officials?.some(x => x.id === id) ? 'officials' : 'documents';
      let item = state[kind]?.find(x => x.id === id);
      if (item) { item.archived = true; persist(); done('Đã lưu trữ mục'); }
    } else {
      state.docs = state.docs.filter(x => x.id !== id);
      done('Đã xóa công văn');
    }
  });
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
    ${k.files.map((f, i) => `<div class="flex between"><span class="flex gap">${icon('file')}<a href="${esc(f.data || state.files?.[f.id]?.url || '#')}" download="${esc(f.name)}">${esc(f.name)}</a></span><button class="icon-btn" data-remove-file="${i}" aria-label="Xóa tệp">${icon('trash')}</button></div>`).join('') || '<p class="muted">Chưa có tệp đính kèm.</p>'}
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
  modal(id ? 'Sửa kiến thức' : 'Thêm kiến thức', `
    <div class="form-grid">
      <div class="span2">${field('Tiêu đề văn bản / tài liệu', 'title', k.title, 'text', true)}</div>
      ${field('Số ký hiệu', 'no', k.no || '183/2026/TT-BCA', 'text', true)}
      <label class="field"><span>Loại văn bản *</span>
        <select name="docType">
          ${['Thông tư', 'Nghị định', 'Quyết định', 'Luật', 'Nghị quyết', 'Hướng dẫn', 'Quy định'].map(t => `<option value="${t}" ${(k.docType || k.type) === t ? 'selected' : ''}>${t}</option>`).join('')}
        </select>
      </label>
      <label class="field"><span>Cấp ban hành *</span>
        <select name="level">
          ${['Trung ương', 'Địa phương'].map(l => `<option value="${l}" ${k.level === l ? 'selected' : ''}>${l}</option>`).join('')}
        </select>
      </label>
      <label class="field"><span>Cơ quan ban hành *</span>
        <select name="agency">
          ${['Bộ Công an', 'Chính phủ', 'Quốc hội', 'Thủ tướng Chính phủ', 'Chủ tịch nước', 'Bộ Thông tin và Truyền thông', 'Bộ Khoa học và Công nghệ', 'Cơ quan khác'].map(a => `<option value="${a}" ${k.agency === a ? 'selected' : ''}>${a}</option>`).join('')}
        </select>
      </label>
      ${field('Ngày ban hành', 'issueDate', k.issueDate || k.date || '2026-10-30', 'date')}
      ${field('Ngày hiệu lực', 'effectiveDate', k.effectiveDate || '2027-04-30', 'date')}
      <div class="span2"><label class="field"><span>Trích yếu nội dung *</span><textarea name="summary" required rows="3">${esc(k.summary || '')}</textarea></label></div>
      <div class="span2"><label class="field"><span>Ghi chú / nguồn</span><textarea name="note" rows="2">${esc(k.note || '')}</textarea></label></div>
    </div>`, d => {
    d.type = d.docType;
    if (id) Object.assign(k, d); else state.knowledge.push({ id: uid(), ...d, files: [] });
    done('Đã lưu kiến thức');
  });
}

function personDrawer(id) {
  let p = state.people.find(x => x.id === id);
  if (!p) return;
  let grpName = (typeof groupName === 'function') ? groupName(p.groupId) : (state.taskGroups?.find(g => g.id === p.groupId)?.name || 'Chưa phân nhóm');
  drawer(p.name, 'Hồ sơ cán bộ', `<div class="drawer-body stack person-profile" style="padding:20px">
    <div class="avatar" style="width:64px;height:64px;font-size:24px">${esc(p.name[0])}</div>
    <div class="detail-list">
      ${[['Chức vụ', p.position], ['Nhóm chuyên môn', grpName], ['Loại nhân sự', p.type], ['Email', p.email || '—'], ['Điện thoại', p.phone || '—'], ['Ghi chú', p.note || '—']].map(([k, v]) => `<div class="detail-pair"><span>${k}</span><span>${esc(v)}</span></div>`).join('')}
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

