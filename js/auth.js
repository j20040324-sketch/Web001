/* ============================================================
   NOVAI Flow — auth UI behaviour (login / signup)
   Front-end only: client-side validation + demo submit.
   Replace the submit handlers with real API calls when a
   backend is available.
   ============================================================ */
(function () {
  const lang = () => (document.documentElement.lang === 'en' ? 'en' : 'zh');
  const T = {
    show: { zh: '显示', en: 'Show' },
    hide: { zh: '隐藏', en: 'Hide' },
    loginOk: { zh: '登录成功！这是演示界面，未连接后端。', en: 'Signed in! This is a demo UI with no backend.' },
    signupOk: { zh: '账号已创建！这是演示界面，未连接后端。', en: 'Account created! This is a demo UI with no backend.' },
    social: { zh: '演示：通过 {p} 登录尚未接入。', en: 'Demo: {p} sign-in is not connected yet.' },
  };
  const tr = (k) => T[k][lang()];
  const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function fieldOf(input) {
    return input.closest('.auth-field');
  }
  function setError(input, on) {
    const f = fieldOf(input);
    if (f) f.classList.toggle('show-err', on);
    input.classList.toggle('invalid', on);
  }
  function val(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : '';
  }

  /* password show / hide */
  document.querySelectorAll('.toggle[data-toggle]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const input = document.getElementById(btn.getAttribute('data-toggle'));
      if (!input) return;
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      btn.textContent = show ? tr('hide') : tr('show');
      btn.setAttribute('data-en', show ? 'Hide' : 'Show');
    });
  });

  /* password strength meter (signup) */
  const pwBar = document.getElementById('pwBar');
  const pwInput = document.getElementById('password');
  if (pwBar && pwInput && document.getElementById('signupForm')) {
    const strength = (p) => {
      let s = 0;
      if (p.length >= 8) s += 40;
      if (p.length >= 12) s += 20;
      if (/[A-Z]/.test(p) && /[a-z]/.test(p)) s += 20;
      if (/\d/.test(p)) s += 10;
      if (/[^A-Za-z0-9]/.test(p)) s += 10;
      return Math.min(s, 100);
    };
    pwInput.addEventListener('input', () => {
      const s = strength(pwInput.value);
      pwBar.style.width = s + '%';
      pwBar.style.background = s < 40 ? '#e0556a' : s < 70 ? '#d8a657' : 'var(--accent)';
    });
  }

  /* message banner */
  function showMsg(text) {
    const el = document.getElementById('authMsg');
    if (!el) return;
    el.textContent = text;
    el.classList.add('show');
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  /* clear error as the user types */
  document.querySelectorAll('.auth-field input').forEach((inp) => {
    inp.addEventListener('input', () => setError(inp, false));
  });

  /* social buttons (demo) */
  document.querySelectorAll('.social-btn[data-social]').forEach((b) => {
    b.addEventListener('click', () => showMsg(tr('social').replace('{p}', b.getAttribute('data-social'))));
  });

  /* ---- Login ---- */
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      let ok = true;
      const email = document.getElementById('email');
      const pass = document.getElementById('password');
      if (!EMAIL.test(email.value.trim())) { setError(email, true); ok = false; }
      if (!pass.value) { setError(pass, true); ok = false; }
      if (!ok) return;
      try { localStorage.setItem('novai-auth', email.value.trim()); } catch (e2) {}
      showMsg(tr('loginOk'));
      setTimeout(() => { window.location.href = 'index.html'; }, 700);
    });
  }

  /* ---- Signup ---- */
  const signupForm = document.getElementById('signupForm');
  if (signupForm) {
    signupForm.addEventListener('submit', (e) => {
      e.preventDefault();
      let ok = true;
      const name = document.getElementById('name');
      const email = document.getElementById('email');
      const pass = document.getElementById('password');
      const confirm = document.getElementById('confirm');
      const agree = document.getElementById('agree');
      if (!name.value.trim()) { setError(name, true); ok = false; }
      if (!EMAIL.test(email.value.trim())) { setError(email, true); ok = false; }
      if (pass.value.length < 8) { setError(pass, true); ok = false; }
      if (!confirm.value || confirm.value !== pass.value) { setError(confirm, true); ok = false; }
      if (!agree.checked) { document.getElementById('agreeField').classList.add('show-err'); ok = false; }
      if (!ok) return;
      try { localStorage.setItem('novai-auth', email.value.trim()); } catch (e2) {}
      showMsg(tr('signupOk'));
      setTimeout(() => { window.location.href = 'index.html'; }, 700);
    });
    const agree = document.getElementById('agree');
    if (agree) agree.addEventListener('change', () => document.getElementById('agreeField').classList.remove('show-err'));
  }

  /* ---- Account page ---- */
  const acct = document.getElementById('accountPage');
  if (acct) {
    let user = '';
    try { user = localStorage.getItem('novai-auth') || ''; } catch (e) {}
    if (!user) {
      window.location.replace('login.html');
    } else {
      const emailEl = document.getElementById('acctEmail');
      if (emailEl) emailEl.textContent = user;
      const nameEl = document.getElementById('acctName');
      if (nameEl) nameEl.textContent = user.split('@')[0];
      acct.querySelectorAll('[data-action="signout"]').forEach((b) =>
        b.addEventListener('click', (e) => {
          e.preventDefault();
          try { localStorage.removeItem('novai-auth'); } catch (err) {}
          window.location.href = 'index.html';
        })
      );
    }
  }
})();
