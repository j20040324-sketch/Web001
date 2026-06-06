/* ============================================================
   NOVAI Flow app — API client.
   Talks to the deployed backend. Handles JWT, auto-refresh on
   401, and redirect to login when the session is gone.
   ============================================================ */
window.API = (function () {
  var API_BASE = 'https://novai-backend.onrender.com';
  var PREFIX = '/api/v1';

  function getAccess() { try { return localStorage.getItem('novai-access') || ''; } catch (e) { return ''; } }
  function getRefresh() { try { return localStorage.getItem('novai-refresh') || ''; } catch (e) { return ''; } }
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
      localStorage.removeItem('novai-auth');
    } catch (e) {}
  }

  function loginUrl() {
    // app/ is one level below the site root
    return '../login.html';
  }
  function gotoLogin() {
    clearTokens();
    window.location.replace(loginUrl());
  }

  var refreshing = null;
  async function tryRefresh() {
    var rt = getRefresh();
    if (!rt) return false;
    if (refreshing) return refreshing;
    refreshing = (async function () {
      try {
        var res = await fetch(API_BASE + PREFIX + '/auth/refresh', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ refreshToken: rt }),
        });
        if (!res.ok) return false;
        var data = await res.json();
        setTokens(data);
        return true;
      } catch (e) {
        return false;
      } finally {
        refreshing = null;
      }
    })();
    return refreshing;
  }

  async function request(method, path, body, _retry) {
    var headers = { authorization: 'Bearer ' + getAccess() };
    var opts = { method: method, headers: headers };
    if (body instanceof FormData) {
      opts.body = body; // browser sets multipart boundary
    } else if (body !== undefined) {
      headers['content-type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
    var res = await fetch(API_BASE + PREFIX + path, opts);
    if (res.status === 401 && !_retry) {
      var ok = await tryRefresh();
      if (ok) return request(method, path, body, true);
      gotoLogin();
      throw new Error('Session expired');
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

  async function logout() {
    var rt = getRefresh();
    if (rt) { try { await request('POST', '/auth/logout', { refreshToken: rt }); } catch (e) {} }
    gotoLogin();
  }

  return {
    base: API_BASE,
    isAuthed: function () { return !!getAccess(); },
    get: function (p) { return request('GET', p); },
    post: function (p, b) { return request('POST', p, b); },
    patch: function (p, b) { return request('PATCH', p, b); },
    del: function (p) { return request('DELETE', p); },
    upload: function (p, formData) { return request('POST', p, formData); },
    logout: logout,
    gotoLogin: gotoLogin,
    downloadUrl: function (relPath) { return API_BASE + relPath; },
  };
})();
