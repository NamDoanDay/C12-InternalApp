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
  if (a === 'login-user') {
    let u = state.users.find(x => x.role === 'user' && x.status === 'approved') || state.users.find(x => x.id === 'demo-u-g-HT') || state.users[0];
    login(u.id);
    toast('Đã đăng nhập tài khoản User demo');
    return;
  }
  if (a === 'login-admin') {
    let u = state.users.find(x => x.role === 'admin' && x.status === 'approved') || state.users.find(x => x.id === 'admin') || state.users[0];
    login(u.id);
    toast('Đã đăng nhập tài khoản Admin demo');
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
  if (typeof formTask !== 'undefined') formTask = null;
  if (typeof taskDraftFiles !== 'undefined') taskDraftFiles = {};
  if (typeof taskDraftDocuments !== 'undefined') taskDraftDocuments = {};
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
    catch (err) { if (f.isConnected && $('#formError')) $('#formError').textContent = err.message }
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

