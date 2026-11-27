(() => {
  const API_BASE = '/api/v1';
  const TOKEN_KEY = 'c12-api-token';
  const FIRST_LOGIN_KEY = 'c12-auth-initial-user-used';
  let revision = 0, writeQueue = Promise.resolve(), socket = null, pendingRemoteUpdate = false, remoteUpdateInFlight = false, remoteUpdateVersion = 0;
  const api = {
    ready: false,
    get token() { return sessionStorage.getItem(TOKEN_KEY) || ''; },
    async request(path, options = {}) {
      const headers = new Headers(options.headers || {});
      if (api.token) headers.set('Authorization', `Bearer ${api.token}`);
      if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
      const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || `API trả về lỗi ${response.status}.`);
      api.error = '';
      return payload;
    },
    async loadWorkspace() {
      const payload = await api.request('/workspace');
      revision = payload.revision;
      state = payload.state;
      state.documents ||= state.docs || [];
      state.docs = state.documents;
      state.officials = state.documents;
      return state;
    },
    async installSession(payload) {
      sessionStorage.setItem(TOKEN_KEY, payload.token);
      localStorage.setItem(FIRST_LOGIN_KEY, 'true');
      session = payload.userId;
      try {
        await api.loadWorkspace();
        api.ready = true;
        api.connectSocket();
        render();
      } catch (error) {
        sessionStorage.removeItem(TOKEN_KEY);
        session = '';
        throw error;
      }
    },
    async loginCredentials(identity, password) {
      const payload = await api.request('/auth/login', { method: 'POST', body: JSON.stringify({ identity, password }) });
      await api.installSession(payload);
    },
    async loginDemo(role) {
      try {
        const payload = await api.request('/auth/demo-login', { method: 'POST', body: JSON.stringify({ role }) });
        await api.installSession(payload);
        toast(`Đã đăng nhập tài khoản ${role === 'admin' ? 'Admin' : 'User'} demo`);
      } catch (error) { toast(error.message); }
    },
    async register(fields) {
      const payload = await api.request('/auth/register', { method: 'POST', body: JSON.stringify(fields) });
      const error = $('#authError');
      if (error) error.textContent = payload.message;
      toast(payload.message);
    },
    async createAccount(user, password) {
      return api.request('/auth/accounts', { method: 'POST', body: JSON.stringify({ user, password }) });
    },
    async persist(nextState) {
      const snapshot = structuredClone(nextState);
      const saveRequest = writeQueue.then(async () => {
        const payload = await api.request('/workspace', { method: 'PUT', body: JSON.stringify({ revision, state: snapshot }) });
        revision = payload.revision;
        return payload;
      });
      // Keep the queue usable after a rejected write while returning the real result
      // to the caller so save flows can avoid closing or reporting success.
      writeQueue = saveRequest.then(() => undefined, () => undefined);
      try {
        await saveRequest;
        return true;
      } catch (error) {
        toast(`Không lưu được dữ liệu lên máy chủ: ${error.message}`);
        // Keep the caller's in-progress state intact so the user can correct/retry.
        return false;
      }
    },
    async logout() {
      await api.request('/auth/logout', { method: 'POST' }).catch(() => {});
      sessionStorage.removeItem(TOKEN_KEY);
      localStorage.setItem(FIRST_LOGIN_KEY, 'true');
      session = '';
      api.disconnectSocket();
      render();
    },
    async resetWorkspace() {
      if (!admin() || !confirm('Khôi phục dữ liệu seed MySQL? Thao tác này thay thế dữ liệu nghiệp vụ trên máy chủ.')) return;
      try {
        const payload = await api.request('/workspace/reset', { method: 'POST' });
        revision = payload.revision;
        await api.loadWorkspace();
        render();
        toast('Đã khôi phục dữ liệu seed MySQL.');
      } catch (error) { toast(error.message); }
    },
    async boot() {
      try {
        const health = await fetch('/api/health');
        if (!health.ok) throw new Error('API chưa sẵn sàng. Hãy tải lại trang sau khi backend hoạt động.');
        const healthState = await health.json();
        if (api.token) {
          const payload = await api.request('/auth/session');
          session = payload.account.user_id;
          revision = payload.revision;
          await api.loadWorkspace();
          api.connectSocket();
          localStorage.setItem(FIRST_LOGIN_KEY, 'true');
        } else if (healthState.demoLoginEnabled && localStorage.getItem(FIRST_LOGIN_KEY) !== 'true') {
          const payload = await api.request('/auth/demo-login', { method: 'POST', body: JSON.stringify({ role: 'user' }) });
          sessionStorage.setItem(TOKEN_KEY, payload.token);
          session = payload.userId;
          await api.loadWorkspace();
          api.connectSocket();
          localStorage.setItem(FIRST_LOGIN_KEY, 'true');
        }
      } catch {
        sessionStorage.removeItem(TOKEN_KEY);
        session = '';
        api.error = 'Không kết nối được máy chủ hoặc phiên đã hết hạn. Kiểm tra Docker/MySQL rồi thử lại.';
      } finally {
        api.ready = true;
        render();
      }
    },
    connectSocket() {
      if (socket || !api.token) return;
      const script = document.querySelector('[data-socket-client]') || document.createElement('script');
      if (!script.src) {
        script.dataset.socketClient = 'true';
        script.src = '/socket.io/socket.io.js';
        script.onload = () => {
          if (!window.io) return;
          socket = window.io({ auth: { token: api.token }, transports: ['websocket', 'polling'] });
          socket.on('workspace.updated', event => {
            if (event.actorId === session) return;
            pendingRemoteUpdate = true;
            remoteUpdateVersion++;
            api.refreshRemoteUpdate();
          });
        };
        document.head.appendChild(script);
      } else script.onload?.();
    },
    async refreshRemoteUpdate() {
      if (!pendingRemoteUpdate || remoteUpdateInFlight || document.querySelector('#overlay .drawer')) return;
      remoteUpdateInFlight = true;
      const requestedVersion = remoteUpdateVersion;
      try {
        await writeQueue;
        if (document.querySelector('#overlay .drawer')) return;
        const payload = await api.request('/workspace');
        if (document.querySelector('#overlay .drawer')) return;
        revision = payload.revision;
        state = payload.state;
        state.documents ||= state.docs || [];
        state.docs = state.documents;
        state.officials = state.documents;
        if (requestedVersion === remoteUpdateVersion) pendingRemoteUpdate = false;
        render();
        toast('Không gian làm việc vừa được cập nhật.');
      } catch { toast('Không tải được dữ liệu mới nhất.'); }
      finally {
        remoteUpdateInFlight = false;
        if (remoteUpdateVersion !== requestedVersion && pendingRemoteUpdate && !document.querySelector('#overlay .drawer')) queueMicrotask(() => api.refreshRemoteUpdate());
      }
    },
    disconnectSocket() { socket?.disconnect(); socket = null; }
  };
  const overlay = document.querySelector('#overlay');
  if (overlay) new MutationObserver(() => api.refreshRemoteUpdate())
    .observe(overlay, { childList: true });
  window.C12Api = api;
})();
