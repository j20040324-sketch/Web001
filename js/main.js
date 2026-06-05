/* ============================================================
   NOVAI 科技服务 — shared chrome injection + i18n + interactions
   One file, included on every page with <script defer>.
   Language: Chinese is the in-HTML default; English lives in
   `data-en` attributes on each translatable element. The chrome
   (header/footer) is generated per-language from the tables below.
   ============================================================ */

const PRODUCT_PAGES = ['product.html', 'pricing.html'];

const T = {
  nav: {
    myflow: { zh: '我的工作流', en: 'My Flow' },
    product: { zh: '产品', en: 'Product' },
    pricing: { zh: '价格', en: 'Pricing' },
    company: { zh: '公司', en: 'Company' },
    contact: { zh: '联系', en: 'Contact' },
  },
  mini: {
    signin: { zh: '登录', en: 'Sign in' },
    signout: { zh: '退出登录', en: 'Sign out' },
    account: { zh: '我的账户', en: 'My account' },
  },
  mobile: {
    home: { zh: '首页 Home', en: 'Home' },
    product: { zh: '产品 Product', en: 'Product' },
    features: { zh: '功能 Features', en: 'Features' },
    how: { zh: '工作原理 How it works', en: 'How it works' },
    pricing: { zh: '价格 Pricing', en: 'Pricing' },
    company: { zh: '公司 Company', en: 'Company' },
    contact: { zh: '联系 Contact', en: 'Contact' },
    myflow: { zh: '我的工作流 My Flow', en: 'My Flow' },
    account: { zh: '我的账户 My account', en: 'My account' },
    signin: { zh: '登录 Sign in', en: 'Sign in' },
    signout: { zh: '退出登录 Sign out', en: 'Sign out' },
  },
  footer: {
    tagline: {
      zh: 'NOVAI Flow — 面向团队的 AI 工作流平台。把重复工作交给自动化，让团队专注更重要的事。',
      en: 'NOVAI Flow — the AI workflow platform for teams. Automate the repetitive so your team can focus on what matters.',
    },
    productH: { zh: '产品 Product', en: 'Product' },
    companyH: { zh: '公司 Company', en: 'Company' },
    legalH: { zh: '法律 Legal', en: 'Legal' },
    features: { zh: '功能特性', en: 'Features' },
    how: { zh: '工作原理', en: 'How it works' },
    pricing: { zh: '价格方案', en: 'Pricing' },
    trial: { zh: '免费试用', en: 'Start free' },
    about: { zh: '关于我们', en: 'About' },
    newsroom: { zh: '更新日志', en: 'Changelog' },
    careers: { zh: '加入我们', en: 'Careers' },
    contactUs: { zh: '联系我们', en: 'Contact us' },
    privacy: { zh: '隐私政策', en: 'Privacy Policy' },
    cookie: { zh: 'Cookie 政策', en: 'Cookie Policy' },
    terms: { zh: '服务条款', en: 'Terms & Conditions' },
    legalNotice: { zh: '法律声明', en: 'Legal Notice' },
    accessibility: { zh: '无障碍', en: 'Accessibility' },
    copyright: {
      zh: 'NOVAI 科技有限公司 版权所有 · All rights reserved.',
      en: 'NOVAI Inc. All rights reserved.',
    },
  },
};

let LANG = 'zh';
const zhCache = new WeakMap();
const zhPlaceholder = new WeakMap();

function currentPage() {
  const path = window.location.pathname.split('/').pop();
  return path === '' ? 'index.html' : path;
}
function t(node) {
  return LANG === 'en' ? node.en : node.zh;
}
/* demo auth state (no backend): the signed-in user's email, or '' */
function getUser() {
  try {
    return localStorage.getItem('novai-auth') || '';
  } catch (e) {
    return '';
  }
}

