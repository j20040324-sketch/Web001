/* ============================================================
   NOVAI 科技服务 — shared chrome injection + i18n + interactions
   One file, included on every page with <script defer>.
   Language: Chinese is the in-HTML default; English lives in
   `data-en` attributes on each translatable element. The chrome
   (header/footer) is generated per-language from the tables below.
   ============================================================ */

const SERVICES = [
  { href: 'cloud.html', zh: 'NOVAI 云', en: 'NOVAI Cloud', tagZh: '云基础设施', tagEn: 'Cloud Infrastructure' },
  { href: 'intelligence.html', zh: 'NOVAI 智能', en: 'NOVAI Intelligence', tagZh: 'AI 与数据', tagEn: 'AI & Data' },
  { href: 'secure.html', zh: 'NOVAI 安全', en: 'NOVAI Secure', tagZh: '网络安全', tagEn: 'Cybersecurity' },
  { href: 'build.html', zh: 'NOVAI 开发', en: 'NOVAI Build', tagZh: '软件工程', tagEn: 'Software Engineering' },
];

const SERVICE_PAGES = ['services.html', ...SERVICES.map((s) => s.href)];

const T = {
  nav: {
    services: { zh: '服务', en: 'Services' },
    company: { zh: '公司', en: 'Company' },
    news: { zh: '新闻', en: 'News' },
    contact: { zh: '联系', en: 'Contact' },
  },
  mini: {
    portal: { zh: '客户门户', en: 'Client Portal' },
    book: { zh: '预约咨询', en: 'Book a Consult' },
  },
  mobile: {
    home: { zh: '首页 Home', en: 'Home' },
    services: { zh: '服务 Services', en: 'Services' },
    company: { zh: '公司 Company', en: 'Company' },
    news: { zh: '新闻 News', en: 'News' },
    contact: { zh: '联系 Contact', en: 'Contact' },
    book: { zh: '预约咨询', en: 'Book a Consult' },
  },
  footer: {
    tagline: {
      zh: '科技服务，臻于卓越。从云到 AI、从安全到开发，为企业打造可靠的数字基座。',
      en: 'Technology services, elevated. From cloud to AI, security to software — a reliable digital foundation for your business.',
    },
    servicesH: { zh: '服务 Services', en: 'Services' },
    companyH: { zh: '公司 Company', en: 'Company' },
    legalH: { zh: '法律 Legal', en: 'Legal' },
    allServices: { zh: '全部服务', en: 'All services' },
    about: { zh: '关于我们', en: 'About' },
    newsroom: { zh: '新闻动态', en: 'Newsroom' },
    careers: { zh: '加入我们', en: 'Careers' },
    contactUs: { zh: '联系我们', en: 'Contact us' },
    sustainability: { zh: '可持续', en: 'Sustainability' },
    privacy: { zh: '隐私政策', en: 'Privacy Policy' },
    cookie: { zh: 'Cookie 政策', en: 'Cookie Policy' },
    terms: { zh: '服务条款', en: 'Terms & Conditions' },
    legalNotice: { zh: '法律声明', en: 'Legal Notice' },
    accessibility: { zh: '无障碍', en: 'Accessibility' },
    copyright: {
      zh: 'NOVAI 科技服务有限公司 版权所有 · All rights reserved.',
      en: 'NOVAI Technology Services Co., Ltd. All rights reserved.',
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

/* ---------- Header ---------- */
function headerHTML() {
  const page = currentPage();
  const isServices = SERVICE_PAGES.includes(page);

  const dropdown = SERVICES.map(
    (s) =>
      `<a href="${s.href}">${LANG === 'en' ? s.en : s.zh}<span>${
        LANG === 'en' ? s.tagEn : s.en + ' · ' + s.tagZh
      }</span></a>`
  ).join('');

  const navItems = [
    { href: 'services.html', label: t(T.nav.services), active: isServices, dropdown },
    { href: 'company.html', label: t(T.nav.company), active: page === 'company.html' },
    { href: 'news.html', label: t(T.nav.news), active: page === 'news.html' },
    { href: 'contact.html', label: t(T.nav.contact), active: page === 'contact.html' },
  ]
    .map((item) => {
      const cls = `${item.dropdown ? 'has-dropdown' : ''} ${item.active ? 'active' : ''}`.trim();
      const dd = item.dropdown ? `<div class="dropdown">${item.dropdown}</div>` : '';
      return `<li class="${cls}"><a class="nav-link" href="${item.href}">${item.label}</a>${dd}</li>`;
    })
    .join('');

  const toggleLabel = LANG === 'en' ? '中' : 'EN';

  return `
  <header class="site-header" id="siteHeader">
    <div class="header-inner">
      <a class="brand" href="index.html">NOVAI</a>
      <nav class="main-nav">
        <ul>${navItems}</ul>
      </nav>
      <div class="header-actions">
        <a class="mini" href="contact.html">${t(T.mini.portal)}</a>
        <a class="mini" href="contact.html">${t(T.mini.book)}</a>
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
    <a href="services.html">${t(T.mobile.services)}</a>
    ${SERVICES.map(
      (s) => `<a class="sub" href="${s.href}">${LANG === 'en' ? s.en : s.zh + ' · ' + s.en}</a>`
    ).join('')}
    <a href="company.html">${t(T.mobile.company)}</a>
    <a href="news.html">${t(T.mobile.news)}</a>
    <a href="contact.html">${t(T.mobile.contact)}</a>
    <a href="contact.html">${t(T.mobile.book)}</a>
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
          <h5>${t(f.servicesH)}</h5>
          <ul>
            <li><a href="cloud.html">${LANG === 'en' ? 'NOVAI Cloud' : 'NOVAI 云 · Cloud'}</a></li>
            <li><a href="intelligence.html">${LANG === 'en' ? 'NOVAI Intelligence' : 'NOVAI 智能 · AI'}</a></li>
            <li><a href="secure.html">${LANG === 'en' ? 'NOVAI Secure' : 'NOVAI 安全 · Secure'}</a></li>
            <li><a href="build.html">${LANG === 'en' ? 'NOVAI Build' : 'NOVAI 开发 · Build'}</a></li>
            <li><a href="services.html">${t(f.allServices)}</a></li>
          </ul>
        </div>
        <div class="footer-col">
          <h5>${t(f.companyH)}</h5>
          <ul>
            <li><a href="company.html">${t(f.about)}</a></li>
            <li><a href="news.html">${t(f.newsroom)}</a></li>
            <li><a href="company.html#careers">${t(f.careers)}</a></li>
            <li><a href="contact.html">${t(f.contactUs)}</a></li>
            <li><a href="company.html#sustainability">${t(f.sustainability)}</a></li>
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
