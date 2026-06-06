/* ============================================================
   NOVAI Flow — backend API client.
   Set API_BASE to your deployed backend to switch login/signup
   from the front-end demo to the real backend. Leave '' for demo.
   e.g. var API_BASE = 'https://novai-backend.onrender.com';
   ============================================================ */
(function () {
  var API_BASE = 'https://novai-backend.onrender.com'; // Render backend
  var PREFIX = '/api/v1';

  function url(p) {
    return API_BASE + PREFIX + p;
  }
  function setTokens(t) {
    try {
      if (t && t.accessToken) localStorage.setItem('novai-access', t.accessToken);
      if (t && t.refreshToken) localStorage.setItem('novai-refresh', t.refreshToken);
    } catch (e) {}
  }
  function clearTokens() {
    try {
      localStorage.removeItem('novai-access');
      localStorage.removeItem('novai-refresh');
    } catch (e) {}
  }
  function getAccess() {
    try { return localStorage.getItem('novai-access') || ''; } catch (e) { return ''; }
  }
  function getRefresh() {
    try { return localStorage.getItem('novai-refresh') || ''; } catch (e) { return ''; }
  }

  async function jsonFetch(path, opts, _retries) {
    opts = opts || {};
    opts.headers = Object.assign({ 'content-type': 'application/json' }, opts.headers || {});
    var res;
    try {
      res = await fetch(url(path), opts);
    } catch (netErr) {
      // Network error — most often the free backend is cold-starting. Retry.
      var left = _retries == null ? 3 : _retries;
      if (left > 0) {
        await new Promise(function (r) { setTimeout(r, 2500); });
        return jsonFetch(path, opts, left - 1);
      }
      var ne = new Error('服务器正在唤醒（免费服务器会休眠），请等约 1 分钟后再试一次。');
      ne.network = true;
      throw ne;
    }
    var data = null;
    try { data = await res.json(); } catch (e) {}
    if (!res.ok) {
      var msg = (data && data.error && data.error.message) || 'Request failed (' + res.status + ')';
      var err = new Error(msg);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  // Warm the backend as soon as this page loads so it's awake by submit time.
  try { fetch(API_BASE + '/health', { cache: 'no-store' }).catch(function () {}); } catch (e) {}

  async function register(payload) {
    var d = await jsonFetch('/auth/register', { method: 'POST', body: JSON.stringify(payload) });
    setTokens(d);
    return d;
  }
  async function login(email, password) {
    var d = await jsonFetch('/auth/login', { method: 'POST', body: JSON.stringify({ email: email, password: password }) });
    setTokens(d);
    return d;
  }
  async function logout() {
    var r = getRefresh();
    clearTokens();
    if (r) {
      try { await jsonFetch('/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken: r }) }); } catch (e) {}
    }
  }
  async function forgotPassword(email) {
    return jsonFetch('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email: email }) });
  }
  async function resetPassword(token, password) {
    return jsonFetch('/auth/reset-password', { method: 'POST', body: JSON.stringify({ token: token, password: password }) });
  }

  // Authenticated request helper (adds the Bearer token).
  function authed(path, opts) {
    opts = opts || {};
    opts.headers = Object.assign({ authorization: 'Bearer ' + getAccess() }, opts.headers || {});
    return jsonFetch(path, opts);
  }

  window.NovaiApi = {
    API_BASE: API_BASE,
    enabled: !!API_BASE,
    register: register,
    login: login,
    logout: logout,
    forgotPassword: forgotPassword,
    resetPassword: resetPassword,
    authed: authed,
    getAccess: getAccess,
    clearTokens: clearTokens,
  };
})();