/* ---------- Header ---------- */
function headerHTML() {
  const page = currentPage();
  const user = getUser();

  const navData = [
    { href: 'product.html', label: t(T.nav.product), active: page === 'product.html' },
    { href: 'pricing.html', label: t(T.nav.pricing), active: page === 'pricing.html' },
    { href: 'company.html', label: t(T.nav.company), active: page === 'company.html' },
    { href: 'contact.html', label: t(T.nav.contact), active: page === 'contact.html' },
  ];
  if (user) {
    navData.unshift({ href: 'account.html', label: t(T.nav.myflow), active: page === 'account.html' });
  }
  const navItems = navData
    .map((item) => `<li class="${item.active ? 'active' : ''}"><a class="nav-link" href="${item.href}">${item.label}</a></li>`)
    .join('');

  const toggleLabel = LANG === 'en' ? '中' : 'EN';

  const authMini = user
    ? `<a class="mini" href="#" data-action="signout">${t(T.mini.signout)}</a>
        <a class="mini" href="account.html">${t(T.mini.account)}</a>`
    : `<a class="mini" href="login.html">${t(T.mini.signin)}</a>
        <a class="mini" href="login.html">${t(T.mini.account)}</a>`;

  return `
  <header class="site-header" id="siteHeader">
    <div class="header-inner">
      <a class="brand" href="index.html">NOVAI</a>
      <nav class="main-nav">
        <ul>${navItems}</ul>
      </nav>
      <div class="header-actions">
        ${authMini}
        <button class="lang-toggle" id="langToggle" type="button" aria-label="Switch language">${toggleLabel}</button>
        <button class="hamburger" id="hamburger" type="button" aria-label="Menu">
          <span></span><span></span><span></span>
        </button>
      </div>
    </div>
  </header>

  <div class="overlay" id="overlay"></div>
  <nav class="mobile-nav" id="mobileNav">
    <a href="index.html">${t(T.mobile.home)}</a>
    <a href="product.html">${t(T.mobile.product)}</a>
    <a class="sub" href="product.html#features">${t(T.mobile.features)}</a>
    <a class="sub" href="product.html#how">${t(T.mobile.how)}</a>
    <a href="pricing.html">${t(T.mobile.pricing)}</a>
    <a href="company.html">${t(T.mobile.company)}</a>
    <a href="contact.html">${t(T.mobile.contact)}</a>
    ${user
      ? `<a href="account.html">${t(T.mobile.myflow)}</a>
    <a href="account.html">${t(T.mobile.account)}</a>
    <a href="#" data-action="signout">${t(T.mobile.signout)}</a>`
      : `<a href="login.html">${t(T.mobile.signin)}</a>
    <a href="login.html">${t(T.mobile.account)}</a>`}
  </nav>`;
}

/* ---------- Footer ---------- */
function footerHTML() {
  const year = document.documentElement.getAttribute('data-year') || '2026';
  const f = T.footer;
  return `
  <footer class="site-footer">
    <div class="container">
      <div class="footer-top">
        <div class="footer-brand">
          <a class="brand" href="index.html">NOVAI</a>
          <p>${t(f.tagline)}</p>
          <div class="social">
            <a href="#" aria-label="WeChat">WX</a>
            <a href="#" aria-label="Weibo">WB</a>
            <a href="#" aria-label="LinkedIn">IN</a>
            <a href="#" aria-label="YouTube">YT</a>
            <a href="#" aria-label="X">X</a>
          </div>
        </div>
        <div class="footer-col">
          <h5>${t(f.productH)}</h5>
          <ul>
            <li><a href="product.html#features">${t(f.features)}</a></li>
            <li><a href="product.html#how">${t(f.how)}</a></li>
            <li><a href="pricing.html">${t(f.pricing)}</a></li>
            <li><a href="contact.html">${t(f.trial)}</a></li>
          </ul>
        </div>
        <div class="footer-col">
          <h5>${t(f.companyH)}</h5>
          <ul>
            <li><a href="company.html">${t(f.about)}</a></li>
            <li><a href="news.html">${t(f.newsroom)}</a></li>
            <li><a href="company.html#careers">${t(f.careers)}</a></li>
            <li><a href="contact.html">${t(f.contactUs)}</a></li>
          </ul>
        </div>
        <div class="footer-col">
          <h5>${t(f.legalH)}</h5>
          <ul>
            <li><a href="privacy.html">${t(f.privacy)}</a></li>
            <li><a href="cookie.html">${t(f.cookie)}</a></li>
            <li><a href="terms.html">${t(f.terms)}</a></li>
            <li><a href="legal.html">${t(f.legalNotice)}</a></li>
          </ul>
        </div>
      </div>
      <div class="footer-bottom">
        <div class="legal-links">
          <a href="privacy.html">${t(f.privacy)}</a>
          <a href="cookie.html">${t(f.cookie)}</a>
          <a href="terms.html">${t(f.terms)}</a>
          <a href="legal.html">${t(f.legalNotice)}</a>
          <a href="contact.html">${t(f.accessibility)}</a>
        </div>
        <div class="copyright">© ${year} ${t(f.copyright)}</div>
      </div>
    </div>
  </footer>`;
}

/* ---------- Mount chrome (re-runs on language change) ---------- */
function mountChrome() {
  const h = document.getElementById('site-header');
  const fo = document.getElementById('site-footer');
  if (h) h.innerHTML = headerHTML();
  if (fo) fo.innerHTML = footerHTML();
  initMenu();
  initStickyHeader();
  bindLangToggle();
  bindAuthActions();
}

function bindAuthActions() {
  document.querySelectorAll('[data-action="signout"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      try {
        localStorage.removeItem('novai-auth');
      } catch (err) {}
      window.location.href = 'index.html';
    });
  });
}

/* ---------- i18n body swap ---------- */
function cacheZh() {
  document.querySelectorAll('[data-en]').forEach((el) => {
    if (!zhCache.has(el)) zhCache.set(el, el.innerHTML);
  });
  document.querySelectorAll('[data-en-placeholder]').forEach((el) => {
    if (!zhPlaceholder.has(el)) zhPlaceholder.set(el, el.getAttribute('placeholder') || '');
  });
}
function applyBody() {
  document.querySelectorAll('[data-en]').forEach((el) => {
    el.innerHTML = LANG === 'en' ? el.getAttribute('data-en') : zhCache.get(el);
  });
  document.querySelectorAll('[data-en-placeholder]').forEach((el) => {
    el.setAttribute(
      'placeholder',
      LANG === 'en' ? el.getAttribute('data-en-placeholder') : zhPlaceholder.get(el)
    );
  });
  // <title>
  const titleEn = document.documentElement.getAttribute('data-title-en');
  const titleZh = document.documentElement.getAttribute('data-title-zh');
  if (LANG === 'en' && titleEn) document.title = titleEn;
  else if (titleZh) document.title = titleZh;
}
function setLang(lang) {
  LANG = lang === 'en' ? 'en' : 'zh';
  try {
    localStorage.setItem('aether-lang', LANG);
  } catch (e) {}
  document.documentElement.lang = LANG === 'en' ? 'en' : 'zh-CN';
  applyBody();
  mountChrome();
}
function bindLangToggle() {
  const btn = document.getElementById('langToggle');
  if (btn) btn.addEventListener('click', () => setLang(LANG === 'en' ? 'zh' : 'en'));
}

/* ---------- Interactions ---------- */
function initMenu() {
  const burger = document.getElementById('hamburger');
  const nav = document.getElementById('mobileNav');
  const overlay = document.getElementById('overlay');
  if (!burger || !nav || !overlay) return;
  const toggle = (open) => {
    burger.classList.toggle('open', open);
    nav.classList.toggle('open', open);
    overlay.classList.toggle('show', open);
    document.body.classList.toggle('no-scroll', open);
  };
  burger.addEventListener('click', () => toggle(!nav.classList.contains('open')));
  overlay.addEventListener('click', () => toggle(false));
  nav.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => toggle(false)));
}

function initStickyHeader() {
  const header = document.getElementById('siteHeader');
  if (!header) return;
  const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 40);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
}

function initReveal() {
  const els = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window) || !els.length) {
    els.forEach((el) => el.classList.add('in'));
    return;
  }
  const io = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          obs.unobserve(e.target);
        }
      });
    },
    { threshold: 0.15 }
  );
  els.forEach((el) => io.observe(el));
}

function animateCounter(el) {
  const target = +el.getAttribute('data-target');
  const decimals = (el.getAttribute('data-decimals') | 0) || 0;
  const duration = 1600;
  const start = performance.now();
  const step = (now) => {
    const tt = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - tt, 3);
    el.textContent = (target * eased).toFixed(decimals);
    if (tt < 1) requestAnimationFrame(step);
    else el.textContent = target.toFixed(decimals);
  };
  requestAnimationFrame(step);
}
function initCounters() {
  const els = document.querySelectorAll('.counter');
  if (!els.length) return;
  if (!('IntersectionObserver' in window)) {
    els.forEach(animateCounter);
    return;
  }
  const io = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          animateCounter(e.target);
          obs.unobserve(e.target);
        }
      });
    },
    { threshold: 0.5 }
  );
  els.forEach((el) => io.observe(el));
}

function initForms() {
  document.querySelectorAll('form[data-demo]').forEach((form) => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const msg = form.querySelector('[data-demo-msg]');
      if (msg) {
        msg.textContent =
          LANG === 'en'
            ? 'Thank you — this is a demo form, nothing was sent.'
            : '感谢提交 — 这是演示表单，并未真正发送。';
        msg.style.color = 'var(--accent)';
      }
      form.reset();
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  cacheZh();
  let saved = 'zh';
  try {
    saved = localStorage.getItem('aether-lang') || 'zh';
  } catch (e) {}
  LANG = saved === 'en' ? 'en' : 'zh';
  document.documentElement.lang = LANG === 'en' ? 'en' : 'zh-CN';
  applyBody();
  mountChrome();
  initReveal();
  initCounters();
  initForms();
});
